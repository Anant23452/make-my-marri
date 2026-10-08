---
title: "MAKE MY MARRIAGE"
subtitle: "API Documentation | Version 1.0"
date: "4 October 2026"
---

**Project:** Make My Marriage  
**API Version:** v1  
**Status:** MVP contract baseline  
**Architecture:** Next.js modular monolith  
**Runtime:** Node.js  
**Database:** MongoDB Atlas  
**Authentication:** Better Auth (email/password)  
**Email:** Resend  
**Object Storage:** Cloudflare R2  
**Primary clients:** Make My Marriage responsive web app; public invitation pages

> **Scope guardrail.** This API covers the planning MVP only. It does not include a vendor marketplace, online vendor payments, master guest management, dress-code features, native livestreaming, or advanced 2D/3D wedding setup.

# 1. API design goals

The API should be:

1. **Simple for one Next.js application to consume.**
2. **Secure by default.** Every private wedding resource requires server-side membership and permission checks.
3. **Wedding-scoped.** `weddingId` is the tenant boundary for private business data.
4. **Predictable.** Endpoints use consistent HTTP methods, status codes, validation and response formats.
5. **Safe for financial writes.** Payment creation uses idempotency and transactional rules.
6. **Guest-friendly.** RSVP endpoints do not require account creation but use secure invitation tokens.
7. **Expandable.** Future marketplace APIs can be added without changing the MVP resource model.

# 2. Base paths and versioning

## Application API

```text
Development:  http://localhost:3000/api/v1
Production:   https://<app-domain>/api/v1
```

All Make My Marriage business APIs use `/api/v1`.

## Authentication API

Better Auth owns its route tree separately:

```text
/api/auth/*
```

The application should mount Better Auth through the framework integration and should not duplicate password or session endpoints under `/api/v1`.

## Public invitation API

Guest invitation endpoints live under:

```text
/api/v1/public/invitations/*
```

They do not require an authenticated organizer session; the invitation token is the guest credential for that invitation only.

# 3. General conventions

## 3.1 Content type

Requests and responses use JSON unless the endpoint returns no body.

```http
Content-Type: application/json
```

Image bytes are uploaded directly to Cloudflare R2 using presigned URLs; they do not pass through the application API body.

## 3.2 Identifiers

Application entities use MongoDB ObjectId strings in API payloads.

Example:

```json
{
  "weddingId": "66fa00000000000000000001"
}
```

Better Auth user IDs remain strings and must not be converted to ObjectIds.

## 3.3 Dates and times

- Timestamps are ISO 8601 UTC strings.
- Wedding/event local calendar dates use `YYYY-MM-DD`.
- Local event times use `HH:mm`.
- The wedding timezone is authoritative for local event scheduling; initial default is `Asia/Kolkata`.

Example:

```json
{
  "localDate": "2027-02-13",
  "startTime": "10:00",
  "createdAt": "2026-10-04T06:05:00.000Z"
}
```

## 3.4 Money

The API uses integer **paise** for stored and write-side monetary values.

```json
{
  "committedPaise": 2000000
}
```

`2000000` paise = ₹20,000.

The server is the source of truth for all financial calculations.

## 3.5 Boolean permissions

Role and finance permissions are always checked on the server. A client-provided role is never trusted for authorization.

# 4. Standard response format

## 4.1 Success

Single-resource response:

```json
{
  "success": true,
  "data": {
    "id": "66fa00000000000000000001",
    "title": "Aarav & Nisha Wedding"
  }
}
```

Collection response:

```json
{
  "success": true,
  "data": [
    {
      "id": "66fa00000000000000000001",
      "title": "Aarav & Nisha Wedding"
    }
  ],
  "meta": {
    "nextCursor": null
  }
}
```

## 4.2 Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request data is invalid.",
    "fieldErrors": {
      "title": ["Title must contain at least 2 characters."]
    },
    "requestId": "req_01J..."
  }
}
```

Production responses must not expose database stack traces, secrets, raw driver errors or internal filesystem paths.

# 5. HTTP status conventions

| Status | Meaning |
|---|---|
| `200 OK` | Successful read/update/action |
| `201 Created` | Resource created |
| `204 No Content` | Successful action with no response body |
| `400 Bad Request` | Invalid request syntax or business input |
| `401 Unauthorized` | No valid authenticated session where one is required |
| `403 Forbidden` | Authenticated but not permitted |
| `404 Not Found` | Resource unavailable or intentionally hidden from caller |
| `409 Conflict` | State conflict, duplicate operation, invalid transition |
| `422 Unprocessable Entity` | Well-formed request failing detailed validation/business rules |
| `429 Too Many Requests` | Rate limit / abuse protection |
| `500 Internal Server Error` | Unexpected server failure |
| `503 Service Unavailable` | Required dependency temporarily unavailable |

For private tenant resources, the implementation may return `404` instead of `403` when revealing resource existence would expose another wedding's data.

# 6. Error codes

Initial application-level error codes:

| Code | Usage |
|---|---|
| `VALIDATION_ERROR` | Zod/input validation failed |
| `AUTH_REQUIRED` | Login required |
| `EMAIL_NOT_VERIFIED` | Verified account required for operation |
| `FORBIDDEN` | Permission denied |
| `RESOURCE_NOT_FOUND` | Resource not found / not visible |
| `WEDDING_ARCHIVED` | Operation blocked because wedding is archived |
| `EVENT_ARCHIVED` | Operation blocked because event is archived |
| `MEMBER_ALREADY_EXISTS` | User already belongs to wedding |
| `INVITE_ALREADY_PENDING` | Equivalent active family invitation exists |
| `INVITE_INVALID` | Family invitation invalid/revoked/expired |
| `INVITATION_INVALID` | Guest invitation invalid/revoked/expired |
| `PAYMENT_EXCEEDS_COMMITTED` | Recorded payment would overpay expense |
| `IDEMPOTENCY_CONFLICT` | Key reused with incompatible request |
| `UPLOAD_INVALID` | Proposed media upload rejected |
| `UPLOAD_NOT_FOUND` | Expected R2 object could not be verified |
| `RATE_LIMITED` | Request throttled |
| `INTERNAL_ERROR` | Unexpected server failure |

# 7. Authentication and authorization

## 7.1 Organizer authentication

Couples/family members use Better Auth email/password sessions.

Business APIs identify the session on the server. Clients do not pass `userId` to impersonate another user.

## 7.2 Wedding roles

| Capability | OWNER | EDITOR | VIEWER |
|---|:---:|:---:|:---:|
| View wedding | Yes | Yes | Yes |
| Edit wedding basics | Yes | Yes | No |
| Manage events | Yes | Yes | No |
| Manage tasks | Yes | Yes | No |
| Manage event guests | Yes | Yes | No |
| Manage guest invitations | Yes | Yes | No |
| Manage vendors/setup media | Yes | Yes | No |
| View finances | Yes | Only if `financeAccess=true` | No |
| Modify finances | Yes | Only if `financeAccess=true` | No |
| Invite/remove family | Yes | No | No |
| Change roles | Yes | No | No |
| Archive wedding | Yes | No | No |

## 7.3 Authorization sequence

For every protected wedding request:

```text
Session
  → active WeddingMember lookup
  → role/capability check
  → resource weddingId verification
  → business operation
```

Nested IDs such as `eventId`, `expenseId`, `guestId` or `vendorId` must be checked against the route's `weddingId`; an ID alone is never sufficient authorization.

# 8. Pagination, filtering and sorting

Small prototype screens can initially return bounded lists, but collection endpoints should support cursor pagination where growth is expected.

Common query parameters:

```text
?limit=25
?cursor=<opaque-cursor>
?status=TODO
?eventId=<id>
?sort=dueAt
?order=asc
```

Rules:

- Default `limit`: 25.
- Maximum `limit`: 100.
- Cursors should be opaque to clients.
- Unsupported filter/sort values return `400`.

# 9. Endpoint overview

## 9.1 Weddings

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/weddings` | Authenticated | List accessible weddings |
| POST | `/weddings` | Authenticated | Create wedding + Owner membership |
| GET | `/weddings/{weddingId}` | Member | Get wedding |
| PATCH | `/weddings/{weddingId}` | Owner/Editor | Update basics |
| POST | `/weddings/{weddingId}/archive` | Owner | Archive wedding |
| GET | `/weddings/{weddingId}/dashboard` | Member | Get dashboard summary |

## 9.2 Family collaboration

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/weddings/{weddingId}/members` | Owner | List active members; collaborators receive 403 |
| POST | `/weddings/{weddingId}/member-invites` | Owner | Invite family member |
| GET | `/weddings/{weddingId}/member-invites` | Owner | List pending/history |
| POST | `/weddings/{weddingId}/member-invites/{inviteId}/revoke` | Owner | Revoke pending invite |
| POST | `/member-invites/{token}/accept` | Authenticated verified user | Accept invitation |
| PATCH | `/weddings/{weddingId}/members/{memberId}` | Owner | Change role/finance access |
| DELETE | `/weddings/{weddingId}/members/{memberId}` | Owner | Remove member |

## 9.3 Events

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/weddings/{weddingId}/events` | Member | List events |
| POST | `/weddings/{weddingId}/events` | Owner/Editor | Create event |
| GET | `/weddings/{weddingId}/events/{eventId}` | Member | Get event |
| PATCH | `/weddings/{weddingId}/events/{eventId}` | Owner/Editor | Update event |
| POST | `/weddings/{weddingId}/events/{eventId}/archive` | Owner/Editor | Archive event |

## 9.4 Tasks

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/weddings/{weddingId}/tasks` | Member | List/filter tasks |
| POST | `/weddings/{weddingId}/tasks` | Owner/Editor | Create task |
| GET | `/weddings/{weddingId}/tasks/{taskId}` | Member | Get task |
| PATCH | `/weddings/{weddingId}/tasks/{taskId}` | Owner/Editor | Update task/status |

## 9.5 Expenses and payments

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/weddings/{weddingId}/expenses` | Finance access | List expenses |
| POST | `/weddings/{weddingId}/expenses` | Finance access | Create expense |
| GET | `/weddings/{weddingId}/expenses/{expenseId}` | Finance access | Expense details |
| PATCH | `/weddings/{weddingId}/expenses/{expenseId}` | Finance access | Update expense |
| POST | `/weddings/{weddingId}/expenses/{expenseId}/void` | Finance access | Void expense |
| GET | `/weddings/{weddingId}/expenses/{expenseId}/payments` | Finance access | Payment history |
| POST | `/weddings/{weddingId}/expenses/{expenseId}/payments` | Finance access | Record payment |
| POST | `/weddings/{weddingId}/expenses/{expenseId}/payments/{paymentId}/void` | Owner or allowed finance policy | Reverse recorded payment |

## 9.6 Event guests

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/weddings/{weddingId}/events/{eventId}/guests` | Member | List event guests |
| POST | `/weddings/{weddingId}/events/{eventId}/guests` | Owner/Editor | Add guest |
| GET | `/weddings/{weddingId}/events/{eventId}/guests/{guestId}` | Member | Get guest |
| PATCH | `/weddings/{weddingId}/events/{eventId}/guests/{guestId}` | Owner/Editor | Update guest |
| DELETE | `/weddings/{weddingId}/events/{eventId}/guests/{guestId}` | Owner/Editor | Remove guest + revoke active link |
| POST | `/weddings/{weddingId}/events/{eventId}/guests/copy` | Owner/Editor | Copy selected guests from another event |

There is intentionally **no** `/guests` master endpoint.

## 9.7 Guest invitations and RSVP

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| POST | `/weddings/{weddingId}/events/{eventId}/guests/{guestId}/invitation` | Owner/Editor | Create/rotate guest link |
| POST | `/weddings/{weddingId}/events/{eventId}/guests/{guestId}/invitation/revoke` | Owner/Editor | Revoke active link |
| GET | `/public/invitations/{token}` | Token | View personalized invitation |
| POST | `/public/invitations/{token}/rsvp` | Token | Accept/decline |

## 9.8 Manual vendors

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/weddings/{weddingId}/vendors` | Member | List vendor records |
| POST | `/weddings/{weddingId}/vendors` | Owner/Editor | Create vendor record |
| GET | `/weddings/{weddingId}/vendors/{vendorId}` | Member | Vendor detail |
| PATCH | `/weddings/{weddingId}/vendors/{vendorId}` | Owner/Editor | Update vendor |
| DELETE | `/weddings/{weddingId}/vendors/{vendorId}` | Owner/Editor | Delete manual vendor record |

## 9.9 Media / wedding setup

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| GET | `/weddings/{weddingId}/media` | Member | List authorized media metadata |
| POST | `/weddings/{weddingId}/media/upload-url` | Owner/Editor | Create R2 upload authorization |
| POST | `/weddings/{weddingId}/media/{mediaId}/complete` | Owner/Editor | Verify upload and mark READY |
| GET | `/weddings/{weddingId}/media/{mediaId}/view-url` | Member | Get temporary private URL |
| PATCH | `/weddings/{weddingId}/media/{mediaId}` | Owner/Editor | Update caption/notes |
| DELETE | `/weddings/{weddingId}/media/{mediaId}` | Owner/Editor | Delete media securely |

# 10. Wedding endpoints

## 10.1 List weddings

```http
GET /api/v1/weddings
```

Returns weddings where the caller has an active membership.

### Response `200`

```json
{
  "success": true,
  "data": [
    {
      "id": "66fa00000000000000000001",
      "title": "Aarav & Nisha Wedding",
      "weddingDate": "2027-02-15",
      "city": "Lucknow",
      "status": "ACTIVE",
      "myRole": "OWNER",
      "financeAccess": true
    }
  ]
}
```

## 10.2 Create wedding

One wedding may be created per authenticated owner, including archived weddings. Repeated/concurrent attempts return `409` with `CONFLICT`. A unique ownership claim is committed with the wedding and Owner membership. Existing historical duplicates remain accessible but prevent additional creation. Collaboration membership in another wedding is permitted.

Onboarding may additionally send optional `brideName` and `groomName` (trimmed, 2–120 characters each). These are stored on the wedding; an editable title remains required. The current onboarding slice accepts title, names, date, city, and Asia/Kolkata timezone. Budget input is deferred to the finance milestone.

```http
POST /api/v1/weddings
```

### Request

```json
{
  "title": "Aarav & Nisha Wedding",
  "weddingDate": "2027-02-15",
  "city": "Lucknow",
  "timezone": "Asia/Kolkata",
  "targetBudgetPaise": 120000000
}
```

### Server behavior

In one transaction:

1. Insert `weddings`.
2. Insert `weddingMembers` with the current user as `OWNER`, `financeAccess=true`.

### Response `201`

```json
{
  "success": true,
  "data": {
    "id": "66fa00000000000000000001",
    "title": "Aarav & Nisha Wedding",
    "status": "ACTIVE",
    "myRole": "OWNER"
  }
}
```

## 10.3 Get wedding

```http
GET /api/v1/weddings/{weddingId}
```

Returns the wedding and caller-specific permission summary.

## 10.4 Update wedding

```http
PATCH /api/v1/weddings/{weddingId}
```

### Example request

```json
{
  "city": "Lucknow",
  "targetBudgetPaise": 125000000
}
```

Only supplied fields are changed.

## 10.5 Archive wedding

```http
POST /api/v1/weddings/{weddingId}/archive
```

Owner only. Sets `status=ARCHIVED`; does not cascade-delete planning history.

## 10.6 Dashboard

Current implementation (8 October 2026): wedding metadata, wedding-local countdown, caller role/relationship/capabilities, and Owner-only family invitation counts are live. `family` is omitted entirely for non-Owners. Unbuilt events/tasks/guest summaries return `status: COMING_SOON` rather than fabricated totals. Finance returns permission-derived `visible` and `status: COMING_SOON` without amounts. The expanded response below remains the future full-dashboard contract.

```http
GET /api/v1/weddings/{weddingId}/dashboard
```

### Response `200`

```json
{
  "success": true,
  "data": {
    "wedding": {
      "id": "66fa00000000000000000001",
      "title": "Aarav & Nisha Wedding",
      "weddingDate": "2027-02-15"
    },
    "events": {
      "total": 5,
      "upcoming": [
        {
          "id": "66fa00000000000000000002",
          "title": "Haldi",
          "localDate": "2027-02-13"
        }
      ]
    },
    "tasks": {
      "todo": 11,
      "inProgress": 4,
      "overdue": 2
    },
    "finance": {
      "visible": true,
      "targetBudgetPaise": 120000000,
      "plannedAllocationPaise": 85000000,
      "committedPaise": 72000000,
      "paidPaise": 50000000,
      "outstandingPaise": 22000000
    }
  }
}
```

For members without finance permission, return:

```json
"finance": { "visible": false }
```

rather than leaking amounts.

# 11. Family collaboration endpoints

## 11.1 List members

```http
GET /api/v1/weddings/{weddingId}/members
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "memberId": "66fa00000000000000000100",
      "user": {
        "id": "auth_user_123",
        "name": "Aarav",
        "email": "aarav@example.com"
      },
      "role": "OWNER",
      "financeAccess": true,
      "status": "ACTIVE"
    }
  ]
}
```

## 11.2 Invite member

Invitations expire after seven days. Pending invitations are unique per wedding and normalized recipient email. Delivery failures revoke the newly issued invitation and return a safe service error, allowing a new send attempt. Owner-only `POST /weddings/{weddingId}/member-invites/{inviteId}/resend` rotates a pending link and sends a fresh invitation; the old link becomes invalid. `POST .../{inviteId}/revoke` revokes pending access. Creation is limited to 20 invitation records per wedding per hour.

```http
POST /api/v1/weddings/{weddingId}/member-invites
```

Owner only.

### Request

```json
{
  "email": "sister@example.com",
  "role": "EDITOR",
  "financeAccess": false
}
```

### Behavior

- Normalize email.
- Reject existing active membership.
- Prevent equivalent duplicate pending invite.
- Generate cryptographically random token.
- Store only `tokenHash`.
- Send the raw invitation URL through Resend.

### Response `201`

```json
{
  "success": true,
  "data": {
    "inviteId": "66fa00000000000000000110",
    "email": "sister@example.com",
    "status": "PENDING",
    "expiresAt": "2026-10-11T10:00:00.000Z"
  }
}
```

The raw token is not returned by normal production API responses.

## 11.3 Accept member invitation

```http
POST /api/v1/member-invites/{token}/accept
```

Requires a logged-in, verified account whose normalized email matches the invite.

New acceptance requires JSON `{ "relationship": "Groom’s father" }` (trimmed, 2–80 characters). This is membership profile information only; role and finance access always come from the Owner’s invitation. Already-accepted retries may use an empty body and do not change the saved relationship.

### Response `200`

```json
{
  "success": true,
  "data": {
    "weddingId": "66fa00000000000000000001",
    "role": "EDITOR",
    "financeAccess": false
  }
}
```

## 11.4 Update member

```http
PATCH /api/v1/weddings/{weddingId}/members/{memberId}
```

### Request

```json
{
  "role": "EDITOR",
  "financeAccess": true
}
```

Owner role transfer is not supported in MVP.

## 11.5 Remove member

```http
DELETE /api/v1/weddings/{weddingId}/members/{memberId}
```

Owner only. The target Owner cannot remove themselves through this endpoint.

The backend marks membership `REMOVED`; future requests are denied immediately.

# 12. Event endpoints

## 12.1 List events

```http
GET /api/v1/weddings/{weddingId}/events
```

Optional query:

```text
?status=SCHEDULED
```

Default sort: `localDate ASC`, then `startTime ASC` where present.

## 12.2 Create event

```http
POST /api/v1/weddings/{weddingId}/events
```

### Request

```json
{
  "title": "Haldi",
  "eventType": "HALDI",
  "localDate": "2027-02-13",
  "startTime": "10:00",
  "venue": {
    "name": "Family Home",
    "address": "Lucknow, Uttar Pradesh"
  },
  "allocatedBudgetPaise": 10000000
}
```

### Response `201`

```json
{
  "success": true,
  "data": {
    "id": "66fa00000000000000000002",
    "title": "Haldi",
    "status": "SCHEDULED"
  }
}
```

## 12.3 Update event

```http
PATCH /api/v1/weddings/{weddingId}/events/{eventId}
```

The server verifies that `eventId` belongs to the route `weddingId`.

## 12.4 Archive event

```http
POST /api/v1/weddings/{weddingId}/events/{eventId}/archive
```

Archiving preserves tasks, expenses, guests and invitation history.

# 13. Task endpoints

## 13.1 List tasks

```http
GET /api/v1/weddings/{weddingId}/tasks?status=TODO&eventId=<eventId>&limit=25
```

## 13.2 Create task

```http
POST /api/v1/weddings/{weddingId}/tasks
```

### Request

```json
{
  "eventId": "66fa00000000000000000002",
  "title": "Confirm decorator",
  "description": "Confirm Haldi flower setup",
  "assignedToUserId": "auth_user_456",
  "priority": "HIGH",
  "dueAt": "2027-01-30T12:00:00.000Z"
}
```

The assignee must currently be an active wedding member.

## 13.3 Update task

```http
PATCH /api/v1/weddings/{weddingId}/tasks/{taskId}
```

### Example

```json
{
  "status": "COMPLETED"
}
```

The service sets `completedAt` when entering `COMPLETED` and clears it when moving away from `COMPLETED`.

# 14. Expense endpoints

All expense endpoints require Owner access or Editor + `financeAccess=true`.

## 14.1 List expenses

```http
GET /api/v1/weddings/{weddingId}/expenses?eventId=<eventId>&status=ACTIVE
```

### Response excerpt

```json
{
  "success": true,
  "data": [
    {
      "id": "66fa00000000000000000004",
      "title": "Haldi decoration",
      "category": "DECOR",
      "estimatedPaise": 2200000,
      "committedPaise": 2000000,
      "paidPaise": 500000,
      "outstandingPaise": 1500000,
      "status": "ACTIVE"
    }
  ]
}
```

`outstandingPaise` is calculated by the API and need not be persisted separately.

## 14.2 Create expense

```http
POST /api/v1/weddings/{weddingId}/expenses
```

### Request

```json
{
  "eventId": "66fa00000000000000000002",
  "title": "Haldi decoration",
  "category": "DECOR",
  "estimatedPaise": 2200000,
  "committedPaise": 2000000,
  "vendorRecordId": null,
  "notes": "Flower and entrance setup"
}
```

`paidPaise` starts at `0` and cannot be supplied by normal clients.

## 14.3 Update expense

```http
PATCH /api/v1/weddings/{weddingId}/expenses/{expenseId}
```

Reducing `committedPaise` below existing `paidPaise` returns `409`.

## 14.4 Record payment

```http
POST /api/v1/weddings/{weddingId}/expenses/{expenseId}/payments
Idempotency-Key: <uuid-or-random-key>
```

The `Idempotency-Key` header is required.

### Request

```json
{
  "amountPaise": 500000,
  "paidAt": "2026-12-01T10:30:00.000Z",
  "method": "UPI",
  "notes": "Advance paid"
}
```

### Transaction rules

In one MongoDB transaction:

1. Validate caller financial permission.
2. Check expense belongs to the same wedding and is ACTIVE.
3. Ensure the idempotency key has not already produced a conflicting payment.
4. Atomically ensure `paidPaise + amountPaise <= committedPaise`.
5. Increment `expenses.paidPaise`.
6. Insert `expensePayments`.

### Response `201`

```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "66fa00000000000000000200",
      "amountPaise": 500000,
      "status": "RECORDED"
    },
    "expense": {
      "paidPaise": 500000,
      "outstandingPaise": 1500000
    }
  }
}
```

If an identical request is retried with the same key, return the original successful result rather than recording another payment.

## 14.5 Void payment

```http
POST /api/v1/weddings/{weddingId}/expenses/{expenseId}/payments/{paymentId}/void
```

The reverse adjustment and `VOIDED` status change occur transactionally.

For the first UI version, this action may be restricted to Owner even if Editors can record payments.

# 15. Event guest endpoints

Guests exist only under events.

## 15.1 List guests

```http
GET /api/v1/weddings/{weddingId}/events/{eventId}/guests?rsvpStatus=ACCEPTED
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "66fa00000000000000000003",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "invitationStatus": "SENT",
      "rsvpStatus": "ACCEPTED"
    }
  ],
  "meta": {
    "counts": {
      "total": 80,
      "pending": 10,
      "accepted": 65,
      "declined": 5
    },
    "nextCursor": null
  }
}
```

## 15.2 Add guest

```http
POST /api/v1/weddings/{weddingId}/events/{eventId}/guests
```

### Request

```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "+919876543210"
}
```

Duplicate names are allowed.

## 15.3 Update guest

```http
PATCH /api/v1/weddings/{weddingId}/events/{eventId}/guests/{guestId}
```

Organizer APIs should not normally set `rsvpStatus`; guest RSVP updates should flow through the public invitation endpoint. A privileged correction path may be added later if required.

## 15.4 Remove guest

```http
DELETE /api/v1/weddings/{weddingId}/events/{eventId}/guests/{guestId}
```

Server behavior:

1. Revoke any active invitation.
2. Remove the guest from active event planning.
3. Preserve required audit/history according to the final retention implementation.

**Implementation note:** before coding this endpoint, add `status: ACTIVE|REMOVED` and `removedAt` to `eventGuests` if we choose soft deletion. This is the only recommended schema delta identified during API design.

## 15.5 Copy guests from another event

```http
POST /api/v1/weddings/{weddingId}/events/{eventId}/guests/copy
```

### Request

```json
{
  "sourceEventId": "66fa00000000000000000005",
  "guestIds": [
    "66fa00000000000000001001",
    "66fa00000000000000001002"
  ]
}
```

### Behavior

Creates new independent `eventGuests` under the target event.

It does **not** copy:

- RSVP status.
- Invitation token.
- Invitation status.

New copies start with:

```json
{
  "invitationStatus": "NOT_SENT",
  "rsvpStatus": "PENDING"
}
```

# 16. Guest invitation endpoints

## 16.1 Create or rotate invitation

```http
POST /api/v1/weddings/{weddingId}/events/{eventId}/guests/{guestId}/invitation
```

### Behavior

- Verify wedding/event/guest chain.
- Revoke existing active invitation if rotating.
- Generate high-entropy random token.
- Store only SHA-256 token hash.
- Return raw token URL once to the authorized organizer.
- Set guest `invitationStatus=SENT`.

### Response `201`

```json
{
  "success": true,
  "data": {
    "invitationUrl": "https://<app-domain>/invite/<opaque-token>",
    "expiresAt": null
  }
}
```

The raw token must not be logged.

## 16.2 View public invitation

```http
GET /api/v1/public/invitations/{token}
```

### Response `200`

```json
{
  "success": true,
  "data": {
    "guest": {
      "name": "Rahul Sharma",
      "rsvpStatus": "PENDING"
    },
    "event": {
      "title": "Sangeet",
      "localDate": "2027-02-14",
      "startTime": "19:00",
      "venue": {
        "name": "Royal Garden",
        "address": "Lucknow, Uttar Pradesh"
      },
      "invitationMessage": "We would love to celebrate with you."
    },
    "wedding": {
      "title": "Aarav & Nisha Wedding"
    }
  }
}
```

Never include:

- Other guests.
- Wedding members.
- Financial information.
- Vendor contacts.
- Private setup media.

## 16.3 RSVP

```http
POST /api/v1/public/invitations/{token}/rsvp
```

### Request

```json
{
  "response": "ACCEPTED"
}
```

Allowed values: `ACCEPTED`, `DECLINED`.

### Response

```json
{
  "success": true,
  "data": {
    "rsvpStatus": "ACCEPTED",
    "respondedAt": "2027-01-20T13:20:00.000Z"
  }
}
```

Repeated valid submissions update the existing event guest response instead of creating another guest.

# 17. Vendor endpoints

Manual vendor records only; these APIs are not a marketplace.

## 17.1 Create vendor

```http
POST /api/v1/weddings/{weddingId}/vendors
```

### Request

```json
{
  "eventId": "66fa00000000000000000002",
  "businessName": "Sharma Decorations",
  "category": "DECORATOR",
  "contactName": "Rohit Sharma",
  "phone": "+919876543210",
  "email": "hello@example.com",
  "notes": "Haldi setup"
}
```

Price/payment data belongs to the expense module rather than being duplicated here.

# 18. Media and Cloudflare R2 endpoints

R2 objects are private by default.

## 18.1 Request upload URL

```http
POST /api/v1/weddings/{weddingId}/media/upload-url
```

### Request

```json
{
  "eventId": "66fa00000000000000000002",
  "category": "SETUP_REFERENCE",
  "filename": "mandap-reference.webp",
  "mimeType": "image/webp",
  "sizeBytes": 1250000
}
```

### Server checks

- Active wedding membership.
- Owner/Editor permission.
- Event belongs to wedding when supplied.
- Category allowed.
- MIME type allowlisted.
- Size within limit.

### Response `201`

```json
{
  "success": true,
  "data": {
    "mediaId": "66fa00000000000000000300",
    "uploadUrl": "https://<r2-s3-endpoint>/<signed-request>",
    "method": "PUT",
    "expiresInSeconds": 300,
    "requiredHeaders": {
      "Content-Type": "image/webp"
    }
  }
}
```

The browser then uploads directly to R2.

## 18.2 Confirm upload

```http
POST /api/v1/weddings/{weddingId}/media/{mediaId}/complete
```

Backend verifies the object exists and that its metadata is acceptable before changing `mediaAssets.status` from `PENDING` to `READY`.

### Response

```json
{
  "success": true,
  "data": {
    "id": "66fa00000000000000000300",
    "status": "READY"
  }
}
```

## 18.3 Get private view URL

```http
GET /api/v1/weddings/{weddingId}/media/{mediaId}/view-url
```

Returns a short-lived signed URL only after permission checks.

```json
{
  "success": true,
  "data": {
    "url": "https://<temporary-signed-r2-url>",
    "expiresInSeconds": 300
  }
}
```

# 19. Resend email flows

Resend is an infrastructure integration rather than a public client resource.

Initial transactional emails:

| Trigger | Email |
|---|---|
| Account signup | Verification email |
| Forgot password | Password reset |
| Owner invites family member | Wedding collaboration invitation |

Application modules should call an internal `EmailService`; route handlers should not contain provider-specific email logic.

For critical flows, the API must report an understandable error if email delivery could not be initiated. Do not expose the Resend API key or provider internals.

# 20. Turnstile / abuse protection

Cloudflare Turnstile should be considered for:

- Signup.
- Login after suspicious/repeated attempts.
- Password reset request.
- Other public abuse-prone forms if needed.

The frontend sends a Turnstile token; the backend validates it before continuing the protected operation.

Rate limiting remains server-side and independent of Turnstile.

# 21. Rate-limit baseline

Exact thresholds should be configurable and tuned during testing.

Suggested prototype defaults:

| Endpoint class | Suggested starting limit |
|---|---|
| Login/signup/reset attempts | 10 requests / 10 min / IP + account key |
| Family invite creation | 20 / hour / wedding |
| Public RSVP | 20 / 10 min / token + IP |
| Upload URL generation | 30 / 10 min / user |
| Normal authenticated CRUD | 120 / min / user |

These are starting engineering defaults, not product guarantees.

# 22. Idempotency

Idempotency is mandatory for operations where retries could create duplicate state.

## Required initially

```http
Idempotency-Key: <client-generated-unique-key>
```

Use for:

- Expense payment creation.

Potential later use:

- Marketplace bookings.
- Payment gateway requests.
- Bulk invitation sends.

Do not trust idempotency keys globally; scope them to the authenticated user/resource/operation as appropriate.

# 23. Concurrency and transactions

Use MongoDB transactions only for operations that require multi-document consistency.

### Transactional operations

- Wedding creation + Owner membership.
- Expense payment creation + expense balance update.
- Payment void + balance reversal.
- Invitation rotation if old-active/new-active state must change atomically.
- Member invite acceptance + membership creation + invite status update.

### Normal atomic single-document operations

- Task status update.
- Event edits.
- Guest RSVP status update.
- Vendor record edits.

# 24. Logging and request tracing

Every API request should receive a request/correlation ID.

Log:

- Route/action.
- Request ID.
- Authenticated user ID when appropriate.
- Wedding ID when appropriate.
- Status/result.
- Duration.
- Safe error code.

Never log:

- Passwords.
- Better Auth session cookies.
- Raw family invitation tokens.
- Raw guest invitation tokens.
- Resend API keys.
- R2 secret keys.
- Presigned URLs in routine production logs.

# 25. Security checklist for each endpoint

Before implementing any protected endpoint, confirm:

- [ ] Authentication checked.
- [ ] Active wedding membership checked.
- [ ] Correct role/capability checked.
- [ ] Nested resource belongs to wedding.
- [ ] Zod input validation applied.
- [ ] Financial integer bounds checked when relevant.
- [ ] No raw provider/database errors returned.
- [ ] Sensitive response fields explicitly selected.
- [ ] Rate limit applied where abuse-sensitive.
- [ ] Idempotency applied where duplicate writes matter.
- [ ] Audit-relevant destructive operations are reversible or recorded.

# 26. Recommended Next.js route layout

```text
src/app/api/
├── auth/
│   └── [...all]/route.ts            # Better Auth
│
└── v1/
    ├── weddings/
    │   ├── route.ts                  # GET, POST
    │   └── [weddingId]/
    │       ├── route.ts              # GET, PATCH
    │       ├── archive/route.ts
    │       ├── dashboard/route.ts
    │       ├── members/
    │       ├── member-invites/
    │       ├── events/
    │       ├── tasks/
    │       ├── expenses/
    │       ├── vendors/
    │       └── media/
    │
    ├── member-invites/
    │   └── [token]/accept/route.ts
    │
    └── public/
        └── invitations/
            └── [token]/
                ├── route.ts
                └── rsvp/route.ts
```

Keep route handlers thin:

```text
Route Handler
  → parse request
  → call validation/auth helper
  → call module service
  → map result to HTTP response
```

Business logic belongs in `src/modules/*`, not inside large `route.ts` files.

# 27. Suggested internal module API

Example finance service boundary:

```ts
financeService.createExpense(context, input)
financeService.updateExpense(context, expenseId, input)
financeService.recordPayment(context, expenseId, input, idempotencyKey)
financeService.voidPayment(context, expenseId, paymentId)
financeService.getWeddingSummary(context)
```

`context` should carry the authenticated user and verified wedding authorization state so services do not rely on arbitrary client identity fields.

# 28. Database delta discovered during API design

The approved Database Design v1.0 remains valid with one recommended improvement before implementation:

### `eventGuests`

Add:

```text
status: ACTIVE | REMOVED
removedAt?: Date
```

Reason: `DELETE /events/{eventId}/guests/{guestId}` should revoke access while preserving RSVP/invitation history when required, rather than forcing unsafe hard deletion.

Recommended additional index adjustment:

```text
{ weddingId: 1, eventId: 1, status: 1, rsvpStatus: 1 }
```

No master guest collection is introduced.

# 29. Out-of-scope APIs for MVP

Do not implement yet:

- `/marketplace/vendors`
- `/bookings`
- `/checkout`
- `/payments/provider-webhooks`
- `/refunds`
- `/reviews`
- `/livestream/*`
- `/transport/*`
- `/accommodation/*`
- `/guest-master/*`
- `/dress-code/*`

Future marketplace endpoints should be designed as a separate domain while keeping existing planning `vendorRecords` intact.

# 30. Example end-to-end flow

## Organizer creates Haldi and invites Rahul

```text
POST /api/v1/weddings
        ↓
POST /api/v1/weddings/{weddingId}/events
        ↓
POST /api/v1/weddings/{weddingId}/events/{haldiId}/guests
        ↓
POST /api/v1/weddings/{weddingId}/events/{haldiId}/guests/{rahulId}/invitation
        ↓
Organizer shares invitation URL
        ↓
GET /api/v1/public/invitations/{token}
        ↓
POST /api/v1/public/invitations/{token}/rsvp
        ↓
Dashboard / Haldi guest counts reflect RSVP
```

# 31. API implementation order

Recommended order:

1. Better Auth + session helper.
2. Shared API response/error utilities.
3. Wedding creation/list/detail.
4. Wedding authorization middleware/helper.
5. Family membership and invitations.
6. Events.
7. Tasks.
8. Expenses and payment transaction logic.
9. Event guests.
10. Guest invitation + public RSVP.
11. Vendor records.
12. R2 media flow.
13. Dashboard aggregation.
14. Rate limits, Turnstile and security hardening.
15. Integration/E2E tests.

# 32. API testing baseline

Each module should include:

### Positive tests

- Valid Owner operation.
- Valid Editor operation where permitted.
- Valid Viewer read.
- Successful response shape.

### Authorization tests

- No session.
- Removed member.
- Viewer write attempt.
- Editor without finance access.
- Cross-wedding nested resource ID.

### Validation tests

- Invalid ObjectId.
- Missing required field.
- Invalid enum.
- Invalid date/time.
- Negative monetary amount.

### Critical workflow tests

- Concurrent payment attempts cannot exceed committed amount.
- Payment retries do not duplicate payments.
- Revoked invitation cannot RSVP.
- One event's RSVP cannot update another event guest.
- Copied guests have independent invitation/RSVP state.
- Unauthorized user cannot obtain R2 view/upload URLs.

# 33. API contract status

## Locked for MVP

- `/api/v1` business API prefix.
- Better Auth under `/api/auth/*`.
- Wedding-scoped private resources.
- Owner / Editor / Viewer model.
- Event-specific guests only.
- Secure token-based public RSVP.
- Integer-paise financial API.
- Payment idempotency.
- Direct browser-to-R2 upload flow.
- Resend for transactional email.

## Implementation-level details that may still evolve

- Exact invitation expiry duration.
- Exact rate-limit numbers.
- Exact cursor encoding format.
- Whether payment void UI is Owner-only or finance-enabled Editor.
- Whether event-guest removal is exposed in the first UI release.

These details can change without redesigning the API's resource model.

# 34. Official implementation references

- Next.js documentation — https://nextjs.org/docs
- Better Auth Next.js integration — https://better-auth.com/docs/integrations/next
- Better Auth installation/auth route guidance — https://better-auth.com/docs/installation
- MongoDB Node.js transactions — https://www.mongodb.com/docs/drivers/node/current/crud/transactions/
- Cloudflare R2 presigned URLs — https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Resend Next.js documentation — https://resend.com/docs/send-with-nextjs

---

**End of Make My Marriage API Documentation — v1.0**
