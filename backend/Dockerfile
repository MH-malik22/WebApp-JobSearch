FROM node:20-alpine

# wget is used by the docker compose healthcheck.
RUN apk add --no-cache wget

WORKDIR /app

# Install deps in a separate layer so dependency-only changes don't bust
# the source-code layer cache.
COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Run as a non-root user. node:alpine ships with a `node` user (uid 1000).
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health/live || exit 1

CMD ["node", "src/server.js"]
