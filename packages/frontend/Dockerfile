FROM oven/bun:1-alpine

WORKDIR /app

# Install dependencies first to leverage Docker layer caching.
# NOTE: bun installs devDependencies (next, typescript, tailwind) which are
# required for the production build, so NODE_ENV is set *after* the build.
COPY package.json ./

RUN bun install

# Application source and public assets
COPY src/ ./src/
COPY public/ ./public/

# Config files required by the Next.js build
COPY next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs next-env.d.ts ./

RUN bun run build

ENV NODE_ENV=production

# Give the non-root user ownership so Next.js can write its runtime cache
RUN chown -R bun:bun /app

EXPOSE 5173

# Run as the non-root "bun" user shipped in the base image
USER bun

CMD ["bun", "run", "start"]
