import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";

const TopNavbar = ({ user, cartCount, setSidebarOpen }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { notifications, unreadCount, markAllAsRead } = useNotification();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button onClick={setSidebarOpen} className="topbar-btn lg:hidden">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="topbar-breadcrumb">
          Member / <span>{user?.name?.split(" ")[0] || "Area"}</span>
        </div>
      </div>

      <div className="topbar-clock hidden md:flex">
        <span className="material-symbols-outlined">calendar_today</span>
        <span>{currentTime.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
        <span style={{ color: "var(--color-neutral-300)", margin: "0 2px" }}>•</span>
        <span style={{ color: "var(--color-neutral-500)" }}>{currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      <div className="topbar-right">
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className={`topbar-btn ${showNotifDropdown ? "bg-primary-50 text-primary-500" : ""}`}
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />}
          </button>
          {showNotifDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-neutral-100 rounded-lg shadow-xl overflow-hidden z-50 animate-scale-in">
                <div className="p-4 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
                  <h3 className="text-[10px] font-semibold text-neutral-800 uppercase tracking-wider">Notifikasi</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[9px] font-semibold text-primary-500 uppercase hover:underline bg-primary-50 px-2 py-1 rounded">
                      Baca Semua
                    </button>
                  )}
                </div>
                <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">Tidak ada notifikasi</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div key={n.id} className={`p-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors relative ${!n.is_read ? "bg-primary-50/20" : ""}`}>
                        {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-500" />}
                        <h4 className="text-[11px] font-semibold text-neutral-800 uppercase mb-1">{n.title}</h4>
                        <p className="text-[10px] text-neutral-500 font-semibold leading-relaxed mb-2">{n.message}</p>
                        <span className="text-[8px] text-neutral-300 font-semibold uppercase tracking-wider">
                          {new Date(n.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 bg-neutral-50/50 border-t border-neutral-50 text-center">
                  <Link to="/dashboard/notifications" onClick={() => setShowNotifDropdown(false)} className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-600 transition">
                    Lihat Semua
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        <Link to="/cart" className="topbar-btn relative">
          <span className={`material-symbols-outlined ${cartCount > 0 ? "text-primary-500" : ""}`}>shopping_cart</span>
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white border-2 border-white shadow-sm">
              {cartCount}
            </span>
          )}
        </Link>

        <Link to="/dashboard/settings" className="topbar-user group">
          <div className="topbar-user-info hidden xl:block">
            <p className="group-hover:text-primary-500 transition-colors">{user?.name || "..."}</p>
            <span>Manage Profile</span>
          </div>
          <div className="topbar-user-avatar">
            {user?.name?.charAt(0).toUpperCase() || "?"}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default TopNavbar;
