import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const DomainApiSettings = () => {
  const { success, error } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    domain_api_provider: "resellercamp",
    domain_api_url: "", domain_api_user: "", domain_api_key: "",
    domain_api_ip: "", domain_api_mode: "sandbox",
  });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/content/site-settings");
        if (res.data?.success) {
          const d = res.data.data;
          setSettings(prev => ({
            ...prev, domain_api_url: d.domain_api_url || "", domain_api_user: d.domain_api_user || "",
            domain_api_key: d.domain_api_key || "", domain_api_ip: d.domain_api_ip || "",
            domain_api_mode: d.domain_api_mode || "sandbox",
          }));
        }
      } catch (err) { console.error(err); }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try { await api.put("/content/site-settings", { settings }); success("Konfigurasi Domain API berhasil disimpan!"); }
    catch (err) { error("Gagal menyimpan konfigurasi"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="card">
        <div className="card-header" style={{ justifyContent: "space-between" }}>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-neutral-400">language</span>
            <span>DaftarNama.id API Integration</span>
          </div>
          <span className={`badge ${settings.domain_api_mode === 'production' ? 'badge-success' : 'badge-warning'}`}>
            {settings.domain_api_mode} MODE
          </span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="form-label">Endpoint URL API (DaftarNama)</label>
            <input type="text" value={settings.domain_api_url} onChange={e => setSettings({...settings, domain_api_url: e.target.value})} placeholder="https://api.daftarnama.id/v1" className="form-input" />
          </div>
          <div className="space-y-2">
            <label className="form-label">API Key / Token</label>
            <div className="relative">
              <input type={showKey ? "text" : "password"} value={settings.domain_api_key} onChange={e => setSettings({...settings, domain_api_key: e.target.value})} className="form-input" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                <span className="material-symbols-outlined text-lg">{showKey ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="form-label">Authorized IP (Whitelist)</label>
            <input type="text" value={settings.domain_api_ip} onChange={e => setSettings({...settings, domain_api_ip: e.target.value})} placeholder="123.123.123.123" className="form-input" />
          </div>
          <div className="space-y-2">
            <label className="form-label">Email Akun (Opsional)</label>
            <input type="text" value={settings.domain_api_user} onChange={e => setSettings({...settings, domain_api_user: e.target.value})} placeholder="email@kamu.com" className="form-input" />
          </div>
          <div className="space-y-2">
            <label className="form-label">Mode Lingkungan</label>
            <select value={settings.domain_api_mode} onChange={e => setSettings({...settings, domain_api_mode: e.target.value})} className="form-select">
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
