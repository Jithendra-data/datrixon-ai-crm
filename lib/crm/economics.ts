export type Costs = {
  seatGrowth?: number;
  licenseGrowth?: number;
  buildGrowth?: number;
  seats: number;
  licensePerSeat: number;
  saasImplementation: number;
  saasIntegration: number;
  saasSupport: number;
  development: number;
  infrastructure: number;
  ai: number;
  maintenance: number;
  security: number;
  support: number;
  switching: number;
};
export const defaultCosts: Costs = {
  seats: 200,
  licensePerSeat: 3000,
  saasImplementation: 120000,
  saasIntegration: 60000,
  saasSupport: 30000,
  development: 450000,
  infrastructure: 24000,
  ai: 18000,
  maintenance: 220000,
  security: 60000,
  support: 50000,
  switching: 80000,
};
export function tco(c: Costs, horizon: 3 | 5 = 3) {
  const saasAnnual =
    c.seats * c.licensePerSeat + c.saasIntegration + c.saasSupport;
  const buildAnnual =
    c.infrastructure + c.ai + c.maintenance + c.security + c.support;
  const years = Array.from({ length: horizon }, (_, i) => ({
    year: i + 1,
    buy:
      c.seats *
        c.licensePerSeat *
        Math.pow(1 + (c.seatGrowth || 0) / 100, i) *
        Math.pow(1 + (c.licenseGrowth || 0) / 100, i) +
      c.saasIntegration +
      c.saasSupport +
      (i === 0 ? c.saasImplementation : 0),
    build:
      buildAnnual * Math.pow(1 + (c.buildGrowth || 0) / 100, i) +
      (i === 0 ? c.development + c.switching : 0),
  }));
  const initial = c.development + c.switching - c.saasImplementation;
  let cumulative = -initial;
  let breakEven: number | null = initial <= 0 ? 0 : null;
  for (const y of years) {
    const saving =
      y.buy -
      (y.year === 1 ? c.saasImplementation : 0) -
      (y.build - (y.year === 1 ? c.development + c.switching : 0));
    if (breakEven === null && saving > 0 && cumulative + saving >= 0)
      breakEven = y.year - 1 + -cumulative / saving;
    cumulative += saving;
  }
  return {
    years,
    buy: years.reduce((s, y) => s + y.buy, 0),
    build: years.reduce((s, y) => s + y.build, 0),
    breakEven,
    saasAnnual,
  };
}
