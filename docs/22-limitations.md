# Known limitations

> **Deployment boundary:** the public GitHub Pages demo uses browser-local SQLite and synthetic data. Role controls and audits there are simulations, not security boundaries. Server enforcement described in this document applies to the runnable server edition in this repository. See [Deployment](20-deployment.md).

This is a production-oriented reference implementation, not a production-certified system.

- The live copilot and agents are deterministic. A provider interface exists but external narration, Anthropic integration and live model evaluation are not connected.
- Demo sessions and persona switching are synthetic role simulation, not enterprise SSO/MFA or administrative identity management.
- No live email/calendar/ERP ingestion, external email sending, automatic merging or commercial agent execution exists.
- Leads, campaigns, territories, tags and quotes are modeled and seeded; broad CRUD screens and full marketing/order workflows are not implemented.
- Workflow execution is manual; no scheduler or background queue runs here.
- Forecasting is stage-weighted. Stage-change attribution is partial, not a historical total forecast snapshot or ML model.
- Some quality remediation requires source edits beyond the UI. Duplicate candidates are never automatically consolidated.
- CRM memory is a timestamped deterministic summary and can become stale. Relationship visualization is account/contact structure, not full graph analytics.
- Read aggregates have a strict 2,000-row/table reference limit. Search is paginated substring matching, not fuzzy indexing.
- Audit is application-append-only, not externally immutable. Some ancillary evidence/actor IDs lack foreign keys.
- Quotas bound demo creation and mutations but are not comprehensive abuse protection. Expired sessions do not automatically delete stored workspaces.
- No external security assessment, load benchmark, backup/restore drill, production enterprise deployment or measured ROI is claimed.
- Docker configuration has not been executed in the authoring environment.

The [roadmap](23-roadmap.md) prioritizes these gaps before increasing feature count.
