import React from "react";

const IntegrationsSettings = ({ settings, onChange, onSave, isLoading }) => {
  return (
    <div className="animate-[scaleIn_0.3s_ease-out] space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          <span className="material-symbols-outlined text-blue-500">integration_instructions</span>
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Integrasi Pihak Ketiga</h3>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-600 text-sm">login</span>
              </div>
              <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Google Social Login</h4>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Google Client ID</label>
              <input
                type="text"
                name="google_client_id"
                value={settings.google_client_id || ""}
                onChange={onChange}
                placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400 font-medium italic">* Digunakan untuk fitur "Masuk dengan Google". Pastikan URL web sudah di-whitelist di Google Console.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex gap-3">
              <span className="material-symbols-outlined text-blue-500 shrink-0">info</span>
              <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                Tip: Kamu bisa mendapatkan Client ID ini dari <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Google Cloud Console</a>.
                Pilih project kamu, buka menu APIs & Services - Credentials, lalu buat "OAuth 2.0 Client ID".
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        id="btn-save-integrations"
        className="hidden"
        onClick={onSave}
        disabled={isLoading}
      >
        Save
      </button>
    </div>
  );
};

export default IntegrationsSettings;
