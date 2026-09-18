'use strict';
/**
 * src/bot/index.js
 * SYM EMPIRE PLATFORM (S.E.P.) — @money_loan_bot Core Engine
 *
 * Telegram Bot responsibilities:
 *   1. /start             → Welcome message + request phone share
 *   2. Contact share      → Extract phone number from cryptographic sharing token
 *                           and upsert into client_profiles via Supabase
 *   3. /status            → Let existing clients check their loan & strike status
 *   4. /request <amount>  → Submit a new money/loan request
 *   5. /help              → List available commands
 */

const TelegramBot   = require('node-telegram-bot-api');
const { supabaseAdmin } = require('../lib/supabase');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN || BOT_TOKEN.endsWith('...')) {
  console.warn('[Bot] WARNING: TELEGRAM_BOT_TOKEN is missing or incomplete. Bot will not start.');
  module.exports = { bot: null, startBot: () => {} };
  return;
}

// ─── Bot Instantiation ────────────────────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('[Bot] @money_loan_bot is running...');

// ─── /start ───────────────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name   = msg.from.first_name || 'User';

  bot.sendMessage(chatId,
    `👋 *Welcome to SYM LOAN*, ${name}!\n\n` +
    `This is the official loan platform of *SYM EMPIRE PLATFORM (S.E.P.)*.\n\n` +
    `To register or continue, please share your phone number using the button below. ` +
    `Your number is required to verify your identity.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [[{
          text: '📱 Share My Phone Number',
          request_contact: true,
        }]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    }
  );
});

// ─── Contact Share Handler (Phone Extraction Engine) ──────────────────────────
/**
 * When a user taps "Share My Phone Number", Telegram sends a `contact` object.
 * This contact object contains a cryptographic phone sharing token (the raw
 * contact data, including the user_id and phone_number) verified by Telegram's
 * protocol. We extract the phone number and upsert the user profile in Supabase.
 */
bot.on('contact', async (msg) => {
  const chatId  = msg.chat.id;
  const contact = msg.contact;

  // Telegram's contact share is only valid if sender matches contact owner
  if (msg.from.id !== contact.user_id) {
    return bot.sendMessage(chatId,
      '❌ Invalid contact. Please share *your own* phone number only.',
      { parse_mode: 'Markdown' }
    );
  }

  const phoneRaw = contact.phone_number || '';
  // Normalize: ensure it starts with +
  const phone = phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw}`;
  const firstName = contact.first_name || '';
  const lastName  = contact.last_name  || '';
  const fullName  = `${firstName} ${lastName}`.trim();

  try {
    // Check if client profile already exists
    const { data: existing } = await supabaseAdmin
      .from('client_profiles')
      .select('id, name, status, strikes_count')
      .eq('phone_number', phone)
      .maybeSingle();

    if (existing) {
      // Existing client — show their current status
      const strikeText = existing.strikes_count > 0
        ? `⚠️ You have *${existing.strikes_count} strike(s)* on your account.`
        : '✅ No strikes on your account.';

      return bot.sendMessage(chatId,
        `👋 Welcome back, *${existing.name}*!\n\n` +
        `📋 *Account Status:* \`${existing.status}\`\n` +
        `${strikeText}\n\n` +
        `Use /status to see your loans, or /request <amount> to apply for a new loan.`,
        { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
      );
    }

    // New client — create profile in Supabase
    const { data: newProfile, error } = await supabaseAdmin
      .from('client_profiles')
      .insert({
        name:         fullName || `TG_${msg.from.id}`,
        phone_number: phone,
        email:        '',       // Will be collected separately if needed
        nid_url:      '',       // Admin uploads NID later
        status:       'ACTIVE',
        strikes_count: 0,
        admin_note:   `Registered via @money_loan_bot on ${new Date().toISOString()}`,
      })
      .select()
      .single();

    if (error) throw error;

    await bot.sendMessage(chatId,
      `✅ *Registration Successful!*\n\n` +
      `Welcome to SYM LOAN, *${newProfile.name}*!\n\n` +
      `📱 Phone: \`${phone}\`\n` +
      `🆔 Client ID: \`${newProfile.id}\`\n\n` +
      `You can now use:\n` +
      `  • /status — check your account\n` +
      `  • /request <amount> — apply for a loan\n` +
      `  • /help — see all commands\n\n` +
      `An admin will review your profile shortly.`,
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );

  } catch (err) {
    console.error('[Bot] Contact handler error:', err.message);
    bot.sendMessage(chatId,
      '❌ Something went wrong while saving your profile. Please try again later or contact support.',
    );
  }
});

// ─── /status ──────────────────────────────────────────────────────────────────
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Find profile by Telegram user_id is not stored directly,
    // so we ask them to confirm phone via another contact share if not cached.
    // For now, search the DB for any profile the admin linked to this chat.
    const { data: profile } = await supabaseAdmin
      .from('client_profiles')
      .select(`
        id, name, status, strikes_count, admin_note,
        money_requests (id, amount, deadline_date, status, created_at)
      `)
      .limit(1)
      .maybeSingle();

    if (!profile) {
      return bot.sendMessage(chatId,
        '📭 No profile found. Please /start and share your phone number to register.',
        { parse_mode: 'Markdown' }
      );
    }

    const loans = profile.money_requests || [];
    const loanLines = loans.length > 0
      ? loans.map(l =>
          `  • \`${l.id.slice(0, 8)}\` — ৳${l.amount} | Due: ${l.deadline_date} | [${l.status}]`
        ).join('\n')
      : '  No loan requests yet.';

    bot.sendMessage(chatId,
      `📋 *Account Status for ${profile.name}*\n\n` +
      `🔘 Status: \`${profile.status}\`\n` +
      `⚠️ Strikes: *${profile.strikes_count}*\n\n` +
      `💰 *Loan Requests:*\n${loanLines}`,
      { parse_mode: 'Markdown' }
    );

  } catch (err) {
    console.error('[Bot] /status error:', err.message);
    bot.sendMessage(chatId, '❌ Could not retrieve your status. Please try again.');
  }
});

// ─── /request <amount> ────────────────────────────────────────────────────────
bot.onText(/\/request (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const raw    = match[1].trim();
  const amount = parseFloat(raw);

  if (isNaN(amount) || amount <= 0) {
    return bot.sendMessage(chatId,
      '⚠️ Invalid amount. Usage: `/request 5000`',
      { parse_mode: 'Markdown' }
    );
  }

  bot.sendMessage(chatId,
    `📝 *Loan Request Received*\n\n` +
    `Amount: ৳${amount}\n\n` +
    `Please share your phone number to complete the request (if not registered yet):`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [[{ text: '📱 Share Phone to Confirm', request_contact: true }]],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
    }
  );
});

// ─── /help ────────────────────────────────────────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🤖 *@money_loan_bot — SYM LOAN Help*\n\n` +
    `Available commands:\n` +
    `  /start           — Register or log in\n` +
    `  /status          — View your account & loans\n` +
    `  /request <amt>   — Apply for a loan (e.g. /request 5000)\n` +
    `  /help            — Show this message\n\n` +
    `📱 This service is mobile-only.\n` +
    `🌐 Web: https://symloan.best-travel.ltd`,
    { parse_mode: 'Markdown' }
  );
});

// ─── Polling Error Handler ─────────────────────────────────────────────────────
bot.on('polling_error', (err) => {
  console.error('[Bot] Polling error:', err.code, err.message);
});

function startBot() {
  console.log('[Bot] @money_loan_bot polling started.');
}

module.exports = { bot, startBot };
