import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Store, Plus, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function SelectStore() {
  const { stores, setStore, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FFF5F7] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-pink-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-rose-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-10 md:p-14 z-10 border border-pink-100"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-pink-500/20">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Select Store</h1>
          <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-[0.2em] mt-2">Choose the store you wish to operate</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((s) => (
            <motion.button
              key={s.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStore(s)}
              className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-pink-300 hover:shadow-xl hover:shadow-pink-500/10 transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center group-hover:border-pink-200 group-hover:bg-pink-50 transition-colors">
                  <Store className="w-6 h-6 text-slate-400 group-hover:text-pink-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 uppercase tracking-tight">{s.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Active Store</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-pink-500 transition-colors" />
            </motion.button>
          ))}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/create-store')}
            className="flex items-center justify-center gap-3 p-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl hover:border-pink-300 hover:bg-pink-50 transition-all group"
          >
            <Plus className="w-5 h-5 text-slate-300 group-hover:text-pink-500" />
            <span className="font-semibold text-slate-400 group-hover:text-pink-500 uppercase tracking-widest text-[11px]">Add New Store</span>
          </motion.button>
        </div>

        <div className="mt-10 pt-10 border-t border-slate-100 text-center">
          <button 
            onClick={logout}
            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-pink-500 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
