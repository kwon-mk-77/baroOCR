import os
import secrets
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode, quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import SESSION_COOKIE, get_current_user, require_admin, set_session_cookie, is_secure
from db import get_db
from models import User

router = APIRouter(prefix="/api")

STATE_COOKIE = "kakao_state"


def user_to_dict(u: User):
    return {
        "id": u.id,
        "nickname": u.nickname,
        "profile_image": u.profile_image,
        "role": u.role,
        "status": u.status,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
    }


def _redirect_uri(request: Request) -> str:
    """카카오 개발자 콘솔에 등록한 Redirect URI와 정확히 같아야 함"""
    if os.environ.get("KAKAO_REDIRECT_URI"):
        return os.environ["KAKAO_REDIRECT_URI"]
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    return f"{proto}://{host}/api/auth/kakao/callback"


def _fail(message: str) -> RedirectResponse:
    return RedirectResponse(f"/?login_error={quote(message)}", status_code=302)


@router.get("/auth/kakao/login")
def kakao_login(request: Request):
    client_id = os.environ.get("KAKAO_REST_API_KEY")
    if not client_id:
        return _fail("카카오 로그인이 아직 설정되지 않았습니다. (KAKAO_REST_API_KEY)")

    state = secrets.token_urlsafe(16)
    url = "https://kauth.kakao.com/oauth/authorize?" + urlencode({
        "client_id": client_id,
        "redirect_uri": _redirect_uri(request),
        "response_type": "code",
        "state": state,
    })
    response = RedirectResponse(url, status_code=302)
    response.set_cookie(STATE_COOKIE, state, max_age=600, httponly=True, samesite="lax", secure=is_secure(request))
    return response


@router.get("/auth/kakao/callback")
async def kakao_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if error:
        return _fail("카카오 로그인이 취소되었습니다.")
    if not code or not state or state != request.cookies.get(STATE_COOKIE):
        return _fail("로그인 요청이 만료되었습니다. 다시 시도해주세요.")

    token_data = {
        "grant_type": "authorization_code",
        "client_id": os.environ.get("KAKAO_REST_API_KEY", ""),
        "redirect_uri": _redirect_uri(request),
        "code": code,
    }
    if os.environ.get("KAKAO_CLIENT_SECRET"):
        token_data["client_secret"] = os.environ["KAKAO_CLIENT_SECRET"]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post("https://kauth.kakao.com/oauth/token", data=token_data)
            if token_resp.status_code != 200:
                print(f"Kakao token error: {token_resp.text}")
                return _fail("카카오 인증에 실패했습니다. 설정을 확인해주세요.")
            access_token = token_resp.json()["access_token"]
            me_resp = await client.get(
                "https://kapi.kakao.com/v2/user/me", headers={"Authorization": f"Bearer {access_token}"}
            )
            me_resp.raise_for_status()
            me = me_resp.json()
    except Exception as e:
        print(f"Kakao login error: {e}")
        return _fail("카카오 서버와 통신 중 오류가 발생했습니다.")

    profile = (me.get("kakao_account") or {}).get("profile") or {}
    props = me.get("properties") or {}
    nickname = profile.get("nickname") or props.get("nickname") or "사용자"
    image = profile.get("thumbnail_image_url") or props.get("thumbnail_image") or ""

    kakao_id = str(me["id"])
    user = db.query(User).filter(User.kakao_id == kakao_id).first()
    if not user:
        # 첫 번째 사용자는 자동으로 관리자
        is_first = db.query(User).count() == 0
        user = User(
            kakao_id=kakao_id,
            role="admin" if is_first else "member",
            status="approved" if is_first else "pending",
        )
        db.add(user)
    user.nickname = nickname
    user.profile_image = image
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    response = RedirectResponse("/home", status_code=302)
    set_session_cookie(response, request, user.id)
    response.delete_cookie(STATE_COOKIE)
    return response


@router.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return user_to_dict(user)


@router.post("/auth/logout")
def logout():
    response = RedirectResponse("/", status_code=303)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return response


@router.post("/auth/dev-login")
def dev_login(request: Request, db: Session = Depends(get_db)):
    """로컬 개발 전용: AUTH_DEV_LOGIN=1 이고 Vercel이 아닐 때만 동작"""
    if os.environ.get("AUTH_DEV_LOGIN") != "1" or os.environ.get("VERCEL"):
        raise HTTPException(404)
    user = db.query(User).filter(User.kakao_id == "dev").first()
    if not user:
        is_first = db.query(User).count() == 0
        user = User(kakao_id="dev", nickname="개발자", role="admin" if is_first else "member",
                    status="approved" if is_first else "pending")
        db.add(user)
        db.commit()
    response = RedirectResponse("/home", status_code=303)
    set_session_cookie(response, request, user.id)
    return response


# ---------- 사용자 관리 (관리자) ----------

class UserUpdate(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None


@router.get("/users")
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    users = db.query(User).order_by(User.status != "pending", User.created_at.desc()).all()
    return [user_to_dict(u) for u in users]


@router.patch("/users/{user_id}")
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "사용자를 찾을 수 없습니다.")
    if data.role is not None and data.role not in ("admin", "member"):
        raise HTTPException(400, "잘못된 권한입니다.")
    if data.status is not None and data.status not in ("pending", "approved", "blocked"):
        raise HTTPException(400, "잘못된 상태입니다.")

    if user.id == admin.id and (data.role == "member" or data.status in ("pending", "blocked")):
        raise HTTPException(400, "자기 자신의 관리자 권한은 해제할 수 없습니다.")

    if data.role is not None:
        user.role = data.role
    if data.status is not None:
        user.status = data.status
    db.commit()
    return user_to_dict(user)
