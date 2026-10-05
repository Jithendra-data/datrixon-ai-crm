# Security model

> **Deployment boundary:** the public GitHub Pages demo uses browser-local SQLite and synthetic data. Role controls and audits there are simulations, not security boundaries. Server enforcement described in this document applies to the runnable server edition in this repository. See [Deployment](20-deployment.md).

The demo accepts synthetic data only. Random opaque bearer tokens are stored as SHA-256 hashes and sent in HttpOnly, SameSite=Strict cookies, with Secure on HTTPS. Sessions expire after 24 hours. Origin checks guard all POST endpoints. Possession of a token grants access to that isolated synthetic workspace.

Prepared statements bind all user values. Dynamic table names come from internal allow-lists. Zod rejects unknown mutation properties and malformed values. No HTML rendering API, file upload, arbitrary SQL, model tools or email delivery is exposed. React escapes record text.

Authorization executes before every mutation. Representatives operate on owned accounts; other roles have explicit broader functional scope. Workspace IDs scope all repository reads. Composite foreign keys prevent core cross-workspace references. AI receives only the authorized dataset.

The API limits payload length, workspace mutation throughput (30 requests per UTC minute) and global demo creation (100 workspaces per UTC day). Reads cap at 2,000 rows per table and fail explicitly. Quotas are not full DDoS protection: edge request limiting and identity quotas remain deployment work.

No SSO, MFA, password login or real customer tenancy is claimed. Add enterprise identity and memberships before real use. Demo role switching must be removed, not repurposed as login. Audit is application-append-only, not tamper-proof against database administrators. Backups, restore drills, retention scheduling, WAF policy, vulnerability monitoring and penetration testing remain operational gates. No compliance certification is asserted.
