# Opportunity risk v1

Score only open deals; closed records have zero open-pipeline risk. Add weights, cap at 100.

| Factor                                     | Points |
| ------------------------------------------ | -----: |
| No contact or contact ≥30 days old         |     30 |
| Contact 14–29 days old                     |     20 |
| More than 30 days in stage                 |     15 |
| Missing next action                        |     15 |
| Close date passed                          |     20 |
| Close within 14 days with stale engagement |     10 |
| Close date moved at least twice            |     10 |
| Unresolved critical case                   |     15 |
| Fewer than two stakeholders                |     10 |

Past-close and near-close are exclusive. Customer contact means an opportunity-linked call, email or meeting; account-only activity does not imply deal engagement. Every factor includes a source. Score ≥50 defines at-risk pipeline, not loss probability.

The model is uncalibrated. Deal size and historical conversion effects are excluded instead of invented. Validate weights with domain experts and time-sliced outcomes before calling it predictive.
