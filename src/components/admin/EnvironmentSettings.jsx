import React from 'react';

const EnvironmentSettings = ({ settings, onChange, isLoading }) => {
  return (
    <div className="card animate-fade-in">
      <div className="card-header">
        <span className="material-symbols-outlined text-neutral-400">terminal</span>
        <span>App Environment (Ngrok / Production)</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="form-label">Client URL (Frontend)</label>
            <input type="text" name="app_client_url" value={settings.app_client_url || ""} onChange={onChange} placeholder="http://localhost:5173" className="form-input" />
            <p className="text-[10px] text-neutral-400 font-medium italic">URL dasar aplikasi React kamu (misal: domain utama).</p>
          </div>
          <div className="space-y-2">
            <label className="form-label">Backend URL (Ngrok / API)</label>
            <input type="text" name="app_backend_url" value={settings.app_backend_url || ""} onChange={onChange} placeholder="https://7cd2-xxxx.ngrok-free.app" className="form-input" />
            <p className="text-[10px] text-neutral-400 font-medium italic">URL API Backend (Ngrok saat dev, atau domain API saat production).</p>
          </div>
        </div>
        <div className="pt-4 border-t border-neutral-100">
          <div className="p-3 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a", display: "flex", gap: 10 }}>
            <span className="material-symbols-outlined shrink-0" style={{ color: "#d97706" }}>warning</span>
            <p className="text-[11px]" style={{ color: "#92400e", lineHeight: 1.6, fontWeight: 500 }}>
              <span className="font-bold uppercase tracking-tighter mr-1" style={{ color: "#92400e" }}>Penting:</span>
              Perubahan URL di sini akan berdampak pada link aktivasi email dan callback pembayaran.
              Pastikan menyertakan <code style={{ background: "#fde68a", padding: "0 4px", borderRadius: 4 }}>http://</code> atau <code style={{ background: "#fde68a", padding: "0 4px", borderRadius: 4 }}>https://</code> di awal URL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentSettings;
