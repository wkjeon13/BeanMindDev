#!/bin/bash

# .env 파일 로드
if [ -f .env ]; then
  # 주석 제외하고 빈 줄 제외하여 export
  export $(grep -v '^#' .env | xargs)
fi

echo "☕️ [Mac OS] 스프링 부트 빌드 시작..."
cd server-springboot || exit 1
chmod +x ./gradlew
./gradlew clean bootJar
if [ $? -ne 0 ]; then
    echo "❌ Gradle 빌드 실패"
    exit 1
fi
cd ..
echo "✅ 스프링 부트 빌드 완료."

# 2. 기존 도커 컨테이너 중지 및 삭제
echo "🔄 기존 도커 컨테이너 중지 및 삭제 중..."
docker stop beanmind-springboot-container 2>/dev/null
docker rm beanmind-springboot-container 2>/dev/null

# 3. 도커 이미지 빌드
echo "🐳 도커 이미지 재빌드 시작..."
docker build -t beanmind-curator-springboot:latest ./server-springboot
if [ $? -ne 0 ]; then
    echo "❌ 도커 이미지 빌드 실패"
    exit 1
fi

# 환경변수 기본값 설정
GEMINI_API_KEY=${GEMINI_API_KEY:-"YOUR_GEMINI_API_KEY"}
OPENAI_API_KEY=${VITE_OPENAI_API_KEY:-"YOUR_OPENAI_API_KEY"}
SMTP_PASS=${SMTP_PASS:-"YOUR_SMTP_PASS"}
GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY:-"YOUR_GOOGLE_MAPS_API_KEY"}
DATABASE_URL=${DATABASE_URL:-"mysql://root:rootpassword@localhost:3307/beanminddev"}
NAVER_CLIENT_SECRET=${NAVER_CLIENT_SECRET:-"YOUR_NAVER_CLIENT_SECRET"}

# 4. 도커 컨테이너 실행 (Mac/Linux용 경로 바인딩 적용)
echo "🚀 도커 컨테이너 실행..."
docker run -d --name beanmind-springboot-container \
  --network beanmind_default \
  -p 3000:3000 \
  -v "$(pwd)/uploads:/app/uploads" \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e VITE_GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e DATABASE_URL="$DATABASE_URL" \
  -e SMTP_HOST="smtp.gmail.com" \
  -e SMTP_PORT="587" \
  -e SMTP_USER="wkjeon@gmail.com" \
  -e SMTP_PASS="$SMTP_PASS" \
  -e VITE_GOOGLE_CLIENT_ID="737925841182-o7jds5r2egkjbgl9c9h2gq4rrg8ms0ps.apps.googleusercontent.com" \
  -e GOOGLE_CLIENT_ID="737925841182-o7jds5r2egkjbgl9c9h2gq4rrg8ms0ps.apps.googleusercontent.com" \
  -e VITE_APPLE_CLIENT_ID="com.beanmind.curator.web" \
  -e VITE_APPLE_REDIRECT_URL="https://www.beanmindcurator.com/api/auth/apple/callback" \
  -e KAKAO_REST_API_KEY="8550621c38423f6b6ad9ba39de038fa0" \
  -e VITE_API_BASE_URL="http://dev.beanmindcurator.com:3000" \
  -e VITE_OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e JWT_SECRET="beanmind_secure_jwt_secret_key_2026_test" \
  -e NAVER_CLIENT_ID="JjcTKZ5zTUmyIGOUBzYd" \
  -e NAVER_CLIENT_SECRET="$NAVER_CLIENT_SECRET" \
  -e VITE_NAVER_CLIENT_ID="JjcTKZ5zTUmyIGOUBzYd" \
  -e VITE_GOOGLE_MAPS_API_KEY="$GOOGLE_MAPS_API_KEY" \
  -e GOOGLE_PLACES_API_KEY="$GOOGLE_MAPS_API_KEY" \
  -e DB_HOST="db" \
  -e DB_PORT="3306" \
  beanmind-curator-springboot:latest

if [ $? -ne 0 ]; then
    echo "❌ 도커 컨테이너 실행 실패"
    exit 1
fi

echo "✨ [Mac OS] 스프링 부트 컨테이너 재배포 완료!"
