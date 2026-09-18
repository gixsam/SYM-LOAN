'use strict';
/**
 * src/lib/smsService.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Multi-Channel SMS & Telegram Reminder Dispatch Engine
 *
 * Capabilities:
 *   1. Pluggable SMS gateway integration (Greenweb, BulkSMS BD, Twilio, or Simulated logger)
 *   2. Telegram direct reminder dispatch via @money_loan_bot
 *   3. Multi-tier pre-due & overdue reminder templates
 *   4. Anti-spam idempotency frequency capping (prevent duplicate alerts within same day)
 *   5. Persistent audit logging in data/reminders.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { bot } = require('../bot/index');

const REMINDERS_FILE = path.join(__dirname, '../../data/reminders.json');

// Memory cache
let remindersCache = null;

function ensureDataFile() {
  const dir = path.dirname(REMINDERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(REMINDERS_FILE)) {
    fs.writeFileSync(REMINDERS_FILE, '[]', 'utf8');
    remindersCache = [];
  }
}

function loadReminders() {
  if (remindersCache !== null) return remindersCache;
  ensureDataFile();
  try {
    const raw = fs.readFileSync(REMINDERS_FILE, 'utf8').replace(/^\uFEFF/, '');
    remindersCache = JSON.parse(raw);
    if (!Array.isArray(remindersCache)) remindersCache = [];
  } catch (err) {
    console.warn('[SmsService] Error parsing data/reminders.json, resetting to []:', err.message);
    remindersCache = [];
  }
  return remindersCache;
}

function saveReminders() {
  ensureDataFile();
  try {
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(remindersCache || [], null, 2), 'utf8');
  } catch (err) {
    console.error('[SmsService] Failed to persist data/reminders.json:', err.message);
  }
}

/**
 * Standard Multi-Tier Reminder Message Templates
 */
function buildReminderMessage(templateType, client, loan, customText) {
  const clientName = client?.name || 'Valued Client';
  const amount = loan?.amount ? `৳${Number(loan.amount).toLocaleString('en-BD')}` : 'your loan';
  const deadline = loan?.deadline_date || 'scheduled date';
  const strikeCount = client?.strikes_count || 0;

  if (customText && customText.trim()) {
    return customText.trim();
  }

  switch (templateType) {
    case 'PRE_DUE_3D':
      return `⏰ [SYM LOAN Reminder] Dear ${clientName}, your loan of ${amount} is due in 3 days on ${deadline}. Please prepare repayment via bKash/Nagad/Rocket/Bank to maintain your 5-star credit standing. Portal: https://symloan.best-travel.ltd`;

    case 'PRE_DUE_1D':
      return `⚠️ [SYM LOAN Urgent Notice] Dear ${clientName}, your loan of ${amount} is due TOMORROW (${deadline})! Settle timely to prevent penalty strikes and protect your borrowing privileges. Portal: https://symloan.best-travel.ltd`;

    case 'DUE_TODAY':
      return `🚨 [SYM LOAN FINAL CALL] Dear ${clientName}, your loan of ${amount} is DUE TODAY (${deadline})! Please repay immediately via our portal or official MFS accounts to avoid automatic overdue strikes. Portal: https://symloan.best-travel.ltd`;

    case 'OVERDUE_STRIKE':
      return `🔴 [SYM LOAN OVERDUE ALERT] Strike #${strikeCount} has been issued to ${clientName}! Your loan of ${amount} is OVERDUE (due: ${deadline}). Accumulating 3 strikes results in PERMANENT ACCOUNT BLACKLIST & legal collection actions. Settle immediately: https://symloan.best-travel.ltd`;

    case 'ACCOUNT_BLOCKED':
      return `⛔ [SYM LOAN ACCOUNT LOCKED] ${clientName}, your account is now PERMANENTLY BLOCKED due to reaching 3 Overdue Strikes on loan ${amount}. Contact recovery desk immediately to settle outstanding debts: https://symloan.best-travel.ltd`;

    case 'MANUAL_DUNNING':
    default:
      return `📢 [SYM LOAN Collection Notice] Dear ${clientName}, this is an urgent notice regarding your active loan of ${amount} (Due: ${deadline}). Please visit https://symloan.best-travel.ltd or contact support immediately.`;
  }
}

/**
 * Low-level SMS Sender (Pluggable Gateway or Simulated Dispatch)
 */
async function sendSms(phoneNumber, messageText, metadata = {}) {
  const cleanPhone = (phoneNumber || '').replace(/[^0-9+]/g, '');
  const smsEnabled = process.env.SMS_ENABLED === 'true';
  const gatewayUrl = process.env.SMS_GATEWAY_URL;
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || 'SYMLOAN';

  if (!cleanPhone) {
    return { success: false, status: 'FAILED', error: 'Missing recipient phone number' };
  }

  // If live SMS gateway is configured
  if (smsEnabled && gatewayUrl && apiKey) {
    try {
      // Common Bangladesh Gateway payload format
      const payload = JSON.stringify({
        api_key: apiKey,
        sender_id: senderId,
        to: cleanPhone,
        message: messageText,
        ...metadata,
      });

      const urlObj = new URL(gatewayUrl);
      const requestModule = urlObj.protocol === 'https:' ? https : http;

      const response = await new Promise((resolve, reject) => {
        const req = requestModule.request(urlObj, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 5000,
        }, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('SMS Gateway connection timed out.'));
        });

        req.write(payload);
        req.end();
      });

      console.log(`[SmsService] 🌐 Live SMS sent to ${cleanPhone} (HTTP ${response.statusCode})`);
      return { success: true, status: 'DELIVERED', gatewayResponse: response.body };
    } catch (err) {
      console.warn(`[SmsService] ⚠️ Live SMS gateway error for ${cleanPhone}:`, err.message);
      return { success: false, status: 'GATEWAY_ERROR', error: err.message };
    }
  }

  // Development / Simulation Fallback (Ensures zero failures when credentials are not configured)
  console.log(`[SmsService] 📱 [SIMULATED SMS] To: ${cleanPhone} | Msg: "${messageText.substring(0, 80)}..."`);
  return {
    success: true,
    status: 'SIMULATED_DELIVERED',
    note: 'SMS simulated successfully. Configure SMS_GATEWAY_URL and SMS_API_KEY in .env for live carrier delivery.'
  };
}

/**
 * Telegram Direct Message Sender
 */
async function sendTelegramDirectMessage(chatId, messageText) {
  if (!bot) {
    console.log(`[SmsService] 🤖 [SIMULATED TG] Bot not active. Msg to ${chatId}: "${messageText.substring(0, 80)}..."`);
    return { success: true, status: 'SIMULATED_DELIVERED', note: 'Telegram bot not initialized in current environment.' };
  }

  if (!chatId) {
    return { success: false, status: 'FAILED', error: 'Missing Telegram chat ID for client.' };
  }

  try {
    const sendPromise = bot.api.sendMessage({
      chat_id: chatId,
      text: messageText,
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Telegram timeout')), 4000));
    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`[SmsService] 🤖 ✅ Telegram message sent to chat ${chatId}`);
    return { success: true, status: 'DELIVERED' };
  } catch (err) {
    console.warn(`[SmsService] 🤖 ⚠️ Telegram send notice for chat ${chatId}:`, err.message);
    // Soft fallback so errors don't crash the engine
    return { success: false, status: 'TELEGRAM_ERROR', error: err.message };
  }
}

/**
 * Check if a client was already reminded for this loan and milestone TODAY
 * Prevents spamming borrowers multiple times per day.
 */
function hasBeenRemindedToday(clientId, loanId, templateType) {
  loadReminders();
  const today = new Date().toISOString().split('T')[0];

  return remindersCache.some(rec => {
    if (rec.client_id !== clientId) return false;
    if (loanId && rec.loan_id !== loanId) return false;
    if (rec.template_type !== templateType) return false;
    const recDate = (rec.dispatched_at || '').split('T')[0];
    return recDate === today;
  });
}

/**
 * Unified Dispatcher: Dispatches reminder across chosen channels and logs audit record
 */
async function dispatchReminder({
  channel = 'BOTH', // 'TELEGRAM' | 'SMS' | 'BOTH'
  client,
  loan,
  templateType = 'MANUAL_DUNNING',
  customText = null,
  trigger = 'AUTOMATED_CRON', // 'AUTOMATED_CRON' | 'ADMIN_MANUAL'
}) {
  loadReminders();

  const clientId = client?.id || 'unknown';
  const clientName = client?.name || 'Client';
  const clientPhone = client?.phone_number || '';
  const telegramChatId = client?.telegram_chat_id || client?.metadata?.telegram_id || null;
  const loanId = loan?.id || null;
  const amount = loan?.amount || 0;
  const deadline = loan?.deadline_date || null;

  const messageText = buildReminderMessage(templateType, client, loan, customText);
  const results = { telegram: null, sms: null };
  const targetChannel = channel.toUpperCase();

  // 1. Telegram Dispatch
  if (targetChannel === 'TELEGRAM' || targetChannel === 'BOTH') {
    if (telegramChatId) {
      results.telegram = await sendTelegramDirectMessage(telegramChatId, messageText);
    } else {
      results.telegram = { success: false, status: 'NO_TELEGRAM_ID', note: 'Client has not connected Telegram account.' };
    }
  }

  // 2. SMS Dispatch
  if (targetChannel === 'SMS' || targetChannel === 'BOTH') {
    if (clientPhone) {
      results.sms = await sendSms(clientPhone, messageText, { loanId, clientId });
    } else {
      results.sms = { success: false, status: 'NO_PHONE_NUMBER', note: 'Client has no phone number on file.' };
    }
  }

  // Determine overall status
  const atLeastOneSuccess = (results.telegram && results.telegram.success) || (results.sms && results.sms.success);
  const finalStatus = atLeastOneSuccess ? 'DELIVERED' : 'FAILED';

  const logRecord = {
    id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    client_id: clientId,
    client_name: clientName,
    client_phone: clientPhone,
    loan_id: loanId,
    loan_amount: amount,
    deadline_date: deadline,
    channel: targetChannel,
    template_type: templateType,
    message_text: messageText,
    trigger,
    status: finalStatus,
    results,
    dispatched_at: new Date().toISOString(),
  };

  remindersCache.unshift(logRecord);
  // Cap cache at last 1000 records to maintain high performance
  if (remindersCache.length > 1000) {
    remindersCache = remindersCache.slice(0, 1000);
  }
  saveReminders();

  return {
    success: atLeastOneSuccess,
    record: logRecord,
  };
}

/**
 * Query Reminder Logs with Filters
 */
function getReminderLogs(filters = {}) {
  loadReminders();
  let logs = [...remindersCache];

  if (filters.client_id) {
    logs = logs.filter(l => l.client_id === filters.client_id);
  }
  if (filters.loan_id) {
    logs = logs.filter(l => l.loan_id === filters.loan_id);
  }
  if (filters.channel && filters.channel !== 'ALL') {
    logs = logs.filter(l => l.channel === filters.channel.toUpperCase());
  }
  if (filters.template_type && filters.template_type !== 'ALL') {
    logs = logs.filter(l => l.template_type === filters.template_type.toUpperCase());
  }
  if (filters.date) {
    logs = logs.filter(l => (l.dispatched_at || '').startsWith(filters.date));
  }

  const limit = parseInt(filters.limit, 10) || 50;
  return logs.slice(0, limit);
}

/**
 * Get aggregated reminder stats
 */
function getStats() {
  loadReminders();
  const today = new Date().toISOString().split('T')[0];

  const todayLogs = remindersCache.filter(l => (l.dispatched_at || '').startsWith(today));
  const smsToday = todayLogs.filter(l => l.channel === 'SMS' || l.channel === 'BOTH').length;
  const tgToday = todayLogs.filter(l => l.channel === 'TELEGRAM' || l.channel === 'BOTH').length;

  return {
    total_logged: remindersCache.length,
    dispatched_today: todayLogs.length,
    sms_today: smsToday,
    telegram_today: tgToday,
  };
}

module.exports = {
  sendSms,
  sendTelegramDirectMessage,
  dispatchReminder,
  hasBeenRemindedToday,
  getReminderLogs,
  getStats,
  buildReminderMessage,
};
