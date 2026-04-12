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
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'stocker')),
  avatar TEXT,
  branch_id UUID REFERENCES branches(id),
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
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer')),
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

-- Insert Initial Mock Data
INSERT INTO branches (id, name, address, phone) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Sucursal Central', 'Av. Principal 123, Santiago', '+56911111111'),
  ('b0000000-0000-0000-0000-000000000002', 'Sucursal Norte', 'Av. Norte 456, Santiago', '+56922222222');

INSERT INTO users (id, name, email, password, role, branch_id) VALUES
  ('u0000000-0000-0000-0000-000000000001', 'Admin User', 'admin@rdmarket.com', 'password123', 'admin', 'b0000000-0000-0000-0000-000000000001'),
  ('u0000000-0000-0000-0000-000000000002', 'Cajero Norte', 'cajero@rdmarket.com', 'password123', 'cashier', 'b0000000-0000-0000-0000-000000000002'),
  ('u0000000-0000-0000-0000-000000000003', 'Reponedor Central', 'reponedor@rdmarket.com', 'password123', 'stocker', 'b0000000-0000-0000-0000-000000000001');

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
