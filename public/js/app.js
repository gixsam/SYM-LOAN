'use strict';
/**
 * public/js/app.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Client Application Engine
 */

const STATE = {
  client: null,
  limits: null,
  loans: [],
};

const DOM = {
  clientBadge: document.getElementById('clientBadge'),
  clientName: document.getElementById('clientName'),
  clientPhone: document.getElementById('clientPhone'),
  clientIdText: document.getElementById('clientIdText'),
  clientStatusPill: document.getElementById('clientStatusPill'),
  strikeDots: document.getElementById('strikeDots'),
  strikeCountText: document.getElementById('strikeCountText'),
  phoneInputModal: document.getElementById('phoneInputModal'),
  phoneInput: document.getElementById('phoneInput'),
  phoneSearchBtn: document.getElementById('phoneSearchBtn'),
  phoneError: document.getElementById('phoneError'),
  logoutBtn: document.getElementById('logoutBtn'),

  // Form elements
  loanForm: document.getElementById('loanForm'),
  amountSlider: document.getElementById('amountSlider'),
  amountInput: document.getElementById('amountInput'),
  minAmountLabel: document.getElementById('minAmountLabel'),
  maxAmountLabel: document.getElementById('maxAmountLabel'),
  deadlineDate: document.getElementById('deadlineDate'),
  durationNotice: document.getElementById('durationNotice'),
  durationDaysBadge: document.getElementById('durationDaysBadge'),
  loanNote: document.getElementById('loanNote'),
  submitBtn: document.getElementById('submitBtn'),
  formFeedback: document.getElementById('formFeedback'),

  // Loans list
  loansContainer: document.getElementById('loansContainer'),
  loansCountBadge: document.getElementById('loansCountBadge'),
};

// ─── Initialize Application ──────────────────────────────────────────────────
async function initApp() {
  loadSavedClient();
  setupEventListeners();

  if (STATE.client) {
    await fetchClientProfile(STATE.client.id);
  } else {
    // Check if phone was passed in URL query
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get('phone');
    if (phoneParam) {
      await lookupClientByPhone(phoneParam);
    } else {
      // Default to the first known client or open login prompt
      openLoginModal();
    }
  }
}

// ─── Client Session Management ────────────────────────────────────────────────
function loadSavedClient() {
  const saved = localStorage.getItem('sep_loan_client');
  if (saved) {
    try {
      STATE.client = JSON.parse(saved);
    } catch (e) {
      localStorage.removeItem('sep_loan_client');
    }
  }
}

function saveClient(client) {
  STATE.client = client;
  localStorage.setItem('sep_loan_client', JSON.stringify(client));
}

function openLoginModal() {
  DOM.phoneInputModal.classList.remove('hidden');
}

function closeLoginModal() {
  DOM.phoneInputModal.classList.add('hidden');
}

// ─── Lookup Client by Phone ───────────────────────────────────────────────────
async function lookupClientByPhone(phone) {
  try {
    DOM.phoneSearchBtn.disabled = true;
    DOM.phoneSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    DOM.phoneError.classList.add('hidden');

    const res = await fetch(`/api/clients/lookup/phone?phone=${encodeURIComponent(phone)}`);
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Client profile not found. Please register on Telegram @money_loan_bot first.');
    }

    saveClient(json.client);
    closeLoginModal();
    renderClientUI(json.client);
    if (json.limits) {
      applyLimits(json.limits);
    } else {
      await fetchLimits(json.client.id);
    }
    await fetchClientLoans(json.client.id);
  } catch (err) {
    DOM.phoneError.textContent = err.message;
    DOM.phoneError.classList.remove('hidden');
  } finally {
    DOM.phoneSearchBtn.disabled = false;
    DOM.phoneSearchBtn.innerHTML = 'Enter Dashboard <i class="fas fa-arrow-right ml-2"></i>';
  }
}

async function fetchClientProfile(clientId) {
  try {
    const res = await fetch(`/api/clients/${clientId}`);
    const json = await res.json();
    if (res.ok && json.success) {
      saveClient(json.data);
      renderClientUI(json.data);
      if (json.limits) applyLimits(json.limits);
      else await fetchLimits(clientId);
      await fetchClientLoans(clientId);
    } else {
      openLoginModal();
    }
  } catch (err) {
    console.error('Failed to fetch client:', err);
  }
}

// ─── Fetch Dynamic Admin Limits ───────────────────────────────────────────────
async function fetchLimits(clientId) {
  try {
    const url = clientId ? `/api/config/limits?client_id=${clientId}` : '/api/config/limits';
    const res = await fetch(url);
    const json = await res.json();
    if (res.ok && json.success) {
      applyLimits(json.limits);
    }
  } catch (err) {
    console.error('Error fetching limits:', err);
  }
}

// ─── Apply Admin Limits to the Form ───────────────────────────────────────────
function applyLimits(limits) {
  STATE.limits = limits;

  // 1. Amount Limits
  const min = limits.min_amount;
  const max = limits.max_amount;

  DOM.minAmountLabel.textContent = `৳${min.toLocaleString()}`;
  DOM.maxAmountLabel.textContent = `৳${max.toLocaleString()}`;

  DOM.amountSlider.min = min;
  DOM.amountSlider.max = max;
  DOM.amountSlider.step = min >= 1000 ? 500 : 100;

  // Set initial amount (middle or current)
  const defaultVal = Math.min(Math.max(5000, min), max);
  DOM.amountSlider.value = defaultVal;
  DOM.amountInput.value = defaultVal;
  DOM.amountInput.min = min;
  DOM.amountInput.max = max;

  // 2. Deadline Date Restrictions (Calculated Start to Finish duration)
  DOM.deadlineDate.min = limits.min_date;
  DOM.deadlineDate.max = limits.max_date;

  // Default to minimum date
  DOM.deadlineDate.value = limits.min_date;

  // Duration Notice
  DOM.durationNotice.innerHTML = `
    <i class="fas fa-calendar-check text-amber-400 mr-1.5"></i>
    Admin Window: <b>${limits.min_duration_days} to ${limits.max_duration_days} days</b> 
    (${formatDateShort(limits.min_date)} – ${formatDateShort(limits.max_date)})
  `;

  updateCalculatedDuration();
}

function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]}`;
}

// Calculate days between today and selected date
function updateCalculatedDuration() {
  if (!STATE.limits || !DOM.deadlineDate.value) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = new Date(DOM.deadlineDate.value);
  selected.setHours(0, 0, 0, 0);

  const diffTime = selected.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < STATE.limits.min_duration_days || diffDays > STATE.limits.max_duration_days) {
    DOM.durationDaysBadge.className = 'text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40';
    DOM.durationDaysBadge.textContent = `${diffDays} days (Out of bounds)`;
  } else {
    DOM.durationDaysBadge.className = 'text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
    DOM.durationDaysBadge.textContent = `${diffDays} days duration`;
  }
}

// ─── Render Client Profile UI ─────────────────────────────────────────────────
function renderClientUI(client) {
  DOM.clientName.textContent = client.name || 'Client';
  DOM.clientPhone.textContent = client.phone_number || '';
  DOM.clientIdText.textContent = client.id ? client.id.slice(0, 13) + '...' : '—';

  // Status pill
  const status = client.status || 'ACTIVE';
  DOM.clientStatusPill.textContent = status;
  if (status === 'ACTIVE') {
    DOM.clientStatusPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
  } else if (status === 'BLOCKED' || status === 'FRAUD') {
    DOM.clientStatusPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40';
  } else {
    DOM.clientStatusPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40';
  }

  // Strike Dots (3 dots)
  const strikes = client.strikes_count || 0;
  DOM.strikeCountText.textContent = `${strikes} / 3`;
  DOM.strikeDots.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
    const dot = document.createElement('div');
    if (i <= strikes) {
      dot.className = 'strike-dot active';
    } else {
      dot.className = 'strike-dot clean';
    }
    DOM.strikeDots.appendChild(dot);
  }

  // Disable form if blocked
  if (status === 'BLOCKED') {
    DOM.submitBtn.disabled = true;
    DOM.submitBtn.textContent = 'Account Blocked — Cannot Request Loans';
    DOM.submitBtn.className = 'w-full py-3.5 rounded-xl font-bold bg-gray-800 text-gray-500 cursor-not-allowed';
  } else {
    DOM.submitBtn.disabled = false;
    DOM.submitBtn.innerHTML = 'Submit Money Request <i class="fas fa-paper-plane ml-2"></i>';
    DOM.submitBtn.className = 'btn-gold w-full py-3.5 rounded-xl font-black text-sm tracking-wide shadow-lg uppercase';
  }
}

// ─── Fetch Client Loans ───────────────────────────────────────────────────────
async function fetchClientLoans(clientId) {
  try {
    const res = await fetch(`/api/clients/${clientId}/loans`);
    const json = await res.json();
    if (res.ok && json.success) {
      STATE.loans = json.data || [];
      renderLoans(STATE.loans);
    }
  } catch (err) {
    console.error('Failed to fetch loans:', err);
  }
}

function renderLoans(loans) {
  DOM.loansCountBadge.textContent = `${loans.length} Record(s)`;

  if (!loans || loans.length === 0) {
    DOM.loansContainer.innerHTML = `
      <div class="p-6 text-center text-slate-500 text-sm">
        <i class="fas fa-receipt text-3xl mb-2 text-slate-600 block"></i>
        No loan applications yet. Fill out the request form above to apply.
      </div>
    `;
    return;
  }

  DOM.loansContainer.innerHTML = loans.map(loan => {
    let statusClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    let icon = 'fa-clock';
    if (loan.status === 'ACCEPTED') {
      statusClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      icon = 'fa-check-circle';
    } else if (loan.status === 'DECLINED') {
      statusClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      icon = 'fa-times-circle';
    }

    const isOverdue = loan.status === 'ACCEPTED' && new Date(loan.deadline_date) < new Date();
    const d = loan.disbursement || {};

    // Method badge
    let methodBadge = '';
    if (d.payout_method) {
      if (d.payout_method === 'BKASH') {
        methodBadge = `
          <div class="mt-2.5 flex items-center justify-between p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-xs">
            <div class="flex items-center space-x-1.5">
              <span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
              <span class="font-bold text-pink-400">bKash Disbursed</span>
              <span class="text-[10px] font-mono text-slate-400">TrxID: <b class="text-white">${d.trx_id || 'N/A'}</b></span>
            </div>
            ${d.mfs_fee ? `<span class="text-[10px] font-mono text-amber-400">+৳${d.mfs_fee} fee</span>` : ''}
          </div>
        `;
      } else if (d.payout_method === 'NAGAD') {
        methodBadge = `
          <div class="mt-2.5 flex items-center justify-between p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs">
            <div class="flex items-center space-x-1.5">
              <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span class="font-bold text-orange-400">Nagad Disbursed</span>
              <span class="text-[10px] font-mono text-slate-400">TrxID: <b class="text-white">${d.trx_id || 'N/A'}</b></span>
            </div>
            ${d.mfs_fee ? `<span class="text-[10px] font-mono text-amber-400">+৳${d.mfs_fee} fee</span>` : ''}
          </div>
        `;
      } else {
        methodBadge = `
          <div class="mt-2.5 flex items-center space-x-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <i class="fas fa-hand-holding-usd text-emerald-400"></i>
            <span class="font-bold text-emerald-400">Direct Cash Handover</span>
          </div>
        `;
      }
    }

    return `
      <div class="glass-card p-4 transition hover:border-slate-600">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <span class="text-xl font-black text-emerald-400">৳${parseFloat(loan.amount).toLocaleString()}</span>
            <span class="text-xs font-mono text-slate-400">#${loan.id.slice(0, 6)}</span>
          </div>
          <span class="px-2 py-0.5 rounded text-xs font-bold border uppercase flex items-center ${statusClass}">
            <i class="fas ${icon} mr-1"></i> ${loan.status}
          </span>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-400">
          <div>
            <i class="far fa-calendar-alt mr-1 text-slate-400"></i> Due: <b class="text-slate-200">${loan.deadline_date}</b>
            ${isOverdue ? '<span class="ml-1 text-rose-400 font-bold">[OVERDUE]</span>' : ''}
          </div>
          <div>${new Date(loan.created_at).toLocaleDateString()}</div>
        </div>

        ${methodBadge}

        <!-- Actions: Receipt Preview & PDF Voucher Download -->
        <div class="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-end space-x-2">
          ${d.receipt_url ? `
            <button onclick="openClientReceiptModal('${d.receipt_url}')" class="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-[11px] font-bold border border-blue-500/30 flex items-center">
              <i class="fas fa-image mr-1.5"></i> Payment Proof
            </button>
          ` : ''}

          ${loan.status === 'ACCEPTED' ? `
            <button onclick="clientDownloadVoucher('${loan.id}')" class="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold border border-amber-500/30 flex items-center">
              <i class="fas fa-file-pdf mr-1.5 text-amber-400"></i> Voucher (PDF)
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Receipt & Voucher handlers for Client Portal
window.openClientReceiptModal = function(url) {
  const modal = document.getElementById('clientReceiptModal');
  const img = document.getElementById('clientReceiptImg');
  const link = document.getElementById('clientReceiptDownloadLink');
  if (modal && img) {
    img.src = url;
    if (link) link.href = url;
    modal.classList.remove('hidden');
  }
};

window.clientDownloadVoucher = function(loanId) {
  const loan = STATE.loans.find(l => l.id === loanId);
  if (!loan) return;
  window.generateLoanVoucherPdf(loan, STATE.client || { name: 'Client' });
};

// ─── Setup Event Listeners ────────────────────────────────────────────────────
function setupEventListeners() {
  // Sync slider and number input
  DOM.amountSlider.addEventListener('input', (e) => {
    DOM.amountInput.value = e.target.value;
  });

  DOM.amountInput.addEventListener('input', (e) => {
    DOM.amountSlider.value = e.target.value;
  });

  // Date change
  DOM.deadlineDate.addEventListener('change', updateCalculatedDuration);

  // Phone lookup modal submit
  DOM.phoneSearchBtn.addEventListener('click', () => {
    const phone = DOM.phoneInput.value.trim();
    if (phone) lookupClientByPhone(phone);
  });

  DOM.phoneInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const phone = DOM.phoneInput.value.trim();
      if (phone) lookupClientByPhone(phone);
    }
  });

  // Logout / Switch client
  DOM.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('sep_loan_client');
    STATE.client = null;
    DOM.phoneInput.value = '';
    openLoginModal();
  });

  // Close receipt lightbox
  const closeReceiptBtn = document.getElementById('closeClientReceiptBtn');
  if (closeReceiptBtn) {
    closeReceiptBtn.addEventListener('click', () => {
      document.getElementById('clientReceiptModal')?.classList.add('hidden');
    });
  }

  // Submit loan application
  DOM.loanForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!STATE.client) {
      openLoginModal();
      return;
    }

    const amount = parseFloat(DOM.amountInput.value);
    const deadline = DOM.deadlineDate.value;
    const note = DOM.loanNote.value.trim();

    DOM.submitBtn.disabled = true;
    DOM.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    DOM.formFeedback.classList.add('hidden');

    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STATE.client.id,
          amount,
          deadline_date: deadline,
          admin_note: note,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Submission failed.');
      }

      // Success
      DOM.formFeedback.className = 'mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold';
      DOM.formFeedback.innerHTML = `
        <div class="flex items-center">
          <i class="fas fa-check-circle text-lg mr-2 text-emerald-400"></i>
          <span>${json.message}</span>
        </div>
      `;
      DOM.formFeedback.classList.remove('hidden');

      DOM.loanNote.value = '';
      await fetchClientLoans(STATE.client.id);

      setTimeout(() => {
        DOM.formFeedback.classList.add('hidden');
      }, 6000);

    } catch (err) {
      DOM.formFeedback.className = 'mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold';
      DOM.formFeedback.innerHTML = `
        <div class="flex items-center">
          <i class="fas fa-exclamation-triangle text-lg mr-2 text-rose-400"></i>
          <span>${err.message}</span>
        </div>
      `;
      DOM.formFeedback.classList.remove('hidden');
    } finally {
      DOM.submitBtn.disabled = false;
      DOM.submitBtn.innerHTML = 'Submit Money Request <i class="fas fa-paper-plane ml-2"></i>';
    }
  });
}

// Run bootstrap
document.addEventListener('DOMContentLoaded', initApp);
