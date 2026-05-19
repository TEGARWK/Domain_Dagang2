import React, { useState } from "react";
import { formatRupiah, Breadcrumb, formatInputRupiah, parseRupiah } from "./SharedComponents";
import api from "../../../services/api";
import { toast } from "react-hot-toast";

const ConfigView = ({ data: initialData, onBack, onRefresh }) => {
  const [configs, setConfigs] = useState(initialData.configs || []);
  const [holders, setHolders] = useState(initialData.holders || []);
  const [locations, setLocations] = useState(initialData.locations || []);
  const [loading, setLoading] = useState(false);

  const savingTotal = configs.filter(c => c.type === 'SAVING').reduce((acc, curr) => acc + parseFloat(curr.percentage || 0), 0);
  const shareTotal = holders.reduce((acc, curr) => acc + parseFloat(curr.share_percentage || 0), 0);

  // --- LOGIC: CONFIGS (SAVING) ---
  const handleConfigChange = (index, field, value) => {
    const newConfigs = [...configs];
    newConfigs[index][field] = field === 'percentage' ? parseFloat(value) || 0 : value;
    setConfigs(newConfigs);
  };

  const addSavingPos = () => {
    setConfigs([...configs, { type: 'SAVING', name: 'Pos Baru', percentage: 0 }]);
  };

  const removeConfig = (index) => {
    setConfigs(configs.filter((_, i) => i !== index));
  };

  // --- LOGIC: HOLDERS (BAGI HASIL) ---
  const handleHolderChange = (index, field, value) => {
    const newHolders = [...holders];
    newHolders[index][field] = field === 'share_percentage' ? parseFloat(value) || 0 : value;
    setHolders(newHolders);
  };

  const addHolder = () => {
    setHolders([...holders, { name: 'Stakeholder Baru', share_percentage: 0 }]);
  };

  const removeHolder = (index) => {
    setHolders(holders.filter((_, i) => i !== index));
  };

  // --- LOGIC: LOCATIONS (UANG TERSEDIA) ---
  const handleLocationChange = (index, field, value) => {
    const newLocations = [...locations];
    if (field === 'is_main') {
      newLocations.forEach((l, i) => l.is_main = i === index);
    } else {
      const val = (field === 'balance' || field === 'base_balance') ? parseFloat(value) || 0 : value;
      newLocations[index][field] = val;
    }
    setLocations(newLocations);
  };

  const addLocation = () => {
    setLocations([...locations, { name: 'Lokasi Baru', is_main: false, balance: 0 }]);
  };

  const removeLocation = (index) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  // --- LOGIC: SAVE ---
  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        period_id: initialData.period.id,
        configs: [
            ...configs,
            ...holders.map(h => ({ type: 'DISTRIBUTION', name: h.name, percentage: h.share_percentage }))
        ],
        locations: locations,
        holders: holders
      };

      const response = await api.post('/finance/configs', payload);
      if (response.data.success) {
        toast.success("Konfigurasi berhasil disimpan!");
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan konfigurasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-10">
      <Breadcrumb current="Konfigurasi Keuangan" onBack={onBack} />

      {/* TITLE & PERIOD FILTER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Konfigurasi Bulanan</h2>
          <p className="text-slate-500 text-[10px] font-medium">Periode {new Date(initialData.period.year, initialData.period.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}. Detail bagian ini tersambung dengan arus kas dan mutasi.</p>
        </div>
        <div className="flex gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
           <div className="flex flex-col">
              <label className="text-[7px] font-bold text-slate-400 uppercase mb-0.5 tracking-tight">Periode</label>
              <select className="bg-transparent text-[10px] font-bold outline-none"><option>Bulanan</option></select>
           </div>
           <div className="w-px h-6 bg-slate-200"></div>
           <div className="flex flex-col">
              <label className="text-[7px] font-bold text-slate-400 uppercase mb-0.5 tracking-tight">Bulan</label>
              <select className="bg-transparent text-[10px] font-bold outline-none">
                <option>{new Date(initialData.period.year, initialData.period.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</option>
              </select>
           </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
         {[
           { label: "Periode Aktif", val: new Date(initialData.period.year, initialData.period.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), sub: "Pengaturan dipakai untuk bulan terpilih.", color: "text-slate-800" },
           { label: "Data Saving", val: formatRupiah(initialData.period.data_saving_total), sub: "Total tersedia untuk dibayarkan.", color: "text-orange-600" },
           { label: "Bagi Hasil", val: formatRupiah(initialData.period.net_profit), sub: "Total hak dibentuk periode ini.", color: "text-emerald-600" },
           { label: "Lokasi Utama", val: locations.find(l => l.is_main)?.name || "-", sub: "Revenue otomatis masuk ke sini.", color: "text-blue-600" },
         ].map((c, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
               <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest">{c.label}</p>
               <h3 className={`text-lg font-bold ${c.color} mb-1.5`}>{c.val}</h3>
               <p className="text-[8px] text-slate-400 font-medium leading-relaxed italic">{c.sub}</p>
            </div>
         ))}
      </div>

      {/* GUIDELINE BANNER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex justify-between items-center group">
         <div>
            <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
               <span className="material-symbols-outlined text-orange-500 text-base">lightbulb</span> Panduan konfigurasi bulanan
            </h4>
            <p className="text-[10px] text-blue-600 font-medium max-w-2xl">Bagian ini mengatur persentase Data Saving, pembagian Bagi Hasil, dan saldo dasar lokasi uang tersedia. Pastikan total persentase sesuai kebutuhan.</p>
         </div>
         <button 
            disabled={loading}
            onClick={handleSave}
            className="text-[9px] font-bold text-white bg-blue-600 px-5 py-2.5 rounded-xl hover:bg-blue-700 transition uppercase tracking-tighter disabled:opacity-50"
         >
            {loading ? 'Menyimpan...' : 'Simpan per bulan'}
         </button>
      </div>

      {/* CONFIG GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* DATA SAVING CONFIG */}
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Data Saving Bulanan</h4>
                  <p className="text-[10px] text-slate-400 font-medium italic">Atur pembagian target biaya untuk tiap pos.</p>
               </div>
               <div className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl border border-orange-100 text-center">
                  <p className="text-[7px] font-bold uppercase tracking-tighter">Total Persen</p>
                  <p className="text-xs font-bold">{savingTotal.toFixed(2)}%</p>
               </div>
            </div>
            
            <div className="w-full h-1 bg-slate-50 rounded-full mb-3 overflow-hidden">
               <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${Math.min(savingTotal, 100)}%` }}></div>
            </div>
            <p className="text-[9px] font-semibold text-orange-600 mb-6 italic tracking-tight">Total Ideal 100%. Saat ini Data Saving {savingTotal.toFixed(2)}%.</p>

            <div className="space-y-4">
               {configs.filter(c => c.type === 'SAVING').map((c, i) => (
                  <div key={i} className="group border-b border-slate-50 pb-4 last:border-0">
                     <div className="flex gap-3 items-end">
                        <div className="flex-1">
                           <label className="text-[8px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Nama Pos</label>
                           <input 
                              type="text" 
                              value={c.name} 
                              onChange={(e) => handleConfigChange(i, 'name', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-200 transition-all" 
                           />
                        </div>
                        <div className="w-20">
                           <label className="text-[8px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Persen</label>
                           <div className="relative">
                              <input 
                                type="number" 
                                value={c.percentage} 
                                onChange={(e) => handleConfigChange(i, 'percentage', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none text-right pr-6" 
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">%</span>
                           </div>
                        </div>
                        <button onClick={() => removeConfig(i)} className="text-red-400 border border-red-50 p-2 rounded-xl hover:bg-red-50 transition"><span className="material-symbols-outlined text-base">delete</span></button>
                     </div>
                  </div>
               ))}
               <button onClick={addSavingPos} className="w-full border-2 border-dashed border-slate-100 p-3 rounded-xl text-[10px] font-bold text-slate-400 hover:border-orange-200 hover:text-orange-600 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">add_circle</span> Tambah Pos Data Saving
               </button>
            </div>
         </div>

         {/* BAGI HASIL CONFIG */}
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">Bagi Hasil Pengelola</h4>
                  <p className="text-[10px] text-slate-400 font-medium italic">Atur porsi pembagian keuntungan bersih.</p>
               </div>
               <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100 text-center">
                  <p className="text-[7px] font-bold uppercase tracking-tighter">Total Persen</p>
                  <p className="text-xs font-bold">{shareTotal.toFixed(2)}%</p>
               </div>
            </div>
            
            <div className="w-full h-1 bg-slate-50 rounded-full mb-3 overflow-hidden">
               <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(shareTotal, 100)}%` }}></div>
            </div>
            <p className="text-[9px] font-semibold text-emerald-600 mb-6 italic tracking-tight">Total Ideal 100%. Saat ini Bagi Hasil {shareTotal.toFixed(2)}%.</p>

            <div className="space-y-4">
               {holders.map((h, i) => (
                  <div key={i} className="group border-b border-slate-50 pb-4 last:border-0">
                     <div className="flex gap-3 items-end">
                        <div className="flex-1">
                           <label className="text-[8px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Stakeholder</label>
                           <input 
                              type="text" 
                              value={h.name} 
                              onChange={(e) => handleHolderChange(i, 'name', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-emerald-200 transition-all" 
                           />
                        </div>
                        <div className="w-20">
                           <label className="text-[8px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Persen</label>
                           <div className="relative">
                              <input 
                                type="number" 
                                value={h.share_percentage} 
                                onChange={(e) => handleHolderChange(i, 'share_percentage', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none text-right pr-6" 
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">%</span>
                           </div>
                        </div>
                        <button onClick={() => removeHolder(i)} className="text-red-400 border border-red-50 p-2 rounded-xl hover:bg-red-50 transition"><span className="material-symbols-outlined text-base">delete</span></button>
                     </div>
                  </div>
               ))}
               <button onClick={addHolder} className="w-full border-2 border-dashed border-slate-100 p-3 rounded-xl text-[10px] font-bold text-slate-400 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">add_circle</span> Tambah Stakeholder
               </button>
            </div>
         </div>
      </div>

      {/* MONEY LOCATION CONFIG (Uang Tersedia) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mt-6">
         <div className="mb-6">
            <h4 className="font-bold text-slate-800 text-sm mb-1">Uang Tersedia (Money Manager)</h4>
            <p className="text-[10px] text-slate-400 font-medium italic">Set saldo dasar dan pilih lokasi yang akan menerima revenue otomatis.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {locations.map((l, i) => (
               <div key={i} className={`p-6 rounded-2xl border transition-all ${l.is_main ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <h5 className="font-bold text-slate-900 text-xs mb-1">{l.name}</h5>
                        <p className="text-[9px] text-slate-400 font-medium italic">{l.is_main ? 'Lokasi ini menerima revenue otomatis.' : 'Lokasi cadangan atau penampung saldo manual.'}</p>
                     </div>
                     {l.is_main && <span className="bg-blue-100 text-blue-600 text-[8px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter">Lokasi Utama</span>}
                  </div>

                  <div className="flex gap-3 items-end mb-4">
                     <div className="flex-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Nama Lokasi</label>
                        <input 
                           type="text" 
                           value={l.name} 
                           onChange={(e) => handleLocationChange(i, 'name', e.target.value)}
                           className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] font-bold outline-none" 
                        />
                     </div>
                     <div className="w-32">
                        <label className="text-[8px] font-bold text-slate-400 uppercase ml-1 mb-1 block text-right pr-2">Saldo Dasar</label>
                        <input 
                           type="text" 
                           value={formatInputRupiah(l.balance)} 
                           onChange={(e) => handleLocationChange(i, 'balance', parseRupiah(e.target.value))}
                           className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] font-bold outline-none text-right" 
                        />
                     </div>
                  </div>

                  <div className="flex justify-end gap-2">
                     {!l.is_main && <button onClick={() => handleLocationChange(i, 'is_main', true)} className="text-[9px] font-bold text-blue-600 border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-50 transition shadow-sm bg-white">Jadikan Utama</button>}
                     <button onClick={() => removeLocation(i)} className="text-[9px] font-bold text-red-500 border border-red-100 px-4 py-2 rounded-xl hover:bg-red-50 transition shadow-sm bg-white">Hapus</button>
                  </div>
               </div>
            ))}
         </div>

         <button onClick={addLocation} className="border-2 border-dashed border-slate-100 p-4 rounded-2xl text-[10px] font-bold text-slate-400 hover:border-orange-200 hover:text-orange-600 transition-all flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-sm">add_circle</span> Tambah Lokasi Baru
         </button>

         <div className="border-t border-slate-50 pt-6 flex justify-between items-center">
            <p className="text-[10px] text-slate-400 font-medium italic">Simpan perubahan untuk periode ini. Konfigurasi akan dipakai pada bulan yang dipilih di filter atas.</p>
            <button 
               disabled={loading}
               onClick={handleSave}
               className="bg-orange-600 text-white px-10 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all hover:translate-y-[-2px] disabled:opacity-50"
            >
               {loading ? 'Proses menyimpan...' : 'Simpan Konfigurasi Bulanan'}
            </button>
         </div>
      </div>
    </div>
  );
};

export default ConfigView;
