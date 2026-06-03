@echo off
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

taskkill /f /im nginx.exe
timeout /t 2 >nul

cd C:\nginx-1.26.3
start nginx.exe

echo NGINX_RESTARTED_SUCCESSFULLY > C:\Working\beanmind_-ai-coffee-curator\nginx_restart_result.txt
