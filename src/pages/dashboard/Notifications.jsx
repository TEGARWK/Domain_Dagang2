import React, { useState, useMemo } from "react";
import { useNotification } from "../../context/NotificationContext";

const Notifications = () => {
  const { notifications, markAsRead, markAllAsRead, loading } = useNotification();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchesFilter = filter === "all" || n.type === filter;
      const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                           n.message.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [notifications, filter, search]);

  const groupedNotifications = useMemo(() => {
    const groups = {};
    filteredNotifications.forEach((n) => {
      const date = new Date(n.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  const getTypeStyle = (type) => {
    switch (type) {
      case "success": return { icon: "check_circle", color: "text-emerald-600", bg: "bg-emerald-50" };
      case "error": return { icon: "error", color: "text-red-600", bg: "bg-red-50" };
      case "warning": return { icon: "warning", color: "text-amber-600", bg: "bg-amber-50" };
      case "promo": return { icon: "local_offer", color: "text-purple-600", bg: "bg-purple-50" };
      case "info": return { icon: "info", color: "text-blue-600", bg: "bg-blue-50" };
      default: return { icon: "notifications", color: "text-neutral-400", bg: "bg-neutral-50" };
    }
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[16px] font-bold text-neutral-900">Notifikasi</h1>
          <p className="text-[12px] text-neutral-500 mt-0.5">Pusat informasi dan pembaruan akun Anda.</p>
        </div>
        <button onClick={markAllAsRead} className="btn btn-primary">
          <span className="material-symbols-outlined">done_all</span>
          Baca Semua
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="w-full sm:w-44">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-select"
          >
            <option value="all">Semua Tipe</option>
            <option value="success">Berhasil</option>
            <option value="info">Informasi</option>
            <option value="warning">Peringatan</option>
            <option value="error">Kesalahan</option>
            <option value="promo">Promo</option>
          </select>
        </div>
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[18px] pointer-events-none">search</span>
          <input
            type="text"
            placeholder="Cari notifikasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9"
          />
        </div>
      </div>

      <div className="space-y-8">
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="empty-state">
            <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-neutral-300">notifications_off</span>
            </div>
            <p className="text-[14px] font-semibold text-neutral-900 mb-1">Inbox Kosong</p>
            <p className="text-[12px] text-neutral-500">Belum ada pembaruan atau informasi untuk Anda saat ini.</p>
          </div>
        ) : (
          Object.keys(groupedNotifications).map((date) => (
            <div key={date}>
              <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-3">
                <span>{date}</span>
                <span className="h-px flex-1 bg-neutral-200"></span>
              </h3>
              <div className="space-y-3">
                {groupedNotifications[date].map((n) => {
                  const style = getTypeStyle(n.type);
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      className={`card cursor-default ${!n.is_read ? 'ring-2 ring-primary-500/20' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        {!n.is_read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-full"></div>
                        )}

                        <div className={`w-11 h-11 rounded-lg ${style.bg} ${style.color} flex items-center justify-center flex-shrink-0`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{style.icon}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className={`text-[13px] font-semibold ${!n.is_read ? 'text-primary-600' : 'text-neutral-900'}`}>
                              {n.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                              <span className="text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                                {new Date(n.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                              )}
                            </div>
                          </div>
                          <p className={`text-[12px] mt-1 leading-relaxed ${!n.is_read ? 'text-neutral-700' : 'text-neutral-500'}`}>
                            {n.message}
                          </p>
                        </div>

                        <div className="flex items-center flex-shrink-0">
                          {n.is_read ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[16px]">check</span>
                            </div>
                          ) : (
                            <button className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center hover:bg-primary-500 hover:text-white transition">
                              <span className="material-symbols-outlined text-[16px]">mark_email_read</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
