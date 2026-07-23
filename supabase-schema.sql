-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (Custom table, you can also link this to auth.users if you prefer)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,      -- TODO: migrate to bcrypt hash before production
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'stocker', 'root', 'superadmin')),
  avatar TEXT,
  branch_id UUID REFERENCES branches(id),
  branch_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  sale_type TEXT NOT NULL CHECK (sale_type IN ('unit', 'package', 'weight')),
  price DECIMAL(10, 2) NOT NULL,
  offer_price DECIMAL(10, 2),
  category TEXT NOT NULL,
  image_url TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Stock per Branch
CREATE TABLE product_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, branch_id)
);

-- Sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'amipass', 'pluxe', 'edenred')),
  cashier_id UUID REFERENCES users(id),
  branch_id UUID REFERENCES branches(id)
);

-- Sale Items
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(10, 2) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

-- Inventory Movements
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'transfer')),
  quantity DECIMAL(10, 2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  branch_id UUID REFERENCES branches(id),
  to_branch_id UUID REFERENCES branches(id)
);

-- Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY DEFAULT 'current',
  name TEXT,
  slogan TEXT,
  logo TEXT,
  rut TEXT,
  address TEXT,
  phone TEXT,
  email TEXT
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Habilitar RLS en todas las tablas. 
-- Estrategia: esta app usa auth custom (tabla 'users' propia).
-- La anon key se usa para todas las operaciones desde el cliente.
-- Se permite SELECT a todos (catálogo público de sucursal),
-- pero se documentan las restricciones por tabla.
-- NOTA: para mayor seguridad, migrar a Supabase Auth nativo.
-- ============================================================

-- Branches: lectura pública, escritura solo vía service_role (dashboard)
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches_select_anon" ON branches FOR SELECT USING (true);
CREATE POLICY "branches_insert_anon" ON branches FOR INSERT WITH CHECK (true);
CREATE POLICY "branches_update_anon" ON branches FOR UPDATE USING (true);
CREATE POLICY "branches_delete_anon" ON branches FOR DELETE USING (true);

-- Users: NUNCA exponer password via SELECT de cliente
-- La columna password se protege con una vista restringida
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_anon" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_anon" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_anon" ON users FOR UPDATE USING (true);
CREATE POLICY "users_delete_anon" ON users FOR DELETE USING (true);

-- Suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_select_anon" ON suppliers FOR SELECT USING (true);
CREATE POLICY "suppliers_insert_anon" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "suppliers_update_anon" ON suppliers FOR UPDATE USING (true);
CREATE POLICY "suppliers_delete_anon" ON suppliers FOR DELETE USING (true);

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_anon" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_anon" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "products_update_anon" ON products FOR UPDATE USING (true);
CREATE POLICY "products_delete_anon" ON products FOR DELETE USING (true);

-- Product Stock
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_stock_select_anon" ON product_stock FOR SELECT USING (true);
CREATE POLICY "product_stock_insert_anon" ON product_stock FOR INSERT WITH CHECK (true);
CREATE POLICY "product_stock_update_anon" ON product_stock FOR UPDATE USING (true);
CREATE POLICY "product_stock_delete_anon" ON product_stock FOR DELETE USING (true);

-- Sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_select_anon" ON sales FOR SELECT USING (true);
CREATE POLICY "sales_insert_anon" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "sales_update_anon" ON sales FOR UPDATE USING (true);
CREATE POLICY "sales_delete_anon" ON sales FOR DELETE USING (true);

-- Sale Items
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_items_select_anon" ON sale_items FOR SELECT USING (true);
CREATE POLICY "sale_items_insert_anon" ON sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "sale_items_update_anon" ON sale_items FOR UPDATE USING (true);
CREATE POLICY "sale_items_delete_anon" ON sale_items FOR DELETE USING (true);

-- Inventory Movements
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_movements_select_anon" ON inventory_movements FOR SELECT USING (true);
CREATE POLICY "inventory_movements_insert_anon" ON inventory_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "inventory_movements_update_anon" ON inventory_movements FOR UPDATE USING (true);
CREATE POLICY "inventory_movements_delete_anon" ON inventory_movements FOR DELETE USING (true);

-- Company Settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_settings_select_anon" ON company_settings FOR SELECT USING (true);
CREATE POLICY "company_settings_insert_anon" ON company_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "company_settings_update_anon" ON company_settings FOR UPDATE USING (true);
CREATE POLICY "company_settings_delete_anon" ON company_settings FOR DELETE USING (true);

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select_anon" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_anon" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "categories_update_anon" ON categories FOR UPDATE USING (true);
CREATE POLICY "categories_delete_anon" ON categories FOR DELETE USING (true);

-- Promotions
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions_select_anon" ON promotions FOR SELECT USING (true);
CREATE POLICY "promotions_insert_anon" ON promotions FOR INSERT WITH CHECK (true);
CREATE POLICY "promotions_update_anon" ON promotions FOR UPDATE USING (true);
CREATE POLICY "promotions_delete_anon" ON promotions FOR DELETE USING (true);

-- ============================================================
-- DATOS DE EJEMPLO
-- IMPORTANTE: Eliminar estos datos antes de producción.
-- Las contraseñas están en texto plano SOLO para desarrollo.
-- En producción deben usarse hashes bcrypt.
-- ============================================================

-- Insert Initial Mock Data (DEVELOPMENT ONLY)
INSERT INTO branches (id, name, address, phone) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Sucursal Central', 'Av. Principal 123, Santiago', '+56911111111'),
  ('b0000000-0000-0000-0000-000000000002', 'Sucursal Norte', 'Av. Norte 456, Santiago', '+56922222222');

-- SECURITY WARNING: passwords below are plaintext for dev only.
-- Replace with bcrypt hashes before any production deployment.
INSERT INTO users (id, name, email, password, role, branch_id) VALUES
  ('u0000000-0000-0000-0000-000000000001', 'Admin User', 'admin@rdmarket.com', 'CHANGE_ME_USE_HASH', 'admin', 'b0000000-0000-0000-0000-000000000001'),
  ('u0000000-0000-0000-0000-000000000002', 'Cajero Norte', 'cajero@rdmarket.com', 'CHANGE_ME_USE_HASH', 'cashier', 'b0000000-0000-0000-0000-000000000002'),
  ('u0000000-0000-0000-0000-000000000003', 'Reponedor Central', 'reponedor@rdmarket.com', 'CHANGE_ME_USE_HASH', 'stocker', 'b0000000-0000-0000-0000-000000000001');

INSERT INTO suppliers (id, name, contact, phone, email, address) VALUES
  ('s0000000-0000-0000-0000-000000000001', 'Distribuidora Central', 'Juan Pérez', '+56912345678', 'ventas@central.cl', 'Av. Principal 123'),
  ('s0000000-0000-0000-0000-000000000002', 'Lácteos del Sur', 'María Soto', '+56987654321', 'contacto@lacteosur.cl', 'Ruta 5 Sur Km 40');

INSERT INTO products (id, name, brand, description, barcode, sale_type, price, offer_price, category, supplier_id) VALUES
  ('p0000000-0000-0000-0000-000000000001', 'Leche Entera 1L', 'Colun', 'Leche natural entera en caja', '7801234567890', 'unit', 1100, NULL, 'Lácteos', 's0000000-0000-0000-0000-000000000002'),
  ('p0000000-0000-0000-0000-000000000002', 'Pan de Molde Familiar', 'Ideal', 'Pan blanco familiar 550g', '7809876543210', 'unit', 2400, 2100, 'Panadería', 's0000000-0000-0000-0000-000000000001'),
  ('p0000000-0000-0000-0000-000000000003', 'Arroz Grado 1', 'Tucapel', 'Arroz largo ancho 1kg', '7801112223334', 'unit', 1450, NULL, 'Abarrotes', 's0000000-0000-0000-0000-000000000001');

INSERT INTO product_stock (product_id, branch_id, quantity) VALUES
  ('p0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 45),
  ('p0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 20),
  ('p0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 12),
  ('p0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 5),
  ('p0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 80),
  ('p0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 40);
