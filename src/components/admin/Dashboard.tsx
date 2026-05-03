import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, Brush
} from 'recharts';
import { TrendingUp, DollarSign, Package, ShoppingCart, Users, Activity, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';

const COLORS = ['#db2777', '#f43f5e', '#d946ef', '#fb7185', '#be185d', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const isDate = typeof label === 'string' && (label.includes('-') || label.includes('/'));
    return (
      <div className="backdrop-blur-xl bg-white/95 border border-pink-100 p-5 rounded-2xl shadow-2xl min-w-[200px] shadow-pink-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-black/5 pb-2">
          {isDate && label ? new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : label}
        </p>
        <div className="space-y-3">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {entry?.name || 'Item'}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {typeof entry?.value === 'number' ? 
                  (entry?.name?.toLowerCase().includes('revenue') || entry?.name?.toLowerCase().includes('value') ? 
                    `$${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 
                    entry.value.toLocaleString()) : 
                  entry?.value || '-'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user, currentStore } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentShift, setCurrentShift] = useState<any>(null);

  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    if (user?.role === 'admin') {
      fetchSummary();
    } else {
      if (currentStore) {
        fetchCurrentShift();
      }
      setLoading(false);
    }
  }, [user, currentStore]);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/analytics/summary');
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentShift = async () => {
    try {
      const res = await api.get('/shifts/current');
      setCurrentShift(res.data);
    } catch (err) {
      console.error('Failed to fetch shift', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-pink-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] animate-pulse">Initializing Dashboard...</p>
      </div>
    );
  }

  if (user?.role === 'cashier') {
    if (!currentStore) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-8 p-12 backdrop-blur-2xl bg-white/50 border border-pink-100 rounded-[3rem] text-center">
          <div className="w-20 h-20 bg-pink-50 rounded-[2rem] flex items-center justify-center text-pink-300">
            <Activity className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight uppercase mb-4">No Store Assigned</h2>
            <p className="text-slate-500 max-w-md mx-auto text-sm font-medium leading-relaxed">
              Your account is currently active, but you haven't been assigned to a specific store location yet. Please contact your administrator.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
          >
            Check Status
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-12 pb-12 mt-4">
        {/* Cashier Welcome Header */}
        <div className="flex flex-col gap-2">
          <p className="text-pink-500 font-bold uppercase tracking-[0.3em] text-[10px]">Welcome Back, {user.username}</p>
          <h2 className="text-6xl font-display font-bold text-slate-900 tracking-tighter uppercase">POS Access</h2>
          <div className="flex items-center gap-3 mt-2">
            <div className={`w-2 h-2 rounded-full animate-pulse shadow-sm ${currentShift ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-300 shadow-slate-100'}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Shift Status: {currentShift ? 'Active & Receiving' : 'Closed / Pending'}
            </span>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
          {/* Start/Manage Shift Card */}
          <motion.div 
            whileHover={{ scale: 1.02, translateY: -5 }}
            onClick={() => navigate('/shifts')}
            className="group cursor-pointer backdrop-blur-2xl bg-white border border-pink-100 p-10 rounded-[3rem] shadow-2xl shadow-pink-100/50 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-pink-100/30 blur-[80px] group-hover:bg-pink-200/40 transition-colors"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-16 h-16 bg-pink-50 rounded-2xl border border-pink-100 flex items-center justify-center text-pink-500 mb-8 group-hover:scale-110 transition-transform">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-display font-bold text-slate-900 mb-3 uppercase tracking-tight">Shift Management</h3>
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed max-w-[280px]">
                {currentShift 
                  ? 'Your current shift is operational. Manage closing activities or balance updates here.' 
                  : 'Start your operational shift by entering the store code and opening amount.'}
              </p>
              <div className="mt-auto flex items-center gap-3 text-pink-600 font-bold uppercase tracking-widest text-xs">
                <span>{currentShift ? 'Manage Shift' : 'Start Shift'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </motion.div>

          {/* POS Card */}
          <motion.div 
            whileHover={{ scale: 1.02, translateY: -5 }}
            onClick={() => navigate('/pos')}
            className="group cursor-pointer backdrop-blur-2xl bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl shadow-slate-200 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 blur-[80px] group-hover:bg-pink-500/20 transition-colors"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-pink-500 mb-8 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-display font-bold text-white mb-3 uppercase tracking-tight">POS Access</h3>
              <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed max-w-[280px]">
                Enter the operational POS interface to process customer orders and generate receipts.
              </p>
              <div className="mt-auto flex items-center gap-3 text-white font-bold uppercase tracking-widest text-xs">
                <span>Enter POS</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform text-pink-500" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Support Info */}
        <div className="flex items-center gap-4 py-6 border-t border-pink-100 max-w-5xl">
          <div className="w-10 h-10 bg-white rounded-xl border border-pink-50 flex items-center justify-center text-pink-300">
             <Activity className="w-5 h-5" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Logged into <span className="text-pink-600">{currentStore?.name}</span> • System Version 2.0.4 • Secured Access
          </p>
        </div>
      </div>
    );
  }

  const todayRevenue = summary?.general?.todayRevenue || 0;
  const todaySales = summary?.general?.todaySalesCount || 0;
  const totalProducts = summary?.general?.totalProducts || 0;
  const lowStock = summary?.general?.lowStockCount || 0;

  return (
    <div className="space-y-10 pb-12">
      {/* Header Info */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-4">
        <div>
          <h2 className="text-5xl font-display font-bold text-slate-900 tracking-tighter uppercase">Business Overview</h2>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">System Ready • Latest Update {currentTime || '...'}</span>
          </div>
        </div>
        <div className="px-6 py-4 bg-white border border-pink-100 rounded-2xl flex items-center gap-3 shadow-sm group hover:border-pink-500 transition-all">
          <Activity className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Real-time Tracking Active</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Daily Revenue" 
          value={`$${(todayRevenue || 0).toLocaleString()}`} 
          trend={todayRevenue > 0 ? "+Active" : "Neutral"} 
          positive={todayRevenue > 0} 
          icon={DollarSign}
          subtitle="Real-time intake"
        />
        <StatCard 
          title="Orders Today" 
          value={(todaySales || 0).toString()} 
          trend={todaySales > 0 ? "Active" : "Idle"} 
          positive={todaySales > 0} 
          icon={ShoppingCart}
          subtitle="Total transactions"
        />
        <StatCard 
          title="Stock Alerts" 
          value={(totalProducts || 0).toString()} 
          trend={lowStock > 0 ? `${lowStock} Low` : "Safe"} 
          positive={lowStock === 0} 
          icon={Package}
          subtitle="Total catalog items"
        />
        <StatCard 
          title="Team Members" 
          value={summary?.general?.totalStaff?.toString() || "0"} 
          trend="Active" 
          positive 
          icon={Users}
          subtitle="Authorized staff"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 backdrop-blur-md bg-white border border-pink-100 p-8 rounded-[3rem] shadow-xl relative overflow-hidden group shadow-pink-100"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 blur-[100px] pointer-events-none"></div>
          <div className="flex items-center justify-between mb-10 relative z-10">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] font-display flex items-center gap-3">
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
              Revenue Trend
            </h3>
            <div className="flex gap-2">
               <button className="px-3 py-1.5 bg-pink-500 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg shadow-lg shadow-pink-200">Last 30 Days</button>
               <button className="px-3 py-1.5 bg-pink-50 text-pink-400 text-[9px] font-bold uppercase tracking-widest rounded-lg hover:bg-pink-100">Yearly</button>
            </div>
          </div>
          <div className="h-[350px] w-full relative z-10">
            {summary?.daily?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary?.daily}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis 
                    dataKey="sale_date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.3)', fontWeight: 'bold' }} 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.3)', fontWeight: 'bold' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Gross Revenue"
                    stroke="#ec4899" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#ec4899' }}
                  />
                  <Brush 
                    dataKey="sale_date" 
                    height={30} 
                    stroke="#ec4899" 
                    fill="#fff"
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric' })}
                    className="recharts-brush"
                  >
                    <AreaChart>
                       <Area type="monotone" dataKey="revenue" stroke="#ec4899" fill="#ec4899" fillOpacity={0.1} />
                    </AreaChart>
                  </Brush>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Waiting for sales data</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Categories Distribution */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-md bg-white border border-pink-100 p-8 rounded-[3rem] shadow-xl flex flex-col items-center justify-center text-center shadow-pink-50"
        >
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] font-display mb-8 self-start">Sales by Category</h3>
          <div className="flex-1 min-h-[250px] w-full">
            {summary?.categories?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary?.categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {summary?.categories.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    iconType="circle" 
                    verticalAlign="bottom" 
                    wrapperStyle={{ paddingTop: '30px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-3xl">
                <div className="w-12 h-12 rounded-full border-2 border-white/5 flex items-center justify-center text-slate-700 font-bold">?</div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Waiting for data</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          {/* Best Sellers */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="backdrop-blur-md bg-white border border-pink-100 p-10 rounded-[3rem] shadow-xl shadow-pink-50"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] font-display">Best Selling Products</h3>
              <p className="text-[9px] font-bold text-pink-500 uppercase tracking-widest px-3 py-1 bg-pink-50 rounded-full border border-pink-100">Top 5 Items</p>
            </div>
            <div className="space-y-4">
              {summary?.bestSellers?.length > 0 ? (
                summary.bestSellers.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-white border border-pink-50 rounded-[1.5rem] group hover:bg-pink-50 hover:border-pink-200 transition-all duration-300">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white rounded-2xl border border-pink-100 flex items-center justify-center shrink-0 overflow-hidden relative group-hover:scale-105 transition-all duration-500 shadow-sm">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold text-sm">
                            {i+1}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 tracking-tight">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.2em] mt-1">{item.totalSold} units sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900 tracking-widest font-mono">${(item.totalRevenue || 0).toLocaleString()}</p>
                      <div className="flex items-center gap-1 justify-end text-[9px] text-pink-500 font-bold uppercase tracking-widest mt-1">
                        <TrendingUp className="w-3 h-3" />
                        Peak Performance
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No transaction records found</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Performance Summary Bar Chart */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="backdrop-blur-md bg-white border border-pink-100 p-10 rounded-[3rem] shadow-xl shadow-pink-50 flex flex-col"
          >
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] font-display mb-10 text-center">Sales Performance</h3>
            <div className="flex-1 h-[300px] w-full">
              {summary?.bestSellers?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.bestSellers}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.3)', fontWeight: 'bold' }} 
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'rgba(0,0,0,0.3)', fontWeight: 'bold' }} />
                    <Tooltip 
                       cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                       content={<CustomTooltip />} 
                    />
                    <Bar dataKey="totalSold" name="Total Units Sold" fill="#ec4899" radius={[8, 8, 0, 0]}>
                      {summary.bestSellers.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                    {summary?.bestSellers?.length > 4 && (
                      <Brush dataKey="name" height={20} stroke="#ec4899" fill="#fff" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-black/5 rounded-3xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generating metrics...</p>
                </div>
              )}
            </div>
            <div className="mt-10 p-6 bg-pink-50 border border-pink-100 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-pink-500/10 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-pink-400" />
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-wider">
                    Store performance is currently operating within <span className="text-pink-600 font-bold">optimal ranges</span> for your shop.
                  </p>
                </div>
            </div>
          </motion.div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, positive, icon: Icon, subtitle }: any) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, translateY: -5 }}
      className="technical-card p-10 group relative overflow-hidden transition-all duration-700"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/[0.03] blur-[60px] group-hover:bg-pink-500/[0.08] transition-colors pointer-events-none"></div>
      
      <div className="flex items-center justify-between mb-10 relative z-10">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-pink-200 transition-all shadow-sm">
          <Icon className="w-6 h-6 text-slate-900 group-hover:text-pink-500 transition-colors" />
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm border transition-colors ${
          positive 
            ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100' 
            : 'bg-rose-50/50 text-rose-600 border-rose-100'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${positive ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
          <span className="micro-label !text-[8px] tracking-widest">{trend}</span>
        </div>
      </div>

      <div className="relative z-10">
        <p className="micro-label mb-2 opacity-60 group-hover:opacity-100 transition-opacity">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-display font-medium text-slate-900 tracking-tighter leading-none">{value}</p>
          {positive && <TrendingUp className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0" />}
        </div>
        <p className="micro-label !text-[9px] mt-4 opacity-40 group-hover:opacity-60 transition-opacity">{subtitle}</p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </motion.div>
  );
}
