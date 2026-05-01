import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { ShoppingCart, Lock, User, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(5, 'Password must be at least 5 characters'),
});

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      const apiError = err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Login failed';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F7] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-pink-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-rose-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md backdrop-blur-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-pink-100 z-10 shadow-pink-100"
      >
        <div className="p-10 md:p-14">
          <div className="flex flex-col items-center mb-12">
            <div className="w-20 h-20 bg-pink-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-pink-500/40">
              <ShoppingCart className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic font-display">Cathtea POS</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Premium Tea & Quick Bites</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Access key / User</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="text"
                  required
                  placeholder="ID TOKEN"
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:bg-white transition-all text-slate-900 font-mono text-sm placeholder:text-slate-300 tracking-wider"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Encryption passphrase</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:bg-white transition-all text-slate-900 font-mono text-sm placeholder:text-slate-300 tracking-widest"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-pink-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-pink-400 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-0.5 active:translate-y-0 mt-6"
            >
              {loading ? 'Authenticating...' : 'Enter Shop'}
            </button>
          </form>

          <div className="mt-14 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Standard Creds: <span className="text-slate-600">admin / admin123</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
