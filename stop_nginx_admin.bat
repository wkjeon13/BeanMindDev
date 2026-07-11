@echo off
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

taskkill /f /im nginx.exe
echo NGINX_STOPPED_SUCCESSFULLY > c:\Coffee_Dev\beanmind\nginx_stop_result.txt
