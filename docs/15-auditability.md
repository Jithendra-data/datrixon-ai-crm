# Auditability

> **Deployment boundary:** the public GitHub Pages demo uses browser-local SQLite and synthetic data. Role controls and audits there are simulations, not security boundaries. Server enforcement described in this document applies to the runnable server edition in this repository. See [Deployment](20-deployment.md).

Each supported mutation appends an event with actor, action, entity, detail, timestamp and request ID. Opportunity edits record before/after stage, close date and next action. Persona switches are explicitly labeled synthetic. Agent runs, workflow execution, recommendation decisions, briefs and semantic queries are observable.

Mutation and audit statements execute in a D1 batch transaction. Optimistic opportunity updates gate their history and audit writes to the successful request marker, preventing false events after version conflicts. Recommendation acceptance uses stable task/review IDs and conditional inserts.

The system excludes raw copilot prompts, secrets and provider credentials from request logs. AI request records retain intent, provider mode, record count, status and duration. Structured error logs contain request ID, status, duration and error type, not stack or payload exposure to clients.

Audit access is server-filtered. Events cannot be edited through the application. This is not immutable/WORM storage, cryptographic tamper evidence or a complete database-administrator audit. Production requires restricted DB credentials, independent audit export, retention policy, monitoring and restore validation. Account changes made directly in the database are outside application auditing.
