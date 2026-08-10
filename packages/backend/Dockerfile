FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./

RUN bun install

COPY . .

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "src/main.ts"]