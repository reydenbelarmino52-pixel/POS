import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import api from '../../lib/api';
import { Sparkles, Brain, ArrowRight, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';

export default function AIAssistant() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const { currentStore } = useAuth();

  useEffect(() => {
    fetchData();
  }, [currentStore]);

  const fetchData = async () => {
    try {
      const [products, analytics] = await Promise.all([
        api.get('/products'),
        api.get('/analytics/summary')
      ]);
      setData({ products: products.data, analytics: analytics.data });
    } catch (err) {
      console.error(err);
    }
  };

  const generateInsight = async () => {
    if (!data || !currentStore) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        You are an expert retail business analyst for Cathtea, specifically for the branch: "${currentStore.name}".
        Analyze the following business data and provide 3-4 professional, actionable insights suited for a specialty tea and snack business.
        Focus on:
        1. Low stock items that need reordering.
        2. Best selling products and how to capitalize on them.
        3. Revenue trends and patterns.
        4. Suggestions for promotions or category improvements.

        Data:
        - Products: ${JSON.stringify(data.products.map((p: any) => ({ name: p.name, stock: p.stock, threshold: p.lowStockThreshold })))}
        - Best Sellers: ${JSON.stringify(data.analytics.bestSellers)}
        - Recent Daily Revenue: ${JSON.stringify(data.analytics.daily.slice(0, 7))}

        Format your response as a professional report with bullet points and clear headings.
        Be concise but insightful.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt
      });

      setInsight(response.text || "Unable to generate insights at this moment.");
    } catch (err) {
      console.error(err);
      setInsight("Error connecting to AI. Please check your API key configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Search Bar / Header */}
      <div className="relative p-12 bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-pink-100 shadow-pink-50">
        <div className="absolute top-0 right-0 p-12 opacity-5 blur-xl">
           <Brain className="w-64 h-64 text-slate-900" />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 text-pink-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-sm border border-pink-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Intelligence Protocol
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase italic italic font-display">Business Insights</h2>
          <p className="text-slate-500 max-w-xl text-lg mb-10 font-medium italic">Execute advanced analytical models to detect operational anomalies and optimize asset deployment.</p>
          
          <button 
            onClick={generateInsight}
            disabled={loading || !data}
            className="px-8 py-5 bg-pink-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-pink-500 transition-all shadow-xl active:translate-y-0.5 outline-none shadow-pink-200"
          >
            {loading ? 'Processing Model...' : 'Initialize Logic Engine'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Insight Display */}
        <div className="lg:col-span-2">
           <div className="backdrop-blur-md bg-white border border-pink-100 p-10 md:p-14 rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.05)] min-h-[500px]">
              {insight ? (
                <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-black prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-pink-600 prose-code:text-pink-500 h-full">
                  <Markdown>{insight}</Markdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-16 h-16 bg-pink-50 rounded-3xl flex items-center justify-center mb-6 border border-pink-100 shadow-inner">
                    <Lightbulb className="w-8 h-8 text-pink-500 animate-pulse" />
                  </div>
                  <p className="text-xl font-black text-slate-900 uppercase italic tracking-tight mb-2">No Active Intelligence</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-xs">Initialize the logic engine to generate synthetic business reports.</p>
                </div>
              )}
           </div>
        </div>

        {/* Quick Suggestion Cards */}
        <div className="space-y-6">
           <div className="backdrop-blur-md bg-white p-8 rounded-[2.5rem] border border-pink-100 shadow-sm group hover:border-pink-500 transition-all shadow-pink-50/50">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-amber-500 group-hover:text-white transition-all border border-amber-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-black text-slate-900 italic tracking-tight uppercase mb-3 text-lg">Inventory Risk</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Predictive detection of asset depletion based on real-world sales velocity data.</p>
           </div>

           <div className="backdrop-blur-md bg-white p-8 rounded-[2.5rem] border border-pink-100 shadow-sm group hover:border-pink-500 transition-all shadow-pink-50/50">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-all border border-emerald-100">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="font-black text-slate-900 italic tracking-tight uppercase mb-3 text-lg">Velocity Audit</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Longitudinal performance analysis across all system nodes and categories.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
