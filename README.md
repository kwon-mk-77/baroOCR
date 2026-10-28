# 바로인수 v2

건설현장 자재 인수증을 촬영하면 AI가 업체·품목·수량을 읽어 저장하고, 현장별로 조회·집계·엑셀 내보내기까지 하는 모바일 웹앱입니다.

## 구조

```
backend/            FastAPI + SQLAlchemy
  main.py           앱 진입점 (DB 테이블 자동 생성 + 기본 데이터 시드)
  db.py             DB 연결 (DATABASE_URL 없으면 로컬 SQLite)
  models.py         테이블 정의
  schemas.py        요청 검증 모델
  routers/          API (master: 현장·공정·업체·자재 / receipts: 인수증 / stats: 통계)
  services/         OCR(Upstage 또는 OpenAI), 이미지 저장(Supabase Storage 또는 로컬)
  schema.sql        PostgreSQL 스키마 참고용
  migrate_legacy.py v1 receipts 테이블 → v2 이전 스크립트
frontend/           React + Vite
  src/pages/        화면 (홈, 촬영, 입력, 내역, 상세, 수정, 통계, 설정)
  src/components/   공통 UI, 인수증 입력 폼
  src/lib/          API 호출, 날짜/숫자 포맷, 로컬 설정
```

## DB 구조

| 테이블 | 설명 |
|---|---|
| `sites` | 현장 (여러 현장을 나눠 관리, 보관 처리 가능) |
| `processes` | 공정 (토공사·골조공사 … 색상 포함, 최초 실행 시 자동 생성) |
| `vendors` | 공급업체 (입력 시 자동 등록 → 자동완성) |
| `materials` | 자재 마스터 (자주 쓰는 단위 기억 → 자동완성) |
| `delivery_receipts` | 인수증 1장: 현장, 공정, 업체, **인수일**, 기사, 차량번호, 인수자, 메모, 사진, OCR 원본 |
| `delivery_items` | 인수증의 품목 라인 (한 장에 여러 품목). 수량·중량은 **숫자 + 단위** 분리 저장 → 합계 계산 가능 |

## 로그인 (카카오)

- 카카오 계정으로 로그인합니다. **처음 로그인한 사람이 자동으로 관리자**가 되고, 이후 사용자는 `승인 대기` 상태로 시작합니다.
- 관리자는 **설정 > 사용자 관리**에서 승인 / 차단 / 관리자 지정을 할 수 있습니다.
- 세션은 httpOnly 쿠키(30일)로 유지되며, `/api/auth/*`와 `/api/health`를 제외한 모든 API는 승인된 사용자만 호출할 수 있습니다.

카카오 개발자 콘솔 설정 (developers.kakao.com > 내 애플리케이션):
1. **앱 설정 > 플랫폼 > Web**: `https://baro-ocr.vercel.app`, `http://localhost:5173`
2. **카카오 로그인**: 활성화 ON, Redirect URI 등록
   - `https://baro-ocr.vercel.app/api/auth/kakao/callback`
   - `http://localhost:5173/api/auth/kakao/callback`
3. **카카오 로그인 > 동의항목**: 닉네임, 프로필 사진 (이메일 불필요)
4. **카카오 로그인 > 보안**: Client Secret 생성 후 사용 설정 (권장)
5. 환경 변수에 `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `SESSION_SECRET` 입력

## 로컬 실행

**Windows: `실행.bat`을 더블클릭**하면 백엔드·프론트엔드가 켜지고 브라우저가 열립니다. (최초 1회 패키지 자동 설치)

> 폴더 경로에 `&`가 있어서 `npm run dev`가 동작하지 않습니다. `run-frontend.bat` 또는 `node node_modules\vite\bin\vite.js`로 실행하세요.

수동 실행:

```bash
# 1) 백엔드
cd backend
pip install -r requirements.txt
python main.py                 # http://127.0.0.1:8000  (DB: backend/data/baroinsu.db)

# 2) 프론트엔드 (새 터미널)
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

`.env.template`을 참고해 프로젝트 루트의 `.env`에 키를 넣으세요. AI 인식은 `UPSTAGE_API_KEY`가 있으면 Upstage, 없으면 `OPENAI_API_KEY`(GPT 비전)를 사용합니다.

> 휴대폰 카메라는 **https** 또는 localhost에서만 켜집니다. 같은 와이파이에서 http로 접속하면 '사진 선택'으로 대체됩니다.

## Vercel 배포

환경 변수에 아래를 추가하세요.

- `DATABASE_URL` — Supabase > Project Settings > Database > Connection string (Transaction pooler). **없으면 데이터가 유지되지 않습니다.**
- `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET` — 사진 저장용 (public 버킷)
- `UPSTAGE_API_KEY` 또는 `OPENAI_API_KEY`

## 기존(v1) 데이터 이전

v1은 Supabase `receipts` 테이블 하나를 사용했습니다. v2 테이블은 이름이 달라 기존 데이터와 충돌하지 않습니다.

```bash
cd backend
python migrate_legacy.py           # 미리보기
python migrate_legacy.py --commit  # 실제 이전 (첫 번째 현장으로 들어감)
```
