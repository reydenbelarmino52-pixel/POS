-- Cathtea POS & Inventory System Schema
-- Run this in your Supabase SQL Editor

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if they exist (BE CAREFUL: This deletes data)
-- DROP TABLE IF EXISTS inventory_logs;
-- DROP TABLE IF EXISTS sale_items;
-- DROP TABLE IF EXISTS sales;
-- DROP TABLE IF EXISTS shifts;
-- DROP TABLE IF EXISTS products;
-- DROP TABLE IF EXISTS suppliers;
-- DROP TABLE IF EXISTS categories;
-- DROP TABLE IF EXISTS stores;
-- DROP TABLE IF EXISTS users;

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'cashier', -- 'admin' or 'cashier'
  status TEXT DEFAULT 'pending', -- 'pending' or 'active'
  store_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Stores Table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  shift_pin TEXT DEFAULT '1234',
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Products (Inventory)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'product', -- 'product' or 'supply'
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  image_url TEXT,
  low_stock_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  opening_balance DECIMAL(10,2) NOT NULL,
  shift_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' or 'closed'
  open_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  close_time TIMESTAMP WITH TIME ZONE,
  closing_cash DECIMAL(10,2),
  expected_cash DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  total DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  amount_received DECIMAL(10,2),
  change_amount DECIMAL(10,2),
  payment_method TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Sale Items (Cart Details)
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE NO ACTION, -- Prevent product delete if sold
  quantity INTEGER NOT NULL,
  price_at_sale DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Inventory Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE, -- Auto-delete logs when product is deleted
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  old_stock INTEGER,
  new_stock INTEGER,
  change_type TEXT, -- 'sale', 'restock', 'manual_update'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Product Ingredients (Recipe mapping)
CREATE TABLE IF NOT EXISTS product_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. RPC for Analytics
DROP FUNCTION IF EXISTS get_sold_counts(UUID);
CREATE OR REPLACE FUNCTION get_sold_counts(store_id_param UUID)
RETURNS TABLE(product_id UUID, count BIGINT, revenue DECIMAL(10,2)) AS $$
BEGIN
  RETURN QUERY
  SELECT si.product_id, SUM(si.quantity)::BIGINT as count, SUM(si.quantity * si.price_at_sale)::DECIMAL(10,2) as revenue
  FROM sale_items si
  WHERE si.store_id = store_id_param
  GROUP BY si.product_id;
END;
$$ LANGUAGE plpgsql;

-- 13. RPC for Staff Count
DROP FUNCTION IF EXISTS get_staff_count(UUID);
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

-- 14. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_store ON inventory_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_shifts_store ON shifts(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_store ON suppliers(store_id);
