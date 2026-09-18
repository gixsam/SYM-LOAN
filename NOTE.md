# 📋 SYM EMPIRE PLATFORM (S.E.P.) — SYM LOAN
## Master Project Note, Architecture & Changelog (`NOTE.md`)

> **Project Name:** SYM EMPIRE PLATFORM (S.E.P.) - SYM LOAN  
> **Master System Identity:** 'SYM EMPIRE' PLATFORM (S.E.P.)  
> **Production Domain:** [`https://symloan.best-travel.ltd`](https://symloan.best-travel.ltd)  
> **Target Server Host:** Hostinger Cloud / Node.js Engine (`public_html/` for `symloan.best-travel.ltd`)  
> **Local Project Root:** `D:\TECH\WEBSITE\SYM WEBZ\SYM LOAN\`  
> **Google Drive Workplace:** `G:\My Drive\ALL WEBSITE WORKPLACE\SYM LOAN WORKPLACE\`  
> **GitHub Repository:** [`https://github.com/gixsam/SYM-LOAN`](https://github.com/gixsam/SYM-LOAN)  
> **Database Cloud Tenant:** Supabase Instance (`SYM-LOAN` / `gypqeknsxfljdvmycylv` in AWS `ap-northeast-2`)  
> **Database Direct Host:** `db.gypqeknsxfljdvmycylv.supabase.co`  
> **Telegram Bot:** `@money_loan_bot` (Live Token: `8846454332:AAGl0VAri-CNPRcDCAjJvsHOcA00BJo6hhI`)  
> **Technology Stack:** Node.js, Express, Supabase (PostgreSQL), node-telegram-bot-api, node-cron, CORS, Helmet, dotenv, HTML5, Tailwind CSS, FontAwesome 6  
> **Live Local Server:** `http://localhost:5000` (Client: `/`, Admin: `/admin`)  
> **Last Synchronized:** 2026-09-18 09:58 Local Time  

---

## 🚀 Logged System Updates & Changelog

### [Update-040] — STEP 3 Completed: Premium Mobile Web Portal & Executive Admin Limits Engine (2026-09-18)
**Type:** Major Frontend Engineering, Dynamic Admin Controls & Validation Security  
**Status:** ✅ COMPLETED & FULLY VERIFIED  

#### User Request & Objectives:
1. Deliver **STEP 3**: Build a professional, premium, high-contrast mobile web application for [`https://symloan.best-travel.ltd`](https://symloan.best-travel.ltd).
2. Implement **Dynamic Deadline Duration**: Admin can adjust allowed start duration to finish duration anytime for anyone. Clients must choose deadlines strictly within this admin-governed duration window.
3. Implement **Dynamic Money Request Limits**: Admin can change Minimum and Maximum money request amounts anytime for anyone. Clients must submit loan requests strictly between these bounds.

#### Architectural Execution & Accomplishments:

1. **Dynamic Loan Limits Engine (`src/lib/loanSettings.js`):**
   * Built persistent settings engine managing global system boundaries and per-client tailored overrides.
   * Calculates dynamic calendar dates (`min_date` = today + min_days, `max_date` = today + max_days).
   * Implemented `validateLoanRequest(clientId, amount, deadlineDate)` enforcing strict bounds before any database insertion.

2. **Executive Admin API Suite (`src/routes/adminApi.js`):**
   * `GET /api/admin/settings` — Retrieves global boundaries and all client override configurations.
   * `POST /api/admin/settings/global` — Updates global min/max amounts and start/finish duration days anytime.
   * `POST /api/admin/settings/client/:id` — Tailors custom loan limits and duration windows for specific clients.
   * `DELETE /api/admin/settings/client/:id` — Resets client overrides back to global boundaries.
   * `GET /api/admin/clients` — Client directory with real-time active limits and strike counters.
   * `GET /api/admin/loans` — Master loan applications inbox.
   * `POST /api/admin/loans/:id/decision` — One-click loan review decisions (`ACCEPTED` / `DECLINED`).
   * Protected with `x-admin-key` header (`SEP_ADMIN_2026`), allowing admin access from desktop and mobile alike.

3. **Client API & Validation Upgrades (`src/routes/api.js`):**
   * `GET /api/config/limits` — Public/client endpoint returning active min/max boundaries and calculated calendar dates.
   * `GET /api/clients/lookup/phone` — Looks up client profile and active limits by verified Telegram phone number.
   * `POST /api/loans` — Strictly enforces admin constraints. Returns `400 Bad Request` if amount is below min or above max, or if deadline date falls outside the admin duration window.
   * Blocks clients with `status === 'BLOCKED'`.

4. **Premium High-Contrast Mobile Web App (`public/index.html`, `public/js/app.js`, `public/css/style.css`):**
   * **Visual Aesthetic:** Obsidian dark canvas (`#070b14`), glowing gold (`#f59e0b`), emerald (`#10b981`), and deep indigo glassmorphic cards.
   * **Header & Identity Banner:** Verified client badge, active status pill, live strike meter (3 dots: green/red).
   * **Admin-Governed Form:**
     * Displays active admin limits banner with dates and days range.
     * Interactive amount range slider synchronized with number input.
     * Smart date picker automatically locked between `min_date` and `max_date`.
     * Live duration calculation badge displaying selected duration days.
     * Instant submission with error feedback and success animations.
   * **Live Loan Ledger:** Displays active loans, status pills (`PENDING`, `ACCEPTED`, `DECLINED`), and overdue warning alerts.
   * **Telegram Bridge:** Quick action button to launch `@money_loan_bot`.

5. **Executive Admin Dashboard (`public/admin.html`, `public/js/admin.js`):**
   * Real-time KPI cards: Loan Applications count, Registered Clients count, Daily Strike Scheduler status.
   * Instant Global Boundaries editor (Min/Max Amount, Min/Max Days).
   * Per-Client Custom Overrides manager with client selector.
   * Loan Review Inbox with one-click **Accept** / **Decline** actions.
   * Client Accounts & Strike Register with one-click strike reset.

#### Verification & Test Matrix:
* `GET /api/config/limits` ➜ Returned active boundaries and auto-calculated dates (`min_date: 2026-09-23`, `max_date: 2026-11-02`).
* Under Min Amount Test (৳500 vs ৳1,000 min) ➜ Intercepted with `400 Bad Request`.
* Over Max Amount Test (৳50,000 vs ৳30,000 max) ➜ Intercepted with `400 Bad Request`.
* Out-of-bounds Deadline Test (Tomorrow vs 5 days min) ➜ Intercepted with `400 Bad Request`.
* Valid Loan Test (৳5,000 for GIXSAM) ➜ Success `201 Created` (`d7fd28a1`).
* Admin Loan Approval Test ➜ Success `200 OK` (Status updated to `ACCEPTED`).
* Static Web Serving ➜ `http://localhost:5000/` (200 OK) & `http://localhost:5000/admin` (200 OK).

---

### [Update-039] — First Live Mobile Client Profile Registered in Production Database (2026-09-18)
**Type:** End-to-End System Validation & Live User Onboarding  
**Status:** ✅ COMPLETED & VERIFIED IN LIVE DATABASE  
* Client `GIXSAM` (`+8801612669922`, TG ID: `6464983314`, ID: `e84ecb25-5fa1-42fb-ab04-8e3c5112a69b`) registered in Supabase `auth.users` and `client_profiles`.

---

### [Update-038] — Supabase Auth Identity Linking & Foreign Key Resolution for Contact Registration (2026-09-18)
**Type:** Database Constraint Resolution, Supabase Auth Integration & Registration Fix  
**Status:** ✅ COMPLETED & VERIFIED LIVE  

---

### [Update-037] — Telegram Bot Telegram API v1+ Polling Calibration & UI Verification (2026-09-18)
**Type:** Telegram Bot Bugfix, Interactive Keyboard Fix & HTML Entity Calibration  
**Status:** ✅ COMPLETED & VERIFIED LIVE  

---

### [Update-036] — Full Backend Core Engine & Live Telegram Bot Activated (2026-09-18)
**Type:** Core Backend Implementation, Security Gate & Automation  
**Status:** ✅ COMPLETED & VERIFIED LIVE  

---

### [Update-035] — Live Database Authentication & Live Schema Mapping (2026-09-18)
**Type:** Database Integration, Credentials Management & Version Control  
**Status:** ✅ COMPLETED  

---

### [Update-034] — Project Specification & Blueprint Initialization (2026-09-18)
**Type:** Architectural Specification & Initial Commit  
**Status:** ✅ COMPLETED  

---

## 🔮 Future Updating Plan & Technical Roadmap

### [Phase 4 / STEP 4] — Expense Tracking & Ledger Cost Split Engine
* Daily expense recording interface (`daily_expense_items`) for business overheads and loan allocations.
* Automated cost split engine (`expense_splits`) linking expense items directly to client loan profiles.
* Budget tracking against daily/monthly caps (`system_budgets`).

### [Phase 5 / STEP 5] — Production Deployment & Domain Routing (`https://symloan.best-travel.ltd`)
* Automated deployment package for Hostinger Cloud (`public_html/` on `symloan.best-travel.ltd`).
* SSL / Cloudflare Tunnel routing configuration.
* Telegram Bot Webhook setup (`/api/bot/webhook`) replacing local polling for production high concurrency.
* GitHub Actions CI/CD automation pipeline.
