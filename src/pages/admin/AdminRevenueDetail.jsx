import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import StatsCard from "../../components/ui/StatsCard";
import DataSavingView from "../../components/admin/finance/DataSavingView";
import ProfitShareView from "../../components/admin/finance/ProfitShareView";
import MoneyView from "../../components/admin/finance/MoneyView";
import AllMutationsView from "../../components/admin/finance/AllMutationsView";
import ConfigView from "../../components/admin/finance/ConfigView";

const formatRupiah = (num) => {
  if (num === undefined || num === null) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(num);
};

const AdminRevenueDetail = () => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [data, setData] = useState({
    period: { omset: 0, data_saving_total: 0, net_profit: 0 },
    configs: [], locations: [], holders: [], mutations: [],
  });
  const now = new Date();
  const [filter, setFilter] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });

  useEffect(() => { fetchData(); }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/finance/period-data?month=${filter.month}&year=${filter.year}`);
      if (res.data.success) setData(res.data.data);
    } catch {
      error("Gagal memuat data keuangan.");
    } finally {
      setLoading(false);
    }
  };

  const DashboardView = () => (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            Dashboard Keuangan
          </p>
          <h2 className="text-base font-bold text-neutral-800 tracking-tight">Detail Revenue</h2>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-1 h-5 rounded-full bg-primary-500" />
            <div>
              <p className="text-xs font-bold text-neutral-700">Filter Periode</p>
              <p className="text-[11px] text-neutral-400">Pilih rentang waktu untuk menampilkan data revenue</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="badge badge-info flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              {new Date(filter.year, filter.month - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </span>
            <div className="flex gap-2">
              <input type="month" className="form-input" style={{ width: 170 }}
                defaultValue={`${filter.year}-${String(filter.month).padStart(2, "0")}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-");
                  if (y && m) setFilter({ year: parseInt(y), month: parseInt(m) });
                }}
              />
              <button className="btn btn-primary">
                <span className="material-symbols-outlined text-sm">download</span>
                Download Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard title="Data Saving" value={formatRupiah(data.period.data_saving_total)} icon="savings" color="orange" trend="Sisa" to="" />
        <StatsCard title="Bagi Hasil" value={formatRupiah(data.period.net_profit)} icon="diversity_3" color="amber" trend={"Hak periode " + formatRupiah(data.period.net_profit)} to="" />
        <StatsCard title="Uang Tersedia" value={formatRupiah(data.locations.reduce((acc, l) => acc + parseFloat(l.balance), 0))} icon="account_balance_wallet" color="blue" trend="BCA PT ADT" to="" />
        <StatsCard title="Mutasi All" value={formatRupiah(data.mutations.reduce((acc, m) => acc + (m.type === "IN" ? parseFloat(m.nominal) : 0), 0))} icon="sync_alt" color="green" trend={"Masuk " + formatRupiah(data.mutations.reduce((acc, m) => acc + (m.type === "IN" ? parseFloat(m.nominal) : 0), 0))} to="" />
      </div>

      {/* Secondary row */}
      <div className="stats-grid">
        <div className="card">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Revenue Bulan Ini</p>
          <p className="text-lg font-bold text-neutral-800">{formatRupiah(data.period.omset)}</p>
        </div>
        <div className="card">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Laba Bersih</p>
          <p className="text-lg font-bold text-neutral-800">{formatRupiah(data.period.net_profit)}</p>
        </div>
        <div className="card cursor-pointer hover:border-primary-200 transition-all" onClick={() => setActiveTab("config")}>
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Konfigurasi Bulanan</p>
          <p className="text-lg font-bold text-neutral-800 mb-1">
            {new Date(filter.year, filter.month - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </p>
          <span className="text-[11px] font-bold text-primary-500 flex items-center gap-1">
            Lihat detail <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </span>
        </div>
        <div className="card cursor-pointer hover:border-primary-200 transition-all" onClick={() => setActiveTab("money")}>
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Uang Tersedia</p>
          <p className="text-lg font-bold text-neutral-800 mb-1">{formatRupiah(data.locations.reduce((acc, l) => acc + parseFloat(l.balance), 0))}</p>
          <span className="text-[11px] font-bold text-primary-500 flex items-center gap-1">
            Detail <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </span>
        </div>
      </div>

      {/* Bottom section: locations + recent mutations */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Uang Tersedia</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("money")}>Detail</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {data.locations.map((l) => (
              <div key={l.id} className="card relative overflow-hidden">
                <p className="text-[11px] font-bold text-neutral-700 mb-2 flex items-center justify-between">
                  {l.name}
                  {l.is_main && <span className="badge badge-info text-[9px]">Utama</span>}
                </p>
                <p className="text-base font-bold text-neutral-800">{formatRupiah(l.balance)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Arus Kas Terbaru</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("mutations")}>Mutasi All</button>
          </div>
          <div className="table-wrap">
            {data.mutations.length > 0 ? data.mutations.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.type === "IN" ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-500"}`}>
                    <span className="material-symbols-outlined text-sm">{m.type === "IN" ? "trending_up" : "trending_down"}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-700">{m.description || m.category}</p>
                    <p className="text-[10px] text-neutral-400">
                      {new Date(m.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${m.type === "IN" ? "text-green-600" : "text-rose-500"}`}>
                  {m.type === "IN" ? "" : "-"}{formatRupiah(m.nominal)}
                </p>
              </div>
            )) : (
              <div className="empty-state">
                <div className="empty-state-icon"><span className="material-symbols-outlined">receipt_long</span></div>
                <p>Belum ada mutasi tercatat</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && activeTab === "dashboard") return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-8 h-8 border-2 border-neutral-100 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Memuat data keuangan...</p>
    </div>
  );

  return (
    <div className="space-y-0 animate-fade-in">
      {activeTab === "dashboard" && <DashboardView />}
      {activeTab === "saving" && <DataSavingView data={data} onBack={() => setActiveTab("dashboard")} setActiveTab={setActiveTab} refreshData={fetchData} />}
      {activeTab === "profit_share" && <ProfitShareView data={data} onBack={() => setActiveTab("dashboard")} setActiveTab={setActiveTab} refreshData={fetchData} />}
      {activeTab === "money" && <MoneyView data={data} onBack={() => setActiveTab("dashboard")} refreshData={fetchData} />}
      {activeTab === "mutations" && <AllMutationsView data={data} onBack={() => setActiveTab("dashboard")} refreshData={fetchData} />}
      {activeTab === "config" && <ConfigView data={data} onBack={() => setActiveTab("dashboard")} refreshData={fetchData} />}
    </div>
  );
};

export default AdminRevenueDetail;
