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

# Create base runtime directories before source copy.
# Note: /app/backend/uploads is created after COPY to avoid conflict with
# local Windows junctions (backend/uploads) in build context.
RUN mkdir -p /data /app/backend/backups /app/frontend/legacy /app/frontend/pilot

# Copy installed node_modules from base stage
COPY --from=base /app/node_modules ./node_modules
# Copy backend source
COPY backend ./backend
# Copy legacy frontend static assets
COPY frontend/legacy ./frontend/legacy
# Copy pilot frontend static assets (A7, optional route)
COPY frontend/pilot ./frontend/pilot
# Copy scripts for backup/restore
COPY scripts ./scripts
# Copy package.json for reference
COPY package.json ./

# Ensure runtime volume mount points exist after source copy.
RUN mkdir -p /app/backend/uploads /app/backend/backups
VOLUME ["/data", "/app/backend/uploads", "/app/backend/backups"]

# Expose port
EXPOSE 9099

# Healthcheck: simple HTTP GET on /health
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:9099/health || exit 1

# Start server
WORKDIR /app/backend
CMD ["node", "server.js"]
