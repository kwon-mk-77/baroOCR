import os
import json
import base64
import httpx
from openai import AsyncOpenAI

async def process_receipt_image(file_bytes: bytes, filename: str, content_type: str) -> dict:
    upstage_api_key = os.environ.get("UPSTAGE_API_KEY")
    
    if not upstage_api_key:
        raise Exception("UPSTAGE_API_KEY is not set in Vercel/Environment settings.")
        
    print("Using Upstage Document Parse API...")
    upstage_url = "https://api.upstage.ai/v1/document-ai/document-parse"
    headers = {"Authorization": f"Bearer {upstage_api_key}"}
    files = {"document": (filename, file_bytes, content_type)}
    data = {"ocr": "force"}
    
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        resp = await http_client.post(upstage_url, headers=headers, files=files, data=data)
        
    if resp.status_code != 200:
        raise Exception(f"Upstage Document Parse API error ({resp.status_code}): {resp.text}")
        
    upstage_data = resp.json()
    
    # Extract document layout representation (Markdown or HTML)
    content_dict = upstage_data.get("content", {})
    document_text = content_dict.get("markdown") or content_dict.get("html") or content_dict.get("text")
    
    # Fallback to elements loop if top-level content is missing or empty
    if not document_text:
        elements = upstage_data.get("elements", [])
        parsed_parts = []
        for el in elements:
            el_content = el.get("content", {})
            el_text = el.get("text", "")
            
            if isinstance(el_content, dict) and el_content.get("markdown"):
                parsed_parts.append(el_content["markdown"])
            elif isinstance(el_content, dict) and el_content.get("html"):
                parsed_parts.append(el_content["html"])
            elif isinstance(el_content, dict) and el_content.get("text"):
                parsed_parts.append(el_content["text"])
            elif el_text:
                parsed_parts.append(el_text)
        document_text = "\n\n".join(parsed_parts)
        
    if not document_text.strip():
        raise Exception("Upstage parsed document is empty or text could not be extracted.")
        
    print(f"Upstage parsing completed. Extracted length: {len(document_text)}")
    
    # Use Upstage Solar Pro (OpenAI-compatible) to align parsed layout text to JSON schema
    solar_client = AsyncOpenAI(api_key=upstage_api_key, base_url="https://api.upstage.ai/v1")
    
    prompt = f"""
    건설현장 자재 인수증(영수증)에서 추출된 문서 레이아웃 텍스트(마크다운/HTML 포함)입니다.
    이 텍스트에서 다음 5가지 핵심 정보를 추출해서 JSON 형식으로만 반환해주세요.
    
    1. item: 품목명 (예: 철근, 시멘트, 레미콘 등)
    2. vendor: 공급업체명 (납품업체)
    3. spec: 규격 (있는 경우만, 없으면 빈 문자열)
    4. quantity: 수량 또는 중량 (숫자와 단위 포함)
    5. driver: 인수자 이름 (있는 경우만, 없으면 빈 문자열)
    
    응답은 반드시 아래와 같은 JSON 구조로만 작성하고, 마크다운 코드 블록(```json ... ```)이나 다른 설명 텍스트를 포함하지 마세요.
    {{
      "item": "추출된 품목",
      "vendor": "추출된 공급업체",
      "spec": "추출된 규격",
      "quantity": "추출된 수량",
      "driver": "추출된 기사명"
    }}
    
    [추출된 문서 텍스트]
    {document_text}
    """
    
    response = await solar_client.chat.completions.create(
        model="solar-pro",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
        temperature=0.0
    )
    
    result_text = response.choices[0].message.content.strip()
    if result_text.startswith("```json"):
        result_text = result_text.replace("```json", "").replace("```", "").strip()
    elif result_text.startswith("```"):
        result_text = result_text.replace("```", "").strip()
        
    parsed_data = json.loads(result_text)
    default_data = {"item": "", "vendor": "", "spec": "", "quantity": "", "driver": ""}
    default_data.update(parsed_data)
    return default_data
