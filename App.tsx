
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
    <div className="min-h-screen pb-12 selection:bg-blue-100 dark:selection:bg-blue-900/40">
      {/* Dynamic Navigation Bar */}
      <header className="sticky top-0 z-[100] glass-card px-8 py-4 flex items-center justify-between shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">DeFi Pro</h1>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mt-1">AMM Suite v2.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex bg-gray-100/80 dark:bg-white/5 p-1 rounded-[14px]">
            {Object.values(CalculationMode).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-5 py-2 text-xs font-semibold rounded-[11px] transition-all duration-300 ${
                  mode === m 
                    ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </button>
            ))}
          </nav>

          <div className="h-6 w-[1px] bg-gray-200 dark:bg-white/10 mx-2"></div>

          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-90"
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-8 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Input Control Section */}
        <aside className="lg:col-span-4 space-y-6">
          <section className="glass-card rounded-[32px] p-8 shadow-sm">
            <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6">Simulation Controls</h2>
            <div className="space-y-6">
              <div className="group">
                <label className="block text-[13px] font-semibold text-gray-600 dark:text-gray-400 mb-2 group-hover:text-blue-500 transition-colors">Token A Base Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input 
                    type="number" 
                    value={pool.tokenAPrice}
                    onChange={(e) => setPool({ ...pool, tokenAPrice: Number(e.target.value) })}
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-[13px] font-semibold text-gray-600 dark:text-gray-400 mb-2 group-hover:text-blue-500">Reserve A</label>
                  <input 
                    type="number" 
                    value={pool.reserveA}
                    onChange={(e) => setPool({ ...pool, reserveA: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-medium"
                  />
                </div>
                <div className="group">
                  <label className="block text-[13px] font-semibold text-gray-600 dark:text-gray-400 mb-2 group-hover:text-blue-500">Reserve B</label>
                  <input 
                    type="number" 
                    value={pool.reserveB}
                    onChange={(e) => setPool({ ...pool, reserveB: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-gray-600 dark:text-gray-400 mb-3">Protocol Fee Tier</label>
                <div className="grid grid-cols-2 gap-3">
                  {FEE_TIERS.map((tier) => (
                    <button
                      key={tier.value}
                      onClick={() => setPool({ ...pool, feeTier: tier.value })}
                      className={`py-3 text-[13px] font-bold rounded-2xl transition-all duration-300 ${
                        pool.feeTier === tier.value 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
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
            <section className="glass-card rounded-[32px] p-8 shadow-sm bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/10">
              <h2 className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-6">Scenario Parameters</h2>
              <div className="space-y-6">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-[13px] font-semibold text-gray-600 dark:text-gray-400">Target Market Price</label>
                  <span className="text-xl font-black text-gray-900 dark:text-white">${targetPriceA.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min={pool.tokenAPrice * 0.1}
                  max={pool.tokenAPrice * 4}
                  step={10}
                  value={targetPriceA}
                  onChange={(e) => setTargetPriceA(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                  <span>-90% Bear</span>
                  <span className="text-blue-500">Current</span>
                  <span>+300% Bull</span>
                </div>
              </div>
            </section>
          )}

          {mode === CalculationMode.SWAP && (
            <section className="glass-card rounded-[32px] p-8 shadow-sm bg-gradient-to-br from-orange-500/5 to-transparent border-orange-500/10">
              <h2 className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-6">Trade Parameters</h2>
              <div className="space-y-6">
                <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-[14px]">
                  <button 
                    onClick={() => setIsSwapA(true)}
                    className={`flex-1 py-2 text-xs font-bold rounded-[11px] transition-all ${isSwapA ? 'bg-white dark:bg-white/10 shadow-sm text-orange-600' : 'text-gray-500'}`}
                  >
                    Sell Token A
                  </button>
                  <button 
                    onClick={() => setIsSwapA(false)}
                    className={`flex-1 py-2 text-xs font-bold rounded-[11px] transition-all ${!isSwapA ? 'bg-white dark:bg-white/10 shadow-sm text-orange-600' : 'text-gray-500'}`}
                  >
                    Sell Token B
                  </button>
                </div>
                <div className="group">
                  <label className="block text-[13px] font-semibold text-gray-600 dark:text-gray-400 mb-2">Transaction Amount</label>
                  <input 
                    type="number" 
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl outline-none dark:text-white font-medium focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </section>
          )}
        </aside>

        {/* Dynamic Display Section */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Bento Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {mode === CalculationMode.LIQUIDITY ? (
              <>
                <div className="glass-card p-8 rounded-[32px] bento-card">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Exposure Delta</p>
                  <p className={`text-3xl font-black mt-2 tracking-tight ${lpResult.impermanentLoss < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {(lpResult.impermanentLoss * 100).toFixed(2)}%
                  </p>
                  <p className="text-[10px] font-medium text-gray-400 mt-1 italic">vs. HODLing 50/50</p>
                </div>
                <div className="glass-card p-8 rounded-[32px] bento-card">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Equity Value</p>
                  <p className="text-3xl font-black mt-2 tracking-tight text-gray-900 dark:text-white">
                    ${lpResult.poolValueCurrent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] font-medium text-gray-400 mt-1 italic">Total simulated position</p>
                </div>
                <div className="glass-card p-8 rounded-[32px] bento-card border-green-500/10 bg-green-500/[0.02]">
                  <p className="text-[11px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">LP Alpha</p>
                  <p className={`text-3xl font-black mt-2 tracking-tight ${lpResult.poolValueCurrent > lpResult.poolValueHODL ? 'text-green-600' : 'text-red-500'}`}>
                    {lpResult.poolValueCurrent > lpResult.poolValueHODL ? '+' : ''}${(lpResult.poolValueCurrent - lpResult.poolValueHODL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] font-medium text-gray-400 mt-1 italic">Profitability variance</p>
                </div>
              </>
            ) : (
              <>
                <div className="glass-card p-8 rounded-[32px] bento-card">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Receiving Amount</p>
                  <p className="text-3xl font-black mt-2 tracking-tight text-orange-600">
                    {swapResult.outputAmount.toFixed(4)}
                  </p>
                  <p className="text-[10px] font-medium text-gray-400 mt-1 italic">Estimated post-slippage</p>
                </div>
                <div className="glass-card p-8 rounded-[32px] bento-card">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Market Impact</p>
                  <p className={`text-3xl font-black mt-2 tracking-tight ${swapResult.priceImpact > 0.03 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {(swapResult.priceImpact * 100).toFixed(2)}%
                  </p>
                  <p className="text-[10px] font-medium text-gray-400 mt-1 italic">Liquidity depth strain</p>
                </div>
                <div className="glass-card p-8 rounded-[32px] bento-card">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Protocol Revenue</p>
                  <p className="text-3xl font-black mt-2 tracking-tight text-gray-900 dark:text-white">
                    ${(swapResult.feePaid * (isSwapA ? pool.tokenAPrice : pool.tokenBPrice)).toFixed(2)}
                  </p>
                  <p className="text-[10px] font-medium text-gray-400 mt-1 italic">LP fee distribution</p>
                </div>
              </>
            )}
          </div>

          {/* Core Visualization / Analysis Area */}
          <div className="glass-card rounded-[40px] p-10 shadow-xl overflow-hidden min-h-[500px] flex flex-col">
            {mode === CalculationMode.LIQUIDITY && (
              <>
                <div className="mb-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Impermanent Loss Sensitivity</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Modeling IL across 20% to 400% price movements</p>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ilData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="6 6" vertical={false} stroke={isDark ? "#333" : "#E5E7EB"} />
                      <XAxis 
                        dataKey="ratio" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                        dy={15}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                        unit="%"
                        dx={-10}
                      />
                      <Tooltip 
                        cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '4 4' }}
                        contentStyle={{ 
                          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', 
                          borderRadius: '20px', 
                          border: 'none', 
                          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                          padding: '16px'
                        }}
                        itemStyle={{ color: '#3b82f6', fontWeight: 700 }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="il" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorIl)" 
                        strokeWidth={4} 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {mode === CalculationMode.STRATEGY && (
              <div className="flex-1 flex flex-col">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Quantitative Intelligence</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-driven liquidity provisioning strategy for current pool state</p>
                  </div>
                  <button 
                    onClick={handleAiInsights}
                    disabled={isAnalyzing}
                    className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-[20px] shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-3 transition-all active:scale-95"
                  >
                    {isAnalyzing && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isAnalyzing ? 'Processing Pool Data...' : 'Generate Risk Analysis'}
                  </button>
                </div>

                {aiAnalysis ? (
                  <div className="flex-1 bg-gray-50 dark:bg-white/5 rounded-[32px] p-10 border border-gray-100 dark:border-white/10 overflow-y-auto">
                    <div className="prose prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:tracking-tight prose-headings:font-black">
                      <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">Strategy Engine Ready</p>
                      <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">Click the button above to analyze your capital efficiency and hedging options.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === CalculationMode.SWAP && (
              <div className="flex-1 flex flex-col">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-8">Equilibrium Shift</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 flex-1">
                  <div className="space-y-6">
                    <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-[32px] border border-gray-100 dark:border-white/10 group">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-hover:text-blue-500 transition-colors">Projected Reserve A</p>
                      <p className="text-3xl font-black dark:text-white">
                        {(isSwapA ? pool.reserveA + swapAmount - swapResult.feePaid : pool.reserveA - swapResult.outputAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </p>
                    </div>
                    <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-[32px] border border-gray-100 dark:border-white/10 group">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-hover:text-blue-500 transition-colors">Projected Reserve B</p>
                      <p className="text-3xl font-black dark:text-white">
                        {(isSwapA ? pool.reserveB - swapResult.outputAmount : pool.reserveB + swapAmount - swapResult.feePaid).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </p>
                    </div>
                  </div>
                  <div className="bg-orange-500/5 rounded-[40px] p-10 flex flex-col justify-center border border-orange-500/10 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] rounded-full"></div>
                    <p className="text-orange-600 dark:text-orange-400 font-bold uppercase text-[12px] tracking-widest mb-4">Post-Trade Price</p>
                    <div className="text-5xl font-black text-orange-600 dark:text-orange-400 tracking-tighter mb-4">
                      {swapResult.newPrice.toFixed(6)}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 px-10">Relative token pair price after execution of the current swap simulation.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-[1400px] mx-auto px-8 mt-20 flex flex-col sm:flex-row justify-between items-center text-gray-400 dark:text-gray-600 gap-4">
        <p className="text-[11px] font-bold uppercase tracking-widest">© 2024 DEFI PRO ANALYTICS GROUP</p>
        <div className="flex gap-8 text-[11px] font-bold uppercase tracking-widest">
          <a href="#" className="hover:text-blue-500 transition-colors">Protocol Stats</a>
          <a href="#" className="hover:text-blue-500 transition-colors">Risk Docs</a>
          <a href="#" className="hover:text-blue-500 transition-colors">Security</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
