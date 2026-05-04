import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const MailApiSettings = () => {
  const { success, error } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    smtp_from_name: "Domain Dagang",
    smtp_from_email: "no-reply@domaindagang.com", // Tambahkan ini
    smtp_encryption: "tls",
  });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/content/site-settings");
        if (res.data?.success) {
          const d = res.data.data;
          setSettings(prev => ({
            ...prev,
            smtp_host: d.smtp_host || "",
            smtp_port: d.smtp_port || "587",
            smtp_user: d.smtp_user || "",
            smtp_pass: d.smtp_pass || "",
            smtp_from_name: d.smtp_from_name || "Domain Dagang",
            smtp_from_email: d.smtp_from_email || "",
            smtp_encryption: d.smtp_encryption || "tls",
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
      success("✅ Konfigurasi Mail Server berhasil disimpan!");
    } catch (err) { error("❌ Gagal menyimpan konfigurasi"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="animate-[scaleIn_0.3s_ease-out] space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-500">alternate_email</span>
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Mail Server (SMTP) Integration</h3>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SMTP Host</label>
            <input type="text" value={settings.smtp_host} onChange={e => setSettings({...settings, smtp_host: e.target.value})} placeholder="smtp.gmail.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Port</label>
              <input type="text" value={settings.smtp_port} onChange={e => setSettings({...settings, smtp_port: e.target.value})} placeholder="587"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enkripsi</label>
              <select value={settings.smtp_encryption} onChange={e => setSettings({...settings, smtp_encryption: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all">
                <option value="tls">TLS (STARTTLS)</option>
                <option value="ssl">SSL/TLS</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SMTP Username (Email)</label>
            <input type="text" value={settings.smtp_user} onChange={e => setSettings({...settings, smtp_user: e.target.value})} placeholder="user@gmail.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SMTP Password / App Password</label>
            <div className="relative">
              <input 
                type={showPass ? "text" : "password"} 
                value={settings.smtp_pass} 
                onChange={e => setSettings({...settings, smtp_pass: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" 
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPass ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Pengirim (Display Name)</label>
            <input type="text" value={settings.smtp_from_name} onChange={e => setSettings({...settings, smtp_from_name: e.target.value})} placeholder="Domain Dagang System"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Pengirim (From Address)</label>
            <input type="email" value={settings.smtp_from_email} onChange={e => setSettings({...settings, smtp_from_email: e.target.value})} placeholder="no-reply@domaindagang.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
          </div>
        </div>
      </div>
      <button id="btn-save-mail-api" className="hidden" onClick={handleSave} disabled={isLoading}>Save</button>
    </div>
  );
};

export default MailApiSettings;
