'use strict';
/**
 * src/cron/deadlineStrikeEngine.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Morning Deadline & Strike Scheduler
 *
 * Cron Schedule: Daily at 13:00 (1:00 PM) Bangladesh Time (UTC+6)
 * In cron terms, 13:00 BDT = 07:00 UTC → "0 7 * * *"
 *
 * Job Logic:
 *   1. Query all money_requests where:
 *      - status = 'ACCEPTED'
 *      - deadline_date < TODAY  (overdue)
 *   2. For each overdue request:
 *      a. Increment client_profiles.strikes_count by 1
 *      b. If strikes_count reaches 3 → set status = 'BLOCKED'
 *      c. Log the strike event in admin_note on the client profile
 *      d. Update money_request admin_note with overdue log entry
 *   3. Print a summary report to the console
 */

const cron          = require('node-cron');
const { supabaseAdmin } = require('../lib/supabase');

// ─── Core Strike Engine ───────────────────────────────────────────────────────
async function runDeadlineStrikeCheck() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  console.log(`\n[StrikeEngine] ⏰ Running deadline check for date: ${today}`);

  try {
    // 1. Find all overdue ACCEPTED loan requests
    const { data: overdueRequests, error: fetchError } = await supabaseAdmin
      .from('money_requests')
      .select(`
        id,
        amount,
        deadline_date,
        client_id,
        client_profiles (
          id, name, phone_number, strikes_count, status, admin_note
        )
      `)
      .eq('status', 'ACCEPTED')
      .lt('deadline_date', today);

    if (fetchError) throw fetchError;

    if (!overdueRequests || overdueRequests.length === 0) {
      console.log('[StrikeEngine] ✅ No overdue loans found. All clear.');
      return;
    }

    console.log(`[StrikeEngine] ⚠️  Found ${overdueRequests.length} overdue loan(s). Processing strikes...`);

    let strikesIssued = 0;
    let clientsBlocked = 0;

    for (const req of overdueRequests) {
      const profile = req.client_profiles;
      if (!profile) continue;

      const newStrikeCount = (profile.strikes_count || 0) + 1;
      const shouldBlock    = newStrikeCount >= 3;
      const newStatus      = shouldBlock ? 'BLOCKED' : profile.status;
      const strikeNote     = `[STRIKE ${newStrikeCount} — ${today}] Loan ৳${req.amount} overdue (deadline: ${req.deadline_date}).`;
      const updatedNote    = profile.admin_note
        ? `${profile.admin_note}\n${strikeNote}`
        : strikeNote;

      // 2a/2b/2c. Update client profile
      const { error: profileErr } = await supabaseAdmin
        .from('client_profiles')
        .update({
          strikes_count: newStrikeCount,
          status:        newStatus,
          admin_note:    updatedNote,
        })
        .eq('id', profile.id);

      if (profileErr) {
        console.error(`[StrikeEngine] ❌ Failed to update profile ${profile.id}:`, profileErr.message);
        continue;
      }

      // 2d. Log on the money_request
      const reqNote = `[OVERDUE — ${today}] Strike #${newStrikeCount} issued to client ${profile.name}.`;
      await supabaseAdmin
        .from('money_requests')
        .update({ admin_note: reqNote })
        .eq('id', req.id);

      strikesIssued++;
      if (shouldBlock) clientsBlocked++;

      console.log(
        `[StrikeEngine]   → Client: ${profile.name} (${profile.phone_number}) | ` +
        `Strike: ${newStrikeCount} | Status: ${newStatus}`
      );
    }

    // 3. Summary
    console.log(
      `\n[StrikeEngine] 📊 Summary for ${today}:\n` +
      `  • Overdue loans processed : ${overdueRequests.length}\n` +
      `  • Strikes issued          : ${strikesIssued}\n` +
      `  • Clients blocked (≥3)    : ${clientsBlocked}\n`
    );

  } catch (err) {
    console.error('[StrikeEngine] ❌ Critical error during strike check:', err.message);
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
/**
 * "0 7 * * *" = 07:00 UTC = 13:00 BDT (UTC+6)
 * Runs every day at 1:00 PM Bangladesh Time.
 */
function startDeadlineStrikeEngine() {
  const CRON_SCHEDULE = '0 7 * * *'; // 13:00 BDT = 07:00 UTC

  cron.schedule(CRON_SCHEDULE, () => {
    console.log('[StrikeEngine] Cron triggered — Daily Deadline & Strike Check');
    runDeadlineStrikeCheck();
  }, {
    timezone: 'UTC', // Always use UTC; BDT offset is handled in schedule
  });

  console.log('[StrikeEngine] ✅ Scheduled: Daily at 13:00 BDT (07:00 UTC). Cron: ' + CRON_SCHEDULE);
}

module.exports = { startDeadlineStrikeEngine, runDeadlineStrikeCheck };
