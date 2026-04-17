import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Product, Sale, CartItem, Supplier, Branch, InventoryMovement, CompanySettings, Category, Promotion, ComboItem } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import toast from 'react-hot-toast';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch | null) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  movements: InventoryMovement[];
  setMovements: React.Dispatch<React.SetStateAction<InventoryMovement[]>>;
  companySettings: CompanySettings;
  setCompanySettings: (settings: CompanySettings) => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  updateCartNotes: (productId: string, notes: string) => void;
  processSale: (paymentMethod: Sale['paymentMethod']) => Promise<Sale | null>;
  voidSale: (saleId: string, reason: string) => Promise<void>;
  transferStock: (productId: string, fromBranchId: string, toBranchId: string, quantity: number) => Promise<void>;
  adjustStock: (productId: string, branchId: string, newQuantity: number, reason: string) => Promise<void>;
  receiveStock: (productId: string, branchId: string, quantity: number, reason: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  promotions: Promotion[];
  addPromotion: (promo: Omit<Promotion, 'id'>) => Promise<void>;
  updatePromotion: (id: string, promo: Partial<Promotion>) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  getActivePromotion: (productId: string) => Promotion | null;
  isLoading: boolean;
  isConfigured: boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const defaultSettings: CompanySettings = {
    name: 'Mi Tienda',
    slogan: 'Management System',
    logo: undefined,
    rut: '',
    address: '',
    phone: '',
    email: ''
  };
  const [companySettings, setCompanySettingsState] = useState<CompanySettings>(defaultSettings);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured] = useState(isSupabaseConfigured);

  // Theme management
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const updateCompanySettings = async (settings: CompanySettings): Promise<void> => {
    setCompanySettingsState(settings);
    if (isConfigured) {
      try {
        const { error } = await supabase
          .from('company_settings')
          .upsert({ id: 'current', ...settings }, { onConflict: 'id' });
        if (error) throw error;
      } catch (err) {
        console.error('Error saving company settings to Supabase:', err);
        throw err;
      }
    }
  };

  const fetchInitialData = async () => {
    if (!isConfigured) return;
    try {
      setIsLoading(true);
      
      // Fetch company settings first
      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 'current')
        .single();
      
      if (settingsData) {
        const { id, ...cleanSettings } = settingsData;
        setCompanySettingsState(cleanSettings as CompanySettings);
      }

      const { data: branchesData, error: branchesError } = await supabase.from('branches').select('*');
      if (branchesError) throw branchesError;
      setBranches(branchesData || []);
      
      const { data: suppliersData } = await supabase.from('suppliers').select('*');
      if (suppliersData) setSuppliers(suppliersData);

      const { data: categoriesData } = await supabase.from('categories').select('*');
      if (categoriesData) setCategories(categoriesData);

      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        setUsers(usersData.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          branchIds: u.branch_ids || (u.branch_id ? [u.branch_id] : []),
          avatar: u.avatar
        })));
      }

    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranchData = async () => {
    if (!currentBranch || !currentUser || !isConfigured) return;

    try {
      // Fetch products with their stock and branch-specific prices
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          product_stock (
            branch_id,
            quantity,
            price,
            offer_price,
            is_visible
          ),
          combo_items!combo_product_id (
            id,
            combo_product_id,
            component_product_id,
            quantity,
            is_selectable,
            selectable_category,
            allowed_product_ids
          )
        `)
        .limit(2000);
        
      if (productsError) throw productsError;

      let loadedProducts: Product[] = [];
      if (productsData) {
        loadedProducts = productsData.map(p => {
          const branchData: Record<string, { price: number; offerPrice?: number; stock: number; isVisible: boolean }> = {};
          const stockRecord: Record<string, number> = {};
          
          p.product_stock?.forEach((item: any) => {
            branchData[item.branch_id] = {
              price: Math.round(item.price || p.price || 0),
              offerPrice: (item.offer_price || p.offer_price) ? Math.round(item.offer_price || p.offer_price) : undefined,
              stock: item.quantity,
              isVisible: item.is_visible !== false
            };
            stockRecord[item.branch_id] = item.quantity;
          });
          
          // Current branch data
          const currentData = branchData[currentBranch.id] || { 
            price: Math.round(p.price || 0), 
            offerPrice: p.offer_price ? Math.round(p.offer_price) : undefined, 
            stock: 0,
            isVisible: true
          };

          return {
            id: p.id,
            name: p.name,
            brand: p.brand,
            description: p.description,
            barcode: p.barcode,
            saleType: p.sale_type,
            category: p.category,
            imageUrl: p.image_url,
            expiryDate: p.expiry_date,
            isPack: p.is_pack,
            pack_units: p.pack_units,
            supplierId: p.supplier_id,
            allowNegativeStock: p.allow_negative_stock || false,
            isCombo: p.is_combo || false,
            minStock: p.min_stock || 5,
            comboItems: (p.combo_items || []).map((ci: any) => ({
              id: ci.id,
              comboProductId: ci.combo_product_id,
              componentProductId: ci.component_product_id,
              quantity: ci.quantity,
              isSelectable: ci.is_selectable || false,
              selectableCategory: ci.selectable_category || undefined,
              allowedProductIds: ci.allowed_product_ids || []
            })) || [],
            branchData,
            price: currentData.price,
            offerPrice: currentData.offerPrice,
            stock: stockRecord
          };
        });
        setProducts(loadedProducts);
      }

      // Fetch promotions
      const { data: promoData } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true);

      if (promoData) {
        setPromotions(promoData.map((pr: any): Promotion => ({
          id: pr.id,
          name: pr.name,
          type: pr.type,
          productId: pr.product_id,
          buyQuantity: pr.buy_quantity,
          getQuantity: pr.get_quantity,
          discountPrice: pr.discount_price ? Math.round(pr.discount_price) : undefined,
          startDate: pr.start_date,
          endDate: pr.end_date,
          startTime: pr.start_time,
          endTime: pr.end_time,
          daysOfWeek: pr.days_of_week,
          isActive: pr.is_active
        })));
      }

      // Fetch sales
      const { data: salesData } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (*)
        `)
        .eq('branch_id', currentBranch.id)
        .order('date', { ascending: false });

      if (salesData) {
        const formattedSales: Sale[] = salesData.map(s => ({
          id: s.id,
          date: s.date,
          total: s.total,
          paymentMethod: s.payment_method,
          cashierId: s.cashier_id,
          branchId: s.branch_id,
          status: s.status || 'completed',
          voidReason: s.void_reason,
          voidDate: s.void_date,
          items: s.sale_items?.map((item: any) => {
            const product = loadedProducts.find(p => p.id === item.product_id);
            return {
              ...product,
              id: item.product_id || (product?.id || 'deleted'),
              name: item.name || (product?.name || 'PRODUCTO ELIMINADO'),
              barcode: item.barcode || (product?.barcode || 'N/A'),
              brand: item.brand || (product?.brand || ''),
              quantity: item.quantity || 0,
              price: item.price || 0,
              saleType: item.sale_type || (product?.sale_type || 'unit'),
              imageUrl: product?.imageUrl
            } as CartItem;
          }) || []
        }));
        setSales(formattedSales);
      }

      const { data: movementsData } = await supabase
        .from('inventory_movements')
        .select('*')
        .or(`branch_id.eq.${currentBranch.id},to_branch_id.eq.${currentBranch.id}`)
        .order('date', { ascending: false });

      if (movementsData) {
        const formattedMovements: InventoryMovement[] = movementsData.map(m => ({
          id: m.id,
          productId: m.product_id,
          type: m.type,
          quantity: m.quantity,
          date: m.created_at || m.date,
          reason: m.reason,
          userId: m.user_id,
          branchId: m.branch_id,
          toBranchId: m.to_branch_id
        }));
        setMovements(formattedMovements);
      }

    } catch (error) {
      console.error('Error fetching branch data:', error);
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, [isConfigured]);

  // Fetch branch-specific data when branch changes
  useEffect(() => {
    fetchBranchData();
  }, [currentBranch, currentUser, isConfigured]);

  // Real-time synchronization
  useEffect(() => {
    if (!isConfigured) return;

    const channel = supabase
      .channel('app-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchBranchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_stock' }, () => {
        fetchBranchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchInitialData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, () => {
        fetchBranchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchBranchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_movements' }, () => {
        fetchBranchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_settings' }, () => {
        fetchInitialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isConfigured, currentBranch, currentUser]);

  const addToCart = (product: Product, quantity: number = 1) => {
    // --- Caso especial: componente ya marcado desde el modal de selección del POS ---
    if ((product as any).isComboComponent) {
      const parentComboId = (product as any).parentComboId;
      setCart(prev => {
        const existingComp = prev.find(
          item => item.id === product.id && (item as any).isComboComponent && (item as any).parentComboId === parentComboId
        );
        if (existingComp) {
          return prev.map(item =>
            (item.id === product.id && (item as any).isComboComponent && (item as any).parentComboId === parentComboId)
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prev, {
          ...product,
          price: 0,
          offerPrice: undefined,
          quantity,
          isComboComponent: true,
          parentComboId
        } as any];
      });
      // No mostrar toast aquí — lo hace handleComboComponentSelected en el POS
      return;
    }

    // --- Validación de stock de componentes para combos ---
    if (product.isCombo && product.comboItems && product.comboItems.length > 0 && currentBranch) {
      for (const comboItem of product.comboItems) {
        // Saltar componentes "seleccionables" — el cajero los elige en el modal del POS
        if (comboItem.isSelectable) continue;

        const component = products.find(p => p.id === comboItem.componentProductId);
        if (!component) {
          toast.error(`Componente del combo no encontrado`);
          return;
        }
        const requiredQty = comboItem.quantity * quantity;
        const availableStock = component.stock[currentBranch.id] ?? 0;
        // También considerar el stock ya reservado en el carrito para este componente
        const reservedInCart = cart
          .filter(item => item.id === component.id && (item as any).isComboComponent)
          .reduce((acc, item) => acc + item.quantity, 0);
        if (!component.allowNegativeStock && (availableStock - reservedInCart) < requiredQty) {
          toast.error(`Stock insuficiente de "${component.name}" para el combo`);
          return;
        }
      }
    }

    setCart(prev => {
      let newCart = [...prev];
      
      // Añadir el combo/producto principal
      const existing = newCart.find(item => item.id === product.id && !(item as any).isComboComponent);
      if (existing) {
        newCart = newCart.map(item =>
          (item.id === product.id && !(item as any).isComboComponent)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newCart.push({ ...product, quantity });
      }

      // Si es combo, añadir componentes FIJOS (no seleccionables) con precio $0
      if (product.isCombo && product.comboItems && product.comboItems.length > 0) {
        product.comboItems
          .filter(comboItem => !comboItem.isSelectable) // Omitir los que el cajero elige
          .forEach(comboItem => {
            const component = products.find(p => p.id === comboItem.componentProductId);
            if (component) {
              const compQuantity = comboItem.quantity * quantity;
              const existingComp = newCart.find(
                item => item.id === component.id && (item as any).isComboComponent && (item as any).parentComboId === product.id
              );
              if (existingComp) {
                newCart = newCart.map(item =>
                  (item.id === component.id && (item as any).isComboComponent && (item as any).parentComboId === product.id)
                    ? { ...item, quantity: item.quantity + compQuantity }
                    : item
                );
              } else {
                newCart.push({
                  ...component,
                  price: 0,
                  offerPrice: undefined,
                  quantity: compQuantity,
                  isComboComponent: true,
                  parentComboId: product.id
                } as any);
              }
            }
          });
      }

      return newCart;
    });
    toast.success(`${product.name} añadido`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      // Verificar si el producto que se elimina es un combo padre
      const itemToRemove = prev.find(item => item.id === productId && !(item as any).isComboComponent);
      if (itemToRemove && (itemToRemove as any).isCombo) {
        // Eliminar el combo y todos sus componentes vinculados
        return prev.filter(item => 
          !(item.id === productId && !(item as any).isComboComponent) &&
          !((item as any).isComboComponent && (item as any).parentComboId === productId)
        );
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => {
      const itemToUpdate = prev.find(item => item.id === productId && !(item as any).isComboComponent);
      
      // Si es un combo, actualizar también la cantidad de sus componentes proporcionalmente
      if (itemToUpdate && (itemToUpdate as any).isCombo && itemToUpdate.comboItems?.length) {
        const oldQty = itemToUpdate.quantity;
        const factor = quantity / oldQty;
        return prev.map(item => {
          if (item.id === productId && !(item as any).isComboComponent) {
            return { ...item, quantity };
          }
          // Actualizar componentes vinculados a este combo
          if ((item as any).isComboComponent && (item as any).parentComboId === productId) {
            return { ...item, quantity: Math.round(item.quantity * factor) };
          }
          return item;
        });
      }

      return prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = () => setCart([]);
  
  const updateCartNotes = (productId: string, notes: string) => {
    setCart(prev => prev.map(item => item.id === productId ? { ...item, notes } : item));
  };

  const processSale = async (paymentMethod: 'cash' | 'card' | 'transfer' | 'amipass' | 'pluxe' | 'edenred', customerName?: string) => {
    try {
      if (cart.length === 0) return null;

      // Separar ítems principales de componentes de combo
      const mainItems = cart.filter(item => !(item as any).isComboComponent);
      const comboComponents = cart.filter(item => (item as any).isComboComponent);

      // Calcular total solo con ítems principales (los componentes van en $0)
      const totalValue = mainItems.reduce((acc, item) => {
        const price = item.offerPrice || item.price;
        return acc + (Math.round(price) * item.quantity);
      }, 0);
      const total = Math.round(totalValue);

      // --- 1. Insertar la venta ---
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          total,
          payment_method: paymentMethod,
          cashier_id: currentUser?.id,
          branch_id: currentBranch?.id,
          customer_name: customerName || null
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // --- 2. Registrar todos los ítems de la venta ---
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: Math.round(item.offerPrice || item.price),
        subtotal: Math.round((item.offerPrice || item.price) * item.quantity)
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      // --- 3. Actualizar stock ---
      // Construir mapa de descuentos de stock: productId -> totalQtyToDeduct
      // Los combos (isCombo=true) NO descuentan su propio stock; solo sus componentes lo hacen.
      // Los productos normales y componentes de combo sí descuentan su stock.
      const stockDeductions: Record<string, number> = {};

      for (const item of mainItems) {
        if (!(item as any).isCombo) {
          // Producto normal: descontar stock
          stockDeductions[item.id] = (stockDeductions[item.id] || 0) + item.quantity;
        }
        // Los combos (isCombo=true) ya tienen sus componentes en el carrito; no descontamos el combo en sí
      }

      // Componentes de combo: siempre descontar stock
      for (const item of comboComponents) {
        stockDeductions[item.id] = (stockDeductions[item.id] || 0) + item.quantity;
      }

      // Aplicar descuentos de stock en paralelo
      const stockUpdatePromises = Object.entries(stockDeductions).map(async ([productId, qtyToDeduct]) => {
        const { data: currentStockData } = await supabase
          .from('product_stock')
          .select('quantity, price, offer_price')
          .eq('product_id', productId)
          .eq('branch_id', currentBranch!.id)
          .maybeSingle();

        const currentStock = currentStockData?.quantity || 0;
        const newStock = currentStock - qtyToDeduct;

        await supabase
          .from('product_stock')
          .upsert({
            product_id: productId,
            branch_id: currentBranch!.id,
            quantity: newStock,
            price: currentStockData?.price,
            offer_price: currentStockData?.offer_price
          }, { onConflict: 'product_id,branch_id' });

        await supabase
          .from('inventory_movements')
          .insert({
            product_id: productId,
            type: 'out',
            quantity: qtyToDeduct,
            reason: `Venta POS #${saleData.id}`,
            user_id: currentUser!.id,
            branch_id: currentBranch!.id
          });
      });

      await Promise.all(stockUpdatePromises);

      // --- 4. Actualizar estado local ---
      const newSale: Sale = {
        id: saleData.id,
        date: saleData.date,
        items: [...cart],
        total,
        paymentMethod,
        cashierId: currentUser!.id,
        cashierName: currentUser!.name,
        branchId: currentBranch!.id,
        status: 'completed',
        customerName: customerName || undefined
      };

      setSales(prev => [newSale, ...prev]);

      setProducts(prev => prev.map(p => {
        const deduction = stockDeductions[p.id];
        if (deduction) {
          return {
            ...p,
            stock: {
              ...p.stock,
              [currentBranch!.id]: (p.stock[currentBranch!.id] || 0) - deduction
            }
          };
        }
        return p;
      }));

      clearCart();
      toast.success('Venta procesada con éxito');
      return newSale;

    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Error al procesar la venta');
      return null;
    }
  };

  const voidSale = async (saleId: string, reason: string) => {
    if (!currentUser || !currentBranch) return;

    try {
      const saleToVoid = sales.find(s => s.id === saleId);
      if (!saleToVoid) throw new Error('Venta no encontrada');
      if (saleToVoid.status === 'voided') {
        toast.error('Esta venta ya ha sido anulada');
        return;
      }

      // 1. Actualizar estado de la venta
      const { error: voidError } = await supabase
        .from('sales')
        .update({
          status: 'voided',
          void_reason: reason,
          void_date: new Date().toISOString()
        })
        .eq('id', saleId);

      if (voidError) throw voidError;

      // 2. Restaurar stock siguiendo la misma lógica de processSale:
      //    - Solo restaurar ítems normales y componentes de combo (isComboComponent).
      //    - No restaurar combos (isCombo=true) porque su stock nunca fue descontado.
      const stockRestorations: Record<string, number> = {};

      for (const item of saleToVoid.items) {
        const isComboProduct = (item as any).isCombo;
        const isComponent = (item as any).isComboComponent;

        if (!isComboProduct) {
          // Producto normal o componente de combo: restaurar stock
          stockRestorations[item.id] = (stockRestorations[item.id] || 0) + item.quantity;
        }
        // Los combos padre (isCombo=true) no restauran inventario
      }

      // Aplicar restauraciones en paralelo
      const restorePromises = Object.entries(stockRestorations).map(async ([productId, qtyToRestore]) => {
        try {
          const { data: currentStockData, error: stockFetchError } = await supabase
            .from('product_stock')
            .select('quantity, price, offer_price')
            .eq('product_id', productId)
            .eq('branch_id', currentBranch.id)
            .maybeSingle();

          if (stockFetchError) throw stockFetchError;

          const currentStock = currentStockData?.quantity || 0;

          const { error: upsertError } = await supabase
            .from('product_stock')
            .upsert({
              product_id: productId,
              branch_id: currentBranch.id,
              quantity: currentStock + qtyToRestore,
              price: currentStockData?.price,
              offer_price: currentStockData?.offer_price,
              is_visible: true
            }, { onConflict: 'product_id,branch_id' });

          if (upsertError) throw upsertError;

          const { error: mvError } = await supabase
            .from('inventory_movements')
            .insert({
              product_id: productId,
              type: 'in',
              quantity: qtyToRestore,
              reason: `Anulación Venta #${saleId}: ${reason}`,
              user_id: currentUser.id,
              branch_id: currentBranch.id
            });
            
          if (mvError) throw mvError;
        } catch (err) {
          console.error(`Error restoring stock for product ${productId}:`, err);
        }
      });

      await Promise.all(restorePromises);

      // 3. Actualizar estado local
      setSales(prev => prev.map(s =>
        s.id === saleId ? { ...s, status: 'voided', voidReason: reason, voidDate: new Date().toISOString() } : s
      ));

      setProducts(prev => prev.map(p => {
        const restoration = stockRestorations[p.id];
        if (restoration) {
          return {
            ...p,
            stock: {
              ...p.stock,
              [currentBranch.id]: (p.stock[currentBranch.id] || 0) + restoration
            }
          };
        }
        return p;
      }));

      toast.success('Venta anulada exitosamente');
    } catch (error) {
      console.error('Error voiding sale:', error);
      toast.error('Error al anular la venta');
    }
  };

  const transferStock = async (productId: string, fromBranchId: string, toBranchId: string, quantity: number) => {
    if (!currentUser) return;
    
    try {
      console.log(`Transferring ${quantity} of product ${productId} from ${fromBranchId} to ${toBranchId}`);

      // Get current stocks from DB to ensure accuracy
      const { data: fromStockData, error: fromError } = await supabase
        .from('product_stock')
        .select('quantity')
        .eq('product_id', productId)
        .eq('branch_id', fromBranchId)
        .maybeSingle();
        
      if (fromError) throw fromError;
      const fromStock = fromStockData?.quantity || 0;
      
      if (fromStock < quantity) {
        toast.error('Stock insuficiente en la sucursal de origen');
        return;
      }

      const { data: toStockData, error: toError } = await supabase
        .from('product_stock')
        .select('quantity')
        .eq('product_id', productId)
        .eq('branch_id', toBranchId)
        .maybeSingle();
        
      if (toError) throw toError;
      const toStock = toStockData?.quantity || 0;

      // Update from branch
      const { error: upsertFromError } = await supabase
        .from('product_stock')
        .upsert({
          product_id: productId,
          branch_id: fromBranchId,
          quantity: fromStock - quantity
        }, { onConflict: 'product_id,branch_id' });

      if (upsertFromError) throw upsertFromError;

      // Update to branch - Also ensure visibility
      const { error: upsertToError } = await supabase
        .from('product_stock')
        .upsert({
          product_id: productId,
          branch_id: toBranchId,
          quantity: toStock + quantity,
          is_visible: true
        }, { onConflict: 'product_id,branch_id' });

      if (upsertToError) throw upsertToError;

      // Record movement
      const { data: mvData, error: mvError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: productId,
          type: 'transfer',
          quantity,
          reason: `Transferencia a sucursal`,
          user_id: currentUser.id,
          branch_id: fromBranchId,
          to_branch_id: toBranchId
        })
        .select()
        .single();
      
      if (mvError) throw mvError;

      if (mvData) {
        setMovements(prev => [{
          id: mvData.id,
          productId: mvData.product_id,
          type: mvData.type,
          quantity: mvData.quantity,
          reason: mvData.reason,
          userId: mvData.user_id,
          branchId: mvData.branch_id,
          toBranchId: mvData.to_branch_id,
          date: mvData.created_at || mvData.date
        }, ...prev]);
      }

      // Update local state robustly
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          const updatedBranchData = { ...p.branchData };
          
          // Update FROM branch
          if (updatedBranchData[fromBranchId]) {
            updatedBranchData[fromBranchId] = { 
              ...updatedBranchData[fromBranchId], 
              stock: fromStock - quantity 
            };
          } else {
            updatedBranchData[fromBranchId] = {
              branchId: fromBranchId,
              stock: fromStock - quantity,
              isVisible: true,
              price: p.price,
              offerPrice: p.offerPrice
            };
          }

          // Update TO branch
          if (updatedBranchData[toBranchId]) {
            updatedBranchData[toBranchId] = { 
              ...updatedBranchData[toBranchId], 
              stock: toStock + quantity,
              isVisible: true 
            };
          } else {
            updatedBranchData[toBranchId] = {
              branchId: toBranchId,
              stock: toStock + quantity,
              isVisible: true,
              price: p.price,
              offerPrice: p.offerPrice
            };
          }

          return {
            ...p,
            branchData: updatedBranchData,
            stock: {
              ...p.stock,
              [fromBranchId]: fromStock - quantity,
              [toBranchId]: toStock + quantity
            }
          };
        }
        return p;
      }));

      toast.success('Stock transferido exitosamente');
    } catch (error) {
      console.error('Error transferring stock:', error);
      toast.error('Error al transferir stock');
    }
  };

  const adjustStock = async (productId: string, branchId: string, newQuantity: number, reason: string) => {
    if (!currentUser) return;
    try {
      const product = products.find(p => p.id === productId);
      const oldStock = product?.stock?.[branchId] ?? 0;
      const diff = newQuantity - oldStock;

      const { error: upsertError } = await supabase
        .from('product_stock')
        .upsert({ 
          product_id: productId, 
          branch_id: branchId, 
          quantity: newQuantity,
          is_visible: true
        }, { onConflict: 'product_id,branch_id' });

      if (upsertError) throw upsertError;

      const { data: mvData, error: mvError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: productId,
          type: 'adjustment',
          quantity: diff,
          reason,
          user_id: currentUser.id,
          branch_id: branchId
        })
        .select()
        .single();

      if (mvError) throw mvError;

      if (mvData) {
        setMovements(prev => [{
          id: mvData.id, 
          productId: mvData.product_id, 
          type: mvData.type,
          quantity: mvData.quantity, 
          reason: mvData.reason,
          userId: mvData.user_id, 
          branchId: mvData.branch_id,
          date: mvData.created_at || mvData.date
        }, ...prev]);
      }

      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          const updatedBranchData = { ...p.branchData };
          if (updatedBranchData[branchId]) {
            updatedBranchData[branchId] = { ...updatedBranchData[branchId], stock: newQuantity, isVisible: true };
          } else {
            updatedBranchData[branchId] = {
              branchId,
              stock: newQuantity,
              isVisible: true,
              price: p.price,
              offerPrice: p.offerPrice
            };
          }
          return { 
            ...p, 
            branchData: updatedBranchData,
            stock: { ...p.stock, [branchId]: newQuantity } 
          };
        }
        return p;
      }));

      toast.success('Stock ajustado correctamente');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Error al ajustar el stock');
    }
  };

  const receiveStock = async (productId: string, branchId: string, quantity: number, reason: string) => {
    if (!currentUser) return;
    try {
      const product = products.find(p => p.id === productId);
      const currentStock = product?.stock?.[branchId] ?? 0;
      const newStock = currentStock + quantity;

      const { error: upsertError } = await supabase
        .from('product_stock')
        .upsert({ 
          product_id: productId, 
          branch_id: branchId, 
          quantity: newStock,
          is_visible: true
        }, { onConflict: 'product_id,branch_id' });

      if (upsertError) throw upsertError;

      const { data: mvData, error: mvError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: productId,
          type: 'in',
          quantity,
          reason,
          user_id: currentUser.id,
          branch_id: branchId
        })
        .select()
        .single();

      if (mvError) throw mvError;

      if (mvData) {
        setMovements(prev => [{
          id: mvData.id, 
          productId: mvData.product_id, 
          type: mvData.type,
          quantity: mvData.quantity, 
          reason: mvData.reason,
          userId: mvData.user_id, 
          branchId: mvData.branch_id,
          date: mvData.created_at || mvData.date
        }, ...prev]);
      }

      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          const updatedBranchData = { ...p.branchData };
          if (updatedBranchData[branchId]) {
            updatedBranchData[branchId] = { ...updatedBranchData[branchId], stock: newStock, isVisible: true };
          } else {
            updatedBranchData[branchId] = {
              branchId,
              stock: newStock,
              isVisible: true,
              price: p.price,
              offerPrice: p.offerPrice
            };
          }
          return { 
            ...p, 
            branchData: updatedBranchData,
            stock: { ...p.stock, [branchId]: newStock } 
          };
        }
        return p;
      }));

      toast.success(`Entrada registrada: +${quantity} unidades`);
    } catch (error) {
      console.error('Error receiving stock:', error);
      toast.error('Error al registrar la entrada');
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'branchData' | 'price' | 'offerPrice' | 'stock'> & { branchData: Record<string, { price: number; offerPrice?: number; stock: number }> }) => {
    try {
      // Get a default price from branch data for the global product price
      const branchPrices = Object.values(product.branchData).map(b => b.price);
      const defaultPrice = branchPrices.length > 0 ? branchPrices[0] : 0;

      const { data, error } = await supabase
        .from('products')
        .insert({
          name: product.name,
          brand: product.brand,
          description: product.description,
          barcode: product.barcode === '' ? null : product.barcode,
          sale_type: product.saleType,
          category: product.category,
          image_url: product.imageUrl,
          expiry_date: product.expiryDate,
          is_pack: product.isPack,
          pack_units: product.packUnits,
          supplier_id: product.supplierId === '' ? null : product.supplierId,
          allow_negative_stock: product.allowNegativeStock ?? false,
          is_combo: product.isCombo ?? false,
          min_stock: product.minStock ?? 5,
          price: Math.round(defaultPrice)
        })
        .select()
        .single();

      if (error) throw error;

      // Insert initial data for all branches
      const branchInserts = Object.entries(product.branchData).map(([branchId, bData]) => ({
        product_id: data.id,
        branch_id: branchId,
        quantity: bData.stock,
        price: Math.round(bData.price),
        offer_price: bData.offerPrice ? Math.round(bData.offerPrice) : null,
        is_visible: (bData as any).isVisible !== false
      }));

      if (branchInserts.length > 0) {
        const { error: stockError } = await supabase.from('product_stock').insert(branchInserts);
        if (stockError) throw stockError;
      }

      // Insert combo items if any
      if (product.isCombo && product.comboItems && product.comboItems.length > 0) {
        const comboInserts = product.comboItems.map(item => ({
          combo_product_id: data.id,
          component_product_id: item.componentProductId,
          quantity: item.quantity,
          is_selectable: item.isSelectable || false,
          selectable_category: item.selectableCategory || null,
          allowed_product_ids: Array.isArray(item.allowedProductIds) ? item.allowedProductIds : []
        }));
        const { error: comboError } = await supabase.from('combo_items').insert(comboInserts);
        if (comboError) {
          console.error('Error inserting combo items:', comboError);
          // Don't throw here to avoid failing entire product creation, but log it
        }
      }

      const currentData = product.branchData[currentBranch!.id] || { price: 0, offerPrice: undefined, stock: 0, isVisible: true };
      const stockRecord: Record<string, number> = {};
      Object.entries(product.branchData).forEach(([bid, bData]) => {
        stockRecord[bid] = bData.stock;
      });

      const newProduct: Product = {
        ...product,
        id: data.id,
        price: currentData.price,
        offerPrice: currentData.offerPrice,
        stock: stockRecord
      };

      setProducts(prev => [newProduct, ...prev]);
      toast.success('Producto creado exitosamente');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Error al crear el producto');
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode === '' ? null : updates.barcode;
      if (updates.saleType !== undefined) dbUpdates.sale_type = updates.saleType;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      if (updates.expiryDate !== undefined) dbUpdates.expiry_date = updates.expiryDate;
      if (updates.isPack !== undefined) dbUpdates.is_pack = updates.isPack;
      if (updates.packUnits !== undefined) dbUpdates.pack_units = updates.packUnits;
      if (updates.allowNegativeStock !== undefined) dbUpdates.allow_negative_stock = updates.allowNegativeStock;
      if (updates.isCombo !== undefined) dbUpdates.is_combo = updates.isCombo;
      if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
      if (updates.supplierId !== undefined) {
        dbUpdates.supplier_id = updates.supplierId === '' ? null : updates.supplierId;
      }

      // Automatically update global price if branchData is updated
      if (updates.branchData) {
        const branchPrices = Object.values(updates.branchData).map(b => b.price);
        if (branchPrices.length > 0) {
          dbUpdates.price = Math.round(branchPrices[0]);
        }
      }

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('products')
          .update(dbUpdates)
          .eq('id', id);

        if (error) throw error;
      }

      if (updates.branchData) {
        for (const [branchId, data] of Object.entries(updates.branchData)) {
          const { error } = await supabase
            .from('product_stock')
            .upsert({
              product_id: id,
              branch_id: branchId,
              quantity: data.stock,
              price: Math.round(data.price),
              offer_price: data.offerPrice ? Math.round(data.offerPrice) : null,
              is_visible: (data as any).isVisible !== false
            }, { onConflict: 'product_id,branch_id' });
          if (error) throw error;
        }
      }

      // Sync combo items
      if (updates.isCombo !== undefined || updates.comboItems !== undefined) {
        // First delete existing items
        const { error: deleteError } = await supabase.from('combo_items').delete().eq('combo_product_id', id);
        if (deleteError) {
          console.error('Error deleting combo items:', deleteError);
        }
        
        const currentIsCombo = updates.isCombo ?? products.find(p => p.id === id)?.isCombo;
        const comboToUse = updates.comboItems ?? products.find(p => p.id === id)?.comboItems ?? [];
        
        if (currentIsCombo && comboToUse.length > 0) {
          const comboInserts = comboToUse.map(item => ({
            combo_product_id: id,
            component_product_id: item.componentProductId,
            quantity: item.quantity,
            is_selectable: item.isSelectable || false,
            selectable_category: item.selectableCategory || null,
            allowed_product_ids: Array.isArray(item.allowedProductIds) ? item.allowedProductIds : []
          }));
          const { error: insertError } = await supabase.from('combo_items').insert(comboInserts);
          if (insertError) {
            console.error('Error inserting combo items during update:', insertError);
          }
        }
      }

      setProducts(prev => prev.map(p => {
        if (p.id === id) {
          const newBranchData = updates.branchData || p.branchData;
          const currentData = newBranchData[currentBranch!.id] || { price: 0, offerPrice: undefined, stock: 0, isVisible: true };
          const stockRecord: Record<string, number> = {};
          Object.entries(newBranchData).forEach(([bid, bData]) => {
            stockRecord[bid] = (bData as any).stock;
          });

          return {
            ...p,
            ...updates,
            price: Math.round(currentData.price),
            offerPrice: currentData.offerPrice ? Math.round(currentData.offerPrice) : undefined,
            stock: stockRecord
          };
        }
        return p;
      }));
      toast.success('Producto actualizado exitosamente');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error al actualizar el producto');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      // Eliminar registros relacionados para evitar errores de clave foránea
      await supabase.from('product_stock').delete().eq('product_id', id);
      await supabase.from('inventory_movements').delete().eq('product_id', id);
      await supabase.from('combo_items').delete().eq('combo_product_id', id);
      await supabase.from('combo_items').delete().eq('component_product_id', id);
      await supabase.from('promotions').delete().eq('product_id', id);
      await supabase.from('sale_items').delete().eq('product_id', id);

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Producto eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar el producto: ' + (error.message || 'Error de permisos o integridad'));
    }
  };

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [data, ...prev]);
      toast.success('Categoría creada exitosamente');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Error al crear la categoría');
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast.success('Categoría actualizada exitosamente');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Error al actualizar la categoría');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;

      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Categoría eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error al eliminar la categoría');
    }
  };

  // ─── Promotions ───────────────────────────────────────────────────────────
  const addPromotion = async (promo: Omit<Promotion, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .insert({
          name: promo.name,
          type: promo.type,
          product_id: promo.productId,
          buy_quantity: promo.buyQuantity ?? null,
          get_quantity: promo.getQuantity ?? null,
          discount_price: promo.discountPrice ? Math.round(promo.discountPrice) : null,
          start_date: promo.startDate ?? null,
          end_date: promo.endDate ?? null,
          start_time: promo.startTime ?? null,
          end_time: promo.endTime ?? null,
          days_of_week: promo.daysOfWeek ?? null,
          is_active: promo.isActive
        })
        .select()
        .single();

      if (error) throw error;

      setPromotions(prev => [...prev, {
        id: data.id, name: data.name, type: data.type,
        productId: data.product_id, buyQuantity: data.buy_quantity,
        getQuantity: data.get_quantity, discountPrice: data.discount_price,
        startDate: data.start_date, endDate: data.end_date,
        startTime: data.start_time, endTime: data.end_time,
        daysOfWeek: data.days_of_week, isActive: data.is_active
      }]);
      toast.success('Promoción creada');
    } catch (error) {
      console.error('Error adding promotion:', error);
      toast.error('Error al crear la promoción');
    }
  };

  const updatePromotion = async (id: string, updates: Partial<Promotion>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.buyQuantity !== undefined) dbUpdates.buy_quantity = updates.buyQuantity;
      if (updates.getQuantity !== undefined) dbUpdates.get_quantity = updates.getQuantity;
      if (updates.discountPrice !== undefined) dbUpdates.discount_price = updates.discountPrice ? Math.round(updates.discountPrice) : null;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
      if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
      if (updates.daysOfWeek !== undefined) dbUpdates.days_of_week = updates.daysOfWeek;

      const { error } = await supabase.from('promotions').update(dbUpdates).eq('id', id);
      if (error) throw error;

      setPromotions(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      toast.success('Promoción actualizada');
    } catch (error) {
      console.error('Error updating promotion:', error);
      toast.error('Error al actualizar la promoción');
    }
  };

  const deletePromotion = async (id: string) => {
    try {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
      setPromotions(prev => prev.filter(p => p.id !== id));
      toast.success('Promoción eliminada');
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast.error('Error al eliminar la promoción');
    }
  };

  /**
   * Returns the first currently-active promotion for a product.
   * For scheduled_discount type it checks date & time & day restrictions.
   */
  const getActivePromotion = (productId: string): Promotion | null => {
    const promos = promotions.filter(p => p.productId === productId && p.isActive);
    if (promos.length === 0) return null;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const nowTime = now.toTimeString().substring(0, 5); // HH:MM
    const todayDow = now.getDay(); // 0=Sun

    for (const promo of promos) {
      if (promo.type === 'buy_x_get_y') {
        return promo; // always active (controlled by cart logic)
      }
      if (promo.type === 'scheduled_discount') {
        const afterStart = !promo.startDate || todayStr >= promo.startDate;
        const beforeEnd  = !promo.endDate   || todayStr <= promo.endDate;
        const inTime     = (!promo.startTime || nowTime >= promo.startTime) &&
                           (!promo.endTime   || nowTime <= promo.endTime);
        const inDay      = !promo.daysOfWeek || promo.daysOfWeek.length === 0 ||
                           promo.daysOfWeek.includes(todayDow);
        if (afterStart && beforeEnd && inTime && inDay) return promo;
      }
    }
    return null;
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      branches, setBranches,
      currentBranch, setCurrentBranch,
      products, setProducts,
      sales, setSales,
      suppliers, setSuppliers,
      users, setUsers,
      categories, setCategories,
      movements, setMovements,
      companySettings, setCompanySettings: updateCompanySettings,
      cart, addToCart, removeFromCart, updateCartQuantity, clearCart, updateCartNotes, processSale, voidSale, transferStock, adjustStock, receiveStock,
      addProduct, updateProduct, deleteProduct,
      addCategory, updateCategory, deleteCategory,
      promotions, addPromotion, updatePromotion, deletePromotion, getActivePromotion,
      isLoading,
      isConfigured,
      isDarkMode,
      toggleDarkMode
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
