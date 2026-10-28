@echo off
chcp 65001 > nul
start "" "%~dp0run-backend.bat"
start "" "%~dp0run-frontend.bat"
timeout /t 4 > nul
start "" http://localhost:5173
