import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../../components/ui/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { checkDomainAvailability } from "../../services/domainService";
import api from "../../services/api";

const BuyDomain = () => {
  const { success, error } = useNotification();
  const navigate = useNavigate();

  // State Data
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Semua");

  // State Sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Daftar TLD & Harga Dasar (Fetch dari DB)
  const [tldList, setTldList] = useState([]);

   useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await api.get("/pricing/all");
        const data = response.data;
        
        // Database: tld, price_register, price_renew, price_transfer
        const prioritized = [".com", ".net", ".id", ".org", ".info", ".biz"];
        
        const formatted = data
          .map(item => ({
            name: item.tld,
            price: parseFloat(item.price_register),
            price_renew: parseFloat(item.price_renew),
            price_transfer: parseFloat(item.price_transfer),
            category: item.category || "Populer"
          }))
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
        console.error("Failed to load dynamic pricing:", err);
      }
    };
    fetchPricing();
  }, []);

  // Formatter Rupiah
  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  // --- LOGIC SEARCH ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setIsSearching(true);
    setResults([]);

    try {
        // 1. Generate Candidates based on query + TLD list
        // Note: Using candidates pattern from Home.jsx for consistency
        const candidates = tldList.map((tld) => {
            const regPrice = tld.price;
            const renewPrice = tld.price_renew;

            return {
                tld: tld.name,
                domain: query.toLowerCase().replace(/\s+/g, "") + tld.name,
                basePrice: regPrice,
                renewPrice: renewPrice,
                currentPrice: regPrice, // Initial price for 1 year
                category: tld.category,
                duration: 1,
            };
        });

        // 2. Import service inside or at top (better at top)
        // I'll add the import in a separate tool call to be safe, or just use it if imported.
        // Actually I need to add the import first.
        const { checkDomainAvailability } = await import("../../services/domainService");

        const checkPromises = candidates.map(async (item) => {
            try {
                const res = await checkDomainAvailability(item.domain);
                return { ...item, available: res.available };
            } catch (err) {
                console.error("Check failed for", item.domain, err);
                return { ...item, available: false };
            }
        });

        const finalResults = await Promise.all(checkPromises);
        setResults(finalResults);
    } catch (err) {
        console.error("Search failed:", err);
        error("Terjadi kesalahan saat mencari domain.");
    } finally {
        setIsSearching(false);
    }
  };

  // --- LOGIC UPDATE DURASI ---
  const handleDurationChange = (index, years) => {
    const newResults = [...results];
    const item = newResults[index];
    const duration = parseInt(years);
    
    item.duration = duration;
    // Calculate Multi-year: Year 1 = basePrice (register), Year 2+ = renewPrice
    if (duration > 1) {
        item.currentPrice = item.basePrice + (item.renewPrice * (duration - 1));
    } else {
        item.currentPrice = item.basePrice;
    }
    
    setResults(newResults);
  };

  // --- LOGIC: BELI LANGSUNG (Redirect) ---
  const handleBuyNow = (item) => {
    const cartItem = saveToCart(item);
    localStorage.setItem("checkout_payload", JSON.stringify([cartItem]));
    navigate(`/checkout?domain=${item.domain}`);
  };

  // --- LOGIC: TAMBAH KERANJANG (Stay) ---
  const handleAddToCart = (item) => {
    saveToCart(item);
    success("✅ Berhasil masuk keranjang!");
  };

  // Helper Simpan ke LocalStorage
  const saveToCart = (item) => {
    const cartItem = {
      name: item.domain,
      price: formatRupiah(item.currentPrice),
      duration: item.duration,
      rawPrice: item.currentPrice,
      action: 'register' // Action type for registration
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
        cart[existingIndex] = cartItem; // Update if exists
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage")); // Update badge navbar
    return cartItem; // Return the item so handleBuyNow can use it
  };

  // --- LOGIC SORTING ---
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = [...results].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Khusus sorting harga pakai currentPrice
    if (sortConfig.key === "price") {
      aValue = a.currentPrice;
      bValue = b.currentPrice;
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const filteredResults = sortedResults.filter(item => 
    activeCategory === "Semua" || item.category === activeCategory
  );

  // Komponen Icon Panah Sorting
  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey)
      return (
        <svg
          className="w-3 h-3 text-slate-400 ml-1 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    return sortConfig.direction === "asc" ? (
      <svg
        className="w-3 h-3 text-[#F97316] ml-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-3 h-3 text-[#F97316] ml-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out] pb-20">
      {/* 1. HERO HEADER (Tampilan Premium) */}
      <div className="relative bg-slate-900 rounded-xl p-8 md:p-12 overflow-hidden shadow-2xl">
        {/* Dekorasi Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F97316] rounded-full blur-[120px] opacity-10"></div>
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-10"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 -lg bg-white/10 border border-white/20 text-[#F97316] text-[10px] font-bold uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse"></span>
              Domain Finder
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Bangun Identitas <br />{" "}
              <span className="text-[#F97316]">Digital</span> Anda.
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-normal max-w-lg">
              Ketik satu kata kunci, sistem kami akan mencarikan kombinasi TLD
              terbaik dengan harga paling kompetitif untuk bisnis Anda.
            </p>
          </div>

          {/* Search Box Floating */}
          <div className="w-full md:w-auto min-w-[350px] bg-white/5 backdrop-blur-md border border-white/10 p-2 rounded-lg">
            <form onSubmit={handleSearch} className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Cari domain impian..."
                className="w-full px-5 py-3 rounded-lg bg-slate-800/50 text-white placeholder:text-slate-500 font-bold outline-none focus:bg-slate-800 transition border border-transparent focus:border-[#F97316]/50"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="submit"
                disabled={isSearching}
                className="w-full bg-[#F97316] text-white py-3 px-6 rounded-lg font-bold hover:bg-white hover:text-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                {isSearching ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  "Cari Sekarang"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 2. RESULTS TABLE */}
      {results.length > 0 ? (
        <div className="mt-20 space-y-6">
          {/* Filter Kategori */}
          <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit">
            {["Semua", "Populer", "Lokal", "Promo"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === cat
                    ? "bg-white text-[#F97316] shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              {/* Header dengan Sorting */}
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th
                    className="px-6 py-5 font-bold text-slate-600 cursor-pointer hover:text-[#F97316] transition select-none"
                    onClick={() => handleSort("domain")}
                  >
                    <div className="flex items-center gap-1">
                      Nama Domain <SortIcon colKey="domain" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-5 font-bold text-slate-600 cursor-pointer hover:text-[#F97316] transition select-none"
                    onClick={() => handleSort("category")}
                  >
                    <div className="flex items-center gap-1">
                      Kategori <SortIcon colKey="category" />
                    </div>
                  </th>
                  <th className="px-6 py-5 font-bold text-slate-600">Durasi</th>
                  <th
                    className="px-6 py-5 font-bold text-slate-600 text-right cursor-pointer hover:text-[#F97316] transition select-none"
                    onClick={() => handleSort("price")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Harga <SortIcon colKey="price" />
                    </div>
                  </th>
                  <th className="px-6 py-5 font-bold text-slate-600 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>

              {/* Body Data */}
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-orange-50/30 transition group"
                  >
                    {/* 1. Nama Domain */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${item.available ? "bg-green-50 text-green-600" : "bg-red-50 text-red-400"}`}
                        >
                          {item.available ? (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
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
                          )}
                        </div>
                        <div>
                          <p
                            className={`font-bold text-base ${item.available ? "text-slate-800" : "text-slate-400"}`}
                          >
                            {item.domain}
                          </p>
                          {!item.available && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase tracking-tighter">
                              Terpakai
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Kategori Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`-lg text-xs font-bold border ${
                          item.category === "Promo"
                            ? "bg-purple-50 text-purple-600 border-purple-100"
                            : item.category === "Lokal"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>

                    {/* 3. Pilihan (Durasi) */}
                    <td className="px-6 py-4">
                      <div className="relative w-28">
                        <CustomSelect
                          disabled={!item.available}
                          value={item.duration}
                          onChange={(val) =>
                            handleDurationChange(idx, val)
                          }
                          options={[1, 2, 3, 5, 10].map(y => ({ value: y, label: `${y} Tahun` }))}
                          className="w-full relative z-30"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <svg
                            className="w-3 h-3"
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
                        </div>
                      </div>
                    </td>

                    {/* 4. Harga */}
                    <td className="px-6 py-4 text-right">
                      {item.available ? (
                        <span className="font-bold text-slate-800 text-base block">
                          {formatRupiah(item.currentPrice)}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-bold">-</span>
                      )}
                    </td>

                    {/* 5. Aksi (DUA TOMBOL) */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Tombol Keranjang */}
                         <button
                          disabled={!item.available}
                          onClick={() => handleAddToCart(item)}
                          className={`p-2.5 rounded-lg border transition ${
                            item.available
                              ? "border-slate-200 text-slate-400 hover:border-[#F97316] hover:text-[#F97316] hover:bg-orange-50"
                              : "border-slate-100 text-slate-200 cursor-not-allowed bg-slate-50"
                          }`}
                          title="Tambah ke Keranjang"
                        >
                          <svg
                            className="w-5 h-5"
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
                        </button>

                        {/* Tombol Beli */}
                         <button
                          disabled={!item.available}
                          onClick={() => handleBuyNow(item)}
                          className={`px-5 py-2.5 rounded-lg font-bold text-xs transition transform active:scale-95 shadow-md flex items-center gap-2 ${
                            item.available
                              ? "bg-[#F97316] text-white hover:bg-slate-900 shadow-orange-950/20"
                              : "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                          }`}
                        >
                          {item.available ? "Beli" : "Sold"}
                          {item.available && (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : (
        // Empty State (Clean Icon)
        <div className="flex flex-col items-center justify-center py-24 opacity-60">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <p className="text-slate-500 font-bold text-lg">
            Belum ada pencarian.
          </p>
          <p className="text-slate-400 text-sm">
            Gunakan kolom pencarian di atas.
          </p>
        </div>
      )}
    </div>
  );
};

export default BuyDomain;
