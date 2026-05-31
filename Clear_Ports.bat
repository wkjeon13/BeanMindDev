@echo off
:: Check for admin rights
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo [System] Elevating to administrator privileges...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

echo ===================================================
echo   BeanMind Port Collision Resolver ^& Firewall Opener
echo ===================================================
echo.
echo 1. Terminating conflicting processes (node, tsx, nodemon, nginx)...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im tsx.exe >nul 2>&1
taskkill /f /im nodemon.exe >nul 2>&1
taskkill /f /im nginx.exe >nul 2>&1

echo 1.5. Cleaning up obsolete hosts file mapping (39.118.249.241)...
powershell -NoProfile -Command "(Get-Content C:\Windows\System32\drivers\etc\hosts) | Where-Object {$_ -notmatch '39.118.249.241'} | Set-Content C:\Windows\System32\drivers\etc\hosts"

echo 2. Restarting Nginx Service on standard ports (80 / 443)...
net stop nginx >nul 2>&1
timeout /t 2 >nul
net start nginx

echo.
echo 3. Configuring Windows Firewall for Ports 3001, 3005, 3002, 3307, 80, 443...
netsh advfirewall firewall delete rule name="BeanMind_HTTP_80" >nul 2>&1
netsh advfirewall firewall add rule name="BeanMind_HTTP_80" dir=in action=allow protocol=TCP localport=80 >nul 2>&1

netsh advfirewall firewall delete rule name="BeanMind_HTTPS_443" >nul 2>&1
netsh advfirewall firewall add rule name="BeanMind_HTTPS_443" dir=in action=allow protocol=TCP localport=443 >nul 2>&1

netsh advfirewall firewall delete rule name="BeanMind_API_3001" >nul 2>&1
netsh advfirewall firewall add rule name="BeanMind_API_3001" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1

netsh advfirewall firewall delete rule name="BeanMind_API_3005" >nul 2>&1
netsh advfirewall firewall add rule name="BeanMind_API_3005" dir=in action=allow protocol=TCP localport=3005 >nul 2>&1

netsh advfirewall firewall delete rule name="BeanMind_Vite_3002" >nul 2>&1
netsh advfirewall firewall add rule name="BeanMind_Vite_3002" dir=in action=allow protocol=TCP localport=3002 >nul 2>&1

netsh advfirewall firewall delete rule name="MySQL_3307_External" >nul 2>&1
netsh advfirewall firewall add rule name="MySQL_3307_External" dir=in action=allow protocol=TCP localport=3307 >nul 2>&1

echo.
echo ===================================================
echo SUCCESS: Port cleanup and firewall setup complete!
echo Please run this in your terminal to start servers:
echo    npm run dev:all
echo ===================================================
echo.
pause
