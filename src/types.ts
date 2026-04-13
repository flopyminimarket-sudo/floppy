export type Role = 'root' | 'admin' | 'cashier' | 'stocker' | 'superadmin';

export type SaleType = 'unit' | 'package' | 'weight';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  auto_print_ticket?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  avatar?: string;
  branchIds?: string[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  barcode: string;
  saleType: SaleType;
  category: string;
  imageUrl?: string;
  expiryDate?: string;
  isPack?: boolean;
  packUnits?: number;
  supplierId?: string;
  allowNegativeStock?: boolean;
  isCombo?: boolean;
  minStock?: number;
  comboItems?: ComboItem[];
  // Branch specific data: branchId -> { price, offerPrice, stock }
  branchData: Record<string, {
    price: number;
    offerPrice?: number;
    stock: number;
  }>;
  // For convenience in components (current branch data)
  price: number;
  offerPrice?: number;
  stock: Record<string, number>;
}

export interface ComboItem {
  id: string;
  comboProductId: string;
  componentProductId: string;
  quantity: number;
  /** Si es true, el cajero debe elegir un producto de la categoría especificada */
  isSelectable?: boolean;
  /** Categoría de productos a mostrar en el modal de selección */
  selectableCategory?: string;
}

export type PromotionType = 'buy_x_get_y' | 'scheduled_discount';

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  productId: string;
  // buy_x_get_y
  buyQuantity?: number;
  getQuantity?: number;
  // scheduled_discount
  discountPrice?: number;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[]; // 0=Sun..6=Sat, null=all
  isActive: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  notes?: string;
}

export interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  cashierId: string;
  cashierName?: string;
  branchId: string;
  status?: 'completed' | 'voided';
  voidReason?: string;
  voidDate?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface CompanySettings {
  name: string;
  slogan: string;
  logo?: string;
  rut: string;
  address: string;
  phone: string;
  email: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  date: string;
  reason: string;
  userId: string;
  branchId: string;
  toBranchId?: string; // For transfers
}
