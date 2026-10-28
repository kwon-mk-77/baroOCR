import os
import base64
import uuid
from datetime import datetime

from supabase import create_client, Client

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")

_supabase: Client | None = None


def init_storage():
    global _supabase
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if url and key:
        try:
            _supabase = create_client(url, key)
            print("Supabase Storage initialized.")
        except Exception as e:
            print(f"Supabase Storage init failed: {e}. Using local storage.")
    else:
        print("SUPABASE_URL/KEY not set. Images will be stored locally.")


def _unique_name(filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower() or ".jpg"
    return f"{datetime.now().strftime('%Y%m/%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"


def upload_image(file_bytes: bytes, filename: str, content_type: str) -> str:
    """이미지를 저장하고 접근 가능한 URL을 반환"""
    name = _unique_name(filename)

    if _supabase:
        try:
            bucket = os.environ.get("SUPABASE_BUCKET", "receipts")
            _supabase.storage.from_(bucket).upload(
                path=name, file=file_bytes, file_options={"content-type": content_type or "image/jpeg"}
            )
            return _supabase.storage.from_(bucket).get_public_url(name)
        except Exception as e:
            print(f"Supabase upload failed: {e}. Falling back to local storage.")

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
