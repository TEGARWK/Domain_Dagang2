import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import navigasi
import CustomSelect from "../components/ui/CustomSelect";
import { useNotification } from "../context/NotificationContext";
import BannerSection from "../components/BannerSection";
import { checkDomainAvailability } from "../services/domainService";
import api from "../services/api";

// Helper Component for Sort Icon
const SortIcon = ({ active, direction }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <svg
        className={`w-2 h-2 ${active && direction === 'asc' ? 'text-[#F97316]' : 'text-slate-300'}`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 4l-8 8h16l-8-8z" />
      </svg>
      <svg
        className={`w-2 h-2 ${active && direction === 'desc' ? 'text-[#F97316]' : 'text-slate-300'}`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 20l8-8H4l8 8z" />
      </svg>
    </div>
  );
};

function Home() {
  const { success, info } = useNotification();
  const navigate = useNavigate(); // Hook navigasi

  // State Search & Data
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState([]); // Menyimpan hasil generate domain
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  // State untuk Floating Cart Badge
  const [cartCount, setCartCount] = useState(0);

  // Cek localStorage saat load untuk update cartCount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const cart = JSON.parse(savedCart);
        setCartCount(Array.isArray(cart) ? cart.length : 1);
      } catch (e) {
        setCartCount(0);
      }
    }
  }, []);

  // Daftar TLD dari Database (Dynamic)
  const [tldList, setTldList] = useState([]);
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    const loadData = async () => {
        try {
            const [pRes, vRes, fRes] = await Promise.all([
                api.get("/pricing/all"),
                api.get("/vouchers/public"),
                api.get("/faqs")
            ]);

            const pData = pRes.data;
            const vData = vRes.data;
            const fData = fRes.data;

            const vouchers = Array.isArray(vData) ? vData : [];
            setFaqs(Array.isArray(fData) ? fData : []);

            // 3. Prioritize popular TLDs first, then the rest
            const prioritized = [".com", ".net", ".id", ".org", ".info", ".biz"];
            
            const formatted = pData
              .map(p => {
                const regPrice = parseFloat(p.price_register);
                const dbDiscount = parseFloat(p.discount_price_reg || 0);

                // Find eligible vouchers for this TLD
                const eligibleVouchers = vouchers.filter(v => {
                    const tlds = v.eligible_tlds ? (typeof v.eligible_tlds === 'string' ? JSON.parse(v.eligible_tlds) : v.eligible_tlds) : [];
                    return tlds.includes(p.tld);
                });

                // Find max discount from vouchers
                let maxVoucherDiscountPercent = 0;
                let maxVoucherDiscountFixed = 0;
                let bestVoucher = null;

                eligibleVouchers.forEach(v => {
                    if (v.type === 'percentage') {
                        if (v.value > maxVoucherDiscountPercent) {
                            maxVoucherDiscountPercent = v.value;
                            bestVoucher = v;
                        }
                    } else {
                        if (v.value > maxVoucherDiscountFixed) {
                            maxVoucherDiscountFixed = v.value;
                            bestVoucher = v;
                        }
                    }
                });

                let finalPrice = regPrice;
                if (bestVoucher) {
                    if (bestVoucher.type === 'percentage') {
                        finalPrice = regPrice - (regPrice * (bestVoucher.value / 100));
                    } else {
                        finalPrice = regPrice - bestVoucher.value;
                    }
                }

                // If DB has a specific manual discount, use it if it's lower
                if (dbDiscount > 0 && dbDiscount < finalPrice) {
                    finalPrice = dbDiscount;
                }

                return {
                    ...p,
                    name: p.tld,
                    rawPrice: regPrice,
                    effectivePrice: finalPrice,
                    discountPrice: finalPrice < regPrice ? finalPrice : 0,
                    status: bestVoucher ? 'promo' : (p.tld === '.com' ? 'popular' : (p.tld === '.id' ? 'best' : (dbDiscount > 0 ? 'promo' : null)))
                };
              })
              .sort((a, b) => {
                const idxA = prioritized.indexOf(a.name);
                const idxB = prioritized.indexOf(b.name);
                
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.name.localeCompare(b.name);
              });
              
            setTldList(formatted);
        } catch (err) {
            console.error("Failed to load data:", err);
        }
    };

    loadData();
  }, []);

  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setIsSearching(true);
    setResults([]); // Reset results
    setShowResult(false);

    try {
      // 1. Generate Candidates based on TLDs
      const candidates = tldList.map((tld) => {
        const dbRegPrice = tld.rawPrice;
        const effectivePrice = tld.effectivePrice;

        return {
          tld: tld.name,
          domainName: query.toLowerCase().replace(/\s+/g, "") + tld.name,
          basePrice: effectivePrice,
          originalPrice: dbRegPrice,
          renewPrice: parseFloat(tld.price_renew),
          currentPrice: effectivePrice,
          duration: 1,
        };
      });

      // 2. Check Availability for ALL candidates in parallel
      const checkPromises = candidates.map(async (item) => {
        try {
          const result = await checkDomainAvailability(item.domainName);
          return {
            ...item,
            available: result.available, // Real API result
          };
        } catch (error) {
          console.error(`Failed to check ${item.domainName}`, error);
          // Fallback if API fails: Assume unavailable or show error state
          return { ...item, available: false };
        }
      });

      const finalResults = await Promise.all(checkPromises);

      setResults(finalResults);
      setShowResult(true);
      setActiveFilter("All");

      setTimeout(() => {
        const resultElement = document.getElementById("search-results");
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);

    } catch (error) {
      console.error("Search failed", error);
      // Optional: Show error notification
    } finally {
      setIsSearching(false);
    }
  };

  // Fungsi Ubah Durasi
  const handleDurationChange = (index, newDuration) => {
    const updatedResults = [...results];
    const item = updatedResults[index];
    const duration = parseInt(newDuration);
    
    item.duration = duration;
    // Year 1 = register, Year 2+ = renew
    if (duration > 1) {
        item.currentPrice = item.basePrice + (item.renewPrice * (duration - 1));
    } else {
        item.currentPrice = item.basePrice;
    }
    setResults(updatedResults);
  };

  // FUNGSI 1: Tambah ke Keranjang (Tanpa Pindah Halaman)
  const handleAddToCart = (item) => {
    if (item.available) {
      const cartItem = {
        name: item.domainName,
        price: formatRupiah(item.currentPrice),
        duration: item.duration,
        rawPrice: item.currentPrice,
        action: 'register'
      };
      
      const savedCart = localStorage.getItem("cart");
      let cart = [];
      if (savedCart) {
        try {
          cart = JSON.parse(savedCart);
          if (!Array.isArray(cart)) cart = [cart];
        } catch (e) {
          cart = [];
        }
      }

      // Hindari duplikat domain yang sama
      if (cart.find(c => c.name === cartItem.name)) {
        return info("Domain sudah ada di keranjang.");
      }

      cart.push(cartItem);
      localStorage.setItem("cart", JSON.stringify(cart));
      setCartCount(cart.length);

      // Trigger event storage biar komponen lain tau ada update
      window.dispatchEvent(new Event("storage"));

      success(`🛒 ${item.domainName} berhasil masuk keranjang!`);
    }
  };

  // FUNGSI 2: Beli Langsung (Logic Cerdas: Redirect sesuai Status Login)
  const handleBuyNow = (item) => {
    if (item.available) {
      const cartItem = {
        name: item.domainName,
        price: formatRupiah(item.currentPrice),
        duration: item.duration,
        rawPrice: item.currentPrice,
        action: 'register'
      };

      const savedCart = localStorage.getItem("cart");
      let cart = [];
      if (savedCart) {
        try {
          cart = JSON.parse(savedCart);
          if (!Array.isArray(cart)) cart = [cart];
        } catch (e) {
          cart = [];
        }
      }

      const existingIndex = cart.findIndex(c => c.name === cartItem.name);
      if (existingIndex === -1) {
        cart.push(cartItem);
      } else {
        cart[existingIndex] = cartItem; // Update jika sudah ada
      }

      localStorage.setItem("cart", JSON.stringify(cart));
      // Use checkout_payload for immediate purchase to avoid "ghost" items from old cart
      localStorage.setItem("checkout_payload", JSON.stringify([cartItem]));
      
      setCartCount(cart.length);
      window.dispatchEvent(new Event("storage"));

      const user = localStorage.getItem("user");
      if (user) {
        navigate(`/checkout?domain=${item.domainName}`);
      } else {
        navigate("/register", { state: { from: "checkout" } });
      }
    }
  };

  // Fungsi Clear Search (Tombol X)
  const clearSearch = () => {
    setQuery("");
    setShowResult(false);
    setResults([]);
    setIsSearching(false);
  };

  // Logic Filter: Memfilter hasil yang sudah digenerate
  const filteredResults =
    activeFilter === "All"
      ? results
      : results.filter((item) => item.tld === activeFilter);

  // Logic Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = React.useMemo(() => {
    let sortableItems = [...filteredResults];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredResults, sortConfig]);

  return (
    <div className="bg-neutral-50 min-h-screen">
      {/* FLOATING CART BADGE (Muncul jika ada isi keranjang) */}
      {cartCount > 0 && (
        <div
          onClick={() => navigate("/cart")}
          className="fixed bottom-8 right-8 z-[60] bg-neutral-900 text-white p-4 rounded-lg shadow-2xl cursor-pointer hover:scale-105 transition transform flex items-center gap-3 border border-neutral-800 animate-bounce-in group"
        >
          <div className="relative">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="absolute -top-2 -right-2 bg-[#F97316] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-neutral-900">
              {cartCount}
            </span>
          </div>
          <span className="text-sm font-semibold pr-2 group-hover:text-primary transition">
            Lihat Keranjang
          </span>
        </div>
      )}

      {/* HERO SECTION */}
      <header className="relative pt-40 pb-20 overflow-hidden bg-white">
        {/* Background Mesh/Gradient - subtle but warm */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-50/50 via-white to-white -z-10" />
        
        {/* CONTAINER GRID: TEKS (KIRI) & GAMBAR (KANAN) */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-24 items-center relative z-20">
          {/* --- LEFT SIDE: Content & Search --- */}
          <div className="text-center lg:text-left space-y-8">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 py-2 px-5 rounded-lg bg-orange-50 text-[#F97316] text-[12px] font-bold uppercase tracking-widest border border-orange-100 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse"></span>
                Platform Domain Terpercaya #1
              </span>
            </div>
            
            <h1 className="text-[48px] lg:text-[64px] font-bold text-slate-900 tracking-tight leading-[1.05]">
              Cek Domain <br />
              <span className="text-[#F97316] relative">
                Impianmu.
                <span className="absolute bottom-2 left-0 w-full h-3 bg-orange-100 -z-10 rounded-full"></span>
              </span>
            </h1>
            
            <p className="text-[17px] text-slate-500 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              Platform manajemen domain tercanggih. Cari, pilih, dan amankan brand digital Anda dalam sekejap dengan standar keamanan enterprise.
            </p>

            {/* Search Box - Enhanced Shadow & Ring */}
            <form
              onSubmit={handleSearch}
              className="relative max-w-xl mx-auto lg:mx-0 bg-white p-2 rounded-lg shadow-[0_20px_50px_rgba(15,23,42,0.1)] border border-slate-200 flex flex-col md:flex-row gap-3 z-30 transition-all hover:border-[#F97316]/50 group"
            >
              <input
                type="text"
                placeholder="Cari domain impian..."
                className="flex-1 pl-6 pr-4 h-12 rounded-lg outline-none text-base text-neutral-800 placeholder:text-neutral-400 bg-transparent focus:bg-orange-50/30 transition-colors"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={showResult}
              />

              {showResult ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="bg-red-500 text-white w-full md:w-auto px-8 h-12 rounded-lg font-bold text-base hover:bg-red-600 transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Clear
                </button>
              ) : (
                <button
                  type="submit"
                  className="bg-[#F97316] hover:bg-orange-600 text-white w-full md:w-auto px-10 h-[52px] rounded-lg font-bold text-sm uppercase tracking-widest transition duration-300 shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 active:scale-95 transform group"
                >
                  {isSearching ? (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <>
                      Carikan
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>

          {/* --- RIGHT SIDE: VISUALISASI ROKET & BADGES --- */}
          <div className="hidden lg:block relative h-[500px] w-full">
            <div className="absolute top-10 right-10 w-80 h-80 bg-primary-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
            <div className="absolute bottom-10 left-10 w-80 h-80 bg-warning-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
            
            <div className="absolute right-0 top-0 w-full h-full flex items-center justify-center">
              <div
                className="relative z-20"
                style={{ animation: "fly 6s ease-in-out infinite" }}
              >
                <img
                  src="/image/logo/ADTLogo.png"
                  alt="Rocket Logo"
                  className="w-72 h-auto drop-shadow-2xl filter brightness-105 transform hover:scale-105 transition duration-500"
                />
                <style>{`@keyframes fly { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(3deg); } 100% { transform: translateY(0px) rotate(0deg); } }`}</style>
              </div>

              {/* Status Badge */}
              <div className="absolute top-24 right-12 z-30 bg-white/80 backdrop-blur-md pl-3 pr-5 py-3 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 flex items-center gap-3 animate-[pulse_4s_infinite]">
                <div className="bg-success-100 p-1.5 rounded-full text-success">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                    Status
                  </p>
                  <p className="text-sm font-bold text-neutral-800">Verified</p>
                </div>
              </div>

              {/* Stats Badge */}
              <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-4 z-30 bg-white/90 backdrop-blur-sm p-5 rounded-lg shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-white/60 flex items-center gap-4 animate-[bounce_5s_infinite]">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-50 rounded-lg flex items-center justify-center text-primary-600">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Total Domain
                  </p>
                  <p className="text-2xl font-bold text-neutral-900">15.4k+</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- PROMO BANNER --- (Removed duplicate) */}

        {/* --- SEARCH RESULTS SECTION --- */}
        {showResult && (
          <div
            id="search-results"
            className="max-w-7xl mx-auto px-6 lg:px-8 mt-16 animate-[fadeIn_0.5s_ease-out] relative z-30 mb-24 scroll-mt-32"
          >
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.1)] overflow-hidden">
              {/* Header Filter */}
              <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <span className="text-[#F97316]">Hasil:</span> "{query}"
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ditemukan {results.length} rekomendasi ketersediaan</p>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
                  <button
                    onClick={() => setActiveFilter("All")}
                    className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border ${activeFilter === "All" ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20" : "bg-white text-slate-400 border-slate-100 hover:border-[#F97316] hover:text-[#F97316]"}`}
                  >
                    ALL TLDs
                  </button>
                  {tldList.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setActiveFilter(t.name)}
                      className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border ${activeFilter === t.name ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20" : "bg-white text-slate-400 border-slate-100 hover:border-[#F97316] hover:text-[#F97316]"}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Content */}
              <div className="overflow-visible min-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th 
                        className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-[#F97316] transition group select-none"
                        onClick={() => handleSort('domainName')}
                      >
                        <div className="flex items-center gap-2">
                          Domain
                          <SortIcon active={sortConfig.key === 'domainName'} direction={sortConfig.direction} />
                        </div>
                      </th>
                      <th 
                        className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-[#F97316] transition group select-none"
                        onClick={() => handleSort('duration')}
                      >
                        <div className="flex items-center gap-2">
                          Durasi
                          <SortIcon active={sortConfig.key === 'duration'} direction={sortConfig.direction} />
                        </div>
                      </th>
                      <th 
                        className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right cursor-pointer hover:text-[#F97316] transition group select-none"
                        onClick={() => handleSort('currentPrice')}
                      >
                         <div className="flex items-center justify-end gap-2">
                          Harga
                          <SortIcon active={sortConfig.key === 'currentPrice'} direction={sortConfig.direction} />
                        </div>
                      </th>
                      <th className="px-10 py-5 text-[10px] font-bold text-slate-300 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sortedResults.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 transition-all duration-200 group relative z-10"
                      >
                        {/* 1. Nama Domain & Status */}
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-5">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ring-4 ring-white shadow-sm ${item.available ? "bg-success" : "bg-slate-300"}`}
                            ></div>
                            <div>
                              <span
                                className={`font-bold text-base ${item.available ? "text-neutral-800" : "text-neutral-400"}`}
                              >
                                {item.domainName}
                              </span>
                              {item.available && item.originalPrice > item.basePrice && (
                                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#F97316] text-white shadow-sm shadow-orange-200 animate-pulse">
                                  PROMO
                                </span>
                              )}
                              {item.available ? (
                                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-success-50 text-success border border-success-100">
                                  TERSEDIA
                                </span>
                              ) : (
                                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  TERDAFTAR
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Durasi (Dropdown Clean) */}
                        <td className="px-8 py-4 relative">
                          <div className="w-36 relative z-50">
                            <CustomSelect
                              value={item.duration}
                              onChange={(val) =>
                                handleDurationChange(results.indexOf(item), val) // Find original index since we are mapping sortedResults
                              }
                              options={[1, 2, 3, 5, 10].map(y => ({ value: y, label: `${y} Tahun` }))}
                              className="w-full"
                            />
                          </div>
                        </td>

                        {/* 3. Harga */}
                        <td className="px-8 py-4 text-right">
                          {item.available ? (
                            <div>
                                {item.basePrice < item.originalPrice ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-neutral-400 line-through leading-none">{formatRupiah(item.originalPrice * item.duration)}</span>
                                        <span className="block font-bold text-lg text-[#F97316]">
                                            {formatRupiah(item.currentPrice)}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="block font-bold text-lg text-[#F97316]">
                                        {formatRupiah(item.currentPrice)}
                                    </span>
                                )}
                              <span className="text-xs text-neutral-400">
                                @{formatRupiah(item.basePrice)}/thn
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-neutral-400">
                              -
                            </span>
                          )}
                        </td>

                        {/* 4. Aksi */}
                        <td className="px-10 py-6 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              disabled={!item.available}
                              onClick={() => handleAddToCart(item)}
                              className="p-3 rounded-lg border border-slate-200 text-slate-400 hover:text-[#F97316] hover:border-[#F97316] hover:bg-orange-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-transparent disabled:border-slate-50"
                              title="Tambah ke Keranjang"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                            </button>
                            <button
                              disabled={!item.available}
                              onClick={() => handleBuyNow(item)}
                              className={`px-6 py-3 rounded-lg font-bold text-[13px] uppercase tracking-wider transition-all shadow-sm transform active:scale-95 ${item.available ? "bg-[#F97316] text-white hover:bg-orange-600 border border-transparent shadow-orange-500/30 shadow-xl" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"}`}
                            >
                              {item.available ? "Beli Sekarang" : "Whois"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredResults.length === 0 && (
                <div className="p-16 text-center">
                  <div className="inline-block p-4 rounded-full bg-neutral-50 mb-4">
                    <svg
                      className="w-8 h-8 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-neutral-700">Tidak ditemukan</h4>
                  <p className="text-neutral-500 text-sm mt-1">
                    Coba kata kunci lain atau ekstensi domain berbeda.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 3. PROMO BANNER SECTION */}
      <section className="py-12 px-6 lg:px-8">
        <BannerSection />
      </section>

      {/* 4. POPULAR EXTENSIONS */}
      <section className="py-24 bg-white border-y border-neutral-100 relative overflow-hidden">
        {/* Decorative Blob */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
             <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary-50/50 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-[36px] lg:text-[44px] font-bold text-slate-900 tracking-tight">Harga Pasar Terbaik</h2>
            <p className="text-slate-500 mt-3 text-[17px] font-medium">
              Transparan dan Kompetitif. Tanpa biaya tersembunyi untuk perpanjangan.
            </p>
          </div>
          {/* LINK KE DOMAIN PRICE LIST */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {tldList.slice(0, 4).map((item, idx) => {
              const hasDiscount = item.effectivePrice < item.rawPrice;
              
              return (
                <div
                  key={idx}
                  onClick={() => navigate("/domain")}
                  className={`p-10 border-2 rounded-2xl transition-all duration-500 group text-center cursor-pointer relative overflow-hidden
                    ${item.status === 'popular' 
                      ? "border-[#F97316] bg-orange-50/30 shadow-2xl shadow-orange-500/20 -translate-y-2 scale-105 z-10" 
                      : (item.status === 'promo' ? "border-orange-100 bg-orange-50/10 hover:border-[#F97316] hover:shadow-2xl hover:shadow-orange-200/50 hover:-translate-y-2" : "border-slate-100 bg-white hover:border-[#F97316] hover:shadow-2xl hover:shadow-orange-200/50 hover:-translate-y-2 opacity-90 hover:opacity-100")
                    }
                  `}
                >
                  {item.status && (
                    <span
                      className={`absolute top-4 right-4 text-[11px] font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm ${
                        item.status === 'popular'
                          ? "bg-[#F97316] text-white"
                          : (item.status === 'promo' ? "bg-[#F97316] text-white" : "bg-orange-100 text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white transition-colors")
                      }`}
                    >
                      {item.status === 'popular' ? 'Terlaris' : (item.status === 'best' ? 'Lokal' : 'Promo')}
                    </span>
                  )}
                  <h3 className={`text-4xl font-bold mt-6 mb-2 transition-colors ${item.status === 'popular' ? "text-[#F97316]" : "text-neutral-800 group-hover:text-[#F97316]"}`}>
                    {item.tld}
                  </h3>
                  <div className="mt-4">
                    <p className="text-xl font-bold text-[#F97316]">
                      {hasDiscount ? (
                        <span className="flex flex-col items-center">
                          <span className="text-xs text-neutral-400 line-through leading-none mb-1">{formatRupiah(item.rawPrice)}</span>
                          <span>{formatRupiah(item.effectivePrice)}</span>
                        </span>
                      ) : formatRupiah(item.rawPrice)}
                      <span className="text-sm font-medium text-neutral-400 ml-1">
                        /thn
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. FEATURES */}
      <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
        {/* Dark Mode Gradient Decor */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary-800/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-3 gap-10 lg:gap-16">
            {[
              {
                icon: "M13 10V3L4 14h7v7l9-11h-7z",
                title: "Aktivasi Kilat",
                desc: "Sistem otomatis kami bekerja 24 jam. Bayar sekarang, domain langsung aktif dalam hitungan detik.",
              },
              {
                icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                title: "Keamanan DNS",
                desc: "Proteksi privasi dan fitur DNS management lengkap untuk melindungi aset digital Anda dari ancaman.",
              },
              {
                icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
                title: "Support Lokal",
                desc: "Tim support asli Indonesia yang siap membantu teknis via WhatsApp dan Chat, bukan bot template.",
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="p-10 border border-slate-800 bg-slate-900/50 backdrop-blur-md rounded-2xl hover:border-[#F97316]/50 hover:bg-slate-800 transition-all duration-500 group hover:-translate-y-2 hover:shadow-3xl hover:shadow-orange-900/30"
              >
                <div className="w-14 h-14 bg-[#F97316]/10 rounded-lg flex items-center justify-center mb-6 shadow-lg shadow-orange-900/20 group-hover:scale-110 transition group-hover:shadow-orange-500/40 border border-[#F97316]/20">
                  <svg
                    className="w-7 h-7 text-[#F97316]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={feat.icon}
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-4 group-hover:text-primary-100 transition">{feat.title}</h3>
                <p className="text-neutral-400 leading-relaxed group-hover:text-neutral-300 transition">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="py-32 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-[36px] lg:text-[44px] font-bold text-slate-900 tracking-tight">
              Pertanyaan Umum
            </h2>
            <p className="text-slate-500 mt-4 text-[17px] font-medium">Bantu Anda memahami layanan kami lebih dalam.</p>
          </div>
          <div className="space-y-4">
            {faqs.length > 0 ? (
              faqs.map((faq, i) => (
                <details
                  key={faq.id || i}
                  className="group p-8 bg-white border border-slate-100 rounded-lg cursor-pointer hover:border-[#F97316] transition-all duration-300 open:shadow-2xl open:shadow-slate-200/50"
                >
                  <summary className="flex justify-between items-center font-bold text-lg text-slate-800 group-hover:text-[#F97316] list-none select-none transition-colors">
                    {faq.question}
                    <span className="transition duration-300 group-open:rotate-180 text-[#F97316]">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </summary>
                  <div className="text-neutral-600 mt-4 leading-relaxed overflow-hidden transition-[max-height] duration-500 ease-in-out">
                    <p className="whitespace-pre-wrap">{faq.answer}</p>
                  </div>
                </details>
              ))
            ) : (
              <p className="text-center text-slate-400">Belum ada FAQ yang tersedia.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
