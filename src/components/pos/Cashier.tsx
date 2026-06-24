import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, User, Receipt, XCircle, ShoppingCart, Package, ArrowRight, Clock, Unlock, Lock, PhilippinePeso, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePOS, Product, isDrinkProduct } from '../../hooks/usePOS';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { exportReceiptPDF } from '../../utils/receiptGenerator';

export default function Cashier() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMethod] = useState<'cash'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [amountReceived, setAmountReceived] = useState<string>('');
  
  // Customization State
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedSugar, setSelectedSugar] = useState<number>(100);
  const [selectedIce, setSelectedIce] = useState<string>('Normal');
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('Regular');
  const [justAddedFeedback, setJustAddedFeedback] = useState<string | null>(null);

  const { 
    cart, addToCart, removeFromCart, updateQuantity, 
    clearCart, subtotal, tax, total, scDiscount, vatExemptSales,
    isSeniorCitizen, setIsSeniorCitizen 
  } = usePOS();

  const addonsList = useMemo(() => {
    return products.filter(p => 
      (p.categoryName?.toLowerCase().includes('addon') || 
       p.categoryName?.toLowerCase().includes('topping') ||
       p.categoryName?.toLowerCase().includes('extra'))
    ).map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0
    }));
  }, [products]);

  const toggleAddon = (addon: any) => {
    setSelectedAddons(prev => 
      prev.find(a => a.name === addon.name) 
        ? prev.filter(a => a.name !== addon.name) 
        : [...prev, addon]
    );
  };

  const changeAmount = useMemo(() => {
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - total);
  }, [amountReceived, total]);

  const isAmountSufficient = useMemo(() => {
    const received = parseFloat(amountReceived);
    return !isNaN(received) && received >= total;
  }, [amountReceived, total]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCurrentShift();

    // Subscribe to all changes in the products table
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          const updatedProduct = payload.new as Product;
          setProducts(prev => prev.map(p => p.id === updatedProduct.id ? { ...p, stock: updatedProduct.stock } : p));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const [openingBalance, setOpeningBalance] = useState('');
  const [shiftCode, setShiftCode] = useState('');
  const [shiftOpenError, setShiftOpenError] = useState('');

  const fetchCurrentShift = async () => {
    try {
      const res = await api.get('/shifts/current');
      if (res.data) {
        setCurrentShift(res.data);
      } else {
        setCurrentShift(null);
      }
    } catch (err) {
      console.error('Failed to fetch shift status', err);
      setCurrentShift(null);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setShiftOpenError('');
    const balanceVal = parseFloat(openingBalance);
    if (isNaN(balanceVal) || balanceVal < 0) {
      setShiftOpenError('Opening balance must be 0 or greater');
      return;
    }
    if (!shiftCode.trim()) {
      setShiftOpenError('Store pin is required');
      return;
    }

    try {
      const res = await api.post('/shifts/open', { 
        opening_balance: balanceVal,
        shift_code: shiftCode
      });
      // Set to active state with all the required properties matching database fields
      setCurrentShift({ id: res.data.id, status: 'open', opening_balance: balanceVal });
      setOpeningBalance('');
      setShiftCode('');
    } catch (err: any) {
      setShiftOpenError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to open shift');
    }
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
  const [orderStartTime, setOrderStartTime] = useState<string | null>(null);

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Set order start time when first item is added
  useEffect(() => {
    if (cart.length > 0 && !orderStartTime) {
      setOrderStartTime(new Date().toISOString());
    } else if (cart.length === 0 && orderStartTime) {
      setOrderStartTime(null);
    }
  }, [cart.length, orderStartTime]);

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
          price: item.price,
          sugarLevel: item.sugarLevel,
          iceLevel: item.iceLevel,
          size: item.selectedSize,
          addons: item.addons
        })),
        total,
        discount: scDiscount,
        tax,
        payment_method: paymentMethod,
        shift_id: currentShift.id,
        amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived) || total : total,
        change_amount: paymentMethod === 'cash' ? changeAmount : 0,
        started_at: orderStartTime
      });
      
      let cashierName = 'SYSTEMADMIN';
      try {
        const storedUser = localStorage.getItem('pos_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          cashierName = parsed.username || parsed.name || 'SYSTEMADMIN';
        }
      } catch (e) {
        console.error(e);
      }

      setReceipt({
        id: res.data.id,
        items: [...cart],
        total,
        subtotal,
        tax,
        vatExemptSales,
        scDiscount,
        isSeniorCitizen,
        paymentMethod,
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountReceived) || total : total,
        changeAmount: paymentMethod === 'cash' ? changeAmount : 0,
        timestamp: new Date().toISOString(),
        started_at: orderStartTime,
        cashierName
      });
      
      clearCart();
      setAmountReceived('');
      setPaymentModal(false);
      setOrderStartTime(null);
    } catch (err) {
      console.error(err);
      alert("Checkout failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToCartClick = async (p: Product) => {
    setCustomizingProduct(p);
    setSelectedSugar(100);
    setSelectedIce('Normal');
    setSelectedAddons([]);
    setSelectedSize('Regular');
    setProductVariants([]);
    setJustAddedFeedback(null);

    try {
      const res = await api.get(`/products/${p.id}/variants`);
      setProductVariants(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmAddToCart = (keepOpen: boolean = false) => {
    if (customizingProduct) {
      const variant = productVariants.find(v => v.name === selectedSize);
      const finalPrice = variant ? Number(variant.price) : Number(customizingProduct.price);
      addToCart(customizingProduct, selectedSugar, selectedIce, selectedAddons, selectedSize, finalPrice);
      
      if (keepOpen) {
        setJustAddedFeedback(`Added ${selectedSize}!`);
        setTimeout(() => {
          setJustAddedFeedback(null);
        }, 1500);
      } else {
        setCustomizingProduct(null);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentShift) {
      return (
        <div className="max-w-md mx-auto my-12">
          <div className="bg-white rounded-[3rem] p-12 border border-pink-100/50 shadow-2xl flex flex-col items-center text-center shadow-pink-500/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500"></div>
            <div className="w-20 h-20 bg-pink-50 text-pink-600 rounded-[1.8rem] flex items-center justify-center mb-6 border border-pink-100 shadow-inner group transition-transform hover:scale-110">
              <Unlock className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-display font-bold text-slate-900 mb-2 tracking-tighter uppercase">Open Session</h2>
            <p className="text-slate-900 mb-8 max-w-xs text-xs font-bold leading-relaxed">Enter your opening cash register balance and Store Pin below to activate this POS terminal.</p>
            
            <form onSubmit={handleOpenShift} className="w-full space-y-6 text-left">
              {shiftOpenError && (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-[10px] font-bold flex items-center gap-3 border border-rose-100 uppercase tracking-widest shadow-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {shiftOpenError}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Store Pin</label>
                  {shiftCode && (shiftCode.length < 4 || shiftCode.length > 8) && (
                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">4-8 digits required</span>
                  )}
                </div>
                <div className="relative group">
                  <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${
                    shiftCode && (shiftCode.length < 4 || shiftCode.length > 8) 
                      ? 'text-rose-500' 
                      : shiftCode.length >= 4 
                        ? 'text-emerald-500' 
                        : 'text-slate-300 group-focus-within:text-pink-500'
                  }`} />
                  <input 
                    type="password"
                    placeholder="Enter Store Pin"
                    className={`w-full pl-14 pr-6 py-4 bg-[#FAF9F6] border rounded-2xl focus:outline-none focus:ring-4 transition-all shadow-inner tracking-widest text-[#2D3142] font-bold ${
                      shiftCode && (shiftCode.length < 4 || shiftCode.length > 8)
                        ? 'border-rose-200 focus:ring-rose-500/5 focus:bg-white text-rose-600'
                        : shiftCode.length >= 4
                          ? 'border-emerald-200 focus:ring-emerald-500/5 focus:bg-white text-emerald-600'
                          : 'border-slate-100 focus:ring-pink-500/5 focus:bg-white text-slate-900'
                    }`}
                    value={shiftCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 12) setShiftCode(val);
                    }}
                  />
                </div>
                <div className="flex gap-1 mt-1.5 px-1">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i}
                      className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                        i < shiftCode.length 
                          ? (shiftCode.length < 4 || shiftCode.length > 8 ? 'bg-rose-400' : 'bg-emerald-400')
                          : 'bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest px-2">Opening Cash Balance (₱)</label>
                <div className="relative group">
                  <PhilippinePeso className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-pink-500 transition-colors" />
                  <input 
                    type="number"
                    placeholder="0.00"
                    required
                    className="w-full pl-14 pr-6 py-4 bg-[#FAF9F6] border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-500/5 text-slate-900 font-mono text-xl focus:bg-white transition-all shadow-inner"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                  />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={!openingBalance || !shiftCode || shiftCode.length < 4 || shiftCode.length > 8}
                className="w-full py-4 bg-pink-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-pink-200 hover:bg-pink-500 transition-all disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
              >
                Activate POS Session
              </motion.button>
            </form>
          </div>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 min-h-0 relative">
      {/* Product list */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden print:hidden ${isMobileCartOpen ? 'hidden lg:flex' : 'flex'}`}>
        <div className="relative mb-4 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search Menu Items or Scan..."
            className="w-full pl-14 pr-6 py-5 backdrop-blur-md bg-white border border-slate-200 rounded-[2rem] focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:bg-white transition-all text-sm font-semibold placeholder:text-slate-500 shadow-md shadow-slate-100/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide mb-2">
          <button 
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border
              ${selectedCategory === null 
                ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-200 shadow-pink-500/20' 
                : 'bg-white text-slate-900 border-slate-200 hover:border-pink-300 hover:bg-pink-50/50 shadow-sm'}`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border
                ${selectedCategory === cat.id
                  ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-500/20' 
                  : 'bg-white text-slate-900 border-slate-200 hover:border-pink-300 hover:bg-pink-50/50 shadow-sm'}`}
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
                <p className="text-[10px] font-black text-slate-950 uppercase tracking-[0.3em] animate-pulse">Loading Menu...</p>
             </div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6 pb-8"
            >
              {filteredProducts.map((p) => {
                const stockVal = p.stock ?? 0;
                const isOutOfStock = stockVal <= 0;
                const isCriticalStock = stockVal > 0 && stockVal <= 5;
                const isLowStock = stockVal > 5 && stockVal <= (p.low_stock_threshold || 10);

                return (
                  <motion.button
                    variants={{
                      hidden: { opacity: 0, scale: 0.95, y: 10 },
                      visible: { opacity: 1, scale: 1, y: 0 }
                    }}
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCartClick(p)}
                    className={`group relative flex flex-col bg-white p-4 rounded-[2rem] border border-slate-200/80 transition-all duration-300 text-left overflow-hidden shadow-md shadow-slate-100/50
                      ${isOutOfStock ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-400/5 hover:border-pink-300'}`}
                  >
                    <div className="aspect-square bg-[#FAF9F6] rounded-3xl mb-5 flex items-center justify-center overflow-hidden relative group-hover:scale-[1.03] transition-all duration-750 border border-black/5 shadow-inner">
                      {p.imageUrl ? (
                          <div className="w-full h-full relative">
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          </div>
                      ) : (
                          <Package className="w-10 h-10 text-slate-200 group-hover:text-pink-500 transition-all duration-500 transform group-hover:rotate-12" />
                      )}
                      
                      {isOutOfStock && (
                        <div className="absolute top-3 right-3 bg-slate-900/90 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-md shadow-md border border-white/10">OUT OF STOCK</div>
                      )}
                      {isCriticalStock && (
                        <div className="absolute top-3 right-3 bg-rose-600/95 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-md shadow-md border border-white/10 animate-pulse">CRITICAL: {stockVal} LEFT</div>
                      )}
                      {isLowStock && (
                        <div className="absolute top-3 right-3 bg-amber-500/95 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-md shadow-md border border-white/10">LOW STOCK</div>
                      )}
                    </div>
                    
                    <div className="px-1 w-full flex-1 flex flex-col">
                      <h3 className="text-[13px] font-bold text-slate-900 truncate mb-0.5 tracking-tight group-hover:text-pink-600 transition-colors uppercase font-sans">{p.name}</h3>
                      <p className="micro-label !text-[8px] mb-4 opacity-50">{p.categoryName || 'Generic'}</p>
                      
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
                        <span className="text-base font-bold text-slate-900 tracking-tighter font-mono">₱{(Number(p.price) || 0).toFixed(2)}</span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            isOutOfStock 
                              ? 'bg-slate-400' 
                              : isCriticalStock 
                                ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]' 
                                : isLowStock 
                                  ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                                  : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          }`}></div>
                          <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest">{stockVal} AV</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Cart sidebar */}
      <div className={`
        fixed inset-0 z-40 lg:relative lg:inset-auto lg:flex
        w-full lg:w-[380px] xl:w-[440px] flex-col backdrop-blur-3xl bg-white border border-pink-100 lg:rounded-[4rem] shadow-2xl overflow-hidden shrink-0 group/sidebar shadow-pink-100 print:hidden
        transition-transform duration-500 ease-in-out
        ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        <div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
        <div className="p-8 border-b border-pink-50/50 shrink-0 flex items-center justify-between relative z-10">
          <div>
             <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tighter uppercase">Current Order</h2>
             <div className="flex items-center gap-2 mt-1">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Order Connected</span>
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
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">No items in cart</p>
                <p className="text-[10px] text-slate-800 font-bold mt-3 leading-relaxed">Add items from the menu to start an order.</p>
             </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {cart.map(item => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  key={`${item.id}-${item.sugarLevel || ''}-${item.iceLevel || ''}-${item.selectedSize || ''}-${(item.addons || []).map(a => a.name).join(',')}`} 
                  className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-pink-50/50 group relative overflow-hidden backdrop-blur-md hover:bg-pink-50/50 transition-all duration-300 shadow-sm"
                >
                  <div className="w-14 h-14 bg-pink-50 rounded-2xl flex-shrink-0 relative overflow-hidden flex items-center justify-center border border-pink-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Package className="w-5 h-5 text-pink-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{item.name}</p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-950 font-bold font-mono tracking-tighter">₱{(Number(item.price) || 0).toFixed(2)}</p>
                        {item.selectedSize && (
                           <span className="text-[8px] font-bold text-pink-600 uppercase">Size: {item.selectedSize}</span>
                        )}
                        {item.sugarLevel !== undefined && (
                          <span className="text-[8px] font-black text-slate-950 uppercase">{item.sugarLevel}% Sug</span>
                        )}
                        {item.iceLevel && (
                          <span className="text-[8px] font-black text-slate-950 uppercase">{item.iceLevel} Ice</span>
                        )}
                      </div>
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-[8px] font-bold text-pink-500 uppercase truncate">
                          + {item.addons.map((a: any) => a.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white/50 rounded-xl border border-pink-100 p-1">
                      <button onClick={() => updateQuantity(item.id, -1, item.sugarLevel, item.iceLevel, item.addons, item.selectedSize)} className="p-1 px-2 hover:bg-pink-50 text-slate-950 font-extrabold hover:text-pink-500 rounded-lg transition-colors"><Minus className="w-3 h-3" /></button>
                      <span className="text-xs font-bold w-5 text-center text-slate-700 font-mono">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1, item.sugarLevel, item.iceLevel, item.addons, item.selectedSize)} className="p-1 px-2 hover:bg-pink-50 text-slate-950 font-extrabold hover:text-pink-500 rounded-lg transition-colors"><Plus className="w-3 h-3" /></button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id, item.sugarLevel, item.iceLevel, item.addons, item.selectedSize)}
                      className="p-1.5 hover:bg-rose-50 text-slate-800 font-bold hover:text-rose-500 rounded-xl transition-colors duration-200 flex items-center justify-center"
                      title="Void Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-6 lg:p-10 backdrop-blur-3xl bg-pink-50 border-t border-pink-100 shrink-0 space-y-6 lg:space-y-8 relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.02)]">
          <div className="space-y-3 lg:space-y-4">
            <div className="flex items-center justify-between p-3 bg-white border border-pink-100 rounded-2xl shadow-sm mb-4">
               <div className="flex items-center gap-2">
                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSeniorCitizen ? 'bg-pink-600 text-white shadow-lg shadow-pink-200' : 'bg-slate-50 text-slate-900 font-bold'}`}>
                    <User className="w-4 h-4" />
                 </div>
                 <div>
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest leading-none">Senior Citizen / PWD</p>
                    <p className="text-[7px] text-slate-900 font-bold uppercase mt-0.5 leading-none">Apply 20% + VAT Exempt</p>
                 </div>
               </div>
               <button 
                 onClick={() => setIsSeniorCitizen(!isSeniorCitizen)}
                 className={`w-10 h-5 rounded-full border transition-all p-0.5 relative
                    ${isSeniorCitizen ? 'border-pink-600 bg-pink-50' : 'border-slate-200 bg-slate-100'}
                 `}
               >
                 <motion.div 
                    animate={{ x: isSeniorCitizen ? 20 : 0 }}
                    className={`w-3.5 h-3.5 rounded-full ${isSeniorCitizen ? 'bg-pink-600 shadow-md' : 'bg-white'}`}
                 />
               </button>
            </div>

            <div className="flex justify-between text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-slate-950">
              <span>Subtotal</span>
              <span className="text-slate-600 font-mono tracking-widest">₱{(Number(subtotal) || 0).toFixed(2)}</span>
            </div>
            {isSeniorCitizen && (
              <div className="flex justify-between text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
                <span>SC Discount (20%)</span>
                <span className="font-mono tracking-widest">-₱{(Number(scDiscount) || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 lg:pt-8 border-t border-pink-100">
              <span className="text-base lg:text-lg font-bold text-slate-900 tracking-tight uppercase">Total Amount</span>
              <div className="text-right">
                <span className="text-3xl lg:text-4xl font-bold text-pink-600 tracking-widest font-mono">₱{(Number(total) || 0).toFixed(2)}</span>
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
        lg:hidden fixed bottom-0 left-0 right-0 z-30 p-4 transition-transform duration-300 print:hidden
        ${isMobileCartOpen ? 'translate-y-full' : 'translate-y-0'}
      `}>
        <button 
           onClick={() => setIsMobileCartOpen(true)}
           className="w-full bg-white text-slate-900 p-4 rounded-3xl shadow-xl flex items-center justify-between border border-pink-100 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
             <div className="p-2 bg-pink-600 rounded-xl text-white">
                <ShoppingCart className="w-5 h-5" />
             </div>
             <div className="text-left">
                <p className="text-[10px] font-bold uppercase text-pink-500 tracking-widest">Active Order</p>
                <p className="text-sm font-bold tracking-tight">{cart.length} Items</p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-xl font-bold font-mono tracking-tighter text-pink-600">₱{(Number(total) || 0).toFixed(2)}</p>
             <p className="text-[8px] font-extrabold text-slate-950 uppercase tracking-widest">Review Cart</p>
          </div>
        </button>
      </div>

      {/* Customization Modal */}
      <AnimatePresence>
        {customizingProduct && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 print:hidden">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               onClick={() => setCustomizingProduct(null)}
               className="absolute inset-0 bg-white/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-sm bg-white border border-pink-100 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="text-center mb-6">
                   <div className="w-20 h-20 bg-[#FAF9F6] rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 border border-black/5 shadow-inner">
                     {customizingProduct.imageUrl ? (
                       <img src={customizingProduct.imageUrl} alt="" className="w-full h-full object-cover rounded-[2.5rem]" referrerPolicy="no-referrer" />
                      ) : (
                       <Package className="w-8 h-8 text-pink-200" />
                      )}
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 tracking-tight">{customizingProduct.name}</h3>
                   <p className="text-[10px] text-slate-950 font-black uppercase tracking-widest mt-1">Select Preferences</p>

                    {/* List of currently added configs for this same product */}
                    {cart.some(item => item.id === customizingProduct.id) && (
                      <div className="mt-3 flex flex-col gap-1 max-h-24 overflow-y-auto px-3 py-2 bg-slate-50/80 rounded-2xl border border-slate-100/60 text-left">
                        <p className="text-[8px] font-black text-slate-950 uppercase tracking-wider mb-1">In Basket:</p>
                        <div className="flex flex-wrap gap-1">
                          {cart.filter(item => item.id === customizingProduct.id).map((item, idx) => (
                            <div key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white text-slate-700 rounded-lg border border-slate-200 text-[8px] font-bold shadow-xs">
                              <span className="text-pink-600">{item.quantity}x</span>
                              <span>{item.selectedSize || 'Regular'}</span>
                              {item.sugarLevel !== undefined && <span className="opacity-60 text-[7px] font-medium">({item.sugarLevel}% Sug{item.iceLevel ? `, ${item.iceLevel} Ice` : ''})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feedback Toast */}
                    <AnimatePresence>
                      {justAddedFeedback && (
                        <div className="mt-3 flex justify-center">
                          <motion.div 
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-wider shadow-sm inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {justAddedFeedback}
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                </div>

                <div className="space-y-6">
                  {productVariants.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest mb-3">Select Size</p>
                      <div className="grid grid-cols-2 gap-2">
                         <button 
                           onClick={() => setSelectedSize('Regular')}
                           className={`py-3 rounded-xl text-[10px] font-bold transition-all border flex flex-col items-center justify-center
                              ${selectedSize === 'Regular' 
                                ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-200' 
                                : 'bg-pink-50 text-slate-900 font-extrabold border-pink-100 hover:border-pink-300'}
                           `}
                         >
                           <span>Regular</span>
                           <span className={`text-[8px] ${selectedSize === 'Regular' ? 'text-pink-100' : 'text-pink-500'}`}>₱{Number(customizingProduct.price).toFixed(2)}</span>
                         </button>
                         {productVariants.map((v) => (
                           <button 
                             key={v.id}
                             onClick={() => setSelectedSize(v.name)}
                             className={`py-3 rounded-xl text-[10px] font-bold transition-all border flex flex-col items-center justify-center
                                ${selectedSize === v.name 
                                  ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-200' 
                                  : 'bg-pink-50 text-slate-900 font-extrabold border-pink-100 hover:border-pink-300'}
                             `}
                           >
                             <span>{v.name}</span>
                             <span className={`text-[8px] ${selectedSize === v.name ? 'text-pink-100' : 'text-pink-500'}`}>₱{Number(v.price).toFixed(2)}</span>
                           </button>
                         ))}
                      </div>
                    </div>
                  )}

                  {isDrinkProduct(customizingProduct) && (
                    <>
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest">Sugar Level</p>
                          <span className="text-sm font-bold text-pink-600 font-mono">{selectedSugar}%</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                           {[0, 25, 50, 100].map((level) => (
                             <button 
                               key={level}
                               onClick={() => setSelectedSugar(level)}
                               className={`py-3 rounded-xl text-[10px] font-bold transition-all border
                                  ${selectedSugar === level 
                                    ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-200' 
                                    : 'bg-pink-50 text-slate-900 font-extrabold border-pink-100 hover:border-pink-300'}
                               `}
                             >
                               {level}
                             </button>
                           ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest mb-3">Ice Level</p>
                        <div className="grid grid-cols-4 gap-2">
                           {['Normal', 'Less', 'No Ice', 'More'].map((level) => (
                             <button 
                               key={level}
                               onClick={() => setSelectedIce(level)}
                               className={`py-2 rounded-xl text-[9px] font-bold transition-all border
                                  ${selectedIce === level 
                                    ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-200' 
                                    : 'bg-pink-50 text-slate-900 font-extrabold border-pink-100 hover:border-pink-300'}
                               `}
                             >
                               {level}
                             </button>
                           ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest mb-3">Add-ons</p>
                    <div className="grid grid-cols-2 gap-2">
                       {addonsList.map((addon) => {
                         const isSelected = selectedAddons.some(a => a.name === addon.name);
                         return (
                           <button 
                             key={addon.name}
                             onClick={() => toggleAddon(addon)}
                             className={`py-3 px-3 rounded-xl text-[10px] font-bold transition-all border text-left flex items-center justify-between
                                ${isSelected 
                                  ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-200' 
                                  : 'bg-pink-50 text-slate-900 font-extrabold border-pink-100 hover:border-pink-300'}
                             `}
                           >
                             <div className="flex flex-col">
                               <span>{addon.name}</span>
                               <span className={`text-[8px] ${isSelected ? 'text-pink-100' : 'text-pink-500'}`}>+₱{addon.price}</span>
                             </div>
                             {isSelected && <Plus className="w-3 h-3" />}
                           </button>
                         );
                       })}
                    </div>
                  </div>

                  <div className="pt-2 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => confirmAddToCart(true)}
                        className="py-4 bg-pink-50 text-pink-600 border border-pink-100 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-pink-100/50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add & More
                      </button>
                      <button 
                        onClick={() => confirmAddToCart(false)}
                        className="py-4 bg-pink-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-pink-500 shadow-lg shadow-pink-200 transition-all active:scale-95 flex items-center justify-center"
                      >
                        Add & Close
                      </button>
                    </div>
                    <button 
                      onClick={() => setCustomizingProduct(null)}
                      className="w-full py-2 text-slate-950 font-black uppercase tracking-widest text-[9px] hover:text-slate-600 transition-colors"
                    >
                      Close Customizer
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               onClick={() => setPaymentModal(false)}
               className="absolute inset-0 bg-white/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white border border-pink-100 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 lg:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Checkout Terminal</h3>
                  <button onClick={() => setPaymentModal(false)} className="text-slate-800 hover:text-rose-500 transition-colors">
                     <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="bg-pink-50 p-8 rounded-[2rem] mb-10 flex flex-col items-center border border-pink-100 shadow-inner">
                  <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest mb-2">Total Due</p>
                  <p className="text-5xl font-bold text-pink-600 tracking-tighter font-mono">
                    <span className="text-2xl mr-1">₱</span>
                    {(Number(total) || 0).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest ml-1">Payment Method</p>
                  <div className="px-5 py-4 bg-pink-50/50 border border-pink-100 rounded-2xl flex items-center gap-3 shadow-inner">
                    <div className="p-2.5 bg-pink-600 text-white rounded-xl">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-[11px] uppercase tracking-wider text-slate-800">Cash Payment</p>
                    </div>
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="mt-8 space-y-4">
                    <p className="text-[10px] font-black text-slate-950 uppercase tracking-widest ml-1">Amount Given</p>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-900 font-extrabold font-mono text-xl">₱</span>
                      <input 
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        className="w-full pl-14 pr-8 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-pink-600 transition-all text-2xl font-bold font-mono tracking-tighter"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-between items-center px-2">
                       <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">Change</span>
                       <span className="text-2xl font-bold text-emerald-500 font-mono">₱{(Number(changeAmount) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="mt-10 space-y-4">
                  {paymentMethod === 'cash' && parseFloat(amountReceived) > 0 && !isAmountSufficient && (
                    <p className="text-center text-[10px] font-bold text-rose-500 uppercase tracking-widest bg-rose-50 py-2 rounded-lg">
                      Insufficient Amount
                    </p>
                  )}
                  <motion.button 
                    whileHover={isProcessing || !isAmountSufficient ? {} : { scale: 1.02 }}
                    whileTap={isProcessing || !isAmountSufficient ? {} : { scale: 0.98 }}
                    onClick={handleCheckout}
                    disabled={isProcessing || !isAmountSufficient}
                    className="w-full py-5 bg-pink-600 text-white rounded-3xl font-bold uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 hover:bg-pink-700 transition-all shadow-xl shadow-pink-200 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      "Complete Order"
                    )}
                  </motion.button>
                  <button 
                    onClick={() => setPaymentModal(false)}
                    className="w-full py-2 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors"
                  >
                    Close
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:p-0 print:static print:block">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setReceipt(null)} 
               className="absolute inset-0 bg-white/95 backdrop-blur-md print:hidden" 
            />
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.9 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: 50, opacity: 0, scale: 0.9 }} 
              className="relative w-full max-w-sm bg-white border border-pink-100 rounded-[3rem] overflow-hidden shadow-2xl print:shadow-none print:rounded-none"
            >
              <div className="p-8 print:p-0">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-pink-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-200">
                    <Receipt className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Success!</h3>
                  <p className="text-[10px] text-pink-600 font-bold uppercase tracking-widest mt-1">Order #{receipt.id.slice(-8)}</p>
                  <p className="text-[8px] text-slate-900 font-bold mt-1 uppercase">Today at {receipt.timestamp ? new Date(receipt.timestamp).toLocaleTimeString() : 'N/A'}</p>
                </div>

                <div className="space-y-3 mb-8 max-h-[180px] overflow-auto scrollbar-hide">
                  {receipt.items.map((item: any, idx: number) => (
                    <div key={`${item.id}-${idx}`} className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{item.name}</span>
                        <span className="text-[9px] text-slate-900 font-black uppercase">{item.quantity} x ₱{(Number(item.price) || 0).toFixed(2)}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 font-mono">₱{((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-pink-100 pt-6 space-y-2 mb-8">
                  <div className="flex justify-between text-[10px] font-black text-slate-950 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="font-mono text-slate-700">₱{(Number(receipt.subtotal) || 0).toFixed(2)}</span>
                  </div>
                  {receipt.isSeniorCitizen && (
                    <div className="flex justify-between text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                      <span>SC Discount</span>
                      <span className="font-mono">-₱{(Number(receipt.scDiscount) || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-4 border-t border-pink-50">
                    <span className="text-sm font-bold text-slate-900 uppercase tracking-widest">Total Paid</span>
                    <span className="text-2xl font-bold text-pink-600 font-mono">₱{(Number(receipt.total) || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3 print:hidden">
                  <button 
                    onClick={() => setReceipt(null)}
                    className="flex-1 py-4 bg-pink-50 text-pink-600 rounded-2xl font-bold uppercase tracking-widest text-[10px] border border-pink-100 hover:bg-pink-100 transition-all active:scale-95"
                  >
                    Done
                  </button>
                  <button 
                    onClick={() => {
                      if (receipt) {
                        exportReceiptPDF({
                          ...receipt,
                          discount: receipt.scDiscount || 0,
                          tax: receipt.tax || 0
                        }, 80);
                      }
                    }}
                    className="flex-1 py-4 bg-pink-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-pink-700 shadow-lg shadow-pink-200 transition-all active:scale-95 cursor-pointer"
                  >
                    Print
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
