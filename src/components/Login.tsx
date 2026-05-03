import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { ShoppingCart, Lock, User, AlertCircle, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(5, 'Password must be at least 5 characters'),
});

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const { login } = useAuth();

  const fetchCaptcha = async () => {
    try {
      const { data } = await api.get('/auth/captcha');
      setCaptchaQuestion(data.question);
      setCaptchaToken(data.captchaToken);
      setCaptchaAnswer('');
    } catch (err) {
      console.error('Failed to fetch captcha', err);
    }
  };

  React.useEffect(() => {
    fetchCaptcha();
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!captchaAnswer) {
      setError('Please solve the captcha');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const payload = isLogin 
        ? { username, password, captchaAnswer, captchaToken }
        : { username, email, password, captchaAnswer, captchaToken };
      
      const res = await api.post(endpoint, payload);
      login(res.data.token, res.data.user, res.data.stores);
    } catch (err: any) {
      const apiError = err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || (isLogin ? 'Login failed' : 'Signup failed');
      setError(apiError);
      fetchCaptcha(); // Refresh captcha on failure
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
            <div className="w-20 h-20 bg-pink-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-pink-500/40">
              <ShoppingCart className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase font-display">Cathtea POS</h1>
            <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-[0.2em] mt-1">Premium Tea & Quick Bites</p>
          </div>

          <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border border-red-100 italic transition-all animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Username</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="text"
                  required
                  placeholder="Choose username"
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:bg-white transition-all text-slate-900 font-mono text-sm placeholder:text-slate-300 tracking-wider"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {!isLogin && (
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
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Password</label>
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

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Security Check</label>
              <div className="flex gap-3">
                <div className="flex-1 h-[60px] bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                  {/* Background Noise/Grid */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:10px_10px]" />
                  
                  {/* The Captcha Code with Distortions */}
                  <div className="flex gap-1 relative z-10 select-none">
                    {captchaQuestion.split('').map((char, i) => (
                      <motion.span
                        key={i}
                        initial={false}
                        animate={{ 
                          rotate: Math.random() * 40 - 20,
                          y: Math.random() * 10 - 5,
                          scale: 0.9 + Math.random() * 0.3
                        }}
                        className={`text-2xl font-black font-mono tracking-tighter ${
                          i % 2 === 0 ? 'text-pink-500 blur-[0.5px]' : 'text-blue-400 blur-[1px]'
                        } skew-x-[${Math.random() * 20 - 10}deg]`}
                        style={{
                          textShadow: '2px 2px 0px rgba(0,0,0,0.5)',
                          filter: `blur(${Math.random() * 1.5}px) contrast(150%)`
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>

                  {/* Random Distortion Lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-pink-500/30 -rotate-3" />
                    <div className="absolute top-1/3 left-0 w-full h-[1px] bg-blue-500/30 rotate-6" />
                  </div>

                  {/* Refresh overlay on hover */}
                  <button 
                    type="button"
                    onClick={fetchCaptcha}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold"
                  >
                    <ShoppingCart className="w-3 h-3 rotate-12" />
                    REFRESH
                  </button>
                </div>
                <input 
                  type="text"
                  required
                  placeholder="Code"
                  autoComplete="off"
                  className="w-1/3 px-5 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:bg-white transition-all text-slate-900 font-mono text-center text-sm placeholder:text-slate-300 uppercase"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-slate-400 px-2 italic text-center">Type the 6-character code above to verify you're human</p>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-pink-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-pink-400 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-xl shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-0.5 active:translate-y-0 mt-6"
            >
              {loading ? (isLogin ? 'Authenticating...' : 'Creating Account...') : (isLogin ? 'Login' : 'Signup')}
            </button>
          </form>

          <div className="mt-14 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
              {isLogin ? (
                <>Demo Credentials: <span className="text-slate-600">admin / admin123</span></>
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
