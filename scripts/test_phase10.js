'use strict';
/**
 * scripts/test_phase10.js
 * Automated Verification Suite for Phase 10:
 * Multi-Channel Automated Debt Collection, Strike Escalator & SMS/Telegram Reminder Engine
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');

const smsService = require('../src/lib/smsService');
const collectionEngine = require('../src/lib/collectionEngine');

const BASE_URL = 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'SEP_ADMIN_2026';
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function makeRequest(endpoint, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const headers = {
      'User-Agent': MOBILE_UA,
      'x-admin-key': ADMIN_KEY,
      ...options.headers,
    };

    if (postData && typeof postData === 'object') {
      postData = JSON.stringify(postData);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers,
      timeout: 8000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${endpoint} timed out.`));
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function runPhase10Tests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Phase 10 Automated Verification Suite');
  console.log('======================================================\n');

  // ─── 1. SMS Service & Templates Verification ────────────────────────────────
  console.log('--- Test Group 1: SMS Service & Reminder Templates ---');
  try {
    const dummyClient = { id: 'cl_test_001', name: 'Al-Amin Hossain', phone_number: '+8801700112233', strikes_count: 2 };
    const dummyLoan = { id: 'loan_test_001', amount: 8000, deadline_date: '2026-09-25' };

    const msg3d = smsService.buildReminderMessage('PRE_DUE_3D', dummyClient, dummyLoan);
    assert(msg3d.includes('due in 3 days') && msg3d.includes('8,000'), 'PRE_DUE_3D template generates friendly notice');

    const msg1d = smsService.buildReminderMessage('PRE_DUE_1D', dummyClient, dummyLoan);
    assert(msg1d.includes('TOMORROW') && msg1d.includes('Urgent Notice'), 'PRE_DUE_1D template generates urgent alert');

    const msgDue = smsService.buildReminderMessage('DUE_TODAY', dummyClient, dummyLoan);
    assert(msgDue.includes('FINAL CALL') && msgDue.includes('DUE TODAY'), 'DUE_TODAY template generates final call');

    const msgStrike = smsService.buildReminderMessage('OVERDUE_STRIKE', dummyClient, dummyLoan);
    assert(msgStrike.includes('OVERDUE ALERT') && msgStrike.includes('Strike #2'), 'OVERDUE_STRIKE template includes active strike count');

    const msgCustom = smsService.buildReminderMessage('CUSTOM', dummyClient, dummyLoan, 'Special Admin Instructions');
    assert(msgCustom === 'Special Admin Instructions', 'Custom template override takes exact admin text');

    // Test sendSms simulation
    const smsRes = await smsService.sendSms('+8801700112233', 'Test automated SMS');
    assert(smsRes.success && (smsRes.status === 'DELIVERED' || smsRes.status === 'SIMULATED_DELIVERED'), 'sendSms delivers successfully via live or simulated carrier');

    // Test dispatchReminder logging
    const dispatchRes = await smsService.dispatchReminder({
      channel: 'SMS',
      client: dummyClient,
      loan: dummyLoan,
      templateType: 'PRE_DUE_3D',
      trigger: 'AUTOMATED_CRON',
    });
    assert(dispatchRes.success && dispatchRes.record?.id?.startsWith('rem_'), 'dispatchReminder logs record to data/reminders.json');

    // Test idempotency check (hasBeenRemindedToday)
    const alreadyReminded = smsService.hasBeenRemindedToday(dummyClient.id, dummyLoan.id, 'PRE_DUE_3D');
    assert(alreadyReminded === true, 'hasBeenRemindedToday correctly detects logged reminder today to prevent spam');
  } catch (err) {
    assert(false, `Test Group 1 Error: ${err.message}`);
  }

  // ─── 2. Collection Engine Matrix & Logic ────────────────────────────────────
  console.log('\n--- Test Group 2: Collection Engine Logic & Matrix ---');
  try {
    const today = new Date().toISOString().split('T')[0];
    const pastDate = '2026-08-01';
    const futureDate = '2026-10-01';

    assert(collectionEngine.getDaysDiffFromToday(today) === 0, 'getDaysDiffFromToday(today) returns 0 for due today');
    assert(collectionEngine.getDaysDiffFromToday(pastDate) < 0, 'getDaysDiffFromToday(pastDate) returns negative for overdue');
    assert(collectionEngine.getDaysDiffFromToday(futureDate) > 0, 'getDaysDiffFromToday(futureDate) returns positive for upcoming');

    const matrix = await collectionEngine.getCollectionsMatrix();
    assert(matrix && typeof matrix === 'object', 'getCollectionsMatrix returns structured object');
    assert(matrix.summary && typeof matrix.summary.total_active_loans === 'number', 'Matrix contains summary metrics with total_active_loans');
    assert(Array.isArray(matrix.items), 'Matrix contains items array of active debtors');
  } catch (err) {
    assert(false, `Test Group 2 Error: ${err.message}`);
  }

  // ─── 3. Admin API Collection Endpoints ──────────────────────────────────────
  console.log('\n--- Test Group 3: Admin API Collection Endpoints ---');
  try {
    // GET /api/admin/collections/matrix
    const matrixRes = await makeRequest('/api/admin/collections/matrix');
    assert(matrixRes.status === 200 && matrixRes.body.success, 'GET /api/admin/collections/matrix returns 200 OK');
    assert(matrixRes.body.data?.summary !== undefined, 'Matrix API returns summary object');

    // POST /api/admin/collections/remind
    const remindRes = await makeRequest('/api/admin/collections/remind', { method: 'POST' }, {
      client_id: 'cl_demo_test',
      channel: 'SMS',
      template_type: 'MANUAL_DUNNING',
      custom_text: 'Phase 10 Automated Dunning Test',
    });
    assert(remindRes.status === 200 && remindRes.body.success, 'POST /api/admin/collections/remind dispatches reminder');

    // GET /api/admin/collections/logs
    const logsRes = await makeRequest('/api/admin/collections/logs?limit=10');
    assert(logsRes.status === 200 && logsRes.body.success, 'GET /api/admin/collections/logs returns 200 OK');
    assert(Array.isArray(logsRes.body.logs) && logsRes.body.logs.length > 0, 'Logs endpoint returns array of dispatched reminders');
    assert(logsRes.body.stats && typeof logsRes.body.stats.dispatched_today === 'number', 'Logs endpoint includes stats with dispatched_today');

    // POST /api/admin/collections/run-cycle (dry-run or safe live run)
    const runCycleRes = await makeRequest('/api/admin/collections/run-cycle', { method: 'POST' }, {
      dryRun: true,
    });
    assert(runCycleRes.status === 200 && runCycleRes.body.success, 'POST /api/admin/collections/run-cycle executes cycle');
    assert(runCycleRes.body.report && typeof runCycleRes.body.report.total_active_loans === 'number', 'Run-cycle returns complete audit report');
  } catch (err) {
    assert(false, `Test Group 3 Error: ${err.message}`);
  }

  // ─── 4. Client Standing API Endpoint ────────────────────────────────────────
  console.log('\n--- Test Group 4: Client Standing & Debt Notice API ---');
  try {
    // Test with mock/existing client ID
    const standingRes = await makeRequest('/api/clients/mock-client-id/standing');
    // If not found in Supabase, returns 404 cleanly; if found, 200
    if (standingRes.status === 200) {
      assert(standingRes.body.success && standingRes.body.standing !== undefined, 'GET /api/clients/:id/standing returns 200 with standing payload');
      assert(typeof standingRes.body.standing.strikes_count === 'number', 'Standing includes strikes_count number');
      assert(standingRes.body.standing.standing_label !== undefined, 'Standing includes standing_label');
    } else {
      assert(standingRes.status === 404 && standingRes.body.success === false, 'GET /api/clients/:id/standing gracefully returns 404 for non-existent client');
    }
  } catch (err) {
    assert(false, `Test Group 4 Error: ${err.message}`);
  }

  // ─── 5. UI Architecture & Template Verification ─────────────────────────────
  console.log('\n--- Test Group 5: Frontend UI & DOM Components ---');
  try {
    const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');
    const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

    assert(adminHtml.includes('id="debtCollectionSection"'), 'public/admin.html contains #debtCollectionSection');
    assert(adminHtml.includes('id="btnRunCollectionCycle"'), 'public/admin.html contains #btnRunCollectionCycle action button');
    assert(adminHtml.includes('id="adminManualReminderModal"'), 'public/admin.html contains #adminManualReminderModal');
    assert(adminHtml.includes('id="collectionOverdueDrawerBadge"'), 'public/admin.html drawer contains overdue badge');

    assert(indexHtml.includes('id="clientOverdueAlertBanner"'), 'public/index.html contains #clientOverdueAlertBanner');
    assert(indexHtml.includes('id="btnBannerSettleLoan"'), 'public/index.html contains 1-click settlement button');

    assert(adminJs.includes('fetchCollectionsMatrix') && adminJs.includes('runCollectionCycleNow'), 'public/js/admin.js exports collection matrix & run-cycle functions');
    assert(adminJs.includes('openManualReminderModal') && adminJs.includes('sendManualReminder'), 'public/js/admin.js exports manual reminder modal functions');

    assert(appJs.includes('fetchClientStanding') && appJs.includes('renderStandingAndOverdueAlert'), 'public/js/app.js implements client standing & overdue alert rendering');
  } catch (err) {
    assert(false, `Test Group 5 Error: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log(`Phase 10 Verification Complete: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10Tests();
