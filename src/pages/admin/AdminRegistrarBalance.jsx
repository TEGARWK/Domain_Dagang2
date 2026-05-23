import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

import { WalletIcon, ClockIcon, PlusCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const AdminRegistrarBalance = () => {
  const [balanceData, setBalanceData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { success, error } = useNotification();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/registrar-balance");
      if (res.data.success) {
        setBalanceData(res.data.balance);
        setHistory(res.data.history);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await api.post("/admin/registrar-balance/sync");
      if (res.data.success) {
        fetchData(); // Refresh all
      }
    } catch (err) {
      error("Gagal sinkronisasi saldo: " + (err.response?.data?.message || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const fmt = (num) =>  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

  if (loading && !balanceData) return (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F97316]"></div>
    </div>
  );

  const currentBal = parseFloat(balanceData?.current_balance || 0);
  const threshold = parseFloat(balanceData?.low_balance_threshold || 500000);
  const isLow = currentBal < threshold;

  return (
    <div className="space-y-3 animate-[fadeIn_0.5s_ease-out] pb-10">
      <div className="flex justify-end">
        <button 
          onClick={handleSync}
          disabled={syncing}
          className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#F97316] transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center gap-3 group"
        >
          <div className={`w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center ${syncing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform`}>
            <span className="material-symbols-outlined text-base">sync</span>
          </div>
          {syncing ? 'MENYINKRONKAN...' : 'SINKRONKAN SALDO'}
        </button>
      </div>

      {/* BALANCE CARD */}
      <div className={`relative overflow-hidden p-6 rounded-xl shadow-xl border transition-all duration-500 ${
        isLow ? 'bg-rose-50 border-rose-100 shadow-rose-200/50' : 'bg-white border-slate-100 shadow-slate-200/40'
      }`}>
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isLow ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                  Saldo Tersedia Saat Ini
               </h3>
               <div className={`text-4xl font-bold tracking-tighter ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                   {fmt(currentBal)}
               </div>
               {isLow && (
                   <div className="flex items-center gap-2 text-rose-600 mt-2 bg-white/60 px-3 py-1.5 rounded-lg border border-rose-100 w-fit">
                       <ExclamationTriangleIcon className="w-4 h-4" />
                       <span className="text-[10px] font-bold uppercase tracking-wide text-rose-500">Saldo Rendah! Isi segera di Daftarnama.</span>
                   </div>
               )}
            </div>
            
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl shadow-inner ${
                isLow ? 'bg-rose-100 text-rose-500' : 'bg-orange-50 text-orange-500'
            }`}>
               <WalletIcon className="w-8 h-8" />
            </div>
         </div>
         
         <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl -mr-32 -mt-32 -z-0"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* HISTORY TABLE */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-lg shadow-slate-200/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                   <ClockIcon className="w-4 h-4" />
                </div>
                <div>
                   <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-tight leading-none mb-0.5">Riwayat Mutasi Saldo</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transaksi Akun</p>
                </div>
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-separate border-spacing-0">
                  <thead>
                      <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-4 py-2">Tanggal & Waktu</th>
                          <th className="px-4 py-2">Tipe</th>
                          <th className="px-4 py-2">Keterangan</th>
                          <th className="px-4 py-2 text-right">Nominal</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                      {history.length === 0 ? (
                          <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-300 font-bold italic uppercase tracking-widest text-[10px]">Belum ada catatan aktivitas saldo.</td></tr>
                      ) : (
                          history.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="px-4 py-2">
                                      <p className="text-[11px] font-bold text-slate-800">
                                          {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                                          {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                  </td>
                                  <td className="px-4 py-2">
                                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border shadow-sm ${
                                          item.type === 'credit' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                          item.type === 'debit' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                      }`}>
                                          {item.type}
                                      </span>
                                  </td>
                                  <td className="px-4 py-2">
                                      <p className="text-xs font-bold text-slate-700 tracking-tight">{item.description}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Ref: {item.reference_id || '-'}</p>
                                  </td>
                                  <td className={`px-4 py-2 text-right font-bold text-sm ${item.type === 'credit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {item.type === 'debit' ? '-' : '+'}{fmt(item.amount)}
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
        </div>

        {/* INFO SIDEBAR */}
        <div className="space-y-3">
            <div className="bg-slate-900 rounded-xl p-4 text-white shadow-xl shadow-slate-900/20">
                <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-orange-400">info</span>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Informasi Penting</h3>
                </div>
                <div className="space-y-3">
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                        * Saldo ini adalah nominal saldo Anda di <strong>Daftarnama</strong>.
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                        * DagangDomain hanya mencatat transaksi domain yang diproses melalui sistem.
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic border-t border-slate-800 pt-4">
                        * Untuk melakukan Top-Up, Anda harus login langsung ke Portal Daftarnama. Admin panel ini hanya berfungsi untuk memantau sisa saldo agar operasional tidak terhenti.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xl shadow-slate-200/40">
                 <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-4">Last Synced</h4>
                 <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500">
                        {balanceData?.updated_at ? new Date(balanceData.updated_at).toLocaleString("id-ID") : "-"}
                    </p>
                    <span className="material-symbols-outlined text-slate-200">schedule</span>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegistrarBalance;
