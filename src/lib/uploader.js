'use strict';
/**
 * src/lib/uploader.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Multipart Media & Asset Upload Engine
 *
 * Configures Multer storage for:
 *   1. Payment screenshot receipts (bKash / Nagad / Cash) → public/uploads/receipts/
 *   2. Client profile avatars & photos → public/uploads/avatars/
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const RECEIPTS_DIR = path.join(__dirname, '../../public/uploads/receipts');
const AVATARS_DIR  = path.join(__dirname, '../../public/uploads/avatars');
const BRANDING_DIR = path.join(__dirname, '../../public/uploads/branding');

[RECEIPTS_DIR, AVATARS_DIR, BRANDING_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Image MIME & extension validator
const imageFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const isExtOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const isMimeOk = allowed.test(file.mimetype);

  if (isExtOk && isMimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WebP) are permitted.'));
  }
};

// ─── 1. Receipt Storage ───────────────────────────────────────────────────────
const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RECEIPTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: imageFilter,
});

// ─── 2. Avatar Storage ────────────────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const clientId = req.params?.id || req.body?.client_id || 'client';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `avatar-${clientId.slice(0, 8)}-${uniqueSuffix}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: imageFilter,
});

// ─── 3. Brand & Platform Logo Storage (Unlimited Size) ────────────────────────
const brandingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, BRANDING_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  },
});

const uploadBrandLogo = multer({
  storage: brandingStorage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB unconstrained size limit
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg|ico/;
    const isExtOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const isMimeOk = file.mimetype.startsWith('image/');
    if (isExtOk || isMimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, SVG, WebP, GIF) are allowed for brand logos.'));
    }
  },
});

// ─── 4. KYC Documents Storage (NID Front/Back & Live Selfie) ──────────────────
const KYC_DIR = path.join(__dirname, '../../public/uploads/kyc');
if (!fs.existsSync(KYC_DIR)) {
  fs.mkdirSync(KYC_DIR, { recursive: true });
}

const kycStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, KYC_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const field = file.fieldname || 'doc';
    const clientId = (req.body?.client_id || req.params?.clientId || 'client').slice(0, 8);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `kyc-${field}-${clientId}-${uniqueSuffix}${ext}`);
  },
});

const uploadKycDocs = multer({
  storage: kycStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max per photo
  fileFilter: imageFilter,
});

module.exports = {
  uploadReceipt,
  uploadAvatar,
  uploadBrandLogo,
  uploadKycDocs,
  RECEIPTS_DIR,
  AVATARS_DIR,
  BRANDING_DIR,
  KYC_DIR,
  UPLOADS_DIR: RECEIPTS_DIR,
};
