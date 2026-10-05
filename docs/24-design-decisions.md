# Design decisions

| Decision                      | Reason                                                   | Cost / revisit condition                                  |
| ----------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Modular monolith              | Traceable flow and simple deployment                     | Split only with measured independent workloads            |
| SQLite / D1                   | Easy local setup and hosted relational persistence       | PostgreSQL migration for enterprise scale/RLS             |
| Integer USD cents             | Exact operational arithmetic                             | Multi-currency requires explicit FX and accounting policy |
| Composite workspace keys      | Core relational tenant integrity                         | Ancillary actor/evidence references still need hardening  |
| Deterministic first           | Useful without keys; inspectable results                 | Cannot understand arbitrary conversation                  |
| No generated SQL              | Narrow, auditable semantic interface                     | New intents need implementation                           |
| Human-controlled mutation     | Prevent invisible commercial decisions                   | More explicit workflow steps                              |
| Full document navigation      | Reliable behavior after experimental RSC routing failure | Additional page loads                                     |
| Bounded operational analytics | Avoid a premature warehouse                              | SQL aggregation/pagination needed beyond reference scale  |
| No destructive delete         | Preserve customer evidence and audit context             | Archival/retention administration remains future work     |

The main architectural weakness is the experimental Vinext runtime. It enables the available Worker deployment path but deserves careful version pinning and regression testing. A conventional supported Next.js/Node deployment with PostgreSQL is a reasonable alternative when infrastructure is available.

The goal is not minimum lines or maximum screens. It is a coherent, reviewable decision loop with honest boundaries.

## ADR: GitHub Pages with a browser-local SQLite adapter

The requested host is GitHub Pages, which cannot run the application API. The public edition reuses the domain services and migrations through a sql.js Database adapter and a small local transport. The server edition remains runnable and tested. This avoids a second implementation of risk, approval and workflow rules while making the absence of a trusted server explicit. Tab storage is disposable, identity is simulated, and no real customer data or provider keys should ever enter this edition. Hash navigation supports refresh without Pages rewrites. The public bundle loads SQLite lazily when a workspace is opened.
