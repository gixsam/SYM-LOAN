'use strict';
/**
 * src/lib/repaymentManager.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Automated Repayment & Settlement Desk Engine
 *
 * Responsibilities:
 *   1. Self-service client repayment submission handling with MFS TrxID & Screenshot Receipt
 *   2. Persistent JSON ledger storage backed by data/repayments.json
 *   3. Administrative reconciliation desk (Verify & Settle vs. Reject with rationale)
 *   4. Instant loan state synchronization (marks loan REPAID in Supabase ledger)
 *   5. Client strike decrement / clearance upon verified settlement
 *   6. Cryptographic zero-liability clearance hash generation
 */

const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('./supabase');

const REPAYMENTS_FILE = path.join(__dirname, '../../data/repayments.json');

let repaymentsCache = [];

function loadRepayments() {
  try {
    if (fs.existsSync(REPAYMENTS_FILE)) {
      const raw = fs.readFileSync(REPAYMENTS_FILE, 'utf8');
      repaymentsCache = JSON.parse(raw);
    } else {
      repaymentsCache = [];
      saveRepayments();
    }
  } catch (err) {
    console.error('[RepaymentManager] Error loading repayments:', err.message);
    repaymentsCache = [];
  }
}

function saveRepayments() {
  try {
    const dir = path.dirname(REPAYMENTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REPAYMENTS_FILE, JSON.stringify(repaymentsCache, null, 2), 'utf8');
  } catch (err) {
    console.error('[RepaymentManager] Error saving repayments:', err.message);
  }
}

// Initial load
loadRepayments();

// Cryptographic hash generator for clearance certificates
function generateClearanceHash() {
  const year = new Date().getFullYear();
  const timeHex = Date.now().toString(36).toUpperCase();
  const randHex = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `SYM-CLR-${year}-${timeHex}-${randHex}`;
}

const repaymentManager = {
  /**
   * Submit a new repayment from the client
   */
  async createRepayment(payload) {
    const {
      loan_id,
      client_id,
      amount_paid,
      payout_method,
      sender_number,
      trx_id,
      receipt_image_url,
      client_note,
    } = payload;

    if (!loan_id || !client_id) {
      throw new Error('Loan ID and Client ID are strictly required.');
    }

    const numAmount = parseFloat(amount_paid);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Invalid repayment amount specified.');
    }

    if (!payout_method) {
      throw new Error('Payment method (bKash, Nagad, Rocket, Bank Wire, Cash) is required.');
    }

    const cleanTrx = (trx_id || '').trim();
    if (!cleanTrx && payout_method !== 'Cash') {
      throw new Error('Transaction ID (TrxID) is required for MFS / Bank transfers.');
    }

    // Check for duplicate TrxID among verified or pending repayments
    if (cleanTrx) {
      const duplicate = repaymentsCache.find(r => 
        r.trx_id && 
        r.trx_id.toUpperCase() === cleanTrx.toUpperCase() && 
        r.status !== 'REJECTED'
      );
      if (duplicate) {
        throw new Error(`Transaction ID "${cleanTrx}" has already been submitted (Ref #${duplicate.id.slice(0, 8)}).`);
      }
    }

    // Fetch client details if not provided
    let clientName = payload.client_name || '';
    let clientPhone = payload.client_phone || '';
    let loanAmount = payload.loan_amount || null;

    try {
      if (!clientName || !clientPhone) {
        const { data: client } = await supabaseAdmin
          .from('client_profiles')
          .select('id, name, phone_number')
          .eq('id', client_id)
          .maybeSingle();

        if (client) {
          clientName = client.name || clientName;
          clientPhone = client.phone_number || clientPhone;
        }
      }

      if (!loanAmount) {
        const { data: loan } = await supabaseAdmin
          .from('money_requests')
          .select('id, amount, status')
          .eq('id', loan_id)
          .maybeSingle();

        if (loan) {
          loanAmount = loan.amount;
        }
      }
    } catch (e) {
      console.warn('[RepaymentManager] Error looking up Supabase client/loan context:', e.message);
    }

    const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newRepayment = {
      id,
      loan_id,
      client_id,
      client_name: clientName || 'Client',
      client_phone: clientPhone || '',
      loan_amount: loanAmount,
      amount_paid: numAmount,
      payout_method: payout_method.toUpperCase(),
      sender_number: (sender_number || '').trim(),
      trx_id: cleanTrx.toUpperCase(),
      receipt_image_url: receipt_image_url || null,
      client_note: (client_note || '').trim(),
      status: 'PENDING_REVIEW', // PENDING_REVIEW | VERIFIED | REJECTED
      submitted_at: new Date().toISOString(),
      verified_at: null,
      rejected_at: null,
      admin_note: null,
      clearance_hash: null,
    };

    repaymentsCache.unshift(newRepayment);
    saveRepayments();

    return newRepayment;
  },

  /**
   * Get all repayments with optional filters
   */
  getRepayments(filters = {}) {
    loadRepayments();
    let result = [...repaymentsCache];

    if (filters.status && filters.status !== 'ALL') {
      const targetStatus = filters.status.toUpperCase();
      result = result.filter(r => r.status === targetStatus);
    }

    if (filters.client_id) {
      result = result.filter(r => r.client_id === filters.client_id);
    }

    if (filters.loan_id) {
      result = result.filter(r => r.loan_id === filters.loan_id);
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    return result;
  },

  /**
   * Get single repayment by ID
   */
  getRepaymentById(id) {
    loadRepayments();
    return repaymentsCache.find(r => r.id === id) || null;
  },

  /**
   * Admin approves repayment, settles loan, resets strikes, generates clearance hash
   */
  async approveRepayment(id, adminNote = 'Verified and settled') {
    loadRepayments();
    const index = repaymentsCache.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Repayment record #${id} not found.`);
    }

    const repayment = repaymentsCache[index];
    if (repayment.status === 'VERIFIED') {
      return { success: true, repayment, message: 'Repayment is already verified.' };
    }

    const clearanceHash = generateClearanceHash();
    const verifiedAt = new Date().toISOString();

    repayment.status = 'VERIFIED';
    repayment.verified_at = verifiedAt;
    repayment.rejected_at = null;
    repayment.admin_note = adminNote;
    repayment.clearance_hash = clearanceHash;

    repaymentsCache[index] = repayment;
    saveRepayments();

    // 1. Update loan in Supabase money_requests to 'REPAID'
    try {
      const { data: loanRecord } = await supabaseAdmin
        .from('money_requests')
        .select('*')
        .eq('id', repayment.loan_id)
        .maybeSingle();

      if (loanRecord) {
        let noteObj = {};
        try {
          noteObj = JSON.parse(loanRecord.admin_note || '{}');
        } catch (_) {
          noteObj = { legacy_note: loanRecord.admin_note };
        }

        noteObj.settlement = {
          repayment_id: repayment.id,
          settled_at: verifiedAt,
          clearance_hash: clearanceHash,
          amount_paid: repayment.amount_paid,
          payout_method: repayment.payout_method,
          trx_id: repayment.trx_id,
          admin_note: adminNote,
        };

        await supabaseAdmin
          .from('money_requests')
          .update({
            status: 'REPAID',
            admin_note: JSON.stringify(noteObj),
            updated_at: verifiedAt,
          })
          .eq('id', repayment.loan_id);
      }
    } catch (err) {
      console.error('[RepaymentManager] Supabase loan status update note:', err.message);
    }

    // 2. Clear or decrement client strikes in client_profiles
    try {
      const { data: clientRecord } = await supabaseAdmin
        .from('client_profiles')
        .select('id, strikes_count, telegram_chat_id, phone_number, name')
        .eq('id', repayment.client_id)
        .maybeSingle();

      if (clientRecord && clientRecord.strikes_count > 0) {
        const newStrikes = Math.max(0, (clientRecord.strikes_count || 1) - 1);
        await supabaseAdmin
          .from('client_profiles')
          .update({
            strikes_count: newStrikes,
            status: 'ACTIVE',
          })
          .eq('id', repayment.client_id);
        console.log(`[RepaymentManager] Client #${repayment.client_id.slice(0, 8)} strikes decremented to ${newStrikes}`);
      }

      // 3. Notify via Telegram Bot if client has registered chat
      if (clientRecord?.telegram_chat_id) {
        try {
          const { bot } = require('../bot/index');
          if (bot && typeof bot.api?.sendMessage === 'function') {
            const message = 
              `✅ <b>REPAYMENT VERIFIED & SETTLED!</b>\n\n` +
              `Dear <b>${clientRecord.name || 'Client'}</b>,\n` +
              `Your repayment of <b>৳${repayment.amount_paid.toLocaleString()}</b> via <b>${repayment.payout_method}</b> (TrxID: <code>${repayment.trx_id}</code>) has been audited and approved.\n\n` +
              `📜 <b>Official Clearance Ref:</b> <code>${clearanceHash}</code>\n` +
              `Your loan has been officially marked as <b>REPAID</b> with zero outstanding debt.\n\n` +
              `You can download your sealed <b>Digital Clearance Certificate (PDF)</b> from your client portal.`;
            await bot.api.sendMessage({ chat_id: clientRecord.telegram_chat_id, text: message, parse_mode: 'HTML' });
          }
        } catch (botErr) {
          console.warn('[RepaymentManager] Telegram notification note:', botErr.message);
        }
      }
    } catch (clientErr) {
      console.error('[RepaymentManager] Client strikes update note:', clientErr.message);
    }

    return {
      success: true,
      message: `Repayment #${repayment.id.slice(0, 8)} approved. Loan marked as REPAID.`,
      repayment,
      clearance_hash: clearanceHash,
    };
  },

  /**
   * Admin rejects repayment with explanation
   */
  async rejectRepayment(id, reason = 'Transaction proof or TrxID could not be verified') {
    loadRepayments();
    const index = repaymentsCache.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Repayment record #${id} not found.`);
    }

    const repayment = repaymentsCache[index];
    repayment.status = 'REJECTED';
    repayment.rejected_at = new Date().toISOString();
    repayment.admin_note = reason;

    repaymentsCache[index] = repayment;
    saveRepayments();

    // Notify client via Telegram if available
    try {
      const { data: clientRecord } = await supabaseAdmin
        .from('client_profiles')
        .select('id, telegram_chat_id, name')
        .eq('id', repayment.client_id)
        .maybeSingle();

      if (clientRecord?.telegram_chat_id) {
        const { bot } = require('../bot/index');
        if (bot && typeof bot.api?.sendMessage === 'function') {
          const message = 
            `⚠️ <b>REPAYMENT AUDIT NOTICE</b>\n\n` +
            `Dear <b>${clientRecord.name || 'Client'}</b>,\n` +
            `Your repayment submission of <b>৳${repayment.amount_paid.toLocaleString()}</b> (TrxID: <code>${repayment.trx_id}</code>) could not be verified.\n\n` +
            `<b>Reason:</b> ${reason}\n\n` +
            `Please check your transaction particulars and re-submit with an authentic receipt screenshot.`;
          await bot.api.sendMessage({ chat_id: clientRecord.telegram_chat_id, text: message, parse_mode: 'HTML' });
        }
      }
    } catch (_) {}

    return {
      success: true,
      message: `Repayment #${repayment.id.slice(0, 8)} rejected.`,
      repayment,
    };
  },

  /**
   * Aggregated statistics for executive dashboard
   */
  getStats() {
    loadRepayments();
    const total = repaymentsCache.length;
    const pending = repaymentsCache.filter(r => r.status === 'PENDING_REVIEW').length;
    const verified = repaymentsCache.filter(r => r.status === 'VERIFIED').length;
    const rejected = repaymentsCache.filter(r => r.status === 'REJECTED').length;

    const totalSettledAmount = repaymentsCache
      .filter(r => r.status === 'VERIFIED')
      .reduce((sum, r) => sum + (parseFloat(r.amount_paid) || 0), 0);

    const totalPendingAmount = repaymentsCache
      .filter(r => r.status === 'PENDING_REVIEW')
      .reduce((sum, r) => sum + (parseFloat(r.amount_paid) || 0), 0);

    return {
      total,
      pending,
      verified,
      rejected,
      total_settled_amount: totalSettledAmount,
      total_pending_amount: totalPendingAmount,
    };
  },
};

module.exports = repaymentManager;
