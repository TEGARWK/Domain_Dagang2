import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CreateCouponForm = () => {
    // FORM STATE
    const [coupon, setCoupon] = useState({
        title: '',
        description: '',
        discount_type: 'nominal', // 'nominal' or 'percentage'
        discount_value: '',
        max_discount: '0', // Anti-Boncos
        min_purchase: '0',
        usage_limit: '0',
        usage_limit_per_user: '1',
        valid_until: '',
        is_stackable: false,
        is_new_user_only: false,
        selectedTlds: [],
        eligible_actions: ['register'] // register, transfer, renew
    });

    // TLD DATA
    const [availableTlds, setAvailableTlds] = useState([]);

    // UX STATE
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [pricing, setPricing] = useState([]);

    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const res = await api.get('/pricing/all');
                setPricing(res.data);
                
                // Extract unique TLDs from pricing data
                if (Array.isArray(res.data)) {
                    const tlds = res.data.map(item => item.tld).sort();
                    setAvailableTlds(tlds);
                }
            } catch (err) {}
        };
        fetchPricing();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCoupon(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleActionToggle = (action) => {
        setCoupon(prev => {
            const current = [...prev.eligible_actions];
            if (current.includes(action)) {
                return { ...prev, eligible_actions: current.filter(a => a !== action) };
            } else {
                return { ...prev, eligible_actions: [...current, action] };
            }
        });
    };

    const handleTldToggle = (tld) => {
        setCoupon(prev => {
            const isSelected = prev.selectedTlds.includes(tld);
            return {
                ...prev,
                selectedTlds: isSelected 
                    ? prev.selectedTlds.filter(t => t !== tld)
                    : [...prev.selectedTlds, tld]
            };
        });
    };

    const handleSelectAllTlds = () => {
        setCoupon(prev => ({ ...prev, selectedTlds: [...availableTlds] }));
    };

    const handleClearAllTlds = () => {
        setCoupon(prev => ({ ...prev, selectedTlds: [] }));
    };

    const getMarginWarning = () => {
        if (!coupon.discount_value || coupon.discount_value === '0') return null;
        if (pricing.length === 0) return null;

        // Check against typical margins (Simplified check for UI warning)
        const val = parseFloat(coupon.discount_value);
        if (coupon.discount_type === 'nominal') {
            if (val > 10000) return "Diskon nominal cukup besar (>10rb). Cek kembali margin TLD.";
        } else {
            if (val > 10) return "Diskon persentase tinggi (>10%). Potensi rugi pada TLD profit rendah.";
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ type: '', msg: '' });

        try {
            // FORMAT PAYLOAD
            const payload = {
                ...coupon,
                code: coupon.title.replace(/\s+/g, '-').toUpperCase(), // Generate safe code from title if needed by backend
                eligible_tlds: coupon.selectedTlds,
                discount_value: parseFloat(coupon.discount_value),
                max_discount: coupon.discount_type === 'percentage' ? parseFloat(coupon.max_discount) : 0,
                min_purchase: parseFloat(coupon.min_purchase),
                usage_limit_total: parseInt(coupon.usage_limit), // Map to backend field
                valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString() : null,
                is_automatic: false, // Manual coupon
                type: coupon.discount_type, // 'nominal' or 'percentage'
                value: parseFloat(coupon.discount_value)
            };

            const response = await api.post("/vouchers", payload);
            
            setStatus({ type: 'success', msg: `Vocer "${coupon.title}" berhasil dibuat!` });
            setCoupon({
                title: '', description: '', discount_type: 'nominal', discount_value: '',
                max_discount: '0', min_purchase: '0', usage_limit: '0', usage_limit_per_user: '1',
                valid_until: '', is_stackable: false, is_new_user_only: false,
                selectedTlds: [],
                eligible_actions: ['register']
            });
        } catch (err) {
            console.error("Coupon Create Error:", err);
            setStatus({ 
                type: 'error', 
                msg: err.response?.data?.message || err.message || 'Gagal membuat vocer. Silakan coba lagi.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8 overflow-hidden">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Buat Vocer Baru</h2>
                <p className="text-sm text-slate-500 mt-1">Gunakan form ini untuk membuat kupon belanja manual.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Status Message */}
                {status.msg && (
                    <div className={`p-4 rounded-lg text-sm font-semibold border ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {status.msg}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Voucher Title */}
                    <div className="md:col-span-2">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Judul Vocer</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                name="title"
                                value={coupon.title}
                                onChange={handleChange}
                                required
                                placeholder="Masukan udul Vocer"
                                className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all font-bold"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Deskripsi Vocer</label>
                        <textarea
                            name="description"
                            value={coupon.description}
                            onChange={handleChange}
                            rows="2"
                            placeholder="Berikan deskripsi singkat untuk admin..."
                            className="w-full p-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all resize-none"
                        ></textarea>
                    </div>

                    {/* Discount Type */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Tipe Diskon</label>
                        <select
                            name="discount_type"
                            value={coupon.discount_type}
                            onChange={handleChange}
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all cursor-pointer"
                        >
                            <option value="nominal">Nominal (Rupiah)</option>
                            <option value="percentage">Persentase (%)</option>
                        </select>
                    </div>

                    {/* Discount Value */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Nilai Diskon</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="discount_value"
                                value={coupon.discount_value}
                                onChange={handleChange}
                                required
                                placeholder="0"
                                className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                {coupon.discount_type === 'percentage' ? '%' : 'Rp'}
                            </div>
                        </div>
                        {getMarginWarning() && (
                            <p className="text-[10px] text-red-500 mt-1 font-bold animate-pulse">
                                ⚠️ {getMarginWarning()}
                            </p>
                        )}
                    </div>

                    {/* Conditional: Max Discount (Anti-Boncos) */}
                    {coupon.discount_type === 'percentage' && (
                        <div className="md:col-span-2 p-5 bg-orange-50 border border-orange-100 rounded-lg animate-fade-in">
                            <label className="block text-base font-bold text-orange-700 mb-2">Maksimal Potongan (Cap)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 font-bold">Rp</span>
                                <input
                                    type="number"
                                    name="max_discount"
                                    value={coupon.max_discount}
                                    onChange={handleChange}
                                    required
                                    placeholder="0"
                                    className="w-full h-12 pl-12 pr-4 bg-white border border-orange-200 rounded-lg text-base focus:border-[#f97316] outline-none transition-all font-bold"
                                />
                            </div>
                            <p className="text-xs text-orange-600 mt-2 font-medium">Batas maksimal potongan untuk mencegah kerugian jika diskon persentase terlalu tinggi.</p>
                        </div>
                    )}

                    {/* Min Purchase */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Minimal Transaksi (Rp)</label>
                        <input
                            type="number"
                            name="min_purchase"
                            value={coupon.min_purchase}
                            onChange={handleChange}
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                        />
                    </div>

                    {/* Usage Limit */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Limit Total (Kuota)</label>
                        <input
                            type="number"
                            name="usage_limit"
                            value={coupon.usage_limit}
                            onChange={handleChange}
                            placeholder="0 (Unlimited)"
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                        />
                    </div>

                    {/* Limit Per User */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Limit Per User</label>
                        <input
                            type="number"
                            name="usage_limit_per_user"
                            value={coupon.usage_limit_per_user}
                            onChange={handleChange}
                            placeholder="1"
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                        />
                    </div>

                    {/* Transaction Targeting */}
                    <div className="md:col-span-2">
                        <label className="block text-base font-semibold text-slate-700 mb-3">Target Transaksi</label>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { id: 'register', label: 'Pendaftaran Baru' },
                                { id: 'transfer', label: 'Transfer Domain' },
                                { id: 'renew', label: 'Perpanjangan' }
                            ].map(act => (
                                <button
                                    key={act.id}
                                    type="button"
                                    onClick={() => handleActionToggle(act.id)}
                                    className={`px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all ${coupon.eligible_actions.includes(act.id) ? 'bg-[#f97316] border-[#f97316] text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                                >
                                    {act.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* TLD SELECTOR */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className="block text-base font-semibold text-slate-700">Target TLD (Ekstensi Domain)</label>
                            <div className="flex gap-4">
                                <button type="button" onClick={handleSelectAllTlds} className="text-[11px] font-bold uppercase text-[#f97316] hover:underline tracking-wider">Pilih Semua</button>
                                <button type="button" onClick={handleClearAllTlds} className="text-[11px] font-bold uppercase text-slate-400 hover:underline tracking-wider">Hapus Semua</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-lg h-48 overflow-y-auto custom-scrollbar">
                            {availableTlds.map(tld => (
                                <button
                                    key={tld}
                                    type="button"
                                    onClick={() => handleTldToggle(tld)}
                                    className={`h-11 px-3 rounded-lg border-2 text-sm font-bold transition-all duration-200 ${coupon.selectedTlds.includes(tld) ? 'bg-[#f97316] border-[#f97316] text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                >
                                    {tld}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase px-1">Pilih domain mana saja yang boleh pakai vocer ini. Kosongkan jika ingin berlaku untuk semua domain.</p>
                    </div>

                    {/* Valid Until */}
                    <div className="md:col-span-2">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Berlaku Hingga</label>
                        <input
                            type="datetime-local"
                            name="valid_until"
                            value={coupon.valid_until}
                            onChange={handleChange}
                            required
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                        />
                    </div>

                    {/* Toggles */}
                    <div className="md:col-span-2 space-y-4 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                             <div className="relative">
                                <input
                                    type="checkbox"
                                    name="is_new_user_only"
                                    checked={coupon.is_new_user_only}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded border-slate-300 text-[#f97316] focus:ring-[#f97316] transition-all cursor-pointer"
                                />
                             </div>
                             <span className="text-base font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Hanya untuk Pengguna Baru</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="is_stackable"
                                checked={coupon.is_stackable}
                                onChange={handleChange}
                                className="w-5 h-5 rounded border-slate-300 text-[#f97316] focus:ring-[#f97316] transition-all cursor-pointer"
                            />
                            <span className="text-base font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Bisa digabung dengan promo lain (Stackable)</span>
                        </label>
                    </div>
                </div>

                {/* Submit button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full h-12 px-6 bg-[#f97316] text-white rounded-lg text-base font-bold shadow-sm shadow-orange-200 hover:bg-[#ea580c] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            'Simpan & Aktifkan Vocer'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateCouponForm;
