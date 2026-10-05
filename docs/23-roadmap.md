# Roadmap

## Before real customer data

Replace demo sessions with SSO/MFA and explicit memberships. Introduce production tenant authorization tests, field-level policies, secrets management, immutable audit export, retention scheduling, backup/restore exercises, edge quotas and security assessment.

## Improve decision quality

Add historical forecast/health snapshots and complete change attribution. Define evaluation datasets, outcome windows and user feedback reasons. Calibrate risk only with representative historical outcomes. Version recommendation recurrence so changed conditions can responsibly reopen work.

## Connect actual workflows

Implement authenticated inbox/calendar ingestion with consent, idempotency, source contracts and provenance. Add account/contact remediation and human-controlled duplicate merge previews. Build a real outbound draft/approval/execution state machine only after action-specific authorization and delivery reconciliation exist.

## Scale the architecture

Move aggregation to SQL and resource-level pagination. Evaluate PostgreSQL/RLS and CDC when workload and team size justify migration. Separate analytical storage only for demonstrated isolation needs. Introduce durable jobs, retries and dead-letter handling for external work.

## Generative intelligence

Wire a reviewed provider adapter, budgets, timeouts, grounding checks and evaluation suite. Distinguish model narrative from deterministic facts. Native provider adapters should be tested independently; never give models unrestricted database or action access.
