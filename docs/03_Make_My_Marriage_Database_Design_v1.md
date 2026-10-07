---
title: "MAKE MY MARRIAGE"
subtitle: "Database Design Document (DDD) | Version 1.0"
date: "4 October 2026"
---

**Project:** Make My Marriage  
**Date:** 4 October 2026  
**Status:** MVP schema baseline; implementation review recommended  
**Stack:** Next.js / TypeScript / MongoDB Atlas / Better Auth / Cloudflare R2 / Resend  
**Primary users:** Couples and family organizers; guests use event invitations

> **Scope guardrail.** This document covers the planning MVP. It intentionally excludes a master guest directory, dress-code records, transactional marketplace orders, payment-gateway records and native livestream storage. Vendor records are manually entered planning contacts, not marketplace accounts.

# 1. Design principles

1. **Wedding is the tenant boundary.** Every wedding-owned collection contains `weddingId`, even if it also links to `eventId`. This makes access control and indexed queries consistent. This is internal metadata, **not** a master-guest feature.
2. **Reference independently changing records.** Do not embed unbounded guests, events, tasks, expenses or payments in a wedding document. Small, bounded objects such as a venue address can be embedded.
3. **Separate authentication data.** Better Auth owns its user, session, account and verification collections; application code only stores the returned authenticated user ID as a string.
4. **Single financial source of truth.** `expensePayments` preserves payment history; `expenses.paidPaise` is a transactional derived balance. Dashboard totals are aggregates of expenses rather than separately maintained dashboard documents.
5. **R2 owns file bytes.** MongoDB records object keys, media status and validated metadata; it never stores wedding image binaries or permanent public URLs.
6. **Prefer reversible changes.** Archive events, weddings and important financial data; revoke invitations and memberships; perform eventual cleanup of temporary uploads.
7. **MVP simplicity.** Avoid unnecessary collections, deep nesting, speculative marketplace models and caching infrastructure.

# 2. Key conventions

| Convention | Decision |
|---|---|
| Database name | `make_my_marriage` |
| App primary key | `_id: ObjectId` |
| App-to-app reference | `ObjectId` (`weddingId`, `eventId`, `expenseId`, etc.) |
| Auth references | Better Auth `user.id` stored **unchanged as string** in `ownerUserId`, `userId`, `createdByUserId`, etc. |
| Dates/timestamps | BSON `Date` in UTC for `createdAt`, `updatedAt`, `dueAt`, `expiresAt` and payment timestamps |
| Ceremony date | `localDate: "YYYY-MM-DD"`, tied to `weddings.timezone` (initially `Asia/Kolkata`) |
| Optional data | Omit absent optional fields or use explicit `null` consistently; application DTOs normalize input |
| Currency | INR; money uses integer paise, persisted consistently as BSON Int64 (`Long`) |
| Client money conversion | Convert rupees to paise at a controlled boundary; reject unsafe/non-integer paise; convert BSON Long to safe JSON numbers or decimal strings when necessary |
| State values | Uppercase enumerations |
| Schema changes | Migration scripts in source control; optionally record `schemaVersion: 1` on business documents |
| ID security | An ObjectId is an identifier, **not** an access token; authorize every access server-side |

**Why references?** MongoDB warns that arrays that grow without bounds can impair performance and approach its 16 MiB document limit. Independent collections are appropriate for the wedding's high-growth child records.

# 3. Relationship diagram

![Proposed relationship model](Make_My_Marriage_Database_ERD.png)

**Cardinality and ownership:** A user may be a member of many weddings; a wedding has many events. Each event can have many event-specific guests. A guest record can have multiple historical invitation records, but no more than one active invitation. An expense can have many manually recorded payments. A task or expense may be general to the wedding (no `eventId`) or assigned to a specific event.

# 4. Collection catalog

| Collection | Owner/scope | MVP purpose |
|---|---|---|
| Better Auth managed collections | Authentication | Users, sessions, password accounts, verification records |
| `weddings` | Owner + member access | Main workspace, wedding metadata and overall budget goal |
| `weddingMembers` | Wedding | Roles and optional editor finance permission |
| `memberInvites` | Wedding | Secure invitations to collaborate |
| `events` | Wedding | Haldi, Mehndi, Sangeet, ceremony, reception, custom events |
| `tasks` | Wedding, optional event | Responsibilities and due dates |
| `expenses` | Wedding, optional event | Estimated, committed and paid amounts |
| `expensePayments` | Expense | Manually recorded payment entries |
| `eventGuests` | Exactly one event | Independent event guest lists and RSVP state |
| `invitations` | One event guest | Personalized link lifecycle and token hashes |
| `vendorRecords` | Wedding, optional event | Manually saved vendor details |
| `mediaAssets` | Wedding, optional event | R2 media metadata and setup references |

There are **11 application-owned collections**. Better Auth collection names and fields should be generated/maintained by the installed adapter and verified against its pinned package version rather than hand-modified.

# 5. Detailed collection definitions

A field labeled **R** is required; **O** is optional. Every application collection also has `_id: ObjectId` (R) and typically `createdAt: Date` (R), `updatedAt: Date` (R) where updates are supported.

## 5.1 `weddings`

| Field | BSON / domain type | Requirement / rule |
|---|---|---|
| `_id` | ObjectId | R; primary key |
| `title` | String | R; trimmed, 2–120 characters |
| `brideName`, `groomName` | String | O; trimmed, 2–120 characters each; collected by wedding onboarding |
| `ownerUserId` | String | R; immutable Better Auth ID unless a future ownership-transfer workflow is designed |
| `weddingDate` | String | R; valid `YYYY-MM-DD`, used for initial countdown |
| `timezone` | String | R; MVP default `Asia/Kolkata` |
| `city` | String | O; max 120 characters |
| `description` | String | O; max 1,000 characters |
| `coverMediaAssetId` | ObjectId | O; references READY media asset in same wedding |
| `targetBudgetPaise` | Int64 | O; non-negative wedding-wide goal; **not** added to spending |
| `generalBudgetAllocationPaise` | Int64 | O; non-negative allocation for costs not assigned to an event |
| `status` | Enum | R; `ACTIVE`, `ARCHIVED` |
| `schemaVersion` | Int32 | R; initially `1` |
| `createdAt`, `updatedAt` | Date | R |

**Invariant:** At creation, insert wedding and Owner membership together in a transaction. One active Owner must exist for every active wedding.

## 5.2 `weddingMembers`

| Field | Type | Requirement / rule |
|---|---|---|
| `_id` | ObjectId | R |
| `weddingId` | ObjectId | R; wedding reference |
| `userId` | String | R; Better Auth ID |
| `role` | Enum | R; `OWNER`, `EDITOR`, `VIEWER` |
| `financeAccess` | Boolean | R; true for Owner, configurable for Editor, false for Viewer |
| `status` | Enum | R; `ACTIVE`, `REMOVED` |
| `joinedAt` | Date | R |
| `removedAt` | Date | O |
| `createdAt`, `updatedAt` | Date | R |

**Invariant:** One membership per `(weddingId, userId)`, including removed members; rejoining reactivates the record. Only Owner changes roles. Optional partial unique index enforces at most one active Owner.

## 5.3 `memberInvites`

| Field | Type | Requirement / rule |
|---|---|---|
| `_id`, `weddingId` | ObjectId | R |
| `emailNormalized` | String | R; lowercase, trimmed valid email |
| `proposedRole` | Enum | R; MVP `EDITOR` or `VIEWER` |
| `financeAccess` | Boolean | R; relevant only for Editor |
| `tokenHash` | String | R; SHA-256 of random token; unique |
| `status` | Enum | R; `PENDING`, `ACCEPTED`, `REVOKED` |
| `expiresAt` | Date | R; checked on every acceptance |
| `invitedByUserId` | String | R |
| `acceptedByUserId` | String | O |
| `acceptedAt`, `revokedAt` | Date | O |
| `createdAt`, `updatedAt` | Date | R |

Do **not** automatically delete these documents via a TTL index: expiry and revocation may need audit history. Match the recipient's verified authenticated email before membership creation.

## 5.4 `events`

| Field | Type | Requirement / rule |
|---|---|---|
| `_id`, `weddingId` | ObjectId | R |
| `title` | String | R; 2–100 characters |
| `eventType` | Enum/String | R; `HALDI`, `MEHNDI`, `SANGEET`, `WEDDING`, `RECEPTION`, `CUSTOM` |
| `localDate` | String | R; valid `YYYY-MM-DD` |
| `startTime` | String | O; valid local `HH:mm` |
| `endTime` | String | O; valid local `HH:mm`; if overnight support is added, also use `endLocalDate` |
| `venue` | Embedded object | O; `{name?, address?, mapUrl?}` |
| `description` | String | O; max 2,000 characters |
| `allocatedBudgetPaise` | Int64 | O; non-negative |
| `invitationMessage` | String | O; max 1,000 characters; shared event copy, not guest secret |
| `status` | Enum | R; `DRAFT`, `SCHEDULED`, `COMPLETED`, `ARCHIVED` |
| `createdByUserId` | String | R |
| `createdAt`, `updatedAt` | Date | R |

An event must always belong to the wedding addressed by the request. Archiving must retain associated guest and expense history.

## 5.5 `tasks`

| Field | Type | Requirement / rule |
|---|---|---|
| `_id`, `weddingId` | ObjectId | R |
| `eventId` | ObjectId | O; if provided, must belong to same wedding |
| `title` | String | R; 2–160 characters |
| `description` | String | O; max 2,000 characters |
| `assignedToUserId` | String | O; must be active wedding member at assignment time |
| `priority` | Enum | R; `LOW`, `MEDIUM`, `HIGH` |
| `status` | Enum | R; `TODO`, `IN_PROGRESS`, `COMPLETED` |
| `dueAt` | Date | O; UTC |
| `completedAt` | Date | O; set/cleared with status |
| `createdByUserId` | String | R |
| `createdAt`, `updatedAt` | Date | R |

No separate global task collection is required; a task lacking `eventId` is a wedding-level task.

## 5.6 `expenses`

| Field | Type | Requirement / rule |
|---|---|---|
| `_id`, `weddingId` | ObjectId | R |
| `eventId` | ObjectId | O; same-wedding event only |
| `title` | String | R; 2–160 characters |
| `category` | String | R; simple controlled values such as `CATERING`, `DECOR`, `VENUE`, `PHOTO`, `OTHER` |
| `estimatedPaise` | Int64 | R; non-negative; default 0 |
| `committedPaise` | Int64 | R; non-negative; default 0 |
| `paidPaise` | Int64 | R; non-negative transactional balance; default 0 |
| `vendorRecordId` | ObjectId | O; same wedding, if linked |
| `notes` | String | O; max 2,000 characters |
| `status` | Enum | R; `ACTIVE`, `VOIDED` |
| `createdByUserId` | String | R |
| `createdAt`, `updatedAt` | Date | R |

**Invariant:** `0 <= paidPaise <= committedPaise`. If cost decreases below paidPaise, reject until a supported correction/reversal workflow has resolved the mismatch. Voiding must preserve history and require an Owner/finance-authorized action.

## 5.7 `expensePayments`

| Field | Type | Requirement / rule |
|---|---|---|
| `_id`, `expenseId`, `weddingId` | ObjectId | R |
| `amountPaise` | Int64 | R; strictly positive |
| `paidAt` | Date | R; when payment reportedly happened |
| `method` | Enum | O; `CASH`, `UPI`, `BANK_TRANSFER`, `CARD`, `OTHER` |
| `idempotencyKey` | String | R; generated once per create-payment attempt |
| `status` | Enum | R; `RECORDED`, `VOIDED` |
| `notes` | String | O; max 500 characters |
| `recordedByUserId` | String | R |
| `createdAt` | Date | R |
| `voidedAt`, `voidedByUserId` | Date / String | O |

**Atomic payment creation:** In one MongoDB transaction, first perform a guarded `$inc` on `expenses.paidPaise` that refuses an overpayment, and insert the payment with a unique `(expenseId, idempotencyKey)`. Use a transaction/retry policy, never two independent writes. Handle correction/voiding in an inverse transaction; do not silently delete audit records.

**Important:** This MVP tracks manually recorded payments, not payments processed by Make My Marriage.

## 5.8 `eventGuests` — no master guest directory

| Field | Type | Requirement / rule |
|---|---|---|
| `_id`, `weddingId`, `eventId` | ObjectId | R; same-wedding references |
| `name` | String | R; 2–120 characters |
| `emailNormalized` | String | O; validate if present |
| `phone` | String | O; normalized if supplied |
| `invitationStatus` | Enum | R; `NOT_SENT`, `SENT` |
| `rsvpStatus` | Enum | R; `PENDING`, `ACCEPTED`, `DECLINED` |
| `rsvpUpdatedAt` | Date | O |
| `createdAt`, `updatedAt` | Date | R |

Duplicate guest names are valid. No global unique email/phone index is used. Copying a guest to another event creates **another independent record**. A `weddingId` here is only a tenant filter, not a master guest entity.

## 5.9 `invitations`

| Field | Type | Requirement / rule |
|---|---|---|
| `_id`, `weddingId`, `eventId`, `eventGuestId` | ObjectId | R; verified same-wedding chain |
| `tokenHash` | String | R; SHA-256 hash of a cryptographically random opaque token; unique |
| `status` | Enum | R; `ACTIVE`, `REVOKED` |
| `expiresAt` | Date | O; expiration is checked when used |
| `createdByUserId` | String | R |
| `lastRespondedAt` | Date | O |
| `revokedAt` | Date | O |
| `createdAt`, `updatedAt` | Date | R |

Historical revoked invitations are retained. At most one `ACTIVE` invitation is allowed per `eventGuestId`. To rotate a link, revoke the old link and create the new one atomically. Public endpoints return only the guest's invited event information and RSVP controls.

## 5.10 `vendorRecords`

| Field | Type | Requirement / rule |
|---|---|---|
| `_id`, `weddingId` | ObjectId | R |
| `eventId` | ObjectId | O; same-wedding event |
| `businessName` | String | R; 2–160 characters |
| `category` | String | R; e.g., decorator, photographer, caterer |
| `contactName` | String | O |
| `phone`, `emailNormalized` | String | O |
| `notes` | String | O; max 2,000 characters |
| `createdByUserId` | String | R |
| `createdAt`, `updatedAt` | Date | R |

**No marketplace vendor account here.** Costs, agreed price and payment history belong in `expenses` / `expensePayments`. Do not duplicate a competing financial total on a vendor record.

## 5.11 `mediaAssets`

| Field | Type | Requirement / rule |
|---|---|---|
| `_id`, `weddingId` | ObjectId | R |
| `eventId` | ObjectId | O; required for event setup references |
| `category` | Enum | R; `WEDDING_COVER`, `SETUP_REFERENCE`, `INVITATION_BACKGROUND` |
| `provider` | Enum | R; `R2` |
| `objectKey` | String | R; unique, randomized, wedding-scoped |
| `originalFilename` | String | R; sanitized display value, not trusted for object path |
| `mimeType` | String | R; allowlist, initially JPEG/PNG/WebP |
| `sizeBytes` | Number | R; initially up to 5 MiB per file |
| `status` | Enum | R; `PENDING`, `READY`, `REJECTED`, `DELETED` |
| `caption`, `notes` | String | O; used for decoration reference boards |
| `uploadedByUserId` | String | R |
| `createdAt`, `confirmedAt`, `deletedAt` | Date | `createdAt` R; others O |

Never accept a browser-submitted public URL as proof that a media upload succeeded. The backend must verify the object in R2 before setting `READY`. Clean up abandoned `PENDING` uploads through an explicit maintenance task.

# 6. Index plan (initial set)

Create only indexes tied to current screens and invariants. All collections already have the `_id` index.

| Collection | Index | Why |
|---|---|---|
| `weddingMembers` | unique `{weddingId:1, userId:1}` | Prevent duplicate memberships |
| `weddingMembers` | unique partial `{weddingId:1, role:1}` where `role=OWNER`, `status=ACTIVE` | At most one active Owner |
| `memberInvites` | unique `{tokenHash:1}` | Secure link lookup |
| `memberInvites` | `{weddingId:1, status:1}` | Pending invites |
| `events` | `{weddingId:1, localDate:1}` | Chronological event list |
| `tasks` | `{weddingId:1, status:1, dueAt:1}` | Dashboard/pending tasks |
| `tasks` | `{weddingId:1, eventId:1}` | Per-event tasks |
| `expenses` | `{weddingId:1, eventId:1, status:1}` | Per-event and general summaries |
| `expensePayments` | `{expenseId:1, createdAt:1}` | Payment history |
| `expensePayments` | unique `{expenseId:1, idempotencyKey:1}` | Block duplicate payment requests |
| `eventGuests` | `{weddingId:1, eventId:1, rsvpStatus:1}` | Guest list/counts |
| `invitations` | unique `{tokenHash:1}` | Public invitation lookup |
| `invitations` | unique partial `{eventGuestId:1}` where `status=ACTIVE` | One active link per guest record |
| `vendorRecords` | `{weddingId:1, eventId:1}` | Event vendor list |
| `mediaAssets` | unique `{objectKey:1}` | Storage key uniqueness |
| `mediaAssets` | `{weddingId:1, eventId:1, category:1, status:1}` | Gallery/setup queries |

Do not use TTL for issued invitations, family invites or financial history. Even expired tokens must be rejected by application logic; a TTL monitor is not a precise access-control mechanism.

# 7. Important consistency checks

**Check A — tenant isolation:** Query protected records by both `_id` and `weddingId`, after verifying an active membership. Verify that a supplied `eventId` belongs to the same `weddingId` before inserting a child.

**Check B — one Owner:** Create the wedding and Owner membership in one transaction. A partial unique index enforces the at-most-one invariant; application creation/recovery logic enforces at-least-one.

**Check C — authenticated users:** Store the exact Better Auth `user.id` string, rather than assuming it is interchangeable with MongoDB ObjectId.

**Check D — money:** Convert UI rupee entries to validated integer paise; bound each value to a safe range; perform payment writes with a guarded update and transaction; don't mutate totals in browser code as the source of truth.

**Check E — invitation security:** Hash random link tokens, validate expiry/status and avoid leaking other event guests or private wedding information.

**Check F — cross-collection checks:** MongoDB schema validators enforce shapes and basic constraints; they do not replace service-layer checks for parent/child relationships, membership and business rules.

# 8. Example application records

These are illustrative MongoDB-shell documents, not actual user data. Better Auth's user and session documents are deliberately omitted because its adapter owns their layout.

```javascript
// weddings
{
  _id: ObjectId("66fa00000000000000000001"),
  title: "Aarav & Nisha Wedding",
  ownerUserId: "auth_user_123",
  weddingDate: "2027-02-15",
  timezone: "Asia/Kolkata",
  city: "Lucknow",
  targetBudgetPaise: Long.fromNumber(120000000), // Rs 12,00,000
  generalBudgetAllocationPaise: Long.fromNumber(10000000),
  status: "ACTIVE", schemaVersion: 1,
  createdAt: ISODate("2026-10-04T06:00:00Z"),
  updatedAt: ISODate("2026-10-04T06:00:00Z")
}

// events
{
  _id: ObjectId("66fa00000000000000000002"),
  weddingId: ObjectId("66fa00000000000000000001"),
  title: "Haldi", eventType: "HALDI", localDate: "2027-02-13",
  startTime: "10:00", venue: {name: "Family Home"},
  allocatedBudgetPaise: Long.fromNumber(10000000),
  status: "SCHEDULED", createdByUserId: "auth_user_123",
  createdAt: ISODate("2026-10-04T06:05:00Z"),
  updatedAt: ISODate("2026-10-04T06:05:00Z")
}

// eventGuests - NO master guest record
{
  _id: ObjectId("66fa00000000000000000003"),
  weddingId: ObjectId("66fa00000000000000000001"),
  eventId: ObjectId("66fa00000000000000000002"),
  name: "Rahul Sharma", invitationStatus: "SENT",
  rsvpStatus: "PENDING",
  createdAt: ISODate("2026-10-04T06:10:00Z"),
  updatedAt: ISODate("2026-10-04T06:10:00Z")
}

// expenses
{
  _id: ObjectId("66fa00000000000000000004"),
  weddingId: ObjectId("66fa00000000000000000001"),
  eventId: ObjectId("66fa00000000000000000002"),
  title: "Haldi decoration", category: "DECOR",
  estimatedPaise: Long.fromNumber(2200000),
  committedPaise: Long.fromNumber(2000000),
  paidPaise: Long.fromNumber(500000),
  status: "ACTIVE", createdByUserId: "auth_user_123",
  createdAt: ISODate("2026-10-04T06:12:00Z"),
  updatedAt: ISODate("2026-10-04T06:12:00Z")
}
```

# 9. Application validation and database validation

**Level 1 — Zod:** Validate incoming request fields, string lengths, enums, date strings, integer paise, IDs and context-sensitive fields. Normalize email input and reject unsafe monetary conversions.

**Level 2 — MongoDB `$jsonSchema`:** Reject malformed critical stored records (required fields, BSON types, simple enums and non-negative amounts). Validation rules are versioned with schema migration scripts.

**Level 3 — services/transactions:** Enforce same-wedding references, one Owner, access permissions, correct guest/invitation relationships and financial invariants. These cannot be guaranteed by simple document-shape validation alone.

# 10. Query patterns and dashboard aggregation

| Screen | Collection access |
|---|---|
| My accessible weddings | `weddingMembers` by `userId` and ACTIVE; then `weddings` |
| Event list | `events` by `weddingId`, sort `localDate` |
| Pending tasks | `tasks` by `weddingId`, filter status, sort `dueAt` |
| Haldi guest list | `eventGuests` by BOTH `weddingId` and `eventId` |
| Haldi confirmed count | `eventGuests` same event, `rsvpStatus=ACCEPTED` |
| Wedding expenses | `expenses` by `weddingId`, `status=ACTIVE` |
| Event expenses | `expenses` by `weddingId`, `eventId`, `status=ACTIVE` |
| Financial outstanding | aggregate `committedPaise - paidPaise` on active expenses |
| Media board | `mediaAssets` by `weddingId`, `eventId`, category and READY |

**Guest count note:** The sum of event invitations is an **event invitation total**, not the number of unique real people invited to the wedding. Do not display the latter without a different identity model, which is excluded from this MVP.

# 11. Data lifecycle and deletion

| Record | MVP action |
|---|---|
| Wedding | Archive; restrict normal operations; future deletion workflow requires cascade plan |
| Event | Archive with tasks/expenses/guest history retained |
| Wedding member | Mark REMOVED and immediately deny subsequent access |
| Member invitation | Revoke or reject if expired; retain status history |
| Event guest | Organizer may remove; define whether associated invitation is revoked and record soft deletion for audit as needed |
| Invitation | Revoke/rotate; do not expose raw token after creation |
| Expense/payment | Preserve history; use controlled VOIDED/correction logic |
| Media upload | PENDING → READY/REJECTED; cleanup abandoned uploads; delete R2 objects through authorized process |

Before collecting real family information, specify retention, consent, account deletion, backup and restoration procedures. MongoDB Atlas Free has no managed cloud backups; create and test an independent export/restore plan.

# 12. Implementation and testing checklist

- [ ] Pin compatible versions of MongoDB driver, Better Auth and its MongoDB adapter.
- [ ] Build a shared MongoClient connection module.
- [ ] Verify Better Auth's actual created auth collections and ID formats.
- [ ] Implement Zod schemas for every app-owned collection/DTO.
- [ ] Create critical indexes using a versioned setup script.
- [ ] Test wedding + Owner transaction and one-owner invariant.
- [ ] Test cross-wedding denial on every protected resource endpoint.
- [ ] Test guest records copied to separate events with independent RSVP status.
- [ ] Test invitation token uniqueness, revocation, expiry and RSVP retries.
- [ ] Test payment idempotency, overpayment rejection and concurrent updates.
- [ ] Test financial aggregates against payment-history data.
- [ ] Test R2 object verification, private viewing and cleanup.
- [ ] Add fixture data with fabricated wedding and guest identities.
- [ ] Run and verify database backup/restore procedure.

# 13. Design review decisions still open

The following details can be finalized at API/implementation design, without reopening the core architecture:

1. Invitation expiry policy (for example, event date plus a defined grace period).
2. Whether guest names alone are sufficient or contact information should be required before sending a personalized link.
3. Whether the first MVP exposes payment void/correction UI or allows only Owner-assisted corrections.
4. Whether general wedding budget allocation is optional when users only enter a target budget.
5. Exact request-side validators and migration script organization.

# 14. References for implementation

- MongoDB: Avoid Unbounded Arrays — https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/unbounded-arrays/
- MongoDB: Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Node.js Driver: Transactions — https://www.mongodb.com/docs/drivers/node/current/crud/transactions/
- Better Auth: MongoDB Adapter — https://better-auth.com/docs/adapters/mongo
- Better Auth: Database — https://better-auth.com/docs/concepts/database

**End of Database Design Document, v1.0**
