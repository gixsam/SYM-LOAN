'use strict';
/**
 * src/cron/deadlineStrikeEngine.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Multi-Tier Debt Collection, Reminders & Strike Scheduler
 *
 * Cron Schedules:
 *   1. Morning Pre-Due Reminders: Daily at 10:00 AM BDT (04:00 UTC) → "0 4 * * *"
 *   2. Afternoon Strike & Collection Escalator: Daily at 13:00 BDT (07:00 UTC) → "0 7 * * *"
 */

const cron = require('node-cron');
const { runCollectionAndReminderCycle } = require('../lib/collectionEngine');

/**
 * Executes collection and reminder cycle
 */
async function runDeadlineStrikeCheck(options = {}) {
  try {
    return await runCollectionAndReminderCycle(options);
  } catch (err) {
    console.error('[StrikeEngine] ❌ Error running collection cycle:', err.message);
    return null;
  }
}

/**
 * Initialize all automated collection cron jobs
 */
function startDeadlineStrikeEngine() {
  // 1. Morning Pre-Due Reminder Engine (10:00 AM BDT = 04:00 UTC)
  cron.schedule('0 4 * * *', async () => {
    console.log('[StrikeEngine] ⏰ Cron Triggered: Morning Pre-Due Reminders (10:00 BDT)');
    try {
      await runCollectionAndReminderCycle({ force: false });
    } catch (err) {
      console.error('[StrikeEngine] Morning reminder run error:', err.message);
    }
  }, { timezone: 'UTC' });

  // 2. Afternoon Overdue Strike & Blacklist Escalator (1:00 PM BDT = 07:00 UTC)
  cron.schedule('0 7 * * *', async () => {
    console.log('[StrikeEngine] 🚨 Cron Triggered: Afternoon Strike & Blacklist Escalator (13:00 BDT)');
    try {
      await runCollectionAndReminderCycle({ force: false });
    } catch (err) {
      console.error('[StrikeEngine] Afternoon strike run error:', err.message);
    }
  }, { timezone: 'UTC' });

  console.log('[StrikeEngine] ✅ Scheduled: Morning Pre-Due (10:00 BDT) & Afternoon Strike Escalator (13:00 BDT).');
}

module.exports = { startDeadlineStrikeEngine, runDeadlineStrikeCheck };

