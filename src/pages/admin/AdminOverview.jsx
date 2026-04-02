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
    totalRevenue: 0,
    sandboxBalance: 0,
  });
  const [realAnalytics, setRealAnalytics] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [chartOffset, setChartOffset] = useState(0);

  // PDF Report Handler
  const handleDownloadReport = () => {
    info("📊 Menyiapkan laporan PDF... Harap tunggu sebentar.");
    const element = document.getElementById('admin-report-print-area');
    
    element.classList.remove('hidden');
    element.classList.add('block');
    
    const opt = {
      margin:       0.5,
      filename:     `Laporan_DagangDomain_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        element.classList.remove('block');
        element.classList.add('hidden');
        success("Laporan PDF berhasil diunduh.");
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await api.get(`/admin/stats?offset=${chartOffset}`);
        const data = statsRes.data;
        
        let balance = 0;
        try {
            const balanceRes = await api.get("/daftarnama/balance");
            balance = balanceRes.data?.data?.balance || 0;
        } catch (e) {
            console.error("Failed to fetch balance", e);
        }

        setStats({ 
            totalUsers: data.totalUsers,
            activeDomains: data.activeDomains,
            pendingInvoices: data.pendingInvoices,
            totalRevenue: data.totalRevenue,
            troubledDomains: data.troubledDomains,
            sandboxBalance: balance 
        });

        setRealAnalytics(data.analytics);

        const invRes = await api.get("/billing/all");
        const sorted = [...invRes.data].sort((a,b) => new Date(b.date) - new Date(a.date));
        setRecentInvoices(sorted);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
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
      title: "Total Pendapatan",
      value: formatRupiah(stats.totalRevenue),
      trend: "Net Platform Earnings",
      icon: "monetization_on",
      color: "amber",
      path: "/admin/invoices"
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
    <div className="space-y-10 animate-[fadeIn_0.5s_ease-out] pb-20">
      {/* 1. Welcome Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#f97316] uppercase tracking-[0.2em] leading-none mb-3">
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
                className="h-11 px-6 bg-white text-[#475569] text-[11px] font-bold uppercase tracking-[0.2em] rounded-lg shadow-sm border border-[#f1f5f9] hover:bg-[#f8fafc] transition-all hover:translate-y-[-2px]"
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
                className="h-11 px-6 bg-[#f97316] text-white text-[11px] font-bold uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-orange-100 hover:bg-[#ea580c] transition-all hover:translate-y-[-2px] flex items-center gap-2"
            >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Refresh
            </button>
        </div>
      </header>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {cards.map((card, i) => (
          <Link 
            key={i} 
            to={card.path || "/admin"}
            className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1.5 transition-all duration-500 overflow-hidden"
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
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm border transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 ${
                    card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    card.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    card.color === 'orange' ? 'bg-orange-50 text-[#f97316] border-orange-100' :
                    card.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{card.icon}</span>
                </div>
                
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1.5">{card.title}</p>
                    <h3 className={`text-2xl font-black tracking-tight ${card.color === 'rose' ? 'text-rose-600' : 'text-slate-900 group-hover:text-[#f97316]'} transition-colors duration-300`}>
                      {loading ? (
                          <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md"></div>
                      ) : card.value}
                    </h3>
                    
                    <div className="mt-4 flex items-center justify-between">
                       <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
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

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* TOP SECTION: Quick Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-orange-100 transition-all duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm">
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>verified_user</span>
            </div>
            <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.15em]">Admin Control Protected</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">Shield Version 4.0 ACTIVE</p>
            </div>
        </div>

        {/* MIDDLE SECTION: Large Line Chart */}
        <div className="bg-[#0b1120] text-white rounded-2xl p-8 shadow-2xl shadow-slate-900/40 relative overflow-hidden group border border-slate-800/50 min-h-[500px] flex flex-col">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-orange-600/20 transition-all duration-700"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/5 rounded-full blur-[60px] -ml-16 -mb-16"></div>
          
          <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                            Revenue Streams
                        </h3>
                    </div>
                    <p className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                         Performa Penjualan
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">
                             {chartOffset === 0 
                                ? (graphFilter === 'Daily' ? '7 Hari Terakhir' : graphFilter === 'Monthly' ? '12 Bulan Terakhir' : '5 Tahun Terakhir')
                                : (graphFilter === 'Daily' ? `Minggu Ke-${chartOffset + 1} Sebelumnya` : graphFilter === 'Monthly' ? `Tahun Ke-${chartOffset + 1} Sebelumnya` : `Periode ${chartOffset * 5} Tahun Lalu`)
                             }
                         </span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                      {/* Navigation Buttons */}
                      <div className="flex items-center bg-slate-800/50 rounded-lg backdrop-blur-sm border border-slate-700/50 p-1">
                          <button 
                             onClick={() => setChartOffset(prev => prev + 1)}
                             className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                             title="Periode Sebelumnya"
                          >
                             <span className="material-symbols-outlined text-sm">chevron_left</span>
                          </button>
                          
                          <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>
                          
                          <button 
                             onClick={() => setChartOffset(prev => Math.max(0, prev - 1))}
                             disabled={chartOffset === 0}
                             className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${chartOffset === 0 ? 'opacity-30 cursor-not-allowed text-slate-500' : 'hover:bg-slate-700 text-slate-300 hover:text-white'}`}
                             title="Periode Selanjutnya"
                          >
                             <span className="material-symbols-outlined text-sm">chevron_right</span>
                          </button>
                      </div>

                      {/* Filter Dropdown */}
                      <div className="w-40 bg-slate-800/50 rounded-lg backdrop-blur-sm border border-slate-700/50">
                         <CustomSelect 
                            value={graphFilter}
                            onChange={val => {
                                setGraphFilter(val);
                                setChartOffset(0); // Reset offset when changing filter
                            }}
                            options={[
                                { value: 'Daily', label: 'Harian' },
                                { value: 'Monthly', label: 'Bulanan' },
                                { value: 'Yearly', label: 'Tahunan' }
                            ]}
                            dark={true}
                         />
                      </div>
                  </div>
              </div>
              
              <div className="w-full h-[350px] mt-4 z-20">
                  {getActiveData().length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-5 opacity-40">
                          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                               <span className="material-symbols-outlined text-slate-500 text-3xl">analytics</span>
                          </div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Data Analytics Empty</p>
                      </div>
                  ) : (
                      <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={300}>
                          <LineChart 
                              data={getActiveData().map(d => ({ label: d.label, revenue: d.realVal }))}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis 
                                  dataKey="label" 
                                  stroke="#64748b" 
                                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                                  axisLine={false}
                                  tickLine={false}
                                  dy={10}
                              />
                              <YAxis 
                                  stroke="#64748b" 
                                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                                  tickFormatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
                                  axisLine={false}
                                  tickLine={false}
                                  dx={-10}
                              />
                              <RechartsTooltip 
                                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                                  itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                                  formatter={(value) => [formatRupiah(value), "Pendapatan"]}
                                  labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
                              />
                              <Line 
                                  type="monotone" 
                                  dataKey="revenue" 
                                  stroke="#f97316" 
                                  strokeWidth={4}
                                  dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#1e293b' }}
                                  activeDot={{ r: 8, fill: '#fb923c', stroke: '#fff', strokeWidth: 2 }}
                                  animationDuration={1500}
                              />
                          </LineChart>
                      </ResponsiveContainer>
                  )}
              </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Recent Invoices */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-8 py-6 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-[#f97316] rounded-full"></div>
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Invoice Terbaru</h3>
                  </div>
                  <Link to="/admin/invoices" className="text-[10px] font-black text-[#f97316] uppercase tracking-[0.2em] px-4 py-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition-all">Lihat Semua</Link>
              </div>
              <div className="overflow-x-auto flex-1">
                   <table className="w-full text-left border-separate border-spacing-0">
                       <thead>
                           <tr className="text-[10px] text-slate-400 uppercase tracking-[0.15em] bg-slate-50/30">
                               <th 
                                   className="px-8 py-5 font-black border-b border-slate-100 cursor-pointer hover:text-slate-600 transition-colors"
                                   onClick={() => handleSort('id')}
                               >
                                   <div className="flex items-center gap-1">
                                       Invoice ID
                                       <SortIcon column="id" />
                                   </div>
                               </th>
                               <th 
                                   className="px-8 py-5 font-black border-b border-slate-100 cursor-pointer hover:text-slate-600 transition-colors"
                                   onClick={() => handleSort('customer_name')}
                               >
                                   <div className="flex items-center gap-1">
                                       Customer
                                       <SortIcon column="customer_name" />
                                   </div>
                               </th>
                               <th 
                                   className="px-8 py-5 font-black border-b border-slate-100 text-center cursor-pointer hover:text-slate-600 transition-colors"
                                   onClick={() => handleSort('total')}
                               >
                                   <div className="flex items-center justify-center gap-1">
                                       Total
                                       <SortIcon column="total" />
                                   </div>
                               </th>
                               <th className="px-8 py-5 font-black border-b border-slate-100 text-center">Status</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                           {loading ? (
                               <tr><td colSpan="4" className="py-24 text-center"><div className="animate-spin w-8 h-8 border-4 border-slate-100 border-t-[#f97316] rounded-full mx-auto"></div></td></tr>
                           ) : recentInvoices.length === 0 ? (
                               <tr><td colSpan="4" className="py-24 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">Belum ada data invoice tercatat</td></tr>
                           ) : (
                               recentInvoices.slice(0, 6).map((inv, i) => (
                                   <tr key={i} className="hover:bg-slate-50/50 transition-all group">
                                       <td className="px-8 py-5">
                                           <Link to={`/admin/invoices`} className="block">
                                              <p className="text-sm font-black text-[#f97316] group-hover:underline">#{inv.id}</p>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Digital Billing</p>
                                           </Link>
                                       </td>
                                       <td className="px-8 py-5">
                                           <p className="text-sm font-black text-slate-700 leading-tight">{inv.customer_name || "Guest Customer"}</p>
                                           <p className="text-[10px] text-slate-400 font-bold mt-0.5">{inv.customer_email || "no-email@dagang.com"}</p>
                                       </td>
                                       <td className="px-8 py-5 text-sm font-black text-slate-600 text-center">{formatRupiah(inv.total)}</td>
                                       <td className="px-8 py-5 text-center">
                                           <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                                               inv.status === 'paid' 
                                               ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                               : inv.status === 'cancelled'
                                               ? 'bg-rose-50 text-rose-500 border-rose-100'
                                               : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                                           }`}>
                                               {inv.status}
                                           </span>
                                       </td>
                                   </tr>
                               ))
                           )}
                       </tbody>
                   </table>
                 </div>
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
                    <h1 className="text-3xl font-bold uppercase text-[#0f172a] tracking-tight mb-1">Dagang<span className="text-[#ea580c] font-semibold">Domain</span>.com</h1>
                    <p className="text-[10px] font-medium text-[#64748b] uppercase tracking-[0.2em]">Platform Layanan Registrasi Domain</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-[#0f172a] uppercase tracking-widest mb-1">Executive Report</h2>
                    <p className="text-xs font-medium text-[#64748b]">TGL: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p className="text-[10px] font-medium text-[#94a3b8] mt-1">ID: REP-{Date.now().toString().slice(-6)}</p>
                </div>
            </div>

            {/* Financial Overview Card */}
            <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-6 mb-8 flex justify-between items-center shadow-sm">
                <div>
                    <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">Total Pendapatan Bersih</p>
                    <p className="text-4xl font-bold text-[#059669] tracking-tight">{formatRupiah(stats.totalRevenue)}</p>
                </div>
                <div className="w-[1px] h-16 bg-[#e2e8f0]"></div>
                <div className="text-right">
                    <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-1">Saldo Tersedia (Registrar)</p>
                    <p className="text-4xl font-bold text-[#2563eb] tracking-tight">{formatRupiah(stats.sandboxBalance)}</p>
                </div>
            </div>

            {/* Platform Metrics */}
            <h3 className="text-[11px] font-bold text-[#0f172a] uppercase tracking-[0.2em] mb-4 border-l-4 border-[#ea580c] pl-3">Metrik Platform</h3>
            <div className="grid grid-cols-3 gap-6 mb-10">
                <div className="p-5 border border-[#e2e8f0] rounded-xl bg-[#ffffff]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center text-[#475569]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Total Pengguna</p>
                    </div>
                    <p className="text-3xl font-bold text-[#0f172a] ml-11">{stats.totalUsers}</p>
                </div>
                <div className="p-5 border border-[#e2e8f0] rounded-xl bg-[#ffffff]">
                    <div className="flex items-center gap-3 mb-3">
                         <div className="w-8 h-8 rounded-lg bg-[#fff7ed] flex items-center justify-center text-[#ea580c]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                        </div>
                        <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Domain Aktif</p>
                    </div>
                    <p className="text-3xl font-bold text-[#0f172a] ml-11">{stats.activeDomains}</p>
                </div>
                <div className="p-5 border border-[#e2e8f0] rounded-xl bg-[#ffffff]">
                     <div className="flex items-center gap-3 mb-3">
                         <div className="w-8 h-8 rounded-lg bg-[#fef3c7] flex items-center justify-center text-[#d97706]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Invoice Pending</p>
                    </div>
                    <p className="text-3xl font-bold text-[#0f172a] ml-11">{stats.pendingInvoices}</p>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <h3 className="text-[11px] font-bold text-[#0f172a] uppercase tracking-[0.2em] mb-4 border-l-4 border-[#ea580c] pl-3 flex justify-between items-center">
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
