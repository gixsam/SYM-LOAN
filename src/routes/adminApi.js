'use strict';
/**
 * src/routes/adminApi.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Executive Administration API
 *
 * Endpoints for:
 *   1. Global Loan Boundaries (Min/Max Amount, Start/Finish Duration Days)
 *   2. Client-Specific Custom Limits (tailored bounds per client)
 *   3. Multi-Channel Loan Disbursement (Hand-to-Hand Cash, bKash, Nagad)
 *   4. 20 BDT/1,000 MFS Cash-Out Fee Calculator
 *   5. Payment Receipt Screenshot Uploads
 *   6. Historical "Google Keep" Notes & Ledger Digitalization
 *   7. Client Strike & Status Overrides
 */

const express          = require('express');
const { supabaseAdmin } = require('../lib/supabase');
const loanSettings     = require('../lib/loanSettings');
const { uploadReceipt, uploadBrandLogo } = require('../lib/uploader');
const otpManager       = require('../lib/otpManager');
const { sendTelegramOtp } = require('../bot/index');

const router = express.Router();

// Admin Authentication Middleware
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'SEP_ADMIN_2026';
const ADMIN_AUTHORIZED_EMAILS = [
  'zillionprince6@gmail.com',
  'symwebz@gmail.com',
];

function requireAdmin(req, res, next) {
  const provided = req.headers['x-admin-key'] || req.query.admin_key || req.body?.admin_key;
  if (provided === ADMIN_SECRET) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Invalid Admin Secret Key.',
  });
}

// ─── Admin Authentication & OTP Endpoints (Public for login) ──────────────────

// POST /api/admin/auth/login-password — Option 1: Master Secret Password
router.post('/auth/login-password', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  if (loanSettings.verifyAdminPassword(password.trim())) {
    return res.json({
      success: true,
      message: 'Executive Admin authenticated successfully.',
      admin_key: ADMIN_SECRET,
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid Admin Password.' });
});

// POST /api/admin/auth/request-otp — Options 2 & 3: Telegram OTP (01337320544) or Email OTP
router.post('/auth/request-otp', async (req, res) => {
  const { email, phone, channel } = req.body;

  let identifier = null;
  let targetChannel = channel || (phone ? 'TELEGRAM' : 'EMAIL');

  if (targetChannel === 'TELEGRAM' || phone) {
    const rawPhone = (phone || '01337320544').trim();
    // Verify admin authorized phone
    if (!rawPhone.includes('01337320544') && !rawPhone.includes('8801337320544') && !rawPhone.includes('01612669922')) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This mobile number is not authorized for executive administrative OTP.',
      });
    }
    identifier = rawPhone;
  } else {
    if (!email) {
      return res.status(400).json({ success: false, message: 'Admin email is required.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!ADMIN_AUTHORIZED_EMAILS.includes(cleanEmail)) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This email address is not authorized for executive administrative login.',
      });
    }
    identifier = cleanEmail;
  }

  const otpRes = otpManager.generateOtp(identifier);
  if (!otpRes.success) {
    return res.status(429).json({ success: false, message: otpRes.error, waitSeconds: otpRes.waitSeconds });
  }

  // Dispatch via Telegram to registered admin Telegram Chat ID
  let sentViaTelegram = false;
  const adminChatId = process.env.ADMIN_TELEGRAM_ID || '6464983314';
  if (adminChatId) {
    sentViaTelegram = await sendTelegramOtp(adminChatId, otpRes.code, `Admin Login (${identifier})`);
  }

  return res.json({
    success: true,
    message: sentViaTelegram
      ? `A 6-digit OTP has been sent directly to Telegram for ${identifier}.`
      : `A 6-digit OTP has been generated for ${identifier}.`,
    sentViaTelegram,
    identifier,
    channel: targetChannel,
    preview_code: otpRes.code,
  });
});

// POST /api/admin/auth/verify-otp
router.post('/auth/verify-otp', (req, res) => {
  const { email, phone, identifier, code } = req.body;
  const targetIdentifier = (identifier || email || phone || '').trim().toLowerCase();

  if (!targetIdentifier || !code) {
    return res.status(400).json({ success: false, message: 'Identifier (Email or Phone) and 6-digit OTP code are required.' });
  }

  const verifyRes = otpManager.verifyOtp(targetIdentifier, code);
  if (!verifyRes.valid) {
    return res.status(401).json({ success: false, message: verifyRes.message });
  }

  return res.json({
    success: true,
    message: 'Executive Admin authenticated successfully.',
    admin_key: ADMIN_SECRET,
    identifier: targetIdentifier,
  });
});

// ─── Settings Endpoints ───────────────────────────────────────────────────────

// GET /api/admin/settings
router.get('/settings', requireAdmin, (req, res) => {
  const all = loanSettings.getAllSettings();
  res.json({ success: true, settings: all });
});

// POST /api/admin/settings/change-password
router.post('/settings/change-password', requireAdmin, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Current master password and new password are required.' });
  }
  const result = loanSettings.updateAdminPassword(current_password, new_password);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// POST /api/admin/branding/upload-logo — Unlimited size logo upload
router.post('/branding/upload-logo', requireAdmin, (req, res) => {
  uploadBrandLogo.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const relativeUrl = `/uploads/branding/${req.file.filename}`;
    loanSettings.updatePlatformLogo(relativeUrl);

    return res.json({
      success: true,
      message: 'Platform brand logo updated successfully.',
      logo_url: relativeUrl,
      file_name: req.file.filename,
      file_size: req.file.size,
    });
  });
});

// POST /api/admin/branding/reset-logo — Reset back to official default
router.post('/branding/reset-logo', requireAdmin, (_req, res) => {
  loanSettings.updatePlatformLogo('/images/logo.png');
  return res.json({
    success: true,
    message: 'Brand logo reset to official default.',
    logo_url: '/images/logo.png',
  });
});

// POST /api/admin/settings/global
router.post('/settings/global', requireAdmin, (req, res) => {
  const { min_amount, max_amount, min_duration_days, max_duration_days } = req.body;

  if (min_amount !== undefined && max_amount !== undefined && parseFloat(min_amount) > parseFloat(max_amount)) {
    return res.status(400).json({
      success: false,
      message: 'Minimum loan amount cannot exceed maximum loan amount.',
    });
  }

  if (min_duration_days !== undefined && max_duration_days !== undefined && parseInt(min_duration_days, 10) > parseInt(max_duration_days, 10)) {
    return res.status(400).json({
      success: false,
      message: 'Minimum duration days cannot exceed maximum duration days.',
    });
  }

  const updated = loanSettings.updateGlobalLimits({
    min_amount,
    max_amount,
    min_duration_days,
    max_duration_days,
    updated_by: req.body.updated_by || 'ADMIN',
  });

  res.json({
    success: true,
    message: 'Global loan limits updated successfully.',
    global: updated,
  });
});

// POST /api/admin/settings/client/:id
router.post('/settings/client/:id', requireAdmin, async (req, res) => {
  const clientId = req.params.id;
  const { min_amount, max_amount, min_duration_days, max_duration_days, note } = req.body;

  const { data: client, error } = await supabaseAdmin
    .from('client_profiles')
    .select('id, name, phone_number')
    .eq('id', clientId)
    .single();

  if (error || !client) {
    return res.status(404).json({ success: false, message: 'Client not found.' });
  }

  const override = loanSettings.setClientOverride(clientId, {
    min_amount,
    max_amount,
    min_duration_days,
    max_duration_days,
    note: note || `Custom limits configured for ${client.name}`,
  });

  res.json({
    success: true,
    message: `Custom limits configured for client ${client.name}.`,
    client,
    override,
  });
});

// DELETE /api/admin/settings/client/:id
router.delete('/settings/client/:id', requireAdmin, (req, res) => {
  const clientId = req.params.id;
  const removed = loanSettings.removeClientOverride(clientId);
  res.json({
    success: true,
    message: removed ? 'Client custom override removed. Client will use global limits.' : 'No override found for this client.',
  });
});

// ─── Client Management ────────────────────────────────────────────────────────

// GET /api/admin/clients
router.get('/clients', requireAdmin, async (req, res) => {
  try {
    const { data: clients, error } = await supabaseAdmin
      .from('client_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enriched = (clients || []).map(c => ({
      ...c,
      active_limits: loanSettings.getLimitsForClient(c.id),
    }));

    res.json({ success: true, count: enriched.length, clients: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/clients/:id/status
router.post('/clients/:id/status', requireAdmin, async (req, res) => {
  const { status, strikes_count, admin_note } = req.body;
  const updates = {};

  if (status) updates.status = status;
  if (strikes_count !== undefined) updates.strikes_count = parseInt(strikes_count, 10);
  if (admin_note !== undefined) updates.admin_note = admin_note;

  const { data, error } = await supabaseAdmin
    .from('client_profiles')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Client profile updated.', client: data });
});

// ─── Loan Applications & Multi-Channel Disbursement ───────────────────────────

// GET /api/admin/loans
router.get('/loans', requireAdmin, async (req, res) => {
  try {
    const { data: loans, error } = await supabaseAdmin
      .from('money_requests')
      .select(`
        *,
        client_profiles (id, name, phone_number, status, strikes_count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Parse structured disbursement metadata from admin_note if present
    const enriched = (loans || []).map(loan => {
      let disbursement = null;
      if (loan.admin_note && loan.admin_note.startsWith('{') && loan.admin_note.endsWith('}')) {
        try {
          disbursement = JSON.parse(loan.admin_note);
        } catch (e) {}
      }
      return {
        ...loan,
        disbursement,
      };
    });

    res.json({ success: true, count: enriched.length, loans: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/loans/:id/decision
// Accepts multipart/form-data for receipt image upload
router.post('/loans/:id/decision', requireAdmin, uploadReceipt.single('receipt_image'), async (req, res) => {
  const loanId = req.params.id;
  const decision = req.body.decision; // 'ACCEPTED' | 'DECLINED'
  const payout_method = (req.body.payout_method || 'CASH').toUpperCase(); // 'CASH' | 'BKASH' | 'NAGAD'
  const destination_number = req.body.destination_number || '';
  const trx_id = req.body.trx_id || '';
  const fee_handling = req.body.fee_handling || 'INCLUDED'; // 'INCLUDED' | 'DEDUCTED' | 'WAIVED'
  const userNote = req.body.admin_note || '';

  const validDecisions = ['ACCEPTED', 'DECLINED', 'PENDING'];
  if (!validDecisions.includes(decision)) {
    return res.status(400).json({
      success: false,
      message: `Invalid decision. Allowed values: ${validDecisions.join(', ')}`,
    });
  }

  // Fetch loan to calculate fees
  const { data: loan, error: fetchErr } = await supabaseAdmin
    .from('money_requests')
    .select('*, client_profiles(*)')
    .eq('id', loanId)
    .single();

  if (fetchErr || !loan) {
    return res.status(404).json({ success: false, message: 'Loan application not found.' });
  }

  let mfs_fee = 0;
  let receipt_url = null;

  if (req.file) {
    receipt_url = `/uploads/receipts/${req.file.filename}`;
  } else if (req.body.existing_receipt_url) {
    receipt_url = req.body.existing_receipt_url;
  }

  if (decision === 'ACCEPTED') {
    // 1. Calculate MFS Cashout Fee: 20 BDT per 1,000 BDT for bKash and Nagad
    if (payout_method === 'BKASH' || payout_method === 'NAGAD') {
      const loanAmount = parseFloat(loan.amount) || 0;
      // 20 BDT per thousand
      mfs_fee = Math.ceil(loanAmount / 1000) * 20;

      if (!trx_id && payout_method !== 'CASH') {
        return res.status(400).json({
          success: false,
          message: `Transaction ID (TrxID) is required when disbursing via ${payout_method}.`,
        });
      }
    }
  }

  // Construct structured disbursement record
  const disbursementInfo = {
    decision,
    payout_method,
    destination_number: destination_number || loan.client_profiles?.phone_number || '',
    trx_id: trx_id || (payout_method === 'CASH' ? 'CASH_HANDOVER' : ''),
    mfs_fee,
    fee_handling,
    total_disbursed: payout_method === 'CASH' ? parseFloat(loan.amount) : (fee_handling === 'INCLUDED' ? parseFloat(loan.amount) + mfs_fee : parseFloat(loan.amount)),
    receipt_url,
    disbursed_at: new Date().toISOString(),
    admin_note: userNote || `Disbursed via ${payout_method}`,
  };

  const serializedNote = JSON.stringify(disbursementInfo);

  // Update in Supabase
  const { data: updatedLoan, error: updateErr } = await supabaseAdmin
    .from('money_requests')
    .update({
      status: decision,
      admin_note: serializedNote,
    })
    .eq('id', loanId)
    .select(`
      *,
      client_profiles (id, name, phone_number)
    `)
    .single();

  if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });

  console.log(`[Disbursement] ✅ Loan #${loanId.slice(0, 8)} marked as ${decision} via ${payout_method}. TrxID: ${trx_id || 'N/A'}`);

  res.json({
    success: true,
    message: `Loan #${loanId.slice(0, 8)} approved and disbursed via ${payout_method}.`,
    loan: {
      ...updatedLoan,
      disbursement: disbursementInfo,
    },
  });
});

// ─── Historical "Google Keep" Ledgers Digitalizer ─────────────────────────────

// GET /api/admin/historical-ledgers
router.get('/historical-ledgers', requireAdmin, async (req, res) => {
  try {
    const { data: ledgers, error } = await supabaseAdmin
      .from('historical_ledgers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, count: ledgers.length, ledgers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/historical-ledgers/import-note
// Parses raw Google Keep note lines like "Sunny = 2140+500=2,640" or "Jhor vi = 2000 fraud"
router.post('/historical-ledgers/import-note', requireAdmin, async (req, res) => {
  const { raw_text } = req.body;
  if (!raw_text) return res.status(400).json({ success: false, message: 'raw_text is required' });

  const lines = raw_text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const results = [];

  for (const line of lines) {
    // Regex matches Name, Separator (- or =), Expression/Numbers, Optional Tag
    // Examples:
    // "Niloy -----------=115 dress"
    // "Sunny-----------=2140+500=2,640"
    // "Alga----------- = 2660+1200(ajik field) +3000(dL) +234 (rexam fee)= 7,094-5000=2,094"
    // "Jhor vi ---------=2000 fraud"
    const match = line.match(/^([A-Za-z0-9\s]+?)\s*[-=]+\s*(.*)$/);
    if (!match) continue;

    const rawName = match[1].trim();
    const rightPart = match[2].trim();

    // Look for final number after equal sign or standalone
    let balance = 0;
    let tag = 'IMPORTED NOTE';

    // If has = in rightPart (e.g. 2140+500=2,640)
    const eqIdx = rightPart.lastIndexOf('=');
    let valueCandidate = rightPart;
    if (eqIdx !== -1) {
      valueCandidate = rightPart.slice(eqIdx + 1).trim();
    }

    // Extract first numeric token from value candidate
    const numMatch = valueCandidate.match(/([\d,]+)/);
    if (numMatch) {
      balance = parseFloat(numMatch[1].replace(/,/g, '')) || 0;
    }

    // Extract tags
    const tagMatch = rightPart.match(/([a-zA-Z\s()]+)$/);
    if (tagMatch && tagMatch[1].trim()) {
      tag = tagMatch[1].trim();
    } else {
      tag = rightPart.slice(0, 40);
    }

    // Check for fraud
    if (/fraud/i.test(line)) {
      tag = 'FRAUD CLIENT';
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('historical_ledgers')
      .upsert({
        old_name: rawName.toUpperCase(),
        historical_balance: balance,
        historical_tag: tag.toUpperCase(),
      }, { onConflict: 'old_name' })
      .select()
      .single();

    if (error) {
      console.error('[Import Note] Supabase error on line:', line, error.message);
    } else if (inserted) {
      results.push(inserted);
    }
  }

  res.json({
    success: true,
    message: `Successfully digitized and imported ${results.length} note entries into historical ledgers.`,
    imported: results,
  });
});

// POST /api/admin/historical-ledgers/:id/adjust-cash — Customise client cash (+ / - Add or Subtract)
router.post('/historical-ledgers/:id/adjust-cash', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { type, amount, memo } = req.body; // type: 'ADD' | 'SUBTRACT'

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid positive adjustment amount is required.' });
  }

  if (type !== 'ADD' && type !== 'SUBTRACT') {
    return res.status(400).json({ success: false, message: "Type must be 'ADD' or 'SUBTRACT'." });
  }

  // Fetch current ledger
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from('historical_ledgers')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !current) {
    return res.status(404).json({ success: false, message: 'Historical ledger entry not found.' });
  }

  const currentBal = parseFloat(current.historical_balance) || 0;
  const newBalance = type === 'ADD' ? (currentBal + numAmount) : (currentBal - numAmount);
  const auditDate = new Date().toISOString().split('T')[0];
  const auditEntry = `[${auditDate}: ${type === 'ADD' ? '+' : '-'}৳${numAmount}${memo ? ` (${memo})` : ''}]`;
  const newTag = current.historical_tag ? `${current.historical_tag} ${auditEntry}` : auditEntry;

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('historical_ledgers')
    .update({
      historical_balance: newBalance,
      historical_tag: newTag,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return res.status(500).json({ success: false, message: updateErr.message });
  }

  console.log(`[Ledger] 💵 Cash adjustment on ${current.old_name}: ${type} ৳${numAmount}. New balance: ৳${newBalance}`);

  res.json({
    success: true,
    message: `Cash ${type === 'ADD' ? 'added to' : 'subtracted from'} ${current.old_name}: ৳${numAmount}. New Balance: ৳${newBalance}`,
    ledger: updated,
  });
});

// GET /api/admin/clients/master-spreadsheet — Comprehensive master data for all clients & historical debts
router.get('/clients/master-spreadsheet', requireAdmin, async (req, res) => {
  try {
    const { data: clients, error: clientErr } = await supabaseAdmin
      .from('client_profiles')
      .select(`
        *,
        historical_ledgers (*),
        money_requests (*)
      `)
      .order('created_at', { ascending: false });

    if (clientErr) throw clientErr;

    // Aggregate master rows
    const rows = (clients || []).map(c => {
      const requests = c.money_requests || [];
      const totalRequested = requests.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const acceptedLoans = requests.filter(r => r.status === 'ACCEPTED');
      const totalBorrowed = acceptedLoans.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const pendingCount = requests.filter(r => r.status === 'PENDING').length;
      const histBal = c.historical_ledgers?.historical_balance ? parseFloat(c.historical_ledgers.historical_balance) : 0;

      return {
        id: c.id,
        name: c.name,
        phone_number: c.phone_number,
        email: c.email,
        status: c.status,
        strikes_count: c.strikes_count,
        historical_name: c.historical_ledgers?.old_name || 'N/A',
        historical_balance: histBal,
        historical_tag: c.historical_ledgers?.historical_tag || 'STANDARD',
        total_loan_requests: requests.length,
        pending_requests: pendingCount,
        accepted_loans_count: acceptedLoans.length,
        total_borrowed_bdt: totalBorrowed,
        current_outstanding_bdt: totalBorrowed + histBal,
        joined_at: c.created_at,
      };
    });

    res.json({ success: true, count: rows.length, rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

