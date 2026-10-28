@echo off
chcp 65001 > nul
title 바로인수 프론트엔드 (5173)
cd /d "%~dp0frontend"
rem 폴더 경로에 '&'가 있어 npm run 스크립트가 깨지므로 node로 직접 실행
if not exist "node_modules\vite\bin\vite.js" call npm install
node "node_modules\vite\bin\vite.js" --port 5173
pause
