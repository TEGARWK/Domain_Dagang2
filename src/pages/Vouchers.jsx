import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const Vouchers = () => {
    const [myVouchers, setMyVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('Semua');
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const { success, error, info } = useNotification();
    const navigate = useNavigate();

    const fetchMyVouchers = async () => {
        try {
            setLoading(true);
            const myRes = await api.get("/vouchers/my-vouchers");
            const myData = myRes.data;
            
            const now = new Date();
            const curMonth = now.getMonth();
            const curYear = now.getFullYear();

            const rawList = Array.isArray(myData) ? myData : [];
            const filtered = rawList.filter(v => {
                const status = v.status || v.claim_status;
                const expiryDate = new Date(v.expired_at);
                const isExpired = expiryDate < now;
                const isUsed = status === 'used';
                const isClaimed = status === 'claimed';

                if (isClaimed && !isExpired) return true;
                if (isUsed) {
                    const usedDate = new Date(v.used_at);
                    return usedDate.getMonth() === curMonth && usedDate.getFullYear() === curYear;
                }
                if (isClaimed && isExpired) {
                    return expiryDate.getMonth() === curMonth && expiryDate.getFullYear() === curYear;
                }
                return false;
            });

            setMyVouchers(filtered);
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
        let actions = [];
        try {
            actions = typeof v.eligible_actions === 'string' ? JSON.parse(v.eligible_actions || "[]") : (v.eligible_actions || []);
        } catch (e) { actions = []; }

        if (actions.includes('transfer')) return 'Transfer';
        if (actions.includes('renew')) return 'Renewal';
        if (actions.includes('register')) return 'Domain';
        return 'Umum';
    };

    const categories = ['Semua', 'Domain', 'Transfer', 'Renewal'];

    const filteredVouchers = myVouchers.filter(v => {
        if (activeCategory === 'Semua') return true;
        const cat = getVoucherCategory(v);
        return cat === activeCategory;
    });

    return (
        <div className="w-full animate-[fadeIn_0.5s_ease-out] pb-24 px-4 sm:px-6">
            {/* 1. PREMIUM HEADER BANNER */}
            <div className="relative mb-12 p-8 md:p-10 rounded-xl bg-slate-900 overflow-hidden shadow-xl shadow-slate-200">
                <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/20 rounded-full blur-[100px] -mr-40 -mt-40"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-xl flex items-center justify-center border border-white/10 shadow-xl group transition-transform duration-500 hover:rotate-12">
                            <span className="material-symbols-outlined text-4xl text-white">confirmation_number</span>
                        </div>
                        <div>
                            <span className="text-orange-500 font-bold uppercase tracking-[0.4em] text-[10px] mb-2 block">Member Privilege</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-none mb-3">
                                Koleksi <span className="text-orange-500 italic">Voucher.</span>
                            </h2>
                            <p className="text-slate-400 text-xs font-medium tracking-tight max-w-md leading-relaxed">
                                Gunakan keuntungan spesial kamu sebelum masa berlaku berakhir. Promo diperbarui setiap bulan!
                            </p>
                        </div>
                    </div>
                    
                    <div className="shrink-0">
                        <button 
                            onClick={() => navigate('/dashboard/promo')}
                            className="group bg-orange-500 text-white px-10 py-5 rounded-xl font-bold text-[11px] uppercase tracking-[0.25em] hover:bg-white hover:text-slate-900 transition-all duration-500 shadow-xl shadow-orange-500/20 active:scale-95 flex items-center gap-4"
                        >
                            Cari Promo Baru
                            <span className="material-symbols-outlined font-bold group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. NAVIGATION & STATS */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeCategory === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-4 text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] bg-white border border-slate-100 px-6 py-4 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                        <span>{myVouchers.length} Koleksi Aktif</span>
                    </div>
                </div>
            </div>

            {/* 3. VOUCHER GRID */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="w-16 h-16 border-4 border-slate-100 border-t-orange-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] animate-pulse">Menyelaraskan Promo...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {filteredVouchers.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-xl border-2 border-dashed border-slate-100 gap-8 animate-fade-in">
                            <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                                <span className="material-symbols-outlined text-slate-200 text-4xl">layers_clear</span>
                            </div>
                            <div className="text-center">
                                <p className="text-slate-900 font-bold uppercase text-lg tracking-tight mb-2">Koleksi Masih Kosong</p>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest opacity-60">Kamu belum mengklaim voucher apapun bulan ini.</p>
                            </div>
                            <button 
                                onClick={() => navigate('/dashboard/promo')}
                                className="bg-slate-900 text-white px-10 py-5 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-orange-500 transition-all duration-500 shadow-xl active:scale-95"
                            >
                                Ambil Voucher Sekarang
                            </button>
                        </div>
                    ) : (
                        filteredVouchers.map((v, idx) => {
                            const category = getVoucherCategory(v);
                            const status = v.status || v.claim_status;
                            const isUsed = status === 'used';
                            const expiryDate = new Date(v.expired_at);
                            const isExpired = expiryDate < new Date();
                            const isInactive = isUsed || isExpired;

                            const discount = v.discount_type === 'percentage' 
                                ? `${parseFloat(v.discount_value)}%` 
                                : formatRupiah(v.discount_value);

                            return (
                                <div key={v.id} className={`group relative transition-all duration-500 ${isInactive ? 'opacity-60 grayscale scale-[0.98]' : 'hover:-translate-y-1'}`}>
                                    <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden relative min-h-[140px] transition-all duration-300 group-hover:shadow-lg group-hover:border-orange-200">
                                        
                                        {/* Left Section: Branding */}
                                        <div className={`w-full md:w-[130px] bg-slate-50/80 flex flex-col items-center justify-center p-6 text-[#F97316] text-center relative shrink-0 border-r border-dashed border-slate-200`}>
                                            <div className={`w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-2 shadow-sm border border-slate-100 group-hover:scale-105 transition-transform ${isInactive ? 'text-slate-300' : ''}`}>
                                                <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase leading-tight tracking-widest text-slate-400">
                                                Voucher
                                            </span>
                                            {/* Ticket Cutout Effect */}
                                            <div className="absolute top-[-6px] right-[-6px] w-3 h-3 bg-white rounded-full border border-slate-100 md:block hidden"></div>
                                            <div className="absolute bottom-[-6px] right-[-6px] w-3 h-3 bg-white rounded-full border border-slate-100 md:block hidden"></div>
                                        </div>

                                        {/* Right Section: Details */}
                                        <div className="flex-1 p-6 flex flex-col justify-between">
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${isInactive ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-orange-50 text-orange-500 border-orange-100'}`}>
                                                            {category}
                                                        </span>
                                                        {v.is_new_user_only && (
                                                            <span className="bg-blue-50 text-blue-600 text-[8px] font-bold px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest">New User</span>
                                                        )}
                                                    </div>
                                                    <h3 className={`font-bold text-lg leading-tight tracking-tight mb-1 transition-colors ${isInactive ? 'text-slate-400' : 'text-slate-900 group-hover:text-orange-500'}`}>
                                                        {v.title}
                                                    </h3>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Potongan</span>
                                                    <span className={`text-xl font-bold leading-none ${isInactive ? 'text-slate-400' : 'text-orange-500'}`}>{discount}</span>
                                                </div>
                                            </div>

                                            <p className="text-slate-500 text-[12px] font-medium my-2 line-clamp-1 opacity-70">
                                                {v.description || "Potongan harga spesial untuk transaksi Anda."}
                                            </p>

                                            <div className="flex items-center justify-between gap-4 mt-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                        <span className="material-symbols-outlined text-[14px]">event</span>
                                                        {isUsed 
                                                            ? `Dipakai: ${new Date(v.used_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}` 
                                                            : `S/D ${expiryDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}`
                                                        }
                                                    </div>
                                                    <button 
                                                        onClick={() => setSelectedVoucher(v)}
                                                        className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-widest transition"
                                                    >
                                                        Detail
                                                    </button>
                                                </div>

                                                {!isInactive && (
                                                    <button
                                                        onClick={() => {
                                                            localStorage.setItem("pending_voucher", v.code);
                                                            success(`Voucher "${v.title}" dipilih!`);
                                                            navigate(category === 'Renewal' ? "/dashboard/billing" : "/dashboard/buy");
                                                        }}
                                                        className="px-6 h-[38px] rounded-lg text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-white hover:bg-orange-500 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                                                    >
                                                        Gunakan
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedVoucher && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in shadow-xl">
                    <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-xl animate-fade-in-up flex flex-col max-h-[90vh] border border-white/20">
                        {/* Header */}
                        <div className="p-10 pb-8 border-b border-slate-50 flex justify-between items-start relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 -mr-10 -mt-10 rounded-full blur-3xl opacity-50"></div>
                            <div className="flex gap-6 relative z-10">
                                <div className="w-16 h-16 rounded-lg bg-orange-50 flex items-center justify-center text-[#F97316] border border-orange-100 shadow-sm shrink-0">
                                    <span className="material-symbols-outlined text-[32px]">local_activity</span>
                                </div>
                                <div className="pt-1">
                                    <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2 tracking-tight uppercase italic">{selectedVoucher.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-[#F97316] uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-md">Voucher Saya</span>
                                        <p className="text-slate-400 text-[11px] font-bold leading-none">Min. Belanja {formatRupiah(selectedVoucher.min_transaction || 0)}</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedVoucher(null)} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 relative z-20">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar pb-14">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-5 bg-[#F97316] rounded-full"></div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Syarat & Ketentuan</h4>
                                </div>
                                <div className="bg-slate-50/50 p-6 rounded-lg border border-dashed border-slate-200 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></div>
                                        <p className="text-slate-600 text-[13px] font-bold leading-relaxed">
                                            Potongan harga sebesar <span className="text-orange-600">{selectedVoucher.discount_type === 'percentage' ? `${selectedVoucher.discount_value}%` : formatRupiah(selectedVoucher.discount_value)}</span>.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></div>
                                        <p className="text-slate-600 text-[13px] font-bold leading-relaxed">
                                            Berlaku untuk minimal transaksi <span className="text-orange-600">{formatRupiah(selectedVoucher.min_transaction || 0)}</span>.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></div>
                                        <p className="text-slate-600 text-[13px] font-bold leading-relaxed">
                                            {(() => {
                                                let tlds = [];
                                                try { tlds = typeof selectedVoucher.applicable_to === 'string' ? JSON.parse(selectedVoucher.applicable_to || "[]") : (selectedVoucher.applicable_to || []); } catch(e) {}
                                                return tlds.length === 0 
                                                    ? "Berlaku untuk semua ekstensi domain." 
                                                    : `Hanya berlaku untuk ekstensi: ${tlds.map(t => `.${t.toUpperCase()}`).join(', ')}`;
                                            })()}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2"></div>
                                        <p className="text-slate-600 text-[13px] font-bold leading-relaxed">
                                            Berlaku hingga {new Date(selectedVoucher.expired_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="p-10 pt-0 bg-white relative z-20">
                            <button
                                onClick={() => {
                                    localStorage.setItem("pending_voucher", selectedVoucher.code);
                                    success(`Voucher "${selectedVoucher.title}" dipilih!`);
                                    const cat = getVoucherCategory(selectedVoucher);
                                    navigate(cat === 'Renewal' ? "/dashboard/billing" : "/dashboard/buy");
                                }}
                                className="w-full h-14 rounded-lg bg-[#F97316] text-white font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-slate-900 transition-all duration-300 shadow-xl shadow-orange-500/10 active:scale-[0.98]"
                            >
                                Gunakan Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FOOTER INFO */}
            <div className="mt-16 p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.4em] leading-relaxed max-w-xl mx-auto opacity-70">
                    * Voucher yang sudah digunakan atau kedaluwarsa akan otomatis diarsipkan secara berkala untuk menjaga performa akun Anda.
                </p>
            </div>
        </div>
    );
};

export default Vouchers;
