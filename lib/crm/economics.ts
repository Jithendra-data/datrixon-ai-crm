export type Costs = {
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
export function tco(c: Costs) {
  const saasAnnual =
    c.seats * c.licensePerSeat + c.saasIntegration + c.saasSupport;
  const buildAnnual =
    c.infrastructure + c.ai + c.maintenance + c.security + c.support;
  const years = [1, 2, 3].map((year) => ({
    year,
    buy: saasAnnual + (year === 1 ? c.saasImplementation : 0),
    build: buildAnnual + (year === 1 ? c.development + c.switching : 0),
  }));
  const initial = c.development + c.switching - c.saasImplementation;
  const delta = saasAnnual - buildAnnual;
  return {
    years,
    buy: years.reduce((s, y) => s + y.buy, 0),
    build: years.reduce((s, y) => s + y.build, 0),
    breakEven: initial <= 0 ? 0 : delta > 0 ? initial / delta : null,
  };
}
