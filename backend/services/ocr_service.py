import os
import json
import base64
import httpx

from services.parsing import split_number_unit, parse_date


async def _chat_completion(base_url: str, api_key: str, body: dict) -> str:
    """OpenAI 호환 Chat Completions 호출 (openai SDK 없이 httpx로 직접 호출)"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
        )
    if resp.status_code != 200:
        raise Exception(f"AI API 오류 ({resp.status_code}): {resp.text[:300]}")
    return resp.json()["choices"][0]["message"]["content"]

EXTRACT_PROMPT = """
건설현장 자재 인수증(거래명세서/납품서)의 내용입니다.
다음 정보를 추출해서 JSON으로만 반환하세요. 마크다운 코드블록이나 설명은 쓰지 마세요.
값이 없으면 빈 문자열("")을 넣으세요. 숫자 필드에는 숫자만, 단위는 별도 필드에 넣으세요.

{
  "received_date": "납품/인수 날짜 (YYYY-MM-DD)",
  "vendor": "공급업체(납품업체) 상호",
  "driver_name": "납품 기사 이름",
  "vehicle_no": "차량번호 (예: 12가3456)",
  "receiver_name": "현장 인수자(확인자) 이름",
  "items": [
    {
      "material_name": "품목명 (예: 철근, 시멘트, 레미콘)",
      "spec": "규격 (예: HD13, 25-21-120)",
      "quantity": "수량 숫자 (예: 150)",
      "unit": "수량 단위 (예: 포, 본, ㎥, 대, EA)",
      "weight": "중량 숫자 (예: 3.5)",
      "weight_unit": "중량 단위 (예: ton, kg)"
    }
  ]
}

품목이 여러 줄이면 items 배열에 모두 넣으세요.
"""


def _parse_json(text: str) -> dict:
    text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"AI 응답에서 JSON을 찾을 수 없습니다: {text[:200]}")
    return json.loads(text[start:end + 1])


def _normalize(raw: dict) -> dict:
    """AI 응답을 프론트엔드 폼 구조로 정리 (숫자/단위 분리, 날짜 정규화)"""
    items = []
    for it in raw.get("items") or []:
        if not isinstance(it, dict):
            continue
        qty, qty_unit = split_number_unit(it.get("quantity"))
        weight, w_unit = split_number_unit(it.get("weight"))
        name = str(it.get("material_name") or "").strip()
        if not name and qty is None and weight is None:
            continue
        items.append({
            "material_name": name,
            "spec": str(it.get("spec") or "").strip(),
            "quantity": qty,
            "unit": str(it.get("unit") or "").strip() or qty_unit,
            "weight": weight,
            "weight_unit": str(it.get("weight_unit") or "").strip() or w_unit,
        })

    received = parse_date(raw.get("received_date"))
    return {
        "received_date": received.isoformat() if received else "",
        "vendor": str(raw.get("vendor") or "").strip(),
        "driver_name": str(raw.get("driver_name") or "").strip(),
        "vehicle_no": str(raw.get("vehicle_no") or "").strip(),
        "receiver_name": str(raw.get("receiver_name") or "").strip(),
        "items": items,
    }


async def _extract_with_upstage(api_key: str, file_bytes: bytes, filename: str, content_type: str) -> dict:
    async with httpx.AsyncClient(timeout=40.0) as http_client:
        resp = await http_client.post(
            "https://api.upstage.ai/v1/document-ai/document-parse",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"document": (filename, file_bytes, content_type)},
            data={"ocr": "force"},
        )
    if resp.status_code != 200:
        raise Exception(f"Upstage Document Parse 오류 ({resp.status_code}): {resp.text[:300]}")

    data = resp.json()
    content = data.get("content", {}) or {}
    document_text = content.get("markdown") or content.get("html") or content.get("text") or ""
    if not document_text:
        parts = []
        for el in data.get("elements", []):
            c = el.get("content", {})
            if isinstance(c, dict):
                parts.append(c.get("markdown") or c.get("html") or c.get("text") or "")
            elif el.get("text"):
                parts.append(el["text"])
        document_text = "\n\n".join(p for p in parts if p)
    if not document_text.strip():
        raise Exception("문서에서 글자를 읽지 못했습니다.")

    content = await _chat_completion("https://api.upstage.ai/v1", api_key, {
        "model": "solar-pro",
        "messages": [{"role": "user", "content": EXTRACT_PROMPT + "\n[문서 텍스트]\n" + document_text}],
        "max_tokens": 1500,
        "temperature": 0.0,
    })
    return _parse_json(content)


async def _extract_with_openai(api_key: str, file_bytes: bytes, content_type: str) -> dict:
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    content = await _chat_completion("https://api.openai.com/v1", api_key, {
        "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": EXTRACT_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:{content_type or 'image/jpeg'};base64,{b64}"}},
            ],
        }],
        "response_format": {"type": "json_object"},
        "max_tokens": 1500,
        "temperature": 0.0,
    })
    return _parse_json(content)


async def process_receipt_image(file_bytes: bytes, filename: str, content_type: str) -> tuple[dict, dict]:
    """(정리된 결과, AI 원본 결과)를 반환. Upstage 키가 있으면 우선 사용, 없으면 OpenAI Vision."""
    upstage_key = os.environ.get("UPSTAGE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not (upstage_key or openai_key):
        raise Exception("OCR API 키(UPSTAGE_API_KEY 또는 OPENAI_API_KEY)가 설정되지 않았습니다.")

    raw = None
    if upstage_key:
        try:
            raw = await _extract_with_upstage(upstage_key, file_bytes, filename, content_type)
        except Exception as e:
            # 크레딧 소진 등으로 Upstage가 실패하면 OpenAI로 재시도
            if not openai_key:
                raise
            print(f"Upstage failed, falling back to OpenAI: {e}")
    if raw is None:
        raw = await _extract_with_openai(openai_key, file_bytes, content_type)

    return _normalize(raw), raw
