import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev-only";
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || "captcha-secret-key";

/*
  --- SUPABASE SQL SCHEMA ---
  Run this in your Supabase SQL Editor:

  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    store_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES users(id),
    shift_pin TEXT DEFAULT '1234',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id),
    name TEXT NOT NULL,
    contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'product',
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    category_id UUID REFERENCES categories(id),
    supplier_id UUID REFERENCES suppliers(id),
    image_url TEXT,
    low_stock_threshold INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    store_id UUID REFERENCES stores(id),
    opening_balance DECIMAL(10,2) NOT NULL,
    shift_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    open_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    close_time TIMESTAMP WITH TIME ZONE,
    closing_cash DECIMAL(10,2),
    expected_cash DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    store_id UUID REFERENCES stores(id),
    shift_id UUID REFERENCES shifts(id),
    total DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    amount_received DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    payment_method TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id),
    store_id UUID REFERENCES stores(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_at_sale DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    store_id UUID REFERENCES stores(id),
    user_id UUID REFERENCES users(id),
    old_stock INTEGER,
    new_stock INTEGER,
    change_type TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- RPC FUNCTIONS --
  
  CREATE OR REPLACE FUNCTION get_sold_counts(store_id_param UUID)
  RETURNS TABLE(product_id UUID, count BIGINT) AS $$
  BEGIN
    RETURN QUERY
    SELECT si.product_id, SUM(si.quantity)::BIGINT as count
    FROM sale_items si
    WHERE si.store_id = store_id_param
    GROUP BY si.product_id;
  END;
  $$ LANGUAGE plpgsql;

  CREATE OR REPLACE FUNCTION get_staff_count(store_id_param UUID)
  RETURNS BIGINT AS $$
  BEGIN
    RETURN (
      SELECT COUNT(*)::BIGINT
      FROM users
      WHERE store_id_param = ANY(store_ids)
    );
  END;
  $$ LANGUAGE plpgsql;
*/

const app = express();
app.use(cors());
app.use(express.json());

// Multi-tenant check
const router = express.Router();

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const checkStoreAccess = async (req: any, res: any, next: any) => {
  const storeId = req.headers['x-store-id'];
  if (!storeId) return res.status(400).json({ error: "Store ID is required in headers (x-store-id)" });
  
  // To avoid stale JWT issues (e.g. after creating a store), we fetch the user's current store_ids from the DB
  const { data: user, error } = await supabase.from('users').select('store_ids, role').eq('id', req.user.id).single();
  
  if (error || !user) {
    return res.status(401).json({ error: "User profile not found" });
  }

  // Update req.user with fresh data for subsequent middlewares (like isAdmin)
  req.user = { ...req.user, ...user };

  if (!user.store_ids?.includes(storeId) && user.role !== 'admin') {
    return res.status(403).json({ error: "Access to this store is denied" });
  }
  
  req.storeId = storeId;
  next();
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: "Admin access required" });
  next();
};

const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const verifyCaptcha = (req: any, res: any, next: any) => {
  const { captchaAnswer, captchaToken } = req.body;
  if (!captchaAnswer || !captchaToken) {
    return res.status(400).json({ error: "Captcha is required" });
  }

  try {
    const decoded: any = jwt.verify(captchaToken, CAPTCHA_SECRET);
    if (String(decoded.code).toUpperCase() !== String(captchaAnswer).toUpperCase()) {
      return res.status(400).json({ error: "Invalid captcha" });
    }
    next();
  } catch (err) {
    return res.status(400).json({ error: "Captcha expired or invalid" });
  }
};

// --- API Routes ---

router.get("/auth/captcha", (req, res) => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const captchaToken = jwt.sign({ code }, CAPTCHA_SECRET, { expiresIn: '5m' });

  res.json({ question: code, captchaToken });
});

router.post("/auth/signup",
  [
    body('username').isString().trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6 }),
    verifyCaptcha,
    validate
  ],
  async (req: any, res: any) => {
    const { username, email, password } = req.body;
    
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle(); // maybeSingle returns null without error if no rows found
    
    if (existingUser) return res.status(400).json({ error: "Username or email already exists" });

    const { data: newUser, error } = await supabase.from('users').insert([{
      username,
      email,
      password: bcrypt.hashSync(password, 10),
      role: 'admin',
      store_ids: []
    }]).select().single();

    if (error) return res.status(400).json({ error: error.message });

    const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role, store_ids: newUser.store_ids }, JWT_SECRET);
    res.json({ 
      token, 
      user: { id: newUser.id, username: newUser.username, role: newUser.role, store_ids: newUser.store_ids },
      stores: []
    });
  }
);

router.post("/auth/login", 
  [
    body('username').isString().trim(),
    body('password').isString(),
    verifyCaptcha,
    validate
  ],
  async (req: any, res: any) => {
    const { username, password } = req.body;
    
    const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (!user || error) return res.status(400).json({ error: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: "Invalid password" });

    const { data: userStores } = await supabase.from('stores').select('*').in('id', user.store_ids || []);

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, store_ids: user.store_ids }, JWT_SECRET);
    res.json({ 
      token, 
      user: { id: user.id, username: user.username, role: user.role, store_ids: user.store_ids },
      stores: userStores || []
    });
  }
);

router.get("/stores", authenticateToken, async (req: any, res) => {
  const { data: user } = await supabase.from('users').select('store_ids').eq('id', req.user.id).single();
  const storeIds = user?.store_ids || [];
  const { data: userStores } = await supabase.from('stores').select('*').in('id', storeIds);
  res.json(userStores || []);
});

router.post("/stores", authenticateToken, [body('name').notEmpty(), validate], async (req: any, res) => {
  const { data: newStore, error: storeError } = await supabase.from('stores').insert([{
    name: req.body.name,
    owner_id: req.user.id,
    shift_pin: req.body.shift_pin || '1234'
  }]).select().single();

  if (storeError) return res.status(400).json({ error: storeError.message });
  
  // Update user's store_ids
  const newStoreIds = [...(req.user.store_ids || []), newStore.id];
  await supabase.from('users').update({ store_ids: newStoreIds }).eq('id', req.user.id);
  
  res.json(newStore);
});

router.put("/stores/:id", authenticateToken, [body('name').notEmpty(), validate], async (req: any, res: any) => {
  const { data: store } = await supabase.from('stores').select('*').eq('id', req.params.id).single();
  if (!store) return res.status(404).json({ error: "Store not found" });
  
  if (store.owner_id !== req.user.id && req.user.role !== 'admin') {
     return res.status(403).json({ error: "Unauthorized to edit this store" });
  }

  const { data: updatedStore } = await supabase.from('stores').update({
    name: req.body.name,
    shift_pin: req.body.shift_pin || store.shift_pin
  }).eq('id', req.params.id).select().single();

  res.json(updatedStore);
});

router.delete("/stores/:id", authenticateToken, async (req: any, res: any) => {
  const { data: store } = await supabase.from('stores').select('*').eq('id', req.params.id).single();
  if (!store) return res.status(404).json({ error: "Store not found" });

  if (store.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Unauthorized to delete this store" });
  }

  await supabase.from('stores').delete().eq('id', req.params.id);
  res.json({ success: true });
});

router.get("/products", authenticateToken, checkStoreAccess, async (req: any, res) => {
  const { data: storeProducts } = await supabase.from('products').select('*, categories(name), suppliers(name)').eq('store_id', req.storeId);
  const { data: soldCounts } = await supabase.rpc('get_sold_counts', { store_id_param: req.storeId });

  const formatted = storeProducts?.map(p => ({
    ...p,
    categoryName: (p as any).categories?.name,
    supplierName: (p as any).suppliers?.name,
    soldCount: soldCounts?.find((s: any) => s.product_id === p.id)?.count || 0
  }));
  res.json(formatted || []);
});

router.post("/products", authenticateToken, checkStoreAccess, isAdmin, [body('name').notEmpty(), body('price').isFloat(), body('stock').isInt(), validate], async (req: any, res: any) => {
  const { name, price, stock, categoryId, supplierId, imageUrl, lowStockThreshold, type } = req.body;
  const { data: newProduct } = await supabase.from('products').insert([{
    store_id: req.storeId,
    name,
    type: type || 'product',
    price: Number(price),
    stock: Number(stock),
    category_id: categoryId || null,
    supplier_id: supplierId || null,
    image_url: imageUrl || null,
    low_stock_threshold: Number(lowStockThreshold) || 5
  }]).select().single();

  await supabase.from('inventory_logs').insert([{
    product_id: newProduct.id,
    store_id: req.storeId,
    user_id: req.user.id,
    old_stock: 0,
    new_stock: stock,
    change_type: 'creation'
  }]);

  res.json({ id: newProduct.id });
});

router.put("/products/:id", authenticateToken, checkStoreAccess, isAdmin, async (req: any, res: any) => {
  const { data: product } = await supabase.from('products').select('*').eq('id', req.params.id).eq('store_id', req.storeId).single();
  if (!product) return res.status(404).json({ error: "Product not found" });

  const { name, price, stock, categoryId, supplierId, imageUrl, lowStockThreshold, type } = req.body;
  const oldStock = product.stock;

  await supabase.from('products').update({
    name,
    type: type || product.type,
    price: Number(price),
    stock: Number(stock),
    category_id: categoryId || null,
    supplier_id: supplierId || null,
    image_url: imageUrl || null,
    low_stock_threshold: Number(lowStockThreshold) || 5
  }).eq('id', req.params.id);

  if (oldStock !== Number(stock)) {
    await supabase.from('inventory_logs').insert([{
      product_id: req.params.id,
      store_id: req.storeId,
      user_id: req.user.id,
      old_stock: oldStock,
      new_stock: Number(stock),
      change_type: 'manual_update'
    }]);
  }

  res.json({ success: true });
});

router.delete("/products/:id", authenticateToken, checkStoreAccess, isAdmin, async (req: any, res: any) => {
  const { data: used } = await supabase.from('sale_items').select('id').eq('product_id', req.params.id).limit(1);
  if (used && used.length > 0) return res.status(400).json({ error: "Cannot delete product with sales history" });

  await supabase.from('products').delete().eq('id', req.params.id).eq('store_id', req.storeId);
  res.json({ success: true });
});

router.get("/categories", authenticateToken, checkStoreAccess, async (req: any, res) => {
  const { data } = await supabase.from('categories').select('*').eq('store_id', req.storeId);
  res.json(data || []);
});

router.post("/categories", authenticateToken, checkStoreAccess, isAdmin, async (req: any, res) => {
  const { data } = await supabase.from('categories').insert([{ store_id: req.storeId, name: req.body.name }]).select().single();
  res.json({ id: data.id });
});

router.get("/suppliers", authenticateToken, checkStoreAccess, async (req: any, res) => {
  const { data } = await supabase.from('suppliers').select('*').eq('store_id', req.storeId);
  res.json(data || []);
});

router.post("/suppliers", authenticateToken, checkStoreAccess, isAdmin, async (req: any, res) => {
  const { data } = await supabase.from('suppliers').insert([{ store_id: req.storeId, name: req.body.name, contact: req.body.contact }]).select().single();
  res.json({ id: data.id });
});

router.get("/shifts/current", authenticateToken, checkStoreAccess, async (req: any, res) => {
  const { data } = await supabase.from('shifts').select('*').eq('user_id', req.user.id).eq('store_id', req.storeId).eq('status', 'open').single();
  res.json(data || null);
});

router.post("/shifts/open", authenticateToken, checkStoreAccess, async (req: any, res: any) => {
  const { data: existing } = await supabase.from('shifts').select('id').eq('user_id', req.user.id).eq('store_id', req.storeId).eq('status', 'open').single();
  if (existing) return res.status(400).json({ error: "Shift already active" });

  const { data: store } = await supabase.from('stores').select('shift_pin').eq('id', req.storeId).single();
  if (store?.shift_pin && store.shift_pin !== req.body.shift_code) return res.status(401).json({ error: "Invalid shift code" });

  const { data: newShift } = await supabase.from('shifts').insert([{
    user_id: req.user.id,
    store_id: req.storeId,
    opening_balance: Number(req.body.opening_balance),
    shift_code: req.body.shift_code,
    status: 'open'
  }]).select().single();

  res.json({ id: newShift.id });
});

router.post("/shifts/close", authenticateToken, checkStoreAccess, async (req: any, res: any) => {
  const { data: shift } = await supabase.from('shifts').select('*').eq('id', req.body.shift_id).eq('store_id', req.storeId).single();
  if (!shift) return res.status(404).json({ error: "Shift not found" });

  const { data: shiftSales } = await supabase.from('sales').select('total').eq('shift_id', req.body.shift_id);
  const salesTotal = shiftSales?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
  const expected = Number(shift.opening_balance) + salesTotal;

  const { data: updated } = await supabase.from('shifts').update({
    status: 'closed',
    close_time: new Date().toISOString(),
    closing_cash: Number(req.body.closing_cash),
    expected_cash: expected
  }).eq('id', req.body.shift_id).select().single();

  res.json({ expected, variance: Number(req.body.closing_cash) - expected });
});

router.post("/sales", authenticateToken, checkStoreAccess, async (req: any, res: any) => {
  const { items, total, discount, tax, payment_method, shift_id, amount_received, change_amount } = req.body;
  if (!shift_id) return res.status(400).json({ error: "No active shift" });

  const { data: sale, error: saleError } = await supabase.from('sales').insert([{
    user_id: req.user.id,
    store_id: req.storeId,
    shift_id,
    total: Number(total),
    discount: Number(discount) || 0,
    tax: Number(tax) || 0,
    payment_method,
    amount_received: Number(amount_received),
    change_amount: Number(change_amount)
  }]).select().single();

  if (saleError) return res.status(400).json({ error: saleError.message });

  for (const item of items) {
    const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
    if (prod) {
      const oldStock = prod.stock;
      const newStock = oldStock - item.quantity;
      await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
      
      await supabase.from('sale_items').insert([{
        sale_id: sale.id,
        store_id: req.storeId,
        product_id: item.id,
        quantity: item.quantity,
        price_at_sale: item.price
      }]);

      await supabase.from('inventory_logs').insert([{
        product_id: item.id,
        store_id: req.storeId,
        user_id: req.user.id,
        old_stock: oldStock,
        new_stock: newStock,
        change_type: 'sale'
      }]);
    }
  }

  res.json({ id: sale.id });
});

router.get("/sales/history", authenticateToken, checkStoreAccess, async (req: any, res) => {
  const { data } = await supabase.from('sales').select('*, users(username)').eq('store_id', req.storeId).order('timestamp', { ascending: false }).limit(100);
  const formatted = data?.map(s => ({ ...s, cashierName: (s as any).users?.username }));
  res.json(formatted || []);
});

router.get("/sales/:id", authenticateToken, checkStoreAccess, async (req: any, res) => {
  const { data: sale } = await supabase.from('sales').select('*, users(username)').eq('id', req.params.id).eq('store_id', req.storeId).single();
  if (!sale) return res.status(404).json({ error: "Sale not found" });

  const { data: items } = await supabase.from('sale_items').select('*, products(name)').eq('sale_id', sale.id);
  const formattedItems = items?.map(si => ({ ...si, name: (si as any).products?.name }));

  res.json({ ...sale, cashierName: (sale as any).users?.username, items: formattedItems });
});

router.get("/products/:id/logs", authenticateToken, checkStoreAccess, async (req: any, res: any) => {
  const { data } = await supabase.from('inventory_logs').select('*, users(username)').eq('product_id', req.params.id).eq('store_id', req.storeId).order('timestamp', { ascending: false });
  const formatted = data?.map(l => ({ ...l, username: (l as any).users?.username || 'Unknown' }));
  res.json(formatted || []);
});

router.get("/inventory/logs", authenticateToken, checkStoreAccess, isAdmin, async (req: any, res) => {
  const { data } = await supabase.from('inventory_logs').select('*, products(name), users(username)').eq('store_id', req.storeId).order('timestamp', { ascending: false }).limit(100);
  const formatted = data?.map(l => ({
    ...l,
    productName: (l as any).products?.name,
    username: (l as any).users?.username
  }));
  res.json(formatted || []);
});

router.post("/upload", authenticateToken, (req: any, res: any) => {
  const query = req.body.query || 'product';
  // Use a better unsplash search URL
  res.json({ imageUrl: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop` });
});

router.get("/generate-image", authenticateToken, (req: any, res: any) => {
  const query = req.query.q || 'beverage';
  const encodedQuery = encodeURIComponent(query);
  // Lorem flickr is more reliable for dynamic images by keyword
  res.json({ imageUrl: `https://loremflickr.com/800/800/${encodedQuery}` });
});

router.get("/analytics/summary", authenticateToken, checkStoreAccess, isAdmin, async (req: any, res) => {
  // Simplistic analytics via Supabase
  const { data: salesHistory } = await supabase.from('sales').select('total, timestamp').eq('store_id', req.storeId);
  const { data: productsList } = await supabase.from('products').select('stock, low_stock_threshold').eq('store_id', req.storeId);
  const { data: usersCount } = await supabase.rpc('get_staff_count', { store_id_param: req.storeId });

  // Today stats
  const today = new Date().toISOString().split('T')[0];
  const todaySales = salesHistory?.filter(s => s.timestamp.startsWith(today)) || [];
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
  const lowStock = productsList?.filter(p => p.stock <= p.low_stock_threshold).length || 0;

  res.json({
    daily: [], // Client can calculate or we do more complex RPCs
    categories: [],
    bestSellers: [],
    general: {
      todaySalesCount: todaySales.length,
      todayRevenue,
      totalProducts: productsList?.length || 0,
      lowStockCount: lowStock,
      totalStaff: usersCount || 0
    }
  });
});

app.use('/api', router);
app.use('/', router);

export default app;
