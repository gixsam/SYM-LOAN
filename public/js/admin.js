'use strict';
/**
 * public/js/admin.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Executive Administration Panel Logic
 *
 * Features:
 *   - Global limits management
 *   - Per-client custom overrides
 *   - Multi-channel disbursement (Hand-to-Hand Cash, bKash, Nagad)
 *   - Standard 20 BDT per 1,000 MFS Cash-Out Fee Calculator
 *   - Payment receipt screenshot upload & preview lightbox
 *   - Vector PDF Cash Voucher generation
 *   - Google Keep "Money 💰" notes digitalizer & historical ledger
 */

let ADMIN_KEY = sessionStorage.getItem('sep_admin_key') || localStorage.getItem('sep_admin_key') || 'SEP_ADMIN_2026';
if (ADMIN_KEY) {
  sessionStorage.setItem('sep_admin_key', ADMIN_KEY);
  localStorage.setItem('sep_admin_key', ADMIN_KEY);
}
let CLIENTS_CACHE = [];
let SETTINGS_CACHE = null;
let LOANS_CACHE = [];
let ACTIVE_DISBURSE_LOAN = null;

const DOM = {
  adminKeyInput: document.getElementById('adminKeyInput'),
  authStatusBadge: document.getElementById('authStatusBadge'),
  globalForm: document.getElementById('globalForm'),
  globalMinAmount: document.getElementById('globalMinAmount'),
  globalMaxAmount: document.getElementById('globalMaxAmount'),
  globalMinDays: document.getElementById('globalMinDays'),
  globalMaxDays: document.getElementById('globalMaxDays'),
  globalFeedback: document.getElementById('globalFeedback'),

  // Client overrides
  clientSelector: document.getElementById('clientSelector'),
  overridePanel: document.getElementById('overridePanel'),
  clientSelectedName: document.getElementById('clientSelectedName'),
  clientSelectedId: document.getElementById('clientSelectedId'),
  clientOverrideForm: document.getElementById('clientOverrideForm'),
  overrideMinAmount: document.getElementById('overrideMinAmount'),
  overrideMaxAmount: document.getElementById('overrideMaxAmount'),
  overrideMinDays: document.getElementById('overrideMinDays'),
  overrideMaxDays: document.getElementById('overrideMaxDays'),
  overrideNote: document.getElementById('overrideNote'),
  resetOverrideBtn: document.getElementById('resetOverrideBtn'),
  overrideFeedback: document.getElementById('overrideFeedback'),

  // Loans list
  loansTableBody: document.getElementById('loansTableBody'),
  loansCount: document.getElementById('loansCount'),
  refreshLoansBtn: document.getElementById('refreshLoansBtn'),

  // Disbursement Modal
  disburseModal: document.getElementById('disburseModal'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  modalLoanRef: document.getElementById('modalLoanRef'),
  modalClientName: document.getElementById('modalClientName'),
  modalClientPhone: document.getElementById('modalClientPhone'),
  modalLoanAmount: document.getElementById('modalLoanAmount'),
  disbursementForm: document.getElementById('disbursementForm'),
  mfsDetailsBox: document.getElementById('mfsDetailsBox'),
  modalMfsNumber: document.getElementById('modalMfsNumber'),
  modalTrxId: document.getElementById('modalTrxId'),
  modalFeeAmount: document.getElementById('modalFeeAmount'),
  modalTotalDisbursed: document.getElementById('modalTotalDisbursed'),
  modalReceiptFile: document.getElementById('modalReceiptFile'),
  modalAdminNote: document.getElementById('modalAdminNote'),
  confirmDisburseBtn: document.getElementById('confirmDisburseBtn'),

  // Receipt Modal
  receiptModal: document.getElementById('receiptModal'),
  closeReceiptModalBtn: document.getElementById('closeReceiptModalBtn'),
  receiptImage: document.getElementById('receiptImage'),
  downloadReceiptLink: document.getElementById('downloadReceiptLink'),

  // Historical notes
  rawNoteInput: document.getElementById('rawNoteInput'),
  importNoteBtn: document.getElementById('importNoteBtn'),
  historicalTableBody: document.getElementById('historicalTableBody'),
  historicalCountBadge: document.getElementById('historicalCountBadge'),

  // Clients list
  clientsTableBody: document.getElementById('clientsTableBody'),
  clientsCount: document.getElementById('clientsCount'),

  // Hamburger Drawer
  hamburgerBtn: document.getElementById('hamburgerBtn'),
  closeDrawerBtn: document.getElementById('closeDrawerBtn'),
  drawerBackdrop: document.getElementById('drawerBackdrop'),
  adminDrawer: document.getElementById('adminDrawer'),

  // Historical Cash Adjustment Modal
  adjustCashModal: document.getElementById('adjustCashModal'),
  closeAdjustCashModalBtn: document.getElementById('closeAdjustCashModalBtn'),
  adjustCashForm: document.getElementById('adjustCashForm'),
  adjustLedgerId: document.getElementById('adjustLedgerId'),
  adjustClientSubtitle: document.getElementById('adjustClientSubtitle'),
  adjustCurrentBalance: document.getElementById('adjustCurrentBalance'),
  adjustAmount: document.getElementById('adjustAmount'),
  adjustNewBalance: document.getElementById('adjustNewBalance'),
  adjustMemo: document.getElementById('adjustMemo'),
  submitAdjustBtn: document.getElementById('submitAdjustBtn'),

  // Master Client Spreadsheet
  spreadsheetTableBody: document.getElementById('spreadsheetTableBody'),
  spreadsheetSearch: document.getElementById('spreadsheetSearch'),
  downloadSpreadsheetCsvBtn: document.getElementById('downloadSpreadsheetCsvBtn'),
  downloadSpreadsheetXlsxBtn: document.getElementById('downloadSpreadsheetXlsxBtn'),

  // 3-Option Admin Login Modal
  openAdminLoginBtn: document.getElementById('openAdminLoginBtn'),
  drawerOpenLoginBtn: document.getElementById('drawerOpenLoginBtn'),
  triggerAdminLoginModalBtn: document.getElementById('triggerAdminLoginModalBtn'),
  adminLoginModal: document.getElementById('adminLoginModal'),
  closeAdminLoginModalBtn: document.getElementById('closeAdminLoginModalBtn'),

  // Login Tabs
  tabBtnPassword: document.getElementById('tabBtnPassword'),
  tabBtnTelegram: document.getElementById('tabBtnTelegram'),
  tabBtnEmail: document.getElementById('tabBtnEmail'),
  tabContentPassword: document.getElementById('tabContentPassword'),
  tabContentTelegram: document.getElementById('tabContentTelegram'),
  tabContentEmail: document.getElementById('tabContentEmail'),

  // Tab 1: Password Login
  loginPasswordForm: document.getElementById('loginPasswordForm'),
  modalAdminPasswordInput: document.getElementById('modalAdminPasswordInput'),
  togglePasswordVisibilityBtn: document.getElementById('togglePasswordVisibilityBtn'),
  submitLoginPasswordBtn: document.getElementById('submitLoginPasswordBtn'),

  // Tab 2: Telegram OTP
  telegramOtpStep1: document.getElementById('telegramOtpStep1'),
  telegramOtpStep2: document.getElementById('telegramOtpStep2'),
  adminTelegramPhoneInput: document.getElementById('adminTelegramPhoneInput'),
  sendTelegramOtpBtn: document.getElementById('sendTelegramOtpBtn'),
  telegramOtpCodeInput: document.getElementById('telegramOtpCodeInput'),
  telegramOtpTimerText: document.getElementById('telegramOtpTimerText'),
  resendTelegramOtpBtn: document.getElementById('resendTelegramOtpBtn'),
  verifyTelegramOtpBtn: document.getElementById('verifyTelegramOtpBtn'),

  // Tab 3: Email OTP
  emailOtpStep1: document.getElementById('emailOtpStep1'),
  emailOtpStep2: document.getElementById('emailOtpStep2'),
  adminModalEmailInput: document.getElementById('adminModalEmailInput'),
  sendEmailOtpBtn: document.getElementById('sendEmailOtpBtn'),
  emailOtpCodeInput: document.getElementById('emailOtpCodeInput'),
  emailOtpTimerText: document.getElementById('emailOtpTimerText'),
  resendEmailOtpBtn: document.getElementById('resendEmailOtpBtn'),
  verifyEmailOtpBtn: document.getElementById('verifyEmailOtpBtn'),

  // Notification Bell & Tray
  adminNotificationBellBtn: document.getElementById('adminNotificationBellBtn'),
  adminNotifBadge: document.getElementById('adminNotifBadge'),
  notifTrayCountBadge: document.getElementById('notifTrayCountBadge'),
  notificationDropdown: document.getElementById('notificationDropdown'),
  notificationList: document.getElementById('notificationList'),
  refreshNotifsBtn: document.getElementById('refreshNotifsBtn'),
  enablePushNotifsBtn: document.getElementById('enablePushNotifsBtn'),

  // Executive Settings Modal & Tabs
  openSettingsModalBtn: document.getElementById('openSettingsModalBtn'),
  drawerOpenSettingsBtn: document.getElementById('drawerOpenSettingsBtn'),
  adminSettingsModal: document.getElementById('adminSettingsModal'),
  closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
  settingsTabBtnLimits: document.getElementById('settingsTabBtnLimits'),
  settingsTabBtnPassword: document.getElementById('settingsTabBtnPassword'),
  settingsTabBtnLogin: document.getElementById('settingsTabBtnLogin'),
  settingsTabBtnLogos: document.getElementById('settingsTabBtnLogos'),
  settingsPaneLimits: document.getElementById('settingsPaneLimits'),
  settingsPanePassword: document.getElementById('settingsPanePassword'),
  settingsPaneLogin: document.getElementById('settingsPaneLogin'),
  settingsPaneLogos: document.getElementById('settingsPaneLogos'),

  // Admin Master Password Change in Settings
  changePasswordForm: document.getElementById('changePasswordForm'),
  currentAdminPassInput: document.getElementById('currentAdminPassInput'),
  newAdminPassInput: document.getElementById('newAdminPassInput'),
  confirmAdminPassInput: document.getElementById('confirmAdminPassInput'),
  changePasswordFeedback: document.getElementById('changePasswordFeedback'),
  saveNewPasswordBtn: document.getElementById('saveNewPasswordBtn'),

  // Dual Logo Management (Admin App Logo & Client App Logo)
  adminLogoPreview: document.getElementById('adminLogoPreview'),
  uploadAdminLogoForm: document.getElementById('uploadAdminLogoForm'),
  adminLogoFileInput: document.getElementById('adminLogoFileInput'),
  adminLogoFileSelectedName: document.getElementById('adminLogoFileSelectedName'),
  uploadAdminLogoFeedback: document.getElementById('uploadAdminLogoFeedback'),
  saveAdminLogoBtn: document.getElementById('saveAdminLogoBtn'),
  resetAdminLogoBtn: document.getElementById('resetAdminLogoBtn'),

  clientLogoPreview: document.getElementById('clientLogoPreview'),
  uploadClientLogoForm: document.getElementById('uploadClientLogoForm'),
  clientLogoFileInput: document.getElementById('clientLogoFileInput'),
  clientLogoFileSelectedName: document.getElementById('clientLogoFileSelectedName'),
  uploadClientLogoFeedback: document.getElementById('uploadClientLogoFeedback'),
  saveClientLogoBtn: document.getElementById('saveClientLogoBtn'),
  resetClientLogoBtn: document.getElementById('resetClientLogoBtn'),

  // Legacy Brand Logo compatibility aliases
  brandLogoPreview: document.getElementById('brandLogoPreview'),
  uploadLogoForm: document.getElementById('uploadLogoForm'),
  logoFileInput: document.getElementById('logoFileInput'),
  logoFileSelectedName: document.getElementById('logoFileSelectedName'),
  uploadLogoFeedback: document.getElementById('uploadLogoFeedback'),
  saveLogoBtn: document.getElementById('saveLogoBtn'),
  resetLogoBtn: document.getElementById('resetLogoBtn'),

  // KYC Review Desk Elements
  kycReviewSection: document.getElementById('kycReviewSection'),
  kycPendingBadge: document.getElementById('kycPendingBadge'),
  kycPendingCounterBadge: document.getElementById('kycPendingCounterBadge'),
  refreshKycBtn: document.getElementById('refreshKycBtn'),
  kycTableBody: document.getElementById('kycTableBody'),

  // KYC Inspection Modal Elements
  kycInspectModal: document.getElementById('kycInspectModal'),
  closeKycInspectModalBtn: document.getElementById('closeKycInspectModalBtn'),
  inspectKycStatusPill: document.getElementById('inspectKycStatusPill'),
  inspectNidFrontStatus: document.getElementById('inspectNidFrontStatus'),
  inspectNidFrontImg: document.getElementById('inspectNidFrontImg'),
  inspectNidFrontLink: document.getElementById('inspectNidFrontLink'),
  inspectNidBackStatus: document.getElementById('inspectNidBackStatus'),
  inspectNidBackImg: document.getElementById('inspectNidBackImg'),
  inspectNidBackLink: document.getElementById('inspectNidBackLink'),
  inspectSelfieImg: document.getElementById('inspectSelfieImg'),
  inspectSelfieLink: document.getElementById('inspectSelfieLink'),
  inspectPhone: document.getElementById('inspectPhone'),
  inspectFullName: document.getElementById('inspectFullName'),
  inspectDob: document.getElementById('inspectDob'),
  inspectNidNumber: document.getElementById('inspectNidNumber'),
  inspectEmail: document.getElementById('inspectEmail'),
  inspectSubmittedAt: document.getElementById('inspectSubmittedAt'),
  inspectRejectReasonInput: document.getElementById('inspectRejectReasonInput'),
  inspectFeedback: document.getElementById('inspectFeedback'),
  rejectKycBtn: document.getElementById('rejectKycBtn'),
  approveKycBtn: document.getElementById('approveKycBtn'),

  // Live Clock & Chime Elements (Step 2 & 6)
  adminLiveClockTicker: document.getElementById('adminLiveClockTicker'),
  liveDateText: document.getElementById('liveDateText'),
  liveTimeText: document.getElementById('liveTimeText'),
  bigLiveClockDisplay: document.getElementById('bigLiveClockDisplay'),
  bigLiveDateDisplay: document.getElementById('bigLiveDateDisplay'),
  testChimeSoundBtn: document.getElementById('testChimeSoundBtn'),

  // Top KPI Stats & Totals (Step 4)
  kpiTotalLedgerMoney: document.getElementById('kpiTotalLedgerMoney'),
  kpiUpcomingInflow: document.getElementById('kpiUpcomingInflow'),
  historicalTotalMoney: document.getElementById('historicalTotalMoney'),
  ssTotalHistoricalDebt: document.getElementById('ssTotalHistoricalDebt'),
  ssTotalBorrowed: document.getElementById('ssTotalBorrowed'),
  ssTotalOutstanding: document.getElementById('ssTotalOutstanding'),

  // Upcoming Repayments Analytics Elements (Step 3)
  refreshUpcomingRepaymentsBtn: document.getElementById('refreshUpcomingRepaymentsBtn'),
  badgeRepayOverdue: document.getElementById('badgeRepayOverdue'),
  badgeRepayToday: document.getElementById('badgeRepayToday'),
  badgeRepay3Days: document.getElementById('badgeRepay3Days'),
  badgeRepay7Days: document.getElementById('badgeRepay7Days'),
  badgeRepayTotalInflow: document.getElementById('badgeRepayTotalInflow'),
  upcomingRepaymentsTableBody: document.getElementById('upcomingRepaymentsTableBody'),

  // Daily Expense Tracking Elements (Step 1)
  expenseForm: document.getElementById('expenseForm'),
  expenseCategory: document.getElementById('expenseCategory'),
  expenseAmount: document.getElementById('expenseAmount'),
  expenseDate: document.getElementById('expenseDate'),
  expensePayer: document.getElementById('expensePayer'),
  expenseSplitWith: document.getElementById('expenseSplitWith'),
  expenseDescription: document.getElementById('expenseDescription'),
  submitExpenseBtn: document.getElementById('submitExpenseBtn'),
  refreshExpensesBtn: document.getElementById('refreshExpensesBtn'),
  exportExpensesBtn: document.getElementById('exportExpensesBtn'),
  filterExpenseCategory: document.getElementById('filterExpenseCategory'),
  expensesTableBody: document.getElementById('expensesTableBody'),
  totalExpensesFooterAmount: document.getElementById('totalExpensesFooterAmount'),

  // Executive Operations Suite Elements (Step 6)
  suiteTabBtnNotes: document.getElementById('suiteTabBtnNotes'),
  suiteTabBtnCalendar: document.getElementById('suiteTabBtnCalendar'),
  suiteTabBtnClock: document.getElementById('suiteTabBtnClock'),
  suiteTabBtnMaps: document.getElementById('suiteTabBtnMaps'),
  suiteTabContentNotes: document.getElementById('suiteTabContentNotes'),
  suiteTabContentCalendar: document.getElementById('suiteTabContentCalendar'),
  suiteTabContentClock: document.getElementById('suiteTabContentClock'),
  suiteTabContentMaps: document.getElementById('suiteTabContentMaps'),
  suiteNoteTitleInput: document.getElementById('suiteNoteTitleInput'),
  suiteNoteCategoryInput: document.getElementById('suiteNoteCategoryInput'),
  suiteNoteContentInput: document.getElementById('suiteNoteContentInput'),
  saveSuiteNoteBtn: document.getElementById('saveSuiteNoteBtn'),
  suiteNotesGrid: document.getElementById('suiteNotesGrid'),
  suiteEventTitleInput: document.getElementById('suiteEventTitleInput'),
  suiteEventDateInput: document.getElementById('suiteEventDateInput'),
  suiteEventTimeInput: document.getElementById('suiteEventTimeInput'),
  suiteEventClientInput: document.getElementById('suiteEventClientInput'),
  suiteEventDescriptionInput: document.getElementById('suiteEventDescriptionInput'),
  saveSuiteEventBtn: document.getElementById('saveSuiteEventBtn'),
  suiteEventsList: document.getElementById('suiteEventsList'),
  suiteAlarmTimeInput: document.getElementById('suiteAlarmTimeInput'),
  suiteAlarmLabelInput: document.getElementById('suiteAlarmLabelInput'),
  saveSuiteAlarmBtn: document.getElementById('saveSuiteAlarmBtn'),
  suiteAlarmsList: document.getElementById('suiteAlarmsList'),
  mapOriginInput: document.getElementById('mapOriginInput'),
  mapDestinationInput: document.getElementById('mapDestinationInput'),
  updateMapRouteBtn: document.getElementById('updateMapRouteBtn'),
  launchGoogleMapsBtn: document.getElementById('launchGoogleMapsBtn'),
  googleMapsEmbedFrame: document.getElementById('googleMapsEmbedFrame'),

  // Alarm Alert Modal Elements
  alarmAlertModal: document.getElementById('alarmAlertModal'),
  alarmAlertTitle: document.getElementById('alarmAlertTitle'),
  alarmAlertTime: document.getElementById('alarmAlertTime'),
  alarmAlertMessage: document.getElementById('alarmAlertMessage'),
  dismissAlarmBtn: document.getElementById('dismissAlarmBtn'),
  snoozeAlarmBtn: document.getElementById('snoozeAlarmBtn'),

  // Terms and Policy Modal Elements (Step 5)
  termsPolicyModal: document.getElementById('termsPolicyModal'),
  closeTermsModalBtn: document.getElementById('closeTermsModalBtn'),
  termsModalOkBtn: document.getElementById('termsModalOkBtn'),
};

let KYC_CACHE = [];
let ACTIVE_INSPECT_KYC = null;
let EXPENSES_CACHE = [];
let UPCOMING_REPAYMENTS_CACHE = [];
let SUITE_NOTES_CACHE = [];
let SUITE_EVENTS_CACHE = [];
let SUITE_ALARMS_CACHE = [];
let ACTIVE_ALARM_INTERVAL = null;
let ACTIVE_ALARM_OBJ = null;

function initAdmin() {
  if (DOM.adminKeyInput) DOM.adminKeyInput.value = ADMIN_KEY;
  initLiveClockTicker();
  initTermsPolicyModal();
  setupEvents();
  loadAllData();
  fetchNotifications();
  // Auto-polling for notifications every 15 seconds
  setInterval(fetchNotifications, 15000);
}

function getHeaders() {
  return {
    'x-admin-key': ADMIN_KEY,
  };
}

// ─── Load All Data ────────────────────────────────────────────────────────────
async function loadAllData() {
  try {
    await fetchSettings();
    await fetchClients();
    await fetchKycList();
    await fetchLoans();
    await fetchRepayments();
    await fetchHistoricalLedgers();
    await fetchMasterSpreadsheet();
    await fetchUpcomingRepaymentsAnalytics();
    await fetchExpenses();
    await fetchCollectionsMatrix();
    await fetchReminderLogs();
    await fetchCreditMatrix();
    await fetchFraudAlerts();
    await fetchSuiteNotes();
    await fetchSuiteEvents();
    await fetchSuiteAlarms();
    DOM.authStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center';
    DOM.authStatusBadge.innerHTML = '<i class="fas fa-shield-alt mr-1.5"></i> Authenticated';
  } catch (err) {
    DOM.authStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center';
    DOM.authStatusBadge.innerHTML = '<i class="fas fa-lock mr-1.5"></i> Invalid Key';
  }
}

// ─── Settings API ─────────────────────────────────────────────────────────────
async function fetchSettings() {
  const res = await fetch('/api/admin/settings', { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);

  SETTINGS_CACHE = json.settings;
  const g = json.settings.global;

  if (DOM.globalMinAmount) DOM.globalMinAmount.value = g.min_amount;
  if (DOM.globalMaxAmount) DOM.globalMaxAmount.value = g.max_amount;
  if (DOM.globalMinDays) DOM.globalMinDays.value = g.min_duration_days;
  if (DOM.globalMaxDays) DOM.globalMaxDays.value = g.max_duration_days;

  // Dynamically update active admin and client logos
  const adminLogoUrl = json.settings.admin_logo_url || json.settings.platform_logo_url || '/images/logo.png';
  const clientLogoUrl = json.settings.client_logo_url || '/images/logo.png';

  document.querySelectorAll('.platform-logo-img').forEach(img => {
    img.src = adminLogoUrl;
  });
  if (DOM.adminLogoPreview) DOM.adminLogoPreview.src = adminLogoUrl;
  if (DOM.clientLogoPreview) DOM.clientLogoPreview.src = clientLogoUrl;
}

// ─── Clients API ──────────────────────────────────────────────────────────────
async function fetchClients() {
  const res = await fetch('/api/admin/clients', { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);

  CLIENTS_CACHE = json.clients || [];
  DOM.clientsCount.textContent = `${CLIENTS_CACHE.length} Registered`;

  DOM.clientSelector.innerHTML = '<option value="">-- Choose a registered client --</option>' +
    CLIENTS_CACHE.map(c => `
      <option value="${c.id}">${c.name} (${c.phone_number}) — Strikes: ${c.strikes_count}</option>
    `).join('');

  DOM.clientsTableBody.innerHTML = CLIENTS_CACHE.map(c => {
    const isOverride = c.active_limits.is_override;
    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] text-xs">
        <td class="py-3 px-4">
          <div class="font-bold text-white">${c.name}</div>
          <div class="font-mono text-[10px] text-slate-500">${c.id}</div>
        </td>
        <td class="py-3 px-4 font-mono text-emerald-400">${c.phone_number}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
            ${c.status}
          </span>
        </td>
        <td class="py-3 px-4 font-bold ${c.strikes_count > 0 ? 'text-rose-400' : 'text-slate-400'}">
          ${c.strikes_count} / 3
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-200">৳${c.active_limits.min_amount} – ৳${c.active_limits.max_amount}</div>
          <div class="text-[10px] text-slate-400">${c.active_limits.min_duration_days} to ${c.active_limits.max_duration_days} days ${isOverride ? '<span class="text-amber-400 font-bold">[CUSTOM]</span>' : '<span class="text-slate-500">[GLOBAL]</span>'}</div>
        </td>
        <td class="py-3 px-4 space-x-1.5">
          <button onclick="selectClientForOverride('${c.id}')" class="px-2 py-1 bg-amber-500/20 text-amber-300 rounded hover:bg-amber-500/30 text-[10px] font-bold">
            <i class="fas fa-sliders-h mr-1"></i> Limits
          </button>
          ${c.strikes_count > 0 ? `
            <button onclick="clearClientStrikes('${c.id}')" class="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30 text-[10px] font-bold">
              <i class="fas fa-undo mr-1"></i> Clear Strikes
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

// ─── Loans API & Multi-Channel Disbursement ───────────────────────────────────
async function fetchLoans() {
  const res = await fetch('/api/admin/loans', { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);

  LOANS_CACHE = json.loans || [];
  DOM.loansCount.textContent = `${LOANS_CACHE.length} Application(s)`;

  if (LOANS_CACHE.length === 0) {
    DOM.loansTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="p-6 text-center text-slate-500 text-xs">
          No loan applications submitted yet.
        </td>
      </tr>
    `;
    return;
  }

  DOM.loansTableBody.innerHTML = LOANS_CACHE.map(l => {
    const client = l.client_profiles || { name: 'Unknown', phone_number: '—' };
    const d = l.disbursement || {};

    let statusClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    if (l.status === 'ACCEPTED') statusClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    if (l.status === 'DECLINED') statusClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';

    const isPending = l.status === 'PENDING';
    const isAccepted = l.status === 'ACCEPTED';

    // Channel badge
    let channelBadge = '<span class="text-slate-500 text-[10px]">—</span>';
    if (d.payout_method) {
      if (d.payout_method === 'BKASH') {
        channelBadge = `
          <div>
            <span class="px-2 py-0.5 rounded text-[10px] font-black bg-pink-500/20 text-pink-400 border border-pink-500/30 uppercase">
              <i class="fas fa-mobile-alt mr-1"></i> bKash
            </span>
            <div class="text-[10px] font-mono text-slate-400 mt-1">TrxID: <b class="text-white">${d.trx_id || 'N/A'}</b></div>
          </div>
        `;
      } else if (d.payout_method === 'NAGAD') {
        channelBadge = `
          <div>
            <span class="px-2 py-0.5 rounded text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
              <i class="fas fa-wallet mr-1"></i> Nagad
            </span>
            <div class="text-[10px] font-mono text-slate-400 mt-1">TrxID: <b class="text-white">${d.trx_id || 'N/A'}</b></div>
          </div>
        `;
      } else {
        channelBadge = `
          <div>
            <span class="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
              <i class="fas fa-hand-holding-usd mr-1"></i> Cash Handover
            </span>
          </div>
        `;
      }
    }

    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] text-xs">
        <td class="py-3 px-4">
          <div class="font-bold text-white">${client.name}</div>
          <div class="font-mono text-[10px] text-emerald-400">${client.phone_number}</div>
          <div class="font-mono text-[9px] text-slate-500">#${l.id.slice(0, 8)}</div>
        </td>
        <td class="py-3 px-4 font-black text-sm text-emerald-400">
          ৳${parseFloat(l.amount).toLocaleString()}
          ${d.mfs_fee ? `<div class="text-[9px] font-normal text-amber-400">+৳${d.mfs_fee} MFS fee</div>` : ''}
        </td>
        <td class="py-3 px-4">
          ${channelBadge}
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-300">${l.deadline_date}</div>
          <div class="text-[10px] text-slate-500">${new Date(l.created_at).toLocaleDateString()}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusClass}">
            ${l.status}
          </span>
        </td>
        <td class="py-3 px-4 space-x-1.5">
          ${isPending ? `
            <button onclick="openDisburseModal('${l.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow">
              <i class="fas fa-check mr-1"></i> Accept & Disburse
            </button>
            <button onclick="declineLoan('${l.id}')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold shadow">
              <i class="fas fa-times mr-1"></i> Decline
            </button>
          ` : `
            <div class="flex items-center space-x-1.5">
              ${d.receipt_url ? `
                <button onclick="viewReceiptImage('${d.receipt_url}')" class="px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-[10px] font-bold border border-blue-500/30" title="View Payment Screenshot">
                  <i class="fas fa-receipt mr-1"></i> Receipt
                </button>
              ` : ''}
              ${isAccepted ? `
                <button onclick="downloadVoucher('${l.id}')" class="px-2 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded text-[10px] font-bold border border-amber-500/30" title="Download Official PDF Voucher">
                  <i class="fas fa-file-pdf mr-1"></i> Voucher
                </button>
              ` : ''}
            </div>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

// ─── Disbursement Modal Flow ──────────────────────────────────────────────────
window.openDisburseModal = function(loanId) {
  const loan = LOANS_CACHE.find(l => l.id === loanId);
  if (!loan) return;

  ACTIVE_DISBURSE_LOAN = loan;
  const client = loan.client_profiles || {};

  DOM.modalLoanRef.textContent = `Loan Ref: #${loan.id.slice(0, 8).toUpperCase()}`;
  DOM.modalClientName.textContent = client.name || 'Client';
  DOM.modalClientPhone.textContent = client.phone_number || '';
  DOM.modalLoanAmount.textContent = `৳${parseFloat(loan.amount).toLocaleString()}`;
  DOM.modalMfsNumber.value = (client.phone_number || '').replace(/^\+88/, '');
  DOM.modalTrxId.value = '';
  DOM.modalReceiptFile.value = '';
  DOM.modalAdminNote.value = '';

  // Fee calculation: 20 BDT per 1,000 BDT
  const amount = parseFloat(loan.amount) || 0;
  const fee = Math.ceil(amount / 1000) * 20;
  DOM.modalFeeAmount.textContent = `৳${fee.toLocaleString()}`;
  DOM.modalTotalDisbursed.textContent = `৳${(amount + fee).toLocaleString()}`;

  // Default to Cash
  document.querySelector('input[name="payout_method"][value="CASH"]').checked = true;
  DOM.mfsDetailsBox.classList.add('hidden');
  updateMethodSelectionStyle('CASH');

  DOM.disburseModal.classList.remove('hidden');
};

function updateMethodSelectionStyle(selectedMethod) {
  document.querySelectorAll('.method-card').forEach(card => {
    const input = card.querySelector('input[type="radio"]');
    if (input.value === selectedMethod) {
      card.classList.add('border-amber-400', 'bg-amber-500/10');
    } else {
      card.classList.remove('border-amber-400', 'bg-amber-500/10');
    }
  });

  if (selectedMethod === 'BKASH' || selectedMethod === 'NAGAD') {
    DOM.mfsDetailsBox.classList.remove('hidden');
  } else {
    DOM.mfsDetailsBox.classList.add('hidden');
  }
}

window.declineLoan = async function(loanId) {
  const reason = prompt('Reason for declining loan:', 'Does not meet loan criteria at this time');
  if (reason === null) return;

  try {
    const res = await fetch(`/api/admin/loans/${loanId}/decision`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'DECLINED', admin_note: reason }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);
    alert('Loan application marked as DECLINED.');
    await fetchLoans();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

window.viewReceiptImage = function(url) {
  DOM.receiptImage.src = url;
  DOM.downloadReceiptLink.href = url;
  DOM.receiptModal.classList.remove('hidden');
};

window.downloadVoucher = function(loanId) {
  const loan = LOANS_CACHE.find(l => l.id === loanId);
  if (!loan) return;
  const client = loan.client_profiles || { name: 'Client', phone_number: '—' };
  window.generateLoanVoucherPdf(loan, client);
};

// ─── Historical Google Keep Notes API ─────────────────────────────────────────
async function fetchHistoricalLedgers() {
  try {
    const res = await fetch('/api/admin/historical-ledgers', { headers: getHeaders() });
    const json = await res.json();
    if (res.ok && json.success) {
      const list = json.ledgers || [];
      DOM.historicalCountBadge.textContent = `${list.length} Records`;

      // Step 4: Calculate TOTAL MONEY from all digitized Google Keep Notes
      const totalNotesMoney = list.reduce((sum, item) => sum + (parseFloat(item.historical_balance) || 0), 0);
      if (DOM.historicalTotalMoney) {
        DOM.historicalTotalMoney.textContent = `৳ ${Math.round(totalNotesMoney).toLocaleString()}`;
      }
      if (DOM.kpiTotalLedgerMoney) {
        DOM.kpiTotalLedgerMoney.textContent = `৳ ${Math.round(totalNotesMoney).toLocaleString()}`;
      }

      DOM.historicalTableBody.innerHTML = list.map(item => `
        <tr class="border-b border-white/5 hover:bg-white/[0.02] text-xs">
          <td class="py-2.5 px-3 font-bold text-white">${item.old_name}</td>
          <td class="py-2.5 px-3 font-mono font-black text-amber-400">৳${parseFloat(item.historical_balance).toLocaleString()}</td>
          <td class="py-2.5 px-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${item.historical_tag.includes('FRAUD') ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-white/5 text-slate-300'}">
              ${item.historical_tag}
            </span>
          </td>
          <td class="py-2.5 px-3 text-[10px] text-slate-500">${new Date(item.created_at).toLocaleDateString()}</td>
          <td class="py-2.5 px-3 text-right">
            <button onclick="openAdjustCashModal('${item.id}', '${item.old_name.replace(/'/g, "\\'")}', ${item.historical_balance})" class="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/30 text-[10px] transition cursor-pointer">
              <i class="fas fa-edit mr-1"></i> Adjust (+/-)
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load historical ledgers:', err);
  }
}

// ─── Adjust Cash Functions ───────────────────────────────────────────────────
let ACTIVE_ADJUST_RECORD = null;

window.openAdjustCashModal = function(id, name, currentBalance) {
  ACTIVE_ADJUST_RECORD = { id, name, currentBalance: parseFloat(currentBalance) || 0 };
  DOM.adjustLedgerId.value = id;
  DOM.adjustClientSubtitle.textContent = `Client: ${name}`;
  DOM.adjustCurrentBalance.textContent = `৳${ACTIVE_ADJUST_RECORD.currentBalance.toLocaleString()}`;
  DOM.adjustAmount.value = '500';
  DOM.adjustMemo.value = '';
  updateProjectedNewBalance();
  DOM.adjustCashModal.classList.remove('hidden');
};

function updateProjectedNewBalance() {
  if (!ACTIVE_ADJUST_RECORD) return;
  const type = document.querySelector('input[name="adjustType"]:checked')?.value || 'ADD';
  const delta = parseFloat(DOM.adjustAmount.value) || 0;
  const current = ACTIVE_ADJUST_RECORD.currentBalance;
  const projected = type === 'ADD' ? (current + delta) : (current - delta);
  DOM.adjustNewBalance.textContent = `৳${Math.round(projected).toLocaleString()}`;
}

// ─── Master Client Spreadsheet API ───────────────────────────────────────────
let SPREADSHEET_CACHE = [];

async function fetchMasterSpreadsheet() {
  try {
    const res = await fetch('/api/admin/clients/master-spreadsheet', { headers: getHeaders() });
    const json = await res.json();
    if (res.ok && json.success) {
      SPREADSHEET_CACHE = json.rows || [];
      renderSpreadsheetTable(SPREADSHEET_CACHE);
    }
  } catch (err) {
    console.error('Failed to load master spreadsheet:', err);
  }
}

function renderSpreadsheetTable(rows) {
  if (!DOM.spreadsheetTableBody) return;
  if (!rows || rows.length === 0) {
    DOM.spreadsheetTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="p-6 text-center text-slate-500">No client records found.</td>
      </tr>
    `;
    if (DOM.ssTotalHistoricalDebt) DOM.ssTotalHistoricalDebt.textContent = '৳ 0';
    if (DOM.ssTotalBorrowed) DOM.ssTotalBorrowed.textContent = '৳ 0';
    if (DOM.ssTotalOutstanding) DOM.ssTotalOutstanding.textContent = '৳ 0';
    return;
  }

  // Calculate Master Spreadsheet footer totals
  const totalHistDebt = rows.reduce((acc, r) => acc + (parseFloat(r.historical_debt) || 0), 0);
  const totalBorrowed = rows.reduce((acc, r) => acc + (parseFloat(r.total_borrowed) || 0), 0);
  const totalOutstanding = rows.reduce((acc, r) => acc + (parseFloat(r.net_outstanding) || 0), 0);

  if (DOM.ssTotalHistoricalDebt) DOM.ssTotalHistoricalDebt.textContent = `৳ ${Math.round(totalHistDebt).toLocaleString()}`;
  if (DOM.ssTotalBorrowed) DOM.ssTotalBorrowed.textContent = `৳ ${Math.round(totalBorrowed).toLocaleString()}`;
  if (DOM.ssTotalOutstanding) DOM.ssTotalOutstanding.textContent = `৳ ${Math.round(totalOutstanding).toLocaleString()}`;

  DOM.spreadsheetTableBody.innerHTML = rows.map(r => {
    const statusColor = r.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                        r.status === 'BLOCKED' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' :
                        'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.03] transition">
        <td class="py-2.5 px-3 font-bold text-white">${r.name}</td>
        <td class="py-2.5 px-3 font-mono text-slate-300">${r.phone_number}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}">${r.status}</span>
        </td>
        <td class="py-2.5 px-3 font-mono text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.strikes_count > 0 ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400'}">${r.strikes_count}/3</span>
        </td>
        <td class="py-2.5 px-3 font-mono font-bold text-amber-400">৳${parseFloat(r.historical_debt || 0).toLocaleString()}</td>
        <td class="py-2.5 px-3 font-mono text-slate-300">৳${parseFloat(r.total_borrowed || 0).toLocaleString()}</td>
        <td class="py-2.5 px-3 font-mono font-black text-emerald-400">৳${parseFloat(r.net_outstanding || 0).toLocaleString()}</td>
        <td class="py-2.5 px-3 text-[11px] text-slate-500">${r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
      </tr>
    `;
  }).join('');
}

function downloadSpreadsheetCsv() {
  if (!SPREADSHEET_CACHE || SPREADSHEET_CACHE.length === 0) {
    alert('No client data to export.');
    return;
  }

  const headers = ['Client Name', 'Phone Number', 'Status', 'Strikes Count', 'Historical Debt (BDT)', 'Total Borrowed (BDT)', 'Net Outstanding (BDT)', 'Joined Date'];
  const rows = SPREADSHEET_CACHE.map(r => [
    `"${(r.name || '').replace(/"/g, '""')}"`,
    `"${(r.phone_number || '').replace(/"/g, '""')}"`,
    `"${r.status || 'ACTIVE'}"`,
    r.strikes_count || 0,
    r.historical_debt || 0,
    r.total_borrowed || 0,
    r.net_outstanding || 0,
    `"${r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `SYM_LOAN_Master_Spreadsheet_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadSpreadsheetXlsx() {
  if (!SPREADSHEET_CACHE || SPREADSHEET_CACHE.length === 0) {
    alert('No client data to export.');
    return;
  }
  if (typeof XLSX === 'undefined') {
    alert('SheetJS Excel library is loading. Please try again in a few seconds.');
    return;
  }

  const exportData = SPREADSHEET_CACHE.map(r => ({
    'Client Name': r.name || '',
    'Phone Number': r.phone_number || '',
    'Status': r.status || 'ACTIVE',
    'Strikes Count': r.strikes_count || 0,
    'Historical Debt (BDT)': r.historical_debt || 0,
    'Total Borrowed (BDT)': r.total_borrowed || 0,
    'Net Outstanding (BDT)': r.net_outstanding || 0,
    'Joined Date': r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients Master');

  // Format column widths for executive presentation
  worksheet['!cols'] = [
    { wch: 22 }, // Client Name
    { wch: 16 }, // Phone Number
    { wch: 12 }, // Status
    { wch: 14 }, // Strikes Count
    { wch: 22 }, // Historical Debt (BDT)
    { wch: 22 }, // Total Borrowed (BDT)
    { wch: 22 }, // Net Outstanding (BDT)
    { wch: 14 }, // Joined Date
  ];

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `SYM_LOAN_Master_Spreadsheet_${dateStr}.xlsx`);
}

// ─── Real-Time Notifications Engine ──────────────────────────────────────────
async function fetchNotifications() {
  try {
    const res = await fetch('/api/admin/notifications', { headers: getHeaders() });
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success) return;

    const notifs = json.notifications || [];
    const repPending = json.pending_repayments || [];
    const fraudPending = json.pending_fraud_alerts || [];

    // Combine repayments and fraud alerts into alerts tray
    const allNotifs = [...notifs];
    repPending.forEach(r => {
      allNotifs.push({
        id: 'rep-' + r.id,
        type: 'REPAYMENT',
        title: `Repayment Audit: ৳${parseFloat(r.amount_paid).toLocaleString()} (${r.payout_method})`,
        client_name: r.client_name,
        phone_number: r.client_phone || r.sender_number,
        time_ago: new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });

    fraudPending.forEach(f => {
      allNotifs.push({
        id: 'fraud-' + f.id,
        type: 'FRAUD',
        title: `🚨 Fraud Alert (${f.fraud_score}/100 - ${f.risk_tier})`,
        client_name: f.client_name || 'Anonymous',
        phone_number: f.ip_address || 'IP Collision',
        time_ago: new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });

    const count = json.count !== undefined ? json.count : (json.total_pending !== undefined ? json.total_pending : allNotifs.length);

    if (DOM.adminNotifBadge) {
      DOM.adminNotifBadge.textContent = count;
      if (count > 0) {
        DOM.adminNotifBadge.classList.remove('hidden');
      } else {
        DOM.adminNotifBadge.classList.add('hidden');
      }
    }

    if (DOM.notifTrayCountBadge) {
      DOM.notifTrayCountBadge.textContent = `${count} PENDING`;
    }

    const repDrawerBadge = document.getElementById('repaymentsPendingDrawerBadge');
    const repCounterBadge = document.getElementById('repaymentsPendingCounterBadge');
    if (repDrawerBadge) repDrawerBadge.textContent = repPending.length;
    if (repCounterBadge) repCounterBadge.textContent = `${repPending.length} PENDING`;

    const fraudBadgeEl = document.getElementById('adminFraudBadge');
    const tabFraudBadgePillEl = document.getElementById('tabFraudBadgePill');
    if (fraudBadgeEl) fraudBadgeEl.textContent = fraudPending.length;
    if (tabFraudBadgePillEl) tabFraudBadgePillEl.textContent = fraudPending.length;

    if (DOM.notificationList) {
      if (allNotifs.length === 0) {
        DOM.notificationList.innerHTML = `
          <div class="py-6 text-center text-slate-500 text-xs">
            <i class="fas fa-bell-slash text-base mb-1 block opacity-40"></i>
            No pending alerts or submissions.
          </div>
        `;
      } else {
        DOM.notificationList.innerHTML = allNotifs.map(n => {
          const isKyc = n.type === 'KYC';
          const isRep = n.type === 'REPAYMENT';
          const isFraud = n.type === 'FRAUD';
          let icon = 'fa-file-invoice-dollar text-emerald-400';
          let targetSection = '#loanInboxSection';
          if (isKyc) {
            icon = 'fa-id-card text-amber-400';
            targetSection = '#kycReviewSection';
          } else if (isRep) {
            icon = 'fa-hand-holding-usd text-emerald-400';
            targetSection = '#repaymentsDeskSection';
          } else if (isFraud) {
            icon = 'fa-shield-virus text-rose-400';
            targetSection = '#creditFraudDeskSection';
          }

          return `
            <div class="p-2.5 rounded-lg bg-black/40 hover:bg-white/5 border border-white/5 transition flex items-start justify-between space-x-2">
              <div class="flex items-start space-x-2.5">
                <div class="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i class="fas ${icon} text-xs"></i>
                </div>
                <div>
                  <div class="font-bold text-white text-xs leading-snug">${n.title}</div>
                  <div class="text-[11px] text-slate-400">${n.client_name} (${n.phone_number})</div>
                  <div class="text-[10px] text-amber-400/80 font-mono mt-0.5">${n.time_ago || 'Recent'}</div>
                </div>
              </div>
              <a href="${targetSection}" onclick="DOM.notificationDropdown?.classList.add('hidden')" class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold whitespace-nowrap transition">
                Review <i class="fas fa-arrow-right ml-0.5 text-[9px]"></i>
              </a>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    // Background polling silent catch
  }
}

// ─── Phase 9: Repayments & Settlement Desk ────────────────────────────────────
let REPAYMENTS_CACHE = [];
let ACTIVE_REPAYMENT_FILTER = 'ALL';

async function fetchRepayments(status = ACTIVE_REPAYMENT_FILTER) {
  try {
    const url = status && status !== 'ALL' 
      ? `/api/admin/repayments?status=${encodeURIComponent(status)}`
      : '/api/admin/repayments';

    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success) return;

    REPAYMENTS_CACHE = json.data || [];
    const stats = json.stats || { pending: 0, verified: 0, rejected: 0, total_settled_amount: 0, total_pending_amount: 0 };

    // Update Quick Metric Pills
    const repPendingEl = document.getElementById('repMetricPending');
    const repVerifiedEl = document.getElementById('repMetricVerified');
    const repRejectedEl = document.getElementById('repMetricRejected');
    const repSettledEl = document.getElementById('repMetricTotalSettled');
    const repCounterBadge = document.getElementById('repaymentsPendingCounterBadge');
    const repDrawerBadge = document.getElementById('repaymentsPendingDrawerBadge');

    if (repPendingEl) repPendingEl.textContent = `${stats.pending} (৳ ${stats.total_pending_amount.toLocaleString()})`;
    if (repVerifiedEl) repVerifiedEl.textContent = `${stats.verified} (৳ ${stats.total_settled_amount.toLocaleString()})`;
    if (repRejectedEl) repRejectedEl.textContent = `${stats.rejected}`;
    if (repSettledEl) repSettledEl.textContent = `৳ ${stats.total_settled_amount.toLocaleString()}`;
    if (repCounterBadge) repCounterBadge.textContent = `${stats.pending} PENDING`;
    if (repDrawerBadge) repDrawerBadge.textContent = stats.pending;

    renderRepaymentsTable(REPAYMENTS_CACHE);
  } catch (err) {
    console.error('Failed to fetch repayments:', err);
  }
}

function renderRepaymentsTable(list) {
  const tbody = document.getElementById('repaymentsTableBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-6 text-center text-slate-500 text-xs">
          <i class="fas fa-hand-holding-usd text-2xl mb-1.5 block opacity-40"></i>
          No repayment records found for the selected filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(r => {
    let statusBadge = '';
    if (r.status === 'VERIFIED') {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center w-fit"><i class="fas fa-check-circle mr-1 text-emerald-400"></i> Settled</span>`;
    } else if (r.status === 'REJECTED') {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center w-fit"><i class="fas fa-times-circle mr-1 text-rose-400"></i> Rejected</span>`;
    } else {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center w-fit"><i class="fas fa-hourglass-half mr-1 text-amber-400 animate-spin"></i> In Review</span>`;
    }

    const dateFormatted = new Date(r.submitted_at).toLocaleDateString();
    const timeFormatted = new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] text-xs transition">
        <td class="py-3 px-3">
          <div class="font-mono text-amber-400 font-bold">#SEP-RP-${r.id.slice(0, 6).toUpperCase()}</div>
          <div class="text-[10px] text-slate-400">${dateFormatted} ${timeFormatted}</div>
        </td>
        <td class="py-3 px-3">
          <div class="font-bold text-white">${escapeHtml(r.client_name)}</div>
          <div class="font-mono text-[11px] text-emerald-400">${escapeHtml(r.client_phone || '—')}</div>
        </td>
        <td class="py-3 px-3">
          <div class="font-mono text-slate-300">#${r.loan_id.slice(0, 8)}</div>
          <div class="text-[10px] text-slate-400">Principal: <b class="text-slate-200">৳${parseFloat(r.loan_amount || 0).toLocaleString()}</b></div>
        </td>
        <td class="py-3 px-3">
          <div class="font-black text-emerald-400 font-mono text-sm">৳${parseFloat(r.amount_paid).toLocaleString()}</div>
        </td>
        <td class="py-3 px-3">
          <span class="font-bold text-white">${escapeHtml(r.payout_method)}</span>
          <div class="font-mono text-[10px] text-slate-400">${escapeHtml(r.sender_number || '—')}</div>
        </td>
        <td class="py-3 px-3">
          <div class="font-mono font-bold text-amber-300 text-[11px] select-all">${escapeHtml(r.trx_id || 'N/A')}</div>
          ${r.receipt_image_url ? `
            <button onclick="viewRepaymentReceipt('${r.receipt_image_url}', '${r.trx_id}')" class="mt-1 px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold transition flex items-center cursor-pointer">
              <i class="fas fa-image mr-1 text-blue-400"></i> View Proof
            </button>
          ` : '<span class="text-[10px] text-slate-500">No receipt photo</span>'}
        </td>
        <td class="py-3 px-3">
          ${statusBadge}
        </td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end space-x-1.5">
            ${r.status === 'PENDING_REVIEW' ? `
              <button onclick="approveRepayment('${r.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-black uppercase tracking-wider transition shadow flex items-center cursor-pointer" title="Verify & Issue Clearance">
                <i class="fas fa-check-circle mr-1"></i> Verify & Settle
              </button>
              <button onclick="rejectRepayment('${r.id}')" class="px-2 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded text-[10px] font-bold transition flex items-center cursor-pointer" title="Reject Submission">
                <i class="fas fa-times mr-1"></i> Reject
              </button>
            ` : ''}

            ${r.status === 'VERIFIED' ? `
              <button onclick="adminDownloadClearanceCertificate('${r.loan_id}', '${r.id}')" class="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold transition flex items-center cursor-pointer" title="Download Official Clearance Certificate">
                <i class="fas fa-certificate mr-1.5 text-emerald-400"></i> Certificate 📜
              </button>
            ` : ''}

            ${r.status === 'REJECTED' ? `
              <span class="text-[10px] text-slate-400 italic max-w-[120px] truncate block" title="${escapeHtml(r.admin_note || '')}">
                ${escapeHtml(r.admin_note || 'Rejected')}
              </span>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.approveRepayment = async function(id) {
  const adminNote = prompt('Enter audit settlement remarks (or leave as default):', 'Verified & settled by Administrator');
  if (adminNote === null) return; // cancelled

  try {
    const res = await fetch(`/api/admin/repayments/${id}/approve`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_note: adminNote }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    alert(`✅ Repayment approved! Loan marked as REPAID.\nClearance Ref: ${json.clearance_hash}`);
    await fetchRepayments();
    await fetchLoans();
    await fetchMasterSpreadsheet();
    await fetchNotifications();
  } catch (err) {
    alert(`Approval Error: ${err.message}`);
  }
};

window.rejectRepayment = async function(id) {
  const reason = prompt('Please specify the reason for rejection (this will be sent to the client):', 'Transaction proof or TrxID could not be verified');
  if (reason === null) return;

  try {
    const res = await fetch(`/api/admin/repayments/${id}/reject`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    alert('⚠️ Repayment rejected.');
    await fetchRepayments();
    await fetchNotifications();
  } catch (err) {
    alert(`Rejection Error: ${err.message}`);
  }
};

window.viewRepaymentReceipt = function(url, trxId) {
  const modal = document.getElementById('adminRepaymentReceiptModal');
  const img = document.getElementById('adminRepaymentReceiptImg');
  const title = document.getElementById('adminReceiptModalTitle');
  const link = document.getElementById('adminRepaymentReceiptOpenLink');

  if (modal && img) {
    img.src = url;
    if (title) title.textContent = `Payment Receipt Proof — TrxID: ${trxId || 'N/A'}`;
    if (link) link.href = url;
    modal.classList.remove('hidden');
  }
};

window.adminDownloadClearanceCertificate = function(loanId, repaymentId) {
  const loan = LOANS_CACHE.find(l => l.id === loanId) || { id: loanId, amount: 0 };
  const client = loan.client_profiles || { name: 'Client', phone_number: '—' };
  const repayment = REPAYMENTS_CACHE.find(r => r.id === repaymentId) || {};
  window.generateClearanceCertificatePdf(loan, client, repayment);
};

// ─── Phase 10: Multi-Channel Debt Collection & Strike Escalation Desk ──────────
let COLLECTIONS_MATRIX_CACHE = null;
let ACTIVE_COLLECTION_FILTER = 'ALL';
let REMINDER_LOGS_CACHE = [];
let ACTIVE_MANUAL_REMINDER_TARGET = null;

async function fetchCollectionsMatrix(filter = ACTIVE_COLLECTION_FILTER) {
  try {
    const res = await fetch('/api/admin/collections/matrix', { headers: getHeaders() });
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.data) return;

    COLLECTIONS_MATRIX_CACHE = json.data;
    const s = json.data.summary || {};

    // Update KPI Metric Cards
    const collOverdueEl = document.getElementById('collMetricOverdue');
    const collBlockedEl = document.getElementById('collMetricBlocked');
    const collHighRiskEl = document.getElementById('collMetricHighRisk');
    const collDueTodayEl = document.getElementById('collMetricDueToday');
    const collBadgeEl = document.getElementById('collectionOverdueCounterBadge');
    const collDrawerBadgeEl = document.getElementById('collectionOverdueDrawerBadge');

    if (collOverdueEl) collOverdueEl.textContent = `${s.overdue_count || 0} (৳ ${Math.round(s.overdue_amount || 0).toLocaleString()})`;
    if (collBlockedEl) collBlockedEl.textContent = `${s.critical_blocked_count || 0} Clients`;
    if (collHighRiskEl) collHighRiskEl.textContent = `${s.high_risk_count || 0} Clients`;
    if (collDueTodayEl) collDueTodayEl.textContent = `${s.due_today_count || 0} (৳ ${Math.round(s.due_today_amount || 0).toLocaleString()})`;
    if (collBadgeEl) collBadgeEl.textContent = `${s.overdue_count || 0} OVERDUE`;
    if (collDrawerBadgeEl) collDrawerBadgeEl.textContent = s.overdue_count || 0;

    applyCollectionFilter(filter);
  } catch (err) {
    console.error('Failed to fetch collections matrix:', err);
  }
}

function applyCollectionFilter(filter) {
  ACTIVE_COLLECTION_FILTER = filter;
  if (!COLLECTIONS_MATRIX_CACHE || !COLLECTIONS_MATRIX_CACHE.items) return;

  let items = [...COLLECTIONS_MATRIX_CACHE.items];

  if (filter === 'OVERDUE') {
    items = items.filter(i => i.category === 'OVERDUE');
  } else if (filter === 'BLOCKED') {
    items = items.filter(i => i.client.status === 'BLOCKED' || (i.client.strikes_count || 0) >= 3);
  } else if (filter === 'HIGH_RISK') {
    items = items.filter(i => (i.client.strikes_count === 1 || i.client.strikes_count === 2) && i.client.status !== 'BLOCKED');
  } else if (filter === 'DUE_TODAY') {
    items = items.filter(i => i.category === 'DUE_TODAY');
  } else if (filter === 'UPCOMING') {
    items = items.filter(i => i.category === 'UPCOMING' || i.category === 'DUE_SOON');
  }

  // Apply search query if typed
  const query = (document.getElementById('collSearchInput')?.value || '').toLowerCase().trim();
  if (query) {
    items = items.filter(i => 
      (i.client.name || '').toLowerCase().includes(query) ||
      (i.client.phone_number || '').toLowerCase().includes(query) ||
      (i.loan_id || '').toLowerCase().includes(query)
    );
  }

  renderCollectionsTable(items);
}

function renderCollectionsTable(items) {
  const tbody = document.getElementById('collectionsTableBody');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-6 text-center text-slate-500 text-xs">
          <i class="fas fa-check-double text-2xl mb-1.5 block opacity-40 text-emerald-400"></i>
          No borrowers match the current collection filter. All accounts in good order.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const c = item.client;
    const strikes = c.strikes_count || 0;
    const isBlocked = c.status === 'BLOCKED' || strikes >= 3;

    // Strike Meter HTML
    let strikeBadge = '';
    if (isBlocked) {
      strikeBadge = `
        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-950/80 text-rose-300 border border-rose-500/50 flex items-center w-fit shadow-md shadow-rose-950/50">
          <i class="fas fa-ban mr-1 text-rose-400 animate-pulse"></i> 3/3 BLOCKED
        </span>
      `;
    } else if (strikes === 2) {
      strikeBadge = `
        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center w-fit">
          <i class="fas fa-exclamation-triangle mr-1 text-amber-400"></i> 2/3 (High Risk)
        </span>
      `;
    } else if (strikes === 1) {
      strikeBadge = `
        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center w-fit">
          <i class="fas fa-exclamation-circle mr-1 text-yellow-400"></i> 1/3 (Warning)
        </span>
      `;
    } else {
      strikeBadge = `
        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center w-fit">
          <i class="fas fa-check mr-1 text-emerald-400"></i> 0/3 (Clean)
        </span>
      `;
    }

    // Schedule & Status
    let scheduleHtml = '';
    if (item.category === 'OVERDUE') {
      scheduleHtml = `
        <div class="font-bold text-rose-400 font-mono">${item.deadline_date}</div>
        <span class="text-[10px] font-black uppercase text-rose-300 bg-rose-500/20 px-1.5 py-0.2 rounded border border-rose-500/30 flex items-center w-fit mt-0.5">
          <i class="fas fa-fire mr-1 text-rose-400"></i> ${item.days_overdue} Days Overdue
        </span>
      `;
    } else if (item.category === 'DUE_TODAY') {
      scheduleHtml = `
        <div class="font-bold text-yellow-300 font-mono">${item.deadline_date}</div>
        <span class="text-[10px] font-bold uppercase text-yellow-300 bg-yellow-500/20 px-1.5 py-0.2 rounded border border-yellow-500/30 flex items-center w-fit mt-0.5">
          <i class="fas fa-clock mr-1 text-yellow-400 animate-spin"></i> Due Today!
        </span>
      `;
    } else {
      scheduleHtml = `
        <div class="font-bold text-slate-300 font-mono">${item.deadline_date}</div>
        <div class="text-[10px] text-slate-400 mt-0.5">In ${item.days_diff} days</div>
      `;
    }

    // Last Reminded
    let lastRemindedHtml = '<span class="text-slate-500 text-[10px] italic">Not contacted</span>';
    if (item.last_reminder) {
      const lrDate = new Date(item.last_reminder.dispatched_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const lrChannel = item.last_reminder.channel || 'TG/SMS';
      lastRemindedHtml = `
        <div class="text-[11px] font-mono text-slate-300 font-bold flex items-center">
          <i class="fas fa-paper-plane mr-1 text-cyan-400 text-[9px]"></i> ${lrChannel}
        </div>
        <div class="text-[10px] text-slate-400">${lrDate} (${item.last_reminder.template_type})</div>
      `;
    }

    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] text-xs transition">
        <td class="py-3 px-3">
          <div class="font-bold text-white">${escapeHtml(c.name)}</div>
          <div class="font-mono text-[11px] text-emerald-400">${escapeHtml(c.phone_number || '—')}</div>
          <div class="text-[10px] text-slate-500 font-mono">ID: ${c.id.slice(0, 8)}</div>
        </td>
        <td class="py-3 px-3">
          <div class="font-black text-white font-mono text-sm">৳ ${item.amount.toLocaleString()}</div>
          <div class="text-[10px] text-slate-400 font-mono">Ref: #${item.loan_id.slice(0, 8)}</div>
        </td>
        <td class="py-3 px-3">
          ${scheduleHtml}
        </td>
        <td class="py-3 px-3">
          ${strikeBadge}
        </td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}">
            ${c.status}
          </span>
        </td>
        <td class="py-3 px-3">
          ${lastRemindedHtml}
        </td>
        <td class="py-3 px-3 text-right">
          <div class="flex items-center justify-end flex-wrap gap-1.5">
            <!-- Manual Reminder Button -->
            <button onclick="openManualReminderModal('${c.id}', '${item.loan_id}')" class="px-2 py-1 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded text-[10px] font-bold transition flex items-center cursor-pointer shadow" title="Send Multi-Channel Reminder">
              <i class="fas fa-bullhorn mr-1"></i> Remind
            </button>

            <!-- Increment Strike Button -->
            <button onclick="adjustClientStrikes('${c.id}', 'INCREMENT')" class="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold transition flex items-center cursor-pointer" title="Add +1 Strike Penalty">
              <i class="fas fa-plus mr-0.5"></i> Strike
            </button>

            <!-- Reset Strikes Button -->
            ${strikes > 0 ? `
              <button onclick="adjustClientStrikes('${c.id}', 'RESET')" class="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold transition flex items-center cursor-pointer" title="Amnesty: Clear Strikes to 0">
                <i class="fas fa-undo"></i>
              </button>
            ` : ''}

            <!-- Blacklist / Unblock Toggle Button -->
            <button onclick="toggleClientBlacklist('${c.id}', '${c.status}')" class="px-2 py-1 ${isBlocked ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white' : 'bg-rose-600/80 hover:bg-rose-600 text-white'} rounded text-[10px] font-bold transition flex items-center cursor-pointer" title="${isBlocked ? 'Unblock Borrower Account' : 'Blacklist & Lock Account'}">
              <i class="fas ${isBlocked ? 'fa-unlock' : 'fa-ban'} mr-1"></i> ${isBlocked ? 'Unblock' : 'Blacklist'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── Manual Interventions & Automated Cycle Trigger ───────────────────────────
async function runCollectionCycleNow() {
  const btn = document.getElementById('btnRunCollectionCycle');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Running Cycle...';
  }

  try {
    const res = await fetch('/api/admin/collections/run-cycle', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: false, notifyChannels: 'BOTH' }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    const r = json.report || {};
    alert(
      `⚡ Automated Collection & Strike Escalation Complete!\n\n` +
      `• Active Loans Evaluated : ${r.total_active_loans}\n` +
      `• Overdue Evaluated       : ${r.overdue_processed}\n` +
      `• Strikes Issued          : ${r.strikes_issued}\n` +
      `• Clients Auto-Blocked    : ${r.clients_blocked}\n` +
      `• Reminders Dispatched    : ${r.reminders_sent?.total || 0}`
    );

    await fetchCollectionsMatrix();
    await fetchReminderLogs();
    await fetchClients();
  } catch (err) {
    alert(`Collection Run Error: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-bolt text-amber-400 mr-1.5"></i> Run Collection Cycle Now';
    }
  }
}

window.adjustClientStrikes = async function(clientId, action, value = 1) {
  const reason = prompt(`Enter reason for strike adjustment (${action}):`, 'Administrative compliance review');
  if (reason === null) return;

  try {
    const res = await fetch('/api/admin/collections/strikes', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, action, value, reason }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    alert(`✅ Client strike updated: ${json.result.previous_strikes} → ${json.result.new_strikes} (Status: ${json.result.status})`);
    await fetchCollectionsMatrix();
    await fetchClients();
  } catch (err) {
    alert(`Strike Update Error: ${err.message}`);
  }
};

window.toggleClientBlacklist = async function(clientId, currentStatus) {
  const newStatus = currentStatus === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
  const confirmMsg = newStatus === 'BLOCKED'
    ? '⚠️ Are you sure you want to BLACKLIST and lock this client account? They will be unable to borrow or request loans.'
    : 'Are you sure you want to UNBLOCK this client and restore borrowing status?';

  if (!confirm(confirmMsg)) return;
  const reason = prompt('Specify reason for blacklist status change:', 'Administrative risk control');

  try {
    const res = await fetch('/api/admin/collections/blacklist', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, status: newStatus, reason }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    alert(`Client status updated to ${newStatus}.`);
    await fetchCollectionsMatrix();
    await fetchClients();
  } catch (err) {
    alert(`Blacklist Error: ${err.message}`);
  }
};

// ─── Manual Reminder Modal Handlers ───────────────────────────────────────────
window.openManualReminderModal = function(clientId, loanId) {
  if (!COLLECTIONS_MATRIX_CACHE) return;
  const item = COLLECTIONS_MATRIX_CACHE.items.find(i => i.client.id === clientId && i.loan_id === loanId)
    || COLLECTIONS_MATRIX_CACHE.items.find(i => i.client.id === clientId);

  if (!item) {
    alert('Borrower details not found.');
    return;
  }

  ACTIVE_MANUAL_REMINDER_TARGET = item;

  document.getElementById('modalTargetClientId').value = clientId;
  document.getElementById('modalTargetLoanId').value = loanId || item.loan_id;
  document.getElementById('modalBorrowerName').textContent = item.client.name;
  document.getElementById('modalBorrowerPhone').textContent = item.client.phone_number || 'N/A';
  document.getElementById('modalBorrowerLoanInfo').textContent = `৳ ${item.amount.toLocaleString()} (Due: ${item.deadline_date})`;
  document.getElementById('modalBorrowerStrikes').textContent = `${item.client.strikes_count || 0} / 3 strikes (${item.client.status})`;

  // Pre-fill template text
  updateManualReminderTemplateText();

  document.getElementById('adminManualReminderModal')?.classList.remove('hidden');
};

function updateManualReminderTemplateText() {
  if (!ACTIVE_MANUAL_REMINDER_TARGET) return;
  const item = ACTIVE_MANUAL_REMINDER_TARGET;
  const templateType = document.getElementById('modalTemplateSelector')?.value || 'OVERDUE_STRIKE';
  const textArea = document.getElementById('modalReminderCustomText');
  if (!textArea) return;

  const clientName = item.client.name;
  const amount = `৳${item.amount.toLocaleString()}`;
  const deadline = item.deadline_date;
  const strikes = item.client.strikes_count || 0;

  switch (templateType) {
    case 'PRE_DUE_3D':
      textArea.value = `⏰ [SYM LOAN Reminder] Dear ${clientName}, your loan of ${amount} is due in 3 days on ${deadline}. Please prepare repayment via bKash/Nagad/Rocket/Bank to maintain your clean 5-star standing. Portal: https://symloan.best-travel.ltd`;
      break;
    case 'PRE_DUE_1D':
      textArea.value = `⚠️ [SYM LOAN Urgent Notice] Dear ${clientName}, your loan of ${amount} is due TOMORROW (${deadline})! Settle timely to prevent penalty strikes and protect your borrowing privileges. Portal: https://symloan.best-travel.ltd`;
      break;
    case 'DUE_TODAY':
      textArea.value = `🚨 [SYM LOAN FINAL CALL] Dear ${clientName}, your loan of ${amount} is DUE TODAY (${deadline})! Please repay immediately via our portal or official MFS accounts to avoid automatic overdue strikes. Portal: https://symloan.best-travel.ltd`;
      break;
    case 'OVERDUE_STRIKE':
      textArea.value = `🔴 [SYM LOAN OVERDUE ALERT] Strike #${strikes || 1} has been issued to ${clientName}! Your loan of ${amount} is OVERDUE (due: ${deadline}). Accumulating 3 strikes results in PERMANENT ACCOUNT BLACKLIST & legal collection actions. Settle immediately: https://symloan.best-travel.ltd`;
      break;
    case 'ACCOUNT_BLOCKED':
      textArea.value = `⛔ [SYM LOAN ACCOUNT LOCKED] ${clientName}, your account is now PERMANENTLY BLOCKED due to reaching 3 Overdue Strikes on loan ${amount}. Contact recovery desk immediately to settle outstanding debts: https://symloan.best-travel.ltd`;
      break;
    case 'CUSTOM':
      textArea.value = `📢 [SYM LOAN Collection Notice] Dear ${clientName}, this is an urgent reminder regarding your active loan of ${amount} (Due: ${deadline}). Please visit https://symloan.best-travel.ltd to settle your payment.`;
      break;
  }
}

async function sendManualReminder() {
  const clientId = document.getElementById('modalTargetClientId')?.value;
  const loanId = document.getElementById('modalTargetLoanId')?.value;
  const channel = document.getElementById('modalReminderChannel')?.value || 'BOTH';
  const templateType = document.getElementById('modalTemplateSelector')?.value || 'MANUAL_DUNNING';
  const customText = document.getElementById('modalReminderCustomText')?.value.trim();

  if (!clientId) return;

  const btn = document.getElementById('btnConfirmSendReminder');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Dispatching...';
  }

  try {
    const res = await fetch('/api/admin/collections/remind', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        loan_id: loanId,
        channel,
        template_type: templateType,
        custom_text: customText,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    alert(`✅ Reminder successfully dispatched via ${channel}!`);
    document.getElementById('adminManualReminderModal')?.classList.add('hidden');

    await fetchCollectionsMatrix();
    await fetchReminderLogs();
  } catch (err) {
    alert(`Reminder Dispatch Error: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane mr-1.5"></i> Dispatch Reminder Now';
    }
  }
}

// ─── Reminder Dispatch Audit Logs ─────────────────────────────────────────────
async function fetchReminderLogs() {
  try {
    const res = await fetch('/api/admin/collections/logs?limit=30', { headers: getHeaders() });
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success) return;

    REMINDER_LOGS_CACHE = json.logs || [];
    const stats = json.stats || {};

    const remindersTodayEl = document.getElementById('collMetricRemindersToday');
    const logsCountText = document.getElementById('reminderLogsCountText');

    if (remindersTodayEl) remindersTodayEl.textContent = `${stats.dispatched_today || 0} Sent`;
    if (logsCountText) logsCountText.textContent = `${json.count || 0} total logged`;

    renderReminderLogs(REMINDER_LOGS_CACHE);
  } catch (err) {
    console.error('Failed to fetch reminder logs:', err);
  }
}

function renderReminderLogs(logs) {
  const tbody = document.getElementById('reminderLogsTableBody');
  if (!tbody) return;

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500">No dispatches logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(l => {
    const timeFormatted = new Date(l.dispatched_at).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let statusBadge = l.status === 'DELIVERED' || l.status === 'SIMULATED_DELIVERED'
      ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300">Delivered</span>`
      : `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/20 text-rose-300">Failed</span>`;

    return `
      <tr class="border-b border-white/5 text-[11px] hover:bg-white/[0.02]">
        <td class="py-2 px-2.5 font-mono text-slate-400">${timeFormatted}</td>
        <td class="py-2 px-2.5">
          <div class="font-bold text-white">${escapeHtml(l.client_name)}</div>
          <div class="font-mono text-[10px] text-emerald-400">${escapeHtml(l.client_phone || '—')}</div>
        </td>
        <td class="py-2 px-2.5 font-mono text-cyan-400 font-bold">${l.channel}</td>
        <td class="py-2 px-2.5 font-mono text-amber-300 text-[10px]">${l.template_type}</td>
        <td class="py-2 px-2.5">${statusBadge}</td>
        <td class="py-2 px-2.5 font-mono text-slate-400 text-[10px]">${l.trigger}</td>
        <td class="py-2 px-2.5 text-slate-300 max-w-xs truncate" title="${escapeHtml(l.message_text || '')}">${escapeHtml(l.message_text || '—')}</td>
      </tr>
    `;
  }).join('');
}

// ─── KYC Identity Verification Admin Desk ────────────────────────────────────
async function fetchKycList() {
  if (!DOM.kycTableBody) return;
  try {
    const res = await fetch('/api/admin/kyc/list', { headers: getHeaders() });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    KYC_CACHE = json.data || json.profiles || [];
    const pendingCount = KYC_CACHE.filter(k => (k.kyc_status || 'UNSUBMITTED') === 'PENDING').length;

    if (DOM.kycPendingCounterBadge) {
      DOM.kycPendingCounterBadge.textContent = `${pendingCount} PENDING`;
    }
    if (DOM.kycPendingBadge) {
      DOM.kycPendingBadge.textContent = `${pendingCount}`;
      if (pendingCount > 0) {
        DOM.kycPendingBadge.classList.remove('hidden');
      } else {
        DOM.kycPendingBadge.classList.add('hidden');
      }
    }

    renderKycTable(KYC_CACHE);
  } catch (err) {
    if (DOM.kycTableBody) {
      DOM.kycTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="p-6 text-center text-rose-400 text-xs">
            <i class="fas fa-exclamation-triangle mr-1.5"></i> Failed to load KYC submissions: ${err.message}
          </td>
        </tr>
      `;
    }
  }
}

function renderKycTable(records) {
  if (!DOM.kycTableBody) return;
  if (!records || records.length === 0) {
    DOM.kycTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="p-6 text-center text-slate-500 text-xs">
          <i class="fas fa-inbox text-lg mb-1 block opacity-40"></i> No client KYC profiles submitted yet.
        </td>
      </tr>
    `;
    return;
  }

  DOM.kycTableBody.innerHTML = records.map(r => {
    const status = (r.kyc_status || 'UNSUBMITTED').toUpperCase();
    let badgeClass = 'bg-slate-700/50 text-slate-400 border-slate-600';
    let badgeIcon = '<i class="fas fa-file-alt mr-1"></i>';
    let badgeText = status;

    if (status === 'VERIFIED') {
      badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      badgeIcon = '<i class="fas fa-check-circle mr-1"></i>';
      badgeText = 'APPROVED';
    } else if (status === 'PENDING') {
      badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      badgeIcon = '<i class="fas fa-hourglass-half mr-1"></i>';
      badgeText = 'PENDING';
    } else if (status === 'REJECTED') {
      badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      badgeIcon = '<i class="fas fa-times-circle mr-1"></i>';
      badgeText = 'REJECTED';
    }

    const hasSelfie = !!r.live_selfie_url;
    const selfieHtml = hasSelfie
      ? `<div class="flex items-center space-x-2">
           <img src="${r.live_selfie_url}" class="w-8 h-8 rounded-full object-cover border border-emerald-500/40 shadow" alt="Selfie">
           <span class="text-[10px] font-mono text-emerald-400 font-bold">Captured</span>
         </div>`
      : `<span class="text-slate-500 text-xs">—</span>`;

    const emailDisplay = r.email 
      ? `<span class="font-mono text-slate-300">${r.email}</span> ${r.email_verified ? '<span class="text-emerald-400 text-xs" title="Verified">✅</span>' : '<span class="text-amber-400 text-[10px]">(Unverified)</span>'}`
      : `<span class="text-slate-500 text-xs">—</span>`;

    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] transition">
        <td class="py-3 px-4">
          <div class="font-bold text-white text-xs">${r.name || 'Unnamed Client'}</div>
          <div class="text-[11px] font-mono text-slate-400 flex items-center mt-0.5">
            <i class="fas fa-lock text-[9px] mr-1 text-slate-500"></i> ${r.phone || '—'}
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="text-xs font-semibold text-slate-200">${r.name || '—'}</div>
          <div class="text-[10px] font-mono text-slate-400">DOB: ${r.dob || '—'}</div>
        </td>
        <td class="py-3 px-4">
          <span class="font-mono text-xs font-bold text-amber-300">${r.nid_number || '—'}</span>
        </td>
        <td class="py-3 px-4 text-xs">
          ${emailDisplay}
        </td>
        <td class="py-3 px-4">
          ${selfieHtml}
        </td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeClass} inline-flex items-center">
            ${badgeIcon} ${badgeText}
          </span>
        </td>
        <td class="py-3 px-4 text-right">
          <button onclick="window.openKycInspection('${r.client_id}')" class="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center ml-auto cursor-pointer">
            <i class="fas fa-search-plus mr-1.5"></i> Inspect & Match
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.openKycInspection = async function(clientId) {
  let record = KYC_CACHE.find(k => k.client_id === clientId);

  try {
    const res = await fetch(`/api/admin/kyc/${clientId}`, { headers: getHeaders() });
    const json = await res.json();
    if (res.ok && json.success && json.kyc) {
      record = { ...json.kyc, client_id: clientId, phone: json.client?.phone_number || json.kyc.phone };
    }
  } catch (err) {
    console.warn('Direct fetch failed, fallback to cache:', err);
  }

  if (!record) {
    alert('Client KYC record not found.');
    return;
  }

  ACTIVE_INSPECT_KYC = record;

  const status = (record.status || record.kyc_status || 'UNSUBMITTED').toUpperCase();
  if (DOM.inspectKycStatusPill) {
    DOM.inspectKycStatusPill.textContent = status;
    DOM.inspectKycStatusPill.className = status === 'VERIFIED'
      ? 'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
      : status === 'REJECTED'
      ? 'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30'
      : 'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30';
  }

  // Documents
  if (DOM.inspectNidFrontImg) DOM.inspectNidFrontImg.src = record.nid_front_url || '';
  if (DOM.inspectNidFrontLink) DOM.inspectNidFrontLink.href = record.nid_front_url || '#';
  if (DOM.inspectNidFrontStatus) {
    DOM.inspectNidFrontStatus.textContent = record.nid_front_url ? 'UPLOADED' : 'MISSING';
    DOM.inspectNidFrontStatus.className = record.nid_front_url ? 'text-[10px] font-mono text-emerald-400 font-bold' : 'text-[10px] font-mono text-rose-400';
  }

  if (DOM.inspectNidBackImg) DOM.inspectNidBackImg.src = record.nid_back_url || '';
  if (DOM.inspectNidBackLink) DOM.inspectNidBackLink.href = record.nid_back_url || '#';
  if (DOM.inspectNidBackStatus) {
    DOM.inspectNidBackStatus.textContent = record.nid_back_url ? 'UPLOADED' : 'MISSING';
    DOM.inspectNidBackStatus.className = record.nid_back_url ? 'text-[10px] font-mono text-emerald-400 font-bold' : 'text-[10px] font-mono text-rose-400';
  }

  if (DOM.inspectSelfieImg) DOM.inspectSelfieImg.src = record.live_selfie_url || '';
  if (DOM.inspectSelfieLink) DOM.inspectSelfieLink.href = record.live_selfie_url || '#';

  // Credentials
  if (DOM.inspectPhone) DOM.inspectPhone.innerHTML = `<i class="fas fa-lock text-[10px] mr-1 text-slate-500"></i> ${record.phone || '—'}`;
  if (DOM.inspectFullName) DOM.inspectFullName.textContent = record.full_name || record.name || '—';
  if (DOM.inspectDob) DOM.inspectDob.textContent = record.dob || '—';
  if (DOM.inspectNidNumber) DOM.inspectNidNumber.textContent = record.nid_number || '—';
  if (DOM.inspectEmail) {
    DOM.inspectEmail.innerHTML = `${record.email || '—'} ${record.email_verified ? '<span class="text-emerald-400 font-bold">(Verified ✅)</span>' : '<span class="text-amber-400 font-bold">(Unverified)</span>'}`;
  }
  if (DOM.inspectSubmittedAt) {
    DOM.inspectSubmittedAt.textContent = record.submitted_at ? new Date(record.submitted_at).toLocaleString() : '—';
  }
  if (DOM.inspectRejectReasonInput) {
    DOM.inspectRejectReasonInput.value = record.rejection_reason || '';
  }
  if (DOM.inspectFeedback) {
    DOM.inspectFeedback.className = 'hidden text-xs font-bold p-2.5 rounded-xl';
    DOM.inspectFeedback.textContent = '';
  }

  if (DOM.kycInspectModal) {
    DOM.kycInspectModal.classList.remove('hidden');
  }
};

async function submitKycDecision(decision, reason) {
  if (!ACTIVE_INSPECT_KYC) return;
  const clientId = ACTIVE_INSPECT_KYC.client_id;
  if (!clientId) return;

  if (decision === 'REJECTED' && (!reason || !reason.trim())) {
    if (DOM.inspectFeedback) {
      DOM.inspectFeedback.className = 'text-xs font-bold p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 block';
      DOM.inspectFeedback.textContent = 'Please provide a rejection reason so the client knows what to fix.';
    }
    DOM.inspectRejectReasonInput?.focus();
    return;
  }

  const approveBtn = DOM.approveKycBtn;
  const rejectBtn = DOM.rejectKycBtn;
  const feedback = DOM.inspectFeedback;

  if (approveBtn) approveBtn.disabled = true;
  if (rejectBtn) rejectBtn.disabled = true;
  if (feedback) {
    feedback.className = 'text-xs font-bold p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 block';
    feedback.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Updating KYC decision...';
  }

  try {
    const res = await fetch(`/api/admin/kyc/${clientId}/decision`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason: reason || '' })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    if (feedback) {
      feedback.className = 'text-xs font-bold p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 block';
      feedback.textContent = `✅ Success: KYC ${decision === 'VERIFIED' ? 'Approved & Loans Unlocked' : 'Rejected'}`;
    }

    await fetchKycList();
    await fetchClients();

    setTimeout(() => {
      DOM.kycInspectModal?.classList.add('hidden');
    }, 1200);
  } catch (err) {
    if (feedback) {
      feedback.className = 'text-xs font-bold p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 block';
      feedback.textContent = `Error: ${err.message}`;
    }
  } finally {
    if (approveBtn) approveBtn.disabled = false;
    if (rejectBtn) rejectBtn.disabled = false;
  }
}

// ─── Setup Event Listeners ────────────────────────────────────────────────────
function setupEvents() {
  DOM.adminKeyInput.addEventListener('change', () => {
    ADMIN_KEY = DOM.adminKeyInput.value.trim();
    sessionStorage.setItem('sep_admin_key', ADMIN_KEY);
    localStorage.setItem('sep_admin_key', ADMIN_KEY);
    loadAllData();
  });

  // Seamless Admin -> Client Portal Navigation Handlers
  const handleClientPortalNav = (e) => {
    localStorage.setItem('sep_admin_key', ADMIN_KEY);
    sessionStorage.setItem('sep_admin_key', ADMIN_KEY);
    localStorage.setItem('sep_admin_mode', 'true');
    const targetUrl = `/?admin_mode=true&admin_key=${encodeURIComponent(ADMIN_KEY)}&t=${Date.now()}`;
    if (e.currentTarget) {
      e.currentTarget.href = targetUrl;
    }
  };
  document.getElementById('openClientPortalBtn')?.addEventListener('click', handleClientPortalNav);
  document.getElementById('drawerOpenClientPortalBtn')?.addEventListener('click', handleClientPortalNav);

  DOM.refreshLoansBtn.addEventListener('click', () => {
    fetchLoans();
    fetchClients();
    fetchHistoricalLedgers();
    fetchMasterSpreadsheet();
    fetchKycList();
    fetchRepayments();
  });

  // Repayments Desk Events (Phase 9)
  document.getElementById('refreshRepaymentsBtn')?.addEventListener('click', () => {
    fetchRepayments(ACTIVE_REPAYMENT_FILTER);
  });

  document.querySelectorAll('.rep-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.rep-filter-btn').forEach(b => {
        b.className = 'rep-filter-btn px-2.5 py-1 rounded-md font-bold transition text-slate-400 hover:text-white cursor-pointer';
      });
      e.currentTarget.className = 'rep-filter-btn px-2.5 py-1 rounded-md font-bold transition bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-pointer';
      ACTIVE_REPAYMENT_FILTER = e.currentTarget.dataset.status;
      fetchRepayments(ACTIVE_REPAYMENT_FILTER);
    });
  });

  document.getElementById('closeAdminRepaymentReceiptBtn')?.addEventListener('click', () => {
    document.getElementById('adminRepaymentReceiptModal')?.classList.add('hidden');
  });

  // Debt Collection & Strike Management Desk Events (Phase 10)
  document.getElementById('refreshCollectionsBtn')?.addEventListener('click', () => {
    fetchCollectionsMatrix(ACTIVE_COLLECTION_FILTER);
  });

  document.getElementById('btnRunCollectionCycle')?.addEventListener('click', () => {
    runCollectionCycleNow();
  });

  document.querySelectorAll('.coll-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.coll-filter-btn').forEach(b => {
        b.className = 'coll-filter-btn px-2.5 py-1 rounded-md font-bold transition text-slate-400 hover:text-white cursor-pointer';
      });
      e.currentTarget.className = 'coll-filter-btn px-2.5 py-1 rounded-md font-bold transition bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer';
      applyCollectionFilter(e.currentTarget.dataset.filter);
    });
  });

  document.getElementById('collSearchInput')?.addEventListener('input', () => {
    applyCollectionFilter(ACTIVE_COLLECTION_FILTER);
  });

  document.getElementById('toggleReminderLogsBtn')?.addEventListener('click', () => {
    const container = document.getElementById('reminderLogsContainer');
    const text = document.getElementById('toggleReminderLogsText');
    if (!container) return;
    const isHidden = container.classList.contains('hidden');
    if (isHidden) {
      container.classList.remove('hidden');
      if (text) text.textContent = 'Hide Reminders Log';
      fetchReminderLogs();
    } else {
      container.classList.add('hidden');
      if (text) text.textContent = 'View Reminders Log';
    }
  });

  // Manual Reminder Modal
  document.getElementById('closeManualReminderModalBtn')?.addEventListener('click', () => {
    document.getElementById('adminManualReminderModal')?.classList.add('hidden');
  });
  document.getElementById('btnCancelManualReminder')?.addEventListener('click', () => {
    document.getElementById('adminManualReminderModal')?.classList.add('hidden');
  });
  document.getElementById('modalTemplateSelector')?.addEventListener('change', () => {
    updateManualReminderTemplateText();
  });
  document.getElementById('btnConfirmSendReminder')?.addEventListener('click', () => {
    sendManualReminder();
  });

  DOM.closeModalBtn.addEventListener('click', () => {
    DOM.disburseModal.classList.add('hidden');
  });

  DOM.closeReceiptModalBtn.addEventListener('click', () => {
    DOM.receiptModal.classList.add('hidden');
  });

  // Method selector click
  document.querySelectorAll('input[name="payout_method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateMethodSelectionStyle(e.target.value);
    });
  });

  // Disbursement Form Submit (Multipart/Form-Data)
  DOM.disbursementForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ACTIVE_DISBURSE_LOAN) return;

    const payout_method = document.querySelector('input[name="payout_method"]:checked').value;
    const destination_number = DOM.modalMfsNumber.value.trim();
    const trx_id = DOM.modalTrxId.value.trim();
    const fee_handling = document.querySelector('input[name="fee_handling"]:checked')?.value || 'INCLUDED';
    const admin_note = DOM.modalAdminNote.value.trim();
    const receiptFile = DOM.modalReceiptFile.files[0];

    if ((payout_method === 'BKASH' || payout_method === 'NAGAD') && !trx_id) {
      alert('Please provide the MFS Transaction ID (TrxID) for verification.');
      DOM.modalTrxId.focus();
      return;
    }

    DOM.confirmDisburseBtn.disabled = true;
    DOM.confirmDisburseBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing Disbursement...';

    try {
      const formData = new FormData();
      formData.append('decision', 'ACCEPTED');
      formData.append('payout_method', payout_method);
      formData.append('destination_number', destination_number);
      formData.append('trx_id', trx_id);
      formData.append('fee_handling', fee_handling);
      formData.append('admin_note', admin_note);
      if (receiptFile) {
        formData.append('receipt_image', receiptFile);
      }

      const res = await fetch(`/api/admin/loans/${ACTIVE_DISBURSE_LOAN.id}/decision`, {
        method: 'POST',
        headers: getHeaders(), // browser sets multipart boundary automatically
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      alert(`✅ Loan disbursed successfully via ${payout_method}!`);
      DOM.disburseModal.classList.add('hidden');
      await fetchLoans();
    } catch (err) {
      alert(`Disbursement Error: ${err.message}`);
    } finally {
      DOM.confirmDisburseBtn.disabled = false;
      DOM.confirmDisburseBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Confirm Approval & Disburse';
    }
  });

  // Google Keep Note Importer
  DOM.importNoteBtn.addEventListener('click', async () => {
    const raw_text = DOM.rawNoteInput.value.trim();
    if (!raw_text) {
      alert('Please paste some note lines to import.');
      return;
    }

    DOM.importNoteBtn.disabled = true;
    DOM.importNoteBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Parsing...';

    try {
      const res = await fetch('/api/admin/historical-ledgers/import-note', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      alert(json.message);
      DOM.rawNoteInput.value = '';
      await fetchHistoricalLedgers();
    } catch (err) {
      alert(`Import error: ${err.message}`);
    } finally {
      DOM.importNoteBtn.disabled = false;
      DOM.importNoteBtn.innerHTML = '<i class="fas fa-magic mr-1.5"></i> Parse & Import to Ledger';
    }
  });

  // Global Settings Form
  DOM.globalForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const min_amount = parseFloat(DOM.globalMinAmount.value);
    const max_amount = parseFloat(DOM.globalMaxAmount.value);
    const min_duration_days = parseInt(DOM.globalMinDays.value, 10);
    const max_duration_days = parseInt(DOM.globalMaxDays.value, 10);

    try {
      const res = await fetch('/api/admin/settings/global', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_amount, max_amount, min_duration_days, max_duration_days }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      DOM.globalFeedback.className = 'p-3 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30';
      DOM.globalFeedback.textContent = '✅ Global limits updated successfully!';
      DOM.globalFeedback.classList.remove('hidden');
      setTimeout(() => DOM.globalFeedback.classList.add('hidden'), 5000);
      await fetchClients();
    } catch (err) {
      DOM.globalFeedback.className = 'p-3 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30';
      DOM.globalFeedback.textContent = `❌ ${err.message}`;
      DOM.globalFeedback.classList.remove('hidden');
    }
  });

  // Client selector
  DOM.clientSelector?.addEventListener('change', (e) => {
    const clientId = e.target.value;
    if (!clientId) {
      DOM.overridePanel?.classList.add('hidden');
      return;
    }
    const client = CLIENTS_CACHE.find(c => c.id === clientId);
    if (!client) return;

    DOM.clientSelectedName.textContent = client.name;
    DOM.clientSelectedId.textContent = `${client.phone_number} • ID: ${client.id}`;
    const override = SETTINGS_CACHE?.client_overrides?.[clientId] || client.active_limits;

    DOM.overrideMinAmount.value = override.min_amount;
    DOM.overrideMaxAmount.value = override.max_amount;
    DOM.overrideMinDays.value = override.min_duration_days;
    DOM.overrideMaxDays.value = override.max_duration_days;
    DOM.overrideNote.value = override.note || '';
    DOM.overridePanel?.classList.remove('hidden');
  });

  // Client Override Submit
  DOM.clientOverrideForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = DOM.clientSelector?.value;
    if (!clientId) return;

    try {
      const res = await fetch(`/api/admin/settings/client/${clientId}`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_amount: parseFloat(DOM.overrideMinAmount.value),
          max_amount: parseFloat(DOM.overrideMaxAmount.value),
          min_duration_days: parseInt(DOM.overrideMinDays.value, 10),
          max_duration_days: parseInt(DOM.overrideMaxDays.value, 10),
          note: DOM.overrideNote.value.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      DOM.overrideFeedback.className = 'p-3 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30';
      DOM.overrideFeedback.textContent = `✅ Custom limits applied for ${json.client.name}!`;
      DOM.overrideFeedback.classList.remove('hidden');
      setTimeout(() => DOM.overrideFeedback.classList.add('hidden'), 5000);
      await fetchSettings();
      await fetchClients();
    } catch (err) {
      DOM.overrideFeedback.className = 'p-3 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30';
      DOM.overrideFeedback.textContent = `❌ ${err.message}`;
      DOM.overrideFeedback.classList.remove('hidden');
    }
  });

  // Reset Override
  DOM.resetOverrideBtn?.addEventListener('click', async () => {
    const clientId = DOM.clientSelector?.value;
    if (!clientId) return;
    if (!confirm('Remove custom limits for this client?')) return;

    try {
      const res = await fetch(`/api/admin/settings/client/${clientId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      alert('Custom override removed.');
      await fetchSettings();
      await fetchClients();
      DOM.overridePanel.classList.add('hidden');
      DOM.clientSelector.value = '';
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  });

  // ─── Hamburger Drawer Events ───
  if (DOM.hamburgerBtn) {
    DOM.hamburgerBtn.addEventListener('click', () => {
      DOM.adminDrawer?.classList.remove('-translate-x-full');
      DOM.drawerBackdrop?.classList.remove('hidden');
    });
  }

  const closeDrawer = () => {
    DOM.adminDrawer?.classList.add('-translate-x-full');
    DOM.drawerBackdrop?.classList.add('hidden');
  };

  if (DOM.closeDrawerBtn) DOM.closeDrawerBtn.addEventListener('click', closeDrawer);
  if (DOM.drawerBackdrop) DOM.drawerBackdrop.addEventListener('click', closeDrawer);
  document.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // ─── Adjust Cash Events ───
  if (DOM.closeAdjustCashModalBtn) {
    DOM.closeAdjustCashModalBtn.addEventListener('click', () => {
      DOM.adjustCashModal?.classList.add('hidden');
    });
  }

  if (DOM.adjustAmount) {
    DOM.adjustAmount.addEventListener('input', updateProjectedNewBalance);
  }

  document.querySelectorAll('input[name="adjustType"]').forEach(r => {
    r.addEventListener('change', updateProjectedNewBalance);
  });

  if (DOM.adjustCashForm) {
    DOM.adjustCashForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!ACTIVE_ADJUST_RECORD) return;

      const type = document.querySelector('input[name="adjustType"]:checked')?.value || 'ADD';
      const amount = parseFloat(DOM.adjustAmount.value);
      const memo = DOM.adjustMemo.value.trim();

      DOM.submitAdjustBtn.disabled = true;
      DOM.submitAdjustBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving...';

      try {
        const res = await fetch(`/api/admin/historical-ledgers/${ACTIVE_ADJUST_RECORD.id}/adjust-cash`, {
          method: 'POST',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, amount, memo }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message);

        alert(`✅ Cash customized successfully! New balance: ৳${parseFloat(json.ledger.historical_balance).toLocaleString()}`);
        DOM.adjustCashModal?.classList.add('hidden');
        await fetchHistoricalLedgers();
        await fetchMasterSpreadsheet();
      } catch (err) {
        alert(`Adjustment Error: ${err.message}`);
      } finally {
        DOM.submitAdjustBtn.disabled = false;
        DOM.submitAdjustBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Save Cash Adjustment';
      }
    });
  }

  // ─── Spreadsheet Search & Export ───
  if (DOM.spreadsheetSearch) {
    DOM.spreadsheetSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        renderSpreadsheetTable(SPREADSHEET_CACHE);
      } else {
        const filtered = SPREADSHEET_CACHE.filter(r => 
          (r.name && r.name.toLowerCase().includes(q)) || 
          (r.phone_number && r.phone_number.includes(q)) ||
          (r.status && r.status.toLowerCase().includes(q))
        );
        renderSpreadsheetTable(filtered);
      }
    });
  }

  if (DOM.downloadSpreadsheetCsvBtn) {
    DOM.downloadSpreadsheetCsvBtn.addEventListener('click', downloadSpreadsheetCsv);
  }

  if (DOM.downloadSpreadsheetXlsxBtn) {
    DOM.downloadSpreadsheetXlsxBtn.addEventListener('click', downloadSpreadsheetXlsx);
  }

  // ─── 3-Option Admin Login Modal & Tab Switching ────────────────────────────
  const openLoginModal = () => {
    DOM.adminLoginModal?.classList.remove('hidden');
    // Default to password tab
    switchLoginTab('password');
  };

  const closeLoginModal = () => {
    clearInterval(telegramOtpTimer);
    clearInterval(emailOtpTimer);
    DOM.adminLoginModal?.classList.add('hidden');
  };

  if (DOM.openAdminLoginBtn) DOM.openAdminLoginBtn.addEventListener('click', openLoginModal);
  if (DOM.drawerOpenLoginBtn) DOM.drawerOpenLoginBtn.addEventListener('click', () => {
    closeDrawer();
    openLoginModal();
  });
  if (DOM.triggerAdminLoginModalBtn) DOM.triggerAdminLoginModalBtn.addEventListener('click', openLoginModal);
  if (DOM.closeAdminLoginModalBtn) DOM.closeAdminLoginModalBtn.addEventListener('click', closeLoginModal);

  function switchLoginTab(tab) {
    // Reset tabs
    [DOM.tabBtnPassword, DOM.tabBtnTelegram, DOM.tabBtnEmail].forEach(b => b?.classList.remove('active'));
    [DOM.tabContentPassword, DOM.tabContentTelegram, DOM.tabContentEmail].forEach(c => c?.classList.add('hidden'));

    if (tab === 'password') {
      DOM.tabBtnPassword?.classList.add('active');
      DOM.tabContentPassword?.classList.remove('hidden');
      DOM.modalAdminPasswordInput?.focus();
    } else if (tab === 'telegram') {
      DOM.tabBtnTelegram?.classList.add('active');
      DOM.tabContentTelegram?.classList.remove('hidden');
    } else if (tab === 'email') {
      DOM.tabBtnEmail?.classList.add('active');
      DOM.tabContentEmail?.classList.remove('hidden');
    }
  }

  if (DOM.tabBtnPassword) DOM.tabBtnPassword.addEventListener('click', () => switchLoginTab('password'));
  if (DOM.tabBtnTelegram) DOM.tabBtnTelegram.addEventListener('click', () => switchLoginTab('telegram'));
  if (DOM.tabBtnEmail) DOM.tabBtnEmail.addEventListener('click', () => switchLoginTab('email'));

  // Password Visibility Toggle
  if (DOM.togglePasswordVisibilityBtn && DOM.modalAdminPasswordInput) {
    DOM.togglePasswordVisibilityBtn.addEventListener('click', () => {
      const isPass = DOM.modalAdminPasswordInput.type === 'password';
      DOM.modalAdminPasswordInput.type = isPass ? 'text' : 'password';
      DOM.togglePasswordVisibilityBtn.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });
  }

  // 1. OPTION 1: Master Password Login
  if (DOM.loginPasswordForm) {
    DOM.loginPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = DOM.modalAdminPasswordInput.value.trim();
      if (!password) {
        alert('Please enter your Master Admin Password.');
        return;
      }

      DOM.submitLoginPasswordBtn.disabled = true;
      DOM.submitLoginPasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Verifying...';

      try {
        const res = await fetch('/api/admin/auth/login-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message);

        ADMIN_KEY = json.admin_key;
        sessionStorage.setItem('sep_admin_key', ADMIN_KEY);
        localStorage.setItem('sep_admin_key', ADMIN_KEY);
        if (DOM.adminKeyInput) DOM.adminKeyInput.value = ADMIN_KEY;
        closeLoginModal();
        alert('👑 Master Password Verified! Executive Administrator access granted.');
        await loadAllData();
      } catch (err) {
        alert(`Authentication Error: ${err.message}`);
      } finally {
        DOM.submitLoginPasswordBtn.disabled = false;
        DOM.submitLoginPasswordBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> Log In With Password';
      }
    });
  }

  // 2. OPTION 2: Telegram OTP Login
  let telegramOtpTimer = null;
  function startTelegramTimer(sec = 300) {
    clearInterval(telegramOtpTimer);
    let rem = sec;
    DOM.resendTelegramOtpBtn.disabled = true;
    const tick = () => {
      const m = String(Math.floor(rem / 60)).padStart(2, '0');
      const s = String(rem % 60).padStart(2, '0');
      DOM.telegramOtpTimerText.textContent = `Expires in ${m}:${s}`;
      if (rem <= 0) {
        clearInterval(telegramOtpTimer);
        DOM.telegramOtpTimerText.textContent = 'Code expired';
        DOM.resendTelegramOtpBtn.disabled = false;
      }
      rem--;
    };
    tick();
    telegramOtpTimer = setInterval(tick, 1000);
  }

  async function requestTelegramOtp() {
    const phone = DOM.adminTelegramPhoneInput.value.trim();
    if (!phone) {
      alert('Please enter the admin Telegram phone number.');
      return;
    }

    DOM.sendTelegramOtpBtn.disabled = true;
    DOM.sendTelegramOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Requesting Telegram OTP...';

    try {
      const res = await fetch('/api/admin/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'TELEGRAM', phone }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      DOM.telegramOtpStep1?.classList.add('hidden');
      DOM.telegramOtpStep2?.classList.remove('hidden');
      DOM.telegramOtpCodeInput.value = '';
      DOM.telegramOtpCodeInput.focus();
      startTelegramTimer(json.expires_in || 300);
    } catch (err) {
      alert(`Telegram OTP Failed: ${err.message}`);
    } finally {
      DOM.sendTelegramOtpBtn.disabled = false;
      DOM.sendTelegramOtpBtn.innerHTML = '<i class="fab fa-telegram-plane mr-2"></i> Send Telegram OTP';
    }
  }

  if (DOM.sendTelegramOtpBtn) DOM.sendTelegramOtpBtn.addEventListener('click', requestTelegramOtp);
  if (DOM.resendTelegramOtpBtn) DOM.resendTelegramOtpBtn.addEventListener('click', requestTelegramOtp);

  if (DOM.verifyTelegramOtpBtn) {
    DOM.verifyTelegramOtpBtn.addEventListener('click', async () => {
      const phone = DOM.adminTelegramPhoneInput.value.trim();
      const code = DOM.telegramOtpCodeInput.value.trim();

      if (!code || code.length < 6) {
        alert('Please enter the 6-digit Telegram code.');
        return;
      }

      DOM.verifyTelegramOtpBtn.disabled = true;
      DOM.verifyTelegramOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Authenticating...';

      try {
        const res = await fetch('/api/admin/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message);

        clearInterval(telegramOtpTimer);
        ADMIN_KEY = json.admin_key;
        sessionStorage.setItem('sep_admin_key', ADMIN_KEY);
        localStorage.setItem('sep_admin_key', ADMIN_KEY);
        if (DOM.adminKeyInput) DOM.adminKeyInput.value = ADMIN_KEY;
        closeLoginModal();
        alert('✅ Telegram 2FA Verified! Executive access granted.');
        await loadAllData();
      } catch (err) {
        alert(`Authentication Error: ${err.message}`);
      } finally {
        DOM.verifyTelegramOtpBtn.disabled = false;
        DOM.verifyTelegramOtpBtn.innerHTML = '<i class="fas fa-lock-open mr-2"></i> Verify & Authenticate';
      }
    });
  }

  // 3. OPTION 3: Email OTP Login
  let emailOtpTimer = null;
  function startEmailTimer(sec = 300) {
    clearInterval(emailOtpTimer);
    let rem = sec;
    DOM.resendEmailOtpBtn.disabled = true;
    const tick = () => {
      const m = String(Math.floor(rem / 60)).padStart(2, '0');
      const s = String(rem % 60).padStart(2, '0');
      DOM.emailOtpTimerText.textContent = `Expires in ${m}:${s}`;
      if (rem <= 0) {
        clearInterval(emailOtpTimer);
        DOM.emailOtpTimerText.textContent = 'Code expired';
        DOM.resendEmailOtpBtn.disabled = false;
      }
      rem--;
    };
    tick();
    emailOtpTimer = setInterval(tick, 1000);
  }

  async function requestEmailOtp() {
    const email = DOM.adminModalEmailInput.value.trim();
    if (!email) {
      alert('Please enter your authorized admin email.');
      return;
    }

    DOM.sendEmailOtpBtn.disabled = true;
    DOM.sendEmailOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Requesting Email OTP...';

    try {
      const res = await fetch('/api/admin/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'EMAIL', email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      DOM.emailOtpStep1?.classList.add('hidden');
      DOM.emailOtpStep2?.classList.remove('hidden');
      DOM.emailOtpCodeInput.value = '';
      DOM.emailOtpCodeInput.focus();
      startEmailTimer(json.expires_in || 300);
    } catch (err) {
      alert(`Email OTP Failed: ${err.message}`);
    } finally {
      DOM.sendEmailOtpBtn.disabled = false;
      DOM.sendEmailOtpBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Send Email OTP';
    }
  }

  if (DOM.sendEmailOtpBtn) DOM.sendEmailOtpBtn.addEventListener('click', requestEmailOtp);
  if (DOM.resendEmailOtpBtn) DOM.resendEmailOtpBtn.addEventListener('click', requestEmailOtp);

  if (DOM.verifyEmailOtpBtn) {
    DOM.verifyEmailOtpBtn.addEventListener('click', async () => {
      const email = DOM.adminModalEmailInput.value.trim();
      const code = DOM.emailOtpCodeInput.value.trim();

      if (!code || code.length < 6) {
        alert('Please enter the 6-digit email code.');
        return;
      }

      DOM.verifyEmailOtpBtn.disabled = true;
      DOM.verifyEmailOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Authenticating...';

      try {
        const res = await fetch('/api/admin/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message);

        clearInterval(emailOtpTimer);
        ADMIN_KEY = json.admin_key;
        sessionStorage.setItem('sep_admin_key', ADMIN_KEY);
        localStorage.setItem('sep_admin_key', ADMIN_KEY);
        if (DOM.adminKeyInput) DOM.adminKeyInput.value = ADMIN_KEY;
        closeLoginModal();
        alert('✅ Email 2FA Verified! Executive access granted.');
        await loadAllData();
      } catch (err) {
        alert(`Authentication Error: ${err.message}`);
      } finally {
        DOM.verifyEmailOtpBtn.disabled = false;
        DOM.verifyEmailOtpBtn.innerHTML = '<i class="fas fa-lock-open mr-2"></i> Verify & Authenticate';
      }
    });
  }

  // ─── Admin Master Password Settings Form Handler ──────────────────────────
  if (DOM.changePasswordForm) {
    DOM.changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current_password = DOM.currentAdminPassInput.value.trim();
      const new_password = DOM.newAdminPassInput.value.trim();
      const confirm_password = DOM.confirmAdminPassInput.value.trim();

      const feedback = DOM.changePasswordFeedback;
      feedback.className = 'hidden text-xs p-2.5 rounded-lg';

      if (new_password !== confirm_password) {
        feedback.className = 'text-xs p-2.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 block';
        feedback.textContent = 'New password and confirmation password do not match.';
        return;
      }

      if (new_password.length < 4) {
        feedback.className = 'text-xs p-2.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 block';
        feedback.textContent = 'New password must be at least 4 characters long.';
        return;
      }

      DOM.saveNewPasswordBtn.disabled = true;
      DOM.saveNewPasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Updating...';

      try {
        const res = await fetch('/api/admin/settings/change-password', {
          method: 'POST',
          headers: { ...getHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_password, new_password }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message);

        feedback.className = 'text-xs p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 block';
        feedback.textContent = '✅ Master password updated successfully!';
        DOM.changePasswordForm.reset();
        setTimeout(() => feedback.classList.add('hidden'), 5000);
      } catch (err) {
        feedback.className = 'text-xs p-2.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 block';
        feedback.textContent = `Update Failed: ${err.message}`;
      } finally {
        DOM.saveNewPasswordBtn.disabled = false;
        DOM.saveNewPasswordBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Save New Master Password';
      }
    });
  }

  // ─── Notification Bell & Dropdown Tray Events ────────────────────────────
  DOM.adminNotificationBellBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.notificationDropdown?.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (DOM.notificationDropdown && !DOM.notificationDropdown.contains(e.target) && !DOM.adminNotificationBellBtn?.contains(e.target)) {
      DOM.notificationDropdown.classList.add('hidden');
    }
  });

  DOM.refreshNotifsBtn?.addEventListener('click', () => {
    fetchNotifications();
  });

  DOM.enablePushNotifsBtn?.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      alert('🔔 Web Push Notifications enabled! You will be alerted in real-time when new loan and KYC applications arrive.');
      try {
        new Notification('SYM EMPIRE Admin Alerts Active', {
          body: 'Executive alert channel connected for KYC reviews and loan requests.',
          icon: '/images/logo.png'
        });
      } catch (e) {}
    } else {
      alert('Notification permissions were not granted.');
    }
  });

  // ─── Executive Settings Modal & Tabs ─────────────────────────────────────
  function switchSettingsTab(tabName) {
    [DOM.settingsTabBtnLimits, DOM.settingsTabBtnPassword, DOM.settingsTabBtnLogin, DOM.settingsTabBtnLogos].forEach(b => {
      b?.classList.remove('active');
    });
    [DOM.settingsPaneLimits, DOM.settingsPanePassword, DOM.settingsPaneLogin, DOM.settingsPaneLogos].forEach(p => {
      p?.classList.add('hidden');
    });

    if (tabName === 'limits') {
      DOM.settingsTabBtnLimits?.classList.add('active');
      DOM.settingsPaneLimits?.classList.remove('hidden');
    } else if (tabName === 'password') {
      DOM.settingsTabBtnPassword?.classList.add('active');
      DOM.settingsPanePassword?.classList.remove('hidden');
    } else if (tabName === 'login') {
      DOM.settingsTabBtnLogin?.classList.add('active');
      DOM.settingsPaneLogin?.classList.remove('hidden');
    } else if (tabName === 'logos') {
      DOM.settingsTabBtnLogos?.classList.add('active');
      DOM.settingsPaneLogos?.classList.remove('hidden');
    }
  }

  DOM.settingsTabBtnLimits?.addEventListener('click', () => switchSettingsTab('limits'));
  DOM.settingsTabBtnPassword?.addEventListener('click', () => switchSettingsTab('password'));
  DOM.settingsTabBtnLogin?.addEventListener('click', () => switchSettingsTab('login'));
  DOM.settingsTabBtnLogos?.addEventListener('click', () => switchSettingsTab('logos'));

  const openSettingsModal = () => {
    DOM.adminSettingsModal?.classList.remove('hidden');
    switchSettingsTab('limits');
  };

  const closeSettingsModal = () => {
    DOM.adminSettingsModal?.classList.add('hidden');
  };

  DOM.openSettingsModalBtn?.addEventListener('click', openSettingsModal);
  DOM.drawerOpenSettingsBtn?.addEventListener('click', () => {
    closeDrawer();
    openSettingsModal();
  });
  DOM.closeSettingsModalBtn?.addEventListener('click', closeSettingsModal);
  DOM.adminSettingsModal?.addEventListener('click', (e) => {
    if (e.target === DOM.adminSettingsModal) closeSettingsModal();
  });

  // ─── Dual Logo Management Form Handlers ──────────────────────────────────
  // 1. Change Logo of 'Admin Panel' App
  DOM.adminLogoFileInput?.addEventListener('change', () => {
    const file = DOM.adminLogoFileInput.files[0];
    if (file) {
      if (DOM.adminLogoFileSelectedName) {
        DOM.adminLogoFileSelectedName.textContent = `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (DOM.adminLogoPreview) DOM.adminLogoPreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  DOM.uploadAdminLogoForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = DOM.adminLogoFileInput?.files[0];
    if (!file) {
      alert('Please choose an admin logo image file first.');
      return;
    }

    DOM.saveAdminLogoBtn.disabled = true;
    DOM.saveAdminLogoBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Uploading...';
    const feedback = DOM.uploadAdminLogoFeedback;
    if (feedback) feedback.className = 'hidden text-xs p-2.5 rounded-lg';

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch('/api/admin/branding/upload-admin-logo', {
        method: 'POST',
        headers: { 'x-admin-key': ADMIN_KEY },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      if (feedback) {
        feedback.className = 'text-xs p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 block';
        feedback.textContent = "✅ Logo of 'Admin Panel' App updated & applied live!";
        setTimeout(() => feedback.classList.add('hidden'), 5000);
      }

      const updatedUrl = `${json.logo_url}?t=${Date.now()}`;
      document.querySelectorAll('.platform-logo-img').forEach(img => {
        img.src = updatedUrl;
      });
      if (DOM.adminLogoPreview) DOM.adminLogoPreview.src = updatedUrl;
      DOM.uploadAdminLogoForm.reset();
      if (DOM.adminLogoFileSelectedName) DOM.adminLogoFileSelectedName.textContent = 'Supports PNG, JPG, SVG, WebP (Unlimited size)';
    } catch (err) {
      if (feedback) {
        feedback.className = 'text-xs p-2.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 block';
        feedback.textContent = `Upload Failed: ${err.message}`;
      }
    } finally {
      DOM.saveAdminLogoBtn.disabled = false;
      DOM.saveAdminLogoBtn.innerHTML = '<i class="fas fa-upload mr-1.5"></i> Update Admin Logo';
    }
  });

  DOM.resetAdminLogoBtn?.addEventListener('click', async () => {
    if (!confirm("Reset 'Admin Panel' App logo to official default?")) return;
    DOM.resetAdminLogoBtn.disabled = true;
    try {
      const res = await fetch('/api/admin/branding/reset-admin-logo', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      const defUrl = `/images/logo.png?t=${Date.now()}`;
      document.querySelectorAll('.platform-logo-img').forEach(img => {
        img.src = defUrl;
      });
      if (DOM.adminLogoPreview) DOM.adminLogoPreview.src = defUrl;
      alert("✅ 'Admin Panel' App logo reset to default.");
    } catch (err) {
      alert(`Reset Failed: ${err.message}`);
    } finally {
      DOM.resetAdminLogoBtn.disabled = false;
    }
  });

  // 2. Change Logo of 'User/Client-Panel' App
  DOM.clientLogoFileInput?.addEventListener('change', () => {
    const file = DOM.clientLogoFileInput.files[0];
    if (file) {
      if (DOM.clientLogoFileSelectedName) {
        DOM.clientLogoFileSelectedName.textContent = `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (DOM.clientLogoPreview) DOM.clientLogoPreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  DOM.uploadClientLogoForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = DOM.clientLogoFileInput?.files[0];
    if (!file) {
      alert('Please choose a client logo image file first.');
      return;
    }

    DOM.saveClientLogoBtn.disabled = true;
    DOM.saveClientLogoBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Uploading...';
    const feedback = DOM.uploadClientLogoFeedback;
    if (feedback) feedback.className = 'hidden text-xs p-2.5 rounded-lg';

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch('/api/admin/branding/upload-client-logo', {
        method: 'POST',
        headers: { 'x-admin-key': ADMIN_KEY },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      if (feedback) {
        feedback.className = 'text-xs p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 block';
        feedback.textContent = "✅ Logo of 'User/Client-Panel' App updated & applied live!";
        setTimeout(() => feedback.classList.add('hidden'), 5000);
      }

      const updatedUrl = `${json.logo_url}?t=${Date.now()}`;
      if (DOM.clientLogoPreview) DOM.clientLogoPreview.src = updatedUrl;
      DOM.uploadClientLogoForm.reset();
      if (DOM.clientLogoFileSelectedName) DOM.clientLogoFileSelectedName.textContent = 'Supports PNG, JPG, SVG, WebP (Unlimited size)';
    } catch (err) {
      if (feedback) {
        feedback.className = 'text-xs p-2.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 block';
        feedback.textContent = `Upload Failed: ${err.message}`;
      }
    } finally {
      DOM.saveClientLogoBtn.disabled = false;
      DOM.saveClientLogoBtn.innerHTML = '<i class="fas fa-upload mr-1.5"></i> Update Client Logo';
    }
  });

  DOM.resetClientLogoBtn?.addEventListener('click', async () => {
    if (!confirm("Reset 'User/Client-Panel' App logo to official default?")) return;
    DOM.resetClientLogoBtn.disabled = true;
    try {
      const res = await fetch('/api/admin/branding/reset-client-logo', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      const defUrl = `/images/logo.png?t=${Date.now()}`;
      if (DOM.clientLogoPreview) DOM.clientLogoPreview.src = defUrl;
      alert("✅ 'User/Client-Panel' App logo reset to default.");
    } catch (err) {
      alert(`Reset Failed: ${err.message}`);
    } finally {
      DOM.resetClientLogoBtn.disabled = false;
    }
  });

  // 3. Backward-Compatibility Legacy Logo Handlers
  if (DOM.uploadLogoForm) {
    DOM.uploadLogoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = DOM.logoFileInput?.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('logo', file);
      try {
        await fetch('/api/admin/branding/upload-admin-logo', {
          method: 'POST',
          headers: { 'x-admin-key': ADMIN_KEY },
          body: formData,
        });
      } catch (e) {}
    });
  }

  // ─── KYC Identity Verification Event Listeners ─────────────────────────────
  if (DOM.refreshKycBtn) {
    DOM.refreshKycBtn.addEventListener('click', () => {
      fetchKycList();
    });
  }

  if (DOM.closeKycInspectModalBtn) {
    DOM.closeKycInspectModalBtn.addEventListener('click', () => {
      DOM.kycInspectModal?.classList.add('hidden');
    });
  }

  if (DOM.kycInspectModal) {
    DOM.kycInspectModal.addEventListener('click', (e) => {
      if (e.target === DOM.kycInspectModal) {
        DOM.kycInspectModal.classList.add('hidden');
      }
    });
  }

  if (DOM.approveKycBtn) {
    DOM.approveKycBtn.addEventListener('click', () => {
      submitKycDecision('VERIFIED', 'Verified by Executive Compliance');
    });
  }

  if (DOM.rejectKycBtn) {
    DOM.rejectKycBtn.addEventListener('click', () => {
      const reason = DOM.inspectRejectReasonInput ? DOM.inspectRejectReasonInput.value.trim() : '';
      submitKycDecision('REJECTED', reason);
    });
  }

  document.querySelectorAll('.kyc-preset-reason').forEach(btn => {
    btn.addEventListener('click', () => {
      if (DOM.inspectRejectReasonInput) {
        DOM.inspectRejectReasonInput.value = btn.dataset.reason || '';
        DOM.inspectRejectReasonInput.focus();
      }
    });
  });

  // ─── Live Clock & Chime Listeners (Step 2 & 6) ────────────────────────────
  DOM.testChimeSoundBtn?.addEventListener('click', playChimeSound);

  // ─── Upcoming Repayments Analytics Listeners (Step 3) ─────────────────────
  DOM.refreshUpcomingRepaymentsBtn?.addEventListener('click', fetchUpcomingRepaymentsAnalytics);

  // ─── Daily Expenses Tracking Listeners (Step 1) ───────────────────────────
  DOM.expenseForm?.addEventListener('submit', logExpense);
  DOM.refreshExpensesBtn?.addEventListener('click', fetchExpenses);
  DOM.exportExpensesBtn?.addEventListener('click', exportExpensesXlsx);
  DOM.filterExpenseCategory?.addEventListener('change', (e) => filterExpensesByCategory(e.target.value));

  // ─── Executive Operations Suite Listeners (Step 6) ────────────────────────
  DOM.suiteTabBtnNotes?.addEventListener('click', () => switchSuiteTab('notes'));
  DOM.suiteTabBtnCalendar?.addEventListener('click', () => switchSuiteTab('calendar'));
  DOM.suiteTabBtnClock?.addEventListener('click', () => switchSuiteTab('clock'));
  DOM.suiteTabBtnMaps?.addEventListener('click', () => switchSuiteTab('maps'));

  DOM.saveSuiteNoteBtn?.addEventListener('click', saveSuiteNote);
  DOM.saveSuiteEventBtn?.addEventListener('click', saveSuiteEvent);
  DOM.saveSuiteAlarmBtn?.addEventListener('click', saveSuiteAlarm);

  DOM.dismissAlarmBtn?.addEventListener('click', dismissAlarm);
  DOM.snoozeAlarmBtn?.addEventListener('click', snoozeAlarm);

  DOM.updateMapRouteBtn?.addEventListener('click', updateMapRoute);
  DOM.launchGoogleMapsBtn?.addEventListener('click', openGoogleMapsRoute);
}

// ─── Step 2 & 6: Real-time Live Clock & Web Audio Synthesizer ─────────────────
function initLiveClockTicker() {
  const updateClock = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');

    const dateStr = `${dd}/${mm}/${yy}`;
    const timeStr = `${hours}:${mins}:${secs}`;

    if (DOM.liveDateText) DOM.liveDateText.textContent = dateStr;
    if (DOM.liveTimeText) DOM.liveTimeText.textContent = timeStr;

    if (DOM.bigLiveClockDisplay) DOM.bigLiveClockDisplay.textContent = timeStr;
    if (DOM.bigLiveDateDisplay) {
      DOM.bigLiveDateDisplay.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  updateClock();
  setInterval(updateClock, 1000);
  setInterval(checkActiveAlarms, 10000);
}

function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Pleasant Melodic Two-Tone Chime: D5 (587.33 Hz) -> A5 (880.00 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.2);
    gain2.gain.setValueAtTime(0.25, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.85);
  } catch (err) {
    console.warn('Web Audio chime synth warning:', err);
  }
}

// ─── Step 3: Upcoming Loan Repayments Analytics ─────────────────────────────
async function fetchUpcomingRepaymentsAnalytics() {
  try {
    const res = await fetch('/api/admin/analytics/upcoming-repayments', { headers: getHeaders() });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    UPCOMING_REPAYMENTS_CACHE = json.upcoming_loans || [];
    const s = json.summary || {};

    if (DOM.badgeRepayOverdue) DOM.badgeRepayOverdue.textContent = `${s.overdue_count || 0} Overdue (৳${Math.round(s.overdue_amount || 0).toLocaleString()})`;
    if (DOM.badgeRepayToday) DOM.badgeRepayToday.textContent = `${s.due_today_count || 0} Today (৳${Math.round(s.due_today_amount || 0).toLocaleString()})`;
    if (DOM.badgeRepay3Days) DOM.badgeRepay3Days.textContent = `${s.due_in_3_days_count || 0} In 3 Days (৳${Math.round(s.due_in_3_days_amount || 0).toLocaleString()})`;
    if (DOM.badgeRepay7Days) DOM.badgeRepay7Days.textContent = `${s.due_in_7_days_count || 0} In 7 Days (৳${Math.round(s.due_in_7_days_amount || 0).toLocaleString()})`;
    if (DOM.badgeRepayTotalInflow) DOM.badgeRepayTotalInflow.textContent = `৳ ${Math.round(s.total_upcoming_repayments || 0).toLocaleString()}`;
    if (DOM.kpiUpcomingInflow) DOM.kpiUpcomingInflow.textContent = `৳ ${Math.round(s.total_upcoming_repayments || 0).toLocaleString()}`;

    renderUpcomingRepaymentsTable(UPCOMING_REPAYMENTS_CACHE);
  } catch (err) {
    console.error('Failed to fetch upcoming repayments:', err);
  }
}

function renderUpcomingRepaymentsTable(loans) {
  if (!DOM.upcomingRepaymentsTableBody) return;
  if (!loans || loans.length === 0) {
    DOM.upcomingRepaymentsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="p-6 text-center text-slate-500">
          <i class="fas fa-check-circle text-emerald-400 mr-2"></i> No upcoming loan repayments scheduled at this time.
        </td>
      </tr>
    `;
    return;
  }

  DOM.upcomingRepaymentsTableBody.innerHTML = loans.map(item => {
    const client = item.client || { name: 'Client', phone_number: '—' };
    const urgency = item.urgency;
    let urgencyBadge = '';
    if (urgency === 'OVERDUE') {
      urgencyBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">OVERDUE (${Math.abs(item.days_remaining)}d)</span>`;
    } else if (urgency === 'DUE_TODAY') {
      urgencyBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">DUE TODAY</span>`;
    } else if (urgency === 'DUE_IN_3_DAYS') {
      urgencyBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">In ${item.days_remaining} days</span>`;
    } else {
      urgencyBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">In ${item.days_remaining} days</span>`;
    }

    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] text-xs">
        <td class="py-2.5 px-3">
          <div class="font-bold text-white">${client.name}</div>
          <div class="text-[10px] text-slate-400 font-mono">${client.phone_number}</div>
        </td>
        <td class="py-2.5 px-3 font-mono text-slate-300">${item.deadline_date || '—'}</td>
        <td class="py-2.5 px-3">${urgencyBadge}</td>
        <td class="py-2.5 px-3 font-mono">৳${parseFloat(item.amount || 0).toLocaleString()}</td>
        <td class="py-2.5 px-3 font-mono font-black text-emerald-400">৳${parseFloat(item.total_repayable || item.amount || 0).toLocaleString()}</td>
        <td class="py-2.5 px-3 text-right">
          <a href="tel:${client.phone_number}" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] inline-flex items-center mr-1">
            <i class="fas fa-phone mr-1 text-emerald-400"></i> Call
          </a>
          <button onclick="openGoogleCalendarQuickEvent('${encodeURIComponent(client.name)}', '${item.deadline_date}', ${item.total_repayable || item.amount})" class="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-[10px] inline-flex items-center cursor-pointer">
            <i class="fas fa-calendar-plus mr-1"></i> Add Cal
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.openGoogleCalendarQuickEvent = function(clientName, dueDate, amount) {
  const title = `Loan Repayment: ${decodeURIComponent(clientName)} (৳${amount})`;
  const dateClean = (dueDate || '').replace(/-/g, '');
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dateClean}/${dateClean}&details=Follow+up+with+${clientName}+for+loan+repayment+of+BDT+${amount}&location=SYM+EMPIRE+(S.E.P.)`;
  window.open(url, '_blank');
};

// ─── Step 1: Daily Expense Tracking & Split Engine ──────────────────────────
async function fetchExpenses() {
  try {
    const res = await fetch('/api/admin/expenses', { headers: getHeaders() });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    EXPENSES_CACHE = json.expenses || [];
    renderExpensesTable(EXPENSES_CACHE);
  } catch (err) {
    console.error('Failed to fetch daily expenses:', err);
  }
}

function renderExpensesTable(list) {
  if (!DOM.expensesTableBody) return;
  if (!list || list.length === 0) {
    DOM.expensesTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="p-6 text-center text-slate-500">
          No daily expenses recorded yet. Use the form above to log operational costs.
        </td>
      </tr>
    `;
    if (DOM.totalExpensesFooterAmount) DOM.totalExpensesFooterAmount.textContent = '৳ 0';
    return;
  }

  const total = list.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  if (DOM.totalExpensesFooterAmount) {
    DOM.totalExpensesFooterAmount.textContent = `৳ ${Math.round(total).toLocaleString()}`;
  }

  DOM.expensesTableBody.innerHTML = list.map(item => {
    let catClass = 'bg-slate-700/50 text-slate-300 border-slate-600';
    if (item.category === 'OFFICE_RENT') catClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    else if (item.category === 'TEA_FOOD') catClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    else if (item.category === 'CONVEYANCE') catClass = 'bg-teal-500/20 text-teal-300 border-teal-500/40';
    else if (item.category === 'MFS_FEE') catClass = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    else if (item.category === 'UTILITIES') catClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';

    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] text-xs">
        <td class="py-2.5 px-3 font-mono text-slate-300">${item.date || '—'}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${catClass}">${item.category}</span>
        </td>
        <td class="py-2.5 px-3 text-white font-medium">${item.description || '—'}</td>
        <td class="py-2.5 px-3 font-mono font-bold text-amber-300">৳${parseFloat(item.amount || 0).toLocaleString()}</td>
        <td class="py-2.5 px-3 text-slate-300">${item.payer || 'Admin'}</td>
        <td class="py-2.5 px-3 text-slate-400 text-[11px]">${item.split_with || 'Platform'}</td>
        <td class="py-2.5 px-3 text-right">
          <button onclick="deleteExpenseRecord('${item.id}')" class="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] transition cursor-pointer">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function logExpense(e) {
  e.preventDefault();
  const category = DOM.expenseCategory?.value;
  const amount = parseFloat(DOM.expenseAmount?.value);
  const date = DOM.expenseDate?.value;
  const payer = DOM.expensePayer?.value || 'Admin';
  const split_with = DOM.expenseSplitWith?.value || 'Platform';
  const description = (DOM.expenseDescription?.value || '').trim();

  if (!category || isNaN(amount) || amount <= 0 || !date) {
    alert('Please provide valid expense category, amount, and date.');
    return;
  }

  DOM.submitExpenseBtn.disabled = true;
  DOM.submitExpenseBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving...';

  try {
    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, amount, date, payer, split_with, description }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    DOM.expenseAmount.value = '';
    DOM.expenseDescription.value = '';
    await fetchExpenses();
  } catch (err) {
    alert(`Expense Save Error: ${err.message}`);
  } finally {
    DOM.submitExpenseBtn.disabled = false;
    DOM.submitExpenseBtn.innerHTML = '<i class="fas fa-plus-circle mr-1.5"></i> Save Expense Record';
  }
}

window.deleteExpenseRecord = async function(id) {
  if (!confirm('Are you sure you want to delete this expense record?')) return;
  try {
    const res = await fetch(`/api/admin/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);
    await fetchExpenses();
  } catch (err) {
    alert(`Delete Error: ${err.message}`);
  }
};

function filterExpensesByCategory(cat) {
  if (!cat) {
    renderExpensesTable(EXPENSES_CACHE);
  } else {
    const filtered = EXPENSES_CACHE.filter(e => e.category === cat);
    renderExpensesTable(filtered);
  }
}

function exportExpensesXlsx() {
  if (!EXPENSES_CACHE || EXPENSES_CACHE.length === 0) {
    alert('No expenses to export.');
    return;
  }

  const csvRows = [
    ['Expense ID', 'Date', 'Category', 'Description', 'Amount (BDT)', 'Paid By', 'Split With'],
    ...EXPENSES_CACHE.map(e => [
      `"${e.id}"`,
      `"${e.date}"`,
      `"${e.category}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.amount,
      `"${e.payer || 'Admin'}"`,
      `"${e.split_with || 'Platform'}"`
    ])
  ];

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map(r => r.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SYM_Expenses_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Step 6: S.E.P. Executive Operations Suite ──────────────────────────────
function switchSuiteTab(tab) {
  const tabs = ['notes', 'calendar', 'clock', 'maps'];
  tabs.forEach(t => {
    const btn = document.getElementById(`suiteTabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const pane = document.getElementById(`suiteTabContent${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (t === tab) {
      btn?.classList.add('bg-white/10', 'text-white', 'border-white/20');
      btn?.classList.remove('text-slate-400');
      pane?.classList.remove('hidden');
    } else {
      btn?.classList.remove('bg-white/10', 'text-white', 'border-white/20');
      btn?.classList.add('text-slate-400');
      pane?.classList.add('hidden');
    }
  });
}

// Keep Notes
async function fetchSuiteNotes() {
  try {
    const res = await fetch('/api/admin/executive-suite/notes', { headers: getHeaders() });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);
    SUITE_NOTES_CACHE = json.notes || [];
    renderSuiteNotes(SUITE_NOTES_CACHE);
  } catch (err) {
    console.error('Failed to fetch suite notes:', err);
  }
}

function renderSuiteNotes(notes) {
  if (!DOM.suiteNotesGrid) return;
  if (!notes || notes.length === 0) {
    DOM.suiteNotesGrid.innerHTML = `
      <div class="col-span-full p-6 text-center text-slate-500">
        No notes recorded yet. Add plans, meeting memos, or debtor notes above.
      </div>
    `;
    return;
  }

  DOM.suiteNotesGrid.innerHTML = notes.map(n => `
    <div class="p-4 rounded-xl bg-black/60 border border-amber-500/20 hover:border-amber-500/40 transition space-y-2.5 flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between">
          <h5 class="text-xs font-black text-white truncate">${n.title || 'Untitled Note'}</h5>
          <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">${n.category || 'PLAN'}</span>
        </div>
        <p class="text-xs text-slate-300 whitespace-pre-wrap mt-1 leading-relaxed max-h-36 overflow-y-auto">${n.content}</p>
      </div>
      <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
        <span>${new Date(n.created_at).toLocaleDateString()}</span>
        <div class="flex items-center space-x-1.5">
          <button onclick="sendNoteToParser('${n.id}')" class="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold cursor-pointer transition" title="Paste into Historical Notes Parser">
            <i class="fas fa-file-import mr-1"></i> To Parser
          </button>
          <button onclick="deleteSuiteNoteRecord('${n.id}')" class="p-1 text-slate-500 hover:text-rose-400 cursor-pointer transition">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function saveSuiteNote() {
  const title = (DOM.suiteNoteTitleInput?.value || '').trim();
  const category = DOM.suiteNoteCategoryInput?.value || 'PLAN';
  const content = (DOM.suiteNoteContentInput?.value || '').trim();

  if (!content) {
    alert('Please enter note content.');
    return;
  }

  DOM.saveSuiteNoteBtn.disabled = true;
  try {
    const res = await fetch('/api/admin/executive-suite/notes', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || 'Executive Memo', category, content }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    DOM.suiteNoteTitleInput.value = '';
    DOM.suiteNoteContentInput.value = '';
    await fetchSuiteNotes();
  } catch (err) {
    alert(`Save Note Error: ${err.message}`);
  } finally {
    DOM.saveSuiteNoteBtn.disabled = false;
  }
}

window.sendNoteToParser = function(id) {
  const note = SUITE_NOTES_CACHE.find(n => n.id === id);
  if (!note) return;
  if (DOM.rawNoteInput) {
    DOM.rawNoteInput.value = note.content;
    const historicalSection = document.getElementById('historicalLedgerSection');
    historicalSection?.scrollIntoView({ behavior: 'smooth' });
    DOM.rawNoteInput.focus();
    DOM.rawNoteInput.classList.add('ring-2', 'ring-amber-400');
    setTimeout(() => DOM.rawNoteInput.classList.remove('ring-2', 'ring-amber-400'), 2500);
  }
};

window.deleteSuiteNoteRecord = async function(id) {
  if (!confirm('Delete this note?')) return;
  try {
    const res = await fetch(`/api/admin/executive-suite/notes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);
    await fetchSuiteNotes();
  } catch (err) {
    alert(`Delete Error: ${err.message}`);
  }
};

// Google Calendar & Events
async function fetchSuiteEvents() {
  try {
    const res = await fetch('/api/admin/executive-suite/events', { headers: getHeaders() });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);
    SUITE_EVENTS_CACHE = json.events || [];
    renderSuiteEvents(SUITE_EVENTS_CACHE);
  } catch (err) {
    console.error('Failed to fetch suite events:', err);
  }
}

function renderSuiteEvents(events) {
  if (!DOM.suiteEventsList) return;
  if (!events || events.length === 0) {
    DOM.suiteEventsList.innerHTML = `
      <div class="p-6 text-center text-slate-500">
        No calendar events scheduled yet.
      </div>
    `;
    return;
  }

  DOM.suiteEventsList.innerHTML = events.map(ev => {
    const calDate = (ev.event_date || '').replace(/-/g, '');
    const calTime = (ev.event_time || '09:00').replace(/:/g, '') + '00';
    const calStart = `${calDate}T${calTime}`;
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${calStart}/${calStart}&details=${encodeURIComponent(ev.description || 'Client: ' + (ev.client_name || ''))}&location=SYM%20EMPIRE%20(S.E.P.)`;

    return `
      <div class="p-3 rounded-xl bg-black/60 border border-teal-500/20 hover:border-teal-500/40 transition flex items-center justify-between gap-3 text-xs">
        <div class="space-y-0.5">
          <div class="font-bold text-white flex items-center">
            ${ev.title}
            ${ev.client_name ? `<span class="ml-2 px-1.5 py-0.2 rounded text-[9px] bg-teal-500/20 text-teal-300 font-mono">${ev.client_name}</span>` : ''}
          </div>
          <div class="text-[11px] text-slate-400 flex items-center space-x-2 font-mono">
            <span><i class="far fa-calendar text-teal-400 mr-1"></i> ${ev.event_date}</span>
            <span><i class="far fa-clock text-amber-400 mr-1"></i> ${ev.event_time || 'All Day'}</span>
          </div>
          ${ev.description ? `<p class="text-[11px] text-slate-400 font-sans">${ev.description}</p>` : ''}
        </div>
        <div class="flex items-center space-x-2 shrink-0">
          <a href="${gCalUrl}" target="_blank" class="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center transition shadow">
            <i class="fab fa-google mr-1"></i> Google Cal
          </a>
          <button onclick="deleteSuiteEventRecord('${ev.id}')" class="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function saveSuiteEvent() {
  const title = (DOM.suiteEventTitleInput?.value || '').trim();
  const event_date = DOM.suiteEventDateInput?.value;
  const event_time = DOM.suiteEventTimeInput?.value || '10:00';
  const client_name = (DOM.suiteEventClientInput?.value || '').trim();
  const description = (DOM.suiteEventDescriptionInput?.value || '').trim();

  if (!title || !event_date) {
    alert('Please provide event title and date.');
    return;
  }

  DOM.saveSuiteEventBtn.disabled = true;
  try {
    const res = await fetch('/api/admin/executive-suite/events', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, event_date, event_time, client_name, description }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    DOM.suiteEventTitleInput.value = '';
    DOM.suiteEventClientInput.value = '';
    DOM.suiteEventDescriptionInput.value = '';
    await fetchSuiteEvents();
  } catch (err) {
    alert(`Save Event Error: ${err.message}`);
  } finally {
    DOM.saveSuiteEventBtn.disabled = false;
  }
}

window.deleteSuiteEventRecord = async function(id) {
  if (!confirm('Delete this event?')) return;
  try {
    const res = await fetch(`/api/admin/executive-suite/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);
    await fetchSuiteEvents();
  } catch (err) {
    alert(`Delete Error: ${err.message}`);
  }
};

// Alarms & Reminders
async function fetchSuiteAlarms() {
  try {
    const res = await fetch('/api/admin/executive-suite/alarms', { headers: getHeaders() });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);
    SUITE_ALARMS_CACHE = json.alarms || [];
    renderSuiteAlarms(SUITE_ALARMS_CACHE);
  } catch (err) {
    console.error('Failed to fetch suite alarms:', err);
  }
}

function renderSuiteAlarms(alarms) {
  if (!DOM.suiteAlarmsList) return;
  if (!alarms || alarms.length === 0) {
    DOM.suiteAlarmsList.innerHTML = `
      <div class="p-3 text-center text-slate-500 text-xs">
        No active alarms configured. Set one above.
      </div>
    `;
    return;
  }

  DOM.suiteAlarmsList.innerHTML = alarms.map(a => `
    <div class="p-2.5 rounded-lg bg-black/60 border border-indigo-500/20 flex items-center justify-between text-xs">
      <div class="flex items-center space-x-2.5">
        <i class="fas fa-bell text-indigo-400"></i>
        <div>
          <span class="font-mono font-black text-amber-400 text-sm">${a.time}</span>
          <span class="text-[11px] text-slate-300 ml-2">${a.label || 'Reminder'}</span>
        </div>
      </div>
      <button onclick="deleteSuiteAlarmRecord('${a.id}')" class="text-slate-500 hover:text-rose-400 text-xs p-1 cursor-pointer transition">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

async function saveSuiteAlarm() {
  const time = DOM.suiteAlarmTimeInput?.value;
  const label = (DOM.suiteAlarmLabelInput?.value || '').trim();

  if (!time) {
    alert('Please pick an alarm time (HH:MM).');
    return;
  }

  DOM.saveSuiteAlarmBtn.disabled = true;
  try {
    const res = await fetch('/api/admin/executive-suite/alarms', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ time, label: label || 'Alarm Reminder' }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    DOM.suiteAlarmLabelInput.value = '';
    await fetchSuiteAlarms();
  } catch (err) {
    alert(`Save Alarm Error: ${err.message}`);
  } finally {
    DOM.saveSuiteAlarmBtn.disabled = false;
  }
}

window.deleteSuiteAlarmRecord = async function(id) {
  try {
    const res = await fetch(`/api/admin/executive-suite/alarms/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);
    await fetchSuiteAlarms();
  } catch (err) {
    alert(`Delete Error: ${err.message}`);
  }
};

let LAST_TRIGGERED_MINUTE = null;

function checkActiveAlarms() {
  const now = new Date();
  const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (currentHM === LAST_TRIGGERED_MINUTE) return;

  const matched = SUITE_ALARMS_CACHE.find(a => a.time === currentHM && a.active !== false);
  if (matched) {
    LAST_TRIGGERED_MINUTE = currentHM;
    triggerAlarmAlert(matched);
  }
}

function triggerAlarmAlert(alarm) {
  ACTIVE_ALARM_OBJ = alarm;
  if (DOM.alarmAlertTitle) DOM.alarmAlertTitle.textContent = alarm.label || 'Scheduled Reminder';
  if (DOM.alarmAlertTime) DOM.alarmAlertTime.textContent = alarm.time;
  if (DOM.alarmAlertMessage) DOM.alarmAlertMessage.textContent = `Scheduled alarm for ${alarm.time}: ${alarm.label || 'Action Required'}`;

  DOM.alarmAlertModal?.classList.remove('hidden');

  playChimeSound();
  if (ACTIVE_ALARM_INTERVAL) clearInterval(ACTIVE_ALARM_INTERVAL);
  ACTIVE_ALARM_INTERVAL = setInterval(playChimeSound, 2500);
}

function dismissAlarm() {
  if (ACTIVE_ALARM_INTERVAL) {
    clearInterval(ACTIVE_ALARM_INTERVAL);
    ACTIVE_ALARM_INTERVAL = null;
  }
  DOM.alarmAlertModal?.classList.add('hidden');
}

function snoozeAlarm() {
  dismissAlarm();
  const now = new Date(Date.now() + 5 * 60 * 1000);
  const snoozedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  SUITE_ALARMS_CACHE.push({
    id: 'snooze_' + Date.now(),
    time: snoozedTime,
    label: (ACTIVE_ALARM_OBJ?.label || 'Reminder') + ' (Snoozed 5m)',
    active: true,
  });
  renderSuiteAlarms(SUITE_ALARMS_CACHE);
}

// Google Maps & Route Planner
function updateMapRoute() {
  const dest = (DOM.mapDestinationInput?.value || '').trim() || 'Dhaka Bangladesh';
  if (DOM.googleMapsEmbedFrame) {
    DOM.googleMapsEmbedFrame.src = `https://maps.google.com/maps?q=${encodeURIComponent(dest)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }
}

function openGoogleMapsRoute() {
  const origin = (DOM.mapOriginInput?.value || '').trim() || 'Central Office, Dhaka, Bangladesh';
  const dest = (DOM.mapDestinationInput?.value || '').trim() || 'Dhaka, Bangladesh';
  const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`;
  window.open(url, '_blank');
}

// ─── Step 5: Terms of Service & Privacy Policy Modal ─────────────────────────
function initTermsPolicyModal() {
  const modal = DOM.termsPolicyModal;
  if (!modal) return;

  const tabBtns = modal.querySelectorAll('.terms-tab-btn');
  const panes = {
    terms: document.getElementById('termsPaneTerms'),
    privacy: document.getElementById('termsPanePrivacy'),
    'loan-policy': document.getElementById('termsPaneLoanPolicy'),
  };

  const switchTab = (tabName) => {
    tabBtns.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.className = 'terms-tab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition bg-amber-500/20 text-amber-300 border border-amber-500/30';
      } else {
        btn.className = 'terms-tab-btn px-3 py-1.5 rounded-lg text-xs font-bold transition bg-white/5 text-slate-400 hover:text-white';
      }
    });
    Object.keys(panes).forEach(key => {
      if (panes[key]) {
        if (key === tabName) panes[key].classList.remove('hidden');
        else panes[key].classList.add('hidden');
      }
    });
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('.terms-policy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab || 'terms';
      switchTab(tab);
      modal.classList.remove('hidden');
    });
  });

  const closeModal = () => modal.classList.add('hidden');
  if (DOM.closeTermsModalBtn) DOM.closeTermsModalBtn.addEventListener('click', closeModal);
  if (DOM.termsModalOkBtn) DOM.termsModalOkBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// ─── Phase 11: Credit Intelligence & Anti-Fraud Threat Desk ───────────────────
let CREDIT_MATRIX_CACHE = null;
let FRAUD_ALERTS_CACHE = [];
let ACTIVE_FRAUD_FILTER = 'ALL';
let ACTIVE_CREDIT_OVERRIDE_CLIENT = null;
let ACTIVE_FRAUD_DOSSIER_LOG = null;

async function fetchCreditMatrix() {
  try {
    const res = await fetch('/api/admin/credit/matrix', { headers: getHeaders() });
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.items) return;

    CREDIT_MATRIX_CACHE = json;
    const s = json.summary || {};

    const avgScoreEl = document.getElementById('kpiAvgCreditScore');
    const avgGradeEl = document.getElementById('kpiAvgGradeText');
    const primeCountEl = document.getElementById('kpiPrimeCount');
    const vipCountEl = document.getElementById('kpiVipMembersCount');

    if (avgScoreEl) avgScoreEl.innerHTML = `${s.average_score || 550} <span class="text-xs font-normal text-slate-400">/ 850</span>`;
    if (avgGradeEl) {
      const avgGrade = (s.average_score >= 700 ? 'Prime / Elite' : (s.average_score >= 620 ? 'Standard Good' : (s.average_score >= 540 ? 'Fair Risk' : 'High Risk')));
      avgGradeEl.textContent = `Portfolio Health: ${avgGrade}`;
    }
    if (primeCountEl) primeCountEl.innerHTML = `${s.prime_count || 0} <span class="text-xs font-normal text-slate-400">(${s.prime_percentage || 0}%)</span>`;
    if (vipCountEl) vipCountEl.textContent = `${s.vip_count || 0} Borrowers`;

    renderCreditMatrix(json.items);
  } catch (err) {
    console.error('Failed to fetch credit matrix:', err);
  }
}

function renderCreditMatrix(items) {
  const tbody = document.getElementById('creditMatrixTableBody');
  if (!tbody) return;

  const searchQuery = (document.getElementById('creditFilterSearch')?.value || '').toLowerCase().trim();

  let filtered = items;
  if (searchQuery) {
    filtered = items.filter(i => 
      (i.client_name || '').toLowerCase().includes(searchQuery) ||
      (i.client_phone || '').toLowerCase().includes(searchQuery) ||
      (i.grade || '').toLowerCase().includes(searchQuery) ||
      (i.vip_tier?.name || '').toLowerCase().includes(searchQuery)
    );
  }

  if (!filtered || filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-500">No client credit records match criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isOverride = item.telemetry?.has_admin_override;
    const tier = item.vip_tier || {};
    const t = item.telemetry || {};

    let gradeBadgeClass = 'bg-slate-700/50 text-slate-300 border-slate-600';
    if (item.grade === 'A+') gradeBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950';
    else if (item.grade === 'A') gradeBadgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    else if (item.grade === 'B') gradeBadgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    else if (item.grade === 'C') gradeBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    else if (item.grade === 'D') gradeBadgeClass = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    else if (item.grade === 'F') gradeBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';

    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] text-xs transition">
        <td class="py-3 px-3">
          <div class="font-bold text-white">${escapeHtml(item.client_name)}</div>
          <div class="font-mono text-[10px] text-slate-400">${item.client_phone || '—'}</div>
          <div class="text-[9px] font-mono text-slate-500">#${item.client_id.slice(0, 8)}</div>
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center space-x-2">
            <span class="font-mono font-black text-sm text-white">${item.score}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-black border ${gradeBadgeClass}">
              ${item.grade}
            </span>
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5">${item.title || ''}</div>
          ${isOverride ? '<span class="text-[9px] font-bold text-amber-400">[OVERRIDDEN]</span>' : ''}
        </td>
        <td class="py-3 px-3">
          <div class="flex items-center space-x-1.5 font-bold text-white">
            <span>${tier.badge || '🥉'}</span>
            <span>${tier.name || 'Bronze Member'}</span>
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5">Progress: ${item.next_tier_progress || 0}%</div>
        </td>
        <td class="py-3 px-3">
          <div class="font-mono font-bold text-emerald-400">৳${(item.eligible_credit_limit || 0).toLocaleString()}</div>
          <div class="text-[10px] text-slate-400">Fee: ${item.effective_service_fee_percent || 10}% (${tier.fee_discount_percent || 0}% off)</div>
        </td>
        <td class="py-3 px-3">
          <div class="font-mono text-white font-bold">${t.verified_repayments_count || 0} Settled</div>
          <div class="text-[10px] font-mono text-slate-400">৳${(t.total_repaid_amount || 0).toLocaleString()} volume</div>
        </td>
        <td class="py-3 px-3">
          <div class="font-mono font-bold ${t.strikes_count > 0 ? 'text-rose-400' : 'text-slate-400'}">${t.strikes_count || 0} / 3 Strikes</div>
          <div class="text-[10px] ${t.active_overdue_loans_count > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}">
            ${t.active_overdue_loans_count > 0 ? `${t.active_overdue_loans_count} Overdue` : 'Clean Schedule'}
          </div>
        </td>
        <td class="py-3 px-3 text-right">
          <button onclick="openCreditOverrideModal('${item.client_id}')" class="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold transition cursor-pointer">
            <i class="fas fa-sliders-h mr-1"></i> Override
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function fetchFraudAlerts(filter = ACTIVE_FRAUD_FILTER) {
  try {
    const res = await fetch(`/api/admin/fraud/alerts?filter=${encodeURIComponent(filter)}`, { headers: getHeaders() });
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.items) return;

    FRAUD_ALERTS_CACHE = json.items;
    const s = json.summary || {};

    const alertsCountEl = document.getElementById('kpiFraudAlertsCount');
    const blacklistCounterEl = document.getElementById('kpiBlacklistCounters');
    const badgeEl = document.getElementById('adminFraudBadge');
    const pillEl = document.getElementById('tabFraudBadgePill');

    if (alertsCountEl) alertsCountEl.textContent = `${s.under_review_count || 0} Pending`;
    if (blacklistCounterEl) blacklistCounterEl.textContent = `${s.blacklisted_devices_count || 0} blocked devices / ${s.blacklisted_ips_count || 0} IPs`;
    if (badgeEl) badgeEl.textContent = s.under_review_count || 0;
    if (pillEl) pillEl.textContent = s.under_review_count || 0;

    renderFraudAlerts(FRAUD_ALERTS_CACHE);
  } catch (err) {
    console.error('Failed to fetch fraud alerts:', err);
  }
}

function renderFraudAlerts(logs) {
  const tbody = document.getElementById('fraudAlertsTableBody');
  if (!tbody) return;

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-500">No anti-fraud alerts recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => {
    let riskBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (log.risk_tier === 'HIGH') riskBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950 animate-pulse';
    else if (log.risk_tier === 'MODERATE') riskBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';

    let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">UNDER REVIEW</span>`;
    if (log.status === 'CLEARED') {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CLEARED</span>`;
    } else if (log.status === 'BLOCKED') {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">BLOCKED</span>`;
    }

    const flagCount = (log.flags || []).length;
    const collisionsCount = (log.colliding_accounts || []).length;

    const timeAgo = new Date(log.created_at).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] text-xs transition">
        <td class="py-3 px-3 font-mono text-slate-400">${timeAgo}</td>
        <td class="py-3 px-3">
          <div class="font-bold text-white">${escapeHtml(log.client_name || 'Anonymous')}</div>
          <div class="font-mono text-[10px] text-amber-300">${log.ip_address || '127.0.0.1'}</div>
        </td>
        <td class="py-3 px-3 font-mono text-[11px] text-cyan-300">
          ${log.fingerprint_hash ? log.fingerprint_hash.slice(0, 10) + '...' : '—'}
        </td>
        <td class="py-3 px-3">
          <span class="font-mono font-black text-sm text-white">${log.fraud_score}</span>
          <span class="ml-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${riskBadgeClass}">${log.risk_tier}</span>
        </td>
        <td class="py-3 px-3">
          <div class="text-[11px] text-slate-300">${flagCount} Threat Flags</div>
          ${collisionsCount > 0 ? `<div class="text-[10px] font-bold text-rose-400"><i class="fas fa-exclamation-circle mr-1"></i> ${collisionsCount} Account Collisions</div>` : '<div class="text-[10px] text-slate-500">Zero Multi-Account Matches</div>'}
        </td>
        <td class="py-3 px-3">${statusBadge}</td>
        <td class="py-3 px-3 text-right">
          <button onclick="openFraudDossierModal('${log.id}')" class="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition cursor-pointer">
            <i class="fas fa-search mr-1"></i> Inspect
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.openCreditOverrideModal = function(clientId) {
  if (!CREDIT_MATRIX_CACHE) return;
  const item = CREDIT_MATRIX_CACHE.items.find(i => i.client_id === clientId);
  if (!item) {
    alert('Borrower credit profile not found.');
    return;
  }

  ACTIVE_CREDIT_OVERRIDE_CLIENT = item;

  document.getElementById('modalCreditClientId').value = clientId;
  document.getElementById('modalCreditClientName').textContent = `${item.client_name} (${item.client_phone || '—'})`;
  document.getElementById('modalCreditCurrentScoreText').textContent = `${item.score} (Grade ${item.grade}) • ${item.vip_tier?.name || 'Bronze'}`;

  document.getElementById('modalScoreOffsetInput').value = '';
  document.getElementById('modalFixedGradeSelect').value = '';
  document.getElementById('modalFixedTierSelect').value = '';
  document.getElementById('modalCreditNoteInput').value = '';

  document.getElementById('adminScoreOverrideModal')?.classList.remove('hidden');
};

window.saveCreditOverride = async function() {
  if (!ACTIVE_CREDIT_OVERRIDE_CLIENT) return;
  const clientId = document.getElementById('modalCreditClientId').value;
  const score_offset = parseInt(document.getElementById('modalScoreOffsetInput').value, 10) || 0;
  const fixed_grade = document.getElementById('modalFixedGradeSelect').value || null;
  const fixed_tier = document.getElementById('modalFixedTierSelect').value || null;
  const admin_note = document.getElementById('modalCreditNoteInput').value.trim() || 'Manual adjustment by administrator';

  try {
    const res = await fetch('/api/admin/credit/override', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, score_offset, fixed_grade, fixed_tier, admin_note }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    alert(`✅ Credit profile overridden successfully for ${ACTIVE_CREDIT_OVERRIDE_CLIENT.client_name}!`);
    document.getElementById('adminScoreOverrideModal')?.classList.add('hidden');
    await fetchCreditMatrix();
  } catch (err) {
    alert(`Override Error: ${err.message}`);
  }
};

window.removeCreditOverride = async function() {
  if (!ACTIVE_CREDIT_OVERRIDE_CLIENT) return;
  if (!confirm('Remove manual overrides and restore automatic algorithmic scoring?')) return;

  const clientId = document.getElementById('modalCreditClientId').value;
  try {
    const res = await fetch(`/api/admin/credit/override/${clientId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    alert('✅ Manual override removed. Algorithmic scoring restored.');
    document.getElementById('adminScoreOverrideModal')?.classList.add('hidden');
    await fetchCreditMatrix();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

window.openFraudDossierModal = function(logId) {
  const log = FRAUD_ALERTS_CACHE.find(l => l.id === logId);
  if (!log) return;

  ACTIVE_FRAUD_DOSSIER_LOG = log;

  document.getElementById('modalFraudLogId').value = log.id;
  document.getElementById('modalFraudLogRef').textContent = `Log Ref: #${log.id.slice(0, 10)}`;
  document.getElementById('modalFraudScoreText').textContent = `${log.fraud_score} / 100`;

  const badgeEl = document.getElementById('modalFraudRiskBadge');
  if (badgeEl) {
    badgeEl.textContent = `${log.risk_tier} RISK (${log.status})`;
    badgeEl.className = log.risk_tier === 'HIGH'
      ? 'px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40'
      : 'px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40';
  }

  document.getElementById('modalFraudClientText').textContent = `${log.client_name || 'Anonymous'} (${log.client_phone || '—'})`;
  document.getElementById('modalFraudIpText').textContent = log.ip_address || '127.0.0.1';
  document.getElementById('modalFraudHashText').textContent = log.fingerprint_hash || 'N/A';
  document.getElementById('modalFraudUaText').textContent = log.user_agent || 'N/A';

  const flagsList = document.getElementById('modalFraudFlagsList');
  if (flagsList) {
    const allFlags = log.flags || [];
    if (allFlags.length === 0) {
      flagsList.innerHTML = `<div class="p-2.5 rounded-lg bg-black/40 text-slate-400 text-xs">No critical threat flags detected. Clean environment.</div>`;
    } else {
      flagsList.innerHTML = allFlags.map(f => `
        <div class="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
          <div class="font-bold flex items-center"><i class="fas fa-exclamation-triangle mr-1 text-rose-400"></i> ${f.code} (${f.severity})</div>
          <div class="text-[11px] text-slate-300 mt-0.5">${f.message}</div>
        </div>
      `).join('');
    }
  }

  document.getElementById('modalFraudAdminNote').value = '';
  document.getElementById('adminFraudDossierModal')?.classList.remove('hidden');
};

window.resolveFraudAlert = async function(resolution) {
  if (!ACTIVE_FRAUD_DOSSIER_LOG) return;
  const logId = document.getElementById('modalFraudLogId').value;
  const adminNote = document.getElementById('modalFraudAdminNote').value.trim() || `Intervention resolved as ${resolution}`;

  try {
    const res = await fetch('/api/admin/fraud/resolve', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: logId, resolution, admin_note: adminNote }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    alert(`✅ Fraud log resolved as ${resolution}.`);
    document.getElementById('adminFraudDossierModal')?.classList.add('hidden');
    await fetchFraudAlerts();
  } catch (err) {
    alert(`Resolution Error: ${err.message}`);
  }
};

// Wire Phase 11 Event Listeners
function initCreditFraudListeners() {
  document.getElementById('refreshCreditFraudBtn')?.addEventListener('click', () => {
    fetchCreditMatrix();
    fetchFraudAlerts();
  });

  const tabCredit = document.getElementById('tabCreditRosterBtn');
  const tabFraud = document.getElementById('tabFraudRadarBtn');
  const contentCredit = document.getElementById('contentCreditRoster');
  const contentFraud = document.getElementById('contentFraudRadar');

  tabCredit?.addEventListener('click', () => {
    tabCredit.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer bg-cyan-500 text-black shadow';
    tabFraud.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer text-slate-300 hover:text-white bg-white/5 border border-white/10';
    contentCredit?.classList.remove('hidden');
    contentFraud?.classList.add('hidden');
  });

  tabFraud?.addEventListener('click', () => {
    tabFraud.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer bg-rose-500 text-white shadow';
    tabCredit.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer text-slate-300 hover:text-white bg-white/5 border border-white/10';
    contentFraud?.classList.remove('hidden');
    contentCredit?.classList.add('hidden');
  });

  document.getElementById('creditFilterSearch')?.addEventListener('input', () => {
    if (CREDIT_MATRIX_CACHE && CREDIT_MATRIX_CACHE.items) {
      renderCreditMatrix(CREDIT_MATRIX_CACHE.items);
    }
  });

  // Credit Override Modal
  document.getElementById('btnCloseCreditModal')?.addEventListener('click', () => {
    document.getElementById('adminScoreOverrideModal')?.classList.add('hidden');
  });
  document.getElementById('btnCancelCreditModal')?.addEventListener('click', () => {
    document.getElementById('adminScoreOverrideModal')?.classList.add('hidden');
  });
  document.getElementById('btnSaveCreditOverride')?.addEventListener('click', () => {
    saveCreditOverride();
  });
  document.getElementById('btnRemoveCreditOverride')?.addEventListener('click', () => {
    removeCreditOverride();
  });

  // Fraud Dossier Modal
  document.getElementById('btnCloseFraudModal')?.addEventListener('click', () => {
    document.getElementById('adminFraudDossierModal')?.classList.add('hidden');
  });
  document.getElementById('btnResolveFraudClear')?.addEventListener('click', () => {
    resolveFraudAlert('CLEARED');
  });
  document.getElementById('btnResolveFraudBlock')?.addEventListener('click', () => {
    resolveFraudAlert('BLOCKED');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCreditFraudListeners();
});
