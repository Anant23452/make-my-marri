---
title: "MAKE MY MARRIAGE"
subtitle: "System Design Document (SDD) | Version 1.0"
date: "4 October 2026"
---

# Make My Marriage — System Design Document

**Architecture:** Modular Monolith  
**Application:** Next.js + TypeScript  
**Runtime:** Node.js  
**Hosting:** Vercel  
**Database:** MongoDB Atlas  
**Authentication:** Better Auth  
**Email:** Resend  
**Object Storage:** Cloudflare R2  
**DNS:** Cloudflare  
**Project Stage:** College Prototype / MVP

> **Scope guardrail.** This design supports the planning MVP. Marketplace payments, microservices, Redis, native livestreaming, advanced search infrastructure, and background messaging infrastructure are intentionally deferred.

# 1. Architecture Objectives

The system must:

1. Support multiple isolated wedding workspaces.
2. Keep the first implementation inexpensive and operationally simple.
3. Use one deployable application.
4. Enforce authorization server-side.
5. Support event-specific guests.
6. Preserve financial consistency.
7. Store media outside MongoDB.
8. Support transactional emails.
9. Scale cleanly from college prototype to early product validation.
10. Leave expansion points for the future marketplace.

# 2. Selected Infrastructure

| Layer | Technology |
|---|---|
| Architecture | Modular Monolith |
| Frontend | Next.js / React |
| Backend | Next.js Route Handlers + server modules |
| Language | TypeScript |
| Runtime | Node.js |
| Hosting | Vercel |
| Database | MongoDB Atlas |
| Auth | Better Auth |
| Email | Resend |
| DNS | Cloudflare |
| Object Storage | Cloudflare R2 |
| Bot Protection | Cloudflare Turnstile |
| Validation | Zod |
| Styling | Tailwind CSS |

Cloudflare manages DNS, R2, and Turnstile. The initial Vercel application should use DNS-only records instead of placing Cloudflare's reverse proxy in front of Vercel.

# 3. High-Level Architecture

```text
Browser
   |
   +--> Cloudflare DNS
   |
   +--> Vercel / Next.js Modular Monolith
           |
           +-- Presentation Layer
           |     +-- React pages/components
           |
           +-- API / Application Layer
           |     +-- Route handlers
           |     +-- Validation
           |     +-- Authorization
           |     +-- Services
           |
           +-- Domain Modules
           |     +-- Weddings
           |     +-- Family
           |     +-- Events
           |     +-- Tasks
           |     +-- Finance
           |     +-- Guests
           |     +-- Invitations
           |     +-- Vendors
           |     +-- Setup
           |     +-- Media
           |     +-- Dashboard
           |
           +--> MongoDB Atlas
           +--> Cloudflare R2
           +--> Resend
           +--> Cloudflare Turnstile
```

# 4. Architectural Style

Use a **modular monolith**.

All features live in one repository and deploy together, but business responsibilities remain separated into modules.

Recommended request flow:

```text
Request
  -> Authentication
  -> Zod Validation
  -> Wedding Membership Check
  -> Permission Check
  -> Domain Service
  -> Repository / External Service
  -> Response
```

Public RSVP routes replace membership checks with invitation-token authorization.

# 5. Module Boundaries

## Authentication
- Better Auth integration
- Sessions
- Email/password login
- Verification
- Password reset

## Wedding
- Create/edit/archive wedding
- Workspace settings

## Family
- Membership
- Owner/Editor/Viewer roles
- Finance permission
- Member invitations

## Event
- Indian wedding event templates
- Custom events
- Date/time/venue

## Task
- Assignment
- Priority
- Status
- Due dates

## Finance
- Budgets
- Expenses
- Payment history
- Outstanding dues
- Financial summaries

## Guest
- Event-specific guests
- RSVP state

## Invitation
- Personalized tokens
- Public event view
- RSVP submission
- Revoke/regenerate

## Vendor
- Manual vendor records
- Not marketplace accounts

## Setup
- Decoration references
- Notes
- Event association

## Media
- R2 upload authorization
- Object metadata
- View URLs
- Removal

## Dashboard
- Aggregated read model from source collections

# 6. Data Architecture

MongoDB uses referenced collections for records that grow or update independently.

Primary entities:

- Better Auth User
- Wedding
- WeddingMember
- MemberInvite
- Event
- Task
- Expense
- ExpensePayment
- EventGuest
- Invitation
- VendorRecord
- MediaAsset

The wedding is the tenant boundary. Wedding-owned records contain `weddingId`.

Guests remain event-specific; there is no master guest-management model.

# 7. Authentication Design

Use Better Auth with the MongoDB adapter.

Supported flows:

- Email/password signup
- Verification email
- Login/logout
- Password reset
- Session retrieval

Resend sends transactional authentication emails.

Application authorization is separate from authentication.

A logged-in user still needs an active WeddingMember record to access a private wedding.

# 8. Authorization Model

Roles:
- OWNER
- EDITOR
- VIEWER

Additional field:
- `financeAccess: boolean`

Rules:

- Owner has full wedding control.
- Editor manages planning information.
- Editor can access finance only when explicitly enabled.
- Viewer is read-only and cannot view financial data.
- Guest invitation access is token-based and limited to one invitation.

Never trust role information sent by the client.

Every protected resource must be checked against its wedding.

# 9. Financial Consistency

Currency is stored as integer paise.

Expense payment history is stored in a separate collection.

An expense may cache `paidPaise` for fast reads, but adding a payment must update:

1. Expense payment record
2. Cached expense paid amount

as one consistent operation.

Payment endpoints use idempotency keys to reduce duplicate writes.

# 10. Media Architecture

Cloudflare R2 stores actual image bytes.

MongoDB stores:
- object key
- filename
- content type
- size
- wedding/event relationship
- upload state

Upload flow:

```text
Browser
  -> Request upload authorization
  -> Backend validates membership and metadata
  -> Backend creates media record + short-lived R2 presigned URL
  -> Browser uploads directly to R2
  -> Browser calls completion endpoint
  -> Backend verifies object
  -> Media becomes READY
```

Wedding media remains private by default.

# 11. Email Architecture

Create an internal EmailService wrapping Resend.

Initial templates:
- Verify email
- Reset password
- Family invitation

Later:
- Task reminder
- Guest invitation email
- Vendor marketplace communication

Critical emails should be awaited and errors handled; avoid unreliable fire-and-forget behavior.

# 12. Turnstile

Use Cloudflare Turnstile on high-risk public forms such as:

- Signup
- Login after suspicious attempts
- Password reset request
- Potentially public RSVP if abuse becomes a problem

Every token must be verified by the server.

# 13. Deployment Model

## Vercel
- Next.js hosting
- Node.js runtime
- Preview deployments
- Environment variables

## Cloudflare
- DNS management
- R2 object storage
- Turnstile
- Resend DNS records

## MongoDB Atlas
- Free cluster initially
- Shared connection helper
- Indexes for main query patterns
- Separate test data

## Resend
- Verified sending domain
- Transactional email delivery

# 14. Environment Variables

Typical server-side secrets:

```env
MONGODB_URI=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

RESEND_API_KEY=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

Do not expose server credentials through `NEXT_PUBLIC_*`.

# 15. Folder Structure

```text
src/
  app/
    (auth)/
    (workspace)/
    invite/
    api/
  modules/
    weddings/
    family/
    events/
    tasks/
    finance/
    guests/
    invitations/
    vendors/
    setup/
    media/
    dashboard/
  lib/
    auth/
    db/
    permissions/
    email/
    storage/
    validation/
  components/
  types/
```

Each module should own:
- Validation schemas
- Service/business logic
- Repository/database queries
- Domain types where useful

# 16. API Strategy

Our own business APIs are versioned under:

```text
/api/v1/*
```

Better Auth manages:

```text
/api/auth/*
```

Core route groups:

- `/api/v1/weddings`
- `/api/v1/weddings/{weddingId}/events`
- `/api/v1/weddings/{weddingId}/tasks`
- `/api/v1/weddings/{weddingId}/expenses`
- `/api/v1/weddings/{weddingId}/members`
- `/api/v1/weddings/{weddingId}/events/{eventId}/guests`
- `/api/v1/public/invitations/{token}`
- `/api/v1/weddings/{weddingId}/vendors`
- `/api/v1/weddings/{weddingId}/media`

Detailed request/response contracts belong in the API Documentation file.

# 17. Security Requirements

Minimum controls:

- HTTPS
- Secure authentication cookies
- Server-side authorization
- Zod validation
- Turnstile verification
- Rate limits for sensitive routes
- Token hashing for invitation links
- Private R2 bucket
- Short-lived presigned URLs
- File type/size validation
- No password/session/token logging
- Cross-wedding resource ownership checks

# 18. Reliability

For the prototype:

- Structured logs
- Request IDs
- Clear API error responses
- Retry-friendly idempotent operations
- R2 upload status tracking
- Resend failure handling
- Manual MongoDB export/restore procedure

Before using real families, backup and recovery must be tested.

# 19. Testing Strategy

## Unit
- Financial calculations
- Permission checks
- Token states
- Validation rules

## Integration
- Wedding creation
- Member invite/accept
- Expense/payment transaction
- Guest/RSVP flow
- Media upload authorization

## End-to-End
- Signup → Wedding → Event
- Owner → Invite Editor
- Event → Guest → RSVP
- Expense → Payment → Dashboard

## Security/Negative
- User accesses another wedding
- Viewer writes data
- Editor without finance access opens expenses
- Revoked token submitted
- Duplicate idempotency key
- Unauthorized R2 access

# 20. Scalability Strategy

For the prototype, optimize for correctness and simplicity.

Potential future additions only when needed:

- Paid MongoDB cluster
- Background jobs
- Image processing
- Caching
- Queue/event bus
- Dedicated marketplace search
- Payment reconciliation worker
- Separate service extraction

Microservices are not a current requirement.

# 21. Future Marketplace Boundary

Do not reuse `VendorRecord` as a marketplace seller model.

Future marketplace domain will likely introduce:

- VendorAccount
- VendorProfile
- ServiceListing
- Quote
- Booking
- Payment
- Settlement
- Refund
- Review

These remain outside the MVP architecture.

# 22. Architecture Decision Summary

| Decision | Status |
|---|---|
| Modular monolith | Approved |
| Next.js full-stack | Approved |
| TypeScript | Approved |
| MongoDB Atlas | Approved |
| Native MongoDB driver + Zod | Recommended |
| Better Auth | Approved |
| Resend | Approved |
| Cloudflare DNS | Approved |
| Cloudflare R2 | Approved |
| Cloudflare Turnstile | Approved |
| Vercel | Approved for prototype |
| Redis | Deferred |
| Microservices | Deferred |
| Full marketplace | Deferred |

# 23. SDD Status

This document defines the approved infrastructure and application architecture.

Exact collections belong in the Database Design document. Exact endpoints belong in the API Documentation file.
