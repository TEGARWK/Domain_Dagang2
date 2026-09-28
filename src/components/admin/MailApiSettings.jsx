import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const MailApiSettings = () => {
  const { success, error } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    smtp_host: "", smtp_port: "587", smtp_user: "", smtp_pass: "",
    smtp_from_name: "Domain Dagang", smtp_from_email: "no-reply@domaindagang.com",
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
            ...prev, smtp_host: d.smtp_host || "", smtp_port: d.smtp_port || "587",
            smtp_user: d.smtp_user || "", smtp_pass: d.smtp_pass || "",
            smtp_from_name: d.smtp_from_name || "Domain Dagang",
            smtp_from_email: d.smtp_from_email || "", smtp_encryption: d.smtp_encryption || "tls",
          }));
        }
      } catch (err) { console.error(err); }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try { await api.put("/content/site-settings", { settings }); success("Konfigurasi Mail Server berhasil disimpan!"); }
    catch (err) { error("Gagal menyimpan konfigurasi"); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="card">
        <div className="card-header">
          <span className="material-symbols-outlined text-neutral-400">alternate_email</span>
          <span>Mail Server (SMTP) Integration</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="form-label">SMTP Host</label>
            <input type="text" value={settings.smtp_host} onChange={e => setSettings({...settings, smtp_host: e.target.value})} placeholder="smtp.gmail.com" className="form-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="form-label">Port</label>
              <input type="text" value={settings.smtp_port} onChange={e => setSettings({...settings, smtp_port: e.target.value})} placeholder="587" className="form-input" />
            </div>
            <div className="space-y-2">
              <label className="form-label">Enkripsi</label>
              <select value={settings.smtp_encryption} onChange={e => setSettings({...settings, smtp_encryption: e.target.value})} className="form-select">
                <option value="tls">TLS (STARTTLS)</option>
                <option value="ssl">SSL/TLS</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="form-label">SMTP Username (Email)</label>
            <input type="text" value={settings.smtp_user} onChange={e => setSettings({...settings, smtp_user: e.target.value})} placeholder="user@gmail.com" className="form-input" />
          </div>
          <div className="space-y-2">
            <label className="form-label">SMTP Password / App Password</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={settings.smtp_pass} onChange={e => setSettings({...settings, smtp_pass: e.target.value})} className="form-input" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                <span className="material-symbols-outlined text-lg">{showPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="form-label">Nama Pengirim (Display Name)</label>
            <input type="text" value={settings.smtp_from_name} onChange={e => setSettings({...settings, smtp_from_name: e.target.value})} placeholder="Domain Dagang System" className="form-input" />
          </div>
          <div className="space-y-2">
            <label className="form-label">Email Pengirim (From Address)</label>
            <input type="email" value={settings.smtp_from_email} onChange={e => setSettings({...settings, smtp_from_email: e.target.value})} placeholder="no-reply@domaindagang.com" className="form-input" />
          </div>
        </div>
      </div>
      <button id="btn-save-mail-api" className="hidden" onClick={handleSave} disabled={isLoading}>Save</button>
    </div>
  );
};

export default MailApiSettings;
