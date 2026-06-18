# rebuild_springboot.ps1
# .env 파일 로드
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split '=', 2
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()
                $value = $value.Trim('"', "'")
                [System.Environment]::SetEnvironmentVariable($key, $value)
                Set-Item "env:$key" $value
            }
        }
    }
}

# 1. Gradle 빌드
Write-Host "스프링 부트 빌드 시작..." -ForegroundColor Cyan
Push-Location server-springboot
.\gradlew clean bootJar
if ($LASTEXITCODE -ne 0) {
    Write-Error "Gradle 빌드 실패"
    Pop-Location
    exit $LASTEXITCODE
}
Pop-Location
Write-Host "스프링 부트 빌드 완료." -ForegroundColor Green

# 2. 기존 도커 컨테이너 중지 및 삭제
Write-Host "기존 도커 컨테이너 중지 및 삭제 중..." -ForegroundColor Cyan
docker stop beanmind-springboot-container 2>$null
docker rm beanmind-springboot-container 2>$null

# 3. 도커 이미지 빌드
Write-Host "도커 이미지 재빌드 시작..." -ForegroundColor Cyan
docker build -t beanmind-curator-springboot:latest ./server-springboot
if ($LASTEXITCODE -ne 0) {
    Write-Error "도커 이미지 빌드 실패"
    exit $LASTEXITCODE
}

# 환경변수 기본값 설정 (민감 정보 유출 방지)
$GEMINI_API_KEY = if ($env:GEMINI_API_KEY) { $env:GEMINI_API_KEY } else { "YOUR_GEMINI_API_KEY" }
$OPENAI_API_KEY = if ($env:VITE_OPENAI_API_KEY) { $env:VITE_OPENAI_API_KEY } else { "YOUR_OPENAI_API_KEY" }
$SMTP_PASS = if ($env:SMTP_PASS) { $env:SMTP_PASS } else { "YOUR_SMTP_PASS" }
$GOOGLE_MAPS_API_KEY = if ($env:VITE_GOOGLE_MAPS_API_KEY) { $env:VITE_GOOGLE_MAPS_API_KEY } else { "YOUR_GOOGLE_MAPS_API_KEY" }
$DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "mysql://root:rootpassword@localhost:3307/beanminddev" }
$NAVER_CLIENT_SECRET = if ($env:NAVER_CLIENT_SECRET) { $env:NAVER_CLIENT_SECRET } else { "YOUR_NAVER_CLIENT_SECRET" }

# 4. 도커 컨테이너 실행
Write-Host "도커 컨테이너 실행..." -ForegroundColor Cyan
docker run -d --name beanmind-springboot-container `
  --network beanmind_-ai-coffee-curator_default `
  -p 4000:4000 `
  -v c:\Coffee_Dev\beanmind\uploads:/app/uploads `
  -e GEMINI_API_KEY="$GEMINI_API_KEY" `
  -e VITE_GEMINI_API_KEY="$GEMINI_API_KEY" `
  -e DATABASE_URL="$DATABASE_URL" `
  -e SMTP_HOST="smtp.gmail.com" `
  -e SMTP_PORT="587" `
  -e SMTP_USER="wkjeon@gmail.com" `
  -e SMTP_PASS="$SMTP_PASS" `
  -e VITE_GOOGLE_CLIENT_ID="737925841182-o7jds5r2egkjbgl9c9h2gq4rrg8ms0ps.apps.googleusercontent.com" `
  -e GOOGLE_CLIENT_ID="737925841182-o7jds5r2egkjbgl9c9h2gq4rrg8ms0ps.apps.googleusercontent.com" `
  -e VITE_APPLE_CLIENT_ID="com.beanmind.curator.web" `
  -e VITE_APPLE_REDIRECT_URL="https://www.beanmindcurator.com/api/auth/apple/callback" `
  -e KAKAO_REST_API_KEY="8550621c38423f6b6ad9ba39de038fa0" `
  -e VITE_API_BASE_URL="http://dev.beanmindcurator.com:4000" `
  -e VITE_OPENAI_API_KEY="$OPENAI_API_KEY" `
  -e JWT_SECRET="beanmind_secure_jwt_secret_key_2026_test" `
  -e NAVER_CLIENT_ID="JjcTKZ5zTUmyIGOUBzYd" `
  -e NAVER_CLIENT_SECRET="$NAVER_CLIENT_SECRET" `
  -e VITE_NAVER_CLIENT_ID="JjcTKZ5zTUmyIGOUBzYd" `
  -e VITE_GOOGLE_MAPS_API_KEY="$GOOGLE_MAPS_API_KEY" `
  -e GOOGLE_PLACES_API_KEY="$GOOGLE_MAPS_API_KEY" `
  -e DB_HOST="db" `
  -e DB_PORT="3306" `
  beanmind-curator-springboot:latest

if ($LASTEXITCODE -ne 0) {
    Write-Error "도커 컨테이너 실행 실패"
    exit $LASTEXITCODE
}

Write-Host "스프링 부트 컨테이너 재배포 완료!" -ForegroundColor Green
