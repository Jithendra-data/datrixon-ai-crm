# Activity ingestion and CRM memory

The **Activity capture** page submits a normalized synthetic email event. The shared service validates its timestamp and payload, requires exactly one accessible contact with the exact email address and an account relationship, then writes the activity, provenance event, contact/activity junction, structured account memory, snapshot and audit event in one database transaction.

`(workspace_id, provider, external_id)` is unique. An exact replay returns the earlier outcome; reuse with changed content returns a conflict. Unknown or ambiguous contact matches fail closed. Imported text is untrusted and has no action authority. The provider is fixed to `demo-email`; the form does not authenticate the sender or imply a Gmail/Microsoft connection. No opportunity is guessed from an email address, and no message is sent.

The browser demo stores data in tab-local session storage. Do not enter real customer data. A production mailbox connector needs OAuth consent, encrypted refresh tokens, webhook verification, incremental sync cursors, delivery queues, retry policy, deletion/retention controls and permission revocation. These are not implemented.

## Structured memory

Memory contains a timestamp, method, account summary, next actions, recorded decision criteria, stakeholders, risks, recent interactions, evidence references, explicit unknowns and a source-version fingerprint. Generate a meeting brief or import an email to refresh it. The memory panel reports staleness after relevant records change or seven days pass. It is a durable structured snapshot, not a vector store or learned memory. Pain points, objections, adoption and sentiment are not fabricated.

Decision-maker coverage checks economic buyers/decision makers linked to an opportunity and interactions explicitly linked to those contacts **and that opportunity**. Account-level activity is insufficient. The email demo links a contact but does not guess an opportunity, so it cannot silently clear a deal's buyer-engagement warning.
