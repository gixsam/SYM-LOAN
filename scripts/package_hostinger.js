'use strict';
/**
 * scripts/package_hostinger.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Hostinger Deployment Packager
 *
 * Generates a clean, production-ready hostinger_deploy.zip bundle
 * containing all runtime source code, assets, configurations, and templates,
 * strictly excluding node_modules, local secrets, and VCS history.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const STAGING_DIR = path.join(DIST_DIR, 'hostinger_staging');
const OUTPUT_ZIP = path.join(DIST_DIR, 'hostinger_deploy.zip');

console.log('📦 Starting Hostinger Deployment Packaging...');

// 1. Clean dist directory
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

// 2. Directories and files to include
const DIRS_TO_COPY = ['src', 'public', 'data'];
const FILES_TO_COPY = [
  'server.js',
  'package.json',
  '.htaccess',
  '.env.production.example',
  'HOSTINGER_DEPLOYMENT.md',
  'NOTE.md'
];

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

// Copy directories
DIRS_TO_COPY.forEach((dir) => {
  const srcPath = path.join(ROOT_DIR, dir);
  const destPath = path.join(STAGING_DIR, dir);
  if (fs.existsSync(srcPath)) {
    console.log(`  -> Copying directory: ${dir}/`);
    copyFolderSync(srcPath, destPath);
  }
});

// Copy individual files
FILES_TO_COPY.forEach((file) => {
  const srcPath = path.join(ROOT_DIR, file);
  const destPath = path.join(STAGING_DIR, file);
  if (fs.existsSync(srcPath)) {
    console.log(`  -> Copying file: ${file}`);
    fs.copyFileSync(srcPath, destPath);
  }
});

// 3. Compress into zip using native tar.exe
console.log('🗜️  Compressing into hostinger_deploy.zip...');
try {
  execSync(`tar.exe -a -c -f "${OUTPUT_ZIP}" -C "${STAGING_DIR}" .`, { stdio: 'inherit' });

  // Clean staging directory, leave zip
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });

  const stat = fs.statSync(OUTPUT_ZIP);
  const sizeKb = (stat.size / 1024).toFixed(1);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);

  console.log('');
  console.log('✅ Deployment package generated successfully!');
  console.log(`📁 Package Path : ${OUTPUT_ZIP}`);
  console.log(`📊 File Size    : ${sizeKb} KB (${sizeMb} MB)`);
  console.log('🚀 Ready for upload to Hostinger File Manager or Git deployment.');
} catch (err) {
  console.error('❌ Failed to create zip package:', err.message);
  process.exit(1);
}
