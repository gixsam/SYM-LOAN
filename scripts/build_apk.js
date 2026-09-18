/**
 * SYM LOAN — Native Android APK Builder
 * Compiles and packages SYM-LOAN.apk using Android SDK Build Tools & JDK
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT_DIR, 'android');
const BUILD_DIR = path.join(ANDROID_DIR, 'build');
const GEN_DIR = path.join(BUILD_DIR, 'gen');
const OBJ_DIR = path.join(BUILD_DIR, 'obj');
const BIN_DIR = path.join(BUILD_DIR, 'bin');
const KEYSTORE_DIR = path.join(ANDROID_DIR, 'keystore');
const KEYSTORE_PATH = path.join(KEYSTORE_DIR, 'symloan-release.keystore');
const KEY_PASS = 'SymLoan2026Secure!';
const KEY_ALIAS = 'symloan';

const ANDROID_SDK = process.env.ANDROID_HOME || 'C:\\Users\\pc\\AppData\\Local\\Android\\Sdk';
const BUILD_TOOLS = path.join(ANDROID_SDK, 'build-tools', '34.0.0');
const ANDROID_JAR = path.join(ANDROID_SDK, 'platforms', 'android-34', 'android.jar');

const AAPT = path.join(BUILD_TOOLS, 'aapt.exe');
const D8 = path.join(BUILD_TOOLS, 'd8.bat');
const ZIPALIGN = path.join(BUILD_TOOLS, 'zipalign.exe');
const APKSIGNER = path.join(BUILD_TOOLS, 'apksigner.bat');

const TARGET_APK_OUTPUT = path.join(ROOT_DIR, 'public', 'downloads', 'SYM-LOAN.apk');

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function buildApk() {
  console.log('====================================================');
  console.log('🚀 SYM LOAN: Native Android APK Build Pipeline');
  console.log('====================================================\n');

  // Verify SDK Prerequisites
  if (!fs.existsSync(ANDROID_JAR)) {
    throw new Error(`android.jar not found at ${ANDROID_JAR}`);
  }
  if (!fs.existsSync(AAPT)) {
    throw new Error(`aapt not found at ${AAPT}`);
  }

  // 1. Ensure clean directories
  [GEN_DIR, OBJ_DIR, BIN_DIR].forEach(dir => {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  });
  [BUILD_DIR, KEYSTORE_DIR, path.dirname(TARGET_APK_OUTPUT)].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // 2. Generate Keystore if not exists
  if (!fs.existsSync(KEYSTORE_PATH)) {
    console.log('\n🔐 Step 1: Generating Release Signing Keystore...');
    const dname = 'CN=SYM LOAN, OU=SYM EMPIRE, O=SYM EMPIRE PLATFORM, L=Dhaka, ST=Dhaka, C=BD';
    run(`keytool -genkeypair -v -keystore "${KEYSTORE_PATH}" -alias ${KEY_ALIAS} -keyalg RSA -keysize 2048 -validity 10000 -storepass "${KEY_PASS}" -keypass "${KEY_PASS}" -dname "${dname}"`);
  } else {
    console.log('\n🔐 Step 1: Using existing Release Signing Keystore.');
  }

  // 3. Generate R.java
  console.log('\n📦 Step 2: Generating R.java from AndroidManifest.xml and res/...');
  const manifestPath = path.join(ANDROID_DIR, 'AndroidManifest.xml');
  const resPath = path.join(ANDROID_DIR, 'res');
  run(`"${AAPT}" package -f -m -J "${GEN_DIR}" -M "${manifestPath}" -S "${resPath}" -I "${ANDROID_JAR}"`);

  // 4. Compile Java Source Files
  console.log('\n☕ Step 3: Compiling Java Sources with javac (release 8)...');
  const srcFiles = [
    path.join(ANDROID_DIR, 'src', 'com', 'symempire', 'symloan', 'MainActivity.java'),
    path.join(GEN_DIR, 'com', 'symempire', 'symloan', 'R.java')
  ];
  run(`javac -encoding UTF-8 -cp "${ANDROID_JAR}" --release 8 -d "${OBJ_DIR}" "${srcFiles.join('" "')}"`);

  // 5. Convert compiled .class files to classes.dex with d8
  console.log('\n⚡ Step 4: Translating Bytecode to Android classes.dex with d8...');
  const objClassDir = path.join(OBJ_DIR, 'com', 'symempire', 'symloan');
  const classFiles = fs.readdirSync(objClassDir)
    .filter(f => f.endsWith('.class'))
    .map(f => `"${path.join(objClassDir, f)}"`)
    .join(' ');
  run(`"${D8}" --release --output "${BIN_DIR}" --lib "${ANDROID_JAR}" ${classFiles}`);

  const dexPath = path.join(BIN_DIR, 'classes.dex');
  if (!fs.existsSync(dexPath)) {
    throw new Error('classes.dex was not generated.');
  }

  // 6. Package resources into unaligned APK
  console.log('\n📦 Step 5: Packaging resources into base APK...');
  const unalignedApk = path.join(BIN_DIR, 'unaligned.apk');
  if (fs.existsSync(unalignedApk)) fs.unlinkSync(unalignedApk);
  run(`"${AAPT}" package -f -M "${manifestPath}" -S "${resPath}" -I "${ANDROID_JAR}" -F "${unalignedApk}"`);

  // 7. Add classes.dex into unaligned.apk
  console.log('\n➕ Step 6: Adding classes.dex to APK package...');
  run(`"${AAPT}" add "${unalignedApk}" classes.dex`, { cwd: BIN_DIR });

  // 8. Align APK with zipalign
  console.log('\n📐 Step 7: Optimizing & 4-byte Aligning APK with zipalign...');
  const alignedApk = path.join(BIN_DIR, 'aligned.apk');
  if (fs.existsSync(alignedApk)) fs.unlinkSync(alignedApk);
  run(`"${ZIPALIGN}" -f -p 4 "${unalignedApk}" "${alignedApk}"`);

  // 9. Sign APK with apksigner (v1 + v2 + v3 schemes)
  console.log('\n✍️ Step 8: Cryptographically Signing APK with apksigner...');
  const signedApk = path.join(BIN_DIR, 'SYM-LOAN.apk');
  if (fs.existsSync(signedApk)) fs.unlinkSync(signedApk);
  run(`"${APKSIGNER}" sign --ks "${KEYSTORE_PATH}" --ks-key-alias ${KEY_ALIAS} --ks-pass "pass:${KEY_PASS}" --key-pass "pass:${KEY_PASS}" --out "${signedApk}" "${alignedApk}"`);

  // 10. Verify APK Signature
  console.log('\n🛡️ Step 9: Verifying APK Signature Schemes...');
  run(`"${APKSIGNER}" verify --verbose "${signedApk}"`);

  // 11. Copy to public/downloads/
  fs.copyFileSync(signedApk, TARGET_APK_OUTPUT);
  const stats = fs.statSync(TARGET_APK_OUTPUT);
  console.log('\n====================================================');
  console.log('✅ BUILD SUCCESS!');
  console.log(`📦 Artifact: ${TARGET_APK_OUTPUT}`);
  console.log(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bytes)`);
  console.log('====================================================\n');
}

try {
  buildApk();
} catch (err) {
  console.error('\n❌ Build Failed:', err.message);
  process.exit(1);
}
