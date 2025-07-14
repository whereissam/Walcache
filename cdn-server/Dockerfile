FROM oven/bun:1-alpine as base

WORKDIR /app

FROM base as deps
COPY package.json bun.lockb ./
RUN bun install

FROM base as runtime
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV HOST=0.0.0.0
EXPOSE 4500

CMD ["bun", "src/index.ts"]