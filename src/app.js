'use strict';
/**
 * src/app.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Express Application Factory
 *
 * Configures and exports the Express app.
 * Does NOT call app.listen() — that is done in server.js.
 */

const express                  = require('express');
const cors                     = require('cors');
const helmet                   = require('helmet');
const verifyMobileDeviceOnly   = require('./middleware/verifyMobileDeviceOnly');
const apiRouter                = require('./routes/api');
require('dotenv').config();

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'https://symloan.best-travel.ltd',
    'http://127.0.0.1:5000',   // local dev
    'http://localhost:5000',
  ],
  methods:     ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const ua = (req.headers['user-agent'] || '').slice(0, 60);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} — UA: ${ua}`);
  next();
});

// ─── Mobile-Only Gate ─────────────────────────────────────────────────────────
// Apply to all /api routes. Health check is exempted for server monitors.
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next(); // allow uptime monitors
  verifyMobileDeviceOnly(req, res, next);
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    platform: 'SYM EMPIRE PLATFORM (S.E.P.)',
    service:  'SYM LOAN',
    domain:   process.env.ROUTING_ENDPOINT_DOMAIN,
    api:      '/api/health',
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[App] Unhandled error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

module.exports = app;
