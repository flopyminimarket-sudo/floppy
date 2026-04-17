import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users as UsersIcon, 
  Truck, 
  Settings as SettingsIcon, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  History,
  Store,
  ChevronDown,
  Receipt,
  Tag,
  Barcode,
  Percent,
  Moon,
  Sun
} from 'lucide-react';
import { useApp } from '../AppContext';
import { POS } from './POS';
import { Dashboard } from './Dashboard';
import { Products } from './Products';
import { Suppliers } from './Suppliers';
import { Users } from './Users';
import { Inventory } from './Inventory';
import { Branches } from './Branches';
import { Tickets } from './Tickets';
import { Settings } from './Settings';
import { Categories } from './Categories';
import { Labels } from './Labels';
import { Promotions } from './Promotions';
import { cn } from '../lib/utils';

export const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { currentUser, setCurrentUser, branches, currentBranch, setCurrentBranch, companySettings, isDarkMode, toggleDarkMode } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['root', 'admin'] },
    { id: 'pos', label: 'Ventas (POS)', icon: ShoppingCart, roles: ['root', 'admin', 'cashier'] },
    { id: 'tickets', label: 'Tickets Emitidos', icon: Receipt, roles: ['root', 'admin', 'cashier'] },
    { id: 'categories', label: 'Categorías', icon: Tag, roles: ['root', 'admin'] },
    { id: 'promotions', label: 'Promociones', icon: Percent, roles: ['root', 'admin'] },
    { id: 'inventory', label: 'Inventario', icon: History, roles: ['root', 'admin', 'stocker'] },
    { id: 'products', label: 'Productos', icon: Package, roles: ['root', 'admin', 'stocker'] },
    { id: 'labels', label: 'Etiquetas', icon: Barcode, roles: ['root', 'admin', 'stocker'] },
    { id: 'branches', label: 'Sucursales', icon: Store, roles: ['root', 'admin'] },
    { id: 'suppliers', label: 'Proveedores', icon: Truck, roles: ['root', 'admin'] },
    { id: 'users', label: 'Usuarios', icon: UsersIcon, roles: ['root', 'admin'] },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon, roles: ['root'] },
  ];

  useEffect(() => {
    const handleNavigation = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('navigate', handleNavigation);
    return () => window.removeEventListener('navigate', handleNavigation);
  }, []);

  const filteredMenu = menuItems.filter(item => {
    if (!item.roles) return true;
    if (!currentUser) return false;
    const userRole = currentUser.role.toLowerCase();
    
    // Superadmin and root roles bypass role checks
    if (userRole === 'superadmin' || userRole === 'root') return true;
    
    return item.roles.includes(currentUser.role as any);
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'pos': return <POS />;
      case 'tickets': return <Tickets />;
      case 'dashboard': return <Dashboard />;
      case 'products': return <Products />;
      case 'labels': return <Labels />;
      case 'categories': return <Categories />;
      case 'promotions': return <Promotions />;
      case 'branches': return <Branches />;
      case 'suppliers': return <Suppliers />;
      case 'users': return <Users />;
      case 'inventory': return <Inventory />;
      case 'settings': return <Settings />;
      default: return (
        <div className="flex items-center justify-center h-full text-zinc-400">
          <div className="text-center">
            <SettingsIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-bold">Módulo en Desarrollo</h2>
            <p>Esta funcionalidad estará disponible pronto.</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={cn(
      "flex h-screen bg-zinc-50 text-zinc-900 font-sans overflow-hidden transition-colors duration-300",
      "dark:bg-zinc-950 dark:text-zinc-100"
    )}>
      
      {/* Sidebar */}
      <aside className={cn(
        "bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 z-30 print:hidden",
        isSidebarOpen ? "w-72" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[14px] flex items-center justify-center text-white shadow-lg shadow-blue-200 flex-shrink-0 overflow-hidden">
            {companySettings.logo ? (
              <img src={companySettings.logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="font-black text-xl italic">{companySettings.name.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-extrabold text-xl tracking-tighter text-zinc-900 dark:text-zinc-100 uppercase">{companySettings.name}</h1>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{companySettings.slogan}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          {filteredMenu.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-[14px] transition-all group relative",
                activeTab === item.id 
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold" 
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <item.icon className={cn(
                "w-6 h-6 transition-colors",
                activeTab === item.id ? "text-blue-600" : "text-zinc-400 group-hover:text-zinc-900"
              )} />
              {isSidebarOpen && <span>{item.label}</span>}
              {activeTab === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className={cn(
            "bg-zinc-50 dark:bg-zinc-800/50 rounded-[14px] flex items-center border border-zinc-100 dark:border-zinc-800",
            isSidebarOpen ? "p-4 gap-3" : "p-2 flex-col gap-2 justify-center"
          )}>
            <div className="w-10 h-10 bg-zinc-200 rounded-[14px] flex-shrink-0 overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name}`} alt="avatar" />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{currentUser?.name}</p>
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">{currentUser?.role}</p>
              </div>
            )}
            <button 
              onClick={() => {
                setCurrentUser(null);
                setCurrentBranch(null);
              }}
              className={cn(
                "text-zinc-400 hover:text-red-500 transition-colors",
                !isSidebarOpen && "p-2"
              )}
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {activeTab !== 'pos' && (
          <header className="h-20 bg-white border-b border-zinc-200 px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-500 transition-colors"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="hidden md:flex items-center gap-2 text-sm font-medium text-zinc-400 dark:text-zinc-500">
                <span>{companySettings.name}</span>
                <span>/</span>
                <span className="text-zinc-900 dark:text-zinc-100 capitalize">{activeTab}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden sm:block">
                <select
                  value={currentBranch.id}
                  onChange={(e) => {
                    const branch = branches.find(b => b.id === e.target.value);
                    if (branch) setCurrentBranch(branch);
                  }}
                  className="appearance-none bg-blue-50 border-none text-blue-700 py-2.5 pl-4 pr-10 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                >
                  {branches
                    .filter(b => {
                      if (!currentUser) return false;
                      if ((currentUser.role === 'admin' || currentUser.role === 'root' || currentUser.role === 'superadmin') && (!currentUser.branchIds || currentUser.branchIds.length === 0 || currentUser.branchIds.includes('all'))) return true;
                      return currentUser.branchIds?.includes(b.id);
                    })
                    .map(b => (
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
                className="p-2.5 bg-zinc-50 hover:bg-blue-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
                title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button className="relative p-2.5 bg-zinc-50 hover:bg-blue-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900" />
              </button>
            </div>
          </header>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-slate-50/50 dark:bg-zinc-950/50">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};
