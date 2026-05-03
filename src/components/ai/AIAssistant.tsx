import React, { useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Sparkles, Brain, ArrowRight, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';

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

      // 2. Request report from backend using Groq
      const reportRes = await api.post('/ai/report', { businessData });
      setInsight(reportRes.data.insight || "Unable to generate insights at this moment.");
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.error || err.message || "Error connecting to AI Assistant. Please ensure the Groq API key is valid in the server settings.";
      setInsight(`### Error\n${errorMsg}`);
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 text-pink-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 backdrop-blur-sm border border-pink-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Business Intelligence
          </div>
          <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tighter uppercase font-display">Business Insights</h2>
          <p className="text-slate-500 max-w-xl text-lg mb-10 font-medium">Use AI-powered analysis to identify operational trends and optimize your business performance.</p>
          
          <button 
            onClick={generateInsight}
            disabled={loading}
            className="px-8 py-5 bg-pink-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-pink-500 transition-all shadow-xl active:translate-y-0.5 outline-none shadow-pink-200"
          >
            {loading ? 'Analyzing Data...' : 'Generate AI Report'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Insight Display */}
        <div className="lg:col-span-2">
           <div className="backdrop-blur-md bg-white border border-pink-100 p-10 md:p-14 rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.05)] min-h-[500px]">
              {insight ? (
                <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-pink-600 prose-code:text-pink-500 h-full">
                  <Markdown>{insight}</Markdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-16 h-16 bg-pink-50 rounded-3xl flex items-center justify-center mb-6 border border-pink-100 shadow-inner">
                    <Lightbulb className="w-8 h-8 text-pink-500 animate-pulse" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-2">No Active Insights</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-xs">Run the analysis to generate AI-powered business reports.</p>
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
              <h4 className="font-bold text-slate-900 tracking-tight uppercase mb-3 text-lg">Inventory Tracking</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Identifies items that are low in stock and provides reordering suggestions.</p>
           </div>

           <div className="backdrop-blur-md bg-white p-8 rounded-[2.5rem] border border-pink-100 shadow-sm group hover:border-pink-500 transition-all shadow-pink-50/50">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-all border border-emerald-100">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 tracking-tight uppercase mb-3 text-lg">Sales Performance</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Detailed analysis of revenue trends and product performance over time.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
