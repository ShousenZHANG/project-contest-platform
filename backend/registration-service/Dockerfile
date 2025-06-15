# -----------------------------
# Stage 1: Build the application
# -----------------------------
# Use Maven with Eclipse Temurin JDK 23 on Alpine Linux for a lightweight build stage
FROM maven:3.9.9-eclipse-temurin-23-alpine AS builder

# Set root working directory inside the container
WORKDIR /app

# Copy the entire project into the container (including parent pom)
COPY . .

# Move into the module's directory to build
WORKDIR /app/backend/registration-service

# Build the Spring Boot application and skip tests for faster builds
RUN mvn clean package -DskipTests

# -----------------------------
# Stage 2: Create a minimal runtime image
# -----------------------------
FROM eclipse-temurin:23-jre-alpine-3.21

# Set working directory for the runtime container
WORKDIR /app

# Copy the built JAR file from builder stage
COPY --from=builder /app/backend/registration-service/target/*.jar registration-service.jar

# Expose the port used by the Competition Service
EXPOSE 8084

# Define the command to run the application
ENTRYPOINT ["java", "-jar", "/app/registration-service.jar"]
