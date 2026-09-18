# 🚀 Hostinger Cloud Production Deployment Guide
## SYM EMPIRE PLATFORM (S.E.P.) — SYM LOAN
### Production Domain: `https://symloan.best-travel.ltd`

This guide details the complete step-by-step procedure to deploy the **SYM LOAN** platform onto **Hostinger Cloud / Web Hosting** under the subdomain **`https://symloan.best-travel.ltd`**.

---

## 📋 Prerequisites
1. Access to your **Hostinger hPanel** ([hpanel.hostinger.com](https://hpanel.hostinger.com)).
2. Your primary domain **`best-travel.ltd`** active on Hostinger.
3. Your Telegram Bot **`@money_loan_bot`** with your private token from `@BotFather`.
4. Your Supabase project (`gypqeknsxfljdvmycylv`) credentials.

---

## 🌐 STEP 1: Create the Subdomain (`symloan.best-travel.ltd`)

1. Log into your **Hostinger hPanel**.
2. Navigate to **Websites** ➡️ Manage your site (`best-travel.ltd`).
3. In the left sidebar, click **Domains** ➡️ **Subdomains**.
4. In the **Create a Subdomain** section:
   * **Subdomain name:** `symloan`
   * **Custom folder for subdomain:** Check the box and set folder to:
     `public_html/symloan`
   * Click **Create**.
5. **DNS Verification:**
   * Go to **DNS / Nameservers** in hPanel.
   * Ensure there is an `A` or `CNAME` record for `symloan`:
     * Type: `A` | Name: `symloan` | Points to: `[Your Hostinger Server IP]`
     * Or Type: `CNAME` | Name: `symloan` | Target: `best-travel.ltd`

---

## 🔒 STEP 2: Activate Free SSL Certificate

1. In hPanel, navigate to **Security** ➡️ **SSL**.
2. Locate `symloan.best-travel.ltd`.
3. Click **Install SSL** (Let's Encrypt - Free).
4. Toggle **Enforce HTTPS** to **ON**.
5. Once installed, verify by visiting `https://symloan.best-travel.ltd` in your browser.

---

## ⚙️ STEP 3: Setup Node.js Application in Hostinger

1. In hPanel left sidebar, search for **Node.js** (under **Advanced** or **Web Development**).
2. Click **Create Application**:
   * **Node.js version:** Select **`v20.x`** or **`v22.x`** (LTS).
   * **Application root:** `public_html/symloan`
   * **Application startup file:** `server.js`
   * **Application URL:** Select `symloan.best-travel.ltd`
   * **Application mode:** `Production`
3. Click **Create**.

---

## 📦 STEP 4: Upload Code & Install Dependencies

You have two convenient methods to deploy the code:

### Method A: Automated Zip Upload (Fastest — 2 Minutes)
1. On your local PC, run the automated deployment packager:
   ```bash
   npm run package
   ```
   This creates a clean, lightweight bundle:
   `D:\TECH\WEBSITE\SYM WEBZ\SYM LOAN\dist\hostinger_deploy.zip` (~435 KB).
2. Open Hostinger **File Manager** (`public_html/symloan`).
3. Click **Upload** ➡️ Select `hostinger_deploy.zip`.
4. Right-click `hostinger_deploy.zip` ➡️ Click **Extract** (into current folder).
5. Delete `hostinger_deploy.zip` after extracting.
6. Return to Hostinger **Node.js** manager and click **NPM Install**. Hostinger will install all production Linux dependencies automatically.

---

### Method B: Continuous Deployment via GitHub (Auto-Deploy on Push)
1. In Hostinger hPanel, search for **Git** (under **Advanced**).
2. Fill in:
   * **Repository:** `https://github.com/gixsam/SYM-LOAN.git`
   * **Branch:** `main`
   * **Install directory:** `public_html/symloan`
3. Click **Create**.
4. Copy the **Webhook URL** provided by Hostinger.
5. In your GitHub repository (`https://github.com/gixsam/SYM-LOAN/settings/hooks`):
   * Click **Add webhook**.
   * Paste the Hostinger Webhook URL.
   * Content type: `application/json`.
   * Click **Add webhook**.
6. Every time you push to `main`, Hostinger will automatically pull the updated code!

---

## 🔐 STEP 5: Configure Production Environment (`.env`)

1. In Hostinger **File Manager**, navigate to `public_html/symloan`.
2. Create or edit the file named **`.env`** (you can use `.env.production.example` as a template).
3. Insert your production environment variables:

```env
# Server Runtime
PORT=5000
NODE_ENV=production
ROUTING_ENDPOINT_DOMAIN=https://symloan.best-travel.ltd
MASTER_SYSTEM_IDENTITY="SYM EMPIRE" PLATFORM (S.E.P.)

# Telegram Production Webhook
USE_WEBHOOK=true
TELEGRAM_BOT_TOKEN=your_private_bot_token_here
TELEGRAM_BOT_USERNAME=money_loan_bot

# Supabase Cloud Database (Instance: SYM-LOAN / gypqeknsxfljdvmycylv)
SUPABASE_URL=https://gypqeknsxfljdvmycylv.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Supabase Direct PostgreSQL Connection (AWS ap-northeast-2)
DB_HOST=db.gypqeknsxfljdvmycylv.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres

# Email Service (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=zillionprince6@gmail.com
SMTP_PASS=your_email_or_app_password

# Admin Security & Master Credentials
ADMIN_MASTER_PASSWORD=admin
ADMIN_AUTHORIZED_PHONE=01612669922
ADMIN_AUTHORIZED_EMAIL=zillionprince6@gmail.com
```
4. Save the file.

---

## 🚀 STEP 6: Start Application & Verify Webhook

1. In Hostinger **Node.js** manager, click **Restart** (or **Start Application**).
2. Verify status shows **Running** (green indicator).
3. **Test the Live Endpoints in your Browser:**
   * **Health Check:** `https://symloan.best-travel.ltd/api/health`
   * **Client Portal:** `https://symloan.best-travel.ltd`
   * **Executive Admin Panel:** `https://symloan.best-travel.ltd/admin`
4. **Verify Telegram Webhook Registration:**
   * Open your browser and navigate to:
     ```
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
     ```
   * You should see:
     ```json
     {
       "ok": true,
       "result": {
         "url": "https://symloan.best-travel.ltd/api/bot/webhook",
         "has_custom_certificate": false,
         "pending_update_count": 0
       }
     }
     ```
5. **Test the Bot in Telegram:**
   * Open `@money_loan_bot` on Telegram and send `/start`.
   * The bot will respond immediately via the Hostinger cloud webhook!

---

## 🛡️ Troubleshooting & Maintenance

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **503 Service Unavailable** | Node.js app is stopped or crashed | Check Hostinger Node.js error log in hPanel; ensure `server.js` is set as the startup file and run `npm install`. |
| **Telegram Bot not responding** | Webhook URL mismatch or missing SSL | Check `getWebhookInfo` API; ensure `https://symloan.best-travel.ltd` has a valid SSL certificate and `USE_WEBHOOK=true`. |
| **File uploads failing** | Directory permissions | Ensure `public/uploads/` and subdirectories (`kyc/`, `avatars/`, `receipts/`, `branding/`) have write permissions (`755` or `775`). |
| **Mobile Only Notice on PC** | Mobile middleware active | Open developer tools (`F12`) and toggle device emulation (Phone mode) or open on a real smartphone. Admin panel `/admin` is exempt. |
