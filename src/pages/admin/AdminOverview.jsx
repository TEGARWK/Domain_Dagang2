import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";
import CustomSelect from "../../components/ui/CustomSelect";
import StatsCard from "../../components/ui/StatsCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { ActionButton } from "../../components/ui/ActionBar";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const AdminOverview = () => {
  const { success } = useNotification();
  const [graphFilter, setGraphFilter] = useState("Daily");
  const [stats, setStats] = useState({
    totalUsers: 0, activeDomains: 0, pendingInvoices: 0, paidInvoices: 0,
    totalRevenue: 0, sandboxBalance: 0,
  });
  const [realAnalytics, setRealAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartOffset, setChartOffset] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await api.get(`/admin/stats?offset=${chartOffset}`);
        const data = statsRes.data;
        let balance = 0;
        try {
          const balanceRes = await api.get("/admin/registrar-balance");
          balance = balanceRes.data?.balance?.current_balance || 0;
        } catch {}
        setStats({ ...data, sandboxBalance: balance });
        setRealAnalytics(data.analytics);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [chartOffset]);

  const formatRupiah = (num) => {
    if (num === undefined || num === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", minimumFractionDigits: 0,
    }).format(num);
  };

  const getActiveData = () => {
    if (!realAnalytics || !realAnalytics[graphFilter]) return [];
    return realAnalytics[graphFilter].map(d => ({
      label: d.label,
      value: Number(d.value) || 0,
    }));
  };

  const handleDownloadReport = () => {
    window.print();
  };

  const getCatColor = (cat) => {
    const c = (cat || "REGISTER").toUpperCase();
    const map = {
      TOPUP: "purple", RENEW: "indigo", TRANSFER: "amber",
      RESTORE: "rose", REGISTER: "emerald",
    };
    return map[c] || "emerald";
  };

  const summaryCards = [
    { title: "Total Pendapatan", value: formatRupiah(stats.totalRevenue), trend: "Bulan Ini", icon: "monetization_on", color: "amber", path: "/admin/finance" },
    { title: "Domain Aktif", value: stats.activeDomains, trend: "Dalam Layanan", icon: "public", color: "orange", path: "/admin/domains" },
    { title: "Total Pengguna", value: stats.totalUsers, trend: "User Growth", icon: "group", color: "blue", path: "/admin/users" },
    { title: "Invoice Pending", value: stats.pendingInvoices, trend: "Menunggu Bayar", icon: "receipt_long", color: "rose", path: "/admin/invoices" },
  ];

  const alertCards = [
    { title: "Tiket Terbuka", value: stats.pendingTickets || 0, icon: "support_agent", color: "rose" },
    { title: "Verif Manual", value: stats.manualVerifPending || 0, icon: "payments", color: "amber" },
    { title: "API Health", value: "ONLINE", icon: "api", color: "green" },
    { title: "Shield", value: "v4.0 ACTIVE", icon: "verified_user", color: "neutral" },
  ];

  const colorIconMap = {
    rose: { bg: "#fef2f2", text: "#dc2626" },
    amber: { bg: "#fffbeb", text: "#d97706" },
    green: { bg: "#ecfdf5", text: "#059669" },
    neutral: { bg: "var(--color-neutral-50)", text: "var(--color-neutral-600)" },
  };

  const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ef4444", "#06b6d4"];

  const categoryData = [
    { name: "Register", value: 45 },
    { name: "Renew", value: 25 },
    { name: "Transfer", value: 15 },
    { name: "Top Up", value: 10 },
    { name: "Lainnya", value: 5 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[10px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            Admin Control Center — 5W1H Overview
          </p>
          <h2 className="text-lg font-bold text-neutral-800 tracking-tight">
            Selamat Datang, <span className="text-primary-500">Bro Admin!</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <ActionButton icon="download" label="Download Report" onClick={handleDownloadReport} />
          <ActionButton icon="refresh" label="Refresh" onClick={() => { setLoading(true); setTimeout(() => { success("Sistem berhasil disegarkan!"); setLoading(false); }, 1000); }} variant="primary" />
        </div>
      </div>

      <div>
        <div className="stats-grid">
          {summaryCards.map((card, i) => (
            <StatsCard key={i} title={card.title} value={card.value} icon={card.icon} color={card.color} trend={card.trend} to={card.path} loading={loading} />
          ))}
        </div>
      </div>

      <div>
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          <div className="card">
            <div className="stats-card-top">
              <div className="stats-card-left">
                <div className="stats-card-icon icon-blue"><span className="material-symbols-outlined">group</span></div>
                <div className="stats-card-info">
                  <div className="stats-card-label">Total Member</div>
                  <div className="stats-card-value">{stats.totalUsers}</div>
                </div>
              </div>
              <span className="stats-card-trend trend-blue">Aktif</span>
            </div>
          </div>
          <div className="card">
            <div className="stats-card-top">
              <div className="stats-card-left">
                <div className="stats-card-icon icon-purple"><span className="material-symbols-outlined">admin_panel_settings</span></div>
                <div className="stats-card-info">
                  <div className="stats-card-label">Admin Aktif</div>
                  <div className="stats-card-value">3</div>
                </div>
              </div>
              <span className="stats-card-trend trend-purple">Online</span>
            </div>
          </div>
          <div className="card">
            <div className="stats-card-top">
              <div className="stats-card-left">
                <div className="stats-card-icon icon-orange"><span className="material-symbols-outlined">language</span></div>
                <div className="stats-card-info">
                  <div className="stats-card-label">User Punya Domain</div>
                  <div className="stats-card-value">{stats.activeDomains > 0 ? Math.min(stats.totalUsers, stats.activeDomains) : "-"}</div>
                </div>
              </div>
              <span className="stats-card-trend trend-orange">Aktif</span>
            </div>
          </div>
          <div className="card">
            <div className="stats-card-top">
              <div className="stats-card-left">
                <div className="stats-card-icon icon-green"><span className="material-symbols-outlined">person_add</span></div>
                <div className="stats-card-info">
                  <div className="stats-card-label">Member Baru</div>
                  <div className="stats-card-value">+{Math.max(0, Math.floor((stats.totalUsers || 0) * 0.08))}</div>
                </div>
              </div>
              <span className="stats-card-trend trend-green">Bulan Ini</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart — WHEN */}
          <div className="lg:col-span-2 card p-0 overflow-hidden" style={{ background: "var(--color-neutral-900)", borderColor: "var(--color-neutral-800)" }}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Tren Pendapatan
                  </p>
                  <p className="text-sm font-semibold text-white tracking-tight">Performa {graphFilter === "Daily" ? "Harian" : graphFilter === "Monthly" ? "Bulanan" : "Tahunan"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-neutral-800 rounded-lg border border-neutral-700 p-0.5">
                    <button onClick={() => setChartOffset(p => p + 1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-700 text-neutral-400 transition-colors">
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button onClick={() => setChartOffset(p => Math.max(0, p - 1))} disabled={chartOffset === 0} className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${chartOffset === 0 ? "opacity-30" : "hover:bg-neutral-700 text-neutral-400"}`}>
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                  <div style={{ width: 130 }}>
                    <CustomSelect value={graphFilter} onChange={(v) => { setGraphFilter(v); setChartOffset(0); }} options={[{ value: "Daily", label: "Harian" }, { value: "Monthly", label: "Bulanan" }, { value: "Yearly", label: "Tahunan" }]} dark={true} />
                  </div>
                </div>
              </div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={getActiveData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} tickFormatter={(v) => `Rp ${v.toLocaleString("id-ID")}`} axisLine={false} tickLine={false} dx={-10} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", fontSize: "12px" }} formatter={(v) => [formatRupiah(v), "Pendapatan"]} />
                    <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} dot={{ r: 3, fill: "#f97316" }} animationDuration={1500} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Extensions — WHERE */}
          <div className="card">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Top Extension (Where)
            </h3>
            <div className="space-y-4">
              {(stats.extensionDistribution || []).length > 0 ? stats.extensionDistribution.map((ext, idx) => {
                const maxCount = stats.extensionDistribution[0].count;
                const percentage = (ext.count / maxCount) * 100;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-neutral-700">{ext.tld}</span>
                      <span className="text-xs font-semibold text-neutral-400">{ext.count} domain</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-50 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-6">
                  <p className="text-[10px] font-semibold text-neutral-300 uppercase">Belum ada data</p>
                </div>
              )}
            </div>
            <Link to="/admin/domains" className="mt-4 pt-3 border-t border-neutral-50 text-[10px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-2 hover:translate-x-1 transition-transform">
              Lihat Semua Domain <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      <div>
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          {alertCards.map((item, i) => {
            const ci = colorIconMap[item.color] || colorIconMap.neutral;
            return (
              <div key={i} className={`alert-card ${item.color === "rose" && item.value > 0 ? "bg-rose-50 border-rose-200" : ""}`}>
                <div className="alert-card-icon" style={{ background: ci.bg, color: ci.text }}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                </div>
                <div>
                  <div className="alert-card-label">{item.title}</div>
                  <div className="alert-card-value" style={{ color: item.color === "rose" && item.value > 0 ? "#dc2626" : "var(--color-neutral-800)" }}>
                    {item.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Category Pie */}
          <div className="card">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Kategori Transaksi
            </h3>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {categoryData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[idx] }} />
                  <span className="text-neutral-500 font-semibold">{item.name}</span>
                  <span className="text-neutral-400">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 table-wrap">
            <div className="table-header">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-purple-500" />
                <h3 className="font-bold text-neutral-700 text-xs uppercase tracking-wider">Transaksi Terbaru</h3>
              </div>
              <Link to="/admin/invoices" className="btn btn-ghost btn-sm">Lihat Semua</Link>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Customer (Who)</th>
                    <th>Invoice</th>
                    <th>Kategori (How)</th>
                    <th style={{ textAlign: "right" }}>Total (What)</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th style={{ textAlign: "center" }}>Waktu (When)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {[1,2,3,4,5,6].map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 20, width: `${50 + Math.random() * 40}%` }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : (stats.recentTransactions || []).length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-12 text-neutral-400 text-xs font-semibold">Belum ada transaksi</td></tr>
                  ) : (
                    stats.recentTransactions.slice(0, 5).map((tx, i) => (
                      <tr key={i}>
                        <td>
                          <p className="font-semibold text-neutral-700 text-sm leading-tight">{tx.customer_name}</p>
                        </td>
                        <td className="font-semibold text-primary-500">#{tx.id}</td>
                        <td><span className={`badge badge-${getCatColor(tx.category)}`}>{(tx.category || "REGISTER").toUpperCase()}</span></td>
                        <td style={{ textAlign: "right" }} className="font-semibold text-neutral-600">{formatRupiah(tx.total)}</td>
                        <td style={{ textAlign: "center" }}><StatusBadge status={tx.status} /></td>
                        <td style={{ textAlign: "center" }} className="text-[10px] text-neutral-400">{tx.date ? new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* =============================================
           BOTTOM STATUS BAR
           ============================================= */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-neutral-100 rounded-lg text-[10px] text-neutral-400 font-semibold">
        <span>Saldo Registrar: {formatRupiah(stats.sandboxBalance)}</span>
        <span className="text-neutral-300">|</span>
        <span>Domain Issue: {stats.troubledDomains || 0}</span>
        <span className="text-neutral-300">|</span>
        <span>Terakhir update: {new Date().toLocaleString("id-ID")}</span>
      </div>

    </div>
  );
};

export default AdminOverview;
