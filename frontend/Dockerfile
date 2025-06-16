# -----------------------------
# Stage 1: Build the React app
# -----------------------------
FROM node:alpine3.22 AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
