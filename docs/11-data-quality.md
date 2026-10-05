# Data quality

Rules detect normalized email duplicates, shared domains, missing emails, unlinked contacts, missing account ownership, missing next actions, overdue close dates, absent customer activity and inactivity ≥14 days.

Findings contain severity, kind, record, account context, description, remediation and state. Acknowledgement differs from resolution. Resolution reevaluates the source rule; unresolved defects cannot simply be marked fixed.

Duplicates are candidates: shared domains and inboxes can be legitimate. Sorting by stable ID makes candidate identity independent of database ordering. Fuzzy matching and merge-survivorship are not implemented.

Core foreign keys prevent broken references; no fake broken-FK example is seeded. Some remediation needs source edits beyond the current UI; those findings remain acknowledged. Production ingestion needs contracts, rejection queues, idempotency and source lineage before automatic capture.
