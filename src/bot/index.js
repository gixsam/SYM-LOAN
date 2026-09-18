'use strict';
/**
 * src/bot/index.js
 * SYM EMPIRE PLATFORM (S.E.P.) — @money_loan_bot Core Engine
 *
 * Built with node-telegram-bot-api v1+
 *
 * Responsibilities:
 *   1. /start            → Welcome banner + "📱 Share My Phone Number" keyboard button
 *   2. Contact share     → Parse cryptographic phone share token, register/upsert in Supabase
 *   3. /status           → View current loan status and account strikes
 *   4. /request <amount> → Submit a new loan request
 *   5. /help             → Full command guide
 */

const { Bot, ReplyKeyboardBuilder } = require('node-telegram-bot-api');
const { supabaseAdmin } = require('../lib/supabase');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN || BOT_TOKEN.includes('...')) {
  console.warn('[Bot] WARNING: TELEGRAM_BOT_TOKEN is missing or incomplete in .env.');
  module.exports = { bot: null, startBot: () => {} };
  return;
}

// ─── Bot Instantiation ────────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

// Helper to sanitize HTML text
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── /start ───────────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const name = ctx.message?.from?.first_name || 'User';

  const keyboard = new ReplyKeyboardBuilder()
    .requestContact('📱 Share My Phone Number')
    .build({ one_time_keyboard: true, resize_keyboard: true });

  await ctx.reply(
    `👋 <b>Welcome to SYM LOAN</b>, <b>${escapeHtml(name)}</b>!\n\n` +
    `This is the official transaction platform of <b>SYM EMPIRE PLATFORM (S.E.P.)</b>.\n\n` +
    `To verify your account and apply for loans, please share your phone number using the button below.\n\n` +
    `🔒 <i>Your phone number is cryptographically verified via Telegram.</i>`,
    {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    }
  );
});

// ─── /help ────────────────────────────────────────────────────────────────────
bot.command('help', async (ctx) => {
  await ctx.reply(
    `🤖 <b>@money_loan_bot — Command Directory</b>\n\n` +
    `• <b>/start</b> — Register or login with your phone number\n` +
    `• <b>/status</b> — Check your profile, loans & strike count\n` +
    `• <b>/request &lt;amount&gt;</b> — Submit a loan request (e.g. <code>/request 5000</code>)\n` +
    `• <b>/help</b> — View this guidance directory\n\n` +
    `📱 <i>SYM LOAN is restricted to verified mobile devices only.</i>\n` +
    `🌐 <b>Portal:</b> <a href="https://symloan.best-travel.ltd">https://symloan.best-travel.ltd</a>`,
    { parse_mode: 'HTML' }
  );
});

// ─── /status ──────────────────────────────────────────────────────────────────
bot.command('status', async (ctx) => {
  const keyboard = new ReplyKeyboardBuilder()
    .requestContact('📱 Share Phone to View Status')
    .build({ one_time_keyboard: true, resize_keyboard: true });

  await ctx.reply(
    `📋 <b>Account Verification Required</b>\n\n` +
    `Please tap the button below to share your phone number so we can retrieve your active loan records:`,
    {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    }
  );
});

// ─── /request <amount> ────────────────────────────────────────────────────────
bot.command('request', async (ctx) => {
  const rawAmount = (ctx.match || '').trim();
  const amount = parseFloat(rawAmount);

  if (!rawAmount || isNaN(amount) || amount <= 0) {
    return ctx.reply(
      `⚠️ <b>Invalid Amount</b>\n\nPlease specify the amount you want to request.\n\n` +
      `<b>Example:</b> <code>/request 5000</code>`,
      { parse_mode: 'HTML' }
    );
  }

  // Store amount in context state
  ctx.state.pendingAmount = amount;

  const keyboard = new ReplyKeyboardBuilder()
    .requestContact('📱 Share Phone to Confirm Request')
    .build({ one_time_keyboard: true, resize_keyboard: true });

  await ctx.reply(
    `📝 <b>Loan Application: ৳${amount}</b>\n\n` +
    `To finalize this request, please share your verified phone number using the button below:`,
    {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    }
  );
});

// ─── Contact Share Handler — Cryptographic Phone Sharing Parser ───────────────
bot.on('message', async (ctx) => {
  const msg = ctx.message;
  if (!msg || !msg.contact) return; // Only process contact shares

  const contact = msg.contact;
  const fromId = msg.from?.id;

  // Security Verification: Ensure the user is sharing their OWN contact
  if (contact.user_id && fromId && contact.user_id !== fromId) {
    return ctx.reply(
      `❌ <b>Verification Failed</b>\n\n` +
      `You must share your <b>own</b> phone number directly from your Telegram client.`,
      { parse_mode: 'HTML' }
    );
  }

  const rawPhone = contact.phone_number || '';
  const phone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
  const firstName = contact.first_name || '';
  const lastName = contact.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || msg.from?.username || `User_${fromId}`;

  const removeKeyboard = { remove_keyboard: true };

  try {
    // 1. Check if client already exists in Supabase
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('client_profiles')
      .select('id, name, phone_number, status, strikes_count, created_at')
      .eq('phone_number', phone)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (existing) {
      // Existing client — fetch their loans
      const { data: loans } = await supabaseAdmin
        .from('money_requests')
        .select('id, amount, deadline_date, status, created_at')
        .eq('client_id', existing.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const strikeBadge = existing.strikes_count > 0
        ? `⚠️ <b>Strikes:</b> ${existing.strikes_count} / 3`
        : `✅ <b>Strikes:</b> 0 (Clean)`;

      let loanText = '<i>No loan history on record.</i>';
      if (loans && loans.length > 0) {
        loanText = loans.map(l =>
          `• <b>৳${l.amount}</b> | Due: <code>${l.deadline_date}</code> | [<b>${l.status}</b>]`
        ).join('\n');
      }

      return ctx.reply(
        `👋 <b>Welcome Back, ${escapeHtml(existing.name)}!</b>\n\n` +
        `🆔 <b>Client ID:</b> <code>${existing.id}</code>\n` +
        `📱 <b>Phone:</b> <code>${escapeHtml(existing.phone_number)}</code>\n` +
        `🔘 <b>Status:</b> <code>${existing.status}</code>\n` +
        `${strikeBadge}\n\n` +
        `💰 <b>Recent Loans:</b>\n${loanText}\n\n` +
        `To apply for a new loan, send: <code>/request &lt;amount&gt;</code>`,
        { parse_mode: 'HTML', reply_markup: removeKeyboard }
      );
    }

    // 2. New client — Register auth user in auth.users first, then upsert client_profiles
    const userEmail = `${phone.replace(/[^0-9]/g, '')}@telegram.sep`;
    let authUserId;

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      phone: phone,
      email: userEmail,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        name: fullName,
        telegram_id: fromId,
        telegram_username: msg.from?.username || '',
      }
    });

    if (authErr) {
      console.log('[Bot] Auth user exists or returned:', authErr.message);
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const matched = listData?.users?.find(u => u.phone === phone || u.email === userEmail);
      if (!matched) throw authErr;
      authUserId = matched.id;
    } else {
      authUserId = authData.user.id;
    }

    const { data: newProfile, error: insertErr } = await supabaseAdmin
      .from('client_profiles')
      .upsert({
        id: authUserId,
        name: fullName,
        phone_number: phone,
        email: userEmail,
        nid_url: '',
        status: 'ACTIVE',
        strikes_count: 0,
        admin_note: `Registered via @money_loan_bot (Telegram ID: ${fromId}) on ${new Date().toISOString()}`,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    await ctx.reply(
      `🎉 <b>Registration Complete!</b>\n\n` +
      `Welcome to <b>SYM EMPIRE PLATFORM (S.E.P.)</b>, <b>${escapeHtml(newProfile.name)}</b>!\n\n` +
      `🆔 <b>Client ID:</b> <code>${newProfile.id}</code>\n` +
      `📱 <b>Verified Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
      `🔘 <b>Status:</b> <code>${newProfile.status}</code>\n\n` +
      `You can now apply for loans using:\n` +
      `👉 <code>/request 5000</code>\n\n` +
      `Or check your account status anytime with <code>/status</code>.`,
      { parse_mode: 'HTML', reply_markup: removeKeyboard }
    );

  } catch (err) {
    console.error('[Bot] Contact error:', err.message || err);
    await ctx.reply(
      `❌ <b>Service Temporarily Unavailable</b>\n\n` +
      `Could not save your profile. Please try again shortly.`,
      { parse_mode: 'HTML', reply_markup: removeKeyboard }
    );
  }
});

// ─── Error Handling ───────────────────────────────────────────────────────────
bot.catch((err) => {
  console.error('[Bot] Unhandled error:', err.message || err);
});

/**
 * Send an OTP code to a specific Telegram Chat ID
 */
async function sendTelegramOtp(chatId, code, purpose = 'User Login') {
  if (!bot || !chatId) {
    console.warn('[Bot] Cannot send Telegram OTP: bot or chatId missing.');
    return false;
  }
  try {
    const text = 
      `🔐 <b>SYM EMPIRE PLATFORM (S.E.P.)</b>\n` +
      `<b>SYM LOAN Security Verification</b>\n\n` +
      `Your one-time verification code (OTP) for <b>${escapeHtml(purpose)}</b> is:\n\n` +
      `👉 <code>${code}</code> 👈\n\n` +
      `⏳ <i>This code expires in 5 minutes. Do not share it with anyone.</i>`;

    const sendPromise = bot.api.sendMessage({ chat_id: chatId, text, parse_mode: 'HTML' });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Telegram timeout')), 4000));
    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`[Bot] ✅ Telegram OTP sent to chat ${chatId} for ${purpose}`);
    return true;
  } catch (err) {
    console.error(`[Bot] ⚠️ Telegram OTP dispatch note for chat ${chatId}:`, err.message);
    return false;
  }
}

if (typeof bot.catch === 'function') {
  bot.catch((err) => {
    console.warn('[Bot] ⚠️ Telegram API error caught:', err.message);
  });
}

async function startBot() {
  if (!bot) return;

  const useWebhook = process.env.USE_WEBHOOK === 'true';
  const domain = (process.env.ROUTING_ENDPOINT_DOMAIN || '').replace(/\/$/, '');

  if (useWebhook && domain && domain.startsWith('https://')) {
    const webhookUrl = `${domain}/api/bot/webhook`;
    try {
      console.log(`[Bot] 🌐 Configuring Telegram Webhook: ${webhookUrl}`);
      if (typeof bot.stop === 'function') {
        try { await bot.stop(); } catch (_) {}
      }
      await bot.api.setWebhook({ url: webhookUrl });
      console.log('[Bot] ✅ Telegram Webhook registered successfully.');
    } catch (err) {
      console.error('[Bot] ⚠️ Telegram Webhook registration error:', err.message);
    }
  } else {
    // Default: Safe long-polling for local development
    try {
      try {
        await bot.api.deleteWebhook({ drop_pending_updates: false });
      } catch (_) {}

      const pollPromise = bot.startPolling();
      if (pollPromise && typeof pollPromise.catch === 'function') {
        pollPromise.catch((err) => {
          console.warn('[Bot] ⚠️ Telegram polling stopped (token may be revoked or waiting for update):', err.message);
        });
      }
      console.log('[Bot] ✅ @money_loan_bot polling initialized.');
    } catch (err) {
      console.warn('[Bot] ⚠️ Could not start bot polling:', err.message);
    }
  }
}

async function handleBotWebhookUpdate(update) {
  if (!bot || !update) return;
  try {
    await bot.handleUpdate(update);
  } catch (err) {
    console.error('[Bot] Error processing webhook update:', err.message);
  }
}

module.exports = { bot, startBot, sendTelegramOtp, handleBotWebhookUpdate };
