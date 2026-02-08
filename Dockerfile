# Multi-stage build
# Stage 1: Install dependencies
FROM node:20-alpine AS base
WORKDIR /app
# Copy package files from root and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Runtime image
FROM node:20-alpine
ENV TZ=Asia/Shanghai \
    NODE_ENV=production \
    PORT=9099 \
    DB_FILE=/data/color_management.db
WORKDIR /app

# Create data, upload, and backup volumes
RUN mkdir -p /data /app/backend/uploads /app/backend/backups /app/frontend/legacy
VOLUME ["/data", "/app/backend/uploads", "/app/backend/backups"]

# Copy installed node_modules from base stage
COPY --from=base /app/node_modules ./node_modules
# Copy backend source
COPY backend ./backend
# Copy legacy frontend static assets only
COPY frontend/legacy ./frontend/legacy
# Copy scripts for backup/restore
COPY scripts ./scripts
# Copy package.json for reference
COPY package.json ./

# Expose port
EXPOSE 9099

# Healthcheck: simple HTTP GET on /health
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:9099/health || exit 1

# Start server
WORKDIR /app/backend
CMD ["node", "server.js"]
