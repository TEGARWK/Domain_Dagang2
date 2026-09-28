import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import api from "../../services/api";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";

const AdminPricing = () => {
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    price_register: "", price_transfer: "", price_renew: "", price_restore: "",
    cost_register: "", cost_transfer: "", cost_renew: "", cost_restore: "",
    margin: 1.2,
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    tld: "", price_register: "", price_transfer: "", price_renew: "", price_restore: "",
    cost_register: "", cost_transfer: "", cost_renew: "", cost_restore: "",
    margin: 1.2,
  });

  const availableTLDs = [".com", ".id", ".net", ".org", ".info", ".biz", ".co.id", ".web.id", ".my.id", ".ac.id", ".xyz", ".top", ".shop", ".io", ".co", ".me", ".us", ".uk"];

  useEffect(() => { fetchPricing(); }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const res = await api.get("/pricing/all");
      setPricing(res.data);
    } catch (err) {
      console.error("Fetch pricing error:", err);
      error("Gagal mengambil data harga.");
    } finally { setLoading(false); }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await api.post("/pricing/sync");
      success(res.data.message || "Sinkronisasi berhasil!");
      fetchPricing();
    } catch (err) {
      error(err.response?.data?.message || "Gagal sinkronisasi.");
    } finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!addForm.tld) return warning("TLD harus diisi!");
    const payload = {
      tld: addForm.tld,
      price_register: parseInt(addForm.price_register.replace(/\./g, '') || 0),
      price_transfer: parseInt(addForm.price_transfer.replace(/\./g, '') || 0),
      price_renew: parseInt(addForm.price_renew.replace(/\./g, '') || 0),
      price_restore: parseInt(addForm.price_restore.replace(/\./g, '') || 0),
      cost_register: parseInt(addForm.cost_register.replace(/\./g, '') || 0),
      cost_transfer: parseInt(addForm.cost_transfer.replace(/\./g, '') || 0),
      cost_renew: parseInt(addForm.cost_renew.replace(/\./g, '') || 0),
      cost_restore: parseInt(addForm.cost_restore.replace(/\./g, '') || 0),
      margin: parseFloat(addForm.margin) || 1.2,
    };
    try {
      await api.post("/pricing/add", payload);
      success("TLD Baru berhasil ditambahkan!");
      setIsAdding(false);
      setAddForm({ tld: "", price_register: "", price_transfer: "", price_renew: "", price_restore: "", cost_register: "", cost_transfer: "", cost_renew: "", cost_restore: "", margin: 1.2 });
      fetchPricing();
    } catch (err) {
      error(err.response?.data?.message || "Terjadi kesalahan server.");
    }
  };

  const openEditModal = (p) => {
    setEditingItem(p);
    const margin = parseFloat(p.margin) || 1.2;
    const fmt = (v) => Math.floor(v || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setEditForm({
      price_register: fmt(p.price_register),
      price_transfer: fmt(p.price_transfer),
      price_renew: fmt(p.price_renew),
      price_restore: fmt(p.price_restore),
      cost_register: fmt(p.cost_register),
      cost_transfer: fmt(p.cost_transfer),
      cost_renew: fmt(p.cost_renew),
      cost_restore: fmt(p.cost_restore),
      margin: margin,
    });
  };

  const handleUpdate = async () => {
    const parse = (v) => parseInt((v || "0").replace(/\./g, ''), 10);
    const payload = {
      price_register: parse(editForm.price_register),
      price_transfer: parse(editForm.price_transfer),
      price_renew: parse(editForm.price_renew),
      price_restore: parse(editForm.price_restore),
      margin: parseFloat(editForm.margin) || 1.2,
    };
    try {
      await api.put(`/pricing/${editingItem.id}`, payload);
      success("Harga berhasil diperbarui!");
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

  const formatRupiah = (num) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(num || 0);

  const calculateMargin = (cost, price) => {
    if (!cost || cost === 0) return 0;
    return ((price / cost - 1) * 100).toFixed(0);
  };

  const handleDelete = async (id, tld) => {
    const isConfirmed = await confirm({
      title: "Hapus TLD",
      message: `Hapus TLD ${tld}? Fitur ini akan menghilangkan opsi domain tersebut dari pelanggan.`,
      type: "danger", confirmText: "Ya, Hapus"
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

  const handleExportExcel = () => {
    const exportData = pricing.map(p => ({
      'TLD': p.tld,
      'Harga Modal': formatRupiah(p.cost_register),
      'Harga Jual': formatRupiah(p.price_register),
      'Margin %': ((parseFloat(p.margin || 1) - 1) * 100).toFixed(0) + '%',
      'Harga Transfer': formatRupiah(p.price_transfer),
      'Harga Perpanjang': formatRupiah(p.price_renew),
      'Harga Restore': formatRupiah(p.price_restore),
    }));
    exportToExcel(exportData, 'Daftar_Harga_TLD', 'Pricing');
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            Pricing Management
          </p>
          <h2 className="text-base font-bold text-neutral-800 tracking-tight">Daftar Harga TLD</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} disabled={loading} className="btn btn-ghost btn-sm">
            <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>sync</span>
            Sync
          </button>
          <button onClick={handleExportExcel} className="btn btn-ghost btn-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Export
          </button>
          <button onClick={() => setIsAdding(true)} className="btn btn-primary btn-sm">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Tambah TLD
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="card" style={{ background: "var(--color-blue-50)", borderColor: "var(--color-blue-200)" }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">info</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-800">Cara Kerja Harga</h4>
            <p className="text-[11px] text-blue-700 font-semibold mt-1 leading-relaxed">
              <span className="font-bold">Harga Modal</span> (dari Daftarnama) adalah harga dasar yang tidak bisa diubah.
              <span className="font-bold"> Margin %</span> menentukan markup harga jual.
              Contoh: Modal Rp 100.000 + Margin 20% = Harga Jual Rp 120.000
            </p>
          </div>
        </div>
      </div>

      {/* Table / Mobile Cards */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Mobile */}
        <div className="block sm:hidden divide-y divide-neutral-100">
          {loading ? (
            <div className="empty-state"><p>Memuat data harga...</p></div>
          ) : pricing.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><span className="material-symbols-outlined">monetization_on</span></div>
              <p>Belum ada data pricing. Silakan Sync.</p>
            </div>
          ) : pricing.map((p) => {
            const margin = ((parseFloat(p.margin || 1) - 1) * 100).toFixed(0);
            return (
              <div key={p.id} className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-neutral-800">{p.tld}</span>
                    <span className="badge badge-success">+{margin}%</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(p)} className="btn btn-ghost btn-icon btn-sm">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDelete(p.id, p.tld)} className="btn btn-ghost btn-icon btn-sm" style={{ color: "var(--color-rose-500)" }}>
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Harga Modal</p>
                    <p className="text-xs font-bold text-neutral-500">{formatRupiah(p.cost_register)}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Harga Jual</p>
                    <p className="text-xs font-bold text-emerald-700">{formatRupiah(p.price_register)}</p>
                  </div>
                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Transfer</p>
                    <p className="text-xs font-bold text-neutral-700">{formatRupiah(p.price_transfer)}</p>
                  </div>
                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Perpanjang</p>
                    <p className="text-xs font-bold text-neutral-700">{formatRupiah(p.price_renew)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50 border-b border-neutral-100">
                <th className="px-5 py-3">Extension</th>
                <th className="px-5 py-3 text-right">Harga Modal</th>
                <th className="px-5 py-3 text-right">Margin</th>
                <th className="px-5 py-3 text-right">Harga Jual</th>
                <th className="px-5 py-3 text-right">Transfer</th>
                <th className="px-5 py-3 text-right">Perpanjang</th>
                <th className="px-5 py-3 text-right">Restore</th>
                <th className="px-5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {loading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-5 w-16 bg-neutral-100 rounded" /></td>
                    <td className="px-5 py-4 text-right"><div className="h-4 w-20 bg-neutral-50 rounded ml-auto" /></td>
                    <td className="px-5 py-4 text-right"><div className="h-4 w-12 bg-neutral-50 rounded ml-auto" /></td>
                    <td className="px-5 py-4 text-right"><div className="h-4 w-20 bg-neutral-50 rounded ml-auto" /></td>
                    <td className="px-5 py-4 text-right"><div className="h-4 w-16 bg-neutral-50 rounded ml-auto" /></td>
                    <td className="px-5 py-4 text-right"><div className="h-4 w-16 bg-neutral-50 rounded ml-auto" /></td>
                    <td className="px-5 py-4 text-right"><div className="h-4 w-16 bg-neutral-50 rounded ml-auto" /></td>
                    <td className="px-5 py-4 text-center"><div className="h-8 w-16 bg-neutral-100 rounded-lg mx-auto" /></td>
                  </tr>
                ))
              ) : pricing.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-12 text-neutral-400 text-xs font-semibold">Belum ada data pricing. Silakan Sync.</td></tr>
              ) : pricing.map((p) => {
                const margin = ((parseFloat(p.margin || 1) - 1) * 100).toFixed(0);
                const isPositiveMargin = parseFloat(margin) > 0;
                return (
                  <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="text-base font-bold text-neutral-800">{p.tld}</span>
                    </td>
                    <td className="px-5 py-4 text-right text-xs font-bold text-neutral-500">
                      {formatRupiah(p.cost_register)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`badge ${isPositiveMargin ? 'badge-success' : 'badge-info'}`}>
                        {isPositiveMargin ? '+' : ''}{margin}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-xs font-bold text-emerald-600">
                      {formatRupiah(p.price_register)}
                    </td>
                    <td className="px-5 py-4 text-right text-xs font-semibold text-neutral-700">
                      {formatRupiah(p.price_transfer)}
                    </td>
                    <td className="px-5 py-4 text-right text-xs font-semibold text-neutral-700">
                      {formatRupiah(p.price_renew)}
                    </td>
                    <td className="px-5 py-4 text-right text-xs font-semibold text-neutral-700">
                      {formatRupiah(p.price_restore)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openEditModal(p)} className="btn btn-ghost btn-icon btn-sm" title="Edit Harga">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onClick={() => handleDelete(p.id, p.tld)} className="btn btn-ghost btn-icon btn-sm" title="Hapus" style={{ color: "var(--color-rose-500)" }}>
                          <span className="material-symbols-outlined text-sm">delete</span>
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
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingItem(null); }}>
          <div className="modal max-w-5xl">
            <div className="modal-header">
              <div>
                <h3>Atur Harga: <span className="text-primary-500">{editingItem.tld}</span></h3>
                <p className="text-[11px] font-semibold text-neutral-500 mt-0.5">Update margin untuk menghitung otomatis harga jual.</p>
              </div>
              <button onClick={() => setEditingItem(null)} style={{ width: 32, height: 32, background: "var(--color-neutral-50)", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-neutral-400)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="modal-body">
              {/* Top Row: Margin + profit summary */}
              <div className="flex items-center gap-5 mb-5">
                <div className="card flex-1" style={{ background: "var(--color-emerald-50)", borderColor: "var(--color-emerald-200)", padding: "14px 20px" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">trending_up</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Margin</span>
                      <input type="number" min="0" max="500" step="1"
                        value={Math.round((parseFloat(editForm.margin || 1.2) - 1) * 100)}
                        onChange={(e) => { const pct = parseFloat(e.target.value) || 0; setEditForm({...editForm, margin: 1 + (pct / 100)}); }}
                        className="form-input w-20 text-center text-sm font-bold"
                        style={{ height: 34 }}
                      />
                      <span className="text-emerald-700 font-bold text-xs">%</span>
                    </div>
                    <div className="text-[11px] text-emerald-600 font-semibold">
                      = <span className="font-bold">{formatRupiah(Math.round(parseInt(editForm.cost_register?.replace(/\./g,'') || 0) * (parseFloat(editForm.margin) || 1.2)))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Grid: 4 columns side by side */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Register", icon: "add_circle", bg: "#EFF6FF", ic: "#2563EB", cost: editForm.cost_register, price: editForm.price_register, set: (v) => setEditForm({...editForm, price_register: v}) },
                  { label: "Transfer", icon: "move_up", bg: "#ECFDF5", ic: "#059669", cost: editForm.cost_transfer, price: editForm.price_transfer, set: (v) => setEditForm({...editForm, price_transfer: v}) },
                  { label: "Renew", icon: "history", bg: "#F5F3FF", ic: "#7C3AED", cost: editForm.cost_renew, price: editForm.price_renew, set: (v) => setEditForm({...editForm, price_renew: v}) },
                  { label: "Restore", icon: "restart_alt", bg: "#FFF1F2", ic: "#E11D48", cost: editForm.cost_restore, price: editForm.price_restore, set: (v) => setEditForm({...editForm, price_restore: v}) },
                ].map((c) => (
                  <div key={c.label} className="card" style={{ padding: "14px 16px" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: c.bg, color: c.ic, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{c.icon}</span>
                      </div>
                      <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">{c.label}</span>
                    </div>
                    <div className="text-[10px] font-bold text-neutral-400 mb-1">Modal</div>
                    <input type="text" value={c.cost} readOnly disabled style={{ height: 34, fontSize: 12, background: "var(--color-neutral-100)", cursor: "not-allowed", color: "var(--color-neutral-500)", marginBottom: 8, padding: "0 10px", width: "100%", borderRadius: "var(--radius-default)", border: "1px solid var(--color-neutral-200)", outline: "none" }} />
                    <div className="text-[10px] font-bold text-emerald-600 mb-1">Jual</div>
                    <input type="text" value={c.price} onChange={(e) => c.set(formatInputPrice(e.target.value))} style={{ height: 34, fontSize: 12, padding: "0 10px", width: "100%", borderRadius: "var(--radius-default)", border: "1px solid var(--color-neutral-200)", outline: "none", background: "#fff" }} placeholder="Rp 0" />
                  </div>
                ))}
              </div>

              {/* Profit summary row */}
              <div className="flex items-center gap-4 mt-4 text-[11px] font-semibold text-neutral-500">
                <span>Register: <span className="font-bold text-emerald-600">Rp {formatRupiah(parseInt(editForm.price_register?.replace(/\./g,'') || 0) - parseInt(editForm.cost_register?.replace(/\./g,'') || 0))}</span></span>
                <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                <span>Transfer: <span className="font-bold text-emerald-600">Rp {formatRupiah(parseInt(editForm.price_transfer?.replace(/\./g,'') || 0) - parseInt(editForm.cost_transfer?.replace(/\./g,'') || 0))}</span></span>
                <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                <span>Renew: <span className="font-bold text-emerald-600">Rp {formatRupiah(parseInt(editForm.price_renew?.replace(/\./g,'') || 0) - parseInt(editForm.cost_renew?.replace(/\./g,'') || 0))}</span></span>
                <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                <span>Restore: <span className="font-bold text-emerald-600">Rp {formatRupiah(parseInt(editForm.price_restore?.replace(/\./g,'') || 0) - parseInt(editForm.cost_restore?.replace(/\./g,'') || 0))}</span></span>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setEditingItem(null)} className="btn btn-ghost">Batal</button>
              <button onClick={handleUpdate} className="btn btn-primary">Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {isAdding && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsAdding(false); }}>
          <div className="modal max-w-4xl">
            <div className="modal-header">
              <div>
                <h3>Tambah <span className="text-primary-500">TLD Baru</span></h3>
                <p className="text-[11px] font-semibold text-neutral-500 mt-0.5">Pilih TLD dan tentukan harga jual.</p>
              </div>
              <button onClick={() => setIsAdding(false)} style={{ width: 32, height: 32, background: "var(--color-neutral-50)", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-neutral-400)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="modal-body">
              {/* Top: TLD + Margin side by side */}
              <div className="flex items-center gap-4 mb-5">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">Ekstensi Domain</label>
                  <select className="form-select" value={addForm.tld} onChange={(e) => setAddForm({...addForm, tld: e.target.value})}>
                    <option value="">Pilih TLD...</option>
                    {availableTLDs.map(tld => <option key={tld} value={tld}>{tld}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3" style={{ padding: "10px 16px", background: "var(--color-emerald-50)", borderRadius: "var(--radius-default)", border: "1px solid var(--color-emerald-200)" }}>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Margin</span>
                  <input type="number" min="0" max="500" step="1"
                    value={Math.round((parseFloat(addForm.margin || 1.2) - 1) * 100)}
                    onChange={(e) => { const pct = parseFloat(e.target.value) || 0; setAddForm({...addForm, margin: 1 + (pct / 100)}); }}
                    style={{ width: 64, height: 32, borderRadius: 6, border: "1px solid var(--color-emerald-200)", textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--color-emerald-800)", outline: "none", background: "#fff" }}
                  />
                  <span className="text-emerald-700 font-bold text-xs">%</span>
                </div>
              </div>

              {/* Price Grid: 5 columns side by side */}
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Modal</div>
                  <input type="text" value={addForm.cost_register} onChange={(e) => setAddForm({...addForm, cost_register: formatInputPrice(e.target.value)})} style={{ height: 34, fontSize: 12, padding: "0 10px", width: "100%", borderRadius: "var(--radius-default)", border: "1px solid var(--color-neutral-200)", outline: "none", background: "#fff" }} placeholder="Rp 0" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">Jual</div>
                  <input type="text" value={addForm.price_register} onChange={(e) => setAddForm({...addForm, price_register: formatInputPrice(e.target.value)})} style={{ height: 34, fontSize: 12, padding: "0 10px", width: "100%", borderRadius: "var(--radius-default)", border: "1px solid var(--color-neutral-200)", outline: "none", background: "#fff" }} placeholder="Rp 0" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Transfer</div>
                  <input type="text" value={addForm.price_transfer} onChange={(e) => setAddForm({...addForm, price_transfer: formatInputPrice(e.target.value)})} style={{ height: 34, fontSize: 12, padding: "0 10px", width: "100%", borderRadius: "var(--radius-default)", border: "1px solid var(--color-neutral-200)", outline: "none", background: "#fff" }} placeholder="Rp 0" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Perpanjang</div>
                  <input type="text" value={addForm.price_renew} onChange={(e) => setAddForm({...addForm, price_renew: formatInputPrice(e.target.value)})} style={{ height: 34, fontSize: 12, padding: "0 10px", width: "100%", borderRadius: "var(--radius-default)", border: "1px solid var(--color-neutral-200)", outline: "none", background: "#fff" }} placeholder="Rp 0" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Restore</div>
                  <input type="text" value={addForm.price_restore} onChange={(e) => setAddForm({...addForm, price_restore: formatInputPrice(e.target.value)})} style={{ height: 34, fontSize: 12, padding: "0 10px", width: "100%", borderRadius: "var(--radius-default)", border: "1px solid var(--color-neutral-200)", outline: "none", background: "#fff" }} placeholder="Rp 0" />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setIsAdding(false)} className="btn btn-ghost">Batal</button>
              <button onClick={handleAdd} className="btn btn-primary">Tambahkan TLD</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPricing;
