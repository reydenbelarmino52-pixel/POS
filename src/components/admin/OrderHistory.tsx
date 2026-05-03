import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Receipt, Calendar, User, DollarSign, Download, Eye, XCircle, Package } from 'lucide-react';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';

interface Order {
  id: string;
  cashierName: string;
  total: number;
  paymentMethod: string;
  timestamp: string;
  started_at: string;
  tax: number;
  discount: number;
  items?: any[];
  amountReceived?: number;
  changeAmount?: number;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc'
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/sales/history');
      if (Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        console.error("Expected array from /sales/history, got:", res.data);
        setOrders([]);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (id: string) => {
    setFetchingDetail(true);
    try {
      const res = await api.get(`/sales/${id}`);
      setSelectedOrder(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch transaction details.");
    } finally {
      setFetchingDetail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSort = (key: keyof Order) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedOrders = useMemo(() => {
    return orders
      .filter(order => 
        order.cashierName.toLowerCase().includes(search.toLowerCase()) ||
        order.id.toString().includes(search)
      )
      .sort((a: any, b: any) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal! < bVal!) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal! > bVal!) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [orders, search, sortConfig]);

  const avgProcessingTime = useMemo(() => {
    const ordersWithTime = filteredAndSortedOrders.filter(o => o.started_at && o.timestamp);
    if (ordersWithTime.length === 0) return 0;
    
    const totalSeconds = ordersWithTime.reduce((acc, o) => {
      const start = new Date(o.started_at).getTime();
      const end = new Date(o.timestamp).getTime();
      const diff = (end - start) / 1000;
      return acc + (diff > 0 ? diff : 0);
    }, 0);
    
    return totalSeconds / ordersWithTime.length;
  }, [filteredAndSortedOrders]);

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-10 pb-12 print:hidden">
      {/* Header Actions */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-4">
        <div>
          <h2 className="text-5xl font-display font-bold text-slate-900 tracking-tighter uppercase">Order History</h2>
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Total Records: {orders.length}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-pink-50 rounded-full border border-pink-100">
               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Avg. Processing:</span>
               <span className="text-[10px] font-mono font-bold text-pink-700">{formatDuration(avgProcessingTime)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1 max-w-4xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-pink-500 transition-colors" />
            <input 
              type="text"
              placeholder="Query protocol hash or operator..."
              className="w-full pl-16 pr-8 py-5 backdrop-blur-md bg-white border border-pink-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:bg-white transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-300 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
             <button className="p-5 bg-white border border-pink-100 rounded-2xl hover:bg-pink-50 transition-all group active:scale-90 shadow-sm">
               <Filter className="w-5 h-5 text-slate-400 group-hover:text-pink-500" />
             </button>
             <div className="h-8 w-px bg-pink-100 mx-2 hidden md:block"></div>
             <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               className="flex items-center gap-3 px-8 py-5 bg-white text-slate-900 border border-pink-100 rounded-3xl font-bold text-[10px] uppercase tracking-widest hover:border-pink-500 transition-all shadow-sm"
             >
               <Download className="w-4 h-4 text-pink-500" />
               Export Records
             </motion.button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-pink-100/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-pink-500/5">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-pink-50/50 bg-[#FAF9F6]">
                <th 
                  className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-900 transition-colors group"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-2">
                    Order ID <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th 
                  className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-900 transition-colors group"
                  onClick={() => handleSort('cashierName')}
                >
                  <div className="flex items-center gap-2">
                    Cashier <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th 
                  className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-900 transition-colors group"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center gap-2">
                    Date & Time <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Payment</th>
                <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Proc. Time</th>
                <th 
                  className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-slate-900 transition-colors group"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Total Amount <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50/50 text-[13px]">
               {loading ? (
                <tr>
                   <td colSpan={6} className="px-10 py-32 text-center">
                     <div className="flex flex-col items-center gap-6">
                        <div className="w-10 h-10 border-4 border-pink-500/10 border-t-pink-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em] animate-pulse">Loading Records...</p>
                     </div>
                   </td>
                </tr>
              ) : filteredAndSortedOrders.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-10 py-32 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">
                     No matching orders
                   </td>
                </tr>
              ) : (
                filteredAndSortedOrders.map((order, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={order.id} 
                    className="hover:bg-pink-50/20 transition-all duration-300 group"
                  >
                    <td className="px-10 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-50 rounded-xl border border-pink-100 flex items-center justify-center shrink-0">
                          <Receipt className="w-4 h-4 text-pink-500" />
                        </div>
                        <span className="font-bold text-slate-900 tracking-widest font-mono uppercase">#{order.id}</span>
                      </div>
                    </td>
                    <td className="px-10 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-pink-100 flex items-center justify-center text-[9px] font-bold text-pink-500 uppercase">
                          {order.cashierName[0]}
                        </div>
                        <span className="font-bold text-slate-900 tracking-tight group-hover:text-pink-600 transition-colors uppercase">{order.cashierName}</span>
                      </div>
                    </td>
                    <td className="px-10 py-5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                          {new Date(order.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          {new Date(order.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-5 text-right">
                      <span className="px-3 py-1 bg-white border border-pink-100 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:border-pink-500/30 group-hover:text-pink-500 transition-all">
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="px-10 py-5 text-right font-mono text-[11px] font-bold text-slate-500">
                      {order.started_at ? formatDuration((new Date(order.timestamp).getTime() - new Date(order.started_at).getTime()) / 1000) : 'N/A'}
                    </td>
                    <td className="px-10 py-5 text-right font-bold text-slate-900 tracking-tight font-mono text-base group-hover:text-pink-600 transition-colors">
                      ${(Number(order.total) || 0).toFixed(2)}
                    </td>
                    <td className="px-10 py-5 text-right">
                      <button 
                        onClick={() => fetchOrderDetail(order.id)}
                        disabled={fetchingDetail}
                        className="p-3 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:p-0 print:static print:block">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setSelectedOrder(null)} 
               className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl print:hidden" 
            />
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.9 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: 50, opacity: 0, scale: 0.9 }} 
              className="relative w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl print:shadow-none print:rounded-none"
            >
              <div className="p-10 print:p-0">
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-pink-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Receipt className="w-8 h-8 relative z-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Sale Successful</h3>
                  <p className="text-[10px] text-pink-500 font-bold uppercase tracking-[0.2em] mt-2">Order ID: {selectedOrder.id}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{selectedOrder.timestamp ? new Date(selectedOrder.timestamp).toLocaleString() : 'N/A'}</p>
                </div>

                <div className="space-y-4 mb-10 max-h-[200px] overflow-auto scrollbar-hide">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-pink-50 p-3 rounded-xl gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex-shrink-0 overflow-hidden border border-pink-100 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-4 h-4 text-pink-200" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-xs font-bold text-slate-900 uppercase">{item.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.quantity} units x ${(Number(item.priceAtSale) || 0).toFixed(2)}</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono tracking-tighter">${((Number(item.priceAtSale) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t-4 border-double border-pink-100 pt-8 space-y-3 mb-10">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="font-mono text-slate-900">${((Number(selectedOrder.total) || 0) - (Number(selectedOrder.tax) || 0) + (Number(selectedOrder.discount) || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Tax (12%)</span>
                    <span className="font-mono text-slate-900">${(Number(selectedOrder.tax) || 0).toFixed(2)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-[10px] font-bold text-red-500 uppercase tracking-widest">
                        <span>Discount</span>
                        <span className="font-mono">-${(Number(selectedOrder.discount) || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-5 border-t border-pink-100">
                    <span className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em]">Total Amount</span>
                    <span className="text-2xl font-bold text-pink-600 font-mono tracking-tighter">${(Number(selectedOrder.total) || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-pink-50 border border-pink-100 p-5 rounded-2xl mb-10">
                  <p className="text-[10px] font-bold text-pink-500 uppercase tracking-[0.4em] text-center mb-4">Method: {selectedOrder.paymentMethod}</p>
                  <div className="space-y-2 border-t border-pink-200 pt-4">
                     <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Paid</span>
                        <span className="font-mono text-slate-900">${(Number(selectedOrder.amountReceived || selectedOrder.total) || 0).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Change</span>
                        <span className="font-mono text-slate-900">${(Number(selectedOrder.changeAmount) || 0).toFixed(2)}</span>
                     </div>
                  </div>
                </div>

                <div className="flex gap-4 print:hidden">
                  <button 
                    onClick={handlePrint}
                    className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                  >
                    <Receipt className="w-5 h-5 opacity-50" />
                    Print Receipt
                  </button>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="px-8 py-5 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-pink-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
