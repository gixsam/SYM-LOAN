/**
 * public/js/stitchIcons.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Google Stitch Custom Vector Icon & Emoji Engine
 * 
 * High-definition, dual-tone vector SVG icons designed with the Google Stitch aesthetic:
 * - Soft rounded caps (stroke-linecap="round", stroke-linejoin="round")
 * - Micro-stroke borders (1.5px - 2px)
 * - Layered dual-tone translucent fills
 * - Standardized 20x20 and 24x24 viewBoxes
 * - Zero OS emoji dependency (consistent across Android, iOS, Windows, macOS)
 */

(function (root, factory) {
  const instance = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = instance;
  }
  if (typeof window !== 'undefined') {
    window.StitchIcons = instance;
  }
  if (typeof root !== 'undefined') {
    root.StitchIcons = instance;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ICONS = {
    // 1. Voucher / PDF Document
    'voucher': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-voucher">
        <defs>
          <linearGradient id="st-vouch-grad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop stop-color="#F59E0B" stop-opacity="0.25"/>
            <stop stop-color="#D97706" stop-opacity="0.08"/>
          </linearGradient>
        </defs>
        <path d="M6 2C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2H6Z" fill="url(#st-vouch-grad)" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 2V8H20" stroke="#FBBF24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 13H16M8 17H13" stroke="#FDE68A" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="15.5" cy="16.5" r="2.5" fill="#F59E0B" stroke="#78350F" stroke-width="0.8"/>
      </svg>`,

    // 2. Limits / Settings
    'limits': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-limits">
        <circle cx="12" cy="12" r="3.5" fill="#3B82F6" fill-opacity="0.3" stroke="#60A5FA" stroke-width="1.8"/>
        <path d="M12 2V5M12 19V22M2 12H5M19 12H22M4.929 4.929L7.05 7.05M16.95 16.95L19.071 19.071M4.929 19.071L7.05 16.95M16.95 7.05L19.071 4.929" stroke="#93C5FD" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`,

    // 3. Cash Adjustment (+ / -)
    'cash-adjust': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-cash-adjust">
        <rect x="3" y="6" width="18" height="12" rx="3" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="1.8"/>
        <circle cx="12" cy="12" r="2.8" stroke="#34D399" stroke-width="1.6"/>
        <path d="M7 10V14M5 12H9" stroke="#6EE7B7" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M15 12H19" stroke="#F87171" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,

    // 4. Call / Phone
    'call': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-call">
        <path d="M5 4H9L11 9L8.5 10.5C9.57 12.67 11.33 14.43 13.5 15.5L15 13L20 15V19C20 20.1046 19.1046 21 18 21C9.71573 21 3 14.2843 3 6C3 4.89543 3.89543 4 5 4Z" fill="#06B6D4" fill-opacity="0.25" stroke="#22D3EE" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 4C17.6569 4 19 5.34315 19 7" stroke="#67E8F9" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M16 1C19.866 1 23 4.13401 23 8" stroke="#A5F3FC" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`,

    // 5. Calendar
    'calendar': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-calendar">
        <rect x="3" y="5" width="18" height="16" rx="3" fill="#6366F1" fill-opacity="0.2" stroke="#818CF8" stroke-width="1.8"/>
        <path d="M3 10H21" stroke="#A5B4FC" stroke-width="1.6"/>
        <path d="M8 2V6M16 2V6" stroke="#C7D2FE" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="8" cy="14" r="1.2" fill="#818CF8"/>
        <circle cx="12" cy="14" r="1.2" fill="#818CF8"/>
        <circle cx="16" cy="14" r="1.2" fill="#F59E0B"/>
        <circle cx="8" cy="18" r="1.2" fill="#818CF8"/>
        <circle cx="12" cy="18" r="1.2" fill="#818CF8"/>
      </svg>`,

    // 6. Edit / Pen Nib
    'edit': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-edit">
        <path d="M12 20H21" stroke="#C084FC" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" fill="#A855F7" fill-opacity="0.2" stroke="#A855F7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    // 7. Delete / Trash
    'delete': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-delete">
        <path d="M4 7H20M10 11V17M14 11V17M5 7L6 19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19L19 7" fill="#EF4444" fill-opacity="0.15" stroke="#F87171" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke="#FCA5A5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    // 8. Strikes: Safe (0/3), Warning (1/3), Critical (2/3), Blocked (3/3)
    'strike-safe': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-strike-safe">
        <path d="M12 2L4 5V11C4 16.52 7.42 20.94 12 22C16.58 20.94 20 16.52 20 11V5L12 2Z" fill="#10B981" fill-opacity="0.25" stroke="#10B981" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M9 12L11 14L15 10" stroke="#34D399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    'strike-warning': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-strike-warning">
        <path d="M12 3L2 20H22L12 3Z" fill="#F59E0B" fill-opacity="0.25" stroke="#F59E0B" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M12 9V14" stroke="#FDE68A" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1.2" fill="#FDE68A"/>
      </svg>`,

    'strike-critical': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-strike-critical">
        <path d="M12 2C8.5 7.5 16 11 12 18C17 17 19 13 18 10C17 7 15 5 12 2Z" fill="#F97316" fill-opacity="0.25" stroke="#FB923C" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M9 10C6 14 8 18 12 21C8 20 6 16 9 10Z" fill="#F97316" stroke="#FDBA74" stroke-width="1.2"/>
      </svg>`,

    'strike-blocked': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-strike-blocked">
        <circle cx="12" cy="12" r="9" fill="#EF4444" fill-opacity="0.25" stroke="#EF4444" stroke-width="1.8"/>
        <path d="M6 6L18 18" stroke="#F87171" stroke-width="2" stroke-linecap="round"/>
      </svg>`,

    // 9. Payment Methods: bKash, Nagad, Cash
    'bkash': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-bkash">
        <rect x="2" y="3" width="20" height="18" rx="4" fill="#E2136E" fill-opacity="0.2" stroke="#E2136E" stroke-width="1.8"/>
        <path d="M7 7L13 12L7 17V7Z" fill="#E2136E"/>
        <path d="M13 12L17 8M13 12L17 16" stroke="#F472B6" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`,

    'nagad': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-nagad">
        <rect x="2" y="3" width="20" height="18" rx="4" fill="#F97316" fill-opacity="0.2" stroke="#EA580C" stroke-width="1.8"/>
        <circle cx="12" cy="12" r="5" fill="#F97316" stroke="#FFEDD5" stroke-width="1.4"/>
        <path d="M10 12L12 14L15 10" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,

    'cash': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-cash">
        <rect x="2" y="5" width="20" height="14" rx="3" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="1.8"/>
        <circle cx="12" cy="12" r="3" fill="#34D399" fill-opacity="0.4" stroke="#6EE7B7" stroke-width="1.5"/>
        <path d="M5 8V8.01M19 16V16.01" stroke="#A7F3D0" stroke-width="2" stroke-linecap="round"/>
      </svg>`,

    // 10. Clock / Ticker
    'clock': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-clock">
        <circle cx="12" cy="12" r="9" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-width="1.8"/>
        <path d="M12 7V12L15 14" stroke="#FDE68A" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`,

    // 11. Notification Bell
    'bell': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-bell">
        <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" fill="#F59E0B" fill-opacity="0.2" stroke="#FBBF24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#FDE68A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    // 12. Stepper Checkmark (Success)
    'stepper-check': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-stepper-check">
        <circle cx="12" cy="12" r="10" fill="#10B981" fill-opacity="0.25" stroke="#10B981" stroke-width="2"/>
        <path d="M8 12.5L10.5 15L16 9.5" stroke="#34D399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    // 13. User Profile
    'user': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-user">
        <circle cx="12" cy="8" r="4" fill="#3B82F6" fill-opacity="0.25" stroke="#60A5FA" stroke-width="1.8"/>
        <path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20" stroke="#93C5FD" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`,

    // 14. Shield / Security
    'shield': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-shield">
        <path d="M12 2L3 6V11C3 16.5 6.8 21.7 12 23C17.2 21.7 21 16.5 21 11V6L12 2Z" fill="#6366F1" fill-opacity="0.2" stroke="#818CF8" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="12" cy="11" r="3" stroke="#A5B4FC" stroke-width="1.6"/>
      </svg>`,

    // 15. Bolt / Quick Action
    'bolt': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-bolt">
        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#F59E0B" fill-opacity="0.3" stroke="#FBBF24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    // 16. Download
    'download': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-download">
        <path d="M12 3V15M12 15L7 10M12 15L17 10" stroke="#34D399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 17V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>
      </svg>`,

    // 17. Refresh
    'refresh': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-refresh">
        <path d="M21 4V9H16M3 20V15H8" stroke="#22D3EE" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19.5 9A9 9 0 0 0 5.6 5.6L3 9M21 15L18.4 18.4A9 9 0 0 1 4.5 15" stroke="#06B6D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,

    // 18. Lock
    'lock': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-lock">
        <rect x="5" y="11" width="14" height="10" rx="3" fill="#F59E0B" fill-opacity="0.25" stroke="#F59E0B" stroke-width="1.8"/>
        <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#FBBF24" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`,

    // 19. Sparkle / VIP
    'vip': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-vip">
        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#F59E0B" fill-opacity="0.3" stroke="#FBBF24" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>`,

    // 20. Search
    'search': (s) => `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="stitch-icon stitch-search">
        <circle cx="11" cy="11" r="7" fill="#64748B" fill-opacity="0.15" stroke="#94A3B8" stroke-width="1.8"/>
        <path d="M16 16L21 21" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
      </svg>`
  };

  return {
    get: function (name, options = {}) {
      const size = options.size || 20;
      const fn = ICONS[name] || ICONS['bolt'];
      const rawSvg = fn(size).trim();
      if (options.className) {
        return rawSvg.replace('class="stitch-icon', `class="stitch-icon ${options.className}`);
      }
      return rawSvg;
    },

    render: function (name, options = {}) {
      const div = document.createElement('span');
      div.className = `stitch-icon-wrapper inline-flex items-center justify-center ${options.className || ''}`;
      div.innerHTML = this.get(name, options);
      return div;
    },

    has: function (name) {
      return Boolean(ICONS[name]);
    }
  };
});
