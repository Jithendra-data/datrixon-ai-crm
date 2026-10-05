# Contributing

Use Node 24. Install with npm ci, then run lint, typecheck, tests, format validation and build. Apply local migrations and run the HTTP smoke suite before submitting behavior changes.

Keep domain calculations pure and role checks server-side. Add a negative authorization test for new mutations. Monetary fields use integer cents. Never add real customer data, secrets, fabricated outcomes or unsupported claims.

Generate Drizzle migrations after schema edits. Do not rewrite applied migrations. Use explicit transactions for mutations with audit events. Explain metric scope and source evidence in documentation.

Use descriptive commits and PRs covering problem, behavior, validation and limits. Prefer narrow changes over speculative abstractions. Follow the review rubric in docs/review.md.

