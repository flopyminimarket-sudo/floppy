import React from 'react';
import { useApp } from '../AppContext';
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';

export const Dashboard = () => {
  const { sales, products, currentBranch } = useApp();

  const branchSales = sales.filter(s => s.branchId === currentBranch.id && s.status !== 'voided');

  const todaySales = branchSales.filter(s => {
    const date = new Date(s.date);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  });

  const totalToday = todaySales.reduce((acc, s) => acc + s.total, 0);
  const criticalStock = products.filter(p => (p.stock[currentBranch.id] || 0) <= (p.minStock ?? 5));

  // Prepare chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString('es-CL', { weekday: 'short' });
    const daySales = branchSales.filter(s => {
      const sd = new Date(s.date);
      return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth();
    });
    return {
      name: dayStr,
      total: daySales.reduce((acc, s) => acc + s.total, 0)
    };
  }).reverse();

  const topProducts = products
    .map(p => {
      const sold = branchSales.reduce((acc, s) => {
        if (s.status === 'voided') return acc;
        const item = s.items.find(i => i.id === p.id);
        return acc + (item?.quantity || 0);
      }, 0);
      return { name: p.name, sold };
    })
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const stats = [
    { label: 'Ventas de Hoy', value: formatCurrency(totalToday), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%', trendUp: true },
    { label: 'Transacciones', value: todaySales.length, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+5%', trendUp: true },
    { label: 'Stock Crítico', value: criticalStock.length, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', trend: '-2', trendUp: false },
    { label: 'Productos', value: products.length, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', trend: '+3', trendUp: true },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500">Resumen general del minimarket</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-600">
            {new Date().toLocaleDateString('es-CL', { dateStyle: 'long' })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-[14px] border border-zinc-100 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className={cn("p-3 rounded-[14px]", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                stat.trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-black text-zinc-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-[14px] border border-zinc-100 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 mb-6">Ventas de la Semana</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#2563eb" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-[14px] border border-zinc-100 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 mb-6">Productos Más Vendidos</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={100}
                  tick={{ fontSize: 11, fill: '#71717a' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="sold" radius={[0, 10, 10, 0]}>
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#e11d48'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Critical Stock Table */}
      <div className="bg-white rounded-[14px] border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-900">Stock Crítico</h3>
          <button className="text-blue-600 text-sm font-bold hover:underline">Ver todo el inventario</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Stock Actual</th>
                <th className="px-6 py-4">Precio</th>
                <th className="px-6 py-4">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {criticalStock.map(product => (
                <tr key={product.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400">
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-zinc-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{product.category}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold">
                      {product.stock[currentBranch.id] || 0} unidades
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-zinc-900">{formatCurrency(product.price)}</td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-zinc-400 hover:text-blue-600 transition-colors">
                      <Plus className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
