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
> **Technology Stack:** Node.js, Express, Supabase (PostgreSQL), node-telegram-bot-api, node-cron, CORS, Helmet, dotenv, HTML5, Tailwind CSS  
> **Live Local Server:** `http://localhost:5000`  
> **Last Synchronized:** 2026-09-18 09:30 Local Time  

---

## 🚀 Logged System Updates & Changelog

### [Update-036] — Full Backend Core Engine & Live Telegram Bot Activated (2026-09-18)
**Type:** Core Backend Implementation, Security Gate & Automation  
**Status:** ✅ COMPLETED & VERIFIED LIVE  

#### Summary of Accomplishments:
1. **Express Server Architecture (`server.js` & `src/app.js`):**
   * Configured security headers using `helmet`.
   * Enforced CORS restrictions for `https://symloan.best-travel.ltd` and local development origins.
   * Built structured request logging with timestamp and user-agent monitoring.
2. **Mobile Device Security Middleware (`src/middleware/verifyMobileDeviceOnly.js`):**
   * Implemented strict user-agent browser filtering.
   * Desktop browsers requesting protected endpoints receive a `403 Forbidden` JSON response (`MOBILE_ONLY`).
   * Validated live: Desktop UA blocked with 403; Android/Mobile UA granted 200 OK access.
3. **Dual-Layer Supabase Client Factory (`src/lib/supabase.js`):**
   * Configured `supabase` client for anon key operations.
   * Configured `supabaseAdmin` client utilizing `service_role` secret key to bypass RLS for server-side operations.
4. **Live Telegram Bot Engine (`src/bot/index.js`):**
   * Activated live polling for `@money_loan_bot` using token `8846454332:AAGl0VAri-CNPRcDCAjJvsHOcA00BJo6hhI`.
   * Built cryptographic contact token sharing parser: extracting verified phone numbers and upserting user profiles into `client_profiles`.
   * Implemented commands:
     * `/start` — Welcome prompt with interactive phone number sharing keyboard.
     * `/status` — Displays active status, strikes count, and loan request history.
     * `/request <amount>` — Interactive loan application initiation.
     * `/help` — Command directory and guidance.
5. **Morning Deadline & Strike Scheduler (`src/cron/deadlineStrikeEngine.js`):**
   * Configured `node-cron` schedule running daily at **13:00 BDT (07:00 UTC)** (`0 7 * * *`).
   * Queries overdue `ACCEPTED` money requests (`deadline_date < TODAY`).
   * Automatically increments client strikes (`strikes_count += 1`).
   * Blocks clients reaching 3 strikes (`status = 'BLOCKED'`).
   * Records audit trail notes in both `client_profiles.admin_note` and `money_requests.admin_note`.
6. **REST API Suite (`src/routes/api.js`):**
   * `GET /api/health` — System status, platform identity, and uptime monitor.
   * `GET /api/clients` & `GET /api/clients/:id` — Client profile retrieval with associated loan histories.
   * `GET /api/loans` & `POST /api/loans` — Loan applications query and submission.
   * `PATCH /api/loans/:id/status` — Admin approval and status workflow.
   * `GET /api/budgets` — System budget allocations.
   * `POST /api/cron/trigger` — Manual administrative strike test trigger.

---

### [Update-035] — Live Database Authentication & Live Schema Mapping (2026-09-18)
**Type:** Database Integration, Credentials Management & Version Control  
**Status:** ✅ COMPLETED  

#### Summary of Accomplishments:
1. Connected directly to Supabase cloud instance `gypqeknsxfljdvmycylv.supabase.co`.
2. Secured credentials inside `.env` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DB_HOST`).
3. Created `.gitignore` to prevent credential exposure in Git version control.
4. Documented and versioned the 6 core database tables in `supabase/schema.sql`:
   * `client_profiles` (status: `ACTIVE`, `FRAUD`, `USELESS CLIENT`, `BLOCKED`, `strikes_count`, FK to `historical_ledgers`)
   * `money_requests` (status: `PENDING`, `ACCEPTED`, `DECLINED`, `amount`, `deadline_date`, FK to `client_profiles`)
   * `daily_expense_items` (`item_name`, `total_price`, `budget_limit_at_creation`)
   * `expense_splits` (`person_name`, `split_share_price`, `is_loan_transfer`, FK to `daily_expense_items`, FK to `client_profiles`)
   * `historical_ledgers` (`old_name`, `historical_balance`, `historical_tag`)
   * `system_budgets` (`timeframe_type`, `budget_value`)

---

### [Update-034] — Project Specification & Blueprint Initialization (2026-09-18)
**Type:** Architectural Specification & Initial Commit  
**Status:** ✅ COMPLETED  

#### Summary of Accomplishments:
1. Formalized Master System Identity as **'SYM EMPIRE' PLATFORM (S.E.P.)**.
2. Designated production routing endpoint domain: `https://symloan.best-travel.ltd`.
3. Linked workspace to GitHub repository `gixsam/SYM-LOAN`.
4. Defined core technical constraints: Telegram bot integration, mobile-only browser restriction, daily 1:00 PM strike cron task.

---

## 🔮 Future Updating Plan & Technical Roadmap

### [Phase 3 / STEP 3] — High-Contrast Mobile Web Interface
* **Design Language:** High-contrast mobile-first dashboard (Tailwind CSS, FontAwesome 6, emerald/indigo accents).
* **Identity Verification Flow:** Mobile client authentication integrating Telegram phone sharing or quick OTP token.
* **Client Dashboard:**
  * Active loan status card with overdue warning indicators and countdown timer.
  * Strike alert banner displaying current strike count (1/3, 2/3) and penalty consequences.
  * Direct loan application submission form (`POST /api/loans`).
  * Repayment schedule and ledger history viewer.

### [Phase 4 / STEP 4] — Executive Administration & Decision Engine
* **Admin Portal:** Protected administrative portal for loan officers.
* **Loan Review Workflow:** One-click approval (`ACCEPTED`) or rejection (`DECLINED`) with admin notes.
* **Expense Management:** Interface to record daily expenses (`daily_expense_items`) and calculate automated cost splits (`expense_splits`).
* **Profile Management:** Client status override controls (`ACTIVE`, `FRAUD`, `USELESS CLIENT`, `BLOCKED`) and manual strike clearing.

### [Phase 5 / STEP 5] — Production Deployment & Domain Infrastructure
* **Hostinger Cloud Deployment:** Automated deployment to Hostinger web server (`public_html/` on `symloan.best-travel.ltd`).
* **Telegram Webhook Migration:** Transition from local polling to secure HTTPS webhook (`/api/bot/webhook`) behind the live SSL certificate.
* **Automated Cloud Backup & Dual-Drive Synchronization:** Keeping local workspace, GitHub, and Google Drive synchronized on every update.
