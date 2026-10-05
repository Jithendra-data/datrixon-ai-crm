# HTTP API

> **Deployment boundary:** the public GitHub Pages demo uses browser-local SQLite and synthetic data. Role controls and audits there are simulations, not security boundaries. Server enforcement described in this document applies to the runnable server edition in this repository. See [Deployment](20-deployment.md).

Same-origin JSON requests only. Session cookies are required except health and demo provisioning. Responses are no-store. Errors contain a safe message and request ID.

| Method | Path                     | Purpose                                             |
| ------ | ------------------------ | --------------------------------------------------- |
| GET    | /api/health              | Database reachability and app version               |
| POST   | /api/demo                | Resume or create synthetic workspace/session        |
| GET    | /api/workspace           | Scoped bounded workspace, persona, metrics and mode |
| GET    | /api/search?q=...&page=1 | Scoped substring search, 20 records/page            |
| POST   | /api/persona             | Change synthetic persona with user_id               |
| POST   | /api/actions             | Validated domain action                             |
| POST   | /api/logout              | Revoke current session and clear cookie             |

Action discriminators: create_opportunity, update_opportunity, log_activity, recommendation, task, notification, quality, run_agents, run_workflows, brief, ask, workflow, approve.

```json
{
  "action": "update_opportunity",
  "id": "o1",
  "version": 1,
  "stage_id": "negotiation",
  "close_date": "2027-01-20",
  "next_action": "Confirm procurement timeline with decision maker"
}
```

Opportunity amounts are integer cents. Dates use YYYY-MM-DD with calendar validation. Stage values: discovery, qualified, proposal, negotiation, won, lost. Every body schema is strict; unknown properties are rejected.

Status codes: 400 invalid request, 401 absent/expired session, 403 role/origin restriction, 404 missing scoped record, 409 conflict, 413 oversized payload, 422 reference capacity, 429 quota, 503 missing DB, 500 safe internal failure.

The workspace endpoint is a bounded demo aggregate, not an unlimited enterprise export API. Search is substring-based, not fuzzy. Full OpenAPI generation and resource-level pagination are future improvements.

## Intelligence upgrade actions

POST `/api/actions` additionally accepts `capture_snapshot`, `import_email` (external_id, from, subject, body, occurred_at), and `execute_plan` (approval id). Recommendation decisions accept optional reason_code and outcome. Ask accepts optional narrate boolean; only the server API can inject a configured provider. See the strict discriminated schema in `lib/crm/service.ts`. All actions retain existing origin, session, scope and role checks.
