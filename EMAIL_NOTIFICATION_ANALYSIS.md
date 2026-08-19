# Email Notification Engine & Forwarder Analysis

## Executive Summary
This document outlines the end-to-end architecture, data flow, queue mechanisms, and operational lifecycle of email notifications in the **Deals Registration Portal**. It covers the current implementation across **Deal Registration**, **Deal Updates**, **Expiring Deals (`dealWTN`)**, and the **Scheduled Dispatcher / Forwarder Worker**, followed by an audit of existing issues, architectural gaps, and proposed refactoring targets.

---

## 1. High-Level Architecture

The notification system follows an **Asynchronous Queue & Worker Pattern** to prevent SMTP network latency from blocking user mutations:

```mermaid
flowchart TD
    subgraph Client & Mutations
        A[User Registers Deal] -->|createDeal| B[DealHeader + dealWTN]
        C[User Updates Deal] -->|updateDeal toEmail=true| B
        B -->|Enqueue Notification| D[(deals_reg_notification \n status = 0)]
    end

    subgraph Scheduled Worker / Cron
        E[Vercel Cron / External Scheduler] -->|GET /api/cron/dispatch-emails| F[processNotifications Worker]
        F -->|Fetch status=0 batch| D
        F -->|Resolve Transporter| G[Nodemailer SMTP]
        G -->|Send Email| H[SMTP Server / Office 365]
        F -->|Update status=1, dateSent=now| D
    end

    subgraph Expiring Deals (Missing Link)
        I[(dealWTN \n whenToNotify <= NOW)] -.->|MISSING CRON| J[Expiring Alert Generator]
        J -.->|Enqueue| D
    end
```

---

## 2. Notification Data Flow Breakdown

### A. Deal Registration (`createDeal`)
* **Trigger Location**: `apps/deals/app/actions/deals.ts` (`createDeal()`)
* **Condition**: Triggered automatically unless Business Unit is `BU6` (`buVal !== 'BU6'`).
* **Recipient Resolution (`resolveDealEmailRecipients`)**:
  * **`sendTo`**: Looks up `cdbAccounts` by `AccountName` or `DomainAccount` matching `AssignedAO`. Fallback: `<ao_name>@ics.com.ph`.
  * **`sendCC`**: Queries `cdbAccounts` for `AccountGroup = bu` and `AccountType != 'CUSTOMER'`. Fallback: `<bu>-head@ics.com.ph`. Appends comma-separated addresses from `process.env.MANAGEMENT_CC_EMAILS`.
  * **`sendBCC`**: Hardcoded to `dramos@ics.com.ph`.
* **Payload Enqueued (`dbo.deals_reg_notification`)**:
  * `email_id`: Computed via `MAX(email_id) + 1`
  * `creator`: `session?.user?.DomainAccount` (e.g. `CORP\DEMOUSER`)
  * `subject`: `"Deal Registration: Created Deal Notification"`
  * `message`: HTML summary including Customer Name, Project Name, Brand, BU, Assigned AO, Validity/Expiration Dates, Total Amount, and Direct Portal Link.
  * `status`: `0` (Pending)
  * `dateCreated`: `now()`
* **Expiring Alert Scheduled (`dbo.dealWTN`)**:
  * Calculates initial notification date: `whenToNotify = (now > expDate - 10 days) ? now : (expDate - 10 days)`.
  * Inserts record into `dbo.dealWTN`.

---

### B. Deal Update (`updateDeal`)
* **Trigger Location**: `apps/deals/app/actions/deals.ts` (`updateDeal()`)
* **Condition**: Triggered **only if** the user checks `"Send update email notification to sales operations team"` (`payload.toEmail === true`) **and** `payload.BU !== 'BU6'`.
* **Recipient Resolution**: Same logic via `resolveDealEmailRecipients(payload.AssignedAO, payload.BU)`.
* **Payload Enqueued (`dbo.deals_reg_notification`)**:
  * `subject`: `"Deal Registration: Update Notification (<dealRegID>)"`
  * `message`: HTML summary detailing updated Deal Ref ID, Project Name, Brand, new Status, and Total Amount.
  * `status`: `0` (Pending)
* **WTN Alert Recalculation**:
  * Deletes previous `dealWTN` record for the deal.
  * Inserts new `dealWTN` with `whenToNotify = expDate - 2 days`.

---

### C. Expiring Deals (`dealWTN` & Manual WTN Adjustments)
* **Storage**: `dbo.dealWTN` (`id`, `dealID`, `whenToNotify`)
* **Manual Adjustment**: `updateWTN(payload)` allows users to adjust `whenToNotify` via the deal details / WTN modal in the UI.
* **CURRENT ARCHITECTURAL GAP**:
  * While `dealWTN` stores and updates the target alert date, **there is currently no cron job or worker querying `dealWTN`** to evaluate `whenToNotify <= NOW()` and enqueue an expiration reminder into `deals_reg_notification`.
  * As a result, scheduled expiration emails are currently dormant and never dispatched.

---

### D. Email Dispatcher Worker (`processNotifications`)
* **Worker File**: `apps/deals/lib/notifications.ts`
* **Cron Endpoints**:
  * `/api/cron/dispatch-emails`
  * `/api/cron/notifications` (Duplicate endpoint)
* **Execution Flow**:
  1. Authenticates request via `Bearer <CRON_SECRET>` in production environments.
  2. Queries `dbo.deals_reg_notification` for `status = 0`, ordered by `dateCreated ASC`, batch limit: `50`.
  3. Initializes `Nodemailer` transport using SMTP environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`).
  4. For each notification:
     - Dispatches email with configured `from`, `to`, `cc`, `bcc`, `subject`, `html`.
     - On Success: Updates `status = 1` and `dateSent = now()`.
     - On Failure: Logs error to console. Record remains `status = 0`.
  5. Returns structured JSON summary `{ processedCount, successCount, failureCount, details }`.

---

## 3. Environment Variable Dependencies

| Variable Name | Purpose | Example Value | Current Fallback |
| :--- | :--- | :--- | :--- |
| `SMTP_HOST` | SMTP server host | `smtp.office365.com` | `smtp.ethereal.email` |
| `SMTP_PORT` | SMTP port | `587` | `587` |
| `SMTP_SECURE` | Use SSL/TLS | `false` | `false` |
| `SMTP_USER` | SMTP username / account | `deals-portal@ics.com.ph` | `ethereal_user` |
| `SMTP_PASS` | SMTP password / app password | `********` | `ethereal_pass` |
| `EMAIL_FROM` | Sender display name & email | `ICS Deals Portal <deals@ics.com.ph>` | `noreply@dealsportal.com` |
| `MANAGEMENT_CC_EMAILS` | Fixed CC addresses for management | `mgr1@ics.com.ph, mgr2@ics.com.ph` | Empty string |
| `CRON_SECRET` | Bearer token for cron security | `deals-reg-cron-secret-key` | Optional in dev |
| `NEXTAUTH_URL` | Base URL for links inside email HTML | `https://deals.ics.com.ph` | `http://localhost:3000` |

---

## 4. Key Findings, Bugs & Areas for Refactoring

### 1. **Sender Address Formatting Bug (`from` field)**
* **Issue**: `processNotifications()` sets `from: notification.creator || process.env.EMAIL_FROM`.
* **Root Cause**: `notification.creator` is populated with `session.user.DomainAccount` (e.g. `CORP\DEMOUSER` or `GOOGLE\JDOE`).
* **Impact**: `CORP\DEMOUSER` is not a valid RFC 5322 email address. Many enterprise SMTP servers (e.g. Office 365, SendGrid) will reject mail with invalid sender addresses.
* **Recommended Fix**: Always use `process.env.EMAIL_FROM` for the SMTP envelope/header sender, and optionally place the creator's resolved email in `replyTo`.

### 2. **Missing Expiring Deals Cron Worker**
* **Issue**: `dealWTN` is populated upon creation and update, but never polled.
* **Impact**: Expiring deal alert emails are never sent.
* **Recommended Fix**:
  - Implement a dedicated worker or extend `processNotifications` to query `dealWTN` where `whenToNotify <= NOW()`, joining `DealHeader` (where dealStatus is still active), creating expiration notification records, and marking/updating WTN to prevent duplicate alerts.

### 3. **Poison Pill / Infinite Retry Loop on Failed Emails**
* **Issue**: When `transporter.sendMail()` fails, the notification is logged but its `status` remains `0`.
* **Impact**: If an invalid email address enters the queue, every subsequent cron run will attempt to resend it indefinitely, consuming batch bandwidth and spamming SMTP logs.
* **Recommended Fix**: Add a `retryCount` and `lastError` tracking or set a failed status (e.g., `status = 2` or `status = -1`) after max retries (e.g., 3 attempts).

### 4. **Duplicate Cron Endpoints**
* **Issue**: Both `/api/cron/dispatch-emails` and `/api/cron/notifications` exist with near-identical logic.
* **Recommended Fix**: Consolidate into a clean, canonical cron route.

### 5. **Hardcoded BCC Address**
* **Issue**: BCC is hardcoded to `'dramos@ics.com.ph'` across `notifications.ts` and server actions.
* **Recommended Fix**: Make BCC configurable via an environment variable `NOTIFICATION_BCC_EMAIL` with graceful fallback.

### 6. **Brand PM Notification Missing**
* **Issue**: `dbo.DealBrands` contains `assignedPM`, but `resolveDealEmailRecipients` only checks AO and BU Head.
* **Opportunity**: Check if the assigned brand has a Product Manager (PM) and include them in CC.

### 7. **Email HTML Template Modularity & Styling**
* **Issue**: Email bodies are hardcoded multiline HTML strings inside `createDeal` and `updateDeal` in `deals.ts`.
* **Recommended Fix**: Extract email template generators into dedicated helper modules (e.g., `lib/email-templates/`) with consistent corporate branding, responsive HTML, and clean fallbacks.
