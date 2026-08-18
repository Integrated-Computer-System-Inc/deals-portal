# Backend Architecture & System Documentation

**Project:** ICS Deals Registration & Pipeline Portal (`deals-portal`)  
**Architecture Pattern:** Modern Monorepo with Next.js Server Actions & Prisma ORM  
**Target Database:** Microsoft SQL Server (MS SQL)  

---

## 1. Executive Summary & Technology Stack

The backend of the **Deals Registration & Pipeline Portal** is built using a **Type-Safe Full-Stack TypeScript Architecture** powered by Next.js 14 App Router, Server Actions, Prisma ORM, and Microsoft SQL Server. It is orchestrated within a Turborepo monorepo workspace.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          NEXT.JS 14 FRONTEND                           │
│     (App Router, React 18, Tailwind CSS, TanStack Query, SWR)          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │  Server Actions / Direct RPC
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SERVER ACTIONS BACKEND                          │
│   (Next.js App Server, Role-Based Scoping, Zod Validation, Auth)       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │  Prisma Client Singleton
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         PRISMA ORM DATA LAYER                          │
│               (@my-app/database, Connection Pooling, Migrations)       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │  TDS / SQL Server Protocol
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      MICROSOFT SQL SERVER DATABASE                     │
│    (dbo.DealHeader, dbo.DealItems, dbo.DealLost, dbo.cdbAccounts)      │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Backend Technologies

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime & Language** | **Node.js & TypeScript** | Node >= 18, TS 5.4 | Server execution environment with end-to-end type safety |
| **Web & API Framework** | **Next.js (App Router)** | 14.1.4 | Server Actions, API routes, Server-Side Rendering (SSR), route revalidation |
| **Monorepo Engine** | **Turborepo** | 1.13.0 | Workspace management, task caching, and shared package linking |
| **Database Engine** | **Microsoft SQL Server** | SQL Server (TDS) | Primary relational database storing enterprise deal records and accounts |
| **ORM / Data Access** | **Prisma ORM** | 5.12.0 | Type-safe query building, transactions (`$transaction`), and migrations |
| **Authentication / SSO** | **NextAuth.js** | 4.24.7 | Session management, Google Workspace OAuth, Corporate Directory lookup |
| **Email Notifications** | **Nodemailer** | 6.9.13 | Automated SMTP transactional alerts for registrations and updates |
| **Schema Validation** | **Zod** | 3.22.4 | Server-side runtime payload validation |

---

## 2. Monorepo Structure & Package Architecture

The project is organized into dedicated packages to ensure strict separation of concerns and high reusability:

```
deals-portal/
├── apps/
│   └── deals/                      # Next.js Full-Stack Application
│       ├── app/
│       │   ├── actions/            # Server Actions (Backend business logic)
│       │   │   └── deals.ts        # Primary data access layer for deal operations
│       │   ├── api/
│       │   │   └── auth/           # NextAuth.js API handlers
│       │   ├── dashboard/          # Dashboard analytics & KPI aggregation
│       │   ├── deals/              # Deals Registry, details, create, & edit
│       │   ├── reports/            # Reports Studio & cross-BU matrices
│       │   └── login/              # Authentication & SSO entry
│       ├── components/             # UI Components, Modals, Filters
│       ├── hooks/                  # React Query & SWR custom data hooks
│       └── lib/
│           ├── auth.ts             # NextAuth config & corporate account resolver
│           └── brandUtils.ts       # Shared brand normalization & status helpers
│
├── packages/
│   ├── database/                   # Database & ORM Package (@my-app/database)
│   │   ├── prisma/
│   │   │   └── schema.prisma       # SQL Server Prisma Schema definition
│   │   ├── src/
│   │   │   └── client.ts           # Prisma Client Singleton with connection pool
│   │   └── package.json
│   │
│   └── types/                      # Shared TypeScript Interfaces (@my-app/types)
│       ├── src/
│       │   └── deals.ts            # Domain entities, payloads, DTOs, status maps
│       └── package.json
│
├── package.json                    # Monorepo root configuration
└── turbo.json                      # Turborepo task pipeline configuration
```

---

## 3. Database Schema & Data Models (MS SQL Server)

The database schema is mapped directly to Microsoft SQL Server via [`packages/database/prisma/schema.prisma`](file:///c:/Users/jdoremon/Documents/ICS%20projects/deals-portal/packages/database/prisma/schema.prisma):

### Key Database Models

#### 1. `dbo.DealHeader` (Root Deal Entity)
Stores the master information for every registered deal or pipeline opportunity.
* `dealID` (`Int`, Primary Key): Unique numeric deal identifier.
* `dealRegID` (`VarChar(50)`, Unique): Partner registration code (e.g., `REGI-0005491402`).
* `custName` (`VarChar(Max)`): Client / customer company name.
* `ProjectName` (`VarChar(Max)`): Opportunity name and project scope.
* `brand` (`VarChar(50)`): Primary vendor partner brand (e.g., `Dell`, `HPi`, `HPe`, `Cisco`).
* `BU` (`VarChar(50)`): Business Unit handling the deal (e.g., `BU1`, `BU2`, `BU5`, `BU8`, `BU10`, `BU12`).
* `AssignedAO` (`VarChar(50)`): Account Officer assigned to the customer/opportunity.
* `dealStatus` (`VarChar(Max)`): Deal lifecycle status code (`1`=Registered, `2`=Declined, `4`=Pending, `5`=Expired, `6`=Won, `7`=Lost).
* `dtRegistered` (`Date`): Date registration was officially confirmed by vendor.
* `expDt` / `expiration` (`Date` / `VarChar`): Deal validity and expiration timestamp.
* `remarks` (`VarChar(Max)`): Audit history, notes, or legacy loss rationale.

#### 2. `dbo.DealItems` (Line-Item Quotation Details)
Stores line items, equipment descriptions, and currency values for a deal.
* `dealItemID` (`Int`, Primary Key)
* `dealID` (`Int`, Foreign Key -> `DealHeader.dealID` with `onDelete: Cascade`)
* `itemDesc` (`VarChar(Max)`): Product / service description.
* `qty` (`VarChar(50)`): Quantity ordered.
* `currency` (`VarChar(50)`): Transaction currency (e.g., `PHP`, `USD`, `EUR`).
* `totalAmt` (`VarChar(50)`): Total line-item financial value.

#### 3. `dbo.DealLost` (Competitor Intelligence & Loss Analysis)
Optional child table recording competitor intelligence when a deal is marked as Lost.
* `dealID` (`Int`, Primary Key & Foreign Key -> `DealHeader.dealID` with `onDelete: Cascade`)
* `competitorVendor` (`VarChar(200)`): Winning competitor distributor or reseller.
* `competitorBrand` (`VarChar(200)`): Competing brand / solution chosen.
* `icsOffer` (`VarChar(150)`): ICS proposal price or `"N/A"`.
* `competitorOffer` (`VarChar(150)`): Winning competitor price or `"N/A"`.
* `reason` (`VarChar(250)`): Primary loss rationale (e.g., price difference, stock lead time).
* `otherInformation` (`VarChar(250)`): Detailed competitor intel notes.

#### 4. `dbo.dealWTN` (When-To-Notify Notification Timers)
Tracks scheduled email reminder dates for expiring deals.
* `wtn_dealID` (`Int`, Primary Key)
* `dealID` (`Int`, Foreign Key -> `DealHeader.dealID`)
* `dtwtn` / `whenToNotify` (`DateTime`): Scheduled date for automated email reminder.

#### 5. `dbo.DealResponse` (Vendor SLA Tracking)
Tracks turnaround days for vendor partner response.
* `id` (`Int`, Primary Key)
* `dealID` (`Int`, Foreign Key -> `DealHeader.dealID`)
* `responseDays` (`VarChar(50)`): Number of business days taken to confirm registration.

#### 6. `dbo.cdbAccounts` & `dbo.UsersTable` (Corporate Directory & Role Mapping)
Stores employee profiles, assigned AOs, corporate emails, and security roles.

---

## 4. Data Access Layer & Server Actions

All backend business logic and database access are encapsulated in **Next.js Server Actions** inside [`apps/deals/app/actions/deals.ts`](file:///c:/Users/jdoremon/Documents/ICS%20projects/deals-portal/apps/deals/app/actions/deals.ts).

### Core Server Actions

| Action Name | Type | Description |
| :--- | :--- | :--- |
| `getScopedDeals(filter)` | **Query** | Fetches paginated/filtered deals tailored strictly to the authenticated user's role and assigned business units. Aggregates multi-currency totals and formats child relations (`DealItems`, `DealLost`, `dealWTN`). |
| `getDealById(dealID)` | **Query** | Fetches a single deal entity by its primary key with complete hydration of its child tables (`DealItems`, `DealLost`, `dealWTN`, `DealResponse`). |
| `createDeal(payload)` | **Mutation** | Executes an atomic database transaction (`prisma.$transaction`) creating `DealHeader` and `DealItems`, computes valid IDs, and triggers optional email notifications. |
| `updateDeal(payload)` | **Mutation** | Atomically updates deal header metadata, replaces/syncs line items, updates expiration dates, and triggers revalidation. |
| `saveLostDeal(payload)` | **Mutation** | Atomically transitions deal status to `7` (Lost) and upserts competitor intel into `dbo.DealLost`. |
| `updateWTN(payload)` | **Mutation** | Updates or sets scheduled notification dates in `dbo.dealWTN`. |
| `searchCustomers(query)` | **Query** | Executes live search queries against customer records and business unit mappings. |

---

## 5. Security, Scoping & Role-Based Access Control (RBAC)

The backend enforces strict data scoping across all database operations:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATED USER ROLES                        │
├────────────────────────────────────────────────────────────────────────┤
│  1. Sales Admin (admin)    → Complete organization-wide visibility     │
│  2. Sales AA (aa)          → Global read/write across all BUs          │
│  3. BU Supervisor (bu)     → Scoped strictly to their Business Unit   │
│  4. Account Officer (ao)   → Scoped strictly to their assigned deals  │
└────────────────────────────────────────────────────────────────────────┘
```

### Scoping Implementation Details
* **Admin / Sales AA**: Queries all records across all business units without filters.
* **BU Supervisor**: Automatically filters queries with `WHERE BU = session.AccountGroup`.
* **Account Officer**: Automatically filters queries with `WHERE AssignedAO = session.AccountName`.
* **Export Prevention**: All raw export server endpoints have been removed to restrict sensitive customer pricing and competitor data to authenticated in-app sessions only.

---

## 6. Email Notification Engine

Transactional emails are handled using **Nodemailer** configured with enterprise SMTP credentials:
* **Deal Creation Alert**: Sends formatted HTML notifications to the assigned Account Officer and BU leaders upon new deal registration.
* **Deal Update & Lost Alerts**: Notifies stakeholders when deal statuses change or validity periods are extended.
* **Environment Variables**:
  * `SMTP_HOST`: Mail server hostname
  * `SMTP_PORT`: Port (e.g., 587 / 465)
  * `SMTP_USER` & `SMTP_PASS`: Authentication credentials
  * `SMTP_FROM`: Official sender address

---

## 7. Caching, Data Freshness & Real-Time Revalidation

To ensure high performance without serving stale data:
1. **Server-Side Cache Invalidation**:
   - `revalidatePath('/deals')` and `revalidatePath('/dashboard')` are called immediately after any mutation (`createDeal`, `updateDeal`, `saveLostDeal`).
2. **Client-Side Cache Layer**:
   - Uses **TanStack React Query** (`useDealsQuery`, `useLostDealMutation`, `useUpdateWTNMutation`) and **SWR** for optimistic updates, automatic refetching on window focus, and background sync.

---

## 8. Summary of Backend Environment Variables

The backend relies on the following environment configuration:

```env
# Database Connection (Microsoft SQL Server)
DATABASE_URL="sqlserver://<server>:<port>;database=<dbname>;user=<user>;password=<password>;encrypt=true;trustServerCertificate=true;"

# Authentication (NextAuth.js)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<enterprise-generated-secret>"
GOOGLE_CLIENT_ID="<google-oauth-client-id>"
GOOGLE_CLIENT_SECRET="<google-oauth-client-secret>"

# SMTP Mail Server
SMTP_HOST="smtp.office365.com"
SMTP_PORT=587
SMTP_USER="deals-portal@ics.com.ph"
SMTP_PASS="<smtp-password>"
SMTP_FROM="ICS Deals Portal <deals-portal@ics.com.ph>"
```
