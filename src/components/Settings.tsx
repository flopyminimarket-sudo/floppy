import React, { useState, useRef, useEffect } from 'react';
import { Building2, Palette, Database, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../AppContext';
import toast from 'react-hot-toast';

export const Settings = () => {
  const { companySettings, setCompanySettings } = useApp();
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [generalData, setGeneralData] = useState(companySettings);

  // Sync form data when companySettings loads from Supabase
  useEffect(() => {
    setGeneralData(companySettings);
  }, [companySettings]);

  const [colors, setColors] = useState({
    primary: '#2563eb',
    secondary: '#4f46e5',
  });

  const lightPalette = [
    { name: 'Cielo', color: '#0EA5E9' },
    { name: 'Menta', color: '#10B981' },
    { name: 'Girasol', color: '#FACC15' },
    { name: 'Coral', color: '#FB7185' },
    { name: 'Lavanda', color: '#A78BFA' },
    { name: 'Durazno', color: '#FDBA74' },
  ];

  const darkPalette = [
    { name: 'Medianoche', color: '#0F172A' },
    { name: 'Bosque', color: '#064E3B' },
    { name: 'Vino', color: '#4C1D95' },
    { name: 'Carbón', color: '#171717' },
    { name: 'Naval', color: '#1E3A8A' },
    { name: 'Chocolate', color: '#451A03' },
  ];

  const applyPaletteColor = (color: string) => {
    setColors({ ...colors, primary: color });
    toast.success('Color de paleta aplicado');
  };

  const [supabaseConfig, setSupabaseConfig] = useState({
    url: '',
    anonKey: ''
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('El logo no debe superar los 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setGeneralData({ ...generalData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      await setCompanySettings(generalData);
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar la configuración');
    }
  };

  return (
    <div className="h-full flex flex-col p-8 overflow-hidden">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-zinc-900">Configuración</h1>
        <p className="text-zinc-500 font-medium mt-1">Administra las preferencias y conexiones del sistema</p>
      </div>

      <div className="flex flex-1 gap-8 min-h-0">
        {/* Tabs Sidebar */}
        <div className="w-64 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-3 p-4 rounded-[14px] transition-all font-bold ${activeTab === 'general' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200'}`}
          >
            <Building2 className="w-5 h-5" />
            Datos Generales
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`flex items-center gap-3 p-4 rounded-[14px] transition-all font-bold ${activeTab === 'colors' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200'}`}
          >
            <Palette className="w-5 h-5" />
            Colores
          </button>
          <button
            onClick={() => setActiveTab('connection')}
            className={`flex items-center gap-3 p-4 rounded-[14px] transition-all font-bold ${activeTab === 'connection' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200'}`}
          >
            <Database className="w-5 h-5" />
            Conexión
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-zinc-200 rounded-[14px] shadow-sm overflow-y-auto p-8">
          {activeTab === 'general' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Datos de la Empresa</h2>

              <div className="mb-8 flex items-center gap-6">
                <div className="relative group">
                  <div className="w-32 h-32 bg-zinc-100 rounded-[14px] border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500">
                    {generalData.logo ? (
                      <img src={generalData.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-zinc-400" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Logo del Negocio</h3>
                  <p className="text-sm text-zinc-500">Sube el logo de tu empresa (PNG, JPG o SVG)</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-sm font-bold text-blue-600 hover:text-blue-700"
                  >
                    Seleccionar archivo
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1.5">Nombre del Negocio</label>
                    <input
                      type="text"
                      value={generalData.name}
                      onChange={e => setGeneralData({ ...generalData, name: e.target.value })}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1.5">Slogan / Lema</label>
                    <input
                      type="text"
                      value={generalData.slogan}
                      onChange={e => setGeneralData({ ...generalData, slogan: e.target.value })}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Ej: Calidad y Confianza"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1.5">RUT / Identificación</label>
                    <input
                      type="text"
                      value={generalData.rut}
                      onChange={e => setGeneralData({ ...generalData, rut: e.target.value })}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1.5">Correo Electrónico</label>
                    <input
                      type="email"
                      value={generalData.email}
                      onChange={e => setGeneralData({ ...generalData, email: e.target.value })}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1.5">Dirección Principal</label>
                  <input
                    type="text"
                    value={generalData.address}
                    onChange={e => setGeneralData({ ...generalData, address: e.target.value })}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1.5">Teléfono</label>
                  <input
                    type="text"
                    value={generalData.phone}
                    onChange={e => setGeneralData({ ...generalData, phone: e.target.value })}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Save Button - at the bottom of the form */}
              <div className="mt-10 flex justify-end border-t border-zinc-100 pt-6">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
                >
                  <Save className="w-5 h-5" />
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {activeTab === 'colors' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Personalización Visual</h2>
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-3">Color Principal</label>
                    <div className="flex items-center gap-4">
                      <input type="color" value={colors.primary} onChange={e => setColors({ ...colors, primary: e.target.value })} className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0" />
                      <div className="flex-1 p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-600">{colors.primary}</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-3">Color Secundario</label>
                    <div className="flex items-center gap-4">
                      <input type="color" value={colors.secondary} onChange={e => setColors({ ...colors, secondary: e.target.value })} className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0" />
                      <div className="flex-1 p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-zinc-600">{colors.secondary}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 mb-3">Paleta de Tonos Claros</h3>
                    <div className="grid grid-cols-6 gap-3">
                      {lightPalette.map((p) => (
                        <button key={p.name} onClick={() => applyPaletteColor(p.color)} className="group flex flex-col items-center gap-2">
                          <div className="w-full aspect-square rounded-xl shadow-sm border border-zinc-100 transition-transform group-hover:scale-110" style={{ backgroundColor: p.color }} />
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 mb-3">Paleta de Tonos Oscuros</h3>
                    <div className="grid grid-cols-6 gap-3">
                      {darkPalette.map((p) => (
                        <button key={p.name} onClick={() => applyPaletteColor(p.color)} className="group flex flex-col items-center gap-2">
                          <div className="w-full aspect-square rounded-xl shadow-sm border border-zinc-100 transition-transform group-hover:scale-110" style={{ backgroundColor: p.color }} />
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 border border-zinc-200 rounded-[14px] bg-zinc-50/50">
                  <h3 className="text-sm font-bold text-zinc-900 mb-4">Vista Previa de Interfaz</h3>
                  <div className="flex gap-4">
                    <button
                      className="px-6 py-3 text-white font-bold rounded-xl shadow-md transition-opacity hover:opacity-90"
                      style={{ background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.secondary})` }}
                    >
                      Botón Principal
                    </button>
                    <div
                      className="px-6 py-3 bg-white border font-bold rounded-xl shadow-sm"
                      style={{ borderColor: colors.primary, color: colors.primary }}
                    >
                      Botón Secundario
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Conexión a Supabase</h2>
              <p className="text-sm text-zinc-500 mb-6">Ingresa las credenciales de tu proyecto de Supabase para habilitar la sincronización en la nube.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1.5">Project URL</label>
                  <input type="text" placeholder="https://xyzcompany.supabase.co" value={supabaseConfig.url} onChange={e => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1.5">Anon Key</label>
                  <input type="text" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value={supabaseConfig.anonKey} onChange={e => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
