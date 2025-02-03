FROM node:22.9.0-bookworm AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# https://github.com/pnpm/pnpm/issues/9029
# https://github.com/nodejs/corepack/issues/612
RUN npm install -g corepack@latest
RUN corepack enable pnpm

# Build app
FROM base AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./

RUN pnpm i --frozen-lockfile
COPY . .
RUN npm run build

# Install production only dependencies
FROM base AS installer
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
RUN pnpm i --frozen-lockfile --production

# Run app
FROM base AS runner
RUN npm install --global http-server
COPY --from=installer /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose the port
ARG PORT=3000
EXPOSE ${PORT}
ENV PORT=${PORT}

CMD ["sh", "-c", "http-server dist -p ${PORT}"]
