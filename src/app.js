'use strict';
/**
 * src/app.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Express Application Factory
 *
 * Configures:
 *   - Security headers (Helmet with relaxed CSP for CDN resources)
 *   - CORS whitelist
 *   - Static public assets (HTML, CSS, JS)
 *   - Mobile-only gate on client routes
 *   - Admin API & Panel routes (accessible with admin key)
 *   - REST API routes
 */

const fs                     = require('fs');
const express                = require('express');
const cors                   = require('cors');
const helmet                 = require('helmet');
const path                   = require('path');
const verifyMobileDeviceOnly = require('./middleware/verifyMobileDeviceOnly');
const apiRouter              = require('./routes/api');
const adminApiRouter         = require('./routes/adminApi');
require('dotenv').config();

const app = express();

// Trust reverse proxy (Hostinger / Nginx / Cloudflare)
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://cdnjs.cloudflare.com'],
        styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc:    ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc:     ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://gypqeknsxfljdvmycylv.supabase.co'],
      },
    },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      'https://symloan.best-travel.ltd',
      'http://127.0.0.1:5000',
      'http://localhost:5000',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const ua = (req.headers['user-agent'] || '').slice(0, 60);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} — UA: ${ua}`);
  next();
});

// ─── Static Public Files ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── Telegram Production Webhook Ingestion Route ──────────────────────────────
app.post('/api/bot/webhook', async (req, res) => {
  try {
    const { handleBotWebhookUpdate } = require('./bot/index');
    if (typeof handleBotWebhookUpdate === 'function') {
      await handleBotWebhookUpdate(req.body);
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Ingestion error:', err.message);
    res.status(200).json({ ok: false, error: err.message });
  }
});

// ─── Direct Android APK Download Route (Exempt from mobile check) ───────────
app.get(['/downloads/SYM-LOAN.apk', '/api/app/download-apk'], (_req, res) => {
  const apkPath = path.join(__dirname, '../public/downloads/SYM-LOAN.apk');
  if (!fs.existsSync(apkPath)) {
    return res.status(404).json({
      success: false,
      message: 'SYM LOAN Native Android APK is being packaged. Please try again shortly.',
    });
  }
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="SYM-LOAN.apk"');
  res.sendFile(apkPath);
});

// ─── Admin API Routes (Exempt from Mobile-only gate, requires Admin Key) ───────
app.use('/api/admin', adminApiRouter);

// Exempt health, limits, auth OTP, and bot webhook from mobile-only gate
app.use('/api', (req, res, next) => {
  if (
    req.path === '/health' ||
    req.path === '/config/limits' ||
    req.path.startsWith('/auth/') ||
    req.path === '/bot/webhook' ||
    req.path === '/app/download-apk' ||
    req.path === '/telemetry/device'
  ) {
    return next();
  }
  verifyMobileDeviceOnly(req, res, next);
});

// ─── Client API Routes ────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── Admin Panel Route ────────────────────────────────────────────────────────
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// ─── Client Root Route ────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  // Mobile devices get the full client portal
  // Desktop devices get the mobile gate warning or portal in dev mode
  res.sendFile(path.join(__dirname, '../public/index.html'));
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
