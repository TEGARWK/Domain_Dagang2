import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";
import CustomSelect from "../../components/ui/CustomSelect";

const MyDomains = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "desc" });

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userId = user?.id;

  const fetchDomains = async () => {
    if (!userId) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/domains/user/${userId}`);
      setDomains(res.data);
    } catch (err) {
      console.error("Gagal mengambil domain:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [userId]);

  const handleResync = async () => {
    setResyncing(true);
    try {
      await api.post(`/domains/resync`, {});
      fetchDomains();
    } catch (err) {
      console.error("Resync error:", err);
    } finally {
      setResyncing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const exportData = formatDataForExport(processedDomains, {
        name: 'Domain',
        expiration_date: 'Tanggal Expire',
        status: 'Status',
        is_transfer: 'Tipe'
    });
    exportToExcel(exportData, 'My_Domains', 'Domains');
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "active":
        return { label: "Aktif", className: "bg-emerald-50 text-emerald-600 border-emerald-100" };
      case "unpaid":
        return { label: "Unpaid", className: "bg-amber-50 text-amber-600 border-amber-100" };
      case "expired":
        return { label: "Expired", className: "bg-rose-50 text-rose-600 border-rose-100" };
      case "pending_transfer":
        return { label: "Pending Transfer", className: "bg-blue-50 text-blue-600 border-blue-100 animate-pulse" };
      case "failed":
        return { label: "Gagal", className: "bg-amber-50 text-amber-600 border-amber-200 animate-pulse" };
      default:
        return { label: status.replace('_', ' '), className: "bg-orange-50 text-orange-600 border-orange-100" };
    }
  };

  const getDaysLeft = (expiry) => {
    if (!expiry) return null;
    const diff = new Date(expiry) - new Date();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const formatSisaWaktu = (dom) => {
    const days = getDaysLeft(dom.expiration_date);
    if (days === null) return "-";
    if (days < 0) return <span className="text-rose-600 font-bold uppercase text-[9px]">Expired</span>;
    const isCrisis = days < 30;
    return <span className={`text-[11px] font-bold uppercase tracking-tighter ${isCrisis ? "text-rose-600" : "text-slate-400"}`}>{days} Hari</span>;
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const processedDomains = useMemo(() => {
    let result = [...domains];
    if (filterStatus !== "all") {
      result = result.filter(dom => (dom.status || '').toLowerCase() === filterStatus.toLowerCase());
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(dom => dom.name.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let valA = a[sortConfig.key] || "";
      let valB = b[sortConfig.key] || "";
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [domains, filterStatus, searchTerm, sortConfig]);

  const totalDomains = processedDomains.length;
  const totalPages = Math.ceil(totalDomains / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDomains = processedDomains.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  if (loading && domains.length === 0) {
    return (
      <div className="space-y-4 animate-pulse p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>
              ))}
          </div>
          <div className="h-16 bg-slate-50 rounded-xl"></div>
          <div className="bg-white rounded-xl border border-slate-100 h-96">
              <div className="p-4 border-b border-slate-50 flex gap-4">
                  <div className="h-10 w-2/3 bg-slate-50 rounded-lg"></div>
                  <div className="h-10 w-1/3 bg-slate-50 rounded-lg"></div>
              </div>
              <div className="p-4 space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                      <div key={i} className="h-12 bg-slate-50/50 rounded-lg"></div>
                  ))}
              </div>
          </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-out] pb-10 relative">
      {/* --- PRINT SYSTEM OVERRIDE --- */}
      <style dangerouslySetInnerHTML={{ __html: `
          @media print {
              @page { size: A4; margin: 0; }
              body { background: #fff !important; }
              .print\\:hidden, .sidebar, .navbar, .action-bar, .no-print, nav, .pagination, .search-bar { display: none !important; }
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
          FORMAL ASSET LIST (A4 Optimized)
          ========================================== */}
      <div id="domain-list-print-area" className="hidden print-area text-[#0f172a] bg-white relative overflow-hidden">
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
            <h2 className="text-3xl font-bold text-[#e2e8f0] uppercase tracking-tighter leading-none mb-3">DOMAIN ASSET LIST</h2>
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Total Aset: {domains.length} Domain</p>
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Dicetak: {new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-3 text-[10px] font-bold uppercase">Nama Domain</th>
              <th className="py-3 text-[10px] font-bold uppercase">Tanggal Expire</th>
              <th className="py-3 text-[10px] font-bold uppercase text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {domains.map((dom, i) => (
              <tr key={i}>
                <td className="py-4 text-xs font-bold text-slate-900">{dom.name}</td>
                <td className="py-4 text-[10px] font-bold text-slate-400 uppercase">
                    {dom.expiration_date ? new Date(dom.expiration_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                </td>
                <td className="py-4 text-center">
                    <span className="text-[8px] font-bold uppercase tracking-widest border border-slate-100 px-2 py-1 rounded">
                        {dom.status}
                    </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-20 pt-10 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 italic">Daftar ini adalah catatan resmi portofolio domain pada platform DomainDagang.</p>
          <p className="text-[10px] font-bold text-slate-900 mt-2">&copy; {new Date().getFullYear()} PT Aplikasi Dagang Teknologi</p>
        </div>
      </div>
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-3 rounded-xl shadow-xl shadow-slate-200/50 flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
              <div className="w-12 h-12 bg-white/10 text-white rounded-lg flex items-center justify-center backdrop-blur-md border border-white/10">
                  <span className="material-symbols-outlined text-2xl">language</span>
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Total Domain</p>
                  <h3 className="text-2xl font-bold text-white leading-none">{domains.length} <span className="text-xs text-white/30 font-medium lowercase">Asset</span></h3>
              </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Status Aktif</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{domains.filter(d => (d.status || '').toLowerCase() === 'active').length} <span className="text-xs text-slate-400 font-medium lowercase">Vaid</span></h3>
              </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">report_problem</span>
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Perlu Atensi</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{domains.filter(d => (d.status || '').toLowerCase() !== 'active').length} <span className="text-xs text-slate-400 font-medium lowercase">Asset</span></h3>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        {/* Unified Header */}
        <div className="p-3 border-b border-slate-50 bg-slate-50/30">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex-1 w-full max-w-xl relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f97316] transition-colors">search</span>
                    <input 
                        type="text" 
                        placeholder="Cari Domain Anda..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-11 pl-12 pr-6 bg-white border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-all placeholder:text-slate-300"
                    />
                </div>
                <div className="grid grid-cols-1 sm:flex sm:items-center gap-3 w-full md:w-auto">
                    <div className="w-full sm:w-48">
                        <CustomSelect
                            value={filterStatus}
                            onChange={(val) => setFilterStatus(val)}
                            options={[
                                { value: 'all', label: 'Semua Status' },
                                { value: 'active', label: 'Aktif' },
                                { value: 'expired', label: 'Expired' },
                                { value: 'unpaid', label: 'Unpaid' },
                            ]}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full">
                        <button 
                            onClick={handleExportExcel}
                            className="h-11 px-4 sm:px-5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm flex items-center justify-center gap-2"
                            title="Export to Excel"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            <span className="hidden lg:inline">Excel</span>
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="h-11 px-4 bg-white border border-slate-200 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:text-[#f97316] transition-all shadow-sm flex items-center justify-center"
                            title="Download Asset List (Print)"
                        >
                            <span className="material-symbols-outlined text-lg">print</span>
                        </button>
                        <button 
                            onClick={handleResync}
                            disabled={resyncing}
                            className="flex-1 h-11 px-4 sm:px-5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:border-[#f97316] hover:text-[#f97316] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span className={`material-symbols-outlined text-lg ${resyncing ? 'animate-spin' : ''}`}>sync</span>
                            <span className="truncate">{resyncing ? "Syncing..." : "Sync Data"}</span>
                        </button>
                        <Link 
                            to="/dashboard/buy"
                            className="flex-1 h-11 px-4 sm:px-6 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#f97316] transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            <span className="truncate">Beli Baru</span>
                        </Link>
                    </div>
                </div>
            </div>
            {searchTerm && (
                <div className="mt-4 flex items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Menampilkan <span className="text-[#f97316]">{totalDomains}</span> domain ditemukan
                    </p>
                    <button onClick={() => setSearchTerm("")} className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest hover:underline">Reset</button>
                </div>
            )}
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full min-w-[700px] text-left border-separate border-spacing-0">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-4 sm:px-8 py-3 cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100 group/th" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                        Domain Asset
                        <span className={`material-symbols-outlined text-sm ${sortConfig.key === 'name' ? 'text-[#f97316]' : 'text-slate-300 opacity-0 group-hover/th:opacity-100'}`}>
                            {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                    </div>
                </th>
                <th className="hidden lg:table-cell px-8 py-3 cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100 group/th" onClick={() => handleSort('expiration_date')}>
                    <div className="flex items-center gap-1">
                        Tanggal Kadaluarsa
                        <span className={`material-symbols-outlined text-sm ${sortConfig.key === 'expiration_date' ? 'text-[#f97316]' : 'text-slate-300 opacity-0 group-hover/th:opacity-100'}`}>
                            {sortConfig.key === 'expiration_date' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                    </div>
                </th>
                <th className="px-4 sm:px-8 py-3 text-center border-b border-slate-100">Masa Berlaku</th>
                <th className="px-4 sm:px-8 py-4 text-center border-b border-slate-100">Status</th>
                <th className="px-4 sm:px-8 py-4 text-center border-b border-slate-100">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {paginatedDomains.length === 0 ? (
                <tr><td colSpan="5" className="px-8 py-10 text-center text-slate-400 font-bold italic">Tidak ada domain yang ditemukan.</td></tr>
              ) : (
                paginatedDomains.map((dom) => {
                  const statusConfig = getStatusBadge(dom.status);
                  return (
                    <tr key={dom.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 sm:px-8 py-1.5">
                          <p className="font-bold text-slate-900 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              {dom.name}
                              <span className="flex">
                                {dom.is_transfer ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                        Transfer
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        Register
                                    </span>
                                )}
                              </span>
                          </p>
                          {(() => {
                              const isId = (dom.name || "").toLowerCase().split('.').some(part => ['id', 'co', 'ac', 'sch', 'or', 'my', 'biz', 'web', 'ponpes'].includes(part));
                              if (!isId) return <p className="hidden sm:block text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Asset Terverifikasi</p>;
                              
                              switch (dom.document_status_mapped) {
                                  case 'approved':
                                      return <p className="hidden sm:block text-[9px] text-emerald-500 font-bold uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[10px]">verified</span> Asset Terverifikasi
                                      </p>;
                                  case 'pending':
                                      return <p className="hidden sm:block text-[9px] text-amber-500 font-bold uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[10px]">history</span> Verifikasi Diproses
                                      </p>;
                                  case 'rejected':
                                      return <p className="hidden sm:block text-[9px] text-[#F97316] font-bold uppercase tracking-tighter mt-0.5 flex items-center gap-1 animate-pulse">
                                          <span className="material-symbols-outlined text-[10px]">error</span> Menunggu Dokumen
                                      </p>;
                                  default:
                                      return <p className="hidden sm:block text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Asset Terverifikasi</p>;
                              }
                          })()}
                      </td>
                      <td className="hidden lg:table-cell px-8 py-1.5">
                          <p className="text-[11px] font-bold text-slate-400 uppercase">
                            {dom.expiration_date ? new Date(dom.expiration_date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                          </p>
                      </td>
                      <td className="px-4 sm:px-8 py-2 text-center">
                          {formatSisaWaktu(dom)}
                      </td>
                      <td className="px-4 sm:px-8 py-2 text-center">
                        <span className={`inline-flex px-2 sm:px-3 py-1 rounded-lg text-[8px] sm:text-[9px] font-bold uppercase tracking-widest border ${statusConfig.className}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-8 py-2 text-center">
                        <Link
                          to={`/dashboard/domains/${dom.id}`}
                          className="inline-flex px-3 sm:px-4 py-2 bg-slate-900 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#f97316] transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                        >
                          Kelola
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination */}
        {totalPages > 1 && (
            <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                    Halaman <span className="text-slate-900">{currentPage}</span> Dari <span className="text-slate-900">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="px-6 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-widest text-slate-600 hover:border-[#f97316] hover:text-[#f97316] transition-all disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-600 flex items-center gap-2 shadow-sm"
                    >
                        Kembali
                    </button>
                    <button 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="px-6 py-2.5 bg-slate-900 text-white border border-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-[#f97316] hover:border-[#f97316] transition-all disabled:opacity-30 disabled:hover:bg-slate-900 flex items-center gap-2 shadow-lg shadow-slate-900/10"
                    >
                        Lanjut
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MyDomains;
