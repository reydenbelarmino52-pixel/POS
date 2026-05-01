import "dotenv/config";
import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev-only";

// --- Mock Data Store (Reset on each function execution in Serverless) ---
let stores = [
  { id: 'store-1', name: 'Cathtea Main Branch', ownerId: 'admin-user', createdAt: new Date().toISOString() }
];

let users = [
  {
    id: 'admin-user',
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    storeIds: ['store-1'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'cashier-user',
    username: 'cashier',
    password: bcrypt.hashSync('cashier123', 10),
    role: 'cashier',
    storeIds: ['store-1'],
    createdAt: new Date().toISOString()
  }
];

let categories = [
  { id: 'cat-1', storeId: 'store-1', name: 'Milk Tea', createdAt: new Date().toISOString() },
  { id: 'cat-2', storeId: 'store-1', name: 'Burgers', createdAt: new Date().toISOString() },
  { id: 'cat-3', storeId: 'store-1', name: 'Fries', createdAt: new Date().toISOString() },
  { id: 'cat-4', storeId: 'store-1', name: 'Footlong', createdAt: new Date().toISOString() },
  { id: 'cat-5', storeId: 'store-1', name: 'Add-ons', createdAt: new Date().toISOString() }
];

let suppliers = [
  { id: 'sup-1', storeId: 'store-1', name: 'Main Distribution Co.', contact: '555-0100', createdAt: new Date().toISOString() }
];

let products = [
  {
    id: 'prod-1',
    storeId: 'store-1',
    name: 'Classic Pearl Milk Tea',
    price: 3.50,
    stock: 50,
    categoryId: 'cat-1',
    supplierId: 'sup-1',
    imageUrl: null,
    lowStockThreshold: 10,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    storeId: 'store-1',
    name: 'Taro Milk Tea',
    price: 3.75,
    stock: 30,
    categoryId: 'cat-1',
    supplierId: 'sup-1',
    imageUrl: null,
    lowStockThreshold: 10,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-3',
    storeId: 'store-1',
    name: 'Cheese Burger',
    price: 4.50,
    stock: 20,
    categoryId: 'cat-2',
    supplierId: 'sup-1',
    imageUrl: null,
    lowStockThreshold: 5,
    createdAt: new Date().toISOString()
  }
];

let shifts: any[] = [];
let sales: any[] = [];
let saleItems: any[] = [];
let inventoryLogs: any[] = [];

const app = express();

// Use CORS
app.use(cors());
app.use(express.json());

// Debug log for Vercel
app.use((req, res, next) => {
  console.log(`[API Request] ${req.method} ${req.url}`);
  next();
});

const router = express.Router();

// --- Middleware ---
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

const checkStoreAccess = (req: any, res: any, next: any) => {
  const storeId = req.headers['x-store-id'];
  if (!storeId) return res.status(400).json({ error: "Store ID is required in headers (x-store-id)" });
  
  if (!req.user.storeIds?.includes(storeId)) {
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

// --- API Routes on Router ---

router.get("/health/mock", (req, res) => {
  res.json({ status: "ok", provider: "mock-serverless" });
});

router.post("/auth/login", 
  [
    body('username').isString().trim(),
    body('password').isString(),
    validate
  ],
  async (req: any, res: any) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username);
    if (!user) return res.status(400).json({ error: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: "Invalid password" });

    const userStores = stores.filter(s => user.storeIds?.includes(s.id));

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, storeIds: user.storeIds }, JWT_SECRET);
    res.json({ 
      token, 
      user: { id: user.id, username: user.username, role: user.role, storeIds: user.storeIds },
      stores: userStores
    });
  }
);

// Store Management
router.get("/stores", authenticateToken, (req: any, res) => {
  const userStores = stores.filter(s => req.user.storeIds?.includes(s.id));
  res.json(userStores);
});

router.post("/stores", authenticateToken, [body('name').notEmpty(), validate], (req: any, res) => {
  const newStore = {
    id: uuidv4(),
    name: req.body.name,
    ownerId: req.user.id,
    createdAt: new Date().toISOString()
  };
  stores.push(newStore);
  
  // Update user's storeIds
  const user = users.find(u => u.id === req.user.id);
  if (user) {
    if (!user.storeIds) user.storeIds = [];
    user.storeIds.push(newStore.id);
  }
  
  res.json(newStore);
});

// Products
router.get("/products", authenticateToken, checkStoreAccess, (req: any, res) => {
  const storeProducts = products.filter(p => p.storeId === req.storeId);
  const formattedProducts = storeProducts.map(p => ({
    ...p,
    categoryName: categories.find(c => c.id === p.categoryId)?.name,
    supplierName: suppliers.find(s => s.id === p.supplierId)?.name
  }));
  res.json(formattedProducts);
});

router.post("/products", 
  authenticateToken, 
  checkStoreAccess,
  isAdmin, 
  [
    body('name').isString().trim().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('stock').isInt({ min: 0 }),
    validate
  ],
  (req: any, res: any) => {
    const { name, price, stock, categoryId, supplierId, imageUrl, lowStockThreshold } = req.body;
    const newProduct = {
      id: uuidv4(),
      storeId: req.storeId,
      name,
      price: Number(price),
      stock: Number(stock),
      categoryId: categoryId || null,
      supplierId: supplierId || null,
      imageUrl: imageUrl || null,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    
    inventoryLogs.push({
      id: uuidv4(),
      productId: newProduct.id,
      storeId: req.storeId,
      userId: req.user.id,
      oldStock: 0,
      newStock: stock,
      changeType: 'creation',
      timestamp: new Date().toISOString()
    });

    res.json({ id: newProduct.id });
  }
);

router.put("/products/:id", authenticateToken, checkStoreAccess, isAdmin, (req: any, res: any) => {
  const idx = products.findIndex(p => p.id === req.params.id && p.storeId === req.storeId);
  if (idx === -1) return res.status(404).json({ error: "Product not found in this store" });

  const oldStock = products[idx].stock;
  const { name, price, stock, categoryId, supplierId, imageUrl, lowStockThreshold } = req.body;

  products[idx] = {
    ...products[idx],
    name,
    price: Number(price),
    stock: Number(stock),
    categoryId: categoryId || null,
    supplierId: supplierId || null,
    imageUrl: imageUrl || null,
    lowStockThreshold: Number(lowStockThreshold) || 5
  };

  if (oldStock !== Number(stock)) {
    inventoryLogs.push({
      id: uuidv4(),
      productId: req.params.id,
      storeId: req.storeId,
      userId: req.user.id,
      oldStock: oldStock,
      newStock: Number(stock),
      changeType: 'manual_update',
      timestamp: new Date().toISOString()
    });
  }

  res.json({ success: true });
});

router.delete("/products/:id", authenticateToken, checkStoreAccess, isAdmin, (req: any, res: any) => {
  const isUsed = saleItems.some(item => item.productId === req.params.id);
  if (isUsed) return res.status(400).json({ error: "Cannot delete product with sales history" });

  products = products.filter(p => !(p.id === req.params.id && p.storeId === req.storeId));
  res.json({ success: true });
});

// Categories & Suppliers
router.get("/categories", authenticateToken, checkStoreAccess, (req: any, res) => {
  res.json(categories.filter(c => c.storeId === req.storeId));
});

router.post("/categories", authenticateToken, checkStoreAccess, isAdmin, [body('name').notEmpty(), validate], (req: any, res) => {
  const newCat = { id: uuidv4(), storeId: req.storeId, name: req.body.name, createdAt: new Date().toISOString() };
  categories.push(newCat);
  res.json({ id: newCat.id });
});

router.get("/suppliers", authenticateToken, checkStoreAccess, (req: any, res) => {
  res.json(suppliers.filter(s => s.storeId === req.storeId));
});

router.post("/suppliers", authenticateToken, checkStoreAccess, isAdmin, [body('name').notEmpty(), validate], (req: any, res) => {
  const newSup = { id: uuidv4(), storeId: req.storeId, name: req.body.name, contact: req.body.contact, createdAt: new Date().toISOString() };
  suppliers.push(newSup);
  res.json({ id: newSup.id });
});

// Shifts
router.get("/shifts/current", authenticateToken, checkStoreAccess, (req: any, res) => {
  const shift = shifts.find(s => s.userId === req.user.id && s.storeId === req.storeId && s.status === 'open');
  res.json(shift || null);
});

router.post("/shifts/open", authenticateToken, checkStoreAccess, [body('opening_balance').isFloat(), validate], (req: any, res: any) => {
  const existing = shifts.find(s => s.userId === req.user.id && s.storeId === req.storeId && s.status === 'open');
  if (existing) return res.status(400).json({ error: "Shift already active in this store" });

  const newShift = {
    id: uuidv4(),
    userId: req.user.id,
    storeId: req.storeId,
    openingBalance: Number(req.body.opening_balance),
    status: 'open',
    openTime: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  shifts.push(newShift);
  res.json({ id: newShift.id });
});

router.post("/shifts/close", authenticateToken, checkStoreAccess, [body('closing_cash').isFloat(), body('shift_id').isString(), validate], (req: any, res: any) => {
  const shift = shifts.find(s => s.id === req.body.shift_id && s.storeId === req.storeId);
  if (!shift) return res.status(404).json({ error: "Shift not found in this store" });

  const salesInShift = sales.filter(s => s.shiftId === req.body.shift_id);
  const salesTotal = salesInShift.reduce((sum, s) => sum + s.total, 0);
  const expected = shift.openingBalance + salesTotal;

  shift.status = 'closed';
  shift.closeTime = new Date().toISOString();
  shift.closingCash = Number(req.body.closing_cash);
  shift.expectedCash = expected;

  res.json({ expected, variance: Number(req.body.closing_cash) - expected });
});

// Sales
router.post("/sales", authenticateToken, checkStoreAccess, [body('items').isArray(), body('total').isFloat(), validate], (req: any, res: any) => {
  const { items, total, discount, tax, payment_method, shift_id, amount_received, change_amount } = req.body;
  
  if (!shift_id) return res.status(400).json({ error: "No active shift" });

  const saleId = uuidv4();
  const timestamp = new Date().toISOString();

  // Deduct stock and log
  for (const item of items) {
    const product = products.find(p => p.id === item.id && p.storeId === req.storeId);
    if (!product) continue;
    
    const oldStock = product.stock;
    product.stock -= item.quantity;

    saleItems.push({
      id: uuidv4(),
      saleId,
      storeId: req.storeId,
      productId: item.id,
      quantity: item.quantity,
      priceAtSale: item.price,
      createdAt: timestamp
    });

    inventoryLogs.push({
      id: uuidv4(),
      productId: item.id,
      storeId: req.storeId,
      userId: req.user.id,
      oldStock,
      newStock: product.stock,
      changeType: 'sale',
      timestamp
    });
  }

  sales.push({
    id: saleId,
    userId: req.user.id,
    storeId: req.storeId,
    shiftId: shift_id,
    total: Number(total),
    discount: Number(discount) || 0,
    tax: Number(tax) || 0,
    amountReceived: Number(amount_received) || Number(total),
    changeAmount: Number(change_amount) || 0,
    paymentMethod: payment_method,
    timestamp
  });

  res.json({ id: saleId });
});

router.get("/sales/history", authenticateToken, checkStoreAccess, (req: any, res) => {
  const history = sales
    .filter(s => s.storeId === req.storeId)
    .map(s => ({
      ...s,
      cashierName: users.find(u => u.id === s.userId)?.username
    })).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100);
  res.json(history);
});

router.get("/sales/:id", authenticateToken, checkStoreAccess, (req: any, res) => {
  const sale = sales.find(s => s.id === req.params.id && s.storeId === req.storeId);
  if (!sale) return res.status(404).json({ error: "Sale not found in this store" });

  const items = saleItems.filter(si => si.saleId === sale.id).map(si => ({
    ...si,
    name: products.find(p => p.id === si.productId)?.name
  }));

  res.json({
    ...sale,
    cashierName: users.find(u => u.id === sale.userId)?.username,
    items
  });
});

router.get("/inventory/logs", authenticateToken, checkStoreAccess, isAdmin, (req: any, res) => {
  const logs = inventoryLogs
    .filter(l => l.storeId === req.storeId)
    .map(l => ({
      ...l,
      productName: products.find(p => p.id === l.productId)?.name,
      username: users.find(u => u.id === l.userId)?.username
    })).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100);
  res.json(logs);
});

// Analytics
router.get("/analytics/summary", authenticateToken, checkStoreAccess, isAdmin, (req: any, res) => {
  const storeSales = sales.filter(s => s.storeId === req.storeId);
  const storeSaleItems = saleItems.filter(si => si.storeId === req.storeId);
  const storeProducts = products.filter(p => p.storeId === req.storeId);
  
  const dailyMap: any = {};
  storeSales.forEach(s => {
    const date = s.timestamp.split('T')[0];
    if (!dailyMap[date]) dailyMap[date] = { revenue: 0, count: 0 };
    dailyMap[date].revenue += s.total;
    dailyMap[date].count += 1;
  });

  const daily = Object.entries(dailyMap).map(([sale_date, vals]: [string, any]) => ({
    sale_date,
    revenue: vals.revenue,
    count: vals.count
  })).sort((a, b) => a.sale_date.localeCompare(b.sale_date)).slice(-30);

  const catMap: any = {};
  const bsMap: any = {};
  storeSaleItems.forEach(si => {
    const product = storeProducts.find(p => p.id === si.productId);
    const cat = categories.find(c => c.id === product?.categoryId)?.name || 'Uncategorized';
    const name = product?.name || 'Unknown';

    catMap[cat] = (catMap[cat] || 0) + (si.quantity * si.priceAtSale);
    if (!bsMap[name]) bsMap[name] = { sold: 0, revenue: 0 };
    bsMap[name].sold += si.quantity;
    bsMap[name].revenue += (si.quantity * si.priceAtSale);
  });

  const categoriesFlat = Object.entries(catMap).map(([name, value]) => ({ name, value }));
  const bestSellers = Object.entries(bsMap).map(([name, vals]: [string, any]) => ({
    name, totalSold: vals.sold, totalRevenue: vals.revenue
  })).sort((a, b) => b.totalSold - a.totalSold).slice(0, 5);

  const today = new Date().toISOString().split('T')[0];
  const lowStockCount = storeProducts.filter(p => p.stock <= p.lowStockThreshold).length;

  res.json({
    daily,
    categories: categoriesFlat,
    bestSellers,
    general: {
      todaySalesCount: dailyMap[today]?.count || 0,
      todayRevenue: dailyMap[today]?.revenue || 0,
      totalProducts: storeProducts.length,
      lowStockCount: lowStockCount,
      totalStaff: users.filter(u => u.storeIds?.includes(req.storeId)).length
    }
  });
});

// Mount router on both /api and /
app.use('/api', router);
app.use('/', router);

export default app;

