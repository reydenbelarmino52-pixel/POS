import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Shield, 
  UserPlus,
  ArrowRight,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

export default function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');
  const { currentStore } = useAuth();

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/staff');
      setStaff(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [currentStore]);

  const approveStaff = async (id: string) => {
    try {
      await api.post(`/admin/staff/${id}/approve`);
      fetchStaff();
    } catch (err) {
      console.error(err);
      alert('Failed to approve staff');
    }
  };

  const rejectStaff = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff access?')) return;
    try {
      await api.post(`/admin/staff/${id}/reject`);
      fetchStaff();
    } catch (err) {
      console.error(err);
      alert('Failed to reject staff');
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = staff.filter(s => s.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-200">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tighter uppercase">Staff & Permissions</h1>
          </div>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Manage your team and approve access requests</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Store</p>
              <p className="text-xs font-bold text-slate-900 uppercase">{currentStore?.name}</p>
            </div>
            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600 font-bold uppercase border border-pink-100">
               {currentStore?.name?.[0]}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Users className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">Total Staff</p>
          <p className="text-5xl font-bold text-slate-900 tracking-tighter mb-2">{staff.length}</p>
          <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
            <ArrowRight className="w-3 h-3" /> Combined Team Size
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Clock className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">Pending Requests</p>
          <p className={`text-5xl font-bold tracking-tighter mb-2 ${pendingCount > 0 ? 'text-pink-600' : 'text-slate-900'}`}>
            {pendingCount}
          </p>
          <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${pendingCount > 0 ? 'text-pink-400' : 'text-slate-400'}`}>
            {pendingCount > 0 ? 'Waitlist for approval' : 'Team fully approved'}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <Shield className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">System Roles</p>
          <p className="text-5xl font-bold text-slate-900 tracking-tighter mb-2">2</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin & Cashier Tier</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white/50 backdrop-blur-xl border border-white p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4 shadow-xl shadow-pink-500/5">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-pink-500/10 transition-all placeholder:text-slate-300"
          />
        </div>
        
        <div className="flex bg-white/80 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
          {(['all', 'pending', 'active'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all
                ${filter === t 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                  : 'text-slate-400 hover:text-slate-900'
                }
              `}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/30 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Member Profile</th>
              <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Tier</th>
              <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Onboarded</th>
              <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Status</th>
              <th className="px-10 py-6 text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <AnimatePresence mode="popLayout">
              {filteredStaff.map((s, idx) => (
                <motion.tr 
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:bg-slate-50/50 transition-all"
                >
                  <td className="px-10 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center font-bold text-pink-600 uppercase border border-pink-100 group-hover:scale-105 transition-transform">
                        {s.username[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 tracking-tight uppercase">{s.username}</p>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Mail className="w-3 h-3" />
                          <span className="text-[10px] font-medium lowercase truncate max-w-[150px]">{s.email || 'no-email@pos.com'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-5">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border
                      ${s.role === 'admin' 
                        ? 'bg-slate-900 text-white border-slate-900' 
                        : 'bg-white text-slate-600 border-slate-200'
                      }
                    `}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-10 py-5">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 opacity-50" />
                      <span className="text-[11px] font-bold font-mono uppercase tracking-tighter">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-5">
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[9px] font-extrabold uppercase tracking-widest border
                      ${s.status === 'active'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                      }
                    `}>
                      <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                      {s.status}
                    </div>
                  </td>
                  <td className="px-10 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {s.status === 'pending' ? (
                        <>
                          <button 
                            onClick={() => approveStaff(s.id)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                          <button 
                            onClick={() => rejectStaff(s.id)}
                            className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => rejectStaff(s.id)}
                          className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button className="p-2.5 text-slate-300 hover:text-slate-600 transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filteredStaff.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <div className="inline-flex flex-col items-center">
                    <Users className="w-16 h-16 text-slate-100 mb-6" />
                    <p className="text-xl font-bold text-slate-900 tracking-tight uppercase mb-2">No Matching Staff</p>
                    <p className="text-sm text-slate-400 uppercase tracking-widest font-bold">Try adjusting your filters or search term</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
