'use strict';
/**
 * public/js/admin.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Executive Administration Panel Logic
 */

let ADMIN_KEY = sessionStorage.getItem('sep_admin_key') || 'SEP_ADMIN_2026';
let CLIENTS_CACHE = [];
let SETTINGS_CACHE = null;

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
    'Content-Type': 'application/json',
    'x-admin-key': ADMIN_KEY,
  };
}

// ─── Load All Data ────────────────────────────────────────────────────────────
async function loadAllData() {
  try {
    await fetchSettings();
    await fetchClients();
    await fetchLoans();
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

  // Populate client selector
  DOM.clientSelector.innerHTML = '<option value="">-- Choose a registered client --</option>' +
    CLIENTS_CACHE.map(c => `
      <option value="${c.id}">${c.name} (${c.phone_number}) — Strikes: ${c.strikes_count}</option>
    `).join('');

  // Render clients table
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

// ─── Loans API ────────────────────────────────────────────────────────────────
async function fetchLoans() {
  const res = await fetch('/api/admin/loans', { headers: getHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);

  const loans = json.loans || [];
  DOM.loansCount.textContent = `${loans.length} Application(s)`;

  if (loans.length === 0) {
    DOM.loansTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="p-6 text-center text-slate-500 text-xs">
          No loan applications submitted yet.
        </td>
      </tr>
    `;
    return;
  }

  DOM.loansTableBody.innerHTML = loans.map(l => {
    const client = l.client_profiles || { name: 'Unknown', phone_number: '—' };
    let statusClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    if (l.status === 'ACCEPTED') statusClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    if (l.status === 'DECLINED') statusClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';

    const isPending = l.status === 'PENDING';

    return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] text-xs">
        <td class="py-3 px-4 font-mono text-[11px] text-slate-400">#${l.id.slice(0, 8)}</td>
        <td class="py-3 px-4">
          <div class="font-bold text-white">${client.name}</div>
          <div class="font-mono text-[10px] text-emerald-400">${client.phone_number}</div>
        </td>
        <td class="py-3 px-4 font-black text-sm text-emerald-400">
          ৳${parseFloat(l.amount).toLocaleString()}
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
            <button onclick="decideLoan('${l.id}', 'ACCEPTED')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow">
              <i class="fas fa-check mr-1"></i> Accept
            </button>
            <button onclick="decideLoan('${l.id}', 'DECLINED')" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold shadow">
              <i class="fas fa-times mr-1"></i> Decline
            </button>
          ` : `
            <span class="text-[10px] text-slate-500 font-mono">${l.status}</span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

// ─── Loan Actions ─────────────────────────────────────────────────────────────
async function decideLoan(loanId, decision) {
  const note = prompt(`Enter administrative note for marking loan as ${decision}:`, `Approved by loan admin on ${new Date().toLocaleDateString()}`);
  if (note === null) return; // cancelled

  try {
    const res = await fetch(`/api/admin/loans/${loanId}/decision`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ decision, admin_note: note }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);

    alert(`Loan marked as ${decision}.`);
    await fetchLoans();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

async function clearClientStrikes(clientId) {
  if (!confirm('Clear all strikes for this client?')) return;

  try {
    const res = await fetch(`/api/admin/clients/${clientId}/status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ strikes_count: 0, status: 'ACTIVE', admin_note: 'Strikes cleared by admin' }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message);
    alert('Strikes reset to 0.');
    await fetchClients();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// ─── Client Override Selection ────────────────────────────────────────────────
window.selectClientForOverride = function(clientId) {
  DOM.clientSelector.value = clientId;
  DOM.clientSelector.dispatchEvent(new Event('change'));
  DOM.overridePanel.scrollIntoView({ behavior: 'smooth' });
};

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
        headers: getHeaders(),
        body: JSON.stringify({ min_amount, max_amount, min_duration_days, max_duration_days }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      DOM.globalFeedback.className = 'p-3 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30';
      DOM.globalFeedback.textContent = '✅ Global limits updated! All clients without custom overrides now use these new limits.';
      DOM.globalFeedback.classList.remove('hidden');

      setTimeout(() => DOM.globalFeedback.classList.add('hidden'), 5000);
      await fetchClients();
    } catch (err) {
      DOM.globalFeedback.className = 'p-3 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30';
      DOM.globalFeedback.textContent = `❌ ${err.message}`;
      DOM.globalFeedback.classList.remove('hidden');
    }
  });

  // Client Selector Change
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

  // Client Override Form Submit
  DOM.clientOverrideForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = DOM.clientSelector.value;
    if (!clientId) return;

    const min_amount = parseFloat(DOM.overrideMinAmount.value);
    const max_amount = parseFloat(DOM.overrideMaxAmount.value);
    const min_duration_days = parseInt(DOM.overrideMinDays.value, 10);
    const max_duration_days = parseInt(DOM.overrideMaxDays.value, 10);
    const note = DOM.overrideNote.value.trim();

    try {
      const res = await fetch(`/api/admin/settings/client/${clientId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ min_amount, max_amount, min_duration_days, max_duration_days, note }),
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

  // Reset Override Button
  DOM.resetOverrideBtn.addEventListener('click', async () => {
    const clientId = DOM.clientSelector.value;
    if (!clientId) return;
    if (!confirm('Remove custom limits and restore global limits for this client?')) return;

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
