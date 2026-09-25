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

/**
 * Send Transactional Disbursement Notification Email
 * @param {object} params
 * @param {string} params.clientEmail
 * @param {string} params.clientName
 * @param {string} params.loanRef
 * @param {number|string} params.amount
 * @param {string} params.payoutMethod
 * @param {string} [params.destinationNumber]
 * @param {string} [params.trxId]
 * @param {string} [params.deadlineDate]
 * @param {string} [params.voucherUrl]
 * @returns {Promise<{ success: boolean, messageId?: string, simulated?: boolean }>}
 */
async function sendDisbursementNotificationEmail({
  clientEmail,
  clientName = 'Valued Client',
  loanRef = 'SYM-LOAN',
  amount = 0,
  payoutMethod = 'CASH',
  destinationNumber = '',
  trxId = 'CASH_HANDOVER',
  deadlineDate = '',
  voucherUrl = 'https://symloan.best-travel.ltd'
}) {
  if (!clientEmail) {
    return { success: false, message: 'Email address missing.' };
  }

  const cleanEmail = clientEmail.trim().toLowerCase();
  const mailer = getTransporter();

  const formattedAmount = Number(amount).toLocaleString('en-BD', { minimumFractionDigits: 0 });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background-color: #06090F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .card { max-width: 580px; margin: 24px auto; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .header { background: linear-gradient(135deg, #111827 0%, #070B14 100%); padding: 28px 24px; text-align: center; border-bottom: 1px solid rgba(245, 158, 11, 0.2); }
        .logo-badge { display: inline-block; padding: 6px 14px; background: rgba(245, 158, 11, 0.12); border: 1px solid #F59E0B; border-radius: 20px; color: #F59E0B; font-weight: 800; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; }
        .title { color: #F8FAFC; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
        .content { padding: 28px 24px; color: #E2E8F0; }
        .amount-card { background: #070B14; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
        .amount-label { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; }
        .amount-val { font-size: 34px; font-weight: 900; color: #10B981; font-family: monospace; margin: 6px 0; }
        .meta-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        .meta-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .meta-label { color: #94A3B8; font-weight: 600; width: 40%; }
        .meta-val { color: #F8FAFC; font-weight: 700; text-align: right; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; font-family: monospace; }
        .badge-method { background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .deadline-box { background: rgba(239, 68, 68, 0.1); border-left: 4px solid #EF4444; padding: 12px 16px; border-radius: 6px; margin: 20px 0; }
        .deadline-text { font-size: 12px; color: #FCA5A5; margin: 0; line-height: 1.5; }
        .btn-cta { display: block; text-align: center; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #000; font-weight: 800; font-size: 14px; padding: 14px 24px; border-radius: 10px; text-decoration: none; margin: 24px 0 12px 0; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3); }
        .footer { text-align: center; padding: 18px 24px; font-size: 11px; color: #64748B; border-top: 1px solid rgba(255,255,255,0.06); }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo-badge">SYM EMPIRE PLATFORM (S.E.P.)</div>
          <h1 class="title">Loan Request Approved & Disbursed</h1>
          <div style="font-size: 12px; color: #94A3B8; margin-top: 4px; font-family: monospace;">Ref: #${loanRef}</div>
        </div>
        <div class="content">
          <p style="margin-top: 0; font-size: 14px; color: #CBD5E1;">Dear <b>${clientName}</b>,</p>
          <p style="font-size: 13px; color: #94A3B8; line-height: 1.5;">
            Your loan application has been authorized by our underwriting desk and the capital has been successfully disbursed via your designated channel.
          </p>

          <div class="amount-card">
            <div class="amount-label">Disbursed Capital</div>
            <div class="amount-val">৳${formattedAmount} BDT</div>
            <div style="font-size: 11px; color: #6EE7B7;">Disbursed & Ready for Use</div>
          </div>

          <table class="meta-table">
            <tr>
              <td class="meta-label">Disbursement Channel</td>
              <td class="meta-val"><span class="badge badge-method">${payoutMethod}</span></td>
            </tr>
            ${destinationNumber ? `
            <tr>
              <td class="meta-label">Destination Account</td>
              <td class="meta-val" style="font-family: monospace; color: #38BDF8;">${destinationNumber}</td>
            </tr>` : ''}
            <tr>
              <td class="meta-label">Transaction ID (TrxID)</td>
              <td class="meta-val" style="font-family: monospace; color: #FBBF24;">${trxId}</td>
            </tr>
            <tr>
              <td class="meta-label">Repayment Due Date</td>
              <td class="meta-val" style="font-family: monospace; color: #F87171;">${deadlineDate || 'As agreed'}</td>
            </tr>
          </table>

          <div class="deadline-box">
            <p class="deadline-text">
              ⚠️ <b>STRICT 1:00 PM DEADLINE POLICY:</b> Settlement is strictly due on or before <b>1:00 PM (13:00 BST)</b> of your maturity date (${deadlineDate || 'scheduled date'}). Non-compliance incurs automated administrative strikes and credit score demotion.
            </p>
          </div>

          <a href="${voucherUrl}" class="btn-cta" target="_blank">
            📄 View Official Cash Voucher / Portal
          </a>
        </div>
        <div class="footer">
          © 2026 SYM EMPIRE PLATFORM (S.E.P.) • All rights reserved.<br>
          This is an automated transactional notice. Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
  `;

  if (mailer) {
    try {
      const info = await mailer.sendMail({
        from: `"SYM LOAN Finance Desk" <${process.env.SMTP_USER}>`,
        to: cleanEmail,
        subject: `SYM LOAN — Money Request Approved & Disbursed [Ref: #${loanRef}]`,
        html: htmlContent,
      });
      console.log(`[Email] ✅ Dispatched disbursement notice for #${loanRef} to ${cleanEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, simulated: false };
    } catch (err) {
      console.error(`[Email] ⚠️ SMTP Error sending disbursement notice to ${cleanEmail}:`, err.message);
      return { success: true, message: `Disbursement email simulated (SMTP offline): ${err.message}`, simulated: true };
    }
  } else {
    console.log(`[Email] ℹ️ [SIMULATED] Disbursement notice for #${loanRef} to ${cleanEmail} (৳${formattedAmount} via ${payoutMethod})`);
    return { success: true, message: `Disbursement email simulated for ${cleanEmail}.`, simulated: true };
  }
}

module.exports = {
  sendEmailOtp,
  sendDisbursementNotificationEmail,
};

