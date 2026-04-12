import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Package, Plus, Search, Edit2, Trash2, Barcode, Filter, ChevronDown, Building2, Download, Upload, ShoppingCart } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Product, SaleType, ComboItem } from '../types';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export const Products = () => {
  const { products, currentBranch, branches, categories, addProduct, updateProduct, deleteProduct } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleNavigation = (e: any) => {
      if (e.detail?.tab === 'products' && e.detail?.action === 'new') {
        handleNew(e.detail.barcode);
      }
    };
    window.addEventListener('navigate', handleNavigation);
    
    // Check if there was a pending navigate in localStorage on mount
    const pendingBarcode = localStorage.getItem('prefill_barcode');
    if (pendingBarcode) {
      handleNew(pendingBarcode);
      localStorage.removeItem('prefill_barcode');
    }

    return () => window.removeEventListener('navigate', handleNavigation);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    barcode: '',
    category: '',
    description: '',
    imageUrl: '',
    expiryDate: '',
    isPack: false,
    packUnits: '1',
    saleType: 'unit' as SaleType,
    allowNegativeStock: false,
    minStock: '5',
    isCombo: false,
    comboItems: [] as ComboItem[],
    branchData: {} as Record<string, { price: string; offerPrice: string; stock: string }>
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.includes(searchTerm) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      await deleteProduct(id);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    
    const branchData: Record<string, { price: string; offerPrice: string; stock: string }> = {};
    branches.forEach(branch => {
      const data = (product.branchData[branch.id] || { price: 0, offerPrice: undefined, stock: 0 }) as any;
      branchData[branch.id] = {
        price: data.price.toString(),
        offerPrice: data.offerPrice ? data.offerPrice.toString() : '',
        stock: data.stock.toString()
      };
    });

    setFormData({
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      category: product.category,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      expiryDate: product.expiryDate || '',
      isPack: product.isPack || false,
      packUnits: (product.packUnits || 1).toString(),
      saleType: product.saleType || 'unit',
      allowNegativeStock: product.allowNegativeStock || false,
      minStock: product.minStock?.toString() || '5',
      isCombo: product.isCombo || false,
      comboItems: product.comboItems || [],
      branchData
    });
    setIsModalOpen(true);
  };

  const handleNew = (barcode?: string) => {
    setEditingProduct(null);
    const branchData: Record<string, { price: string; offerPrice: string; stock: string }> = {};
    branches.forEach(branch => {
      branchData[branch.id] = { price: '', offerPrice: '', stock: '' };
    });

    setFormData({
      name: '',
      brand: '',
      barcode: barcode || '',
      category: '',
      description: '',
      imageUrl: '',
      expiryDate: '',
      isPack: false,
      packUnits: '1',
      saleType: 'unit',
      allowNegativeStock: false,
      minStock: '5',
      isCombo: false,
      comboItems: [],
      branchData
    });
    setIsModalOpen(true);
  };

  const handleAddComboItem = (component: Product) => {
    if (formData.comboItems.some(item => item.componentProductId === component.id)) {
      toast.error('Este producto ya está en el combo');
      return;
    }
    
    setFormData({
      ...formData,
      comboItems: [
        ...formData.comboItems,
        {
          id: crypto.randomUUID(),
          comboProductId: editingProduct?.id || '',
          componentProductId: component.id,
          quantity: 1
        }
      ]
    });
  };

  const removeComboItem = (componentId: string) => {
    setFormData({
      ...formData,
      comboItems: formData.comboItems.filter(item => item.componentProductId !== componentId)
    });
  };

  const updateComboQuantity = (componentId: string, quantity: number) => {
    setFormData({
      ...formData,
      comboItems: formData.comboItems.map(item => 
        item.componentProductId === componentId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    });
  };

  const handleSubmit = async () => {
    if (!currentBranch) return;

    const formattedBranchData: Record<string, { price: number; offerPrice?: number; stock: number }> = {};
    Object.entries(formData.branchData).forEach(([branchId, data]) => {
      const bData = data as any;
      formattedBranchData[branchId] = {
        price: Math.round(parseFloat(bData.price) || 0),
        offerPrice: bData.offerPrice ? Math.round(parseFloat(bData.offerPrice)) : undefined,
        stock: parseFloat(bData.stock) || 0
      };
    });

    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        name: formData.name,
        brand: formData.brand,
        barcode: formData.barcode,
        category: formData.category,
        description: formData.description,
        imageUrl: formData.imageUrl,
        expiryDate: formData.expiryDate,
        isPack: formData.isPack,
        packUnits: parseInt(formData.packUnits) || 1,
        saleType: formData.saleType,
        allowNegativeStock: formData.allowNegativeStock,
        minStock: parseInt(formData.minStock) || 5,
        isCombo: formData.isCombo,
        comboItems: formData.comboItems,
        branchData: formattedBranchData
      });
    } else {
      await addProduct({
        name: formData.name,
        brand: formData.brand,
        description: formData.description,
        barcode: formData.barcode,
        category: formData.category,
        imageUrl: formData.imageUrl,
        expiryDate: formData.expiryDate,
        isPack: formData.isPack,
        packUnits: parseInt(formData.packUnits) || 1,
        saleType: formData.saleType,
        allowNegativeStock: formData.allowNegativeStock,
        minStock: parseInt(formData.minStock) || 5,
        isCombo: formData.isCombo,
        comboItems: formData.comboItems,
        supplierId: '',
        branchData: formattedBranchData
      });
    }
    setIsModalOpen(false);
  };

  const handleExport = () => {
    try {
      const exportData = products.map(p => {
        let safeImageUrl = p.imageUrl || '';
        if (safeImageUrl.length > 30000 || safeImageUrl.startsWith('data:image')) {
          safeImageUrl = '[Imagen interna]';
        }

        const row: any = {
          'Nombre': p.name || '',
          'Marca': p.brand || '',
          'Código': p.barcode || '',
          'Categoría': p.category || '',
          'Descripción': p.description || '',
          'Imagen URL': safeImageUrl
        };

        branches.forEach(branch => {
          const branchData = p.branchData || {};
          const data = branchData[branch.id] || { price: 0, offerPrice: undefined, stock: 0 };
          row[`Precio (${branch.name})`] = data.price || 0;
          row[`Oferta (${branch.name})`] = data.offerPrice || '';
          row[`Stock (${branch.name})`] = data.stock || 0;
        });

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos");
      XLSX.writeFile(wb, "productos_stock.xlsx");
      toast.success('Productos exportados correctamente');
    } catch (error: any) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar: ' + error.message);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading('Leyendo archivo...');
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonRows = XLSX.utils.sheet_to_json(ws);

        toast.loading(`Importando ${jsonRows.length} productos...`, { id: loadingToast });

        let importedCount = 0;
        for (const row of jsonRows as any[]) {
          const branchData: Record<string, { price: number; offerPrice?: number; stock: number }> = {};
          
          branches.forEach(branch => {
            branchData[branch.id] = {
              price: parseFloat(row[`Precio (${branch.name})`] || row['Precio'] || '0') || 0,
              offerPrice: row[`Oferta (${branch.name})`] ? parseFloat(row[`Oferta (${branch.name})`]) : undefined,
              stock: parseFloat(row[`Stock (${branch.name})`] || row['Stock'] || '0') || 0
            };
          });

          let rawImage = row['Imagen URL'] || '';
          if (rawImage === '[Imagen interna]') rawImage = '';

          await addProduct({
            name: row['Nombre'] || row['Name'] || 'Sin nombre',
            brand: row['Marca'] || row['Brand'] || '',
            barcode: row['Código']?.toString() || row['Codigo']?.toString() || '',
            category: row['Categoría'] || row['Categoria'] || '',
            description: row['Descripción'] || row['Descripcion'] || '',
            imageUrl: rawImage,
            saleType: 'unit',
            supplierId: '',
            branchData
          });
          importedCount++;
        }

        toast.success(`${importedCount} productos importados correctamente`, { id: loadingToast });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error: any) {
        console.error('Error importing products:', error);
        toast.error('Error al importar: ' + (error.message || 'Verifica el formato del archivo'), { id: loadingToast });
      }
    };
    
    reader.onerror = () => {
      toast.error('Error al leer el archivo físico', { id: loadingToast });
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen original es demasiado pesada (máx 10MB)');
      return;
    }

    const uploadToast = toast.loading('Comprimiendo y subiendo imagen...');

    try {
      const compressedImage = await new Promise<File>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 640;
          const MAX_HEIGHT = 480;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          const ctx = canvas.getContext('2d');
          
          if (!ctx) return reject('No se pudo procesar la imagen');
          
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            if (!blob) return reject('Error al comprimir');
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            resolve(new File([blob], newName, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.85);
        };
        img.onerror = () => reject('Error al leer el archivo fuente');
        img.src = URL.createObjectURL(file);
      });

      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpg`;
      const filePath = `products/${fileName}`;

      const { error } = await supabase.storage
        .from('image')
        .upload(filePath, compressedImage);

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('image')
        .getPublicUrl(filePath);

      setFormData({ ...formData, imageUrl: publicUrl });
      toast.success('Imagen subida correctamente', { id: uploadToast });
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      toast.error('Error al subir la imagen: ' + (error.message || 'Verifica la configuración del bucket'), { id: uploadToast });
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Productos</h1>
          <p className="text-zinc-500">Gestión de catálogo e inventario</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
            accept=".xlsx, .xls, .csv"
          />
          <button 
            onClick={handleImportClick}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-[14px] font-bold hover:bg-zinc-50 transition-all shadow-sm"
          >
            <Upload className="w-5 h-5" />
            Importar
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-[14px] font-bold hover:bg-zinc-50 transition-all shadow-sm"
          >
            <Download className="w-5 h-5" />
            Exportar
          </button>
          <button 
            onClick={() => handleNew()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-[14px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-4 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, marca o código..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-700 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-white border border-zinc-200 rounded-xl text-zinc-600 font-medium hover:bg-zinc-50 transition-all shrink-0">
          <Filter className="w-5 h-5" />
          Filtros
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 bg-white rounded-[14px] border border-zinc-100 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-50 z-10">
              <tr className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4 border-b border-zinc-100">Producto</th>
                <th className="px-6 py-4 border-b border-zinc-100">Código</th>
                <th className="px-6 py-4 border-b border-zinc-100">Categoría</th>
                <th className="px-6 py-4 border-b border-zinc-100">Vencimiento</th>
                <th className="px-6 py-4 border-b border-zinc-100">Pack</th>
                <th className="px-6 py-4 border-b border-zinc-100">Precio</th>
                <th className="px-6 py-4 border-b border-zinc-100">Stock</th>
                <th className="px-6 py-4 border-b border-zinc-100 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-zinc-900 block">{product.name}</span>
                        <span className="text-xs text-zinc-500">{product.brand}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded-lg w-fit">
                      <Barcode className="w-3 h-3" />
                      {product.barcode}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-600">{product.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold ${product.expiryDate ? 'text-orange-600' : 'text-zinc-400'}`}>
                      {product.expiryDate || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {product.isPack ? (
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        Pack ({product.packUnits})
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-900">{formatCurrency(product.offerPrice || product.price)}</span>
                      {product.offerPrice && (
                        <span className="text-[10px] text-zinc-400 line-through">{formatCurrency(product.price)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        (product.stock[currentBranch.id] || 0) <= (product.minStock ?? 5) ? "bg-rose-500" : (product.stock[currentBranch.id] || 0) <= (product.minStock ?? 5) * 2 ? "bg-amber-500" : "bg-emerald-500"
                      )} />
                      <span className="text-sm font-medium text-zinc-700">{product.stock[currentBranch.id] || 0} {product.saleType === 'weight' ? 'kg' : 'unid.'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple Modal for Demo */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[14px] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h2 className="text-xl font-black text-zinc-900">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Nombre</label>
                    <input type="text" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Leche Entera" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Marca</label>
                    <input type="text" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Lala" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Código de Barras</label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                      <input type="text" className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Escanear o escribir..." value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Categoría</label>
                    <select 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">Seleccionar Categoría</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Tipo de Venta</label>
                    <select 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      value={formData.saleType} 
                      onChange={e => setFormData({...formData, saleType: e.target.value as SaleType})}
                    >
                      <option value="unit">Por Unidad</option>
                      <option value="weight">Por Peso (Kg)</option>
                      <option value="package">Por Pack/Caja</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Fecha de Vencimiento</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      value={formData.expiryDate} 
                      onChange={e => setFormData({...formData, expiryDate: e.target.value})} 
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Descripción</label>
                    <textarea 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" 
                      placeholder="Ej: Información adicional, gramos, ingredientes..." 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                    />
                  </div>

                  <div className="col-span-2 p-4 bg-zinc-50 rounded-[14px] border border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-400 border border-zinc-100">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-zinc-900 block">Configuración de Pack</span>
                        <span className="text-xs text-zinc-500">¿Este producto es un paquete de varias unidades?</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.isPack}
                          onChange={e => setFormData({...formData, isPack: e.target.checked})}
                        />
                        <span className="text-sm font-bold text-zinc-700">Es un pack</span>
                      </label>
                      {formData.isPack && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-500 uppercase">Unidades:</span>
                          <input 
                            type="number" 
                            className="w-20 p-2 bg-white border border-zinc-200 rounded-lg text-sm"
                            value={formData.packUnits}
                            onChange={e => setFormData({...formData, packUnits: e.target.value})}
                            min="1"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 p-4 bg-orange-50 rounded-[14px] border border-orange-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-400 border border-orange-100">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-zinc-900 block">Vender sin Stock</span>
                        <span className="text-xs text-zinc-500">Permite vender aunque el stock esté en 0 (ej: comida rápida, pedidos)</span>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                        checked={formData.allowNegativeStock}
                        onChange={e => setFormData({...formData, allowNegativeStock: e.target.checked})}
                      />
                      <span className="text-sm font-bold text-zinc-700">Habilitado</span>
                    </label>
                  </div>

                  <div className="col-span-2 p-4 bg-blue-50 rounded-[14px] border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 border border-blue-100">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-zinc-900 block">Stock Mínimo (Alerta)</span>
                        <span className="text-xs text-zinc-500">Cantidad mínima para alertar sobre nivel bajo de stock</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <input 
                          type="number" 
                          className="w-24 p-2 bg-white border border-zinc-200 rounded-lg text-sm text-center font-medium shadow-sm focus:ring-2 focus:ring-blue-500"
                          value={formData.minStock}
                          onChange={e => setFormData({...formData, minStock: e.target.value})}
                          min="0"
                        />
                        <span className="text-sm font-bold text-zinc-700">unidades</span>
                    </div>
                  </div>

                  {/* Combo Section */}
                  <div className="col-span-2 p-6 bg-purple-50 rounded-[14px] border border-purple-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-zinc-900 block tracking-tight">Producto Compuesto (Combo)</span>
                          <span className="text-[11px] text-zinc-500 font-medium">Define qué productos componen este pack o promoción</span>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-sm transition-all hover:bg-purple-100/50">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                          checked={formData.isCombo}
                          onChange={e => setFormData({...formData, isCombo: e.target.checked})}
                        />
                        <span className="text-sm font-bold text-purple-700">Activar Combo</span>
                      </label>
                    </div>

                    {formData.isCombo && (
                      <div className="space-y-4 pt-2 border-t border-purple-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                          <select
                            onChange={(e) => {
                              const product = products.find(p => p.id === e.target.value);
                              if (product) handleAddComboItem(product);
                              e.target.value = "";
                            }}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                          >
                            <option value="">Buscar producto para agregar al combo...</option>
                            {products
                              .filter(p => !p.isCombo && p.id !== editingProduct?.id)
                              .map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>
                              ))}
                          </select>
                        </div>

                        {formData.comboItems.length > 0 ? (
                          <div className="space-y-2">
                            {formData.comboItems.map(item => {
                              const component = products.find(p => p.id === item.componentProductId);
                              return (
                                <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-purple-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                  <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center border border-zinc-100 shrink-0">
                                    <Package className="w-4 h-4 text-zinc-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-bold text-zinc-800 block truncate">{component?.name || 'Producto Desconocido'}</span>
                                    <span className="text-[10px] text-zinc-500">{component?.brand}</span>
                                  </div>
                                  <div className="flex items-center gap-2 px-3 py-1 bg-zinc-50 rounded-lg border border-zinc-100">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Cantidad:</span>
                                    <input 
                                      type="number" 
                                      value={item.quantity} 
                                      onChange={(e) => updateComboQuantity(item.componentProductId, parseFloat(e.target.value) || 0)}
                                      className="w-12 bg-transparent text-sm font-black text-center focus:outline-none"
                                      min="1"
                                      step="1"
                                    />
                                  </div>
                                  <button 
                                    onClick={() => removeComboItem(item.componentProductId)}
                                    className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-8 text-center bg-white/50 rounded-[14px] border border-dashed border-purple-200">
                            <Plus className="w-8 h-8 text-purple-200 mx-auto mb-2" />
                            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">No hay componentes seleccionados</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Foto del Producto</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-zinc-100 rounded-[14px] flex items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 overflow-hidden shrink-0">
                        {formData.imageUrl ? (
                          <img src={formData.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Plus className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          id="product-image"
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                        <button 
                          type="button"
                          onClick={() => document.getElementById('product-image')?.click()}
                          className="w-full py-3 bg-white border border-zinc-200 rounded-xl text-zinc-600 font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Subir Foto desde PC
                        </button>
                        <p className="text-[10px] text-zinc-400 text-center">Formato recomendado: JPG, PNG. Máx 2MB.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Precio de Venta</label>
                    <input 
                      type="number" 
                      step="1"
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="0" 
                      value={formData.branchData[currentBranch?.id || '']?.price || ''} 
                      onChange={e => setFormData({
                        ...formData,
                        branchData: {
                          ...formData.branchData,
                          [currentBranch?.id || '']: {
                            ...(formData.branchData[currentBranch?.id || ''] || { stock: '0' }),
                            price: e.target.value
                          }
                        }
                      })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Precio Oferta (Opcional)</label>
                    <input 
                      type="number" 
                      step="1"
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="0" 
                      value={formData.branchData[currentBranch?.id || '']?.offerPrice || ''} 
                      onChange={e => setFormData({
                        ...formData,
                        branchData: {
                          ...formData.branchData,
                          [currentBranch?.id || '']: {
                            ...(formData.branchData[currentBranch?.id || ''] || { stock: '0' }),
                            offerPrice: e.target.value
                          }
                        }
                      })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Stock Inicial</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="0" 
                      value={formData.branchData[currentBranch?.id || '']?.stock || ''} 
                      onChange={e => setFormData({
                        ...formData,
                        branchData: {
                          ...formData.branchData,
                          [currentBranch?.id || '']: { ...formData.branchData[currentBranch?.id || ''], stock: e.target.value }
                        }
                      })} 
                    />
                  </div>
                </div>

                {branches.length > 1 && (
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-zinc-900 border-b border-zinc-100 pb-2">Otras Sucursales</h3>
                    {branches.filter(b => b.id !== currentBranch?.id).map(branch => (
                      <div key={branch.id} className="p-4 bg-zinc-50 rounded-[14px] border border-zinc-100 space-y-4">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Building2 className="w-4 h-4" />
                          <span className="font-bold text-sm">{branch.name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase">Precio</label>
                            <input 
                              type="number" 
                              className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-sm" 
                              value={formData.branchData[branch.id]?.price || ''} 
                              onChange={e => setFormData({
                                ...formData, 
                                branchData: {
                                  ...formData.branchData,
                                  [branch.id]: { ...formData.branchData[branch.id], price: e.target.value }
                                }
                              })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase">Oferta</label>
                            <input 
                              type="number" 
                              className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-sm" 
                              value={formData.branchData[branch.id]?.offerPrice || ''} 
                              onChange={e => setFormData({
                                ...formData, 
                                branchData: {
                                  ...formData.branchData,
                                  [branch.id]: { ...formData.branchData[branch.id], offerPrice: e.target.value }
                                }
                              })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase">Stock</label>
                            <input 
                              type="number" 
                              className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-sm" 
                              value={formData.branchData[branch.id]?.stock || ''} 
                              onChange={e => setFormData({
                                ...formData, 
                                branchData: {
                                  ...formData.branchData,
                                  [branch.id]: { ...formData.branchData[branch.id], stock: e.target.value }
                                }
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-8">
                  <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl transition-all">Cancelar</button>
                  <button onClick={handleSubmit} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Guardar Producto</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
