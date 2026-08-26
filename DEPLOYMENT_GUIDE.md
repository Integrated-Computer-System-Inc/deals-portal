# Deals Registration Portal - Windows Remote Desktop Deployment Guide

This guide provides step-by-step instructions for deploying and running the **ICS Deals Registration Portal** on a Windows Remote Desktop / Windows Server alongside your existing web applications using **PM2** and **NGINX**.

---

## 🏛️ Architecture & Network Ports

| Component | Port | Address | Description |
|---|---|---|---|
| **Public / Intranet URL** | `4000` | `http://<server-ip>:4000` | External entry point served by Nginx |
| **Internal Next.js App** | `4001` | `http://127.0.0.1:4001` | Managed by PM2 |
| **Existing Web Apps** | `80` / other | `http://<server-ip>:80` | Unaffected, runs normally |
| **SQL Server Database** | `1433` | `localhost:1433` | Microsoft SQL Server database |

---

## 📋 Step 1: Environment Configuration

1. Navigate to the `apps/deals/` folder on the remote machine.
2. Copy `.env.production.example` to `.env.local` (or `.env`):
   ```powershell
   Copy-Item "apps\deals\.env.production.example" "apps\deals\.env.local"
   ```
3. Open `apps\deals\.env.local` and configure your production values:
   - **`NEXTAUTH_URL`**: Set to `http://<server-ip-or-hostname>:4000` (the external URL users use).
   - **`NEXTAUTH_SECRET`**: Set to a 32+ character random string.
   - **`DATABASE_URL`**: Your production MS SQL Server connection string.
   - **`GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`**: Google Workspace OAuth credentials.
   - **`SMTP_*`**: Mail server credentials for deal alerts and SLA notifications.

> [!IMPORTANT]
> In your **Google Cloud Console** under *APIs & Services > Credentials > OAuth 2.0 Client IDs*, make sure to add the Authorized Redirect URI:
> `http://<server-ip-or-hostname>:4000/api/auth/callback/google`

---

## 🌐 Step 2: Configure Existing NGINX

Since your Windows server already runs Nginx with existing apps:

### Option A: Include the config file (Recommended)
Open your main Nginx configuration file (e.g. `C:\nginx\conf\nginx.conf`) and add this line inside the `http { ... }` block:

```nginx
http {
    # ... your existing configurations and other server blocks ...

    # Deals Portal on Port 4000
    include "C:/Users/<YourUser>/Documents/ICS projects/deals-portal/nginx/deals-portal.conf";
}
```
*(Note: Always use forward slashes `/` in Nginx configuration paths, even on Windows).*

### Option B: Direct Copy
Copy the `server { ... }` block from `nginx/deals-portal.conf` and paste it inside the `http { ... }` block of your `nginx.conf`.

### Test and Reload Nginx
Run in PowerShell (from your Nginx directory or command prompt):
```powershell
# 1. Test syntax
nginx -t

# 2. Reload Nginx without downtime
nginx -s reload
```

---

## 🛡️ Step 3: Open Port 4000 in Windows Firewall

If users on the local network need to access `http://<server-ip>:4000`, open an inbound port in Windows Firewall:

Run PowerShell **as Administrator**:
```powershell
New-NetFirewallRule -DisplayName "Deals Portal Nginx (Port 4000)" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

---

## 🚀 Step 4: Deploy & Start with PM2

We provide an automated PowerShell deployment script that handles installing dependencies, generating Prisma models, compiling the production build, and launching/reloading PM2.

Open PowerShell in the project root directory and run:
```powershell
.\deploy.ps1
```

### What `deploy.ps1` does automatically:
1. Validates Node.js (>=18) and checks/installs PM2 globally if needed.
2. Checks for `apps/deals/.env.local`.
3. Runs `npm install` for monorepo workspace dependencies.
4. Generates the Prisma client (`npm run db:generate`).
5. Compiles Next.js for production (`npm run build`).
6. Starts or performs zero-downtime reload of `deals-portal` via PM2 (`ecosystem.config.js`).
7. Saves the PM2 process list (`pm2 save`).

---

## 🔄 Step 5: Ensure PM2 Starts on Windows Boot

If you haven't already configured PM2 to automatically start as a Windows Service when the machine reboots, run:

```powershell
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

Or if you are already using `pm2-windows-service` or Windows Task Scheduler, simply running:
```powershell
pm2 save
```
will ensure `deals-portal` is preserved across reboots.

---

## 📊 Useful Management Commands

### PM2 Operations
```powershell
# View running apps and status
pm2 status

# View live logs for the deals portal
pm2 logs deals-portal

# Restart deals portal
pm2 restart deals-portal

# Stop deals portal
pm2 stop deals-portal

# Update / Redeploy after git pull
.\deploy.ps1
```

### Nginx Operations
```powershell
# Test configuration syntax
nginx -t

# Reload configuration
nginx -s reload

# Stop Nginx
nginx -s stop
```

---

## 🔍 Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **502 Bad Gateway on Port 4000** | Next.js is not running on port 4001 or crashed | Check PM2 status: `pm2 status`. Check logs: `pm2 logs deals-portal` or view `logs/pm2-deals-error.log`. |
| **NextAuth OAuth Error / Redirect Mismatch** | `NEXTAUTH_URL` doesn't match the browser URL or redirect URI missing in Google Console | Verify `NEXTAUTH_URL="http://<server-ip>:4000"` in `apps/deals/.env.local` and add callback URL to Google Cloud Console. |
| **Database Connection Refused** | SQL Server port 1433 is blocked or TCP/IP protocol disabled | Open SQL Server Configuration Manager -> SQL Server Network Configuration -> Protocols for MSSQLSERVER -> Enable TCP/IP. |
| **Cannot access from other computers** | Windows Firewall blocking Port 4000 | Run the firewall command in Step 3 as Administrator. |
