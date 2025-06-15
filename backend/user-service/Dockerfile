# -----------------------------
# Stage 1: Build the application
# -----------------------------
# Use Maven with Eclipse Temurin JDK 23 on Alpine Linux for a lightweight build stage
FROM maven:3.9.9-eclipse-temurin-23-alpine AS builder

# Set the working directory for the entire project
WORKDIR /app

# Copy the whole project (includes parent pom and modules)
COPY . .

# Enter the specific microservice module directory
WORKDIR /app/backend/user-service

# Build the Spring Boot application and skip tests for faster builds
RUN mvn clean package -DskipTests

# -----------------------------
# Stage 2: Create a minimal runtime image
# -----------------------------
FROM eclipse-temurin:23-jre-alpine-3.21

# Set working directory in the runtime container
WORKDIR /app

# Copy the built JAR file from builder stage and rename it
COPY --from=builder /app/backend/user-service/target/*.jar user-service.jar

# Expose the port used by the user service
EXPOSE 8081

# Start the Spring Boot application
ENTRYPOINT ["java", "-jar", "/app/user-service.jar"]
