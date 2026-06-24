import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { ShoppingBag, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function CreateStore() {
  const [name, setName] = useState('');
  const [shiftPin, setShiftPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { setStore, refreshStores } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/stores', { name, shift_pin: shiftPin });
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
          className="flex items-center gap-2 text-[10px] font-black text-slate-950 uppercase tracking-widest hover:text-pink-500 transition-colors mb-10"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Store List
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-pink-500/10 overflow-hidden p-2 border border-pink-50">
            <img src="https://cdn.corenexis.com/f/xT3JmIu4IAN.jpg" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Add New Store</h1>
          <p className="text-slate-900 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Initialize your next business location</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest px-2">Store Name</label>
            <input 
              type="text"
              required
              placeholder="e.g. Cathtea - Downtown Branch"
              className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:bg-white transition-all text-slate-900 font-bold text-sm placeholder:text-slate-500 placeholder:font-normal uppercase tracking-tight"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] font-black text-slate-950 uppercase tracking-widest">Shift Security Pin (4-8 digits)</label>
            </div>
            <div className="relative group">
              <input 
                type="text"
                required
                placeholder="e.g. 1234"
                className={`w-full px-6 py-5 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 transition-all text-slate-900 font-mono text-sm placeholder:text-slate-500 placeholder:font-normal tracking-widest ${
                  shiftPin && (shiftPin.length < 4 || shiftPin.length > 8) 
                    ? 'border-rose-200 focus:ring-rose-500/50 text-rose-600' 
                    : shiftPin.length >= 4
                      ? 'border-emerald-200 focus:ring-emerald-500/50 text-emerald-600'
                      : 'border-slate-100 focus:ring-pink-500/50 focus:bg-white'
                }`}
                value={shiftPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 12) setShiftPin(val);
                }}
              />
            </div>
            <div className="flex gap-1.5 mt-2 px-2">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    i < shiftPin.length 
                      ? (shiftPin.length < 4 || shiftPin.length > 8 ? 'bg-rose-400' : 'bg-emerald-400')
                      : 'bg-slate-100'
                  }`}
                />
              ))}
            </div>
            <p className={`text-[9px] font-bold uppercase tracking-widest mt-2 px-2 transition-colors ${
              shiftPin && (shiftPin.length < 4 || shiftPin.length > 8) ? 'text-rose-500' : 'text-slate-900 font-black'
            }`}>
              {shiftPin.length === 0 
                ? 'Store access code required' 
                : shiftPin.length < 4 
                  ? `Need ${4 - shiftPin.length} more digits` 
                  : shiftPin.length > 8 
                    ? 'Maximum limit: 8 digits' 
                    : 'Security code valid'}
            </p>
          </div>

          <button 
            type="submit"
            disabled={loading || !name.trim() || shiftPin.length < 4 || shiftPin.length > 8}
            className="w-full py-5 bg-pink-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-pink-400 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-0.5 active:translate-y-0 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
            {loading ? 'Creating...' : 'Add Store'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
