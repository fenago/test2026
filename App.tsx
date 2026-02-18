
import React, { useState, useMemo, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { CalculationMode, PoolState, LPResult, SwapResult } from './types';
import { INITIAL_POOL_STATE, FEE_TIERS } from './constants';
import { getStrategyInsights } from './services/geminiService';

const calculateAMM = (state: PoolState, newPriceA: number): LPResult => {
  const k = state.reserveA * state.reserveB;
  const newReserveA = Math.sqrt(k / (state.tokenBPrice / newPriceA));
  const newReserveB = k / newReserveA;
  
  const poolValueCurrent = (newReserveA * newPriceA) + (newReserveB * state.tokenBPrice);
  const poolValueHODL = (state.reserveA * newPriceA) + (state.reserveB * state.tokenBPrice);
  const il = (poolValueCurrent / poolValueHODL) - 1;

  return {
    impermanentLoss: il,
    poolValueCurrent,
    poolValueHODL,
    priceRatio: newPriceA / state.tokenAPrice,
    shareA: newReserveA,
    shareB: newReserveB,
  };
};

const calculateSwap = (state: PoolState, amountIn: number, isTokenA: boolean): SwapResult => {
  const k = state.reserveA * state.reserveB;
  const fee = amountIn * state.feeTier;
  const amountInWithFee = amountIn - fee;

  let outputAmount: number;
  let newPrice: number;

  if (isTokenA) {
    const newReserveA = state.reserveA + amountInWithFee;
    const newReserveB = k / newReserveA;
    outputAmount = state.reserveB - newReserveB;
    newPrice = newReserveB / newReserveA;
  } else {
    const newReserveB = state.reserveB + amountInWithFee;
    const newReserveA = k / newReserveB;
    outputAmount = state.reserveA - newReserveA;
    newPrice = newReserveB / newReserveA;
  }

  const initialPrice = state.reserveB / state.reserveA;
  const executionPrice = outputAmount / amountIn;
  const priceImpact = (executionPrice / initialPrice) - 1;

  return {
    outputAmount,
    priceImpact: Math.abs(priceImpact),
    newPrice,
    feePaid: fee,
  };
};

const App: React.FC = () => {
  const [mode, setMode] = useState<CalculationMode>(CalculationMode.LIQUIDITY);
  const [pool, setPool] = useState<PoolState>(INITIAL_POOL_STATE);
  const [targetPriceA, setTargetPriceA] = useState<number>(INITIAL_POOL_STATE.tokenAPrice);
  const [swapAmount, setSwapAmount] = useState<number>(1);
  const [isSwapA, setIsSwapA] = useState<boolean>(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const lpResult = useMemo(() => calculateAMM(pool, targetPriceA), [pool, targetPriceA]);
  const swapResult = useMemo(() => calculateSwap(pool, swapAmount, isSwapA), [pool, swapAmount, isSwapA, mode]);

  const ilData = useMemo(() => {
    const data = [];
    const basePrice = pool.tokenAPrice;
    for (let i = 0.2; i <= 3.0; i += 0.1) {
      const p = basePrice * i;
      const res = calculateAMM(pool, p);
      data.push({
        ratio: (i * 100).toFixed(0) + '%',
        il: parseFloat((res.impermanentLoss * 100).toFixed(2)),
        price: p.toFixed(2),
      });
    }
    return data;
  }, [pool]);

  const handleAiInsights = async () => {
    setIsAnalyzing(true);
    setAiAnalysis('');
    const insights = await getStrategyInsights(pool, lpResult);
    setAiAnalysis(insights || 'No insights returned.');
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen pb-20 transition-colors duration-300">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">DeFi Pro</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex bg-gray-100/50 dark:bg-white/5 p-1 rounded-xl">
            {Object.values(CalculationMode).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  mode === m 
                    ? 'bg-white dark:bg-white/20 shadow-sm text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </button>
            ))}
          </nav>

          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-xl bg-gray-100/50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Input Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="glass-card rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Initial Pool Parameters</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Token A Price (Base)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input 
                    type="number" 
                    value={pool.tokenAPrice}
                    onChange={(e) => setPool({ ...pool, tokenAPrice: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Reserve A</label>
                  <input 
                    type="number" 
                    value={pool.reserveA}
                    onChange={(e) => setPool({ ...pool, reserveA: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Reserve B</label>
                  <input 
                    type="number" 
                    value={pool.reserveB}
                    onChange={(e) => setPool({ ...pool, reserveB: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Fee Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEE_TIERS.map((tier) => (
                    <button
                      key={tier.value}
                      onClick={() => setPool({ ...pool, feeTier: tier.value })}
                      className={`py-2 text-xs font-medium border rounded-xl transition-all ${
                        pool.feeTier === tier.value 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {mode === CalculationMode.LIQUIDITY && (
            <section className="glass-card rounded-3xl p-6 shadow-sm border-blue-100 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-900/10">
              <h2 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4">Price Scenario</h2>
              <div className="space-y-4">
                <label className="block text-xs font-medium text-gray-400 mb-1">Target Price A ($)</label>
                <input 
                  type="range" 
                  min={pool.tokenAPrice * 0.2}
                  max={pool.tokenAPrice * 3}
                  step={10}
                  value={targetPriceA}
                  onChange={(e) => setTargetPriceA(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900 dark:text-white">${targetPriceA.toLocaleString()}</span>
                  <span className={`${lpResult.priceRatio >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {(lpResult.priceRatio * 100 - 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </section>
          )}

          {mode === CalculationMode.SWAP && (
            <section className="glass-card rounded-3xl p-6 shadow-sm border-orange-100 dark:border-orange-900/30 bg-orange-50/20 dark:bg-orange-900/10">
              <h2 className="text-sm font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-4">Swap Simulation</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={() => setIsSwapA(true)}
                    className={`flex-1 py-2 text-xs rounded-lg transition-all ${isSwapA ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}
                  >
                    Swap A
                  </button>
                  <button 
                    onClick={() => setIsSwapA(false)}
                    className={`flex-1 py-2 text-xs rounded-lg transition-all ${!isSwapA ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}
                  >
                    Swap B
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Amount In</label>
                  <input 
                    type="number" 
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl outline-none dark:text-white"
                  />
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mode === CalculationMode.LIQUIDITY ? (
              <>
                <div className="glass-card p-6 rounded-3xl">
                  <span className="text-xs font-medium text-gray-400 uppercase">Impermanent Loss</span>
                  <p className={`text-2xl font-bold mt-1 ${lpResult.impermanentLoss < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {(lpResult.impermanentLoss * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="glass-card p-6 rounded-3xl">
                  <span className="text-xs font-medium text-gray-400 uppercase">Pool Value (Current)</span>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    ${lpResult.poolValueCurrent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="glass-card p-6 rounded-3xl border-green-100 dark:border-green-900/30">
                  <span className="text-xs font-medium text-gray-400 uppercase">LP vs HODL</span>
                  <p className={`text-2xl font-bold mt-1 ${lpResult.poolValueCurrent > lpResult.poolValueHODL ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    ${(lpResult.poolValueCurrent - lpResult.poolValueHODL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </>
            ) : mode === CalculationMode.SWAP ? (
              <>
                <div className="glass-card p-6 rounded-3xl">
                  <span className="text-xs font-medium text-gray-400 uppercase">Output {isSwapA ? 'B' : 'A'}</span>
                  <p className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">
                    {swapResult.outputAmount.toFixed(4)}
                  </p>
                </div>
                <div className="glass-card p-6 rounded-3xl">
                  <span className="text-xs font-medium text-gray-400 uppercase">Price Impact</span>
                  <p className={`text-2xl font-bold mt-1 ${swapResult.priceImpact > 0.05 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {(swapResult.priceImpact * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="glass-card p-6 rounded-3xl">
                  <span className="text-xs font-medium text-gray-400 uppercase">Fee Accrued</span>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    ${(swapResult.feePaid * (isSwapA ? pool.tokenAPrice : pool.tokenBPrice)).toFixed(2)}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          <div className="glass-card p-8 rounded-[2.5rem] shadow-sm overflow-hidden">
            {mode === CalculationMode.LIQUIDITY && (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Impermanent Loss Curve</h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div> IL %
                    </div>
                  </div>
                </div>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ilData}>
                      <defs>
                        <linearGradient id="colorIl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#f1f1f1"} />
                      <XAxis dataKey="ratio" tick={{fontSize: 12}} stroke="#94a3b8" />
                      <YAxis tick={{fontSize: 12}} stroke="#94a3b8" unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.8)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', color: isDark ? '#fff' : '#000' }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Area type="monotone" dataKey="il" stroke="#3b82f6" fillOpacity={1} fill="url(#colorIl)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {mode === CalculationMode.STRATEGY && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">AI Strategy Insights</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gemini-powered risk analysis for your current parameters</p>
                  </div>
                  <button 
                    onClick={handleAiInsights}
                    disabled={isAnalyzing}
                    className="apple-button px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-2xl shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 self-start"
                  >
                    {isAnalyzing && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isAnalyzing ? 'Analyzing...' : 'Generate Report'}
                  </button>
                </div>

                {aiAnalysis ? (
                  <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-8 text-gray-700 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-white/10 prose prose-blue dark:prose-invert max-w-none transition-all">
                    <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 dark:text-gray-500 max-w-xs">Click generate to receive a deep-dive analysis of your current liquidity position.</p>
                  </div>
                )}
              </div>
            )}

            {mode === CalculationMode.SWAP && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Price Impact Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                      <p className="text-xs text-gray-400 font-medium">New Reserve A</p>
                      <p className="text-xl font-bold dark:text-white">{(isSwapA ? pool.reserveA + swapAmount - swapResult.feePaid : pool.reserveA - swapResult.outputAmount).toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                      <p className="text-xs text-gray-400 font-medium">New Reserve B</p>
                      <p className="text-xl font-bold dark:text-white">{(isSwapA ? pool.reserveB - swapResult.outputAmount : pool.reserveB + swapAmount - swapResult.feePaid).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/10 rounded-3xl p-6 flex flex-col justify-center border border-orange-100 dark:border-orange-900/30">
                    <p className="text-orange-800 dark:text-orange-300 font-semibold mb-2">New Pool Equilibrium</p>
                    <p className="text-sm text-orange-600 dark:text-orange-400/80 mb-4">The swap shifts the constant product k.</p>
                    <div className="text-3xl font-bold text-orange-900 dark:text-orange-200">
                      1 A = {swapResult.newPrice.toFixed(4)} B
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 mt-12 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">© 2024 DeFi Pro Simulator. For educational purposes only. Built for rapid AMM experimentation.</p>
      </footer>
    </div>
  );
};

export default App;
