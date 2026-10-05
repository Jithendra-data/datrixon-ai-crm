# Security policy

This repository is a synthetic-data reference implementation. Do not enter real customer, financial, health or confidential data into the public demo.

Report vulnerabilities privately through the repository's GitHub security reporting mechanism if enabled. If private reporting is unavailable, contact the repository owner through an established private channel before publishing exploit details. Do not post tokens or personal data in issues.

The current release is the only maintained reference version. No response-time SLA, compliance certification or production security guarantee is offered.

Implemented controls and remaining limits are documented in docs/12-security.md and docs/13-rbac.md. Demo persona switching must never be used as enterprise authentication. Any real-data deployment requires identity, retention, backup/restore, monitoring and independent security review.


The public GitHub Pages distribution runs entirely in the browser. Its persona permissions, approvals and audits are illustrative and can be modified by the browser owner. It provides no secure authentication or server enforcement. The security controls documented for the HTTP API belong to the separate runnable server edition.
