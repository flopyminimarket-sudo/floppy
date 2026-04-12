import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { supabase } from '../lib/supabase';
import { LogIn, KeyRound, Mail, Building2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login = () => {
  const { setCurrentUser, setCurrentBranch, branches, companySettings } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (branches.length > 0 && !branchId) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      toast.error('Por favor, selecciona una sucursal');
      return;
    }

    setIsLoading(true);
    try {
      // Find user in Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();
      
      if (error || !user) {
        toast.error('Credenciales incorrectas');
        return;
      }

      // Check branch access (Admin and Root can access all, others only their assigned branches)
      const userBranchIds = user.branch_ids || (user.branch_id ? [user.branch_id] : []);
      const canAccessAll = (user.role === 'admin' || user.role === 'root' || user.role === 'superadmin') && (userBranchIds.length === 0 || userBranchIds.includes('all'));
      
      if (!canAccessAll && userBranchIds.length > 0 && !userBranchIds.includes(branchId)) {
        toast.error('No tienes acceso a esta sucursal');
        return;
      }

      if (!canAccessAll && userBranchIds.length === 0 && user.role !== 'admin' && user.role !== 'root') {
        toast.error('Tu usuario no tiene sucursales asignadas');
        return;
      }

      const branch = branches.find(b => b.id === branchId);
      if (!branch) {
        toast.error('Sucursal no encontrada');
        return;
      }

      setCurrentBranch(branch);
      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchIds: userBranchIds,
        avatar: user.avatar
      });
      toast.success(`Bienvenido, ${user.name}`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600/90 to-indigo-700/90 text-white flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white rounded-[14px] flex items-center justify-center text-blue-600 shadow-2xl mb-8 transform -rotate-6 overflow-hidden">
            {companySettings.logo ? (
              <img src={companySettings.logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="font-black text-5xl italic">{companySettings.name.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-4 uppercase">{companySettings.name}</h1>
          <p className="text-xl text-blue-100 font-medium max-w-md">
            Sistema de Gestión Integral para Minimarkets
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative">
        <div className="w-full max-w-sm mx-auto">
          <div className="mb-10 lg:hidden flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[14px] flex items-center justify-center text-white shadow-lg mb-4 overflow-hidden">
              {companySettings.logo ? (
                <img src={companySettings.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="font-black text-2xl italic">{companySettings.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <h1 className="text-3xl font-black text-zinc-900 uppercase">{companySettings.name}</h1>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Iniciar Sesión</h2>
            <p className="text-zinc-500 mt-2 font-medium">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">Sucursal</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-700 font-medium appearance-none"
                  disabled={branches.length === 0}
                >
                  {branches.length === 0 && <option value="">Cargando sucursales...</option>}
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-700 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-700 dark:text-zinc-100 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || branches.length === 0}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-8"
            >
              <LogIn className="w-5 h-5" />
              {isLoading ? 'Iniciando sesión...' : 'Entrar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
