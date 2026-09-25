'use strict';
/**
 * src/lib/clientSecurityManager.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Client Biometric, Security PIN & Social Links Governance
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.resolve(__dirname, '../../data/client_security.json');
const TOKEN_SECRET = process.env.JWT_SECRET || 'SEP_CLIENT_SECURITY_TOKEN_SECRET_2026';

let securityCache = {};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      securityCache = JSON.parse(raw);
    } else {
      securityCache = {};
    }
  } catch (err) {
    console.warn('[ClientSecurity] Error loading data from disk:', err.message);
    securityCache = {};
  }
}

function saveData() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(securityCache, null, 2), 'utf8');
  } catch (err) {
    console.error('[ClientSecurity] Error saving data to disk:', err.message);
  }
}

loadData();

function getSecurityProfile(clientId) {
  if (!clientId) return null;
  if (!securityCache[clientId]) {
    securityCache[clientId] = {
      client_id: clientId,
      biometric_pin_enabled: false,
      pin_hash: null,
      pin_salt: null,
      social_links: {
        facebook: '',
        instagram: '',
        whatsapp: '',
        telegram: '',
      },
      updated_at: new Date().toISOString(),
    };
  }
  return securityCache[clientId];
}

function setBiometricPinEnabled(clientId, enabled) {
  const profile = getSecurityProfile(clientId);
  profile.biometric_pin_enabled = Boolean(enabled);
  profile.updated_at = new Date().toISOString();
  saveData();
  return profile;
}

function setPin(clientId, rawPin) {
  if (!/^\d{4}$/.test(String(rawPin || ''))) {
    throw new Error('PIN must be exactly 4 numeric digits.');
  }
  const profile = getSecurityProfile(clientId);
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(String(rawPin) + salt).digest('hex');
  
  profile.pin_salt = salt;
  profile.pin_hash = hash;
  profile.updated_at = new Date().toISOString();
  saveData();
  return { success: true, message: '4-digit Security PIN updated successfully.' };
}

function verifyPin(clientId, rawPin) {
  const profile = getSecurityProfile(clientId);
  if (!profile.pin_hash || !profile.pin_salt) {
    return { valid: false, message: 'No security PIN has been configured for this account.' };
  }
  const testHash = crypto.createHash('sha256').update(String(rawPin) + profile.pin_salt).digest('hex');
  if (testHash !== profile.pin_hash) {
    return { valid: false, message: 'Incorrect 4-digit PIN. Please try again.' };
  }
  const token = issueSecurityToken(clientId, 'PIN');
  return { valid: true, token, message: 'PIN verified successfully.' };
}

function issueSecurityToken(clientId, method = 'BIOMETRIC') {
  const payload = {
    sub: clientId,
    method,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300, // 5 min validity
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifySecurityToken(clientId, token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  if (sig !== expectedSig) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.sub !== clientId) return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function getSocialLinks(clientId) {
  const profile = getSecurityProfile(clientId);
  return profile.social_links || { facebook: '', instagram: '', whatsapp: '', telegram: '' };
}

function saveSocialLinks(clientId, links = {}) {
  const profile = getSecurityProfile(clientId);
  profile.social_links = {
    facebook: (links.facebook || '').trim(),
    instagram: (links.instagram || '').trim(),
    whatsapp: (links.whatsapp || '').trim(),
    telegram: (links.telegram || '').trim(),
  };
  profile.updated_at = new Date().toISOString();
  saveData();
  return profile.social_links;
}

module.exports = {
  getSecurityProfile,
  setBiometricPinEnabled,
  setPin,
  verifyPin,
  issueSecurityToken,
  verifySecurityToken,
  getSocialLinks,
  saveSocialLinks,
};
