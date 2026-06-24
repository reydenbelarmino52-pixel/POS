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
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const [activeToast, setActiveToast] = useState<any | null>(null);

  const dismissNotification = (id: string | number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  React.useEffect(() => {
    if (!currentStore?.id) return;

    // 1. Fetch initial low stock items
    const fetchLowStock = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, stock, low_stock_threshold')
          .eq('store_id', currentStore.id);
        
        if (data && !error) {
          const lowStockItems = data.filter((p: any) => p.stock <= (p.low_stock_threshold || 10));
          const initialNotifications = lowStockItems.map((p: any) => {
            const stockVal = p.stock ?? 0;
            const severity = stockVal <= 5 ? 'critical' : 'warning';
            return {
              id: `low-${p.id}`,
              message: stockVal <= 0 ? `Out of stock: ${p.name}` : `Low stock: ${p.name} (${stockVal} left)`,
              type: 'warning',
              severity,
              stock: stockVal,
              productId: p.id,
              timestamp: new Date().toISOString()
            };
          });
          setNotifications(initialNotifications);
        }
      } catch (err) {
        console.error('Error loading low stock notifications:', err);
      }
    };

    fetchLowStock();

    // 2. Subscribe to products for low stock alerts in real-time
    const channel = supabase
      .channel('low-stock-alerts')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE to keep notifications synced in real-time!
          schema: 'public',
          table: 'products',
          filter: `store_id=eq.${currentStore.id}`
        },
        (payload) => {
          const eventType = payload.eventType;
          
          if (eventType === 'DELETE') {
            const product = payload.old as any;
            setNotifications(prev => prev.filter(n => n.productId !== product.id));
            return;
          }

          const product = payload.new as any;
          const stockVal = product.stock ?? 0;
          const isLowStock = stockVal <= (product.low_stock_threshold || 10);

          if (isLowStock) {
            const severity = stockVal <= 5 ? 'critical' : 'warning';
            const newNotification = { 
              id: `low-${product.id}`, 
              message: stockVal <= 0 ? `Out of stock: ${product.name}` : `Low stock: ${product.name} (${stockVal} left)`, 
              type: 'warning',
              severity,
              stock: stockVal,
              productId: product.id,
              timestamp: new Date().toISOString()
            };
            
            // Check if notification already exists to avoid duplicates
            setNotifications(prev => {
              const filtered = prev.filter(n => n.productId !== product.id);
              return [newNotification, ...filtered];
            });

            setActiveToast(newNotification);
            
            // Auto-dismiss toast
            setTimeout(() => {
              setActiveToast((current: any) => current?.id === newNotification.id ? null : current);
            }, 5000);
          } else {
            // No longer low stock, remove from notifications!
            setNotifications(prev => prev.filter(n => n.productId !== product.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStore?.id]);

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
    <div className="h-screen h-[100dvh] bg-[#F8FAFC] text-slate-900 flex overflow-hidden relative print:bg-white print:text-black">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-100/60 via-[#F8FAFC] to-pink-50/20 pointer-events-none z-0 print:hidden"></div>
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
            <div className={`mx-4 backdrop-blur-2xl bg-white/95 border p-5 rounded-[2rem] shadow-2xl flex items-center gap-5 ${
              activeToast.severity === 'critical' 
                ? 'border-rose-500/30 shadow-rose-200/50' 
                : 'border-amber-500/30 shadow-amber-200/50'
            }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                activeToast.severity === 'critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'
              }`}>
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${
                  activeToast.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'
                }`}>
                  {activeToast.severity === 'critical' ? 'CRITICAL ALERT' : 'SYSTEM ALERT'}
                </p>
                <p className="text-sm font-semibold text-slate-900 tracking-tight">{activeToast.message}</p>
              </div>
              <button 
                onClick={() => setActiveToast(null)}
                className="p-2 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col backdrop-blur-3xl bg-white/80 border-r border-[#E5E7EB] sticky top-0 h-screen z-20 print:hidden shadow-[4px_0_24px_rgba(0,0,0,0.01)] transition-all duration-300 ${
        isSidebarCollapsed ? 'w-24' : 'w-64 xl:w-72'
      }`}>
        <div className={`p-6 pb-4 flex items-center transition-all ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <h1 className="text-2xl font-display font-medium tracking-tighter text-slate-900 flex items-center gap-3 uppercase overflow-hidden">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-pink-200 overflow-hidden relative shrink-0">
                <img 
                  src="https://cdn.corenexis.com/f/xT3JmIu4IAN.jpg" 
                  alt="Logo" 
                  className="w-full h-full object-contain p-0.5" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <span className="leading-none truncate max-w-[120px]">{currentStore?.name?.split(' ')[0] || 'Cathtea'}</span>
            </h1>
          )}
          {isSidebarCollapsed && (
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-pink-200 overflow-hidden relative">
              <img 
                src="https://cdn.corenexis.com/f/xT3JmIu4IAN.jpg" 
                alt="Logo" 
                className="w-full h-full object-contain p-0.5" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          <button 
            onClick={() => {
              setIsSidebarCollapsed(prev => {
                const next = !prev;
                localStorage.setItem('sidebar_collapsed', String(next));
                return next;
              });
            }}
            className={`p-1.5 hover:bg-pink-50 rounded-lg text-slate-400 hover:text-pink-600 transition-colors ${isSidebarCollapsed ? 'mt-2' : ''}`}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        
        <nav className={`flex-1 space-y-1.5 overflow-y-auto scrollbar-hide ${isSidebarCollapsed ? 'px-3' : 'px-6'}`}>
          <div className={`mt-4 mb-6 transition-all ${isSidebarCollapsed ? 'px-0' : 'px-4'}`}>
             <button 
              onClick={() => navigate('/select-store')}
              className={`w-full flex items-center transition-all group active:scale-[0.98] ${
                isSidebarCollapsed 
                  ? 'justify-center p-3 bg-pink-50 border border-pink-100 rounded-2xl' 
                  : 'justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-pink-200 hover:bg-white shadow-sm'
              }`}
              title="Switch Branch"
             >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isSidebarCollapsed ? 'w-8 h-8 border-none bg-transparent' : 'w-8 h-8'
                  } group-hover:bg-pink-50 group-hover:border-pink-100`}>
                    <Store className="w-4 h-4 text-slate-900 group-hover:text-pink-500 transition-colors" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="text-left overflow-hidden">
                      <p className="micro-label !text-[8px] opacity-60">Location</p>
                      <p className="text-xs font-bold text-slate-900 uppercase truncate tracking-tight">{currentStore?.name}</p>
                    </div>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <RefreshCw className="w-3 h-3 text-slate-300 group-hover:text-pink-500 group-hover:rotate-180 transition-all duration-700" />
                )}
             </button>
          </div>

          <p className={`micro-label mb-4 opacity-50 ${isSidebarCollapsed ? 'text-center text-[7px]' : 'px-4'}`}>
            {isSidebarCollapsed ? 'Hub' : 'Operational Hub'}
          </p>
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center rounded-2xl text-[12px] font-bold transition-all duration-300 group relative overflow-hidden
                ${isSidebarCollapsed ? 'p-3.5 justify-center' : 'gap-4 px-5 py-4'}
                ${isActive 
                  ? 'bg-pink-600 text-white shadow-xl shadow-pink-200' 
                  : 'text-slate-900 font-extrabold hover:bg-pink-50/50 hover:text-slate-900'
                }
              `}
              title={item.name}
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-4 h-4 transition-transform group-hover:scale-110 group-hover:text-pink-500 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="uppercase tracking-[0.15em] relative z-10 truncate">{item.name}</span>
                  )}
                  {isActive && !isSidebarCollapsed && (
                    <motion.div layoutId="nav-pill" className="absolute right-4 w-1.5 h-1.5 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
                  )}
                  {!isActive && !isSidebarCollapsed && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-pink-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={`mt-auto transition-all ${isSidebarCollapsed ? 'p-3' : 'p-8'}`}>
          <div className={`bg-slate-50/50 border border-slate-100 rounded-[2.5rem] relative overflow-hidden transition-all ${
            isSidebarCollapsed ? 'p-3 flex flex-col items-center gap-3' : 'p-6'
          }`}>
            <div className={`flex items-center transition-all ${
              isSidebarCollapsed ? 'flex-col justify-center' : 'gap-4 mb-6 relative z-10'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-pink-600 flex items-center justify-center text-sm font-bold text-white shadow-lg uppercase shrink-0">
                {user?.username?.[0] || '?'}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate uppercase tracking-tighter">{user?.username || 'Operator'}</p>
                  <p className="micro-label !text-pink-500 opacity-80 mt-0.5">{user?.role || 'Staff'}</p>
                </div>
              )}
            </div>
            <button 
              onClick={logout}
              className={`flex items-center justify-center text-slate-950 hover:text-rose-600 hover:bg-white border border-transparent hover:border-rose-100 rounded-xl transition-all duration-300 ${
                isSidebarCollapsed 
                  ? 'w-10 h-10 p-0' 
                  : 'w-full gap-3 py-3 text-[10px] font-black uppercase tracking-widest relative z-10'
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Terminate Session</span>}
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
                <span className="text-[10px] font-extrabold text-slate-900 uppercase tracking-widest">System Active • Connection Secured</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="p-2.5 bg-white border border-black/5 rounded-xl cursor-pointer hover:bg-pink-50 transition-all">
                <Bell className="w-5 h-5 text-slate-950 font-bold" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.6)]"></span>
                )}
              </div>
              <div className="absolute right-0 mt-3 w-80 backdrop-blur-2xl bg-white/95 border border-black/5 rounded-2xl shadow-2xl hidden group-hover:block z-50 p-3 shadow-pink-100">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-2">
                  <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest">Active Alerts</p>
                  {notifications.length > 0 && (
                    <button 
                      onClick={() => setNotifications([])}
                      className="text-[8px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-wider"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-64 overflow-auto">
                  {notifications.length === 0 ? (
                     <p className="text-xs text-slate-800 font-bold p-4 text-center">No system warnings</p>
                  ) : (
                    notifications.map(n => {
                      const isCritical = n.severity === 'critical';
                      return (
                        <div 
                          key={n.id} 
                          className={`p-3 border rounded-xl transition-all flex items-start gap-2.5 group/alert relative ${
                            isCritical 
                              ? 'bg-rose-50/95 text-rose-950 border-rose-200 shadow-sm shadow-rose-100' 
                              : 'bg-amber-50/95 text-amber-950 border-amber-200 shadow-sm shadow-amber-100'
                          }`}
                        >
                          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isCritical ? 'text-rose-500 animate-pulse' : 'text-amber-500'
                          }`} />
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-xs font-bold leading-normal">{n.message}</p>
                            <p className={`text-[8px] font-black uppercase mt-1 tracking-wider ${
                              isCritical ? 'text-rose-600' : 'text-amber-600'
                            }`}>
                              {isCritical ? 'CRITICAL STOCK' : 'LOW STOCK WARNING'}
                            </p>
                          </div>
                          <button 
                            onClick={() => dismissNotification(n.id)}
                            className={`absolute right-2 top-2 p-1 rounded-lg text-slate-400 hover:bg-black/5 opacity-0 group-hover/alert:opacity-100 transition-all ${
                              isCritical ? 'hover:text-rose-600' : 'hover:text-amber-600'
                            }`}
                            title="Dismiss warning"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
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
                      src="https://cdn.corenexis.com/f/xT3JmIu4IAN.jpg" 
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
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-900 font-bold">
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
                        : 'text-slate-900 font-bold hover:bg-pink-50/5 hover:text-slate-900'
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
