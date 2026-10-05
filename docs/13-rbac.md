# Role-based access

> **Deployment boundary:** the public GitHub Pages demo uses browser-local SQLite and synthetic data. Role controls and audits there are simulations, not security boundaries. Server enforcement described in this document applies to the runnable server edition in this repository. See [Deployment](20-deployment.md).

| Role                 | Read scope     | Operational writes    | Approve | Run agents/workflows | Audit | Workflow configuration |
| -------------------- | -------------- | --------------------- | ------- | -------------------- | ----- | ---------------------- |
| Administrator        | Workspace      | Yes                   | Yes     | Yes                  | Yes   | Yes                    |
| Executive            | Workspace      | No                    | Yes     | No                   | Yes   | No                     |
| Sales Manager        | Workspace      | Yes                   | Yes     | Yes                  | Yes   | No                     |
| Sales Representative | Owned accounts | Yes, scoped           | No      | No                   | No    | No                     |
| Customer Success     | Workspace      | Activity/tasks/triage | No      | Yes                  | No    | No                     |
| Support              | Workspace      | Activity/tasks/triage | No      | No                   | No    | No                     |
| Analyst              | Workspace      | No                    | No      | No                   | No    | No                     |

Customer Success and Support cannot create or modify commercial opportunities. An approver must differ from the planning request's requester. User directory and product catalog remain workspace-visible; rep scope follows account ownership, including historical deals owned by other people.

The server selects the current user from the session, never from a mutation-supplied role. Public payload filtering removes unauthorized audit and agent execution context. Search, copilot and brief generation use the same scope.

The synthetic persona endpoint permits role simulation only inside synthetic workspaces. It is not a production access-control administration endpoint. Integration tests directly call the mutation service as unauthorized users and test composite foreign-key tenant boundaries. Hiding a button is only a UX convenience.
