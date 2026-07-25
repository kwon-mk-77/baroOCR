import os
import json
import base64
import httpx
from openai import AsyncOpenAI

async def process_receipt_image(file_bytes: bytes, filename: str, content_type: str) -> dict:
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    upstage_api_key = os.environ.get("UPSTAGE_API_KEY")
    
    # We will check keys dynamically in each path
    
    # 1. Check if Upstage API Key is configured for high-accuracy Document Parse
    if upstage_api_key:
        try:
            print("Using Upstage Document Parse API...")
            upstage_url = "https://api.upstage.ai/v1/document-ai/document-parse"
            headers = {"Authorization": f"Bearer {upstage_api_key}"}
            files = {"document": (filename, file_bytes, content_type)}
            data = {"ocr": "force"}
            
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                resp = await http_client.post(upstage_url, headers=headers, files=files, data=data)
                
            if resp.status_code != 200:
                raise Exception(f"Upstage API error ({resp.status_code}): {resp.text}")
                
            upstage_data = resp.json()
            elements = upstage_data.get("elements", [])
            
            # Combine elements into a structured text document layout representation
            parsed_parts = []
            for el in elements:
                category = el.get("category", "")
                content_dict = el.get("content", {})
                text_str = el.get("text", "")
                
                if isinstance(content_dict, dict) and "markdown" in content_dict:
                    parsed_parts.append(content_dict["markdown"])
                elif category == "table" and isinstance(content_dict, dict) and "html" in content_dict:
                    parsed_parts.append(content_dict["html"])
                elif text_str:
                    parsed_parts.append(text_str)
                    
            document_text = "\n\n".join(parsed_parts)
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
            5. driver: 운반기사 이름 (있는 경우만, 없으면 빈 문자열)
            
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
            default_data["debug_extracted_text"] = document_text
            default_data["debug_raw_solar_response"] = result_text
            return default_data
            
        except Exception as e:
            print(f"Upstage OCR flow failed: {e}. Falling back to OpenAI Vision...")
            # Fallback to direct OpenAI Vision if Upstage fails
            
    # 2. Fallback / Legacy path: OpenAI Vision directly
    print("Using OpenAI Vision API (Legacy/Fallback mode)...")
    if not openai_api_key:
        raise Exception("OPENAI_API_KEY is not set in environment (cannot fallback).")
        
    client = AsyncOpenAI(api_key=openai_api_key)
    base64_image = base64.b64encode(file_bytes).decode('utf-8')
    
    prompt = """
    건설현장 자재 인수증(영수증) 이미지입니다.
    이미지에서 다음 5가지 핵심 정보를 추출해서 JSON 형식으로만 반환해주세요.
    
    1. item: 품목명 (예: 철근, 시멘트, 레미콘 등)
    2. vendor: 공급업체명 (납품업체)
    3. spec: 규격 (있는 경우만, 없으면 빈 문자열)
    4. quantity: 수량 또는 중량 (숫자와 단위 포함)
    5. driver: 운반기사 이름 (있는 경우만, 없으면 빈 문자열)
    
    응답은 반드시 아래와 같은 JSON 구조로만 작성하고, 마크다운 코드 블록(```json ... ```)이나 다른 설명 텍스트를 포함하지 마세요.
    {
      "item": "추출된 품목",
      "vendor": "추출된 공급업체",
      "spec": "추출된 규격",
      "quantity": "추출된 수량",
      "driver": "추출된 기사명"
    }
    """
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{content_type};base64,{base64_image}",
                                "detail": "high"
                            },
                        },
                    ],
                }
            ],
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
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = str(e)[:20] if str(e) else "OpenAI오류"
        return {
            "item": f"수동입력({error_msg})",
            "vendor": "",
            "spec": "",
            "quantity": "",
            "driver": ""
        }
