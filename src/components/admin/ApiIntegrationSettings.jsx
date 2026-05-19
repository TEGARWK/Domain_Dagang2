import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const ApiIntegrationSettings = () => {
  const { success, error, info } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk berbagai API
  const [settings, setSettings] = useState({
    // Domain Registrar API (Contoh: ResellerCamp)
    domain_api_provider: "resellercamp",
    domain_api_url: "",
    domain_api_user: "",
    domain_api_key: "",
    domain_api_mode: "sandbox", // sandbox atau production

    // Mail Server (SMTP)
    smtp_host: "",
    smtp_port: "465",
    smtp_user: "",
    smtp_pass: "",
    smtp_from_name: "Domain Dagang",
    smtp_encryption: "ssl",
  });

  useEffect(() => {
    const fetchApiSettings = async () => {
      try {
        const res = await api.get("/content/site-settings");
        if (res.data?.success) {
          const dbData = res.data.data;
          setSettings(prev => ({
            ...prev,
            domain_api_url: dbData.domain_api_url || "",
            domain_api_user: dbData.domain_api_user || "",
            domain_api_key: dbData.domain_api_key || "",
            domain_api_mode: dbData.domain_api_mode || "sandbox",
            smtp_host: dbData.smtp_host || "",
            smtp_port: dbData.smtp_port || "465",
            smtp_user: dbData.smtp_user || "",
            smtp_pass: dbData.smtp_pass || "",
            smtp_from_name: dbData.smtp_from_name || "Domain Dagang",
            smtp_encryption: dbData.smtp_encryption || "ssl",
          }));
        }
      } catch (err) {
        console.error("Gagal ambil API settings:", err);
      }
    };
    fetchApiSettings();
  }, []);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.put("/content/site-settings", { settings });
      success("✅ Konfigurasi API berhasil diperbarui!");
    } catch (err) {
      error("❌ Gagal menyimpan konfigurasi API");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-[scaleIn_0.3s_ease-out]">
      {/* --- DOMAIN REGISTRAR CONFIG --- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-500">language</span>
            <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Domain Registrar Integration</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${settings.domain_api_mode === 'production' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
            {settings.domain_api_mode} MODE
          </div>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Endpoint URL API</label>
            <input type="text" name="domain_api_url" value={settings.domain_api_url} onChange={handleChange} placeholder="https://api.resellercamp.com/v1"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">API User / Email</label>
            <input type="text" name="domain_api_user" value={settings.domain_api_user} onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">API Key / Token</label>
            <input type="password" name="domain_api_key" value={settings.domain_api_key} onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mode Lingkungan</label>
            <select name="domain_api_mode" value={settings.domain_api_mode} onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all">
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production (Live)</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- SMTP MAIL SERVER CONFIG --- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-500">alternate_email</span>
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Mail Server (SMTP)</h3>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SMTP Host</label>
            <input type="text" name="smtp_host" value={settings.smtp_host} onChange={handleChange} placeholder="smtp.gmail.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Port</label>
              <input type="text" name="smtp_port" value={settings.smtp_port} onChange={handleChange} placeholder="465"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enkripsi</label>
              <select name="smtp_encryption" value={settings.smtp_encryption} onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all">
                <option value="ssl">SSL</option>
                <option value="tls">TLS</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username / Email</label>
            <input type="text" name="smtp_user" value={settings.smtp_user} onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password / App Key</label>
            <input type="password" name="smtp_pass" value={settings.smtp_pass} onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Pengirim (Display Name)</label>
            <input type="text" name="smtp_from_name" value={settings.smtp_from_name} onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
        </div>
      </div>

      {/* ACTION AREA (DI DUPLIKASI KE SIDEBAR OLEH PARENT) */}
      <div className="hidden">
         <button id="save-api-settings" onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Menyimpan..." : "Simpan Integrasi"}
         </button>
      </div>
    </div>
  );
};

export default ApiIntegrationSettings;
