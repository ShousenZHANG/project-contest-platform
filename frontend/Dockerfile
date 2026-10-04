# -----------------------------
# Stage 1: Build the React app
# -----------------------------
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# -----------------------------
# Stage 2: Serve the React app
# -----------------------------
FROM node:24-alpine

WORKDIR /app

RUN npm install -g serve@14.2.4

COPY --from=builder /app/build ./build

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
