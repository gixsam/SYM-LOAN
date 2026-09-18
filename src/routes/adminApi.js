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
const kycManager       = require('../lib/kycManager');
const expenseManager   = require('../lib/expenseManager');
const executiveSuiteManager = require('../lib/executiveSuiteManager');
const repaymentManager = require('../lib/repaymentManager');
const smsService       = require('../lib/smsService');
const collectionEngine = require('../lib/collectionEngine');
const creditScoreEngine = require('../lib/creditScoreEngine');
const fraudDetectionEngine = require('../lib/fraudDetectionEngine');
const staffAuthEngine = require('../lib/staffAuthEngine');
const auditTrailEngine = require('../lib/auditTrailEngine');

const router = express.Router();

// Admin Authentication Middleware
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'SEP_ADMIN_2026';
const ADMIN_AUTHORIZED_EMAILS = [
  'zillionprince6@gmail.com',
  'symwebz@gmail.com',
];

function requireAdmin(req, res, next) {
  let token = req.headers['x-staff-token'] || req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }
  if (token) {
    const payload = staffAuthEngine.verifyStaffToken(token);
    if (payload) {
      const liveMember = staffAuthEngine.getStaffById(payload.sub);
      if (liveMember && liveMember.status === 'ACTIVE') {
        req.staffUser = liveMember;
        return next();
      }
    }
  }

  const provided = req.headers['x-admin-key'] || req.query.admin_key || req.body?.admin_key;
  if (provided === ADMIN_SECRET) {
    req.staffUser = {
      id: 'stf_superadmin_01',
      username: 'superadmin',
      display_name: 'Executive Managing Director',
      role: 'SUPER_ADMIN',
      permissions: ['*'],
      approval_ceiling: 100000
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Invalid Admin Secret Key or Staff Session.',
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

// GET /api/admin/auth/verify — Verify active admin credentials
router.get('/auth/verify', requireAdmin, (req, res) => {
  res.json({
    success: true,
    admin: true,
    message: 'Executive Admin session verified.',
    admin_key: ADMIN_SECRET,
  });
});

// GET /api/admin/config/limits — Alias to loan limits for admin inspection
router.get('/config/limits', requireAdmin, (req, res) => {
  const settings = loanSettings.getAllSettings();
  res.json({
    success: true,
    limits: settings.global,
    settings,
  });
});

// POST /api/admin/auth/request-otp — Options 2 & 3: Telegram OTP (01612669922) or Email OTP
router.post('/auth/request-otp', async (req, res) => {
  const { email, phone, channel } = req.body;

  let identifier = null;
  let targetChannel = channel || (phone ? 'TELEGRAM' : 'EMAIL');

  if (targetChannel === 'TELEGRAM' || phone) {
    const rawPhone = (phone || '01612669922').trim();
    // Verify admin authorized phone
    if (!rawPhone.includes('01612669922') && !rawPhone.includes('8801612669922')) {
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

// POST /api/admin/branding/upload-admin-logo — Unlimited size Admin logo upload
router.post('/branding/upload-admin-logo', requireAdmin, (req, res) => {
  uploadBrandLogo.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const relativeUrl = `/uploads/branding/${req.file.filename}`;
    loanSettings.updateAdminLogo(relativeUrl);

    return res.json({
      success: true,
      message: 'Admin Panel logo updated successfully.',
      logo_url: relativeUrl,
      file_name: req.file.filename,
      file_size: req.file.size,
    });
  });
});

// POST /api/admin/branding/reset-admin-logo — Reset Admin logo back to default
router.post('/branding/reset-admin-logo', requireAdmin, (_req, res) => {
  loanSettings.updateAdminLogo('/images/logo.png');
  return res.json({
    success: true,
    message: 'Admin Panel logo reset to official default.',
    logo_url: '/images/logo.png',
  });
});

// POST /api/admin/branding/upload-client-logo — Unlimited size User/Client logo upload
router.post('/branding/upload-client-logo', requireAdmin, (req, res) => {
  uploadBrandLogo.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const relativeUrl = `/uploads/branding/${req.file.filename}`;
    loanSettings.updateClientLogo(relativeUrl);

    return res.json({
      success: true,
      message: 'User/Client Panel logo updated successfully.',
      logo_url: relativeUrl,
      file_name: req.file.filename,
      file_size: req.file.size,
    });
  });
});

// POST /api/admin/branding/reset-client-logo — Reset User/Client logo back to default
router.post('/branding/reset-client-logo', requireAdmin, (_req, res) => {
  loanSettings.updateClientLogo('/images/logo.png');
  return res.json({
    success: true,
    message: 'User/Client Panel logo reset to official default.',
    logo_url: '/images/logo.png',
  });
});

// POST /api/admin/branding/upload-logo — Unlimited size logo upload (general)
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

// GET /api/admin/notifications — Live pending notifications for KYC & Loans
router.get('/notifications', requireAdmin, async (req, res) => {
  try {
    // 1. Fetch pending loans with client profiles
    const { data: pendingLoans } = await supabaseAdmin
      .from('money_requests')
      .select('id, amount, status, purpose, created_at, client_profiles (id, name, phone_number)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    // 2. Fetch pending KYC profiles
    const { data: clients } = await supabaseAdmin
      .from('client_profiles')
      .select('id, name, phone_number');

    const pendingKyc = [];
    (clients || []).forEach(c => {
      const kyc = kycManager.getKycProfile(c.id);
      if (kyc && (kyc.status || 'UNSUBMITTED') === 'PENDING') {
        pendingKyc.push({
          client_id: c.id,
          name: kyc.full_name || c.name,
          phone: kyc.phone || c.phone_number,
          submitted_at: kyc.submitted_at,
          nid_number: kyc.nid_number,
        });
      }
    });

    // 3. Fetch pending repayments
    const pendingRepayments = repaymentManager.getRepayments({ status: 'PENDING_REVIEW' });

    // 4. Fetch under-review fraud alerts
    const fraudAlerts = fraudDetectionEngine.getFraudAlerts('UNDER_REVIEW');
    const pendingFraud = fraudAlerts.items || [];

    const totalCount = (pendingLoans || []).length + pendingKyc.length + pendingRepayments.length + pendingFraud.length;

    res.json({
      success: true,
      count: totalCount,
      pending_loans: pendingLoans || [],
      pending_kyc: pendingKyc,
      pending_repayments: pendingRepayments,
      pending_fraud_alerts: pendingFraud,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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

  const auditAction = decision === 'ACCEPTED' ? 'LOAN_APPROVED' : (decision === 'DECLINED' ? 'LOAN_DECLINED' : 'LOAN_UPDATED');
  try {
    auditTrailEngine.recordExpressAction(req, auditAction, 'LOAN', loanId, {
      amount: loan.amount,
      payout_method,
      client_id: loan.client_id,
      decision,
      trx_id: trx_id || undefined,
      admin_note: userNote || undefined
    });
  } catch (auditErr) {
    console.warn('[Audit] Failed to log loan decision:', auditErr.message);
  }

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

// ─── KYC Identity Verification Admin Desk ────────────────────────────────────

// GET /api/admin/kyc/list — List all client KYC records
router.get('/kyc/list', requireAdmin, async (req, res) => {
  try {
    const { data: clients } = await supabaseAdmin
      .from('client_profiles')
      .select('id, name, phone_number, email, status, strikes_count, created_at');

    const enriched = (clients || []).map(c => {
      const kyc = kycManager.getKycProfile(c.id);
      return {
        client_id: c.id,
        name: kyc.full_name || c.name,
        phone: kyc.phone || c.phone_number,
        email: kyc.email || c.email,
        email_verified: kyc.email_verified,
        dob: kyc.dob,
        nid_number: kyc.nid_number,
        nid_front_url: kyc.nid_front_url,
        nid_back_url: kyc.nid_back_url,
        live_selfie_url: kyc.live_selfie_url,
        kyc_status: kyc.status || 'UNSUBMITTED',
        locked: kyc.locked,
        submitted_at: kyc.submitted_at,
        verified_at: kyc.verified_at,
        rejection_reason: kyc.rejection_reason,
        account_status: c.status,
        strikes: c.strikes_count,
        joined_at: c.created_at,
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched, profiles: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/kyc/:clientId — Detailed inspection view
router.get('/kyc/:clientId', requireAdmin, async (req, res) => {
  const { clientId } = req.params;
  const kyc = kycManager.getKycProfile(clientId);

  const { data: client } = await supabaseAdmin
    .from('client_profiles')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();

  if (client && (!kyc.phone || kyc.phone !== client.phone_number)) {
    kyc.phone = client.phone_number;
  }

  res.json({ success: true, kyc, client });
});

// POST /api/admin/kyc/:clientId/decision — Approve or Reject KYC
router.post('/kyc/:clientId/decision', requireAdmin, async (req, res) => {
  const { clientId } = req.params;
  const { decision, reason } = req.body;

  try {
    const updated = kycManager.adminReviewKyc(clientId, decision, reason);

    try {
      auditTrailEngine.recordExpressAction(req, decision === 'APPROVED' ? 'KYC_VERIFIED' : 'KYC_REJECTED', 'KYC_PROFILE', clientId, {
        decision,
        reason: reason || undefined,
        status: updated.status
      });
    } catch (auditErr) {
      console.warn('[Audit] Failed to log KYC decision:', auditErr.message);
    }

    res.json({
      success: true,
      message: `KYC for client has been set to ${updated.status}.`,
      kyc: updated,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Phase 8: Daily Expense Tracking & Ledger Cost Split Engine ─────────────
router.get('/expenses', requireAdmin, (req, res) => {
  try {
    const { category } = req.query;
    const expenses = expenseManager.getAll(category);
    const summary = expenseManager.getSummary();
    res.json({
      success: true,
      count: expenses.length,
      expenses,
      summary,
      categories: expenseManager.CATEGORIES
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/expenses', requireAdmin, (req, res) => {
  try {
    const created = expenseManager.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Expense entry recorded successfully.',
      expense: created,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/expenses/:id', requireAdmin, (req, res) => {
  try {
    const removed = expenseManager.delete(req.params.id);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }
    res.json({ success: true, message: 'Expense removed.', expense: removed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Upcoming Repayments & Collection Schedule Analytics ─────────────────────
router.get('/analytics/upcoming-repayments', requireAdmin, async (req, res) => {
  try {
    const { data: loans, error } = await supabaseAdmin
      .from('money_requests')
      .select('*, client_profiles(*)')
      .eq('status', 'ACCEPTED')
      .order('deadline_date', { ascending: true });

    if (error) throw error;

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    let totalExpectedInflows = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let dueTodayCount = 0;
    let dueTodayAmount = 0;
    let dueIn3DaysCount = 0;
    let dueIn3DaysAmount = 0;
    let dueIn7DaysCount = 0;
    let dueIn7DaysAmount = 0;

    const scheduledLoans = (loans || []).map(loan => {
      const amount = parseFloat(loan.amount) || 0;
      const fee = parseFloat(loan.fee_amount) || 0;
      const totalRepay = amount + fee;
      totalExpectedInflows += totalRepay;

      const deadline = loan.deadline_date;
      const loanDate = new Date(deadline);
      const diffTime = loanDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let urgency = 'FUTURE';
      let urgencyLabel = `In ${diffDays} days`;

      if (diffDays < 0) {
        urgency = 'OVERDUE';
        urgencyLabel = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
        overdueCount++;
        overdueAmount += totalRepay;
      } else if (diffDays === 0) {
        urgency = 'TODAY';
        urgencyLabel = 'Due Today!';
        dueTodayCount++;
        dueTodayAmount += totalRepay;
      } else if (diffDays <= 3) {
        urgency = 'IMMINENT_3D';
        urgencyLabel = `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
        dueIn3DaysCount++;
        dueIn3DaysAmount += totalRepay;
      } else if (diffDays <= 7) {
        urgency = 'UPCOMING_7D';
        urgencyLabel = `Due in ${diffDays} days`;
        dueIn7DaysCount++;
        dueIn7DaysAmount += totalRepay;
      }

      return {
        id: loan.id,
        amount,
        fee,
        total_repayment: totalRepay,
        deadline_date: deadline,
        diff_days: diffDays,
        urgency,
        urgency_label: urgencyLabel,
        disbursed_at: loan.disbursed_at || loan.created_at,
        disbursement_method: loan.disbursement_method || 'CASH',
        client_name: loan.client_profiles?.name || 'Client',
        client_phone: loan.client_profiles?.phone_number || '',
        client_id: loan.client_id,
        trx_id: loan.trx_id || null,
        receipt_image: loan.receipt_image_url || null,
      };
    });

    res.json({
      success: true,
      summary: {
        total_loans: scheduledLoans.length,
        total_expected_inflows: Math.round(totalExpectedInflows),
        total_upcoming_repayments: Math.round(totalExpectedInflows),
        overdue: { count: overdueCount, amount: Math.round(overdueAmount) },
        due_today: { count: dueTodayCount, amount: Math.round(dueTodayAmount) },
        due_in_3_days: { count: dueIn3DaysCount, amount: Math.round(dueIn3DaysAmount) },
        due_in_7_days: { count: dueIn7DaysCount, amount: Math.round(dueIn7DaysAmount) },
        overdue_count: overdueCount,
        overdue_amount: Math.round(overdueAmount),
        due_today_count: dueTodayCount,
        due_today_amount: Math.round(dueTodayAmount),
        due_in_3_days_count: dueIn3DaysCount,
        due_in_3_days_amount: Math.round(dueIn3DaysAmount),
        due_in_7_days_count: dueIn7DaysCount,
        due_in_7_days_amount: Math.round(dueIn7DaysAmount),
      },
      loans: scheduledLoans,
      upcoming_loans: scheduledLoans,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── S.E.P. Executive Operations Suite (Notepad, Calendar, Alarms) ───────────
router.get('/executive-suite/notes', requireAdmin, (_req, res) => {
  res.json({ success: true, notes: executiveSuiteManager.getNotes() });
});

router.post('/executive-suite/notes', requireAdmin, (req, res) => {
  try {
    const saved = executiveSuiteManager.saveNote(req.body);
    res.status(201).json({ success: true, message: 'Note saved.', note: saved });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/executive-suite/notes/:id', requireAdmin, (req, res) => {
  const removed = executiveSuiteManager.deleteNote(req.params.id);
  res.json({ success: true, message: 'Note deleted.', removed });
});

router.get('/executive-suite/events', requireAdmin, (_req, res) => {
  res.json({ success: true, events: executiveSuiteManager.getEvents() });
});

router.post('/executive-suite/events', requireAdmin, (req, res) => {
  try {
    const created = executiveSuiteManager.createEvent(req.body);
    res.status(201).json({ success: true, message: 'Event scheduled.', event: created });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/executive-suite/events/:id', requireAdmin, (req, res) => {
  const removed = executiveSuiteManager.deleteEvent(req.params.id);
  res.json({ success: true, message: 'Event deleted.', removed });
});

router.get('/executive-suite/alarms', requireAdmin, (_req, res) => {
  res.json({ success: true, alarms: executiveSuiteManager.getAlarms() });
});

router.post('/executive-suite/alarms', requireAdmin, (req, res) => {
  const saved = executiveSuiteManager.saveAlarm(req.body);
  res.status(201).json({ success: true, message: 'Alarm saved.', alarm: saved });
});

router.delete('/executive-suite/alarms/:id', requireAdmin, (req, res) => {
  const removed = executiveSuiteManager.deleteAlarm(req.params.id);
  res.json({ success: true, message: 'Alarm removed.', removed });
});

// ─── Phase 9: Admin Repayments Reconciliation Desk ───────────────────────────

// GET /api/admin/repayments — List all repayments with filtering and stats
router.get('/repayments', requireAdmin, (req, res) => {
  try {
    const status = req.query.status || 'ALL';
    const clientId = req.query.client_id;
    const loanId = req.query.loan_id;

    const list = repaymentManager.getRepayments({
      status: status !== 'ALL' ? status : undefined,
      client_id: clientId,
      loan_id: loanId,
    });

    const stats = repaymentManager.getStats();

    res.json({
      success: true,
      count: list.length,
      stats,
      data: list,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/repayments/:id/approve — Verify, settle loan & issue clearance
router.post('/repayments/:id/approve', requireAdmin, async (req, res) => {
  try {
    const result = await repaymentManager.approveRepayment(
      req.params.id,
      req.body?.admin_note || 'Verified and settled by Administrator'
    );

    try {
      auditTrailEngine.recordExpressAction(req, 'REPAYMENT_APPROVED', 'REPAYMENT', req.params.id, {
        repayment_id: req.params.id,
        admin_note: req.body?.admin_note,
        settled_at: result.repayment?.verified_at
      });
    } catch (auditErr) {
      console.warn('[Audit] Failed to log repayment approval:', auditErr.message);
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/admin/repayments/:id/reject — Reject repayment with reason
router.post('/repayments/:id/reject', requireAdmin, async (req, res) => {
  try {
    const result = await repaymentManager.rejectRepayment(
      req.params.id,
      req.body?.reason || 'Transaction proof or TrxID could not be verified'
    );

    try {
      auditTrailEngine.recordExpressAction(req, 'REPAYMENT_REJECTED', 'REPAYMENT', req.params.id, {
        repayment_id: req.params.id,
        reason: req.body?.reason
      });
    } catch (auditErr) {
      console.warn('[Audit] Failed to log repayment rejection:', auditErr.message);
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Phase 10: Multi-Channel Debt Collection, Strike Escalator & Reminder Engine ───

// GET /api/admin/collections/matrix — Complete debtor risk matrix
router.get('/collections/matrix', requireAdmin, async (req, res) => {
  try {
    const matrix = await collectionEngine.getCollectionsMatrix();
    res.json({ success: true, data: matrix });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/collections/run-cycle — Run collection & strike escalation cycle on-demand
router.post('/collections/run-cycle', requireAdmin, async (req, res) => {
  try {
    const report = await collectionEngine.runCollectionAndReminderCycle(req.body || {});
    res.json({
      success: true,
      message: 'Collection and strike escalation cycle completed successfully.',
      report,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/collections/remind — Trigger manual dunning reminder (Telegram / SMS / Both)
router.post('/collections/remind', requireAdmin, async (req, res) => {
  try {
    const { client_id, loan_id, channel, template_type, custom_text } = req.body;
    if (!client_id) {
      return res.status(400).json({ success: false, message: 'client_id is required' });
    }

    const { data: client } = await supabaseAdmin
      .from('client_profiles')
      .select('id, name, phone_number, strikes_count, status, telegram_chat_id')
      .eq('id', client_id)
      .maybeSingle();

    let loan = null;
    if (loan_id) {
      const { data: l } = await supabaseAdmin
        .from('money_requests')
        .select('id, amount, deadline_date, status')
        .eq('id', loan_id)
        .maybeSingle();
      loan = l;
    }

    const dispatchRes = await smsService.dispatchReminder({
      channel: channel || 'BOTH',
      client: client || { id: client_id, name: 'Client' },
      loan,
      templateType: template_type || 'MANUAL_DUNNING',
      customText: custom_text,
      trigger: 'ADMIN_MANUAL',
    });

    res.json({
      success: true,
      message: 'Reminder dispatched successfully.',
      dispatch: dispatchRes,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/collections/strikes — Manual strike adjustment (INCREMENT, DECREMENT, RESET, SET)
router.post('/collections/strikes', requireAdmin, async (req, res) => {
  try {
    const { client_id, action, value, reason } = req.body;
    if (!client_id || !action) {
      return res.status(400).json({
        success: false,
        message: 'client_id and action (INCREMENT, DECREMENT, RESET, SET) are required.',
      });
    }

    const result = await collectionEngine.adjustClientStrikes(client_id, { action, value, reason });
    res.json({
      success: true,
      message: 'Client strikes updated.',
      result,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/admin/collections/blacklist — Manual blacklist/unblock toggle
router.post('/collections/blacklist', requireAdmin, async (req, res) => {
  try {
    const { client_id, status, reason } = req.body;
    if (!client_id) {
      return res.status(400).json({ success: false, message: 'client_id is required.' });
    }

    const result = await collectionEngine.setClientBlacklist(client_id, { status, reason });
    res.json({
      success: true,
      message: `Client status updated to ${result.new_status}.`,
      result,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/admin/collections/logs — View reminder dispatch logs & metrics
router.get('/collections/logs', requireAdmin, (req, res) => {
  try {
    const logs = smsService.getReminderLogs(req.query);
    const stats = smsService.getStats();
    res.json({
      success: true,
      count: logs.length,
      stats,
      logs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Phase 11: Credit Scoring, VIP Loyalty & Anti-Fraud Operations Desk ───────

// GET /api/admin/credit/matrix — Portfolio credit intelligence roster & distribution
router.get('/credit/matrix', requireAdmin, async (req, res) => {
  try {
    const data = await creditScoreEngine.getPortfolioCreditMatrix();
    res.json({
      success: true,
      summary: data.summary,
      items: data.items,
      matrix: {
        ...data.summary,
        clients: data.items
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/credit/override — Set manual score adjustment, fixed tier or grade
router.post('/credit/override', requireAdmin, async (req, res) => {
  try {
    const { client_id, score_offset, score_delta, fixed_grade, fixed_tier, force_status, admin_note, reason } = req.body;
    if (!client_id) {
      return res.status(400).json({ success: false, message: 'client_id is required.' });
    }

    const effectiveOffset = score_offset !== undefined ? score_offset : score_delta;
    const effectiveNote = admin_note || reason;

    const override = creditScoreEngine.setAdminOverride(client_id, {
      score_offset: effectiveOffset,
      fixed_grade,
      fixed_tier,
      force_status,
      admin_note: effectiveNote
    });

    const updatedProfile = await creditScoreEngine.getClientCreditProfile(client_id);

    try {
      auditTrailEngine.recordExpressAction(req, 'CREDIT_OVERRIDE_SET', 'CLIENT_CREDIT', client_id, {
        score_offset: effectiveOffset,
        fixed_grade,
        fixed_tier,
        admin_note: effectiveNote
      });
    } catch (auditErr) {
      console.warn('[Audit] Failed to log credit override:', auditErr.message);
    }

    res.json({
      success: true,
      message: 'Admin credit override saved successfully.',
      override,
      profile: updatedProfile
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/credit/override/:id — Remove manual override
router.delete('/credit/override/:id', requireAdmin, async (req, res) => {
  try {
    const removed = creditScoreEngine.removeAdminOverride(req.params.id);
    const profile = await creditScoreEngine.getClientCreditProfile(req.params.id);

    try {
      auditTrailEngine.recordExpressAction(req, 'CREDIT_OVERRIDE_REMOVED', 'CLIENT_CREDIT', req.params.id, {
        removed
      });
    } catch (auditErr) {
      console.warn('[Audit] Failed to log credit override removal:', auditErr.message);
    }

    res.json({
      success: true,
      removed,
      message: removed ? 'Override removed. Natural scoring restored.' : 'No active override found.',
      profile
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/admin/fraud/alerts — Inspect fraud logs and collision alerts
router.get('/fraud/alerts', requireAdmin, (req, res) => {
  try {
    const filter = req.query.filter || 'ALL';
    const alerts = fraudDetectionEngine.getFraudAlerts(filter);
    res.json({
      success: true,
      summary: alerts.summary,
      items: alerts.items,
      alerts: alerts.items,
      stats: {
        ...alerts.summary,
        total_evaluations: alerts.summary.total_logs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/fraud/resolve — Resolve fraud alert (CLEARED or BLOCKED)
router.post('/fraud/resolve', requireAdmin, (req, res) => {
  try {
    const { log_id, resolution, admin_note } = req.body;
    if (!log_id || !resolution) {
      return res.status(400).json({ success: false, message: 'log_id and resolution (CLEARED or BLOCKED) are required.' });
    }

    const entry = fraudDetectionEngine.resolveAlert(log_id, resolution, admin_note);

    auditTrailEngine.recordExpressAction(req, 'FRAUD_ALERT_RESOLVED', 'FRAUD_LOG', log_id, {
      resolution,
      admin_note,
      target_ip: entry.ip_address,
      fingerprint_hash: entry.fingerprint_hash
    });

    res.json({
      success: true,
      message: `Fraud alert resolved as ${resolution}.`,
      entry
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Phase 12: Staff Authentication & Granular RBAC Management ───────────────

// POST /api/admin/staff/auth/login — Staff member login
router.post('/staff/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const authResult = staffAuthEngine.authenticate(username, password);
    res.json({
      success: true,
      message: `Welcome back, ${authResult.staff.display_name}!`,
      token: authResult.token,
      staff: authResult.staff
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
});

// GET /api/admin/staff/profile — Currently logged-in staff profile
router.get('/staff/profile', requireAdmin, (req, res) => {
  const staff = req.staffUser || {
    id: 'stf_superadmin_01',
    username: 'superadmin',
    display_name: 'Executive Managing Director',
    role: 'SUPER_ADMIN',
    permissions: ['*'],
    approval_ceiling: 100000
  };

  const catalog = staffAuthEngine.getRolesCatalog();
  const roleMeta = catalog[staff.role] || { name: staff.role, badge: '👤', color: '#6b7280' };

  res.json({
    success: true,
    staff: {
      ...staff,
      role_meta: roleMeta
    }
  });
});

// GET /api/admin/staff — List all staff members
router.get('/staff', requireAdmin, (req, res) => {
  try {
    const staffList = staffAuthEngine.listStaff();
    const rolesCatalog = staffAuthEngine.getRolesCatalog();
    res.json({
      success: true,
      staff: staffList,
      roles: rolesCatalog
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/staff — Create a new staff account (requires staff:manage or SUPER_ADMIN)
router.post('/staff', requireAdmin, (req, res) => {
  try {
    const operator = req.staffUser || { id: 'stf_superadmin_01', name: 'Super Admin', role: 'SUPER_ADMIN' };
    if (operator.role !== 'SUPER_ADMIN' && !staffAuthEngine.hasPermission(operator, 'staff:manage')) {
      return res.status(403).json({ success: false, message: 'Only Super Administrators can create staff accounts.' });
    }

    const created = staffAuthEngine.createStaffMember(req.body, operator);
    res.status(201).json({
      success: true,
      message: `Staff member ${created.display_name} created successfully.`,
      staff: created
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/staff/:id — Update staff details, status, or permissions
router.patch('/staff/:id', requireAdmin, (req, res) => {
  try {
    const operator = req.staffUser || { id: 'stf_superadmin_01', name: 'Super Admin', role: 'SUPER_ADMIN' };
    if (operator.role !== 'SUPER_ADMIN' && !staffAuthEngine.hasPermission(operator, 'staff:manage')) {
      return res.status(403).json({ success: false, message: 'Only Super Administrators can modify staff accounts.' });
    }

    const updated = staffAuthEngine.updateStaffMember(req.params.id, req.body, operator);
    res.json({
      success: true,
      message: `Staff member ${updated.display_name} updated successfully.`,
      staff: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Phase 12: Cryptographic Immutable Audit Trail Desk ─────────────────────

// GET /api/admin/audit/logs — Query immutable audit blocks
router.get('/audit/logs', requireAdmin, (req, res) => {
  try {
    const result = auditTrailEngine.getAuditLogs(req.query);
    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/audit/verify-chain — Inspect entire cryptographic hash chain
router.get('/audit/verify-chain', requireAdmin, (req, res) => {
  try {
    const verification = auditTrailEngine.verifyChainIntegrity();
    res.json({
      success: true,
      verification
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;


