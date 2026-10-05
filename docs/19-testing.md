# Testing strategy

Unit tests verify risk/health arithmetic, metric reconciliation, workflow boundaries, stable recommendations, quality rules, deterministic copilot fallback, scope-safe evidence, CSRF checks and TCO calculations.

Integration tests run generated migrations in real in-memory SQLite with foreign keys enabled. The adapter mirrors D1 prepared statements and atomic batch behavior. Tests cover creation, versioned updates, rollback, role denial, account scope, cross-workspace foreign keys, session hashing/expiry, decision transitions, independent approval, workflow idempotency, source-verified quality resolution and durable memory.

HTTP smoke tests run against the built Worker and local D1. They verify routes, authentication, provisioning, search, copilot and server authorization. This exercises transport and runtime behavior beyond the in-memory adapter. Browser checks inspect the main product views, critical interactions, navigation, responsive layout and console errors. Screenshots are captured from the actual local application.

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, `npm run build`, `npm run db:migrate`, then start the app and `npm run test:smoke`.

Limitations: no load test, independent penetration test, production disaster-recovery exercise or live LLM evaluation. The Docker image is supplied but unexecuted in the authoring environment. No benchmark or uptime claim is made.

The Pages adapter test executes the actual migrations and shared mutation service in sql.js, verifies transaction rollback, and checks export/restore. Browser verification also covers hash navigation and tab persistence. Run `npm run build:pages` for the static distribution.

## Intelligence upgrade validation

The suite now includes exact snapshot attribution reconciliation, missing/malformed baselines, scoped Signals, forecast quarter boundaries, memory freshness, provider timeout/failure/citation/number validation, atomic narrative quota, ingestion replay/conflict/scope, explicit buyer participation and the full internal approval lifecycle. Tests use provider fixtures; no real model quality claim follows from them.
