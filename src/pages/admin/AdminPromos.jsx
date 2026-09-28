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
  const [activeTab, setActiveTab] = useState("voucher");
  const [referralData, setReferralData] = useState({ overview: {}, rewards: [] });
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [referralSubTab, setReferralSubTab] = useState("monitoring");
  const [referralConfig, setReferralConfig] = useState({ referee_discount: 0, holding_period_days: 7 });
  const [referralTiers, setReferralTiers] = useState([]);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    try {
      const res = await api.get("/admin/vouchers/list");
      setCoupons(res.data.data || res.data);
    } catch (err) {
      console.error("Gagal load coupons:", err);
    } finally { setLoadingCoupons(false); }
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
      setReferralData({ overview: statsRes.data.data.overview, rewards: rewardsRes.data.data });
      setReferralTiers(tiersRes.data.data || []);
      setReferralConfig(configRes.data.data || { referee_discount: 0, holding_period_days: 7 });
    } catch (err) {
      console.error("Gagal load referral data:", err);
    } finally { setLoadingReferral(false); }
  };

  useEffect(() => {
    if (activeTab === "referral") fetchReferralStats();
  }, [activeTab]);

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    setIsConfigSaving(true);
    try {
      await api.patch("/admin/referral/config", referralConfig);
      success("Konfigurasi referral diperbarui!");
    } catch (err) {
      error("Gagal memperbarui konfigurasi.");
    } finally { setIsConfigSaving(false); }
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

  const handleEditClick = (coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const resetForm = () => setEditingCoupon(null);

  const handleDeleteCoupon = async (id) => {
    if (await confirm({ title: "Hapus Kupon", message: "Apakah Anda yakin ingin menghapus kupon ini secara permanen?", type: "danger", confirmText: "Ya, Hapus" })) {
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
      code: 'Kode', title: 'Judul', discount_value: 'Diskon', discount_type: 'Tipe',
      min_transaction: 'Min Blj', quota: 'Kuota', expired_at: 'Kadaluwarsa', is_active: 'Status'
    });
    exportToExcel(exportData, 'Daftar_Vocer', 'Vouchers');
  };

  const handleExportReferrals = () => {
    const exportData = formatDataForExport(referralData.rewards, {
      referrer_name: 'Referrer', referee_name: 'Referee', reward_amount: 'Reward',
      holding_until: 'Holding Until', status: 'Status'
    });
    exportToExcel(exportData, 'Data_Rewards_Referral', 'Referrals');
  };

  const fmt = (num) => new Intl.NumberFormat('id-ID').format(num || 0);

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            Promo & Referral
          </p>
          <h2 className="text-base font-bold text-neutral-800 tracking-tight">
            {activeTab === 'referral' ? 'Sistem Referral' : 'Vocer Belanja'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'voucher' && (
            <>
              <button onClick={handleExportVouchers} className="btn btn-ghost btn-sm">
                <span className="material-symbols-outlined text-sm">download</span>
                Export
              </button>
              <button onClick={() => { setEditingCoupon(null); setIsModalOpen(true); }} className="btn btn-primary btn-sm">
                <span className="material-symbols-outlined text-sm">add</span>
                Buat Vocer
              </button>
            </>
          )}
          {activeTab === 'referral' && referralSubTab === 'monitoring' && (
            <button onClick={handleExportReferrals} className="btn btn-ghost btn-sm">
              <span className="material-symbols-outlined text-sm">download</span>
              Export Rewards
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-neutral-100 border border-neutral-200 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab("voucher")}
          className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'voucher' ? 'bg-white text-primary-500 shadow-sm border border-neutral-200' : 'text-neutral-400 hover:text-neutral-600'}`}>
          Vocer Belanja
        </button>
        <button onClick={() => setActiveTab("referral")}
          className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'referral' ? 'bg-white text-primary-500 shadow-sm border border-neutral-200' : 'text-neutral-400 hover:text-neutral-600'}`}>
          Sistem Referral
        </button>
      </div>

      {/* Content */}
      {loadingCoupons || loadingReferral ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse bg-neutral-50 h-16 rounded-xl" />
          ))}
        </div>
      ) : activeTab === 'referral' ? (
        <div className="space-y-5">
          {/* Referral Sub-tabs */}
          <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider border-b border-neutral-100">
            <button onClick={() => setReferralSubTab("monitoring")}
              className={`pb-3 transition-colors ${referralSubTab === 'monitoring' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-neutral-400 hover:text-neutral-600'}`}>
              Monitoring Rewards
            </button>
            <button onClick={() => setReferralSubTab("config")}
              className={`pb-3 transition-colors ${referralSubTab === 'config' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-neutral-400 hover:text-neutral-600'}`}>
              Konfigurasi & Tier
            </button>
          </div>

          {referralSubTab === 'monitoring' ? (
            <div className="space-y-5">
              {/* Stats Cards */}
              <div className="stats-grid">
                <div className="stats-card" style={{ background: "var(--color-primary-50)", borderColor: "var(--color-primary-200)" }}>
                  <div className="stats-card-icon" style={{ background: "var(--color-primary-100)", color: "var(--color-primary-600)" }}>
                    <span className="material-symbols-outlined">workspace_premium</span>
                  </div>
                  <div className="stats-card-info">
                    <p className="stats-card-label">Total Rewards</p>
                    <p className="stats-card-value">{referralData.overview.total_rewards || 0}</p>
                  </div>
                </div>
                <div className="stats-card" style={{ background: "var(--color-emerald-50)", borderColor: "var(--color-emerald-200)" }}>
                  <div className="stats-card-icon" style={{ background: "var(--color-emerald-100)", color: "var(--color-emerald-600)" }}>
                    <span className="material-symbols-outlined">paid</span>
                  </div>
                  <div className="stats-card-info">
                    <p className="stats-card-label">Sudah Cair (Paid)</p>
                    <p className="stats-card-value">Rp {fmt(referralData.overview.total_paid_out || 0)}</p>
                  </div>
                </div>
                <div className="stats-card" style={{ background: "var(--color-blue-50)", borderColor: "var(--color-blue-200)" }}>
                  <div className="stats-card-icon" style={{ background: "var(--color-blue-100)", color: "var(--color-blue-600)" }}>
                    <span className="material-symbols-outlined">hourglass_top</span>
                  </div>
                  <div className="stats-card-info">
                    <p className="stats-card-label">Tertunda (Pending)</p>
                    <p className="stats-card-value">Rp {fmt(referralData.overview.total_pending || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Mobile Referral Cards */}
              <div className="block sm:hidden space-y-3">
                {referralData.rewards.length === 0 ? (
                  <div className="empty-state"><p>Belum ada transaksi referral</p></div>
                ) : referralData.rewards.map((r) => (
                  <div key={r.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div onClick={() => navigate(`/admin/users?search=${r.referrer_name}`)} className="cursor-pointer">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Referrer</p>
                        <p className="text-xs font-bold text-neutral-700 underline decoration-dotted underline-offset-4">{r.referrer_name}</p>
                      </div>
                      <span className={`badge ${r.status === 'active' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : 'badge-neutral'}`}>{r.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div onClick={() => navigate(`/admin/users?search=${r.referee_name}`)} className="cursor-pointer">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Referee</p>
                        <p className="text-xs font-bold text-neutral-700 underline decoration-dotted underline-offset-4">{r.referee_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Reward</p>
                        <p className="text-xs font-bold text-emerald-600">Rp {fmt(r.reward_amount)}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-neutral-100">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Holding: {new Date(r.holding_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {r.status !== 'cancelled' && (
                        <button onClick={async () => { const reason = prompt("Alasan pembatalan:"); if (reason) { try { await api.post(`/admin/referral/rewards/${r.id}/cancel`, { reason }); success("Reward dibatalkan."); fetchReferralStats(); } catch(e) { error("Gagal membatalkan reward."); } } }}
                          className="btn btn-ghost btn-sm" style={{ color: "var(--color-rose-500)" }}>Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Referral Table */}
              <div className="hidden sm:block table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Referrer</th>
                      <th>Referee</th>
                      <th style={{ textAlign: "center" }}>Reward</th>
                      <th style={{ textAlign: "center" }}>Holding</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                      <th style={{ textAlign: "right" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralData.rewards.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-12 text-neutral-400 text-xs font-semibold">Belum ada transaksi referral</td></tr>
                    ) : referralData.rewards.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span onClick={() => navigate(`/admin/users?search=${r.referrer_name}`)}
                            className="text-xs font-bold text-neutral-700 cursor-pointer hover:text-primary-500 underline decoration-dotted underline-offset-4">{r.referrer_name}</span>
                        </td>
                        <td>
                          <span onClick={() => navigate(`/admin/users?search=${r.referee_name}`)}
                            className="text-xs font-semibold text-neutral-500 cursor-pointer hover:text-primary-500 underline decoration-dotted underline-offset-4">{r.referee_name}</span>
                        </td>
                        <td style={{ textAlign: "center" }} className="text-xs font-bold text-emerald-600">Rp {fmt(r.reward_amount)}</td>
                        <td style={{ textAlign: "center" }} className="text-[10px] font-bold text-neutral-400 uppercase">
                          {new Date(r.holding_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`badge ${r.status === 'active' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : 'badge-neutral'}`}>{r.status}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {r.status !== 'cancelled' && (
                            <button onClick={async () => { const reason = prompt("Alasan pembatalan:"); if (reason) { try { await api.post(`/admin/referral/rewards/${r.id}/cancel`, { reason }); success("Reward dibatalkan."); fetchReferralStats(); } catch(e) { error("Gagal membatalkan reward."); } } }}
                              className="btn btn-ghost btn-sm" style={{ color: "var(--color-rose-500)" }}>Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Global Config */}
              <div className="card">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">settings</span>
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Konfigurasi Global</h3>
                  </div>
                </div>
                <form onSubmit={handleUpdateConfig} className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">Potongan Harga Untuk Referee (Rp)</label>
                    <input type="number" className="form-input" value={referralConfig.referee_discount}
                      onChange={(e) => setReferralConfig({...referralConfig, referee_discount: parseInt(e.target.value)})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Masa Penahanan Reward (Hari)</label>
                    <input type="number" className="form-input" value={referralConfig.holding_period_days}
                      onChange={(e) => setReferralConfig({...referralConfig, holding_period_days: parseInt(e.target.value)})} />
                    <p className="text-[10px] font-bold text-neutral-400 mt-1">Saldo ditahan selama hari ini sebelum dipindahkan ke saldo aktif.</p>
                  </div>
                  <button disabled={isConfigSaving} className="btn btn-primary w-full">
                    {isConfigSaving ? "Menyimpan..." : "Simpan Konfigurasi"}
                  </button>
                </form>
              </div>

              {/* Tiers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-500">workspace_premium</span>
                    <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Tier & Hadiah</h3>
                  </div>
                  <button onClick={() => { setEditingTier({ tier_name: '', min_referrals: 0, reward_amount: 0 }); setIsTierModalOpen(true); }}
                    className="btn btn-ghost btn-sm">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Tambah Tier
                  </button>
                </div>
                <div className="space-y-3">
                  {referralTiers.map(t => (
                    <div key={t.id} className="card" style={{ padding: "14px 18px" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center font-bold text-sm">
                            {t.tier_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-neutral-700">{t.tier_name}</p>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Min. {t.min_referrals} Referral</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Reward</p>
                            <p className="text-xs font-bold text-emerald-600">Rp {fmt(t.reward_amount)}</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingTier(t); setIsTierModalOpen(true); }} className="btn btn-ghost btn-icon btn-sm">
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button onClick={() => handleDeleteTier(t.id)} className="btn btn-ghost btn-icon btn-sm" style={{ color: "var(--color-rose-500)" }}>
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {referralTiers.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-state-icon"><span className="material-symbols-outlined">workspace_premium</span></div>
                      <p>Belum ada tier referral</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : coupons.filter(c => !c.is_automatic).length === 0 ? (
        <div className="empty-state" style={{ padding: "80px 24px" }}>
          <div className="empty-state-icon"><span className="material-symbols-outlined">confirmation_number</span></div>
          <p>Wah, belum ada Vocer nih!</p>
          <button onClick={() => { setEditingCoupon(null); setIsModalOpen(true); }} className="btn btn-primary" style={{ marginTop: 16 }}>
            Buat Vocer Pertama
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Mobile Voucher Cards */}
          <div className="block sm:hidden divide-y divide-neutral-100">
            {coupons.filter(c => !c.is_automatic).map((v) => {
              const isExpired = new Date(v.expired_at) < new Date();
              return (
                <div key={v.id} className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center">
                        <span className="material-symbols-outlined">confirmation_number</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-800">{v.code}</p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{v.title}</p>
                      </div>
                    </div>
                    {isExpired ? (
                      <span className="badge badge-danger">Expired</span>
                    ) : (
                      <span className={`badge ${v.is_active ? 'badge-success' : 'badge-neutral'}`}>{v.is_active ? 'Aktif' : 'Off'}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Diskon</p>
                      <p className="text-xs font-bold text-neutral-700">
                        {v.discount_type === 'percentage' ? `${v.discount_value}%` : `Rp ${fmt(v.discount_value)}`}
                      </p>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Berlaku S/D</p>
                      <p className="text-xs font-bold text-neutral-700">
                        {new Date(v.expired_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => handleEditClick(v)} className="btn btn-ghost btn-sm">
                      <span className="material-symbols-outlined text-sm">edit</span> Edit
                    </button>
                    <button onClick={() => handleDeleteCoupon(v.id)} className="btn btn-ghost btn-sm" style={{ color: "var(--color-rose-500)" }}>
                      <span className="material-symbols-outlined text-sm">delete</span> Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Voucher Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50 border-b border-neutral-100">
                  <th className="px-5 py-3">Kode & Nama</th>
                  <th className="px-5 py-3">Diskon</th>
                  <th className="px-5 py-3">Syarat</th>
                  <th className="px-5 py-3 text-center">Kuota</th>
                  <th className="px-5 py-3">Berlaku</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {coupons.filter(c => !c.is_automatic).map((v) => {
                  const isExpired = new Date(v.expired_at) < new Date();
                  const isActive = v.is_active && !isExpired;
                  return (
                    <tr key={v.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-base">confirmation_number</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-neutral-800">{v.code}</p>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{v.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge ${v.discount_type === 'percentage' ? 'badge-info' : 'badge-success'}`}>
                          {v.discount_type === 'percentage' ? `${v.discount_value}%` : `Rp ${fmt(v.discount_value)}`}
                        </span>
                        {v.discount_type === 'percentage' && v.max_discount > 0 && (
                          <p className="text-[10px] font-bold text-neutral-400 mt-1">MAX: Rp {fmt(v.max_discount)}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[10px] font-bold text-neutral-400">Min Blj: <span className="text-neutral-700">Rp {fmt(v.min_transaction || 0)}</span></p>
                          <div className="flex gap-1">
                            {v.is_new_user_only && <span className="badge badge-purple" style={{ fontSize: 10 }}>New User</span>}
                            {v.is_stackable && <span className="badge badge-info" style={{ fontSize: 10 }}>Stackable</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-xs font-bold text-neutral-700">{v.quota > 0 ? `${v.quota}x` : '∞'}</td>
                      <td className="px-5 py-3 text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">event</span>
                        {new Date(v.expired_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        {isExpired ? (
                          <span className="badge badge-danger">Expired</span>
                        ) : (
                          <span className={`badge ${v.is_active ? 'badge-success' : 'badge-neutral'}`}>{v.is_active ? 'Aktif' : 'Non-Aktif'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEditClick(v)} className="btn btn-ghost btn-icon btn-sm">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button onClick={() => handleDeleteCoupon(v.id)} className="btn btn-ghost btn-icon btn-sm" style={{ color: "var(--color-rose-500)" }}>
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
      )}

      {/* Voucher Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setIsModalOpen(false); resetForm(); } }}>
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <CreateCouponForm
              voucherId={editingCoupon?.id}
              onSuccess={() => { setIsModalOpen(false); resetForm(); fetchCoupons(); }}
              onCancel={() => { setIsModalOpen(false); resetForm(); }}
            />
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {isTierModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsTierModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editingTier.id ? 'Edit Tier Referral' : 'Tambah Tier Baru'}</h3>
              <button onClick={() => setIsTierModalOpen(false)} style={{ width: 32, height: 32, background: "var(--color-neutral-50)", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-neutral-400)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <form onSubmit={handleSaveTier}>
              <div className="modal-body space-y-4">
                <div className="form-group">
                  <label className="form-label">Nama Tier</label>
                  <input type="text" required className="form-input" placeholder="Contoh: Gold"
                    value={editingTier.tier_name} onChange={(e) => setEditingTier({...editingTier, tier_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Minimal Referral Sukses</label>
                  <input type="number" required className="form-input"
                    value={editingTier.min_referrals} onChange={(e) => setEditingTier({...editingTier, min_referrals: parseInt(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hadiah Per Transaksi (Rp)</label>
                  <input type="number" required className="form-input"
                    value={editingTier.reward_amount} onChange={(e) => setEditingTier({...editingTier, reward_amount: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsTierModalOpen(false)} className="btn btn-ghost">Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Tier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromos;
