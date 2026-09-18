'use strict';
/**
 * src/middleware/verifyMobileDeviceOnly.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Mobile Device Filter Middleware
 *
 * Blocks all non-mobile browsers from accessing the SYM LOAN web app.
 * Only requests with a mobile User-Agent (Android, iPhone, iPod, BlackBerry,
 * IEMobile, Opera Mini) are allowed through.
 *
 * Behaviour:
 *   - Mobile device  → next()  (allowed)
 *   - Desktop/bot    → 403 JSON response with redirect hint
 */

const MOBILE_UA_PATTERN = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;

// Browsers/agents that look mobile but should be allowed in dev mode
const DEV_BYPASS_HEADER = 'x-sym-dev-bypass';

/**
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function verifyMobileDeviceOnly(req, res, next) {
  // Allow bypass in development for testing convenience
  if (process.env.NODE_ENV === 'development' && req.headers[DEV_BYPASS_HEADER] === 'true') {
    return next();
  }

  const userAgent = req.headers['user-agent'] || '';
  const isMobile  = MOBILE_UA_PATTERN.test(userAgent);

  if (!isMobile) {
    return res.status(403).json({
      success: false,
      code:    'MOBILE_ONLY',
      message: 'SYM LOAN is accessible on mobile devices only. Please open this link on your smartphone.',
    });
  }

  return next();
}

module.exports = verifyMobileDeviceOnly;
