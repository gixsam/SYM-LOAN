# NOTE.md - TRANSACTION APPLICATION SPECIFICATION & WORKFLOW LOG

## 📌 Project Context & Structural Constraints
*   **Master System Identity:** 'SYM EMPIRE' PLATFORM (S.E.P.)
*   **Routing Endpoint Domain:** https://symloan.best-travel.ltd
*   **Version Control Repository:** GitHub Workspace (GIXSAM/SAM-LOAN).
*   **Database Cloud Tenant:** Supabase Instance (`SYM-LOAN` / `gypqeknsxfljdvmycylv`)
*   **Database Host:** `db.gypqeknsxfljdvmycylv.supabase.co` (Region: `ap-northeast-2`)

## 🚀 Logged System Updates

### Update-035 (Database Connection & Schema Ingestion Verified)
*   **[COMPLETED]** Established live backend connection to Supabase tenant `gypqeknsxfljdvmycylv`.
*   **[COMPLETED]** Configured protected local `.env` and `.gitignore` with direct keys (`sb_publishable_...`, `sb_secret_...`).
*   **[COMPLETED]** Verified and documented 6 core database tables & enums in `supabase/schema.sql`:
    *   `client_profiles` (status: `ACTIVE`, `FRAUD`, `USELESS CLIENT`, `BLOCKED`, strikes count, historical ledger reference)
    *   `money_requests` (status: `PENDING`, `ACCEPTED`, `DECLINED`, amount, deadline, client reference)
    *   `daily_expense_items` (budget limit, item name, total price)
    *   `expense_splits` (split share price, loan transfer flag, client reference)
    *   `historical_ledgers` (historical balance, tag)
    *   `system_budgets` (timeframe type, budget value)

### Update-034 (STEP 2: Backend Core App Engine Committed)
*   **[COMPLETED]** Created package configurations and environment parameters mapping the live token `8846454332:AAGl0VAri...`.
*   **[COMPLETED]** Implemented the `verifyMobileDeviceOnly` browser-filtering security middleware.
*   **[COMPLETED]** Engineered the `@money_loan_bot` private contact extraction script parsing cryptographic phone sharing tokens.
*   **[COMPLETED]** Deployed the morning cron engine task scheduler automated to check deadlines and log user profile strikes daily at 01:00 PM.
