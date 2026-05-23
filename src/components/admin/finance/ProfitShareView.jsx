import React, { useState } from "react";
import { formatRupiah, Breadcrumb } from "./SharedComponents";
import api from "../../../services/api";
import { toast } from "react-hot-toast";

const ProfitShareView = ({ data, onBack, setActiveTab, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    type: 'OUT',
    holderId: data.holders[0]?.id || '',
    status: 'Terealisasi',
    locationId: data.locations[0]?.id || '',
    amount: '',
    targetTransfer: '',
    description: ''
  });

  const totalTaken = data.holders.reduce((acc, h) => acc + parseFloat(h.total_taken || 0), 0);
  const totalBalance = data.holders.reduce((acc, h) => acc + parseFloat(h.balance || 0), 0);

  const handleWithdraw = async () => {
    if (!formData.amount || !formData.description) {
      return toast.error("Isi semua data penarikan bro!");
    }

    try {
      setLoading(true);
      const selectedHolder = data.holders.find(h => h.id == formData.holderId);
      
      await api.post('/finance/mutation', {
        period_id: data.period.id,
        type: formData.type,
        category: 'PROFIT_SHARE',
        description: `[TARIK HAK] ${selectedHolder?.name}: ${formData.description} (Transfer ke: ${formData.targetTransfer})`,
        nominal: parseFloat(formData.amount),
        location_id: formData.locationId,
        created_at: `${formData.date} ${formData.time}`
      });

      toast.success("Mutasi bagi hasil berhasil dicatat!");
      setFormData({ ...formData, amount: '', targetTransfer: '', description: '' });
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
      <Breadcrumb current="Detail Bagi Hasil Pengelola" onBack={onBack} />

      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Detail Bagi Hasil Pengelola</h2>
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

      {/* SUMMARY TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
         {[
           { label: "Saldo Awal", val: 15056, color: "text-slate-600" },
           { label: "Hak Bulan Ini", val: data.period.net_profit, color: "text-emerald-600" },
           { label: "Sudah Diambil", val: totalTaken, color: "text-blue-600" },
           { label: "Belum Diambil", val: totalBalance, color: "text-orange-600" },
         ].map((c, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
               <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-tight">{c.label}</p>
               <h3 className={`text-xl font-bold ${c.color}`}>{formatRupiah(Math.round(c.val))}</h3>
            </div>
         ))}
      </div>

      {/* STAKEHOLDER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
         {data.holders.map((h, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm group hover:border-orange-200 transition-all">
               <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">{h.name}</p>
               <h3 className="text-2xl font-bold text-orange-500 mb-1">{formatRupiah(Math.round(h.balance))}</h3>
               <p className="text-[9px] text-slate-400 font-semibold italic">Total hak {formatRupiah(Math.round(h.current_month_right))} - diambil {formatRupiah(Math.round(h.total_taken))}</p>
            </div>
         ))}
      </div>

      {/* PREVIEW LOKASI UANG TERSEDIA */}
      <div className="bg-blue-50/30 border border-blue-100 p-6 rounded-2xl mb-8">
         <div className="flex justify-between items-center mb-4">
            <div>
               <h4 className="font-bold text-blue-900 text-sm">Preview Lokasi Uang Tersedia</h4>
               <p className="text-[10px] text-blue-600 font-medium italic">Gunakan ringkasan ini untuk melihat lokasi mana yang punya saldo sebelum mencatat pengambilan Bagi Hasil.</p>
            </div>
            <button className="bg-white text-blue-600 text-[9px] font-bold px-4 py-2 rounded-xl border border-blue-100 shadow-sm hover:bg-blue-50 transition-all" onClick={() => setActiveTab('money')}>Lihat detail uang tersedia</button>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.locations.map((l, i) => (
               <div key={i} className="bg-white p-5 rounded-2xl border border-slate-50 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                     <p className="text-[10px] font-bold text-slate-800">{l.name}</p>
                     {l.is_main && <span className="bg-blue-50 text-blue-500 text-[7px] font-bold px-1.5 py-0.5 rounded-full border border-blue-100 uppercase">Utama</span>}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{formatRupiah(l.balance)}</h3>
                  <p className="text-[8px] text-slate-400 font-medium">Saldo dasar Rp 0 • mutasi Rp 0</p>
               </div>
            ))}
         </div>
      </div>

      {/* FORM TAMBAH MUTASI */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
         <div className="mb-6">
            <h4 className="font-bold text-slate-800 text-sm">Tambah Mutasi Bagi Hasil</h4>
            <p className="text-[10px] text-slate-400 font-medium">Catat pengambilan hak pengelola agar saldo Bagi Hasil dan Mutasi All tetap sinkron.</p>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
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
               <select value={formData.holderId} onChange={(e) => setFormData({...formData, holderId: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500">
                  {data.holders.map(h => <option key={h.id} value={h.id}>Ambil Hak {h.name}</option>)}
               </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">STATUS</label>
               <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500"
               >
                  <option value="Rencana">Rencana</option>
                  <option value="Terealisasi">Terealisasi</option>
                  <option value="Dibatalkan">Dibatalkan</option>
               </select>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-1">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">PENERIMA / TUJUAN BAYAR</label>
               <input type="text" placeholder="Tim IT" className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none" value={data.holders.find(h => h.id == formData.holderId)?.name || ''} readOnly />
            </div>
            <div className="md:col-span-1">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">LOKASI UTAMA</label>
               <select value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500">
                  {data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
               </select>
            </div>
            <div className="md:col-span-1">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">TUJUAN TRANSFER</label>
               <input 
                type="text" 
                placeholder="Khusus transfer" 
                value={formData.targetTransfer}
                onChange={(e) => setFormData({...formData, targetTransfer: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" 
               />
            </div>
            <div className="md:col-span-1">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">NOMINAL</label>
               <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="1.000.000" className="w-full bg-slate-50 border border-slate-100 pl-8 pr-4 py-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
               </div>
            </div>
         </div>

         <div className="flex gap-4 items-end mb-4">
            <div className="flex-1">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">KETERANGAN</label>
               <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Contoh: biaya operasional / transfer antar rekening" className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
            </div>
            <button onClick={handleWithdraw} disabled={loading} className="bg-orange-500 text-white px-10 py-3 rounded-xl text-[10px] font-extrabold shadow-md shadow-orange-100 hover:bg-orange-600 transition-all uppercase tracking-wider">
               {loading ? 'Processing...' : 'Tambah Mutasi'}
            </button>
         </div>

         <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-emerald-700 mb-1 flex items-center gap-2">Terkait Bagi Hasil</p>
            <p className="text-[10px] text-emerald-600 font-medium italic leading-relaxed">
               Pilih kategori penerima seperti PT, Tim IT, atau Investor. Mutasi akan muncul di Mutasi All dan mengurangi saldo belum diambil penerima tersebut.
            </p>
         </div>
      </div>

      {/* TABEL ARUS KAS KHUSUS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
         <div className="p-6 border-b border-slate-50">
            <h4 className="font-bold text-slate-800 text-sm mb-6">Arus Kas Khusus Bagi Hasil</h4>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
               <div className="md:col-span-2">
                  <label className="text-[8px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">CARI ARUS KAS</label>
                  <input type="text" placeholder="Cari kategori, penerima, lokasi, keterangan..." className="w-full bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
               </div>
               <div>
                  <label className="text-[8px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">ARAH</label>
                  <select className="w-full bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-bold outline-none"><option>Semua arah</option></select>
               </div>
               <div>
                  <label className="text-[8px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">STATUS</label>
                  <select className="w-full bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-bold outline-none"><option>Semua status</option></select>
               </div>
               <div>
                  <label className="text-[8px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">KATEGORI</label>
                  <select className="w-full bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-bold outline-none"><option>Semua kategori</option></select>
               </div>
               <div className="flex items-end gap-2">
                  <div className="flex-1">
                     <label className="text-[8px] font-bold text-slate-400 uppercase mb-1.5 block ml-1">PER HALAMAN</label>
                     <select className="w-full bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-[10px] font-bold outline-none"><option>25</option></select>
                  </div>
                  <button className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold">Terapkan</button>
               </div>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-50/50 text-[8px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <tr>
                     <th className="px-6 py-4">TANGGAL & JAM</th>
                     <th className="px-6 py-4">ARAH</th>
                     <th className="px-6 py-4">KATEGORI</th>
                     <th className="px-6 py-4">PENERIMA/SUMBER</th>
                     <th className="px-6 py-4">LOKASI</th>
                     <th className="px-6 py-4">KETERANGAN</th>
                     <th className="px-6 py-4 text-right">JUMLAH</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {data.mutations.filter(m => m.category === 'PROFIT_SHARE' || m.category === 'REVENUE').length > 0 ? (
                    data.mutations.filter(m => m.category === 'PROFIT_SHARE' || m.category === 'REVENUE').map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-all text-[10px]">
                           <td className="px-6 py-4 text-slate-500">
                              <p className="font-bold text-slate-800">{new Date(m.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                              <p className="text-[8px]">{new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`font-bold ${m.type === 'IN' ? 'text-emerald-600' : 'text-orange-600'}`}>
                                 {m.type === 'IN' ? 'Alokasi Revenue Otomatis' : 'Pengambilan Hak'}
                              </span>
                           </td>
                           <td className="px-6 py-4 font-bold text-slate-600 uppercase text-[9px]">{m.category === 'REVENUE' ? (m.description.includes('Investor') ? 'Investor' : (m.description.includes('Tim IT') ? 'Tim IT' : 'PT ADT')) : 'Ambil Hak'}</td>
                           <td className="px-6 py-4 font-bold text-slate-800">{m.category === 'REVENUE' ? 'Robi Gaming' : (m.description.split(':')[0].replace('[TARIK HAK]', '').trim())}</td>
                           <td className="px-6 py-4 font-bold text-slate-500 uppercase">{m.location_name || 'BCA PT ADT'}</td>
                           <td className="px-6 py-4 text-slate-500 font-medium max-w-xs truncate">{m.description}</td>
                           <td className="px-6 py-4 text-right font-bold text-slate-900">{formatRupiah(Math.round(m.nominal))}</td>
                        </tr>
                     ))
                   ) : (
                      <tr>
                         <td colSpan="7" className="p-20 text-center text-slate-400 italic text-[10px]">Belum ada riwayat arus kas bagi hasil.</td>
                      </tr>
                   )}
               </tbody>
            </table>
         </div>
         <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Menampilkan {data.mutations.filter(m => m.category === 'PROFIT_SHARE' || m.category === 'REVENUE').length} arus kas.</p>
            <p className="text-[8px] text-slate-400 font-bold italic">Data dipaginasi agar tabel tetap ringan saat data besar.</p>
         </div>
      </div>
    </div>
  );
};

export default ProfitShareView;
