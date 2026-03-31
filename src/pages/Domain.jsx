import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";


const Domain = () => {
  const navigate = useNavigate();
  const [pricingData, setPricingData] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Pricing
            const pRes = await api.get("/pricing/all");
            const pData = pRes.data;
            
            // 2. Fetch Public Vouchers
            const vRes = await api.get("/vouchers/public");
            const vData = vRes.data;
            
            setVouchers(Array.isArray(vData) ? vData : []);

            // 3. Map Pricing with Voucher Data
            const mapped = pData.map(p => {
                const regPrice = parseFloat(p.price_register);
                
                // Find eligible vouchers for this TLD
                const eligibleVouchers = (Array.isArray(vData) ? vData : []).filter(v => {
                    const tlds = v.eligible_tlds ? (typeof v.eligible_tlds === 'string' ? JSON.parse(v.eligible_tlds) : v.eligible_tlds) : [];
                    return tlds.includes(p.tld);
                });

                // Find max discount
                let maxDiscountPercent = 0;
                let maxDiscountFixed = 0;
                let bestVoucher = null;

                eligibleVouchers.forEach(v => {
                    if (v.type === 'percentage') {
                        if (v.value > maxDiscountPercent) {
                            maxDiscountPercent = v.value;
                            bestVoucher = v;
                        }
                    } else {
                        if (v.value > maxDiscountFixed) {
                            maxDiscountFixed = v.value;
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
                const dbDiscount = parseFloat(p.discount_price_reg || 0);
                if (dbDiscount > 0 && dbDiscount < finalPrice) {
                    finalPrice = dbDiscount;
                }

                return {
                    ...p,
                    promoLabel: bestVoucher ? "PROMO" : null,
                    effectivePrice: finalPrice,
                    hasPromo: bestVoucher !== null || (dbDiscount > 0 && dbDiscount < regPrice)
                };
            });

            setPricingData(mapped);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, []);

  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const filteredData = pricingData.filter((item) =>
    item.tld.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-40 pb-20 min-h-screen bg-white font-sans overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <span className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-orange-50 text-[#F97316] text-[12px] font-bold uppercase tracking-widest border border-orange-100 shadow-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse"></span>
            Pricelist Lengkap & Transparan
          </span>
          <h1 className="text-[40px] md:text-[56px] font-bold text-slate-900 tracking-tight leading-[1.1]">
            Daftar Harga <span className="text-[#F97316]">Domain</span>
          </h1>
          <p className="text-slate-500 mt-6 max-w-2xl mx-auto text-[17px] font-medium leading-relaxed">
            Temukan ekstensi domain yang pas buat brand kamu. Harga transparan,
            kompetitif, dan tanpa biaya tersembunyi untuk perpanjangan.
          </p>

          {/* Search Bar */}
          <div className="mt-12 max-w-xl mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <svg 
                className="h-5 w-5 text-slate-400 group-focus-within:text-[#F97316] transition-colors" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cari ekstensi domain (contoh: .id)"
              className="block w-full pl-14 pr-6 h-[56px] border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] transition-all shadow-[0_20px_50px_rgba(15,23,42,0.1)] hover:border-[#F97316]/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.1)] overflow-hidden animate-fade-in-up">
          {loading ? (
            <div className="p-12 text-center text-neutral-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F97316] mx-auto mb-4"></div>
              Memuat data harga...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ekstensi (TLD)</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Registrasi</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Perpanjangan</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Transfer</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {filteredData.length > 0 ? (
                    filteredData.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 transition-all duration-200 group"
                      >
                        <td className="px-10 py-6 font-bold text-xl text-slate-900 flex items-center gap-4">
                          {item.tld}
                          {item.promoLabel && (
                            <span className="text-[9px] font-bold bg-[#F97316] text-white px-2 py-0.5 rounded uppercase tracking-widest shadow-sm shadow-orange-200 animate-pulse">
                              {item.promoLabel}
                            </span>
                          )}
                          {['.com', '.id'].includes(item.tld) && !item.promoLabel && (
                            <span className="text-[9px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">
                              HOT
                            </span>
                          )}
                        </td>
                        <td className="px-10 py-6 text-[#F97316] font-bold text-lg text-center">
                          {item.hasPromo ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] text-slate-400 line-through leading-none mb-1 font-bold">{formatRupiah(item.price_register)}</span>
                              <span>{formatRupiah(item.effectivePrice)}</span>
                            </div>
                          ) : (
                            formatRupiah(item.price_register)
                          )}
                        </td>
                        <td className="px-10 py-6 text-slate-500 font-bold text-base text-center">
                          {formatRupiah(item.price_renew)}
                        </td>
                         <td className="px-10 py-6 text-slate-500 font-bold text-base text-center">
                          {item.price_transfer ? formatRupiah(item.price_transfer) : "-"}
                        </td>
                        <td className="px-10 py-6 text-center">
                           <span className="inline-flex items-center -lg text-[10px] font-bold uppercase tracking-widest bg-success-50 text-success border border-success-100">
                            Tersedia
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <button
                            onClick={() => navigate("/")} // Navigate home to perform search
                            className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold text-[12px] uppercase tracking-widest hover:bg-[#F97316] hover:shadow-xl hover:shadow-orange-500/20 transition-all transform active:scale-95 shadow-md"
                          >
                            Beli
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                      <tr>
                          <td colSpan="6" className="p-12 text-center text-neutral-400">
                              Ekstensi domain "{searchTerm}" tidak ditemukan.
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
         
      </div>
    </div>
  );
};

export default Domain;
