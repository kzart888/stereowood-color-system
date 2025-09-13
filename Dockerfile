# Multi-stage build
# Stage 1: Install dependencies
FROM node:20-alpine AS base
WORKDIR /app
# Copy package files from root and install dependencies
COPY package*.json ./
RUN npm install --production && npm cache clean --force

# Stage 2: Runtime image
FROM node:20-alpine
ENV TZ=Asia/Shanghai \
    NODE_ENV=production \
    PORT=9099 \
    DB_FILE=/data/color_management.db
WORKDIR /app

# Create data and uploads volumes
RUN mkdir -p /data /app/backend/uploads /app/frontend
VOLUME ["/data", "/app/backend/uploads"]

# Copy installed node_modules from base stage
COPY --from=base /app/node_modules ./node_modules
# Copy backend source
COPY backend ./backend
# Copy frontend static assets
COPY frontend ./frontend
# Copy scripts for backup/restore
COPY scripts ./scripts
# Copy package.json for reference
COPY package.json ./

# Expose port (will use PORT environment variable)
EXPOSE ${PORT}

# Healthcheck: simple HTTP GET on root using PORT environment variable
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD sh -c "wget -qO- http://127.0.0.1:${PORT}/ || exit 1"

# Start server
WORKDIR /app/backend
CMD ["node", "server.js"]
