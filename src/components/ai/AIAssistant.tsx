import React, { useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Sparkles, Brain, ArrowRight, Lightbulb, TrendingUp, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

export default function AIAssistant() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentStore } = useAuth();

  const generateInsight = async () => {
    if (!currentStore) return;
    setLoading(true);
    setInsight(null);
    try {
      // 1. Fetch data from backend
      const dataRes = await api.get('/ai/data');
      const businessData = dataRes.data;

      // 2. Initialize Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        You are an expert retail business analyst for Cathtea, specifically for the branch: "${businessData.storeName}".
        Analyze the following business data and provide a professional, actionable executive report.
        
        Focus on:
        1. Supply Chain & Raw Materials: We've recently started tracking internal supplies (cups, straws, etc.) and recipes. 
           - Look at "type: supply" items in the inventory.
           - Mention if core supplies (like Cups or Straws) are running low relative to best-seller sales.
        2. Sales Performance: Analyze best sellers and revenue trends from the last 7 days.
        3. Operational Efficiency: Evaluate the average order processing time (${Number(businessData.analytics?.avgProcessingTimeSeconds || 0).toFixed(1)} seconds).
        4. Strategy: Suggest specific promotions, bundles, or improvements based on the linked ingredients (Recipes).
           - e.g., if a high-margin tea uses few supplies, suggest pushing it.

        Data:
        - All Inventory (Saleable & Supplies): ${JSON.stringify(businessData.products)}
        - Product Recipes (Ingredients): ${JSON.stringify(businessData.recipes)}
        - Top Performers: ${JSON.stringify(bestSellersMapping(businessData))}
        - 7-Day Performance:
          * Total Revenue: ₱${Number(businessData.analytics?.last7DaysRevenue || 0).toFixed(2)}
          * Total Orders: ${businessData.analytics?.last7DaysSalesCount}
          * Avg. Revenue per Order: ₱${(Number(businessData.analytics?.last7DaysRevenue || 0) / (Number(businessData.analytics?.last7DaysSalesCount) || 1)).toFixed(2)}
        - Recent Sales Summary: ${JSON.stringify(businessData.analytics?.recentSalesSummary)}

        Format your response as a professional executive summary with clear headings and bulleted insights.
        Use markdown for formatting. Be precise and business-oriented.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setInsight(response.text || "Unable to generate insights at this moment.");
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.message || "Error connecting to AI Assistant.";
      setInsight(`### Error\n${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const bestSellersMapping = (data: any) => {
    return data.bestSellers?.map((s: any) => {
      const prod = data.products?.find((p: any) => p.id === s.product_id);
      return { name: prod?.name || s.product_id, count: s.count };
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      <div className="relative p-12 lg:p-20 bg-white rounded-[4rem] overflow-hidden border border-slate-200 shadow-sm relative group">
        <div className="absolute top-0 right-0 p-12 opacity-5 blur-xl pointer-events-none group-hover:opacity-10 transition-opacity">
           <Brain className="w-96 h-96 text-slate-900" />
        </div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-500/[0.02] to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900 text-white rounded-full text-[9px] font-bold uppercase tracking-[0.3em] mb-10 overflow-hidden relative group/pill shadow-xl">
            <div className="absolute inset-0 bg-pink-600 translate-x-full group-hover/pill:translate-x-0 transition-transform duration-500 opacity-50"></div>
            <Sparkles className="w-3.5 h-3.5 text-pink-400 relative z-10" />
            <span className="relative z-10">AI Executive Vault</span>
          </div>
          <h2 className="text-5xl lg:text-7xl font-medium text-slate-900 mb-6 tracking-tighter uppercase font-display leading-[0.9]">Intelligent Business Analysis</h2>
          <p className="text-slate-500 text-lg mb-12 font-medium leading-relaxed">Generate real-time business reports by synthesizing inventory levels, sales velocity, and supply chain recipes into actionable executive insights.</p>
          
          <button 
            onClick={generateInsight}
            disabled={loading}
            className="group px-10 py-6 bg-pink-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-4 hover:bg-pink-500 transition-all duration-500 shadow-2xl relative overflow-hidden active:scale-95 disabled:grayscale"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Analyzing Data Ecosystem...
              </div>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Business Report
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
           <div className="technical-card p-12 lg:p-20 min-h-[600px] border-slate-200 shadow-2xl shadow-slate-100 bg-white relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {insight ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-sm lg:prose-base max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:tracking-tighter prose-headings:text-slate-900 prose-p:text-slate-500 prose-p:font-medium prose-li:text-slate-500 prose-li:font-medium prose-strong:text-slate-900 prose-code:text-pink-600 h-full selection:bg-pink-100"
                >
                  <Markdown>{insight}</Markdown>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 grayscale opacity-40">
                  <div className="w-24 h-24 bg-pink-50 rounded-[2.5rem] flex items-center justify-center mb-10 border border-pink-100 shadow-inner group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
                    <Lightbulb className="w-10 h-10 text-pink-500" />
                  </div>
                  <p className="text-2xl font-display font-medium text-slate-900 uppercase tracking-tight mb-4">Awaiting Signal</p>
                  <p className="micro-label max-w-xs">Initialize analysis to populate this register with business intelligence reports.</p>
                </div>
              )}
           </div>
        </div>

        <div className="space-y-6">
           <div className="technical-card p-8 group border-slate-100 shadow-xl shadow-slate-50">
              <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center mb-6 border border-pink-100 group-hover:bg-pink-600 group-hover:text-white transition-all shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 tracking-tight uppercase mb-3 font-sans">Stock Health</h4>
              <p className="micro-label leading-relaxed opacity-60">Monitors SKU counts against historical burn-rates to prevent stock-outs.</p>
           </div>

           <div className="technical-card p-8 group border-slate-100 shadow-xl shadow-slate-50">
              <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center mb-6 border border-pink-100 group-hover:bg-pink-600 group-hover:text-white transition-all shadow-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 tracking-tight uppercase mb-3 font-sans">Velocity Analysis</h4>
              <p className="micro-label leading-relaxed opacity-60">Statistical evaluation of revenue density across your branch active hours.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
