import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const DomainApiSettings = () => {
  const { success, error } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    domain_api_provider: "resellercamp",
    domain_api_url: "",
    domain_api_user: "",
    domain_api_key: "",
    domain_api_ip: "", // Tambahkan ini
    domain_api_mode: "sandbox",
  });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/content/site-settings");
        if (res.data?.success) {
          const d = res.data.data;
          setSettings(prev => ({
            ...prev,
            domain_api_url: d.domain_api_url || "",
            domain_api_user: d.domain_api_user || "",
            domain_api_key: d.domain_api_key || "",
            domain_api_ip: d.domain_api_ip || "",
            domain_api_mode: d.domain_api_mode || "sandbox",
          }));
        }
      } catch (err) { console.error(err); }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.put("/content/site-settings", { settings });
      success("✅ Konfigurasi Domain API berhasil disimpan!");
    } catch (err) { error("❌ Gagal menyimpan konfigurasi"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="animate-[scaleIn_0.3s_ease-out] space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-500">language</span>
            <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">DaftarNama.id API Integration</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${settings.domain_api_mode === 'production' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
            {settings.domain_api_mode} MODE
          </div>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Endpoint URL API (DaftarNama)</label>
            <input type="text" value={settings.domain_api_url} onChange={e => setSettings({...settings, domain_api_url: e.target.value})} placeholder="https://api.daftarnama.id/v1"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">API Key / Token</label>
            <div className="relative">
              <input 
                type={showKey ? "text" : "password"} 
                value={settings.domain_api_key} 
                onChange={e => setSettings({...settings, domain_api_key: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" 
              />
              <button 
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {showKey ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Authorized IP (Whitelist)</label>
            <input type="text" value={settings.domain_api_ip} onChange={e => setSettings({...settings, domain_api_ip: e.target.value})} placeholder="123.123.123.123"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Akun (Opsional)</label>
            <input type="text" value={settings.domain_api_user} onChange={e => setSettings({...settings, domain_api_user: e.target.value})} placeholder="email@kamu.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mode Lingkungan</label>
            <select value={settings.domain_api_mode} onChange={e => setSettings({...settings, domain_api_mode: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all">
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production (Live)</option>
            </select>
          </div>
        </div>
      </div>
      
      <button id="btn-save-domain-api" className="hidden" onClick={handleSave} disabled={isLoading}>Save</button>
    </div>
  );
};

export default DomainApiSettings;
