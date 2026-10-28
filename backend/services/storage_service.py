import os
import base64
import uuid
from datetime import datetime

import httpx

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")


def _supabase_config():
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_KEY", "")
    bucket = os.environ.get("SUPABASE_BUCKET", "receipts")
    return (url, key, bucket) if url and key else None


def _auth_headers(key: str) -> dict:
    # 새 형식 키(sb_secret_...)는 JWT가 아니므로 apikey 헤더만, 기존 service_role(JWT) 키는 Bearer도 함께 전송
    headers = {"apikey": key}
    if not key.startswith("sb_"):
        headers["Authorization"] = f"Bearer {key}"
    return headers


def init_storage():
    if _supabase_config():
        print("Supabase Storage configured.")
    else:
        print("SUPABASE_URL/KEY not set. Images will be stored locally.")


def _unique_name(filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower() or ".jpg"
    return f"{datetime.now().strftime('%Y%m/%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"


def upload_image(file_bytes: bytes, filename: str, content_type: str) -> str:
    """이미지를 저장하고 접근 가능한 URL을 반환"""
    name = _unique_name(filename)

    config = _supabase_config()
    if config:
        url, key, bucket = config
        try:
            resp = httpx.post(
                f"{url}/storage/v1/object/{bucket}/{name}",
                headers={**_auth_headers(key), "Content-Type": content_type or "image/jpeg", "x-upsert": "false"},
                content=file_bytes,
                timeout=30.0,
            )
            if resp.status_code in (200, 201):
                return f"{url}/storage/v1/object/public/{bucket}/{name}"
            print(f"Supabase upload failed ({resp.status_code}): {resp.text[:300]}. Falling back.")
        except Exception as e:
            print(f"Supabase upload failed: {e}. Falling back.")

    try:
        path = os.path.join(UPLOADS_DIR, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(file_bytes)
        return f"/uploads/{name}"
    except OSError:
        # 쓰기 불가 환경(예: Vercel)에서의 최후 수단
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        return f"data:{content_type or 'image/jpeg'};base64,{b64}"
