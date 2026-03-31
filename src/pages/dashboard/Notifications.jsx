import React, { useState, useMemo } from "react";
import { useNotification } from "../../context/NotificationContext";
import CustomSelect from "../../components/ui/CustomSelect";

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
      case "success": return { icon: "check_circle", color: "text-emerald-500", bg: "bg-emerald-50" };
      case "error": return { icon: "error", color: "text-red-500", bg: "bg-red-50" };
      case "warning": return { icon: "warning", color: "text-amber-500", bg: "bg-amber-50" };
      case "promo": return { icon: "local_offer", color: "text-purple-500", bg: "bg-purple-50" };
      case "info": return { icon: "info", color: "text-blue-500", bg: "bg-blue-50" };
      default: return { icon: "notifications", color: "text-slate-400", bg: "bg-slate-50" };
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Notifikasi</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Pusat informasi dan pembaruan akun Anda.</p>
        </div>
        <button 
          onClick={markAllAsRead}
          className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          Baca Semua
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="lg:col-span-1">
          <CustomSelect 
            value={filter}
            onChange={(val) => setFilter(val)}
            options={[
              { value: "all", label: "Semua Tipe" },
              { value: "success", label: "Berhasil" },
              { value: "info", label: "Informasi" },
              { value: "warning", label: "Peringatan" },
              { value: "error", label: "Kesalahan" },
              { value: "promo", label: "Promo" }
            ]}
          />
        </div>
        <div className="lg:col-span-3 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
          <input 
            type="text" 
            placeholder="Cari notifikasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-12 pr-4 py-3 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-orange-100 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-8">
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="bg-white rounded-2xl p-24 text-center border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl text-slate-200">notifications_off</span>
            </div>
            <p className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-1">Inbox Notifikasi Kosong</p>
            <p className="text-xs text-slate-400 font-medium">Belum ada pembaruan atau informasi untuk saat ini.</p>
          </div>
        ) : (
          Object.keys(groupedNotifications).map((date) => (
            <div key={date}>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-4">
                <span>{date}</span>
                <div className="h-px flex-1 bg-slate-100"></div>
              </h3>
              <div className="grid gap-3">
                {groupedNotifications[date].map((n) => {
                  const style = getTypeStyle(n.type);
                  return (
                    <div 
                      key={n.id}
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      className={`group relative bg-white border border-slate-100 rounded-2xl p-5 flex gap-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:border-orange-200 cursor-default ${!n.is_read ? 'bg-orange-50/5' : ''}`}
                    >
                      {!n.is_read && (
                        <div className="absolute left-0 top-6 bottom-6 w-1 bg-[#F97316] rounded-r-full shadow-[0_0_12px_rgba(249,115,22,0.4)]"></div>
                      )}
                      
                      <div className={`w-10 h-10 rounded-lg ${style.bg} ${style.color} flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{style.icon}</span>
                      </div>

                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className={`text-sm font-bold uppercase tracking-tight truncate transition-colors group-hover:text-slate-900 ${!n.is_read ? 'text-slate-900' : 'text-slate-500'}`}>
                            {n.title}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded whitespace-nowrap">
                            {new Date(n.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className={`text-[12px] leading-relaxed transition-colors ${!n.is_read ? 'text-slate-600 font-bold' : 'text-slate-400 font-medium'}`}>
                          {n.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {n.is_read ? (
                          <span className="material-symbols-outlined text-slate-200 text-lg">check_circle</span>
                        ) : (
                          <div className="w-2 h-2 bg-[#F97316] rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                        )}
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
