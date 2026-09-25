'use strict';
/**
 * scripts/test_phase12.js
 * Automated Verification Suite for Phase 12:
 * Multi-Staff Role-Based Access Control (RBAC), Granular Permission Matrix
 * & Cryptographic Immutable Audit Trail Engine
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');

const staffAuthEngine = require('../src/lib/staffAuthEngine');
const auditTrailEngine = require('../src/lib/auditTrailEngine');

const BASE_URL = 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'SEP_ADMIN_2026';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function makeRequest(endpoint, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const headers = {
      'x-admin-key': ADMIN_KEY,
      ...options.headers,
    };

    if (postData && typeof postData === 'object') {
      postData = JSON.stringify(postData);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers,
      timeout: 8000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${endpoint} timed out after 8000ms`));
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================================');
  console.log('  SYM LOAN — PHASE 12 AUTOMATED VERIFICATION TEST SUITE');
  console.log('  Multi-Staff RBAC Matrix & Cryptographic Immutable Audit Trail Engine');
  console.log('======================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 1: Staff Database & Roles Catalog Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION 1: Staff Database & Roles Catalog ---');

  const staffFilePath = path.join(__dirname, '..', 'data', 'staff_members.json');
  assert(fs.existsSync(staffFilePath), 'data/staff_members.json file exists on disk');

  const staffList = staffAuthEngine.listStaff();
  assert(Array.isArray(staffList) && staffList.length >= 5, `Initial staff roster loaded (${staffList.length} members found)`);

  const superAdmin = staffList.find(s => s.role === 'SUPER_ADMIN');
  assert(superAdmin && superAdmin.username === 'superadmin', 'Super Administrator account seeded successfully');
  assert(superAdmin.permissions.includes('*'), 'Super Admin has unrestricted wildcard root permissions (*)');
  assert(!superAdmin.password_hash && !superAdmin.password_salt, 'Staff list safely omits password hash and salt credentials');

  const loanOfficer = staffList.find(s => s.role === 'LOAN_OFFICER');
  assert(loanOfficer && loanOfficer.username === 'officer_karim', 'Loan Officer account exists');
  assert(loanOfficer.approval_ceiling === 25000, 'Loan Officer approval ceiling set to ৳25,000');

  const rolesCatalog = staffAuthEngine.getRolesCatalog();
  const expectedRoles = ['SUPER_ADMIN', 'LOAN_OFFICER', 'COMPLIANCE_OFFICER', 'COLLECTIONS_AGENT', 'FINANCE_DESK'];
  const allRolesPresent = expectedRoles.every(r => !!rolesCatalog[r]);
  assert(allRolesPresent, 'All 5 core financial staff roles defined in roles catalog');

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 2: Staff Authentication & Cryptographic Token Generation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 2: Staff Authentication & JWT Scoped Tokens ---');

  let authResult;
  try {
    authResult = staffAuthEngine.authenticate('superadmin', 'SuperAdmin#2026!');
    assert(authResult && authResult.token, 'SuperAdmin credentials authenticated with cryptographic token issued');
    assert(authResult.staff.username === 'superadmin', 'Authenticated profile matches username');
  } catch (err) {
    assert(false, `SuperAdmin authentication failed: ${err.message}`);
  }

  let officerAuth;
  try {
    officerAuth = staffAuthEngine.authenticate('officer_karim', 'LoanOfficer#2026!');
    assert(officerAuth && officerAuth.token, 'Loan Officer credentials authenticated successfully');
    assert(officerAuth.staff.role === 'LOAN_OFFICER', 'Loan Officer assigned correct role in session profile');
  } catch (err) {
    assert(false, `Loan Officer authentication failed: ${err.message}`);
  }

  // Reject wrong password
  let badPassFailed = false;
  try {
    staffAuthEngine.authenticate('superadmin', 'WrongPassword123!');
  } catch (err) {
    badPassFailed = true;
  }
  assert(badPassFailed, 'Authentication rejected on invalid password with security error');

  // Reject non-existent user
  let badUserFailed = false;
  try {
    staffAuthEngine.authenticate('nonexistent_user_xyz', 'AnyPassword123!');
  } catch (err) {
    badUserFailed = true;
  }
  assert(badUserFailed, 'Authentication rejected on non-existent staff username');

  // Token Verification
  const decodedToken = staffAuthEngine.verifyStaffToken(authResult.token);
  assert(decodedToken && decodedToken.username === 'superadmin', 'Cryptographic staff token verified and signature validated');
  assert(decodedToken.role === 'SUPER_ADMIN', 'Decoded token preserves authenticated role');

  // Tampered Token Rejection
  const parts = authResult.token.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ sub: 'forged', role: 'SUPER_ADMIN' })).toString('base64url');
  const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;
  const tamperedResult = staffAuthEngine.verifyStaffToken(forgedToken);
  assert(tamperedResult === null, 'Tampered token signature mismatch properly rejected (returns null)');

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 3: Granular RBAC Permission Matrix & Scope Evaluation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 3: Granular RBAC Permission Matrix ---');

  // Super Admin wildcard checks
  assert(staffAuthEngine.hasPermission(superAdmin, 'loans:decision'), 'Super Admin has permission loans:decision');
  assert(staffAuthEngine.hasPermission(superAdmin, 'staff:manage'), 'Super Admin has permission staff:manage');
  assert(staffAuthEngine.hasPermission(superAdmin, 'audit:verify'), 'Super Admin has permission audit:verify');
  assert(staffAuthEngine.hasPermission(superAdmin, 'any:random:permission'), 'Super Admin matches arbitrary permission via wildcard *');

  // Loan Officer checks
  assert(staffAuthEngine.hasPermission(loanOfficer, 'loans:view'), 'Loan Officer has permission loans:view');
  assert(staffAuthEngine.hasPermission(loanOfficer, 'loans:decision'), 'Loan Officer has permission loans:decision');
  assert(!staffAuthEngine.hasPermission(loanOfficer, 'staff:manage'), 'Loan Officer denied permission staff:manage');
  assert(!staffAuthEngine.hasPermission(loanOfficer, 'credit:override'), 'Loan Officer denied permission credit:override');

  // Compliance Officer checks
  const complianceOfficer = staffList.find(s => s.role === 'COMPLIANCE_OFFICER');
  assert(staffAuthEngine.hasPermission(complianceOfficer, 'fraud:resolve'), 'Compliance Officer has permission fraud:resolve');
  assert(staffAuthEngine.hasPermission(complianceOfficer, 'credit:override'), 'Compliance Officer has permission credit:override');
  assert(!staffAuthEngine.hasPermission(complianceOfficer, 'repayments:verify'), 'Compliance Officer denied permission repayments:verify');

  // Collections Agent checks
  const collectionsAgent = staffList.find(s => s.role === 'COLLECTIONS_AGENT');
  assert(staffAuthEngine.hasPermission(collectionsAgent, 'dunning:execute'), 'Collections Agent has permission dunning:execute');
  assert(!staffAuthEngine.hasPermission(collectionsAgent, 'loans:decision'), 'Collections Agent denied permission loans:decision');

  // Finance Desk checks
  const financeDesk = staffList.find(s => s.role === 'FINANCE_DESK');
  assert(staffAuthEngine.hasPermission(financeDesk, 'repayments:verify'), 'Finance Desk has permission repayments:verify');
  assert(!staffAuthEngine.hasPermission(financeDesk, 'fraud:resolve'), 'Finance Desk denied permission fraud:resolve');

  // Prefix wildcard evaluation
  const testScopedStaff = { permissions: ['loans:*', 'reports:read'] };
  assert(staffAuthEngine.hasPermission(testScopedStaff, 'loans:decision'), 'Prefix wildcard loans:* matches loans:decision');
  assert(staffAuthEngine.hasPermission(testScopedStaff, 'loans:disburse'), 'Prefix wildcard loans:* matches loans:disburse');
  assert(!staffAuthEngine.hasPermission(testScopedStaff, 'users:delete'), 'Prefix wildcard loans:* does not match users:delete');

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 4: Staff Member Provisioning & Status Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 4: Staff Provisioning & Lifecycle ---');

  const testUsername = `test_officer_${Date.now()}`;
  let createdStaff;
  try {
    createdStaff = staffAuthEngine.createStaffMember({
      username: testUsername,
      display_name: 'Test Junior Officer',
      email: `${testUsername}@symloan.com`,
      password: 'TempPassword123!',
      role: 'LOAN_OFFICER',
      approval_ceiling: 15000
    }, superAdmin);

    assert(createdStaff && createdStaff.id, `Created new staff member #${createdStaff.id} (@${testUsername})`);
    assert(createdStaff.status === 'ACTIVE', 'New staff member status initialized to ACTIVE');
    assert(createdStaff.approval_ceiling === 15000, 'Custom approval ceiling saved');
  } catch (err) {
    assert(false, `Staff creation failed: ${err.message}`);
  }

  // Duplicate username prevention
  let dupFailed = false;
  try {
    staffAuthEngine.createStaffMember({
      username: testUsername,
      display_name: 'Duplicate Officer',
      email: 'dup@symloan.com',
      password: 'TempPassword123!',
      role: 'LOAN_OFFICER'
    }, superAdmin);
  } catch (err) {
    dupFailed = true;
  }
  assert(dupFailed, 'Duplicate staff username prevented with validation error');

  // Update staff member status to SUSPENDED
  let updatedStaff;
  try {
    updatedStaff = staffAuthEngine.updateStaffMember(createdStaff.id, {
      status: 'SUSPENDED',
      approval_ceiling: 5000
    }, superAdmin);

    assert(updatedStaff.status === 'SUSPENDED', 'Staff status updated to SUSPENDED');
    assert(updatedStaff.approval_ceiling === 5000, 'Staff approval ceiling updated');
  } catch (err) {
    assert(false, `Staff update failed: ${err.message}`);
  }

  // Authenticate suspended staff member should fail
  let suspendedLoginFailed = false;
  try {
    staffAuthEngine.authenticate(testUsername, 'TempPassword123!');
  } catch (err) {
    suspendedLoginFailed = true;
    assert(err.message.includes('suspended'), `Suspended staff login error mentions suspension: "${err.message}"`);
  }
  assert(suspendedLoginFailed, 'Suspended staff member blocked from authenticating');

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 5: Cryptographic Immutable Blockchain Audit Trail Engine
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 5: Cryptographic Blockchain Immutable Audit Trail ---');

  const auditFilePath = path.join(__dirname, '..', 'data', 'audit_trail.json');
  assert(fs.existsSync(auditFilePath), 'data/audit_trail.json file exists on disk');

  // Verify initial chain integrity
  const initialIntegrity = auditTrailEngine.verifyChainIntegrity();
  assert(initialIntegrity.valid === true, `Cryptographic chain integrity 100% verified (${initialIntegrity.total_blocks} blocks intact)`);
  assert(typeof initialIntegrity.head_hash === 'string' && initialIntegrity.head_hash.length === 64, 'Head hash is valid 64-character SHA-256 hex string');

  // Record an audit action
  const recordedBlock = auditTrailEngine.recordAction({
    staff_id: officerAuth.staff.id,
    staff_name: officerAuth.staff.display_name,
    staff_role: officerAuth.staff.role,
    action: 'TEST_AUDIT_ACTION',
    entity_type: 'TEST_ENTITY',
    entity_id: 'test_ent_999',
    details: { test_key: 'test_value_123' },
    ip_address: '192.168.1.100',
    user_agent: 'Automated Test Runner'
  });

  assert(recordedBlock && recordedBlock.index > 0, `Recorded new audit block #${recordedBlock.index}`);
  assert(recordedBlock.previous_hash === initialIntegrity.head_hash, 'Block previous_hash matches prior chain head hash');
  assert(recordedBlock.hash.length === 64, 'Computed block SHA-256 hash has 64 characters');

  // Verify chain after block append
  const updatedIntegrity = auditTrailEngine.verifyChainIntegrity();
  assert(updatedIntegrity.valid === true, `Chain remains 100% valid after new block append (total: ${updatedIntegrity.total_blocks})`);
  assert(updatedIntegrity.head_hash === recordedBlock.hash, 'Chain head hash advanced to newly appended block hash');

  // Test Tamper Detection: Mutate raw data on disk temporarily
  const rawAuditJson = fs.readFileSync(auditFilePath, 'utf8');
  const parsedAudit = JSON.parse(rawAuditJson);
  const targetBlock = parsedAudit.blocks[parsedAudit.blocks.length - 1];
  const originalAction = targetBlock.action;

  function safeWriteTestFile(p, content) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.writeFileSync(p, content, 'utf8');
        return;
      } catch (e) {
        if (attempt === 4) throw e;
        const start = Date.now();
        while (Date.now() - start < 40 * (attempt + 1)) {}
      }
    }
  }

  // Tamper with payload
  targetBlock.action = 'TAMPERED_ACTION_FRAUD';
  safeWriteTestFile(auditFilePath, JSON.stringify(parsedAudit, null, 2));

  // Verify that tamper is detected
  const tamperedIntegrity = auditTrailEngine.verifyChainIntegrity();
  assert(tamperedIntegrity.valid === false, 'Cryptographic engine detected data tampering in audit ledger!');
  assert(tamperedIntegrity.tampered_block_index === targetBlock.index, `Engine correctly pinpoints corrupted block index #${targetBlock.index}`);

  // Revert tamper back to clean state
  targetBlock.action = originalAction;
  safeWriteTestFile(auditFilePath, JSON.stringify(parsedAudit, null, 2));

  const restoredIntegrity = auditTrailEngine.verifyChainIntegrity();
  assert(restoredIntegrity.valid === true, 'Chain integrity restored to 100% valid after reverting test tamper');

  // Multi-criteria Query Testing
  const auditQueryResult = auditTrailEngine.getAuditLogs({ limit: 10 });
  assert(auditQueryResult.success === true, 'Query audit logs returns success');
  assert(Array.isArray(auditQueryResult.logs) && auditQueryResult.logs.length > 0, 'Audit query returns array of block records');
  assert(auditQueryResult.stats.total_blocks >= 2, `Audit stats report correct total blocks count (${auditQueryResult.stats.total_blocks})`);

  const filteredLogs = auditTrailEngine.getAuditLogs({ action: 'TEST_AUDIT_ACTION' });
  assert(filteredLogs.logs.length >= 1 && filteredLogs.logs[0].action === 'TEST_AUDIT_ACTION', 'Filter audit logs by action token');

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION 6: Live HTTP REST API Integration
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SECTION 6: Live HTTP REST API Endpoints ---');

  // 1. Staff Login HTTP
  const loginRes = await makeRequest('/api/admin/staff/auth/login', { method: 'POST' }, {
    username: 'officer_karim',
    password: 'LoanOfficer#2026!'
  });
  assert(loginRes.status === 200 && loginRes.body.success === true, 'HTTP POST /api/admin/staff/auth/login succeeds (200 OK)');
  assert(typeof loginRes.body.token === 'string', 'HTTP login returns valid session JWT token');
  const staffJwt = loginRes.body.token;

  // 2. Staff Profile with Bearer token
  const profileRes = await makeRequest('/api/admin/staff/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${staffJwt}` }
  });
  assert(profileRes.status === 200 && profileRes.body.success === true, 'HTTP GET /api/admin/staff/profile with Bearer token succeeds');
  assert(profileRes.body.staff.username === 'officer_karim', 'Profile endpoint identifies authenticated staff member');

  // 3. Staff Roster & Roles List
  const staffRosterRes = await makeRequest('/api/admin/staff', { method: 'GET' });
  assert(staffRosterRes.status === 200 && staffRosterRes.body.success === true, 'HTTP GET /api/admin/staff returns staff roster');
  assert(Array.isArray(staffRosterRes.body.staff), 'Staff roster response contains array of staff members');
  assert(typeof staffRosterRes.body.roles === 'object', 'Staff roster response includes roles catalog metadata');

  // 4. Provision Staff via HTTP
  const httpStaffUser = `http_officer_${Date.now()}`;
  const createRes = await makeRequest('/api/admin/staff', { method: 'POST' }, {
    username: httpStaffUser,
    display_name: 'HTTP Provisioned Analyst',
    email: `${httpStaffUser}@symloan.com`,
    password: 'SecurePassword123!',
    role: 'COMPLIANCE_OFFICER',
    approval_ceiling: 30000
  });
  assert(createRes.status === 201 && createRes.body.success === true, 'HTTP POST /api/admin/staff provisions new staff (201 Created)');
  const httpStaffId = createRes.body.staff.id;

  // 5. Update Staff via HTTP
  const updateRes = await makeRequest(`/api/admin/staff/${httpStaffId}`, { method: 'PATCH' }, {
    status: 'ACTIVE',
    department: 'Risk & Surveillance Division'
  });
  assert(updateRes.status === 200 && updateRes.body.success === true, 'HTTP PATCH /api/admin/staff/:id updates staff details (200 OK)');

  // 6. Audit Logs via HTTP
  const auditLogsRes = await makeRequest('/api/admin/audit/logs?limit=15', { method: 'GET' });
  assert(auditLogsRes.status === 200 && auditLogsRes.body.success === true, 'HTTP GET /api/admin/audit/logs returns audit blocks');
  assert(auditLogsRes.body.stats.total_blocks > 0, `HTTP audit endpoint returns stats with total blocks (${auditLogsRes.body.stats.total_blocks})`);

  // 7. Verify Chain Integrity via HTTP
  const verifyChainRes = await makeRequest('/api/admin/audit/verify-chain', { method: 'GET' });
  assert(verifyChainRes.status === 200 && verifyChainRes.body.success === true, 'HTTP GET /api/admin/audit/verify-chain returns 200 OK');
  assert(verifyChainRes.body.verification.valid === true, 'HTTP chain verification reports valid: true (tamper-evident proof)');

  // 8. Trigger administrative action that records audit block and verify auto-logging
  const testClientId = `test_cli_${Date.now()}`;
  const overrideRes = await makeRequest('/api/admin/credit/override', { method: 'POST' }, {
    client_id: testClientId,
    score_offset: 25,
    fixed_grade: 'A',
    admin_note: 'Audit trail integration automated verification test'
  });
  assert(overrideRes.status === 200 && overrideRes.body.success === true, 'HTTP POST /api/admin/credit/override executes successfully');

  // Verify that CREDIT_OVERRIDE_SET was immediately anchored in the immutable audit chain
  const latestAuditRes = await makeRequest('/api/admin/audit/logs?limit=5', { method: 'GET' });
  const latestBlock = latestAuditRes.body.logs[0];
  assert(latestBlock && latestBlock.action === 'CREDIT_OVERRIDE_SET', `Administrative credit override automatically anchored as audit block #${latestBlock.block_index}`);
  assert(latestBlock.entity_id === testClientId, `Audit block entity_id matches target client (${testClientId})`);

  // Clean up credit override test
  await makeRequest(`/api/admin/credit/override/${testClientId}`, { method: 'DELETE' });

  // Final verification of chain after all operations
  const finalVerification = await makeRequest('/api/admin/audit/verify-chain', { method: 'GET' });
  assert(finalVerification.body.verification.valid === true, `Final audit chain remains 100% cryptographically intact across all operations (${finalVerification.body.verification.total_blocks} blocks)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST SUITE SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log(`  PHASE 12 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 Phase 12 RBAC & Immutable Audit Trail Engine 100% Verified!\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Unhandled Test Runner Error:', err);
  process.exit(1);
});
