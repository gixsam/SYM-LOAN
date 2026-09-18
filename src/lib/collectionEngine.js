'use strict';
/**
 * src/lib/collectionEngine.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Automated Debt Collection & Strike Escalator Engine
 *
 * Core Capabilities:
 *   1. Debtor Risk Matrix generator (Overdue, Due Today, Due Soon, Upcoming, Blocked)
 *   2. Automated Collection & Reminder Cycle (Pre-due 3d, Pre-due 1d, Due Today, Overdue Strikes)
 *   3. Strike Escalation Engine (Daily +1 strike for overdue loans; strikes >= 3 → auto-BLOCKED)
 *   4. Admin Manual Interventions (Strike adjustment, Blacklist toggle, Manual reminders)
 */

const { supabaseAdmin } = require('./supabase');
const smsService = require('./smsService');

/**
 * Calculate difference in days between two dates (dateStr minus today)
 * Negative = overdue by N days
 * 0 = due today
 * Positive = due in N days
 */
function getDaysDiffFromToday(dateStr) {
  if (!dateStr) return 0;
  const targetDateStr = String(dateStr).split('T')[0];
  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (targetDateStr === todayIso || targetDateStr === todayLocal) {
    return 0;
  }

  const parts = targetDateStr.split('-');
  if (parts.length === 3) {
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const diffMs = targetDate.getTime() - todayDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Generate full Debtor Risk Matrix for Admin Command Center
 */
async function getCollectionsMatrix() {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const { data: activeLoans, error: fetchErr } = await supabaseAdmin
      .from('money_requests')
      .select(`
        id,
        amount,
        deadline_date,
        status,
        created_at,
        client_id,
        admin_note,
        client_profiles (
          id, name, phone_number, strikes_count, status, admin_note, email
        )
      `)
      .eq('status', 'ACCEPTED')
      .order('deadline_date', { ascending: true });

    if (fetchErr) throw fetchErr;

    const matrix = {
      summary: {
        total_active_loans: 0,
        total_active_amount: 0,
        overdue_count: 0,
        overdue_amount: 0,
        critical_blocked_count: 0,
        high_risk_count: 0,
        due_today_count: 0,
        due_today_amount: 0,
        upcoming_count: 0,
        upcoming_amount: 0,
      },
      items: [],
      timestamp: new Date().toISOString(),
    };

    if (!activeLoans || activeLoans.length === 0) {
      return matrix;
    }

    for (const loan of activeLoans) {
      const profile = loan.client_profiles || {
        id: loan.client_id,
        name: 'Unknown Borrower',
        phone_number: '',
        strikes_count: 0,
        status: 'ACTIVE',
      };

      const daysDiff = getDaysDiffFromToday(loan.deadline_date);
      const amount = Number(loan.amount) || 0;
      const strikes = Number(profile.strikes_count) || 0;
      const isBlocked = profile.status === 'BLOCKED' || strikes >= 3;

      let category = 'UPCOMING';
      let urgencyLevel = 'NORMAL'; // NORMAL | MODERATE | HIGH | CRITICAL

      if (daysDiff < 0) {
        category = 'OVERDUE';
        urgencyLevel = isBlocked ? 'CRITICAL' : strikes >= 2 ? 'HIGH' : 'MODERATE';
      } else if (daysDiff === 0) {
        category = 'DUE_TODAY';
        urgencyLevel = 'HIGH';
      } else if (daysDiff <= 3) {
        category = 'DUE_SOON';
        urgencyLevel = 'MODERATE';
      }

      // Check last reminder from audit logs
      const logs = smsService.getReminderLogs({ loan_id: loan.id, limit: 1 });
      const lastReminder = logs.length > 0 ? logs[0] : null;

      matrix.summary.total_active_loans++;
      matrix.summary.total_active_amount += amount;

      if (category === 'OVERDUE') {
        matrix.summary.overdue_count++;
        matrix.summary.overdue_amount += amount;
        if (isBlocked) matrix.summary.critical_blocked_count++;
        else if (strikes >= 2) matrix.summary.high_risk_count++;
      } else if (category === 'DUE_TODAY') {
        matrix.summary.due_today_count++;
        matrix.summary.due_today_amount += amount;
      } else {
        matrix.summary.upcoming_count++;
        matrix.summary.upcoming_amount += amount;
      }

      matrix.items.push({
        loan_id: loan.id,
        amount,
        deadline_date: loan.deadline_date,
        days_diff: daysDiff,
        days_overdue: daysDiff < 0 ? Math.abs(daysDiff) : 0,
        category,
        urgency_level: urgencyLevel,
        client: {
          id: profile.id,
          name: profile.name,
          phone_number: profile.phone_number,
          strikes_count: strikes,
          status: isBlocked ? 'BLOCKED' : profile.status,
          email: profile.email || '',
        },
        last_reminder: lastReminder
          ? {
              dispatched_at: lastReminder.dispatched_at,
              channel: lastReminder.channel,
              template_type: lastReminder.template_type,
              status: lastReminder.status,
            }
          : null,
      });
    }

    return matrix;
  } catch (err) {
    console.error('[CollectionEngine] Error computing collections matrix:', err.message);
    throw err;
  }
}

/**
 * Execute Full Collection & Strike Escalation Cycle
 * Triggered automatically by daily cron or manually by Admin "Run Now"
 */
async function runCollectionAndReminderCycle(options = {}) {
  const { force = false, notifyChannels = 'BOTH', dryRun = false } = options;
  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`\n[CollectionEngine] 🚀 Running collection & strike cycle for ${todayStr} (force=${force})`);

  const report = {
    date: todayStr,
    timestamp: new Date().toISOString(),
    total_active_loans: 0,
    overdue_processed: 0,
    strikes_issued: 0,
    clients_blocked: 0,
    reminders_sent: {
      pre_due_3d: 0,
      pre_due_1d: 0,
      due_today: 0,
      overdue_strike: 0,
      account_blocked: 0,
      total: 0,
    },
    actions: [],
  };

  try {
    const { data: activeLoans, error: fetchErr } = await supabaseAdmin
      .from('money_requests')
      .select(`
        id,
        amount,
        deadline_date,
        status,
        created_at,
        client_id,
        admin_note,
        client_profiles (
          id, name, phone_number, strikes_count, status, admin_note, email
        )
      `)
      .eq('status', 'ACCEPTED');

    if (fetchErr) throw fetchErr;
    if (!activeLoans || activeLoans.length === 0) {
      console.log('[CollectionEngine] ✅ No active loans found.');
      return report;
    }

    report.total_active_loans = activeLoans.length;

    for (const loan of activeLoans) {
      const profile = loan.client_profiles;
      if (!profile) continue;

      const daysDiff = getDaysDiffFromToday(loan.deadline_date);
      const currentStrikes = profile.strikes_count || 0;

      // ────────────────────────────────────────────────────────────────────────
      // CASE 1: OVERDUE LOANS (daysDiff < 0) → Strike Escalation & Warning
      // ────────────────────────────────────────────────────────────────────────
      if (daysDiff < 0) {
        report.overdue_processed++;
        const overdueDays = Math.abs(daysDiff);

        // Check if we already applied a strike today for this loan
        const strikeMarker = `[STRIKE_APPLIED_${todayStr}]`;
        const alreadyStrikedToday = (loan.admin_note || '').includes(strikeMarker);

        let newStrikeCount = currentStrikes;
        let shouldBlock = profile.status === 'BLOCKED' || currentStrikes >= 3;
        let strikeIssuedThisRun = false;

        if (!alreadyStrikedToday && !dryRun) {
          newStrikeCount = Math.min(3, currentStrikes + 1);
          shouldBlock = newStrikeCount >= 3;
          strikeIssuedThisRun = true;

          const strikeNote = `[STRIKE ${newStrikeCount} — ${todayStr}] Overdue by ${overdueDays}d (Loan ৳${loan.amount}).`;
          const updatedProfileNote = profile.admin_note
            ? `${profile.admin_note}\n${strikeNote}`
            : strikeNote;

          // Update client profile
          await supabaseAdmin
            .from('client_profiles')
            .update({
              strikes_count: newStrikeCount,
              status: shouldBlock ? 'BLOCKED' : profile.status,
              admin_note: updatedProfileNote,
            })
            .eq('id', profile.id);

          // Update loan note with daily marker to prevent multi-strike on same day
          const updatedLoanNote = `${loan.admin_note || ''} ${strikeMarker} Strike #${newStrikeCount} on ${todayStr}.`.trim();
          await supabaseAdmin
            .from('money_requests')
            .update({ admin_note: updatedLoanNote })
            .eq('id', loan.id);

          report.strikes_issued++;
          if (shouldBlock && profile.status !== 'BLOCKED') {
            report.clients_blocked++;
          }
        }

        // Dispatch Overdue Reminder (Idempotent: at most once per day)
        const templateType = shouldBlock ? 'ACCOUNT_BLOCKED' : 'OVERDUE_STRIKE';
        const alreadyReminded = smsService.hasBeenRemindedToday(profile.id, loan.id, templateType);

        if ((!alreadyReminded || force) && !dryRun) {
          const clientObj = { ...profile, strikes_count: newStrikeCount };
          await smsService.dispatchReminder({
            channel: notifyChannels,
            client: clientObj,
            loan,
            templateType,
            trigger: 'AUTOMATED_CRON',
          });

          if (shouldBlock) report.reminders_sent.account_blocked++;
          else report.reminders_sent.overdue_strike++;
          report.reminders_sent.total++;
        }

        report.actions.push({
          loan_id: loan.id,
          client_id: profile.id,
          client_name: profile.name,
          type: 'OVERDUE_STRIKE',
          overdue_days: overdueDays,
          strike_issued: strikeIssuedThisRun,
          current_strikes: newStrikeCount,
          blocked: shouldBlock,
        });

      // ────────────────────────────────────────────────────────────────────────
      // CASE 2: DUE TODAY (daysDiff === 0)
      // ────────────────────────────────────────────────────────────────────────
      } else if (daysDiff === 0) {
        const alreadyReminded = smsService.hasBeenRemindedToday(profile.id, loan.id, 'DUE_TODAY');
        if ((!alreadyReminded || force) && !dryRun) {
          await smsService.dispatchReminder({
            channel: notifyChannels,
            client: profile,
            loan,
            templateType: 'DUE_TODAY',
            trigger: 'AUTOMATED_CRON',
          });
          report.reminders_sent.due_today++;
          report.reminders_sent.total++;

          report.actions.push({
            loan_id: loan.id,
            client_id: profile.id,
            client_name: profile.name,
            type: 'DUE_TODAY_REMINDER',
          });
        }

      // ────────────────────────────────────────────────────────────────────────
      // CASE 3: DUE TOMORROW / 1 DAY PRE-DUE (daysDiff === 1)
      // ────────────────────────────────────────────────────────────────────────
      } else if (daysDiff === 1) {
        const alreadyReminded = smsService.hasBeenRemindedToday(profile.id, loan.id, 'PRE_DUE_1D');
        if ((!alreadyReminded || force) && !dryRun) {
          await smsService.dispatchReminder({
            channel: notifyChannels,
            client: profile,
            loan,
            templateType: 'PRE_DUE_1D',
            trigger: 'AUTOMATED_CRON',
          });
          report.reminders_sent.pre_due_1d++;
          report.reminders_sent.total++;

          report.actions.push({
            loan_id: loan.id,
            client_id: profile.id,
            client_name: profile.name,
            type: 'PRE_DUE_1D_REMINDER',
          });
        }

      // ────────────────────────────────────────────────────────────────────────
      // CASE 4: DUE IN 3 DAYS (daysDiff === 3)
      // ────────────────────────────────────────────────────────────────────────
      } else if (daysDiff === 3) {
        const alreadyReminded = smsService.hasBeenRemindedToday(profile.id, loan.id, 'PRE_DUE_3D');
        if ((!alreadyReminded || force) && !dryRun) {
          await smsService.dispatchReminder({
            channel: notifyChannels,
            client: profile,
            loan,
            templateType: 'PRE_DUE_3D',
            trigger: 'AUTOMATED_CRON',
          });
          report.reminders_sent.pre_due_3d++;
          report.reminders_sent.total++;

          report.actions.push({
            loan_id: loan.id,
            client_id: profile.id,
            client_name: profile.name,
            type: 'PRE_DUE_3D_REMINDER',
          });
        }
      }
    }

    console.log(
      `[CollectionEngine] 📊 Cycle complete for ${todayStr}:\n` +
      `  • Active Loans Evaluated  : ${report.total_active_loans}\n` +
      `  • Overdue Processed       : ${report.overdue_processed}\n` +
      `  • Strikes Issued          : ${report.strikes_issued}\n` +
      `  • Clients Blocked         : ${report.clients_blocked}\n` +
      `  • Reminders Dispatched    : ${report.reminders_sent.total}\n`
    );

    return report;
  } catch (err) {
    console.error('[CollectionEngine] Critical error in collection cycle:', err.message);
    throw err;
  }
}

/**
 * Adjust client strikes manually by administrator
 */
async function adjustClientStrikes(clientId, { action, value = 1, reason = '' }) {
  if (!clientId) throw new Error('Missing clientId');

  const { data: client, error: fetchErr } = await supabaseAdmin
    .from('client_profiles')
    .select('id, name, strikes_count, status, admin_note, phone_number')
    .eq('id', clientId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!client) throw new Error(`Client profile not found for ID ${clientId}`);

  let current = client.strikes_count || 0;
  let next = current;

  switch (action) {
    case 'INCREMENT':
      next = Math.min(3, current + 1);
      break;
    case 'DECREMENT':
      next = Math.max(0, current - 1);
      break;
    case 'RESET':
      next = 0;
      break;
    case 'SET':
      next = Math.max(0, Math.min(3, parseInt(value, 10) || 0));
      break;
    default:
      throw new Error(`Invalid strike action: ${action}`);
  }

  const shouldBlock = next >= 3;
  const newStatus = shouldBlock ? 'BLOCKED' : (client.status === 'BLOCKED' && next === 0 ? 'ACTIVE' : client.status);
  const stamp = new Date().toISOString();
  const logEntry = `[MANUAL_STRIKE_ADJUST — ${stamp}] Action: ${action}, Strikes: ${current} → ${next}. Reason: ${reason || 'Admin override'}`;
  const updatedNote = client.admin_note ? `${client.admin_note}\n${logEntry}` : logEntry;

  const { error: updateErr } = await supabaseAdmin
    .from('client_profiles')
    .update({
      strikes_count: next,
      status: newStatus,
      admin_note: updatedNote,
    })
    .eq('id', clientId);

  if (updateErr) throw updateErr;

  return {
    success: true,
    client_id: clientId,
    previous_strikes: current,
    new_strikes: next,
    status: newStatus,
    reason,
  };
}

/**
 * Toggle or set Client Blacklist status manually
 */
async function setClientBlacklist(clientId, { status = 'BLOCKED', reason = '' }) {
  if (!clientId) throw new Error('Missing clientId');
  const targetStatus = status.toUpperCase() === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE';

  const { data: client, error: fetchErr } = await supabaseAdmin
    .from('client_profiles')
    .select('id, name, status, admin_note, strikes_count')
    .eq('id', clientId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!client) throw new Error(`Client not found for ID ${clientId}`);

  const stamp = new Date().toISOString();
  const logEntry = `[BLACKLIST_STATUS_CHANGE — ${stamp}] Status changed to ${targetStatus}. Reason: ${reason || 'Admin intervention'}`;
  const updatedNote = client.admin_note ? `${client.admin_note}\n${logEntry}` : logEntry;

  const updatePayload = {
    status: targetStatus,
    admin_note: updatedNote,
  };

  // If unblocking to ACTIVE and strikes were 3, reset strikes to 2 to allow probationary status
  if (targetStatus === 'ACTIVE' && (client.strikes_count || 0) >= 3) {
    updatePayload.strikes_count = 2;
  }

  const { error: updateErr } = await supabaseAdmin
    .from('client_profiles')
    .update(updatePayload)
    .eq('id', clientId);

  if (updateErr) throw updateErr;

  return {
    success: true,
    client_id: clientId,
    previous_status: client.status,
    new_status: targetStatus,
    strikes_count: updatePayload.strikes_count !== undefined ? updatePayload.strikes_count : client.strikes_count,
    reason,
  };
}

module.exports = {
  getDaysDiffFromToday,
  getCollectionsMatrix,
  runCollectionAndReminderCycle,
  adjustClientStrikes,
  setClientBlacklist,
};
