import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { ShoppingBag, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function CreateStore() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setStore, refreshStores } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/stores', { name });
      await refreshStores();
      setStore(res.data);
    } catch (err) {
      console.error('Failed to create store', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F7] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-pink-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-rose-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-10 md:p-14 z-10 border border-pink-100"
      >
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-pink-500 transition-colors mb-10"
        >
          <ArrowLeft className="w-3 h-3" />
          Return to Registry
        </button>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-pink-500/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight">Deploy New Unit</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Initialize your next business location</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Store Identity</label>
            <input 
              type="text"
              required
              placeholder="e.g. CATHTEA - DOWNTOWN BRANCH"
              className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:bg-white transition-all text-slate-900 font-black text-sm placeholder:text-slate-300 placeholder:italic placeholder:font-normal uppercase italic tracking-tight"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-5 bg-pink-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-pink-400 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
            {loading ? 'Initializing Node...' : 'Establish Connection'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
