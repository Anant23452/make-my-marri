---
title: "MAKE MY MARRIAGE"
subtitle: "Product Requirements Document (PRD) | Version 1.0"
date: "4 October 2026"
---

# Make My Marriage — Product Requirements Document

**Version:** 1.0  
**Product Stage:** Minimum Viable Product (MVP)  
**Initial Market:** India  
**Platform:** Responsive Web Application  
**Primary Users:** Couples and family members  
**Status:** Approved MVP baseline

> **Scope guardrail.** The MVP is a simple wedding-planning product. It intentionally excludes master guest management, dress-code features, a transactional vendor marketplace, native livestreaming, advanced 2D/3D venue design, accommodation/transport management, and native mobile applications.

# 1. Executive Summary

Make My Marriage is a collaborative wedding planning platform designed for Indian weddings.

The application helps couples and their families manage multiple wedding functions, distribute responsibilities, organize event-specific guests, track expenses, prepare digital invitations, record vendors, and coordinate wedding arrangements from one shared workspace.

The MVP focuses on reliable planning. The long-term product can evolve into a broader wedding ecosystem with vendor discovery, bookings, payments, advanced setup visualization, photo sharing, and external livestream integration.

# 2. Product Vision

To simplify Indian wedding planning by connecting family collaboration, multiple events, tasks, expenses, invitations, guests, vendors, and wedding setup references within one easy-to-use digital workspace.

**Working positioning:** Your Wedding. One Place. Zero Confusion.

# 3. Problem Statement

Indian weddings frequently involve:

- Multiple ceremonies and dates
- Different guest lists for different functions
- Responsibilities split across several family members
- Expenses and vendor payments tracked manually
- Information scattered across calls, chats, spreadsheets, and notebooks
- Difficulty seeing what is pending and who is responsible

Make My Marriage centralizes this planning information while keeping the product simple for non-technical family members.

# 4. Target Users

## 4.1 Primary Persona — Couple

A bride, groom, or couple who wants to organize the wedding, monitor progress, and collaborate with family members.

## 4.2 Primary Persona — Family Organizer

A parent, sibling, relative, or trusted family member responsible for tasks, expenses, vendors, invitations, or event coordination.

## 4.3 Secondary Persona — Guest

An invited person who views a specific event invitation and submits RSVP without accessing the private planning workspace.

Professional wedding planners and marketplace vendors are future user groups, not primary MVP personas.

# 5. Confirmed Product Decisions

| Decision | Baseline |
|---|---|
| Initial market | India |
| Product | Responsive web application |
| Primary users | Couples and families |
| Product structure | One wedding workspace containing multiple events |
| Collaboration | Family members collaborate inside one wedding |
| Guest model | Event-specific guests only |
| Master guest management | Excluded |
| Dress-code features | Excluded |
| Vendor marketplace | Future product, not MVP |
| Live casting | External YouTube/Zoom/private stream link later |
| Launch philosophy | Small, reliable planning MVP |
| Wedding setup | Basic reference images/notes in MVP; advanced visualization later |

# 6. Product Structure

```text
User Account
   |
   +-- Wedding Workspace
         |
         +-- Dashboard
         +-- Family
         +-- Events
         |     |
         |     +-- Tasks
         |     +-- Expenses
         |     +-- Guests
         |     +-- Invitation
         |     +-- Vendors
         |     +-- Setup references
         |
         +-- General Tasks
         +-- General Expenses
         +-- General Vendors
```

# 7. MVP Goals

1. Let a user create a wedding workspace.
2. Support multiple customizable wedding functions.
3. Allow family collaboration with simple permissions.
4. Manage wedding and event tasks.
5. Track budgets, expenses, payments, and pending dues.
6. Manage guests independently for each event.
7. Generate shareable digital invitations and RSVP links.
8. Maintain manual vendor records.
9. Save basic wedding setup references.
10. Provide a clear wedding dashboard.
11. Work well on mobile and desktop.

# 8. MVP Non-Goals

The MVP will not include:

- Master guest directory
- Dress-code management
- Full vendor marketplace
- Online vendor booking or settlement
- Native video streaming
- Advanced venue visualization
- Guest accommodation and transport
- QR attendance scanning
- Automatic WhatsApp campaigns
- Complex accounting/invoicing
- Native Android/iOS applications

# 9. Functional Requirements

## FR-01 Authentication

- Register with email and password.
- Login/logout.
- Account recovery.
- Email verification before public use.
- Unauthorized users cannot access wedding workspaces.

## FR-02 Wedding Creation

Required:
- Wedding title
- Wedding date

Optional:
- City
- Description
- Cover image

Rules:
- Creator becomes Owner.
- A user may belong to multiple weddings.
- A user may create/own only one wedding, including an archived wedding. Membership through family invitations may span other weddings. This ownership limit was revised on 7 October 2026.
- Weddings remain isolated from one another.

## FR-03 Dashboard

Show:
- Wedding name/date/countdown
- Upcoming events
- Pending/upcoming tasks
- Planned budget
- Committed expense
- Paid amount
- Outstanding dues
- Event RSVP summaries
- Quick actions

The dashboard must derive values from source records instead of maintaining unrelated duplicated totals.

## FR-04 Multiple Events

Support:
- Haldi
- Mehndi
- Sangeet
- Wedding
- Reception
- Custom events

Each event can contain:
- Date/time
- Venue
- Description
- Tasks
- Expenses
- Guests
- Invitation
- Setup references
- Vendors

## FR-05 Family Collaboration

Member privacy revision (7 October 2026): only the Owner can see the full registered-member list, member count, and pending invitations. Editors and Viewers see their own role and capabilities only.

On invitation acceptance, the recipient identifies their relationship to the couple (such as groom’s father, bride’s mother, sibling, relative, friend, or another description). Relationship is wedding-specific profile information, separate from Owner/Editor/Viewer authorization. Valid invitation links route existing accounts to sign-in and new accounts to registration using the invited email, then return to acceptance after verification.

MVP roles:
- Owner
- Editor
- Viewer

Owner can:
- Invite members
- Remove members
- Change roles
- Control finance access

Editor can manage planning data. Financial access is an additional permission.

Viewer has read-only access to permitted non-financial data.

## FR-06 Task Planner

Fields:
- Title
- Description
- Related event (optional)
- Assignee
- Due date
- Priority
- Status

Statuses:
- To Do
- In Progress
- Completed

## FR-07 Expense Tracker

Track:
- Estimated amount
- Committed amount
- Individual payment records
- Paid amount
- Outstanding amount
- Optional related event
- Optional vendor
- Notes

Money is stored in integer paise.

The MVP records payments manually; it does not process real money.

## FR-08 Event-Level Guest Management

Each event has its own guest records.

Fields:
- Name
- Email (optional)
- Phone (optional)
- RSVP status
- Status

RSVP:
- Pending
- Accepted
- Declined

A guest copied to another event becomes an independent destination record.

There is intentionally no `/guests` master feature.

## FR-09 Digital Invitation and RSVP

- Create personalized guest invitation links.
- Guest does not need an organizer account.
- Invitation shows only allowed event information.
- Guest can Accept or Decline.
- Link can be revoked/regenerated.
- RSVP updates the related event guest only.

## FR-10 Manual Vendor Records

Store:
- Vendor/business name
- Category
- Contact information
- Event (optional)
- Notes
- Optional linked expense

This is not a marketplace vendor account.

## FR-11 Wedding Setup References

MVP supports:
- Uploading reference images
- Captions and notes
- Associating references with an event

Advanced layout, 3D, AI decor generation, and decorator marketplace booking are future features.

# 10. Permissions Matrix

| Capability | Owner | Editor | Viewer | Guest |
|---|---|---|---|---|
| View planning workspace | Yes | Yes | Yes | No |
| Manage events | Yes | Yes | No | No |
| Manage tasks | Yes | Yes | No | No |
| Manage guests | Yes | Yes | No | No |
| Manage invitations | Yes | Yes | No | RSVP only |
| View finances | Yes | If granted | No | No |
| Modify finances | Yes | If granted | No | No |
| Manage vendors | Yes | Yes | No | No |
| Manage setup references | Yes | Yes | No | No |
| Invite/remove family | Yes | No | No | No |

# 11. Main User Journeys

## 11.1 Create Wedding
Register → Create wedding → Become Owner → Add first event → Open dashboard.

## 11.2 Plan Event
Create event → Add tasks → Add expenses → Add guests → Save setup references → Add vendors.

## 11.3 Family Collaboration
Owner invites member → Member registers/logs in → Accepts invite → Gets role → Updates assigned work.

## 11.4 RSVP
Organizer adds guest → Generates invitation → Shares link → Guest opens link → Submits RSVP → Event guest status updates.

## 11.5 Expense Tracking
Authorized member creates expense → Adds committed amount → Records payments → Outstanding amount recalculates → Dashboard updates.

# 12. Non-Functional Requirements

## Security
- HTTPS
- Server-side authorization
- Secure sessions
- Secure invitation tokens
- Private wedding data
- Safe file uploads

## Performance
Key planning pages should feel responsive on typical Indian mobile connections.

## Usability
Simple language, minimal required fields, clear mobile-first forms.

## Localization
- INR
- India-first date presentation
- Asia/Kolkata default timezone
- English initially
- Additional languages later

## Reliability
Important data must not disappear silently. Destructive actions should require confirmation or use archive/revoke behavior.

# 13. Success Criteria

The first pilot should verify that test users can:

- Create a wedding
- Add multiple events
- Invite family collaborators
- Create/complete tasks
- Record expenses and payments
- Add event-level guests
- Share invitations
- Receive RSVP responses
- Use the application on mobile

# 14. Release Roadmap

## Release 1 — Planning MVP
- Authentication
- Wedding workspace
- Dashboard
- Events
- Family
- Tasks
- Expenses
- Event guests
- Invitations/RSVP
- Manual vendors
- Setup references

## Release 2 — Wedding Experience
- Vendor discovery beta
- More invitation templates
- Photo galleries
- Guest uploads
- External livestream links
- QR check-in

## Release 3 — Wedding Ecosystem
- Complete vendor marketplace
- Booking/payments
- Settlements/refunds
- Ratings/reviews
- Advanced setup visualization
- Memory Vault
- Optional AI planning support

# 15. Deferred Decisions

- Marketplace launch city
- Marketplace pricing/commission
- Payment provider
- Advanced visualization technology
- Native mobile apps
- Additional regional languages

# 16. PRD Status

This PRD is the approved MVP product baseline.

Technical implementation decisions belong in the System Design, Database Design, and API Documentation files.
