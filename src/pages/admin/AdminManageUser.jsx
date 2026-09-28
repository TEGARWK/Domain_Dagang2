import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import CustomSelect from "../../components/ui/CustomSelect";
import StatsCard from "../../components/ui/StatsCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { ActionButton } from "../../components/ui/ActionBar";

const SC = {
  sectionHeader: "text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2",
  dot: "w-1 h-4 rounded-full",
};

const AdminManageUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const confirm = useConfirm();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domains, setDomains] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [formData, setFormData] = useState({
    name: "", phone: "", bio: "", address: "", role: "member",
    address_line1: "", city: "", state: "", zip_code: "", country: "Indonesia",
  });

  useEffect(() => {
    fetchUserData();
    fetchUserDomains();
    fetchUserInvoices();
  }, [id]);

  const fetchUserData = async () => {
    try {
      const res = await api.get(`/users/${id}`);
      setUser(res.data);
      setFormData({
        name: res.data.name || "", phone: res.data.phone || "", bio: res.data.bio || "",
        address: res.data.address || "", role: res.data.role || "member",
        address_line1: res.data.address_line1 || "", city: res.data.city || "",
        state: res.data.state || "", zip_code: res.data.zip_code || "", country: res.data.country || "Indonesia",
      });
    } catch {
      error("Gagal memuat data user.");
      navigate("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDomains = async () => {
    try {
      const res = await api.get(`/domains/user/${id}`);
      setDomains(res.data);
    } catch {}
  };

  const fetchUserInvoices = async () => {
    try {
      const res = await api.get(`/billing/admin/user/${id}/invoices`);
      setInvoices(res.data);
    } catch {}
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${id}`, formData);
      success("Data user berhasil diupdate!");
      fetchUserData();
    } catch {
      error("Gagal mengupdate user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    const isConfirmed = await confirm({
      title: "Konfirmasi Hapus",
      message: "Apakah Anda yakin ingin menghapus user ini? Tindakan ini permanen!",
      type: "danger", confirmText: "Ya, Hapus!",
    });
    if (isConfirmed) {
      try {
        await api.delete(`/users/${id}`);
        success("User berhasil dihapus.");
        navigate("/admin/users");
      } catch {
        error("Gagal menghapus user.");
      }
    }
  };

  const formatRupiah = (num) => {
    if (num === undefined || num === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", minimumFractionDigits: 0,
    }).format(num);
  };

  const stats = {
    totalDomains: domains.length,
    totalInvoices: invoices.length,
    totalSpent: invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + parseFloat(i.total || 0), 0),
    pendingInvoices: invoices.filter((i) => i.status === "pending").length,
  };

  const getCatColor = (cat) => {
    const c = (cat || "REGISTER").toUpperCase();
    const map = { TOPUP: "purple", RENEW: "indigo", TRANSFER: "amber", RESTORE: "rose", REGISTER: "emerald" };
    return map[c] || "emerald";
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-8 h-8 border-2 border-neutral-100 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Memuat data user...</p>
    </div>
  );
  if (!user) return null;

  return (
    <div className="space-y-5 animate-fade-in pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/users" className="btn btn-ghost btn-sm">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Kembali
          </Link>
          <div>
            <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Manajemen User
            </p>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-neutral-800 tracking-tight">{user.name}</h2>
              <span className={`badge ${user.role === "admin" ? "badge-purple" : "badge-info"}`}>
                {user.role || "Member"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ActionButton icon="delete" label="Hapus Akun" onClick={handleDeleteUser} variant="rose" />
          <Link to="/admin/invoices" className="btn btn-primary">
            Riwayat Tagihan
            <span className="material-symbols-outlined text-sm">payments</span>
          </Link>
        </div>
      </div>

      {/* User Meta */}
      <div className="flex items-center gap-4 text-[11px] font-semibold text-neutral-400">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">alternate_email</span>
          {user.email}
        </span>
        <span className="w-1 h-1 bg-neutral-300 rounded-full" />
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          Bergabung {new Date(user.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard title="Total Domain" value={stats.totalDomains} icon="domain" color="orange" />
        <StatsCard title="Total Belanja" value={formatRupiah(stats.totalSpent)} icon="account_balance_wallet" color="green" />
        <StatsCard title="Invoice Lunas" value={invoices.filter((i) => i.status === "paid").length} icon="description" color="blue" />
        <StatsCard title="Invoice Tertunda" value={stats.pendingInvoices} icon="pending_actions" color="amber" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Tables + Form */}
        <div className="lg:col-span-2 space-y-5">

          {/* Domains Table */}
          <div className="table-wrap">
            <div className="table-header">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-primary-500" />
                <h3 className={SC.sectionHeader}>Daftar Domain ({domains.length})</h3>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Status</th>
                  <th>Expiration</th>
                  <th style={{ textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {domains.length > 0 ? domains.map((domain) => (
                  <tr key={domain.id}>
                    <td>
                      <p className="font-semibold text-neutral-700">{domain.name}</p>
                      <p className="text-[10px] text-neutral-400 font-semibold">ID: #{domain.id}</p>
                    </td>
                    <td><StatusBadge status={domain.status} /></td>
                    <td className="text-[11px] font-semibold text-neutral-500 uppercase">
                      {domain.expiration_date
                        ? new Date(domain.expiration_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                        : "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Link to={`/admin/domains/${domain.id}`} className="btn btn-ghost btn-icon btn-sm">
                        <span className="material-symbols-outlined text-sm">settings</span>
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="text-center py-12 text-neutral-400 text-xs font-semibold">Belum memiliki domain.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Profile Form */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <span className={SC.dot + " bg-neutral-800"} />
              <h3 className={SC.sectionHeader}>Edit Informasi Profil</h3>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} placeholder="Tulis nama lengkap user..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Nomor Telepon</label>
                  <input type="text" name="phone" className="form-input" value={formData.phone} onChange={handleChange} placeholder="Contoh: 0812..." />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Bio / Catatan Internal</label>
                <textarea name="bio" className="form-input" style={{ minHeight: 100 }} value={formData.bio} onChange={handleChange} placeholder="Catatan internal mengenai user ini..." />
              </div>
              <div className="flex justify-end">
                <ActionButton icon="save" label={saving ? "Memproses..." : "Simpan Perubahan"} type="submit" disabled={saving} variant="primary" />
              </div>
            </form>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">

          {/* Role & Security */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">shield_person</span>
              </div>
              <div>
                <h3 className={SC.sectionHeader}>Role & Security</h3>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Update Level Akses</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">Privilege Level</label>
                <CustomSelect
                  value={formData.role}
                  onChange={(val) => setFormData({ ...formData, role: val })}
                  options={[
                    { value: "member", label: "MEMBER (Standard Access)" },
                    { value: "admin", label: "ADMINISTRATOR (Full Control)" },
                  ]}
                />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary w-full">
                Update Privilege
              </button>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="table-wrap">
            <div className="table-header">
              <h3 className={SC.sectionHeader}>Tagihan Terbaru</h3>
              <Link to="/admin/invoices" className="btn btn-ghost btn-sm">Semua</Link>
            </div>
            <div className="divide-y divide-neutral-50 max-h-[400px] overflow-y-auto custom-scrollbar">
              {invoices.length > 0 ? invoices.slice(0, 10).map((inv) => (
                <div key={inv.id} className="p-4 hover:bg-neutral-50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/invoices/${inv.id}`} className="text-xs font-bold text-neutral-700 hover:text-primary-500 transition">{inv.id}</Link>
                      <span className={`badge badge-${getCatColor(inv.category)}`}>{(inv.category || "REGISTER").toUpperCase()}</span>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[11px] font-semibold text-neutral-500 truncate max-w-[140px]">{inv.first_item || "Layanan Domain"}</p>
                      <p className="text-[10px] text-neutral-300 font-semibold mt-0.5">
                        {new Date(inv.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <p className="font-bold text-neutral-700 text-xs">{formatRupiah(inv.total)}</p>
                  </div>
                </div>
              )) : (
                <div className="empty-state">
                  <div className="empty-state-icon"><span className="material-symbols-outlined">receipt</span></div>
                  <p>Belum ada transaksi</p>
                </div>
              )}
            </div>
          </div>

          {/* System Note */}
          <div className="card" style={{ background: "var(--color-neutral-800)", borderColor: "var(--color-neutral-700)" }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-primary-400">info</span>
              <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Catatan Sistem</h3>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed italic">
              Data user disinkronkan langsung dengan akun utama. Mengubah data disini akan merubah data profil user secara global.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminManageUser;
