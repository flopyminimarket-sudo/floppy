import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Users as UsersIcon, Plus, Search, Shield, Mail, MoreVertical, X, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export const Users = () => {
  const { currentUser, users, setUsers, branches } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    branchIds: [] as string[]
  });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Keep empty to not update password unless provided
      role: user.role,
      branchIds: user.branchIds || []
    });
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'cashier', branchIds: [] });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        setUsers(prev => prev.filter(u => u.id !== id));
        toast.success('Usuario eliminado');
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Error al eliminar el usuario');
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      if (editingUser) {
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          branch_ids: formData.branchIds.length > 0 ? formData.branchIds : null
        };
        if (formData.password) updateData.password = formData.password;

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;

        setUsers(prev => prev.map(u => u.id === editingUser.id ? {
          ...u,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          branchIds: formData.branchIds
        } : u));
        toast.success('Usuario actualizado');
      } else {
        const { data, error } = await supabase
          .from('users')
          .insert({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            branch_ids: formData.branchIds.length > 0 ? formData.branchIds : null
          })
          .select()
          .single();

        if (error) throw error;

        const newUser = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          branchIds: data.branch_ids || [],
          avatar: data.avatar
        };

        setUsers(prev => [...prev, newUser]);
        toast.success('Usuario creado exitosamente');
      }
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'cashier', branchIds: [] });
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Error al guardar el usuario');
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Usuarios y Permisos</h1>
          <p className="text-zinc-500">Administración de personal y accesos</p>
        </div>
        <button 
          onClick={handleNew}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-[14px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="relative shrink-0 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-zinc-700 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 bg-white rounded-[14px] border border-zinc-100 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Sucursales</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 rounded-xl overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 block">{user.name}</span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Shield className={cn(
                      "w-4 h-4",
                      user.role === 'root' ? "text-red-600" :
                      user.role === 'admin' ? "text-purple-500" : 
                      user.role === 'cashier' ? "text-blue-500" : "text-amber-500"
                    )} />
                    <span className="text-sm font-bold capitalize text-zinc-700">
                      {user.role === 'root' ? 'ROOT' : user.role}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.branchIds && user.branchIds.length > 0 ? (
                      user.branchIds.map(bid => {
                        const bName = branches.find(b => b.id === bid)?.name || 'Desconocida';
                        return (
                          <span key={bid} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                            {bName}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-400 italic">Sin acceso</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 text-zinc-400">
                    {(currentUser?.role === 'root' || currentUser?.role === 'superadmin' || user.role !== 'root') ? (
                      <>
                        <button 
                          onClick={() => handleEdit(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="p-2 text-xs italic">Protegido</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
        </table>
      </div>
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
                <h2 className="text-xl font-black text-zinc-900">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
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
                    placeholder="Ej: Juan Pérez" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Ej: juan@empresa.com" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Contraseña</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full p-3 pr-12 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400" 
                      placeholder="******" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Rol</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(currentUser?.role === 'root' || currentUser?.role === 'superadmin') && <option value="root">ROOT (Superusuario)</option>}
                    <option value="admin">Administrador</option>
                    <option value="cashier">Cajero</option>
                    <option value="stocker">Bodeguero</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-500 uppercase flex justify-between">
                    Sucursales Permitidas
                    <span className="text-[10px] normal-case font-normal text-zinc-400">Selecciona una o varias</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {branches.map(branch => {
                      const isSelected = formData.branchIds.includes(branch.id);
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            const newIds = isSelected 
                              ? formData.branchIds.filter(id => id !== branch.id)
                              : [...formData.branchIds, branch.id];
                            setFormData({...formData, branchIds: newIds});
                          }}
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all",
                            isSelected 
                              ? "bg-blue-50 border-blue-200 text-blue-700 font-bold" 
                              : "bg-zinc-50 border-zinc-100 text-zinc-600 hover:bg-zinc-100"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                            isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-zinc-200"
                          )}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white transition-all shadow-sm" />}
                          </div>
                          <span className="text-xs truncate">{branch.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {formData.branchIds.length === 0 && (
                    <p className="text-[10px] text-amber-600 font-medium">⚠️ El usuario no podrá acceder a ninguna sucursal</p>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-50 rounded-xl transition-all">Cancelar</button>
                  <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                    Guardar
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
