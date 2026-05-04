import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CreateCouponForm = ({ voucherId, onSuccess, onCancel }) => {
    // FORM STATE
    const [coupon, setCoupon] = useState({
        title: '',
        code: '', 
        description: '',
        discount_type: 'flat', 
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
                        discount_type: v.discount_type || 'flat',
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

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'PRM-';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ type: '', msg: '' });

        try {
            // Auto-generate code if empty (hidden from admin)
            const finalCode = coupon.code || generateRandomCode();

            const payload = {
                title: coupon.title,
                code: finalCode.toUpperCase(),
                discount_type: coupon.discount_type,
                discount_value: parseFloat(coupon.discount_value),
                max_discount: coupon.discount_type === 'percentage' ? parseFloat(coupon.max_discount) : 0,
                quota: parseInt(coupon.quota) || 0,
                max_use_per_user: parseInt(coupon.max_use_per_user) || 1,
                min_transaction: parseFloat(coupon.min_purchase) || 0,
                applicable_to: JSON.stringify(coupon.selectedTlds),
                started_at: coupon.started_at ? new Date(coupon.started_at).toISOString() : null,
                expired_at: coupon.expired_at ? new Date(coupon.expired_at).toISOString() : null,
                is_new_user_only: coupon.is_new_user_only,
                is_stackable: coupon.is_stackable,
                description: coupon.description,
                is_automatic: false, // Everything is claimable now
                priority: parseInt(coupon.priority) || 0,
                segment: coupon.segment,
                eligible_actions: coupon.eligible_actions
            };

            let response;
            if (isEdit) {
                response = await api.put(`/admin/vouchers/${voucherId}`, payload);
                setStatus({ type: 'success', msg: `Promo berhasil diperbarui!` });
            } else {
                response = await api.post("/admin/vouchers/create", payload);
                setStatus({ type: 'success', msg: `Promo berhasil dibuat!` });
                // Reset form
                setCoupon({
                    title: '', code: '', description: '', discount_type: 'flat', discount_value: '',
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
            console.error("Promo Create Error:", err);
            setStatus({ 
                type: 'error', 
                msg: err.response?.data?.message || err.message || 'Gagal menyimpan promo.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-2xl animate-fade-in-up">
            {/* Header */}
            <div className="bg-slate-900 p-8 text-white relative">
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold uppercase tracking-tight">{isEdit ? 'Edit Promo' : 'Buat Promo Baru'}</h2>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-1">Sistem Klaim & Koleksi - Tanpa Kode Manual</p>
                </div>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <span className="material-symbols-outlined text-7xl">confirmation_number</span>
                </div>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-50">
                        <span className="material-symbols-outlined text-white">close</span>
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {status.msg && (
                    <div className={`p-4 rounded-2xl text-sm font-bold border animate-bounce-subtle ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {status.msg}
                    </div>
                )}

                {/* SECTION 1: PROFIL PROMO */}
                <div className="space-y-5">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <span className="w-8 h-8 rounded-lg bg-orange-50 text-[#f97316] flex items-center justify-center font-bold text-sm">01</span>
                        <h3 className="font-bold text-slate-900 uppercase tracking-tight">Profil Promo</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nama Promo (Judul)</label>
                            <input
                                type="text"
                                name="title"
                                value={coupon.title}
                                onChange={handleChange}
                                required
                                placeholder="Contoh: Diskon Merdeka .ID"
                                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Syarat & Ketentuan (Singkat)</label>
                            <textarea
                                name="description"
                                value={coupon.description}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Jelaskan aturan mainnya..."
                                className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all resize-none font-medium text-slate-600"
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: KEUNTUNGAN */}
                <div className="space-y-5">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">02</span>
                        <h3 className="font-bold text-slate-900 uppercase tracking-tight">Besar Diskon</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Tipe Potongan</label>
                            <select
                                name="discount_type"
                                value={coupon.discount_type}
                                onChange={handleChange}
                                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all cursor-pointer font-bold text-slate-700"
                            >
                                <option value="flat">Nominal (Rp)</option>
                                <option value="percentage">Persentase (%)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Nilai Potongan</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="discount_value"
                                    value={formatRupiah(coupon.discount_value)}
                                    onChange={handleNumberChange}
                                    required
                                    placeholder="0"
                                    className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-emerald-600"
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                    {coupon.discount_type === 'percentage' ? '%' : 'Rp'}
                                </div>
                            </div>
                        </div>

                        {coupon.discount_type === 'percentage' && (
                            <div className="md:col-span-2 p-5 bg-orange-50/50 border border-orange-100 rounded-2xl">
                                <label className="block text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">Maksimal Diskon (Rupiah)</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-400 font-bold">Rp</span>
                                    <input
                                        type="text"
                                        name="max_discount"
                                        value={formatRupiah(coupon.max_discount)}
                                        onChange={handleNumberChange}
                                        required
                                        placeholder="0"
                                        className="w-full h-14 pl-14 pr-5 bg-white border border-orange-200 rounded-xl text-base focus:border-orange-500 outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                                <p className="text-[10px] text-orange-500 mt-2 font-semibold uppercase italic tracking-tighter">Batas maksimal nominal diskon jika menggunakan persentase.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* SECTION 3: KRITERIA & TARGET */}
                <div className="space-y-5">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">03</span>
                        <h3 className="font-bold text-slate-900 uppercase tracking-tight">Kriteria & Target</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Berlaku Untuk Aksi:</label>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { id: 'register', label: 'Daftar', icon: 'app_registration' },
                                    { id: 'transfer', label: 'Transfer', icon: 'move_up' },
                                    { id: 'renew', label: 'Perpanjang', icon: 'autorenew' }
                                ].map(act => (
                                    <button
                                        key={act.id}
                                        type="button"
                                        onClick={() => handleActionToggle(act.id)}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 text-xs font-bold uppercase tracking-widest transition-all ${coupon.eligible_actions.includes(act.id) ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{act.icon}</span>
                                        {act.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Min. Belanja (Subtotal)</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                                    <input
                                        type="text"
                                        name="min_purchase"
                                        value={formatRupiah(coupon.min_purchase)}
                                        onChange={handleNumberChange}
                                        placeholder="0"
                                        className="w-full h-14 pl-12 pr-5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Target Segment Member</label>
                                <select
                                    name="segment"
                                    value={coupon.segment}
                                    onChange={handleChange}
                                    className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all cursor-pointer font-bold text-slate-700"
                                >
                                    <option value="all">Semua Member</option>
                                    <option value="regular">Member Biasa</option>
                                    <option value="premium">Premium / Reseller</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Ekstensi Domain</label>
                                <div className="flex gap-4">
                                    <button type="button" onClick={handleSelectAllTlds} className="text-[9px] font-bold uppercase text-blue-600 hover:underline tracking-widest">Semua</button>
                                    <button type="button" onClick={handleClearAllTlds} className="text-[9px] font-bold uppercase text-slate-400 hover:underline tracking-widest">Bersihkan</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl h-44 overflow-y-auto custom-scrollbar">
                                {availableTlds.map(tld => (
                                    <button
                                        key={tld}
                                        type="button"
                                        onClick={() => handleTldToggle(tld)}
                                        className={`h-10 px-2 rounded-xl border-2 text-[11px] font-bold uppercase tracking-tight transition-all duration-200 ${coupon.selectedTlds.includes(tld) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                    >
                                        {tld}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase px-1 italic">Kosongkan jika berlaku untuk SEMUA domain.</p>
                        </div>
                    </div>
                </div>

                {/* SECTION 4: KETERSEDIAAN */}
                <div className="space-y-5">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">04</span>
                        <h3 className="font-bold text-slate-900 uppercase tracking-tight">Waktu & Kuota</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Tgl Mulai</label>
                            <input
                                type="datetime-local"
                                name="started_at"
                                value={coupon.started_at}
                                onChange={handleChange}
                                required
                                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Tgl Berakhir</label>
                            <input
                                type="datetime-local"
                                name="expired_at"
                                value={coupon.expired_at}
                                onChange={handleChange}
                                required
                                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Total Kuota Stok</label>
                            <input
                                type="number"
                                name="quota"
                                value={coupon.quota}
                                onChange={handleChange}
                                placeholder="0 (Unlimited)"
                                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Maks. Pakai / User</label>
                            <input
                                type="number"
                                name="max_use_per_user"
                                value={coupon.max_use_per_user}
                                onChange={handleChange}
                                placeholder="1"
                                className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all font-bold text-slate-700"
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 5: PENGATURAN & PRIORITAS */}
                <div className="space-y-5 bg-slate-900 p-8 rounded-3xl text-white">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                        <span className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center font-bold text-sm">05</span>
                        <h3 className="font-bold text-white uppercase tracking-tight">Aturan & Prioritas</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="is_new_user_only"
                                    checked={coupon.is_new_user_only}
                                    onChange={handleChange}
                                    className="w-6 h-6 rounded-lg bg-white/10 border-white/20 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900 transition-all cursor-pointer"
                                />
                                <div>
                                    <span className="text-sm font-bold uppercase tracking-widest block">Khusus User Baru</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">Hanya untuk member yang belum pernah transaksi.</span>
                                </div>
                            </label>

                            <label className="flex items-center gap-4 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="is_stackable"
                                    checked={coupon.is_stackable}
                                    onChange={handleChange}
                                    className="w-6 h-6 rounded-lg bg-white/10 border-white/20 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900 transition-all cursor-pointer"
                                />
                                <div>
                                    <span className="text-sm font-bold uppercase tracking-widest block">Bisa Ditumpuk (Stackable)</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">Bisa digabung dengan diskon referral/promo lain.</span>
                                </div>
                            </label>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Prioritas Tampil (0-999)</label>
                            <input
                                type="number"
                                name="priority"
                                value={coupon.priority}
                                onChange={handleChange}
                                placeholder="0"
                                className="w-full h-14 px-5 bg-white/5 border border-white/10 rounded-2xl text-base focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-bold text-white"
                            />
                            <p className="text-[9px] text-slate-400 mt-2 font-semibold uppercase">Makin tinggi angka, makin atas munculnya di halaman promo.</p>
                        </div>
                    </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 flex gap-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-16 bg-[#f97316] text-white rounded-2xl text-base font-bold shadow-2xl shadow-orange-600/30 hover:bg-[#ea580c] hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-wait uppercase tracking-[0.2em]"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined font-bold">rocket_launch</span>
                                {isEdit ? 'Simpan Perubahan' : 'Terbitkan Promo'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateCouponForm;
