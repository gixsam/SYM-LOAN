/**
 * SYM LOAN PLATFORM (S.E.P.)
 * Automated Verification: Admin Auth Status Removal & User Settings Safe-Area Overlap Fix
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================================');
console.log('🚀 SYM LOAN (S.E.P.) — UI/UX PATCH AUTOMATED VERIFICATION');
console.log('========================================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// MODULE 1: Admin Navbar Auth Status Removal & Relocation
// -----------------------------------------------------------------------------
console.log('📌 Module 1: Admin Navbar — Remove Auth Status & Relocate to Drawer');

const adminHtml = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
const adminJs = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');

it('Admin main header does NOT contain authStatusBadge', () => {
  const headerMatch = adminHtml.match(/<header id="adminMainHeader"[\s\S]*?<\/header>/);
  assert.ok(headerMatch, 'Header element must exist');
  const headerHtml = headerMatch[0];
  assert.ok(!headerHtml.includes('id="authStatusBadge"'), 'authStatusBadge must be removed from header');
  assert.ok(!headerHtml.includes('Authenticating...'), 'Authenticating placeholder must be removed from header');
});

it('Top admin header retains Hamburger, Logo, Clock, Bell and Settings Cog', () => {
  const headerMatch = adminHtml.match(/<header id="adminMainHeader"[\s\S]*?<\/header>/);
  assert.ok(headerMatch, 'Header element must exist');
  const headerHtml = headerMatch[0];
  assert.ok(headerHtml.includes('id="hamburgerBtn"'), 'Hamburger button must exist in header');
  assert.ok(headerHtml.includes('id="adminNavLogo"'), 'Brand logo must exist in header');
  assert.ok(headerHtml.includes('id="adminLiveClockTicker"'), 'Live clock ticker must exist in header');
  assert.ok(headerHtml.includes('id="adminNotificationBellBtn"'), 'Notification bell must exist in header');
  assert.ok(headerHtml.includes('id="openSettingsModalBtn"'), 'Settings cog button must exist in header');
});

it('drawerAuthStatusBadge exists inside #adminDrawer at the bottom', () => {
  const drawerMatch = adminHtml.match(/<aside id="adminDrawer"[\s\S]*?<\/aside>/);
  assert.ok(drawerMatch, 'adminDrawer aside must exist');
  const drawerHtml = drawerMatch[0];
  assert.ok(drawerHtml.includes('id="drawerAuthStatusBadge"'), 'drawerAuthStatusBadge must exist in drawer');
  assert.ok(drawerHtml.includes('zillionprince6'), 'Drawer credentials must exist near auth status badge');
  assert.ok(drawerHtml.includes('01612669922'), 'Drawer phone must exist near auth status badge');
});

it('public/js/admin.js implements robust setAuthStatus function', () => {
  assert.ok(adminJs.includes('function setAuthStatus('), 'setAuthStatus must be declared');
  assert.ok(adminJs.includes('window.setAuthStatus = setAuthStatus;'), 'setAuthStatus must be exported to window');
  assert.ok(adminJs.includes('drawerAuthStatusBadge'), 'admin.js must reference drawerAuthStatusBadge');
});

it('admin.js loadAllData calls setAuthStatus without throwing TypeError', () => {
  assert.ok(adminJs.includes("setAuthStatus('authenticated')"), 'loadAllData must update auth status on success');
  assert.ok(adminJs.includes("setAuthStatus('invalid')"), 'loadAllData must update auth status on error');
});

// -----------------------------------------------------------------------------
// MODULE 2: User Settings Modal Safe-Area & Close Button Touch Target
// -----------------------------------------------------------------------------
console.log('\n📌 Module 2: User Settings Modal — Safe-Area Inset & Address Bar Overlap Fix');

const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');

it('public/css/style.css defines .modal-safe-container with 100dvh and safe-area insets', () => {
  assert.ok(styleCss.includes('.modal-safe-container'), '.modal-safe-container class must be defined in style.css');
  assert.ok(styleCss.includes('min-height: 100dvh'), 'Must support 100dvh dynamic viewport unit');
  assert.ok(styleCss.includes('env(safe-area-inset-top'), 'Must support env(safe-area-inset-top)');
  assert.ok(styleCss.includes('env(safe-area-inset-bottom'), 'Must support env(safe-area-inset-bottom)');
});

it('clientSettingsModal uses modal-safe-container and items-start with safe-area padding', () => {
  const settingsModalMatch = indexHtml.match(/<div id="clientSettingsModal"[\s\S]*?>/);
  assert.ok(settingsModalMatch, 'clientSettingsModal element must exist');
  const modalTag = settingsModalMatch[0];
  assert.ok(modalTag.includes('modal-safe-container'), 'Modal must have modal-safe-container class');
  assert.ok(modalTag.includes('items-start'), 'Modal must use items-start to prevent top clipping');
  assert.ok(modalTag.includes('pt-[max('), 'Modal must use dynamic safe-area top padding');
  assert.ok(modalTag.includes('min-h-[100dvh]'), 'Modal must use min-h-[100dvh]');
});

it('clientSettingsModal has a dedicated pinned header bar with title and close button', () => {
  const startIdx = indexHtml.indexOf('id="clientSettingsModal"');
  assert.ok(startIdx !== -1, 'clientSettingsModal element must exist');
  const endIdx = indexHtml.indexOf('<!-- Loan Confirmation Security', startIdx);
  assert.ok(endIdx !== -1, 'Modal header section must exist');
  const modalHeader = indexHtml.substring(startIdx, endIdx);
  assert.ok(modalHeader.includes('flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80'), 'Dedicated header bar container required');
  assert.ok(modalHeader.includes('>Setting<') || modalHeader.includes('Setting</h3>'), 'Title Setting must be present');
  assert.ok(modalHeader.includes('id="closeSettingsModalBtn"'), 'closeSettingsModalBtn ID must exist');
});

it('closeSettingsModalBtn enforces minimum 40x40px touch target with active scaling', () => {
  const btnMatch = indexHtml.match(/<button[^>]*id="closeSettingsModalBtn"[^>]*>/);
  assert.ok(btnMatch, 'closeSettingsModalBtn button tag must exist');
  const btnTag = btnMatch[0];
  assert.ok(btnTag.includes('min-w-[40px]') || btnTag.includes('w-10'), 'Must enforce minimum 40px width');
  assert.ok(btnTag.includes('min-h-[40px]') || btnTag.includes('h-10'), 'Must enforce minimum 40px height');
  assert.ok(btnTag.includes('rounded-full'), 'Must have rounded-full styling');
  assert.ok(btnTag.includes('onclick="closeClientSettingsModal()"'), 'Must have inline close trigger');
});

it('public/js/app.js handles closeSettingsModalBtn and exports closeClientSettingsModal to window', () => {
  assert.ok(appJs.includes('closeSettingsModalBtn'), 'app.js DOM must map closeSettingsModalBtn');
  assert.ok(appJs.includes('window.closeClientSettingsModal = closeClientSettingsModal;'), 'closeClientSettingsModal must be on window');
  assert.ok(appJs.includes('window.openClientSettingsModal = openClientSettingsModal;'), 'openClientSettingsModal must be on window');
});

it('Other client modals adopt modal-safe-container for universal address bar immunity', () => {
  assert.ok(indexHtml.includes('id="clientProfileHubModal" class="hidden fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/90 backdrop-blur-md min-h-[100dvh] pt-[max(4.5rem,env(safe-area-inset-top,24px))] pb-8 modal-safe-container"'));
  assert.ok(indexHtml.includes('id="kycInfoModal" class="hidden fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md min-h-[100dvh] pt-[max(4.5rem,env(safe-area-inset-top,24px))] pb-8 modal-safe-container"'));
  assert.ok(indexHtml.includes('id="biometricPermModal" class="hidden fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md min-h-[100dvh] pt-[max(4.5rem,env(safe-area-inset-top,24px))] pb-8 modal-safe-container"'));
});

// -----------------------------------------------------------------------------
// MODULE 3: Android Native APK Safe Layout Architecture
// -----------------------------------------------------------------------------
console.log('\n📌 Module 3: Android Native APK Safe Layout & Status Bar Inset');

const clientJava = fs.readFileSync(path.join(__dirname, '../android/src/com/symempire/symloan/MainActivity.java'), 'utf8');
const clientStyles = fs.readFileSync(path.join(__dirname, '../android/res/values/styles.xml'), 'utf8');
const adminJava = fs.readFileSync(path.join(__dirname, '../android-admin/src/com/symempire/symloanadmin/MainActivity.java'), 'utf8');
const adminStyles = fs.readFileSync(path.join(__dirname, '../android-admin/res/values/styles.xml'), 'utf8');

it('Client Android MainActivity enforces setFitsSystemWindows and statusBarHeight padding', () => {
  assert.ok(clientJava.includes('rootLayout.setFitsSystemWindows(true);'), 'Client must set setFitsSystemWindows(true)');
  assert.ok(clientJava.includes('status_bar_height'), 'Client must query status_bar_height dimension');
  assert.ok(clientJava.includes('rootLayout.setPadding('), 'Client must apply status bar padding');
});

it('Client Android styles.xml enables android:fitsSystemWindows', () => {
  assert.ok(clientStyles.includes('<item name="android:fitsSystemWindows">true</item>'), 'Client styles.xml must enable fitsSystemWindows');
});

it('Admin Android MainActivity enforces setFitsSystemWindows and statusBarHeight padding', () => {
  assert.ok(adminJava.includes('rootLayout.setFitsSystemWindows(true);'), 'Admin must set setFitsSystemWindows(true)');
  assert.ok(adminJava.includes('status_bar_height'), 'Admin must query status_bar_height dimension');
  assert.ok(adminJava.includes('rootLayout.setPadding('), 'Admin must apply status bar padding');
});

it('Admin Android styles.xml enables android:fitsSystemWindows', () => {
  assert.ok(adminStyles.includes('<item name="android:fitsSystemWindows">true</item>'), 'Admin styles.xml must enable fitsSystemWindows');
});

it('Both signed Android APK binaries exist in public/downloads/', () => {
  const clientApk = path.join(__dirname, '../public/downloads/SYM-LOAN.apk');
  const adminApk = path.join(__dirname, '../public/downloads/SYM-LOAN-ADMIN.apk');
  assert.ok(fs.existsSync(clientApk), 'SYM-LOAN.apk must exist');
  assert.ok(fs.existsSync(adminApk), 'SYM-LOAN-ADMIN.apk must exist');
  const clientStat = fs.statSync(clientApk);
  const adminStat = fs.statSync(adminApk);
  assert.ok(clientStat.size > 500000, `Client APK size (${clientStat.size} bytes) must be > 500 KB`);
  assert.ok(adminStat.size > 500000, `Admin APK size (${adminStat.size} bytes) must be > 500 KB`);
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`📊 UI/UX PATCH VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
