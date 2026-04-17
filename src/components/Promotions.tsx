import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Promotion, PromotionType } from '../types';
import { formatCurrency } from '../lib/utils';
import { Plus, Trash2, Tag, Clock, Package, ShoppingBag, Edit2, ToggleLeft, ToggleRight, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const emptyPromo = (): Omit<Promotion, 'id'> => ({
  name: '',
  type: 'buy_x_get_y',
  productId: '',
  buyQuantity: 2,
  getQuantity: 3,
  discountPrice: undefined,
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  daysOfWeek: [],
  isActive: true,
});

export const Promotions = () => {
  const { products, promotions, addPromotion, updatePromotion, deletePromotion, updateProduct } = useApp();
  const [tab, setTab] = useState<'promos' | 'negstock'>('promos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [form, setForm] = useState<Omit<Promotion, 'id'>>(emptyPromo());
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditingPromo(null);
    setForm(emptyPromo());
    setIsModalOpen(true);
  };

  const openEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setForm({ ...promo });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Ingresa un nombre para la promoción'); return; }
    if (!form.productId) { toast.error('Selecciona un producto'); return; }
    if (form.type === 'buy_x_get_y' && (!form.buyQuantity || !form.getQuantity)) {
      toast.error('Ingresa las cantidades Paga / Lleva'); return;
    }
    if (form.type === 'scheduled_discount' && !form.discountPrice) {
      toast.error('Ingresa el precio de oferta'); return;
    }
    setSaving(true);
    try {
      if (editingPromo) {
        await updatePromotion(editingPromo.id, form);
      } else {
        await addPromotion(form);
      }
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (d: number) => {
    const days = form.daysOfWeek || [];
    setForm({ ...form, daysOfWeek: days.includes(d) ? days.filter(x => x !== d) : [...days, d] });
  };

  const promoTypeLabel = (type: PromotionType) =>
    type === 'buy_x_get_y' ? 'Paga X Lleva Y' : 'Descuento Programado';

  return (
    <div className="p-6 space-y-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Promociones & Combos</h1>
          <p className="text-zinc-500">Gestión de ofertas, combos y políticas de stock</p>
        </div>
        {tab === 'promos' && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-[14px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-5 h-5" /> Nueva Promoción
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-100">
        {(['promos', 'negstock'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-bold rounded-t-xl transition-all border-b-2 ${
              tab === t ? 'text-blue-600 border-blue-600 bg-blue-50' : 'text-zinc-500 border-transparent hover:text-zinc-700'
            }`}
          >
            {t === 'promos' ? '🏷️ Promociones' : '📦 Venta sin Stock'}
          </button>
        ))}
      </div>

      {/* ── PROMOTIONS TAB ─────────────────────────────────────── */}
      {tab === 'promos' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-3">
              <Tag className="w-12 h-12 opacity-30" />
              <p className="font-bold">No hay promociones activas</p>
              <p className="text-sm">Crea tu primera promo con el botón de arriba</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {promotions.map(promo => {
                const prod = products.find(p => p.id === promo.productId);
                return (
                  <motion.div
                    key={promo.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-[14px] border shadow-sm p-5 space-y-3 ${promo.isActive ? 'border-zinc-100' : 'border-zinc-200 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${promo.type === 'buy_x_get_y' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>
                          {promoTypeLabel(promo.type)}
                        </span>
                        <h3 className="font-black text-zinc-900 mt-1">{promo.name}</h3>
                        <p className="text-xs text-zinc-500">{prod?.name || '—'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(promo)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePromotion(promo.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {promo.type === 'buy_x_get_y' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="bg-zinc-100 px-3 py-1 rounded-xl font-bold text-zinc-700">Paga {promo.buyQuantity}</span>
                        <span className="text-zinc-400">→</span>
                        <span className="bg-green-100 px-3 py-1 rounded-xl font-bold text-green-700">Lleva {promo.getQuantity}</span>
                      </div>
                    )}

                    {promo.type === 'scheduled_discount' && (
                      <div className="space-y-1 text-xs text-zinc-600">
                        <div className="font-bold text-blue-700 text-sm">{formatCurrency(promo.discountPrice || 0)} <span className="text-zinc-400 font-normal">precio promo</span></div>
                        {(promo.startDate || promo.endDate) && (
                          <div>📅 {promo.startDate || '…'} → {promo.endDate || '…'}</div>
                        )}
                        {(promo.startTime || promo.endTime) && (
                          <div>🕐 {promo.startTime || '00:00'} – {promo.endTime || '23:59'}</div>
                        )}
                        {promo.daysOfWeek && promo.daysOfWeek.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {promo.daysOfWeek.sort().map(d => (
                              <span key={d} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">{DAY_LABELS[d]}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => updatePromotion(promo.id, { isActive: !promo.isActive })}
                      className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${promo.isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                    >
                      {promo.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {promo.isActive ? 'Activa' : 'Inactiva'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── NEGATIVE STOCK TAB ─────────────────────────────────── */}
      {tab === 'negstock' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-sm text-zinc-500 mb-4">
            Activa esta opción en productos que se pueden vender incluso cuando el stock llega a 0 (ej: productos de pedido, comida rápida).
          </p>
          <div className="bg-white rounded-[14px] border border-zinc-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 text-xs font-bold uppercase text-zinc-500">
                <tr>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4 text-center">Vende sin stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
                        ) : (
                          <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-zinc-900 text-sm">{product.name}</p>
                          <p className="text-xs text-zinc-400">{product.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-500">{product.category || '—'}</td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => updateProduct(product.id, { allowNegativeStock: !product.allowNegativeStock })}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          product.allowNegativeStock
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                        }`}
                      >
                        {product.allowNegativeStock ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {product.allowNegativeStock ? 'Habilitado' : 'Deshabilitado'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[14px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h2 className="text-xl font-black text-zinc-900">
                  {editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Nombre de la Promoción</label>
                  <input
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 2x3 Gaseosas"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Tipo de Promoción</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['buy_x_get_y', 'scheduled_discount'] as PromotionType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setForm({ ...form, type: t })}
                        className={`p-3 rounded-xl border-2 text-sm font-bold text-left transition-all ${
                          form.type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                        }`}
                      >
                        {t === 'buy_x_get_y' ? '🛒 Paga X Lleva Y' : '⏰ Descuento Programado'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Producto</label>
                  <select
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.productId}
                    onChange={e => setForm({ ...form, productId: e.target.value })}
                  >
                    <option value="">Seleccionar producto…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.brand ? `- ${p.brand}` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* buy_x_get_y fields */}
                {form.type === 'buy_x_get_y' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Paga (cantidad)</label>
                      <input
                        type="number" min={1}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.buyQuantity ?? ''}
                        onChange={e => setForm({ ...form, buyQuantity: parseInt(e.target.value) || undefined })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Lleva (cantidad)</label>
                      <input
                        type="number" min={1}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.getQuantity ?? ''}
                        onChange={e => setForm({ ...form, getQuantity: parseInt(e.target.value) || undefined })}
                      />
                    </div>
                  </div>
                )}

                {/* scheduled_discount fields */}
                {form.type === 'scheduled_discount' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Precio de Oferta</label>
                      <input
                        type="number" min={0}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        value={form.discountPrice ?? ''}
                        onChange={e => setForm({ ...form, discountPrice: e.target.value ? Math.round(parseFloat(e.target.value)) : undefined })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Fecha Inicio</label>
                        <input type="date" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Fecha Fin</label>
                        <input type="date" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Hora Inicio</label>
                        <input type="time" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.startTime || ''} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Hora Fin</label>
                        <input type="time" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.endTime || ''} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Días de la semana (vacío = todos)</label>
                      <div className="flex gap-2 flex-wrap">
                        {DAY_LABELS.map((label, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleDay(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              (form.daysOfWeek || []).includes(idx)
                                ? 'bg-blue-500 text-white'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Active toggle */}
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-[14px]">
                  <input
                    type="checkbox"
                    id="promo-active"
                    className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <label htmlFor="promo-active" className="font-bold text-zinc-700 cursor-pointer">Promoción activa</label>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-100 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl transition-all">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar Promoción'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
