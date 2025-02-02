FROM node:22.9.0-bookworm AS base

# Build app
FROM base AS builder
WORKDIR /app
COPY package*.json yarn.lock* ./
RUN yarn install --frozen-lockfile
COPY . .
RUN npm run build

# Install production only dependencies
FROM base AS installer
WORKDIR /app
COPY package*.json yarn.lock* ./
RUN yarn install --frozen-lockfile --production

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
