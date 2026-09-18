'use strict';
/**
 * src/lib/uploader.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Payment Receipt Upload Handler
 *
 * Configures Multer storage for payment screenshot receipts (bKash / Nagad / Cash).
 * Files are stored in public/uploads/receipts/ and served statically.
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../public/uploads/receipts');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const isExtOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const isMimeOk = allowed.test(file.mimetype);

  if (isExtOk && isMimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WebP) are allowed for payment receipts.'));
  }
};

const uploadReceipt = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter,
});

module.exports = { uploadReceipt, UPLOADS_DIR };
