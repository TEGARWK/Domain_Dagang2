import React, { useState } from "react";
import { formatRupiah, Breadcrumb, formatInputRupiah, parseRupiah } from "./SharedComponents";
import api from "../../../services/api";
import { toast } from "react-hot-toast";

const MoneyView = ({ data, onBack, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    type: 'OUT',
    category: 'Lainnya',
    status: 'Terealisasi',
    locationId: data.locations[0]?.id || '',
    receiver: '',
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
        type: formData.type,
        category: 'SAVING',
        description: `[${formData.category}] ${formData.receiver ? formData.receiver + ': ' : ''}${formData.description} ${formData.targetTransfer ? '(Transfer ke: ' + formData.targetTransfer + ')' : ''}`,
        nominal: parseFloat(formData.amount),
        location_id: formData.locationId,
        created_at: `${formData.date} ${formData.time}`
      });

      toast.success("Mutasi uang tersedia berhasil dicatat!");
      setFormData({ ...formData, amount: '', receiver: '', targetTransfer: '', description: '' });
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
      <Breadcrumb current="Detail Uang Tersedia" onBack={onBack} />

      {/* TITLE & PERIOD FILTER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Daftar Lokasi Uang (Money Manager)</h2>
          <p className="text-slate-500 text-[10px] font-medium">Monitoring saldo real-time di semua dompet dan bank penampung.</p>
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
                <option>{new Date(0, data.period.month - 1).toLocaleString('id-ID', {month: 'long'})} {data.period.year}</option>
              </select>
           </div>
        </div>
      </div>

      {/* WALLET CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
         {data.locations.map((loc, i) => (
            <div key={i} className={`bg-white rounded-2xl border ${loc.is_main ? 'border-blue-200 shadow-sm' : 'border-slate-100 shadow-sm'} overflow-hidden flex flex-col hover:border-blue-300 transition-all`}>
               <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                     <div className="pr-4">
                        <h4 className="text-sm font-bold text-slate-800 mb-1">{loc.name}</h4>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[300px]">
                           {loc.is_main 
                              ? "Revenue sistem otomatis masuk ke lokasi ini. Nominal manual hanya untuk saldo tambahan."
                              : "Saldo manual / hasil transfer dari lokasi lain."}
                        </p>
                     </div>
                     {loc.is_main ? (
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-bold border border-blue-100 uppercase tracking-tighter">Utama</span>
                     ) : (
                        <button className="text-[9px] font-bold text-slate-400 border border-slate-200 px-4 py-1.5 rounded-xl hover:bg-slate-50 transition uppercase tracking-tighter">Jadikan Utama</button>
                     )}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-6">{formatRupiah(loc.balance)}</h3>
               </div>
               <div className="bg-slate-50/50 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                  <div className="p-4 text-center">
                     <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Saldo dasar</p>
                     <p className="text-[10px] font-bold text-slate-600">{formatRupiah(0)}</p>
                  </div>
                  <div className="p-4 text-center">
                     <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Revenue</p>
                     <p className="text-[10px] font-bold text-slate-600">{formatRupiah(loc.is_main ? data.period.omset : 0)}</p>
                  </div>
                  <div className="p-4 text-center">
                     <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Mutasi</p>
                     <p className="text-[10px] font-bold text-slate-600">{formatRupiah(0)}</p>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {/* SYSTEM INFO BANNER */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-2xl mb-6 flex items-start gap-4 shadow-sm">
         <span className="material-symbols-outlined text-blue-500 mt-0.5">info</span>
         <div>
            <h5 className="text-[10px] font-bold text-blue-900 uppercase tracking-widest mb-1">Revenue otomatis masuk ke lokasi utama</h5>
            <p className="text-[11px] text-blue-700/80 font-medium leading-relaxed italic">
               Setiap transaksi/subscription yang tercatat sebagai revenue otomatis tampil pada arus kas sistem dan masuk ke lokasi utama: <span className="font-bold underline">{data.locations.find(l => l.is_main)?.name || 'N/A'}</span>.
            </p>
         </div>
      </div>

      {/* TAMBAH MUTASI FORM */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
         <div className="mb-6">
            <h4 className="font-bold text-slate-800 text-sm">Tambah Mutasi Uang Tersedia</h4>
            <p className="text-[10px] text-slate-400 font-medium">Catat uang masuk, uang keluar, atau transfer antar lokasi agar saldo uang tersedia tetap sinkron.</p>
         </div>
         
         {/* BARIS 1 */}
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
                  <option value="Lainnya">Lainnya</option>
                  <option value="Transfer Keluar">Transfer Antar Rekening</option>
                  <option value="Gaji Tim">Gaji Tim</option>
                  <option value="Refund">Refund Dana</option>
                  <option value="Biaya Server">Biaya Server / Cloud</option>
                  <option value="Biaya Marketing">Biaya Marketing / Ads</option>
                  <option value="Pendaftar Baru">Pendaftar Baru (Manual)</option>
                  <option value="Renewal">Renewal (Manual)</option>
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
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block tracking-wider">PENERIMA / TUJUAN BAYAR</label>
               <input type="text" value={formData.receiver} onChange={(e) => setFormData({...formData, receiver: e.target.value})} placeholder="Tim IT / Investor / Tripay" className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" />
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
                  <input 
                    type="text" 
                    value={formatInputRupiah(formData.amount)} 
                    onChange={(e) => setFormData({...formData, amount: parseRupiah(e.target.value)})} 
                    placeholder="1.000.000" 
                    className="w-full bg-slate-50 border border-slate-100 pl-8 pr-4 py-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-orange-500" 
                  />
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

      {/* ARUS KAS TABLE */}
      <div className="space-y-4">
         <div className="flex justify-between items-center px-2">
            <div>
               <h4 className="font-bold text-slate-800 text-sm">Arus Kas Uang Tersedia</h4>
               <p className="text-[10px] text-slate-400 font-medium italic">History pendaftaran baru, renewal, serta mutasi saldo manual tercatat di sini.</p>
            </div>
         </div>

         <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-widest text-[9px] border-b border-slate-50">
                     <tr>
                        <th className="py-4 px-8">Tanggal & Jam</th>
                        <th className="py-4 px-6">Arah</th>
                        <th className="py-4 px-6">Kategori</th>
                        <th className="py-4 px-6">Penerima/Sumber</th>
                        <th className="py-4 px-6">Lokasi</th>
                        <th className="py-4 px-6">Keterangan</th>
                        <th className="py-4 px-6 text-right">Jumlah</th>
                        <th className="py-4 px-6 text-center pr-8">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-500">
                     {data.mutations.filter(m => m.category === 'SAVING' || m.category === 'REVENUE').length > 0 ? (
                        data.mutations.filter(m => m.category === 'SAVING' || m.category === 'REVENUE').map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition">
                           <td className="py-5 px-8">
                              <p className="font-bold text-slate-800">{new Date(m.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                              <p className="text-[9px] text-slate-400">{new Date(m.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})} WIB</p>
                           </td>
                           <td className="py-5 px-6">
                              <span className={`font-bold ${m.type === 'IN' ? 'text-emerald-600' : 'text-orange-600'} italic`}>
                                 {m.type === 'IN' ? 'Arus Masuk' : 'Uang Keluar'}
                              </span>
                           </td>
                           <td className="py-5 px-6 font-bold text-slate-900 uppercase text-[9px]">{m.category === 'REVENUE' ? 'Revenue' : (m.description.split(']')[0].replace('[', '') || 'Manual')}</td>
                           <td className="py-5 px-6 font-bold text-slate-800">{m.category === 'REVENUE' ? 'Robi Gaming' : 'Administrator'}</td>
                           <td className="py-5 px-6 font-bold text-slate-700">{m.location_name || 'BCA PT ADT'}</td>
                           <td className="py-5 px-6 text-slate-400 italic max-w-[250px] truncate">{m.description}</td>
                           <td className="py-5 px-6 text-right font-bold text-slate-800">{formatRupiah(Math.round(m.nominal))}</td>
                           <td className="py-5 px-6 text-center pr-8">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-bold border uppercase tracking-tighter ${m.category === 'REVENUE' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                 {m.category === 'REVENUE' ? 'Otomatis' : 'Manual'}
                              </span>
                           </td>
                        </tr>
                        ))
                     ) : (
                        <tr><td colSpan="8" className="p-20 text-center italic text-slate-400 text-[10px]">Belum ada riwayat arus kas di lokasi ini.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
};

export default MoneyView;
