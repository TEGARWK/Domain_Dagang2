import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";

const AdminReferral = () => {
    const { success, error, info } = useNotification();
    const { confirm } = useConfirm();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("config"); // "config" or "tiers"

    // --- STATES ---
    const [config, setConfig] = useState({
        referee_discount: 5000,
        holding_period_days: 3
    });
    const [tiers, setTiers] = useState([]);
    const [stats, setStats] = useState(null);
    const [bannedWords, setBannedWords] = useState([]);
    const [newWord, setNewWord] = useState("");

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
    const [currentTier, setCurrentTier] = useState({
        id: null,
        tier_name: "",
        min_referrals: 0,
        reward_amount: 0
    });

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [cRes, tRes, sRes, bRes] = await Promise.all([
                api.get("/admin/referral/config"),
                api.get("/admin/referral/tiers"),
                api.get("/admin/referral/stats"),
                api.get("/admin/referral/banned-words")
            ]);
            
            if (cRes.data.success) setConfig(cRes.data.data);
            if (tRes.data.success) setTiers(tRes.data.data);
            if (sRes.data.success) setStats(sRes.data.data);
            if (bRes.data.success) setBannedWords(bRes.data.data);
        } catch (err) {
            error("Gagal memuat data referral.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBannedWords = async (wordsToSave = bannedWords) => {
        try {
            const res = await api.post("/admin/referral/banned-words", { words: wordsToSave });
            if (res.data.success) {
                success("Daftar kata terlarang berhasil disimpan!");
                setBannedWords(wordsToSave);
            }
        } catch (err) {
            error("Gagal menyimpan kata terlarang.");
        }
    };

    const handleAddWord = () => {
        if (!newWord.trim()) return;
        const word = newWord.trim().toLowerCase();
        if (bannedWords.includes(word)) {
            return info("Kata sudah ada dalam daftar.");
        }
        const updated = [...bannedWords, word];
        setBannedWords(updated);
        setNewWord("");
    };

    const handleRemoveWord = (word) => {
        const updated = bannedWords.filter(w => w !== word);
        setBannedWords(updated);
    };

    const handleResetDefaultBanned = async () => {
        const isConfirmed = await confirm(
            "Konfirmasi Reset", 
            "Ini akan memuat daftar standar kata kasar (Indo/English). Lanjutkan?"
        );
        if (!isConfirmed) return;

        const defaults = [
            "ADMIN", "OFFICIAL", "SUPPORT", "SYSTEM", "OWNER", "STAFF", "MOD", "MODERATOR", 
            "ROOT", "SUPERUSER", "DAGANG", "DOMAIN", "KONTOL", "MEMEK", "ANJING", "BANGSAT", 
            "BABI", "GOBLOK", "TOLOL", "IDIOT", "PEREK", "LONTE", "JABLAY", "NGENTOT", "NGEYOTT",
            "TITIT", "MEMEK", "ASU", "PEPEK", "FUCK", "SHIT", "ASS", "BITCH"
        ].map(w => w.toLowerCase());

        const merged = [...new Set([...bannedWords, ...defaults])];
        setBannedWords(merged);
        success("Daftar standar ditambahkan. Jangan lupa klik simpan.");
    };

    // --- HANDLERS: CONFIG ---
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

    // --- HANDLERS: TIERS ---
    const handleOpenModal = (tier = null) => {
        if (tier) {
            setModalMode("edit");
            setCurrentTier(tier);
        } else {
            setModalMode("add");
            setCurrentTier({ id: null, tier_name: "", min_referrals: 0, reward_amount: 0 });
        }
        setShowModal(true);
    };

    const handleSaveTier = async () => {
        try {
            if (modalMode === "edit") {
                await api.patch(`/admin/referral/tiers/${currentTier.id}`, currentTier);
                success("Tier berhasil diperbarui.");
            } else {
                await api.post("/admin/referral/tiers", currentTier);
                success("Tier baru berhasil ditambahkan.");
            }
            setShowModal(false);
            loadAllData();
        } catch (err) {
            error("Gagal menyimpan tier.");
        }
    };

    const handleDeleteTier = async (id) => {
        const isConfirmed = await confirm("Hapus Tier", "Apakah Anda yakin ingin menghapus tier ini?");
        if (!isConfirmed) return;

        try {
            await api.delete(`/admin/referral/tiers/${id}`);
            success("Tier berhasil dihapus.");
            loadAllData();
        } catch (err) {
            error("Gagal menghapus tier.");
        }
    };

    const formatRupiah = (num) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(num);
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in px-2 sm:px-0">
            {/* 1. HEADER & OVERVIEW */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Sistem Referral</h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1">Kelola aturan tier, reward, dan konfigurasi global.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-[#F97316]">
                            <span className="material-symbols-outlined">group</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Reward</p>
                            <p className="text-lg font-bold text-slate-800 leading-none">{stats?.overview?.total_rewards || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. TAB NAVIGATION */}
            <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab("config")}
                    className={`px-6 sm:px-8 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === "config" ? "border-[#F97316] text-[#F97316]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                    Konfigurasi Global
                </button>
                <button
                    onClick={() => setActiveTab("tiers")}
                    className={`px-6 sm:px-8 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === "tiers" ? "border-[#F97316] text-[#F97316]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                >
                    Management Tiering
                </button>
            </div>

            {/* 3. TAB CONTENT */}
            {activeTab === "config" ? (
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-slate-800 tracking-tight text-sm uppercase">Aturan Main Referral</h3>
                            </div>
                            <div className="p-6 sm:p-8 space-y-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Diskon User Baru (IDR)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                                            <input
                                                type="number"
                                                value={config.referee_discount}
                                                onChange={(e) => setConfig({ ...config, referee_discount: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#F97316] focus:ring-4 focus:ring-orange-50 outline-none transition font-bold"
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400 italic font-medium leading-relaxed">Pajak/diskon instan Rp 5.000 (default) untuk pengguna baru saat checkout pertama.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Masa Holding (Hari)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={config.holding_period_days}
                                                onChange={(e) => setConfig({ ...config, holding_period_days: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#F97316] focus:ring-4 focus:ring-orange-50 outline-none transition font-bold"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Hari</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 italic font-medium leading-relaxed">Lama saldo reward "nyangkut" sebelum cair (Verifikasi transaksi).</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex gap-2">
                                    <button
                                        onClick={handleSaveConfig}
                                        className="bg-[#F97316] hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-95 text-xs uppercase"
                                    >
                                        Simpan Konfigurasi
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Banned Words Section */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 tracking-tight text-sm uppercase">Kata Terlarang (Banned Words)</h3>
                                <button
                                    onClick={handleResetDefaultBanned}
                                    className="text-[10px] font-bold text-slate-500 hover:text-[#F97316] flex items-center gap-1 transition"
                                >
                                    <span className="material-symbols-outlined text-[14px]">history</span>
                                    Reset ke Default
                                </button>
                            </div>
                            <div className="p-6 sm:p-8 space-y-6">
                                <p className="text-[11px] text-slate-400 leading-relaxed italic">Daftar kata yang tidak boleh digunakan user untuk kustomisasi kode referral (Anti-Profanity).</p>
                                
                                <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    {bannedWords.map(word => (
                                        <span key={word} className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 group transition hover:border-red-200 hover:bg-red-50">
                                            {word}
                                            <button onClick={() => handleRemoveWord(word)} className="text-slate-300 group-hover:text-red-500 transition">
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </span>
                                    ))}
                                    {bannedWords.length === 0 && <span className="text-[10px] text-slate-300">Belum ada kata terlarang.</span>}
                                </div>

                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        placeholder="Tambah kata terlarang baru..."
                                        value={newWord}
                                        onChange={(e) => setNewWord(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#F97316] transition"
                                    />
                                    <button 
                                        onClick={handleAddWord}
                                        className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/10"
                                    >
                                        Tambah
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => handleSaveBannedWords()}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-xs uppercase flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">shield</span>
                                        Simpan Daftar Banned
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-50 rounded-2xl border border-orange-100 p-6 flex gap-4">
                            <span className="material-symbols-outlined text-[#F97316]">info</span>
                            <div className="text-sm text-slate-600 leading-relaxed">
                                <p className="font-bold text-[#EA580C] mb-1">Pemberitahuan:</p>
                                Mengubah **Masa Holding** hanya akan berdampak pada transaksi referral yang dimulai SETELAH perubahan disimpan. Transaksi lama tetap mengikuti aturan saat transaksi dibuat.
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -z-10 translate-x-10 -translate-y-10"></div>
                             <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">analytics</span>
                                Statistik Global
                             </h4>
                             <div className="space-y-5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Total Terbayar</span>
                                    <span className="font-black text-green-600">{formatRupiah(stats?.overview?.total_paid_out || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Masih Pending</span>
                                    <span className="font-black text-orange-600">{formatRupiah(stats?.overview?.total_pending || 0)}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                     <button className="text-[#F97316] text-[11px] font-black uppercase tracking-widest hover:underline flex items-center gap-1" onClick={() => info("Fitur export data segera hadir!")}>
                                        Export Riwayat
                                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                                     </button>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 sm:px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
                        <h3 className="font-bold text-slate-800 tracking-tight">Daftar Reward per Tier</h3>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-slate-900 text-white w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold tracking-widest uppercase hover:bg-slate-800 transition flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Tambah Tier
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4">Nama Tier</th>
                                    <th className="px-8 py-4 text-center">Min. Referral</th>
                                    <th className="px-8 py-4">Jumlah Reward</th>
                                    <th className="px-8 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tiers.map((tier) => (
                                    <tr key={tier.id} className="hover:bg-slate-50/80 transition group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-[#F97316] shadow-sm shadow-orange-300"></div>
                                                <span className="font-black text-slate-700 uppercase tracking-wider text-sm">{tier.tier_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="bg-slate-100 text-slate-600 px-4 py-1 rounded-full text-[11px] font-bold border border-slate-200">{tier.min_referrals} Teman</span>
                                        </td>
                                        <td className="px-8 py-6 font-black text-[#F97316] text-base">
                                            {formatRupiah(tier.reward_amount)}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => handleOpenModal(tier)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-orange-50 text-[#F97316] hover:bg-[#F97316] hover:text-white transition-all shadow-sm"
                                                    title="Edit Tier"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTier(tier.id)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                    title="Hapus Tier"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {tiers.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-12 text-center text-slate-400 font-medium">Belum ada tier yang dikonfigurasi.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL ADD/EDIT TIER */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
                    <div className="bg-white w-full max-w-lg rounded-[2rem] relative z-10 shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                                {modalMode === "edit" ? "Update Tier" : "Tambah Tier"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nama Label Tier</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Platinum Member"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-orange-50 transition font-bold"
                                    value={currentTier.tier_name}
                                    onChange={(e) => setCurrentTier({ ...currentTier, tier_name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Min. Referral</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-[#F97316] transition font-bold"
                                            value={currentTier.min_referrals}
                                            onChange={(e) => setCurrentTier({ ...currentTier, min_referrals: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reward IDR</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-[#F97316] transition font-bold"
                                            value={currentTier.reward_amount}
                                            onChange={(e) => setCurrentTier({ ...currentTier, reward_amount: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 flex justify-end gap-4 border-t border-slate-100">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2 text-slate-500 font-bold hover:text-slate-700 transition">Batal</button>
                            <button
                                onClick={handleSaveTier}
                                className="bg-[#F97316] text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition active:scale-95 transform"
                            >
                                Simpan Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReferral;
