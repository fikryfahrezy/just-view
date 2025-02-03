FROM node:22.9.0-bookworm AS base

# Build app
FROM base AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile
COPY . .
RUN npm run build

# Install production only dependencies
FROM base AS installer
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile --production

# Run app
FROM base AS runner
COPY --from=installer /app/package*.json ./
COPY --from=installer /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose the port
ARG PORT=3000
EXPOSE ${PORT}
ENV PORT=${PORT}

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["npm", "start"]