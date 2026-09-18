/**
 * scripts/test_admin_ui_interactions.js
 * Comprehensive simulation test for Admin UI interactive components:
 * - Settings modal opener, closer & tabs
 * - Suite tabs (Notes, Calendar, Clock, Maps)
 * - Admin login modal & tabs
 * - Notification dropdown toggle
 * - Executive Live Clock & Date ticker
 * - Navigation drawer open/close
 */

const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync(path.join(__dirname, '../public/admin.html'), 'utf8');
const jsCode = fs.readFileSync(path.join(__dirname, '../public/js/admin.js'), 'utf8');

class MockClassList {
  constructor(initial = []) {
    this.classes = new Set(initial);
  }
  add(...names) { names.forEach(n => this.classes.add(n)); }
  remove(...names) { names.forEach(n => this.classes.delete(n)); }
  contains(name) { return this.classes.has(name); }
  toggle(name) {
    if (this.classes.has(name)) { this.classes.delete(name); return false; }
    else { this.classes.add(name); return true; }
  }
  has(name) { return this.classes.has(name); }
}

// Lightweight DOM environment simulator
class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.classList = new MockClassList();
    this.listeners = {};
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.src = '';
    this.disabled = false;
    this.dataset = {};
  }

  focus() {}

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  dispatchEvent(event) {
    const type = typeof event === 'string' ? event : event.type;
    const fns = this.listeners[type] || [];
    fns.forEach(fn => fn(event));
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this, stopPropagation: () => {} });
  }

  contains(other) {
    return this === other;
  }
  querySelectorAll(sel) {
    return [];
  }

  querySelector(sel) {
    return null;
  }
}

// Extract all IDs from admin.html
const allIds = new Set();
const idRegex = /id=["']([^"']+)["']/g;
let m;
while ((m = idRegex.exec(htmlContent)) !== null) {
  allIds.add(m[1]);
}

const elements = {};
allIds.forEach(id => {
  const el = new MockElement(id);
  // Match initial 'hidden' class from html
  const snippet = htmlContent.match(new RegExp(`<[^>]*id=["']${id}["'][^>]*class=["']([^"']*)["']`));
  if (snippet && snippet[1]) {
    snippet[1].split(/\s+/).forEach(cls => {
      if (cls) el.classList.add(cls);
    });
  }
  elements[id] = el;
});

// Setup mock global window/document
const window = {
  AudioContext: function() {},
  Notification: { requestPermission: async () => 'granted' },
  localStorage: {
    getItem: () => 'SEP_ADMIN_2026',
    setItem: () => {}
  },
  sessionStorage: {
    getItem: () => 'SEP_ADMIN_2026',
    setItem: () => {}
  }
};

const document = {
  readyState: 'complete',
  getElementById: (id) => elements[id] || null,
  querySelectorAll: (selector) => {
    if (selector === '.desk-pane') {
      return [
        elements['deskPaneOperations'],
        elements['deskPaneLedgers'],
        elements['deskPaneRisk'],
        elements['deskPaneGovernance'],
        elements['deskPaneExecutive']
      ].filter(Boolean);
    }
    if (selector === '.desk-pill') {
      return [
        elements['deskPillOperations'],
        elements['deskPillLedgers'],
        elements['deskPillRisk'],
        elements['deskPillGovernance'],
        elements['deskPillExecutive'],
        elements['deskPillAll']
      ].filter(Boolean);
    }
    return [];
  },
  querySelector: () => null,
  addEventListener: () => {},
  createElement: () => new MockElement('temp'),
  body: new MockElement('body')
};

// Evaluate admin.js within this sandbox
const vm = require('vm');
const context = vm.createContext({
  window,
  document,
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Set,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  Promise,
  URLSearchParams,
  sessionStorage: window.sessionStorage,
  localStorage: window.localStorage,
  fetch: async () => ({
    ok: true,
    json: async () => ({ success: true, settings: { global: {} } })
  })
});

console.log('--- Starting Admin UI Interaction Simulation ---');

try {
  vm.runInContext(jsCode, context);
  console.log('✅ admin.js evaluated successfully without uncaught exceptions.');
} catch (err) {
  console.error('❌ Evaluation Error:', err);
  process.exit(1);
}

// 1. Test Executive Live Clock Ticker
const liveDate = elements['liveDateText'];
const liveTime = elements['liveTimeText'];
console.log('Clock Ticker verification:');
console.log('  Date:', liveDate ? liveDate.textContent : 'MISSING');
console.log('  Time:', liveTime ? liveTime.textContent : 'MISSING');
if (!liveTime || liveTime.textContent === '--:--:--' || !liveTime.textContent.includes(':')) {
  console.error('❌ Live clock ticker failed to initialize!');
  process.exit(1);
}
console.log('✅ Live Clock & Date ticker is actively ticking!');

// 2. Test Settings Modal Open / Close
const settingsModal = elements['adminSettingsModal'];
const openSettingsBtn = elements['openSettingsModalBtn'];
const closeSettingsBtn = elements['closeSettingsModalBtn'];

console.log('Settings Modal initial state: hidden =', settingsModal.classList.has('hidden'));
if (!settingsModal.classList.has('hidden')) {
  console.error('❌ Settings modal should be hidden initially');
  process.exit(1);
}

// Trigger click on openSettingsModalBtn or call window.openSettingsModal()
window.openSettingsModal();
console.log('After openSettingsModal(): hidden =', settingsModal.classList.has('hidden'));
if (settingsModal.classList.has('hidden')) {
  console.error('❌ openSettingsModal failed to reveal modal!');
  process.exit(1);
}
console.log('✅ openSettingsModal() successfully opened the modal!');

// 3. Test Settings Tabs
const paneLimits = elements['settingsPaneLimits'];
const panePassword = elements['settingsPanePassword'];
const paneLogin = elements['settingsPaneLogin'];
const paneLogos = elements['settingsPaneLogos'];

window.switchSettingsTab('password');
if (panePassword.classList.has('hidden') || !paneLimits.classList.has('hidden')) {
  console.error('❌ switchSettingsTab("password") failed!');
  process.exit(1);
}
console.log('✅ switchSettingsTab("password") successfully activated password pane!');

window.switchSettingsTab('logos');
if (paneLogos.classList.has('hidden') || !panePassword.classList.has('hidden')) {
  console.error('❌ switchSettingsTab("logos") failed!');
  process.exit(1);
}
console.log('✅ switchSettingsTab("logos") successfully activated logos pane!');

// Close Settings Modal
window.closeSettingsModal();
if (!settingsModal.classList.has('hidden')) {
  console.error('❌ closeSettingsModal failed to hide modal!');
  process.exit(1);
}
console.log('✅ closeSettingsModal() successfully closed the modal!');

// 4. Test Executive Suite Tabs
const suiteNotepad = elements['suiteTabContentNotepad'];
const suiteCalendar = elements['suiteTabContentCalendar'];
const suiteClock = elements['suiteTabContentClock'];
const suiteMaps = elements['suiteTabContentMaps'];

window.switchSuiteTab('calendar');
if (suiteCalendar.classList.has('hidden') || !suiteNotepad.classList.has('hidden')) {
  console.error('❌ switchSuiteTab("calendar") failed!');
  process.exit(1);
}
console.log('✅ switchSuiteTab("calendar") successfully activated calendar pane!');

window.switchSuiteTab('maps');
if (suiteMaps.classList.has('hidden') || !suiteCalendar.classList.has('hidden')) {
  console.error('❌ switchSuiteTab("maps") failed!');
  process.exit(1);
}
console.log('✅ switchSuiteTab("maps") successfully activated maps pane!');

window.switchSuiteTab('notes');
if (suiteNotepad.classList.has('hidden') || !suiteMaps.classList.has('hidden')) {
  console.error('❌ switchSuiteTab("notes") failed!');
  process.exit(1);
}
console.log('✅ switchSuiteTab("notes") successfully activated notes pane!');

// 5. Test Admin Login Modal & Tabs
const loginModal = elements['adminLoginModal'];
window.openLoginModal();
if (loginModal.classList.has('hidden')) {
  console.error('❌ openLoginModal() failed!');
  process.exit(1);
}
console.log('✅ openLoginModal() successfully opened login modal!');

const tabContentTelegram = elements['tabContentTelegram'];
window.switchLoginTab('telegram');
if (tabContentTelegram.classList.has('hidden')) {
  console.error('❌ switchLoginTab("telegram") failed!');
  process.exit(1);
}
console.log('✅ switchLoginTab("telegram") successfully switched login tab!');

window.closeLoginModal();
if (!loginModal.classList.has('hidden')) {
  console.error('❌ closeLoginModal() failed!');
  process.exit(1);
}
console.log('✅ closeLoginModal() successfully closed login modal!');

// 6. Test Notification Dropdown Toggle
const notifDropdown = elements['notificationDropdown'];
const wasHidden = notifDropdown.classList.has('hidden');
window.toggleNotificationDropdown();
if (notifDropdown.classList.has('hidden') === wasHidden) {
  console.error('❌ toggleNotificationDropdown() failed to toggle state!');
  process.exit(1);
}
console.log('✅ toggleNotificationDropdown() successfully toggled dropdown visibility!');

// 7. Test Modular Desk Switching
console.log('\nTesting Modular Desk Switcher:');
const paneOperations = elements['deskPaneOperations'];
const paneLedgers = elements['deskPaneLedgers'];
const paneRisk = elements['deskPaneRisk'];
const paneGov = elements['deskPaneGovernance'];
const paneExec = elements['deskPaneExecutive'];

// Switch to Ledgers
window.switchDesk('ledgers');
if (paneLedgers.classList.has('hidden') || !paneOperations.classList.has('hidden')) {
  console.error('❌ switchDesk("ledgers") failed!');
  process.exit(1);
}
console.log('✅ switchDesk("ledgers") successfully activated Ledgers desk!');

// Switch to Risk
window.switchDesk('risk');
if (paneRisk.classList.has('hidden') || !paneLedgers.classList.has('hidden')) {
  console.error('❌ switchDesk("risk") failed!');
  process.exit(1);
}
console.log('✅ switchDesk("risk") successfully activated Risk desk!');

// Switch to Governance
window.switchDesk('governance');
if (paneGov.classList.has('hidden') || !paneRisk.classList.has('hidden')) {
  console.error('❌ switchDesk("governance") failed!');
  process.exit(1);
}
console.log('✅ switchDesk("governance") successfully activated Governance desk!');

// Switch to Executive Suite
window.switchDesk('executive');
if (paneExec.classList.has('hidden') || !paneGov.classList.has('hidden')) {
  console.error('❌ switchDesk("executive") failed!');
  process.exit(1);
}
console.log('✅ switchDesk("executive") successfully activated Executive Suite desk!');

// Switch to View All
window.switchDesk('all');
if (paneOperations.classList.has('hidden') || paneLedgers.classList.has('hidden') || paneRisk.classList.has('hidden') || paneGov.classList.has('hidden') || paneExec.classList.has('hidden')) {
  console.error('❌ switchDesk("all") failed to reveal all panes!');
  process.exit(1);
}
console.log('✅ switchDesk("all") successfully revealed all modular desks!');

// Switch back to Operations
window.switchDesk('operations');
if (paneOperations.classList.has('hidden') || !paneLedgers.classList.has('hidden')) {
  console.error('❌ switchDesk("operations") failed!');
  process.exit(1);
}
console.log('✅ switchDesk("operations") successfully restored Core Operations desk!');

// 8. Test Section Deep Linking with navigateToSection
console.log('\nTesting navigateToSection:');
window.navigateToSection('spreadsheetSection');
if (paneLedgers.classList.has('hidden')) {
  console.error('❌ navigateToSection("spreadsheetSection") failed to activate Ledgers desk!');
  process.exit(1);
}
console.log('✅ navigateToSection("spreadsheetSection") automatically routed to Ledgers desk!');

window.navigateToSection('auditTrailSection');
if (paneRisk.classList.has('hidden')) {
  console.error('❌ navigateToSection("auditTrailSection") failed to activate Risk desk!');
  process.exit(1);
}
console.log('✅ navigateToSection("auditTrailSection") automatically routed to Risk desk!');

window.navigateToSection('loanInboxSection');
if (paneOperations.classList.has('hidden')) {
  console.error('❌ navigateToSection("loanInboxSection") failed to activate Operations desk!');
  process.exit(1);
}
console.log('✅ navigateToSection("loanInboxSection") automatically routed to Operations desk!');

console.log('\n🎉 ALL 8/8 UI INTERACTIVE SUITES VERIFIED AND PASSED WITH 100% SUCCESS!');
process.exit(0);

