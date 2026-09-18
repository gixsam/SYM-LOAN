/**
 * scripts/test_phase7.js
 * Verification test suite for Phase 7: Native Mobile APK Build & Progressive App Installation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body.toString('utf8'),
          rawLength: body.length
        });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('🧪 Starting Phase 7 Automated Verification Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(cond, desc) {
    total++;
    if (cond) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
    }
  }

  try {
    // 1. /downloads/SYM-LOAN.apk
    const r1 = await fetchUrl('http://localhost:5000/downloads/SYM-LOAN.apk');
    assert(r1.statusCode === 200, 'GET /downloads/SYM-LOAN.apk returns HTTP 200');
    assert(r1.headers['content-type'] === 'application/vnd.android.package-archive', 'Content-Type is application/vnd.android.package-archive');
    assert(r1.rawLength > 500000, `APK size is valid binary payload (${r1.rawLength} bytes)`);

    // 2. /api/app/download-apk
    const r2 = await fetchUrl('http://localhost:5000/api/app/download-apk');
    assert(r2.statusCode === 200, 'GET /api/app/download-apk returns HTTP 200');
    assert(r2.headers['content-type'] === 'application/vnd.android.package-archive', 'API download Content-Type matches APK MIME');

    // 3. /manifest.json
    const r3 = await fetchUrl('http://localhost:5000/manifest.json');
    assert(r3.statusCode === 200, 'GET /manifest.json returns HTTP 200');
    let manifest;
    try {
      manifest = JSON.parse(r3.body);
      assert(manifest.short_name === 'SYM LOAN', 'Manifest short_name is "SYM LOAN"');
      assert(manifest.theme_color === '#f59e0b', 'Manifest theme_color matches gold theme (#f59e0b)');
      assert(manifest.display === 'standalone', 'Manifest display mode is standalone');
    } catch (e) {
      assert(false, 'Manifest JSON parsing failed: ' + e.message);
    }

    // 4. /sw.js
    const r4 = await fetchUrl('http://localhost:5000/sw.js');
    assert(r4.statusCode === 200, 'GET /sw.js returns HTTP 200');
    assert(r4.body.includes('symloan-v2.6.0'), 'Service worker includes cache key version');
    assert(r4.body.includes('self.addEventListener(\'fetch\''), 'Service worker handles network fetch events');

    // 5. Check index.html elements
    const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    assert(indexHtml.includes('<link rel="manifest" href="/manifest.json">'), 'index.html links manifest.json');
    assert(indexHtml.includes('SYM-LOAN.apk'), 'index.html contains direct download link for SYM-LOAN.apk');
    assert(indexHtml.includes('pwaInstallBtn'), 'index.html contains PWA install button in drawer');
    assert(indexHtml.includes('settingsPwaInstallBtn'), 'index.html contains PWA install button in settings modal');

    // 6. Check apksigner verification
    const apkPath = path.join(__dirname, '../public/downloads/SYM-LOAN.apk');
    assert(fs.existsSync(apkPath), 'SYM-LOAN.apk exists in public/downloads/');
    const apksigner = 'C:\\Users\\pc\\AppData\\Local\\Android\\Sdk\\build-tools\\34.0.0\\apksigner.bat';
    const verifyOut = execSync(`"${apksigner}" verify --verbose "${apkPath}"`).toString();
    assert(verifyOut.includes('Verified using v2 scheme (APK Signature Scheme v2): true'), 'APK has valid Scheme v2 cryptographic signature');
    assert(verifyOut.includes('Verified using v3 scheme (APK Signature Scheme v3): true'), 'APK has valid Scheme v3 cryptographic signature');

    console.log(`\n📊 Results: ${passed}/${total} assertions passed (${Math.round((passed/total)*100)}% pass rate).`);
    if (passed !== total) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test execution error:', err.message);
    process.exit(1);
  }
}

runTests();
