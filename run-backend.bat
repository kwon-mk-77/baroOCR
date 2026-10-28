@echo off
chcp 65001 > nul
title 바로인수 백엔드 (8000)
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
  echo [최초 1회] 파이썬 가상환경을 만들고 패키지를 설치합니다...
  python -m venv .venv
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
)
".venv\Scripts\python.exe" -m uvicorn main:app --port 8000 --reload
pause
