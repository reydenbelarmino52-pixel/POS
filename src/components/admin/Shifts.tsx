import React, { useState, useEffect } from 'react';
import { Clock, Unlock, Lock, DollarSign, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { z } from 'zod';

const openShiftSchema = z.object({
  opening_balance: z.number().min(0, 'Opening balance must be 0 or greater'),
});

const closeShiftSchema = z.object({
  closing_cash: z.number().min(0, 'Closing cash must be 0 or greater'),
});

export default function Shifts() {
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const curr = await api.get('/shifts/current');
      setCurrentShift(curr.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenShift = async () => {
    setError('');
    const val = parseFloat(openingBalance);
    const validation = openShiftSchema.safeParse({ opening_balance: val });
    
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    try {
      const res = await api.post('/shifts/open', { opening_balance: val });
      setCurrentShift({ id: res.data.id, status: 'open', openingBalance: val, openTime: new Date().toISOString() });
      setOpeningBalance('');
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to open shift');
    }
  };

  const handleCloseShift = async () => {
    setError('');
    const val = parseFloat(closingCash);
    const validation = closeShiftSchema.safeParse({ closing_cash: val });

    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    try {
      const res = await api.post('/shifts/close', { 
        closing_cash: val, 
        shift_id: currentShift.id 
      });
      alert(`Shift closed. Expected: $${res.data.expected}, Variance: $${res.data.variance}`);
      setCurrentShift(null);
      setClosingCash('');
      setOpeningBalance('');
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to close shift');
    }
  };

  if (loading) return <div className="text-slate-400 font-bold uppercase tracking-widest p-12">Checking Status...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {!currentShift ? (
        <div className="bg-white rounded-[3rem] p-16 border border-pink-100/50 shadow-2xl flex flex-col items-center text-center shadow-pink-500/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500"></div>
          <div className="w-24 h-24 bg-pink-50 text-pink-600 rounded-[2rem] flex items-center justify-center mb-8 border border-pink-100 shadow-inner group transition-transform hover:scale-110">
            <Unlock className="w-10 h-10" />
          </div>
          <h2 className="text-4xl font-display font-bold text-slate-900 mb-4 tracking-tighter uppercase">Open Shift</h2>
          <p className="text-slate-500 mb-12 max-w-sm text-sm font-medium leading-relaxed">Enter the opening cash balance to start the operational cycle.</p>
          
          <div className="w-full max-w-md space-y-8">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl text-[10px] font-bold flex items-center gap-3 border border-rose-100 uppercase tracking-widest shadow-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-4 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Opening Balance</label>
              <div className="relative group">
                <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-pink-500 transition-colors" />
                <input 
                  type="number"
                  placeholder="0.00"
                  className="w-full pl-16 pr-8 py-6 bg-[#FAF9F6] border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-pink-500/5 text-slate-900 font-mono text-2xl focus:bg-white transition-all shadow-inner"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                />
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenShift}
              disabled={!openingBalance}
              className="w-full py-6 bg-pink-600 text-white rounded-3xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-pink-200 hover:bg-pink-500 transition-all disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
            >
              Open Shift
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Active Shift Details */}
            <div className="bg-white p-10 rounded-[3rem] border border-pink-100/50 shadow-xl relative overflow-hidden group shadow-pink-500/5">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                   <Clock className="w-40 h-40 text-slate-900" />
                </div>
                <div className="flex items-center gap-5 mb-10">
                    <div className="w-14 h-14 bg-pink-50 border border-pink-100 text-pink-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <Clock className="w-7 h-7 text-pink-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-display font-bold text-slate-900 tracking-tight uppercase">Shift Active</h3>
                        <p className="text-[10px] text-pink-500 font-bold uppercase tracking-widest mt-1">Operational since {new Date(currentShift.openTime).toLocaleTimeString()}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center p-6 bg-[#FAF9F6] rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opening Balance</span>
                        <span className="text-lg font-bold text-slate-900 tracking-widest font-mono">${currentShift.openingBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                           <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">System Synchronized</span>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest font-mono">OK</span>
                    </div>
                </div>
            </div>

            {/* Closing Form */}
            <div className="bg-white p-10 rounded-[3rem] border border-pink-100/50 shadow-xl border-t-4 border-t-rose-500 shadow-pink-500/5">
                <h3 className="text-xl font-display font-bold text-slate-900 tracking-tight uppercase mb-8">Close Shift</h3>
                {error && (
                  <div className="bg-rose-50 text-rose-500 p-5 rounded-2xl text-[10px] font-bold flex items-center gap-3 border border-rose-100 uppercase tracking-widest mb-8 shadow-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Actual Cash on Hand</label>
                        <div className="relative group">
                           <Calculator className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                           <input 
                              type="number"
                              placeholder="0.00"
                              className="w-full pl-16 pr-8 py-5 bg-[#FAF9F6] border border-slate-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-rose-500/5 font-mono text-xl text-slate-900 focus:bg-white transition-all shadow-inner"
                              value={closingCash}
                              onChange={(e) => setClosingCash(e.target.value)}
                           />
                        </div>
                    </div>
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCloseShift}
                        disabled={!closingCash}
                        className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-bold text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl shadow-slate-200 hover:bg-slate-800 active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
                    >
                        End Shift
                    </motion.button>
                    <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-widest px-8">Shift variance and analytics will be updated upon closing.</p>
                </div>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[4rem] border border-pink-100/30 shadow-sm min-h-[250px] flex flex-col items-center justify-center text-center shadow-pink-500/5 group">
             <div className="relative mb-6">
                <CheckCircle2 className="w-16 h-16 text-slate-100 transition-transform group-hover:scale-110 duration-500" />
                <div className="absolute inset-0 bg-pink-500/5 blur-2xl rounded-full"></div>
             </div>
             <p className="text-[10px] text-pink-400 font-bold uppercase tracking-[0.4em] mb-2">Shift monitoring active</p>
             <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest max-w-xs opacity-60">System is currently recording transactions for the active session.</p>
          </div>
        </div>
      )}
    </div>
  );
}
