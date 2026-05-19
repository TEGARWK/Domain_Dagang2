import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";

const AdminReferral = () => {
    const { success, error, info } = useNotification();
    const { confirm } = useConfirm();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("merchants"); // "merchants", "config", "withdrawals"

    // --- STATES ---
    const [config, setConfig] = useState({
        referee_discount: 5000,
        holding_period_days: 3,
        commission_tier_1_percent: 20,
        commission_tier_2_percent: 10
    });
    const [merchants, setMerchants] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]); // This is Rewards History
    const [searchMerchant, setSearchMerchant] = useState("");
    const [searchReward, setSearchReward] = useState("");
    const [rewardFilter, setRewardFilter] = useState("all");
    const [rewardTierFilter, setRewardTierFilter] = useState("all");
    const [merchantSort, setMerchantSort] = useState({ key: "total_referrals", direction: "desc" });
    const [rewardSort, setRewardSort] = useState({ key: "created_at", direction: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [cRes, mRes, sRes, wRes] = await Promise.all([
                api.get("/admin/referral/config"),
                api.get("/admin/referral/merchants"),
                api.get("/admin/referral/stats"),
                api.get("/admin/referral/rewards") // Fetching all referral rewards history
            ]);
            
            if (cRes.data.success) setConfig(cRes.data.data);
            if (mRes.data.success) setMerchants(mRes.data.data);
            if (sRes.data.success) setStats(sRes.data.data.overview);
            if (wRes.data.success) setWithdrawals(wRes.data.data); // Reuse withdrawals state for rewards list
        } catch (err) {
            error("Gagal memuat data referral.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        try {
            const res = await api.patch("/admin/referral/config", config);
            if (res.data.success) {
                success("Konfigurasi berhasil disimpan!");
            }
        } catch (err) {
            error("Gagal menyimpan konfigurasi.");
        }
    };

    const handleWithdrawalAction = async (id, action, reason = "") => {
        const isConfirmed = await confirm("Konfirmasi", `Apakah Anda yakin ingin ${action === 'approve' ? 'menyetujui' : 'menolak'} permintaan ini?`);
        if (!isConfirmed) return;

        try {
            const endpoint = `/admin/withdrawals/${id}/${action}`;
            await api.post(endpoint, { reason });
            success(`Permintaan berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}.`);
            loadAllData();
        } catch (err) {
            error("Gagal memproses permintaan.");
        }
    };

    const formatRupiah = (num) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(num || 0);
    };

    const handleSort = (tab, key) => {
        if (tab === 'merchants') {
            setMerchantSort(prev => ({
                key,
                direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
            }));
        } else {
            setRewardSort(prev => ({
                key,
                direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
            }));
        }
    };

    const SortIcon = ({ tab, column }) => {
        const config = tab === 'merchants' ? merchantSort : rewardSort;
        if (config.key !== column) return <span className="ml-1 opacity-20">⇅</span>;
        return config.direction === 'asc' ? <span className="ml-1 text-orange-500">↑</span> : <span className="ml-1 text-orange-500">↓</span>;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        success("Berhasil disalin!");
    };

    if (loading && !stats) {
        return (
            <div className="p-4 space-y-6 animate-pulse">
                <div className="h-10 w-48 bg-slate-100 rounded-lg"></div>
                <div className="h-12 w-full bg-slate-50 rounded-xl"></div>
                <div className="h-64 bg-white border border-slate-100 rounded-2xl"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Afiliasi</h1>
                    <p className="text-slate-500 text-sm mt-1">Pantau performa referral dan kelola komisi merchant.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={loadAllData}
                        className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined text-xl">refresh</span>
                    </button>
                </div>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-4 group hover:-translate-y-1 transition-all duration-300">
                    <div className="w-14 h-14 bg-orange-50 text-[#F97316] rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 border border-orange-100/50 shadow-inner">
                        <span className="material-symbols-outlined text-3xl font-bold">payments</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Total Komisi Cair</p>
                        <h3 className="text-2xl font-bold text-slate-900 leading-none">{formatRupiah(stats?.total_paid)}</h3>
                        <p className="text-[10px] font-bold text-emerald-500 mt-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            Sudah di Dompet
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-4 group hover:-translate-y-1 transition-all duration-300">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 border border-blue-100/50 shadow-inner">
                        <span className="material-symbols-outlined text-3xl font-bold">hourglass_empty</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Bonus Pending</p>
                        <h3 className="text-2xl font-bold text-slate-900 leading-none">{formatRupiah(stats?.total_pending)}</h3>
                        <p className="text-[10px] font-bold text-blue-500 mt-2">Masa Tunggu</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 flex items-center gap-4 group hover:-translate-y-1 transition-all duration-300">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 border border-indigo-100/50 shadow-inner">
                        <span className="material-symbols-outlined text-3xl font-bold">storefront</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Total Merchant</p>
                        <h3 className="text-2xl font-bold text-slate-900 leading-none">{stats?.total_merchants} <span className="text-[10px] text-slate-400 font-normal">Akun</span></h3>
                        <p className="text-[10px] font-bold text-indigo-500 mt-2">Partner Aktif</p>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-slate-900 p-5 rounded-2xl shadow-xl shadow-slate-300 flex items-center gap-4 group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform duration-1000 group-hover:scale-150"></div>
                    <div className="relative z-10 w-14 h-14 bg-white/10 backdrop-blur-md text-white rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 border border-white/20 shadow-inner">
                        <span className="material-symbols-outlined text-3xl font-bold">history_edu</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mb-1">Total Transaksi</p>
                        <h3 className="text-2xl font-bold text-white leading-none">{stats?.total_rewards} <span className="text-[10px] text-white/30 font-normal">Kali</span></h3>
                        <p className="text-[10px] font-bold text-orange-400 mt-2">Log Referral</p>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
                <button
                    onClick={() => setActiveTab("merchants")}
                    className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === "merchants" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <span className="material-symbols-outlined text-sm">group</span>
                    Data Referral
                </button>
                <button
                    onClick={() => setActiveTab("config")}
                    className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === "config" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <span className="material-symbols-outlined text-sm">settings</span>
                    Setting Komisi
                </button>
                <button
                    onClick={() => setActiveTab("withdrawals")}
                    className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === "withdrawals" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}
                >
                    <span className="material-symbols-outlined text-sm">history_edu</span>
                    Riwayat Komisi
                </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === "merchants" && (() => {
                const filtered = merchants.filter(m => 
                    m.name?.toLowerCase().includes(searchMerchant.toLowerCase()) ||
                    m.email?.toLowerCase().includes(searchMerchant.toLowerCase()) ||
                    m.referral_code?.toLowerCase().includes(searchMerchant.toLowerCase())
                ).sort((a, b) => {
                    const factor = merchantSort.direction === 'asc' ? 1 : -1;
                    if (merchantSort.key === 'total_referrals') return (a.total_invite - b.total_invite) * factor;
                    if (merchantSort.key === 'total_earned') return (a.active_commission - b.active_commission) * factor;
                    return (a.name?.localeCompare(b.name)) * factor;
                });

                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                return (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30">
                                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    Data Referral Merchant
                                </h3>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-80 group">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg group-focus-within:text-orange-500 transition-colors">search</span>
                                        <input 
                                            type="text" 
                                            placeholder="Cari nama, toko, atau kode..."
                                            value={searchMerchant}
                                            onChange={(e) => { setSearchMerchant(e.target.value); setCurrentPage(1); }}
                                            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <button className="h-11 px-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm">
                                        <span className="material-symbols-outlined text-lg">download</span>
                                        Export
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                            <th className="px-6 py-4 cursor-pointer hover:text-slate-600 transition" onClick={() => handleSort('merchants', 'name')}>
                                                Merchant <SortIcon tab="merchants" column="name" />
                                            </th>
                                            <th className="px-6 py-4">Kode Referral</th>
                                            <th className="px-6 py-4">Link Register</th>
                                            <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-600 transition" onClick={() => handleSort('merchants', 'total_referrals')}>
                                                Total Invite <SortIcon tab="merchants" column="total_referrals" />
                                            </th>
                                            <th className="px-6 py-4 text-right cursor-pointer hover:text-slate-600 transition" onClick={() => handleSort('merchants', 'total_earned')}>
                                                Saldo Komisi <SortIcon tab="merchants" column="total_earned" />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginated.length > 0 ? paginated.map((m) => (
                                            <tr key={m.id} className="hover:bg-slate-50/50 transition group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center font-bold text-sm border border-orange-100 group-hover:bg-[#F97316] group-hover:text-white transition-all uppercase">
                                                            {m.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-xs tracking-tight">{m.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">{m.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <p className="px-3 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 tracking-wider uppercase">
                                                        {m.referral_code || "BELUM ADA"}
                                                    </p>
                                                </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                                        {m.referral_code ? `${window.location.origin}/register?ref=${m.referral_code}` : "-"}
                                                    </p>
                                                    {m.referral_code && (
                                                        <button 
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(`${window.location.origin}/register?ref=${m.referral_code}`);
                                                                success("Link disalin!");
                                                            }}
                                                            className="text-slate-400 hover:text-slate-900 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">content_copy</span>
                                                        </button>
                                                    )}
                                                </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex px-2 py-1 rounded bg-slate-50 text-slate-700 font-bold text-[11px] min-w-[30px] justify-center border border-slate-100">
                                                        {m.total_invite}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="font-bold text-emerald-600 text-xs">{formatRupiah(m.active_commission)}</p>
                                                    <div className="flex items-center justify-end gap-1 mt-0.5">
                                                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Tersedia</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-20 text-center text-slate-400 text-sm font-medium">
                                                    Belum ada data merchant.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* PAGINATION FOOTER */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
                            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    TOTAL <span className="text-orange-500">{filtered.length} MERCHANT</span> • HAL <span className="text-slate-900">{currentPage}</span> / {totalPages || 1}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 disabled:opacity-50 disabled:hover:text-slate-400 transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                    Kembali
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="h-10 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md"
                                >
                                    Lanjut
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {activeTab === "config" && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight text-center">Pengaturan Komisi Afiliasi</h3>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4">
                                <span className="material-symbols-outlined text-blue-600">info</span>
                                <p className="text-sm text-blue-800 leading-relaxed italic">
                                    Komisi dihitung berdasarkan persentase dari harga paket langganan yang dibayarkan merchant.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* TIER 1 */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Komisi Tier 1 (Direct)</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            value={config.commission_tier_1_percent}
                                            onChange={(e) => setConfig({ ...config, commission_tier_1_percent: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm text-slate-800 focus:border-orange-500 focus:bg-white outline-none transition-all pr-12 shadow-sm"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed italic font-medium">Komisi untuk merchant yang mengundang langsung (Referrer).</p>
                                </div>

                                {/* TIER 2 */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Komisi Tier 2 (Indirect)</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            value={config.commission_tier_2_percent}
                                            onChange={(e) => setConfig({ ...config, commission_tier_2_percent: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm text-slate-800 focus:border-orange-500 focus:bg-white outline-none transition-all pr-12 shadow-sm"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed italic font-medium">Komisi untuk upline dari referrer (Grand Referrer).</p>
                                </div>
                            </div>

                            {/* SECONDARY SETTINGS */}
                            <div className="pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Hadiah Pendaftar Baru (Diskon %)</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            value={config.referee_discount}
                                            onChange={(e) => setConfig({ ...config, referee_discount: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm text-slate-800 focus:border-emerald-500 focus:bg-white outline-none transition-all pr-12 shadow-sm"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed italic font-medium">Persentase diskon yang didapat pelanggan saat mendaftar via link.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider text-center md:text-left">Masa Tunggu Komisi (Hari)</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            value={config.holding_period_days}
                                            onChange={(e) => setConfig({ ...config, holding_period_days: e.target.value })}
                                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm text-slate-800 focus:border-slate-400 focus:bg-white outline-none transition-all shadow-sm"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                            <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 italic">Lama komisi tertahan (Pending) sebelum bisa dicairkan.</p>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-center">
                                <button 
                                    onClick={handleSaveConfig}
                                    className="px-16 py-4 bg-[#F97316] text-white font-black rounded-2xl shadow-xl shadow-orange-500/40 hover:bg-orange-600 hover:-translate-y-0.5 transition-all active:scale-95 text-xs uppercase tracking-[0.2em]"
                                >
                                    Simpan Konfigurasi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "withdrawals" && (() => {
                const filtered = (withdrawals || []).filter(w => {
                    const matchSearch = (w.referrer_name?.toLowerCase() || '').includes(searchReward.toLowerCase()) || 
                                        (w.referee_name?.toLowerCase() || '').includes(searchReward.toLowerCase());
                    const matchStatus = rewardFilter === "all" || w.status === rewardFilter;
                    const matchTier = rewardTierFilter === "all" || w.reward_tier?.toString() === rewardTierFilter;
                    return matchSearch && matchStatus && matchTier;
                }).sort((a, b) => {
                    const factor = rewardSort.direction === 'asc' ? 1 : -1;
                    if (rewardSort.key === 'amount') return (a.reward_amount - b.reward_amount) * factor;
                    if (rewardSort.key === 'created_at') return (new Date(a.created_at) - new Date(b.created_at)) * factor;
                    return (a.referrer_name?.localeCompare(b.referrer_name)) * factor;
                });

                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                
                const statsActive = filtered.filter(w => w.status === 'active').reduce((sum, w) => sum + Number(w.reward_amount || 0), 0);
                const statsPending = filtered.filter(w => w.status === 'pending').reduce((sum, w) => sum + Number(w.reward_amount || 0), 0);

                return (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30">
                                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Riwayat Komisi Afiliasi
                                </h3>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="flex items-center gap-3">
                                        <select 
                                            value={rewardFilter}
                                            onChange={(e) => { setRewardFilter(e.target.value); setCurrentPage(1); }}
                                            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                                        >
                                            <option value="all">Semua Status</option>
                                            <option value="active">Active (Cair)</option>
                                            <option value="pending">Pending (Tertahan)</option>
                                        </select>

                                        <select 
                                            value={rewardTierFilter}
                                            onChange={(e) => { setRewardTierFilter(e.target.value); setCurrentPage(1); }}
                                            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                                        >
                                            <option value="all">Semua Tier</option>
                                            <option value="1">Tier 1</option>
                                            <option value="2">Tier 2</option>
                                        </select>
                                    </div>
                                    <div className="relative flex-1 md:w-64 group">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg group-focus-within:text-emerald-500 transition-colors">search</span>
                                        <input 
                                            type="text" 
                                            placeholder="Cari nama merchant..."
                                            value={searchReward}
                                            onChange={(e) => { setSearchReward(e.target.value); setCurrentPage(1); }}
                                            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                            <th className="px-6 py-4 cursor-pointer hover:text-slate-600 transition" onClick={() => handleSort('rewards', 'created_at')}>
                                                Tanggal <SortIcon tab="rewards" column="created_at" />
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:text-slate-600 transition" onClick={() => handleSort('rewards', 'name')}>
                                                Referrer <SortIcon tab="rewards" column="name" />
                                            </th>
                                            <th className="px-6 py-4">Referee (Pembeli)</th>
                                            <th className="px-6 py-4">Tier</th>
                                            <th className="px-6 py-4 text-right cursor-pointer hover:text-slate-600 transition" onClick={() => handleSort('rewards', 'amount')}>
                                                Nominal <SortIcon tab="rewards" column="amount" />
                                            </th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginated.length > 0 ? paginated.map((w) => (
                                            <tr key={w.id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-6 py-4">
                                                    <p className="text-[11px] font-bold text-slate-700">{new Date(w.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">{new Date(w.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-800 text-xs tracking-tight">{w.referrer_name}</p>
                                                    <p className="text-[9px] text-slate-400 italic">#{w.referrer_id}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-600 text-xs tracking-tight">{w.referee_name}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${w.reward_tier === 1 ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        Tier {w.reward_tier}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="font-bold text-slate-800 text-xs">{formatRupiah(w.reward_amount)}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                                        w.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></span>
                                                        {w.status === 'active' ? 'Selesai' : 'Tertahan'}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-20 text-center text-slate-400 text-sm font-medium">
                                                    Belum ada riwayat komisi.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {paginated.length > 0 && (
                                        <tfoot className="bg-slate-50/50 border-t border-slate-100">
                                            <tr className="text-xs font-bold text-slate-800">
                                                <td colSpan="4" className="px-6 py-4 text-right uppercase tracking-widest text-[10px] text-slate-400">Ringkasan Data Terfilter:</td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="text-orange-600">{formatRupiah(statsActive + statsPending)}</p>
                                                    <div className="flex flex-col gap-0.5 mt-1">
                                                        <p className="text-[9px] text-emerald-600/70 font-normal">Selesai: {formatRupiah(statsActive)}</p>
                                                        <p className="text-[9px] text-amber-600/70 font-normal">Pending: {formatRupiah(statsPending)}</p>
                                                    </div>
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
                            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    TOTAL <span className="text-emerald-500">{filtered.length} TRANSAKSI</span> • HAL <span className="text-slate-900">{currentPage}</span> / {totalPages || 1}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 disabled:opacity-50 disabled:hover:text-slate-400 transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                    Kembali
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="h-10 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md"
                                >
                                    Lanjut
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default AdminReferral;
