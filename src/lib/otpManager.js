'use strict';
/**
 * src/lib/otpManager.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Secure OTP Engine
 *
 * Features:
 *   1. Cryptographically secure 6-digit OTP generation
 *   2. 5-minute Time-To-Live (TTL)
 *   3. 60-second cooldown rate limit per identifier
 *   4. Max 3 verification attempts per OTP
 *   5. Automatic expiration cleanup
 */

const crypto = require('crypto');

// In-memory OTP storage: Map<identifier, { code: string, expiresAt: number, attempts: number, createdAt: number }>
const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000;       // 5 minutes
const COOLDOWN_MS = 60 * 1000;          // 60 seconds between resends
const MAX_ATTEMPTS = 3;

/**
 * Generate a 6-digit OTP for a phone or email identifier
 * @param {string} identifier - phone number or email address
 * @returns {{ success: boolean, code?: string, error?: string, waitSeconds?: number }}
 */
function generateOtp(identifier) {
  if (!identifier) {
    return { success: false, error: 'Identifier (phone or email) is required.' };
  }

  const cleanId = String(identifier).trim().toLowerCase();
  const existing = otpStore.get(cleanId);
  const now = Date.now();

  // Enforce cooldown
  if (existing && now - existing.createdAt < COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - existing.createdAt)) / 1000);
    return {
      success: false,
      error: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
      waitSeconds: remainingSeconds,
    };
  }

  // Generate secure 6-digit code (between 100000 and 999999)
  const code = String(crypto.randomInt(100000, 1000000));

  otpStore.set(cleanId, {
    code,
    expiresAt: now + OTP_TTL_MS,
    createdAt: now,
    attempts: 0,
  });

  return {
    success: true,
    code,
    expiresAt: now + OTP_TTL_MS,
  };
}

/**
 * Verify an OTP code for a given identifier
 * @param {string} identifier - phone or email
 * @param {string} inputCode - 6-digit user input
 * @returns {{ valid: boolean, message: string }}
 */
function verifyOtp(identifier, inputCode) {
  if (!identifier || !inputCode) {
    return { valid: false, message: 'Identifier and OTP code are required.' };
  }

  const cleanId = String(identifier).trim().toLowerCase();
  const cleanCode = String(inputCode).trim();
  const record = otpStore.get(cleanId);
  const now = Date.now();

  if (!record) {
    return { valid: false, message: 'No active OTP found. Please request a new code.' };
  }

  if (now > record.expiresAt) {
    otpStore.delete(cleanId);
    return { valid: false, message: 'OTP has expired. Please request a new code.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(cleanId);
    return { valid: false, message: 'Maximum verification attempts exceeded. Please request a new code.' };
  }

  if (record.code !== cleanCode) {
    record.attempts += 1;
    const remaining = MAX_ATTEMPTS - record.attempts;
    return {
      valid: false,
      message: `Invalid OTP code. ${remaining} attempt(s) remaining.`,
    };
  }

  // OTP is valid — consume it immediately to prevent replay
  otpStore.delete(cleanId);
  return { valid: true, message: 'OTP verified successfully.' };
}

/**
 * Periodically purge expired records
 */
setInterval(() => {
  const now = Date.now();
  for (const [id, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(id);
    }
  }
}, 60 * 1000);

module.exports = {
  generateOtp,
  verifyOtp,
  otpStore,
};
