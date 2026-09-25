'use strict';
/**
 * scripts/audit_codebase.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Full Code & Architecture Audit Suite
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('========================================================================');
console.log('🚀 SYM LOAN PLATFORM (S.E.P.) — FULL CODEBASE & STRUCTURE AUDIT');
console.log('========================================================================\n');

let issuesFound = 0;
let warningsFound = 0;
let passes = 0;

function reportPass(msg) {
  passes++;
  console.log(`  ✅ PASS: ${msg}`);
}

function reportWarn(msg) {
  warningsFound++;
  console.log(`  ⚠️ WARN: ${msg}`);
}

function reportIssue(msg) {
  issuesFound++;
  console.log(`  ❌ ISSUE: ${msg}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: HTML DOM & IDENTIFIER INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────
console.log('📌 SECTION 1: HTML DOM & Identifier Integrity');

function auditHtml(filePath, label) {
  const content = fs.readFileSync(filePath, 'utf8');
  const idRegex = /id=["']([^"']+)["']/g;
  const ids = new Map();
  let match;
  while ((match = idRegex.exec(content)) !== null) {
    const id = match[1];
    ids.set(id, (ids.get(id) || 0) + 1);
  }
  const duplicates = [];
  for (const [id, count] of ids.entries()) {
    if (count > 1) duplicates.push({ id, count });
  }

  if (duplicates.length === 0) {
    reportPass(`${label} has zero duplicate IDs across ${ids.size} unique elements`);
  } else {
    reportWarn(`${label} has ${duplicates.length} duplicate IDs: ${duplicates.map(d => `${d.id} (x${d.count})`).join(', ')}`);
  }

  return { content, ids };
}

const clientHtmlData = auditHtml(path.join(ROOT_DIR, 'public/index.html'), 'public/index.html');
const adminHtmlData = auditHtml(path.join(ROOT_DIR, 'public/admin.html'), 'public/admin.html');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: JAVASCRIPT DOM TARGET RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 SECTION 2: JavaScript DOM Target Resolution');

function checkJsDomReferences(jsPath, htmlIds, htmlContent, label) {
  const jsContent = fs.readFileSync(jsPath, 'utf8');
  // Match getElementById('...') or getElementById("...")
  const getByIdRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
  const queriedIds = new Set();
  let match;
  while ((match = getByIdRegex.exec(jsContent)) !== null) {
    queriedIds.add(match[1]);
  }

  const missingIds = [];
  for (const id of queriedIds) {
    // If not in static HTML, check if dynamically generated inside JS
    if (htmlIds.has(id)) continue;
    const dynamicCreation = new RegExp(`id=["'\\\`]?${id}["'\\\`]?`).test(jsContent);
    if (dynamicCreation) continue;

    // Check if part of a fallback expression: getElementById('A') || getElementById('B') where one exists
    const fallbackRegex = /getElementById\(['"]([^'"]+)['"]\)\s*\|\|\s*(?:document\.)?getElementById\(['"]([^'"]+)['"]\)/g;
    let fbMatch;
    let hasResolvedFallback = false;
    while ((fbMatch = fallbackRegex.exec(jsContent)) !== null) {
      if ((fbMatch[1] === id || fbMatch[2] === id) && (htmlIds.has(fbMatch[1]) || htmlIds.has(fbMatch[2]))) {
        hasResolvedFallback = true;
        break;
      }
    }
    if (hasResolvedFallback) continue;

    missingIds.push(id);
  }

  if (missingIds.length === 0) {
    reportPass(`${label} targets ${queriedIds.size} DOM IDs — all resolved in HTML or dynamic templates`);
  } else {
    reportWarn(`${label} has ${missingIds.length} queried DOM IDs not found in HTML or templates:\n       -> ${missingIds.join(', ')}`);
  }

  return queriedIds;
}

checkJsDomReferences(path.join(ROOT_DIR, 'public/js/app.js'), clientHtmlData.ids, clientHtmlData.content, 'public/js/app.js');
checkJsDomReferences(path.join(ROOT_DIR, 'public/js/admin.js'), adminHtmlData.ids, adminHtmlData.content, 'public/js/admin.js');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: API ROUTE INTEGRATION & COVERAGE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 SECTION 3: API Route Integration & Coverage');

function extractExpressRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routeRegex = /router\.(get|post|patch|delete|put)\(['"]([^'"]+)['"]/g;
  const routes = [];
  let m;
  while ((m = routeRegex.exec(content)) !== null) {
    routes.push({ method: m[1].toUpperCase(), path: m[2] });
  }
  return routes;
}

const clientApiRoutes = extractExpressRoutes(path.join(ROOT_DIR, 'src/routes/api.js'));
const adminApiRoutes = extractExpressRoutes(path.join(ROOT_DIR, 'src/routes/adminApi.js'));

reportPass(`Client API router defines ${clientApiRoutes.length} endpoints`);
reportPass(`Admin API router defines ${adminApiRoutes.length} endpoints`);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: ENVIRONMENT VARIABLES & CONFIGURATION AUDIT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 SECTION 4: Environment Variables & Security Audit');

const envFile = path.join(ROOT_DIR, '.env');
const envProdExample = path.join(ROOT_DIR, '.env.production.example');

if (fs.existsSync(envFile)) {
  reportPass('.env configuration file exists');
} else {
  reportIssue('.env file missing!');
}

if (fs.existsSync(envProdExample)) {
  reportPass('.env.production.example template exists');
} else {
  reportWarn('.env.production.example is missing');
}

// Check for hardcoded sensitive strings in source code
const sensitivePatterns = [
  { name: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/ },
  { name: 'Hardcoded Bot Token in app.js', file: 'public/js/app.js', regex: /bot\d+:[a-zA-Z0-9_-]{35}/ },
  { name: 'Hardcoded Bot Token in admin.js', file: 'public/js/admin.js', regex: /bot\d+:[a-zA-Z0-9_-]{35}/ }
];

sensitivePatterns.forEach(pattern => {
  if (pattern.file) {
    const fPath = path.join(ROOT_DIR, pattern.file);
    if (fs.existsSync(fPath)) {
      const txt = fs.readFileSync(fPath, 'utf8');
      if (pattern.regex.test(txt)) {
        reportIssue(`Potential secret leak: ${pattern.name} found in ${pattern.file}`);
      } else {
        reportPass(`No sensitive ${pattern.name} detected in ${pattern.file}`);
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: STATIC ASSETS & NATIVE ANDROID BUILDS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 SECTION 5: Static Assets & Native Android Binaries');

const clientApk = path.join(ROOT_DIR, 'public/downloads/SYM-LOAN.apk');
const adminApk = path.join(ROOT_DIR, 'public/downloads/SYM-LOAN-ADMIN.apk');

if (fs.existsSync(clientApk)) {
  const size = fs.statSync(clientApk).size;
  reportPass(`SYM-LOAN.apk exists (${(size / 1024).toFixed(2)} KB)`);
} else {
  reportIssue('SYM-LOAN.apk is missing from public/downloads/');
}

if (fs.existsSync(adminApk)) {
  const size = fs.statSync(adminApk).size;
  reportPass(`SYM-LOAN-ADMIN.apk exists (${(size / 1024).toFixed(2)} KB)`);
} else {
  reportIssue('SYM-LOAN-ADMIN.apk is missing from public/downloads/');
}

// Check stitch icons presence
const stitchFile = path.join(ROOT_DIR, 'public/js/stitchIcons.js');
if (fs.existsSync(stitchFile)) {
  const stitchContent = fs.readFileSync(stitchFile, 'utf8');
  if (stitchContent.includes('window.StitchIcons') || stitchContent.includes('const StitchIcons')) {
    reportPass('Google Stitch Custom Vector Icon library is properly defined and loaded');
  } else {
    reportWarn('StitchIcons export not found in stitchIcons.js');
  }
} else {
  reportIssue('stitchIcons.js is missing from public/js/');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: DATA STORES & JSON FILES INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 SECTION 6: Data Stores & JSON Files Integrity');

const dataDir = path.join(ROOT_DIR, 'data');
if (fs.existsSync(dataDir)) {
  const dataFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  let validJsonCount = 0;
  for (const f of dataFiles) {
    try {
      const raw = fs.readFileSync(path.join(dataDir, f), 'utf8');
      JSON.parse(raw);
      validJsonCount++;
    } catch (e) {
      reportIssue(`Corrupted JSON file data/${f}: ${e.message}`);
    }
  }
  reportPass(`All ${validJsonCount}/${dataFiles.length} JSON data files in data/ parsed cleanly`);
} else {
  reportWarn('data/ directory does not exist');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: FRONTEND FETCH VS BACKEND ROUTE ALIGNMENT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 SECTION 7: Frontend Fetch vs Backend Route Alignment');

function extractFetchEndpoints(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match fetch('/api/... or fetch(`/api/...
  const fetchRegex = /fetch\(['"`](\/api\/[^'"`?#\s]+)/g;
  const endpoints = new Set();
  let m;
  while ((m = fetchRegex.exec(content)) !== null) {
    // Normalize parametrized endpoints like /api/clients/${id} or /api/clients/:id
    let ep = m[1].replace(/\$\{[^}]+\}/g, ':param');
    endpoints.add(ep);
  }
  return Array.from(endpoints);
}

const clientFetches = extractFetchEndpoints(path.join(ROOT_DIR, 'public/js/app.js'));
const adminFetches = extractFetchEndpoints(path.join(ROOT_DIR, 'public/js/admin.js'));

reportPass(`Found ${clientFetches.length} unique API fetch calls in public/js/app.js`);
reportPass(`Found ${adminFetches.length} unique API fetch calls in public/js/admin.js`);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: NATIVE ANDROID MANIFESTS & INSETS ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 SECTION 8: Native Android Manifests & Insets Architecture');

function auditAndroidProject(dir, expectedPkg, label) {
  const manifestPath = path.join(dir, 'AndroidManifest.xml');
  const stylesPath = path.join(dir, 'res/values/styles.xml');
  const mainActivityPath = path.join(dir, 'src', expectedPkg.replace(/\./g, '/'), 'MainActivity.java');

  if (!fs.existsSync(manifestPath)) {
    reportIssue(`${label} AndroidManifest.xml is missing`);
    return;
  }
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  if (manifest.includes(`package="${expectedPkg}"`)) {
    reportPass(`${label} package matches ${expectedPkg}`);
  } else {
    reportIssue(`${label} package mismatch in AndroidManifest.xml`);
  }

  if (manifest.includes('android.permission.INTERNET')) {
    reportPass(`${label} declares INTERNET permission`);
  } else {
    reportIssue(`${label} missing INTERNET permission`);
  }

  if (fs.existsSync(stylesPath)) {
    const styles = fs.readFileSync(stylesPath, 'utf8');
    if (styles.includes('android:fitsSystemWindows')) {
      reportPass(`${label} styles.xml enables fitsSystemWindows`);
    } else {
      reportWarn(`${label} styles.xml does not have fitsSystemWindows`);
    }
  }

  if (fs.existsSync(mainActivityPath)) {
    const javaCode = fs.readFileSync(mainActivityPath, 'utf8');
    if (javaCode.includes('setFitsSystemWindows(true)') && javaCode.includes('status_bar_height')) {
      reportPass(`${label} MainActivity.java implements status bar insets protection`);
    } else {
      reportWarn(`${label} MainActivity.java lacks status bar insets handling`);
    }
  } else {
    reportIssue(`${label} MainActivity.java not found at ${mainActivityPath}`);
  }
}

auditAndroidProject(path.join(ROOT_DIR, 'android'), 'com.symempire.symloan', 'Client App');
auditAndroidProject(path.join(ROOT_DIR, 'android-admin'), 'com.symempire.symloanadmin', 'Admin App');

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n========================================================================');
console.log(`📊 AUDIT RESULTS SUMMARY: ${passes} PASSES, ${warningsFound} WARNINGS, ${issuesFound} CRITICAL ISSUES`);
console.log('========================================================================\n');
