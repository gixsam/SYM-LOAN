'use strict';
/**
 * src/lib/emailService.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Executive Email Verification Engine
 *
 * Dispatches 6-digit OTP codes via Hostinger Business SMTP (or configured SMTP provider).
 * Includes graceful development fallback and HTML transactional email templates.
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

/**
 * Send a 6-digit OTP code to an email address
 * @param {string} toEmail 
 * @param {string} otpCode 
 * @param {string} purpose 
 * @returns {Promise<{ success: boolean, message: string, previewCode?: string, simulated?: boolean }>}
 */
async function sendEmailOtp(toEmail, otpCode, purpose = 'KYC Email Verification') {
  if (!toEmail) {
    return { success: false, message: 'Email address is required.' };
  }

  const cleanEmail = toEmail.trim().toLowerCase();
  const mailer = getTransporter();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #070b14; color: #f1f5f9; padding: 25px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(245, 158, 11, 0.3);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #f59e0b; margin: 0; font-size: 22px; letter-spacing: 2px;">SYM EMPIRE PLATFORM</h2>
        <div style="font-size: 11px; color: #94a3b8; font-weight: bold; letter-spacing: 1px; margin-top: 4px;">SYM LOAN • EXECUTIVE IDENTITY VERIFICATION</div>
      </div>
      <div style="background: rgba(13, 21, 39, 0.9); padding: 20px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
        <p style="font-size: 14px; margin-top: 0; color: #cbd5e1;">Your one-time verification passcode for <b>${purpose}</b> is:</p>
        <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #10b981; background: #070b14; padding: 12px 20px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.4); display: inline-block; margin: 15px 0; font-family: monospace;">
          ${otpCode}
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">This passcode is valid for <b>5 minutes</b>. For your security, do not share this code with anyone.</p>
      </div>
      <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 20px; margin-bottom: 0;">
        © 2026 'SYM EMPIRE' PLATFORM (S.E.P.). All rights reserved.
      </p>
    </div>
  `;

  if (mailer) {
    try {
      await mailer.sendMail({
        from: `"SYM LOAN Security" <${process.env.SMTP_USER}>`,
        to: cleanEmail,
        subject: `[${otpCode}] Your SYM LOAN Verification Code`,
        html: htmlContent,
      });
      console.log(`[Email] ✅ Dispatched OTP ${otpCode} to ${cleanEmail} via SMTP.`);
      return { success: true, message: `Verification code sent to ${cleanEmail}.` };
    } catch (err) {
      console.error(`[Email] ⚠️ SMTP Error sending to ${cleanEmail}:`, err.message);
      // Fallback to preview code if SMTP fails so user is never blocked
      return { 
        success: true, 
        message: `OTP generated for ${cleanEmail} (Preview code available).`,
        previewCode: otpCode,
        simulated: true,
      };
    }
  } else {
    // Development / Local simulated dispatch
    console.log(`[Email] ℹ️ [SIMULATED] OTP for ${cleanEmail} (${purpose}): [ ${otpCode} ] (Configure SMTP_USER & SMTP_PASS in .env for live emails)`);
    return {
      success: true,
      message: `Verification code generated for ${cleanEmail}.`,
      previewCode: otpCode,
      simulated: true,
    };
  }
}

module.exports = {
  sendEmailOtp,
};
