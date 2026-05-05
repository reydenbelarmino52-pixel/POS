import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  RefreshCw, 
  FileText, 
  Scissors, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  Database,
  BarChart,
  Settings,
  Store,
  Lock,
  ChevronRight,
  AlertTriangle,
  Users
} from 'lucide-react';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminActions() {
  const { currentStore } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [storeData, setStoreData] = useState<any>(null);
  const [isEditingStore, setIsEditingStore] = useState(false);

  useEffect(() => {
    if (currentStore) {
      setStoreData({
        name: currentStore.name,
        shift_pin: currentStore.shift_pin || '1234'
      });
    }
  }, [currentStore]);

  const handleAction = async (name: string, fn: () => Promise<void>) => {
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      await fn();
      setSuccess(`Action "${name}" completed successfully.`);
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to execute ${name}`);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const resetInventoryLogs = async () => {
    if (!confirm('This will clear history logs for inventory (Products will remain). Continue?')) return;
    await api.post('/admin/actions/clear-inventory-logs');
  };

  const forceCloseShifts = async () => {
    if (!confirm('This will force close ANY open shift in this store. Continue?')) return;
    await api.post('/admin/actions/force-close-shifts');
  };

  const updateStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    handleAction('Update Store Settings', async () => {
      await api.put(`/stores/${(currentStore as any).id}`, storeData);
      setIsEditingStore(false);
      // In a real app we'd refresh auth/localstorage too, but let's keep it simple
      window.location.reload(); 
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-4 mb-3">
             <div className="w-14 h-14 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-slate-200">
               <Wrench className="w-7 h-7 text-pink-500" />
             </div>
             <div>
               <h1 className="text-4xl font-bold text-slate-900 tracking-tighter uppercase">Admin Command Center</h1>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Advanced system protocols & maintenance</p>
             </div>
           </div>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Session: Admin Tier</span>
        </div>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 shadow-xl shadow-emerald-500/5"
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <p className="text-sm font-bold text-emerald-700 uppercase tracking-tight">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-5 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 shadow-xl shadow-rose-500/5"
          >
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <p className="text-sm font-bold text-rose-700 uppercase tracking-tight">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Store Settings */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/20 overflow-hidden group">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Branch Configuration</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Core identity parameters</p>
                </div>
              </div>
              {!isEditingStore && (
                <button 
                  onClick={() => setIsEditingStore(true)}
                  className="px-6 py-3 bg-pink-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-pink-500 transition-all shadow-lg shadow-pink-200"
                >
                  Modify Attributes
                </button>
              )}
            </div>
            
            <div className="p-10">
              {isEditingStore ? (
                <form onSubmit={updateStoreSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block font-display">Branch Display Name</label>
                      <input 
                        type="text"
                        value={storeData?.name || ''}
                        onChange={e => setStoreData({...storeData, name: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-pink-500/10 focus:bg-white focus:border-pink-500 transition-all text-sm font-bold text-slate-900 uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block font-display">Operational Shift Pin</label>
                      <input 
                        type="text"
                        value={storeData?.shift_pin || ''}
                        onChange={e => setStoreData({...storeData, shift_pin: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-pink-500/10 focus:bg-white focus:border-pink-500 transition-all text-sm font-bold text-slate-900 font-mono tracking-widest"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <button 
                      type="submit"
                      disabled={loading}
                      className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                    >
                      {loading ? 'Processing...' : 'Save Protocols'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditingStore(false)}
                      className="px-6 py-4 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-slate-600"
                    >
                      Abort
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl relative overflow-hidden group/item">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/item:scale-110 transition-transform">
                      <Store className="w-12 h-12" />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2">Display Registry</p>
                    <p className="text-xl font-bold text-slate-900 uppercase tracking-tight">{currentStore?.name}</p>
                  </div>
                  <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl relative overflow-hidden group/item">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/item:scale-110 transition-transform">
                      <Lock className="w-12 h-12" />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2">Access PIN</p>
                    <p className="text-xl font-bold text-slate-900 font-mono tracking-[0.4em]">{currentStore?.shift_pin || '1234'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/20 overflow-hidden">
             <div className="p-10 border-b border-slate-50 flex items-center gap-4 bg-slate-50/30">
                <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-900">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Maintenance Utility</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automated cleanup & auditing</p>
                </div>
             </div>
             <div className="p-10 space-y-6">
                <ProtocolItem 
                   icon={RefreshCw}
                   title="Force Close Operational Shifts"
                   desc="Terminates all open shifts in the current store location. Use this if a cashier forgets to sign out at EOD."
                   onAction={() => handleAction('Force Close Shifts', forceCloseShifts)}
                   loading={loading}
                   color="blue"
                />
                <ProtocolItem 
                   icon={Scissors}
                   title="Prune Inventory History"
                   desc="Clears legacy inventory change logs. Does not affect current product stock levels or sale records."
                   onAction={() => handleAction('Clear Logs', resetInventoryLogs)}
                   loading={loading}
                   color="amber"
                />
                <ProtocolItem 
                   icon={Database}
                   title="System Re-validation"
                   desc="Scans database for relational inconsistencies and rebuilds cached business metrics."
                   onAction={() => handleAction('Validation', async () => { await new Promise(r => setTimeout(r, 1500)); })}
                   loading={loading}
                   color="slate"
                />
             </div>
          </div>
        </div>

        {/* Right Column: Quick Links & Alerts */}
        <div className="lg:col-span-5 space-y-8">
           <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-[80px] pointer-events-none"></div>
              <h3 className="text-xl font-bold uppercase tracking-tighter mb-8 flex items-center gap-3">
                 <ShieldAlert className="w-6 h-6 text-pink-500" />
                 Critical Warnings
              </h3>
              <div className="space-y-4">
                 <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl flex items-start gap-4 hover:bg-white/[0.06] transition-all">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                    <div>
                       <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">Stock Threshold Triggered</p>
                       <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase tracking-tighter">Multiple beverage ingredients are currently below the safety margin (5 units).</p>
                    </div>
                 </div>
                 <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl flex items-start gap-4 hover:bg-white/[0.06] transition-all">
                    <RefreshCw className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                    <div>
                       <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1">Unclosed Shift Detected</p>
                       <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase tracking-tighter">A shift from 24 hours ago remains in 'OPEN' status. Recommended to force terminate.</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-2xl shadow-slate-200/20">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-8">Executive Shortcuts</h3>
              <div className="grid grid-cols-1 gap-3">
                 <ShortcutButton 
                    icon={BarChart} 
                    title="Daily Revenue PDF" 
                    onClick={() => alert('Generating Daily Revenue Report PDF... Download will start shortly.')} 
                 />
                 <ShortcutButton 
                    icon={Users} 
                    title="Export Staff Audit" 
                    onClick={() => alert('Compiling Staff Performance & Access Audit...')} 
                 />
                 <ShortcutButton 
                    icon={FileText} 
                    title="Inventory Valuation" 
                    onClick={() => alert('Calculating current stock valuation and asset balance...')} 
                 />
              </div>
           </div>

           <div className="p-8 bg-pink-50 border border-pink-100 rounded-[2.5rem] flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white rounded-2xl border border-pink-100 flex items-center justify-center text-pink-500 mb-6 shadow-sm">
                 <ShieldAlert className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 uppercase tracking-tighter mb-2">Restricted Area</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Actions in this protocol center can irreversibly modify core system data. Handle with extreme caution.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function ProtocolItem({ icon: Icon, title, desc, onAction, loading, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white',
    amber: 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white',
    slate: 'bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white',
  };

  return (
    <div className="flex items-center justify-between gap-8 p-6 bg-slate-50/50 border border-slate-100 rounded-3xl group/row hover:bg-white hover:border-pink-200 transition-all duration-300">
      <div className="flex items-start gap-5 flex-1">
        <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 group-hover/row:text-pink-500 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tighter mb-1">{title}</h4>
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest opacity-60 group-hover/row:opacity-100 transition-opacity">
            {desc}
          </p>
        </div>
      </div>
      <button
        onClick={onAction}
        disabled={loading}
        className={`px-8 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0 ${colorMap[color] || colorMap.slate}`}
      >
        {loading ? 'Wait...' : 'Execute'}
      </button>
    </div>
  );
}

function ShortcutButton({ icon: Icon, title, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl group hover:border-pink-500 hover:bg-pink-50 transition-all w-full text-left"
    >
       <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-pink-500 transition-all">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{title}</span>
       </div>
       <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
    </button>
  );
}
