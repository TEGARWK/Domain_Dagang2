import React from "react";
import { Link } from "react-router-dom";
import StatsCard from "../../../components/ui/StatsCard";
import StatusBadge from "../../../components/ui/StatusBadge";

const ActiveDashboard = ({ domains, pendingInvoicesCount, wallet, activities = [], referralInfo }) => {
  const isEligibleForRefereeDiscount = referralInfo?.is_referee && !referralInfo?.referee_discount_used;
  const refereeDiscountPercent = referralInfo?.referee_discount_percent || 0;

  const formatRupiah = (num) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num || 0);

  const getDaysLeft = (dateStr) => {
    if (!dateStr || isNaN(new Date(dateStr).getTime())) return 0;
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const activeDomainsCount = domains.filter(d => d.expiration_date && getDaysLeft(d.expiration_date) > 0).length;

  const activitiesList = [
    { action: 'LOGIN_SUCCESS', title: 'Login Berhasil', desc: 'Anda baru saja masuk ke Dashboard Member.', color: 'border-primary-500' },
    { action: 'LOGIN_GOOGLE', title: 'Login via Google', desc: 'Berhasil masuk menggunakan akun Google.', color: 'border-blue-500' },
    { action: 'REGISTER_GOOGLE', title: 'Registrasi via Google', desc: 'Akun berhasil dibuat via Google.', color: 'border-green-500' },
    { action: 'UPDATE_USER', title: 'Update Profil', desc: 'Anda baru saja memperbarui informasi profil.', color: 'border-purple-500' },
    { action: 'DELETE_USER', title: 'Hapus User', desc: 'Data user berhasil dihapus dari sistem.', color: 'border-rose-500' },
    { action: 'CHECKOUT_DOMAIN', title: 'Checkout Domain', desc: 'Pesanan baru dibuat, menunggu pembayaran.', color: 'border-blue-400' },
    { action: 'PAYMENT_SUCCESS', title: 'Pembayaran Berhasil', desc: 'Tagihan Anda telah lunas dibayar.', color: 'border-green-500' },
    { action: 'SUBMIT_TRANSFER', title: 'Transfer Domain', desc: 'Permintaan transfer domain diajukan.', color: 'border-orange-400' },
    { action: 'TOPUP_WALLET', title: 'Top Up Wallet', desc: 'Saldo wallet Anda telah bertambah.', color: 'border-cyan-500' },
  ];

  const translateAction = (action) => activitiesList.find(a => a.action === action) || { title: action, desc: 'Aktivitas terekam dalam sistem.', color: 'border-neutral-400' };

  const formatTimeAgo = (dateStr) => {
    const diffSeconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diffSeconds < 60) return "Baru saja";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} menit yang lalu`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} jam yang lalu`;
    return new Date(dateStr).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' });
  };

  const quickLinks = [
    { title: "Beli Domain", icon: "add_shopping_cart", path: "/dashboard/buy" },
    { title: "Transfer", icon: "move_up", path: "/dashboard/transfer" },
    { title: "Domain Saya", icon: "language", path: "/dashboard/domains" },
    { title: "Dompet", icon: "account_balance_wallet", path: "/dashboard/wallet" },
    { title: "Billing", icon: "receipt_long", path: "/dashboard/billing" },
    { title: "Settings", icon: "settings", path: "/dashboard/settings" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="stats-grid">
        <StatsCard title="Total Domain" value={domains.length} icon="language" color="blue" trend="Total Terdaftar" to="/dashboard/domains" />
        <StatsCard title="Domain Aktif" value={activeDomainsCount} icon="check_circle" color="green" trend="Dalam Layanan" to="/dashboard/domains" />
        <StatsCard title="Tagihan Pending" value={pendingInvoicesCount} icon="receipt_long" color="amber" trend="Menunggu Bayar" to="/dashboard/billing" />
        <StatsCard title="Saldo Akun" value={formatRupiah(wallet?.balance)} icon="account_balance_wallet" color="orange" trend="Saldo Tersedia" to="/dashboard/wallet" />
      </div>

      {isEligibleForRefereeDiscount && (
        <div className="card flex flex-col md:flex-row items-center justify-between gap-4" style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", borderColor: "#a7f3d0" }}>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">redeem</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-800 tracking-tight">Klaim Hadiah Referral!</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Dapatkan potongan <span className="font-bold text-emerald-600">{refereeDiscountPercent}%</span> untuk transaksi pertama Anda.</p>
            </div>
          </div>
          <Link to="/dashboard/buy" className="btn btn-primary btn-sm">Gunakan Sekarang</Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-50">
              <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                Domain Terbaru
              </h3>
              <Link to="/dashboard/domains" className="text-[10px] font-bold text-primary-500 hover:underline flex items-center gap-1">
                Lihat Semua <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </div>
            <div className="divide-y divide-neutral-50">
              {domains.slice(0, 3).map((dom) => (
                <div key={dom.id} className="px-5 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:bg-neutral-50 transition gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-neutral-50 flex items-center justify-center font-bold text-neutral-300">
                      {dom.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-800 text-sm">{dom.name}</p>
                      <p className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span>Exp: {dom.expiration_date ? new Date(dom.expiration_date).toLocaleDateString("id-ID") : "-"}</span>
                        {dom.expiration_date && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${getDaysLeft(dom.expiration_date) < 30 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                            {getDaysLeft(dom.expiration_date)} hr
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link to={`/dashboard/domains/${dom.id}`} className="btn btn-ghost btn-sm">Kelola</Link>
                </div>
              ))}
              {domains.length === 0 && (
                <div className="px-5 py-8 text-center text-xs text-neutral-400 font-semibold">Belum ada domain terdaftar</div>
              )}
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-50">
              <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Aktivitas Terbaru
              </h3>
            </div>
            <div className="p-5">
              {activities.length > 0 ? activities.map((act, idx) => {
                const { title, desc, color } = translateAction(act.action);
                const isLast = idx === activities.length - 1;
                return (
                  <div key={act.id} className={`flex items-start gap-3 ${!isLast ? 'pb-4 border-l-2 border-neutral-100' : ''} ml-3 pl-5 relative`}>
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 ${color}`} />
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">{title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{desc}</p>
                      <p className="text-[10px] text-neutral-400 mt-1.5 font-medium">{formatTimeAgo(act.created_at)}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-6">
                  <p className="text-xs text-neutral-400 font-semibold">Belum ada aktivitas terekam.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Akses Cepat
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <Link key={link.path} to={link.path} className="flex flex-col items-center justify-center p-3 rounded-lg bg-neutral-50 hover:bg-primary-50 transition-all border border-neutral-100 hover:border-primary-200">
                  <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2 text-primary-500">
                    <span className="material-symbols-outlined text-lg">{link.icon}</span>
                  </div>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">{link.title}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-5 text-white" style={{ background: "var(--color-neutral-800)", borderColor: "var(--color-neutral-700)" }}>
            <h4 className="font-bold mb-1 text-sm">Butuh Bantuan?</h4>
            <p className="text-xs text-neutral-400 mb-4">Tim support kami siap membantu 24/7.</p>
            <Link to="/dashboard/support" className="btn btn-primary w-full justify-center">
              <span className="material-symbols-outlined text-sm">support_agent</span>
              Hubungi CS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveDashboard;
