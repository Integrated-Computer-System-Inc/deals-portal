# Dokploy & Traefik Production Deployment Guide

This guide details how to deploy the **ICS Deals Registration & Pipeline Portal** on **[Dokploy](https://dokploy.com/)** using **Nixpacks** and **Traefik**.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      PUBLIC USERS                       │
│             (https://deals.ics.com.ph)                  │
└────────────────────────────┬────────────────────────────┘
                             │  HTTPS (Port 443 / SSL)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     TRAEFIK PROXY                       │
│    (Auto-SSL via Let's Encrypt, HTTP->HTTPS Redirect)   │
└────────────────────────────┬────────────────────────────┘
                             │  Internal Docker Network
                             ▼
┌─────────────────────────────────────────────────────────┐
│               DOKPLOY CONTAINER (NIXPACKS)              │
│       Next.js 14 App Server (0.0.0.0:3000)              │
│       Turborepo Monorepo (apps/deals)                   │
└────────────────────────────┬────────────────────────────┘
                             │  TDS Protocol
                             ▼
┌─────────────────────────────────────────────────────────┐
│              MICROSOFT SQL SERVER DATABASE              │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Step 1: Create Application in Dokploy

1. Log into your **Dokploy Dashboard**.
2. Go to **Projects** → Select or create your Project → Click **Create Service** → Choose **Application**.
3. Name the application (e.g. `deals-portal`).
4. In **Source**, select **GitHub** (or your Git provider) and select the `deals-portal` repository.
5. Set the target **Branch** (e.g., `main`).

---

## ⚙️ Step 2: Build & General Settings

Configure the application settings in Dokploy:

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Build Type** | `Nixpacks` | Dokploy auto-detects Node.js & npm workspaces |
| **Base Directory** | `/` | Keep at root so Nixpacks can build all workspace packages |
| **Port** | `3000` | Internal container port served by Next.js |
| **Publish Directory** | *(leave blank)* | Handled automatically by Next.js |

> **How Nixpacks Builds This Monorepo:**
> 1. **Install Phase**: Runs `npm ci` across the monorepo.
> 2. **Build Phase**: Executes `npm run build` from root (which runs `db:generate` then `turbo run build`).
> 3. **Start Phase**: Executes `npm start` (which runs `next start -H 0.0.0.0` inside `apps/deals` on port 3000).

---

## 🌐 Step 3: Configure Domain & Traefik

1. In your Dokploy application, open the **Domains** tab.
2. Click **Add Domain**:
   - **Host**: Enter your portal domain (e.g., `deals.ics.com.ph`).
   - **Path**: `/`
   - **Port**: `3000`
   - **HTTPS / SSL**: Enable **Certificate (Let's Encrypt)**.
3. Ensure your corporate DNS records point the domain to your Dokploy server IP.
4. Traefik will automatically handle SSL certificate issuance, renewal, and routing to your container.

---

## 🔐 Step 4: Environment Variables

Navigate to the **Environment** tab in Dokploy and add the following variables:

```env
# Application Environment
NODE_ENV=production
PORT=3000

# NextAuth Configuration
NEXTAUTH_URL=https://deals.ics.com.ph
NEXTAUTH_SECRET=generate-a-secure-random-32-character-secret-key

# Google OAuth (Workspace SSO)
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Microsoft SQL Server Database Connection
DATABASE_URL="sqlserver://db-host.domain.com:1433;database=YourDealsDB;user=sa;password=YourSecurePassword;encrypt=true;trustServerCertificate=true;"

# Optional: Admin Email Overrides (comma-separated)
ADMIN_EMAILS="jdoremon@ics.com.ph,bcandelaria@ics.com.ph,mescario@ics.com.ph,dramos@ics.com.ph"
```

> [!TIP]
> You can generate a strong `NEXTAUTH_SECRET` in any terminal with:
> `openssl rand -base64 32`

---

## 🚀 Step 5: Deploy

1. Click **Deploy** in the top right corner of Dokploy.
2. Monitor the build logs:
   - Nixpacks will download Node.js.
   - Run `npx prisma generate` to generate the Prisma client.
   - Compile all packages and Next.js assets (`next build`).
   - Start the production server on `0.0.0.0:3000`.
3. Once the build completes, visit your domain (e.g. `https://deals.ics.com.ph`).

---

## 🔄 Automated CI/CD (Auto-Deploy on Push)

To auto-deploy whenever changes are pushed to GitHub:
1. In Dokploy, enable **Auto Deploy** under the Git settings.
2. Dokploy will provide a Webhook URL.
3. In GitHub: Go to **Settings** → **Webhooks** → **Add Webhook** → Paste the Webhook URL.
4. Any `git push` to `main` will now trigger an automated zero-downtime rebuild and redeployment!

---

## 🛠️ Troubleshooting

- **Container fails to start with "Could not find a production build"**:
  Ensure **Base Directory** is set to `/` in Dokploy so Nixpacks builds from the root monorepo directory.
- **Traefik returns 502 Bad Gateway**:
  Confirm the container port is set to `3000` and Next.js is binding to `0.0.0.0` (`next start -H 0.0.0.0`).
- **Database connection timeouts**:
  Verify the Dokploy server's IP is allowed through your SQL Server network firewall on port `1433`.
