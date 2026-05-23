import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import api from "../../services/api";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";
import CreateCouponForm from "../../components/admin/CreateCouponForm";


const AdminPromos = () => {
  const navigate = useNavigate();
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();
  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);

  const [activeTab, setActiveTab] = useState("voucher"); // "voucher", "event", "referral"
  const [referralData, setReferralData] = useState({ overview: {}, rewards: [] });
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [referralSubTab, setReferralSubTab] = useState("monitoring"); // "monitoring", "config"
  const [referralConfig, setReferralConfig] = useState({ referee_discount: 0, holding_period_days: 7 });
  const [referralTiers, setReferralTiers] = useState([]);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [isConfigSaving, setIsConfigSaving] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
      try {
          const res = await api.get("/admin/vouchers/list");
          setCoupons(res.data.data || res.data);
      } catch (err) {
          console.error("Gagal load coupons:", err);
      } finally {
          setLoadingCoupons(false);
      }
  };

  const fetchReferralStats = async () => {
    setLoadingReferral(true);
    try {
        const [statsRes, rewardsRes, tiersRes, configRes] = await Promise.all([
            api.get("/admin/referral/stats"),
            api.get("/admin/referral/rewards"),
            api.get("/admin/referral/tiers"),
            api.get("/admin/referral/config")
        ]);
        setReferralData({
            overview: statsRes.data.data.overview,
            rewards: rewardsRes.data.data
        });
        setReferralTiers(tiersRes.data.data || []);
        setReferralConfig(configRes.data.data || { referee_discount: 0, holding_period_days: 7 });
    } catch (err) {
        console.error("Gagal load referral data:", err);
    } finally {
        setLoadingReferral(false);
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    setIsConfigSaving(true);
    try {
        await api.patch("/admin/referral/config", referralConfig);
        success("Konfigurasi referral diperbarui!");
    } catch (err) {
        error("Gagal memperbarui konfigurasi.");
    } finally {
        setIsConfigSaving(false);
    }
  };

  const handleSaveTier = async (e) => {
    e.preventDefault();
    try {
        if (editingTier.id) {
            await api.patch(`/admin/referral/tiers/${editingTier.id}`, editingTier);
            success("Tier diperbarui!");
        } else {
            await api.post("/admin/referral/tiers", editingTier);
            success("Tier baru ditambahkan!");
        }
        setIsTierModalOpen(false);
        fetchReferralStats();
    } catch (err) {
        error("Gagal menyimpan tier.");
    }
  };

  const handleDeleteTier = async (id) => {
        if (await confirm({ title: "Hapus Tier", message: "Yakin hapus tier ini?", type: "danger" })) {
            try {
                await api.delete(`/admin/referral/tiers/${id}`);
                success("Tier dihapus!");
                fetchReferralStats();
            } catch (e) { error("Gagal menghapus tier."); }
        }
  };

  useEffect(() => {
    if (activeTab === "referral") {
        fetchReferralStats();
    }
  }, [activeTab]);
  
  const [editingCoupon, setEditingCoupon] = useState(null);

  // --- HANDLERS ---
  const handleEditClick = (coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingCoupon(null);
  };

  const handleDeleteCoupon = async (id) => {
    const isConfirmed = await confirm({
        title: "Hapus Kupon",
        message: "Apakah Anda yakin ingin menghapus kupon ini secara permanen?",
        type: "danger",
        confirmText: "Ya, Hapus"
    });

    if (isConfirmed) {
        try {
            await api.delete(`/vouchers/${id}`);
            setCoupons(coupons.filter(c => c.id !== id));
            success("Kupon berhasil dihapus.");
        } catch (err) {
            error(err.response?.data || "Terjadi kesalahan server");
        }
    }
  };


  const handleExportVouchers = () => {
    const exportData = formatDataForExport(coupons.filter(c => !c.is_automatic), {
        code: 'Kode',
        title: 'Judul',
        discount_value: 'Diskon',
        discount_type: 'Tipe',
        min_transaction: 'Min Blj',
        quota: 'Kuota',
        expired_at: 'Kadaluwarsa',
        is_active: 'Status'
    });
    exportToExcel(exportData, 'Daftar_Vocer', 'Vouchers');
  };

  const handleExportReferrals = () => {
    const exportData = formatDataForExport(referralData.rewards, {
        referrer_name: 'Referrer',
        referee_name: 'Referee',
        reward_amount: 'Reward',
        holding_until: 'Holding Until',
        status: 'Status'
    });
    exportToExcel(exportData, 'Data_Rewards_Referral', 'Referrals');
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out] relative">
      <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden min-h-[600px] flex flex-col">
        
        {/* HEADER & TABS */}
        <div className="p-3 border-b border-slate-50 flex flex-col-reverse md:flex-row justify-between items-start md:items-center gap-4 bg-white shrink-0">
          
          {/* TABS NAVIGATION */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1.5 rounded-xl w-full md:w-fit overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab("voucher")}
                className={`px-6 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all flex items-center justify-center min-w-[140px] whitespace-nowrap ${activeTab === 'voucher' ? 'bg-white text-[#F97316] shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/30'}`}
              >
                Vocer Belanja
              </button>
              <button 
                onClick={() => setActiveTab("referral")}
                className={`px-6 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all flex items-center justify-center min-w-[140px] whitespace-nowrap ${activeTab === 'referral' ? 'bg-white text-[#F97316] shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/30'}`}
              >
                Sistem Referral
              </button>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 w-full md:w-auto justify-end">
               {activeTab === 'voucher' && (
                   <>
                    <button 
                        onClick={handleExportVouchers}
                        className="w-full md:w-auto h-12 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        Export
                    </button>
                    <button 
                        onClick={() => { setEditingCoupon(null); setIsModalOpen(true); }}
                        className="w-full md:w-auto px-6 py-3 bg-[#F97316] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-900 transition shadow-lg shadow-orange-600/20 flex items-center justify-center gap-3 group active:scale-95"
                    >
                       <div className="w-5 h-5 bg-white/20 rounded-md flex items-center justify-center group-hover:rotate-90 transition-transform">
                           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                       </div>
                       Buat Vocer Baru
                    </button>
                   </>
               )}
               {activeTab === 'referral' && referralSubTab === 'monitoring' && (
                    <button 
                        onClick={handleExportReferrals}
                        className="w-full md:w-auto h-12 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        Export Rewards
                    </button>
               )}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="animate-fade-in flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-3 bg-white pb-1">
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                     {activeTab === 'referral' ? 'Monitoring Reward Referral' : `Daftar ${activeTab === 'voucher' ? 'Vocer Aktif' : 'Event Diskon'}`}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                     {activeTab === 'referral' 
                        ? `Total ${referralData.rewards.length} Transaksi Referral`
                        : `Total ${coupons.filter(c => !c.is_automatic).length} Promo Ditemukan`
                     }
                </p>
             </div>

              {loadingCoupons || loadingReferral ? (
                  <div className="p-6 space-y-4">
                      {Array(5).fill(0).map((_, i) => (
                          <div key={i} className="animate-pulse bg-slate-50 h-20 rounded-xl"></div>
                      ))}
                  </div>
              ) : activeTab === 'referral' ? (
                  <div className="flex flex-col flex-1 overflow-hidden">
                      {/* SUB-TABS REFERRAL */}
                      <div className="px-4 flex gap-4 border-b border-slate-50 mb-4 font-bold uppercase tracking-widest text-[10px] overflow-x-auto no-scrollbar">
                          <button 
                            onClick={() => setReferralSubTab("monitoring")}
                            className={`pb-3 transition-colors whitespace-nowrap ${referralSubTab === 'monitoring' ? 'text-[#F97316] border-b-2 border-[#F97316]' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Monitoring Rewards
                          </button>
                          <button 
                            onClick={() => setReferralSubTab("config")}
                            className={`pb-3 transition-colors whitespace-nowrap ${referralSubTab === 'config' ? 'text-[#F97316] border-b-2 border-[#F97316]' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Konfigurasi & Tier
                          </button>
                      </div>

                      {referralSubTab === 'monitoring' ? (
                        <div>
                            {/* REFERRAL OVERVIEW CARDS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-3 mb-4">
                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Total Rewards</p>
                                      <p className="text-xl font-bold text-slate-900">{referralData.overview.total_rewards || 0}</p>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Sudah Cair (Paid)</p>
                                      <p className="text-xl font-bold text-slate-900">Rp {new Intl.NumberFormat('id-ID').format(referralData.overview.total_paid_out || 0)}</p>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Tertunda (Pending)</p>
                                      <p className="text-xl font-bold text-slate-900">Rp {new Intl.NumberFormat('id-ID').format(referralData.overview.total_pending || 0)}</p>
                                </div>
                            </div>

                            {/* MOBILE REFERRAL CARDS */}
                            <div className="block sm:hidden divide-y divide-slate-50 border-t border-slate-50">
                                {referralData.rewards.length === 0 ? (
                                    <div className="px-6 py-20 text-center text-slate-400 italic">Belum ada transaksi referral</div>
                                ) : referralData.rewards.map((r) => (
                                    <div key={r.id} className="p-6 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div 
                                                onClick={() => navigate(`/admin/users?search=${r.referrer_name}`)}
                                                className="cursor-pointer group/ref"
                                            >
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Referrer</p>
                                                <p className="font-bold text-slate-900 group-hover/ref:text-[#F97316] transition-colors underline decoration-dotted underline-offset-4">{r.referrer_name}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border ${
                                                r.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                r.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                            }`}>
                                                {r.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div 
                                                onClick={() => navigate(`/admin/users?search=${r.referee_name}`)}
                                                className="cursor-pointer group/ref"
                                            >
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Referee</p>
                                                <p className="text-sm font-bold text-slate-700 group-hover/ref:text-[#F97316] transition-colors underline decoration-dotted underline-offset-4">{r.referee_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reward</p>
                                                <p className="text-sm font-bold text-emerald-600">Rp {new Intl.NumberFormat('id-ID').format(r.reward_amount)}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <p className="text-[10px] font-bold uppercase text-slate-400">
                                                Holding: {new Date(r.holding_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                            {r.status !== 'cancelled' && (
                                                <button 
                                                    onClick={async () => {
                                                        const reason = prompt("Alasan pembatalan:");
                                                        if (reason) {
                                                            try {
                                                                await api.post(`/admin/referral/rewards/${r.id}/cancel`, { reason });
                                                                success("Reward dibatalkan.");
                                                                fetchReferralStats();
                                                            } catch(e) { error("Gagal membatalkan reward."); }
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-rose-50 text-rose-500 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* DESKTOP REFERRAL TABLE */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left text-sm border-separate border-spacing-0">
                                    <thead>
                                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                            <th className="px-4 py-2">Referrer (Pengundang)</th>
                                            <th className="px-4 py-2">Referee (Undangan)</th>
                                            <th className="px-4 py-2 text-center">Reward</th>
                                            <th className="px-4 py-2 text-center">Holding Hingga</th>
                                            <th className="px-4 py-2 text-center">Status</th>
                                            <th className="px-4 py-2 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                                        {referralData.rewards.length === 0 ? (
                                            <tr><td colSpan="6" className="text-center py-20 text-slate-400 italic">Belum ada transaksi referral</td></tr>
                                        ) : referralData.rewards.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-1.5">
                                                    <div 
                                                        onClick={() => navigate(`/admin/users?search=${r.referrer_name}`)}
                                                        className="font-bold text-slate-900 cursor-pointer hover:text-[#F97316] transition-colors underline decoration-dotted decoration-slate-300 underline-offset-4 w-fit"
                                                    >
                                                        {r.referrer_name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-1.5">
                                                    <div 
                                                        onClick={() => navigate(`/admin/users?search=${r.referee_name}`)}
                                                        className="text-slate-500 cursor-pointer hover:text-[#F97316] transition-colors underline decoration-dotted decoration-slate-200 underline-offset-4 w-fit"
                                                    >
                                                        {r.referee_name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-1.5 text-center font-bold text-emerald-600">Rp {new Intl.NumberFormat('id-ID').format(r.reward_amount)}</td>
                                                <td className="px-4 py-1.5 text-center text-[10px] font-bold uppercase text-slate-400">
                                                    {new Date(r.holding_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-1.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border ${
                                                        r.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                        r.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                                    }`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-1.5 text-right">
                                                    {r.status !== 'cancelled' && (
                                                        <button 
                                                            onClick={async () => {
                                                                const reason = prompt("Alasan pembatalan:");
                                                                if (reason) {
                                                                    try {
                                                                        await api.post(`/admin/referral/rewards/${r.id}/cancel`, { reason });
                                                                        success("Reward dibatalkan.");
                                                                        fetchReferralStats();
                                                                    } catch(e) { error("Gagal membatalkan reward."); }
                                                                }
                                                            }}
                                                            className="text-rose-500 hover:underline text-[10px] font-bold uppercase"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                      ) : (
                        <div className="px-4 pb-8 overflow-y-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* GLOBAL CONFIG FORM */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h4 className="font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-orange-600">settings</span>
                                        Konfigurasi Global
                                    </h4>
                                    <form onSubmit={handleUpdateConfig} className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Potongan Harga Untuk Referee (Rp)</label>
                                            <input 
                                                type="number"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700"
                                                value={referralConfig.referee_discount}
                                                onChange={(e) => setReferralConfig({...referralConfig, referee_discount: parseInt(e.target.value)})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Masa Penahanan Reward (Hari)</label>
                                            <input 
                                                type="number"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-bold text-slate-700"
                                                value={referralConfig.holding_period_days}
                                                onChange={(e) => setReferralConfig({...referralConfig, holding_period_days: parseInt(e.target.value)})}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium">Saldo pengundang akan ditahan selama hari ini sebelum dipindahkan ke saldo aktif.</p>
                                        </div>
                                        <button 
                                            disabled={isConfigSaving}
                                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#F97316] transition disabled:opacity-50"
                                        >
                                            {isConfigSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                                        </button>
                                    </form>
                                </div>

                                {/* TIERS MANAGEMENT */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                            <span className="material-symbols-outlined text-orange-600">workspace_premium</span>
                                            Tier & Hadiah
                                        </h4>
                                        <button 
                                            onClick={() => { setEditingTier({ tier_name: '', min_referrals: 0, reward_amount: 0 }); setIsTierModalOpen(true); }}
                                            className="px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-orange-600 hover:text-white transition"
                                        >
                                            Tambah Tier
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {referralTiers.map(t => (
                                            <div key={t.id} className="p-4 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:shadow-lg hover:shadow-slate-200/50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold">
                                                        {t.tier_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm leading-tight">{t.tier_name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Min. {t.min_referrals} Referral Sukses</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reward</p>
                                                        <p className="font-bold text-emerald-600">Rp {new Intl.NumberFormat('id-ID').format(t.reward_amount)}</p>
                                                    </div>
                                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => { setEditingTier(t); setIsTierModalOpen(true); }}
                                                            className="w-7 h-7 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteTier(t.id)}
                                                            className="w-7 h-7 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                      )}
                  </div>
              ) : coupons.filter(c => !c.is_automatic).length === 0 ? (
                 <div className="text-center py-40 flex flex-col items-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-xl flex items-center justify-center text-slate-200 mb-6">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em] mb-8">Wah, belum ada Vocer nih!</p>
                    <button 
                        onClick={() => { setEditingCoupon(null); setIsModalOpen(true); }}
                        className="px-8 py-4 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#F97316] transition"
                    >
                        Buat Vocer Pertama
                    </button>
                 </div>
             ) : (
                 <div>
                    {/* MOBILE VOUCHER CARDS */}
                    <div className="block sm:hidden divide-y divide-slate-50 border-t border-slate-50">
                        {coupons
                            .filter(c => !c.is_automatic)
                            .map((v) => (
                                <div key={v.id} className="p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center border border-orange-100 shrink-0">
                                                <span className="material-symbols-outlined text-lg">confirmation_number</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-base tracking-tight">{v.code}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{v.title}</p>
                                            </div>
                                        </div>
                                        {(() => {
                                            const isExpired = new Date(v.expired_at) < new Date();
                                            if (isExpired) {
                                                return (
                                                    <span className="px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border bg-rose-50 text-rose-600 border-rose-100 flex items-center gap-1 w-fit">
                                                        Kadaluwarsa
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border transition-all ${v.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                    {v.is_active ? 'Aktif' : 'Off'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diskon</p>
                                            <p className="text-sm font-bold text-slate-800">
                                                {v.discount_type === 'percentage' ? `${v.discount_value}%` : `Rp ${new Intl.NumberFormat('id-ID').format(v.discount_value)}`}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Berlaku S/D</p>
                                            <p className="text-sm font-bold text-slate-800">
                                                {new Date(v.expired_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button 
                                            onClick={() => handleEditClick(v)}
                                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteCoupon(v.id)}
                                            className="px-4 py-2 bg-rose-50 text-rose-500 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">delete</span> Hapus
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* DESKTOP VOUCHER TABLE */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-sm border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                    <th className="px-4 py-2">Kode & Nama</th>
                                    <th className="px-4 py-2">Diskon</th>
                                    <th className="px-4 py-2">Syarat</th>
                                    <th className="px-4 py-2 text-center">Kuota</th>
                                    <th className="px-4 py-2">Berlaku</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                                {coupons
                                    .filter(c => !c.is_automatic)
                                    .map((v) => (
                                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-1.5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center border border-orange-100 shrink-0">
                                                    <span className="material-symbols-outlined text-base">confirmation_number</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-tight text-sm tracking-tight">{v.code}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{v.title}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5">
                                            <div className="flex flex-col">
                                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border transition-all w-fit ${v.discount_type === 'percentage' ? 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100' : 'bg-green-50 text-green-600 border-green-100 group-hover:bg-green-100'}`}>
                                                    {v.discount_type === 'percentage' ? `${v.discount_value}%` : `Rp ${new Intl.NumberFormat('id-ID').format(v.discount_value)}`}
                                                </span>
                                                {v.type === 'percentage' && v.max_discount > 0 && (
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                                        MAX: Rp {new Intl.NumberFormat('id-ID').format(v.max_discount)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5">
                                            <div className="flex flex-col gap-1.5 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min. Blj:</span>
                                                    <span className="text-xs font-bold text-slate-700 tracking-tight">Rp {new Intl.NumberFormat('id-ID').format(v.min_transaction || 0)}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {v.is_new_user_only && <span className="text-[8px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-md font-bold uppercase tracking-tighter border border-purple-100">New User</span>}
                                                    {v.is_stackable && <span className="text-[8px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-bold uppercase tracking-tighter border border-blue-100">Stackable</span>}
                                                    {v.is_automatic && <span className="text-[8px] px-1.5 py-0.5 bg-orange-50 text-[#F97316] rounded-md font-bold uppercase tracking-tighter border border-orange-100">Auto</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5 text-center">
                                            <div className="flex items-center justify-center gap-1.5 font-bold">
                                                <span className="text-xs">{v.quota > 0 ? `${v.quota}x` : '∞'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5">
                                            <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-tighter text-[10px]">
                                                <span className="material-symbols-outlined text-[14px]">event</span>
                                                <span>{new Date(v.expired_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5">
                                            {(() => {
                                                const isExpired = new Date(v.expired_at) < new Date();
                                                const isActive = v.is_active && !isExpired;
                                                
                                                if (isExpired) {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border bg-rose-50 text-rose-600 border-rose-100 flex items-center gap-1 w-fit">
                                                            <div className="w-1 h-1 rounded-full bg-rose-500"></div>
                                                            Kadaluwarsa
                                                        </span>
                                                    );
                                                }
                                                
                                                return (
                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border transition-all w-fit flex items-center gap-1 ${v.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                        <div className={`w-1 h-1 rounded-full ${v.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                                        {v.is_active ? 'Aktif' : 'Non-Aktif'}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-1.5 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button 
                                                    onClick={() => handleEditClick(v)}
                                                    className="w-8 h-8 rounded-lg bg-white text-slate-400 hover:bg-orange-950 hover:text-white border border-slate-100 transition-all shadow-sm active:scale-90 flex items-center justify-center"
                                                    title="Edit / Detail"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCoupon(v.id)}
                                                    className="w-8 h-8 rounded-lg bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 border border-slate-100 transition-all shadow-sm active:scale-90 flex items-center justify-center"
                                                    title="Hapus"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
             )}
          </div>
        </div>
      </div>

      {/* --- ADD/EDIT VOUCHER MODAL --- */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => { setIsModalOpen(false); resetForm(); }}></div>
              
              <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-fade-in-up">
                  <CreateCouponForm 
                      voucherId={editingCoupon?.id} 
                      onSuccess={() => {
                          setIsModalOpen(false);
                          resetForm();
                          fetchCoupons();
                      }}
                      onCancel={() => {
                          setIsModalOpen(false);
                          resetForm();
                      }}
                  />
              </div>
          </div>
      )}

      {/* --- ADD/EDIT TIER MODAL --- */}
      {isTierModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsTierModalOpen(false)}></div>
              <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-4 animate-fade-in-up">
                  <h4 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-6">
                      {editingTier.id ? 'Edit Tier Referral' : 'Tambah Tier Baru'}
                  </h4>
                  <form onSubmit={handleSaveTier} className="space-y-5">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nama Tier</label>
                          <input 
                              type="text"
                              required
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-700"
                              placeholder="Contoh: Gold"
                              value={editingTier.tier_name}
                              onChange={(e) => setEditingTier({...editingTier, tier_name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Minimal Referral Sukses</label>
                          <input 
                              type="number"
                              required
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-700"
                              value={editingTier.min_referrals}
                              onChange={(e) => setEditingTier({...editingTier, min_referrals: parseInt(e.target.value)})}
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Hadiah Per Transaksi (Rp)</label>
                          <input 
                              type="number"
                              required
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-700"
                              value={editingTier.reward_amount}
                              onChange={(e) => setEditingTier({...editingTier, reward_amount: parseInt(e.target.value)})}
                          />
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button 
                              type="button" 
                              onClick={() => setIsTierModalOpen(false)}
                              className="flex-1 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition"
                          >
                              Batal
                          </button>
                          <button 
                              type="submit"
                              className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#F97316] transition"
                          >
                              Simpan Tier
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPromos;
