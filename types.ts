
export interface PoolState {
  tokenAPrice: number;
  tokenBPrice: number;
  reserveA: number;
  reserveB: number;
  feeTier: number; // e.g. 0.003 for 0.3%
}

export interface LPResult {
  impermanentLoss: number;
  poolValueCurrent: number;
  poolValueHODL: number;
  priceRatio: number;
  shareA: number;
  shareB: number;
}

export interface SwapResult {
  outputAmount: number;
  priceImpact: number;
  newPrice: number;
  feePaid: number;
}

export enum CalculationMode {
  LIQUIDITY = 'LIQUIDITY',
  SWAP = 'SWAP',
  STRATEGY = 'STRATEGY'
}
