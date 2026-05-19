import React, { useState } from "react";
import { formatRupiah, Breadcrumb, WalletPreview } from "./SharedComponents";
import api from "../../../services/api";
import { toast } from "react-hot-toast";

const DataSavingView = ({ data, onBack, setActiveTab, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    type: 'OUT',
    category: 'Pajak',
    status: 'Terealisasi',
    locationId: data.locations[0]?.id || '',
    amount: '',
    targetTransfer: '',
    description: ''
  });

  const handleMutation = async () => {
    if (!formData.amount || !formData.description) {
      return toast.error("Isi semua data mutasi bro!");
    }

    try {
      setLoading(true);
      await api.post('/finance/mutation', {
        period_id: data.period.id,
        type: formData.type,
        category: 'SAVING',
        description: `[${formData.category}] ${formData.description} (Transfer ke: ${formData.targetTransfer})`,
        nominal: parseFloat(formData.amount),
        location_id: formData.locationId,
        created_at: `${formData.date} ${formData.time}`
      });

      toast.success("Mutasi data saving berhasil dicatat!");
      setFormData({ ...formData, amount: '', description: '' });
      if (refreshData) refreshData();
    } catch (err) {
      console.error(err);
      toast.error("Gagal nyatet mutasi. Coba lagi bro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-10">
      <Breadcrumb current="Detail Data Saving" onBack={onBack} />
      
      {/* TITLE & PERIOD FILTER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Detail Data Saving</h2>
          <p className="text-slate-500 text-[10px] font-medium italic">Periode {new Date(0, data.period.month - 1).toLocaleString('id-ID', {month: 'long'})} {data.period.year}. Detail bagian ini tersambung dengan arus kas dan mutasi.</p>
        </div>
        <div className="flex gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
           <div className="flex flex-col">
              <label className="text-[7px] font-bold text-slate-400 uppercase mb-0.5 tracking-tight">PERIODE</label>
              <select className="bg-transparent text-[10px] font-bold outline-none"><option>Bulanan</option></select>
           </div>
           <div className="w-px h-6 bg-slate-200"></div>
           <div className="flex flex-col">
              <label className="text-[7px] font-bold text-slate-400 uppercase mb-0.5 tracking-tight">BULAN</label>
              <input type="month" className="bg-transparent text-[10px] font-bold outline-none" defaultValue={`${data.period.year}-${String(data.period.month).padStart(2, '0')}`} />
           </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
         {[
           { label: "Uang Tersedia", val: data.period.data_saving_total, color: "text-orange-600" },
           { label: "Sudah Dibayar", val: 0, color: "text-emerald-600" },
           { label: "Rencana", val: 0, color: "text-yellow-600" },
           { label: "Sisa", val: data.period.data_saving_total, color: "text-red-600" },
         ].map((c, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
               <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">{c.label}</p>
               <h3 className={`text-xl font-bold ${c.color}`}>{formatRupiah(Math.round(c.val))}</h3>
            </div>
         ))}
      </div>

      <WalletPreview locations={data.locations} onSeeDetail={() => setActiveTab('money')} />

      {/* DETAIL TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-8 overflow-hidden">
         <div className="p-5 border-b border-slate-50">
            <h4 className="font-bold text-slate-800 text-sm">Detail Data Saving</h4>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
               <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <tr>
                     <th className="py-4 px-6">Pos</th>
                     <th className="py-4 px-4">Persen</th>
                     <th className="py-4 px-4">Uang Tersedia</th>
                     <th className="py-4 px-4">Sudah Dibayar</th>
                     <th className="py-4 px-4">Rencana</th>
                     <th className="py-4 px-6 text-right">Sisa</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 font-medium">
                  {data.configs.filter(c => c.type === 'SAVING').map((c, i) => {
                     const nominal = (parseFloat(c.percentage) / 100) * parseFloat(data.period.omset);
                     return (
                        <tr key={i} className="hover:bg-slate-50/50 transition group">
                           <td className="py-4 px-6 font-bold text-slate-800">{c.name}</td>
                           <td className="py-4 px-4 text-slate-400 italic">{c.percentage}%</td>
                           <td className="py-4 px-4 text-slate-600">{formatRupiah(Math.round(nominal))}</td>
                           <td className="py-4 px-4 text-slate-400">Rp 0</td>
                           <td className="py-4 px-4 text-slate-400">Rp 0</td>
                           <td className="py-4 px-6 text-right font-bold text-orange-600">{formatRupiah(Math.round(nominal))}</td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* TAMBAH MUTASI FORM */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
         <div className="mb-6">
            <h4 className="font-bold text-slate-800 text-sm">Tambah Mutasi Data Saving</h4>
            <p className="text-[10px] text-slate-400 font-medium">Catat pembayaran atau penggunaan dari pos Data Saving agar saldo detail dan Mutasi All tetap sinkron.</p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">TANGGAL</label>
               <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">JAM</label>
               <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">ARAH</label>
               <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500">
                  <option value="OUT">Uang Keluar</option>
                  <option value="IN">Uang Masuk</option>
               </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">KATEGORI</label>
               <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500">
                  <option value="Pajak">Pajak</option>
                  <option value="Operasional">Operasional</option>
                  <option value="Zakat">Zakat</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Affiliasi">Affiliasi</option>
               </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">STATUS</label>
               <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500">
                  <option value="Rencana">Rencana</option>
                  <option value="Terealisasi">Terealisasi</option>
                  <option value="Dibatalkan">Dibatalkan</option>
               </select>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">Penerima / Tujuan Bayar</label>
               <input type="text" value={formData.category} readOnly className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none" />
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">Lokasi Utama</label>
               <select value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500">
                  {data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
               </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">Tujuan Transfer</label>
               <input 
                type="text" 
                placeholder="Khusus transfer" 
                value={formData.targetTransfer}
                onChange={(e) => setFormData({...formData, targetTransfer: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" 
               />
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">Nominal</label>
               <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="1.000.000" className="w-full bg-slate-50 border border-slate-100 pl-8 pr-4 py-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
               </div>
            </div>
         </div>

         <div className="flex gap-4 items-end mb-4">
            <div className="flex-1">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">Keterangan</label>
               <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Contoh: biaya operasional / transfer antar rekening" className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
            </div>
            <button onClick={handleMutation} disabled={loading} className="bg-orange-500 text-white px-10 py-3 rounded-xl text-[10px] font-extrabold shadow-md shadow-orange-100 hover:bg-orange-600 transition-all uppercase tracking-wider">
               {loading ? 'Processing...' : 'Tambah Mutasi'}
            </button>
         </div>

         <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-emerald-700 mb-1 flex items-center gap-2">Terkait Data Saving</p>
            <p className="text-[10px] text-emerald-600 font-medium italic leading-relaxed">
               Pilih kategori pos seperti Pajak, Marketing, atau Operasional. Mutasi akan muncul di Mutasi All dan detail Data Saving sekaligus.
            </p>
         </div>
      </div>

      {/* ARUS KAS SECTION */}
      <div className="space-y-6">
         <div className="flex justify-between items-center px-2">
            <div>
               <h4 className="font-bold text-slate-800 text-sm">Arus Kas Khusus Data Saving</h4>
               <p className="text-[10px] text-slate-400 font-medium italic">Alokasi revenue otomatis serta pembayaran/penggunaan dari pos Data Saving tercatat di sini.</p>
            </div>
         </div>

         <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 grid grid-cols-1 md:grid-cols-5 gap-4">
               <div className="md:col-span-2">
                  <label className="text-[8px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Cari Arus Kas</label>
                  <input type="text" placeholder="Cari kategori, penerima, lokasi, keterangan..." className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
               </div>
               <div>
                  <label className="text-[8px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Arah</label>
                  <select className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-[10px] font-bold outline-none"><option>Semua arah</option></select>
               </div>
               <div>
                  <label className="text-[8px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Status</label>
                  <select className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-[10px] font-bold outline-none"><option>Semua status</option></select>
               </div>
               <div className="flex items-end gap-2">
                  <div className="flex-1">
                     <label className="text-[8px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">Kategori</label>
                     <select className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-[10px] font-bold outline-none"><option>Semua kategori</option></select>
                  </div>
                  <button className="bg-orange-500 text-white px-4 py-2.5 rounded-xl text-[10px] font-bold">Terapkan</button>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-widest text-[8px] border-b border-slate-50">
                     <tr>
                        <th className="py-4 px-8">TANGGAL & JAM</th>
                        <th className="py-4 px-6">ARAH</th>
                        <th className="py-4 px-6">KATEGORI</th>
                        <th className="py-4 px-6">PENERIMA/SUMBER</th>
                        <th className="py-4 px-6">LOKASI</th>
                        <th className="py-4 px-6">KETERANGAN</th>
                        <th className="py-4 px-6 text-right">JUMLAH</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                     {data.mutations.filter(m => m.category === 'SAVING' || m.category === 'REVENUE').length > 0 ? 
                      data.mutations.filter(m => m.category === 'SAVING' || m.category === 'REVENUE').map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition text-[10px]">
                           <td className="py-4 px-8">
                              <p className="font-bold text-slate-800">{new Date(m.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                              <p className="text-[8px] text-slate-400">{new Date(m.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})} WIB</p>
                           </td>
                           <td className="py-4 px-6">
                              <span className={`font-bold ${m.type === 'IN' ? 'text-emerald-600' : 'text-orange-600'}`}>
                                 {m.type === 'IN' ? 'Alokasi Revenue Otomatis' : 'Penggunaan Dana'}
                              </span>
                           </td>
                           <td className="py-4 px-6 font-bold text-slate-600 uppercase text-[9px]">{m.category}</td>
                           <td className="py-4 px-6 font-bold text-slate-800">{m.type === 'IN' ? 'Robi Gaming' : (m.description.split(']')[0].replace('[', '') || '-')}</td>
                           <td className="py-4 px-6 font-bold text-slate-500 uppercase">{m.location_name || 'BCA PT ADT'}</td>
                           <td className="py-4 px-6 text-slate-500 font-medium max-w-xs truncate">{m.description || `Alokasi otomatis pos ${m.category}`}</td>
                           <td className="py-4 px-6 text-right font-bold text-slate-900">{formatRupiah(Math.round(m.nominal))}</td>
                        </tr>
                     )) : (
                        <tr><td colSpan="7" className="p-20 text-center italic text-slate-400 text-[10px]">Data mutasi tidak ditemukan.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
};

export default DataSavingView;
