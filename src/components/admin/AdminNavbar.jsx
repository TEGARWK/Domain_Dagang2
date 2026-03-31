import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";

const AdminNavbar = ({ setSidebarOpen }) => {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { notifications, unreadCount, markAllAsRead } = useNotification();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/admin") return "Overview";
    if (path.startsWith("/admin/invoices")) return "Kelola Invoice";
    if (path.startsWith("/admin/users")) return "Daftar User";
    if (path.startsWith("/admin/domains")) return "Manajemen Domain";
    if (path.startsWith("/admin/transfers")) return "Pengajuan Transfer";
    if (path.startsWith("/admin/pricing")) return "Atur Harga";
    if (path.startsWith("/admin/promos")) return "Promo & Marketing";
    if (path.startsWith("/admin/payment-gateways")) return "Metode Pembayaran";
    if (path.startsWith("/admin/notifications")) return "Notifikasi";
    if (path.startsWith("/admin/registrar-balance")) return "Saldo Registrar";
    if (path.startsWith("/admin/faqs")) return "Katalog Bantuan";
    if (path.startsWith("/admin/support-tickets")) return "Tiket Bantuan";
    if (path.startsWith("/admin/logs")) return "Log Aktivitas";
    return "Admin Panel";
  };

  const getPageIcon = () => {
    const path = location.pathname;
    if (path === "/admin") return "dashboard";
    if (path.startsWith("/admin/invoices")) return "receipt_long";
    if (path.startsWith("/admin/users")) return "group";
    if (path.startsWith("/admin/domains")) return "language";
    if (path.startsWith("/admin/transfers")) return "swap_horiz";
    if (path.startsWith("/admin/pricing")) return "payments";
    if (path.startsWith("/admin/promos")) return "campaign";
    if (path.startsWith("/admin/payment-gateways")) return "credit_card";
    if (path.startsWith("/admin/notifications")) return "notifications";
    if (path.startsWith("/admin/registrar-balance")) return "account_balance_wallet";
    if (path.startsWith("/admin/faqs")) return "live_help";
    if (path.startsWith("/admin/support-tickets")) return "support_agent";
    if (path.startsWith("/admin/logs")) return "history";
    return "admin_panel_settings";
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between shadow-sm transition-all duration-300">
      
      {/* 1. LEFT: PAGE TITLE & BREADCRUMB */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        <button 
          onClick={setSidebarOpen}
          className="lg:hidden w-9 h-9 flex items-center justify-center text-slate-500 hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className="w-9 h-9 bg-orange-50 text-[#F97316] rounded-lg flex items-center justify-center hidden sm:flex">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{getPageIcon()}</span>
        </div>
        <div className="flex flex-col">
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
            <span>Admin</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#F97316]">Control</span>
          </div>
          <h1 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-none uppercase">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* 2. MIDDLE: DATE/TIME CAPSULE */}
      <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-widest shadow-sm">
        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
        <span>{currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
        <span className="text-slate-300 mx-0.5">•</span>
        <span className="text-slate-600">{formatTime(currentTime)}</span>
      </div>

      {/* 3. RIGHT: ACTIONS & STATUS */}
      <div className="flex items-center gap-4">
        
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className={`w-10 h-10 rounded-lg transition relative group flex items-center justify-center ${showNotifDropdown ? 'bg-orange-50 text-[#F97316]' : 'text-slate-400 hover:text-[#F97316] hover:bg-orange-50'}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-[0.2em]">Notifikasi</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[9px] font-bold text-[#F97316] uppercase hover:underline"
                  >
                    Baca Semua
                  </button>
                )}
              </div>
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Tidak ada notifikasi</p>
                  </div>
                ) : (
                  notifications.slice(0, 5).map(n => (
                    <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors relative cursor-default ${!n.is_read ? 'bg-orange-50/20' : ''}`}>
                      {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F97316]"></div>}
                      <h4 className="text-[11px] font-bold text-slate-800 uppercase mb-1">{n.title}</h4>
                      <p className="text-[10px] text-slate-500 font-bold leading-relaxed mb-2">{n.message}</p>
                      <span className="text-[8px] text-slate-300 font-bold uppercase tracking-wider">{new Date(n.created_at).toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-center">
                 <Link to="/admin/notifications" onClick={() => setShowNotifDropdown(false)} className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition">Lihat Semua</Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile / Account */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-100 group cursor-default">
          <div className="text-right hidden xl:block">
            <p className="text-xs font-bold text-slate-800 leading-none mb-1">
              Administrator
            </p>
            <p className="text-[9px] font-bold text-[#F97316] uppercase tracking-tighter">
              Master Level
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#faefe9] flex items-center justify-center text-[#F97316] font-bold text-sm border-2 border-transparent group-hover:border-orange-200 transition shadow-sm overflow-hidden">
            A
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
