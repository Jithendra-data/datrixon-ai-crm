# Agent system

Agents are observable rules, not autonomous models. A manual run uses authorized records, preserves decisions and appends execution records.

| Agent               | Analysis                                            |
| ------------------- | --------------------------------------------------- |
| Opportunity Risk    | Weighted source-backed deal risk                    |
| Customer Health     | Engagement, support and overdue task deductions     |
| Follow-Up           | Customer contact at least 14 days old               |
| Pipeline Hygiene    | Missing next actions, overdue dates, stale activity |
| Duplicate Detection | Normalized exact email/domain candidates            |
| CRM Data Quality    | Missing ownership, email and account links          |
| Lead Qualification  | Explicit completeness and commercial-value points   |
| Forecast            | Weighted pipeline and stage-change contributions    |

Logs show agent, trigger, reviewed count, result, confidence description, time, status and approval requirement. Confidence means rule coverage, not predictive probability. No research agent claims to browse fictional organizations. Nothing sends email or merges records.

Stable rule/entity keys prevent duplicate recommendations. Dismissed suggestions are not automatically reopened; versioned recurrence is future work. Failed requests produce structured error logs, but a durable failed-agent execution ledger is not yet implemented.
