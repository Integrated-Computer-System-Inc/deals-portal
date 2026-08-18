# End-to-End Column-Level Data Lineage and Function Mapping

## Scope: Deal Registration (createDeal)
This document traces the data lineage for the **Deal Registration** workflow. It captures how data originates in the TanStack frontend, flows through server actions, and is ultimately persisted into the database via Prisma client operations.

---

### 1. End-to-End Execution Flow
`NewDealPage (TanStack Form)` --> `useCreateDealMutation (TanStack Query)` --> `createDeal() (Server Action)` --> `Prisma $transaction / $executeRawUnsafe` --> `[DealHeader, DealItems, dealWTN, deals_reg_notification]`

---

### 2. TanStack-to-Prisma Column Mapping Matrix

| Prisma Target Model | Prisma Target Field | Front-end Payload Field | Handling Component / Hook | Server Action / Function Path | Logic / Transformation Applied |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`DealHeader`** | `dealID` | *N/A* | `createDeal` | `actions/deals.ts:createDeal()` | Computed safely via `MAX(dealID) + 1` query |
| **`DealHeader`** | `dtRegistered` | `dtRegistered` | `NewDealPage` -> `useCreateDealMutation` | `actions/deals.ts:createDeal()` | Parsed into `new Date()` |
| **`DealHeader`** | `expiration` | `expDt` | `NewDealPage` -> `useCreateDealMutation` | `actions/deals.ts:createDeal()` | Cast to string `String(payload.expDt)` |
| **`DealHeader`** | `expDt` | `expDt` | `NewDealPage` -> `useCreateDealMutation` | `actions/deals.ts:createDeal()` | Parsed into `new Date()` |
| **`DealHeader`** | `brand` | `brand` | `NewDealPage` | `actions/deals.ts:createDeal()` | Passed directly from validated Zod payload |
| **`DealHeader`** | `customerID` | `customerID` | `NewDealPage` | `actions/deals.ts:createDeal()` | Parsed using `parseInt(payload.customerID, 10)` or null |
| **`DealHeader`** | `dealRegID` | `dealRegID` | `NewDealPage` | `actions/deals.ts:createDeal()` | Passed directly from validated Zod payload |
| **`DealHeader`** | `ProjectName` | `projectName` (or `ProjectName`) | `NewDealPage` | `actions/deals.ts:createDeal()` | Fallback check: `payload.ProjectName || payload.projectName` |
| **`DealHeader`** | `AssignedAO` | `assignedAO` (or `AssignedAO`) | `NewDealPage` | `actions/deals.ts:createDeal()` | Fallback check: `payload.AssignedAO || payload.assignedAO` |
| **`DealHeader`** | `BU` | `bu` (or `BU`) | `NewDealPage` | `actions/deals.ts:createDeal()` | Fallback check: `payload.BU || payload.bu` |
| **`DealHeader`** | `dealStatus` | `dealStatus` | `NewDealPage` | `actions/deals.ts:createDeal()` | Cast to string `String(payload.dealStatus)` |
| **`DealHeader`** | `createdBy` | *Session Data* | `NextAuth` | `actions/deals.ts:createDeal()` | Extracted from `session?.user?.DomainAccount` |
| **`DealHeader`** | `custName` | `custName` | `NewDealPage` | `actions/deals.ts:createDeal()` | Passed directly from validated Zod payload |
| **`DealHeader`** | `remarks` | `remarks` | `NewDealPage` | `actions/deals.ts:createDeal()` | Optional: Fallback to `null` if empty |
| **`DealHeader`** | `dtCreated` | *System Generated* | `createDeal` | `actions/deals.ts:createDeal()` | Set dynamically to `new Date()` |
| **`DealHeader`** | `dtValidTo` | `expDt` | `NewDealPage` | `actions/deals.ts:createDeal()` | Maps directly to the `expDate` object |
| **`DealItems`** | `dealItemID` | *N/A* | `createDeal` | `actions/deals.ts:createDeal()` | Loop execution: computed via `MAX(dealItemID) + index` |
| **`DealItems`** | `dealID` | *N/A* | `createDeal` | `actions/deals.ts:createDeal()` | References computed `nextDealID` |
| **`DealItems`** | `itemDesc` | `items[].itemDesc` | `NewDealPage` | `actions/deals.ts:createDeal()` | Passed directly from Zod array schema |
| **`DealItems`** | `qty` | `items[].qty` | `NewDealPage` | `actions/deals.ts:createDeal()` | Cast to string `String(item.qty)` |
| **`DealItems`** | `currency` | `items[].currency` | `NewDealPage` | `actions/deals.ts:createDeal()` | Passed directly from Zod array schema |
| **`DealItems`** | `totalAmt` | `items[].totalAmt` | `NewDealPage` | `actions/deals.ts:createDeal()` | Cast to string `String(item.totalAmt)` |
| **`dealWTN`** | `id` | *N/A* | `createDeal` | `actions/deals.ts:createDeal()` | Computed safely via `MAX(id) + 1` |
| **`dealWTN`** | `dealID` | *N/A* | `createDeal` | `actions/deals.ts:createDeal()` | References computed `nextDealID` |
| **`dealWTN`** | `whenToNotify` | *Derived* | `createDeal` | `actions/deals.ts:createDeal()` | Logic: `now > (expDate - 10 days) ? now : (expDate - 10 days)` |
| **`deals_reg_notification`**| `email_id` | *N/A* | `createDeal` | `actions/deals.ts:createDeal()` | Computed safely via `MAX(email_id) + 1` |
| **`deals_reg_notification`**| `creator` | *Session Data* | `NextAuth` | `actions/deals.ts:createDeal()` | Extracted from `session?.user?.DomainAccount` |
| **`deals_reg_notification`**| `subject` | *Hardcoded* | `createDeal` | `actions/deals.ts:createDeal()` | Set to "Deal Registration: Created Deal Notification" |
| **`deals_reg_notification`**| `message` | *Derived* | `createDeal` | `actions/deals.ts:createDeal()` | HTML string constructed from payload/session metadata |
| **`deals_reg_notification`**| `sendTo` | *Derived* | `resolveDealEmailRecipients()`| `actions/deals.ts:createDeal()` | Resolved asynchronously based on AO and BU |
| **`deals_reg_notification`**| `status` | *System Generated* | `createDeal` | `actions/deals.ts:createDeal()` | Initialized to `0` (Pending sending status) |
| **`deals_reg_notification`**| `dateCreated` | *System Generated* | `createDeal` | `actions/deals.ts:createDeal()` | Set to `now()` |

---

### 3. Step-by-Step Execution Sequence

For the `Deal Registration (createDeal)` workflow, the backend bypasses the standard `prisma.<model>.create()` ORM wrappers inside the transaction due to database id generation constraints. It instead uses parameterized atomic raw executions (`tx.$executeRawUnsafe`). 

* **Frontend Entry:** `apps/deals/app/deals/new/page.tsx` (`<NewDealPage />`) via React Hook Form. Payload verified by `createDealSchema` (Zod).
* **Mutation Hook:** `hooks/useDealsQuery.ts` (`useCreateDealMutation`).
* **Server Action:** `apps/deals/app/actions/deals.ts` (`createDeal`).

#### Step A: DealHeader Insertion
* **Prisma Execution Call:**
  ```ts
  await tx.$executeRawUnsafe(
    `INSERT INTO [dbo].[DealHeader] (
      [dealID], [dtRegistered], [expiration], [expDt], [brand], [customerID], [dealRegID],
      [ProjectName], [AssignedAO], [BU], [dealStatus], [createdBy], [custName], [remarks],
      [dtCreated], [dtValidTo]
    ) VALUES (
      @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10, @P11, @P12, @P13, @P14, @P15, @P16
    )`,
    nextDealID, regDate, String(payload.expDt), expDate, payload.brand, customerIDVal, dealRegID,
    payload.ProjectName, payload.AssignedAO, payload.BU, String(payload.dealStatus),
    domainAccount, payload.custName, payload.remarks, now, expDate
  );
  ```

#### Step B: DealItems Insertion (Iterative)
* **Logic applied:** Calculates total deal amount by accumulating `totalAmt` of each item in the payload. Loops through the `items[]` array.
* **Prisma Execution Call:**
  ```ts
  await tx.$executeRawUnsafe(
    `INSERT INTO [dbo].[DealItems] ([dealItemID], [dealID], [itemDesc], [qty], [currency], [totalAmt])
     VALUES (@P1, @P2, @P3, @P4, @P5, @P6)`,
    currentItemId, nextDealID, item.itemDesc, String(item.qty), item.currency, String(item.totalAmt)
  );
  ```

#### Step C: DealWTN Insertion (When To Notify logic)
* **Prisma Execution Call:**
  ```ts
  await tx.$executeRawUnsafe(
    `INSERT INTO [dbo].[dealWTN] ([id], [dealID], [whenToNotify])
     VALUES (@P1, @P2, @P3)`,
    nextWtnId, nextDealID, whenToNotify
  );
  ```

#### Step D: deals_reg_notification Insertion (Conditional on BU)
* **Logic applied:** Condition bypassed if `BU === 'BU6'`. Triggers `resolveDealEmailRecipients` utility function.
* **Prisma Execution Call:**
  ```ts
  await tx.$executeRawUnsafe(
    `INSERT INTO [dbo].[deals_reg_notification] (
      [email_id], [creator], [subject], [message], [sendTo], [sendCC], [sendBCC], [dateCreated], [status]
    ) VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9)`,
    nextNotifId, domainAccount, 'Deal Registration: Created Deal Notification', messageHtml,
    recipients.sendTo, recipients.sendCC, recipients.sendBCC, now, 0
  );
  ```

---

### Unmapped Fields & Developer Flags
* The form conditionally permits `customerID` to be null if a manual override is executed (`customerIDVal = null`).
* `validityDays` is captured dynamically on the frontend to calculate `expDt`, but it is intentionally discarded before persistence, as `schema.prisma` relies entirely on fixed date boundaries (`dtRegistered` and `expDt`/`dtValidTo`).
* The Prisma operations bypass Standard API wrappers like `prisma.dealHeader.create()` largely to compute sequential IDs manually using sub-queries like `SELECT ISNULL(MAX(dealID), 0)`.
