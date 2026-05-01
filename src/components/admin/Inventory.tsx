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
import { motion, AnimatePresence } from 'motion/react';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  stock: z.number().int().min(0, 'Stock must be 0 or greater'),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  imageUrl: z.string().optional(),
  lowStockThreshold: z.number().int().min(0, 'Threshold must be 0 or greater'),
});

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
});

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters'),
  contact: z.string().optional(),
});

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [supModalOpen, setSupModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
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

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    stock: 0,
    categoryId: '',
    supplierId: '',
    imageUrl: '',
    lowStockThreshold: 5
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [p, c, s] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/suppliers')
      ]);
      setProducts(p.data);
      setCategories(c.data);
      setSuppliers(s.data);
    } catch (err) {
      console.error(err);
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

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = categorySchema.safeParse({ name: catName });
    if (!validation.success) {
      alert(validation.error.issues[0].message);
      return;
    }
    try {
      await api.post('/categories', { name: catName });
      setCatName('');
      setCatModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to add category');
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
      await api.post('/suppliers', { name: supName, contact: supContact });
      setSupName('');
      setSupContact('');
      setSupModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to add supplier');
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

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, finalData);
      } else {
        await api.post('/products', finalData);
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

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      stock: product.stock,
      categoryId: product.categoryId || '',
      supplierId: product.supplierId || '',
      imageUrl: product.imageUrl || '',
      lowStockThreshold: product.lowStockThreshold || 5
    });
    setModalOpen(true);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-4">
        <div>
          <h2 className="text-5xl font-display font-black text-slate-900 tracking-tighter italic uppercase">Inventory Matrix</h2>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Registry Secure • {products.length} Node Clusters Initialized</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1 max-w-4xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-pink-500 transition-colors" />
            <input 
              type="text"
              placeholder="Query localized assets..."
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
             <button className="p-5 bg-white border border-pink-100 rounded-2xl hover:bg-pink-50 transition-all group active:scale-90 shadow-sm">
               <Filter className="w-5 h-5 text-slate-400 group-hover:text-pink-500" />
             </button>
             <div className="h-8 w-px bg-pink-100 mx-2 hidden md:block"></div>
             <motion.button 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               onClick={() => {
                 setEditingProduct(null);
                 setFormData({ name: '', price: 0, stock: 0, categoryId: '', supplierId: '', imageUrl: '', lowStockThreshold: 5 });
                 setSelectedFile(null);
                 setPreviewUrl(null);
                 setModalOpen(true);
               }}
               className="flex items-center gap-3 px-8 py-5 bg-pink-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-pink-200 hover:bg-pink-500 transition-all"
             >
               <Plus className="w-4 h-4" />
               Integrate Asset
             </motion.button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-pink-100/50 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-pink-500/5">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-pink-50/50 bg-[#FAF9F6]">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Identity / Origin</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-center">Classification</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Flow Capacity</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Unit Value</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50/50">
              {loading ? (
                <tr>
                   <td colSpan={5} className="px-10 py-32 text-center">
                     <div className="flex flex-col items-center gap-6">
                        <div className="w-10 h-10 border-4 border-pink-500/10 border-t-pink-500 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse italic">Synchronizing Cluster...</p>
                     </div>
                   </td>
                </tr>
              ) : products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-10 py-32 text-center text-slate-300 font-bold uppercase text-xs tracking-widest italic">
                     No matches localized in current sector
                   </td>
                </tr>
              ) : products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map((p, i) => (
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
                          <img src={p.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
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
                    <span className="px-3 py-1 bg-white border border-pink-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest italic group-hover:border-pink-500/30 group-hover:text-pink-500 transition-all">
                      {p.categoryName || 'Unclassified'}
                    </span>
                  </td>
                  <td className="px-10 py-5">
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
                  <td className="px-10 py-5 text-right font-black text-slate-900 tracking-tight font-mono text-base italic">
                    ${p.price.toFixed(2)}
                  </td>
                  <td className="px-10 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button 
                        onClick={() => openEdit(p)} 
                        className="p-3 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)} 
                        className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest italic px-1">Product Name</label>
                    <input 
                      required
                      type="text"
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium ${formErrors.name ? 'border-red-500' : 'border-gray-100'}`}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    {formErrors.name && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest px-1">{formErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest italic px-1">Price ($)</label>
                    <input 
                      required
                      type="number" step="0.01"
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium ${formErrors.price ? 'border-red-500' : 'border-gray-100'}`}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    />
                    {formErrors.price && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest px-1">{formErrors.price}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest italic px-1">Initial Stock</label>
                    <input 
                      required
                      type="number"
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium ${formErrors.stock ? 'border-red-500' : 'border-gray-100'}`}
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    />
                    {formErrors.stock && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest px-1">{formErrors.stock}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest italic px-1">Low Stock Threshold</label>
                    <input 
                      type="number"
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium ${formErrors.lowStockThreshold ? 'border-red-500' : 'border-gray-100'}`}
                      value={formData.lowStockThreshold}
                      onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                    />
                    {formErrors.lowStockThreshold && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest px-1">{formErrors.lowStockThreshold}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest italic px-1">Category</label>
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
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest italic px-1">Supplier</label>
                    <select 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium"
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                        {previewUrl || formData.imageUrl ? (
                          <img src={previewUrl || formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-gray-300" />
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <Upload className="w-6 h-6 text-white" />
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Click to upload or drag image</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest italic px-1">Image URL (Optional Alternative)</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-medium"
                        value={formData.imageUrl}
                        onChange={(e) => {
                          setFormData({ ...formData, imageUrl: e.target.value });
                          setPreviewUrl(null);
                          setSelectedFile(null);
                        }}
                        placeholder="https://images.unsplash.com/..."
                      />
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCatModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 font-display">New Category Node</h3>
              <form onSubmit={handleSaveCategory} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic px-1">Category Label</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-pink-50 border border-pink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-medium"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="E.g. Electronics"
                  />
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="flex-1 py-4 bg-pink-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-pink-200 hover:bg-pink-500 active:scale-95">Initialize Node</button>
                  <button type="button" onClick={() => setCatModalOpen(false)} className="px-6 py-4 text-slate-400 font-bold hover:text-pink-600 transition-colors uppercase text-[10px] tracking-widest">Discard</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Supplier Modal */}
      <AnimatePresence>
        {supModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSupModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 font-display">New Supplier Entity</h3>
              <form onSubmit={handleSaveSupplier} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic px-1">Entity Name</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-pink-50 border border-pink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-medium"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="E.g. Cathtea Supply Co"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic px-1">Communication Channel</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-pink-50 border border-pink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-medium"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="Email or Protocol Addr"
                  />
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="flex-1 py-4 bg-pink-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-pink-200 hover:bg-pink-500 active:scale-95">Initialize Entity</button>
                  <button type="button" onClick={() => setSupModalOpen(false)} className="px-6 py-4 text-slate-400 font-bold hover:text-pink-600 transition-colors uppercase text-[10px] tracking-widest">Discard</button>
                </div>
              </form>
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
                  <h3 className="text-xl font-bold text-gray-900 font-display italic uppercase tracking-tight">Inventory Audit Protocol</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Temporal Registry of Asset Dynamics</p>
                </div>
                <button onClick={() => setAuditLogsOpen(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all">
                   <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                {logsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-pink-500/10 border-t-pink-500 rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing logs...</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 font-black uppercase text-xs tracking-widest italic">
                    No registry entries localized
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="p-6 bg-[#FAF9F6] border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-pink-200 transition-all duration-500 shadow-sm">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                            log.changeType === 'creation' ? 'bg-emerald-50 text-emerald-500' : 
                            log.changeType === 'sale' ? 'bg-amber-50 text-amber-500' : 'bg-pink-50 text-pink-500'
                          }`}>
                            <ArrowRightLeft className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-900 italic tracking-tight uppercase">{log.productName}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{log.username}</p>
                               <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-10">
                           <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Flux Delta</p>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-bold text-slate-300">{log.oldStock}</span>
                                <ArrowRightLeft className="w-3 h-3 text-pink-200" />
                                <span className="text-base font-mono font-black text-pink-600 italic">{log.newStock}</span>
                              </div>
                           </div>
                           <div className="px-4 py-2 bg-white border border-pink-100 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest italic group-hover:text-pink-500 group-hover:border-pink-200 transition-all">
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
    </div>
  );
}
