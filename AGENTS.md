# Make My Marriage engineering rules

- Read `/docs` before implementing major features.
- The PRD defines product behavior, the System Design defines architecture, the Database Design defines persistence, and the API Documentation defines HTTP contracts.
- Keep the application a TypeScript modular monolith. Do not introduce microservices without explicit approval.
- Keep business logic out of React components and route handlers; use validation, authorization, services, and repositories.
- Validate system boundaries with Zod and use the official MongoDB Node.js driver.
- Treat each wedding as an isolated tenant and enforce authorization on the server.
- Store monetary values as integer paise.
- Keep Cloudflare R2 objects private and credentials server-only.
- Never commit secrets.
- Do not add master guest management, dress-code features, or an MVP vendor marketplace.
- Prefer simple implementations over speculative abstractions.
- Update `docs/progress.md` whenever a feature or meaningful fix is added: record completed work, current work, remaining milestones, and validation performed. Keep its progress bar and completed milestone count consistent with the checklist; distinguish previews and scaffolding from working end-to-end features.
