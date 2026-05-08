# push_to_github.ps1
Write-Host "🚀 GitHub 전용 푸시 스크립트를 시작합니다..." -ForegroundColor Cyan

# 1. 기존에 잘못 올라간 캐시 삭제 (로컬 파일은 지워지지 않음)
Write-Host "[1/3] Git 캐시 정리를 시작합니다 (큰 파일 제거)..." -ForegroundColor Yellow
git rm -r --cached . 2>$null

# 2. 강력해진 .gitignore 규칙을 바탕으로 필수 파일만 다시 추가
Write-Host "[2/3] 꼭 필요한 소스 코드만 다시 추적합니다..." -ForegroundColor Yellow
git add .

# 3. 커밋 생성
Write-Host "[3/3] 변경사항을 커밋합니다..." -ForegroundColor Yellow
git commit -m "chore: exclude heavy files and scratch scripts for iOS macbook sync"

# 4. 푸시 안내
Write-Host ""
Write-Host "✅ 준비 완료! 이제 아래 명령어를 입력하여 GitHub로 푸시하세요:" -ForegroundColor Green
Write-Host "git push origin main" -ForegroundColor White
