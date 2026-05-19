import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { formatRupiah, Breadcrumb } from "../../components/admin/finance/SharedComponents";
import DataSavingView from "../../components/admin/finance/DataSavingView";
import ProfitShareView from "../../components/admin/finance/ProfitShareView";
import MoneyView from "../../components/admin/finance/MoneyView";
import AllMutationsView from "../../components/admin/finance/AllMutationsView";
import ConfigView from "../../components/admin/finance/ConfigView";

const AdminRevenueDetail = () => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const [data, setData] = useState({
    period: { omset: 0, data_saving_total: 0, net_profit: 0 },
    configs: [],
    locations: [],
    holders: [],
    mutations: []
  });

  const now = new Date();
  const [filter, setFilter] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear()
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finance/period-data?month=${filter.month}&year=${filter.year}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      error("Gagal memuat data keuangan.");
    } finally {
      setLoading(false);
    }
  };

  const DashboardView = () => (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-6 uppercase tracking-widest font-bold">
        <span className="material-symbols-outlined text-sm">home</span>
        <span>Dashboard</span>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <span className="text-slate-600">Keuangan</span>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Detail Revenue</h2>
          <p className="text-slate-500 text-xs font-medium">Ringkasan cashflow revenue, Data Saving, Bagi Hasil, Uang Tersedia, dan konfigurasi bulanan.</p>
        </div>
      </div>

      {/* FILTER PERIODE */}
      <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-2xl mb-6 relative overflow-hidden">
         <div className="absolute top-6 right-6">
            <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span> {new Date(filter.year, filter.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
         </div>
         <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-orange-100">
               <span className="material-symbols-outlined text-xl">filter_alt</span>
            </div>
            <div>
               <p className="font-bold text-slate-800 text-sm">Filter Periode</p>
               <p className="text-[10px] text-slate-500 font-medium">Pilih rentang waktu untuk menampilkan data revenue</p>
            </div>
         </div>
         <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[150px]">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">calendar_view_day</span> Tipe Periode
               </label>
               <select className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-orange-500 transition-all">
                  <option>Bulanan</option>
               </select>
            </div>
            <div className="flex-1 min-w-[150px]">
               <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-1.5 block flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">event</span> Pilih Bulan
               </label>
               <input 
                 type="month" 
                 className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-orange-500 transition-all" 
                 defaultValue={`${filter.year}-${String(filter.month).padStart(2, '0')}`}
                 onChange={(e) => {
                    const [y, m] = e.target.value.split('-');
                    if (y && m) setFilter({ year: parseInt(y), month: parseInt(m) });
                 }}
               />
            </div>
            <button className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all group">
               <span className="material-symbols-outlined text-sm group-hover:translate-y-0.5 transition-transform">download</span> Download Excel
            </button>
         </div>
      </div>

      {/* MAIN CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Data Saving", val: data.period.data_saving_total, detail: `Sisa ${formatRupiah(data.period.data_saving_total)}`, color: "text-orange-600", icon: "savings", tab: "saving" },
          { label: "Bagi Hasil", val: data.period.net_profit, detail: `Hak periode ${formatRupiah(data.period.net_profit)}`, color: "text-yellow-600", icon: "diversity_3", tab: "profit_share" },
          { label: "Uang Tersedia", val: data.locations.reduce((acc, l) => acc + parseFloat(l.balance), 0), detail: `Utama: BCA PT ADT`, color: "text-blue-600", icon: "account_balance_wallet", tab: "money" },
          { label: "Mutasi All", val: data.mutations.reduce((acc, m) => acc + (m.type === 'IN' ? parseFloat(m.nominal) : 0), 0), detail: `Masuk ${formatRupiah(data.mutations.reduce((acc, m) => acc + (m.type === 'IN' ? parseFloat(m.nominal) : 0), 0))}`, color: "text-emerald-600", icon: "sync_alt", tab: "mutations" },
        ].map((c, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group cursor-pointer hover:border-orange-200 transition-all" onClick={() => setActiveTab(c.tab)}>
             <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-tight">{c.label}</p>
             <h3 className={`text-xl font-bold ${c.color} mb-1`}>{formatRupiah(c.val)}</h3>
             <p className="text-[9px] text-slate-400 font-semibold mb-3">{c.detail}</p>
             <button className={`text-[10px] font-bold ${c.color} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all`}>Lihat detail <span className="material-symbols-outlined text-xs">arrow_forward</span></button>
             <div className={`absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center ${c.color.replace('text', 'bg').replace('600', '50').replace('yellow', 'amber')} ${c.color}`}>
                <span className="material-symbols-outlined text-lg">{c.icon}</span>
             </div>
          </div>
        ))}
      </div>

      {/* SECONDARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Revenue Bulan Ini</p>
          <h3 className="text-xl font-bold text-slate-900">{formatRupiah(data.period.omset)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Laba Bersih</p>
          <h3 className="text-xl font-bold text-slate-900">{formatRupiah(data.period.net_profit)}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Konfigurasi Bulanan</p>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Mei 2026</h3>
            <button className="text-[10px] font-bold text-orange-600 flex items-center gap-1 mt-1" onClick={() => setActiveTab('config')}>Lihat detail <span className="material-symbols-outlined text-xs">arrow_forward</span></button>
          </div>
          <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-orange-50 rounded-full group-hover:scale-125 transition-transform duration-500 opacity-50"></div>
        </div>
      </div>

      {/* BOTTOM SECTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
         <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center px-2">
               <div>
                  <h4 className="font-bold text-slate-800 text-sm">Uang Tersedia</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Lokasi saldo dan bank utama revenue.</p>
               </div>
               <button className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:text-orange-600 transition-all" onClick={() => setActiveTab('money')}>Detail</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
               {data.locations.map(l => (
                 <div key={l.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <p className="text-[9px] font-bold text-slate-800 mb-3 flex items-center justify-between">
                       {l.name}
                       {l.is_main && <span className="bg-blue-50 text-blue-600 text-[7px] px-1.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-tighter">Utama</span>}
                    </p>
                    <h3 className="text-base font-bold text-slate-900">{formatRupiah(l.balance)}</h3>
                    <div className="absolute bottom-0 left-0 h-0.5 bg-slate-900 w-0 group-hover:w-full transition-all duration-500"></div>
                 </div>
               ))}
            </div>
         </div>

         <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center px-2">
               <div>
                  <h4 className="font-bold text-slate-800 text-sm">Arus Kas Terbaru</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Revenue sistem dan mutasi manual terbaru.</p>
               </div>
               <button className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:text-orange-600 transition-all" onClick={() => setActiveTab('mutations')}>Mutasi All</button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
               {data.mutations.length > 0 ? data.mutations.slice(0, 5).map(m => (
                 <div key={m.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-all">
                    <div className="flex gap-4 items-center">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                          <span className="material-symbols-outlined text-lg">{m.type === 'IN' ? 'trending_up' : 'trending_down'}</span>
                       </div>
                       <div>
                          <p className="font-bold text-slate-800 text-xs">{m.description || m.category}</p>
                          <p className="text-[9px] text-slate-400 font-medium">
                             {new Date(m.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})} • {new Date(m.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})} WIB
                          </p>
                       </div>
                    </div>
                    <p className={`font-black text-sm ${m.type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>
                       {m.type === 'IN' ? '' : '-'} {formatRupiah(m.nominal)}
                    </p>
                 </div>
               )) : (
                  <div className="p-20 text-center text-slate-400 italic text-xs">Belum ada mutasi tercatat.</div>
               )}
            </div>
         </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="p-4 md:p-8">
        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "saving" && <DataSavingView data={data} onBack={() => setActiveTab('dashboard')} setActiveTab={setActiveTab} refreshData={fetchData} />}
        {activeTab === "profit_share" && <ProfitShareView data={data} onBack={() => setActiveTab('dashboard')} setActiveTab={setActiveTab} refreshData={fetchData} />}
        {activeTab === "money" && <MoneyView data={data} onBack={() => setActiveTab('dashboard')} refreshData={fetchData} />}
        {activeTab === "mutations" && <AllMutationsView data={data} onBack={() => setActiveTab('dashboard')} refreshData={fetchData} />}
        {activeTab === "config" && <ConfigView data={data} onBack={() => setActiveTab('dashboard')} refreshData={fetchData} />}
      </div>
    </div>
  );
};

export default AdminRevenueDetail;
