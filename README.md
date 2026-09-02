# Deals Registration Portal (ICS)

An enterprise-grade, high-performance web application engineered for managing deal registrations, sales pipeline tracking, SLA monitoring, and cross-business-unit workflows at **Integrated Computer Systems, Inc. (ICS)**.

---

## 🌟 Executive Summary & Key Capabilities

The **Deals Registration Portal** provides a centralized platform for sales teams, business unit managers, product managers, and executive administrators to register deals, monitor approval statuses, manage renewals, track competitor metrics for lost deals, and automate notification routing.

### 🔑 Core Capabilities:
- **Comprehensive Deal Lifecycle Management**:
  - **Registration Wizard**: Multi-item deal entry with real-time customer search, brand selection, and multi-currency support (PHP, USD, EUR, etc.).
  - **Inline Updates & Edits**: Track field-level modifications with audit logging and notification triggers.
  - **Validity & Renewal Tracking**: Reactive date synchronization, validity duration calculation, and renewal history logs.
  - **Lost Deal Root Cause Analysis**: Capture competitor vendor, competitor brand, competitive pricing differences, and loss reasons.
- **Role-Based Scoping (RBAC)**: Scoped access for Account Officers, Business Units, and Brand Product Managers.
- **Centralized Email Routing & DEV/LIVE Sandbox**:
  - Full administrator control over system notifications from `/admin/emails`.
  - **DEV Mode**: 100% safe sandbox routing all notification emails to an IT testing distribution list with tagged subjects (protecting real customers and employees during staging/QA).
  - **LIVE Mode**: Automatic routing to assigned Account Officers (TO), Business Unit Heads (CC), Admin & AA (CC), and Brand Product Managers (CC).
- **Executive KPI Dashboard & Reports Studio**:
  - Real-time KPIs: Registered Deals, Active Pipeline, Expired Deals, Renewal Pipeline, and Lost Deals.
  - Interactive distribution matrices by Brand, BU, and AO.
  - Instant CSV / PDF data export for executive reporting.
- **Enterprise Authentication (NextAuth.js)**:
  - Google OAuth 2.0 restricted strictly to `@ics.com.ph` corporate workspace accounts.
  - Interactive animated SVG hero characters on login with real-time eye-tracking, sequential blinking, success celebrations, and error feedback.

---

## 👥 Role-Based Access Control (RBAC) & Data Scoping

The application enforces a multi-tier permission matrix with server-side authorization on every Server Action and database query:

| Role Code | Role Name | Access Scope | Key Permissions |
| :--- | :--- | :--- | :--- |
| **`ITadmin`** | **IT Administrator** | **Global** (All Deals & Settings) | Full read/write, access to **Email Configuration Center** (`/admin/emails`), system audit logs, and test email dispatcher. |
| **`admin`** | **General Administrator** | **Global** (All Deals) | Full read/write on all deals, executive dashboards, analytics exports, and user role management. |
| **`aa`** | **Admin Assistant** | **Global** (All Deals) | Deal registration, editing, renewals, customer association, and manual notification triggers. |
| **`bu`** / **`bu_admin`** | **Business Unit Head** | **BU Scoped** (e.g. BU1, BU2, BU5, CE01) | Read/write access restricted to deals belonging to assigned Business Units (`AssignedBU`). |
| **`ao`** | **Account Officer** | **AO Scoped** (Owned Accounts) | Read/write access restricted to deals where the user is the assigned Account Officer (`AssignedAO`). |
| **`pm`** | **Product Manager** | **Brand Scoped** (Assigned Brands) | Read/write access restricted to deals matching the PM's brand portfolio (`AssignedBrand`, e.g. DELL, HPI, HPE, CISCO, LENOVO). |

### Database Representation (`dbo.Users`):
- `UserRole`: Base role identifier (`ITadmin`, `admin`, `aa`, `bu`, `ao`, `pm`).
- `AssignedBU`: Comma-separated list of assigned Business Units (e.g., `BU5,BU8`).
- `AssignedBrand`: Comma-separated list of assigned Brands (e.g., `DELL,HPI,HPE`).

---

## 📧 Email Notification System & Sandboxing

The portal features a routing pipeline configured via the **Email Configuration Center** (`/admin/emails`):

### 1. Dual-Mode Operation
- **DEV Mode (Testing & QA Sandbox)**:
  - `TO`: Configured Dev TO Recipients (IT distribution list).
  - `CC`: Configured Dev CC Recipients.
  - `BCC`: Configured Dev BCC Recipients.
  - `Subject Prefix`: `[DEV MODE - Intended for: AO Name] Actual Subject`.
  - *Guarantees zero emails are sent to real clients, AOs, or managers during testing.*
- **LIVE Mode (Production Dispatch)**:
  - `TO`: Assigned Account Officer (AO).
  - `CC`: Designated BU Head + Admin (`asy-lu@ics.com.ph`) & AA (`afrancisco@ics.com.ph`) + Brand PM(s) + Custom Live CCs.
  - `BCC`: IT Monitoring / Audit distribution list.

### 2. Dual-Source Brand PM Resolution
When a deal notification is triggered, the system resolves the Brand PM through two sources:
1. **`dbo.DealBrands`**: Matches brand to `assignedPM` (resolves Account ID, AccountIDNo, domain account, or email via `cdbAccounts`).
2. **`dbo.Users`**: Finds users with `UserRole = 'pm'` whose `AssignedBrand` contains the deal's brand.

### 3. Automated Lifecycle Notifications:
- **Deal Created**: Sends summary with registration ID, client, brand, and validity.
- **Deal Updated**: Field-level delta changes table (old vs. new values).
- **Deal Renewed**: New validity duration and extension logs.
- **Deal Lost**: Competitor vendor, competitor brand, and lost deal rationale.
- **Expiration Alert Scanner (`dealWTN`)**: Scheduled background worker notifying AOs and managers when deals approach expiry (30-day, 15-day, 7-day milestones).

---

## 🏗️ Monorepo Architecture

This project is built using [Turborepo](https://turbo.build/repo):

```
deals-portal/
├── apps/
│   └── deals/                                # Next.js 14 Web Application
│       ├── app/
│       │   ├── actions/                      # Next.js Server Actions
│       │   │   ├── deals.ts                  # Deal queries, mutations, renewals, lost deals
│       │   │   └── email-config.ts           # Email config management & test email dispatch
│       │   ├── admin/
│       │   │   └── emails/page.tsx           # Email Configuration Center UI
│       │   ├── api/                          # REST API routes (cron dispatch, search proxy)
│       │   ├── dashboard/                    # Executive KPI dashboard & interactive matrices
│       │   ├── deals/                        # Deals registry, detail views, new deal wizard, edit form
│       │   ├── reports/                      # Analytics studio & export center
│       │   └── login/                        # Google OAuth login with animated hero characters
│       ├── components/                       # Shared UI library (Ant Design + Tailwind CSS)
│       │   ├── admin/EmailAccountPicker.tsx  # Interactive directory search recipient picker
│       │   ├── FormattedAmountInput.tsx      # Thousand-separator numeric inputs
│       │   └── CustomerSearchModal.tsx       # LiveSearch customer lookup modal
│       ├── hooks/                            # TanStack Query & filter state hooks
│       └── lib/                              # Core utilities (auth, email-recipients, db-migration)
├── packages/
│   ├── database/                             # Database layer & Prisma client
│   │   ├── prisma/schema.prisma              # MSSQL Prisma schema
│   │   └── scripts/                          # SQL migrations & database scripts
│   │       ├── master-database-deployment.sql # All-in-one idempotent DB setup script
│   │       └── deploy-database.ts            # CLI database deployment runner
│   └── types/                                # Shared TypeScript interfaces & DTOs
├── deploy.ps1                                # Automated Windows PowerShell deployment script
├── ecosystem.config.js                       # PM2 process configuration
├── turbo.json                                # Turborepo build pipeline
└── package.json                              # Monorepo root package definition
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 14](https://nextjs.org/) (App Router, React 18, Server Actions, Turbopack) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling & Icons** | [Tailwind CSS 3](https://tailwindcss.com/), [Ant Design 6](https://ant.design/), [Lucide React](https://lucide.dev/) |
| **State & Data Fetching** | [@tanstack/react-query v5](https://tanstack.com/query) + In-Memory Server LRU Cache |
| **Authentication** | [NextAuth.js v4](https://next-auth.js.org/) (Google OAuth 2.0 with `@ics.com.ph` whitelist) |
| **Database & ORM** | [Microsoft SQL Server](https://www.microsoft.com/sql-server) via [Prisma ORM 5](https://www.prisma.io/) |
| **Email Delivery** | [Nodemailer](https://nodemailer.com/) with responsive branded HTML templates |
| **Process Management** | [PM2](https://pm2.keymetrics.io/) on Windows Server |
| **Monorepo Build** | [Turborepo](https://turbo.build/repo) |

---

## 🗄️ Database Setup & Deployment

The portal uses Microsoft SQL Server. You can deploy or update the database using any of the following methods:

### Method 1: Master SQL Script (Recommended for DBAs)
Run the master script in **SQL Server Management Studio (SSMS)** or **Azure Data Studio**:
- File: [`packages/database/scripts/master-database-deployment.sql`](file:///c:/Users/jdoremon/Documents/ICS%20projects/deals-portal/packages/database/scripts/master-database-deployment.sql)
- *100% Idempotent*: Safe to run repeatedly on new or existing production databases.

### Method 2: Automated CLI Deployment
From the project root on your target server:
```powershell
npm --prefix packages/database run db:deploy
```
*(Uses the `DATABASE_URL` configured in your `.env` to execute all table updates, columns, seeds, and performance indexes.)*

### Method 3: In-App Auto-Migration
The application includes automatic startup checks in `apps/deals/lib/db-migration.ts`. When an administrator logs in, missing columns (`includeBrandPm`, `devCCRecipients`, `devBCCRecipients`, `AssignedBU`, `AssignedBrand`) are created automatically if permissions allow.

---

## ⚙️ Environment Variables

Create `.env` (or `.env.local`) in `apps/deals/`:

```env
# Application URL
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secure-random-secret-key"

# Google OAuth (ICS Corporate Workspace)
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Microsoft SQL Server Database Connection
DATABASE_URL="sqlserver://<HOST>:<PORT>;database=<DB_NAME>;user=<USER>;password=<PASS>;encrypt=true;trustServerCertificate=true"

# SMTP Email Server (Notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="deals-notifications@ics.com.ph"
SMTP_PASS="your-app-specific-password"
SMTP_FROM="NoReply: Deals Registration <noreply-newsite@ics.com.ph>"

# Cron / Webhook Secret Token
CRON_SECRET="your-secure-cron-token"
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`
- Access to an ICS Microsoft SQL Server instance

### 2. Installation & Setup
```powershell
# 1. Clone the repository
git clone https://github.com/Integrated-Computer-System-Inc/deals-portal.git
cd deals-portal

# 2. Install monorepo dependencies
npm install

# 3. Generate Prisma client
npm run db:generate

# 4. Deploy / verify database schema
npm --prefix packages/database run db:deploy

# 5. Start development server with Turbopack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Windows Production Deployment (PM2)

The project includes an automated deployment script for Windows production servers:

```powershell
# Run the deployment script from the project root in PowerShell:
.\deploy.ps1
```

### What `deploy.ps1` does:
1. Validates Node.js and PM2 prerequisites.
2. Stops existing PM2 instances to release Windows file locks.
3. Installs monorepo dependencies (`npm install`).
4. Generates the Prisma client (`npm run db:generate`).
5. Builds the production Next.js application (`npm run build`).
6. Starts/reloads the application under PM2 using `ecosystem.config.js`.

### Useful PM2 Commands:
```powershell
pm2 status                    # Check application health
pm2 logs deals-portal         # View real-time logs
pm2 restart deals-portal      # Restart the application
pm2 stop deals-portal         # Stop the application
```

---

## 📜 Monorepo Scripts Reference

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server with Turbopack |
| `npm run build` | Compiles production bundles across all packages and apps |
| `npm run lint` | Runs ESLint verification across the monorepo |
| `npm run db:generate` | Generates Prisma client bindings |
| `npm run db:deploy` | Executes master database deployment script |
| `npm run db:index` | Applies optimized performance indexes |
| `npm run seed:admins` | Seeds default administrators in `dbo.Users` |

---

## 🔒 Security & Compliance

1. **Strict Corporate Whitelist**: Only `@ics.com.ph` email addresses authenticated via Google OAuth are granted session tokens.
2. **Server-Side Authorization**: Every Server Action validates user roles and data scopes before querying or mutating data.
3. **Parameterized SQL Queries**: All queries execute through Prisma ORM or parameterized prepared statements (`@P1, @P2...`) to prevent SQL injection.
4. **DEV Mode Safeguard**: Test notifications are physically prohibited from emailing real clients or employees during testing.

---

## 📄 License & Ownership

**Confidential and Proprietary.** Copyright © 2026 **Integrated Computer Systems, Inc. (ICS)**. All rights reserved.
