import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Store, Plus, ArrowRight, ShoppingBag, Edit2, Trash2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function SelectStore() {
  const { user, stores, setStore, logout, refreshStores, isLoading } = useAuth();
  const navigate = useNavigate();
  
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" />;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinStoreName, setJoinStoreName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    setLoading(true);
    try {
      await api.post('/auth/join-store', { storeName: joinStoreName, joinCode });
      setShowJoinModal(false);
      setJoinStoreName('');
      setJoinCode('');
      await refreshStores();
      alert('Join request sent! Please wait for admin approval.');
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Failed to join store');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditPin(s.shift_pin || '');
  };

  const saveEdit = async () => {
    if (!editingId || !editName) return;
    setLoading(true);
    try {
      await api.put(`/stores/${editingId}`, { name: editName, shift_pin: editPin });
      await refreshStores();
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update store');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch? This action cannot be undone.')) return;
    setLoading(true);
    try {
      await api.delete(`/stores/${id}`);
      await refreshStores();
    } catch (err) {
      console.error(err);
      alert('Failed to delete store');
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
        className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-10 md:p-14 z-10 border border-pink-100"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-pink-500/20">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Select Branch</h1>
          <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-[0.2em] mt-2">Manage and choose your location</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {stores.map((s) => (
              <motion.div
                layout
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative group lg:w-full"
              >
                {editingId === s.id ? (
                  <div className="p-6 bg-white border-2 border-pink-300 rounded-3xl shadow-xl space-y-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Branch Name</label>
                       <input 
                         autoFocus
                         className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-bold text-slate-900 uppercase tracking-tight text-sm outline-none focus:ring-2 focus:ring-pink-500/20"
                         value={editName}
                         onChange={(e) => setEditName(e.target.value)}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Shift Code</label>
                       <input 
                         className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-mono text-slate-900 tracking-widest text-sm outline-none focus:ring-2 focus:ring-pink-500/20"
                         value={editPin}
                         onChange={(e) => setEditPin(e.target.value)}
                         placeholder="1234"
                       />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={saveEdit} disabled={loading} className="px-4 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                        <Check className="w-4 h-4" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStore(s)}
                    className="w-full flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-pink-300 hover:shadow-xl hover:shadow-pink-500/10 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center group-hover:border-pink-200 group-hover:bg-pink-50 transition-colors">
                        <Store className="w-6 h-6 text-slate-400 group-hover:text-pink-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 uppercase tracking-tight">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Active Branch</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleEdit(s); }}
                         className="p-2 opacity-0 group-hover:opacity-100 hover:bg-pink-50 rounded-xl text-slate-400 hover:text-pink-500 transition-all"
                       >
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                         className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-500 transition-all"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                       <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-pink-500 transition-colors" />
                    </div>
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/create-store')}
            className="flex items-center justify-center gap-3 p-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl hover:border-pink-300 hover:bg-pink-50 transition-all group lg:min-h-[96px]"
          >
            <Plus className="w-5 h-5 text-slate-300 group-hover:text-pink-500" />
            <span className="font-semibold text-slate-400 group-hover:text-pink-500 uppercase tracking-widest text-[11px]">Add New Branch</span>
          </motion.button>
        </div>

        <div className="mt-8">
           <button 
             onClick={() => setShowJoinModal(true)}
             className="w-full flex items-center justify-center gap-3 p-8 bg-pink-50 border border-pink-100 rounded-3xl hover:bg-pink-100 transition-all group"
           >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-pink-500 shadow-sm transition-transform group-hover:scale-110">
                <Store className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Join an Existing Branch</p>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Enter branch name and join code</p>
              </div>
           </button>
        </div>

        <AnimatePresence>
          {showJoinModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowJoinModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-pink-100"
              >
                <button 
                  onClick={() => setShowJoinModal(false)}
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-2">Join Branch</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Request access to an existing location</p>
                </div>

                <form onSubmit={handleJoin} className="space-y-6">
                  {joinError && (
                    <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-red-100 italic">
                      {joinError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Branch Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Cathtea SM Mall"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold uppercase tracking-tight focus:ring-4 focus:ring-pink-500/10 outline-none transition-all"
                      value={joinStoreName}
                      onChange={(e) => setJoinStoreName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Join Code</label>
                    <input 
                      type="text"
                      required
                      placeholder="Enter 4-digit code"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono tracking-[0.4em] focus:ring-4 focus:ring-pink-500/10 outline-none transition-all"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-pink-500 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-pink-500/20 hover:bg-pink-600 transition-all disabled:opacity-50 mt-4"
                  >
                    {loading ? 'Sending Request...' : 'Send Access Request'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
