import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const AdminPaymentGateways = () => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("tripay");

  // Available Channels for reference
  const [allTripayChannels, setAllTripayChannels] = useState([]);

  const [tripayConfig, setTripayConfig] = useState({
      provider: 'tripay',
      is_active: false,
      mode: 'production',
      enabled_methods: ["VA", "QRIS", "EWALLET"],
      enabled_banks: { VA: [], QRIS: ["QRIS"], EWALLET: [] },
      merchant_code: "",
      api_key: "",
      private_key: "",
      webhook_url: ""
  });

  const [suggestedWebhook, setSuggestedWebhook] = useState("");

  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    fetchConfig();
    fetchAllChannels();
  }, []);

  const fetchAllChannels = async () => {
    try {
      const res = await api.get("/payment-gateways/admin/tripay-channels");
      if (res.data.success) {
        setAllTripayChannels(res.data.data);
      }
    } catch (err) {
      console.error("Gagal mengambil data channel Tripay", err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.get("/payment-gateways/admin");
      
      res.data.forEach(data => {
          const parsedMethods = typeof data.enabled_methods === 'string' ? JSON.parse(data.enabled_methods) : data.enabled_methods;
          const parsedBanks = typeof data.enabled_banks === 'string' ? JSON.parse(data.enabled_banks) : data.enabled_banks;
          
          if (data.provider === 'tripay') {
              setTripayConfig({
                  provider: data.provider,
                  is_active: data.is_active,
                  mode: data.mode,
                  enabled_methods: parsedMethods || [],
                  enabled_banks: parsedBanks || { VA: [], QRIS: ["QRIS"], EWALLET: [] },
                  merchant_code: data.merchant_code || "",
                  api_key: data.api_key || "",
                  private_key: data.private_key || "",
                  webhook_url: data.webhook_url || ""
              });
              setSuggestedWebhook(data.suggested_webhook_url || "");
              
              if (data.is_active) {
                // fetchBalance(); (Removed as per request)
              }
          }
          
          if (data.instructions && !instructions) {
              setInstructions(data.instructions);
          }
      });
      
    } catch (err) {
      console.error(err);
      error("Gagal memuat konfigurasi payment gateway.");
    } finally {
      setLoading(false);
    }
  };



  const toggleActive = () => {
      setTripayConfig(prev => ({ ...prev, is_active: !prev.is_active }));
  };

  const toggleMethod = (method) => {
      const arr = tripayConfig.enabled_methods;
      const methods = arr.includes(method) ? arr.filter(m => m !== method) : [...arr, method];
      setTripayConfig({ ...tripayConfig, enabled_methods: methods });
  };

  const toggleBank = (group, bank) => {
     const currentBanks = tripayConfig.enabled_banks[group] || [];
     const newBanks = currentBanks.includes(bank) ? currentBanks.filter(b => b !== bank) : [...currentBanks, bank];
     setTripayConfig({ ...tripayConfig, enabled_banks: { ...tripayConfig.enabled_banks, [group]: newBanks }});
  };

  const setMode = (mode) => {
     setTripayConfig({ ...tripayConfig, mode });
  }

  const saveConfig = async () => {
    setSaving(true);
    try {
        const payload = { ...tripayConfig, instructions };
        const res = await api.put(`/payment-gateways/tripay`, payload);
        if (res.data.success) {
            success("Konfigurasi Tripay berhasil disimpan!");
        }
    } catch (err) {
        console.error(err);
        error("Gagal menyimpan konfigurasi gateway.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Memuat konfigurasi...</div>;

  const currentWebhookUrl = tripayConfig.webhook_url || suggestedWebhook || `${window.location.origin}/api/tripay/webhook`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    success("URL Webhook disalin!");
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-[fadeIn_0.5s_ease-out] pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Main Section */}
        <div className="flex-1 space-y-8">
            {/* 1. API STATUS WIDGET */}
                 <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col sm:flex-row justify-between sm:items-center min-h-[120px] gap-6 sm:gap-0">
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 text-sm">verified</span>
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gateway Status</h4>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer scale-90">
                            <input type="checkbox" checked={tripayConfig.is_active} onChange={toggleActive} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                     </div>
                     <div className="mt-4">
                        <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-fit">
                              <button 
                                onClick={() => setMode('sandbox')}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tripayConfig.mode === 'sandbox' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                Sandbox
                              </button>
                              <button 
                                onClick={() => setMode('production')}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tripayConfig.mode === 'production' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                Production
                              </button>
                        </div>
                     </div>
                 </div>

            {/* 2. API CREDENTIALS FORM */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">API Credentials</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest italic">Hubungkan ke Merchant Dashboard Tripay</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300">key</span>
                </div>
                <div className="p-4 sm:p-8 grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Merchant Code</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition font-bold text-xs"
                            value={tripayConfig.merchant_code}
                            onChange={(e) => setTripayConfig({ ...tripayConfig, merchant_code: e.target.value })}
                            placeholder="Contoh: T0001"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">API Key</label>
                        <input 
                            type="password" 
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition font-bold text-xs"
                            value={tripayConfig.api_key}
                            onChange={(e) => setTripayConfig({ ...tripayConfig, api_key: e.target.value })}
                            placeholder="Masukkan API Key"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Private Key</label>
                        <input 
                            type="password" 
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-500 transition font-bold text-xs"
                            value={tripayConfig.private_key}
                            onChange={(e) => setTripayConfig({ ...tripayConfig, private_key: e.target.value })}
                            placeholder="Masukkan Private Key"
                        />
                    </div>
                </div>
            </div>

            {/* 3. DYNAMIC PAYMENT METHODS TOGGLES */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Konfigurasi Channel</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest italic">Pilih metode yang ingin diaktifkan di checkout</p>
                    </div>
                </div>
                <div className="p-4 sm:p-8 space-y-10">
                    {/* Groups: VA, E-WALLET, RETAIL, etc */}
                    {Object.entries(
                        allTripayChannels.reduce((groups, ch) => {
                            const g = ch.group || 'Lainnya';
                            if (!groups[g]) groups[g] = [];
                            groups[g].push(ch);
                            return groups;
                        }, {})
                    ).map(([groupName, channels]) => {
                        const groupId = groupName.toUpperCase().replace(/\s+/g, '');
                        const isEnabled = tripayConfig.enabled_methods.includes(groupId);

                        return (
                            <div key={groupName} className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div 
                                        onClick={() => toggleMethod(groupId)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${isEnabled ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-300 border-slate-100'}`}
                                    >
                                        <input 
                                            type="checkbox" 
                                            readOnly 
                                            checked={isEnabled} 
                                            className="w-3.5 h-3.5 rounded-md border-slate-400 text-slate-900 focus:ring-slate-900 cursor-pointer" 
                                        />
                                        <span>{groupName}</span>
                                    </div>
                                    <div className="h-[1px] flex-1 bg-slate-50"></div>
                                </div>

                                {isEnabled && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-2 sm:pl-4 mt-2">
                                        {channels.map(ch => (
                                            <label 
                                                key={ch.code} 
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer hover:bg-slate-50 group ${tripayConfig.enabled_banks[groupId]?.includes(ch.code) ? 'border-orange-500 bg-orange-50/20' : 'border-slate-100 text-slate-400'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {ch.icon_url && <img src={ch.icon_url} alt={ch.code} className="w-5 h-5 object-contain grayscale group-hover:grayscale-0 transition-all opacity-50 group-hover:opacity-100" />}
                                                    <span className="text-[11px] font-black uppercase tracking-tight">{ch.code}</span>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={tripayConfig.enabled_banks[groupId]?.includes(ch.code)} 
                                                    onChange={() => toggleBank(groupId, ch.code)} 
                                                    className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500" 
                                                />
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {allTripayChannels.length === 0 && (
                        <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-300 font-bold text-xs">
                             Gagal memuat channel dari Tripay. Pastikan API Key benar.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Sidebar Panel */}
        <div className="w-full lg:w-80 space-y-6">
            {/* Action Card */}
            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
                <h3 className="text-sm font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-500">handyman</span>
                    Aksi Sistem
                </h3>
                
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Catatan Checkout</label>
                        </div>
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-orange-500/50 outline-none transition-all text-[11px] font-bold text-slate-600 resize-none custom-scrollbar"
                            placeholder="Instruksi tambahan untuk customer..."
                        />
                    </div>

                    <button
                        onClick={saveConfig}
                        disabled={saving}
                        className="w-full bg-[#f97316] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-600/30 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-sm">cloud_sync</span>
                                Simpan Setelan
                            </>
                        )}
                    </button>
                    <p className="text-[9px] text-slate-400 text-center font-bold italic">Terakhir diperbarui: Just Now</p>
                </div>
            </div>

            {/* Webhook Card */}
            <div className="bg-slate-50 p-5 sm:p-6 rounded-[2rem] border border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-sm">webhook</span>
                    Webhook URL
                </h4>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Manual Override URL</label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none focus:border-blue-500 transition font-bold text-[9px] text-slate-600"
                            value={tripayConfig.webhook_url}
                            onChange={(e) => setTripayConfig({ ...tripayConfig, webhook_url: e.target.value })}
                            placeholder="Kosongkan untuk otomatis..."
                        />
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <code className="text-[9px] font-black text-slate-600 truncate mr-2">{currentWebhookUrl}</code>
                        <button onClick={() => copyToClipboard(currentWebhookUrl)} className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition">
                            <span className="material-symbols-outlined text-xs">content_copy</span>
                        </button>
                    </div>
                </div>

                <p className="text-[8px] text-slate-400 mt-3 leading-relaxed font-bold italic border-l-2 border-slate-200 pl-3">
                    Paste URL ini di Dashboard Merchant Tripay pada bagian "Webhook Settings".
                </p>
            </div>
            
            <div className="p-6 border border-blue-50 rounded-[2rem] bg-blue-50/30 text-[9px] text-blue-500 leading-relaxed font-bold">
                <p className="uppercase mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-blue-600">lightbulb</span>
                    Panduan Cepat
                </p>
                Gunakan <span className="text-slate-900 underline">Sandbox</span> untuk simulasi transaksi. Jika sudah siap, masukkan key <span className="text-slate-900 underline">Production</span> dan ganti modenya ke Production.
            </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPaymentGateways;
