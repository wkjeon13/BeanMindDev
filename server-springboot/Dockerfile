# Base image with JDK 21
FROM eclipse-temurin:21-jdk-alpine

# Set working directory inside the container
WORKDIR /app

# Copy the built jar file to the container
# Wildcard is used, but we exclude the -plain.jar by copying the main application jar file
COPY build/libs/*-SNAPSHOT.jar app.jar

# Expose port 4000
EXPOSE 4000

# Execute the application
ENTRYPOINT ["java", "-Duser.timezone=Asia/Seoul", "-jar", "app.jar"]
