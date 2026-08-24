# Deals Registration Portal (ICS)

An enterprise-grade, high-performance web application for managing deal registrations, pipeline status tracking, SLA monitoring, and cross-business-unit sales workflows at **Integrated Computer Systems, Inc. (ICS)**.

---

## 🌟 Key Features & Capabilities

- **🔐 Enterprise Authentication & Role-Based Scoping (NextAuth.js)**
  - Google OAuth single sign-on restricted strictly to `@ics.com.ph` corporate accounts.
  - Role-based permissions across 4 distinct roles:
    - **Administrator (`admin`)**: Full read/write, audit capabilities, and global KPI reporting.
    - **Admin Assistant (`aa`)**: Deal registration, editing, renewals, and notification dispatch.
    - **Business Unit Head (`bu` / `bu_admin`)**: Scoped access and analytics across assigned business units (e.g., BU1–BU7, Lenovo, IBM, HP, Dell).
    - **Account Officer (`ao`)**: Scoped to owned customer accounts, active pipelines, and renewals.
  - Interactive geometric SVG hero characters on login with real-time eye-tracking, sequential blinking, celebration animations on success, and slump state feedback on authentication errors.

- **⚡ Multi-Tier Caching & High-Performance Data Fetching**
  - **In-Process Server LRU Cache**: Fast sub-millisecond in-memory cache for Server Actions (`getScopedDeals`, `getDashboardSummary`) with tag-based invalidation upon mutations.
  - **TanStack Query (React Query v5)**: Automated client-side deduplication, 5-minute stale window, 1-hour in-memory retention, and zero-flicker optimistic UI updates.
  - **Hover & Focus Prefetching**: Instant route transitions by prefetching target queries on navigation link hover/focus.
  - **Smart External API Proxy**: Search proxy with fuzzy tokenization and fallback relevance ranking against ICE CREAM liveSearch API.

- **📊 Comprehensive Analytics & Reports Studio**
  - Interactive KPI summaries: Registered Deals, Expired Deals, Renewal Pipeline, and Lost Deals.
  - Distribution matrices by Brand, Business Unit, and AO.
  - SLA tracking with When-To-Notify (WTN) dates and automated email notifications.

- **🎨 Modern Design System & Themes**
  - Custom Tailwind CSS design tokens with full light/dark mode support and 6 curated theme palettes.
  - Fully responsive on both desktop and mobile viewports with adaptive peeking character banners.

---

## 🏗️ Monorepo Architecture

This repository is organized as a Turborepo monorepo:

```
dealregportal/
├── apps/
│   └── deals/                       # Main Next.js 14 App Router application
│       ├── app/                     # Next.js App Router pages and Server Actions
│       │   ├── actions/deals.ts     # Server Actions (DB queries, mutations, cache management)
│       │   ├── api/                 # REST API endpoints (deals, customers, cron notifications)
│       │   ├── dashboard/           # Executive KPI dashboard and metrics overview
│       │   ├── deals/               # Deals registry, detail views, and registration wizard
│       │   ├── reports/             # Reports studio & exportable analytics matrix
│       │   └── login/               # Interactive login with animated hero characters
│       ├── components/              # Reusable UI component library (Ant Design + Tailwind)
│       ├── hooks/                   # Client state, filters store, and TanStack Query hooks
│       ├── lib/                     # Server cache, auth options, email templates, search utilities
│       └── workers/                 # Web Workers for heavy off-thread deal analytics
├── packages/
│   ├── database/                    # Prisma ORM schema & Microsoft SQL Server connection client
│   │   └── prisma/schema.prisma     # SQL Server schema with optimized composite indexes
│   └── types/                       # Shared TypeScript interfaces, types, and DTO payloads
├── turbo.json                       # Turborepo task pipeline configuration
└── package.json                     # Monorepo root configuration
```

---

## 🛠️ Tech Stack

| Domain | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router, Turbopack, Server Actions) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) & [Ant Design 6](https://ant.design/) |
| **State & Caching** | [@tanstack/react-query v5](https://tanstack.com/query) + In-Process Server LRU Cache |
| **Authentication** | [NextAuth.js v4](https://next-auth.js.org/) (Google OAuth 2.0) |
| **Database & ORM** | [Microsoft SQL Server](https://www.microsoft.com/sql-server) via [Prisma ORM](https://www.prisma.io/) |
| **Icons & Typography** | [Lucide React](https://lucide.dev/), Outfit & Inter (Google Fonts) |
| **Monorepo Tools** | [Turborepo](https://turbo.build/repo) |

---

## ⚙️ Environment Variables

Create `.env.local` inside `apps/deals/`:

```env
# Application URLs
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secure-random-secret-key"

# Google OAuth Credentials (Enterprise Workspace)
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Microsoft SQL Server Database Connection
DATABASE_URL="sqlserver://<server>:<port>;database=<database>;user=<username>;password=<password>;encrypt=true;trustServerCertificate=true"

# SMTP Email Configuration (Notifications & Cron)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="deals-notifications@ics.com.ph"
SMTP_PASS="your-app-password"
SMTP_FROM="ICS Deals Portal <deals-notifications@ics.com.ph>"

# Cron / Webhook Secret
CRON_SECRET="your-cron-secret-token"
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- Access to the ICS Microsoft SQL Server database

### 2. Installation
Clone the repository and install dependencies from the root directory:

```bash
git clone https://github.com/Integrated-Computer-System-Inc/deals-portal.git
cd deals-portal
npm install
```

### 3. Generate Prisma Client
Generate the Prisma client for the SQL Server schema:

```bash
npm run db:generate
```

### 4. Run Development Server
Start the development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs the development server across monorepo workspaces with Turbopack (`-H 0.0.0.0`) |
| `npm run build` | Builds the production bundle across all applications |
| `npm run lint` | Runs ESLint checks across all packages and apps |
| `npm run db:generate` | Generates the Prisma Client from `packages/database/prisma/schema.prisma` |
| `npm run db:push` | Pushes schema state and indexes directly to the SQL Server database |

---

## 🗄️ Database Models & Indexes

The database schema (`packages/database/prisma/schema.prisma`) includes indexes optimized for high-volume deal querying:

- `DealHeader`: Core deal registration records. Indexed on `[AssignedAO, dtCreated]`, `[BU, dtCreated]`, `[brand, dtCreated]`, `[expDt]`, `[customerID]`, and `[dtCreated]`.
- `DealItems`: Line items, quantities, and currencies. Indexed on `[dealID]`.
- `cdbAccounts`: Active account directory and AO/BU mapping. Indexed on `AccountName`, `AccountIDNo`, `DomainAccount`, and `Email`.
- `dealWTN`: When-To-Notify alert schedules. Indexed on `dealID` and `whenToNotify`.
- `DealLost`: Competitor information and lost deal root causes.
- `DealRenewal`: Renewal history and validity extension logs. Indexed on `dealID` and `dtRenewal`.
- `deals_reg_notification`: Queue for outgoing notification emails. Indexed on `[status, dateCreated]`.

---

## 🔒 Security & Performance Guidelines

1. **Enterprise Email Restriction**: Login rejects any non-`@ics.com.ph` Google email address before session issuance.
2. **Server-Side Authorization**: Every Server Action and API route verifies the session role and domain account before executing queries or mutations.
3. **Prepared SQL Statements**: All database operations use Prisma type-safe queries and parameterized statements.
4. **Data Protection**: Sensitive line items and lost deal reasons are protected with role-based visibility controls.

---

## 📄 License & Ownership

Confidential and Proprietary. Copyright © 2026 **Integrated Computer Systems, Inc. (ICS)**. All rights reserved.
