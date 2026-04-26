import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isOtherMenuOpen, setIsOtherMenuOpen] = useState(false);

  // --- 1. CHECK AUTH & CART ---
  useEffect(() => {
    const checkData = () => {
      // Check Cart
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        try {
          const cart = JSON.parse(savedCart);
          setCartCount(Array.isArray(cart) ? cart.length : 1);
        } catch (e) {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }

      // Check User
      const savedUser = localStorage.getItem("user");
      try {
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      }
    };

    checkData();
    window.addEventListener("storage", checkData);
    window.addEventListener("user_updated", checkData); // Listen to custom event

    // Optional: Polling as fallback
    const interval = setInterval(checkData, 2000);

    return () => {
      window.removeEventListener("storage", checkData);
      window.removeEventListener("user_updated", checkData);
      clearInterval(interval);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
    setIsOtherMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    if (window.confirm("Yakin ingin keluar?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("cart");
      setUser(null);
      window.location.reload(); // Force refresh to clear state completely
    }
  };

  const isActive = (path) => location.pathname === path;

  const linkClasses = (path) =>
    `transition-all duration-300 relative group py-2 ${isActive(path)
      ? "text-[#F97316] font-bold"
      : "text-slate-600 hover:text-[#F97316] font-medium"
    }`;

  const mobileLinkClasses = (path) =>
    `block px-4 py-3 rounded-lg font-bold transition ${isActive(path)
      ? "bg-orange-50 text-[#F97316]"
      : "text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* A. LEFT: LOGO */}
          <Link to="/" className="flex items-center gap-4 cursor-pointer group z-50">
            <img
              src="/image/logo/ADTLogo.png"
              alt="ADT Logo"
              className="h-10 md:h-12 w-auto object-contain group-hover:scale-110 transition duration-500"
            />
            <span className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Domain<span className="text-[#F97316]">Dagang</span>
            </span>
          </Link>

          {/* B. CENTER: DESKTOP MENU */}
          <div className="hidden md:flex space-x-8">
            <Link to="/" className={linkClasses("/")}>
              Home
              {isActive("/") && (
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#F97316] rounded-full animate-fade-in"></span>
              )}
            </Link>

            <Link to="/domain" className={linkClasses("/domain")}>
              Daftar Harga
              {isActive("/domain") && (
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#F97316] rounded-full animate-fade-in"></span>
              )}
            </Link>

            <Link to="/transfer" className={linkClasses("/transfer")}>
              Transfer Domain
              {isActive("/transfer") && (
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#F97316] rounded-full animate-fade-in"></span>
              )}
            </Link>

            <Link to="/promo" className={linkClasses("/promo")}>
              Promo
              {isActive("/promo") && (
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#F97316] rounded-full animate-fade-in"></span>
              )}
            </Link>

            <Link to="/contact" className={linkClasses("/contact")}>
              Kontak
              {isActive("/contact") && (
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#F97316] rounded-full animate-fade-in"></span>
              )}
            </Link>

            {/* NEW: MENU LAINNYA DROPDOWN */}
            <div className="relative group/other py-2">
              <button
                onMouseEnter={() => setIsOtherMenuOpen(true)}
                className={`flex items-center gap-1.5 transition-all duration-300 font-medium ${isOtherMenuOpen ? "text-[#F97316]" : "text-slate-600 hover:text-[#F97316]"}`}
              >
                Lainnya
                <svg className={`w-4 h-4 transition-transform duration-300 ${isOtherMenuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Backdrop (transparent) to catch mouse leave */}
              {isOtherMenuOpen && (
                <div
                  className="absolute top-full left-0 pt-2 w-72 z-[60]"
                  onMouseLeave={() => setIsOtherMenuOpen(false)}
                >
                  <div className="bg-white rounded-xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                    <div className="p-2">
                      {[
                        { name: "Pengembangan Website", url: "https://aplikasidagang.com/jasa-pembuatan-website-dan-landing-page-bandung/" },
                        { name: "Pengembangan Aplikasi & Software", url: "https://aplikasidagang.com/jasa-pembuatan-aplikasi-software-bisnis-custom/" },
                        { name: "Digital Marketing", url: "https://aplikasidagang.com/digital-marketing/" },
                        { name: "Setup & Management VPS", url: "https://aplikasidagang.com/" },
                        { name: "Maintenance & System Support", url: "https://aplikasidagang.com/" }
                      ].map((item, idx) => (
                        <a
                          key={idx}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-orange-50 text-slate-600 hover:text-[#F97316] transition-all group/item"
                        >
                          <span className="text-xs font-bold uppercase tracking-tight">{item.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* C. RIGHT: ACTIONS */}
          <div className="flex items-center gap-4 md:gap-6">

            {/* 1. CART ICON */}
            <Link
              to="/cart"
              className="relative group p-2 md:p-3 rounded-full hover:bg-orange-50 transition duration-300"
              title="Lihat Keranjang"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-6 h-6 transition-colors duration-300 ${cartCount > 0 ? "text-[#F97316]" : "text-slate-600 group-hover:text-[#F97316]"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white animate-bounce-in shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* 2. AUTH BUTTONS (Desktop) */}
            <div className="hidden md:flex items-center gap-3 border-l border-slate-100 pl-6">
              {user ? (
                // --- LOGGED IN STATE ---
                <div className="relative">
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-4 rounded-full transition border border-transparent hover:border-slate-100"
                  >
                    <div className="w-9 h-9 bg-[#F97316] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shadow-orange-200">
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name || "User"}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Member</p>
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-[60]">
                      <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-bold text-slate-800 tracking-tight">{user.name || "User"}</p>
                          <span className="px-2 py-0.5 rounded-md bg-orange-100 text-[#F97316] text-[8px] font-bold uppercase tracking-widest">{user?.role === "admin" ? "Admin" : "Member"}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold truncate tracking-tight">{user.email}</p>
                      </div>
                      <div className="p-3">
                        <Link to={user?.role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-orange-50 text-slate-600 hover:text-[#F97316] transition-all group/item">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center group-hover/item:bg-white group-hover/item:text-[#F97316] transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-lg">dashboard</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold uppercase tracking-tight">Dashboard</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">Kelola Akun Anda</p>
                          </div>
                        </Link>
                        <Link to={user?.role === "admin" ? "/admin/settings" : "/dashboard/settings"} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all group/item">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center group-hover/item:bg-white group-hover/item:text-slate-900 transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-lg">person_edit</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold uppercase tracking-tight">Edit Profile</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">Pengaturan Akun</p>
                          </div>
                        </Link>
                        <div className="h-px bg-slate-100/50 my-2 mx-2"></div>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all group/item">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center group-hover/item:bg-white group-hover/item:text-rose-500 transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-lg">logout</span>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs font-bold uppercase tracking-tight">Keluar</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest leading-none mt-0.5">Selesaikan Sesi</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // --- LOGGED OUT STATE ---
                <>
                  <Link to="/login">
                    <button className="font-semibold text-slate-600 hover:text-[#F97316] transition text-sm">
                      Masuk
                    </button>
                  </Link>
                  <Link to="/register">
                    <button className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#F97316] transition duration-300 shadow-md transform hover:-translate-y-0.5 text-sm">
                      Daftar
                    </button>
                  </Link>
                </>
              )}
            </div>

            {/* 3. MOBILE MENU TOGGLE */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- MOBILE MENU OVERLAY --- */}
      {isMobileMenuOpen && (
        <div className="absolute top-20 left-0 w-full bg-white border-b border-slate-100 shadow-xl p-4 flex flex-col gap-2 md:hidden animate-fade-in-down origin-top max-h-[calc(100vh-80px)] overflow-y-auto">
          <Link to="/" className={mobileLinkClasses("/")}>Home</Link>
          <Link to="/domain" className={mobileLinkClasses("/domain")}>Daftar Harga</Link>
          <Link to="/transfer" className={mobileLinkClasses("/transfer")}>Transfer Domain</Link>
          <Link to="/promo" className={mobileLinkClasses("/promo")}>Promo</Link>
          <Link to="/contact" className={mobileLinkClasses("/contact")}>Kontak</Link>

          {/* NEW: MOBILE MENU LAINNYA */}
          <div className="px-4 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Layanan Terkait</p>
            <div className="flex flex-col gap-1">
              {[
                { name: "Pengembangan Website", url: "https://aplikasidagang.com/jasa-pembuatan-website-dan-landing-page-bandung/" },
                { name: "Pengembangan Aplikasi & Software", url: "https://aplikasidagang.com/jasa-pembuatan-aplikasi-software-bisnis-custom/" },
                { name: "Digital Marketing", url: "https://aplikasidagang.com/digital-marketing/" },
                { name: "Setup & Management VPS", url: "https://aplikasidagang.com/" },
                { name: "Maintenance & System Support", url: "https://aplikasidagang.com/" }
              ].map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition"
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-100 my-2"></div>

          {user ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg mb-2">
                <div className="w-10 h-10 bg-[#F97316] rounded-full flex items-center justify-center text-white font-bold">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              <Link to={user?.role === "admin" ? "/admin" : "/dashboard"} className="block px-4 py-3 bg-[#F97316] text-white rounded-lg font-bold text-center shadow-lg shadow-orange-200">
                Ke Dashboard
              </Link>
              <button onClick={handleLogout} className="block w-full px-4 py-3 text-red-500 font-bold text-center hover:bg-red-50 rounded-lg transition">
                Keluar
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <Link to="/login" className="block w-full px-4 py-3 text-slate-600 font-bold text-center border border-slate-200 rounded-lg hover:bg-slate-50">
                Masuk
              </Link>
              <Link to="/register" className="block w-full px-4 py-3 bg-slate-900 text-white font-bold text-center rounded-lg shadow-lg">
                Daftar Sekarang
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
