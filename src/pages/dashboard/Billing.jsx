import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";
import CustomSelect from "../../components/ui/CustomSelect";
import { useConfirm } from "../../context/ConfirmContext";

const Billing = () => {
  const { success, info } = useNotification();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Table States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- FETCH DATA ---
  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    setLoading(true);
    try {
      const user = JSON.parse(storedUser);
      const response = await api.get(`/billing/user/${user.id}`);
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CALCULATE STATS ---
  const stats = useMemo(() => {
    let totalExpense = 0;
    let pendingCount = 0;
    const methods = {};

    invoices.forEach((inv) => {
      const status = inv.status ? inv.status.toLowerCase() : "";
      if (status === "paid") totalExpense += parseFloat(inv.total || 0);
      if (status === "pending") pendingCount++;
      if (inv.payment_method) {
        methods[inv.payment_method] = (methods[inv.payment_method] || 0) + 1;
      }
    });

    let favMethod = "N/A";
    let maxCount = 0;
    Object.entries(methods).forEach(([method, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favMethod = method;
      }
    });

    return { totalExpense, pendingCount, favMethod };
  }, [invoices]);

  // --- ADVANCED TABLE LOGIC ---
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const processedInvoices = useMemo(() => {
    let result = [...invoices];

    if (statusFilter !== "all") {
      result = result.filter(inv => 
        inv.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    } else {
      // By default ('all'), we hide cancelled ones to keep it clean
      result = result.filter(inv => inv.status?.toLowerCase() !== 'cancelled');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(inv => 
        inv.id.toLowerCase().includes(q) || 
        (inv.first_item && inv.first_item.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (sortConfig.key === "total") {
        valA = parseFloat(valA);
        valB = parseFloat(valB);
      }
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, statusFilter, searchQuery, sortConfig]);

  const totalInvoices = processedInvoices.length;
  const totalPages = Math.ceil(totalInvoices / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = processedInvoices.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getCategoryBadge = (cat) => {
    const c = (cat || 'REGISTER').toUpperCase();
    switch(c) {
        case 'TOPUP': return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100 shadow-sm">Top-up</span>;
        case 'RENEW': return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">Perpanjang</span>;
        case 'TRANSFER': return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">Transfer</span>;
        case 'RESTORE': return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">Restore</span>;
        default: return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">Registrasi</span>;
    }
  };

  const handleDetail = (id) => navigate(`/dashboard/billing/${id}`);
  const handleDownload = (id) => {
      // Kita manfaatkan localstorage atau sekadar navigate lalu trigger di DetailInvoice
      info(`Mengarahkan ke rincian invoice ${id} untuk cetak PDF...`);
      navigate(`/dashboard/billing/${id}`);
  };
  // Refactored: Redirect to Checkout for payment
  const handlePay = (id) => navigate(`/checkout?invoiceId=${id}`);
  const confirm = useConfirm();
  
  const [cancelModal, setCancelModal] = useState({ show: false, invoiceId: null });
  const [cancelReason, setCancelReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  const cancellationReasons = [
      "Ganti pikiran",
      "Ketemu harga lebih murah",
      "Salah ketik nama domain",
      "Gak jadi rilis project",
      "Lainnya"
  ];

  const handleCancelClick = async (id) => {
      const isConfirmed = await confirm({
          title: "Batalkan Tagihan?",
          message: "Apakah Anda yakin ingin membatalkan tagihan ini? Tindakan ini tidak dapat dibatalkan.",
          type: "warning",
          confirmText: "Ya, Batalkan",
          cancelText: "Kembali"
      });

      if (isConfirmed) {
          setCancelModal({ show: true, invoiceId: id });
      }
  };

  const handleConfirmCancel = async () => {
    const finalReason = cancelReason === "Lainnya" ? otherReason : cancelReason;
    if (!finalReason) {
        info("Silakan pilih atau masukkan alasan pembatalan.");
        return;
    }

    try {
      await api.put(`/billing/invoice/${cancelModal.invoiceId}/cancel`, { reason: finalReason });
      setInvoices(invoices.map(inv => 
          inv.id === cancelModal.invoiceId ? { ...inv, status: 'cancelled' } : inv
      ));
      success("Tagihan berhasil dibatalkan.");
      setCancelModal({ show: false, invoiceId: null });
      setCancelReason("");
      setOtherReason("");
    } catch (error) {
      console.error("Error cancelling invoice:", error);
      info("Gagal membatalkan tagihan.");
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] pb-20">
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-6 rounded-xl shadow-xl shadow-slate-200/50 flex items-center gap-5 transition-transform hover:-translate-y-1 duration-300">
              <div className="w-14 h-14 bg-white/10 text-white rounded-lg flex items-center justify-center backdrop-blur-md border border-white/10">
                  <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Total Belanja</p>
                  <h3 className="text-2xl font-bold text-white leading-none">{formatRupiah(stats.totalExpense)}</h3>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1 duration-300">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">pending_actions</span>
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Belum Terbayar</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none">{stats.pendingCount} <span className="text-xs text-slate-400 font-medium lowercase">Item</span></h3>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1 duration-300">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">favorite</span>
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Pembayaran Favorit</p>
                  <h3 className="text-2xl font-bold text-slate-900 leading-none uppercase truncate max-w-[150px]">{stats.favMethod === "N/A" ? "-" : stats.favMethod}</h3>
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
                        placeholder="Cari ID Invoice atau Item Domain..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 pl-12 pr-6 bg-white border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-all placeholder:text-slate-300"
                    />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-48">
                        <CustomSelect
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val)}
                            options={[
                                { value: 'all', label: 'Semua Koleksi' },
                                { value: 'paid', label: 'Sudah Lunas' },
                                { value: 'pending', label: 'Menunggu' },
                                { value: 'failed', label: 'Ditolak' },
                                { value: 'refunded', label: 'Dikembalikan' },
                                { value: 'cancelled', label: 'Dibatalkan' },
                            ]}
                        />
                    </div>
                </div>
            </div>
            {searchQuery && (
                <div className="mt-4 flex items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Menampilkan <span className="text-[#f97316]">{totalInvoices}</span> invoice ditemukan
                    </p>
                    <button onClick={() => setSearchQuery("")} className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest hover:underline">Reset</button>
                </div>
            )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('id')}>Invoice ID</th>
                <th className="px-8 py-5 cursor-pointer hover:text-slate-600 transition-colors border-b border-slate-100" onClick={() => handleSort('created_at')}>Tanggal</th>
                <th className="px-8 py-5 border-b border-slate-100">Item Layanan</th>
                <th className="px-8 py-5 text-right border-b border-slate-100" onClick={() => handleSort('total')}>Total Tagihan</th>
                <th className="px-8 py-5 text-center border-b border-slate-100">Status</th>
                <th className="px-8 py-5 text-center border-b border-slate-100">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {loading ? (
                <tr><td colSpan="6" className="px-8 py-10 text-center text-slate-400 font-bold italic">Memuat riwayat tagihan...</td></tr>
              ) : paginatedInvoices.length === 0 ? (
                <tr><td colSpan="6" className="px-8 py-10 text-center text-slate-400 font-bold italic">Belum ada tagihan yang ditemukan.</td></tr>
              ) : (
                paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-900 text-xs uppercase tracking-tight">#{inv.id}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">{formatDate(inv.created_at)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-semibold text-slate-800 text-xs truncate max-w-[200px]">
                        {inv.first_item} {inv.item_count > 1 && <span className="text-[#f97316]">+{inv.item_count - 1}</span>}
                        {getCategoryBadge(inv.category)}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{inv.payment_method || "N/A"}</p>
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-slate-900">
                      <div>
                        {(inv.is_topup || inv.first_item?.toLowerCase().includes('top up')) ? (
                          formatRupiah(inv.total)
                        ) : (
                          <>
                            <div className="flex flex-col items-end leading-tight">
                              {parseFloat(inv.total_discount || 0) > 0 ? (
                                <>
                                  <span className="text-[9px] text-slate-400 line-through font-normal">{formatRupiah(inv.subtotal)}</span>
                                  <p className="text-xs">
                                    {formatRupiah(inv.subtotal - inv.total_discount)} 
                                    <span className="ml-1 text-[9px] text-slate-400 font-medium">+ {formatRupiah(inv.tax_amount || inv.tax)}</span>
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs">
                                  {formatRupiah(Math.ceil(inv.total / 1.11))} 
                                  <span className="ml-1 text-[9px] text-slate-400 font-medium">+ {formatRupiah(inv.total - Math.ceil(inv.total / 1.11))}</span>
                                </p>
                              )}
                              <p className="text-[10px] text-[#f97316] mt-1">{formatRupiah(inv.total)}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                        inv.status?.toLowerCase() === "paid" 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : inv.status?.toLowerCase() === "refunded"
                          ? "bg-rose-50 text-rose-600 border-rose-100"
                        : (inv.status?.toLowerCase() === "cancelled" || inv.status?.toLowerCase() === "failed")
                          ? "bg-slate-50 text-slate-400 border-slate-100"
                        : inv.has_proof
                          ? "bg-blue-50 text-blue-600 border-blue-100"
                          : "bg-amber-50 text-amber-600 border-amber-100"
                      }`}>
                        {inv.status?.toLowerCase() === "paid" ? "Lunas" : 
                         inv.status?.toLowerCase() === "refunded" ? "Dikembalikan" :
                         inv.status?.toLowerCase() === "cancelled" ? "Dibatalkan" : 
                         inv.status?.toLowerCase() === "failed" ? "Ditolak" : 
                         inv.has_proof ? "Verifikasi" : "Pending"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                             <button onClick={() => handleDetail(inv.id)} className="p-2 bg-white text-slate-400 rounded-lg border border-slate-100 hover:bg-slate-50 transition-all shadow-sm">
                                <span className="material-symbols-outlined text-lg">visibility</span>
                             </button>
                             {(inv.status?.toLowerCase() === "pending" || inv.status?.toLowerCase() === "failed") ? (
                                 <>
                                     {(inv.status?.toLowerCase() === "pending" && inv.has_proof) ? (
                                         <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-slate-200">Menunggu Verifikasi</span>
                                     ) : (
                                         <>
                                             <button onClick={() => handlePay(inv.id)} className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#f97316] transition-all shadow-lg shadow-slate-900/10">Bayar</button>
                                             <button onClick={() => handleCancelClick(inv.id)} className="p-2 bg-white text-slate-400 rounded-lg border border-slate-100 hover:bg-rose-50 hover:text-rose-500 transition-all">
                                                 <span className="material-symbols-outlined text-lg">close</span>
                                             </button>
                                         </>
                                     )}
                                 </>
                             ) : (
                                <button onClick={() => handleDownload(inv.id)} className="p-2 bg-white text-slate-400 rounded-lg border border-slate-100 hover:bg-emerald-50 hover:text-emerald-500 transition-all shadow-sm">
                                    <span className="material-symbols-outlined text-lg">download</span>
                                </button>
                             )}
                        </div>
                    </td>
                  </tr>
                ))
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

      {/* Cancellation Modal */}
      {cancelModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-[scaleUp_0.3s_ease-out]">
                  <div className="p-8">
                      <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                          <span className="material-symbols-outlined text-3xl">cancel</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Batalkan Tagihan?</h3>
                      <p className="text-sm text-slate-500 text-center mb-8">Beritahu kami alasan Anda membatalkan pesanan ini untuk membantu kami meningkatkan layanan.</p>
                      
                      <div className="space-y-4">
                          <div className="relative group">
                              <select 
                                  value={cancelReason} 
                                  onChange={(e) => setCancelReason(e.target.value)}
                                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                              >
                                  <option value="">Pilih Alasan...</option>
                                  {cancellationReasons.map(r => (
                                      <option key={r} value={r}>{r}</option>
                                  ))}
                              </select>
                          </div>

                          {cancelReason === "Lainnya" && (
                              <textarea 
                                  placeholder="Masukkan alasan Anda..." 
                                  value={otherReason}
                                  onChange={(e) => setOtherReason(e.target.value)}
                                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all min-h-[100px]"
                              />
                          )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-8">
                          <button 
                              onClick={() => {
                                  setCancelModal({ show: false, invoiceId: null });
                                  setCancelReason("");
                                  setOtherReason("");
                              }}
                              className="h-12 border border-slate-200 rounded-lg font-bold text-[11px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                          >
                              Kembali
                          </button>
                          <button 
                              onClick={handleConfirmCancel}
                              className="h-12 bg-rose-500 text-white rounded-lg font-bold text-[11px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                          >
                              Ya, Batalkan
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Billing;
