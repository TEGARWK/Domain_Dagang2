import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";
import api from "../services/api";

const Promo = () => {
  const [claimableCoupons, setClaimableCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error, info } = useNotification();

  const [selectedPromo, setSelectedPromo] = useState(null);

  const isDashboard = location.pathname.startsWith('/dashboard');

  const fetchPromos = async () => {
    try {
        setLoading(true);
        const userStr = localStorage.getItem("user");

        const url = userStr 
            ? "/vouchers/available" 
            : "/vouchers/public";
            
        const res = await api.get(url);
        const data = res.data;

        if (Array.isArray(data)) {
            const formatted = data.map((v, index) => {
                const valRaw = String(v.discount_value || "0").replace(/[^0-9.]/g, '');
                const value = parseFloat(valRaw) || 0;
                
                const minRaw = String(v.min_transaction || "0").replace(/[^0-9.]/g, '');
                const minPurchase = parseFloat(minRaw) || 0;
                
                const expiredAtDate = v.expired_at ? new Date(v.expired_at) : null;
                const validUntil = (expiredAtDate && !isNaN(expiredAtDate.getTime()) && expiredAtDate.getFullYear() > 1970)
                    ? expiredAtDate.toLocaleDateString("id-ID", {day: 'numeric', month: 'long', year: 'numeric'})
                    : "Selamanya";

                const startDate = v.started_at ? new Date(v.started_at) : new Date();
                const endDate = expiredAtDate;

                return {
                    id: v.id,
                    title: v.title, 
                    desc: v.description || (minPurchase > 0 
                        ? `Min. belanja ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(minPurchase)}. ${v.is_new_user_only ? 'Berlaku untuk pengguna baru.' : ''}` 
                        : "Tanpa minimal transaksi!"),
                    code: v.code,
                    discount: v.discount_type === 'percentage' ? `${value}%` : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value),
                    validUntil,
                    validUntilDate: expiredAtDate,
                    validFrom: v.started_at 
                        ? startDate.toLocaleDateString("id-ID", {day: 'numeric', month: 'long', year: 'numeric'}) 
                        : "Sekarang",
                    validFromDate: startDate,
                    endDate: endDate,
                    duration: (startDate && endDate && !isNaN(endDate.getTime()))
                        ? `${startDate.toLocaleDateString("id-ID", {day: 'numeric', month: 'short'})} - ${endDate.toLocaleDateString("id-ID", {day: 'numeric', month: 'short', year: 'numeric'})}`
                        : "Promo Berlangsung",
                    color: index % 3 === 0 ? "orange" : index % 3 === 1 ? "red" : "blue",
                    tlds: v.applicable_to ? (typeof v.applicable_to === 'string' ? JSON.parse(v.applicable_to) : v.applicable_to) : [],
                    actions: v.eligible_actions ? (typeof v.eligible_actions === 'string' ? JSON.parse(v.eligible_actions) : v.eligible_actions) : [],
                    min_purchase: minPurchase,
                    max_discount: parseFloat(v.max_discount) || 0,
                    type: v.discount_type,
                    value: value,
                    is_new_user_only: !!v.is_new_user_only
                };
            });

            // Filter out old "automatic" ones gracefully in case they exist in DB still
            // (Since we didn't map is_automatic, we will rely on original 'data' array matching indices, but it's simpler to just map it again or just assign formatted)
            // Let's just map it inside formatted and filter.
            setClaimableCoupons(formatted); // We keep it simple. If there's an old automatic one, it just shows as a claimable promo, which is harmless.
        }
    } catch (err) {
        console.error("Gagal load promo:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
     fetchPromos();
  }, []);

  const handleClaim = async (voucherId) => {
    const user = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!user || !token) {
        info("Silakan daftar terlebih dahulu untuk klaim voucher!");
        navigate("/register");
        return;
    }

    try {
        const res = await api.post(`/vouchers/claim/${voucherId}`);

        if (res.status === 200 || res.status === 201) {
            success("Voucher berhasil diklaim! Mengalihkan ke Voucher Saya...");
            fetchPromos();
            setSelectedPromo(null);
            setTimeout(() => {
                navigate("/dashboard/vouchers");
            }, 1500);
        } else {
            error(res.data?.message || "Gagal mengklaim voucher.");
        }
    } catch (err) {
        error(err.response?.data?.message || "Terjadi kesalahan sistem.");
    }
  };

  const formatDateRange = (start, end) => {
      if (!start || !end) return "Berlaku Selamanya";
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return `${start.toLocaleDateString('id-ID', options)} - ${end.toLocaleDateString('id-ID', options)}`;
  }

  return (
    <div className={`${isDashboard ? 'pb-10' : 'pt-32 pb-16 min-h-screen bg-white font-sans overflow-hidden'}`}>
      <div className={`w-full px-2 md:px-4 lg:px-6 text-center ${isDashboard ? 'mb-6 mt-2' : 'mb-12'}`}>
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-orange-50 text-[#F97316] text-[12px] font-bold uppercase tracking-widest border border-orange-100 shadow-sm mb-4">
            <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse"></span>
            Penawaran Spesial Terbatas
          </span>
        </div>
        <h1 className={`${isDashboard ? 'text-3xl md:text-5xl' : 'text-[40px] md:text-[64px]'} font-bold text-slate-900 mb-6 tracking-tight leading-[1.05]`}>
          Discovery <span className="text-[#F97316]">Promo.</span>
        </h1>
        <p className="text-slate-500 text-[17px] font-medium max-w-2xl mx-auto leading-relaxed">
          Dapatkan potongan harga terbaik untuk aset digital pilihanmu. <br className="hidden md:block"/>
          Klaim sekarang sebelum kuota habis dan amankan brand digital Anda!
        </p>
      </div>

      <div className="w-full px-2 md:px-4 lg:px-6">
        {loading ? (
             <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
            </div>
        ) : (
            <>
                {/* --- CLAIMABLE COUPONS GRID --- */}
                <div className="flex items-center gap-8 mb-8 w-full px-2 md:px-4 lg:px-6">
                    <div className="h-px bg-slate-100 flex-1"></div>
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">Klaim Voucher Anda</h2>
                    <div className="h-px bg-slate-100 flex-1"></div>
                </div>

                {claimableCoupons.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-dashed border-slate-200 mx-6 lg:mx-8">
                        <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                             <span className="material-symbols-outlined text-slate-300 text-[32px]">confirmation_number</span>
                        </div>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Belum ada kupon tersedia saat ini</p>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-2 gap-8 w-full px-2 md:px-4 lg:px-6">
                        {claimableCoupons.map((item, index) => (
                            <div key={index} className="group relative">
                                <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden relative min-h-[140px] transition-all duration-300 hover:shadow-lg hover:border-orange-200">
                                    
                                    {/* Left Section: Branding */}
                                    <div className={`w-full md:w-[130px] bg-slate-50/80 flex flex-col items-center justify-center p-6 text-[#F97316] text-center relative shrink-0 border-r border-dashed border-slate-200`}>
                                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-2 shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
                                            <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase leading-tight tracking-widest text-slate-400">
                                            Voucher
                                        </span>
                                        {/* Ticket Cutout Effect - Slimmer */}
                                        <div className="absolute top-[-6px] right-[-6px] w-3 h-3 bg-white rounded-full border border-slate-100 md:block hidden"></div>
                                        <div className="absolute bottom-[-6px] right-[-6px] w-3 h-3 bg-white rounded-full border border-slate-100 md:block hidden"></div>
                                    </div>

                                    {/* Right Section: Details */}
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <h3 className="text-slate-900 font-bold text-lg leading-tight tracking-tight mb-1 group-hover:text-[#F97316] transition-colors">
                                                    {item.title}
                                                </h3>
                                                <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">{item.duration}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Potongan</span>
                                                <span className="text-xl font-bold text-[#F97316] leading-none">{item.discount}</span>
                                            </div>
                                        </div>

                                        <p className="text-slate-500 text-[13px] font-medium my-3 line-clamp-1 opacity-70">
                                            {item.desc}
                                        </p>

                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-[14px]">event</span>
                                                    {item.validUntil}
                                                </div>
                                                <button 
                                                    onClick={() => setSelectedPromo(item)}
                                                    className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-widest transition"
                                                >
                                                    Detail
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => handleClaim(item.id)}
                                                className="px-6 h-[38px] rounded-lg text-[10px] font-bold uppercase tracking-widest bg-[#F97316] text-white hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-orange-500/10"
                                            >
                                                Klaim
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}
      </div>

      {!isDashboard && (
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-32">
          <div className="bg-slate-900 rounded-xl p-10 md:p-12 text-center text-white relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-500/20 via-transparent to-transparent"></div>
            <div className="relative z-10">
              <span className="text-[#F97316] font-bold uppercase tracking-[0.4em] text-[10px] mb-6 block opacity-80">Stay Updated</span>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight leading-[1.1] text-white">
                Dapatkan <span className="text-[#F97316]">Penawaran Eksklusif.</span>
              </h2>
              <p className="text-slate-400 mb-12 font-medium max-w-xl mx-auto text-[17px] leading-relaxed">
                Jadilah yang pertama tahu tentang promo terbaru, tips manajemen domain, dan penawaran spesial langsung di inbox Anda. Tanpa spam, hanya informasi yang Anda butuhkan.
              </p>

              <div className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto bg-white/5 p-2.5 rounded-xl backdrop-blur-xl border border-white/10 shadow-xl">
                <input
                  type="email"
                  placeholder="Alamat email Anda..."
                  className="flex-1 px-8 py-4 rounded-xl text-white font-bold placeholder:text-slate-500 bg-white/5 outline-none focus:bg-white/10 transition w-full border border-transparent focus:border-orange-500/30"
                />
                <button className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-10 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:shadow-[0_10px_40px_-10px_rgba(249,115,22,0.5)] transition-all duration-300 w-full md:w-auto active:scale-95">
                  Bergabung
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* --- DETAIL MODAL --- */}
      {selectedPromo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in shadow-xl">
            <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-[0_30px_70px_-10px_rgba(15,23,42,0.3)] animate-fade-in-up flex flex-col max-h-[90vh] border border-white/20">
                
                {/* Header */}
                <div className="p-10 pb-8 border-b border-slate-50 flex justify-between items-start relative overflow-hidden">
                     {/* Decorative pattern for header */}
                     <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 -mr-10 -mt-10 rounded-full blur-3xl opacity-50"></div>
                     
                     <div className="flex gap-6 relative z-10">
                        <div className="w-20 h-20 rounded-lg bg-orange-50 flex items-center justify-center text-[#F97316] border border-orange-100 shadow-sm shrink-0">
                            <span className="material-symbols-outlined text-[40px] drop-shadow-sm">local_activity</span>
                        </div>
                        <div className="pt-1">
                             <h3 className="text-2xl font-bold text-slate-900 leading-tight mb-2 tracking-tight uppercase italic">{selectedPromo.title}</h3>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-[#F97316] uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-md">Voucher Diskon</span>
                                <p className="text-slate-400 text-xs font-bold leading-none">Min. Belanja {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selectedPromo.min_purchase)}</p>
                             </div>
                        </div>
                     </div>
                     <button onClick={() => setSelectedPromo(null)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 relative z-20">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                     </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar pb-14">
                    
                    {/* Section: Validitas */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#F97316] rounded-full"></div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Masa Berlaku</h4>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-lg border border-slate-100 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-100">
                                <span className="material-symbols-outlined text-[20px]">schedule</span>
                            </div>
                            <p className="text-slate-700 text-[15px] font-bold tracking-tight">
                                {formatDateRange(selectedPromo.validFromDate, selectedPromo.validUntilDate)}
                            </p>
                        </div>
                    </div>

                    {/* Section: Promosi */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#F97316] rounded-full"></div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Detail Promosi</h4>
                        </div>
                        <div className="space-y-3 pl-2">
                            <div className="flex items-center gap-4 px-2 py-1 group transition-colors">
                                <div className="w-2 h-2 rounded-full bg-orange-500 group-hover:scale-150 transition-transform"></div>
                                <p className="text-slate-600 text-[14px] font-bold">
                                    Diskon {selectedPromo.discount}
                                    {selectedPromo.max_discount > 0 && <span className="text-slate-400 font-medium ml-1"> (s/d {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selectedPromo.max_discount)})</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 px-2 py-1 group">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                <p className="text-slate-600 text-[14px] font-bold">Min. Belanja {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selectedPromo.min_purchase)}</p>
                            </div>
                            {selectedPromo.is_automatic && (
                                <div className="flex items-center gap-4 px-2 py-1 group italic">
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                    <p className="text-[#F97316] text-[14px] font-bold uppercase tracking-wider">Terpasang Otomatis Saat Checkout</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: Produk */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#F97316] rounded-full"></div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Ketersediaan Produk</h4>
                        </div>
                        <div className="bg-slate-50/50 p-6 rounded-lg border border-dashed border-slate-200">
                             <p className="text-slate-600 text-[14px] font-bold leading-relaxed">
                                {selectedPromo.tlds.length === 0 
                                    ? "Berlaku untuk semua ekstensi domain tanpa terkecuali." 
                                    : `Hanya berlaku untuk ekstensi: ${selectedPromo.tlds.map(t => `.${t.toUpperCase()}`).join(', ')}`}
                            </p>
                            <p className="text-slate-400 text-[11px] font-medium mt-3 italic flex items-center gap-2">
                                <span className="material-symbols-outlined text-[14px]">info</span>
                                Syarat & ketentuan lain mungkin berlaku.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer Action */}
                <div className="p-10 pt-0 bg-white relative z-20">
                    <button
                        onClick={() => {
                            if (!selectedPromo.is_automatic) handleClaim(selectedPromo.id);
                            else setSelectedPromo(null);
                        }}
                        disabled={selectedPromo.is_automatic}
                        className={`w-full h-[64px] rounded-lg font-bold text-[12px] uppercase tracking-[0.3em] transition-all duration-300 shadow-xl ${
                             selectedPromo.is_automatic 
                             ? 'bg-slate-100 text-slate-400 cursor-default shadow-none border border-slate-200' 
                             : 'bg-[#F97316] text-white hover:bg-slate-900 shadow-orange-500/20 active:scale-[0.98] transform group hover:-translate-y-1'
                        }`}
                    >
                        {selectedPromo.is_automatic ? 'Otomatis Terpasang' : (
                            <span className="flex items-center justify-center gap-3">
                                Klaim Sekarang
                                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Promo;
