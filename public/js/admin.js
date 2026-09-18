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
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load historical ledgers:', err);
  }
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
}

document.addEventListener('DOMContentLoaded', initAdmin);
