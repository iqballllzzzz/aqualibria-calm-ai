# syntax=docker/dockerfile:1.6
# Multi-stage build for the Aqualibria Master Architect agent backend.

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ git docker-cli
COPY package.json ./
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache git docker-cli tini && \
    addgroup -g 1000 aqualibria && \
    adduser -D -u 1000 -G aqualibria aqualibria && \
    mkdir -p /var/aqualibria/workspaces && \
    chown -R aqualibria:aqualibria /var/aqualibria
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER aqualibria
EXPOSE 8787
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
