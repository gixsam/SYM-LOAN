'use strict';
/**
 * scripts/test_phase11.js
 * Automated Verification Suite for Phase 11:
 * Dynamic Credit Scoring Engine, VIP Loan Tiers & Anti-Fraud Device Fingerprinting
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');

const creditScoreEngine = require('../src/lib/creditScoreEngine');
const fraudDetectionEngine = require('../src/lib/fraudDetectionEngine');

const BASE_URL = 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'SEP_ADMIN_2026';
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

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

async function runPhase11Tests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Phase 11 Automated Verification Suite');
  console.log('======================================================\n');

  // ─── 1. Dynamic Credit Scoring Algorithm & Tier Matrix ────────────────────────
  console.log('--- Test Group 1: Credit Scoring Formula & VIP Tiers ---');
  try {
    // 1.1 Baseline Score Check
    const baseContext = {
      status: 'ACTIVE',
      strikes_count: 0,
      verified_repayments_count: 0,
      total_repaid_amount: 0,
      active_overdue_loans_count: 0,
      active_loans_count: 0,
      is_kyc_verified: false,
      is_email_verified: false,
      has_telegram_chat: false,
      account_age_days: 0,
    };
    const baseResult = creditScoreEngine.computeCreditTelemetry(baseContext);
    assert(baseResult.score === 550, `Baseline score for new borrower is 550 (got ${baseResult.score})`);
    assert(baseResult.grade === 'C', `Baseline grade is C (got ${baseResult.grade})`);
    assert(baseResult.vip_tier.id === 'BRONZE', `New borrower tier is BRONZE (got ${baseResult.vip_tier.id})`);
    assert(baseResult.vip_tier.max_limit === 10000, `Bronze tier max limit is ৳10,000 (got ${baseResult.vip_tier.max_limit})`);
    assert(baseResult.effective_service_fee_percent === 10, `Bronze tier service fee is 10% (got ${baseResult.effective_service_fee_percent})`);

    // 1.2 Repayment and Volume Scaling
    const primeContext = {
      ...baseContext,
      verified_repayments_count: 4, // +140 pts
      total_repaid_amount: 35000,    // +70 pts
      is_kyc_verified: true,         // +50 pts
      is_email_verified: true,       // +20 pts
      has_telegram_chat: true,       // +20 pts
      account_age_days: 100,         // +30 pts
    };
    const primeResult = creditScoreEngine.computeCreditTelemetry(primeContext);
    // 550 base + 140 (repayments) + 70 (volume) + 50 (kyc) + 20 (email) + 20 (tg) + 30 (age) + 20 (no debt) = 900 -> capped at 850
    assert(primeResult.score === 850, `Capped max FICO score is 850 (got ${primeResult.score})`);
    assert(primeResult.grade === 'A+', `Top tier grade is A+ (got ${primeResult.grade})`);
    assert(primeResult.vip_tier.id === 'GOLD', `4 repayments qualifies for GOLD tier (got ${primeResult.vip_tier.id})`);
    assert(primeResult.vip_tier.fee_discount_percent === 2, `Gold tier gives 2% fee discount (got ${primeResult.vip_tier.fee_discount_percent})`);
    assert(primeResult.vip_tier.effective_fee_percent === 8, `Gold tier effective fee is 8% (got ${primeResult.vip_tier.effective_fee_percent})`);

    // 1.3 High Delinquency & Strikes
    const badContext = {
      ...baseContext,
      strikes_count: 2,             // -150 pts
      active_overdue_loans_count: 1,// -60 pts
    };
    const badResult = creditScoreEngine.computeCreditTelemetry(badContext);
    // 550 - 150 - 60 = 340
    assert(badResult.score <= 360, `Delinquent score penalized appropriately (got ${badResult.score})`);
    assert(badResult.grade === 'F', `High strikes profile maps to Grade F (got ${badResult.grade})`);
    assert(badResult.eligible_credit_limit === 0, `Grade F borrower has ৳0 borrowing limit (got ${badResult.eligible_credit_limit})`);

    // 1.4 VIP Tiers Progression Thresholds
    assert(creditScoreEngine.VIP_TIERS.BRONZE.max_limit === 10000, 'Bronze tier ceiling is ৳10,000');
    assert(creditScoreEngine.VIP_TIERS.SILVER.max_limit === 25000, 'Silver tier ceiling is ৳25,000');
    assert(creditScoreEngine.VIP_TIERS.GOLD.max_limit === 50000, 'Gold tier ceiling is ৳50,000');
    assert(creditScoreEngine.VIP_TIERS.PLATINUM.max_limit === 75000, 'Platinum tier ceiling is ৳75,000');
    assert(creditScoreEngine.VIP_TIERS.DIAMOND.max_limit === 100000, 'Diamond tier ceiling is ৳100,000');
    assert(creditScoreEngine.VIP_TIERS.DIAMOND.fee_discount_percent === 5, 'Diamond tier offers 5% fee discount');
  } catch (err) {
    assert(false, `Test Group 1 Error: ${err.message}`);
  }

  // ─── 2. Administrative Credit Overrides ──────────────────────────────────────
  console.log('\n--- Test Group 2: Admin Credit Score Overrides ---');
  try {
    const testClientId = 'test_cl_phase11_override';
    
    // Set fixed grade and delta
    const override = creditScoreEngine.setAdminOverride(testClientId, {
      score_delta: 75,
      fixed_tier: 'PLATINUM',
      reason: 'Automated test override verification',
      admin_user: 'TestRunner'
    });
    assert(override && override.client_id === testClientId, 'setAdminOverride stores override configuration');

    const profileWithOverride = creditScoreEngine.computeCreditTelemetry({
      status: 'ACTIVE',
      strikes_count: 0,
      override
    });
    assert(profileWithOverride.vip_tier.id === 'PLATINUM', 'Fixed tier override successfully applies PLATINUM');
    assert(profileWithOverride.telemetry.has_admin_override === true, 'Profile telemetry flags admin override presence');

    // Remove override
    const removed = creditScoreEngine.removeAdminOverride(testClientId);
    assert(removed === true, 'removeAdminOverride cleans up override ledger');
  } catch (err) {
    assert(false, `Test Group 2 Error: ${err.message}`);
  }

  // ─── 3. Anti-Fraud & Device Fingerprinting Engine ───────────────────────────
  console.log('\n--- Test Group 3: Anti-Fraud Engine & Fingerprint Hashing ---');
  try {
    // 3.1 Fingerprint Hash Determinism
    const fp1 = {
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      screen_resolution: '390x844',
      timezone: 'Asia/Dhaka',
      language: 'en-US',
      platform: 'iPhone',
      hardware_concurrency: 6
    };
    const hash1 = fraudDetectionEngine.hashFingerprint(fp1);
    const hash2 = fraudDetectionEngine.hashFingerprint(fp1);
    assert(hash1 === hash2 && hash1.length >= 24, 'hashFingerprint produces deterministic fingerprint hash');

    // 3.2 IP Extraction
    const mockReq = {
      headers: { 'x-forwarded-for': '103.145.12.98, 127.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' }
    };
    const extractedIp = fraudDetectionEngine.extractClientIp(mockReq);
    assert(extractedIp === '103.145.12.98', 'extractClientIp correctly parses first client IP from x-forwarded-for');

    // 3.3 Headless Bot Detection
    const botReq = {
      headers: { 'user-agent': 'Mozilla/5.0 HeadlessChrome/120.0' },
      socket: { remoteAddress: '10.0.0.1' },
      body: {}
    };
    const botEval = fraudDetectionEngine.evaluateExpressRequest(botReq, {}, 'BOT_TEST');
    assert(botEval.reasons.some(r => r.includes('Headless Chrome')), 'Bot heuristics detect Headless Chrome User-Agent');
    assert(botEval.fraud_score >= 45, 'Headless bot incurs substantial fraud risk penalty');

    // 3.4 IP Blacklisting
    fraudDetectionEngine.addToBlacklist('203.0.113.55', 'IP', 'Test malicious proxy');
    assert(fraudDetectionEngine.isBlacklisted('203.0.113.55') === true, 'addToBlacklist successfully blacklists IP address');

    const blockedReq = {
      headers: { 'user-agent': 'Mozilla/5.0 (iPhone)' },
      socket: { remoteAddress: '203.0.113.55' },
      body: {}
    };
    const blockedEval = fraudDetectionEngine.evaluateExpressRequest(blockedReq, {}, 'LOAN_REQUEST');
    assert(blockedEval.status === 'BLOCKED' && blockedEval.fraud_score >= 85, 'Blacklisted IP request is immediately flagged as BLOCKED');

    // Remove from blacklist
    fraudDetectionEngine.removeFromBlacklist('203.0.113.55');
    assert(fraudDetectionEngine.isBlacklisted('203.0.113.55') === false, 'removeFromBlacklist restores IP status');
  } catch (err) {
    assert(false, `Test Group 3 Error: ${err.message}`);
  }

  // ─── 4. Live API Endpoints Verification ─────────────────────────────────────
  console.log('\n--- Test Group 4: Live HTTP API Endpoints ---');
  try {
    // 4.1 GET /api/admin/credit/matrix
    const matrixRes = await makeRequest('/api/admin/credit/matrix');
    assert(matrixRes.status === 200 && matrixRes.body.success, 'GET /api/admin/credit/matrix returns 200 OK');
    assert(matrixRes.body.matrix && typeof matrixRes.body.matrix.average_score === 'number', 'Credit matrix contains summary metrics');
    assert(Array.isArray(matrixRes.body.matrix.clients), 'Credit matrix contains clients roster');

    // 4.2 POST /api/admin/credit/override
    const setOverrideRes = await makeRequest('/api/admin/credit/override', { method: 'POST' }, {
      client_id: 'e84ecb25-5fa1-42fb-ab04-8e3c5112a69b',
      score_delta: 25,
      reason: 'Automated test API override'
    });
    assert(setOverrideRes.status === 200 && setOverrideRes.body.success, 'POST /api/admin/credit/override successfully applies adjustment');

    // 4.3 DELETE /api/admin/credit/override/:id
    const delOverrideRes = await makeRequest('/api/admin/credit/override/e84ecb25-5fa1-42fb-ab04-8e3c5112a69b', { method: 'DELETE' });
    assert(delOverrideRes.status === 200 && delOverrideRes.body.success, 'DELETE /api/admin/credit/override/:id removes override');

    // 4.4 GET /api/admin/fraud/alerts
    const fraudAlertsRes = await makeRequest('/api/admin/fraud/alerts');
    assert(fraudAlertsRes.status === 200 && fraudAlertsRes.body.success, 'GET /api/admin/fraud/alerts returns 200 OK');
    assert(Array.isArray(fraudAlertsRes.body.alerts), 'Fraud alerts endpoint returns alerts array');
    assert(fraudAlertsRes.body.stats && typeof fraudAlertsRes.body.stats.total_evaluations === 'number', 'Fraud alerts includes stats object');

    // 4.5 POST /api/telemetry/device
    const telemetryRes = await makeRequest('/api/telemetry/device', { method: 'POST' }, {
      screen_resolution: '414x896',
      timezone: 'Asia/Dhaka',
      language: 'en-BD',
      platform: 'iPhone',
      action_type: 'UNIT_TEST_PING'
    });
    assert(telemetryRes.status === 200 && telemetryRes.body.success, 'POST /api/telemetry/device registers browser footprint');
    assert(typeof telemetryRes.body.telemetry?.fraud_score === 'number', 'Device telemetry returns fraud score');

    // 4.6 GET /api/clients/:id/credit-profile (UUID check)
    const profileRes = await makeRequest('/api/clients/e84ecb25-5fa1-42fb-ab04-8e3c5112a69b/credit-profile');
    assert(profileRes.status === 200 && profileRes.body.success, 'GET /api/clients/:id/credit-profile returns 200 for valid UUID');
    assert(profileRes.body.profile && typeof profileRes.body.profile.score === 'number', 'Credit profile contains numerical score');
    assert(profileRes.body.profile.vip_tier && profileRes.body.profile.vip_tier.name !== undefined, 'Credit profile contains VIP tier name');

    // 4.7 Non-UUID or invalid client returns 404 cleanly
    const invalidIdRes = await makeRequest('/api/clients/non-existent-uuid/credit-profile');
    assert(invalidIdRes.status === 404 && invalidIdRes.body.success === false, 'Invalid client ID cleanly returns 404 without crashing');
  } catch (err) {
    assert(false, `Test Group 4 Error: ${err.message}`);
  }

  // ─── 5. Frontend UI Component Verification ──────────────────────────────────
  console.log('\n--- Test Group 5: Frontend UI & DOM Components ---');
  try {
    const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');
    const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');

    // Admin UI checks
    assert(adminHtml.includes('id="creditFraudDeskSection"'), 'public/admin.html contains #creditFraudDeskSection');
    assert(adminHtml.includes('id="tabCreditRosterBtn"') && adminHtml.includes('id="tabFraudRadarBtn"'), 'public/admin.html contains sub-tabs for Credit & Fraud');
    assert(adminHtml.includes('id="adminScoreOverrideModal"'), 'public/admin.html contains #adminScoreOverrideModal');
    assert(adminHtml.includes('id="adminFraudDossierModal"'), 'public/admin.html contains #adminFraudDossierModal');
    assert(adminHtml.includes('id="adminFraudBadge"'), 'public/admin.html contains live #adminFraudBadge');

    // Client UI checks
    assert(indexHtml.includes('id="clientCreditScoreCard"'), 'public/index.html contains #clientCreditScoreCard');
    assert(indexHtml.includes('id="clientScoreSvgRing"'), 'public/index.html contains radial SVG speedometer gauge');
    assert(indexHtml.includes('id="clientCreditScoreNum"'), 'public/index.html contains score number display');
    assert(indexHtml.includes('id="clientCreditGradePill"'), 'public/index.html contains grade pill');
    assert(indexHtml.includes('id="clientVipTierBadge"'), 'public/index.html contains VIP tier badge');
    assert(indexHtml.includes('id="clientNextTierProgressBar"'), 'public/index.html contains VIP tier progress bar');

    // JS Logic checks
    assert(adminJs.includes('fetchCreditMatrix') && adminJs.includes('fetchFraudAlerts'), 'public/js/admin.js implements matrix & fraud fetchers');
    assert(adminJs.includes('openCreditOverrideModal') && adminJs.includes('saveCreditOverride'), 'public/js/admin.js implements credit override handler');
    assert(adminJs.includes('openFraudDossierModal') && adminJs.includes('resolveFraudAlert'), 'public/js/admin.js implements fraud dossier & resolution handler');

    assert(appJs.includes('fetchClientCreditProfile') && appJs.includes('renderCreditScoreCard'), 'public/js/app.js implements client credit profile fetcher & renderer');
    assert(appJs.includes('collectAndSendDeviceTelemetry'), 'public/js/app.js implements browser device telemetry collector');
  } catch (err) {
    assert(false, `Test Group 5 Error: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log(`Phase 11 Verification Complete: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase11Tests();
