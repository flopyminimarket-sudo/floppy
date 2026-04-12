import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Plus, Minus, Search, Printer, Tag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Barcode from 'react-barcode';

interface LabelItem {
  id: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
}

const generateBarcode = (id: string) => {
  const hex = id.replace(/-/g, '').substring(0, 8);
  const numStr = parseInt(hex, 16).toString().padStart(10, '0');
  return '20' + numStr;
};

export const Labels = () => {
  const { products, currentBranch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [labelItems, setLabelItems] = useState<LabelItem[]>([]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm)
  );

  const addLabelItem = (product: any) => {
    // Only allow products with barcodes or generate a pure numeric one strictly avoiding keyboard layout issues
    const barcode = product.barcode?.trim() || generateBarcode(product.id);
    const price = product.stock[currentBranch.id]?.price || 0;

    setLabelItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: product.id, name: product.name, barcode, price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setLabelItems(prev => 
      prev.map(item => {
        if (item.id === id) {
          const newQ = item.quantity + delta;
          return { ...item, quantity: newQ > 0 ? newQ : 1 };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setLabelItems(prev => prev.filter(item => item.id !== id));
  };

  const handlePrint = () => {
    if (labelItems.length === 0) return;
    window.print();
  };

  // Create an array of all individual labels to render in the print view
  const expandedLabels = labelItems.flatMap(item => 
    Array.from({ length: item.quantity }, () => item)
  );

  return (
    <>
      <div className="h-full flex gap-6 p-6 print:hidden">
        {/* Left Column - Product Selection */}
        <div className="w-1/2 flex flex-col bg-white rounded-[14px] border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100">
            <h2 className="text-xl font-black text-zinc-900 mb-2">Seleccionar Productos</h2>
            <p className="text-sm text-zinc-500 mb-6">Busca y agrega productos para imprimir etiquetas de código de barras. Ideal para comida rápida o productos caseros.</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 font-medium"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-2">
              {filteredProducts.map(product => (
                <div 
                  key={product.id}
                  onClick={() => addLabelItem(product)}
                  className="flex items-center justify-between p-4 bg-zinc-50 hover:bg-blue-50 rounded-[14px] cursor-pointer transition-colors group border border-transparent hover:border-blue-100"
                >
                  <div>
                    <h3 className="font-bold text-zinc-900 group-hover:text-blue-700 transition-colors uppercase text-sm">{product.name}</h3>
                    <p className="text-xs text-zinc-500 font-mono mt-1">{product.barcode || 'Sin código'}</p>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm border border-zinc-200 text-blue-600 transition-transform group-hover:scale-110">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Selected Labels */}
        <div className="w-1/2 flex flex-col bg-white rounded-[14px] border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-zinc-900 mb-1">Etiquetas a Imprimir</h2>
              <p className="text-sm text-zinc-500">Total: {expandedLabels.length} etiquetas</p>
            </div>
            <button
              onClick={handlePrint}
              disabled={labelItems.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-5 h-5" />
              Imprimir
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/50">
            <AnimatePresence>
              {labelItems.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  className="flex items-center justify-between bg-white p-4 rounded-[14px] shadow-sm mb-3 border border-zinc-100"
                >
                  <div className="flex-1 pr-4">
                    <div className="font-bold text-zinc-900 uppercase text-sm">{item.name}</div>
                    <div className="text-xs font-mono text-blue-600 mt-1">{item.barcode}</div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-zinc-50 p-1.5 rounded-xl border border-zinc-200">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-lg text-zinc-500 transition-colors shadow-sm">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-lg text-zinc-500 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {labelItems.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                <Tag className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-medium">No hay etiquetas seleccionadas</p>
                <p className="text-sm mt-1">Selecciona productos de la lista</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- HIDDEN PRINT TEMPLATE --- */}
      {/* 
        This is an A4 / Thermal adaptable grid. 
        Usually, thermal 80mm roll prints in a single column continuously.
        If printed on A4, normal print layout will tile them.
      */}
      <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999] print:visible">
        <div className="print-label-container flex flex-wrap gap-4 p-4 align-top w-full overflow-visible h-auto max-w-[80mm] mx-auto">
          {expandedLabels.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex flex-col items-center justify-center w-full break-inside-avoid mb-6 border-b-2 border-dashed border-black pb-4 page-break-inside-avoid">
              <div className="font-black text-xl uppercase text-center leading-tight mb-3 px-2 break-words whitespace-normal w-full">{item.name}</div>
              <div className="flex justify-center w-full my-1">
                <Barcode 
                  value={item.barcode} 
                  format="CODE128"
                  width={2.2}
                  height={80}
                  fontSize={16}
                  font="monospace"
                  textMargin={6}
                  margin={0}
                  displayValue={true}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
