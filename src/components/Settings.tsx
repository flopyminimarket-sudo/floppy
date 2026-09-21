import React, { useState, useRef, useEffect } from 'react';
import { Building2, Palette, Database, Save, Upload, Image as ImageIcon, Trash2, AlertTriangle, X, Download } from 'lucide-react';
import { useApp } from '../AppContext';
import toast from 'react-hot-toast';

export const Settings = () => {
  const { companySettings, setCompanySettings, cleanOldRecords, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [generalData, setGeneralData] = useState(companySettings);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showConfirmClean, setShowConfirmClean] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    if (!currentUser?.id) {
      toast.error('Sesión de usuario no válida para realizar respaldos.');
      return;
    }
    setIsBackingUp(true);
    const toastId = toast.loading('Generando respaldo en la nube...');
    try {
      const response = await fetch('/api/backup', {
        headers: {
          'x-user-id': currentUser.id
        }
      });
      if (!response.ok) {
        let errMsg = 'Error al generar el respaldo';
        try {
          // Intentar parsear JSON
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (_) {
          try {
            // Fallback a texto plano si no es JSON (ej: si el proxy de Vite retorna HTML)
            const txt = await response.text();
            if (txt && txt.length < 150) {
              errMsg = txt;
            } else if (response.status === 504 || response.status === 502) {
              errMsg = 'El servidor de backups no responde (¿está corriendo node server.mjs?)';
            }
          } catch (_) {}
        }
        throw new Error(errMsg);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `supabase_backup_${new Date().toISOString().split('T')[0]}.sql`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Respaldo descargado exitosamente', { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al generar el respaldo', { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

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
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-3 p-4 rounded-[14px] transition-all font-bold ${activeTab === 'maintenance' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200'}`}
          >
            <Trash2 className="w-5 h-5" />
            Mantenimiento
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

          {activeTab === 'maintenance' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Mantenimiento del Sistema</h2>
              <p className="text-sm text-zinc-500 mb-8">Administra la base de datos para mantener el sistema rápido y optimizado.</p>

              <div className="p-6 border border-rose-200 bg-rose-50 rounded-[14px]">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-rose-900 mb-1">Limpiar Historial Antiguo</h3>
                    <p className="text-sm text-rose-700 mb-4">
                      Esta acción eliminará de forma permanente todas las <strong>ventas y movimientos de inventario que tengan más de 15 días de antigüedad</strong>. 
                      Esto ayudará a liberar espacio y mejorar la velocidad de carga de la base de datos.<br/><br/>
                      <strong>Nota importante:</strong> El stock actual de los productos NO se verá afectado por esta limpieza.
                    </p>
                    <button
                      onClick={() => setShowConfirmClean(true)}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Purgar datos &gt; 15 días
                    </button>
                  </div>
                </div>
              </div>

              {/* Nueva sección para Respaldo Manual */}
              <div className="p-6 border border-zinc-200 bg-zinc-50 rounded-[14px] mt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-zinc-900 mb-1">Respaldo Manual de Base de Datos</h3>
                    <p className="text-sm text-zinc-600 mb-4">
                      Genera un respaldo completo de la base de datos de Supabase que incluye la estructura (esquemas), 
                      los datos de todas tus sucursales, relaciones, funciones internas y políticas RLS.<br/><br/>
                      El archivo se descargará en formato SQL estándar (`.sql`) listo para ser restaurado si es necesario.
                    </p>
                    <button
                      onClick={handleBackup}
                      disabled={isBackingUp}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isBackingUp ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Descargar Respaldo (.sql)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Cleanup Modal */}
      {showConfirmClean && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-rose-900 uppercase tracking-tight">Confirmar Limpieza</h3>
              </div>
              <button 
                onClick={() => setShowConfirmClean(false)}
                className="text-zinc-400 hover:text-zinc-600 p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                disabled={isCleaning}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-zinc-600 font-medium leading-relaxed mb-6">
                Estás a punto de borrar permanentemente los registros de ventas y movimientos más antiguos a 15 días.
                <br /><br />
                <span className="font-bold text-rose-600">Esta acción no se puede deshacer.</span> ¿Estás completamente seguro de continuar?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmClean(false)}
                  className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                  disabled={isCleaning}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setIsCleaning(true);
                    try {
                      await cleanOldRecords();
                      setShowConfirmClean(false);
                    } finally {
                      setIsCleaning(false);
                    }
                  }}
                  disabled={isCleaning}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-rose-200"
                >
                  {isCleaning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Limpiando...
                    </>
                  ) : (
                    'Sí, purgar datos'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
