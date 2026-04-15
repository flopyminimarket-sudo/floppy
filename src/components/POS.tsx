import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, Barcode, Printer, Bluetooth, BluetoothConnected, Usb, Package, X, Bell, ChevronDown, DollarSign, ChevronRight, Moon, Sun, Layers, User } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { printer } from '../lib/bluetoothPrinter';
import { PrintTicket } from './PrintTicket';
import toast from 'react-hot-toast';
import { Product } from '../types';

export const POS = () => {
  const { products, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, updateCartNotes, processSale, currentBranch, branches, setCurrentBranch, companySettings, getActivePromotion, isDarkMode, toggleDarkMode } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [allowFlexibleSearch, setAllowFlexibleSearch] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  
  // Printer state
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [autoPrint, setAutoPrint] = useState(currentBranch?.auto_print_ticket ?? true);


  // Sync autoPrint with branch settings when branch changes
  useEffect(() => {
    // Solo permitir auto-impresión si la sucursal coincide con el Local 2 (identificado por nombre)
    const isLocalWithPrinter = currentBranch?.name?.toLowerCase().includes('2');
    setAutoPrint(isLocalWithPrinter ? (currentBranch?.auto_print_ticket ?? false) : false);
  }, [currentBranch?.id, currentBranch?.auto_print_ticket, currentBranch?.name]);

  // --- Estado del modal de selección de componente de combo ---
  const [comboSelectionModal, setComboSelectionModal] = useState<{
    combo: Product;
    selectableItem: { quantity: number; category: string; label: string; allowedProductIds?: string[] };
    searchFilter: string;
  } | null>(null);

  // Handle barcode scanning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is not typing in another input, focus barcode input
      if (document.activeElement?.tagName !== 'INPUT') {
        barcodeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const generateBarcode = (id: string) => {
    const hex = id.replace(/-/g, '').substring(0, 8);
    const numStr = parseInt(hex, 16).toString().padStart(10, '0');
    return '20' + numStr;
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = barcodeInput.trim();
    if (!cleanInput) return;

    // First try exact barcode match
    let product = products.find(p => {
      const internalBarcode = generateBarcode(p.id);
      return p.barcode?.trim() === cleanInput || (!p.barcode && internalBarcode === cleanInput.toUpperCase());
    });

    // If not found and flexible search is enabled, try by name
    if (!product && allowFlexibleSearch) {
      product = products.find(p => 
        p.name?.toLowerCase().includes(cleanInput.toLowerCase()) ||
        p.brand?.toLowerCase().includes(cleanInput.toLowerCase())
      );
    }

    if (product) {
      handleProductClick(product); // Route through handleProductClick to support weight products properly
      setBarcodeInput('');
    } else {
      if (allowFlexibleSearch) {
        toast.error('No se encontró ningún producto con ese nombre');
      }
      setBarcodeInput('');
    }
  };

  const [weightInput, setWeightInput] = useState('');
  const [selectedWeightProduct, setSelectedWeightProduct] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'amipass' | 'pluxe' | 'edenred' | 'transfer' | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');

  const handleProductClick = (product: any) => {
    if (product.saleType === 'weight') {
      setSelectedWeightProduct(product);
      setWeightInput('');
    } else {
      const stock = product.stock?.[currentBranch?.id] ?? 0;
      if (!product.allowNegativeStock && stock <= 0) {
        toast.error(`Sin stock disponible para "${product.name}"`);
        return;
      }

      // Aplicar precio de promoción si aplica
      const promo = getActivePromotion(product.id);
      const productWithPromo = (promo?.type === 'scheduled_discount' && promo.discountPrice)
        ? { ...product, offerPrice: promo.discountPrice }
        : product;

      // --- Si es combo con componente seleccionable, abrir modal ---
      if (product.isCombo && product.comboItems?.length > 0) {
        const selectableItem = product.comboItems.find((ci: any) => ci.isSelectable && ci.selectableCategory);
        if (selectableItem) {
          setComboSelectionModal({
            combo: productWithPromo,
            selectableItem: {
              quantity: selectableItem.quantity,
              category: selectableItem.selectableCategory!,
              label: selectableItem.selectableCategory!,
              allowedProductIds: selectableItem.allowedProductIds
            },
            searchFilter: ''
          });
          return; // Esperar selección del cajero
        }
      }

      addToCart(productWithPromo);
    }
  };

  /** Confirma la selección del cajero: agrega el combo + el componente elegido */
  const handleComboComponentSelected = (selectedProduct: Product) => {
    if (!comboSelectionModal) return;
    const { combo, selectableItem } = comboSelectionModal;

    // Verificar stock del producto elegido
    const availableStock = selectedProduct.stock?.[currentBranch?.id ?? ''] ?? 0;
    if (!selectedProduct.allowNegativeStock && availableStock < selectableItem.quantity) {
      toast.error(`Sin stock suficiente de "${selectedProduct.name}"`);
      return;
    }

    // Agregar el combo normalmente (addToCart ya maneja los componentes fijos)
    addToCart(combo);

    // Agregar el componente seleccionado manualmente con precio $0
    // Usamos setCart directamente a través de addToCart con precio sobreescrito
    // Para esto necesitamos pasar el producto modificado
    const componentAsCartItem = {
      ...selectedProduct,
      price: 0,
      offerPrice: undefined,
      isComboComponent: true,
      parentComboId: combo.id
    } as any;

    // Llamamos addToCart pero como el precio es 0 la validación de stock se hace aquí
    // Necesitamos inyectarlo directamente, lo hacemos con un hack controlado:
    // addToCart con precio forzado a 0 — para esto modificamos el producto temporal
    addToCart(componentAsCartItem, selectableItem.quantity);

    setComboSelectionModal(null);
    toast.success(`Combo ${combo.name} con ${selectedProduct.name} agregado`);
  };

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWeightProduct && weightInput) {
      addToCart(selectedWeightProduct, parseFloat(weightInput));
      setSelectedWeightProduct(null);
      setWeightInput('');
    }
  };

  const handleConnectUSB = async () => {
    try {
      if (isPrinterConnected) {
        printer.disconnect();
        setIsPrinterConnected(false);
        toast.success('Impresora desconectada');
      } else {
        await printer.connectUSB();
        setIsPrinterConnected(true);
        toast.success('Impresora USB conectada exitosamente');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al conectar la impresora USB');
      setIsPrinterConnected(false);
    }
  };

  const handleConnectBluetooth = async () => {
    try {
      if (isPrinterConnected) {
        printer.disconnect();
        setIsPrinterConnected(false);
        toast.success('Impresora desconectada');
      } else {
        await printer.connectBluetooth();
        setIsPrinterConnected(true);
        toast.success('Impresora Bluetooth conectada exitosamente');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al conectar la impresora Bluetooth');
      setIsPrinterConnected(false);
    }
  };

  const handleProcessSale = async () => {
    if (!selectedPaymentMethod) return;
    try {
      const sale = await processSale(selectedPaymentMethod, customerName);
      setSelectedPaymentMethod(null);
      setCustomerName(''); // Limpiar nombre después de venta
      
      if (sale) {
        setLastSale(sale);
        setShowSuccessModal(true);
        
        // Solo imprimir automáticamente si es el Local 2 y tiene la opción activa
        if (autoPrint && currentBranch?.name?.toLowerCase().includes('2')) {
          handlePrintTicket(sale);
        }
      }
    } catch (error) {
      toast.error('Error al procesar la venta');
      console.error(error);
    }
  };

  const handlePrintTicket = async (sale: any) => {
    if (!isPrinterConnected) {
      // Sin impresora térmica: fallback al navegador (window.print)
      // El componente <PrintTicket> oculto al final del JSX se encarga de mostrar el ticket
      setLastSale(sale); // Asegurar que lastSale tiene la venta correcta
      setTimeout(() => window.print(), 100); // Pequeño delay para que React actualice el DOM
      return;
    }

    try {
      await printer.print(sale, {
        name: companySettings.name,
        address: companySettings.address,
        phone: companySettings.phone
      });
      toast.success('Recibo impreso');
    } catch (error: any) {
      toast.error('Error al imprimir: ' + error.message);
    }
  };

  const filteredProducts = products.filter(p => 
    (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.barcode || '').includes(searchTerm)
  );

  // Productos del modal filtrados: si el admin autorizó IDs específicos, usar esos; si no, filtrar por categoría
  const comboModalProducts = comboSelectionModal
    ? products.filter(p => {
        const { allowedProductIds, category } = comboSelectionModal.selectableItem;
        const matchSearch = comboSelectionModal.searchFilter
          ? (p.name?.toLowerCase() || '').includes(comboSelectionModal.searchFilter.toLowerCase())
          : true;

        if (allowedProductIds && allowedProductIds.length > 0) {
          // Modo restringido: solo los productos que el admin autorizó
          return allowedProductIds.includes(p.id) && matchSearch;
        }

        // Modo libre: todos los de la categoría (comportamiento original)
        const matchCategory = (p.category?.toLowerCase().trim() || '') === category.toLowerCase().trim();
        return matchCategory && matchSearch;
      })
    : [];

  const total = Math.round(cart.reduce((acc, item) => acc + (Math.round(item.offerPrice || item.price) * item.quantity), 0));

  return (
    <>
    <div className={cn(
      "flex flex-col h-full bg-zinc-50 overflow-hidden print:hidden transition-colors duration-300",
      "dark:bg-zinc-950 dark:text-zinc-100"
    )}>
      {/* Custom POS Header */}
      <header className="h-20 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-zinc-400">
            <span>{companySettings.name}</span>
            <span>/</span>
            <span className="text-zinc-900 font-bold">Pos</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <select
              value={currentBranch?.id}
              onChange={(e) => {
                const branch = branches.find(b => b.id === e.target.value);
                if (branch) setCurrentBranch(branch);
              }}
              className="appearance-none bg-blue-50 border-none text-blue-700 py-2.5 pl-4 pr-10 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
          </div>
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Búsqueda rápida..." 
              className="pl-10 pr-4 py-2.5 bg-zinc-50 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
            />
          </div>
          <button 
            onClick={toggleDarkMode}
            className="p-2.5 bg-zinc-50 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
            title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button className="relative p-2.5 bg-zinc-50 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-800" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Products Selection (Left Column) */}
        <div className="flex-1 flex flex-col p-6 gap-6 min-w-0 overflow-hidden">
          <div className="flex gap-4 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-[14px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-700 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <form onSubmit={handleBarcodeSubmit} className="relative w-72">
                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="Escanear código..."
                  className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-[14px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-700 font-medium"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                />
              </form>
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-zinc-200 px-4 py-4 rounded-[14px] shadow-sm hover:bg-zinc-50 transition-colors shrink-0">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  checked={allowFlexibleSearch}
                  onChange={(e) => setAllowFlexibleSearch(e.target.checked)}
                />
                <span className="text-xs font-black text-zinc-500 uppercase whitespace-nowrap">Permitir sin código</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-6">
            {filteredProducts.map(product => (
              <motion.button
                key={product.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleProductClick(product)}
                className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 text-left group relative overflow-hidden min-h-[280px]"
              >
                {/* Status Badges */}
                <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
                  {product.isPack && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-blue-600 text-white shadow-sm flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Pack {product.packUnits}u
                    </span>
                  )}
                  {product.expiryDate && (
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-lg font-bold shadow-sm whitespace-nowrap",
                      new Date(product.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    )}>
                      Exp: {new Date(product.expiryDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Stock Indicator - Top Right */}
                <div className="absolute top-2 right-2 z-10">
                  {(() => {
                    const currentStock = product.stock?.[currentBranch?.id || ''] || 0;
                    const minStockThreshold = product.minStock ?? 5;
                    let badgeStyles = "bg-emerald-500/90 text-white"; 
                    
                    if (currentStock <= 0) {
                      badgeStyles = "bg-red-500/90 text-white";
                    } else if (currentStock <= minStockThreshold) {
                      badgeStyles = "bg-amber-500/90 text-white";
                    }
                    
                    return (
                      <span className={cn(
                        "text-[11px] px-2 py-1 rounded-lg font-black shadow-md tracking-tighter whitespace-nowrap backdrop-blur-sm",
                        badgeStyles
                      )}>
                        {currentStock} {product.saleType === 'weight' ? 'kg' : 'u'}
                      </span>
                    );
                  })()}
                </div>

                {/* Product Image Section */}
                <div className="h-40 w-full bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-300 dark:text-zinc-700 group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-colors overflow-hidden relative border-b border-zinc-100 dark:border-zinc-800">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <ShoppingCart className="w-10 h-10" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{product.category || 'Sin categoría'}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Product Info Section */}
                <div className="p-4 flex flex-col flex-1 gap-1">
                  <h3 className="font-black text-zinc-800 dark:text-zinc-100 text-sm leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider mb-1">
                        {product.brand || 'Marca Genérica'}
                      </p>
                      <div className="flex items-baseline gap-1.5">
                        {product.offerPrice ? (
                          <>
                            <span className="text-xl font-black text-blue-600 dark:text-blue-400 leading-none">
                              {formatCurrency(product.offerPrice)}
                            </span>
                            <span className="text-[11px] text-zinc-400 line-through font-bold">
                              {formatCurrency(product.price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xl font-black text-blue-600 dark:text-blue-400 leading-none">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-blue-200 dark:group-hover:shadow-none">
                      <Plus className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Cart Sidebar (Right Column) - Expanded and Fixed */}
        <div className="w-[500px] flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] shrink-0 overflow-hidden">
          <div className="p-3 bg-blue-600 text-white flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tight">
                  Nueva Orden
                </h2>
                <p className="text-blue-100 text-xs font-bold mt-1 uppercase tracking-widest">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-sm">
                <button
                  onClick={() => setAutoPrint(!autoPrint)}
                  className={cn(
                    "p-2.5 rounded-lg transition-all",
                    autoPrint ? "bg-white text-blue-600 shadow-sm" : "text-blue-100 hover:bg-white/20"
                  )}
                  title={autoPrint ? "Impresión automática activada" : "Impresión automática desactivada"}
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={handleConnectUSB}
                  className={cn(
                    "p-2.5 rounded-lg transition-all flex items-center gap-1",
                    isPrinterConnected && printer.connectionType === 'usb' ? "bg-white text-blue-600 shadow-sm" : "text-blue-100 hover:bg-white/20"
                  )}
                  title={isPrinterConnected && printer.connectionType === 'usb' ? "Desconectar impresora USB" : "Conectar impresora USB"}
                >
                  <Usb className="w-4 h-4" />
                </button>
                <button
                  onClick={handleConnectBluetooth}
                  className={cn(
                    "p-2.5 rounded-lg transition-all flex items-center gap-1",
                    isPrinterConnected && printer.connectionType === 'bluetooth' ? "bg-white text-blue-600 shadow-sm" : "text-blue-100 hover:bg-white/20"
                  )}
                  title={isPrinterConnected && printer.connectionType === 'bluetooth' ? "Desconectar impresora Bluetooth" : "Conectar impresora Bluetooth"}
                >
                  {isPrinterConnected && printer.connectionType === 'bluetooth' ? <BluetoothConnected className="w-4 h-4" /> : <Bluetooth className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-zinc-50/30 dark:bg-zinc-950/30 custom-scrollbar">
            <AnimatePresence initial={false}>
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 gap-4 opacity-60">
                  <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-2">
                    <ShoppingCart className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                  </div>
                  <p className="font-bold text-lg uppercase tracking-tight">El carrito está vacío</p>
                  <p className="text-sm text-center px-8 font-medium">Escanea un código de barras o selecciona un producto para comenzar.</p>
                </div>
              ) : (
                cart.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="flex flex-col gap-1 p-4 bg-white dark:bg-zinc-800 rounded-[14px] shadow-sm border border-zinc-100 dark:border-zinc-700 items-start group relative"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-700">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-6 h-6 text-zinc-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate uppercase">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-blue-600 font-black">{formatCurrency(item.offerPrice || item.price)}</p>
                          {item.isPack && (
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">Pack {item.packUnits}u</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                          {formatCurrency((item.offerPrice || item.price) * item.quantity)}
                        </span>
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1">
                          <button 
                            onClick={() => updateCartQuantity(item.id, item.quantity - (item.saleType === 'weight' ? 0.1 : 1))}
                            className="p-1.5 hover:bg-white rounded-lg text-zinc-500 transition-colors shadow-sm"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-12 text-center text-xs font-black text-zinc-700">
                            {item.saleType === 'weight' ? item.quantity.toFixed(3) : item.quantity}
                          </span>
                          <button 
                            onClick={() => updateCartQuantity(item.id, item.quantity + (item.saleType === 'weight' ? 0.1 : 1))}
                            className="p-1.5 hover:bg-white rounded-lg text-zinc-500 transition-colors shadow-sm"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {(item.category?.toUpperCase() === 'COMIDA RAPIDA' || item.category?.toUpperCase() === 'COMIDA RÁPIDA') && (
                      <div className="w-full mt-2 animate-in fade-in slide-in-from-top-1">
                        <input
                          type="text"
                          placeholder="Nota p/ cocina (ej: sin ají)"
                          className="w-full p-2.5 text-[11px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 placeholder:italic"
                          value={item.notes || ''}
                          onChange={(e) => updateCartNotes(item.id, e.target.value)}
                        />
                      </div>
                    )}
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Fixed Bottom Cart Controls */}
          <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] shrink-0 flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Cant. Prod:</span>
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-none">
                  {cart.reduce((sum, item) => sum + (item.saleType === 'weight' ? 1 : item.quantity), 0)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total a Pagar</span>
                <span className="text-3xl font-black text-blue-600 leading-none">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="w-full relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="NOMBRE CLIENTE (PEDIR AL CLIENTE)"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-blue-500 rounded-lg py-2.5 pl-10 pr-3 text-sm text-zinc-900 dark:text-zinc-100 font-black placeholder-zinc-400 outline-none transition-all uppercase"
              />
              {!customerName && (
                <div className="absolute -top-6 left-0 text-[10px] font-black text-blue-600 dark:text-blue-400 animate-pulse uppercase tracking-wider">
                  ¡Preguntar nombre! ☝️
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5 h-12">
              {[
                { id: 'cash', label: 'Efectivo', bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50', border: 'border-emerald-200 dark:border-emerald-800' },
                { id: 'card', label: 'Tarjeta', bg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/50', border: 'border-blue-200 dark:border-blue-800' },
                { id: 'amipass', label: 'Amipass', bg: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600', hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/50', border: 'border-orange-200 dark:border-orange-800' },
                { id: 'pluxe', label: 'Pluxe', bg: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600', hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/50', border: 'border-sky-200 dark:border-sky-800' },
                { id: 'edenred', label: 'Edenred', bg: 'bg-red-50 dark:bg-red-950/30 text-red-600', hover: 'hover:bg-red-100 dark:hover:bg-red-900/50', border: 'border-red-200 dark:border-red-800' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedPaymentMethod(m.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border text-[10px] font-black uppercase tracking-tighter leading-none transition-all",
                    m.bg,
                    m.hover,
                    m.border,
                    selectedPaymentMethod === m.id ? "ring-2 ring-blue-500 shadow-md scale-105 z-10 opacity-100" : "opacity-60 grayscale-[50%]"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              disabled={cart.length === 0 || !selectedPaymentMethod}
              onClick={handleProcessSale}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-black text-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-[0.99]"
            >
              <CreditCard className="w-5 h-5" />
              <span className="uppercase tracking-tighter">PAGAR</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Modal: Selección de Componente de Combo (ej: Bebida) ─── */}
      <AnimatePresence>
        {comboSelectionModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-blue-600 to-blue-500 text-white shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight">
                        Elige la {comboSelectionModal.selectableItem.label}
                      </h3>
                      <p className="text-blue-100 text-xs font-bold mt-0.5">
                        Combo: {comboSelectionModal.combo.name} · Cantidad: {comboSelectionModal.selectableItem.quantity}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setComboSelectionModal(null)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Búsqueda dentro del modal */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200" />
                  <input
                    autoFocus
                    type="text"
                    placeholder={`Buscar ${comboSelectionModal.selectableItem.label.toLowerCase()}...`}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/15 border border-white/20 rounded-xl text-white placeholder:text-blue-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
                    value={comboSelectionModal.searchFilter}
                    onChange={(e) => setComboSelectionModal(prev => prev ? { ...prev, searchFilter: e.target.value } : null)}
                  />
                </div>
              </div>

              {/* Grid de productos */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {comboModalProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-3">
                    <ShoppingCart className="w-12 h-12 opacity-30" />
                    <p className="font-bold text-sm">
                      {comboSelectionModal.selectableItem.allowedProductIds?.length
                        ? 'Ningún producto autorizado tiene stock disponible'
                        : `No hay ${comboSelectionModal.selectableItem.label.toLowerCase()}s disponibles con stock`
                      }
                    </p>
                    <p className="text-xs text-center text-zinc-400">
                      {comboSelectionModal.selectableItem.allowedProductIds?.length
                        ? `El admin autorizó ${comboSelectionModal.selectableItem.allowedProductIds.length} producto(s) pero ninguno tiene stock actualmente.`
                        : `Verifica que existan productos en la categoría "${comboSelectionModal.selectableItem.category}" con stock mayor a 0.`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {comboModalProducts.map(product => {
                      const stock = product.stock?.[currentBranch?.id ?? ''] ?? 0;
                      return (
                        <motion.button
                          key={product.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleComboComponentSelected(product)}
                          className="flex flex-col bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left group overflow-hidden"
                        >
                          {/* Imagen */}
                          <div className="h-28 w-full bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden border-b border-zinc-100 dark:border-zinc-700 relative">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Package className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                            )}
                            {/* Badge de stock */}
                            <span className="absolute top-2 right-2 text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-lg">
                              {stock} u
                            </span>
                          </div>
                          {/* Info */}
                          <div className="p-3">
                            <p className="text-xs font-black text-zinc-800 dark:text-zinc-100 leading-tight uppercase line-clamp-2">
                              {product.name}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-bold mt-0.5 uppercase">
                              {product.brand || 'Sin marca'}
                            </p>
                            <div className="mt-2 py-1.5 bg-blue-600 group-hover:bg-blue-700 text-white text-[11px] font-black text-center rounded-lg uppercase tracking-wide transition-colors">
                              Elegir
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0">
                <button
                  onClick={() => setComboSelectionModal(null)}
                  className="w-full py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-black text-sm uppercase hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Weight Input Modal */}
      <AnimatePresence>
        {selectedWeightProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-[14px] shadow-2xl w-full max-w-sm overflow-hidden border border-zinc-100 dark:border-zinc-800"
            >
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{selectedWeightProduct.name}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Ingrese el peso en kilogramos</p>
              </div>
              <form onSubmit={handleWeightSubmit} className="p-8 space-y-6">
                <div className="relative">
                  <input
                    autoFocus
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    className="w-full text-5xl font-black text-center p-6 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-[14px] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 transition-all"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-zinc-400 dark:text-zinc-600">kg</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setSelectedWeightProduct(null)}
                    className="px-6 py-5 text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-[14px] transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-5 bg-blue-600 dark:bg-blue-500 text-white font-black rounded-[14px] hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 dark:shadow-none uppercase tracking-tight"
                  >
                    Agregar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && lastSale && (
          <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[14px] shadow-2xl w-full max-w-sm overflow-hidden border border-zinc-100 dark:border-zinc-800"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bell className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight mb-2">¡VENTA EXITOSA!</h3>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-8">La venta ha sido registrada correctamente.</p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handlePrintTicket(lastSale);
                      setShowSuccessModal(false);
                    }}
                    className="w-full py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-[14px] font-black text-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none"
                  >
                    <Printer className="w-5 h-5" />
                    IMPRIMIR TICKET
                  </button>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-[14px] font-black text-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    NUEVA VENTA
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

    {/* Hidden Ticket specifically for browser printing */}
    <div className="print-area">
      <PrintTicket sale={lastSale} companySettings={companySettings} />
    </div>
    </>
  );
};
