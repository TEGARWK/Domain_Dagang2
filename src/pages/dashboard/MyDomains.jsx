import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
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

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "active":
        return { label: "Aktif", className: "bg-emerald-50 text-emerald-600 border-emerald-100" };
      case "unpaid":
        return { label: "Unpaid", className: "bg-amber-50 text-amber-600 border-amber-100" };
      case "expired":
        return { label: "Expired", className: "bg-rose-50 text-rose-600 border-rose-100" };
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#F97316] rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sinkronisasi Portofolio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] pb-20">
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-6 rounded-xl shadow-xl shadow-slate-200/50 flex items-center gap-5 transition-transform hover:-translate-y-1 duration-300">
              <div className="w-14 h-14 bg-white/10 text-white rounded-lg flex items-center justify-center backdrop-blur-md border border-white/10">
                  <span className="material-symbols-outlined text-2xl">language</span>
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Total Domain</p>
                  <h3 className="text-2xl font-bold text-white leading-none">{domains.length} <span className="text-xs text-white/30 font-medium lowercase">Asset</span></h3>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1 duration-300">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Status Aktif</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{domains.filter(d => (d.status || '').toLowerCase() === 'active').length} <span className="text-xs text-slate-400 font-medium lowercase">Vaid</span></h3>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1 duration-300">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">report_problem</span>
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Perlu Atensi</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{domains.filter(d => (d.status || '').toLowerCase() !== 'active').length} <span className="text-xs text-slate-400 font-medium lowercase">Asset</span></h3>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        {/* Unified Header */}
        <div className="p-4 sm:p-8 border-b border-slate-50 bg-slate-50/30">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1 w-full max-w-xl relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f97316] transition-colors">search</span>
                    <input 
                        type="text" 
                        placeholder="Cari Domain Anda..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-12 pr-6 bg-white border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-all placeholder:text-slate-300"
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
                <th className="px-4 sm:px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('name')}>Domain Asset</th>
                <th className="hidden lg:table-cell px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('expiration_date')}>Tanggal Kadaluarsa</th>
                <th className="px-4 sm:px-8 py-5 text-center border-b border-slate-100">Masa Berlaku</th>
                <th className="px-4 sm:px-8 py-5 text-center border-b border-slate-100">Status</th>
                <th className="px-4 sm:px-8 py-5 text-center border-b border-slate-100">Aksi</th>
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
                      <td className="px-4 sm:px-8 py-5">
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
                          <p className="hidden sm:block text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Asset Terverifikasi</p>
                      </td>
                      <td className="hidden lg:table-cell px-8 py-5">
                          <p className="text-[11px] font-bold text-slate-400 uppercase">
                            {dom.expiration_date ? new Date(dom.expiration_date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                          </p>
                      </td>
                      <td className="px-4 sm:px-8 py-5 text-center">
                          {formatSisaWaktu(dom)}
                      </td>
                      <td className="px-4 sm:px-8 py-5 text-center">
                        <span className={`inline-flex px-2 sm:px-3 py-1 rounded-lg text-[8px] sm:text-[9px] font-bold uppercase tracking-widest border ${statusConfig.className}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-8 py-5 text-center">
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
            <div className="bg-slate-50/50 p-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
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
