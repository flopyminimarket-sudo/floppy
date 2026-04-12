import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../AppContext';
import {
  History, ArrowUpRight, ArrowDownRight, Search,
  Package, ArrowRightLeft, X, ClipboardList, Settings2,
  ChevronRight, AlertTriangle, TrendingUp, Barcode, Plus,
  CheckCircle2, XCircle
} from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

type ModalType = 'transfer' | 'adjust' | 'receive' | null;

// Reproduces the same logic as POS.tsx so internal barcodes match
const generateBarcode = (id: string) => {
  const hex = id.replace(/-/g, '').substring(0, 8);
  const numStr = parseInt(hex, 16).toString().padStart(10, '0');
  return '20' + numStr;
};

const findProductByBarcode = (products: any[], code: string) =>
  products.find(p => {
    const internal = generateBarcode(p.id);
    return p.barcode?.trim() === code.trim() || (!p.barcode && internal === code.trim().toUpperCase());
  });

// ── Barcode scanner input component ─────────────────────────────────────────
interface BarcodeScannerProps {
  products: any[];
  onFound: (product: any) => void;
  onNotFound: (code: string) => void;
  autoFocus?: boolean;
}

const BarcodeScanner = ({ products, onFound, onNotFound, autoFocus }: BarcodeScannerProps) => {
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'found' | 'notfound'>('idle');
  const [notFoundCode, setNotFoundCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const code = inputValue.trim();
    if (!code) return;

    const product = findProductByBarcode(products, code);
    if (product) {
      setStatus('found');
      setInputValue('');
      onFound(product);
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('notfound');
      setNotFoundCode(code);
      setInputValue('');
    }
  }, [inputValue, products, onFound, onNotFound]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1.5">
        <Barcode className="w-3.5 h-3.5" /> Escanear Código de Barras
      </label>
      <form onSubmit={handleSubmit}>
        <div className={cn(
          'flex items-center gap-2 border-2 rounded-xl transition-all px-3',
          status === 'found' ? 'border-emerald-400 bg-emerald-50' :
          status === 'notfound' ? 'border-red-300 bg-red-50' :
          'border-zinc-200 bg-zinc-50 focus-within:border-blue-400 focus-within:bg-white'
        )}>
          <Barcode className={cn('w-4 h-4 shrink-0',
            status === 'found' ? 'text-emerald-500' :
            status === 'notfound' ? 'text-red-400' : 'text-zinc-400'
          )} />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setStatus('idle'); setNotFoundCode(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit(e as any)}
            placeholder="Escanea o escribe el código..."
            className="flex-1 py-2.5 bg-transparent text-sm focus:outline-none"
          />
          {status === 'found' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 animate-pulse" />}
          {status === 'notfound' && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
          {inputValue && (
            <button
              type="submit"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 rounded-lg shrink-0"
            >
              Buscar
            </button>
          )}
        </div>
      </form>

      {/* Product not found → offer to create */}
      {status === 'notfound' && notFoundCode && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3"
        >
          <div>
            <p className="text-sm font-bold text-red-700">Código no encontrado</p>
            <p className="text-xs text-red-500 font-mono">{notFoundCode}</p>
          </div>
          <button
            onClick={() => onNotFound(notFoundCode)}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Producto
          </button>
        </motion.div>
      )}
    </div>
  );
};

// ── Main Inventory Component ─────────────────────────────────────────────────
export const Inventory = () => {
  const {
    products, movements, currentBranch, branches,
    transferStock, adjustStock, receiveStock
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [newStockQty, setNewStockQty] = useState('');
  const [reason, setReason] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // For redirect to Products page when creating new
  const [redirectToNew, setRedirectToNew] = useState<string | null>(null);

  const openModal = (type: ModalType, preselectedId?: string) => {
    setActiveModal(type);
    setSelectedProductId(preselectedId ?? '');
    setQuantity('');
    setNewStockQty('');
    setReason('');
    setToBranchId('');
    setRedirectToNew(null);
  };

  const closeModal = () => { setActiveModal(null); setRedirectToNew(null); };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const currentStock = selectedProduct?.stock?.[currentBranch?.id ?? ''] ?? 0;

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const prod = products.find(p => p.id === id);
    const stock = prod?.stock?.[currentBranch?.id ?? ''] ?? 0;
    setNewStockQty(stock.toString());
  };

  // Barcode found → auto-select product
  const handleBarcodeFound = (product: any) => {
    toast.success(`✅ ${product.name} encontrado`);
    handleProductSelect(product.id);
    setSelectedProductId(product.id);
  };

  // Barcode not found → show inline new-product redirect hint
  const handleBarcodeNotFound = (code: string) => {
    setRedirectToNew(code);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !toBranchId || !quantity) { toast.error('Completa todos los campos'); return; }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) { toast.error('Cantidad inválida'); return; }
    if (qty > currentStock) { toast.error(`Stock insuficiente. Disponible: ${currentStock}`); return; }
    setIsSaving(true);
    await transferStock(selectedProductId, currentBranch!.id, toBranchId, qty);
    setIsSaving(false);
    closeModal();
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || newStockQty === '') { toast.error('Selecciona producto y cantidad'); return; }
    const nq = parseFloat(newStockQty);
    if (isNaN(nq) || nq < 0) { toast.error('Cantidad inválida'); return; }
    if (!reason.trim()) { toast.error('Ingresa el motivo del ajuste'); return; }
    setIsSaving(true);
    await adjustStock(selectedProductId, currentBranch!.id, nq, reason);
    setIsSaving(false);
    closeModal();
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity) { toast.error('Selecciona producto y cantidad'); return; }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) { toast.error('Cantidad inválida'); return; }
    const motivo = reason.trim() || 'Entrada de mercadería';
    setIsSaving(true);
    await receiveStock(selectedProductId, currentBranch!.id, qty, motivo);
    setIsSaving(false);
    closeModal();
  };

  // ── Filtered movements ───────────────────────────────────────────────────
  const branchMovements = movements
    .filter(m => m.branchId === currentBranch?.id || m.toBranchId === currentBranch?.id)
    .filter(m => filterType === 'all' || m.type === filterType);

  const lowStockProducts = products.filter(p => (p.stock?.[currentBranch?.id ?? ''] ?? 0) <= (p.minStock ?? 5));

  return (
    <div className="p-6 space-y-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Inventario</h1>
          <p className="text-zinc-500">Movimientos y ajustes de stock — <span className="font-bold text-blue-600">{currentBranch?.name}</span></p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => openModal('transfer')} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-600 font-bold hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm">
            <ArrowRightLeft className="w-4 h-4 text-purple-500" /> Transferir Stock
          </button>
          <button onClick={() => openModal('adjust')} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-600 font-bold hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm">
            <Settings2 className="w-4 h-4 text-amber-500" /> Ajuste de Stock
          </button>
          <button onClick={() => openModal('receive')} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            <Package className="w-5 h-5" /> Entrada Mercadería
          </button>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[14px] px-5 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm font-bold text-amber-800">
            {lowStockProducts.length} producto(s) con stock bajo:&nbsp;
            <span className="font-normal">{lowStockProducts.slice(0, 4).map(p => p.name).join(', ')}{lowStockProducts.length > 4 ? '…' : ''}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Movement History */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" /> Historial de Movimientos
            </h3>
            <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-bold">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'in', label: 'Entradas' },
                { id: 'out', label: 'Salidas' },
                { id: 'transfer', label: 'Trans.' },
                { id: 'adjustment', label: 'Ajustes' }
              ].map(f => (
                <button key={f.id} onClick={() => setFilterType(f.id)}
                  className={cn('px-3 py-1.5 rounded-lg transition-all', filterType === f.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-zinc-100 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {branchMovements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-400 gap-2">
                  <ClipboardList className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-bold">No hay movimientos registrados</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-zinc-50 z-10">
                    <tr className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Producto</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Cant.</th>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {branchMovements.map(m => {
                      const product = products.find(p => p.id === m.productId);
                      const isIncomingTransfer = m.type === 'transfer' && m.toBranchId === currentBranch?.id;
                      const displayType = isIncomingTransfer ? 'in' : m.type;
                      const displayQuantity = isIncomingTransfer ? Math.abs(m.quantity) : m.quantity;

                      const typeConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
                        in:         { label: 'Entrada',       cls: 'bg-emerald-50 text-emerald-600', icon: <ArrowDownRight className="w-3 h-3" /> },
                        out:        { label: 'Salida',        cls: 'bg-rose-50 text-rose-600',       icon: <ArrowUpRight className="w-3 h-3" /> },
                        transfer:   { label: 'Transferencia', cls: 'bg-purple-50 text-purple-600',   icon: <ArrowRightLeft className="w-3 h-3" /> },
                        adjustment: { label: 'Ajuste',        cls: 'bg-amber-50 text-amber-600',     icon: <Settings2 className="w-3 h-3" /> },
                      };
                      const tc = typeConfig[displayType] || typeConfig['adjustment'];

                      return (
                        <tr key={m.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-zinc-900 text-sm">{product?.name || 'Desconocido'}</td>
                          <td className="px-6 py-4">
                            <span className={cn('flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full w-fit', tc.cls)}>
                              {tc.icon} {tc.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold">
                            <span className={displayQuantity > 0 ? 'text-emerald-600' : 'text-rose-500'}>
                              {displayQuantity > 0 ? `+${displayQuantity}` : displayQuantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-500">{formatDate(m.date)}</td>
                          <td className="px-6 py-4 text-sm text-zinc-600 max-w-[200px] truncate" title={m.reason}>{m.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Quick stock panel */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" /> Consulta Rápida
          </h3>
          <div className="bg-white p-5 rounded-[14px] border border-zinc-100 shadow-sm flex flex-col gap-3 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar producto..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
              {products
                .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.brand?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(p => {
                  const stock = p.stock?.[currentBranch?.id ?? ''] ?? 0;
                  return (
                    <div key={p.id}
                      onClick={() => openModal('receive', p.id)}
                      className="flex items-center justify-between p-3 hover:bg-zinc-50 rounded-[14px] transition-all border border-transparent hover:border-zinc-100 cursor-pointer group">
                      <div className="flex items-center gap-2 min-w-0">
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          : <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-zinc-400" /></div>
                        }
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-zinc-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-zinc-400 uppercase font-bold">{p.brand || p.category || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className={cn('text-sm font-black', stock <= (p.minStock ?? 5) ? 'text-rose-500' : stock <= (p.minStock ?? 5) * 2 ? 'text-amber-500' : 'text-emerald-600')}>{stock}</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase">unit</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════  MODALS  ═══════════════════════════════════════ */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[14px] shadow-2xl w-full max-w-lg overflow-hidden"
            >

              {/* ══ TRANSFER MODAL ══════════════════════════════════════════ */}
              {activeModal === 'transfer' && (
                <>
                  <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-purple-50">
                    <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-purple-600" /> Transferir Stock
                    </h2>
                    <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600"><X className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={handleTransfer} className="p-6 space-y-4">
                    {/* Barcode scanner */}
                    <BarcodeScanner
                      products={products}
                      onFound={p => { setSelectedProductId(p.id); handleProductSelect(p.id); }}
                      onNotFound={handleBarcodeNotFound}
                      autoFocus
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-zinc-200" /><span className="text-xs font-bold text-zinc-400">o busca en lista</span><div className="flex-1 h-px bg-zinc-200" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Producto</label>
                      <select value={selectedProductId}
                        onChange={e => handleProductSelect(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">Seleccionar producto…</option>
                        {products.filter(p => (p.stock?.[currentBranch?.id ?? ''] ?? 0) > 0).map(p => (
                          <option key={p.id} value={p.id}>{p.name} — Stock: {p.stock?.[currentBranch?.id ?? ''] ?? 0}</option>
                        ))}
                      </select>
                    </div>
                    {selectedProduct && (
                      <div className="bg-purple-50 rounded-[14px] px-4 py-3 text-sm flex items-center gap-3">
                        {selectedProduct.imageUrl && <img src={selectedProduct.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />}
                        <div>
                          <p className="font-bold text-zinc-900">{selectedProduct.name}</p>
                          <p className="text-purple-700 font-bold">Disponible: {currentStock} unidades</p>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Sucursal Destino</label>
                      <select value={toBranchId} onChange={e => setToBranchId(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">Seleccionar destino…</option>
                        {branches.filter(b => b.id !== currentBranch?.id).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Cantidad</label>
                      <input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-xl font-bold text-center" placeholder="0" />
                    </div>
                    {redirectToNew && <NewProductBanner barcode={redirectToNew} onClose={() => setRedirectToNew(null)} />}
                    <div className="flex justify-end gap-3 pt-2">
                      <button type="button" onClick={closeModal} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl">Cancelar</button>
                      <button type="submit" disabled={isSaving} className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 disabled:opacity-50">
                        {isSaving ? 'Transfiriendo…' : 'Transferir'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* ══ ADJUST MODAL ════════════════════════════════════════════ */}
              {activeModal === 'adjust' && (
                <>
                  <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-amber-50">
                    <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-amber-600" /> Ajuste de Stock
                    </h2>
                    <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600"><X className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={handleAdjust} className="p-6 space-y-4">
                    <p className="text-sm text-zinc-500">Corrige la cantidad exacta. Útil tras un conteo físico.</p>
                    <BarcodeScanner
                      products={products}
                      onFound={p => handleProductSelect(p.id)}
                      onNotFound={handleBarcodeNotFound}
                      autoFocus
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-zinc-200" /><span className="text-xs font-bold text-zinc-400">o busca en lista</span><div className="flex-1 h-px bg-zinc-200" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Producto</label>
                      <select value={selectedProductId} onChange={e => handleProductSelect(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option value="">Seleccionar producto…</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} — Stock: {p.stock?.[currentBranch?.id ?? ''] ?? 0}</option>
                        ))}
                      </select>
                    </div>
                    {selectedProduct ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-50 rounded-[14px] p-3 text-center border">
                          <p className="text-xs text-zinc-400 font-bold uppercase">Stock Actual</p>
                          <p className="text-3xl font-black text-zinc-700">{currentStock}</p>
                        </div>
                        <div className="bg-amber-50 rounded-[14px] p-3 text-center border border-amber-200">
                          <p className="text-xs text-amber-600 font-bold uppercase">Nuevo Stock</p>
                          <input type="number" min="0" step="1" value={newStockQty} onChange={e => setNewStockQty(e.target.value)}
                            className="w-full text-3xl font-black text-amber-700 bg-transparent text-center focus:outline-none" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Nuevo Stock</label>
                        <input type="number" min="0" step="1" value={newStockQty} onChange={e => setNewStockQty(e.target.value)}
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xl font-bold text-center" placeholder="0" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Motivo <span className="text-red-500">*</span></label>
                      <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Ej: Conteo físico, merma, error…" />
                    </div>
                    {redirectToNew && <NewProductBanner barcode={redirectToNew} onClose={() => setRedirectToNew(null)} />}
                    <div className="flex justify-end gap-3 pt-2">
                      <button type="button" onClick={closeModal} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl">Cancelar</button>
                      <button type="submit" disabled={isSaving} className="px-8 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 disabled:opacity-50">
                        {isSaving ? 'Guardando…' : 'Aplicar Ajuste'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* ══ RECEIVE STOCK MODAL ══════════════════════════════════════ */}
              {activeModal === 'receive' && (
                <>
                  <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-blue-50">
                    <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" /> Entrada de Mercadería
                    </h2>
                    <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600"><X className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={handleReceive} className="p-6 space-y-4 overflow-y-auto max-h-[76vh] custom-scrollbar">
                    <p className="text-sm text-zinc-500">Registra el ingreso de nuevas unidades a <span className="font-bold text-blue-600">{currentBranch?.name}</span>.</p>

                    {/* ★ BARCODE SCANNER ★ */}
                    <BarcodeScanner
                      products={products}
                      onFound={handleBarcodeFound}
                      onNotFound={handleBarcodeNotFound}
                      autoFocus
                    />

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-zinc-200" />
                      <span className="text-xs font-bold text-zinc-400 uppercase">o busca en lista</span>
                      <div className="flex-1 h-px bg-zinc-200" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Producto</label>
                      <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Seleccionar producto…</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.brand ? `— ${p.brand}` : ''} (Stock: {p.stock?.[currentBranch?.id ?? ''] ?? 0})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Selected product preview */}
                    {selectedProduct && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 bg-blue-50 rounded-[14px] p-4 border border-blue-100"
                      >
                        {selectedProduct.imageUrl && (
                          <img src={selectedProduct.imageUrl} alt="" className="w-14 h-14 object-cover rounded-xl shrink-0" />
                        )}
                        <div>
                          <p className="font-bold text-zinc-900">{selectedProduct.name}</p>
                          <p className="text-sm text-zinc-500">Stock actual: <span className="font-black text-blue-600">{currentStock}</span> unidades</p>
                          <p className="text-sm text-zinc-500">Precio: <span className="font-bold">{formatCurrency(selectedProduct.price)}</span></p>
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Cantidad a ingresar</label>
                      <input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-black text-center"
                        placeholder="0" />
                      {selectedProduct && quantity && !isNaN(parseFloat(quantity)) && parseFloat(quantity) > 0 && (
                        <p className="text-xs text-center text-zinc-400">
                          Stock final: <span className="font-black text-emerald-600">{currentStock + parseFloat(quantity)}</span> unidades
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Motivo / Proveedor (opcional)</label>
                      <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: Compra proveedor XYZ, Nº factura 123…" />
                    </div>

                    {/* Not-found product banner */}
                    {redirectToNew && <NewProductBanner barcode={redirectToNew} onClose={() => setRedirectToNew(null)} />}

                    <div className="flex justify-end gap-3 pt-2">
                      <button type="button" onClick={closeModal} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl">Cancelar</button>
                      <button type="submit" disabled={isSaving} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50">
                        {isSaving ? 'Registrando…' : 'Registrar Entrada'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Helper: "New Product" banner shown when barcode not found ────────────────
const NewProductBanner = ({ barcode, onClose }: { barcode: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[14px] p-4 text-white flex items-center justify-between gap-4"
  >
    <div className="min-w-0">
      <p className="font-black">¿Producto nuevo?</p>
      <p className="text-xs text-blue-200 font-mono truncate">Código: {barcode}</p>
      <p className="text-xs text-blue-200 mt-0.5">Ve a <strong>Productos → Nuevo Producto</strong> para registrarlo primero.</p>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <a
        href="/?tab=products"
        onClick={e => {
          e.preventDefault();
          // Store barcode in localStorage so Products.tsx can pre-fill it
          localStorage.setItem('prefill_barcode', barcode);
          // Dispatch a custom event to switch the active tab
          window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'products', action: 'new', barcode } }));
          onClose();
        }}
        className="bg-white text-blue-700 text-sm font-black px-4 py-2 rounded-xl hover:bg-blue-50 transition-all flex items-center gap-1.5"
      >
        <Plus className="w-4 h-4" /> Agregar
      </a>
      <button onClick={onClose} className="text-blue-200 hover:text-white p-1"><X className="w-4 h-4" /></button>
    </div>
  </motion.div>
);
