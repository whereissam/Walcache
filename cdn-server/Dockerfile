FROM oven/bun:1-alpine as base

WORKDIR /app

FROM base as deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

FROM base as build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base as runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 3000

CMD ["bun", "start"]