import React, { useState, useEffect } from "react";
import CustomSelect from "../../components/ui/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import api from "../../services/api";

const AdminPricing = () => {
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null); // Changed to item object for modal context
  const [editForm, setEditForm] = useState({
    price_register: "",
    price_transfer: "",
    price_renew: "",
    price_restore: "",
    discount_price_reg: "",
    cost_register: "",
    cost_transfer: "",
    cost_renew: "",
    cost_restore: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    tld: "",
    price_register: "",
    price_transfer: "",
    price_renew: "",
    price_restore: "",
    discount_price_reg: "",
    cost_register: "",
    cost_transfer: "",
    cost_renew: "",
    cost_restore: "",
  });

  const availableTLDs = [".com", ".id", ".net", ".org", ".info", ".biz", ".co.id", ".web.id", ".my.id", ".ac.id", ".xyz", ".top", ".shop"];

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const res = await api.get("/pricing/all");
      setPricing(res.data);
    } catch (err) {
      console.error("Fetch pricing error:", err);
      error("Gagal mengambil data harga.");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await api.post("/pricing/sync");
      success(res.data.message || "Sinkronisasi berhasil!");
      fetchPricing();
    } catch (err) {
      error(err.response?.data?.message || "Gagal sinkronisasi.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.tld) return warning("TLD harus diisi!");
    
    const payload = {
      tld: addForm.tld,
      price_register: parseInt(addForm.price_register.replace(/\./g, '') || 0),
      price_transfer: parseInt(addForm.price_transfer.replace(/\./g, '') || 0),
      price_renew: parseInt(addForm.price_renew.replace(/\./g, '') || 0),
      price_restore: parseInt(addForm.price_restore.replace(/\./g, '') || 0),
      discount_price_reg: parseInt(addForm.discount_price_reg.replace(/\./g, '') || 0),
      cost_register: parseInt(addForm.cost_register.replace(/\./g, '') || 0),
      cost_transfer: parseInt(addForm.cost_transfer.replace(/\./g, '') || 0),
      cost_renew: parseInt(addForm.cost_renew.replace(/\./g, '') || 0),
      cost_restore: parseInt(addForm.cost_restore.replace(/\./g, '') || 0)
    };

    try {
      await api.post("/pricing/add", payload);
      success("TLD Baru berhasil ditambahkan! 🚀");
      setIsAdding(false);
      setAddForm({ tld: "", price_register: "", price_transfer: "", price_renew: "", price_restore: "" });
      fetchPricing();
    } catch (err) {
      error(err.response?.data?.message || "Terjadi kesalahan server.");
    }
  };

  const openEditModal = (p) => {
    setEditingItem(p);
    setEditForm({
      price_register: Math.floor(p.price_register || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
      price_transfer: Math.floor(p.price_transfer || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
      price_renew: Math.floor(p.price_renew || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
      price_restore: Math.floor(p.price_restore || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
      discount_price_reg: Math.floor(p.discount_price_reg || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
      cost_register: Math.floor(p.cost_register || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
      cost_transfer: Math.floor(p.cost_transfer || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
      cost_renew: Math.floor(p.cost_renew || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
      cost_restore: Math.floor(p.cost_restore || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
    });
  };

  const handleUpdate = async () => {
    const payload = {
      price_register: parseInt(editForm.price_register.replace(/\./g, '') || 0),
      price_transfer: parseInt(editForm.price_transfer.replace(/\./g, '') || 0),
      price_renew: parseInt(editForm.price_renew.replace(/\./g, '') || 0),
      price_restore: parseInt(editForm.price_restore.replace(/\./g, '') || 0),
      discount_price_reg: parseInt(editForm.discount_price_reg.replace(/\./g, '') || 0),
      cost_register: parseInt(editForm.cost_register.replace(/\./g, '') || 0),
      cost_transfer: parseInt(editForm.cost_transfer.replace(/\./g, '') || 0),
      cost_renew: parseInt(editForm.cost_renew.replace(/\./g, '') || 0),
      cost_restore: parseInt(editForm.cost_restore.replace(/\./g, '') || 0),
    };

    try {
      await api.put(`/pricing/${editingItem.id}`, payload);
      success("Harga berhasil diperbarui! 💰");
      setEditingItem(null);
      fetchPricing();
    } catch (err) {
      error(err.response?.data?.message || "Terjadi kesalahan server.");
    }
  };

  const formatInputPrice = (value) => {
    const numberString = value.replace(/[^0-9]/g, "");
    return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const handleDelete = async (id, tld) => {
    const isConfirmed = await confirm({
        title: "Hapus TLD",
        message: `Hapus TLD ${tld}? Fitur ini akan menghilangkan opsi domain tersebut dari pelanggan.`,
        type: "danger",
        confirmText: "Ya, Hapus"
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/pricing/${id}`);
      success("TLD berhasil dihapus.");
      fetchPricing();
    } catch (err) {
      error(err.response?.data?.message || "Terjadi kesalahan server.");
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] relative">
      {/* 1. Header Removed */}
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
            <button 
                onClick={handleSync}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
                disabled={loading}
            >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Prices
            </button>
            <button 
                onClick={() => setIsAdding(true)}
                className="px-5 py-2.5 bg-[#F97316] text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition shadow-lg shadow-orange-600/20"
            >
                Tambah TLD Baru
            </button>
        </div>
      </div>

      {/* 2. Table Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-8 py-5">Extension</th>
                <th className="px-8 py-5 text-right">Daftar</th>
                <th className="px-8 py-5 text-right">Transfer</th>
                <th className="px-8 py-5 text-right">Perpanjang</th>
                <th className="px-8 py-5 text-right">Restore</th>
                <th className="px-8 py-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {loading ? (
                 <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400 italic font-bold">Memuat data harga...</td></tr>
              ) : pricing.length === 0 ? (
                 <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400 italic font-bold">Belum ada data pricing. Silakan Sync.</td></tr>
              ) : pricing.map((p) => {
                  const cost = parseFloat(p.cost_register || 0);
                  const price = parseFloat(p.price_register || 0);
                  const margin = price - cost;
                  const marginPercent = cost > 0 ? ((margin / cost) * 100).toFixed(1) : "0";

                  const costT = parseFloat(p.cost_transfer || 0);
                  const priceT = parseFloat(p.price_transfer || 0);
                  const marginT = priceT - costT;
                  const marginPercentT = costT > 0 ? ((marginT / costT) * 100).toFixed(1) : "0";

                  const costRen = parseFloat(p.cost_renew || 0);
                  const priceRen = parseFloat(p.price_renew || 0);
                  const marginRen = priceRen - costRen;
                  const marginPercentRen = costRen > 0 ? ((marginRen / costRen) * 100).toFixed(1) : "0";

                  const costRes = parseFloat(p.cost_restore || 0);
                  const priceRes = parseFloat(p.price_restore || 0);
                  const marginRes = priceRes - costRes;
                  const marginPercentRes = costRes > 0 ? ((marginRes / costRes) * 100).toFixed(1) : "0";
                  
                  return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="text-lg font-extrabold text-slate-900 tracking-tighter">{p.tld}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                      <div className="font-bold text-slate-800">
                        {p.discount_price_reg > 0 && parseFloat(p.discount_price_reg) < parseFloat(p.price_register) ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 line-through leading-none">{formatRupiah(price)}</span>
                            <span className="text-[#F97316]">{formatRupiah(p.discount_price_reg)}</span>
                          </div>
                        ) : formatRupiah(price)}
                      </div>
                      <div className={`text-[10px] font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {margin >= 0 ? '+' : ''}{formatRupiah(margin)} ({marginPercent}%)
                      </div>
                  </td>
                  <td className="px-8 py-5 text-right font-mono">
                      <div className="font-bold text-slate-800">{formatRupiah(p.price_transfer)}</div>
                      <div className={`text-[10px] font-bold ${marginT >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {marginT >= 0 ? '+' : ''}{formatRupiah(marginT)} ({marginPercentT}%)
                      </div>
                  </td>
                  <td className="px-8 py-5 text-right font-mono">
                      <div className="font-bold text-slate-800">{formatRupiah(p.price_renew)}</div>
                      <div className={`text-[10px] font-bold ${marginRen >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {marginRen >= 0 ? '+' : ''}{formatRupiah(marginRen)} ({marginPercentRen}%)
                      </div>
                  </td>
                  <td className="px-8 py-5 text-right font-mono">
                      <div className="font-bold text-slate-800">{formatRupiah(p.price_restore)}</div>
                      <div className={`text-[10px] font-bold ${marginRes >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {marginRes >= 0 ? '+' : ''}{formatRupiah(marginRes)} ({marginPercentRes}%)
                      </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => openEditModal(p)}
                        className="p-2 bg-white text-slate-400 rounded-lg hover:bg-orange-50 hover:text-[#F97316] border border-slate-100 transition shadow-sm"
                        title="Edit Semua Harga"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id, p.tld)}
                        className="p-2 bg-white text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 border border-slate-100 transition shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                  );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. EDIT MODAL (Large) */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-8 flex-shrink-0">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Atur Harga TLD: <span className="text-[#F97316]">{editingItem.tld}</span></h2>
                  <p className="text-slate-500 font-medium">Sesuaikan harga jual untuk berbagai tipe transaksi domain.</p>
                </div>
                <button 
                  onClick={() => setEditingItem(null)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Scrollable Area for Grid */}
            <div className="px-6 md:px-8 pb-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* 1: Register */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
                  <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-widest">Daftar Baru (Register)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Tahun Pertama</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modal / Cost</label>
                          <input 
                            type="text" value={editForm.cost_register} onChange={(e) => setEditForm({...editForm, cost_register: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-blue-500 transition" placeholder="Rp 0"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                              <span>Jual / Price</span>
                              <span className={parseInt(editForm.price_register.replace(/\./g, '')||0) - parseInt(editForm.cost_register.replace(/\./g, '')||0) >= 0 ? "text-green-500" : "text-red-500"}>
                                  Margin: {formatRupiah(parseInt(editForm.price_register.replace(/\./g, '')||0) - parseInt(editForm.cost_register.replace(/\./g, '')||0))}
                              </span>
                          </label>
                          <input 
                            type="text" value={editForm.price_register} onChange={(e) => setEditForm({...editForm, price_register: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-base font-bold text-slate-900 outline-none focus:border-[#F97316] ring-1 ring-transparent focus:ring-orange-100 transition shadow-inner" placeholder="Rp 0"
                          />
                      </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200/60">
                      <label className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block mb-1.5 flex justify-between">
                          <span>Harga Promo Pendaftaran (Opsional)</span>
                          <span className={parseInt(editForm.discount_price_reg.replace(/\./g, '')||0) > 0 && parseInt(editForm.discount_price_reg.replace(/\./g, '')||0) - parseInt(editForm.cost_register.replace(/\./g, '')||0) < 0 ? "text-red-500" : "text-green-600"}>
                              {parseInt(editForm.discount_price_reg.replace(/\./g, '')||0) > 0 ? "Margin: " + formatRupiah(parseInt(editForm.discount_price_reg.replace(/\./g, '')||0) - parseInt(editForm.cost_register.replace(/\./g, '')||0)) : ""}
                          </span>
                      </label>
                      <input 
                        type="text" value={editForm.discount_price_reg} onChange={(e) => setEditForm({...editForm, discount_price_reg: formatInputPrice(e.target.value)})}
                        className="w-full bg-orange-50/50 border border-orange-200 rounded-lg px-4 py-2.5 text-sm font-bold text-orange-700 outline-none focus:border-orange-500 transition" placeholder="0 = Nonaktif"
                      />
                  </div>
                </div>

                {/* 2: Transfer */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                  <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-widest">Pindah Domain (Transfer)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Perpanjang Otomatis 1 Tahun</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modal / Cost</label>
                          <input 
                            type="text" value={editForm.cost_transfer} onChange={(e) => setEditForm({...editForm, cost_transfer: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 transition" placeholder="Rp 0"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                              <span>Jual / Price</span>
                              <span className={parseInt(editForm.price_transfer.replace(/\./g, '')||0) - parseInt(editForm.cost_transfer.replace(/\./g, '')||0) >= 0 ? "text-green-500" : "text-red-500"}>
                                  Margin: {formatRupiah(parseInt(editForm.price_transfer.replace(/\./g, '')||0) - parseInt(editForm.cost_transfer.replace(/\./g, '')||0))}
                              </span>
                          </label>
                          <input 
                            type="text" value={editForm.price_transfer} onChange={(e) => setEditForm({...editForm, price_transfer: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-base font-bold text-slate-900 outline-none focus:border-[#F97316] ring-1 ring-transparent focus:ring-orange-100 transition shadow-inner" placeholder="Rp 0"
                          />
                      </div>
                  </div>
                </div>

                {/* 3: Renew */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
                  <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-widest">Perpanjangan (Renew)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Langganan Rutin Tahunan</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modal / Cost</label>
                          <input 
                            type="text" value={editForm.cost_renew} onChange={(e) => setEditForm({...editForm, cost_renew: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-purple-500 transition" placeholder="Rp 0"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                              <span>Jual / Price</span>
                              <span className={parseInt(editForm.price_renew.replace(/\./g, '')||0) - parseInt(editForm.cost_renew.replace(/\./g, '')||0) >= 0 ? "text-green-500" : "text-red-500"}>
                                  Margin: {formatRupiah(parseInt(editForm.price_renew.replace(/\./g, '')||0) - parseInt(editForm.cost_renew.replace(/\./g, '')||0))}
                              </span>
                          </label>
                          <input 
                            type="text" value={editForm.price_renew} onChange={(e) => setEditForm({...editForm, price_renew: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-base font-bold text-slate-900 outline-none focus:border-[#F97316] ring-1 ring-transparent focus:ring-orange-100 transition shadow-inner" placeholder="Rp 0"
                          />
                      </div>
                  </div>
                </div>

                {/* 4: Restore */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-rose-300 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-rose-500/10 transition-colors"></div>
                  <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-widest">Pemulihan (Restore)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Penalti Keterlambatan Perpanjang</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modal / Cost</label>
                          <input 
                            type="text" value={editForm.cost_restore} onChange={(e) => setEditForm({...editForm, cost_restore: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-rose-500 transition" placeholder="Rp 0"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                              <span>Jual / Price</span>
                              <span className={parseInt(editForm.price_restore.replace(/\./g, '')||0) - parseInt(editForm.cost_restore.replace(/\./g, '')||0) >= 0 ? "text-green-500" : "text-red-500"}>
                                  Margin: {formatRupiah(parseInt(editForm.price_restore.replace(/\./g, '')||0) - parseInt(editForm.cost_restore.replace(/\./g, '')||0))}
                              </span>
                          </label>
                          <input 
                            type="text" value={editForm.price_restore} onChange={(e) => setEditForm({...editForm, price_restore: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-base font-bold text-slate-900 outline-none focus:border-[#F97316] ring-1 ring-transparent focus:ring-orange-100 transition shadow-inner" placeholder="Rp 0"
                          />
                      </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Form */}
            <div className="p-6 md:p-8 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setEditingItem(null)}
                  className="px-6 py-3 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300 transition"
                >
                  Batal
                </button>
                <button 
                  onClick={handleUpdate}
                  className="px-8 py-3 bg-[#F97316] text-white rounded-lg font-bold hover:bg-slate-900 transition shadow-lg shadow-orange-500/20"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADD MODAL (Reuse Large Modal Style) */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-8 flex-shrink-0">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Tambah <span className="text-[#F97316]">TLD Baru</span></h2>
                  <p className="text-slate-500 font-medium">Tentukan harga jual untuk ekstensi domain baru.</p>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-100 max-w-md">
                 <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-2">Pilih Ekstensi</label>
                 <CustomSelect
                    value={addForm.tld}
                    onChange={(val) => setAddForm({...addForm, tld: val})}
                    options={availableTLDs}
                    placeholder="Contoh: .com"
                 />
              </div>
            </div>

            {/* Scrollable Area for Grid */}
            <div className="px-6 md:px-8 pb-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* 1: Register */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
                  <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-widest">Daftar Baru (Register)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Tahun Pertama</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modal / Cost</label>
                          <input 
                            type="text" value={addForm.cost_register} onChange={(e) => setAddForm({...addForm, cost_register: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-blue-500 transition" placeholder="Rp 0"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                              <span>Jual / Price</span>
                              <span className={parseInt(addForm.price_register.replace(/\./g, '')||0) - parseInt(addForm.cost_register.replace(/\./g, '')||0) >= 0 ? "text-green-500" : "text-red-500"}>
                                  Margin: {formatRupiah(parseInt(addForm.price_register.replace(/\./g, '')||0) - parseInt(addForm.cost_register.replace(/\./g, '')||0))}
                              </span>
                          </label>
                          <input 
                            type="text" value={addForm.price_register} onChange={(e) => setAddForm({...addForm, price_register: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-base font-bold text-slate-900 outline-none focus:border-[#F97316] ring-1 ring-transparent focus:ring-orange-100 transition shadow-inner" placeholder="Rp 0"
                          />
                      </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200/60">
                      <label className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block mb-1.5 flex justify-between">
                          <span>Harga Promo Pendaftaran (Opsional)</span>
                          <span className={parseInt(addForm.discount_price_reg.replace(/\./g, '')||0) > 0 && parseInt(addForm.discount_price_reg.replace(/\./g, '')||0) - parseInt(addForm.cost_register.replace(/\./g, '')||0) < 0 ? "text-red-500" : "text-green-600"}>
                              {parseInt(addForm.discount_price_reg.replace(/\./g, '')||0) > 0 ? "Margin: " + formatRupiah(parseInt(addForm.discount_price_reg.replace(/\./g, '')||0) - parseInt(addForm.cost_register.replace(/\./g, '')||0)) : ""}
                          </span>
                      </label>
                      <input 
                        type="text" value={addForm.discount_price_reg} onChange={(e) => setAddForm({...addForm, discount_price_reg: formatInputPrice(e.target.value)})}
                        className="w-full bg-orange-50/50 border border-orange-200 rounded-lg px-4 py-2.5 text-sm font-bold text-orange-700 outline-none focus:border-orange-500 transition" placeholder="0 = Nonaktif"
                      />
                  </div>
                </div>

                {/* 2: Transfer */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                  <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-widest">Pindah Domain (Transfer)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Perpanjang Otomatis 1 Tahun</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modal / Cost</label>
                          <input 
                            type="text" value={addForm.cost_transfer} onChange={(e) => setAddForm({...addForm, cost_transfer: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-emerald-500 transition" placeholder="Rp 0"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                              <span>Jual / Price</span>
                              <span className={parseInt(addForm.price_transfer.replace(/\./g, '')||0) - parseInt(addForm.cost_transfer.replace(/\./g, '')||0) >= 0 ? "text-green-500" : "text-red-500"}>
                                  Margin: {formatRupiah(parseInt(addForm.price_transfer.replace(/\./g, '')||0) - parseInt(addForm.cost_transfer.replace(/\./g, '')||0))}
                              </span>
                          </label>
                          <input 
                            type="text" value={addForm.price_transfer} onChange={(e) => setAddForm({...addForm, price_transfer: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-base font-bold text-slate-900 outline-none focus:border-[#F97316] ring-1 ring-transparent focus:ring-orange-100 transition shadow-inner" placeholder="Rp 0"
                          />
                      </div>
                  </div>
                </div>

                {/* 3: Renew */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
                  <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-widest">Perpanjangan (Renew)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Langganan Rutin Tahunan</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modal / Cost</label>
                          <input 
                            type="text" value={addForm.cost_renew} onChange={(e) => setAddForm({...addForm, cost_renew: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-purple-500 transition" placeholder="Rp 0"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                              <span>Jual / Price</span>
                              <span className={parseInt(addForm.price_renew.replace(/\./g, '')||0) - parseInt(addForm.cost_renew.replace(/\./g, '')||0) >= 0 ? "text-green-500" : "text-red-500"}>
                                  Margin: {formatRupiah(parseInt(addForm.price_renew.replace(/\./g, '')||0) - parseInt(addForm.cost_renew.replace(/\./g, '')||0))}
                              </span>
                          </label>
                          <input 
                            type="text" value={addForm.price_renew} onChange={(e) => setAddForm({...addForm, price_renew: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-base font-bold text-slate-900 outline-none focus:border-[#F97316] ring-1 ring-transparent focus:ring-orange-100 transition shadow-inner" placeholder="Rp 0"
                          />
                      </div>
                  </div>
                </div>

                {/* 4: Restore */}
                <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 hover:border-rose-300 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-rose-500/10 transition-colors"></div>
                  <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-widest">Pemulihan (Restore)</h4>
                      <p className="text-[10px] font-bold text-slate-400">Penalti Keterlambatan Perpanjang</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modal / Cost</label>
                          <input 
                            type="text" value={addForm.cost_restore} onChange={(e) => setAddForm({...addForm, cost_restore: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-rose-500 transition" placeholder="Rp 0"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                              <span>Jual / Price</span>
                              <span className={parseInt(addForm.price_restore.replace(/\./g, '')||0) - parseInt(addForm.cost_restore.replace(/\./g, '')||0) >= 0 ? "text-green-500" : "text-red-500"}>
                                  Margin: {formatRupiah(parseInt(addForm.price_restore.replace(/\./g, '')||0) - parseInt(addForm.cost_restore.replace(/\./g, '')||0))}
                              </span>
                          </label>
                          <input 
                            type="text" value={addForm.price_restore} onChange={(e) => setAddForm({...addForm, price_restore: formatInputPrice(e.target.value)})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-base font-bold text-slate-900 outline-none focus:border-[#F97316] ring-1 ring-transparent focus:ring-orange-100 transition shadow-inner" placeholder="Rp 0"
                          />
                      </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Form */}
            <div className="p-6 md:p-8 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 bg-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-300 transition"
                >
                  Batal
                </button>
                <button 
                  onClick={handleAdd}
                  className="px-8 py-3 bg-[#F97316] text-white rounded-lg font-bold hover:bg-slate-900 transition shadow-lg shadow-orange-500/20"
                >
                  Tambahkan TLD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPricing;
