'use strict';
/**
 * src/lib/fraudDetectionEngine.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Anti-Fraud Intelligence & Device Fingerprinting Engine
 *
 * Enforces fintech-grade security telemetry:
 *   1. Hardware & browser device fingerprinting
 *   2. Cross-account multi-accounting detection (IP & Fingerprint collisions)
 *   3. Application velocity spike detection
 *   4. Anomaly heuristics (headless browsers, timezone spoofing)
 *   5. Real-time Fraud Risk Index calculation (0 - 100)
 *   6. Administrative threat desk & automated blacklisting/whitelisting
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '../../data/fraud_logs.json');

let fraudStore = {
  logs: [],
  whitelisted_ips: [],
  blacklisted_ips: [],
  whitelisted_fingerprints: [],
  blacklisted_fingerprints: []
};

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '');
      fraudStore = JSON.parse(raw);
      if (!Array.isArray(fraudStore.logs)) fraudStore.logs = [];
      if (!Array.isArray(fraudStore.whitelisted_ips)) fraudStore.whitelisted_ips = [];
      if (!Array.isArray(fraudStore.blacklisted_ips)) fraudStore.blacklisted_ips = [];
      if (!Array.isArray(fraudStore.whitelisted_fingerprints)) fraudStore.whitelisted_fingerprints = [];
      if (!Array.isArray(fraudStore.blacklisted_fingerprints)) fraudStore.blacklisted_fingerprints = [];
    }
  } catch (err) {
    console.error('[FraudDetectionEngine] Error loading fraud_logs.json:', err.message);
    fraudStore = {
      logs: [],
      whitelisted_ips: [],
      blacklisted_ips: [],
      whitelisted_fingerprints: [],
      blacklisted_fingerprints: []
    };
  }
}

function saveStore() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(fraudStore, null, 2), 'utf8');
  } catch (err) {
    console.error('[FraudDetectionEngine] Error saving fraud_logs.json:', err.message);
  }
}

loadStore();

// Generate SHA-256 hash for fingerprint components
function hashFingerprint(components = {}) {
  const str = JSON.stringify({
    ua: components.user_agent || '',
    res: components.screen_resolution || '',
    tz: components.timezone_offset || '',
    lang: components.language || '',
    platform: components.platform || '',
    cores: components.hardware_concurrency || ''
  });
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 24);
}

// Extract client IP address accurately from request
function extractClientIp(req) {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

const fraudDetectionEngine = {
  /**
   * Evaluate a client interaction or loan application
   */
  evaluateRequest(payload) {
    loadStore();
    const {
      client_id,
      client_name = 'Unknown',
      client_phone = '',
      ip_address = '127.0.0.1',
      user_agent = '',
      components = {},
      action_type = 'LOAN_APPLICATION'
    } = payload;

    const fingerprintHash = components.fingerprint_hash || hashFingerprint({
      user_agent,
      ...components
    });

    let score = 0;
    const flags = [];
    const collidingAccounts = new Set();

    // 1. Blacklist checks
    if (fraudStore.blacklisted_ips.includes(ip_address)) {
      score += 90;
      flags.push({
        code: 'CRITICAL_IP_BLACKLISTED',
        severity: 'HIGH',
        message: `Client IP ${ip_address} is listed on administrative security blacklist.`
      });
    }

    if (fraudStore.blacklisted_fingerprints.includes(fingerprintHash)) {
      score += 90;
      flags.push({
        code: 'CRITICAL_DEVICE_BLACKLISTED',
        severity: 'HIGH',
        message: `Device fingerprint [${fingerprintHash.substring(0, 8)}] is flagged as malicious.`
      });
    }

    // 2. Cross-Account Multi-Accounting Collision Check
    // Look for previous logs where fingerprint or IP was used by a DIFFERENT client_id
    const pastLogs = fraudStore.logs.slice(0, 300); // look through recent history
    pastLogs.forEach(entry => {
      if (entry.client_id && client_id && entry.client_id !== client_id) {
        if (entry.fingerprint_hash === fingerprintHash) {
          collidingAccounts.add(entry.client_name || entry.client_id);
        } else if (entry.ip_address === ip_address && ip_address !== '127.0.0.1' && ip_address !== '::1') {
          collidingAccounts.add(entry.client_name || entry.client_id);
        }
      }
    });

    if (collidingAccounts.size > 0) {
      score += 45;
      flags.push({
        code: 'MULTI_ACCOUNT_DEVICE_COLLISION',
        severity: 'HIGH',
        message: `Same hardware or network environment detected across ${collidingAccounts.size} other account(s): ${Array.from(collidingAccounts).join(', ')}.`
      });
    }

    // 3. Application Velocity Check
    // Check how many requests were logged for this client_id or IP in last 1 hour and 24 hours
    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;
    const oneDayAgo = now - 24 * 3600 * 1000;

    const recentRequests1h = pastLogs.filter(e => 
      ((client_id && e.client_id === client_id) || e.ip_address === ip_address) &&
      new Date(e.created_at).getTime() >= oneHourAgo
    );

    const recentRequests24h = pastLogs.filter(e => 
      ((client_id && e.client_id === client_id) || e.ip_address === ip_address) &&
      new Date(e.created_at).getTime() >= oneDayAgo
    );

    if (recentRequests1h.length >= 3) {
      score += 30;
      flags.push({
        code: 'RAPID_VELOCITY_SPIKE',
        severity: 'MEDIUM',
        message: `High velocity warning: ${recentRequests1h.length} attempts detected within 1 hour.`
      });
    } else if (recentRequests24h.length >= 5) {
      score += 20;
      flags.push({
        code: 'ELEVATED_DAILY_VELOCITY',
        severity: 'LOW',
        message: `${recentRequests24h.length} attempts detected within 24 hours.`
      });
    }

    // 4. Automated Bot / Headless UA Heuristics
    const uaLower = (user_agent || '').toLowerCase();
    if (uaLower.includes('headless') || uaLower.includes('puppeteer') || uaLower.includes('selenium') || uaLower.includes('phantomjs')) {
      score += 50;
      flags.push({
        code: 'AUTOMATED_BOT_SIGNATURE',
        severity: 'HIGH',
        message: 'Headless Chrome or automated bot framework detected in user agent.'
      });
    }

    // 5. Timezone Anomalies (BDT is UTC+6 = -360 offset in JS)
    if (components.timezone_offset !== undefined && components.timezone_offset !== null) {
      const tzOffset = parseInt(components.timezone_offset, 10);
      // In JS, BDT (UTC+6) gives getTimezoneOffset() === -360
      if (tzOffset !== -360 && Math.abs(tzOffset - (-360)) > 120) {
        score += 10;
        flags.push({
          code: 'TIMEZONE_GEO_MISMATCH',
          severity: 'LOW',
          message: `Browser timezone offset (${tzOffset}m) diverges from Bangladesh standard (+6h).`
        });
      }
    }

    // 6. Whitelist reductions
    if (fraudStore.whitelisted_ips.includes(ip_address) || fraudStore.whitelisted_fingerprints.includes(fingerprintHash)) {
      score = Math.max(0, score - 50);
    }

    // Clamp score 0 - 100
    const finalFraudScore = Math.min(100, Math.max(0, score));

    // Determine Risk Tier
    let riskTier = 'LOW';
    if (finalFraudScore >= 60) riskTier = 'HIGH';
    else if (finalFraudScore >= 25) riskTier = 'MODERATE';

    // Status: HIGH gets UNDER_REVIEW, others CLEARED by default unless blacklisted
    let status = 'CLEARED';
    if (finalFraudScore >= 60 || flags.some(f => f.severity === 'HIGH')) {
      status = 'UNDER_REVIEW';
    }
    if (fraudStore.blacklisted_ips.includes(ip_address) || fraudStore.blacklisted_fingerprints.includes(fingerprintHash)) {
      status = 'BLOCKED';
    }

    const logEntry = {
      id: `fraud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      client_id: client_id || null,
      client_name: client_name || 'Anonymous',
      client_phone: client_phone || '',
      action_type,
      ip_address,
      user_agent,
      fingerprint_hash: fingerprintHash,
      components,
      fraud_score: finalFraudScore,
      risk_tier: riskTier,
      status,
      flags,
      reasons: flags.map(f => f.message),
      colliding_accounts: Array.from(collidingAccounts),
      created_at: new Date().toISOString(),
      resolved_at: status === 'CLEARED' ? new Date().toISOString() : null,
      admin_note: null
    };

    fraudStore.logs.unshift(logEntry);
    // Keep max 500 logs
    if (fraudStore.logs.length > 500) {
      fraudStore.logs = fraudStore.logs.slice(0, 500);
    }
    saveStore();

    return logEntry;
  },

  /**
   * Helper to evaluate an incoming Express request
   */
  evaluateExpressRequest(req, clientContext = {}, actionType = 'LOAN_APPLICATION') {
    const ip_address = extractClientIp(req);
    const user_agent = req.headers['user-agent'] || '';
    const bodyTelemetry = req.body?.telemetry || {};

    return this.evaluateRequest({
      client_id: clientContext.id || req.body?.client_id,
      client_name: clientContext.name || req.body?.client_name,
      client_phone: clientContext.phone_number || req.body?.client_phone,
      ip_address,
      user_agent,
      components: bodyTelemetry,
      action_type: actionType
    });
  },

  /**
   * Admin resolves or modifies fraud status
   */
  resolveAlert(logId, resolution = 'CLEARED', adminNote = '') {
    loadStore();
    const entry = fraudStore.logs.find(l => l.id === logId);
    if (!entry) throw new Error(`Fraud alert record #${logId} not found.`);

    entry.status = resolution;
    entry.resolved_at = new Date().toISOString();
    entry.admin_note = adminNote || `Resolved as ${resolution} by administrator.`;

    if (resolution === 'BLOCKED') {
      if (entry.ip_address && !fraudStore.blacklisted_ips.includes(entry.ip_address) && entry.ip_address !== '127.0.0.1') {
        fraudStore.blacklisted_ips.push(entry.ip_address);
      }
      if (entry.fingerprint_hash && !fraudStore.blacklisted_fingerprints.includes(entry.fingerprint_hash)) {
        fraudStore.blacklisted_fingerprints.push(entry.fingerprint_hash);
      }
    } else if (resolution === 'CLEARED') {
      // Remove from blacklists if present
      fraudStore.blacklisted_ips = fraudStore.blacklisted_ips.filter(ip => ip !== entry.ip_address);
      fraudStore.blacklisted_fingerprints = fraudStore.blacklisted_fingerprints.filter(fp => fp !== entry.fingerprint_hash);

      if (entry.ip_address && !fraudStore.whitelisted_ips.includes(entry.ip_address)) {
        fraudStore.whitelisted_ips.push(entry.ip_address);
      }
    }

    saveStore();
    return entry;
  },

  /**
   * Get all fraud alerts with summary counters
   */
  getFraudAlerts(filter = 'ALL') {
    loadStore();
    let items = [...fraudStore.logs];

    if (filter === 'UNDER_REVIEW') {
      items = items.filter(l => l.status === 'UNDER_REVIEW');
    } else if (filter === 'HIGH_RISK') {
      items = items.filter(l => l.risk_tier === 'HIGH');
    } else if (filter === 'BLOCKED') {
      items = items.filter(l => l.status === 'BLOCKED');
    } else if (filter === 'CLEARED') {
      items = items.filter(l => l.status === 'CLEARED');
    }

    const underReviewCount = fraudStore.logs.filter(l => l.status === 'UNDER_REVIEW').length;
    const highRiskCount = fraudStore.logs.filter(l => l.risk_tier === 'HIGH').length;
    const blockedCount = fraudStore.logs.filter(l => l.status === 'BLOCKED').length;

    return {
      summary: {
        total_logs: fraudStore.logs.length,
        under_review_count: underReviewCount,
        high_risk_count: highRiskCount,
        blocked_count: blockedCount,
        blacklisted_ips_count: fraudStore.blacklisted_ips.length,
        blacklisted_devices_count: fraudStore.blacklisted_fingerprints.length
      },
      items
    };
  },

  hashFingerprint,
  extractClientIp,

  addToBlacklist(target, type = 'IP', reason = '') {
    loadStore();
    if (!target) return;
    if (type === 'IP') {
      if (!fraudStore.blacklisted_ips.includes(target)) fraudStore.blacklisted_ips.push(target);
    } else {
      if (!fraudStore.blacklisted_fingerprints.includes(target)) fraudStore.blacklisted_fingerprints.push(target);
    }
    saveStore();
  },

  removeFromBlacklist(target) {
    loadStore();
    fraudStore.blacklisted_ips = fraudStore.blacklisted_ips.filter(ip => ip !== target);
    fraudStore.blacklisted_fingerprints = fraudStore.blacklisted_fingerprints.filter(fp => fp !== target);
    saveStore();
  },

  isBlacklisted(target) {
    loadStore();
    return fraudStore.blacklisted_ips.includes(target) || fraudStore.blacklisted_fingerprints.includes(target);
  }
};

fraudDetectionEngine.hashFingerprint = hashFingerprint;
fraudDetectionEngine.extractClientIp = extractClientIp;

module.exports = fraudDetectionEngine;
