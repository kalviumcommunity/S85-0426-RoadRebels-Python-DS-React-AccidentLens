FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci 2>&1 || npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3001"]
