'use strict';
/**
 * src/routes/api.js
 * SYM EMPIRE PLATFORM (S.E.P.) — REST API Routes
 *
 * All routes under /api require:
 *   - Mobile device (verifyMobileDeviceOnly middleware on parent router)
 *
 * Endpoints:
 *   GET  /api/health               → System health check
 *   GET  /api/config/limits        → Active loan limits (Min/Max amount, Min/Max deadline)
 *   GET  /api/clients              → List all client profiles
 *   GET  /api/clients/:id          → Get single client profile
 *   GET  /api/clients/lookup/phone → Find client by phone number
 *   GET  /api/clients/:id/loans    → Get loans for specific client
 *   GET  /api/loans                → List all money requests
 *   POST /api/loans                → Create a loan request (Strictly validated against admin limits)
 *   PATCH /api/loans/:id/status    → Update loan request status
 *   GET  /api/budgets              → Get system budgets
 *   POST /api/cron/trigger         → Manually trigger strike engine
 */

const express       = require('express');
const fs            = require('fs');
const path          = require('path');
const { supabaseAdmin } = require('../lib/supabase');
const loanSettings  = require('../lib/loanSettings');
const { runDeadlineStrikeCheck } = require('../cron/deadlineStrikeEngine');
const otpManager    = require('../lib/otpManager');
const { sendTelegramOtp } = require('../bot/index');
const { uploadAvatar, uploadKycDocs } = require('../lib/uploader');
const kycManager    = require('../lib/kycManager');
const emailService  = require('../lib/emailService');

const router = express.Router();

// Helper to construct Supabase OR filter for phone number variants (+8801..., 8801..., 01...)
function buildPhoneSearchFilter(phone) {
  const cleanPhone = (phone || '').trim();
  const digits = cleanPhone.replace(/\D/g, '');
  const pE164 = '+' + (digits.startsWith('88') ? digits : '88' + digits);
  const pNoPlus = digits.startsWith('88') ? digits : '88' + digits;
  const pLocal = digits.startsWith('88') ? digits.substring(2) : (digits.startsWith('0') ? digits : '0' + digits);
  const filterList = Array.from(new Set([pE164, pNoPlus, pLocal, cleanPhone]))
    .filter(Boolean)
    .map(p => `phone_number.eq.${p}`)
    .join(',');
  return { cleanPhone, pE164, pLocal, filterList };
}

// ─── Health Check ─────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    success: true,
    system:  'SYM EMPIRE PLATFORM (S.E.P.)',
    service: 'SYM LOAN Backend',
    domain:  process.env.ROUTING_ENDPOINT_DOMAIN,
    time:    new Date().toISOString(),
    status:  'ONLINE',
  });
});

// ─── Loan Constraints & Dynamic Limits ────────────────────────────────────────
// Returns dynamic Min/Max amounts, Min/Max allowed deadline dates, and active brand logo
router.get('/config/limits', (req, res) => {
  const clientId = req.query.client_id;
  const limits = loanSettings.getLimitsForClient(clientId);
  res.json({
    success: true,
    limits,
    logo_url: loanSettings.getClientLogo(),
  });
});

// ─── Brand Identity & Logo ───────────────────────────────────────────────────
router.get('/config/branding', (_req, res) => {
  res.json({
    success: true,
    logo_url: loanSettings.getClientLogo(),
  });
});

// ─── Client Real-Time Notifications ──────────────────────────────────────────
router.get('/client/notifications', async (req, res) => {
  try {
    const clientId = req.query.client_id;
    const phone = req.query.phone;
    if (!clientId && !phone) {
      return res.status(400).json({ success: false, message: 'client_id or phone is required.' });
    }

    let client = null;
    if (clientId) {
      const { data } = await supabaseAdmin.from('client_profiles').select('*').eq('id', clientId).maybeSingle();
      client = data;
    } else if (phone) {
      const { filterList } = buildPhoneSearchFilter(phone);
      const { data } = await supabaseAdmin.from('client_profiles').select('*').or(filterList).maybeSingle();
      client = data;
    }

    if (!client) {
      return res.json({ success: true, count: 0, unread_count: 0, notifications: [] });
    }

    const notifications = [];

    // 1. Check KYC Status
    const kyc = kycManager.getKycProfile ? kycManager.getKycProfile(client.id) : (kycManager.getProfile ? kycManager.getProfile(client.id) : null);
    const kycStatus = (kyc?.status || kyc?.kyc_status || 'UNSUBMITTED').toUpperCase();

    if (kycStatus === 'VERIFIED') {
      notifications.push({
        id: 'kyc-verified',
        type: 'KYC_APPROVED',
        title: 'KYC Identity Approved! 🎉',
        message: 'Your National ID & Biometric Selfie were verified. Loan applications are now fully unlocked!',
        icon: 'fa-user-check',
        color: 'text-emerald-400',
        badge: 'APPROVED',
        time_ago: 'Active',
        is_unread: false
      });
    } else if (kycStatus === 'REJECTED') {
      notifications.push({
        id: 'kyc-rejected',
        type: 'KYC_REJECTED',
        title: 'KYC Identity Review Action Required ⚠️',
        message: kyc.rejection_reason || 'Your KYC submission was rejected by compliance. Please re-upload clearer photos.',
        icon: 'fa-times-circle',
        color: 'text-rose-400',
        badge: 'REJECTED',
        time_ago: 'Recent',
        is_unread: true
      });
    } else if (kycStatus === 'PENDING') {
      notifications.push({
        id: 'kyc-pending',
        type: 'KYC_PENDING',
        title: 'KYC Documents Under Review ⏳',
        message: 'Your National ID documents and biometric selfie are currently being inspected by compliance.',
        icon: 'fa-hourglass-half',
        color: 'text-amber-400',
        badge: 'PENDING',
        time_ago: 'In Review',
        is_unread: false
      });
    }

    // 2. Check Recent Loan Applications
    const { data: loans } = await supabaseAdmin
      .from('money_requests')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (loans && loans.length > 0) {
      loans.forEach(loan => {
        const d = loan.disbursement || {};
        const method = d.payout_method || 'Cash';
        const trx = d.trx_id ? ` (TrxID: ${d.trx_id})` : '';

        if (loan.status === 'ACCEPTED') {
          notifications.push({
            id: 'loan-' + loan.id,
            type: 'LOAN_ACCEPTED',
            title: `Loan Approved & Disbursed: ৳${parseFloat(loan.amount).toLocaleString()} 💰`,
            message: `Disbursement completed via ${method}${trx}. Deadline: ${loan.deadline_date}.`,
            icon: 'fa-check-circle',
            color: 'text-emerald-400',
            badge: 'DISBURSED',
            time_ago: loan.created_at ? new Date(loan.created_at).toLocaleDateString() : 'Recent',
            is_unread: false
          });
        } else if (loan.status === 'DECLINED') {
          notifications.push({
            id: 'loan-' + loan.id,
            type: 'LOAN_DECLINED',
            title: `Loan Application Declined ❌`,
            message: `Your loan request for ৳${parseFloat(loan.amount).toLocaleString()} was declined.`,
            icon: 'fa-times-circle',
            color: 'text-rose-400',
            badge: 'DECLINED',
            time_ago: loan.created_at ? new Date(loan.created_at).toLocaleDateString() : 'Recent',
            is_unread: false
          });
        } else if (loan.status === 'PENDING') {
          notifications.push({
            id: 'loan-' + loan.id,
            type: 'LOAN_PENDING',
            title: `Loan Request Under Review 📝`,
            message: `Application for ৳${parseFloat(loan.amount).toLocaleString()} is in the executive disbursement queue.`,
            icon: 'fa-clock',
            color: 'text-amber-400',
            badge: 'PENDING',
            time_ago: loan.created_at ? new Date(loan.created_at).toLocaleDateString() : 'Recent',
            is_unread: false
          });
        }
      });
    }

    const unreadCount = notifications.filter(n => n.is_unread).length;
    res.json({
      success: true,
      count: notifications.length,
      unread_count: unreadCount,
      notifications
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Client Profiles ──────────────────────────────────────────────────────────
router.get('/clients', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('client_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, count: data.length, data });
});

// Lookup client profile by phone (for mobile app session)
router.get('/clients/lookup/phone', async (req, res) => {
  const phone = req.query.phone;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number parameter is required.' });
  }

  // Normalize phone to search
  const { filterList } = buildPhoneSearchFilter(phone);
  const { data, error } = await supabaseAdmin
    .from('client_profiles')
    .select(`
      *,
      money_requests (id, amount, deadline_date, status, admin_note, created_at)
    `)
    .or(filterList)
    .maybeSingle();

  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!data) return res.status(404).json({ success: false, message: 'No registered client found for this phone number.' });

  // Attach active limits
  const limits = loanSettings.getLimitsForClient(data.id);
  res.json({ success: true, client: data, limits });
});

router.get('/clients/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('client_profiles')
    .select(`
      *,
      money_requests (id, amount, deadline_date, status, admin_note, created_at)
    `)
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ success: false, message: 'Client not found.' });
  const limits = loanSettings.getLimitsForClient(data.id);
  res.json({ success: true, data, limits });
});

// Helper to parse disbursement metadata
function enrichLoans(loans) {
  return (loans || []).map(loan => {
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
}

// Get loan requests for single client
router.get('/clients/:id/loans', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('money_requests')
    .select('*')
    .eq('client_id', req.params.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, count: data.length, data: enrichLoans(data) });
});

// ─── Money Requests (Loans) ───────────────────────────────────────────────────
router.get('/loans', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('money_requests')
    .select(`
      *,
      client_profiles (id, name, phone_number, status, strikes_count)
    `)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, count: data.length, data: enrichLoans(data) });
});

// POST /api/loans — Submit loan application strictly validated by Admin Limits
router.post('/loans', async (req, res) => {
  const { client_id, amount, deadline_date, admin_note } = req.body;

  if (!client_id || !amount || !deadline_date) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: client_id, amount, deadline_date',
    });
  }

  // 1. Verify Client Profile & Status
  const { data: client, error: clientErr } = await supabaseAdmin
    .from('client_profiles')
    .select('id, name, phone_number, status, strikes_count')
    .eq('id', client_id)
    .single();

  if (clientErr || !client) {
    return res.status(404).json({
      success: false,
      message: 'Client profile not found. Please register via Telegram @money_loan_bot first.',
    });
  }

  if (client.status === 'BLOCKED') {
    return res.status(403).json({
      success: false,
      code: 'CLIENT_BLOCKED',
      message: 'Your account is BLOCKED due to excessive strikes or administrative lock. You cannot apply for loans.',
    });
  }

  // 2. KYC Verification Gatekeeper Check (Bypassed if authorized Admin is testing)
  const reqAdminKey = req.headers['x-admin-key'] || req.query.admin_key || req.body?.admin_key;
  const isAdmin = (reqAdminKey === (process.env.ADMIN_SECRET_KEY || 'SEP_ADMIN_2026'));

  if (!isAdmin && !kycManager.isClientKycVerified(client_id)) {
    return res.status(403).json({
      success: false,
      code: 'KYC_REQUIRED',
      message: 'Identity verification (KYC) is required before submitting money requests. Please complete your profile in Settings.',
    });
  }

  // 3. Strict Boundary Validation against Admin Configured Limits
  const validation = loanSettings.validateLoanRequest(client_id, amount, deadline_date);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      code: 'LIMIT_VIOLATION',
      message: validation.error,
      limits: validation.limits || loanSettings.getLimitsForClient(client_id),
    });
  }

  // 4. Create Loan Request in Supabase
  const formattedNote = admin_note
    ? (isAdmin ? `[Executive Admin Inspection Test]: ${admin_note}` : `[Client Note]: ${admin_note}`)
    : (isAdmin ? `[Executive Admin Inspection Test]` : null);

  const { data, error } = await supabaseAdmin
    .from('money_requests')
    .insert({
      client_id,
      amount: parseFloat(amount),
      deadline_date,
      admin_note: formattedNote,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  console.log(`[Loans] 💰 New loan submitted: ৳${amount} for ${client.name} (Due: ${deadline_date})`);

  res.status(201).json({
    success: true,
    message: 'Loan application submitted successfully and is pending administrator review.',
    data,
  });
});

router.patch('/loans/:id/status', async (req, res) => {
  const { status, admin_note } = req.body;
  const validStatuses = ['PENDING', 'ACCEPTED', 'DECLINED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('money_requests')
    .update({ status, admin_note })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// ─── System Budgets ───────────────────────────────────────────────────────────
router.get('/budgets', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('system_budgets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// ─── Client Authentication & Free Telegram OTP ───────────────────────────────

// POST /api/auth/request-otp — Send instant 6-digit OTP via Telegram @money_loan_bot
router.post('/auth/request-otp', async (req, res) => {
  const phone_number = req.body.phone_number || req.body.phone;
  if (!phone_number) {
    return res.status(400).json({ success: false, message: 'Phone number is required.' });
  }

  const { filterList } = buildPhoneSearchFilter(phone_number);

  // Find client
  const { data: client, error } = await supabaseAdmin
    .from('client_profiles')
    .select('*')
    .or(filterList)
    .maybeSingle();

  if (error || !client) {
    return res.status(404).json({
      success: false,
      message: 'No registered client found with this phone number. Please start @money_loan_bot on Telegram first to verify your account.',
      bot_url: 'https://t.me/money_loan_bot'
    });
  }

  // Generate 6-digit OTP
  const otpRes = otpManager.generateOtp(client.phone_number);
  if (!otpRes.success) {
    return res.status(429).json({ success: false, message: otpRes.error, waitSeconds: otpRes.waitSeconds });
  }

  // Extract Telegram Chat ID from profile admin_note
  let telegramChatId = null;
  const match = (client.admin_note || '').match(/Telegram ID:\s*(\d+)/i);
  if (match && match[1]) {
    telegramChatId = match[1];
  }

  let sentViaTelegram = false;
  if (telegramChatId) {
    sentViaTelegram = await sendTelegramOtp(telegramChatId, otpRes.code, 'SYM LOAN Portal Login');
  }

  return res.json({
    success: true,
    message: sentViaTelegram 
      ? 'A 6-digit OTP has been sent directly to your Telegram account.' 
      : 'A 6-digit OTP has been generated. (Open @money_loan_bot on Telegram)',
    sentViaTelegram,
    phone_number: client.phone_number,
    // Provide preview fallback if telegram messaging failed
    preview_code: !sentViaTelegram ? otpRes.code : undefined,
  });
});

// POST /api/auth/verify-otp — Validate OTP and establish client session
router.post('/auth/verify-otp', async (req, res) => {
  const phone_number = req.body.phone_number || req.body.phone;
  const { code } = req.body;
  if (!phone_number || !code) {
    return res.status(400).json({ success: false, message: 'Phone number and 6-digit OTP code are required.' });
  }

  const { cleanPhone, filterList } = buildPhoneSearchFilter(phone_number);

  // Fetch client first
  const { data: client, error } = await supabaseAdmin
    .from('client_profiles')
    .select('*')
    .or(filterList)
    .maybeSingle();

  if (error || !client) {
    return res.status(404).json({ success: false, message: 'Client profile not found.' });
  }

  // Verify against client.phone_number or cleanPhone
  let verifyRes = otpManager.verifyOtp(client.phone_number, code);
  if (!verifyRes.valid) {
    verifyRes = otpManager.verifyOtp(cleanPhone, code);
  }

  if (!verifyRes.valid) {
    return res.status(401).json({ success: false, message: verifyRes.message });
  }

  const limits = loanSettings.getLimitsForClient(client.id);

  return res.json({
    success: true,
    message: 'Login successful! Account verified.',
    client,
    limits,
  });
});

// ─── Client Profile Avatar Upload ─────────────────────────────────────────────
router.post('/clients/:id/avatar', uploadAvatar.single('avatar_image'), async (req, res) => {
  const clientId = req.params.id;
  let avatarUrl = null;

  if (req.file) {
    avatarUrl = `/uploads/avatars/${req.file.filename}`;
  } else if (req.body?.preset || req.body?.preset_url) {
    avatarUrl = req.body.preset || req.body.preset_url;
  }

  if (!avatarUrl) {
    return res.status(400).json({ success: false, message: 'No avatar image file or preset provided.' });
  }

  // Store avatar in nid_url (or avatar column)
  const { data: updated, error } = await supabaseAdmin
    .from('client_profiles')
    .update({ nid_url: avatarUrl })
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  return res.json({
    success: true,
    message: 'Profile picture updated successfully.',
    avatar_url: avatarUrl,
    client: updated,
  });
});

// ─── KYC & Identity Verification Endpoints ────────────────────────────────────

// GET /api/kyc/profile?clientId=...
router.get('/kyc/profile', async (req, res) => {
  const clientId = req.query.clientId || req.query.client_id;
  if (!clientId) {
    return res.status(400).json({ success: false, message: 'Client ID parameter is required.' });
  }
  const kyc = kycManager.getKycProfile(clientId);
  if (!kyc.phone) {
    try {
      const { data: client } = await supabaseAdmin
        .from('client_profiles')
        .select('phone_number, name')
        .eq('id', clientId)
        .maybeSingle();
      if (client && client.phone_number) {
        kyc.phone = client.phone_number;
        kycManager.saveKycDraft(clientId, { phone: client.phone_number });
      }
    } catch (e) {
      // ignore
    }
  }
  res.json({ success: true, kyc });
});

// POST /api/kyc/upload-nid — Smart NID Front & Back upload
router.post('/kyc/upload-nid', uploadKycDocs.fields([
  { name: 'nid_front', maxCount: 1 },
  { name: 'nid_back', maxCount: 1 },
]), async (req, res) => {
  const clientId = req.body?.client_id;
  if (!clientId) {
    return res.status(400).json({ success: false, message: 'client_id is required.' });
  }

  const updates = {};
  if (req.files?.nid_front?.[0]) {
    updates.nid_front_url = `/uploads/kyc/${req.files.nid_front[0].filename}`;
  }
  if (req.files?.nid_back?.[0]) {
    updates.nid_back_url = `/uploads/kyc/${req.files.nid_back[0].filename}`;
  }

  try {
    const kyc = kycManager.saveKycDraft(clientId, updates);
    res.json({
      success: true,
      message: 'NID documents uploaded successfully.',
      nid_front_url: updates.nid_front_url || kyc.nid_front_url,
      nid_back_url: updates.nid_back_url || kyc.nid_back_url,
      kyc,
    });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
});

// POST /api/kyc/upload-selfie — Live Camera Photo (One-click capture & save)
router.post('/kyc/upload-selfie', uploadKycDocs.single('live_selfie'), async (req, res) => {
  const clientId = req.body?.client_id;
  if (!clientId) {
    return res.status(400).json({ success: false, message: 'client_id is required.' });
  }

  let selfieUrl = null;
  if (req.file) {
    selfieUrl = `/uploads/kyc/${req.file.filename}`;
  } else if (req.body?.base64Image) {
    // Handle canvas base64 image capture
    const base64Data = req.body.base64Image.replace(/^data:image\/\w+;base64,/, '');
    const filename = `kyc-selfie-${clientId.slice(0, 8)}-${Date.now()}.jpg`;
    const filepath = path.join(__dirname, '../../public/uploads/kyc', filename);
    fs.writeFileSync(filepath, base64Data, 'base64');
    selfieUrl = `/uploads/kyc/${filename}`;
  }

  if (!selfieUrl) {
    return res.status(400).json({ success: false, message: 'Live photo data or image file is required.' });
  }

  try {
    const kyc = kycManager.saveKycDraft(clientId, { live_selfie_url: selfieUrl });
    res.json({
      success: true,
      message: 'Live photo captured and saved.',
      live_selfie_url: selfieUrl,
      kyc,
    });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
});

// POST /api/kyc/request-email-otp — Dispatch 6-digit OTP to client email
router.post('/kyc/request-email-otp', async (req, res) => {
  const { client_id, email } = req.body;
  if (!client_id || !email) {
    return res.status(400).json({ success: false, message: 'client_id and email are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const currentKyc = kycManager.getKycProfile(client_id);
  if (currentKyc.locked && currentKyc.status === 'VERIFIED') {
    return res.status(403).json({ success: false, message: 'Profile is already verified and locked.' });
  }

  const otpRes = otpManager.generateOtp(cleanEmail);
  if (!otpRes.success) {
    return res.status(429).json({ success: false, message: otpRes.error, waitSeconds: otpRes.waitSeconds });
  }

  const emailRes = await emailService.sendEmailOtp(cleanEmail, otpRes.code, 'KYC Email Verification');
  res.json({
    success: true,
    message: emailRes.message,
    previewCode: emailRes.previewCode,
    expires_in: 300,
  });
});

// POST /api/kyc/verify-email-otp — Validate OTP and confirm email verification
router.post('/kyc/verify-email-otp', async (req, res) => {
  const { client_id, email, code } = req.body;
  if (!client_id || !email || !code) {
    return res.status(400).json({ success: false, message: 'client_id, email, and 6-digit code are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const verifyRes = otpManager.verifyOtp(cleanEmail, code);
  if (!verifyRes.valid) {
    return res.status(401).json({ success: false, message: verifyRes.message });
  }

  try {
    const kyc = kycManager.saveKycDraft(client_id, { email: cleanEmail, email_verified: true });
    res.json({
      success: true,
      message: 'Email address verified successfully.',
      email_verified: true,
      kyc,
    });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
});

// POST /api/kyc/submit — Final submission (Locks all fields permanently)
router.post('/kyc/submit', async (req, res) => {
  const { client_id, full_name, dob, nid_number } = req.body;
  if (!client_id) {
    return res.status(400).json({ success: false, message: 'client_id is required.' });
  }

  try {
    const submitted = kycManager.submitKyc(client_id, {
      full_name,
      dob,
      nid_number,
    });
    res.json({
      success: true,
      message: 'KYC identity documents submitted successfully. Your profile is now locked and under review.',
      kyc: submitted,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;

