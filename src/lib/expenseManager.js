'use strict';
/**
 * src/lib/expenseManager.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Daily Expense Tracking & Cost Split Engine
 *
 * Handles:
 *   1. Daily operational and capital expenditures (Disbursements, Field Recovery, Transport, Office, MFS fees)
 *   2. Client Cost Split Allocation Engine (linking overhead or recovery costs to client loan accounts)
 *   3. Monthly and Category analytics aggregations
 *   4. JSON persistence backed by data/expenses.json
 */

const fs   = require('fs');
const path = require('path');
const { supabaseAdmin } = require('./supabase');

const EXPENSES_FILE = path.join(__dirname, '../../data/expenses.json');

// Valid Expense Categories
const EXPENSE_CATEGORIES = [
  'LOAN_DISBURSEMENT',
  'FIELD_RECOVERY_TRANSPORT',
  'MFS_CASHOUT_FEE',
  'OFFICE_OVERHEAD',
  'COMMUNICATION_SMS_INTERNET',
  'LEGAL_COMPLIANCE',
  'MISCELLANEOUS'
];

let expensesCache = [];

function loadExpenses() {
  try {
    if (fs.existsSync(EXPENSES_FILE)) {
      const raw = fs.readFileSync(EXPENSES_FILE, 'utf8');
      expensesCache = JSON.parse(raw);
    } else {
      expensesCache = [];
      saveExpenses();
    }
  } catch (err) {
    console.error('[ExpenseManager] Error loading expenses:', err.message);
    expensesCache = [];
  }
}

function saveExpenses() {
  try {
    const dir = path.dirname(EXPENSES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(EXPENSES_FILE, JSON.stringify(expensesCache, null, 2), 'utf8');
  } catch (err) {
    console.error('[ExpenseManager] Error saving expenses:', err.message);
  }
}

// Initial load
loadExpenses();

const expenseManager = {
  CATEGORIES: EXPENSE_CATEGORIES,

  getAll(filterCategory = null) {
    loadExpenses();
    let list = [...expensesCache];
    if (filterCategory) {
      list = list.filter(e => e.category === filterCategory);
    }
    return list.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  },

  getById(id) {
    loadExpenses();
    return expensesCache.find(e => e.id === id) || null;
  },

  create(expenseData) {
    loadExpenses();
    const amount = parseFloat(expenseData.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('A valid positive expense amount is required.');
    }

    const category = (expenseData.category || 'MISCELLANEOUS').toUpperCase();
    const date = expenseData.date || new Date().toISOString().split('T')[0];

    // Process Cost Splits if provided
    let splits = [];
    if (Array.isArray(expenseData.splits) && expenseData.splits.length > 0) {
      splits = expenseData.splits.map(s => {
        const sharePct = parseFloat(s.share_percentage) || (100 / expenseData.splits.length);
        const allocated = parseFloat(s.allocated_amount) || ((amount * sharePct) / 100);
        return {
          client_id: s.client_id || null,
          client_name: s.client_name || 'General Allocation',
          share_percentage: Math.round(sharePct * 100) / 100,
          allocated_amount: Math.round(allocated * 100) / 100,
          note: s.note || '',
        };
      });
    }

    const newExpense = {
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      date,
      category,
      amount: Math.round(amount * 100) / 100,
      payee: (expenseData.payee || 'Self / Direct Cash').trim(),
      note: (expenseData.note || '').trim(),
      splits,
      created_at: new Date().toISOString(),
      created_by: expenseData.created_by || 'ADMIN',
    };

    expensesCache.unshift(newExpense);
    saveExpenses();

    // Async sync to Supabase if table exists
    try {
      supabaseAdmin.from('daily_expenses').insert([{
        id: newExpense.id,
        date: newExpense.date,
        category: newExpense.category,
        amount: newExpense.amount,
        payee: newExpense.payee,
        note: newExpense.note,
        splits: newExpense.splits,
        created_at: newExpense.created_at,
      }]).then(({ error }) => {
        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.warn('[ExpenseManager] Supabase sync note:', error.message);
        }
      }).catch(() => {});
    } catch (_) {}

    return newExpense;
  },

  delete(id) {
    loadExpenses();
    const idx = expensesCache.findIndex(e => e.id === id);
    if (idx === -1) {
      return false;
    }
    const removed = expensesCache.splice(idx, 1)[0];
    saveExpenses();

    try {
      supabaseAdmin.from('daily_expenses').delete().eq('id', id).then(() => {}).catch(() => {});
    } catch (_) {}

    return removed;
  },

  getSummary() {
    loadExpenses();
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalAmount = 0;
    let thisMonthAmount = 0;
    const categoryTotals = {};

    EXPENSE_CATEGORIES.forEach(c => { categoryTotals[c] = 0; });

    expensesCache.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      totalAmount += amt;

      const itemDate = item.date || item.created_at || '';
      if (itemDate.startsWith(currentMonthStr)) {
        thisMonthAmount += amt;
      }

      const cat = item.category || 'MISCELLANEOUS';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    });

    return {
      total_count: expensesCache.length,
      total_amount: Math.round(totalAmount),
      this_month_amount: Math.round(thisMonthAmount),
      category_breakdown: categoryTotals,
      recent_items: expensesCache.slice(0, 5),
    };
  }
};

module.exports = expenseManager;
