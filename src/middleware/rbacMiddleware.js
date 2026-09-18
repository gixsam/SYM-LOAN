'use strict';
/**
 * src/middleware/rbacMiddleware.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Role-Based Access Control (RBAC) Middleware
 *
 * Enforces authenticated staff sessions and verifies granular permissions.
 */

const staffAuthEngine = require('../lib/staffAuthEngine');

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'SEP_ADMIN_2026';

function extractStaffContext(req) {
  // 1. Check for Super Admin Master Key
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
  if (adminKey === ADMIN_SECRET) {
    return {
      id: 'stf_superadmin_01',
      username: 'superadmin',
      display_name: 'Executive Managing Director',
      role: 'SUPER_ADMIN',
      permissions: ['*'],
      approval_ceiling: 100000
    };
  }

  // 2. Check for Staff Token in headers
  let token = req.headers['x-staff-token'] || req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  if (token) {
    const payload = staffAuthEngine.verifyStaffToken(token);
    if (payload) {
      // Re-verify current live status in store
      const liveMember = staffAuthEngine.getStaffById(payload.sub);
      if (liveMember && liveMember.status === 'ACTIVE') {
        return {
          id: liveMember.id,
          username: liveMember.username,
          display_name: liveMember.display_name,
          role: liveMember.role,
          permissions: liveMember.permissions || [],
          approval_ceiling: liveMember.approval_ceiling || 0
        };
      }
    }
  }

  return null;
}

/**
 * Middleware: Requires an authenticated staff session or super admin key
 */
function requireStaffAuth(req, res, next) {
  const staff = extractStaffContext(req);
  if (!staff) {
    return res.status(401).json({
      success: false,
      code: 'STAFF_AUTH_REQUIRED',
      message: 'Access denied. Valid staff authentication token or executive admin key required.'
    });
  }

  req.staffUser = staff;
  next();
}

/**
 * Middleware: Requires a specific granular permission token (e.g. 'loans:approve')
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const staff = extractStaffContext(req);
    if (!staff) {
      return res.status(401).json({
        success: false,
        code: 'STAFF_AUTH_REQUIRED',
        message: 'Authentication required.'
      });
    }

    req.staffUser = staff;

    if (!staffAuthEngine.hasPermission(staff, permission)) {
      return res.status(403).json({
        success: false,
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Forbidden. Your role (${staff.role}) lacks the required permission: '${permission}'.`,
        required_permission: permission,
        current_role: staff.role
      });
    }

    next();
  };
}

/**
 * Middleware: Requires one of the specified roles
 */
function requireRole(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const staff = extractStaffContext(req);
    if (!staff) {
      return res.status(401).json({
        success: false,
        code: 'STAFF_AUTH_REQUIRED',
        message: 'Authentication required.'
      });
    }

    req.staffUser = staff;

    if (staff.role !== 'SUPER_ADMIN' && !allowed.includes(staff.role)) {
      return res.status(403).json({
        success: false,
        code: 'ROLE_UNAUTHORIZED',
        message: `Forbidden. Access restricted to roles: [${allowed.join(', ')}].`,
        allowed_roles: allowed,
        current_role: staff.role
      });
    }

    next();
  };
}

module.exports = {
  requireStaffAuth,
  requirePermission,
  requireRole,
  extractStaffContext
};
