"use client";
import { useState } from "react";
import { defaultCosts, tco, type Costs } from "../../lib/crm/economics";
import { Card, Badge } from "./primitives";
export default function Economics() {
  const [costs, setCosts] = useState(defaultCosts);
  const result = tco(costs);
  const usd = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  const labels: Record<keyof Costs, string> = {
    seats: "Licensed seats",
    licensePerSeat: "Annual license / seat",
    saasImplementation: "SaaS implementation · one time",
    saasIntegration: "SaaS integrations · annual",
    saasSupport: "SaaS internal support · annual",
    development: "Initial development · one time",
    infrastructure: "Infrastructure · annual",
    ai: "AI usage · annual",
    maintenance: "Engineering maintenance · annual",
    security: "Security & compliance · annual",
    support: "Internal support · annual",
    switching: "Migration & switching · one time",
  };
  return (
    <>
      <div className="notice">
        <Badge tone="amber">Illustrative assumptions</Badge> The $600,000 annual
        subscription scenario is a configurable example. It is not a price quote
        or a measured Datrixon saving.
      </div>
      <div className="two-col">
        <Card title="Change the assumptions" eyebrow="USD · nominal costs">
          {Object.entries(costs).map(([key, value]) => (
            <label className="cost-row" key={key}>
              <span>{labels[key as keyof Costs]}</span>
              <input
                aria-label={labels[key as keyof Costs]}
                type="number"
                min="0"
                max="1000000000"
                value={value}
                onChange={(e) =>
                  setCosts({
                    ...costs,
                    [key]: Math.min(
                      1000000000,
                      Math.max(0, Number(e.target.value)),
                    ),
                  })
                }
              />
            </label>
          ))}
        </Card>
        <div>
          <Card title="Three-year ownership cost">
            <div className="cost-total">
              <span>Buy</span>
              <strong>{usd(result.buy)}</strong>
            </div>
            <div className="cost-total">
              <span>Build</span>
              <strong>{usd(result.build)}</strong>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Buy</th>
                  <th>Build</th>
                </tr>
              </thead>
              <tbody>
                {result.years.map((y) => (
                  <tr key={y.year}>
                    <td>Year {y.year}</td>
                    <td>{usd(y.buy)}</td>
                    <td>{usd(y.build)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="notice">
              Break-even:{" "}
              {result.breakEven === null
                ? "None under these assumptions"
                : `${result.breakEven.toFixed(1)} years`}
              . Based on initial cost difference divided by annual run-rate
              difference; spending is treated as uniform.
            </div>
          </Card>
          <Card title="The costs a calculator cannot settle">
            <p>
              Feature gaps, migration risk, technical debt, vendor dependency,
              resilience, adoption and opportunity cost can dominate license
              savings.
            </p>
            <p>
              No discount rate, inflation, growth, tax effects or residual asset
              value are included. Compare equivalent scope and service levels
              before making a procurement decision.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
