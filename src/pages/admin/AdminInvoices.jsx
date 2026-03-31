import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Link } from "react-router-dom";
import CustomSelect from "../../components/ui/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";

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

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Combined Filtering & Searching & Sorting Helper
  const applyFilters = (data, filter, sort, search) => {
    if (!data) return;
    let result = [...data];

    // 1. Filtering by Status
    if (filter !== "all") {
      result = result.filter(inv => inv.status === filter);
    }

    // 2. Searching (ID, Customer Name, Email)
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(inv => 
        inv.id.toLowerCase().includes(s) || 
        (inv.customer_name || "").toLowerCase().includes(s) || 
        (inv.customer_email || "").toLowerCase().includes(s)
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
      applyFilters(response.data, activeFilter, sortConfig, searchTerm);
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
    applyFilters(invoices, filter, sortConfig, searchTerm);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    applyFilters(invoices, activeFilter, sortConfig, val);
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
    pending: invoices.filter(inv => inv.status === 'pending').length,
    totalRevenue: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + parseFloat(inv.total), 0)
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] pb-10">
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden bg-[#f97316] p-6 rounded-xl shadow-xl shadow-orange-200/50 flex items-center gap-5 group hover:shadow-2xl hover:shadow-orange-300/40 hover:-translate-y-1 transition-all duration-500">
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

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
              <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Invoice Terbayar</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{loading ? "..." : stats.paid}</h3>
                  <p className="text-[10px] font-bold text-emerald-500 mt-1">{formatRupiah(stats.totalRevenue)}</p>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-2xl">pending_actions</span>
              </div>
              <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Menunggu Pembayaran</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{loading ? "..." : stats.pending}</h3>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        {/* Unified Header with Search & Dropdown */}
        <div className="p-4 sm:p-8 border-b border-slate-50 bg-slate-50/30">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 sm:gap-6">
                <div className="flex-1 w-full max-w-xl relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f97316] transition-colors">search</span>
                    <input 
                        type="text" 
                        placeholder="Cari Invoice ID, Nama Customer, atau Email..." 
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full h-12 pl-12 pr-6 bg-white border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all placeholder:text-slate-300"
                    />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-48">
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
                    <div className="w-48">
                        <CustomSelect
                            value={itemsPerPage}
                            onChange={(val) => {
                                setItemsPerPage(Number(val));
                                setCurrentPage(1);
                            }}
                            options={[
                                { value: 15, label: "15 Baris" },
                                { value: 25, label: "25 Baris" },
                                { value: 50, label: "50 Baris" },
                                { value: 100, label: "100 Baris" },
                            ]}
                        />
                    </div>
                </div>
            </div>
            {searchTerm && (
                <div className="mt-4 flex items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Menampilkan <span className="text-[#f97316]">{filteredInvoices.length}</span> hasil pencarian untuk "{searchTerm}"
                    </p>
                    <button onClick={() => {setSearchTerm(""); applyFilters(invoices, activeFilter, sortConfig, "");}} className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest hover:underline">Reset</button>
                </div>
            )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('id')}>
                    Invoice ID <SortIcon column="id" />
                </th>
                <th className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('customer_name')}>
                    Customer <SortIcon column="customer_name" />
                </th>
                <th className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('total')}>
                    Total <SortIcon column="total" />
                </th>
                <th className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('status')}>
                    Status <SortIcon column="status" />
                </th>
                <th className="px-8 py-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {loading ? (
                <tr>
                   <td colSpan="5" className="px-8 py-10 text-center text-slate-400 font-bold italic">Memuat tagihan...</td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                   <td colSpan="5" className="px-8 py-10 text-center text-slate-400 font-bold italic">Belum ada tagihan yang cocok.</td>
                </tr>
              ) : (
                currentItems.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#F97316] text-xs">#{inv.id}</p>
                        {inv.is_transfer ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                Transfer
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                New
                            </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                        {new Date(inv.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-semibold text-slate-800 text-xs">{inv.customer_name || "Unknown"}</p>
                      <p className="text-[10px] text-slate-400">{inv.customer_email || "-"}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-900">{formatRupiah(inv.total)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                        inv.status === 'paid' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : inv.status === 'pending'
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
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
        <div className="bg-slate-50/50 p-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
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
      </div>
    </div>
  );
};

export default AdminInvoices;