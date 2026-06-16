import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Clock,
  Settings,
  Sparkles,
  Receipt,
  Store,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const { user, logout, currentStore } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const [activeToast, setActiveToast] = useState<any | null>(null);

  React.useEffect(() => {
    // Subscribe to products for low stock alerts
    const channel = supabase
      .channel('low-stock-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          const product = payload.new as any;
          if (product.stock <= (product.low_stock_threshold || 5)) {
            const newNotification = { 
              id: Date.now(), 
              message: `Low stock: ${product.name} (${product.stock} left)`, 
              type: 'warning' 
            };
            setNotifications(prev => [newNotification, ...prev]);
            setActiveToast(newNotification);
            
            // Auto-dismiss toast
            setTimeout(() => {
              setActiveToast((current: any) => current?.id === newNotification.id ? null : current);
            }, 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin'] },
    { name: 'POS', path: '/pos', icon: ShoppingCart, roles: ['admin', 'cashier'] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: ['admin'] },
    { name: 'Order History', path: '/orders', icon: Receipt, roles: ['admin'] },
    { name: 'Analytics', path: '/reports', icon: BarChart3, roles: ['admin'] },
    { name: 'Staff Management', path: '/staff', icon: Users, roles: ['admin'] },
    { name: 'Shift Management', path: '/shifts', icon: Clock, roles: ['admin', 'cashier'] },
    { name: 'System Controls', path: '/admin-actions', icon: Settings, roles: ['admin'] },
    { name: 'Switch Branch', path: '/select-store', icon: ShoppingBag, roles: ['admin', 'cashier'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className="h-screen h-[100dvh] bg-[#FFF5F7] text-slate-900 flex overflow-hidden relative print:bg-white print:text-black">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 bg-gradient-to-br from-pink-100 via-[#FFF5F7] to-rose-50 pointer-events-none z-0 print:hidden"></div>
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-500/5 rounded-full blur-[120px] pointer-events-none z-0 print:hidden"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none z-0 print:hidden"></div>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, x: '-50%' }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm"
          >
            <div className="mx-4 backdrop-blur-2xl bg-white/90 border border-pink-500/30 p-5 rounded-[2rem] shadow-2xl flex items-center gap-5 shadow-pink-200/50">
              <div className="w-12 h-12 bg-pink-500/20 rounded-2xl flex items-center justify-center text-pink-500">
                <Bell className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-pink-500 uppercase tracking-[0.2em] mb-1">System Alert</p>
                <p className="text-sm font-semibold text-slate-900 tracking-tight">{activeToast.message}</p>
              </div>
              <button 
                onClick={() => setActiveToast(null)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 backdrop-blur-3xl bg-white/80 border-r border-[#E5E7EB] sticky top-0 h-screen z-20 print:hidden shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
        <div className="p-10 pb-6">
          <h1 className="text-3xl font-display font-medium tracking-tighter text-slate-900 flex items-center gap-3 uppercase">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-pink-200 overflow-hidden relative group/logo">
              <img 
                src="https://cdn.corenexis.com/files/c/9914686720.png" 
                alt="Logo" 
                className="w-full h-full object-contain p-1 relative z-10" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-slate-900 translate-y-full group-hover/logo:translate-y-0 transition-transform duration-500"></div>
              <span className="text-white font-bold text-sm relative z-10 hidden group-hover/logo:block">CT</span>
            </div>
            <span className="leading-none">{currentStore?.name?.split(' ')[0] || 'Cathtea'}</span>
          </h1>
        </div>
        
        <nav className="flex-1 px-6 space-y-1.5 overflow-y-auto scrollbar-hide">
          <div className="px-4 mb-10 mt-4">
             <button 
              onClick={() => navigate('/select-store')}
              className="w-full flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-pink-200 hover:bg-white transition-all group shadow-sm active:scale-[0.98]"
             >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center group-hover:bg-pink-50 group-hover:border-pink-100">
                    <Store className="w-4 h-4 text-slate-400 group-hover:text-pink-500 transition-colors" />
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="micro-label !text-[8px] opacity-60">Location</p>
                    <p className="text-xs font-bold text-slate-900 uppercase truncate tracking-tight">{currentStore?.name}</p>
                  </div>
                </div>
                <RefreshCw className="w-3 h-3 text-slate-300 group-hover:text-pink-500 group-hover:rotate-180 transition-all duration-700" />
             </button>
          </div>

          <p className="micro-label px-4 mb-4 opacity-50">Operational Hub</p>
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-4 px-5 py-4 rounded-2xl text-[12px] font-bold transition-all duration-300 group relative overflow-hidden
                ${isActive 
                  ? 'bg-pink-600 text-white shadow-xl shadow-pink-200' 
                  : 'text-slate-500 hover:bg-pink-50/50 hover:text-slate-900'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-4 h-4 transition-transform group-hover:scale-110 group-hover:text-pink-500" />
                  <span className="uppercase tracking-[0.15em] relative z-10">{item.name}</span>
                  {isActive && (
                    <motion.div layoutId="nav-pill" className="absolute right-4 w-1.5 h-1.5 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
                  )}
                  {!isActive && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-pink-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-8 mt-auto">
          <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-[2.5rem] relative overflow-hidden group/profile">
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-pink-600 flex items-center justify-center text-sm font-bold text-white shadow-lg uppercase group-hover/profile:bg-pink-500 transition-colors duration-500">
                {user?.username?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate uppercase tracking-tighter">{user?.username || 'Operator'}</p>
                <p className="micro-label !text-pink-500 opacity-80 mt-0.5">{user?.role || 'Staff'}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center gap-3 py-3 text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-rose-100 rounded-xl transition-all duration-300 uppercase tracking-widest relative z-10"
            >
              <LogOut className="w-4 h-4" />
              Terminate Session
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen h-[100dvh] overflow-hidden z-10 print:overflow-visible">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 shrink-0 print:hidden bg-white/40 backdrop-blur-md z-20 border-b border-pink-100/20">
          <div className="flex items-center gap-6">
            <button 
              className="md:hidden p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tighter uppercase">
                {navItems.find(n => n.path === location.pathname)?.name || (location.pathname === '/' ? 'Dashboard' : 'POS')}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Active • Connection Secured</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="p-2.5 bg-white border border-black/5 rounded-xl cursor-pointer hover:bg-pink-50 transition-all">
                <Bell className="w-5 h-5 text-slate-400" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.6)]"></span>
                )}
              </div>
              <div className="absolute right-0 mt-3 w-72 backdrop-blur-2xl bg-white/95 border border-black/5 rounded-2xl shadow-2xl hidden group-hover:block z-50 p-3 shadow-pink-100">
                <p className="text-[10px] font-bold text-slate-400 px-3 py-2 uppercase tracking-widest">Active Alerts</p>
                <div className="space-y-1 max-h-64 overflow-auto">
                  {notifications.length === 0 ? (
                     <p className="text-xs text-slate-300 p-4 text-center">No system warnings</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-3 bg-pink-50 text-pink-900 border border-pink-100 hover:bg-pink-100 rounded-xl transition-all">
                        <p className="text-xs font-semibold">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-auto p-8 pt-4 print:p-0 print:overflow-visible">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 backdrop-blur-3xl bg-white border-r border-pink-100 z-50 md:hidden p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden p-1">
                    <img 
                      src="https://cdn.corenexis.com/files/c/9914686720.png" 
                      alt="Logo" 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Cathtea</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 space-y-2">
                {filteredNav.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all
                      ${isActive 
                        ? 'bg-pink-600 text-white shadow-lg shadow-pink-200' 
                        : 'text-slate-500 hover:bg-pink-50/5 hover:text-slate-900'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    {item.name}
                  </NavLink>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
