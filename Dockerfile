# Multi-stage build (though frontend is static already)
# Stage 1: base deps
FROM node:20-alpine AS base
WORKDIR /app
# Install backend dependencies only
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install --production && npm cache clean --force

# Stage 2: runtime image
FROM node:20-alpine
ENV TZ=Asia/Shanghai \
    NODE_ENV=production \
    PORT=3000 \
    DB_FILE=/data/color_management.db
WORKDIR /app

# Create data and uploads volumes
RUN mkdir -p /data /app/backend/uploads /app/frontend
VOLUME ["/data", "/app/backend/uploads"]

# Copy installed node_modules and backend source
COPY --from=base /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
# Copy frontend static assets
COPY frontend ./frontend

# Expose port
EXPOSE 3000

# Healthcheck: simple HTTP GET on root
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/ || exit 1

# Start server
WORKDIR /app/backend
CMD ["node", "server.js"]
