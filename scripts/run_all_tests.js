'use strict';
/**
 * scripts/run_all_tests.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Master Test Runner & Verification Suite
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const SUITES = [
  { name: 'Full Codebase & Structure Audit', script: 'scripts/audit_codebase.js' },
  { name: 'UI/UX Patch Suite', script: 'scripts/test_ui_ux_patch.js' },
  { name: 'Client Portal & Biometrics Overhaul (Part 2)', script: 'scripts/test_part2_overhaul.js' },
  { name: 'Admin Overhaul & Governance (Part 1)', script: 'scripts/test_admin_overhaul.js' },
  { name: 'Admin UI Interactions', script: 'scripts/test_admin_ui_interactions.js' },
  { name: 'Phase 7 (Client Dashboard & Loans)', script: 'scripts/test_phase7.js' },
  { name: 'Phase 8 (Expenses & Ledgers)', script: 'scripts/test_phase8.js' },
  { name: 'Phase 9 (Repayments Reconciliation)', script: 'scripts/test_phase9.js' },
  { name: 'Phase 10 (Collections & Dunning)', script: 'scripts/test_phase10.js' },
  { name: 'Phase 11 (Credit Scoring & Anti-Fraud)', script: 'scripts/test_phase11.js' },
  { name: 'Phase 12 (RBAC & Blockchain Audit Trail)', script: 'scripts/test_phase12.js' }
];

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║        SYM EMPIRE PLATFORM (S.E.P.) — MASTER TEST VERIFICATION       ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const suite of SUITES) {
  process.stdout.write(`⏳ Running [${suite.name}] ... `);
  const startTime = Date.now();
  try {
    const output = execSync(`node "${path.join(ROOT_DIR, suite.script)}"`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ PASSED (${duration}s)`);
    results.push({ name: suite.name, status: 'PASSED', duration });
    totalPassed++;
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`❌ FAILED (${duration}s)`);
    console.error(err.stdout || err.stderr || err.message);
    results.push({ name: suite.name, status: 'FAILED', duration, error: err.message });
    totalFailed++;
  }
}

console.log('\n========================================================================');
console.log('📊 MASTER TEST SUMMARY:');
console.log('========================================================================');
results.forEach(r => {
  const icon = r.status === 'PASSED' ? '✅' : '❌';
  console.log(`  ${icon} ${r.status.padEnd(7)} | ${r.duration}s | ${r.name}`);
});

console.log('------------------------------------------------------------------------');
console.log(`Total Suites: ${SUITES.length} | Passed: ${totalPassed} | Failed: ${totalFailed}`);
console.log('========================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
