# Make My Marriage

Make My Marriage is an India-first collaborative wedding-planning web application for couples and families.

**Current stage:** scaffold and responsive homepage preview, including a browser-only wedding draft. Shared MVP workspaces and account screens are not implemented yet. See [project progress](./docs/progress.md).

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS, MongoDB Atlas with the native driver, Better Auth, Zod, Resend, Cloudflare R2, Cloudflare Turnstile, and Vercel.

## Local setup

1. Install Node.js 20.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and provide the required service credentials.
3. Run `npm run dev` and open `http://localhost:3000`.

Useful checks: `npm run typecheck`, `npm run lint`, and `npm run build`.

## Documentation

Start with the [documentation index](./docs/README.md), which links the approved PRD, system design, database design, and API contract.
