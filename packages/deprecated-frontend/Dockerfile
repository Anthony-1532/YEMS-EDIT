FROM oven/bun:1.1.45-alpine

WORKDIR /app

COPY package.json ./

RUN bun install

COPY . .

EXPOSE 80

CMD ["bun", "run", "start"]