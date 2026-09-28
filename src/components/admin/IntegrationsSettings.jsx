import React from "react";

const IntegrationsSettings = ({ settings, onChange, onSave, isLoading }) => {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="card">
        <div className="card-header">
          <span className="material-symbols-outlined text-neutral-400">integration_instructions</span>
          <span>Integrasi Pihak Ketiga</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-500 text-sm">login</span>
              </div>
              <h4 className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider">Google Social Login</h4>
            </div>
            <div className="space-y-2">
              <label className="form-label">Google Client ID</label>
              <input type="text" name="google_client_id" value={settings.google_client_id || ""} onChange={onChange}
                placeholder="xxxxxxxxxxxx.apps.googleusercontent.com" className="form-input" />
              <p className="text-[10px] text-neutral-400 font-medium italic">Digunakan untuk fitur "Masuk dengan Google". Pastikan URL web sudah di-whitelist di Google Console.</p>
            </div>
          </div>
          <div className="pt-4 border-t border-neutral-100">
            <div className="p-3 rounded-xl" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", gap: 10 }}>
              <span className="material-symbols-outlined shrink-0" style={{ color: "#2563eb" }}>info</span>
              <p className="text-[11px]" style={{ color: "#1e40af", lineHeight: 1.6, fontWeight: 500 }}>
                Tip: Kamu bisa mendapatkan Client ID ini dari <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Google Cloud Console</a>.
                Pilih project kamu, buka menu APIs & Services - Credentials, lalu buat "OAuth 2.0 Client ID".
              </p>
            </div>
          </div>
        </div>
      </div>
      <button id="btn-save-integrations" className="hidden" onClick={onSave} disabled={isLoading}>Save</button>
    </div>
  );
};

export default IntegrationsSettings;
