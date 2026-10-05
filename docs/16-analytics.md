# Analytics & lineage

All monetary calculations use integer USD cents. The operational semantic layer derives metrics from authorized records at request time; no second warehouse copy is maintained.

| Metric              | Definition                                            |
| ------------------- | ----------------------------------------------------- |
| Open pipeline       | Sum amount for stages other than won/lost             |
| Weighted pipeline   | Sum open amount × stage probability / 100             |
| Commit              | Open amount with commit category                      |
| Best case           | Open amount with commit or best_case category         |
| Won/lost value      | Sum amounts in respective closed stages               |
| Win rate            | Won count / all closed count                          |
| Won cycle           | Mean days from creation to entry into won stage       |
| Paid order value    | Sum paid order line quantity × unit price             |
| At-risk pipeline    | Open amounts with risk-v1 ≥50                         |
| Stage-driven change | Sum historical amount × probability delta over 7 days |

Categories overlap; never sum commit, best case and weighted figures. Metrics cover all recorded history/close dates unless specifically labeled. Paid orders are not accounting revenue. Stage attribution excludes amount changes, deletions and close-date movement: no total forecast trend is invented.

Rep activity counts are not employee performance judgments. Health distribution reflects rule scores. AI Value reports recorded decisions and brief/query counts, not labor or dollar savings.

At larger scale, introduce paginated SQL aggregations, periodic forecast/health snapshots, a metric registry and reconciliation tests, then a dimensional warehouse only when workload isolation justifies it. DimAccount/FactOpportunity names alone would not improve this bounded implementation.
