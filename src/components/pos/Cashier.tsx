import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, User, Receipt, XCircle, ShoppingCart, Package, ArrowRight } from 'lucide-react';
import { usePOS, Product } from '../../hooks/usePOS';
import api from '../../lib/api';
import socket from '../../lib/socket';
import { motion, AnimatePresence } from 'motion/react';

export default function Cashier() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [amountReceived, setAmountReceived] = useState<string>('');

  const { 
    cart, addToCart, removeFromCart, updateQuantity, 
    clearCart, subtotal, tax, total, discount 
  } = usePOS();

  const changeAmount = useMemo(() => {
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - total);
  }, [amountReceived, total]);

  const isAmountSufficient = useMemo(() => {
    if (paymentMethod === 'card') return true;
    const received = parseFloat(amountReceived);
    return !isNaN(received) && received >= total;
  }, [paymentMethod, amountReceived, total]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCurrentShift();

    socket.on('inventory_update', (data) => {
        setProducts(prev => prev.map(p => p.id === data.id ? { ...p, stock: data.stock } : p));
    });

    return () => { socket.off('inventory_update'); };
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCurrentShift = async () => {
    const res = await api.get('/shifts/current');
    setCurrentShift(res.data);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Only show saleable products in POS
      if (p.type && p.type !== 'product') return false;
      
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           (p.categoryName || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === null || p.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const [receipt, setReceipt] = useState<any>(null);

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const handleCheckout = async () => {
    if (!currentShift) {
        alert("You must open a shift before making sales.");
        return;
    }
    setIsProcessing(true);
    try {
      const res = await api.post('/sales', {
        items: cart.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        total,
        discount,
        tax,
        payment_method: paymentMethod,
        shift_id: currentShift.id,
        amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived) || total : total,
        change_amount: paymentMethod === 'cash' ? changeAmount : 0
      });
      
      setReceipt({
        id: res.data.id,
        items: [...cart],
        total,
        subtotal,
        tax,
        discount,
        paymentMethod,
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountReceived) || total : total,
        changeAmount: paymentMethod === 'cash' ? changeAmount : 0,
        timestamp: new Date().toISOString()
      });
      
      clearCart();
      setAmountReceived('');
      setPaymentModal(false);
    } catch (err) {
      console.error(err);
      alert("Checkout failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentShift) {
      return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-gray-300">
              <Clock className="w-16 h-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-bold text-gray-800">Shift Required</h2>
              <p className="text-gray-500 mb-6">Please open a shift in Shift Management before accessing the POS.</p>
              <button 
                onClick={() => window.location.href = '/shifts'} 
                className="px-6 py-2 bg-black text-white rounded-lg font-medium"
              >
                Go to Shift Management
              </button>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 min-h-0 print:hidden relative">
      {/* Product list */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isMobileCartOpen ? 'hidden lg:flex' : 'flex'}`}>
        <div className="relative mb-4 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search Menu Items or Scan..."
            className="w-full pl-14 pr-6 py-5 backdrop-blur-md bg-white border border-pink-100 rounded-[2rem] focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:bg-white transition-all text-sm font-semibold placeholder:text-slate-300 shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide mb-2">
          <button 
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border
              ${selectedCategory === null 
                ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-200 shadow-pink-500/20' 
                : 'bg-white text-slate-400 border-pink-100 hover:border-pink-300 hover:bg-pink-50/50'}`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border
                ${selectedCategory === cat.id
                  ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-500/20' 
                  : 'bg-white text-slate-400 border-pink-100 hover:border-pink-300 hover:bg-pink-50/50'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto pr-2 scrollbar-hide">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] animate-pulse">Loading Menu...</p>
             </div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 pb-8"
            >
              {filteredProducts.map((p) => (
                <motion.button
                  variants={{
                    hidden: { opacity: 0, scale: 0.95, y: 10 },
                    visible: { opacity: 1, scale: 1, y: 0 }
                  }}
                  key={p.id}
                  disabled={p.stock <= 0}
                  onClick={() => addToCart(p)}
                  className={`group relative flex flex-col bg-white p-4 rounded-[2rem] border border-pink-50 transition-all duration-300 text-left overflow-hidden shadow-sm
                    ${p.stock <= 0 ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-400/5 hover:border-pink-200'}`}
                >
                  <div className="aspect-square bg-[#FAF9F6] rounded-3xl mb-5 flex items-center justify-center overflow-hidden relative group-hover:scale-[1.05] transition-all duration-700 border border-black/5 shadow-inner">
                    {p.imageUrl ? (
                        <div className="w-full h-full relative">
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                    ) : (
                        <Package className="w-10 h-10 text-slate-200 group-hover:text-pink-500 transition-all duration-500 transform group-hover:rotate-12" />
                    )}
                  </div>
                  
                  <div className="px-1">
                    <h3 className="text-[13px] font-bold text-slate-900 truncate mb-0.5 tracking-tight group-hover:text-pink-600 transition-colors uppercase">{p.name}</h3>
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mb-4">{p.categoryName || 'Generic'}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-slate-900 tracking-tight font-mono">${(Number(p.price) || 0).toFixed(2)}</span>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border
                        ${p.stock > 5 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {p.stock}
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Cart sidebar */}
      <div className={`
        fixed inset-0 z-40 lg:relative lg:inset-auto lg:flex
        w-full lg:w-[450px] flex-col backdrop-blur-3xl bg-white border border-pink-100 lg:rounded-[4rem] shadow-2xl overflow-hidden shrink-0 group/sidebar shadow-pink-100
        transition-transform duration-500 ease-in-out
        ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        <div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
        <div className="p-8 border-b border-pink-50/50 shrink-0 flex items-center justify-between relative z-10">
          <div>
             <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tighter uppercase">Current Order</h2>
             <div className="flex items-center gap-2 mt-1">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
               <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Order Connected</span>
             </div>
          </div>
          <button 
            onClick={clearCart} 
            className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-pink-50 hover:border-rose-100 active:scale-95 shadow-sm"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4 scrollbar-hide relative z-10">
          {cart.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-center p-10">
                <div className="w-20 h-20 bg-pink-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-pink-100 shadow-inner group-hover/sidebar:scale-110 transition-transform duration-700">
                  <ShoppingCart className="w-8 h-8 text-pink-200 group-hover/sidebar:text-pink-500 transition-colors" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">No items in cart</p>
                <p className="text-[10px] text-slate-300 mt-3 leading-relaxed">Add items from the menu to start an order.</p>
             </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {cart.map(item => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  key={item.id} 
                  className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-pink-50/50 group relative overflow-hidden backdrop-blur-md hover:bg-pink-50/50 transition-all duration-300 shadow-sm"
                >
                  <div className="w-14 h-14 bg-pink-50 rounded-2xl flex-shrink-0 relative overflow-hidden flex items-center justify-center border border-pink-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-pink-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{item.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono tracking-tighter mt-0.5">${(Number(item.price) || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center bg-white/50 rounded-xl border border-pink-100 p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 px-2 hover:bg-pink-50 text-slate-400 hover:text-pink-500 rounded-lg transition-colors"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-bold w-7 text-center text-slate-700 font-mono">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 px-2 hover:bg-pink-50 text-slate-400 hover:text-pink-500 rounded-lg transition-colors"><Plus className="w-3 h-3" /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-6 lg:p-10 backdrop-blur-3xl bg-pink-50 border-t border-pink-100 shrink-0 space-y-6 lg:space-y-8 relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.02)]">
          <div className="space-y-3 lg:space-y-4">
            <div className="flex justify-between text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              <span>Subtotal</span>
              <span className="text-slate-600 font-mono tracking-widest">${(Number(subtotal) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              <span>Tax (12%)</span>
              <span className="text-slate-600 font-mono tracking-widest">${(Number(tax) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 lg:pt-8 border-t border-pink-100">
              <span className="text-base lg:text-lg font-bold text-slate-900 tracking-tight uppercase">Total Amount</span>
              <div className="text-right">
                <span className="text-3xl lg:text-4xl font-bold text-pink-600 tracking-widest font-mono">${(Number(total) || 0).toFixed(2)}</span>
                <p className="text-[8px] lg:text-[9px] text-pink-500 font-bold uppercase tracking-widest mt-1">Order Summary</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => setIsMobileCartOpen(false)}
               className="lg:hidden flex-1 py-4 bg-white border border-pink-100 text-slate-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-pink-50 transition-all active:scale-95"
             >
               Keep Adding
             </button>
             <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               disabled={cart.length === 0}
               onClick={() => setPaymentModal(true)}
               className="flex-[2] lg:flex-none lg:w-full py-4 lg:py-6 bg-pink-600 text-white rounded-[1.5rem] lg:rounded-[2rem] font-bold text-[10px] lg:text-sm uppercase tracking-[0.2em] lg:tracking-[0.3em] hover:bg-pink-500 disabled:bg-slate-50 disabled:text-slate-300 transition-all shadow-2xl shadow-pink-200 active:translate-y-1 flex items-center justify-center gap-3 lg:gap-4 relative overflow-hidden"
             >
               <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none"></div>
               Pay Now
               <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 group-hover:translate-x-1 transition-transform" />
             </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className={`
        lg:hidden fixed bottom-0 left-0 right-0 z-30 p-4 transition-transform duration-300
        ${isMobileCartOpen ? 'translate-y-full' : 'translate-y-0'}
      `}>
        <button 
           onClick={() => setIsMobileCartOpen(true)}
           className="w-full bg-slate-900 text-white p-5 rounded-3xl shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-xl"
        >
          <div className="flex items-center gap-4">
             <div className="p-2 bg-pink-500 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
             </div>
             <div className="text-left">
                <p className="text-[10px] font-bold uppercase text-pink-500 tracking-widest">Active Cart</p>
                <p className="text-sm font-bold tracking-tight">{cart.length} Items</p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-xl font-bold font-mono tracking-tighter">${(Number(total) || 0).toFixed(2)}</p>
             <p className="text-[8px] font-bold opacity-50 uppercase tracking-widest">Tap to Review</p>
          </div>
        </button>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               onClick={() => setPaymentModal(false)}
               className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] lg:rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="p-6 lg:p-10">
                <div className="flex items-center justify-between mb-6 lg:mb-10">
                  <h3 className="text-lg lg:text-xl font-bold text-slate-900 uppercase tracking-tight">Payment</h3>
                  <button onClick={() => setPaymentModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all">
                     <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="bg-slate-900 p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] mb-6 lg:mb-10 flex flex-col items-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-[40px] pointer-events-none"></div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-2 lg:mb-3">Amount Due</p>
                  <p className="text-3xl lg:text-5xl font-bold text-white tracking-widest font-mono">
                    <span className="text-pink-400 text-2xl lg:text-3xl mr-1">$</span>
                    {(Number(total) || 0).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-4 lg:space-y-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-4 lg:gap-5">
                    <button 
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col items-center gap-3 lg:gap-4 p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border-2 transition-all duration-300
                        ${paymentMethod === 'cash' ? 'border-pink-600 bg-pink-50 shadow-xl shadow-pink-500/10' : 'border-slate-100 hover:border-slate-200'}
                      `}
                    >
                      <div className={`p-2 lg:p-3 rounded-xl ${paymentMethod === 'cash' ? 'bg-pink-600/10 text-pink-600' : 'bg-slate-50 text-slate-400'}`}>
                        <Banknote className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <span className="font-bold text-[9px] lg:text-[10px] uppercase tracking-widest text-slate-900">Liquid Cash</span>
                    </button>
                    <button 
                      onClick={() => setPaymentMethod('card')}
                      className={`flex flex-col items-center gap-3 lg:gap-4 p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border-2 transition-all duration-300
                        ${paymentMethod === 'card' ? 'border-pink-600 bg-pink-50 shadow-xl shadow-pink-500/10' : 'border-slate-100 hover:border-slate-200'}
                      `}
                    >
                      <div className={`p-2 lg:p-3 rounded-xl ${paymentMethod === 'card' ? 'bg-pink-600/10 text-pink-600' : 'bg-slate-50 text-slate-400'}`}>
                        <CreditCard className="w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <span className="font-bold text-[9px] lg:text-[10px] uppercase tracking-widest text-slate-900">Encrypted Card</span>
                    </button>
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="mt-8 space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Cash Intake</p>
                    <div className="relative group/input">
                      <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-pink-500 transition-colors">
                        <span className="font-mono text-lg transition-all">$</span>
                      </div>
                      <input 
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        className="w-full pl-12 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-pink-500 focus:bg-white transition-all text-xl font-bold font-mono tracking-widest"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-between items-center px-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Change</span>
                       <span className="text-xl font-bold text-pink-600 font-mono tracking-tighter">${(Number(changeAmount) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="mt-8 lg:mt-12 space-y-3 lg:space-y-4">
                  {paymentMethod === 'cash' && parseFloat(amountReceived) > 0 && !isAmountSufficient && (
                    <div className="flex items-center justify-center gap-2 py-1">
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.2em]">
                        Insufficient Amount
                      </p>
                    </div>
                  )}
                  <motion.button 
                    whileHover={isProcessing || !isAmountSufficient ? {} : { scale: 1.02 }}
                    whileTap={isProcessing || !isAmountSufficient ? {} : { scale: 0.98 }}
                    onClick={handleCheckout}
                    disabled={isProcessing || !isAmountSufficient}
                    className="w-full py-5 lg:py-6 bg-slate-900 text-white rounded-[1.5rem] lg:rounded-[2rem] font-bold uppercase tracking-[0.2em] text-xs lg:text-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-2xl relative overflow-hidden disabled:opacity-50 disabled:grayscale"
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        Complete Sale
                      </>
                    )}
                  </motion.button>
                  <button 
                    onClick={() => setPaymentModal(false)}
                    className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {receipt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setReceipt(null)} 
               className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl print:hidden" 
            />
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.9 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: 50, opacity: 0, scale: 0.9 }} 
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden shadow-2xl print:shadow-none print:rounded-none print:static print:block py-6 lg:py-10 print:py-0"
            >
              <div className="p-6 lg:p-10 print:p-0">
                <div className="text-center mb-6 lg:mb-10">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 bg-pink-600 text-white rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-4 lg:mb-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Receipt className="w-6 h-6 lg:w-8 lg:h-8 relative z-10" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-slate-900 uppercase tracking-tighter">Sale Successful</h3>
                  <p className="text-[9px] lg:text-[10px] text-pink-500 font-bold uppercase tracking-[0.2em] mt-1 lg:mt-2">Order ID: {receipt.id}</p>
                  <p className="text-[8px] lg:text-[9px] text-slate-400 font-bold mt-1 lg:mt-2 uppercase tracking-widest">{new Date(receipt.timestamp).toLocaleString()}</p>
                </div>

                <div className="space-y-4 mb-10 max-h-[200px] overflow-auto scrollbar-hide">
                  {receipt.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-pink-50 p-3 rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 uppercase">{item.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.quantity} units x ${(Number(item.price) || 0).toFixed(2)}</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono tracking-tighter">${((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t-4 border-double border-pink-100 pt-6 lg:pt-8 space-y-2 lg:space-y-3 mb-6 lg:mb-10">
                  <div className="flex justify-between text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="font-mono text-slate-900">${(Number(receipt.subtotal) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Tax (12%)</span>
                    <span className="font-mono text-slate-900">${(Number(receipt.tax) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-4 lg:pt-5 border-t border-pink-100">
                    <span className="text-xs lg:text-sm font-bold text-slate-900 uppercase tracking-[0.2em]">Total Amount</span>
                    <span className="text-xl lg:text-2xl font-bold text-pink-600 font-mono tracking-tighter">${(Number(receipt.total) || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-10 p-5 bg-slate-900 rounded-2xl">
                   <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Total Received</span>
                      <span className="font-mono text-white">${(Number(receipt.amountReceived) || 0).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-[10px] font-bold text-pink-500 uppercase tracking-widest pt-2 border-t border-white/10">
                      <span>Change</span>
                      <span className="font-mono text-pink-400">${(Number(receipt.changeAmount) || 0).toFixed(2)}</span>
                   </div>
                </div>

                <div className="bg-pink-50 border border-pink-100 p-5 rounded-2xl text-center mb-10">
                  <p className="text-[10px] font-bold text-pink-400 uppercase tracking-[0.4em]">Method: {receipt.paymentMethod}</p>
                </div>

                <div className="flex gap-3 lg:gap-4 print:hidden">
                  <button 
                    onClick={handlePrint}
                    className="flex-1 py-4 lg:py-5 bg-slate-900 text-white rounded-xl lg:rounded-[1.5rem] font-bold uppercase tracking-widest text-[10px] lg:text-xs flex items-center justify-center gap-2 lg:gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                  >
                    <Receipt className="w-4 h-4 lg:w-5 lg:h-5 opacity-50" />
                    Print Receipt
                  </button>
                  <button 
                    onClick={() => setReceipt(null)}
                    className="px-6 lg:px-8 py-4 lg:py-5 text-slate-400 font-bold uppercase tracking-widest text-[9px] lg:text-[10px] hover:text-slate-900 transition-colors"
                  >
                    Done
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


const Clock = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
