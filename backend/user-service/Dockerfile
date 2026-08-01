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
RUN mvn -f /app/pom.xml -pl backend/user-service -am clean package -DskipTests

# -----------------------------
# Stage 2: Create a minimal runtime image
# -----------------------------
FROM eclipse-temurin:23-jre-alpine-3.21

# Set working directory in the runtime container
WORKDIR /app
RUN apk add --no-cache bash

# Copy the built JAR file from builder stage and rename it
COPY --from=builder /app/backend/user-service/target/*.jar user-service.jar

COPY ../../wait-for-it.sh /wait-for-it.sh
# Strip CR before chmod: a Windows checkout can hand us a CRLF copy, and the
# shebang then resolves to a binary named "bash" — the container exits 127
# with no application log to explain why. .gitattributes prevents it at the
# source; this makes a stale working tree harmless too.
RUN sed -i 's/$//' /wait-for-it.sh && chmod +x /wait-for-it.sh

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 8081

CMD /wait-for-it.sh mysql:3306 -- \
    /wait-for-it.sh redis:6379 -- \
    /wait-for-it.sh rabbitmq:5672 -- \
    /wait-for-it.sh nacos:8848 -- \
    /wait-for-it.sh minio:9000 -- \
    java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom -jar /app/user-service.jar
