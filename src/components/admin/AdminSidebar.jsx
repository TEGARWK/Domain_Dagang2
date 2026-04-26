import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const AdminSidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: "Overview", path: "/admin", icon: "dashboard" },
    { name: "Kelola Invoice", path: "/admin/invoices", icon: "receipt_long" },
    { name: "Daftar User", path: "/admin/users", icon: "group" },
    { name: "Manajemen Domain", path: "/admin/domains", icon: "language" },
    { name: "Saldo Registrar", path: "/admin/registrar-balance", icon: "account_balance_wallet" },
    { name: "Atur Harga", path: "/admin/pricing", icon: "payments" },
    { name: "Promo & Marketing", path: "/admin/promos", icon: "campaign" },
    { name: "Katalog Bantuan", path: "/admin/faqs", icon: "live_help" },
    { name: "Tiket Bantuan", path: "/admin/support-tickets", icon: "support_agent" },
    { name: "Log Aktivitas", path: "/admin/logs", icon: "history" },
    { name: "Atur Referral", path: "/admin/referral", icon: "share" },
    { name: "Metode Pembayaran", path: "/admin/payment-gateways", icon: "credit_card" },
    { name: "Pengaturan Profil", path: "/admin/settings", icon: "settings" },
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

      <aside className={`fixed inset-y-0 left-0 lg:static w-72 bg-[#0F172A] text-slate-400 flex flex-col border-r border-[#1E293B] shadow-2xl z-50 relative overflow-hidden h-screen transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        {/* BACKGROUND ACCENT */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#F97316]/5 to-transparent pointer-events-none"></div>

        {/* 1. BRANDING AREA */}
        <div className="h-24 flex items-center justify-between px-8 border-b border-[#1E293B] bg-[#0F172A]/95 backdrop-blur-xl z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#F97316] to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-900/50">
              <img
                src="/image/logo/ADTLogo.png"
                alt="Logo"
                className="w-6 h-auto"
              />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg tracking-tight leading-none uppercase">
                Domain<span className="text-[#F97316]">Admin</span>
              </h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Control Center
              </span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* 2. NAVIGATION MENU */}
        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar z-10" onClick={() => { if(window.innerWidth < 1024) setIsOpen(false) }}>
          <div className="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Core Management
          </div>
          
          {menuItems.map((item, idx) => {
            const active = isActive(item.path);
            return (
              <Link
                key={idx}
                to={item.path}
                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-300 group overflow-hidden ${
                  active 
                    ? "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-xl shadow-orange-900/40 translate-x-1" 
                    : "hover:bg-slate-800/50 hover:text-white hover:translate-x-1"
                }`}
              >
                <div className={`relative z-10 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`}>
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                </div>
                <span className={`relative z-10 text-sm font-bold tracking-wide ${active ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`}>
                  {item.name}
                </span>
                
                {/* Active Indicator Glow */}
                {active && (
                  <div className="absolute inset-0 bg-white/20 blur-xl opacity-50 rounded-lg"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 3. LOGOUT AREA */}
        <div className="p-4 border-t border-[#1E293B] bg-[#0F172A] z-10 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full relative flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg bg-[#1E293B] hover:bg-red-500/10 border border-[#334155] hover:border-red-500/50 text-slate-400 hover:text-red-500 transition-all duration-300 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">logout</span>
            <span className="text-sm font-bold tracking-wide">Keluar</span>
          </button>
          <div className="text-center mt-4">
             <p className="text-[10px] text-slate-600 font-medium">DomainAdmin v3.0.1</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
