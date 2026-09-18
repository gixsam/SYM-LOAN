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

[RECEIPTS_DIR, AVATARS_DIR].forEach(dir => {
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

module.exports = {
  uploadReceipt,
  uploadAvatar,
  RECEIPTS_DIR,
  AVATARS_DIR,
  UPLOADS_DIR: RECEIPTS_DIR,
};
