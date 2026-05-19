import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomSelect from "../components/ui/CustomSelect";
import { useNotification } from "../context/NotificationContext";
import api from "../services/api";

const Cart = () => {
  const { info } = useNotification(); // Removed unused success
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [pricingMap, setPricingMap] = useState({});
  const [loading, setLoading] = useState(true);

  // --- CEK LOGIN & HEADER LINK ---
  const isUserLoggedIn = localStorage.getItem("user");
  const backLink = isUserLoggedIn ? "/dashboard" : "/";

  // --- LOAD DATA ---
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        let parsedItems = JSON.parse(savedCart);
        if (!Array.isArray(parsedItems)) {
          parsedItems = [parsedItems];
        }
        setCartItems(parsedItems);
        setSelectedIndices(parsedItems.map((_, i) => i)); // Default all selected
        
        // Fetch all pricing
        api.get("/pricing/all")
          .then(res => {
            const map = {};
            res.data.forEach(p => map[p.tld] = p);
            setPricingMap(map);
            setLoading(false);
          })
          .catch(err => {
            console.error("Failed to fetch fresh pricing", err);
            setLoading(false);
          });
      } catch (e) {
        console.error("Cart corrupt, clearing...");
        localStorage.removeItem("cart");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // --- UPDATE DURASI ---
  const updateDuration = (index, val) => {
    const newDuration = parseInt(val);
    const updatedItems = [...cartItems];
    updatedItems[index] = { ...updatedItems[index], duration: newDuration };
    
    setCartItems(updatedItems);
    localStorage.setItem("cart", JSON.stringify(updatedItems));
  };

  // --- HAPUS ITEM ---
  const handleRemove = (index) => {
    const updatedItems = cartItems.filter((_, i) => i !== index);
    setCartItems(updatedItems);
    setSelectedIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
    localStorage.setItem("cart", JSON.stringify(updatedItems));
    window.dispatchEvent(new Event("storage"));
    info("Item dihapus dari keranjang.");
  };

  // --- SELECTION LOGIC ---
  const toggleSelect = (index) => {
    setSelectedIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIndices.length === cartItems.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(cartItems.map((_, i) => i));
    }
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  // --- KALKULASI TOTAL ---
  const getItemSubtotal = (item) => {
    const tld = "." + item.name.split('.').slice(1).join('.');
    const pricing = pricingMap[tld];
    if (!pricing) return 0;

    const duration = item.duration || 1;
    const action = item.action || 'register';
    const regPrice = parseFloat(pricing.price_register);
    const renewPrice = parseFloat(pricing.price_renew);
    const transferPrice = parseFloat(pricing.price_transfer);
    const restorePrice = parseFloat(pricing.price_restore || 0);

    if (action === 'renew') {
      return renewPrice * duration;
    } else if (action === 'transfer') {
      return transferPrice + (renewPrice * (duration - 1));
    } else if (action === 'restore') {
      return restorePrice;
    } else {
      if (duration > 1) {
        return regPrice + (renewPrice * (duration - 1));
      }
      return regPrice;
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((acc, item, index) => {
      if (!selectedIndices.includes(index)) return acc;
      return acc + getItemSubtotal(item);
    }, 0);
  };

  const subtotal = calculateTotal();
  const ppn = 0; 
  const total = subtotal; // PPN hidden as requested

  const getActionLabel = (item) => {
    const action = item?.action || 'register';
    if (action === 'renew') return "Perpanjangan";
    if (action === 'transfer') return "Transfer";
    if (action === 'restore') return "Pemulihan";
    return "Pendaftaran";
  };

  // --- TAMPILAN KOSONG ---
  if (!loading && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 pt-20">
        <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Keranjang Kosong</h2>
        <p className="text-slate-500 mb-8">Belum ada domain yang diamankan.</p>
        <button
          onClick={() => navigate(isUserLoggedIn ? "/dashboard/buy" : "/")}
          className="bg-[#F97316] text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-slate-900 transition transform active:scale-95"
        >
          Cari Domain
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-6 pb-10 px-2 md:px-4 lg:px-6 font-sans animate-[fadeIn_0.5s_ease-out]">
      <div className="w-full">
        {/* Header Navigasi */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to={backLink}
            className="flex items-center gap-2 text-slate-500 hover:text-[#F97316] transition font-bold text-sm bg-white px-4 py-2.5 rounded-lg border border-slate-100 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Keranjang Belanja</h1>
          <div className="w-32 hidden sm:block"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* --- LEFT: ITEM LIST --- */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-50 bg-slate-50/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#F97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Daftar Domain ({cartItems.length})
                  </h2>
                  <label className="flex items-center gap-2 cursor-pointer group/all">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={selectedIndices.length === cartItems.length && cartItems.length > 0}
                      onChange={toggleSelectAll}
                    />
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIndices.length === cartItems.length ? 'bg-[#F97316] border-[#F97316]' : 'border-slate-200 group-hover/all:border-orange-200'}`}>
                      {selectedIndices.length === cartItems.length && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Semua</span>
                  </label>
                </div>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                {cartItems.map((item, index) => (
                  <div key={index} className={`group hover:bg-slate-50/50 transition-colors ${index !== cartItems.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                      <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto">
                        {/* Checkbox */}
                        <label className="relative flex items-center cursor-pointer group/check shrink-0">
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={selectedIndices.includes(index)}
                            onChange={() => toggleSelect(index)}
                          />
                          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIndices.includes(index) ? 'bg-[#F97316] border-[#F97316] shadow-lg shadow-orange-100' : 'border-slate-100 bg-slate-50 group-hover/check:border-orange-100'}`}>
                            {selectedIndices.includes(index) && (
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </label>

                        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest shadow-sm group-hover:border-orange-100 transition-colors shrink-0">
                          {item.name.split(".").pop()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight mb-1 sm:mb-2 truncate">{item.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="text-[7px] sm:text-[9px] font-bold text-[#F97316] bg-orange-50 px-1.5 sm:px-2 py-0.5 rounded-md border border-orange-100 uppercase tracking-wider">{getActionLabel(item)}</span>
                            <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[7px] sm:text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wider">
                              <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              Available
                            </span>
                          </div>
                        </div>
                        
                        {/* Remove Button for Mobile (shown next to title) */}
                        <button
                          onClick={() => handleRemove(index)}
                          className="sm:hidden w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95 shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t border-slate-50 sm:border-0">
                        <div className="w-28 sm:w-32">
                          <CustomSelect
                            value={item.duration || 1}
                            onChange={(val) => updateDuration(index, val)}
                            options={[1, 2, 3, 5, 10].map(y => ({ value: y, label: `${y} Tahun` }))}
                          />
                        </div>
                        <div className="text-right min-w-[100px] sm:min-w-[120px]">
                          <p className="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Subtotal</p>
                          <p className="text-xs sm:text-sm font-bold text-slate-700">{formatRupiah(getItemSubtotal(item))}</p>
                        </div>
                        {/* Remove Button for Desktop */}
                        <button
                          onClick={() => handleRemove(index)}
                          className="hidden sm:flex w-10 h-10 items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95 shrink-0"
                          title="Hapus"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* --- RIGHT: SUMMARY --- */}
          <div className="lg:col-span-1 sticky top-6">
            <div className="bg-white p-6 rounded-lg shadow-xl shadow-slate-200/50 border border-slate-100">
              <h3 className="font-bold text-xl text-slate-900 mb-6 tracking-tight">Rincian Biaya</h3>

              <div className="space-y-4 pb-6 border-b border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Subtotal ({selectedIndices.length} terpilih)</span>
                  <span className="font-bold text-slate-800">{formatRupiah(subtotal)}</span>
                </div>
              </div>

              {/* Voucher information */}
              <div className="my-6 p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Punya Vocer?</h4>
                    <p className="text-xs text-slate-600 font-medium">Gunakan vocer Anda di halaman checkout.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8">
                <span className="text-slate-500 font-bold text-sm">Total Tagihan</span>
                <span className="text-2xl font-bold text-[#F97316]">{formatRupiah(total)}</span>
              </div>

              <button
                onClick={() => {
                  if (selectedIndices.length === 0) {
                    info("Pilih setidaknya satu domain untuk melanjutkan.");
                    return;
                  }
                  const selectedItems = cartItems.filter((_, i) => selectedIndices.includes(i));
                  localStorage.setItem("checkout_payload", JSON.stringify(selectedItems));
                  navigate("/checkout");
                }}
                className="w-full h-12 bg-[#F97316] text-white rounded-lg font-bold hover:bg-slate-900 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-orange-100/50"
              >
                Lanjutkan Checkout
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>

              <div className="mt-6 flex justify-center">
                <Link
                  to={isUserLoggedIn ? "/dashboard/buy" : "/"}
                  className="text-xs font-bold text-slate-400 hover:text-[#F97316] transition-colors uppercase tracking-widest"
                >
                  ← Kembali Belanja
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
