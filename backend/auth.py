"""세션 토큰(HMAC 서명) 발급/검증과 로그인 사용자 의존성"""
import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from db import get_db
from models import User

SESSION_COOKIE = "baro_session"
SESSION_DAYS = 30


_RANDOM_SECRET = os.urandom(32).hex()


def _secret() -> bytes:
    secret = os.environ.get("SESSION_SECRET")
    if not secret and os.environ.get("KAKAO_CLIENT_SECRET"):
        # 비공개 값인 Client Secret에서 파생 (서버리스 인스턴스 간에도 동일)
        secret = hashlib.sha256(("baroinsu-session:" + os.environ["KAKAO_CLIENT_SECRET"]).encode()).hexdigest()
    if not secret:
        # 비밀값이 전혀 없으면 프로세스마다 임의 생성 (재시작 시 재로그인 필요). REST API 키는 공개값이라 사용하지 않음
        secret = _RANDOM_SECRET
    return secret.encode()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def create_token(user_id: int) -> str:
    payload = _b64(json.dumps({"uid": user_id, "exp": int(time.time()) + SESSION_DAYS * 86400}).encode())
    sig = _b64(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def read_token(token: str):
    try:
        payload, sig = token.split(".")
        expected = _b64(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(_unb64(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data.get("uid")
    except Exception:
        return None


def is_secure(request: Request) -> bool:
    return request.headers.get("x-forwarded-proto", request.url.scheme) == "https"


def set_session_cookie(response, request: Request, user_id: int):
    response.set_cookie(
        SESSION_COOKIE, create_token(user_id), max_age=SESSION_DAYS * 86400,
        httponly=True, samesite="lax", secure=is_secure(request), path="/",
    )


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    uid = read_token(request.cookies.get(SESSION_COOKIE, ""))
    user = db.get(User, uid) if uid else None
    if not user:
        raise HTTPException(401, "로그인이 필요합니다.")
    return user


def require_user(user: User = Depends(get_current_user)) -> User:
    if user.status != "approved":
        raise HTTPException(403, "관리자 승인 후 이용할 수 있습니다.")
    return user


def require_admin(user: User = Depends(require_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "관리자만 사용할 수 있습니다.")
    return user
