import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const AdminSidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuGroups = [
    {
      title: "Utama",
      items: [
        { name: "Overview", path: "/admin", icon: "dashboard" },
      ]
    },
    {
      title: "Operasional",
      items: [
        { name: "Kelola Invoice", path: "/admin/invoices", icon: "receipt_long" },
        { name: "Keuangan", path: "/admin/finance", icon: "monitoring" },

        { name: "Metode Pembayaran", path: "/admin/payment-gateways", icon: "payments" },
        { name: "Daftar User", path: "/admin/users", icon: "group" },
      ]
    },
    {
      title: "Core Business",
      items: [
        { name: "Manajemen Domain", path: "/admin/domains", icon: "language" },
        { name: "Saldo Registrar", path: "/admin/registrar-balance", icon: "account_balance_wallet" },
      ]
    },
    {
      title: "Marketing & Pricing",
      items: [
        { name: "Atur Harga", path: "/admin/pricing", icon: "payments" },
        { name: "Promo & Marketing", path: "/admin/promos", icon: "campaign" },
        { name: "Atur Referral", path: "/admin/referral", icon: "share" },
      ]
    },
    {
      title: "Support & Sistem",
      items: [
        { name: "Katalog Bantuan", path: "/admin/faqs", icon: "live_help" },
        { name: "Tiket Bantuan", path: "/admin/support-tickets", icon: "support_agent" },
        { name: "Log Aktivitas", path: "/admin/logs", icon: "history" },
        { name: "Pengaturan", path: "/admin/settings", icon: "settings" },
      ]
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/admin") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* 0. MOBILE OVERLAY */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <aside className={`fixed inset-y-0 left-0 lg:static ${isCollapsed ? "w-20" : "w-72"} bg-[#0F172A] text-slate-400 flex flex-col border-r border-[#1E293B] shadow-xl z-50 relative h-screen transition-all duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}>
        {/* BACKGROUND ACCENT */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#F97316]/5 to-transparent pointer-events-none"></div>

        {/* 1. BRANDING AREA */}
        <div className={`h-20 flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-6 border-b border-[#1E293B] bg-[#0F172A]/95 backdrop-blur-xl z-10 shrink-0 transition-all duration-300 relative`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#F97316] to-orange-600 rounded-lg flex-none flex items-center justify-center shadow-lg shadow-orange-900/50">
              <img
                src="/image/logo/ADTLogo.png"
                alt="Logo"
                className="w-6 h-auto"
              />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in-fast">
                <h1 className="font-bold text-white text-lg tracking-tight leading-none uppercase">
                  Domain<span className="text-[#F97316]">Admin</span>
                </h1>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Control Center
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg bg-slate-800/50 text-slate-500 hover:text-[#F97316] transition-all hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
            </button>
          )}

          {isCollapsed && (
             <button
                onClick={() => setIsCollapsed(false)}
                className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 items-center justify-center rounded-full bg-[#F97316] text-white shadow-lg shadow-orange-900/40 z-[60] hover:scale-110 transition-transform"
             >
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
             </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* 2. NAVIGATION MENU */}
        <nav className="flex-1 py-4 px-3 space-y-3 overflow-y-auto custom-scrollbar z-10" onClick={() => { if (window.innerWidth < 1024) setIsOpen(false) }}>
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-4 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] opacity-80 flex items-center gap-2 animate-fade-in-fast">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]/40"></span>
                  {group.title}
                </div>
              )}
              {isCollapsed && (
                <div className="h-4 flex items-center justify-center mb-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                </div>
              )}
              {group.items.map((item, idx) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={idx}
                    to={item.path}
                    title={isCollapsed ? item.name : ""}
                    className={`relative flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"} py-2 rounded-lg transition-all duration-300 group overflow-hidden ${active
                        ? "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-lg shadow-orange-900/40"
                        : "hover:bg-slate-800/50 hover:text-white"
                      }`}
                  >
                    <div className={`relative z-10 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`}>
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    </div>
                    {!isCollapsed && (
                      <span className="relative z-10 text-[13px] font-semibold tracking-wide animate-fade-in-fast">
                        {item.name}
                      </span>
                    )}
                    {active && (
                      <div className="absolute inset-0 bg-white/20 blur-xl opacity-50 rounded-lg"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 3. LOGOUT AREA */}
        <div className={`p-3 border-t border-[#1E293B] bg-[#0F172A] z-10 shrink-0 transition-all duration-300`}>
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Keluar" : ""}
            className={`w-full relative flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"} py-2.5 rounded-lg bg-[#1E293B] hover:bg-red-500/10 border border-[#334155] hover:border-red-500/50 text-slate-400 hover:text-red-500 transition-all duration-300 group overflow-hidden`}
          >
            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">logout</span>
            {!isCollapsed && <span className="text-sm font-semibold tracking-wide animate-fade-in-fast">Keluar</span>}
          </button>
          {!isCollapsed && (
             <div className="text-center mt-3 animate-fade-in-fast">
                <p className="text-[10px] text-slate-600 font-semibold">DomainAdmin v3.0.1</p>
             </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
