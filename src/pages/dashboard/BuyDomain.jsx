import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import { checkDomainAvailability } from "../../services/domainService";
import api from "../../services/api";

const FeatureCard = ({ icon, title, desc }) => (
  <div className="card group">
    <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-500 mb-4 group-hover:bg-primary-500 group-hover:text-white transition-colors">
      <span className="material-symbols-outlined text-[24px]">{icon}</span>
    </div>
    <h4 className="text-[13px] font-semibold text-neutral-900 mb-1">{title}</h4>
    <p className="text-[12px] text-neutral-500 leading-relaxed">{desc}</p>
  </div>
);

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-3 flex justify-between items-center text-left hover:text-primary-500 transition-colors"
      >
        <span className="text-[12px] font-medium text-neutral-700">{question}</span>
        <span className={`material-symbols-outlined text-neutral-400 text-[18px] transition-transform ${isOpen ? 'rotate-180 text-primary-500' : ''}`}>expand_more</span>
      </button>
      {isOpen && (
        <p className="pb-3 text-[11px] text-neutral-500 leading-relaxed">{answer}</p>
      )}
    </div>
  );
};

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
  const [faqs, setFaqs] = useState([]);

  // Fetch FAQ & Pricing
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Pricing
        const pricingRes = await api.get("/pricing/all");
        if (pricingRes.data) {
          const prioritized = [".com", ".net", ".id", ".org", ".info", ".biz"];
          const formatted = pricingRes.data
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
        }

        // Fetch FAQs (Category: domain)
        const faqRes = await api.get("/faqs?category=domain");
        if (Array.isArray(faqRes)) {
          setFaqs(faqRes);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    };
    fetchData();
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
        const cleanQuery = query.toLowerCase().replace(/\s+/g, "");
        const matchedTld = tldList.find(t => cleanQuery.endsWith(t.name));
        
        let candidates = [];
        
        if (matchedTld && cleanQuery.includes(".")) {
          // User typed a specific domain, only show that one
          candidates = [{
            tld: matchedTld.name,
            domain: cleanQuery,
            basePrice: matchedTld.price,
            renewPrice: matchedTld.price_renew,
            currentPrice: matchedTld.price,
            category: matchedTld.category,
            duration: 1,
          }];
        } else {
          // Standard keyword search: append all TLDs
          candidates = tldList.map((tld) => {
              const regPrice = tld.price;
              const renewPrice = tld.price_renew;

              return {
                  tld: tld.name,
                  domain: cleanQuery + tld.name,
                  basePrice: regPrice,
                  renewPrice: renewPrice,
                  currentPrice: regPrice, // Initial price for 1 year
                  category: tld.category,
                  duration: 1,
              };
          });
        }

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
      price: item.currentPrice, // Store as number
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
      return <span className="material-symbols-outlined text-[14px] text-neutral-300 opacity-50">unfold_more</span>;
    return sortConfig.direction === "asc"
      ? <span className="material-symbols-outlined text-[14px] text-primary-500">arrow_upward</span>
      : <span className="material-symbols-outlined text-[14px] text-primary-500">arrow_downward</span>;
  };

  return (
    <div className="px-6 pb-20 animate-fade-in space-y-6">
      {/* HERO — Search Domain */}
      <div className="card p-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="badge badge-neutral">Domain Finder</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
            </div>
            <h1 className="text-[20px] md:text-[24px] font-bold text-neutral-900 leading-tight mb-2">
              Bangun Identitas <span className="text-primary-500">Digital</span> Anda
            </h1>
            <p className="text-[12px] text-neutral-500 leading-relaxed max-w-lg">
              Ketik satu kata kunci, sistem akan mencarikan kombinasi TLD terbaik dengan harga paling kompetitif.
            </p>
          </div>

          <div className="w-full md:w-[360px]">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="form-group">
                <label className="form-label">Cari Domain</label>
                <input
                  type="text"
                  placeholder="Contoh: startup"
                  className="form-input"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (results.length > 0) setResults([]);
                  }}
                />
              </div>
              <button type="submit" disabled={isSearching} className="btn btn-primary w-full">
                {isSearching ? "Mencari..." : "Cari Sekarang"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* CATEGORY FILTER */}
      {results.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 p-1 bg-neutral-100 rounded-lg w-fit">
          {["Semua", "Populer", "Lokal", "Promo"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-[11px] font-semibold transition ${
                activeCategory === cat
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* RESULTS */}
      {results.length > 0 ? (
        <div className="card p-0 overflow-hidden">
          {/* DESKTOP TABLE */}
          <div className="table-wrap rounded-none border-0">
            <table>
              <thead>
                <tr>
                  <th className="cursor-pointer hover:text-primary-500 select-none" onClick={() => handleSort("domain")}>
                    <span className="flex items-center gap-1">Nama Domain <SortIcon colKey="domain" /></span>
                  </th>
                  <th className="cursor-pointer hover:text-primary-500 select-none" onClick={() => handleSort("category")}>
                    <span className="flex items-center gap-1">Kategori <SortIcon colKey="category" /></span>
                  </th>
                  <th>Durasi</th>
                  <th className="text-right cursor-pointer hover:text-primary-500 select-none" onClick={() => handleSort("price")}>
                    <span className="flex items-center justify-end gap-1">Harga <SortIcon colKey="price" /></span>
                  </th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.available ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-400"}`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {item.available ? "check" : "close"}
                          </span>
                        </div>
                        <div>
                          <p className={`text-[13px] font-semibold ${item.available ? "text-neutral-900" : "text-neutral-400"}`}>{item.domain}</p>
                          {!item.available && (
                            <span className={`badge ${item.error?.includes('422') || item.error?.toLowerCase().includes('not supported') ? 'badge-warning' : 'badge-danger'}`}>
                              {item.error?.includes('422') || item.error?.toLowerCase().includes('not supported') ? "Belum Aktif" : "Terpakai"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${item.category === "Promo" ? "badge-warning" : item.category === "Lokal" ? "badge-info" : "badge-neutral"}`}>
                        {item.category}
                      </span>
                    </td>
                    <td>
                      <select
                        disabled={!item.available}
                        value={item.duration}
                        onChange={(e) => handleDurationChange(idx, e.target.value)}
                        className="form-select w-28"
                      >
                        {[1, 2, 3, 5, 10].map(y => (
                          <option key={y} value={y}>{y} Tahun</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">
                      {item.available ? (
                        <span className="text-[14px] font-bold text-neutral-900">{formatRupiah(item.currentPrice)}</span>
                      ) : (
                        <span className="text-neutral-300 font-bold">-</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          disabled={!item.available}
                          onClick={() => handleAddToCart(item)}
                          className="btn-icon btn-default btn-sm"
                          title="Tambah ke Keranjang"
                        >
                          <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                        </button>
                        <button
                          disabled={!item.available}
                          onClick={() => handleBuyNow(item)}
                          className={`btn btn-sm ${item.available ? 'btn-primary' : 'btn-default opacity-50'}`}
                        >
                          {item.available ? "Beli" : "Sold"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="block md:hidden divide-y divide-neutral-100">
            {filteredResults.map((item, idx) => (
              <div key={idx} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.available ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-400"}`}>
                      <span className="material-symbols-outlined text-[16px]">{item.available ? "check" : "close"}</span>
                    </div>
                    <div>
                      <p className={`text-[13px] font-semibold ${item.available ? "text-neutral-900" : "text-neutral-400"}`}>{item.domain}</p>
                      <div className="flex gap-1 mt-0.5">
                        <span className={`badge ${item.category === "Promo" ? "badge-warning" : item.category === "Lokal" ? "badge-info" : "badge-neutral"}`}>{item.category}</span>
                        {!item.available && <span className="badge badge-danger">Terpakai</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {item.available ? (
                      <span className="text-[14px] font-bold text-neutral-900">{formatRupiah(item.currentPrice)}</span>
                    ) : <span className="text-neutral-300 font-bold">-</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-neutral-400 mb-1 block">Durasi</label>
                    <select
                      disabled={!item.available}
                      value={item.duration}
                      onChange={(e) => handleDurationChange(idx, e.target.value)}
                      className="form-select w-full"
                    >
                      {[1, 2, 3, 5, 10].map(y => (
                        <option key={y} value={y}>{y} Tahun</option>
                      ))}
                    </select>
                  </div>
                  <button
                    disabled={!item.available}
                    onClick={() => handleAddToCart(item)}
                    className="btn-icon btn-default btn-sm mt-5"
                    title="Tambah ke Keranjang"
                  >
                    <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                  </button>
                  <button
                    disabled={!item.available}
                    onClick={() => handleBuyNow(item)}
                    className={`btn btn-sm mt-5 ${item.available ? 'btn-primary' : 'btn-default opacity-50'}`}
                  >
                    {item.available ? "Beli" : "Sold"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl text-neutral-300">search</span>
          </div>
          <p className="text-[14px] font-semibold text-neutral-900 mb-1">Belum ada pencarian</p>
          <p className="text-[12px] text-neutral-500">Gunakan kolom pencarian di atas untuk menemukan domain impian Anda.</p>
        </div>
      )}

      {/* FEATURES + FAQ + SUPPORT */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard icon="bolt" title="Aktivasi Instan" desc="Domain aktif secara otomatis setelah pembayaran dikonfirmasi." />
          <FeatureCard icon="shield" title="Keamanan Penuh" desc="Proteksi WHOIS dan Domain Lock untuk keamanan aset digital Anda." />
          <FeatureCard icon="dns" title="DNS Management" desc="Kelola record A, CNAME, MX, TXT dengan mudah melalui panel dashboard." />
          <FeatureCard icon="headset_mic" title="Bantuan Ahli" desc="Tim support kami siap membantu kendala teknis Anda kapan saja." />
        </div>

        <div className="card p-5">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
              <h2 className="text-[16px] font-bold text-neutral-900 mb-1">Pertanyaan Populer</h2>
              <p className="text-[12px] text-neutral-500 mb-4">Segala hal yang perlu Anda ketahui tentang pendaftaran domain.</p>
              <button onClick={() => navigate("/dashboard/support")} className="text-[12px] font-semibold text-primary-600 hover:underline flex items-center gap-1">
                Lihat Semua Bantuan
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
            <div className="md:w-2/3">
              {faqs.length > 0 ? (
                faqs.map((faq, index) => (
                  <FAQItem key={faq.id || index} question={faq.question} answer={faq.answer} />
                ))
              ) : (
                <>
                  <FAQItem question="Berapa lama proses aktivasi domain?" answer="Hampir seluruh TLD (seperti .com, .id, .net) aktif secara instan (real-time) setelah pembayaran berhasil divalidasi oleh sistem kami." />
                  <FAQItem question="Apakah saya mendapatkan akses DNS penuh?" answer="Ya! Anda memiliki kontrol penuh atas DNS Management." />
                  <FAQItem question="Bagaimana cara perpanjang domain saya?" answer="Sistem akan mengirimkan notifikasi 30 hari sebelum domain kadaluarsa." />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="card p-5 bg-primary-500 border-primary-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-[14px] font-bold text-white mb-0.5">Butuh bantuan memilih domain?</h3>
              <p className="text-[12px] text-white/80">Tim ahli kami siap membantu mencarikan nama terbaik untuk bisnis Anda.</p>
            </div>
            <button onClick={() => navigate("/dashboard/support")} className="btn bg-white text-primary-600 hover:bg-neutral-100 border-0 flex-shrink-0">
              Hubungi CS Kami
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyDomain;
