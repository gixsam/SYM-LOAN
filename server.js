'use strict';
/**
 * server.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Main Entry Point
 *
 * Boots:
 *   1. Express HTTP server
 *   2. Telegram @money_loan_bot (polling)
 *   3. Daily 1:00 PM BDT Deadline & Strike Cron Engine
 */

require('dotenv').config();

const app = require('./src/app');
const { startBot }                     = require('./src/bot/index');
const { startDeadlineStrikeEngine }    = require('./src/cron/deadlineStrikeEngine');

const PORT = parseInt(process.env.PORT || '5000', 10);

// ─── HTTP Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       SYM EMPIRE PLATFORM (S.E.P.) — SYM LOAN       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  🌐 HTTP Server   : http://localhost:${PORT}            ║`);
  console.log(`║  🌍 Domain        : ${process.env.ROUTING_ENDPOINT_DOMAIN}`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // ─── Start Telegram Bot ─────────────────────────────────────────────────
  try {
    startBot();
  } catch (err) {
    console.warn('[Server] Bot failed to start:', err.message);
  }

  // ─── Start Cron Engine ──────────────────────────────────────────────────
  startDeadlineStrikeEngine();
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received. Shutting down...');
  process.exit(0);
});
