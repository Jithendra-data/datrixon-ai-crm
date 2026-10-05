# Deployment

## Public website: GitHub Pages

The public distribution is a static React application built with Vite. It runs the shared CRM services against real SQLite compiled to WebAssembly (sql.js). It makes no calls to an application backend or external AI provider. GitHub Pages supplies HTML, JavaScript, CSS and WASM assets; all scenario processing happens in the visitor's browser.

Run `npm ci`, `npm run build:pages`, then `npm run preview:pages`. Open `http://127.0.0.1:4174/datrixon-ai-crm/` and start the demo. Hash routes support deep links and refresh without a server rewrite. Synthetic changes persist in sessionStorage within the tab when storage is available. End demo session clears the scenario. Browser restoration policies may preserve tab storage; do not use real data.

The GitHub Actions quality workflow tests both editions, then uploads `dist-pages` and deploys through GitHub Pages on pushes to main. Configure repository Settings → Pages → Source: GitHub Actions. Deployment uses the built-in GITHUB_TOKEN and OIDC; no personal token or cloud credential belongs in the repository. This project is not deployed on ChatGPT Sites.

**The Pages edition has no secure authentication, server authorization, shared database or tamper-resistant audit.** Persona switching and approvals are simulations. Its calculations and transactions use the same services as the server edition. SQL foreign keys protect consistency, not confidentiality from the browser owner.

## Server reference edition

Use Node 24: `npm ci`, `npm run build`, `npm run db:migrate`, `npm start`. Start the interactive demo to seed an isolated workspace and session. Data persists in ignored `.wrangler/state`. The server edition implements HttpOnly hashed bearer sessions, origin validation, server role checks, workspace scope, quotas and transactional audits.

Local migration uses `wrangler.local.json` and an intentionally local database identifier. Do not deploy that identifier. Migration history prevents replay. Do not rewrite migrations already applied to a database.

For a separate Cloudflare deployment, create D1, set its actual ID in a separate ignored production Wrangler configuration, point main to the built Worker output and assets to dist/client, apply migrations remotely, then deploy. Configure custom domain/TLS, quotas, observability and access controls in that account. No such server deployment is claimed. Build scaffolding from the original Worker starter remains for local reproducibility; GitHub Pages does not use it.

## Containers

`docker compose up --build` builds, migrates local SQLite/D1 emulation and starts on port 8787 with a persistent volume. Docker execution is unverified here because its engine was stopped.

## Operations before real data

Use the server edition and replace persona provisioning with enterprise identity and workspace memberships; disable the demo endpoint. Add scheduled expiry cleanup, tested backup/restore, edge limiting, monitoring, WORM audit export and managed secrets. Session expiration denies access but does not delete workspace rows. Test integrations and migration paths in staging. Never connect the static Pages sandbox to confidential data.
