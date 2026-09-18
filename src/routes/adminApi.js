'use strict';
/**
 * src/routes/adminApi.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Executive Administration API
 *
 * Endpoints for managing:
 *   1. Global Loan Boundaries (Min/Max Amount, Start/Finish Duration Days)
 *   2. Client-Specific Custom Limits (tailored bounds per client)
 *   3. Loan Review & Decision Engine (Approve/Decline)
 *   4. Client Strike & Status Overrides
 */

const express = require('express');
const { supabaseAdmin } = require('../lib/supabase');
const loanSettings = require('../lib/loanSettings');

const router = express.Router();

// Admin Authentication Middleware
// Allows access via ADMIN_SECRET_KEY in header 'x-admin-key' or query parameter 'key'
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'SEP_ADMIN_2026';

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

// ─── Settings Endpoints ───────────────────────────────────────────────────────

// GET /api/admin/settings
router.get('/settings', requireAdmin, (req, res) => {
  const all = loanSettings.getAllSettings();
  res.json({ success: true, settings: all });
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

  // Verify client exists
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

    // Attach current active limits for each client
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

// ─── Loan Applications & Review ───────────────────────────────────────────────

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
    res.json({ success: true, count: loans.length, loans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/loans/:id/decision
router.post('/loans/:id/decision', requireAdmin, async (req, res) => {
  const { decision, admin_note } = req.body; // decision: 'ACCEPTED' | 'DECLINED'
  const validDecisions = ['ACCEPTED', 'DECLINED', 'PENDING'];

  if (!validDecisions.includes(decision)) {
    return res.status(400).json({
      success: false,
      message: `Invalid decision. Allowed values: ${validDecisions.join(', ')}`,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('money_requests')
    .update({
      status: decision,
      admin_note: admin_note || `Decision [${decision}] recorded by Admin at ${new Date().toISOString()}`,
    })
    .eq('id', req.params.id)
    .select(`
      *,
      client_profiles (id, name, phone_number)
    `)
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  res.json({
    success: true,
    message: `Loan request #${req.params.id.slice(0, 8)} marked as ${decision}.`,
    loan: data,
  });
});

module.exports = router;
