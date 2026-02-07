/**
 * STEREOWOOD Color System backend entry.
 * Responsibilities:
 * 1) Initialize Express and middleware
 * 2) Mount static assets and API routes
 * 3) Initialize DB and migrations
 * 4) Start server with port fallback
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { db } = require('./db/index');
const { initDatabase, runMigrations } = require('./db/migrations');
const routes = require('./routes');

const app = express();
const DEFAULT_PORT = Number.isFinite(Number.parseInt(process.env.PORT, 10))
  ? Number.parseInt(process.env.PORT, 10)
  : 9099;
const MAX_PORT_ATTEMPTS = 5;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Force UTF-8 for JSON responses.
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson.call(this, data);
  };
  next();
});

// Uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Legacy production UI
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'legacy');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use('/', express.static(FRONTEND_DIR, { extensions: ['html'] }));
}

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Initialize DB
initDatabase();
runMigrations();

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API routes
app.use('/api', routes);

// System config for frontend
app.get('/api/config', (req, res) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.json({
    mode: isDevelopment ? 'test' : 'production',
    testModeItemsPerPage: isDevelopment ? 2 : (parseInt(process.env.TEST_MODE_ITEMS_PER_PAGE, 10) || 12),
    features: {
      formulaCalculator: process.env.ENABLE_FORMULA_CALCULATOR === 'true',
      artworkManagement: process.env.ENABLE_ARTWORK_MANAGEMENT === 'true',
      montMarte: process.env.ENABLE_MONT_MARTE === 'true',
    },
  });
});

// Error middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err && err.stack ? err.stack : err);

  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  } else {
    res.status(500).json({
      error: '服务器内部错误',
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: `路径不存在: ${req.method} ${req.url}`,
  });
});

// Start server with fallback ports
let serverInstance = null;

function startServer(port, attempt = 0) {
  const server = app
    .listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    })
    .on('error', (error) => {
      if (error && error.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
        const nextPort = port + 1;
        console.warn(
          `Port ${port} is in use. Attempting ${nextPort} (attempt ${
            attempt + 2
          }/${MAX_PORT_ATTEMPTS + 1}).`
        );
        startServer(nextPort, attempt + 1);
        return;
      }
      console.error('Server failed to start:', error);
      process.exitCode = 1;
    });

  serverInstance = server;
}

startServer(DEFAULT_PORT);

// Graceful shutdown
process.on('SIGTERM', () => {
  if (!serverInstance) {
    process.exit(0);
    return;
  }
  serverInstance.close(() => {
    if (db) {
      db.close(() => {
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  process.emit('SIGTERM');
});

module.exports = app;
