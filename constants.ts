
export const FEE_TIERS = [
  { label: '0.01%', value: 0.0001 },
  { label: '0.05%', value: 0.0005 },
  { label: '0.3%', value: 0.003 },
  { label: '1%', value: 0.01 },
];

export const INITIAL_POOL_STATE = {
  tokenAPrice: 2000, // e.g. ETH
  tokenBPrice: 1,    // e.g. USDC
  reserveA: 10,
  reserveB: 20000,
  feeTier: 0.003,
};
