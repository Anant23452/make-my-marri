# Project progress

Last updated: 7 October 2026

Milestone progress: `[##----------]` **2 of 12 complete (17%)**.
This counts equally weighted milestones, not effort or production readiness.

## Milestones

- [x] Project scaffold: Next.js, TypeScript, Tailwind, domain folders, and infrastructure helpers.
- [x] Responsive homepage preview: imagery, local fonts, ceremony tabs, FAQs, mobile navigation, and browser-only planning draft.
- [ ] Account flows: sign-in, registration, verification, recovery, and session-aware UI. Registration persists accounts in MongoDB; verification/resend and recovery work with the local testing inbox. Real email delivery, abuse protection, and browser workflow validation remain.
- [ ] Wedding creation and isolated shared workspaces. Creation and membership-filtered saved wedding list work; workspace management and collaboration remain.
- [ ] Family invitations, roles, and finance permissions enforced through server workflows. Pages and server workflows implemented; real email delivery and browser interaction validation remain.
- [ ] Events and task planning.
- [ ] Budgets, expenses, and manually recorded payments.
- [ ] Event-specific guests, personalized invitations, and RSVP.
- [ ] Manual vendor records.
- [ ] Private media uploads and event setup references.
- [ ] Dashboard summaries derived from source records.
- [ ] Integration/security checks and pilot readiness.

## Current state and next work

Wedding onboarding is implemented at /onboarding using the supplied Stitch HTML as reference. Verified accounts can create a wedding and Owner membership transactionally, then reopen saved details at /weddings. The wedding milestone remains incomplete: workspace settings, archive/edit flows, and shared planning modules are not implemented.

The Stitch-inspired /login page is implemented and linked from desktop and mobile homepage navigation. It uses real Better Auth email/password requests, session status, sign-out, verification resend, and password recovery with /reset-password. Registration is available at /register. Verification and recovery links work through the development-only testing inbox; real email delivery, abuse protection, and browser workflow validation remain outstanding.

The planning starter saves only to local browser storage. It does not create an account or a shared wedding workspace. Homepage examples are illustrative. Infrastructure helpers do not establish that external services are configured or verified.

## Completed work log

### Sign-in page — 7 October 2026

- Built /login from the reviewed Stitch Login source: editorial two-column desktop layout, wedding photograph, ivory/forest/gold palette, and the homepage’s local fonts. On mobile the form appears first. Removed unsupported concierge services, statistics, security claims, and Google sign-in.
- Replaced the homepage’s coming-soon sign-in dialog with /login links, preserving its button styling and mobile navigation.
- Added a Better Auth browser client, Zod account validation, email/password submission, password visibility toggle, remember-device option, loading/error feedback, session status, and sign-out. Successful sign-in displays an account state; no wedding dashboard is implied.
- Added reset-link requests and /reset-password with password confirmation, invalid-link handling, and real Better Auth reset submission. Registration is explicitly marked as upcoming rather than linked to a missing page.
- Validation: npm run typecheck and npm run lint passed. Production build passed after allowing the Next.js worker outside the Windows sandbox. HTTP checks returned 200 for /, /login, and /reset-password; homepage HTML includes /login. git diff --check passed.
- Browser visual/interaction validation was attempted but the browser tool failed to initialize (missing kernel-assets path). At login implementation time, no .env or .env.local existed; live sign-in/session persistence, Resend reset delivery, and password reset were not tested. MongoDB reachability was subsequently verified below. Public-launch abuse protection and full account flows remain incomplete; milestone count stays 2 of 12.

### 6 October 2026

- Recorded the existing scaffold and homepage implementation after inspecting the repository; their original completion dates have not been verified.
- Added a Sign in entry beside the desktop navigation and inside the mobile menu. It opens an accessible native dialog explaining that account sign-in is coming soon, without collecting credentials.
- Added this progress checklist and bar, linked it from the documentation index, and added the maintenance rule to AGENTS.md.
- Fixed the existing homepage brand link to use Next.js Link, resolving the lint error found during validation.
- Validation: `npm run lint`, `npm run typecheck`, and `git diff --check` passed. Browser interaction and visual checks were not performed; no browser connection is available in this session. Authentication services were not tested end to end.

### Homepage button styling and sign-in design review — 6 October 2026

- Reused the same `button header-cta` classes for Sign in and Start your story: matching font, responsive font size, forest background, text color, padding, border, and hover treatment. Sign in remains in the mobile menu and retains its preview dialog.
- Attempted to read the existing Stitch project and screen list; both returned `Authentication required`. No sign-in design could be inspected, and no sign-in page was implemented.
- Validation: `npm run lint` and `npm run typecheck` passed. Shared button classes and responsive overrides were reviewed in source; browser visual checks were not performed.

### Stitch connection and Login review — 6 October 2026

- Used the repository's `.mcp.json` connection directly, as requested; tool discovery and screen reads succeeded without displaying credentials.
- Read the HTML for `Make My Marriage — Login` (screen `c3577d2f6d03468791fc373b88e39c6c`). The screen is tagged desktop; its HTML contains responsive rules. No separate mobile Login screen was listed.
- Screenshot download returned HTTP 500; visual rendering remains unverified.
- Recommended retaining the two-column desktop layout, putting the form first on mobile, reusing homepage fonts/tokens, simplifying copy, removing unsupported concierge/statistical/security claims, and using actual email/password authentication rather than the source's simulated success. Google sign-in is outside the current email/password baseline.
- No sign-in page was built. Implementation awaits the user's design discussion.

### MongoDB connection — 7 October 2026

- Configured MONGODB_URI and MONGODB_DB_NAME=make_my_marriage in the ignored .env.local file, using the existing official-driver connection helper. No credentials were added to tracked files.
- Validation: connected with the installed MongoDB driver and successfully pinged the application database. git check-ignore confirmed .env.local is ignored.
- This verifies database reachability only. Better Auth secret/base URL and Resend configuration still need setup; account flows and wedding persistence are not complete. Milestone count remains 2 of 12.
### Authentication configuration fix — 7 October 2026

- Traced login failures to missing BETTER_AUTH_SECRET and BETTER_AUTH_URL. Generated a cryptographically random secret and configured http://localhost:3000 in ignored .env.local, preserving MongoDB settings.
- Auth route initialization failures now return a safe 503 response and a recognizable error code instead of exposing framework error output. Added client messages for unavailable authentication and invalid origin.
- Validation: live session endpoint returned 200; a fabricated nonexistent-account login returned 401 INVALID_EMAIL_OR_PASSWORD, confirming the sign-in endpoint initializes and reaches account validation without creating data. TypeScript, lint, and git diff --check passed. No successful-account or email-delivery test was performed.
- Resend configuration, registration/verification UI, and full account workflow checks remain outstanding; milestone count remains 2 of 12.
### First-time account registration — 7 October 2026

- Fixed the missing first-time user journey: /login now links to /register, with name, email, password, and confirmation validation. Registration uses Better Auth rather than saving passwords through application code.
- Verification remains mandatory for sign-in. Automatic signup verification email is sent only when Resend settings exist; without email setup, registration persists an unverified account and clearly explains why sign-in is not yet available. No verification bypass was introduced.
- Validation: live registration returned 200; queried MongoDB make_my_marriage.user and account to confirm an unverified user and password hash were saved. Removed only the fabricated test user and related account/session records afterward. TypeScript and lint passed. No real-user account was created or changed.
- Email configuration and verification/resend UX remain unfinished. Account milestone remains incomplete; progress stays 2 of 12.
### Login testing and recovery fix — 7 October 2026

- Added `scripts/test-auth.mjs`, a repeatable local authentication smoke test that creates a fabricated account and removes its account/session records and matching reset records afterward. It refuses remote hosts and configured email delivery.
- Passed 25 live checks: page responses, login labels and registration link, anonymous session, malformed email, unknown account, registration, mandatory verification, valid verification token, wrong password, untrusted origin, successful login with both remember-device settings, HttpOnly/SameSite cookie persistence, session identity, sign-out/session revocation, invalid reset token, and unavailable recovery behavior.
- Found that Better Auth acknowledged password-reset requests while delivery failed in a background task. Reset delivery is now disabled when email configuration is missing, returning `RESET_PASSWORD_DISABLED` with a clear client message. Login validation now trims email before validating it, consistently with registration.
- Verification used Better Auth's token generator for the fabricated account only; email delivery was not tested and verification requirements were not relaxed. Temporary accounts were removed. A reset token from the initial failed-delivery reproduction may remain until normal expiry; it references the removed test account.
- TypeScript, lint, and diff whitespace checks passed. Browser initialization failed (`failed to write kernel assets`), so visual layout, keyboard/click interactions, and browser refresh persistence remain unverified. Real verification/reset email delivery, resend UI, and abuse-protection review remain outstanding. Account flows remain incomplete; progress stays 2 of 12.

### Login code review and session recovery hardening — 7 October 2026

- Reviewed the pending login, registration, password recovery, homepage links, and Better Auth integration against the product, architecture, database, and HTTP documentation. The login implementation is suitable for continued development; account flows remain incomplete and are not approved for public launch.
- Fixed password reset retaining existing sessions by enabling Better Auth's `revokeSessionsOnPasswordReset`. Extended the fabricated-account smoke test to exercise successful reset, session revocation, one-time token use, old-password rejection, and new-password sign-in. Production verification requirements remain unchanged.
- Validation: all 31 live authentication checks passed and temporary records were removed. Lint, TypeScript, and diff whitespace checks passed. Production build passed after allowing the Next.js validation worker outside the Windows sandbox (the initial sandboxed build hit `spawn EPERM`).
- Remaining release gaps: configured and tested verification/reset email delivery, verification resend UI, and documented abuse protection (account/IP limits and Turnstile where appropriate). Browser visual and keyboard interaction checks were not performed during this review. Milestone progress stays 2 of 12 (17%). Secrets remain in ignored local configuration.

### Wedding onboarding — 7 October 2026

- Adapted the supplied Stitch desktop HTML to the existing local fonts and ivory/forest/gold tokens, with form-first mobile layout and existing local wedding photography. Removed unsupported four-step navigation, tone pills, autosaved state, instant-feature promises, and simulated success.
- Added bride/groom names, editable suggested title, required date, optional city, validation, loading/error states, verified-session gating, and database-backed success. Name changes preserve a manually edited title until explicitly reset.
- Added POST/GET /api/v1/weddings with Zod validation, authenticated verified-user checks, write-origin validation, services/repositories, transactional wedding + Owner creation, and membership-scoped reads. Added /weddings saved-details list and account links into onboarding.
- Documented optional brideName/groomName persistence/API fields. Finance fields and full workspace management remain deferred. No marketplace, master guests, or dress-code features were added.
- Validation: TypeScript and lint passed. Live integration test verified unauthenticated denial, invalid-date rejection, transactional persistence, saved names, Owner finance permission, and isolation from another account. Only fabricated test accounts/weddings were used and cleaned up. Browser visual verification remains unavailable. Production build passed; /onboarding returned 200 and unauthenticated /weddings redirected to /login. Successful sign-in now opens onboarding.
- Progress remains 2 of 12 because creation/list is a working slice, not the full shared workspace milestone.
### Verification guidance and resend — 7 October 2026

- Confirmed email delivery is not configured, while verification is required. Corrected login guidance so it does not tell users a link was sent when the service is unavailable.
- Added verification resend action with Better Auth for configured email delivery, and prevented reset requests from falsely reporting email delivery while unconfigured. Login derives email-service availability server-side without exposing credentials.
- Validation: TypeScript and lint passed. Email delivery cannot be tested without Resend configuration; verification remains required and no user verification flags were changed. Full account milestone remains incomplete.
### Local verification and recovery testing inbox — 7 October 2026

- Fixed the local signup dead end caused by mandatory verification with no email provider. In development with a loopback HTTP auth URL and no Resend key, authentication emails now go to an in-memory testing inbox at `/dev/mailbox`. Production continues to use Resend and require verified email; verification flags are never bypassed.
- Login and registration link to the testing inbox and explain local delivery. Existing unverified accounts can request a verification link from login, open it in the inbox, then sign in. The inbox clears on server restart, retains at most 20 messages, and rejects nonlocal Host headers. Real email delivery remains unconfigured.
- Extended authentication testing to follow actual preview-delivered verification and reset links instead of generating/seeding test tokens. All 45 checks passed, including invalid/blank credentials, length limits, password mismatch, local inbox host restriction, verification, both remember-device options, logout/re-login, reset-token reuse rejection, old-password denial, and session revocation. A separate test confirms preview read/write are disabled in production and for public auth URLs/configured providers.
- TypeScript, lint, and diff checks passed. One verified fabricated account was intentionally retained using `--keep-demo` for the user's manual browser testing; other test records were cleaned up. No real-user account was modified.
- Requested the login browser panel, but it returned `queued`. Both browser automation runtimes failed with `failed to write kernel assets`; watched browser interaction, layout, keyboard, and device checks remain blocked. Account milestone remains incomplete and progress stays 2 of 12.

### Registration and wedding onboarding code review — 7 October 2026

- Reviewed registration, the browser-only homepage starter, wedding onboarding, authentication/email changes, and transactional wedding persistence. Added a next-step link from the saved homepage draft to `/onboarding` and corrected outdated account availability copy; drafts remain local and details must be entered in wedding setup.
- Fixed the onboarding skip link so its focusable target exists during loading, signed-out, unverified, form, and saved states. Kept all wedding access checks on the server and the wedding/Owner writes in one transaction.
- Aligned the onboarding form with PRD FR-02: bride/groom names are optional, while title and date remain required. Empty names are omitted from the request rather than failing optional-field validation; supplied names still use length/trim validation.
- Fixed wedding integration-test cleanup to match both string and ObjectId authentication references, assert account/session removal, and refuse configured external email delivery. Extended checks for unverified sign-in, untrusted write origins, forged ownership, and the default timezone.
- Validation: wedding integration checks (including creation without optional names) and all 45 authentication smoke checks passed; newly fabricated records were removed. Email-preview guards passed, including production read/write denial. TypeScript, lint, diff whitespace checks, and the final production build passed; Next.js workers ran outside the Windows sandbox.
- Remaining: browser visual/keyboard checks, real email delivery, public-launch abuse protection, full workspace management, and automatic draft transfer. No additional milestone was marked complete; progress remains 2 of 12 (17%).

### One wedding per owner — 7 October 2026

- Applied the revised product rule: a user can create/own one wedding, including archived records; invited membership in other weddings remains permitted.
- Added a unique user-keyed weddingOwnership claim within the existing wedding + Owner transaction and checks for legacy ownership. Second/retried creation returns 409; simultaneous requests cannot create duplicate owned weddings.
- Onboarding displays the existing-wedding action for owners, and My weddings hides creation once a wedding is owned. Previously created duplicates are preserved; no user data was deleted or merged.
- Updated PRD, architecture, persistence, and API contracts for this user-requested change.
- Validation: live integration checks passed for sequential second-create rejection and concurrent creation (exactly one 201 and one 409), plus existing auth, validation, and tenant-isolation checks. Fabricated test records and ownership claims were cleaned up. TypeScript, lint, and git diff --check passed. Milestone count remains 2 of 12.
### Session-aware planning navigation — 7 October 2026

- Homepage account entry now shows Your account for signed-in users; all homepage planning CTAs show Go to your plan and no longer open a browser-only draft for authenticated users. Session loading avoids showing an incorrect signed-out action.
- Added /plan server entry: unauthenticated/unverified users return to login, users with accessible or owned weddings go to /weddings, and new users go to /onboarding. Successful sign-in and the account planning action use /plan.
- Existing verified owners visiting /onboarding redirect to saved weddings, preventing the repeated wedding-setup screen. Family collaborators with existing access also reach their plans through /plan.
- Validation: TypeScript, lint, and git diff --check passed. Live routing integration checks were attempted twice but stopped before creating fixtures because MongoDB returned a TLS connection error; new routing assertions remain unverified end to end. Progress count remains 2 of 12; full workspace/account milestones remain incomplete.
### Family invitations and access — 7 October 2026

- Implemented Family and invitation-acceptance pages using the two supplied Stitch HTML references, with shared fonts/colors, member and pending-invite lists, invitation/permission dialog, resend/revoke controls, and removal confirmation.
- Added Owner-only email invitations, Editor/Viewer roles, Editor-only finance permission, seven-day expiry, SHA-256 hashed random tokens, same-verified-email acceptance, transactional membership/invite acceptance, revoked/expired/mismatched-account states, and immediate removed-member denial.
- Added unique membership/token/pending-recipient indexes, wedding-scoped server authorization, write-origin validation, configurable email integration, invite volume limit, and safe provider error responses. Resending rotates the link; failed email attempts revoke the new invitation so a retry can proceed.
- Added family links to saved weddings. Login/registration preserve a validated family-invitation return path so recipients can return after authenticating. No collaborator ownership claim is created.
- Configured the user-supplied sender hello@makemymarri.com in ignored .env.local. Resend key has send-only scope, so domain-verification lookup is unavailable. No external test email has been sent; delivery remains unverified.
- Validation: initial TypeScript check passed after fixing null-flow typing. Lint, TypeScript, production build, and git diff --check passed. Live fixture tests passed for matching-email acceptance/retry, role/finance validation, Owner-only authorization, revocation, member removal, and tenant isolation; temporary accounts, weddings, memberships, and invite records were cleaned up. Repeated tests also passed for duplicate pending invitations and expired links. No external emails were sent during validation. Browser visual review remains unavailable. Family milestone stays incomplete until workflow and delivery are verified; progress remains 2 of 12.
### Email failure diagnostics — 7 October 2026

- Replaced generic invitation delivery failures with safe categorized messages for unverified sending domain, test-recipient restriction, sender/key permissions, rate limit, and provider connectivity.
- Server diagnostics contain only category, provider code, and status; email contents, recipient addresses, raw tokens, and API keys are not logged by the new diagnostics.
- Existing failed attempts logged an empty provider error; their exact rejection reason cannot be recovered. No invitation email was resent for diagnosis. Sender domain verification remains unconfirmed because the API key is send-only.
- Validation: TypeScript and git diff --check passed. No live delivery was tested. Progress remains 2 of 12.
## Updating this file


Record each meaningful change with its date, outcome, checks performed, and remaining limitations. Check a milestone only when its stated scope is complete, and recalculate the bar/count/percentage together. The PRD and design documents remain authoritative for scope and architecture.
