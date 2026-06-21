# scratch_run_bypass.ps1
# 1. Stop Native MySQL Service
Write-Host "Stopping MySQL8041 service..." -ForegroundColor Cyan
Stop-Service -Name MySQL8041 -Force -ErrorAction SilentlyContinue

# 2. Start MySQL in skip-grant-tables mode (hidden window)
Write-Host "Starting temporary mysqld without password check..." -ForegroundColor Cyan
$binPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
$defaultsFile = "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"
Start-Process $binPath -ArgumentList "--defaults-file=`"$defaultsFile`" --skip-grant-tables --shared-memory" -WindowStyle Hidden

# 3. Wait for database to initialize
Write-Host "Waiting 5 seconds for database initialization..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# 4. Run python dump script
Write-Host "Running Python dump script..." -ForegroundColor Cyan
python scratch_dump_data.py

# 5. Terminate the temporary mysqld process
Write-Host "Stopping temporary mysqld process..." -ForegroundColor Cyan
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue

# 6. Restart the original MySQL Service
Write-Host "Restarting MySQL8041 service..." -ForegroundColor Cyan
Start-Service -Name MySQL8041

Write-Host "Bypass operation completed successfully!" -ForegroundColor Green
