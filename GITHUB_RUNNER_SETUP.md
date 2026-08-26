# 🚀 GitHub Self-Hosted Runner & Production Deployment Guide

This guide walks you through setting up the GitHub Self-Hosted Runner (`action-runner-dealsreg`) on the remote Windows Desktop (`192.168.15.12`) to enable automated CI/CD deployments whenever code is pushed to the `prod` branch.

---

## 🖥️ Server Details

| Property | Value |
|---|---|
| **Remote Host IP** | `192.168.15.12` |
| **Username** | `jesurena@ics.com.ph` |
| **Runner Path** | `C:\actions-runner` |
| **Runner Name** | `action-runner-dealsreg` |
| **Target App Path** | `C:\apps\deals-portal` |
| **Public URL** | `http://192.168.15.12:4000` |
| **Internal PM2 Port** | `http://127.0.0.1:4001` |

---

## 📥 Step 1: Connect to Remote Desktop (RDP)

1. Press `Win + R`, type `mstsc`, and press **Enter**.
2. In the Computer field, enter: `192.168.15.12`.
3. Click **Connect**.
4. Log in with your credentials:
   - **Username**: `jesurena@ics.com.ph`
   - **Password**: *(as provided)*

---

## ⚙️ Step 2: Install & Register the GitHub Runner (One-Click)

On the Remote Desktop (`192.168.15.12`):

1. Open **PowerShell as Administrator** (Right-click Windows Start > *Windows Terminal (Admin)* or *PowerShell (Admin)*).
2. Copy and paste the following automated setup script into PowerShell:

```powershell
# 1. Create runner directory
New-Item -ItemType Directory -Path "C:\actions-runner" -Force | Out-Null
Set-Location "C:\actions-runner"

# 2. Download runner v2.336.0
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri "https://github.com/actions/runner/releases/download/v2.336.0/actions-runner-win-x64-2.336.0.zip" -OutFile "actions-runner-win-x64-2.336.0.zip" -UseBasicParsing

# 3. Extract package
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD/actions-runner-win-x64-2.336.0.zip", "$PWD")

# 4. Configure runner unattended (as action-runner-dealsreg)
cmd.exe /c "config.cmd --url https://github.com/Integrated-Computer-System-Inc/deals-portal --token CKVSHBTUJJVJCCBFI45X2ADKRZU7U --name action-runner-dealsreg --labels action-runner-dealsreg,deals-portal,windows,production --work _work --unattended --replace"

# 5. Install and Start as 24/7 Windows Background Service
cmd.exe /c "svc.cmd install"
cmd.exe /c "svc.cmd start"
```

> [!NOTE]
> If the GitHub token `CKVSHBTUJJVJCCBFI45X2ADKRZU7U` has expired (tokens typically expire after 1 hour if unused), go to your GitHub repository:
> **Settings > Actions > Runners > New runner** and replace the token with the fresh token.

---

## 🔒 Step 3: Configure Production Environment on Server

1. On `192.168.15.12`, create the application folder if it doesn't already exist:
   ```powershell
   New-Item -ItemType Directory -Path "C:\apps\deals-portal\apps\deals" -Force | Out-Null
   ```
2. Create or place your `.env.local` file at `C:\apps\deals-portal\apps\deals\.env.local`:
   ```env
   NODE_ENV=production
   PORT=4001
   NEXTAUTH_URL="http://192.168.15.12:4000"
   NEXTAUTH_SECRET="your-secure-random-32-char-secret"
   GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
   DATABASE_URL="sqlserver://localhost:1433;database=DealsPortal;user=sa;password=YourPassword;encrypt=false;trustServerCertificate=true"
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="deals-notifications@ics.com.ph"
   SMTP_PASS="your-gmail-app-password"
   SMTP_FROM="ICS Deals Portal <deals-notifications@ics.com.ph>"
   CRON_SECRET="your-cron-secret-token"
   ```
> [!TIP]
> The automated CI/CD pipeline will **never overwrite** your `C:\apps\deals-portal\apps\deals\.env.local` file. Your database and OAuth credentials stay safely on the server.

---

## 🌐 Step 4: Hook into Existing NGINX

On `192.168.15.12`:

1. Open your main Nginx configuration file (e.g. `C:\nginx\conf\nginx.conf`).
2. Inside the `http { ... }` block, add:
   ```nginx
   include "C:/apps/deals-portal/nginx/deals-portal.conf";
   ```
3. Test and reload Nginx:
   ```powershell
   nginx -t
   nginx -s reload
   ```
4. Allow Port 4000 in Windows Firewall (PowerShell as Admin):
   ```powershell
   New-NetFirewallRule -DisplayName "Deals Portal Nginx (Port 4000)" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
   ```

---

## 🚢 Step 5: Triggering Automated Deployments

Whenever you are ready to deploy your changes to the remote server:

### Option A: Push to the `prod` branch
```bash
# Checkout or merge your latest changes into prod
git checkout prod
git merge dev
git push origin prod
```

### Option B: Manual Trigger via GitHub Actions UI
1. Go to your GitHub repository in your browser.
2. Click the **Actions** tab.
3. Click **Production Deployment (Windows Desktop Runner)** in the left sidebar.
4. Click **Run workflow** > Select branch `prod` > Click **Run workflow**.

The self-hosted runner will immediately:
1. Pull the new code.
2. Sync changes to `C:\apps\deals-portal`.
3. Install dependencies (`npm install`).
4. Generate the Prisma database client (`npm run db:generate`).
5. Compile the Next.js production build (`npm run build`).
6. Reload PM2 with zero downtime (`pm2 reload ecosystem.config.js`).
7. Perform an automatic health check to confirm the portal is live.

---

## 🛠️ Useful Management & Troubleshooting Commands

### Check Runner Service Status (on remote desktop)
```powershell
Get-Service "actions.runner.*"
```

### PM2 Commands (in `C:\apps\deals-portal`)
```powershell
# View running process status
pm2 status

# View live application logs
pm2 logs deals-portal

# Restart application manually
pm2 restart deals-portal
```
