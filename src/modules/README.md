# Domain modules

Each feature module owns its domain types and, when needed, its `*.schema.ts`, `*.service.ts`, and `*.repository.ts` files. Route handlers remain thin and call these module boundaries. Empty feature directories mark the approved MVP domains without inventing business logic during scaffolding.
