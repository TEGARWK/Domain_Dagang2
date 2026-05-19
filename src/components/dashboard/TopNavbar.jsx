import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";

const TopNavbar = ({ user, cartCount, setSidebarOpen }) => {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { notifications, unreadCount, markAllAsRead, fetchNotifications } = useNotification();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- LOGIC JUDUL DINAMIS ---
  const getPageTitle = () => {
    const path = location.pathname;

    if (path === "/dashboard") return "Dashboard";
    if (path.startsWith("/dashboard/buy")) return "Beli Domain";
    if (path.startsWith("/dashboard/domains")) return "Domain Saya";
    if (path.startsWith("/dashboard/billing")) return "Tagihan";
    if (path.startsWith("/dashboard/vouchers")) return "Voucher Saya";
    if (path.startsWith("/dashboard/settings")) return "Pengaturan";
    if (path.startsWith("/dashboard/support")) return "Pusat Bantuan";
    if (path.startsWith("/dashboard/notifications")) return "Notifikasi";

    return "Dashboard"; 
  };

  const getPageIcon = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "grid_view";
    if (path.startsWith("/dashboard/buy")) return "shopping_cart";
    if (path.startsWith("/dashboard/domains")) return "language";
    if (path.startsWith("/dashboard/billing")) return "account_balance_wallet";
    if (path.startsWith("/dashboard/vouchers")) return "confirmation_number";
    if (path.startsWith("/dashboard/settings")) return "settings";
    if (path.startsWith("/dashboard/notifications")) return "notifications";
    return "dashboard";
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
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">
            <span>Member</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#F97316]">{user ? user.name.split(" ")[0] : "Area"}</span>
          </div>
          <h1 className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight leading-none uppercase">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* 2. MIDDLE: DATE/TIME */}
      <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 font-semibold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-widest">
        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
        <span>{currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
        <span className="text-slate-300 mx-0.5">•</span>
        <span className="text-slate-600">{formatTime(currentTime)}</span>
      </div>

      {/* 3. RIGHT: ACTIONS & PROFILE */}
      <div className="flex items-center gap-4">
        
        {/* ACTIONS */}
        <div className="flex items-center gap-1">
          {/* Notification */}
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
              <div className="fixed inset-x-4 top-[70px] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 w-auto sm:w-80 bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-4 border-b border-white/20 flex items-center justify-between bg-white/40">
                  <h3 className="text-[10px] font-semibold text-slate-800 uppercase tracking-[0.2em]">Notifikasi</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[9px] font-semibold text-[#F97316] uppercase hover:underline bg-orange-50 px-2 py-1 rounded-md"
                    >
                      Baca Semua
                    </button>
                  )}
                </div>
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 opacity-50">
                        <span className="material-symbols-outlined text-slate-300">notifications_off</span>
                      </div>
                      <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest leading-relaxed">Inbox Kosong</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map(n => (
                      <div key={n.id} className={`p-4 border-b border-white/10 hover:bg-white/60 transition-all relative cursor-default group ${!n.is_read ? 'bg-orange-50/30' : ''}`}>
                        {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F97316] shadow-[2px_0_8px_rgba(249,115,22,0.3)]"></div>}
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className={`text-[11px] font-semibold uppercase transition-colors ${!n.is_read ? 'text-[#F97316]' : 'text-slate-700'}`}>{n.title}</h4>
                          <span className="text-[8px] text-slate-400 font-semibold whitespace-nowrap">{new Date(n.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</span>
                        </div>
                        <p className={`text-[10px] leading-relaxed mb-1 ${!n.is_read ? 'text-slate-800 font-semibold' : 'text-slate-500 font-medium'}`}>{n.message}</p>
                        <span className="text-[8px] text-slate-300 font-semibold uppercase tracking-wider">{new Date(n.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 bg-white/40 border-t border-white/20 text-center">
                   <Link to="/dashboard/notifications" onClick={() => setShowNotifDropdown(false)} className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest hover:text-[#F97316] transition-colors inline-flex items-center gap-1">
                      Lihat Semua <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                   </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* Cart */}
          <Link to="/cart" className="w-10 h-10 text-slate-400 hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition relative group flex items-center justify-center">
            <span className={`material-symbols-outlined ${cartCount > 0 ? "text-[#F97316]" : ""}`} style={{ fontSize: 22 }}>shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute top-1 right-0.5 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-semibold text-white border-2 border-white shadow-sm">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* PROFILE */}
        <Link to="/dashboard/settings" className="flex items-center gap-3 pl-4 border-l border-slate-100 group">
          <div className="text-right hidden xl:block">
            <p className="text-xs font-semibold text-slate-800 transition group-hover:text-[#F97316]">
              {user ? user.name : "..."}
            </p>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-tighter">
              Manage Profile
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-100 p-0.5 border-2 border-transparent group-hover:border-orange-200 transition shadow-sm overflow-hidden">
             {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
             ) : (
                <div className="w-full h-full bg-[#faefe9] rounded-full flex items-center justify-center text-[#F97316] font-semibold text-sm">
                  {user ? user.name.charAt(0).toUpperCase() : "?"}
                </div>
             )}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default TopNavbar;
