# Stage 1: Build Java Application using Gradle
FROM gradle:8.8-jdk21-alpine AS builder
WORKDIR /app
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
COPY src src
RUN chmod +x ./gradlew
RUN ./gradlew clean bootJar --no-daemon

# Stage 2: Final lightweight execution image
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*-SNAPSHOT.jar app.jar
EXPOSE 4000
ENTRYPOINT ["java", "-Duser.timezone=Asia/Seoul", "-jar", "app.jar"]
