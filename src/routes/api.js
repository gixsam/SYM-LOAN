'use strict';
/**
 * src/routes/api.js
 * SYM EMPIRE PLATFORM (S.E.P.) — REST API Routes
 *
 * All routes under /api require:
 *   - Mobile device (verifyMobileDeviceOnly middleware on parent router)
 *
 * Endpoints:
 *   GET  /api/health              → System health check
 *   GET  /api/clients             → List all client profiles (admin)
 *   GET  /api/clients/:id         → Get single client profile
 *   GET  /api/loans               → List all money requests (admin)
 *   POST /api/loans               → Create a loan request
 *   PATCH /api/loans/:id/status   → Update loan request status (admin)
 *   GET  /api/budgets             → Get system budgets
 *   POST /api/cron/trigger        → Manually trigger strike engine (admin)
 */

const express       = require('express');
const { supabaseAdmin } = require('../lib/supabase');
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

// ─── Client Profiles ──────────────────────────────────────────────────────────
router.get('/clients', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('client_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, count: data.length, data });
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
  res.json({ success: true, data });
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

router.post('/loans', async (req, res) => {
  const { client_id, amount, deadline_date, admin_note } = req.body;

  if (!client_id || !amount || !deadline_date) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: client_id, amount, deadline_date',
    });
  }

  const { data, error } = await supabaseAdmin
    .from('money_requests')
    .insert({ client_id, amount, deadline_date, admin_note, status: 'PENDING' })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.status(201).json({ success: true, data });
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
  // Run async after response is sent
  runDeadlineStrikeCheck();
});

module.exports = router;
