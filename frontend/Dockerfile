# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci 2>&1 || npm install

COPY . .

RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

# Vite outputs to 'dist' instead of CRA's 'build'
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
