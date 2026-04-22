import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const Vouchers = () => {
    const [myVouchers, setMyVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('Semua');
    const { success, error, info } = useNotification();
    const navigate = useNavigate();

    const fetchMyVouchers = async () => {
        try {
            setLoading(true);
            const myRes = await api.get("/vouchers/my-vouchers");
            const myData = myRes.data;
            setMyVouchers(Array.isArray(myData) ? myData : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyVouchers();
    }, []);

    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
    };

    const getVoucherCategory = (v) => {
        const code = (v.code || "").toUpperCase();
        let tlds = [];
        try {
            tlds = typeof v.eligible_tlds === 'string' ? JSON.parse(v.eligible_tlds || "[]") : (v.eligible_tlds || []);
        } catch (e) { tlds = []; }

        if (tlds.length > 0) return 'Domain';
        if (code.includes('PERPANJANG') || code.includes('RENEW')) return 'Renewal';
        return 'Lainnya';
    };

    const categories = ['Semua', 'Domain', 'Renewal'];

    const filteredVouchers = myVouchers.filter(v => {
        if (activeCategory === 'Semua') return true;
        const cat = getVoucherCategory(v);
        return cat === activeCategory;
    });

    return (
        <div className="w-full animate-[fadeIn_0.5s_ease-out] pb-20">
            {/* 1. DISCOVERY BANNER (NEW) */}
            <div className="mb-8 p-8 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#ea580c] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-orange-100">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-4xl">celebration</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold uppercase tracking-tight">Cari Voucher Lainnya?</h2>
                        <p className="text-sm opacity-90 font-medium tracking-tight">Temukan berbagai promo menarik di halaman Discovery Promo.</p>
                    </div>
                </div>
                <button 
                    onClick={() => navigate('/dashboard/promo')}
                    className="bg-white text-[#F97316] px-8 py-3.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-lg active:scale-95 shrink-0"
                >
                    Lihat Promo →
                </button>
            </div>

            {/* MAIN CONTENT CARD */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 md:p-10">
                
                {/* 2. NAVIGATION TABS (CATEGORIES) */}
                <div className="flex justify-between items-center mb-10 border-b border-slate-100 px-2">
                    <div className="flex gap-8 overflow-x-auto custom-scrollbar whitespace-nowrap">
                        {categories.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`pb-4 text-[10px] font-bold uppercase tracking-widest transition-all relative ${activeCategory === cat ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {cat}
                                {activeCategory === cat && (
                                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-900 rounded-t-full"></div>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-slate-400 font-bold uppercase text-[9px] tracking-widest pb-4">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        Total Koleksi: {myVouchers.length}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#F97316] rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat Koleksi...</span>
                    </div>
                ) : (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                             {filteredVouchers.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm gap-6">
                                     <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-slate-200 text-[48px]">confirmation_number</span>
                                     </div>
                                     <div className="text-center">
                                         <p className="text-slate-900 font-bold uppercase text-sm tracking-tight mb-1">Koleksi Masih Kosong</p>
                                         <p className="text-slate-400 font-medium text-xs">Belum ada voucher yang kamu klaim.</p>
                                     </div>
                                     <button 
                                        onClick={() => navigate('/dashboard/promo')}
                                        className="text-[#F97316] font-bold text-xs uppercase tracking-widest underline decoration-2 underline-offset-8 hover:text-slate-900 transition-colors"
                                     >
                                        Mulai Cari Promo Sekarang →
                                     </button>
                                </div>
                            ) : (
                                filteredVouchers.map(v => {
                                    const category = getVoucherCategory(v);
                                    const isUsed = v.claim_status === 'used';
                                    return (
                                        <div key={v.id} className={`flex h-40 rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-orange-200 transition-all duration-300 group relative bg-white ${isUsed ? 'opacity-60 grayscale' : ''}`}>
                                            {/* LEFT SECTION (BRANDING) */}
                                            <div className="w-[30%] bg-[#F97316] relative flex flex-col items-center justify-center overflow-hidden shrink-0">
                                                <div className="absolute top-0 right-0 h-full w-2 flex flex-col justify-around py-1">
                                                    {[...Array(8)].map((_, i) => (
                                                        <div key={i} className="w-4 h-4 bg-white rounded-full -mr-3"></div>
                                                    ))}
                                                </div>
                                                
                                                <div className="text-white text-center">
                                                    <div className="text-2xl font-bold leading-none mb-1">
                                                        {v.type === 'percentage' ? `${parseFloat(v.value)}%` : `${v.value / 1000}K`}
                                                    </div>
                                                    <div className="text-[8px] font-bold uppercase tracking-tighter opacity-80">DISKON</div>
                                                </div>
                                            </div>

                                            {/* RIGHT SECTION (DETAILS) */}
                                            <div className="flex-1 p-5 flex items-center justify-between relative min-w-0">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="bg-orange-50 text-orange-600 text-[8px] font-bold px-2 py-0.5 rounded-full border border-orange-100 uppercase tracking-widest">
                                                            {category}
                                                        </span>
                                                        {v.first_purchase_only && (
                                                            <span className="bg-blue-50 text-blue-600 text-[8px] font-bold px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-widest">
                                                                New User
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-sm font-bold text-slate-800 uppercase leading-snug truncate mb-1">
                                                        {v.title || "Voucher Promo"}
                                                    </h3>
                                                    <p className="text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                                                        Min. {formatRupiah(v.min_purchase)}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                        {isUsed ? 'TELAH DIGUNAKAN' : `S/D: ${new Date(v.valid_until).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}`}
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                <div className="shrink-0">
                                                    {isUsed ? (
                                                        <span className="text-[10px] font-bold text-slate-300 uppercase rotate-[-12deg] border-2 border-slate-200 px-3 py-1 rounded-lg">USED</span>
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <button 
                                                                onClick={() => {
                                                                    localStorage.setItem("pending_voucher", v.code);
                                                                    success(`Voucher siap dipakai! Silakan pilih layanan.`);
                                                                    navigate("/dashboard/buy");
                                                                }}
                                                                className="px-6 py-2.5 border-2 border-slate-900 text-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all active:scale-95"
                                                            >
                                                                Pakai
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="text-center pt-10 border-t border-slate-50">
                            <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">
                                Voucher yang diklaim akan muncul otomatis di halaman checkout
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Vouchers;
