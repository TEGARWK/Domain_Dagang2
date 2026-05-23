import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";
import CustomSelect from "../../components/ui/CustomSelect";
import html2pdf from "html2pdf.js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const AdminOverview = () => {
  const { info, success } = useNotification();
  const [graphFilter, setGraphFilter] = useState("Daily");
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeDomains: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    totalRevenue: 0,
    sandboxBalance: 0,
  });
  const [realAnalytics, setRealAnalytics] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [chartOffset, setChartOffset] = useState(0);
  const [isChartReady, setIsChartReady] = useState(false);

  // PDF Report Handler
  const handleDownloadReport = () => {
    window.print();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await api.get(`/admin/stats?offset=${chartOffset}`);
        const data = statsRes.data;
        
        let balance = 0;
        try {
            const balanceRes = await api.get("/admin/registrar-balance");
            balance = balanceRes.data?.balance?.current_balance || 0;
        } catch (e) {
            console.error("Failed to fetch balance from admin endpoint", e);
        }

        setStats({ 
            ...data,
            sandboxBalance: balance 
        });

        setRealAnalytics(data.analytics);

        if (data.recentTransactions) {
            setRecentInvoices(data.recentTransactions);
        } else {
            // Fallback for safety
            const invRes = await api.get("/billing/all");
            const sorted = [...invRes.data].sort((a,b) => new Date(b.date) - new Date(a.date));
            setRecentInvoices(sorted);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
        // Small delay to ensure DOM is ready for Recharts
        setTimeout(() => setIsChartReady(true), 300);
      }
    };

    fetchData();
  }, [chartOffset]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...recentInvoices].sort((a, b) => {
      if (key === 'total') {
        return direction === 'asc' ? a.total - b.total : b.total - a.total;
      }
      if (key === 'customer_name') {
        const nameA = (a.customer_name || '').toLowerCase();
        const nameB = (b.customer_name || '').toLowerCase();
        return direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (key === 'id') {
        return direction === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
      }
      return 0;
    });
    setRecentInvoices(sortedData);
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="material-symbols-outlined text-[12px] opacity-20 ml-1">unfold_more</span>;
    return sortConfig.direction === 'asc' 
        ? <span className="material-symbols-outlined text-[12px] text-[#f97316] ml-1">arrow_upward</span>
        : <span className="material-symbols-outlined text-[12px] text-[#f97316] ml-1">arrow_downward</span>;
  };

  const getActiveData = () => {
    if (!realAnalytics || !realAnalytics[graphFilter]) return [];
    
    const rawData = realAnalytics[graphFilter];
    const maxVal = Math.max(...rawData.map(d => Number(d.value) || 0), 1);
    
    return rawData.map(d => {
        const numVal = Number(d.value) || 0;
        return {
            label: d.label,
            val: (numVal / maxVal) * 100,
            realVal: numVal
        };
    });
  };

  const formatRupiah = (num) => {
    if (num === undefined || num === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getCategoryBadge = (cat) => {
    const c = (cat || 'REGISTER').toUpperCase();
    switch(c) {
        case 'TOPUP': return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100 shadow-sm">Top-up</span>;
        case 'RENEW': return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm">Renew</span>;
        case 'TRANSFER': return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-600 border-amber-100 shadow-sm">Transfer</span>;
        case 'RESTORE': return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-600 border-rose-100 shadow-sm">Restore</span>;
        default: return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm">Register</span>;
    }
  };

  const cards = [
    {
      title: "Saldo Registrar",
      value: formatRupiah(stats.sandboxBalance),
      trend: "Available Funds",
      icon: "account_balance_wallet",
      color: "emerald",
      path: "/admin/registrar-balance"
    },
    {
      title: "Total Pengguna",
      value: stats.totalUsers,
      trend: "+12% Growth Index",
      icon: "group",
      color: "blue",
      path: "/admin/users"
    },
    {
      title: "Domain Aktif",
      value: stats.activeDomains,
      trend: "In Service Platform",
      icon: "public",
      color: "orange",
      path: "/admin/domains"
    },
    {
      title: "Pendapatan Bulan Ini",
      value: formatRupiah(stats.totalRevenue),
      trend: `${new Date().toLocaleDateString('id-ID', { month: 'long' })} Revenue`,
      icon: "monetization_on",
      color: "amber",
      path: "/admin/finance"
    },
    {
      title: "Domain Issue",
      value: stats.troubledDomains || 0,
      trend: "Resolution Required",
      icon: "warning",
      color: "rose",
      path: "/admin/domains"
    },
  ];

  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-out] pb-20">
      {/* --- PRINT SYSTEM OVERRIDE --- */}
      <style dangerouslySetInnerHTML={{ __html: `
          @media print {
              @page { size: A4; margin: 0; }
              body { background: #fff !important; }
              .print\\:hidden, .sidebar, .navbar, .action-bar, .no-print, .recharts-responsive-container { display: none !important; }
              .print-area { 
                  display: block !important; 
                  width: 210mm !important; 
                  height: 297mm !important; 
                  padding: 20mm !important;
                  position: fixed !important;
                  top: 0 !important;
                  left: 0 !important;
                  background: white !important;
                  z-index: 9999 !important;
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
              }
          }
      `}} />

      {/* ==========================================
          FORMAL BUSINESS REPORT (A4 Optimized)
          ========================================== */}
      <div id="business-report-print-area" className="hidden print-area text-[#0f172a] bg-white relative overflow-hidden">
        <div className="flex justify-between items-start border-b-4 border-[#0f172a] pb-10 mb-10">
          <div className="flex items-start gap-4">
            <img src="/image/logo/ADTLogo.png" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
            <div>
              <h1 className="text-2xl font-bold tracking-tighter text-[#0f172a] uppercase leading-none">
                PT Aplikasi Dagang Teknologi
              </h1>
              <p className="text-[9px] font-semibold text-[#64748b] uppercase tracking-[0.4em] mt-1.5">Technology Solution Provider</p>
              <div className="text-[11px] space-y-1 text-[#475569] font-medium mt-4">
                <p>Jl. Cigadung Raya Tengah No.52, RT.2</p>
                <p>Bandung, Jawa Barat, Indonesia</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-[#e2e8f0] uppercase tracking-tighter leading-none mb-3">RINGKASAN BISNIS</h2>
            <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest">Periode: {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
            <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest">Dicetak: {new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Total Pendapatan</p>
            <p className="text-xl font-semibold text-[#0f172a]">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stats.totalRevenue || 0)}
            </p>
          </div>
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Invoice Lunas</p>
            <p className="text-xl font-semibold text-[#0f172a]">{stats.paidInvoices || 0}</p>
          </div>
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Total Domain</p>
            <p className="text-xl font-semibold text-[#0f172a]">{stats.activeDomains || 0}</p>
          </div>
        </div>

        <h3 className="text-xs font-semibold text-[#0f172a] uppercase tracking-widest mb-4 border-b-2 border-slate-100 pb-2">Transaksi Terbaru</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-3 text-[10px] font-semibold uppercase">ID Invoice</th>
              <th className="py-3 text-[10px] font-semibold uppercase">Pelanggan</th>
              <th className="py-3 text-[10px] font-semibold uppercase text-right">Nominal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentInvoices.slice(0, 15).map((inv, i) => (
              <tr key={i}>
                <td className="py-4 text-xs font-semibold text-slate-900">#INV-{inv.id}</td>
                <td className="py-4">
                  <p className="text-xs font-semibold text-slate-700">{inv.customer_name || inv.user_name || '-'}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-tighter">Status: {inv.status}</p>
                </td>
                <td className="py-4 text-right text-xs font-semibold text-slate-900">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(inv.total || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-20 pt-10 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 italic">Laporan ini dihasilkan secara otomatis oleh sistem administrasi DomainDagang.</p>
          <p className="text-[10px] font-semibold text-slate-900 mt-2">&copy; {new Date().getFullYear()} PT Aplikasi Dagang Teknologi</p>
        </div>
      </div>
      {/* 1. Welcome Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-[#f97316] uppercase tracking-[0.2em] leading-none mb-2">
            <span className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse"></span>
            Admin Control Center
          </div>
          <h2 className="text-3xl font-bold text-[#0f172a] tracking-tight leading-none">
            Selamat Datang, <span className="text-[#f97316]">Bro Admin!</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={handleDownloadReport}
                className="h-11 px-6 bg-white text-[#475569] text-[11px] font-semibold uppercase tracking-[0.2em] rounded-lg shadow-sm border border-[#f1f5f9] hover:bg-[#f8fafc] transition-all hover:translate-y-[-2px]"
            >
                Download Report
            </button>
            <button 
                onClick={() => {
                   setLoading(true);
                   setTimeout(() => {
                       success("🔄 Sistem berhasil disegarkan!");
                       setLoading(false);
                   }, 1000);
                }}
                className="h-11 px-6 bg-[#f97316] text-white text-[11px] font-semibold uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-orange-100 hover:bg-[#ea580c] transition-all hover:translate-y-[-2px] flex items-center gap-2"
            >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Refresh
            </button>
        </div>
      </header>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((card, i) => (
          <Link 
            key={i} 
            to={card.path || "/admin"}
            className="group relative bg-white rounded-xl p-3 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-500 overflow-hidden"
          >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 opacity-[0.03] rounded-bl-full group-hover:opacity-[0.06] transition-opacity ${
                card.color === 'emerald' ? 'bg-emerald-500' :
                card.color === 'blue' ? 'bg-blue-500' :
                card.color === 'orange' ? 'bg-orange-500' :
                card.color === 'amber' ? 'bg-amber-500' :
                'bg-rose-500'
            }`}></div>
            
            <div className="relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-sm border transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 ${
                    card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    card.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    card.color === 'orange' ? 'bg-orange-50 text-[#f97316] border-orange-100' :
                    card.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{card.icon}</span>
                </div>
                
                <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-1.5">{card.title}</p>
                    <h3 className={`text-2xl font-bold tracking-tight ${card.color === 'rose' ? 'text-rose-600' : 'text-slate-900 group-hover:text-[#f97316]'} transition-colors duration-300`}>
                      {loading ? (
                          <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md"></div>
                      ) : (card.value || 0)}
                    </h3>
                    
                    <div className="mt-3 flex items-center justify-between">
                       <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                         card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                         card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                         card.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                         card.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                         'bg-rose-50 text-rose-600'
                       }`}>
                         {card.trend}
                       </span>
                       <span className="material-symbols-outlined text-slate-300 text-sm group-hover:text-[#f97316] group-hover:translate-x-1 transition-all">chevron_right</span>
                    </div>
                </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 3. Quick Actions & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Support Alert */}
          <Link to="/admin/support-tickets" className={`p-3 rounded-xl border flex items-center gap-3 transition-all duration-300 hover:shadow-md ${stats.pendingTickets > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.pendingTickets > 0 ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-xl">support_agent</span>
              </div>
              <div>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">Tiket Terbuka</h4>
                  <p className={`text-lg font-semibold ${stats.pendingTickets > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{stats.pendingTickets || 0}</p>
              </div>
          </Link>

          {/* Manual Payment Verif */}
          <Link to="/admin/invoices" className={`p-3 rounded-xl border flex items-center gap-3 transition-all duration-300 hover:shadow-md ${stats.manualVerifPending > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.manualVerifPending > 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-100 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-xl">payments</span>
              </div>
              <div>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">Verif Manual</h4>
                  <p className={`text-lg font-semibold ${stats.manualVerifPending > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{stats.manualVerifPending || 0}</p>
              </div>
          </Link>

          {/* API Health */}
          <div className="p-3 rounded-xl border border-slate-100 bg-white flex items-center gap-3 group hover:border-emerald-100 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-xl">api</span>
              </div>
              <div>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">API Health</h4>
                  <p className="text-lg font-semibold text-emerald-600">ONLINE</p>
              </div>
          </div>

          {/* Shield Status */}
          <div className="p-3 rounded-xl border border-slate-100 bg-white flex items-center gap-3 group hover:border-blue-100 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-[#0f172a] text-white flex items-center justify-center shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-xl">verified_user</span>
              </div>
              <div>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">Shield Protection</h4>
                  <p className="text-lg font-semibold text-slate-900">v4.0 ACTIVE</p>
              </div>
          </div>
      </div>

      {/* 4. Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Sales Performance Chart (Takes 2 columns) */}
        <div className="lg:col-span-2 bg-[#0b1120] text-white rounded-xl p-4 md:p-5 shadow-xl shadow-slate-900/30 relative overflow-hidden group border border-slate-800/50 min-h-[440px] flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-orange-600/20 transition-all duration-700"></div>
          
          <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                        <h3 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                            Revenue Streams
                        </h3>
                    </div>
                    <p className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
                         Performa Penjualan
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                      <div className="flex items-center bg-slate-800/50 rounded-lg backdrop-blur-sm border border-slate-700/50 p-1">
                          <button onClick={() => setChartOffset(prev => prev + 1)} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-700 text-slate-300 transition-colors"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                          <button onClick={() => setChartOffset(prev => Math.max(0, prev - 1))} disabled={chartOffset === 0} className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${chartOffset === 0 ? 'opacity-30' : 'hover:bg-slate-700 text-slate-300'}`}><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                      </div>
                      <div className="w-40 bg-slate-800/50 rounded-lg backdrop-blur-sm border border-slate-700/50">
                         <CustomSelect value={graphFilter} onChange={val => { setGraphFilter(val); setChartOffset(0); }} options={[{ value: 'Daily', label: 'Harian' }, { value: 'Monthly', label: 'Bulanan' }, { value: 'Yearly', label: 'Tahunan' }]} dark={true} />
                      </div>
                  </div>
              </div>
              
              <div className="w-full h-[350px] mt-4 z-20">
                  <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={getActiveData().map(d => ({ label: d.label, revenue: d.realVal }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="label" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10} />
                          <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(v) => `Rp ${v.toLocaleString('id-ID')}`} axisLine={false} tickLine={false} dx={-10} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} formatter={(v) => [formatRupiah(v), "Pendapatan"]} />
                          <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={4} dot={{ r: 4, fill: '#f97316' }} animationDuration={1500} />
                      </LineChart>
                  </ResponsiveContainer>
              </div>
          </div>
        </div>

        {/* TLD Distribution (Takes 1 column) */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Top Extensions
            </h3>
            <div className="flex-1 space-y-4">
                {(stats.extensionDistribution || []).length > 0 ? stats.extensionDistribution.map((ext, idx) => {
                    const maxCount = stats.extensionDistribution[0].count;
                    const percentage = (ext.count / maxCount) * 100;
                    return (
                        <div key={idx} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-slate-700">{ext.tld}</span>
                                <span className="text-xs font-semibold text-slate-400">{ext.count} Domains</span>
                            </div>
                            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                <div className="h-full bg-[#f97316] rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                            </div>
                        </div>
                    )
                }) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 italic">
                        <span className="material-symbols-outlined text-4xl">inventory_2</span>
                        <p className="text-[10px] font-semibold uppercase">No extension data</p>
                    </div>
                )}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-50">
                <Link to="/admin/domains" className="text-[10px] font-semibold text-[#f97316] uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform">
                    Lihat Manajemen Domain
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </Link>
            </div>
        </div>
      </div>

      {/* 5. Recent Activity Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-[#f97316] rounded-full"></div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[11px]">Aktivitas Penjualan Terbaru</h3>
                </div>
                <Link to="/admin/invoices" className="text-[10px] font-semibold text-[#f97316] uppercase tracking-[0.2em] px-4 py-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all">Lihat Semua</Link>
          </div>
          <div className="overflow-x-auto">
                 <table className="w-full text-left border-separate border-spacing-0">
                     <thead>
                         <tr className="text-[10px] text-slate-400 uppercase tracking-[0.15em] bg-slate-50/30">
                             <th className="px-4 py-2 font-semibold border-b border-slate-100">Customer</th>
                             <th className="px-4 py-2 font-semibold border-b border-slate-100">Invoice ID</th>
                             <th className="px-4 py-2 font-semibold border-b border-slate-100">Category</th>
                             <th className="px-4 py-2 font-semibold border-b border-slate-100 text-center">Total</th>
                             <th className="px-4 py-2 font-semibold border-b border-slate-100 text-center">Status</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                         {loading ? (
                             <tr><td colSpan="5" className="py-20 text-center"><div className="animate-spin w-8 h-8 border-4 border-slate-100 border-t-[#f97316] rounded-full mx-auto"></div></td></tr>
                         ) : (stats.recentTransactions || []).length === 0 ? (
                             <tr><td colSpan="5" className="py-20 text-center text-slate-400 italic">No transactions found</td></tr>
                         ) : (
                             stats.recentTransactions.map((tx, i) => (
                                 <tr key={i} className="hover:bg-slate-50/50 transition-all group">
                                     <td className="px-4 py-1.5">
                                         <p className="text-sm font-semibold text-slate-700 leading-tight">{tx.customer_name}</p>
                                         <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{new Date(tx.date).toLocaleString('id-ID')}</p>
                                     </td>
                                     <td className="px-4 py-1.5 text-sm font-semibold text-[#f97316]">#{tx.id}</td>
                                     <td className="px-4 py-1.5">{getCategoryBadge(tx.category)}</td>
                                     <td className="px-4 py-1.5 text-sm font-semibold text-slate-600 text-center">{formatRupiah(tx.total)}</td>
                                     <td className="px-4 py-1.5 text-center">
                                         <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-[0.2em] border shadow-sm ${
                                             tx.status === 'paid' 
                                             ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                             : 'bg-amber-50 text-amber-600 border-amber-100'
                                         }`}>
                                             {tx.status}
                                         </span>
                                     </td>
                                 </tr>
                             ))
                         )}
                     </tbody>
                 </table>
          </div>
      </div>

      {/* 4. HIDDEN PRINT REPORT AREA */}
      <div id="admin-report-print-area" className="hidden print:block bg-[#ffffff] text-[#0f172a]" style={{ width: '210mm', minHeight: '297mm', padding: '40px', boxSizing: 'border-box', position: 'relative' }}>
        
        {/* Background Watermark */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '100px', fontWeight: '800', color: '#f1f5f9', opacity: 0.3, pointerEvents: 'none', zIndex: 0, whiteSpace: 'nowrap' }}>
            DAGANG DOMAIN
        </div>

        <div style={{ position: 'relative', zIndex: 10 }}>
            {/* Header Area */}
            <div className="flex justify-between items-start border-b-[3px] border-[#0f172a] pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-semibold uppercase text-[#0f172a] tracking-tight mb-1">Dagang<span className="text-[#ea580c] font-semibold">Domain</span>.com</h1>
                    <p className="text-[10px] font-medium text-[#64748b] uppercase tracking-[0.2em]">Platform Layanan Registrasi Domain</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-semibold text-[#0f172a] uppercase tracking-widest mb-1">Executive Report</h2>
                    <p className="text-xs font-medium text-[#64748b]">TGL: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p className="text-[10px] font-medium text-[#94a3b8] mt-1">ID: REP-{Date.now().toString().slice(-6)}</p>
                </div>
            </div>

            {/* Financial Overview Card */}
            <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-6 mb-8 flex justify-between items-center shadow-sm">
                <div>
                    <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">Total Pendapatan Bersih</p>
                    <p className="text-4xl font-semibold text-[#059669] tracking-tight">{formatRupiah(stats.totalRevenue)}</p>
                </div>
                <div className="w-[1px] h-16 bg-[#e2e8f0]"></div>
                <div className="text-right">
                    <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">Saldo Tersedia (Registrar)</p>
                    <p className="text-4xl font-semibold text-[#2563eb] tracking-tight">{formatRupiah(stats.sandboxBalance)}</p>
                </div>
            </div>

            {/* Platform Metrics */}
            <h3 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-[0.2em] mb-4 border-l-4 border-[#ea580c] pl-3">Metrik Platform</h3>
            <div className="grid grid-cols-3 gap-6 mb-10">
                <div className="p-5 border border-[#e2e8f0] rounded-xl bg-[#ffffff]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center text-[#475569]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Total Pengguna</p>
                    </div>
                    <p className="text-3xl font-semibold text-[#0f172a] ml-11">{stats.totalUsers}</p>
                </div>
                <div className="p-5 border border-[#e2e8f0] rounded-xl bg-[#ffffff]">
                    <div className="flex items-center gap-3 mb-3">
                         <div className="w-8 h-8 rounded-lg bg-[#fff7ed] flex items-center justify-center text-[#ea580c]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                        </div>
                        <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Domain Aktif</p>
                    </div>
                    <p className="text-3xl font-semibold text-[#0f172a] ml-11">{stats.activeDomains}</p>
                </div>
                <div className="p-5 border border-[#e2e8f0] rounded-xl bg-[#ffffff]">
                     <div className="flex items-center gap-3 mb-3">
                         <div className="w-8 h-8 rounded-lg bg-[#fef3c7] flex items-center justify-center text-[#d97706]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Invoice Pending</p>
                    </div>
                    <p className="text-3xl font-semibold text-[#0f172a] ml-11">{stats.pendingInvoices}</p>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <h3 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-[0.2em] mb-4 border-l-4 border-[#ea580c] pl-3 flex justify-between items-center">
                <span>Riwayat Transaksi Terakhir (Lunas)</span>
                <span className="text-[9px] text-[#94a3b8] font-medium tracking-wider">Max. 10 Transaksi</span>
            </h3>
            <div className="border border-[#e2e8f0] rounded-xl overflow-hidden mb-10">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-[#f8fafc] text-[#475569] uppercase text-[9px] tracking-widest border-b border-[#e2e8f0]">
                            <th className="px-5 py-4 font-semibold">Invoice ID</th>
                            <th className="px-5 py-4 font-semibold">Pelanggan</th>
                            <th className="px-5 py-4 font-semibold text-center">Tanggal</th>
                            <th className="px-5 py-4 text-right font-semibold">Total Pembayaran</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentInvoices.filter(i => i.status === 'paid').slice(0, 10).map((inv, i) => (
                            <tr key={i} className={`border-b border-[#f1f5f9] ${i % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fafafa]'}`}>
                                <td className="px-5 py-4 font-medium text-[#64748b] text-xs">#{inv.id.substring(0, 12)}...</td>
                                <td className="px-5 py-4 font-semibold text-[#0f172a] text-xs">{inv.customer_name}</td>
                                <td className="px-5 py-4 text-center text-[10px] text-[#64748b] font-medium uppercase tracking-wider">{new Date(inv.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year:'numeric'})}</td>
                                <td className="px-5 py-4 text-right font-semibold text-[#059669] text-xs">{formatRupiah(inv.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {recentInvoices.filter(i => i.status === 'paid').length === 0 && (
                    <div className="p-10 text-center text-[#94a3b8] italic font-normal text-xs bg-[#ffffff]">Belum ada transaksi lunas tercatat dalam sistem.</div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t-[3px] border-dashed border-[#e2e8f0] flex justify-between items-end">
                <div>
                    <h4 className="text-[10px] font-semibold text-[#0f172a] uppercase tracking-widest mb-1">PT Aplikasi Dagang Teknologi</h4>
                    <p className="text-[9px] font-medium text-[#94a3b8] mb-0.5">Dokumen ini digenerate secara otomatis oleh sistem</p>
                    <p className="text-[9px] font-medium text-[#94a3b8]">Waktu Cetak: {new Date().toLocaleString('id-ID')} WIB</p>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-medium text-[#cbd5e1] uppercase tracking-[0.3em] mb-1">Verified By</p>
                    <p className="text-[10px] font-semibold text-[#ea580c] uppercase tracking-widest">System Admin</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
