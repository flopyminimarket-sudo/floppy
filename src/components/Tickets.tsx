import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { formatCurrency, cn } from '../lib/utils';
import { Receipt, Calendar, Clock, MapPin, User, CreditCard, Banknote, Smartphone, Package, Search, X, ChevronRight, Printer, Download, Filter, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sale } from '../types';
import { PrintTicket } from './PrintTicket';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Tickets = () => {
  const { sales, branches, users, voidSale, companySettings, currentBranch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Sale | null>(null);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Logo y Encabezado
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text(companySettings.name, 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(24, 24, 27); // Zinc-900
    doc.text('Resumen de Ventas', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122); // Zinc-500
    doc.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 105, 37, { align: 'center' });
    
    // Línea divisoria
    doc.setDrawColor(228, 228, 231); // Zinc-200
    doc.line(14, 45, 196, 45);

    // Información de filtros
    let currentY = 55;
    doc.setFontSize(11);
    doc.setTextColor(63, 63, 70); // Zinc-700

    // Mostrar Sucursal
    const activeBranchName = filterBranchId 
      ? getBranchName(filterBranchId) 
      : (currentBranch?.name || 'Todas las Sucursales');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Sucursal: ${activeBranchName}`, 14, currentY);
    currentY += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Mostrar Rango de Fechas
    if (filterDate || filterDateEnd) {
      const desde = filterDate ? new Date(filterDate).toLocaleDateString('es-ES') : 'Inicio';
      const hasta = filterDateEnd ? new Date(filterDateEnd).toLocaleDateString('es-ES') : 'Hoy';
      doc.text(`Rango de Fechas: ${desde} - ${hasta}`, 14, currentY);
      currentY += 7;
    } else {
      doc.text('Rango de Fechas: Historial Completo', 14, currentY);
      currentY += 7;
    }

    if (filterPaymentMethod) {
      doc.text(`Método de Pago: ${getPaymentName(filterPaymentMethod)}`, 14, currentY);
      currentY += 7;
    }

    // Preparar datos de la tabla
    const tableData = filteredSales.map(sale => [
      sale.id.substring(0, 8),
      new Date(sale.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      getBranchName(sale.branchId),
      getCashierName(sale.cashierId),
      getPaymentName(sale.paymentMethod),
      sale.status === 'voided' ? 'ANULADO' : formatCurrency(sale.total)
    ]);

    const totalVentas = filteredSales.reduce((acc, sale) => acc + (sale.status === 'voided' ? 0 : sale.total), 0);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['ID', 'Fecha', 'Sucursal', 'Cajero', 'Método', 'Total']],
      body: tableData,
      foot: [['', '', '', '', 'TOTAL VENTAS', formatCurrency(totalVentas)]],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [244, 244, 245], textColor: [24, 24, 27], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 20 },
    });

    doc.save(`resumen_ventas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleVoid = async () => {
    if (!selectedTicket || !voidReason.trim()) return;
    
    setIsVoiding(true);
    try {
      await voidSale(selectedTicket.id, voidReason);
      setIsVoidModalOpen(false);
      setVoidReason('');
      setSelectedTicket(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsVoiding(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sale.date.includes(searchTerm);
    
    // Lógica de rango de fechas
    let matchesDate = true;
    const saleDate = sale.date.split('T')[0]; // YYYY-MM-DD
    
    if (filterDate && filterDateEnd) {
      matchesDate = saleDate >= filterDate && saleDate <= filterDateEnd;
    } else if (filterDate) {
      matchesDate = saleDate >= filterDate;
    } else if (filterDateEnd) {
      matchesDate = saleDate <= filterDateEnd;
    }

    const matchesPayment = filterPaymentMethod ? sale.paymentMethod === filterPaymentMethod : true;
    const matchesBranch = filterBranchId ? sale.branchId === filterBranchId : true;

    return matchesSearch && matchesDate && matchesPayment && matchesBranch;
  });

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'transfer': return <Smartphone className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const getPaymentName = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      default: return method;
    }
  };

  const getCashierName = (cashierId: string) => {
    const user = users.find(u => u.id === cashierId);
    return user ? user.name : 'Cajero Desconocido';
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : 'Sucursal Desconocida';
  };

  return (
    <>
      <div className="h-full flex flex-col p-8 overflow-hidden print:hidden">
        <div className="flex flex-col gap-6 mb-8 shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
                <Receipt className="w-8 h-8 text-blue-600" />
                Tickets Emitidos
              </h1>
              <p className="text-zinc-500 font-medium mt-1">Historial completo de ventas y recibos</p>
            </div>
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Download className="w-5 h-5" />
              Exportar PDF
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-[14px] border border-zinc-200 shadow-sm shrink-0">
            <div className="flex items-center gap-2 px-3 border-r border-zinc-200 text-zinc-400">
              <Filter className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wider">Filtros</span>
            </div>
            
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por ID..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-700 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Desde</span>
                  <input
                    type="date"
                    className="bg-transparent py-2 pr-2 focus:outline-none text-zinc-700 font-medium text-sm"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                </div>
                <div className="w-px h-4 bg-zinc-200" />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Hasta</span>
                  <input
                    type="date"
                    className="bg-transparent py-2 pr-2 focus:outline-none text-zinc-700 font-medium text-sm"
                    value={filterDateEnd}
                    onChange={(e) => setFilterDateEnd(e.target.value)}
                  />
                </div>
              </div>

              <select
                className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-700 font-medium appearance-none pr-10 min-w-[160px]"
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="">Todas sucursales</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              
              <select
                className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-700 font-medium appearance-none pr-10"
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="">Todos los métodos</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-zinc-200 rounded-[14px] shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-sm">
                <th className="p-4 font-bold">ID Ticket</th>
                <th className="p-4 font-bold">Fecha y Hora</th>
                <th className="p-4 font-bold">Sucursal</th>
                <th className="p-4 font-bold">Cajero</th>
                <th className="p-4 font-bold">Método</th>
                <th className="p-4 font-bold text-right">Total</th>
                <th className="p-4 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredSales.map(sale => {
                const date = new Date(sale.date);
                return (
                  <tr key={sale.id} className={cn(
                    "hover:bg-blue-50/50 transition-colors group cursor-pointer",
                    sale.status === 'voided' && "bg-rose-50/30 hover:bg-rose-50/50"
                  )} onClick={() => setSelectedTicket(sale)}>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-900">{sale.id}</span>
                        {sale.status === 'voided' && (
                          <span className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">ANULADO</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Calendar className="w-4 h-4" />
                        <span>{date.toLocaleDateString('es-ES')}</span>
                        <Clock className="w-4 h-4 ml-2" />
                        <span>{date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <MapPin className="w-4 h-4" />
                        <span>{getBranchName(sale.branchId)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <User className="w-4 h-4" />
                        <span>{getCashierName(sale.cashierId)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-zinc-600">
                        {getPaymentIcon(sale.paymentMethod)}
                        <span className="capitalize">{getPaymentName(sale.paymentMethod)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={cn(
                        "font-bold",
                        sale.status === 'voided' ? "text-zinc-400 line-through" : "text-blue-600"
                      )}>{formatCurrency(sale.total)}</span>
                    </td>
                    <td className="p-4 text-center">
                      <button className="p-2 text-zinc-400 group-hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-100">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No se encontraron tickets que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[14px] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-start shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-zinc-900">Detalle del Ticket</h2>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-blue-600">{selectedTicket.id}</p>
                        {selectedTicket.status === 'voided' && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-black rounded-full uppercase">Anulado</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => window.print()}
                    className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-2 font-medium"
                  >
                    <Printer className="w-5 h-5" />
                    <span className="hidden sm:inline">Imprimir Copia</span>
                  </button>
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Meta info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-zinc-50 p-4 rounded-[14px] border border-zinc-100">
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">Fecha</span>
                    </div>
                    <p className="font-semibold text-zinc-900">
                      {new Date(selectedTicket.date).toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {new Date(selectedTicket.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-[14px] border border-zinc-100">
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">Sucursal</span>
                    </div>
                    <p className="font-semibold text-zinc-900">{getBranchName(selectedTicket.branchId)}</p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-[14px] border border-zinc-100">
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                      <User className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">Cajero</span>
                    </div>
                    <p className="font-semibold text-zinc-900">{getCashierName(selectedTicket.cashierId)}</p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-[14px] border border-zinc-100">
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                      {getPaymentIcon(selectedTicket.paymentMethod)}
                      <span className="text-xs font-bold uppercase">Pago</span>
                    </div>
                    <p className="font-semibold text-zinc-900 capitalize">{getPaymentName(selectedTicket.paymentMethod)}</p>
                  </div>
                </div>

                {selectedTicket.status === 'voided' && (
                  <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-[14px] flex gap-4 items-start">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-rose-900">Ticket Anulado</h4>
                      <p className="text-sm text-rose-700 font-medium">Motivo: {selectedTicket.voidReason}</p>
                      <p className="text-xs text-rose-600 mt-1">Fecha de anulación: {new Date(selectedTicket.voidDate!).toLocaleString('es-ES')}</p>
                    </div>
                  </div>
                )}

                {/* Items */}
                <h3 className="text-lg font-bold text-zinc-900 mb-4">Productos Comprados</h3>
                <div className="space-y-3">
                  {selectedTicket.items.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="flex items-center gap-4 p-4 bg-white border border-zinc-100 rounded-[14px] shadow-sm">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-900 truncate">{item.name}</h4>
                        <p className="text-sm text-zinc-500">{item.brand} • {item.barcode}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-zinc-500 mb-0.5">
                          {item.quantity} {item.saleType === 'weight' ? 'kg' : 'u'} x {formatCurrency(item.offerPrice || item.price)}
                        </p>
                        <p className="font-bold text-zinc-900">
                          {formatCurrency(Math.round((item.offerPrice || item.price) * item.quantity))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer / Total */}
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 shrink-0 flex flex-col gap-4">
                <div className="flex justify-between items-center w-full">
                  <div className="text-zinc-500 font-medium">
                    Total de artículos: <span className="font-bold text-zinc-900">{selectedTicket.items.reduce((acc, item) => acc + item.quantity, 0)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-500 uppercase mb-1">Total Pagado</p>
                    <p className={cn(
                      "text-4xl font-black leading-none",
                      selectedTicket.status === 'voided' ? "text-zinc-400 line-through" : "text-blue-600"
                    )}>{formatCurrency(selectedTicket.total)}</p>
                  </div>
                </div>
                
                {selectedTicket.status !== 'voided' && (
                  <button 
                    onClick={() => setIsVoidModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 rounded-[14px] font-black hover:bg-rose-100 transition-colors border border-rose-100"
                  >
                    <Trash2 className="w-5 h-5" />
                    ANULAR TICKET
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Void Reason Modal */}
      <AnimatePresence>
        {isVoidModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[14px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-rose-50">
                <div className="flex items-center gap-3 text-rose-600">
                  <AlertCircle className="w-6 h-6" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Anular Ticket</h3>
                </div>
                <button onClick={() => setIsVoidModalOpen(false)} className="text-zinc-400 hover:text-rose-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-zinc-600 font-medium">
                  ¿Estás seguro de que deseas anular el ticket <span className="font-bold text-zinc-900">{selectedTicket?.id}</span>? Esta acción no se puede deshacer y el stock será devuelto al inventario.
                </p>
                
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase mb-2 tracking-wider">Motivo de la Anulación</label>
                  <textarea
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all text-zinc-700 font-medium resize-none h-32"
                    placeholder="Ej: Error en el cobro, el cliente se arrepintió, etc..."
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="p-6 bg-zinc-50 flex gap-3">
                <button
                  onClick={() => setIsVoidModalOpen(false)}
                  className="flex-1 py-4 bg-white border border-zinc-200 rounded-[14px] font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVoid}
                  disabled={!voidReason.trim() || isVoiding}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-[14px] font-black hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 disabled:opacity-50 disabled:shadow-none"
                >
                  {isVoiding ? 'Anulando...' : 'CONFIRMAR ANULACIÓN'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>

      {/* Hidden layout specifically for printing ticket copy */}
      <div className="hidden print:block absolute top-0 left-0 w-[80mm] h-auto bg-white m-0 p-0 text-left border-none shadow-none z-max print:visible">
        {selectedTicket && <PrintTicket sale={selectedTicket} companySettings={companySettings} />}
      </div>
    </>
  );
};
