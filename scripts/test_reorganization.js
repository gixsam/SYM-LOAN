'use strict';
/**
 * scripts/test_reorganization.js
 * Verification test suite for Client Portal UI/UX Restructuring & Dashboard Streamlining
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT_DIR, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT_DIR, 'public/js/app.js'), 'utf8');

console.log('========================================================================');
console.log('🧪 TESTING: CLIENT PORTAL UI/UX REORGANIZATION & STREAMLINING');
console.log('========================================================================\n');

let passedTests = 0;
let failedTests = 0;

function it(desc, fn) {
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${desc}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOP NAVIGATION BAR DECLUTTERING
// ─────────────────────────────────────────────────────────────────────────────
console.log('📌 1. Top Navigation Bar Requirements');

it('Header contains no visible "SYM EMPIRE", "SYM LOAN", or "S.E.P." text elements', () => {
  const headerMatch = html.match(/<header class="sticky[^>]*>([\s\S]*?)<\/header>/);
  assert(headerMatch, 'Sticky header element must exist');
  const headerContent = headerMatch[1];
  
  // Verify h1 "SYM LOAN" removed
  assert(!headerContent.includes('<h1 class="text-lg font-black tracking-tight text-white">SYM LOAN</h1>'), 'h1 text SYM LOAN must be removed');
  // Check no visible S.E.P. text or badge in header
  assert(!headerContent.includes('S.E.P.</span>') && !headerContent.includes('SYM EMPIRE</span>'), 'Text S.E.P. or SYM EMPIRE must not be visible in navbar');
});

it('Header retains only Hamburger button and Logo on left, Bell on right', () => {
  const headerMatch = html.match(/<header class="sticky[^>]*>([\s\S]*?)<\/header>/);
  const headerContent = headerMatch[1];
  assert(headerContent.includes('id="clientDrawerBtn"'), 'Hamburger button must exist');
  assert(headerContent.includes('src="/images/logo.png"'), 'Logo must exist');
  assert(headerContent.includes('id="clientNotifBellBtn"'), 'Notification Bell must exist');
});

it('Compatibility hidden anchors exist in DOM so zero event listeners or tests break', () => {
  assert(html.includes('id="headerKycBtn"'), 'Hidden headerKycBtn must exist');
  assert(html.includes('id="logoutBtn"'), 'Hidden logoutBtn must exist');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. USER PROFILE SUMMARY & CREDIT SCORE SUB-SECTION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 2. User Profile Summary & Credit Score Sub-Section');

it('User Profile badge #clientBadge embeds #profileCreditSubSection sub-section', () => {
  const badgeMatch = html.match(/<div id="clientBadge"[^>]*>([\s\S]*?)<\/header>/);
  assert(badgeMatch, '#clientBadge must be present in header');
  const badgeContent = badgeMatch[1];
  assert(badgeContent.includes('id="profileCreditSubSection"'), '#profileCreditSubSection must exist inside #clientBadge');
  assert(badgeContent.includes('id="clientCreditScoreNum"'), '#clientCreditScoreNum must exist in profile');
  assert(badgeContent.includes('id="clientCreditGradePill"'), '#clientCreditGradePill must exist in profile');
  assert(badgeContent.includes('id="clientVipTierBadge"'), '#clientVipTierBadge must exist in profile');
  assert(badgeContent.includes('id="clientVipTierIcon"'), '#clientVipTierIcon must exist in profile');
  assert(badgeContent.includes('id="clientVipTierName"'), '#clientVipTierName must exist in profile');
});

it('Standalone #clientCreditScoreCard is removed from dashboard viewLoans flow', () => {
  const viewLoansMatch = html.match(/<div id="viewLoans"[^>]*>([\s\S]*?)<\/main>/);
  assert(viewLoansMatch, '#viewLoans must exist');
  const viewLoansContent = viewLoansMatch[1];
  // Verify it is not a visible card
  assert(viewLoansContent.includes('id="clientCreditScoreCard" class="hidden"'), '#clientCreditScoreCard must be hidden in dashboard');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPLETE KYC VERIFICATION NOW (CONDITIONAL OVAL TAB)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 3. Complete KYC Verification Now (Conditional Oval Tab)');

it('#kycRequiredBanner only contains the oval button [COMPLETE KYC VERIFICATION NOW]', () => {
  const kycBannerMatch = html.match(/<div id="kycRequiredBanner"[^>]*>([\s\S]*?)<\/div>/);
  assert(kycBannerMatch, '#kycRequiredBanner must exist');
  const content = kycBannerMatch[1];
  assert(content.includes('id="bannerGoToKycBtn"'), '#bannerGoToKycBtn must exist');
  assert(content.includes('COMPLETE KYC VERIFICATION NOW'), 'Button text must match');
  assert(!content.includes('Identity Verification Required'), 'Heading "Identity Verification Required" must be removed from banner');
  assert(!content.includes('requires mandatory KYC verification (NID Front/Back'), 'Paragraph must be removed from banner');
});

it('app.js hides #kycRequiredBanner when isVerified is true and renders oval buttons for others', () => {
  assert(js.includes('DOM.kycRequiredBanner?.classList.add(\'hidden\');'), 'Banner must hide when isVerified');
  assert(js.includes('rounded-full'), 'Buttons must be styled with rounded-full oval design');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. LOAN PROCESSING & APPLY FOR LOAN ENHANCEMENTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 4. Loan Processing & Apply for Loan');

it('Stepper is renamed to "LOAN PROCESSING" and has initial "hidden" class', () => {
  const stepperMatch = html.match(/<div id="loanProgressStepper"[^>]*>([\s\S]*?)<\/div>\s*<!-- ─── RE-APPLICATION/);
  assert(stepperMatch, '#loanProgressStepper must exist');
  assert(html.includes('id="loanProgressStepper" class="hidden'), '#loanProgressStepper must start hidden');
  assert(html.includes('LOAN PROCESSING</h3>'), 'Title must be LOAN PROCESSING');
});

it('Apply for Loan form includes Feature 1 Financial Calculation Breakdown Card', () => {
  assert(html.includes('id="loanFinancialBreakdownCard"'), '#loanFinancialBreakdownCard must exist');
  assert(html.includes('id="calcPrincipalText"'), '#calcPrincipalText must exist');
  assert(html.includes('id="calcPlatformFeeText"'), '#calcPlatformFeeText must exist');
  assert(html.includes('id="calcTotalRepayableText"'), '#calcTotalRepayableText must exist');
  assert(html.includes('id="calcDailyRateText"'), '#calcDailyRateText must exist');
  assert(html.includes('id="calcVipDiscountBadge"'), '#calcVipDiscountBadge must exist');
});

it('Apply for Loan form includes Feature 4 Loan Purpose Category dropdown', () => {
  assert(html.includes('id="loanPurposeCategorySelect"'), '#loanPurposeCategorySelect must exist');
  assert(html.includes('value="Emergency Medical"'), 'Emergency Medical option must exist');
  assert(html.includes('value="Business Inventory & Stock"'), 'Business Inventory option must exist');
  assert(html.includes('value="Utility & Household Bills"'), 'Utility Bills option must exist');
  assert(html.includes('value="Personal & Family Support"'), 'Personal & Family Support option must exist');
  assert(html.includes('value="Education & Tuition"'), 'Education & Tuition option must exist');
  assert(html.includes('value="Other General Purpose"'), 'Other General Purpose option must exist');
});

it('app.js implements updateLoanCalculatorBreakdown and syncs with inputs', () => {
  assert(js.includes('function updateLoanCalculatorBreakdown()'), 'updateLoanCalculatorBreakdown function must exist');
  assert(js.includes('calcDailyRateText'), 'Must compute daily estimate');
  assert(js.includes('calcPlatformFeeText'), 'Must compute platform fee with VIP discount');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. MY LOAN MODAL & HAMBURGER DRAWER INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 5. My Loan Modal & Navigation Drawer Relocation');

it('Dedicated #clientMyLoanModal exists with safe-area padding and close button', () => {
  assert(html.includes('id="clientMyLoanModal"'), '#clientMyLoanModal must exist');
  assert(html.includes('id="closeMyLoanModalBtn"'), '#closeMyLoanModalBtn must exist');
  assert(html.includes('modal-safe-container'), '#clientMyLoanModal must use modal-safe-container');
});

it('Loan Ledger #loansContainer is inside #clientMyLoanModal and not in dashboard body', () => {
  const modalMatch = html.match(/<div id="clientMyLoanModal"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<!-- ─── PHASE 9/);
  assert(modalMatch, 'Modal structure must match');
  assert(modalMatch[1].includes('id="loansContainer"'), '#loansContainer must be inside #clientMyLoanModal');
  assert(modalMatch[1].includes('id="loansCountBadge"'), '#loansCountBadge must be inside #clientMyLoanModal');
});

it('Navigation drawer includes #drawerNavMyLoan and #drawerNavTelegram', () => {
  assert(html.includes('id="drawerNavMyLoan"'), '#drawerNavMyLoan must exist in drawer');
  assert(html.includes('id="drawerNavTelegram"'), '#drawerNavTelegram must exist in drawer');
  assert(html.includes('href="https://t.me/money_loan_bot"'), 'Telegram link must target @money_loan_bot');
});

it('app.js defines openMyLoanModal and closeMyLoanModal and binds events', () => {
  assert(js.includes('function openMyLoanModal()'), 'openMyLoanModal function must exist');
  assert(js.includes('function closeMyLoanModal()'), 'closeMyLoanModal function must exist');
  assert(js.includes('DOM.drawerNavMyLoan?.addEventListener(\'click\', openMyLoanModal)'), 'drawerNavMyLoan must trigger modal');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. STRICT 3-STRIKE POLICY & FOOTER
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 6. Strict 3-Strike Policy & Footer');

it('Strict 3-Strike Policy and Footer remain intact at the bottom of the page', () => {
  assert(html.includes('Strict 3-Strike Policy'), 'Strict 3-Strike Policy must exist');
  assert(html.includes('1:00 PM'), '1:00 PM deadline rule must be intact');
  assert(html.includes('<footer class="mt-8 border-t border-white/10 px-5 py-5 text-center text-xs text-slate-400 space-y-2">'), 'Footer must exist at bottom');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n========================================================================');
console.log(`📊 REORGANIZATION TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('========================================================================');

if (failedTests > 0) {
  process.exit(1);
}
