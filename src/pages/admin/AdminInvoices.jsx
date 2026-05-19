import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Link } from "react-router-dom";
import CustomSelect from "../../components/ui/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";

const AdminInvoices = () => {
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [activeFilter, setActiveFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Combined Filtering & Searching & Sorting Helper
  const applyFilters = (data, filter, sort, search, cat, start, end) => {
    if (!data) return;
    let result = [...data];

    // 1. Filtering by Status
    if (filter !== "all") {
      result = result.filter(inv => inv.status === filter);
    }

    // 2. Filtering by Category
    if (cat !== "all") {
        result = result.filter(inv => (inv.category || inv.action_type || 'REGISTER').toUpperCase() === cat.toUpperCase());
    }

    // 3. Filtering by Date Range
    if (start) {
        const sDate = new Date(start);
        sDate.setHours(0, 0, 0, 0);
        result = result.filter(inv => new Date(inv.created_at) >= sDate);
    }
    if (end) {
        const eDate = new Date(end);
        eDate.setHours(23, 59, 59, 999);
        result = result.filter(inv => new Date(inv.created_at) <= eDate);
    }

    // 4. Searching (ID, Customer Name, Email, Domain)
    if (search) {
      const s = search.toLowerCase();
      const sClean = s.replace('#', ''); // Strip # for ID matching
      result = result.filter(inv => 
        inv.id.toLowerCase().includes(sClean) || 
        (inv.customer_name || "").toLowerCase().includes(s) || 
        (inv.customer_email || "").toLowerCase().includes(s) ||
        (inv.first_item || "").toLowerCase().includes(s)
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      let valA = a[sort.key] || "";
      let valB = b[sort.key] || "";

      if (sort.key === 'total') {
        valA = parseFloat(a.total);
        valB = parseFloat(b.total);
      }
      
      if (sort.key === 'customer_name') {
        valA = (a.customer_name || "").toLowerCase();
        valB = (b.customer_name || "").toLowerCase();
      }

      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredInvoices(result);
    setCurrentPage(1);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get("/billing/all");
      setInvoices(response.data);
      applyFilters(response.data, activeFilter, sortConfig, searchTerm, categoryFilter, startDate, endDate);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const newSort = { key, direction };
    setSortConfig(newSort);
    applyFilters(invoices, activeFilter, newSort, searchTerm);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    applyFilters(invoices, filter, sortConfig, searchTerm, categoryFilter, startDate, endDate);
  };

  const handleCategoryChange = (cat) => {
    setCategoryFilter(cat);
    applyFilters(invoices, activeFilter, sortConfig, searchTerm, cat, startDate, endDate);
  };

  const handleStartDateChange = (e) => {
    const val = e.target.value;
    setStartDate(val);
    applyFilters(invoices, activeFilter, sortConfig, searchTerm, categoryFilter, val, endDate);
  };

  const handleEndDateChange = (e) => {
    const val = e.target.value;
    setEndDate(val);
    applyFilters(invoices, activeFilter, sortConfig, searchTerm, categoryFilter, startDate, val);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    applyFilters(invoices, activeFilter, sortConfig, val, categoryFilter, startDate, endDate);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentItems.map(inv => inv.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = async () => {
    const isConfirmed = await confirm({
        title: "Persetujuan Massal",
        message: `Setujui ${selectedIds.length} invoice sekaligus?`,
        confirmText: "Ya, Setujui Semua"
    });
    if (!isConfirmed) return;
    
    setLoading(true);
    try {
        await Promise.all(selectedIds.map(id => api.post(`/billing/invoice/${id}/pay`, { payment_method: "Admin Manual" })));
        success(`${selectedIds.length} Invoice berhasil disetujui! ✅`);
        setSelectedIds([]);
        fetchInvoices();
    } catch (err) {
        error("Beberapa invoice gagal disetujui.");
    } finally {
        setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const isConfirmed = await confirm({
        title: "Hapus Massal",
        message: `Hapus ${selectedIds.length} invoice terpilih secara permanen?`,
        type: "danger",
        confirmText: "Hapus Semua"
    });
    if (!isConfirmed) return;
    
    setLoading(true);
    try {
        await Promise.all(selectedIds.map(id => api.delete(`/billing/invoice/${id}`)));
        success(`${selectedIds.length} Invoice berhasil dihapus.`);
        setSelectedIds([]);
        fetchInvoices();
    } catch (err) {
        error("Beberapa invoice gagal dihapus.");
    } finally {
        setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = formatDataForExport(filteredInvoices, {
        id: 'ID Invoice',
        customer_name: 'Pelanggan',
        customer_email: 'Email',
        total: 'Total Nominal',
        status: 'Status',
        created_at: 'Tanggal'
    });
    exportToExcel(exportData, 'Data_Invoices', 'Invoices');
  };

  const handleApprove = async (id) => {
    const isConfirmed = await confirm({
        title: "Persetujuan Pembayaran",
        message: `Setujui pembayaran untuk invoice ${id}?`,
        confirmText: "Ya, Setujui"
    });
    if (!isConfirmed) return;
    try {
        await api.post(`/billing/invoice/${id}/pay`, { payment_method: "Admin Manual" });
        success("Pembayaran berhasil disetujui! ✅");
        fetchInvoices();
    } catch (err) {
        error("Gagal menyetujui pembayaran.");
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
        title: "Hapus Invoice",
        message: `PERINGATAN: Hapus invoice ${id} secara permanen? Tindakan ini tidak dapat dibatalkan.`,
        type: "danger",
        confirmText: "Hapus Sekarang"
    });
    if (!isConfirmed) return;
    try {
        await api.delete(`/billing/invoice/${id}`);
        success("Invoice berhasil dihapus!");
        fetchInvoices();
    } catch (err) {
        error(`Gagal menghapus invoice.`);
    }
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getActionBadge = (category) => {
    const c = (category || 'REGISTER').toUpperCase();
    switch(c) {
      case 'TOPUP': return <span className="bg-purple-50 text-purple-600 border-purple-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border">Topup</span>;
      case 'RENEW': return <span className="bg-indigo-50 text-indigo-600 border-indigo-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border">Renew</span>;
      case 'TRANSFER': return <span className="bg-amber-50 text-amber-600 border-amber-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border">Transfer</span>;
      case 'RESTORE': return <span className="bg-rose-50 text-rose-600 border-rose-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border">Restore</span>;
      default: return <span className="bg-emerald-50 text-emerald-600 border-emerald-100 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border">Register</span>;
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity">⇅</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-[#F97316]">↑</span> : <span className="ml-1 text-[#F97316]">↓</span>;
  };

  // Stats calculation
  const stats = {
    total: invoices.length,
    paid: invoices.filter(inv => inv.status === 'paid').length,
    pending: invoices.filter(inv => inv.status === 'pending' && !inv.has_proof).length,
    verification: invoices.filter(inv => inv.status === 'pending' && inv.has_proof).length,
    totalRevenue: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + parseFloat(inv.total), 0)
  };

  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-out] pb-10">
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative overflow-hidden bg-[#f97316] p-3 rounded-xl shadow-xl shadow-orange-200/50 flex items-center gap-4 group hover:shadow-xl hover:shadow-orange-300/40 hover:-translate-y-1 transition-all duration-500">
              {/* Decorative Glass Waves */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16 transition-transform duration-1000 group-hover:bg-white/30 group-hover:scale-150"></div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-2xl transition-transform duration-1000 group-hover:scale-125"></div>
              
              <div className="relative z-10 w-14 h-14 bg-white/20 backdrop-blur-md text-white rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 border border-white/30 shadow-inner">
                  <span className="material-symbols-outlined text-2xl font-bold">receipt_long</span>
              </div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em] leading-none">Total Invoice</p>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></span>
                  </div>
                  <h3 className="text-3xl font-bold text-white leading-none tracking-tight">{loading ? "..." : stats.total}</h3>
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-2">All Transactions</p>
              </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
              <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Invoice Terbayar</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{loading ? "..." : stats.paid}</h3>
                  <p className="text-[10px] font-bold text-emerald-500 mt-1">{formatRupiah(stats.totalRevenue)}</p>
              </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-2xl">pending_actions</span>
              </div>
              <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Menunggu Bayar</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{loading ? "..." : stats.pending}</h3>
              </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-indigo-500">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-2xl animate-pulse">fact_check</span>
              </div>
              <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Perlu Verifikasi</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{loading ? "..." : stats.verification}</h3>
                  <p className="text-[9px] font-bold text-indigo-500 mt-1 uppercase tracking-tighter">Action Required</p>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        {/* Unified Header with Search & Dropdown */}
        <div className="p-3 sm:p-3 border-b border-slate-50 bg-slate-50/30">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 sm:gap-6">
                <div className="flex-1 w-full max-w-xl relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f97316] transition-colors">search</span>
                    <input 
                        type="text" 
                        placeholder="Cari ID, User, Email, atau Domain..." 
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full h-12 pl-12 pr-6 bg-white border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all placeholder:text-slate-300"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="w-full sm:w-40">
                        <CustomSelect
                            value={activeFilter}
                            onChange={handleFilterChange}
                            options={[
                                { value: 'all', label: 'Semua Status' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'paid', label: 'Paid' },
                            ]}
                        />
                    </div>
                    <div className="w-full sm:w-40">
                        <CustomSelect
                            value={categoryFilter}
                            onChange={handleCategoryChange}
                            options={[
                                { value: 'all', label: 'Semua Kategori' },
                                { value: 'REGISTER', label: 'Registrasi' },
                                { value: 'TOPUP', label: 'Top-up' },
                                { value: 'RENEW', label: 'Perpanjang' },
                                { value: 'TRANSFER', label: 'Transfer' },
                            ]}
                        />
                    </div>
                    <div className="hidden lg:block w-px h-8 bg-slate-200"></div>
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-40">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">Dari</span>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={handleStartDateChange}
                                className="w-full h-11 pl-12 pr-3 bg-white border border-slate-100 rounded-lg text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-all text-slate-600"
                            />
                        </div>
                        <div className="text-slate-300 font-bold hidden lg:block">→</div>
                        <div className="relative flex-1 lg:w-40">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">Sampai</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={handleEndDateChange}
                                className="w-full h-11 pl-16 pr-3 bg-white border border-slate-100 rounded-lg text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-all text-slate-600"
                            />
                        </div>
                    </div>
                    </div>
                    <div className="w-full sm:w-32">
                        <button 
                            onClick={handleExportExcel}
                            className="w-full h-11 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            Export
                        </button>
                    </div>
                </div>
            </div>
            {(searchTerm || activeFilter !== "all" || categoryFilter !== "all" || startDate || endDate) && (
                <div className="mt-4 flex items-center justify-between gap-2 bg-white/50 p-2 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                        Menampilkan <span className="text-[#f97316] font-bold">{filteredInvoices.length}</span> hasil filter aktif
                    </p>
                    <button 
                        onClick={() => {
                            setSearchTerm("");
                            setActiveFilter("all");
                            setCategoryFilter("all");
                            setStartDate("");
                            setEndDate("");
                            applyFilters(invoices, "all", sortConfig, "", "all", "", "");
                        }} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-500 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
                        Reset Filter
                    </button>
                </div>
            )}
        </div>

        {/* MOBILE CARDS */}
        <div className="block sm:hidden divide-y divide-slate-50">
          {loading ? (
            <div className="px-6 py-20 text-center text-slate-400 italic font-bold">Memuat tagihan...</div>
          ) : currentItems.length === 0 ? (
            <div className="px-6 py-20 text-center text-slate-400 italic font-bold">Belum ada tagihan.</div>
          ) : currentItems.map((inv) => (
            <div key={inv.id} className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-[#F97316] text-sm">#{inv.id}</p>
                    {getActionBadge(inv.category || inv.action_type)}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {new Date(inv.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border transition-all ${
                  inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  inv.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                }`}>
                  {inv.status}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                      {inv.customer_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{inv.customer_name || "Unknown"}</p>
                      <p className="text-[9px] text-slate-400 font-medium">{inv.customer_email || "-"}</p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-900">{formatRupiah(inv.total)}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link 
                    to={`/admin/invoices/${inv.id}`}
                    className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center shadow-sm"
                  >
                    Detail
                  </Link>
                  {inv.status === 'pending' && (
                    <button 
                      onClick={() => handleApprove(inv.id)}
                      className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm shadow-slate-900/10"
                    >
                      Approve
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(inv.id)}
                    className="p-2.5 bg-rose-50 text-rose-500 rounded-lg border border-rose-100"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3 w-10">
                    <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={selectedIds.length === currentItems.length && currentItems.length > 0}
                        className="w-4 h-4 rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
                    />
                </th>
                <th className="px-4 py-2 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('id')}>
                    Invoice ID <SortIcon column="id" />
                </th>
                <th className="px-4 py-2 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('customer_name')}>
                    Customer <SortIcon column="customer_name" />
                </th>
                <th className="px-4 py-2">
                    Tipe
                </th>
                <th className="px-4 py-2 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('total')}>
                    Total <SortIcon column="total" />
                </th>
                <th className="px-4 py-2 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('status')}>
                    Status <SortIcon column="status" />
                </th>
                <th className="px-4 py-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {loading ? (
                Array(itemsPerPage).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                        <td className="px-4 py-4"><div className="h-4 w-4 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-4">
                            <div className="h-4 w-24 bg-slate-100 rounded mb-2"></div>
                            <div className="h-3 w-16 bg-slate-50 rounded"></div>
                        </td>
                        <td className="px-4 py-4">
                            <div className="h-4 w-32 bg-slate-100 rounded mb-2"></div>
                            <div className="h-3 w-40 bg-slate-50 rounded"></div>
                        </td>
                        <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-4"><div className="h-6 w-16 bg-slate-50 rounded-lg"></div></td>
                        <td className="px-4 py-4 text-center"><div className="h-8 w-24 bg-slate-100 rounded-lg mx-auto"></div></td>
                    </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr>
                   <td colSpan="7" className="px-8 py-10 text-center text-slate-400 font-bold italic">Belum ada tagihan yang cocok.</td>
                </tr>
              ) : (
                currentItems.map((inv) => (
                  <tr key={inv.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(inv.id) ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-4 py-3">
                        <input 
                            type="checkbox" 
                            checked={selectedIds.includes(inv.id)}
                            onChange={() => handleSelectItem(inv.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
                        />
                    </td>
                    <td className="px-4 py-1.5">
                      <p className="font-bold text-[#F97316] text-xs">#{inv.id}</p>
                      <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                        {new Date(inv.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-4 py-1.5">
                      <p className="font-semibold text-slate-800 text-xs">{inv.customer_name || "Unknown"}</p>
                      <p className="text-[10px] text-slate-400">{inv.customer_email || "-"}</p>
                    </td>
                    <td className="px-4 py-1.5">
                      {getActionBadge(inv.category)}
                    </td>
                    <td className="px-4 py-1.5">
                      <p className="font-bold text-slate-900">{formatRupiah(inv.total)}</p>
                    </td>
                    <td className="px-4 py-1.5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                        inv.status === 'paid' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : (inv.status === 'pending' && inv.has_proof)
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse'
                        : inv.status === 'pending'
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {inv.status === 'paid' ? 'Lunas' : 
                         (inv.status === 'pending' && inv.has_proof) ? 'Verifikasi' :
                         inv.status === 'pending' ? 'Menunggu' : inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                             {inv.status === 'pending' && (
                                <button 
                                    onClick={() => handleApprove(inv.id)}
                                    className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-[#F97316] transition-all shadow-sm active:scale-95 uppercase tracking-wider"
                                >
                                    APPROVE
                                </button>
                             )}
                             <Link 
                                to={`/admin/invoices/${inv.id}`}
                                className="p-2 bg-white text-slate-400 rounded-lg hover:bg-slate-100 border border-slate-100 transition shadow-sm"
                             >
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                 </svg>
                             </Link>
                             <button 
                                onClick={() => handleDelete(inv.id)}
                                className="p-2 bg-white text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 border border-slate-100 transition shadow-sm"
                             >
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                 </svg>
                             </button>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Navigation */}
        <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="bg-white px-5 py-2.5 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Total <span className="text-[#F97316]">{filteredInvoices.length}</span> Invoices • Hal <span className="text-slate-800">{currentPage} / {totalPages || 1}</span>
                </p>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-widest text-slate-600 hover:border-[#F97316] hover:text-[#F97316] transition-all disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-600 flex items-center gap-2 shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Kembali
                </button>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-6 py-2.5 bg-slate-900 text-white border border-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-[#F97316] hover:border-[#F97316] transition-all disabled:opacity-30 disabled:hover:bg-slate-900 flex items-center gap-2 shadow-lg shadow-slate-900/10"
                >
                    Lanjut
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>


      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-black/40 flex items-center gap-8 animate-in slide-in-from-bottom-10 duration-300 border border-slate-800">
              <div className="flex flex-col">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Terpilih</p>
                  <p className="text-xl font-bold leading-none">{selectedIds.length} <span className="text-xs text-slate-500 font-medium">Invoice</span></p>
              </div>
              
              <div className="w-px h-10 bg-slate-800"></div>
              
              <div className="flex items-center gap-3">
                  <button 
                    onClick={handleBulkApprove}
                    className="h-11 px-6 bg-[#F97316] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-900/20"
                  >
                      <span className="material-symbols-outlined text-lg">verified</span>
                      Setujui Semua
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="h-11 px-6 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"
                  >
                      <span className="material-symbols-outlined text-lg">delete</span>
                      Hapus Terpilih
                  </button>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="w-11 h-11 flex items-center justify-center bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 transition-all"
                  >
                      <span className="material-symbols-outlined">close</span>
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminInvoices;
