import sys
import os

# Ensure backend directory is in sys.path for Vercel module resolution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
# Load env vars from .env file (one level up) — DB 모듈 import 전에 실행해야 함
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from db import Base, engine, SessionLocal, IS_SQLITE
from models import seed_defaults
from services.storage_service import init_storage, UPLOADS_DIR
from routers import master, receipts, stats

app = FastAPI(title="BaroInsu Backend")

# 서버리스(Vercel)에서는 startup 이벤트가 보장되지 않으므로 import 시점에 초기화
try:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as _db:
        seed_defaults(_db)
    print(f"Database ready ({'SQLite' if IS_SQLITE else 'PostgreSQL'}).")
except Exception as e:
    print(f"Database init failed: {e}")

init_storage()

# 로컬 개발용 이미지 서빙 (Vercel에서는 무시됨)
try:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
except Exception as e:
    print(f"Warning: Could not mount uploads directory: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(master.router)
app.include_router(receipts.router)
app.include_router(stats.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "db": "sqlite" if IS_SQLITE else "postgresql"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
