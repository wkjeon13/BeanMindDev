@echo off
chcp 65001 >nul

:: 관리자 권한이 있는지 체크
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo [시스템] 방화벽 개방 및 좀비 엔진 셧다운을 위해 관리자 권한 상승을 시도합니다...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

echo ===================================================
echo 🚀 BeanMind 로컬 포트 충돌 및 모바일 앱 접속 개방 도구 🚀
echo ===================================================
echo.
echo 🛑 1. 3001, 3002, 3003 포트 및 Nginx 좀비 프로세스 강제 종료 중...
taskkill /f /im node.exe
taskkill /f /im tsx.exe
taskkill /f /im nodemon.exe
taskkill /f /im nginx.exe
net stop nginx >nul 2>&1
timeout /t 2 >nul
net start nginx

echo.
echo 🔓 2. 윈도우 방화벽 포트 3001 (API), 3005 (우회 API), 3002 (프론트), 3307 (DB) 즉시 허용 규칙 추가 중...
netsh advfirewall firewall delete rule name="BeanMind_API_3001" >nul 2>&1
netsh advfirewall firewall add rule name="BeanMind_API_3001" dir=in action=allow protocol=TCP localport=3001

netsh advfirewall firewall delete rule name="BeanMind_API_3005" >nul 2>&1
netsh advfirewall firewall add rule name="BeanMind_API_3005" dir=in action=allow protocol=TCP localport=3005

netsh advfirewall firewall delete rule name="BeanMind_Vite_3002" >nul 2>&1
netsh advfirewall firewall add rule name="BeanMind_Vite_3002" dir=in action=allow protocol=TCP localport=3002

netsh advfirewall firewall delete rule name="MySQL_3307_External" >nul 2>&1
netsh advfirewall firewall add rule name="MySQL_3307_External" dir=in action=allow protocol=TCP localport=3307

echo.
echo ===================================================
echo ✅ 모든 좀비 엔진 셧다운 및 모바일 앱용 방화벽 개방이 성공적으로 완료되었습니다!
echo    이제 Antigravity 터미널에서 아래 명령어로 통합 재기동(Start)해 주세요:
echo    npm run dev:all
echo ===================================================
echo.
pause
