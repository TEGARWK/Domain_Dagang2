import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = ({ handleLogout, isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const location = useLocation();

  // --- LOGIC ACTIVE STATE ---
  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === path;
    }
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const menus = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      name: "Domain Saya",
      path: "/dashboard/domains",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      name: "Beli Domain",
      path: "/dashboard/buy",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      name: "Transfer Domain",
      path: "/dashboard/transfer",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m4 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      name: "Dompet & Saldo",
      path: "/dashboard/wallet",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      name: "Tagihan & Billing",
      path: "/dashboard/billing",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      name: "Pengaturan",
      path: "/dashboard/settings",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const promoMenus = [
    {
      name: "Discovery Promo",
      path: "/dashboard/promo",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      name: "Voucher Saya",
      path: "/dashboard/vouchers",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    {
      name: "Referral & Cuan",
      path: "/dashboard/referral",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* 0. MOBILE OVERLAY */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <aside className={`fixed inset-y-0 left-0 lg:static ${isCollapsed ? "w-20" : "w-72"} bg-[#0F172A] text-slate-400 flex flex-col border-r border-[#1E293B] shadow-xl z-50 relative h-screen transition-all duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
                <h1 className="font-semibold text-white text-lg tracking-tight leading-none">
                  Domain<span className="text-[#F97316]">Dagang</span>
                </h1>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Member Area
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
        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar z-10" onClick={() => { if(window.innerWidth < 1024) setIsOpen(false) }}>
          
          {/* Menu Utama */}
          <div className="space-y-1">
            {!isCollapsed && (
                <div className="px-4 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] opacity-80 flex items-center gap-2 animate-fade-in-fast">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]/40"></span>
                    Menu Utama
                </div>
            )}
            {isCollapsed && (
                <div className="h-4 flex items-center justify-center mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                </div>
            )}
            {menus.map((item, idx) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={idx}
                  to={item.path}
                  title={isCollapsed ? item.name : ""}
                  className={`relative flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"} py-2 rounded-lg transition-all duration-300 group overflow-hidden ${
                    active 
                      ? "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-lg shadow-orange-900/40" 
                      : "hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <div className={`relative z-10 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`}>
                    {item.icon}
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

          {/* Promo & Hemat Section */}
          <div className="space-y-1">
            {!isCollapsed && (
                <div className="px-4 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] opacity-80 flex items-center gap-2 animate-fade-in-fast">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]/40"></span>
                    Promo & Hemat
                </div>
            )}
            {isCollapsed && (
                <div className="h-4 flex items-center justify-center mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                </div>
            )}
            {promoMenus.map((item, idx) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={`promo-${idx}`}
                  to={item.path}
                  title={isCollapsed ? item.name : ""}
                  className={`relative flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"} py-2 rounded-lg transition-all duration-300 group overflow-hidden ${
                    active
                      ? "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-lg shadow-orange-900/40"
                      : "hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <div className={`relative z-10 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`}>
                    {item.icon}
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

          {/* Support Section */}
          <div className="space-y-1">
            {!isCollapsed && (
                <div className="px-4 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] opacity-80 flex items-center gap-2 animate-fade-in-fast">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]/40"></span>
                    Bantuan
                </div>
            )}
            {isCollapsed && (
                <div className="h-4 flex items-center justify-center mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                </div>
            )}
            <Link
              to="/dashboard/support"
              title={isCollapsed ? "Bantuan Tiket" : ""}
              className={`relative flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"} py-2 rounded-lg transition-all duration-300 group overflow-hidden hover:bg-slate-800/50 hover:text-white`}
            >
              <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              {!isCollapsed && <span className="relative z-10 text-[13px] font-semibold tracking-wide animate-fade-in-fast">Bantuan Tiket</span>}
            </Link>
          </div>
        </nav>

        {/* 3. LOGOUT AREA */}
        <div className={`p-3 border-t border-[#1E293B] bg-[#0F172A] z-10 transition-all duration-300`}>
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Keluar" : ""}
            className={`w-full relative flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"} py-2.5 rounded-lg bg-[#1E293B] hover:bg-red-500/10 border border-[#334155] hover:border-red-500/50 text-slate-400 hover:text-red-500 transition-all duration-300 group overflow-hidden`}
          >
            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && <span className="text-sm font-semibold tracking-wide animate-fade-in-fast">Keluar</span>}
          </button>
          {!isCollapsed && (
             <div className="text-center mt-3 animate-fade-in-fast">
                <p className="text-[10px] text-slate-600 font-semibold">DomainDagang v1.0.0</p>
             </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
