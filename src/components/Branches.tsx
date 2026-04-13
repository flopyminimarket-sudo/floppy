import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Store, Plus, MapPin, Phone, Edit2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export const Branches = () => {
  const { branches, setBranches, currentBranch, setCurrentBranch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    auto_print_ticket: false
  });

  const handleOpenModal = (branch?: any) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        auto_print_ticket: branch.auto_print_ticket || false
      });
    } else {
      setEditingBranch(null);
      setFormData({ name: '', address: '', phone: '', auto_print_ticket: false });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.phone) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      if (editingBranch) {
        const { error } = await supabase
          .from('branches')
          .update(formData)
          .eq('id', editingBranch.id);

        if (error) throw error;

        setBranches(prev => prev.map(b => 
          b.id === editingBranch.id 
            ? { ...b, ...formData }
            : b
        ));
        if (currentBranch?.id === editingBranch.id) {
          setCurrentBranch({ ...currentBranch, ...formData });
        }
        toast.success('Sucursal actualizada');
      } else {
        const { data, error } = await supabase
          .from('branches')
          .insert(formData)
          .select()
          .single();

        if (error) throw error;

        setBranches(prev => [...prev, data]);
        toast.success('Sucursal creada');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving branch:', error);
      toast.error('Error al guardar la sucursal');
    }
  };

  const handleDelete = async (id: string) => {
    if (branches.length === 1) {
      toast.error('No puedes eliminar la única sucursal');
      return;
    }
    if (currentBranch?.id === id) {
      toast.error('No puedes eliminar la sucursal activa');
      return;
    }
    if (confirm('¿Estás seguro de eliminar esta sucursal?')) {
      try {
        const { error } = await supabase.from('branches').delete().eq('id', id);
        if (error) throw error;

        setBranches(prev => prev.filter(b => b.id !== id));
        toast.success('Sucursal eliminada');
      } catch (error) {
        console.error('Error deleting branch:', error);
        toast.error('Error al eliminar la sucursal');
      }
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Sucursales</h1>
          <p className="text-zinc-500">Gestión de locales y direcciones</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-[14px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Nueva Sucursal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {branches.map(branch => (
          <div key={branch.id} className="bg-white p-6 rounded-[14px] border border-zinc-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-[14px] flex items-center justify-center text-blue-600">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900">{branch.name}</h3>
                <p className="text-xs text-zinc-500 font-mono">ID: {branch.id}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <MapPin className="w-4 h-4 text-zinc-400" />
                {branch.address}
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <Phone className="w-4 h-4 text-zinc-400" />
                {branch.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600">
                <div className={`w-2 h-2 rounded-full ${branch.auto_print_ticket ? 'bg-green-500' : 'bg-zinc-300'}`} />
                {branch.auto_print_ticket ? 'Impresión automática activada' : 'Sin impresión automática'}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-50 flex justify-end gap-2">
              <button 
                onClick={() => handleOpenModal(branch)}
                className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(branch.id)}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[14px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h2 className="text-xl font-black text-zinc-900">
                  {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Nombre</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Ej: Sucursal Centro" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Dirección</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Ej: Av. Principal 123" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Teléfono</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Ej: +56 9 1234 5678" 
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-xl">
                  <div>
                    <h3 className="font-bold text-zinc-900">Impresión Automática</h3>
                    <p className="text-xs text-zinc-500">Imprimir ticket automáticamente al completar venta</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.auto_print_ticket}
                      onChange={e => setFormData({...formData, auto_print_ticket: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl transition-all">Cancelar</button>
                  <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                    {editingBranch ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
