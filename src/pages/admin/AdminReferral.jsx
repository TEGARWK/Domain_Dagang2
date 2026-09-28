import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const AdminReferral = () => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("merchants");
  const [config, setConfig] = useState({ referee_discount: 5000, holding_period_days: 3, commission_tier_1_percent: 20, commission_tier_2_percent: 10 });
  const [merchants, setMerchants] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [searchMerchant, setSearchMerchant] = useState("");
  const [searchReward, setSearchReward] = useState("");
  const [rewardFilter, setRewardFilter] = useState("all");
  const [rewardTierFilter, setRewardTierFilter] = useState("all");
  const [merchantSort, setMerchantSort] = useState({ key: "total_referrals", direction: "desc" });
  const [rewardSort, setRewardSort] = useState({ key: "created_at", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [stats, setStats] = useState(null);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cRes, mRes, sRes, wRes] = await Promise.all([
        api.get("/admin/referral/config"), api.get("/admin/referral/merchants"),
        api.get("/admin/referral/stats"), api.get("/admin/referral/rewards")
      ]);
      if (cRes.data.success) setConfig(cRes.data.data);
      if (mRes.data.success) setMerchants(mRes.data.data);
      if (sRes.data.success) setStats(sRes.data.data.overview);
      if (wRes.data.success) setWithdrawals(wRes.data.data);
    } catch { error("Gagal memuat data referral."); }
    finally { setLoading(false); }
  };

  const handleSaveConfig = async () => {
    try {
      const res = await api.patch("/admin/referral/config", config);
      if (res.data.success) success("Konfigurasi berhasil disimpan!");
    } catch { error("Gagal menyimpan konfigurasi."); }
  };

  const fmt = (num) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num || 0);

  const SortIcon = ({ tab, column }) => {
    const cfg = tab === 'merchants' ? merchantSort : rewardSort;
    if (cfg.key !== column) return <span className="text-neutral-300 text-xs ml-1">⇅</span>;
    return <span className="text-xs ml-1 text-primary-500">{cfg.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleSort = (tab, key) => {
    if (tab === 'merchants') setMerchantSort(p => ({ key, direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc' }));
    else setRewardSort(p => ({ key, direction: p.key === key && p.direction === 'asc' ? 'desc' : 'asc' }));
  };

  if (loading && !stats) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-neutral-100 rounded-lg" />
      <div className="h-12 w-full bg-neutral-50 rounded-xl" />
      <div className="h-64 bg-white border border-neutral-100 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            Afiliasi
          </p>
          <h2 className="text-base font-bold text-neutral-800 tracking-tight">Pantau performa referral & kelola komisi</h2>
        </div>
        <button onClick={loadAllData} className="btn btn-ghost btn-sm">
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-card-icon" style={{ background: "var(--color-primary-50)", color: "var(--color-primary-500)" }}>
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div className="stats-card-info">
            <p className="stats-card-label">Komisi Cair</p>
            <p className="stats-card-value">{fmt(stats?.total_paid)}</p>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card-icon" style={{ background: "var(--color-blue-50)", color: "var(--color-blue-600)" }}>
            <span className="material-symbols-outlined">hourglass_empty</span>
          </div>
          <div className="stats-card-info">
            <p className="stats-card-label">Bonus Pending</p>
            <p className="stats-card-value">{fmt(stats?.total_pending)}</p>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card-icon" style={{ background: "var(--color-indigo-50)", color: "var(--color-indigo-600)" }}>
            <span className="material-symbols-outlined">storefront</span>
          </div>
          <div className="stats-card-info">
            <p className="stats-card-label">Total Merchant</p>
            <p className="stats-card-value">{stats?.total_merchants || 0}</p>
          </div>
        </div>
        <div className="stats-card" style={{ background: "var(--color-neutral-800)", borderColor: "var(--color-neutral-700)" }}>
          <div className="stats-card-icon" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>
            <span className="material-symbols-outlined">history_edu</span>
          </div>
          <div className="stats-card-info">
            <p className="stats-card-label" style={{ color: "var(--color-neutral-400)" }}>Total Transaksi</p>
            <p className="stats-card-value" style={{ color: "#fff" }}>{stats?.total_rewards || 0}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-neutral-100 border border-neutral-200 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab("merchants")}
          className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "merchants" ? "bg-white text-primary-500 shadow-sm border border-neutral-200" : "text-neutral-400 hover:text-neutral-600"}`}>
          <span className="material-symbols-outlined text-sm">group</span>
          Data Referral
        </button>
        <button onClick={() => setActiveTab("config")}
          className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "config" ? "bg-white text-primary-500 shadow-sm border border-neutral-200" : "text-neutral-400 hover:text-neutral-600"}`}>
          <span className="material-symbols-outlined text-sm">settings</span>
          Setting Komisi
        </button>
        <button onClick={() => setActiveTab("withdrawals")}
          className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "withdrawals" ? "bg-white text-primary-500 shadow-sm border border-neutral-200" : "text-neutral-400 hover:text-neutral-600"}`}>
          <span className="material-symbols-outlined text-sm">history_edu</span>
          Riwayat Komisi
        </button>
      </div>

      {/* Data Referral Tab */}
      {activeTab === "merchants" && (() => {
        const filtered = merchants.filter(m =>
          m.name?.toLowerCase().includes(searchMerchant.toLowerCase()) ||
          m.email?.toLowerCase().includes(searchMerchant.toLowerCase()) ||
          m.referral_code?.toLowerCase().includes(searchMerchant.toLowerCase())
        ).sort((a, b) => {
          const f = merchantSort.direction === 'asc' ? 1 : -1;
          if (merchantSort.key === 'total_referrals') return (a.total_invite - b.total_invite) * f;
          if (merchantSort.key === 'total_earned') return (a.active_commission - b.active_commission) * f;
          return (a.name?.localeCompare(b.name)) * f;
        });
        const tp = Math.ceil(filtered.length / itemsPerPage);
        const pg = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        return (
          <div className="space-y-4">
            <div className="table-wrap">
              <div className="table-header">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-primary-500" />
                  <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Data Referral Merchant</h3>
                </div>
                <div className="flex items-center gap-3">
                  <input type="text" placeholder="Cari nama, email, kode..." value={searchMerchant}
                    onChange={(e) => { setSearchMerchant(e.target.value); setCurrentPage(1); }}
                    className="form-input" style={{ width: 240, height: 34, fontSize: 11, padding: "0 12px" }} />
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th className="cursor-pointer hover:text-neutral-600" onClick={() => handleSort('merchants', 'name')}>
                      Merchant <SortIcon tab="merchants" column="name" />
                    </th>
                    <th>Kode Referral</th>
                    <th>Link Register</th>
                    <th style={{ textAlign: "center" }} className="cursor-pointer hover:text-neutral-600" onClick={() => handleSort('merchants', 'total_referrals')}>
                      Total Invite <SortIcon tab="merchants" column="total_referrals" />
                    </th>
                    <th style={{ textAlign: "right" }} className="cursor-pointer hover:text-neutral-600" onClick={() => handleSort('merchants', 'total_earned')}>
                      Saldo Komisi <SortIcon tab="merchants" column="total_earned" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pg.length > 0 ? pg.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center text-xs font-bold uppercase">
                            {m.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-neutral-700">{m.name}</p>
                            <p className="text-[10px] font-bold text-neutral-400">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="bg-neutral-100 px-2 py-1 rounded text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                          {m.referral_code || "BELUM ADA"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-400 truncate max-w-[140px]">
                            {m.referral_code ? `${window.location.origin}/register?ref=${m.referral_code}` : "-"}
                          </span>
                          {m.referral_code && (
                            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register?ref=${m.referral_code}`); success("Link disalin!"); }}
                              className="text-neutral-400 hover:text-primary-500 transition-colors">
                              <span className="material-symbols-outlined text-sm">content_copy</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="bg-neutral-50 px-2 py-1 rounded font-bold text-xs text-neutral-700 border border-neutral-100">
                          {m.total_invite}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <p className="text-xs font-bold text-emerald-600">{fmt(m.active_commission)}</p>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="text-center py-12 text-neutral-400 text-xs font-semibold">Belum ada data merchant.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Total <span className="text-primary-500">{filtered.length} Merchant</span> • Hal {currentPage}/{tp || 1}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-ghost btn-sm">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                  Kembali
                </button>
                <button onClick={() => setCurrentPage(p => Math.min(tp, p + 1))} disabled={currentPage === tp || tp === 0} className="btn btn-primary btn-sm">
                  Lanjut
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Setting Komisi Tab */}
      {activeTab === "config" && (
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">settings</span>
              </div>
              <div>
                <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Pengaturan Komisi Afiliasi</h3>
              </div>
            </div>
            <div className="card mb-5" style={{ background: "var(--color-blue-50)", borderColor: "var(--color-blue-200)", padding: "12px 16px" }}>
              <p className="text-[11px] text-blue-700 font-semibold">
                Komisi dihitung berdasarkan persentase dari harga paket yang dibayarkan merchant.
              </p>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Komisi Tier 1 (Direct) %</label>
                  <input type="number" className="form-input" value={config.commission_tier_1_percent}
                    onChange={(e) => setConfig({ ...config, commission_tier_1_percent: e.target.value })} />
                  <p className="text-[10px] font-bold text-neutral-400 mt-1">Komisi untuk referrer langsung.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Komisi Tier 2 (Indirect) %</label>
                  <input type="number" className="form-input" value={config.commission_tier_2_percent}
                    onChange={(e) => setConfig({ ...config, commission_tier_2_percent: e.target.value })} />
                  <p className="text-[10px] font-bold text-neutral-400 mt-1">Komisi untuk grand referrer.</p>
                </div>
              </div>
              <hr className="border-neutral-100" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Diskon Pendaftar Baru (Rp)</label>
                  <input type="number" className="form-input" value={config.referee_discount}
                    onChange={(e) => setConfig({ ...config, referee_discount: e.target.value })} />
                  <p className="text-[10px] font-bold text-neutral-400 mt-1">Diskon untuk pendaftar via link referral.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Masa Tunggu Komisi (Hari)</label>
                  <input type="number" className="form-input" value={config.holding_period_days}
                    onChange={(e) => setConfig({ ...config, holding_period_days: e.target.value })} />
                  <p className="text-[10px] font-bold text-neutral-400 mt-1">Lama komisi tertahan sebelum cair.</p>
                </div>
              </div>
              <div className="flex justify-center pt-2">
                <button onClick={handleSaveConfig} className="btn btn-primary">Simpan Konfigurasi</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Komisi Tab */}
      {activeTab === "withdrawals" && (() => {
        const filtered = (withdrawals || []).filter(w => {
          const ms = (w.referrer_name?.toLowerCase() || '').includes(searchReward.toLowerCase()) || (w.referee_name?.toLowerCase() || '').includes(searchReward.toLowerCase());
          const ms2 = rewardFilter === "all" || w.status === rewardFilter;
          const mt = rewardTierFilter === "all" || w.reward_tier?.toString() === rewardTierFilter;
          return ms && ms2 && mt;
        }).sort((a, b) => {
          const f = rewardSort.direction === 'asc' ? 1 : -1;
          if (rewardSort.key === 'amount') return (a.reward_amount - b.reward_amount) * f;
          if (rewardSort.key === 'created_at') return (new Date(a.created_at) - new Date(b.created_at)) * f;
          return (a.referrer_name?.localeCompare(b.referrer_name)) * f;
        });
        const tp = Math.ceil(filtered.length / itemsPerPage);
        const pg = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        const sa = filtered.filter(w => w.status === 'active').reduce((s, w) => s + Number(w.reward_amount || 0), 0);
        const sp = filtered.filter(w => w.status === 'pending').reduce((s, w) => s + Number(w.reward_amount || 0), 0);

        return (
          <div className="space-y-4">
            <div className="table-wrap">
              <div className="table-header">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-emerald-500" />
                  <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Riwayat Komisi Afiliasi</h3>
                </div>
                <div className="flex items-center gap-3">
                  <select value={rewardFilter} onChange={(e) => { setRewardFilter(e.target.value); setCurrentPage(1); }}
                    className="form-select" style={{ height: 34, fontSize: 11, padding: "0 28px 0 12px", width: 130 }}>
                    <option value="all">Semua</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                  </select>
                  <select value={rewardTierFilter} onChange={(e) => { setRewardTierFilter(e.target.value); setCurrentPage(1); }}
                    className="form-select" style={{ height: 34, fontSize: 11, padding: "0 28px 0 12px", width: 110 }}>
                    <option value="all">Semua Tier</option>
                    <option value="1">Tier 1</option>
                    <option value="2">Tier 2</option>
                  </select>
                  <input type="text" placeholder="Cari..." value={searchReward}
                    onChange={(e) => { setSearchReward(e.target.value); setCurrentPage(1); }}
                    className="form-input" style={{ width: 160, height: 34, fontSize: 11, padding: "0 12px" }} />
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th className="cursor-pointer hover:text-neutral-600" onClick={() => handleSort('rewards', 'created_at')}>
                      Tanggal <SortIcon tab="rewards" column="created_at" />
                    </th>
                    <th className="cursor-pointer hover:text-neutral-600" onClick={() => handleSort('rewards', 'name')}>
                      Referrer <SortIcon tab="rewards" column="name" />
                    </th>
                    <th>Referee</th>
                    <th style={{ textAlign: "center" }}>Tier</th>
                    <th style={{ textAlign: "right" }} className="cursor-pointer hover:text-neutral-600" onClick={() => handleSort('rewards', 'amount')}>
                      Nominal <SortIcon tab="rewards" column="amount" />
                    </th>
                    <th style={{ textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.length > 0 ? pg.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <p className="text-[11px] font-bold text-neutral-700">{new Date(w.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <p className="text-[9px] text-neutral-400 font-bold">{new Date(w.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td>
                        <p className="text-xs font-bold text-neutral-700">{w.referrer_name}</p>
                        <p className="text-[9px] text-neutral-400 font-bold">#{w.referrer_id}</p>
                      </td>
                      <td>
                        <p className="text-xs font-semibold text-neutral-600">{w.referee_name}</p>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${w.reward_tier === 1 ? 'badge-info' : 'badge-warning'}`}>Tier {w.reward_tier}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <p className="text-xs font-bold text-neutral-700">{fmt(w.reward_amount)}</p>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${w.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                          {w.status === 'active' ? 'Selesai' : 'Tertahan'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="text-center py-12 text-neutral-400 text-xs font-semibold">Belum ada riwayat komisi.</td></tr>
                  )}
                </tbody>
                {pg.length > 0 && (
                  <tfoot className="bg-neutral-50">
                    <tr className="text-xs font-bold text-neutral-700">
                      <td colSpan="4" className="px-5 py-3 text-right text-[10px] text-neutral-400 uppercase tracking-wider">Ringkasan:</td>
                      <td className="px-5 py-3 text-right">
                        <p className="text-primary-500">{fmt(sa + sp)}</p>
                        <p className="text-[9px] text-emerald-600">Selesai: {fmt(sa)}</p>
                        <p className="text-[9px] text-amber-600">Pending: {fmt(sp)}</p>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Total <span className="text-emerald-500">{filtered.length} Transaksi</span> • Hal {currentPage}/{tp || 1}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-ghost btn-sm">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                  Kembali
                </button>
                <button onClick={() => setCurrentPage(p => Math.min(tp, p + 1))} disabled={currentPage === tp || tp === 0} className="btn btn-primary btn-sm">
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
