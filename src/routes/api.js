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
const { supabaseAdmin } = require('../lib/supabase');
const loanSettings  = require('../lib/loanSettings');
const { runDeadlineStrikeCheck } = require('../cron/deadlineStrikeEngine');

const router = express.Router();

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
// Returns dynamic Min/Max amounts and Min/Max allowed deadline dates
router.get('/config/limits', (req, res) => {
  const clientId = req.query.client_id;
  const limits = loanSettings.getLimitsForClient(clientId);
  res.json({
    success: true,
    limits,
  });
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
  const cleanPhone = phone.trim();
  const { data, error } = await supabaseAdmin
    .from('client_profiles')
    .select(`
      *,
      money_requests (id, amount, deadline_date, status, admin_note, created_at)
    `)
    .or(`phone_number.eq.${cleanPhone},phone_number.eq.+${cleanPhone.replace(/^\+/, '')}`)
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

// Get loan requests for single client
router.get('/clients/:id/loans', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('money_requests')
    .select('*')
    .eq('client_id', req.params.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, count: data.length, data });
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
  res.json({ success: true, count: data.length, data });
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

  // 2. Strict Boundary Validation against Admin Configured Limits
  const validation = loanSettings.validateLoanRequest(client_id, amount, deadline_date);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      code: 'LIMIT_VIOLATION',
      message: validation.error,
      limits: validation.limits || loanSettings.getLimitsForClient(client_id),
    });
  }

  // 3. Create Loan Request in Supabase
  const { data, error } = await supabaseAdmin
    .from('money_requests')
    .insert({
      client_id,
      amount: parseFloat(amount),
      deadline_date,
      admin_note: admin_note ? `[Client Note]: ${admin_note}` : null,
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

// ─── Manual Cron Trigger (Admin) ──────────────────────────────────────────────
router.post('/cron/trigger', async (req, res) => {
  console.log('[API] Manual strike engine trigger requested.');
  res.json({ success: true, message: 'Strike engine triggered. Check server logs for results.' });
  runDeadlineStrikeCheck();
});

module.exports = router;
