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
    <div className="p-4 sm:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">Notifikasi</h1>
          <p className="text-[12px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Pusat informasi dan pembaruan akun Anda.</p>
        </div>
        <button 
          onClick={markAllAsRead}
          className="w-full sm:w-auto px-6 py-3 bg-[#F97316] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#EA580C] transition-all shadow-[0_10px_20px_rgba(249,115,22,0.2)] active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">done_all</span>
          Baca Semua
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col lg:flex-row gap-4 mb-10">
        <div className="w-full lg:w-48">
          <CustomSelect 
            value={filter}
            onChange={(val) => setFilter(val)}
            options={[
              { value: "all", label: "SEMUA TIPE" },
              { value: "success", label: "BERHASIL" },
              { value: "info", label: "INFORMASI" },
              { value: "warning", label: "PERINGATAN" },
              { value: "error", label: "KESALAHAN" },
              { value: "promo", label: "PROMO" }
            ]}
          />
        </div>
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Cari notifikasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-[13px] font-bold text-slate-700 focus:ring-4 focus:ring-orange-50 focus:border-orange-200 outline-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-12">
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="bg-white/50 backdrop-blur-xl rounded-3xl p-16 sm:p-24 text-center border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <span className="material-symbols-outlined text-5xl text-slate-200">notifications_off</span>
            </div>
            <p className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Inbox Kosong</p>
            <p className="text-sm text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">Belum ada pembaruan atau informasi untuk Anda saat ini.</p>
          </div>
        ) : (
          Object.keys(groupedNotifications).map((date) => (
            <div key={date} className="relative">
              <h3 className="sticky top-20 z-10 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-4 bg-slate-50/80 backdrop-blur-sm">
                <span className="bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">{date}</span>
                <div className="h-px flex-1 bg-slate-200/50"></div>
              </h3>
              <div className="grid gap-4">
                {groupedNotifications[date].map((n) => {
                  const style = getTypeStyle(n.type);
                  return (
                    <div 
                      key={n.id}
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      className={`group relative bg-white/70 backdrop-blur-xl border border-white rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row gap-5 transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-default ${!n.is_read ? 'ring-2 ring-orange-500/20' : 'shadow-[0_10px_30px_rgba(0,0,0,0.03)]'}`}
                    >
                      {!n.is_read && (
                        <div className="absolute left-0 top-8 bottom-8 w-1.5 bg-[#F97316] rounded-r-full shadow-[4px_0_15px_rgba(249,115,22,0.5)]"></div>
                      )}
                      
                      <div className={`w-14 h-14 rounded-2xl ${style.bg} ${style.color} flex-shrink-0 flex items-center justify-center transition-all duration-500 group-hover:rotate-6 shadow-sm border border-white`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{style.icon}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h4 className={`text-md font-black uppercase tracking-tight transition-colors ${!n.is_read ? 'text-[#F97316]' : 'text-slate-700'}`}>
                            {n.title}
                          </h4>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100/50 px-3 py-1 rounded-full border border-slate-200/50">
                              {new Date(n.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {!n.is_read && (
                                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-ping"></span>
                            )}
                          </div>
                        </div>
                        <p className={`text-[13px] leading-relaxed transition-all ${!n.is_read ? 'text-slate-800 font-bold' : 'text-slate-400 font-medium'}`}>
                          {n.message}
                        </p>
                      </div>

                      <div className="flex items-center justify-end sm:justify-center">
                        {n.is_read ? (
                          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center opacity-40">
                             <span className="material-symbols-outlined text-[20px]">check</span>
                          </div>
                        ) : (
                          <button className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center transition-all hover:bg-[#F97316] hover:text-white shadow-sm border border-orange-100">
                             <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
                          </button>
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
