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

let ADMIN_KEY = sessionStorage.getItem('sep_admin_key') || 'SEP_ADMIN_2026';
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

  // Admin Master Password Change in Settings
  changePasswordForm: document.getElementById('changePasswordForm'),
  currentAdminPassInput: document.getElementById('currentAdminPassInput'),
  newAdminPassInput: document.getElementById('newAdminPassInput'),
  confirmAdminPassInput: document.getElementById('confirmAdminPassInput'),
  changePasswordFeedback: document.getElementById('changePasswordFeedback'),
  saveNewPasswordBtn: document.getElementById('saveNewPasswordBtn'),
};

function initAdmin() {
  DOM.adminKeyInput.value = ADMIN_KEY;
  setupEvents();
  loadAllData();
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
    await fetchLoans();
    await fetchHistoricalLedgers();
    await fetchMasterSpreadsheet();
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

  DOM.globalMinAmount.value = g.min_amount;
  DOM.globalMaxAmount.value = g.max_amount;
  DOM.globalMinDays.value = g.min_duration_days;
  DOM.globalMaxDays.value = g.max_duration_days;
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
  const client = loan.client_profiles || { name: 'GIXSAM', phone_number: '+8801612669922' };
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
    return;
  }

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

// ─── Setup Event Listeners ────────────────────────────────────────────────────
function setupEvents() {
  DOM.adminKeyInput.addEventListener('change', () => {
    ADMIN_KEY = DOM.adminKeyInput.value.trim();
    sessionStorage.setItem('sep_admin_key', ADMIN_KEY);
    loadAllData();
  });

  DOM.refreshLoansBtn.addEventListener('click', () => {
    fetchLoans();
    fetchClients();
    fetchHistoricalLedgers();
    fetchMasterSpreadsheet();
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
  DOM.globalForm.addEventListener('submit', async (e) => {
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
  DOM.clientSelector.addEventListener('change', (e) => {
    const clientId = e.target.value;
    if (!clientId) {
      DOM.overridePanel.classList.add('hidden');
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
    DOM.overridePanel.classList.remove('hidden');
  });

  // Client Override Submit
  DOM.clientOverrideForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = DOM.clientSelector.value;
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
  DOM.resetOverrideBtn.addEventListener('click', async () => {
    const clientId = DOM.clientSelector.value;
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
}

document.addEventListener('DOMContentLoaded', initAdmin);
