import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  RefreshCw, 
  Image as ImageIcon,
  ChevronDown,
  Trash2,
  Edit,
  X,
  Upload,
  History,
  ArrowRightLeft
} from 'lucide-react';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  type: z.enum(['product', 'supply']),
  price: z.number().min(0, 'Price must be 0 or greater').optional(),
  stock: z.number().int().min(0, 'Stock must be 0 or greater'),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  imageUrl: z.string().optional(),
  lowStockThreshold: z.number().int().min(0, 'Threshold must be 0 or greater'),
}).refine((data) => {
  if (data.type === 'product' && (data.price === undefined || data.price <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Saleable products must have a price greater than 0",
  path: ["price"],
});

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
});

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters'),
  contact: z.string().optional(),
});

export default function Inventory() {
  const { currentStore } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [supModalOpen, setSupModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Category Form State
  const [catName, setCatName] = useState('');
  // Supplier Form State
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');

  const [auditLogsOpen, setAuditLogsOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('all');

  const [activeTab, setActiveTab] = useState<'product' | 'supply'>('product');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Stock Adjustment State
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'product',
    price: 0,
    stock: 0,
    categoryId: '',
    supplierId: '',
    imageUrl: '',
    lowStockThreshold: 5
  });

  const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]); // { ingredientId, quantity }
  const [ingredientsLoading, setIngredientsLoading] = useState(false);

  const [productVariants, setProductVariants] = useState<any[]>([]); // { name, price }
  const [variantsLoading, setVariantsLoading] = useState(false);

  useEffect(() => {
    if (currentStore) {
      fetchData();
    }
  }, [currentStore]);

  const fetchData = async () => {
    if (!currentStore) return;
    try {
      const [p, c, s, soldData] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/suppliers'),
        supabase.rpc('get_sold_counts', { store_id_param: currentStore.id })
      ]);

      const soldCounts = soldData?.data || [];
      const productsData = p?.data || [];
      
      const productsWithSales = productsData.map((product: any) => {
        const soldInfo = Array.isArray(soldCounts) ? soldCounts.find((s: any) => s.product_id === product.id) : null;
        return {
          ...product,
          soldCount: soldInfo ? Number(soldInfo.count) : 0
        };
      });

      setProducts(productsWithSales);
      setCategories(c?.data || []);
      setSuppliers(s?.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const { data } = await api.get('/inventory/logs');
      setAuditLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchProductHistory = async (id: string) => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/products/${id}/logs`);
      setProductHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = (product: any) => {
    setSelectedProduct(product);
    setProductHistory([]);
    setHistoryModalOpen(true);
    fetchProductHistory(product.id);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = categorySchema.safeParse({ name: catName });
    if (!validation.success) {
      alert(validation.error.issues[0].message);
      return;
    }
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, { name: catName });
      } else {
        await api.post('/categories', { name: catName });
      }
      setCatName('');
      setEditingCategory(null);
      setCatModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to save category');
    }
  };

  const deleteCategory = async (id: string) => {
    setIsDeletingCategory(true);
    try {
      await api.delete(`/categories/${id}`);
      setCategoryToDelete(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete category");
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = supplierSchema.safeParse({ name: supName, contact: supContact });
    if (!validation.success) {
      alert(validation.error.issues[0].message);
      return;
    }
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, { name: supName, contact: supContact });
      } else {
        await api.post('/suppliers', { name: supName, contact: supContact });
      }
      setSupName('');
      setSupContact('');
      setEditingSupplier(null);
      setSupModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to save supplier');
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete supplier");
    }
  };

  const [generating, setGenerating] = useState(false);

  const suggestImage = async () => {
    if (!formData.name) {
      alert("Please enter a product name first");
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.get(`/generate-image?q=${encodeURIComponent(formData.name + ' ' + (formData.type === 'supply' ? 'raw material' : 'beverage'))}`);
      setFormData({ ...formData, imageUrl: data.imageUrl });
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const validation = productSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach(err => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    setUploading(true);
    try {
      let imageUrl = formData.imageUrl;

      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append('image', selectedFile);
        const { data } = await api.post('/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        imageUrl = data.imageUrl;
      }

      const finalData = { ...formData, imageUrl };

      let productId = editingProduct?.id;

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, finalData);
      } else {
        const resp = await api.post('/products', finalData);
        productId = resp.data.id;
      }

      // Save Ingredients
      if (formData.type === 'product' && productId) {
        await Promise.all([
          api.post(`/products/${productId}/ingredients`, {
            ingredients: selectedIngredients.filter(i => i.ingredientId && i.quantity > 0)
          }),
          api.post(`/products/${productId}/variants`, {
            variants: productVariants.filter(v => v.name && v.price >= 0)
          })
        ]);
      }

      setModalOpen(false);
      setEditingProduct(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setFormErrors({});
      fetchData();
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          errors[e.path] = e.msg;
        });
        setFormErrors(errors);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFormData({ ...formData, imageUrl: '' }); // Clear manual URL if file selected
    }
  };

  const fetchIngredients = async (id: string) => {
    setIngredientsLoading(true);
    try {
      const { data } = await api.get(`/products/${id}/ingredients`);
      setSelectedIngredients(data.map((i: any) => ({
        ingredientId: i.ingredient_id,
        quantity: i.quantity
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setIngredientsLoading(false);
    }
  };

  const fetchVariants = async (id: string) => {
    setVariantsLoading(true);
    try {
      const { data } = await api.get(`/products/${id}/variants`);
      setProductVariants(data.map((v: any) => ({
        name: v.name,
        price: v.price
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setVariantsLoading(false);
    }
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      type: product.type || 'product',
      price: Number(product.price) || 0,
      stock: Number(product.stock) || 0,
      categoryId: product.categoryId || '',
      supplierId: product.supplierId || '',
      imageUrl: product.imageUrl || '',
      lowStockThreshold: Number(product.lowStockThreshold) || 5
    });
    setSelectedIngredients([]);
    setProductVariants([]);
    if (product.type === 'product') {
      fetchIngredients(product.id);
      fetchVariants(product.id);
    }
    setModalOpen(true);
  };

  const openAdjustment = (product: any) => {
    setAdjustingProduct(product);
    setAdjustmentValue(0);
    setAdjustmentType('add');
    setAdjustmentModalOpen(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    const val = Number(adjustmentValue);
    let newStock = Number(adjustingProduct.stock);
    
    if (adjustmentType === 'add') newStock += val;
    else if (adjustmentType === 'remove') newStock -= val;
    else if (adjustmentType === 'set') newStock = val;

    if (newStock < 0) {
      alert("Stock cannot be negative");
      return;
    }

    setUploading(true);
    try {
      await api.put(`/products/${adjustingProduct.id}`, {
        ...adjustingProduct,
        stock: newStock,
        price: Number(adjustingProduct.price)
      });
      setAdjustmentModalOpen(false);
      setAdjustingProduct(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to adjust stock");
    } finally {
      setUploading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/products/${id}`);
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || "Failed to delete product";
      alert(msg);
      setDeleteId(null);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-4">
        <div>
          <h2 className="text-5xl font-display font-bold text-slate-900 tracking-tighter uppercase">Inventory Manager</h2>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Registry Secure • {products.length} Products Loaded</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1 max-w-4xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-pink-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search products..."
              className="w-full pl-16 pr-8 py-5 backdrop-blur-md bg-white border border-pink-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:bg-white transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-300 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
             <button 
               onClick={() => {
                 fetchAuditLogs();
                 setAuditLogsOpen(true);
               }}
               className="p-5 bg-white border border-pink-100 rounded-2xl hover:bg-pink-50 transition-all group active:scale-90 shadow-sm"
               title="Audit Logs"
             >
               <History className="w-5 h-5 text-slate-400 group-hover:text-pink-500" />
             </button>
             <button 
                onClick={() => setCatModalOpen(true)}
                className="p-5 bg-white border border-pink-100 rounded-2xl hover:bg-pink-50 transition-all group shadow-sm font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-pink-600"
                title="Manage Categories"
             >
                Categories
             </button>
             <button 
                onClick={() => setSupModalOpen(true)}
                className="p-5 bg-white border border-pink-100 rounded-2xl hover:bg-pink-50 transition-all group shadow-sm font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-pink-600"
                title="Manage Suppliers"
             >
                Suppliers
             </button>
             <div className="h-8 w-px bg-pink-100 mx-2 hidden md:block"></div>
             <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               onClick={() => {
                 setEditingProduct(null);
                 setFormData({ name: '', type: activeTab, price: 0, stock: 0, categoryId: '', supplierId: '', imageUrl: '', lowStockThreshold: 5 });
                 setSelectedFile(null);
                 setPreviewUrl(null);
                 setFormErrors({});
                 setModalOpen(true);
               }}
               className="flex items-center gap-3 px-8 py-5 bg-pink-600 text-white rounded-3xl font-bold text-[10px] uppercase tracking-widest shadow-2xl shadow-pink-200 hover:bg-pink-500 transition-all"
             >
               <Plus className="w-4 h-4" />
               Add {activeTab === 'product' ? 'Product' : 'Supply'}
             </motion.button>
          </div>
        </div>
      </div>

      <div className="flex bg-white/50 backdrop-blur-md p-2 rounded-3xl border border-pink-100/50 w-fit mb-4">
        <button 
          onClick={() => setActiveTab('product')}
          className={`px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'product' ? 'bg-pink-600 text-white shadow-xl shadow-pink-500/20' : 'text-slate-400 hover:text-pink-500'}`}
        >
          Saleable Products (Drinks/Food)
        </button>
        <button 
          onClick={() => setActiveTab('supply')}
          className={`px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'supply' ? 'bg-pink-600 text-white shadow-xl shadow-pink-500/20' : 'text-slate-400 hover:text-pink-500'}`}
        >
          Supplies & Raw Materials
        </button>
      </div>

      <div className="bg-white border border-pink-100/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-pink-500/5">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-pink-50/50 bg-[#FAF9F6]">
                <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Details</th>
                <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Category</th>
                <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Level</th>
                <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Sold</th>
                <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Price</th>
                <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50/50">
              {loading ? (
                <tr>
                   <td colSpan={5} className="px-10 py-32 text-center">
                     <div className="flex flex-col items-center gap-6">
                        <div className="w-10 h-10 border-4 border-pink-500/10 border-t-pink-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em] animate-pulse">Synchronizing Data...</p>
                     </div>
                   </td>
                </tr>
              ) : products.filter(p => (p.type || 'product') === activeTab && p.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-10 py-32 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">
                     No items found in this section
                   </td>
                </tr>
              ) : products.filter(p => (p.type || 'product') === activeTab && p.name.toLowerCase().includes(search.toLowerCase())).map((p, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  key={p.id} 
                  className="hover:bg-pink-50/20 transition-all duration-300 group"
                >
                  <td className="px-10 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pink-50 rounded-2xl border border-pink-100 flex items-center justify-center shrink-0 relative overflow-hidden group-hover:scale-105 transition-all duration-500 shadow-sm">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-5 h-5 text-pink-200 group-hover:text-pink-500 transition-colors" />
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-900 tracking-tight group-hover:text-pink-600 transition-colors uppercase">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.supplierName || 'Generic'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-5 text-center">
                    <span className="px-3 py-1 bg-white border border-pink-100 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:border-pink-500/30 group-hover:text-pink-500 transition-all">
                      {p.categoryName || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-10 py-5 cursor-pointer" onClick={() => openHistory(p)}>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                        <div 
                           className={`h-full rounded-full transition-all duration-1000 ${p.stock <= p.lowStockThreshold ? 'bg-amber-500' : 'bg-pink-500'}`}
                           style={{ width: `${Math.min(((Number(p.stock) || 0) / (Number(p.lowStockThreshold) * 4 || 20)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-mono font-bold tracking-tight ${p.stock <= p.lowStockThreshold ? 'text-amber-600' : 'text-slate-600'}`}>
                        {p.stock}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-5 text-center">
                     <span className="text-sm font-bold text-slate-400 font-mono italic group-hover:text-pink-500 transition-colors">
                        {p.soldCount || 0}
                     </span>
                  </td>
                  <td className="px-10 py-5 text-right font-bold text-slate-900 tracking-tight font-mono text-base">
                    {p.type === 'supply' ? (
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">Internal</span>
                    ) : (
                      `₱${(Number(p.price) || 0).toFixed(2)}`
                    )}
                  </td>
                  <td className="px-10 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => openAdjustment(p)} 
                        className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Adjust Stock"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openHistory(p)} 
                        className="p-3 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all"
                        title="View Stock History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openEdit(p)} 
                        className="p-3 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {deleteId === p.id ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center bg-rose-50 rounded-xl overflow-hidden border border-rose-100 ml-2"
                        >
                          <button 
                            onClick={() => deleteProduct(p.id)}
                            className="px-3 py-2 text-[8px] font-bold uppercase text-rose-600 hover:bg-rose-100 transition-all"
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => setDeleteId(null)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white transition-all border-l border-rose-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ) : (
                        <button 
                          onClick={() => setDeleteId(p.id)} 
                          className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
              <form onSubmit={handleSave} className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-gray-900">{editingProduct ? 'Update' : 'New'} Product</h3>
                  <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-black">
                     <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Inventory Type</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'product' })}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${formData.type === 'product' ? 'bg-pink-600 text-white border-pink-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                      >
                        Saleable Product
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'supply' })}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${formData.type === 'supply' ? 'bg-pink-600 text-white border-pink-600' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                      >
                        Internal Supply
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Product Name</label>
                    <input 
                      required
                      type="text"
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium ${formErrors.name ? 'border-red-500' : 'border-gray-100'}`}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    {formErrors.name && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest px-1">{formErrors.name}</p>}
                  </div>
                  <div className={`space-y-2 transition-all ${formData.type === 'supply' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Price (₱)</label>
                    <input 
                      required={formData.type === 'product'}
                      type="number" step="0.01"
                      placeholder={formData.type === 'supply' ? 'Internal Item' : '0.00'}
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium ${formErrors.price ? 'border-red-500' : 'border-gray-100'}`}
                      value={formData.type === 'supply' ? "" : (isNaN(formData.price || 0) ? "" : formData.price)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFormData({ ...formData, price: isNaN(val) ? 0 : val });
                      }}
                    />
                    {formErrors.price && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest px-1">{formErrors.price}</p>}
                    {formData.type === 'supply' && <p className="text-[9px] text-slate-400 italic px-1">Internal supplies have no customer price</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Initial Stock</label>
                    <input 
                      required
                      type="number"
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium ${formErrors.stock ? 'border-red-500' : 'border-gray-100'}`}
                      value={isNaN(formData.stock) ? "" : formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    />
                    {formErrors.stock && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest px-1">{formErrors.stock}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Low Stock Threshold</label>
                    <input 
                      type="number"
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium ${formErrors.lowStockThreshold ? 'border-red-500' : 'border-gray-100'}`}
                      value={isNaN(formData.lowStockThreshold) ? "" : formData.lowStockThreshold}
                      onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                    />
                    {formErrors.lowStockThreshold && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest px-1">{formErrors.lowStockThreshold}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Category</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Supplier</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium"
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  {formData.type === 'product' && (
                    <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipe / Composition (Required Supplies)</label>
                        <button 
                          type="button"
                          onClick={() => setSelectedIngredients([...selectedIngredients, { ingredientId: '', quantity: 1 }])}
                          className="text-[9px] font-bold text-pink-600 uppercase tracking-widest flex items-center gap-2 hover:bg-pink-50 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3" /> Add Ingredient
                        </button>
                      </div>

                      <div className="space-y-3">
                        {selectedIngredients.length === 0 ? (
                          <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                             <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">No ingredients linked to this product</p>
                          </div>
                        ) : (
                          selectedIngredients.map((ing, idx) => (
                            <div key={idx} className="flex gap-3 items-center">
                              <select 
                                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/10"
                                value={ing.ingredientId}
                                onChange={(e) => {
                                  const newList = [...selectedIngredients];
                                  newList[idx].ingredientId = e.target.value;
                                  setSelectedIngredients(newList);
                                }}
                              >
                                <option value="">Pick a Supply Item</option>
                                {products.filter(p => p.type === 'supply').map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <input 
                                type="number"
                                placeholder="Qty"
                                className="w-20 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-pink-500/10"
                                value={ing.quantity}
                                onChange={(e) => {
                                  const newList = [...selectedIngredients];
                                  newList[idx].quantity = parseFloat(e.target.value) || 0;
                                  setSelectedIngredients(newList);
                                }}
                              />
                              <button 
                                type="button"
                                onClick={() => setSelectedIngredients(selectedIngredients.filter((_, i) => i !== idx))}
                                className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                        {ingredientsLoading && <p className="text-[10px] text-pink-500 animate-pulse font-bold text-center">Loading linked info...</p>}
                      </div>
                    </div>
                  )}

                  {formData.type === 'product' && (
                    <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Sizes / Pricing Variants</label>
                        <button 
                          type="button"
                          onClick={() => setProductVariants([...productVariants, { name: '', price: formData.price || 0 }])}
                          className="text-[9px] font-bold text-pink-600 uppercase tracking-widest flex items-center gap-2 hover:bg-pink-50 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3" /> Add Size
                        </button>
                      </div>

                      <div className="space-y-3">
                        {productVariants.length === 0 ? (
                          <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                             <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Single price only (Base: ₱{(formData.price || 0).toFixed(2)})</p>
                          </div>
                        ) : (
                          productVariants.map((v, idx) => (
                            <div key={idx} className="flex gap-3 items-center">
                              <input 
                                type="text"
                                placeholder="Size Name (e.g. Large)"
                                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/10"
                                value={v.name}
                                onChange={(e) => {
                                  const newList = [...productVariants];
                                  newList[idx].name = e.target.value;
                                  setProductVariants(newList);
                                }}
                              />
                              <input 
                                type="number"
                                placeholder="Price"
                                className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-pink-500/10"
                                value={v.price}
                                onChange={(e) => {
                                  const newList = [...productVariants];
                                  newList[idx].price = parseFloat(e.target.value) || 0;
                                  setProductVariants(newList);
                                }}
                              />
                              <button 
                                type="button"
                                onClick={() => setProductVariants(productVariants.filter((_, i) => i !== idx))}
                                className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                        {variantsLoading && <p className="text-[10px] text-pink-500 animate-pulse font-bold text-center">Loading variants...</p>}
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 space-y-6">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-48 h-48 bg-[#FAF9F6] rounded-[2.5rem] border-2 border-dashed border-pink-100 flex items-center justify-center overflow-hidden relative group shadow-inner">
                        {previewUrl || formData.imageUrl ? (
                          <img 
                            src={previewUrl || formData.imageUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                             <ImageIcon className="w-10 h-10 text-pink-200" />
                             <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Image</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-pink-600/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center cursor-pointer backdrop-blur-sm">
                          <Upload className="w-8 h-8 text-white animate-bounce" />
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-none text-center">
                        Tap image to upload or drag & drop<br/>
                        <span className="text-pink-400 mt-2 block">Standard Ratio 1:1 Recommended</span>
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Image URL Source</label>
                        <button 
                          type="button" 
                          onClick={suggestImage}
                          disabled={generating || !formData.name}
                          className="text-[9px] font-bold text-pink-600 uppercase tracking-[0.2em] flex items-center gap-2 hover:text-pink-700 transition-colors disabled:opacity-30"
                        >
                          {generating ? 'Searching...' : '✨ Auto-Suggest Relevant Photo'}
                        </button>
                      </div>
                      <div className="relative group">
                        <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-pink-500 transition-colors" />
                        <input 
                          type="text"
                          className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:bg-white transition-all text-xs font-medium placeholder:text-slate-300"
                          value={formData.imageUrl}
                          onChange={(e) => {
                            setFormData({ ...formData, imageUrl: e.target.value });
                            setPreviewUrl(null);
                            setSelectedFile(null);
                          }}
                          placeholder="Paste a link or use suggest above..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    type="submit" 
                    disabled={uploading}
                    className="flex-1 py-4 bg-pink-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-pink-200"
                  >
                    {uploading ? 'Processing...' : (editingProduct ? 'Save Changes' : 'Create Product')}
                  </button>
                  <button type="button" onClick={() => setModalOpen(false)} className="px-8 py-4 text-slate-400 font-bold hover:text-pink-600 transition-colors">
                    Discard
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Category Modal */}
      <AnimatePresence>
        {catModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setCatModalOpen(false); setEditingCategory(null); setCatName(''); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8 flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 font-display uppercase tracking-tight">{editingCategory ? 'Update' : 'Manage'} Categories</h3>
                <button onClick={() => { setCatModalOpen(false); setEditingCategory(null); setCatName(''); }} className="text-slate-400 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4 mb-8 shrink-0">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Category Name</label>
                  <div className="flex gap-2">
                    <input 
                      required
                      type="text"
                      className="flex-1 px-4 py-3 bg-pink-50 border border-pink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-medium text-sm"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="E.g. Fruit Tea"
                    />
                    <button type="submit" className="px-6 py-3 bg-pink-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-pink-200 hover:bg-pink-500">
                      {editingCategory ? 'Save' : 'Add'}
                    </button>
                    {editingCategory && (
                      <button type="button" onClick={() => { setEditingCategory(null); setCatName(''); }} className="px-4 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </form>

              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Existing Categories</p>
                {categories.length === 0 ? (
                  <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em]">No categories found</p>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-pink-200 transition-all">
                      <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">{cat.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingCategory(cat); setCatName(cat.name); }}
                          className="p-2 text-slate-400 hover:text-pink-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setCategoryToDelete(cat)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <AnimatePresence>
                {categoryToDelete && (
                  <motion.div 
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    className="absolute inset-0 z-20 bg-white/80 flex items-center justify-center p-8"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white border border-rose-100 p-8 rounded-[2rem] shadow-2xl text-center max-w-xs"
                    >
                      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Trash2 className="w-8 h-8 text-rose-500" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 uppercase tracking-tighter mb-2">Delete Category?</h4>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
                        Warning: Deleting "<span className="text-slate-900 font-bold">{categoryToDelete.name}</span>" will unassign it from any associated products. This action is permanent.
                      </p>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => deleteCategory(categoryToDelete.id)}
                          disabled={isDeletingCategory}
                          className="w-full py-4 bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-200 transition-all disabled:opacity-50"
                        >
                          {isDeletingCategory ? 'Deleting...' : 'Yes, Delete Category'}
                        </button>
                        <button 
                          onClick={() => setCategoryToDelete(null)}
                          disabled={isDeletingCategory}
                          className="w-full py-4 bg-slate-50 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Supplier Modal */}
      <AnimatePresence>
        {supModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSupModalOpen(false); setEditingSupplier(null); setSupName(''); setSupContact(''); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8 flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 font-display uppercase tracking-tight">{editingSupplier ? 'Update' : 'Manage'} Suppliers</h3>
                <button onClick={() => { setSupModalOpen(false); setEditingSupplier(null); setSupName(''); setSupContact(''); }} className="text-slate-400 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveSupplier} className="space-y-4 mb-8 shrink-0 border-b border-pink-50 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Supplier Name</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-pink-50 border border-pink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-medium text-sm"
                      value={supName}
                      onChange={(e) => setSupName(e.target.value)}
                      placeholder="E.g. Cathtea Supply Co"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Contact Info</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-pink-50 border border-pink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-medium text-sm"
                      value={supContact}
                      onChange={(e) => setSupContact(e.target.value)}
                      placeholder="Email or phone"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 py-4 bg-pink-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-pink-200 hover:bg-pink-500">
                    {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                  </button>
                  {editingSupplier && (
                    <button type="button" onClick={() => { setEditingSupplier(null); setSupName(''); setSupContact(''); }} className="px-6 py-4 bg-slate-100 text-slate-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200">
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Active Partners</p>
                {suppliers.length === 0 ? (
                  <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em]">No suppliers found</p>
                ) : (
                  suppliers.map(sup => (
                    <div key={sup.id} className="flex items-center justify-between p-4 bg-[#FAF9F6] border border-slate-100 rounded-2xl group hover:border-pink-200 transition-all">
                      <div>
                        <p className="text-sm font-bold text-slate-700 uppercase tracking-tight">{sup.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{sup.contact || 'No contact provided'}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingSupplier(sup); setSupName(sup.name); setSupContact(sup.contact || ''); }}
                          className="p-2 text-slate-400 hover:text-pink-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteSupplier(sup.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Audit Logs Modal */}
      <AnimatePresence>
        {auditLogsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAuditLogsOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-8 border-b border-pink-50 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 font-display uppercase tracking-tight">Inventory Logs</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">History of stock changes</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['all', 'sale', 'manual_update', 'creation'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setLogTypeFilter(type)}
                        className={`px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${logTypeFilter === type ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text"
                    placeholder="Filter products..."
                    className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                  />
                  <div className="h-6 w-px bg-slate-200 mx-2"></div>
                  <button onClick={() => setAuditLogsOpen(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                {logsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-pink-500/10 border-t-pink-500 rounded-full animate-spin"></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing logs...</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 font-bold uppercase text-xs tracking-widest">
                    No registry entries found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs
                      .filter((log: any) => 
                        (logTypeFilter === 'all' || log.changeType === logTypeFilter) &&
                        (log.productName || '').toLowerCase().includes(logFilter.toLowerCase())
                      )
                      .map((log: any) => (
                      <div key={log.id} className="p-6 bg-[#FAF9F6] border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-pink-200 transition-all duration-500 shadow-sm">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                            log.changeType === 'creation' ? 'bg-emerald-50 text-emerald-500' : 
                            log.changeType === 'sale' ? 'bg-amber-50 text-amber-500' : 'bg-pink-50 text-pink-500'
                          }`}>
                            <ArrowRightLeft className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-900 tracking-tight uppercase">{log.productName}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{log.username}</p>
                               <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                               <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-10">
                           <div className="text-right">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity Change</p>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-bold text-slate-300">{log.oldStock}</span>
                                <ArrowRightLeft className="w-3 h-3 text-pink-200" />
                                <span className="text-base font-mono font-bold text-pink-600">{log.newStock}</span>
                              </div>
                           </div>
                           <div className="px-4 py-2 bg-white border border-pink-100 rounded-xl text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-pink-500 group-hover:border-pink-200 transition-all">
                              {log.changeType}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stock Adjustment Modal */}
      <AnimatePresence>
        {adjustmentModalOpen && adjustingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAdjustmentModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
              <form onSubmit={handleAdjustStock} className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Stock Adjustment</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{adjustingProduct.name}</p>
                  </div>
                  <button type="button" onClick={() => setAdjustmentModalOpen(false)} className="text-gray-400 hover:text-black">
                     <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-2">
                    {(['add', 'remove', 'set'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAdjustmentType(type)}
                        className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${adjustmentType === type ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                      >
                        {type === 'add' ? 'Increase' : type === 'remove' ? 'Decrease' : 'Set Exact'}
                      </button>
                    ))}
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Inventory</p>
                    <p className="text-4xl font-mono font-bold text-slate-900 tracking-tighter">{adjustingProduct.stock}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                      {adjustmentType === 'add' ? 'Amount to Add' : adjustmentType === 'remove' ? 'Amount to Subtract' : 'New Total Stock'}
                    </label>
                    <input 
                      required
                      type="number"
                      min={adjustmentType === 'remove' ? 0 : 0}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:bg-white transition-all text-xl font-bold text-center"
                      value={adjustmentValue === 0 ? '' : adjustmentValue}
                      onChange={(e) => setAdjustmentValue(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-pink-50 rounded-2xl border border-pink-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Projected Stock:</span>
                    <span className="text-lg font-mono font-bold text-pink-600">
                      {adjustmentType === 'add' ? Number(adjustingProduct.stock) + Number(adjustmentValue) : 
                       adjustmentType === 'remove' ? Number(adjustingProduct.stock) - Number(adjustmentValue) : 
                       Number(adjustmentValue)}
                    </span>
                  </div>
                </div>

                <div className="mt-10">
                  <button 
                    type="submit" 
                    disabled={uploading}
                    className="w-full py-5 bg-pink-600 text-white rounded-[1.5rem] font-bold text-xs uppercase tracking-[0.2em] shadow-2xl shadow-pink-200 hover:bg-pink-500 transition-all disabled:opacity-50"
                  >
                    {uploading ? 'Processing Transaction...' : 'Confirm Adjustment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product History Modal */}
      <AnimatePresence>
        {historyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-8 border-b border-pink-50 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 font-display uppercase tracking-tight">{selectedProduct?.name} History</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Registry of all stock movements</p>
                </div>
                <button onClick={() => setHistoryModalOpen(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all">
                   <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-pink-500/10 border-t-pink-500 rounded-full animate-spin"></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Fetching history...</p>
                  </div>
                ) : productHistory.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 font-bold uppercase text-xs tracking-widest">
                    No movement records found for this item
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productHistory.map((log: any) => (
                      <div key={log.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                             log.changeType === 'sale' ? 'bg-amber-100 text-amber-600' : 
                             log.changeType === 'creation' ? 'bg-emerald-100 text-emerald-600' : 'bg-pink-100 text-pink-600'
                           }`}>
                             <ArrowRightLeft className="w-5 h-5" />
                           </div>
                           <div>
                             <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                               {log.changeType === 'sale' ? 'Item Sold' : log.changeType === 'creation' ? 'Product Created' : 'Stock Adjusted'}
                             </p>
                             <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                               {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'} • {log.username}
                             </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-mono text-slate-300">{log.oldStock}</span>
                             <ArrowRightLeft className="w-3 h-3 text-slate-200" />
                             <span className={`text-sm font-mono font-bold ${log.newStock < log.oldStock ? 'text-rose-500' : 'text-emerald-500'}`}>
                               {log.newStock}
                             </span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
