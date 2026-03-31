import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = ({ handleLogout, isOpen, setIsOpen }) => {
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
      name: "Domain Saya",
      path: "/dashboard/domains",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
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
      name: "Voucher Saya",
      path: "/dashboard/vouchers",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
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
        <div className="h-24 flex items-center justify-between px-8 border-b border-[#1E293B] bg-[#0F172A]/95 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#F97316] to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-900/50">
              <img
                src="/image/logo/ADTLogo.png"
                alt="Logo"
                className="w-6 h-auto"
              />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg tracking-tight leading-none">
                Domain<span className="text-[#F97316]">Dagang</span>
              </h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Member Area
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
            Menu Utama
          </div>
          
          {menus.map((item, idx) => {
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
                  {item.icon}
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

          {/* Support Section */}
          <div className="mt-8 px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Support
          </div>
          <Link
            to="/dashboard/support"
            className="flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-300 group hover:bg-slate-800/50 hover:text-white hover:translate-x-1"
          >
            <div className="text-slate-500 group-hover:text-[#F97316] transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-wide opacity-90 group-hover:opacity-100">Bantuan</span>
          </Link>
        </nav>

        {/* 3. LOGOUT AREA */}
        <div className="p-4 border-t border-[#1E293B] bg-[#0F172A] z-10">
          <button
            onClick={handleLogout}
            className="w-full relative flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg bg-[#1E293B] hover:bg-red-500/10 border border-[#334155] hover:border-red-500/50 text-slate-400 hover:text-red-500 transition-all duration-300 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm font-bold tracking-wide">Keluar</span>
          </button>
          <div className="text-center mt-4">
             <p className="text-[10px] text-slate-600 font-medium">DomainDagang v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
