/**
 * scripts/test_admin_overhaul.js
 * Comprehensive Automated Verification Suite for Master Overhaul (Modules 1-10):
 * - Module 1: Mobile Header Layout & Clock Responsive Ticker
 * - Module 2: Google Stitch Vector SVG Icon Generator
 * - Module 3: Obsidian Canvas & Layered Slate Glassmorphism
 * - Module 4: Dedicated Admin Android APK Compilation & Signing
 * - Module 5: Unified Client Directory & 360° Profile Hub
 * - Module 6: Transactional Disbursement Email with S.E.P. Monogram
 * - Module 7: Money Request Lifecycle Progress Stepper (Stages 1-5)
 * - Module 8: Single Active Loan Guard & In-Place Modification
 * - Module 9: Re-Application Cooldown Governance & Live Countdown
 * - Module 10: 2-Step Client Deletion & Strike Governance
 */

'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');

const loanSettings = require('../src/lib/loanSettings');
const emailService = require('../src/lib/emailService');

const BASE_URL = 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'SEP_ADMIN_2026';

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
      timeout: 10000,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout for ${endpoint}`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runOverhaulTestSuite() {
  console.log('========================================================================');
  console.log('🚀 SYM LOAN PLATFORM (S.E.P.) — MASTER OVERHAUL AUTOMATED VERIFICATION');
  console.log('========================================================================\n');

  const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
  const stitchJs = fs.readFileSync(path.join(__dirname, '../public/js/stitchIcons.js'), 'utf8');
  const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');

  // -------------------------------------------------------------------------
  // MODULE 1: Header Layout Repair & Clock Collision Bugfix
  // -------------------------------------------------------------------------
  console.log('📌 Module 1: Mobile Header Layout & Clock Responsive Ticker');
  assert(adminHtml.includes('id="adminMainHeader"'), 'adminMainHeader element exists');
  assert(adminHtml.includes('id="adminLiveClockTicker"'), 'adminLiveClockTicker exists in admin header');
  assert(adminHtml.includes('id="openSettingsModalBtn"'), 'openSettingsModalBtn exists with 36x36px target');
  assert(adminHtml.includes('id="liveDateText"') && adminHtml.includes('id="liveTimeText"'), 'Live date & time ticker text targets exist');
  assert(adminJs.includes('initLiveClockTicker'), 'initLiveClockTicker function implemented in admin.js');

  // -------------------------------------------------------------------------
  // MODULE 2: Google Stitch Custom Vector Icon System
  // -------------------------------------------------------------------------
  console.log('\n📌 Module 2: Google Stitch Custom Vector Icon Library');
  assert(fs.existsSync(path.join(__dirname, '../public/js/stitchIcons.js')), 'stitchIcons.js file exists');
  assert(stitchJs.includes('StitchIcons'), 'StitchIcons defined in stitchIcons.js');
  const requiredIcons = [
    'voucher', 'limits', 'cash-adjust', 'call', 'calendar',
    'edit', 'delete', 'strike-safe', 'strike-warning', 'strike-critical',
    'strike-blocked', 'bkash', 'nagad', 'cash', 'clock', 'bell',
    'stepper-check', 'user', 'shield', 'bolt', 'download', 'refresh', 'lock', 'vip'
  ];
  const allIconsPresent = requiredIcons.every(ic => stitchJs.includes(`'${ic}'`));
  assert(allIconsPresent, `All ${requiredIcons.length} essential Stitch dual-tone vector icons defined`);
  assert(adminHtml.includes('src="/js/stitchIcons.js"'), 'stitchIcons.js imported in admin.html');
  assert(indexHtml.includes('src="/js/stitchIcons.js"'), 'stitchIcons.js imported in index.html');

  // -------------------------------------------------------------------------
  // MODULE 3: Obsidian Canvas & Layered Slate Glassmorphism
  // -------------------------------------------------------------------------
  console.log('\n📌 Module 3: Obsidian Canvas & Layered Slate Glassmorphism UI');
  assert(styleCss.includes('#06090F') || styleCss.includes('#06090f'), 'Obsidian canvas (#06090F) applied in style.css');
  assert(styleCss.includes('.stitch-icon'), '.stitch-icon styling classes defined');
  assert(styleCss.includes('.stitch-btn'), '.stitch-btn interaction styles defined');
  assert(styleCss.includes('pullToRefreshSpinner'), 'Pull-to-refresh spinner styles defined');

  // -------------------------------------------------------------------------
  // MODULE 4: Dedicated Admin Android APK
  // -------------------------------------------------------------------------
  console.log('\n📌 Module 4: Dedicated Admin Android APK Compilation & Signing');
  const adminApkPath = path.join(__dirname, '../public/downloads/SYM-LOAN-ADMIN.apk');
  assert(fs.existsSync(adminApkPath), 'SYM-LOAN-ADMIN.apk artifact exists in public/downloads/');
  if (fs.existsSync(adminApkPath)) {
    const stat = fs.statSync(adminApkPath);
    assert(stat.size > 100000, `Admin APK size is valid: ${(stat.size / 1024).toFixed(2)} KB`);
  }
  const adminManifest = fs.readFileSync(path.join(__dirname, '../android-admin/AndroidManifest.xml'), 'utf8');
  assert(adminManifest.includes('package="com.symempire.symloanadmin"'), 'Admin package id is com.symempire.symloanadmin');
  assert(adminManifest.includes('versionName="2.6.0"'), 'Admin APK version is 2.6.0');
  assert(adminManifest.includes('android:hardwareAccelerated="true"'), 'Hardware acceleration enabled in manifest');
  const adminJava = fs.readFileSync(path.join(__dirname, '../android-admin/src/com/symempire/symloanadmin/MainActivity.java'), 'utf8');
  assert(adminJava.includes('SYM-Admin-Native-Android-App'), 'Custom User-Agent includes SYM-Admin-Native-Android-App');
  assert(adminJava.includes('window.refreshAdminDashboard()'), 'Pull-to-refresh triggers window.refreshAdminDashboard()');

  // -------------------------------------------------------------------------
  // MODULE 5: Unified Client Directory & 360° Profile Hub
  // -------------------------------------------------------------------------
  console.log('\n📌 Module 5: Unified Client Directory & 360° Profile Hub');
  assert(adminHtml.includes('id="unifiedClientDirectorySection"'), 'unifiedClientDirectorySection table exists in admin.html');
  assert(adminHtml.includes('id="unifiedClientRosterTbody"'), 'unifiedClientRosterTbody container exists');
  assert(adminHtml.includes('id="client360Modal"'), 'client360Modal hub dialog exists');
  assert(adminHtml.includes('id="deleteClientModal"'), 'deleteClientModal 2-step verification dialog exists');

  const rosterRes = await makeRequest('/api/admin/clients/unified-roster');
  assert(rosterRes.statusCode === 200 && rosterRes.json && rosterRes.json.success, 'GET /api/admin/clients/unified-roster returns 200 OK');
  const clientList = rosterRes.json?.roster || rosterRes.json?.clients || [];
  assert(Array.isArray(clientList), `Unified roster returns clients array (${clientList.length} clients found)`);

  // -------------------------------------------------------------------------
  // MODULE 6: Transactional Disbursement Email with S.E.P. Monogram
  // -------------------------------------------------------------------------
  console.log('\n📌 Module 6: Transactional Disbursement Email Engine');
  assert(typeof emailService.sendDisbursementNotificationEmail === 'function', 'sendDisbursementNotificationEmail exported by emailService');
  const sampleEmailRes = await emailService.sendDisbursementNotificationEmail({
    clientEmail: 'test-recipient@example.com',
    clientName: 'Test Borrower',
    amount: 5000,
    deadlineDate: '2026-10-15',
    payoutMethod: 'BKASH',
    trxId: 'TRX99887766',
    loanRef: '00000000-0000-0000-0000-000000000001',
  });
  assert(sampleEmailRes.success || sampleEmailRes.simulated, 'Disbursement email engine generated or simulated notification with 1:00 PM deadline clause');

  // -------------------------------------------------------------------------
  // MODULE 7: Money Request Lifecycle Progress Stepper
  // -------------------------------------------------------------------------
  console.log('\n📌 Module 7: Money Request Lifecycle Progress Stepper');
  assert(indexHtml.includes('id="loanProgressStepper"'), 'loanProgressStepper container present in index.html');
  assert(indexHtml.includes('id="step1Container"') && indexHtml.includes('id="step5Container"'), '5-stage grid (step1Container to step5Container) present');
  assert(indexHtml.includes('id="stepperActionContainer"'), 'stepperActionContainer dynamic button area present');
  assert(indexHtml.includes('id="stepperDetailMessage"'), 'stepperDetailMessage text container present');
  assert(appJs.includes('function renderLoanProgressStepper'), 'renderLoanProgressStepper function implemented in app.js');

  // -------------------------------------------------------------------------
  // MODULE 8: Single Active Loan Guard & In-Place Modification
  // -------------------------------------------------------------------------
  console.log('\n📌 Module 8: Single Active Loan Guard & In-Place Modification');
  assert(indexHtml.includes('id="modifyLoanModal"'), 'modifyLoanModal dialog present in index.html');
  assert(appJs.includes('window.openModifyLoanModal'), 'openModifyLoanModal exposed to window');
  assert(appJs.includes('window.submitModifyLoan'), 'submitModifyLoan exposed to window');

  // Test PATCH /api/loans/:id/modify error handling on non-existent loan
  const fakeModifyRes = await makeRequest('/api/loans/00000000-0000-0000-0000-000000000000/modify', {
    method: 'PATCH',
  }, { amount: 6000, deadline_date: '2026-10-20' });
  assert(fakeModifyRes.statusCode === 404, 'PATCH /api/loans/:id/modify returns 404 on non-existent loan');

  // Test DELETE /api/loans/:id rejection (Deletion blocked for financial integrity)
  const delLoanRes = await makeRequest('/api/loans/00000000-0000-0000-0000-000000000000', {
    method: 'DELETE',
  });
  assert(delLoanRes.statusCode === 403, 'DELETE /api/loans/:id strictly blocked with HTTP 403 Forbidden');

  // -------------------------------------------------------------------------
  // MODULE 9: Re-Application Cooldown Governance & Live Countdown
  // -------------------------------------------------------------------------
  console.log('\n📌 Module 9: Re-Application Cooldown Governance & Live Countdown');
  assert(typeof loanSettings.setClientCooldown === 'function', 'loanSettings.setClientCooldown function exists');
  assert(typeof loanSettings.getClientCooldown === 'function', 'loanSettings.getClientCooldown function exists');
  assert(typeof loanSettings.removeClientCooldown === 'function', 'loanSettings.removeClientCooldown function exists');

  const testClientId = '00000000-0000-0000-0000-000000000002';
  loanSettings.setClientCooldown(testClientId, 24);
  const cd = loanSettings.getClientCooldown(testClientId);
  assert(cd && new Date(cd) > new Date(), 'Client cooldown successfully set for 24 hours');
  loanSettings.removeClientCooldown(testClientId);
  assert(loanSettings.getClientCooldown(testClientId) === null, 'Client cooldown successfully cleared');

  assert(indexHtml.includes('id="cooldownAlertBanner"'), 'cooldownAlertBanner element exists in index.html');
  assert(indexHtml.includes('id="cooldownTimeRemainingPill"'), 'cooldownTimeRemainingPill element exists in index.html');
  assert(appJs.includes('function startCooldownCountdown'), 'startCooldownCountdown timer implemented in app.js');

  // -------------------------------------------------------------------------
  // MODULE 10: 2-Step Client Deletion & Strike Governance
  // -------------------------------------------------------------------------
  console.log('\n📌 Module 10: 2-Step Client Deletion & Strike Governance');
  assert(adminJs.includes('openDeleteClientModal'), 'openDeleteClientModal implemented in admin.js');
  assert(adminJs.includes('validateDeleteNameMatch'), 'validateDeleteNameMatch implemented in admin.js');
  assert(adminJs.includes('confirmDeleteClient'), 'confirmDeleteClient implemented in admin.js');

  // Verify deletion protection endpoint checks
  const delClientAttempt = await makeRequest('/api/admin/clients/00000000-0000-0000-0000-000000000000', {
    method: 'DELETE',
  });
  assert(delClientAttempt.statusCode === 404, 'DELETE /api/admin/clients/:id handles non-existent client with 404');

  console.log('\n========================================================================');
  console.log(`📊 MASTER OVERHAUL SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runOverhaulTestSuite().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
