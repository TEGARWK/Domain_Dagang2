import React from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { section: "Menu Utama", items: [
    { name: "Dashboard", path: "/dashboard", icon: "grid_view" },
    { name: "Domain Saya", path: "/dashboard/domains", icon: "language" },
    { name: "Beli Domain", path: "/dashboard/buy", icon: "search" },
    { name: "Transfer Domain", path: "/dashboard/transfer", icon: "move_up" },
    { name: "Dompet & Saldo", path: "/dashboard/wallet", icon: "account_balance_wallet" },
    { name: "Tagihan & Billing", path: "/dashboard/billing", icon: "receipt_long" },
    { name: "Pengaturan", path: "/dashboard/settings", icon: "settings" },
  ]},
  { section: "Promo & Hemat", items: [
    { name: "Discovery Promo", path: "/dashboard/promo", icon: "sell" },
    { name: "Voucher Saya", path: "/dashboard/vouchers", icon: "confirmation_number" },
    { name: "Referral & Cuan", path: "/dashboard/referral", icon: "share" },
  ]},
  { section: "Bantuan", items: [
    { name: "Bantuan Tiket", path: "/dashboard/support", icon: "support_agent" },
  ]},
];

const Sidebar = ({ handleLogout, isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[45] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 lg:static ${isCollapsed ? "w-20" : "w-60"} sidebar z-50 h-screen transition-all duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className={`sidebar-logo ${isCollapsed ? "justify-center px-3" : ""}`}>
          <div className="sidebar-logo-box">{isCollapsed ? "DD" : "DD"}</div>
          {!isCollapsed && (
            <div className="animate-fade-in">
              <div className="sidebar-logo-text">Domain<span>Dagang</span></div>
              <div className="sidebar-logo-sub">Member Area</div>
            </div>
          )}
          {!isCollapsed && (
            <button onClick={() => setIsCollapsed(true)} className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-neutral-300 hover:text-primary-500 hover:bg-primary-50 transition-all ml-auto">
              <span className="material-symbols-outlined text-sm">keyboard_double_arrow_left</span>
            </button>
          )}
          {isCollapsed && (
            <button onClick={() => setIsCollapsed(false)} className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 items-center justify-center rounded-full bg-primary-500 text-white shadow-md z-60 hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xs">chevron_right</span>
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="lg:hidden w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="sidebar-nav" onClick={() => { if (window.innerWidth < 1024) setIsOpen(false); }}>
          {navItems.map((group, gi) => (
            <div key={gi} className="sidebar-group">
              {!isCollapsed && (
                <div className="sidebar-group-title">
                  <div className="dot" />
                  <span>{group.section}</span>
                </div>
              )}
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.name : ""}
                    className={`sidebar-item ${active ? "active" : ""} ${isCollapsed ? "justify-center" : ""}`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Keluar" : ""}
            className={`w-full flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-3"} py-2.5 rounded-lg border border-neutral-100 bg-neutral-50 hover:bg-rose-50 hover:border-rose-200 text-neutral-500 hover:text-rose-600 transition-all`}
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            {!isCollapsed && <span className="text-sm font-semibold">Keluar</span>}
          </button>
          {!isCollapsed && (
            <p className="text-center mt-3 text-[10px] text-neutral-300 font-semibold">DomainDagang v1.0.0</p>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
