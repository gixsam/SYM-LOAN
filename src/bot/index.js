'use strict';
/**
 * src/bot/index.js
 * SYM EMPIRE PLATFORM (S.E.P.) — @money_loan_bot Core Engine
 *
 * Uses node-telegram-bot-api v1+ (Bot class with bot.api.* style)
 *
 * Bot responsibilities:
 *   1. /start             → Welcome + request phone share
 *   2. Contact share      → Extract phone number (cryptographic Telegram token)
 *                           and register/lookup client in Supabase
 *   3. /status            → Client loan & strike status
 *   4. /request <amount>  → Submit a loan request
 *   5. /help              → List commands
 */

const { Bot, InlineKeyboardBuilder, ReplyKeyboardBuilder } = require('node-telegram-bot-api');
const { supabaseAdmin } = require('../lib/supabase');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN || BOT_TOKEN.endsWith('...')) {
  console.warn('[Bot] WARNING: TELEGRAM_BOT_TOKEN is missing or incomplete. Bot will not start.');
  module.exports = { bot: null, startBot: () => {} };
  return;
}

// ─── Bot Instantiation ────────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

// ─── /start ───────────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const chatId = ctx.message.chat.id;
  const name   = ctx.message.from.first_name || 'User';

  const keyboard = new ReplyKeyboardBuilder()
    .addButton({ text: '📱 Share My Phone Number', request_contact: true })
    .build({ one_time_keyboard: true, resize_keyboard: true });

  await ctx.reply(
    `👋 *Welcome to SYM LOAN*, ${name}\\!\n\n` +
    `This is the official loan platform of *SYM EMPIRE PLATFORM \\(S\\.E\\.P\\.\\)*\\.\n\n` +
    `To register or continue, please share your phone number using the button below\\. ` +
    `Your number is required to verify your identity\\.`,
    { parse_mode: 'MarkdownV2', reply_markup: keyboard }
  );
});

// ─── /help ────────────────────────────────────────────────────────────────────
bot.command('help', async (ctx) => {
  await ctx.reply(
    `🤖 *@money\\_loan\\_bot — SYM LOAN Help*\n\n` +
    `Available commands:\n` +
    `  /start — Register or log in\n` +
    `  /status — View your account \\& loans\n` +
    `  /request \\<amount\\> — Apply for a loan\n` +
    `  /help — Show this message\n\n` +
    `📱 This service is *mobile\\-only*\\.\n` +
    `🌐 Web: https://symloan\\.best\\-travel\\.ltd`,
    { parse_mode: 'MarkdownV2' }
  );
});

// ─── /status ──────────────────────────────────────────────────────────────────
bot.command('status', async (ctx) => {
  const chatId = ctx.message.chat.id;

  await ctx.reply(
    '📋 To check your status, please share your phone number first:',
    {
      reply_markup: new ReplyKeyboardBuilder()
        .addButton({ text: '📱 Share Phone to Check Status', request_contact: true })
        .build({ one_time_keyboard: true, resize_keyboard: true }),
    }
  );
});

// ─── /request <amount> ────────────────────────────────────────────────────────
bot.command('request', async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  const raw   = parts[1];
  const amount = parseFloat(raw);

  if (!raw || isNaN(amount) || amount <= 0) {
    return ctx.reply(
      '⚠️ Invalid amount\\. Usage: `/request 5000`',
      { parse_mode: 'MarkdownV2' }
    );
  }

  await ctx.reply(
    `📝 *Loan Request: ৳${amount}*\n\nTo complete this request, please share your phone number:`,
    {
      parse_mode: 'MarkdownV2',
      reply_markup: new ReplyKeyboardBuilder()
        .addButton({ text: '📱 Share Phone to Confirm Request', request_contact: true })
        .build({ one_time_keyboard: true, resize_keyboard: true }),
    }
  );
});

// ─── Contact Share Handler — Phone Extraction Engine ─────────────────────────
/**
 * When a user taps "Share My Phone Number", Telegram delivers a `contact`
 * message containing the cryptographic phone-sharing token (user_id + phone_number)
 * verified by Telegram's protocol. We extract the phone and upsert in Supabase.
 */
bot.on('message', async (ctx) => {
  const msg = ctx.message;
  if (!msg.contact) return; // only handle contact shares here

  const chatId  = msg.chat.id;
  const contact = msg.contact;

  // Telegram only sends contact.user_id when the user shares their own contact
  if (msg.from.id !== contact.user_id) {
    return bot.api.sendMessage(chatId,
      '❌ Invalid contact\\. Please share *your own* phone number only\\.',
      { parse_mode: 'MarkdownV2' }
    );
  }

  const phoneRaw = contact.phone_number || '';
  const phone    = phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw}`;
  const firstName = contact.first_name || '';
  const lastName  = contact.last_name  || '';
  const fullName  = `${firstName} ${lastName}`.trim();

  const removeKeyboard = { remove_keyboard: true };

  try {
    // Check if client already exists
    const { data: existing } = await supabaseAdmin
      .from('client_profiles')
      .select('id, name, status, strikes_count')
      .eq('phone_number', phone)
      .maybeSingle();

    if (existing) {
      const strikeText = existing.strikes_count > 0
        ? `⚠️ Strikes: *${existing.strikes_count}*`
        : '✅ No strikes on your account\\.';

      return bot.api.sendMessage(chatId,
        `👋 Welcome back, *${escMd(existing.name)}*\\!\n\n` +
        `📋 Status: \`${existing.status}\`\n` +
        `${strikeText}\n\n` +
        `Use /status to see your loans, or /request \\<amount\\> to apply\\.`,
        { parse_mode: 'MarkdownV2', reply_markup: removeKeyboard }
      );
    }

    // New client — register in Supabase
    const { data: newProfile, error } = await supabaseAdmin
      .from('client_profiles')
      .insert({
        name:          fullName || `TG_${msg.from.id}`,
        phone_number:  phone,
        email:         '',
        nid_url:       '',
        status:        'ACTIVE',
        strikes_count: 0,
        admin_note:    `Registered via @money_loan_bot on ${new Date().toISOString()}`,
      })
      .select()
      .single();

    if (error) throw error;

    await bot.api.sendMessage(chatId,
      `✅ *Registration Successful\\!*\n\n` +
      `Welcome to SYM LOAN, *${escMd(newProfile.name)}*\\!\n\n` +
      `📱 Phone: \`${escMd(phone)}\`\n` +
      `🆔 Client ID: \`${newProfile.id}\`\n\n` +
      `You can now use:\n` +
      `  • /status — check your account\n` +
      `  • /request \\<amount\\> — apply for a loan\n` +
      `  • /help — see all commands\n\n` +
      `An admin will review your profile shortly\\.`,
      { parse_mode: 'MarkdownV2', reply_markup: removeKeyboard }
    );

  } catch (err) {
    console.error('[Bot] Contact handler error:', err.message);
    bot.api.sendMessage(chatId,
      '❌ Something went wrong while saving your profile\\. Please try again later\\.',
      { parse_mode: 'MarkdownV2', reply_markup: removeKeyboard }
    );
  }
});

// ─── Error Handler ────────────────────────────────────────────────────────────
bot.catch((err) => {
  console.error('[Bot] Error:', err.message || err);
});

// ─── Utility: Escape MarkdownV2 special chars ─────────────────────────────────
function escMd(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// ─── Start Function ───────────────────────────────────────────────────────────
function startBot() {
  bot.startPolling();
  console.log('[Bot] ✅ @money_loan_bot polling started.');
}

module.exports = { bot, startBot };
