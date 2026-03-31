import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const AdminPaymentGateways = () => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Default State
  const [config, setConfig] = useState({
    provider: 'prismalink',
    is_active: true,
    mode: 'production',
    enabled_methods: ["VA", "QRIS"],
    enabled_banks: {
        VA: ["BCA", "BNI", "MANDIRI", "BRI"],
        QRIS: ["QRIS"]
    },
    instructions: ""
  });

  // Available Banks List
  const availableBanks = ["BCA", "BNI", "MANDIRI", "BRI", "PERMATA", "DANAMON", "CIMB", "BSI"];

  // Fetch Config
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get("/payment-gateways/admin");
      if (res.data.length > 0) {
        const data = res.data[0];
        setConfig({
            provider: data.provider,
            is_active: data.is_active,
            mode: data.mode,
            enabled_methods: typeof data.enabled_methods === 'string' ? JSON.parse(data.enabled_methods) : data.enabled_methods,
            enabled_banks: typeof data.enabled_banks === 'string' ? JSON.parse(data.enabled_banks) : data.enabled_banks,
            instructions: data.instructions || ""
        });
      }
    } catch (err) {
      console.error(err);
      error("Gagal memuat konfigurasi payment gateway.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Changes
  const toggleMethod = (method) => {
    const methods = config.enabled_methods.includes(method)
        ? config.enabled_methods.filter(m => m !== method)
        : [...config.enabled_methods, method];
    setConfig({ ...config, enabled_methods: methods });
  };

  const toggleBank = (bank) => {
    const currentBanks = config.enabled_banks.VA || [];
    const newBanks = currentBanks.includes(bank)
        ? currentBanks.filter(b => b !== bank)
        : [...currentBanks, bank];
    
    setConfig({ 
        ...config, 
        enabled_banks: { ...config.enabled_banks, VA: newBanks }
    });
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
        await api.put(`/payment-gateways/${config.provider}`, config);
        success("Konfigurasi Payment Gateway berhasil disimpan!");
    } catch (err) {
        console.error(err);
        error("Gagal menyimpan konfigurasi.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Memuat konfigurasi...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      {/* Header Removed */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Configuration Config */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Global Status */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-slate-900/20 group hover:rotate-6 transition-transform">
                            P
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">PrismaLink</h3>
                            <p className="text-[10px] font-bold text-[#F97316] uppercase tracking-[0.2em] mt-1">Gateway Provider</p>
                        </div>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={config.is_active} 
                            onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                            className="sr-only peer" 
                        />
                        <div className="w-16 h-9 bg-slate-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-emerald-500 shadow-inner group-active:scale-95 duration-200 transition-all"></div>
                        <span className={`ml-4 text-xs font-black uppercase tracking-widest ${config.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {config.is_active ? 'ENABLED' : 'DISABLED'}
                        </span>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Mode Lingkungan</p>
                      <div className="flex gap-2">
                          <button 
                              onClick={() => setConfig({ ...config, mode: 'sandbox' })}
                              className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config.mode === 'sandbox' ? 'bg-orange-950 text-white border-transparent shadow-lg shadow-orange-950/20' : 'bg-white text-slate-400 border border-slate-200 hover:border-orange-200'}`}
                          >
                              Sandbox
                          </button>
                          <button 
                              onClick={() => setConfig({ ...config, mode: 'production' })}
                              className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${config.mode === 'production' ? 'bg-[#F97316] text-white border-transparent shadow-lg shadow-orange-600/20' : 'bg-white text-slate-400 border border-slate-200 hover:border-orange-200'}`}
                          >
                              Production
                          </button>
                      </div>
                    </div>
                </div>

                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100/50 text-[11px] text-blue-600 leading-relaxed font-bold flex items-start gap-3">
                    <span className="material-symbols-outlined text-lg opacity-60">info</span>
                    <span>Nomor Virtual Account (VA) dan QRIS akan <strong>digenerate otomatis</strong> oleh PrismaLink untuk setiap transaksi. Admin tidak perlu menginput nomor rekening manual.</span>
                </div>
            </div>

            {/* 2. Payment Methods */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40">
                <h3 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight mb-6">Metode Pembayaran</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all group ${config.enabled_methods.includes("VA") ? 'bg-[#F97316]/5 border-[#F97316] shadow-lg shadow-orange-100' : 'bg-white border-slate-100 hover:border-orange-200 shadow-sm'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${config.enabled_methods.includes("VA") ? 'bg-[#F97316] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-500'}`}>VA</div>
                            <div>
                                <p className={`font-extrabold text-xs uppercase tracking-tight ${config.enabled_methods.includes("VA") ? 'text-slate-900' : 'text-slate-500'}`}>Virtual Account</p>
                                <p className="text-[10px] font-bold text-slate-400 opacity-60">Transfer otomatis</p>
                            </div>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={config.enabled_methods.includes("VA")}
                            onChange={() => toggleMethod("VA")}
                            className="w-6 h-6 text-[#F97316] rounded-lg border-2 border-slate-200 focus:ring-[#F97316] transition-all cursor-pointer" 
                        />
                    </label>

                    <label className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all group ${config.enabled_methods.includes("QRIS") ? 'bg-[#F97316]/5 border-[#F97316] shadow-lg shadow-orange-100' : 'bg-white border-slate-100 hover:border-orange-200 shadow-sm'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${config.enabled_methods.includes("QRIS") ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-800 group-hover:text-white'}`}>QR</div>
                            <div>
                                <p className={`font-extrabold text-xs uppercase tracking-tight ${config.enabled_methods.includes("QRIS") ? 'text-slate-900' : 'text-slate-500'}`}>QRIS Scan</p>
                                <p className="text-[10px] font-bold text-slate-400 opacity-60">Scan barcode</p>
                            </div>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={config.enabled_methods.includes("QRIS")}
                            onChange={() => toggleMethod("QRIS")}
                            className="w-6 h-6 text-[#F97316] rounded-lg border-2 border-slate-200 focus:ring-[#F97316] transition-all cursor-pointer" 
                        />
                    </label>
                </div>
            </div>

            {/* 3. Bank Selection (Only if VA enabled) */}
            {config.enabled_methods.includes("VA") && (
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40">
                    <h3 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight mb-2">Virtual Account</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Pilih daftar bank yang akan ditampilkan.</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {availableBanks.map(bank => (
                            <label key={bank} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all group active:scale-95 ${
                                config.enabled_banks.VA?.includes(bank) 
                                ? 'bg-orange-50/50 border-[#F97316] shadow-md shadow-orange-100' 
                                : 'bg-white border-slate-50 hover:border-orange-100'
                            }`}>
                                <input 
                                    type="checkbox" 
                                    checked={config.enabled_banks.VA?.includes(bank)}
                                    onChange={() => toggleBank(bank)}
                                    className="w-5 h-5 text-[#F97316] rounded-lg border-2 border-slate-200 focus:ring-[#F97316] transition-all cursor-pointer" 
                                />
                                <span className={`font-black text-xs uppercase tracking-widest ${config.enabled_banks.VA?.includes(bank) ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>{bank}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Instructions & Save */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/30 sticky top-8">
                <h3 className="text-lg font-black uppercase tracking-tight mb-6">Instruksi <span className="text-orange-400">Panel</span></h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Info Tambahan Member</label>
                    <textarea
                        value={config.instructions}
                        onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
                        className="w-full h-40 p-5 rounded-2xl bg-white/5 border border-white/10 focus:border-orange-500/50 focus:bg-white/10 outline-none transition-all text-xs font-medium text-slate-300 custom-scrollbar resize-none placeholder:text-slate-600"
                        placeholder="Contoh: Pembayaran akan diverifikasi otomatis oleh sistem..."
                    ></textarea>
                  </div>

                  <button
                      onClick={saveConfig}
                      disabled={saving}
                      className="w-full bg-[#F97316] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-600/30 hover:bg-orange-500 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg">save_as</span>
                          Simpan Konfigurasi
                        </>
                      )}
                  </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentGateways;
