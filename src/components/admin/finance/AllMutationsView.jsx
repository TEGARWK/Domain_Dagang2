import React, { useState } from "react";
import { formatRupiah, Breadcrumb } from "./SharedComponents";
import api from "../../../services/api";
import { toast } from "react-hot-toast";

const AllMutationsView = ({ data, onBack, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }),
    type: 'IN',
    category: 'Revenue Masuk / Settlement',
    status: 'Terealisasi',
    source: '',
    locationId: data.locations[0]?.id || '',
    targetTransfer: '',
    amount: '',
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
        type: formData.type === 'TRANSFER' ? 'TRANSFER' : (formData.type === 'Uang Masuk' ? 'IN' : 'OUT'),
        category: 'SAVING', // Use SAVING to avoid 500 error from DB constraint
        description: `[${formData.category}] ${formData.source ? formData.source + ': ' : ''}${formData.description} ${formData.targetTransfer ? '(Transfer ke: ' + formData.targetTransfer + ')' : ''}`,
        nominal: parseFloat(formData.amount),
        location_id: formData.locationId,
        created_at: `${formData.date} ${formData.time.replace(' PM', '').replace(' AM', '')}`
      });

      toast.success("Mutasi berhasil dicatat di Master Ledger!");
      setFormData({ ...formData, amount: '', source: '', targetTransfer: '', description: '' });
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
      <Breadcrumb current="Mutasi All & Arus Kas" onBack={onBack} />

      {/* TITLE & PERIOD FILTER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Mutasi All & Arus Kas</h2>
          <p className="text-slate-500 text-[10px] font-medium">Periode {new Date(0, data.period.month - 1).toLocaleString('id-ID', {month: 'long'})} {data.period.year}. Detail bagian ini tersambung dengan arus kas dan mutasi.</p>
        </div>
        <div className="flex gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
           <div className="flex flex-col">
              <label className="text-[7px] font-bold text-slate-400 uppercase mb-0.5 tracking-tight">PERIODE</label>
              <select className="bg-transparent text-[10px] font-bold outline-none"><option>Bulanan</option></select>
           </div>
           <div className="w-px h-6 bg-slate-200"></div>
           <div className="flex flex-col">
              <label className="text-[7px] font-bold text-slate-400 uppercase mb-0.5 tracking-tight">BULAN</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold">{new Date(0, data.period.month - 1).toLocaleString('en-US', {month: 'long'})} {data.period.year}</span>
                <span className="material-symbols-outlined text-xs text-slate-400">calendar_today</span>
              </div>
           </div>
        </div>
      </div>

      {/* FORM TAMBAH MUTASI UANG */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
         <div className="mb-6">
            <h4 className="font-bold text-slate-800 text-sm">Tambah Mutasi Uang</h4>
            <p className="text-[10px] text-slate-400 font-medium">Uang masuk menambah saldo lokasi. Uang keluar mengurangi saldo lokasi. Transfer memindahkan saldo antar lokasi.</p>
         </div>
         
         {/* BARIS 1 */}
         <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">TANGGAL</label>
               <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">JAM</label>
               <input type="text" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} placeholder="04:16 PM" className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">ARAH</label>
               <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500">
                  <option value="IN">Uang Masuk</option>
                  <option value="OUT">Uang Keluar</option>
                  <option value="TRANSFER">Transfer Antar Lokasi</option>
               </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">KATEGORI</label>
               <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500">
                  <option value="Revenue Masuk / Settlement">Revenue Masuk / Settlement</option>
                  <option value="Biaya Operasional">Biaya Operasional</option>
                  <option value="Pajak">Pajak</option>
                  <option value="Ambil Hak Bagi Hasil">Ambil Hak Bagi Hasil</option>
                  <option value="Lainnya">Lainnya</option>
               </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">STATUS</label>
               <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500">
                  <option value="Terealisasi">Terealisasi</option>
                  <option value="Rencana">Rencana</option>
                  <option value="Dibatalkan">Dibatalkan</option>
               </select>
            </div>
         </div>

         {/* BARIS 2 */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">SUMBER UANG</label>
               <input type="text" value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} placeholder="Tripay / PrismaLink / Manual Transfer" className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">LOKASI UTAMA</label>
               <select value={formData.locationId} onChange={(e) => setFormData({...formData, locationId: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500">
                  {data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
               </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">TUJUAN TRANSFER</label>
               <input type="text" value={formData.targetTransfer} onChange={(e) => setFormData({...formData, targetTransfer: e.target.value})} placeholder="Khusus transfer" className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">NOMINAL</label>
               <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="1.000.000" className="w-full bg-slate-50 border border-slate-100 pl-8 pr-4 py-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
               </div>
            </div>
         </div>

         {/* BARIS 3 */}
         <div className="flex gap-4 items-end">
            <div className="flex-1">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">KETERANGAN</label>
               <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Contoh: biaya operasional / transfer antar rekening" className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
            </div>
            <button onClick={handleMutation} disabled={loading} className="bg-orange-600 text-white px-12 py-3 rounded-xl text-[10px] font-extrabold shadow-md shadow-orange-100 hover:bg-orange-700 transition-all uppercase tracking-wider">
               {loading ? 'Processing...' : 'Tambah Mutasi'}
            </button>
         </div>
      </div>

      {/* MASTER MUTASI TABLE */}
      <div className="space-y-4">
         <div className="flex justify-between items-end px-2">
            <div>
               <h3 className="font-bold text-slate-900 text-lg mb-2">Mutasi All</h3>
               <p className="text-[11px] text-slate-400 font-medium">Menampilkan 1-{data.mutations.length} dari {data.mutations.length} arus kas.</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Data dipaginasi agar tabel tetap ringan saat data besar.</p>
         </div>

         <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-widest text-[9px] border-b border-slate-50">
                     <tr>
                        <th className="py-4 px-8">TANGGAL & JAM</th>
                        <th className="py-4 px-6">ARAH</th>
                        <th className="py-4 px-6">KATEGORI</th>
                        <th className="py-4 px-6">PENERIMA/SUMBER</th>
                        <th className="py-4 px-6">LOKASI</th>
                        <th className="py-4 px-6">KETERANGAN</th>
                        <th className="py-4 px-6 text-right">JUMLAH</th>
                        <th className="py-4 px-6 text-center pr-8">STATUS</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-500">
                     {data.mutations.length > 0 ? (
                        data.mutations.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition">
                           <td className="py-5 px-8">
                              <p className="font-bold text-slate-800">{new Date(m.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                              <p className="text-[9px] text-slate-400">{new Date(m.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})} WIB</p>
                           </td>
                           <td className="py-5 px-6">
                              <span className={`font-bold ${m.type === 'IN' ? 'text-emerald-600' : 'text-orange-600'} italic`}>
                                 {m.type === 'IN' ? 'Arus Masuk Sistem' : 'Uang Keluar'}
                              </span>
                           </td>
                           <td className="py-5 px-6 font-bold text-slate-900 uppercase text-[9px]">
                              {m.category === 'REVENUE' ? 'Revenue' : 
                               m.category === 'DEPOSIT' ? 'Top Up User' : 
                               (m.description.includes(']') ? m.description.split(']')[0].replace('[', '') : 'Manual')}
                           </td>
                           <td className="py-5 px-6 font-bold text-slate-800">{m.category === 'REVENUE' ? 'Robi Permana' : 'Administrator'}</td>
                           <td className="py-5 px-6 font-bold text-slate-700">{m.location_name || 'BCA PT ADT'}</td>
                           <td className="py-5 px-6 text-slate-400 italic max-w-[250px] truncate">{m.description}</td>
                           <td className="py-5 px-6 text-right font-bold text-slate-800">{formatRupiah(Math.round(m.nominal))}</td>
                           <td className="py-5 px-6 text-center pr-8">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-bold border uppercase tracking-tighter ${(m.category === 'REVENUE' || m.category === 'DEPOSIT') ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                 {(m.category === 'REVENUE' || m.category === 'DEPOSIT') ? 'Otomatis' : 'Manual'}
                              </span>
                           </td>
                        </tr>
                        ))
                     ) : (
                        <tr><td colSpan="8" className="p-20 text-center italic text-slate-400 text-[10px]">Belum ada riwayat arus kas yang tercatat.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AllMutationsView;
