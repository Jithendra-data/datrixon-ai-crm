# AI governance

> **Deployment boundary:** the public GitHub Pages demo uses browser-local SQLite and synthetic data. Role controls and audits there are simulations, not security boundaries. Server enforcement described in this document applies to the runnable server edition in this repository. See [Deployment](20-deployment.md).

Four concepts are distinct: deterministic summary, rule-generated recommendation, human-confirmed action and automated system task/notification. UI labels state the execution mode. No external LLM is active.

Rules and prompts are versioned in source, not silently editable by every user. Agent logs expose trigger, reviewed count, result, status and confidence meaning. Approval records capture requester, reviewer and decision. Task acceptance creates a planning request; it does not grant authority to change commercial terms.

No model can send messages, merge customers, reassign owners, execute SQL or access secrets. Commercial changes use explicit validated human forms. Independent planning approval cannot be self-approved.

Governance exposes enabled workflows and access restrictions. Rule agents are currently enabled by code configuration; the UI does not pretend each agent has a working toggle. Durable failure history, configurable agent enablement and calibrated confidence thresholds belong on the roadmap.

Before adding generative narration, evaluate prompt injection, evidence faithfulness, cross-scope leakage, timeouts, cost budgets and provider logging. Generated prose must remain visibly separate from computed facts; high-impact action execution requires a new action-specific authorization design.
