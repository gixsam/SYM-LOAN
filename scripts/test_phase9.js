'use strict';
/**
 * scripts/test_phase9.js
 * Comprehensive automated test suite for Phase 9:
 * Automated Client Repayment Gateway, Admin Settlement Desk & Digital Clearance Certificate Engine
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const ADMIN_KEY = 'SEP_ADMIN_2026';

function request(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        'x-admin-key': ADMIN_KEY,
        ...headers,
      },
    };

    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

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

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Phase 9 Automated Verification Suite');
  console.log('======================================================\n');

  // Test 1: System Health
  console.log('--- Test 1: Backend System Health ---');
  const healthRes = await request('GET', '/api/health');
  assert(healthRes.status === 200 && healthRes.json?.status === 'ONLINE', 'Backend /api/health responds with ONLINE');

  // Test 2: Repayment Submission Validation (Missing Fields)
  console.log('\n--- Test 2: Repayment Validation ---');
  const invalidRes = await request('POST', '/api/repayments', {}, { loan_id: '' });
  assert(invalidRes.status === 400 && invalidRes.json?.success === false, 'POST /api/repayments rejects empty loan_id with 400');

  // Test 3: Successful Client Repayment Submission
  console.log('\n--- Test 3: Valid Repayment Submission ---');
  const testLoanId = `test_loan_${Date.now()}`;
  const testClientId = `test_client_${Date.now()}`;
  const testTrxId = `TRX${Date.now().toString(36).toUpperCase()}`;

  const submitRes = await request('POST', '/api/repayments', {}, {
    loan_id: testLoanId,
    client_id: testClientId,
    client_name: 'Tanvir Hossain',
    client_phone: '+8801711223344',
    loan_amount: 5000,
    amount_paid: 5000,
    payout_method: 'bKash',
    sender_number: '01711223344',
    trx_id: testTrxId,
    client_note: 'Repaying in full via bKash personal send money'
  });

  assert(submitRes.status === 201 && submitRes.json?.success === true, 'POST /api/repayments creates repayment with 201 Created');
  const createdRep = submitRes.json?.repayment;
  assert(createdRep && createdRep.status === 'PENDING_REVIEW', 'New repayment has status PENDING_REVIEW');
  assert(createdRep && createdRep.trx_id === testTrxId, 'Repayment correctly preserves TrxID');

  // Test 4: Duplicate TrxID Prevention
  console.log('\n--- Test 4: Duplicate TrxID Prevention ---');
  const dupRes = await request('POST', '/api/repayments', {}, {
    loan_id: `other_loan_${Date.now()}`,
    client_id: testClientId,
    amount_paid: 5000,
    payout_method: 'bKash',
    trx_id: testTrxId,
  });
  assert(dupRes.status === 400 && dupRes.json?.success === false, 'POST /api/repayments blocks duplicate TrxID');

  // Test 5: Client Repayments History Lookup
  console.log('\n--- Test 5: Client Repayments History Lookup ---');
  const clientRepsRes = await request('GET', `/api/clients/${testClientId}/repayments`);
  assert(clientRepsRes.status === 200 && clientRepsRes.json?.success === true, 'GET /api/clients/:id/repayments succeeds');
  assert(clientRepsRes.json?.count >= 1, 'Client has at least 1 repayment record');

  // Test 6: Single Repayment Lookup by ID
  console.log('\n--- Test 6: Single Repayment Lookup by ID ---');
  const singleRepRes = await request('GET', `/api/repayments/${createdRep.id}`);
  assert(singleRepRes.status === 200 && singleRepRes.json?.repayment?.id === createdRep.id, 'GET /api/repayments/:id returns repayment');

  // Test 7: Admin Repayments Desk List & Stats
  console.log('\n--- Test 7: Admin Repayments Desk & Stats ---');
  const adminRepsRes = await request('GET', '/api/admin/repayments', { 'x-admin-key': ADMIN_KEY });
  assert(adminRepsRes.status === 200 && adminRepsRes.json?.success === true, 'GET /api/admin/repayments authorized with admin key');
  assert(Array.isArray(adminRepsRes.json?.data), 'Returns data array of repayments');
  assert(adminRepsRes.json?.stats && typeof adminRepsRes.json?.stats?.pending === 'number', 'Returns aggregated reconciliation stats');

  // Test 8: Admin Notifications Integration
  console.log('\n--- Test 8: Admin Notifications Integration ---');
  const notifRes = await request('GET', '/api/admin/notifications', { 'x-admin-key': ADMIN_KEY });
  assert(notifRes.status === 200 && notifRes.json?.success === true, 'GET /api/admin/notifications responds');
  assert(Array.isArray(notifRes.json?.pending_repayments), 'Notifications include pending_repayments array');
  const hasOurRep = notifRes.json?.pending_repayments.some(r => r.id === createdRep.id);
  assert(hasOurRep, 'Our pending repayment appears in admin notification queue');

  // Test 9: Admin Verification & Settlement (Phase 9 Core)
  console.log('\n--- Test 9: Admin Repayment Approval & Debt Clearance ---');
  const approveRes = await request('POST', `/api/admin/repayments/${createdRep.id}/approve`, { 'x-admin-key': ADMIN_KEY }, {
    admin_note: 'Verified with bank statement'
  });
  assert(approveRes.status === 200 && approveRes.json?.success === true, 'POST /api/admin/repayments/:id/approve succeeds');
  assert(approveRes.json?.repayment?.status === 'VERIFIED', 'Repayment status becomes VERIFIED');
  assert(approveRes.json?.clearance_hash && approveRes.json?.clearance_hash.startsWith('SYM-CLR-'), 'Issues cryptographic clearance hash');

  // Test 10: Idempotency of Approval
  console.log('\n--- Test 10: Approval Idempotency ---');
  const reApproveRes = await request('POST', `/api/admin/repayments/${createdRep.id}/approve`, { 'x-admin-key': ADMIN_KEY });
  assert(reApproveRes.status === 200 && reApproveRes.json?.repayment?.status === 'VERIFIED', 'Re-approving already settled repayment is safe');

  // Test 11: Repayment Rejection Flow
  console.log('\n--- Test 11: Repayment Rejection Flow ---');
  const rejectTestTrx = `TRX_REJ_${Date.now().toString(36).toUpperCase()}`;
  const sub2 = await request('POST', '/api/repayments', {}, {
    loan_id: `loan_rej_${Date.now()}`,
    client_id: testClientId,
    amount_paid: 2000,
    payout_method: 'Nagad',
    sender_number: '01611223344',
    trx_id: rejectTestTrx,
  });
  const rep2 = sub2.json?.repayment;

  const rejectRes = await request('POST', `/api/admin/repayments/${rep2.id}/reject`, { 'x-admin-key': ADMIN_KEY }, {
    reason: 'TrxID does not exist on Nagad network'
  });
  assert(rejectRes.status === 200 && rejectRes.json?.repayment?.status === 'REJECTED', 'POST /api/admin/repayments/:id/reject sets status REJECTED');
  assert(rejectRes.json?.repayment?.admin_note === 'TrxID does not exist on Nagad network', 'Rejection reason is stored for client display');

  // Test 12: Client Notifications Integration
  console.log('\n--- Test 12: Client Notifications Integration ---');
  const clientNotifsRes = await request('GET', `/api/client/notifications?client_id=${testClientId}`);
  assert(clientNotifsRes.status === 200, 'GET /api/client/notifications responds');
  const hasVerifiedNotif = clientNotifsRes.json?.notifications?.some(n => n.type === 'REPAYMENT_VERIFIED');
  assert(hasVerifiedNotif, 'Client notifications list includes REPAYMENT_VERIFIED alert');

  // Test 13: Digital Clearance Certificate & Voucher Integrity
  console.log('\n--- Test 13: Digital Clearance Certificate Generator in voucher.js ---');
  const voucherJs = fs.readFileSync(path.join(__dirname, '../public/js/voucher.js'), 'utf8');
  assert(voucherJs.includes('window.generateClearanceCertificatePdf'), 'public/js/voucher.js exports generateClearanceCertificatePdf');
  assert(voucherJs.includes('CERTIFICATE OF ABSOLUTE DISCHARGE AND RELEASE OF LIABILITY'), 'Clearance certificate contains zero-liability legal discharge');
  assert(voucherJs.includes('doc.save'), 'Clearance certificate triggers PDF vector download');

  // Summary
  console.log('\n======================================================');
  console.log(`Phase 9 Verification Complete: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
