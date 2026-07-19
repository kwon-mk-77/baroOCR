import os
import json
import base64
from openai import AsyncOpenAI

async def process_receipt_image(file_bytes: bytes, filename: str, content_type: str) -> dict:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise Exception("OPENAI_API_KEY is not set in .env")
        
    client = AsyncOpenAI(api_key=api_key)
    
    # Convert image to base64
    base64_image = base64.b64encode(file_bytes).decode('utf-8')
    
    prompt = """
    건설현장 자재 인수증(영수증) 이미지입니다.
    이미지에서 다음 5가지 핵심 정보를 추출해서 JSON 형식으로만 반환해주세요.
    
    1. item: 품목명 (예: 철근, 시멘트, 레미콘 등)
    2. vendor: 거래처명 (납품업체)
    3. spec: 규격 (있는 경우만, 없으면 빈 문자열)
    4. quantity: 수량 또는 중량 (숫자와 단위 포함)
    5. driver: 운반기사 이름 (있는 경우만, 없으면 빈 문자열)
    
    응답은 반드시 아래와 같은 JSON 구조로만 작성하고, 마크다운 코드 블록(```json ... ```)이나 다른 설명 텍스트를 포함하지 마세요.
    {
      "item": "추출된 품목",
      "vendor": "추출된 거래처",
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
        
        # Remove markdown if the model hallucinates it despite instructions
        if result_text.startswith("```json"):
            result_text = result_text.replace("```json", "").replace("```", "").strip()
        elif result_text.startswith("```"):
            result_text = result_text.replace("```", "").strip()
            
        parsed_data = json.loads(result_text)
        
        # Ensure all keys exist
        default_data = {
            "item": "",
            "vendor": "",
            "spec": "",
            "quantity": "",
            "driver": ""
        }
        default_data.update(parsed_data)
        return default_data
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Return fallback on error
        error_msg = str(e)[:20] if str(e) else "OpenAI오류"
        return {
            "item": f"수동입력({error_msg})",
            "vendor": "",
            "spec": "",
            "quantity": "",
            "driver": ""
        }
