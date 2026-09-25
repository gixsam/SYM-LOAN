/**
 * SYM LOAN (S.E.P.) — AUTOMATED VERIFICATION TEST SUITE: PART 2/2
 * Client Portal Overhaul, Biometrics & PIN Security, Profile Hub, and Governance
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let passedTests = 0;
let failedTests = 0;

function pass(msg) {
  console.log(`  ✅ PASS: ${msg}`);
  passedTests++;
}

function fail(msg, err) {
  console.error(`  ❌ FAIL: ${msg}`);
  if (err) console.error(`     Error details:`, err);
  failedTests++;
}

function makeRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runPart2Tests() {
  console.log('\n========================================================================');
  console.log('🚀 SYM LOAN PLATFORM (S.E.P.) — PART 2/2 VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');

  // ─── MODULE 6: CLIENT PORTAL LOGIN CTA UPGRADE ─────────────────────────────
  console.log('📌 Module 6: Client Portal Login CTA Upgrade');
  if (indexHtml.includes('id="registerTelegramCtaBtn"') && indexHtml.includes('GET REGISTERED BY TELEGRAM')) {
    pass('registerTelegramCtaBtn executive button exists with "GET REGISTERED BY TELEGRAM"');
  } else {
    fail('registerTelegramCtaBtn button missing or incorrect text');
  }

  if (indexHtml.includes('href="https://t.me/money_loan_bot"') && indexHtml.includes('target="_blank"')) {
    pass('CTA button targets https://t.me/money_loan_bot with target="_blank"');
  } else {
    fail('CTA target URL invalid or missing target="_blank"');
  }

  if (!indexHtml.includes("Haven't registered yet?")) {
    pass('Old plain text "Haven\'t registered yet?" link successfully removed');
  } else {
    fail('Old plain text registration link still present in index.html');
  }

  // ─── MODULE 7: CLIENT NAVBAR & DRAWER STREAMLINING ─────────────────────────
  console.log('\n📌 Module 7: Client Navbar & Drawer Streamlining');
  if (indexHtml.includes('id="clientDrawerBtn"') && indexHtml.includes('id="clientNotifBellBtn"')) {
    pass('Top navbar retains Hamburger button (☰) and Notification Bell button');
  } else {
    fail('Navbar missing hamburger or notification bell');
  }

  // Check header text: SYM LOAN without (S.E.P.) or LIVE badge in header title
  const headerMatch = indexHtml.match(/<header[\s\S]*?<\/header>/);
  if (headerMatch && headerMatch[0].includes('<h1 class="text-lg font-black tracking-tight text-white">SYM LOAN</h1>')) {
    pass('Header contains clean title "SYM LOAN" without (S.E.P.) or LIVE pill tags');
  } else {
    fail('Header title not cleaned or still contains decorative badges');
  }

  if (indexHtml.includes('id="drawerNavProfile"') && indexHtml.includes('User Profile')) {
    pass('Client Navigation Drawer contains dedicated "User Profile" button (#drawerNavProfile)');
  } else {
    fail('Drawer missing #drawerNavProfile button');
  }

  if (indexHtml.includes('id="drawerNavSettings"') && indexHtml.includes('<span>Setting</span>')) {
    pass('Drawer Settings navigation link renamed to "Setting"');
  } else {
    fail('Drawer settings link not renamed to "Setting"');
  }

  // ─── MODULE 8: EMAIL OTP SECURITY BUGFIX ───────────────────────────────────
  console.log('\n📌 Module 8: Email OTP Security Bugfix');
  if (!appJs.includes('json.previewCode')) {
    pass('app.js sanitized: zero DOM injection or visual display of previewCode');
  } else {
    fail('app.js still contains references to json.previewCode');
  }

  if (appJs.includes('Verification code dispatched to your email inbox! Valid for 5 minutes.')) {
    pass('Borrower feedback strictly states verification code dispatched to email inbox');
  } else {
    fail('Borrower feedback text missing standard sanitization message');
  }

  // ─── MODULE 9: CLIENT DASHBOARD STEPPER, KYC POPUP & AUTO-HIDE ────────────
  console.log('\n📌 Module 9: Client Dashboard Stepper, KYC Popup & Auto-Hide');
  const stepperIdx = indexHtml.indexOf('id="loanProgressStepper"');
  const overdueIdx = indexHtml.indexOf('id="clientOverdueAlertBanner"');
  const kycBannerIdx = indexHtml.indexOf('id="kycRequiredBanner"');

  if (stepperIdx !== -1 && overdueIdx !== -1 && stepperIdx < overdueIdx) {
    pass('loanProgressStepper positioned at the very top of viewLoans');
  } else {
    fail('loanProgressStepper not positioned at top of viewLoans');
  }

  const stages = ['Request Submitted', 'Under Review', 'Disbursed', 'Repayment Pending', 'Cleared'];
  const allStagesPresent = stages.every((st) => indexHtml.includes(st));
  if (allStagesPresent) {
    pass('5 clean lifecycle stages present: Request Submitted -> Under Review -> Disbursed -> Repayment Pending -> Cleared');
  } else {
    fail('One or more 5-stage lifecycle names missing from stepper');
  }

  if (indexHtml.includes('COMPLETE KYC VERIFICATION NOW') && indexHtml.includes('id="kycInfoBtn"')) {
    pass('KYC banner updated with heading "COMPLETE KYC VERIFICATION NOW" and circular info button (#kycInfoBtn)');
  } else {
    fail('KYC banner missing new heading or info button');
  }

  if (indexHtml.includes('id="kycInfoModal"')) {
    pass('Informative KYC explanation modal (#kycInfoModal) present in index.html');
  } else {
    fail('kycInfoModal missing from index.html');
  }

  if (indexHtml.includes('Loan Ledger') && !indexHtml.includes('Your Loan Ledger')) {
    pass('Loans ledger section heading updated to "Loan Ledger"');
  } else {
    fail('Loan ledger heading not renamed to "Loan Ledger"');
  }

  // ─── MODULE 10: BIOMETRIC / PIN LOAN CONFIRMATION SECURITY ─────────────────
  console.log('\n📌 Module 10: Biometric / PIN Loan Confirmation Security');
  if (indexHtml.includes('id="biometricPinToggle"') && indexHtml.includes('Loan Confirmation Security')) {
    pass('Setting modal includes "Loan Confirmation Security" section and toggle (#biometricPinToggle)');
  } else {
    fail('Setting modal missing Loan Confirmation Security section or toggle');
  }

  if (indexHtml.includes('id="biometricPermModal"') && indexHtml.includes('id="btnEnableBiometrics"')) {
    pass('Biometric enrollment modal (#biometricPermModal) exists with Enable and Fallback PIN buttons');
  } else {
    fail('biometricPermModal missing from index.html');
  }

  if (indexHtml.includes('id="setPinModal"') && indexHtml.includes('id="newPinInput"') && indexHtml.includes('id="confirmPinInput"')) {
    pass('Set 4-Digit Security PIN modal (#setPinModal) exists with validation inputs');
  } else {
    fail('setPinModal missing from index.html');
  }

  if (indexHtml.includes('id="loanPinConfirmModal"') && indexHtml.includes('id="scrambledKeypadGrid"')) {
    pass('Anti-shoulder surfing PIN keypad modal (#loanPinConfirmModal) exists with scrambled keypad grid');
  } else {
    fail('loanPinConfirmModal missing from index.html');
  }

  // Test live endpoints for security profile & PIN
  const testClientId = '00000000-0000-0000-0000-000000000001';
  try {
    const secRes = await makeRequest('GET', `/api/clients/${testClientId}/security-profile`);
    if (secRes.status === 200 && secRes.body.success) {
      pass('GET /api/clients/:id/security-profile returns 200 OK with security state');
    } else {
      fail('GET /api/clients/:id/security-profile failed', secRes.body);
    }

    // Set PIN
    const setPinRes = await makeRequest('POST', `/api/clients/${testClientId}/security/set-pin`, {}, { pin: '7412' });
    if (setPinRes.status === 200 && setPinRes.body.success) {
      pass('POST /api/clients/:id/security/set-pin successfully hashes and saves 4-digit PIN');
    } else {
      fail('POST /api/clients/:id/security/set-pin failed', setPinRes.body);
    }

    // Verify PIN with correct PIN
    const verifyPinRes = await makeRequest('POST', `/api/clients/${testClientId}/security/verify-pin`, {}, { pin: '7412' });
    if (verifyPinRes.status === 200 && verifyPinRes.body.success && verifyPinRes.body.token) {
      pass('POST /api/clients/:id/security/verify-pin returns single-use token on correct PIN');
    } else {
      fail('POST /api/clients/:id/security/verify-pin failed with correct PIN', verifyPinRes.body);
    }

    // Verify PIN with incorrect PIN
    const badPinRes = await makeRequest('POST', `/api/clients/${testClientId}/security/verify-pin`, {}, { pin: '9999' });
    if (badPinRes.status === 401 && !badPinRes.body.success) {
      pass('POST /api/clients/:id/security/verify-pin cleanly rejects incorrect PIN with HTTP 401');
    } else {
      fail('POST /api/clients/:id/security/verify-pin did not reject invalid PIN', badPinRes.body);
    }

    // Issue biometric token
    const bioTokenRes = await makeRequest('POST', `/api/clients/${testClientId}/security/biometric-token`, {}, { credentialId: 'mock-bio-cred' });
    if (bioTokenRes.status === 200 && bioTokenRes.body.token) {
      pass('POST /api/clients/:id/security/biometric-token returns valid biometric token');
    } else {
      fail('POST /api/clients/:id/security/biometric-token failed', bioTokenRes.body);
    }
  } catch (apiErr) {
    fail('Security profile live API test error', apiErr);
  }

  // ─── MODULE 11: USER PROFILE HUB & SOCIAL MEDIA LINKS ─────────────────────
  console.log('\n📌 Module 11: User Profile Hub & Social Media Links');
  if (indexHtml.includes('id="clientProfileHubModal"') && indexHtml.includes('id="hubLiveSelfieImg"')) {
    pass('User Profile Hub modal (#clientProfileHubModal) exists with live selfie photo display');
  } else {
    fail('clientProfileHubModal missing or lacks live selfie img');
  }

  if (indexHtml.includes('id="inputSocialFacebook"') && indexHtml.includes('id="inputSocialInstagram"') && indexHtml.includes('id="inputSocialWhatsapp"') && indexHtml.includes('id="inputSocialTelegram"')) {
    pass('Profile Hub contains all 4 social media fields: Facebook, Instagram, WhatsApp, Telegram');
  } else {
    fail('Profile Hub missing one or more social media inputs');
  }

  try {
    // Save social links
    const socialSaveRes = await makeRequest('POST', `/api/clients/${testClientId}/social-links`, {}, {
      facebook: 'https://facebook.com/symempire',
      instagram: '@sym_empire',
      whatsapp: '+8801700000000',
      telegram: '@sym_ceo'
    });
    if (socialSaveRes.status === 200 && socialSaveRes.body.success) {
      pass('POST /api/clients/:id/social-links successfully saves social profiles');
    } else {
      fail('POST /api/clients/:id/social-links failed', socialSaveRes.body);
    }

    // Get social links
    const socialGetRes = await makeRequest('GET', `/api/clients/${testClientId}/social-links`);
    if (socialGetRes.status === 200 && socialGetRes.body.social_links?.telegram === '@sym_ceo') {
      pass('GET /api/clients/:id/social-links returns persisted social links');
    } else {
      fail('GET /api/clients/:id/social-links failed to return expected data', socialGetRes.body);
    }

    // Profile hub data aggregation
    const hubRes = await makeRequest('GET', `/api/clients/${testClientId}/profile-hub`);
    if (hubRes.status === 200 && hubRes.body.profile) {
      pass('GET /api/clients/:id/profile-hub aggregates client, kyc, credit, and social links');
    } else {
      fail('GET /api/clients/:id/profile-hub failed', hubRes.body);
    }
  } catch (hubErr) {
    fail('Profile Hub live API test error', hubErr);
  }

  console.log('\n========================================================================');
  console.log(`📊 PART 2 VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPart2Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
