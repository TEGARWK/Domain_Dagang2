import React from 'react';

const EnvironmentSettings = ({ settings, onChange, isLoading }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-[scaleIn_0.3s_ease-out]">
      <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
        <span className="material-symbols-outlined text-indigo-500">terminal</span>
        <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">App Environment (Ngrok / Production)</h3>
      </div>
      
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CLIENT URL */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              Client URL (Frontend)
              <span className="material-symbols-outlined text-[14px] text-slate-300">devices</span>
            </label>
            <input 
              type="text" 
              name="app_client_url" 
              value={settings.app_client_url || ""} 
              onChange={onChange} 
              placeholder="http://localhost:5173"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all" 
            />
            <p className="text-[10px] text-slate-400 font-medium italic">* URL dasar aplikasi React kamu (misal: domain utama).</p>
          </div>

          {/* BACKEND URL */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              Backend URL (Ngrok / API)
              <span className="material-symbols-outlined text-[14px] text-slate-300">hub</span>
            </label>
            <input 
              type="text" 
              name="app_backend_url" 
              value={settings.app_backend_url || ""} 
              onChange={onChange} 
              placeholder="https://7cd2-xxxx.ngrok-free.app"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all" 
            />
            <p className="text-[10px] text-slate-400 font-medium italic">* URL API Backend (Ngrok saat dev, atau domain API saat production).</p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex gap-3">
            <span className="material-symbols-outlined text-amber-500 shrink-0">warning</span>
            <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
              <span className="font-bold uppercase tracking-tighter mr-1 text-amber-800">Penting:</span> 
              Perubahan URL di sini akan berdampak pada link aktivasi email dan callback pembayaran. 
              Pastikan menyertakan <code className="bg-amber-100 px-1 rounded">http://</code> atau <code className="bg-amber-100 px-1 rounded">https://</code> di awal URL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentSettings;
