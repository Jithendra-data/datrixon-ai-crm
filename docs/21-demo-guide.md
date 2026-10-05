# Demo guide

> **Deployment boundary:** the public GitHub Pages demo uses browser-local SQLite and synthetic data. Role controls and audits there are simulations, not security boundaries. Server enforcement described in this document applies to the runnable server edition in this repository. See [Deployment](20-deployment.md).

Start a fresh synthetic workspace. Julian Park is the default Sales Manager. The scenario includes 12 accounts, 24 opportunities, 26 contacts, 96 activities, 27 paid orders and intentional quality/risk patterns.

1. **Command center:** inspect open/weighted pipeline, paid orders and risk. Select a metric for lineage. Read the deterministic executive brief.
2. **Customer 360:** choose Meridian Robotics. See support exposure, stakeholders, timeline, products and commercial history. Prepare a meeting brief; inspect the memory snapshot.
3. **Pipeline:** inspect a risky deal, enter a next action and update its stage. Check Changes & Signals and Audit for record-level attribution.
4. **Copilot:** ask about quiet customers, deals over $100,000 with no activity in 14 days, forecast decline or a named account. Try an unsupported question and observe the honest fallback.
5. **Morning brief:** accept, snooze or dismiss a recommendation. Acceptance creates a planning task and review.
6. **Governance:** switch to the Executive persona for independent review. Run workflows as Sales Manager; inspect notifications and rerun to verify no duplicate daily alerts.
7. **Data quality:** inspect duplicate candidates, missing ownership and overdue close dates. Acknowledge; unresolved source issues cannot be falsely resolved.
8. **Analyst persona:** verify read-only behavior. **Maya Thompson:** verify account-scoped results.
9. **Build vs buy:** change engineering maintenance costs and observe the three-year tradeoff.

All names and events are fictional. Logging an email does not send it. Completing a recommendation does not prove external customer action. Server session access lasts 24 hours. The Pages scenario lives in browser tab storage; use End demo session to reset it.

## Upgraded demo tour

1. Open Datrixon Signals, filter Forecast, inspect source details and compare the last week with yesterday.
2. Open Revenue analytics and select pipeline, paid order value or current-quarter weighted forecast in **Why did this change?**. Inspect baseline provenance and matched-account coverage.
3. Switch personas and open My Morning Brief. Ranking includes role, ownership, exposure and urgency with its arithmetic displayed.
4. Accept a recommendation, switch to a different authorized reviewer, approve it in AI governance, switch back, start the plan and mark it complete. Inspect the AI Value Center feedback ledger.
5. Import a synthetic email in Activity capture. Open the linked account's Memory tab; see structured facts and freshness. Log a new activity and see that the older memory becomes stale.
6. For relationship coverage, log a deal-linked interaction with a named economic buyer. Account-only activity does not clear the coverage warning.
7. Change cost growth assumptions and select a five-year horizon in Build vs buy.

Existing tabs preserve their previous data through schema migration. They do not receive fabricated baseline history; start a fresh demo only if you want the authored synthetic history scenario.
