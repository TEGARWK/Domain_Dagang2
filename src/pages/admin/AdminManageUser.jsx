import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import CustomSelect from "../../components/ui/CustomSelect";

const AdminManageUser = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error, warning } = useNotification();
  const confirm = useConfirm();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [domains, setDomains] = useState([]);
    const [invoices, setInvoices] = useState([]);

    // Edit State
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        bio: "",
        address: "",
        role: "",
        address_line1: "",
        city: "",
        state: "",
        zip_code: "",
        country: "Indonesia"
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
                name: res.data.name || "",
                phone: res.data.phone || "",
                bio: res.data.bio || "",
                address: res.data.address || "",
                role: res.data.role || "member",
                address_line1: res.data.address_line1 || "",
                city: res.data.city || "",
                state: res.data.state || "",
                zip_code: res.data.zip_code || "",
                country: res.data.country || "Indonesia"
            });
        } catch (err) {
            console.error(err);
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
        } catch (err) {
            console.error("Domains error:", err);
        }
    };

    const fetchUserInvoices = async () => {
        try {
            // Updated endpoint to get specific user's invoices
            const res = await api.get(`/billing/admin/user/${id}/invoices`);
            setInvoices(res.data);
        } catch (err) {
            console.error("Invoices error:", err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/users/${id}`, formData);
            success("Data user berhasil diupdate!");
            fetchUserData();
        } catch (err) {
            error("Gagal mengupdate user.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async () => {
        const isConfirmed = await confirm({
            title: "Konfirmasi Hapus",
            message: "Apakah Anda yakin ingin menghapus user ini? Semua domain dan invoice terkait mungkin akan kehilangan referensi. Tindakan ini permanen!",
            type: "danger",
            confirmText: "Ya, Hapus!"
        });

        if (isConfirmed) {
            try {
                await api.delete(`/users/${id}`);
                success("User berhasil dihapus.");
                navigate("/admin/users");
            } catch (err) {
                error("Gagal menghapus user.");
            }
        }
    };

    const formatRupiah = (num) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(num);
    };

    const stats = {
        totalDomains: domains.length,
        totalInvoices: invoices.length,
        totalSpent: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total || 0), 0),
        pendingInvoices: invoices.filter(i => i.status === 'pending').length
    };

    const getCategoryBadge = (cat) => {
        const c = (cat || 'REGISTER').toUpperCase();
        switch(c) {
            case 'TOPUP': return <span className="bg-purple-50 text-purple-600 border-purple-100 px-1 py-0.5 rounded-[4px] text-[7px] font-bold uppercase tracking-wider border">Topup</span>;
            case 'RENEW': return <span className="bg-indigo-50 text-indigo-600 border-indigo-100 px-1 py-0.5 rounded-[4px] text-[7px] font-bold uppercase tracking-wider border">Renew</span>;
            case 'TRANSFER': return <span className="bg-amber-50 text-amber-600 border-amber-100 px-1 py-0.5 rounded-[4px] text-[7px] font-bold uppercase tracking-wider border">Transfer</span>;
            case 'RESTORE': return <span className="bg-rose-50 text-rose-600 border-rose-100 px-1 py-0.5 rounded-[4px] text-[7px] font-bold uppercase tracking-wider border">Restore</span>;
            default: return <span className="bg-emerald-50 text-emerald-600 border-emerald-100 px-1 py-0.5 rounded-[4px] text-[7px] font-bold uppercase tracking-wider border">Register</span>;
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F97316]"></div>
        </div>
    );

    if (!user) return null;

    return (
        <div className="space-y-3 animate-[fadeIn_0.5s_ease-out] pb-10">
            {/* High-Impact Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <button 
                        onClick={() => navigate("/admin/users")}
                        className="w-12 h-12 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-[#F97316] hover:border-[#F97316]/30 hover:shadow-lg transition-all active:scale-90"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{user.name}</h1>
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.1em] border ${
                                user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                                {user.role || 'Member'}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 font-bold text-[11px] text-slate-400 uppercase tracking-widest">
                            <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">alternate_email</span> {user.email}</p>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <p className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">calendar_today</span> Bergabung {new Date(user.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                         onClick={handleDeleteUser}
                         className="px-6 py-3 bg-white text-rose-500 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition shadow-sm active:scale-95"
                    >
                        Hapus Akun
                    </button>
                    <button 
                        onClick={() => navigate(`/admin/invoices`)} // Ideally filter by user, but link to all for now
                        className="px-6 py-3 bg-slate-900 text-white border border-slate-900 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#F97316] hover:border-[#F97316] transition shadow-lg shadow-slate-900/10 active:scale-95 flex items-center gap-2"
                    >
                        Riwayat Tagihan
                        <span className="material-symbols-outlined text-sm">payments</span>
                    </button>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative overflow-hidden bg-white p-3 rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-orange-50 text-[#F97316] rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                            <span className="material-symbols-outlined text-2xl font-bold">domain</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Domain</p>
                            <h3 className="text-2xl font-bold text-slate-900 leading-none">{stats.totalDomains}</h3>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-white p-3 rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                            <span className="material-symbols-outlined text-2xl font-bold">account_balance_wallet</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Belanja</p>
                            <h3 className="text-2xl font-bold text-slate-900 leading-none">{formatRupiah(stats.totalSpent)}</h3>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-white p-3 rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                            <span className="material-symbols-outlined text-2xl font-bold">description</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice Lunas</p>
                            <h3 className="text-2xl font-bold text-slate-900 leading-none">{invoices.filter(i => i.status === 'paid').length}</h3>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-[#F97316] p-3 rounded-xl shadow-xl shadow-orange-200/50 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 border border-white/30">
                            <span className="material-symbols-outlined text-2xl font-bold">pending_actions</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Invoice Tertunda</p>
                            <h3 className="text-2xl font-bold text-white leading-none">{stats.pendingInvoices}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-3">
                    
                    {/* Standardized Domain Table (SOP) */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="p-3 border-b border-slate-50 bg-slate-50/30">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                <span className="w-2 h-4 bg-[#F97316] rounded-full"></span>
                                Daftar Kepemilikan Domain ({domains.length})
                            </h3>
                        </div>
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/100 sticky top-0 z-10">
                                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                                        <th className="px-4 py-2">Domain & Extension</th>
                                        <th className="px-4 py-2">Status</th>
                                        <th className="px-4 py-2">Expiration</th>
                                        <th className="px-4 py-2 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {domains.map((domain) => (
                                        <tr key={domain.id} className="hover:bg-slate-50/30 transition group">
                                            <td className="px-4 py-1.5">
                                                <p className="font-bold text-slate-800 text-sm tracking-tight">{domain.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">DID: #{domain.id}</p>
                                            </td>
                                            <td className="px-4 py-1.5">
                                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${
                                                    domain.status === 'active' 
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                    : domain.status === 'expired'
                                                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                    : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {domain.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1.5">
                                                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">
                                                    {domain.expiration_date ? new Date(domain.expiration_date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                                                </p>
                                            </td>
                                            <td className="px-4 py-1.5 text-center">
                                                <Link 
                                                    to={`/admin/domains/${domain.id}`} 
                                                    className="w-9 h-9 flex items-center justify-center bg-white text-slate-400 border border-slate-100 rounded-lg hover:bg-orange-50 hover:text-[#F97316] hover:border-orange-100 transition-all shadow-sm active:scale-90 mx-auto"
                                                >
                                                    <span className="material-symbols-outlined text-lg">settings_applications</span>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {domains.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-10 text-center text-slate-400 font-bold italic text-xs uppercase tracking-widest">Member belum memiliki domain terdaftar.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Profile Information Form */}
                    <div className="bg-white rounded-xl p-4 md:p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
                        <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-tight flex items-center gap-3 font-outfit">
                            <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm">edit_note</span>
                            </span>
                            Edit Informasi Profil
                        </h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nama Lengkap</label>
                                    <input 
                                        type="text" name="name" value={formData.name} onChange={handleChange}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-[#F97316] focus:bg-white transition-all"
                                        placeholder="Tulis nama lengkap user..."
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nomor Telepon</label>
                                    <input 
                                        type="text" name="phone" value={formData.phone} onChange={handleChange}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-[#F97316] focus:bg-white transition-all"
                                        placeholder="Contoh: 0812..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Bio / Catatan Internal</label>
                                <textarea 
                                    name="bio" value={formData.bio} onChange={handleChange} rows="4"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-[#F97316] focus:bg-white transition-all resize-none"
                                    placeholder="Berikan catatan internal mengenai user ini (tidak terlihat di sisi user)..."
                                ></textarea>
                            </div>

                            <div className="pt-6 flex justify-end">
                                <button 
                                    type="submit" disabled={saving}
                                    className="px-10 py-4 bg-[#F97316] text-white rounded-[1.5rem] text-xs font-bold uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-xl shadow-orange-600/30 hover:shadow-slate-900/30 disabled:opacity-50 active:scale-95 flex items-center gap-3"
                                >
                                    {saving ? "Memproses..." : "Simpan Perubahan"}
                                    <span className="material-symbols-outlined text-sm">save_as</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sidebar Areas */}
                <div className="space-y-3">
                    {/* Role & Security Card */}
                    <div className="bg-white rounded-xl p-3 md:p-4 border border-slate-100 shadow-xl shadow-slate-200/40">
                        <div className="flex items-center gap-3 mb-6">
                             <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-xl">shield_person</span>
                             </div>
                             <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Role & Security</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Update Level Akses</p>
                             </div>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Privilege Level</label>
                                <CustomSelect 
                                    value={formData.role} 
                                    onChange={val => setFormData({...formData, role: val})}
                                    options={[
                                        { value: 'member', label: 'MEMBER (Standard Access)' },
                                        { value: 'admin', label: 'ADMINISTRATOR (Full Control)' }
                                    ]}
                                />
                            </div>
                            <button 
                                onClick={handleSave} disabled={saving}
                                className="w-full py-4 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#F97316] transition-all shadow-lg active:scale-95"
                            >
                                Update Privilege
                            </button>
                        </div>
                    </div>

                    {/* Recent Activities Breakdown */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Tagihan Terbaru</h3>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">History Pembayaran</p>
                            </div>
                            <Link to="/admin/invoices" className="text-[10px] font-bold text-[#F97316] uppercase hover:underline">Semua</Link>
                        </div>
                        <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {invoices.length > 0 ? (
                                invoices.slice(0, 10).map((inv) => (
                                    <div key={inv.id} className="px-4 py-3 hover:bg-slate-50/80 transition-all border-l-4 border-transparent hover:border-orange-400 group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Link to={`/admin/invoices/${inv.id}`} className="text-[11px] font-bold text-slate-800 hover:text-[#F97316] transition tracking-tight">#{inv.id}</Link>
                                                {getCategoryBadge(inv.category)}
                                            </div>
                                            <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border shadow-[0_2px_4px_rgba(0,0,0,0.02)] ${
                                                inv.status === 'paid' 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>{inv.status}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 truncate max-w-[140px] leading-tight">{inv.first_item || "Layanan Domain"}</p>
                                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter mt-0.5">
                                                    {new Date(inv.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                            <p className="font-bold text-slate-900 text-xs">{formatRupiah(inv.total)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-10 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                         <span className="material-symbols-outlined text-slate-200">receipt</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic leading-relaxed">Belum ada riwayat<br/>transaksi.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Tips / Meta */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-orange-400">info</span>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest">Catatan Sistem</h3>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                            * Data user disinkronkan langsung dengan akun utama. Mengubah data disini akan merubah data profil user secara global.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminManageUser;
