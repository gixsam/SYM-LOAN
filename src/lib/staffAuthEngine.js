'use strict';
/**
 * src/lib/staffAuthEngine.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Multi-Staff Authentication & RBAC Engine
 *
 * Manages administrative personnel profiles, credential verification,
 * scoped staff session tokens, and granular permission checking.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const auditTrailEngine = require('./auditTrailEngine');

const DATA_FILE = path.join(__dirname, '../../data/staff_members.json');
const TOKEN_SECRET = process.env.ADMIN_SECRET_KEY || 'SEP_ADMIN_2026';

let staffStore = {
  staff: [],
  roles_catalog: {}
};

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(String(password) + String(salt)).digest('hex');
}

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '');
      staffStore = JSON.parse(raw);
      if (!Array.isArray(staffStore.staff)) staffStore.staff = [];
      if (!staffStore.roles_catalog) staffStore.roles_catalog = {};
    }
  } catch (err) {
    console.error('[StaffAuthEngine] Error reading staff_members.json:', err.message);
  }
}

function saveStore() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(staffStore, null, 2), 'utf8');
  } catch (err) {
    console.error('[StaffAuthEngine] Error saving staff_members.json:', err.message);
  }
}

loadStore();

const staffAuthEngine = {
  /**
   * Return catalog of roles and their baseline permissions
   */
  getRolesCatalog() {
    loadStore();
    return staffStore.roles_catalog || {};
  },

  /**
   * List all staff members (redacting passwords & salts)
   */
  listStaff() {
    loadStore();
    return staffStore.staff.map(s => {
      const { password_hash, password_salt, ...safe } = s;
      return safe;
    });
  },

  /**
   * Find staff member by ID
   */
  getStaffById(staffId) {
    loadStore();
    const s = staffStore.staff.find(m => m.id === staffId);
    if (!s) return null;
    const { password_hash, password_salt, ...safe } = s;
    return safe;
  },

  /**
   * Authenticate staff credentials with username & password
   */
  authenticate(username, password) {
    loadStore();
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    const member = staffStore.staff.find(s => s.username.toLowerCase() === username.trim().toLowerCase());
    if (!member) {
      throw new Error('Invalid credentials.');
    }

    if (member.status !== 'ACTIVE') {
      throw new Error('This staff account is currently suspended. Please consult Managing Director.');
    }

    const computedHash = hashPassword(password, member.password_salt);
    if (computedHash !== member.password_hash) {
      throw new Error('Invalid credentials.');
    }

    // Update last login timestamp
    member.last_login_at = new Date().toISOString();
    saveStore();

    const token = this.generateStaffToken(member);

    // Record login in audit trail
    auditTrailEngine.recordAction({
      staff_id: member.id,
      staff_name: member.display_name,
      staff_role: member.role,
      action: 'STAFF_LOGIN',
      entity_type: 'STAFF',
      entity_id: member.id,
      details: { username: member.username, role: member.role }
    });

    const { password_hash, password_salt, ...safeProfile } = member;
    return {
      token,
      staff: safeProfile
    };
  },

  /**
   * Generate cryptographically signed staff session token
   */
  generateStaffToken(member) {
    const payload = {
      sub: member.id,
      username: member.username,
      display_name: member.display_name,
      role: member.role,
      permissions: member.permissions || [],
      approval_ceiling: member.approval_ceiling || 0,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (14 * 24 * 3600) // 14 days valid
    };

    const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  },

  /**
   * Verify and decode staff session token
   */
  verifyStaffToken(token) {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64url');

    if (signature !== expectedSig) return null;

    try {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }
      return payload;
    } catch (_) {
      return null;
    }
  },

  /**
   * Check if staff user has a specific permission
   */
  hasPermission(staffUser, requiredPermission) {
    if (!staffUser) return false;
    if (staffUser.role === 'SUPER_ADMIN') return true;

    const perms = Array.isArray(staffUser.permissions) ? staffUser.permissions : [];
    if (perms.includes('*')) return true;
    if (perms.includes(requiredPermission)) return true;

    // Check wildcard prefix e.g. "loans:*" matches "loans:approve"
    const prefix = requiredPermission.split(':')[0] + ':*';
    if (perms.includes(prefix)) return true;

    return false;
  },

  /**
   * Create a new staff account (requires SUPER_ADMIN)
   */
  createStaffMember(data, operator = { id: 'SYSTEM', name: 'Super Admin', role: 'SUPER_ADMIN' }) {
    loadStore();
    const {
      username,
      display_name,
      email,
      phone,
      role = 'LOAN_OFFICER',
      password,
      custom_permissions,
      approval_ceiling
    } = data;

    if (!username || !password || !display_name) {
      throw new Error('Username, password, and display name are required.');
    }

    const cleanUsername = username.trim().toLowerCase();
    if (staffStore.staff.some(s => s.username.toLowerCase() === cleanUsername)) {
      throw new Error(`Username '${cleanUsername}' is already in use.`);
    }

    const roleInfo = staffStore.roles_catalog[role] || staffStore.roles_catalog.LOAN_OFFICER;
    const permissions = Array.isArray(custom_permissions) && custom_permissions.length > 0
      ? custom_permissions
      : (roleInfo?.default_permissions || ['loans:read']);

    const salt = crypto.randomBytes(16).toString('hex');
    const password_hash = hashPassword(password, salt);

    const newStaff = {
      id: `stf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      display_name: display_name.trim(),
      email: (email || '').trim(),
      phone: (phone || '').trim(),
      role,
      password_hash,
      password_salt: salt,
      permissions,
      approval_ceiling: approval_ceiling !== undefined ? parseInt(approval_ceiling, 10) : (role === 'SUPER_ADMIN' ? 100000 : 25000),
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      last_login_at: null
    };

    staffStore.staff.push(newStaff);
    saveStore();

    auditTrailEngine.recordAction({
      staff_id: operator.id,
      staff_name: operator.name || operator.display_name,
      staff_role: operator.role,
      action: 'STAFF_CREATED',
      entity_type: 'STAFF',
      entity_id: newStaff.id,
      details: { username: newStaff.username, role: newStaff.role, permissions }
    });

    const { password_hash: _h, password_salt: _s, ...safe } = newStaff;
    return safe;
  },

  /**
   * Update staff member details, role, permissions or status
   */
  updateStaffMember(staffId, updates, operator = { id: 'SYSTEM', name: 'Super Admin', role: 'SUPER_ADMIN' }) {
    loadStore();
    const member = staffStore.staff.find(s => s.id === staffId);
    if (!member) {
      throw new Error(`Staff member #${staffId} not found.`);
    }

    if (updates.display_name) member.display_name = updates.display_name.trim();
    if (updates.email !== undefined) member.email = updates.email.trim();
    if (updates.phone !== undefined) member.phone = updates.phone.trim();
    if (updates.role && staffStore.roles_catalog[updates.role]) {
      member.role = updates.role;
      if (!updates.permissions) {
        member.permissions = staffStore.roles_catalog[updates.role].default_permissions;
      }
    }
    if (Array.isArray(updates.permissions)) {
      member.permissions = updates.permissions;
    }
    if (updates.status && ['ACTIVE', 'SUSPENDED'].includes(updates.status)) {
      member.status = updates.status;
    }
    if (updates.approval_ceiling !== undefined) {
      member.approval_ceiling = parseInt(updates.approval_ceiling, 10) || 0;
    }
    if (updates.password) {
      member.password_salt = crypto.randomBytes(16).toString('hex');
      member.password_hash = hashPassword(updates.password, member.password_salt);
    }

    saveStore();

    auditTrailEngine.recordAction({
      staff_id: operator.id,
      staff_name: operator.name || operator.display_name,
      staff_role: operator.role,
      action: 'STAFF_UPDATED',
      entity_type: 'STAFF',
      entity_id: member.id,
      details: updates
    });

    const { password_hash, password_salt, ...safe } = member;
    return safe;
  }
};

module.exports = staffAuthEngine;
