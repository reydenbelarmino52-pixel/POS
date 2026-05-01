import "dotenv/config";
import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev-only";

// --- Mock Data Store (Reset on each function execution in Serverless) ---
let users = [
  {
    id: 'admin-user',
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cashier-user',
    username: 'cashier',
    password: bcrypt.hashSync('cashier123', 10),
    role: 'cashier',
    createdAt: new Date().toISOString()
  }
];

let categories = [
  { id: 'cat-1', name: 'Milk Tea', createdAt: new Date().toISOString() },
  { id: 'cat-2', name: 'Burgers', createdAt: new Date().toISOString() },
  { id: 'cat-3', name: 'Fries', createdAt: new Date().toISOString() },
  { id: 'cat-4', name: 'Footlong', createdAt: new Date().toISOString() },
  { id: 'cat-5', name: 'Add-ons', createdAt: new Date().toISOString() }
];

let suppliers = [
  { id: 'sup-1', name: 'Main Distribution Co.', contact: '555-0100', createdAt: new Date().toISOString() }
];

let products = [
  {
    id: 'prod-1',
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
app.use(express.json());

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

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: "Admin access required" });
  next();
};

const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// --- API Routes ---

app.get("/api/health/mock", (req, res) => {
  res.json({ status: "ok", provider: "mock-serverless" });
});

app.post("/api/auth/login", 
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

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  }
);

// Products
app.get("/api/products", authenticateToken, (req, res) => {
  const formattedProducts = products.map(p => ({
    ...p,
    category_name: categories.find(c => c.id === p.categoryId)?.name,
    supplier_name: suppliers.find(s => s.id === p.supplierId)?.name
  }));
  res.json(formattedProducts);
});

app.post("/api/products", 
  authenticateToken, 
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
      userId: req.user.id,
      oldStock: 0,
      newStock: stock,
      changeType: 'creation',
      timestamp: new Date().toISOString()
    });

    res.json({ id: newProduct.id });
  }
);

app.put("/api/products/:id", authenticateToken, isAdmin, (req: any, res: any) => {
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });

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
      userId: req.user.id,
      oldStock: oldStock,
      newStock: Number(stock),
      changeType: 'manual_update',
      timestamp: new Date().toISOString()
    });
  }

  res.json({ success: true });
});

app.delete("/api/products/:id", authenticateToken, isAdmin, (req, res) => {
  const isUsed = saleItems.some(item => item.productId === req.params.id);
  if (isUsed) return res.status(400).json({ error: "Cannot delete product with sales history" });

  products = products.filter(p => p.id !== req.params.id);
  res.json({ success: true });
});

// Categories & Suppliers
app.get("/api/categories", authenticateToken, (req, res) => res.json(categories));
app.post("/api/categories", authenticateToken, isAdmin, [body('name').notEmpty(), validate], (req, res) => {
  const newCat = { id: uuidv4(), name: req.body.name, createdAt: new Date().toISOString() };
  categories.push(newCat);
  res.json({ id: newCat.id });
});

app.get("/api/suppliers", authenticateToken, (req, res) => res.json(suppliers));
app.post("/api/suppliers", authenticateToken, isAdmin, [body('name').notEmpty(), validate], (req, res) => {
  const newSup = { id: uuidv4(), name: req.body.name, contact: req.body.contact, createdAt: new Date().toISOString() };
  suppliers.push(newSup);
  res.json({ id: newSup.id });
});

// Shifts
app.get("/api/shifts/current", authenticateToken, (req: any, res) => {
  const shift = shifts.find(s => s.userId === req.user.id && s.status === 'open');
  res.json(shift || null);
});

app.post("/api/shifts/open", authenticateToken, [body('opening_balance').isFloat(), validate], (req: any, res: any) => {
  const existing = shifts.find(s => s.userId === req.user.id && s.status === 'open');
  if (existing) return res.status(400).json({ error: "Shift already active" });

  const newShift = {
    id: uuidv4(),
    userId: req.user.id,
    openingBalance: Number(req.body.opening_balance),
    status: 'open',
    openTime: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  shifts.push(newShift);
  res.json({ id: newShift.id });
});

app.post("/api/shifts/close", authenticateToken, [body('closing_cash').isFloat(), body('shift_id').isString(), validate], (req: any, res: any) => {
  const shift = shifts.find(s => s.id === req.body.shift_id);
  if (!shift) return res.status(404).json({ error: "Shift not found" });

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
app.post("/api/sales", authenticateToken, [body('items').isArray(), body('total').isFloat(), validate], (req: any, res: any) => {
  const { items, total, discount, tax, payment_method, shift_id, amount_received, change_amount } = req.body;
  
  if (!shift_id) return res.status(400).json({ error: "No active shift" });

  const saleId = uuidv4();
  const timestamp = new Date().toISOString();

  // Deduct stock and log
  for (const item of items) {
    const product = products.find(p => p.id === item.id);
    if (!product) continue;
    
    const oldStock = product.stock;
    product.stock -= item.quantity;

    saleItems.push({
      id: uuidv4(),
      saleId,
      productId: item.id,
      quantity: item.quantity,
      priceAtSale: item.price,
      createdAt: timestamp
    });

    inventoryLogs.push({
      id: uuidv4(),
      productId: item.id,
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

app.get("/api/sales/history", authenticateToken, (req, res) => {
  const history = sales.map(s => ({
    ...s,
    cashier_name: users.find(u => u.id === s.userId)?.username
  })).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100);
  res.json(history);
});

app.get("/api/sales/:id", authenticateToken, (req, res) => {
  const sale = sales.find(s => s.id === req.params.id);
  if (!sale) return res.status(404).json({ error: "Sale not found" });

  const items = saleItems.filter(si => si.saleId === sale.id).map(si => ({
    ...si,
    name: products.find(p => p.id === si.productId)?.name
  }));

  res.json({
    ...sale,
    cashier_name: users.find(u => u.id === sale.userId)?.username,
    items
  });
});

app.get("/api/inventory/logs", authenticateToken, isAdmin, (req, res) => {
  const logs = inventoryLogs.map(l => ({
    ...l,
    product_name: products.find(p => p.id === l.productId)?.name,
    username: users.find(u => u.id === l.userId)?.username
  })).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100);
  res.json(logs);
});

// Analytics
app.get("/api/analytics/summary", authenticateToken, isAdmin, (req, res) => {
  const dailyMap: any = {};
  sales.forEach(s => {
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
  saleItems.forEach(si => {
    const product = products.find(p => p.id === si.productId);
    const cat = categories.find(c => c.id === product?.categoryId)?.name || 'Uncategorized';
    const name = product?.name || 'Unknown';

    catMap[cat] = (catMap[cat] || 0) + (si.quantity * si.priceAtSale);
    if (!bsMap[name]) bsMap[name] = { sold: 0, revenue: 0 };
    bsMap[name].sold += si.quantity;
    bsMap[name].revenue += (si.quantity * si.priceAtSale);
  });

  const categoriesFlat = Object.entries(catMap).map(([name, value]) => ({ name, value }));
  const bestSellers = Object.entries(bsMap).map(([name, vals]: [string, any]) => ({
    name, total_sold: vals.sold, total_revenue: vals.revenue
  })).sort((a, b) => b.total_sold - a.total_sold).slice(0, 5);

  const today = new Date().toISOString().split('T')[0];
  const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold).length;

  res.json({
    daily,
    categories: categoriesFlat,
    bestSellers,
    general: {
      today_sales_count: dailyMap[today]?.count || 0,
      today_revenue: dailyMap[today]?.revenue || 0,
      total_products: products.length,
      low_stock_count: lowStockCount,
      total_staff: users.length
    }
  });
});

export default app;
