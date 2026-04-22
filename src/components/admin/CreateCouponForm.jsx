import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CreateCouponForm = ({ voucherId, onSuccess, onCancel }) => {
    // FORM STATE
    const [coupon, setCoupon] = useState({
        title: '',
        code: '', 
        description: '',
        discount_type: 'nominal', 
        discount_value: '',
        max_discount: '0',
        min_purchase: '0',
        quota: '0', 
        max_use_per_user: '1', 
        started_at: '', 
        expired_at: '', 
        selectedTlds: [],
        eligible_actions: ['register'],
        is_automatic: false,
        priority: '0',
        segment: 'all',
        is_new_user_only: false,
        is_stackable: false
    });

    const isEdit = !!voucherId;

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

        const fetchVoucher = async () => {
            if (!voucherId) return;
            try {
                const res = await api.get(`/admin/vouchers/list`);
                const list = res.data.data || res.data;
                const v = Array.isArray(list) ? list.find(item => item.id === parseInt(voucherId)) : null;
                if (v) {
                    setCoupon({
                        title: v.title || '',
                        code: v.code || '',
                        description: v.description || '',
                        discount_type: v.discount_type || 'nominal',
                        discount_value: v.discount_value?.toString() || '',
                        max_discount: v.max_discount?.toString() || '0',
                        min_purchase: v.min_transaction?.toString() || '0',
                        quota: v.quota?.toString() || '0',
                        max_use_per_user: v.max_use_per_user?.toString() || '1',
                        started_at: v.started_at ? new Date(v.started_at).toISOString().slice(0, 16) : '',
                        expired_at: v.expired_at ? new Date(v.expired_at).toISOString().slice(0, 16) : '',
                        selectedTlds: v.applicable_to ? (typeof v.applicable_to === 'string' ? JSON.parse(v.applicable_to) : v.applicable_to) : [],
                        eligible_actions: v.eligible_actions ? (typeof v.eligible_actions === 'string' ? JSON.parse(v.eligible_actions) : v.eligible_actions) : ['register'],
                        is_automatic: v.is_automatic || false,
                        priority: v.priority?.toString() || '0',
                        segment: v.segment || 'all',
                        is_new_user_only: v.is_new_user_only || false,
                        is_stackable: v.is_stackable || false
                    });
                }
            } catch (err) {
                console.error("Fetch Voucher Error:", err);
            }
        };

        fetchPricing();
        fetchVoucher();
    }, [voucherId]);

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

    const formatRupiah = (value) => {
        if (!value) return '';
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const parseNumber = (value) => {
        return value.replace(/\./g, '');
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        const cleanValue = parseNumber(value);
        if (/^\d*$/.test(cleanValue)) {
            setCoupon(prev => ({ ...prev, [name]: cleanValue }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ type: '', msg: '' });

        try {
            // FORMAT PAYLOAD - SINKRON DENGAN BACKEND CONTROLLER
            const payload = {
                title: coupon.title,
                code: coupon.code.toUpperCase().replace(/\s+/g, ''),
                discount_type: coupon.discount_type,
                discount_value: parseFloat(coupon.discount_value),
                max_discount: coupon.discount_type === 'percentage' ? parseFloat(coupon.max_discount) : 0,
                quota: parseInt(coupon.quota) || 0,
                max_use_per_user: parseInt(coupon.max_use_per_user) || 1,
                min_transaction: parseFloat(coupon.min_purchase) || 0,
                applicable_to: JSON.stringify(coupon.selectedTlds),
                started_at: new Date(coupon.started_at).toISOString(),
                expired_at: new Date(coupon.expired_at).toISOString(),
                is_new_user_only: coupon.is_new_user_only,
                is_stackable: coupon.is_stackable,
                description: coupon.description,
                is_automatic: coupon.is_automatic,
                priority: parseInt(coupon.priority) || 0,
                segment: coupon.segment,
                eligible_actions: coupon.eligible_actions
            };

            let response;
            if (isEdit) {
                response = await api.put(`/admin/vouchers/${voucherId}`, payload);
                setStatus({ type: 'success', msg: `Voucher "${coupon.code}" berhasil diperbarui!` });
            } else {
                response = await api.post("/admin/vouchers/create", payload);
                setStatus({ type: 'success', msg: `Vocer "${coupon.code}" berhasil dibuat!` });
                // Reset form only on create
                setCoupon({
                    title: '', code: '', description: '', discount_type: 'nominal', discount_value: '',
                    max_discount: '0', min_purchase: '0', quota: '0', max_use_per_user: '1',
                    started_at: '', expired_at: '',
                    selectedTlds: [],
                    eligible_actions: ['register'],
                    is_automatic: false,
                    priority: '0',
                    segment: 'all',
                    is_new_user_only: false,
                    is_stackable: false
                });
            }
            
            if (onSuccess) onSuccess(response.data);
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
            <div className="mb-8 overflow-hidden flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">{isEdit ? 'Edit Voucher' : 'Buat Vocer Baru'}</h2>
                    <p className="text-sm text-slate-500 mt-1">{isEdit ? 'Perbarui detail dan aturan promo ini.' : 'Gunakan form ini untuk membuat kupon belanja manual.'}</p>
                </div>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                )}
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
                    <div className="md:col-span-1">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Judul Promo</label>
                        <input
                            type="text"
                            name="title"
                            value={coupon.title}
                            onChange={handleChange}
                            required
                            placeholder="Contoh: Promo Ramadhan"
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all font-bold"
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Kode Voucher</label>
                        <input
                            type="text"
                            name="code"
                            value={coupon.code}
                            onChange={handleChange}
                            required
                            placeholder="Contoh: RAMADHAN2026"
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all font-black text-[#f97316] uppercase"
                        />
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
                                type="text"
                                name="discount_value"
                                value={formatRupiah(coupon.discount_value)}
                                onChange={handleNumberChange}
                                required
                                placeholder="0"
                                className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all font-bold"
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
                                    type="text"
                                    name="max_discount"
                                    value={formatRupiah(coupon.max_discount)}
                                    onChange={handleNumberChange}
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
                            type="text"
                            name="min_purchase"
                            value={formatRupiah(coupon.min_purchase)}
                            onChange={handleNumberChange}
                            placeholder="0"
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all font-bold"
                        />
                    </div>

                    {/* Usage Limit */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Limit Total (Kuota)</label>
                        <input
                            type="number"
                            name="quota"
                            value={coupon.quota}
                            onChange={handleChange}
                            placeholder="0 (Unlimited)"
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all font-bold"
                        />
                    </div>

                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Limit Per User</label>
                        <input
                            type="number"
                            name="max_use_per_user"
                            value={coupon.max_use_per_user}
                            onChange={handleChange}
                            placeholder="1"
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all font-bold"
                        />
                    </div>

                    {/* NEW: Priority & Segment */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Prioritas Tampil</label>
                        <input
                            type="number"
                            name="priority"
                            value={coupon.priority}
                            onChange={handleChange}
                            placeholder="0"
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all font-bold"
                        />
                    </div>

                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Segment User</label>
                        <select
                            name="segment"
                            value={coupon.segment}
                            onChange={handleChange}
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all cursor-pointer"
                        >
                            <option value="all">Semua User</option>
                            <option value="regular">Regular</option>
                            <option value="premium">Premium / Reseller</option>
                            <option value="new">Hanya User Baru</option>
                        </select>
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

                    <div className="md:col-span-1">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Waktu Mulai</label>
                        <input
                            type="datetime-local"
                            name="started_at"
                            value={coupon.started_at}
                            onChange={handleChange}
                            required
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Waktu Selesai</label>
                        <input
                            type="datetime-local"
                            name="expired_at"
                            value={coupon.expired_at}
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

                        {/* FITUR DI-HIDE SEMENTARA SESUAI REQUEST
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="is_automatic"
                                    checked={coupon.is_automatic}
                                    onChange={handleChange}
                                    className="w-6 h-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                />
                                <div>
                                    <span className="text-base font-bold text-blue-800 block">Pasang Otomatis (Event Promo)</span>
                                    <span className="text-xs text-blue-600">Promo akan langsung terpasang di keranjang tanpa perlu klaim kode voucher.</span>
                                </div>
                            </label>
                        </div>
                        */}
                    </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 flex gap-4">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 h-12 px-6 bg-slate-100 text-slate-600 rounded-lg text-base font-bold hover:bg-slate-200 transition-all uppercase tracking-widest"
                        >
                            Batal
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`${onCancel ? 'flex-[2]' : 'w-full'} h-12 px-6 bg-[#f97316] text-white rounded-lg text-base font-bold shadow-sm shadow-orange-200 hover:bg-[#ea580c] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait uppercase tracking-widest`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            isEdit ? 'Simpan Perubahan' : 'Simpan & Aktifkan Vocer'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateCouponForm;
