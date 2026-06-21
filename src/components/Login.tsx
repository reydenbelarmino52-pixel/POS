import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { ShoppingCart, Lock, User, AlertCircle, Mail, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { z } from 'zod';
import { Recaptcha } from './Recaptcha';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [shiftCode, setShiftCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaResetKey, setRecaptchaResetKey] = useState(0);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const schema = isLogin ? loginSchema : signupSchema;
    const validation = schema.safeParse(isLogin ? { username, password } : { username, email, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const payload = isLogin 
        ? { username, password, recaptchaToken }
        : { username, email, password, recaptchaToken };
      
      const res = await api.post(endpoint, payload);
      
      if (isLogin) {
        login(res.data.token, res.data.user, res.data.stores);
      } else {
        setSuccess('Account created successfully! Please log in with your new credentials.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        setEmail('');
        setRecaptchaToken(null);
        setRecaptchaResetKey(prev => prev + 1);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      let apiError: string = 'Connection failed';
      
      // Force reset recaptcha challenge on failure so user has to verify again
      setRecaptchaToken(null);
      setRecaptchaResetKey(prev => prev + 1);

      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          apiError = data.includes('Cannot GET') ? 'Server misconfigured: API route not found' : data;
        } else if (typeof data === 'object' && data !== null) {
          // Flatten potential error objects or arrays to strings
          const possibleError = data.errors?.[0]?.msg || data.error || data.message;
          apiError = typeof possibleError === 'string' ? possibleError : JSON.stringify(possibleError) || 'Server error';
        }
      } else if (err.message) {
        apiError = String(err.message);
      }
      
      setError(String(apiError));
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
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-pink-100 z-10"
      >
        <div className="p-10 md:p-14">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-pink-500/20 overflow-hidden group">
              <img 
                src="https://cdn.corenexis.com/f/xT3JmIu4IAN.jpg" 
                alt="Cathtea Logo" 
                className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = 'https://api.iconify.design/lucide:shopping-cart.svg?color=%23db2777';
                }}
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase font-display">Cathtea POS</h1>
            <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-[0.2em] mt-1">Premium Tea & Quick Bites</p>
          </div>

          <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => { setIsLogin(true); setSuccess(''); setError(''); setRecaptchaToken(null); setRecaptchaResetKey(prev => prev + 1); }}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsLogin(false); setSuccess(''); setError(''); setRecaptchaToken(null); setRecaptchaResetKey(prev => prev + 1); }}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border border-emerald-100 italic transition-all animate-fade-in">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border border-red-100 italic transition-all animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                {isLogin ? 'Username or Email' : 'Username'}
              </label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="text"
                  required
                  placeholder={isLogin ? "Enter your username or email" : "Choose username (min 3 chars)"}
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:bg-white transition-all text-slate-900 font-mono text-sm placeholder:text-slate-300 tracking-wider"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="email"
                      required
                      placeholder="your@email.com"
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:bg-white transition-all text-slate-900 font-mono text-sm placeholder:text-slate-300 tracking-wider"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="password"
                  required
                  placeholder={isLogin ? "••••••••" : "Choose password (min 6 chars)"}
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:bg-white transition-all text-slate-900 font-mono text-sm placeholder:text-slate-300 tracking-widest"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:bg-white transition-all text-slate-900 font-mono text-sm placeholder:text-slate-300 tracking-widest"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Recaptcha onVerify={setRecaptchaToken} resetTrigger={recaptchaResetKey} />

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-pink-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-pink-400 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-0.5 active:translate-y-0 mt-6"
            >
              {loading ? (isLogin ? 'Authenticating...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Register & Join')}
            </button>
          </form>

          <div className="mt-14 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
              {isLogin ? (
                <>Authorized Personnel Only</>
              ) : (
                <>Join the Cathtea Network</>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
