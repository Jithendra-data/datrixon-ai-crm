# Overview

> **Deployment boundary:** the public GitHub Pages demo uses browser-local SQLite and synthetic data. Role controls and audits there are simulations, not security boundaries. Server enforcement described in this document applies to the runnable server edition in this repository. See [Deployment](20-deployment.md).

Datrixon AI CRM demonstrates the loop **record → analyze → explain → recommend → human decision → audit**. It is separate from Datrixon ERP Intelligence: this product focuses on customer relationships and commercial follow-through.

Start with [vision](01-product-vision.md), [business problem](02-business-problem.md), [architecture](03-architecture.md) and [data model](04-data-model.md). Follow [workflows](05-crm-workflows.md), [AI architecture](06-ai-architecture.md), [agents](07-agent-system.md), [actions](08-next-best-action.md), [risk](09-risk-scoring.md), [health](10-customer-health.md) and [quality](11-data-quality.md).

Trust boundaries: [security](12-security.md), [RBAC](13-rbac.md), [governance](14-ai-governance.md), [audit](15-auditability.md), [analytics](16-analytics.md). Ownership: [economics](17-build-vs-buy.md), [API](18-api-reference.md), [testing](19-testing.md), [deployment](20-deployment.md), [demo](21-demo-guide.md).

The [limitations](22-limitations.md), [roadmap](23-roadmap.md), [decisions](24-design-decisions.md) and [portfolio story](portfolio-story.md) define the honest implementation boundary. Source, tests and documentation should agree; discrepancies are defects.
