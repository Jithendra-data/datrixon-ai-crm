# Interview narrative

> **Deployment boundary:** the public GitHub Pages demo uses browser-local SQLite and synthetic data. Role controls and audits there are simulations, not security boundaries. Server enforcement described in this document applies to the runnable server edition in this repository. See [Deployment](20-deployment.md).

## 30 seconds

“I built Datrixon AI CRM as a reference for an AI-native customer operating system. It joins relational customer data with explainable risk, health, change detection and next actions. Every recommendation has evidence, and people retain authority. The data is synthetic and the working intelligence is deterministic.”

## Two minutes

“Generic CRMs often collect data without making daily decisions easier. I started with the manager's question: what deserves attention? The command center connects pipeline exposure, customer health and specific follow-ups. Customer 360 explains the relationship in one place. A constrained copilot answers supported questions using authorized records, with visible calculation logic.

The architecture is a TypeScript modular monolith with SQLite/D1 persistence. I chose that for a runnable public reference instead of requiring a database server. I implemented prepared queries, composite tenant keys, server roles, session expiry, origin checks, optimistic updates and atomic audit writes. Tests use actual SQLite transactions and verify negative authorization paths.

The project is not a Salesforce replacement or enterprise deployment. Its value is the design and verified implementation of an evidence-to-action loop. Production identity, integration, retention and model evaluation remain explicit work.”

## Technical and architecture explanation

Explain the HTTP/session/service/repository boundaries. Show one stage edit moving through validation, permission checks, versioned update, history and audit in one transaction. Then show the same records feeding weighted forecast attribution. Discuss why a warehouse or distributed agent service was unnecessary.

## Business value

The hypothesis is better attention and workflow fit, not automatic license savings. Demonstrate the configurable ownership calculator and explain maintenance, security, integration and support obligations. Distinguish operational counters from measured productivity or revenue outcomes.

## AI explanation

The current assistant is deterministic semantic routing. It has no database tool authority. The optional provider interface is an extension, not a completed live LLM integration. Explain why unsupported questions fail closed and why prompt instructions alone cannot enforce security.

## Tradeoffs and lessons

Stable duplicate identities matter: database ordering changed which candidate appeared to exist, and integration tests caught it. Full document navigation replaced a failing experimental client-router path. Those are concrete engineering lessons, not claims of scale.

Discuss demo identity versus production authentication, rule scores versus calibrated predictions, stage attribution versus full snapshots, and application audit versus immutable evidence. Do not claim enterprise customers, measured savings, benchmark results, live integration or work performed by an external model.
