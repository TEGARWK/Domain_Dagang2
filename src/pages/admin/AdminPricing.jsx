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
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    price_register: "",
    price_transfer: "",
    price_renew: "",
    price_restore: "",
    // costs are kept in background
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
      // Mirror to cost to keep DB happy
      cost_register: parseInt(addForm.price_register.replace(/\./g, '') || 0),
      cost_transfer: parseInt(addForm.price_transfer.replace(/\./g, '') || 0),
      cost_renew: parseInt(addForm.price_renew.replace(/\./g, '') || 0),
      cost_restore: parseInt(addForm.price_restore.replace(/\./g, '') || 0)
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
      // Mirror to cost or keep existing
      cost_register: parseInt(editForm.price_register.replace(/\./g, '') || 0),
      cost_transfer: parseInt(editForm.price_transfer.replace(/\./g, '') || 0),
      cost_renew: parseInt(editForm.price_renew.replace(/\./g, '') || 0),
      cost_restore: parseInt(editForm.price_restore.replace(/\./g, '') || 0),
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        {/* MOBILE CARDS */}
        <div className="block sm:hidden divide-y divide-slate-50">
          {loading ? (
            <div className="px-6 py-20 text-center text-slate-400 italic font-bold animate-pulse">Memuat data harga...</div>
          ) : pricing.length === 0 ? (
            <div className="px-6 py-20 text-center text-slate-400 italic font-bold">Belum ada data pricing.</div>
          ) : pricing.map((p) => {
            return (
              <div key={p.id} className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-black text-slate-900 tracking-tighter">{p.tld}</span>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(p)} className="p-2.5 bg-slate-50 text-slate-400 rounded-lg border border-slate-100 transition shadow-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(p.id, p.tld)} className="p-2.5 bg-slate-50 text-slate-400 rounded-lg border border-slate-100 transition shadow-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Daftar</p>
                    <p className="text-sm font-bold text-slate-800">{formatRupiah(p.price_register)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Perpanjang</p>
                    <p className="text-sm font-bold text-slate-800">{formatRupiah(p.price_renew)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transfer</p>
                    <p className="text-sm font-bold text-slate-800">{formatRupiah(p.price_transfer)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Restore</p>
                    <p className="text-sm font-bold text-slate-800">{formatRupiah(p.price_restore)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-8 py-5">Extension</th>
                <th className="px-8 py-5 text-right">Harga Daftar</th>
                <th className="px-8 py-5 text-right">Harga Transfer</th>
                <th className="px-8 py-5 text-right">Harga Perpanjang</th>
                <th className="px-8 py-5 text-right">Harga Restore</th>
                <th className="px-8 py-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {loading ? (
                 <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400 italic font-bold">Memuat data harga...</td></tr>
              ) : pricing.length === 0 ? (
                 <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400 italic font-bold">Belum ada data pricing. Silakan Sync.</td></tr>
              ) : pricing.map((p) => {
                  return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="text-lg font-extrabold text-slate-900 tracking-tighter">{p.tld}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                      <div className="font-bold text-slate-800">
                        {formatRupiah(p.price_register)}
                      </div>
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-slate-800">
                      {formatRupiah(p.price_transfer)}
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-slate-800">
                      {formatRupiah(p.price_renew)}
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-slate-800">
                      {formatRupiah(p.price_restore)}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => openEditModal(p)}
                        className="p-2 bg-white text-slate-400 rounded-lg hover:bg-orange-50 hover:text-[#F97316] border border-slate-100 transition shadow-sm"
                        title="Edit Harga"
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

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-8 flex-shrink-0 bg-white border-b border-slate-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Atur Harga TLD: <span className="text-[#F97316]">{editingItem.tld}</span></h2>
                  <p className="text-slate-500 font-medium">Input harga final sesuai instruksi manajemen.</p>
                </div>
                <button onClick={() => setEditingItem(null)} className="p-3 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 md:px-8 py-8 overflow-y-auto custom-scrollbar bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1: Register */}
                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <span className="material-symbols-outlined">add_circle</span>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em]">Pendaftaran Baru</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Register 1 Tahun</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Harga Jual Utama</label>
                          <input 
                            type="text" value={editForm.price_register} onChange={(e) => setEditForm({...editForm, price_register: formatInputPrice(e.target.value)})}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-lg font-black text-slate-900 outline-none focus:border-[#F97316] focus:bg-white transition" placeholder="Rp 0"
                          />
                      </div>
                  </div>
                </div>

                {/* 2: Transfer */}
                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <span className="material-symbols-outlined">move_up</span>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em]">Pindah Domain</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transfer + 1 Thn</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Harga Transfer</label>
                      <input 
                        type="text" value={editForm.price_transfer} onChange={(e) => setEditForm({...editForm, price_transfer: formatInputPrice(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-lg font-black text-slate-900 outline-none focus:border-[#F97316] focus:bg-white transition" placeholder="Rp 0"
                      />
                  </div>
                </div>

                {/* 3: Renew */}
                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <span className="material-symbols-outlined">history</span>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em]">Perpanjangan</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Renew 1 Tahun</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Harga Perpanjang</label>
                      <input 
                        type="text" value={editForm.price_renew} onChange={(e) => setEditForm({...editForm, price_renew: formatInputPrice(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-lg font-black text-slate-900 outline-none focus:border-[#F97316] focus:bg-white transition" placeholder="Rp 0"
                      />
                  </div>
                </div>

                {/* 4: Restore */}
                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <span className="material-symbols-outlined">restart_alt</span>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.2em]">Pemulihan</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Restore Penalty</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Harga Restore</label>
                      <input 
                        type="text" value={editForm.price_restore} onChange={(e) => setEditForm({...editForm, price_restore: formatInputPrice(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-lg font-black text-slate-900 outline-none focus:border-[#F97316] focus:bg-white transition" placeholder="Rp 0"
                      />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-slate-100 flex-shrink-0 bg-white">
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingItem(null)} className="px-8 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-200 transition">Batal</button>
                <button onClick={handleUpdate} className="px-10 py-3.5 bg-[#F97316] text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-900 transition shadow-lg shadow-orange-500/20">Simpan Perubahan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-8 flex-shrink-0 bg-white border-b border-slate-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Tambah <span className="text-[#F97316]">TLD Baru</span></h2>
                  <p className="text-slate-500 font-medium">Input harga pendaftaran sesuai kebijakan manajemen.</p>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-3 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 md:px-8 py-8 overflow-y-auto custom-scrollbar bg-slate-50/30">
               <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-3">Pilih Ekstensi Domain</label>
                    <CustomSelect
                        value={addForm.tld}
                        onChange={(val) => setAddForm({...addForm, tld: val})}
                        options={availableTLDs}
                        placeholder="Contoh: .com"
                    />
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 md:w-1/3">
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-tight mb-1">Informasi</p>
                    <p className="text-[9px] text-orange-800 font-medium leading-relaxed">Pilih TLD yang ingin didukung lalu atur harga pendaftarannya di bawah.</p>
                  </div>
               </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Harga Daftar</p>
                  <input 
                    type="text" value={addForm.price_register} onChange={(e) => setAddForm({...addForm, price_register: formatInputPrice(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-lg font-black text-slate-900 outline-none focus:border-[#F97316] focus:bg-white transition" placeholder="Rp 0"
                  />
                </div>
                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Harga Transfer</p>
                  <input 
                    type="text" value={addForm.price_transfer} onChange={(e) => setAddForm({...addForm, price_transfer: formatInputPrice(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-lg font-black text-slate-900 outline-none focus:border-[#F97316] focus:bg-white transition" placeholder="Rp 0"
                  />
                </div>
                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Harga Perpanjang</p>
                  <input 
                    type="text" value={addForm.price_renew} onChange={(e) => setAddForm({...addForm, price_renew: formatInputPrice(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-lg font-black text-slate-900 outline-none focus:border-[#F97316] focus:bg-white transition" placeholder="Rp 0"
                  />
                </div>
                <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Harga Restore</p>
                  <input 
                    type="text" value={addForm.price_restore} onChange={(e) => setAddForm({...addForm, price_restore: formatInputPrice(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-lg font-black text-slate-900 outline-none focus:border-[#F97316] focus:bg-white transition" placeholder="Rp 0"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-slate-100 flex-shrink-0 bg-white">
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsAdding(false)} className="px-8 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-200 transition">Batal</button>
                <button onClick={handleAdd} className="px-10 py-3.5 bg-[#F97316] text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-900 transition shadow-lg shadow-orange-500/20">Tambahkan TLD</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPricing;
