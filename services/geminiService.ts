
import { GoogleGenAI, Type } from "@google/genai";
import { PoolState, LPResult } from "../types";

export const getStrategyInsights = async (poolState: PoolState, lpResult: LPResult) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Act as a senior DeFi quantitative analyst. Analyze the following AMM liquidity pool scenario:
    
    Current Pool State:
    - Token A Price: $${poolState.tokenAPrice}
    - Token B Price: $${poolState.tokenBPrice}
    - Reserve A: ${poolState.reserveA}
    - Reserve B: ${poolState.reserveB}
    - Fee Tier: ${poolState.feeTier * 100}%
    
    Current LP Simulation Results:
    - Price Ratio: ${lpResult.priceRatio.toFixed(4)}
    - Impermanent Loss: ${(lpResult.impermanentLoss * 100).toFixed(2)}%
    - Value if HODL'd: $${lpResult.poolValueHODL.toLocaleString()}
    - Current Pool Value: $${lpResult.poolValueCurrent.toLocaleString()}

    Provide a concise strategy report including:
    1. Risk Assessment (Low/Medium/High) regarding Impermanent Loss.
    2. Optimal HODL vs LP advice.
    3. Sentiment on whether this fee tier compensates for the volatility.
    4. One professional tip for this specific scenario.
    
    Respond in clear, professional English. Use Markdown for formatting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 }
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to retrieve AI insights at this time. Please check your network or try again later.";
  }
};
