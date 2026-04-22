import React from "react";
import { Link } from "react-router-dom";

const ActiveDashboard = ({ domains, pendingInvoicesCount, wallet, activities = [] }) => {
  // ... existing helpers ...
  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const getDaysLeft = (dateStr) => {
    if (!dateStr || isNaN(new Date(dateStr).getTime())) return 0;
    const exp = new Date(dateStr);
    const now = new Date();
    const diff = exp - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Helper Translate Action
  const translateAction = (action) => {
    const maps = {
      'LOGIN_SUCCESS': { title: 'Login Berhasil', desc: 'Anda baru saja masuk ke Dashboard Member.', color: 'bg-[#f97316]' },
      'LOGIN_GOOGLE': { title: 'Login via Google', desc: 'Berhasil masuk menggunakan akun Google.', color: 'bg-blue-500' },
      'REGISTER_GOOGLE': { title: 'Registrasi via Google', desc: 'Akun berhasil dibuat via Google.', color: 'bg-green-500' },
      'UPDATE_USER': { title: 'Update Profil', desc: 'Anda baru saja memperbarui informasi profil.', color: 'bg-purple-500' },
      'DELETE_USER': { title: 'Hapus User', desc: 'Data user berhasil dihapus dari sistem.', color: 'bg-red-500' },
      'CHECKOUT_DOMAIN': { title: 'Checkout Domain', desc: 'Pesanan baru dibuat, menunggu pembayaran.', color: 'bg-blue-400' },
      'PAYMENT_SUCCESS': { title: 'Pembayaran Berhasil', desc: 'Tagihan Anda telah lunas dibayar.', color: 'bg-green-500' },
      'SUBMIT_TRANSFER': { title: 'Transfer Domain', desc: 'Permintaan transfer domain diajukan.', color: 'bg-orange-400' },
      'TOPUP_WALLET': { title: 'Top Up Wallet', desc: 'Saldo wallet Anda telah bertambah.', color: 'bg-cyan-500' },
    };
    return maps[action] || { title: action, desc: 'Aktivitas terekam dalam sistem.', color: 'bg-slate-400' };
  };

  // Helper Format Jam / Waktu Lampau
  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return "Baru saja";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} menit yang lalu`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} jam yang lalu`;
    return date.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' });
  };

  // Hitung Domain Aktif (Belum Expired)
  const activeDomainsCount = domains.filter(d => d.expiration_date && getDaysLeft(d.expiration_date) > 0).length;

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Domain */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 flex items-center gap-4 hover:border-blue-200 transition">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              Total Domain
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {domains.length}
            </h3>
          </div>
        </div>

        {/* Domain Aktif (Count) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 flex items-center gap-4 hover:border-green-200 transition">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              Domain Aktif
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {activeDomainsCount}
            </h3>
          </div>
        </div>

        {/* Tagihan Pending */}
        <Link to="/dashboard/billing" className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 flex items-center gap-4 hover:border-orange-200 transition group cursor-pointer">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:text-orange-600 transition">
              Tagihan Pending
            </p>
            <h3 className={`text-2xl font-bold ${pendingInvoicesCount > 0 ? "text-[#F97316]" : "text-slate-900"}`}>
              {pendingInvoicesCount}
            </h3>
          </div>
        </Link>

        {/* Saldo Akun (NEW) */}
        <Link to="/dashboard/wallet" className="bg-[#f97316] p-6 rounded-lg shadow-xl shadow-orange-900/10 border border-orange-400/20 flex items-center gap-4 hover:scale-[1.02] transition group cursor-pointer">
          <div className="w-12 h-12 bg-white/20 text-white rounded-lg flex items-center justify-center group-hover:bg-white group-hover:text-[#f97316] transition">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">
              Saldo Akun
            </p>
            <h3 className="text-xl font-bold text-white">
              {formatRupiah(wallet?.balance)}
            </h3>
          </div>
        </Link>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. MAIN CONTENT - LIST DOMAIN (Left 2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* List Domain Terbaru */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F97316]"></span>
                Domain Terbaru
              </h3>
              <Link
                to="/dashboard/domains"
                className="text-xs font-bold text-[#F97316] hover:underline flex items-center gap-1"
              >
                Lihat Semua &rarr;
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {domains.slice(0, 3).map((dom) => (
                <div
                  key={dom.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:bg-slate-50 transition group gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-lg group-hover:bg-white group-hover:text-[#F97316] group-hover:shadow-md transition">
                      {dom.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-base">{dom.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Exp: {dom.expiration_date ? new Date(dom.expiration_date).toLocaleDateString("id-ID") : "-"}</span>
                        {dom.expiration_date && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${getDaysLeft(dom.expiration_date) < 30 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                          >
                            {getDaysLeft(dom.expiration_date)} Hari Lagi
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link 
                    to={`/dashboard/domains/${dom.id}`}
                    className="text-xs font-bold bg-white border border-slate-200 text-slate-600 px-6 py-3 h-12 rounded-lg hover:bg-slate-800 hover:text-white hover:border-slate-800 transition shadow-sm text-center flex items-center justify-center min-w-[140px]"
                  >
                    Kelola Domain
                  </Link>
                </div>
              ))}
            </div>
          </div>
          
          {/* 3. LOG AKTIVITAS (NEW) */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Aktivitas Terbaru
              </h3>
            </div>
            <div className="p-6">
              {activities.length > 0 ? (
                activities.map((act, idx) => {
                  const { title, desc, color } = translateAction(act.action);
                  const isLast = idx === activities.length - 1;
                  return (
                    <div key={act.id} className={`flex items-start gap-4 ${!isLast ? 'pb-6 border-l-2 border-slate-100' : ''} ml-3 pl-6 relative`}>
                      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 ${color.replace('bg-', 'border-')}`}></div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{title}</p>
                        <p className="text-xs text-slate-400 mt-1">{desc}</p>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">{formatTimeAgo(act.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400">Belum ada aktivitas terekam.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. SIDEBAR (Right 1/3) - QUICK ACTIONS */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group/menu">
              {/* Decorative Background Element */}
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover/menu:scale-110 transition-transform duration-700"></div>
              
              <h3 className="font-black text-slate-800 mb-6 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span>
                 Akses Cepat
              </h3>

              <div className="grid grid-cols-2 gap-4 relative z-10">
                 {/* Item: Beli Domain */}
                 <Link to="/dashboard/buy" className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50/50 hover:bg-orange-50 transition-all duration-300 group cursor-pointer border border-slate-100/50 hover:border-orange-200 hover:shadow-md hover:-translate-y-1">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2.5 text-orange-500 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-orange-600 transition-colors">Beli Domain</span>
                 </Link>

                 {/* Item: Transfer Domain */}
                 <Link to="/dashboard/transfer" className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50/50 hover:bg-blue-50 transition-all duration-300 group cursor-pointer border border-slate-100/50 hover:border-blue-200 hover:shadow-md hover:-translate-y-1">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2.5 text-blue-500 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-xl">move_up</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors text-center">Transfer</span>
                 </Link>

                 {/* Item: Domain Saya */}
                 <Link to="/dashboard/domains" className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50/50 hover:bg-emerald-50 transition-all duration-300 group cursor-pointer border border-slate-100/50 hover:border-emerald-200 hover:shadow-md hover:-translate-y-1">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2.5 text-emerald-500 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-xl">language</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Domain Saya</span>
                 </Link>

                 {/* Item: Dompet & Saldo */}
                 <Link to="/dashboard/wallet" className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50/50 hover:bg-indigo-50 transition-all duration-300 group cursor-pointer border border-slate-100/50 hover:border-indigo-200 hover:shadow-md hover:-translate-y-1">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2.5 text-indigo-500 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Dompet</span>
                 </Link>

                 {/* Item: Billing */}
                 <Link to="/dashboard/billing" className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50/50 hover:bg-amber-50 transition-all duration-300 group cursor-pointer border border-slate-100/50 hover:border-amber-200 hover:shadow-md hover:-translate-y-1">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-2.5 text-amber-500 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-xl">receipt_long</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-amber-600 transition-colors">Billing</span>
                 </Link>



                 {/* Item: Pengaturan */}
                 <Link to="/dashboard/settings" className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/50 hover:bg-slate-800 hover:text-white transition-all duration-300 group cursor-pointer border border-slate-100/50 hover:border-slate-700 hover:shadow-lg">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-slate-500 group-hover:text-slate-800 transition-all group-hover:rotate-[30deg]">
                       <span className="material-symbols-outlined text-xl">settings</span>
                    </div>
                    <div>
                       <span className="text-[10px] font-black uppercase tracking-widest block mb-0.5">Pengaturan Akun</span>
                       <span className="text-[9px] font-medium text-slate-400 group-hover:text-slate-300 transition-colors">Kelola profile & keamanan</span>
                    </div>
                 </Link>
              </div>
            </div>

           <div className="bg-[#1e293b] p-6 rounded-lg text-white relative overflow-hidden">
               <div className="relative z-10">
                   <h4 className="font-bold mb-1">Butuh Bantuan?</h4>
                   <p className="text-xs text-slate-400 mb-4">Chat Admin / CS kami siap membantu kendala Anda 24/7.</p>
                   <Link to="/dashboard/support" className="text-xs font-bold bg-[#F97316] w-full py-3 rounded-lg hover:bg-orange-600 transition text-white flex items-center justify-center gap-2 shadow-lg shadow-orange-950/20">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      Chat Customer Service
                   </Link>
               </div>
               <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-500 rounded-full opacity-20 blur-xl"></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveDashboard;
