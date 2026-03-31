import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CreatePromoEventForm = () => {
    // FORM STATE
    const [promo, setPromo] = useState({
        title: '',
        subtitle: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        max_discount: '0',
        start_date: '',
        end_date: '',
        priority: '0',
        banner_image: '',
        selectedTlds: [],
        eligible_actions: ['register']
    });

    // TLD DATA
    const [availableTlds, setAvailableTlds] = useState([]);
    
    // UX STATE
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
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
        const { name, value } = e.target;
        setPromo(prev => ({ ...prev, [name]: value }));
    };

    const handleActionToggle = (action) => {
        setPromo(prev => {
            const current = [...prev.eligible_actions];
            if (current.includes(action)) {
                return { ...prev, eligible_actions: current.filter(a => a !== action) };
            } else {
                return { ...prev, eligible_actions: [...current, action] };
            }
        });
    };

    const handleTldToggle = (tld) => {
        setPromo(prev => {
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
        setPromo(prev => ({ ...prev, selectedTlds: [...availableTlds] }));
    };

    const handleClearAllTlds = () => {
        setPromo(prev => ({ ...prev, selectedTlds: [] }));
    };

    const getStatusLabel = () => {
        if (!promo.start_date || !promo.end_date) return null;
        const now = new Date();
        const start = new Date(promo.start_date);
        const end = new Date(promo.end_date);

        if (now < start) return { label: 'AKAN DATANG', color: 'bg-blue-50 text-blue-600 border-blue-100' };
        if (now > end) return { label: 'BERAKHIR', color: 'bg-slate-50 text-slate-400 border-slate-100' };
        return { label: 'LIVE / JALAN', color: 'bg-green-50 text-green-600 border-green-100' };
    };

    const getMarginWarning = () => {
        if (!promo.discount_value || promo.discount_value === '0') return null;
        const val = parseFloat(promo.discount_value);
        if (promo.discount_type === 'percentage') {
            if (val > 15) return "Diskon >15% berisiko rugi pada TLD profit rendah (misal: .id).";
        } else {
            if (val > 20000) return "Diskon nominal besar. Pastikan sudah cek harga modal TLD terkait.";
        }
        return null;
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        
        setIsUploading(true);
        setStatus({ type: '', msg: '' });

        try {
            const res = await api.post("/upload/banner", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data && res.data.success) {
                setPromo(prev => ({ ...prev, banner_image: res.data.imageUrl }));
                setStatus({ type: 'success', msg: 'Gambar banner berhasil diunggah!' });
            } else {
                setStatus({ type: 'error', msg: res.data.message || 'Gagal mengunggah gambar' });
            }
        } catch (err) {
            console.error("Upload error:", err);
            setStatus({ type: 'error', msg: err?.response?.data?.message || err.message || 'Gagal mengunggah gambar. Pastikan ukuran file < 5MB dan format sesuai.' });
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (promo.selectedTlds.length === 0) {
            return setStatus({ type: 'error', msg: 'Harap pilih minimal satu TLD!' });
        }

        setIsLoading(true);
        setStatus({ type: '', msg: '' });

        try {
            // FORMAT PAYLOAD
            const payload = {
                ...promo,
                discount_value: parseFloat(promo.discount_value),
                max_discount: promo.discount_type === 'percentage' ? parseFloat(promo.max_discount) : 0,
                priority: parseInt(promo.priority),
                start_date: promo.start_date ? new Date(promo.start_date).toISOString() : null,
                end_date: promo.end_date ? new Date(promo.end_date).toISOString() : null,
                valid_until: promo.end_date ? new Date(promo.end_date).toISOString() : null, // Mencegah 1 Jan 70 di UI Admin
                is_automatic: true, // Automatic event
                eligible_tlds: promo.selectedTlds,
                type: promo.discount_type,
                value: parseFloat(promo.discount_value)
            };

            const response = await api.post("/vouchers", payload);
            
            setStatus({ type: 'success', msg: `Event "${promo.title}" berhasil diaktifkan secara live!` });
            setPromo({
                title: '', subtitle: '', description: '', discount_type: 'percentage', discount_value: '',
                max_discount: '0', start_date: '', end_date: '',
                priority: '0', banner_image: '', selectedTlds: [],
                eligible_actions: ['register']
            });
        } catch (err) {
            console.error("Promo Create Error:", err);
            setStatus({ 
                type: 'error', 
                msg: err.response?.data?.message || err.message || 'Gagal memproses promo event.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg p-8 border border-slate-200 shadow-sm max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Buat Promo Event</h2>
                    <p className="text-sm text-slate-500 mt-1">Atur diskon otomatis (harga coret) untuk TLD tertentu.</p>
                </div>
                {getStatusLabel() && (
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold border tracking-wider ${getStatusLabel().color}`}>
                        {getStatusLabel().label}
                    </div>
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
                    {/* Title */}
                    <div className="md:col-span-2">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Nama Event Promo</label>
                        <input
                            type="text"
                            name="title"
                            value={promo.title}
                            onChange={handleChange}
                            required
                            placeholder="Contoh: Diskon Gajian"
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base font-bold focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all uppercase"
                        />
                    </div>

                    {/* Subtitle */}
                    <div className="md:col-span-2">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Sub-judul / Teks Sekunder Banner</label>
                        <input
                            type="text"
                            name="subtitle"
                            value={promo.subtitle}
                            onChange={handleChange}
                            placeholder="Contoh: .ID cuma Rp 10.000 (Opsional, akan tampil di banner Home)"
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                        />
                    </div>

                    {/* Banner Image */}
                    <div className="md:col-span-2">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Gambar Banner</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={isUploading}
                            className="w-full h-12 -lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-[#f97316] hover:file:bg-orange-100"
                        />
                        {isUploading && <p className="text-sm text-[#f97316] mt-2 font-medium animate-pulse">Sedang mengunggah gambar...</p>}
                        {promo.banner_image && !isUploading && (
                            <div className="mt-4 relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 w-full max-w-none md:max-w-md">
                                <img src={promo.banner_image} alt="Banner Preview" className="w-full h-auto object-cover" />
                                <button type="button" onClick={() => setPromo(prev => ({...prev, banner_image: ''}))} className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition shadow-sm" title="Hapus Gambar">
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                        <label className="block text-base font-semibold text-slate-700 mb-2">Deskripsi Promo</label>
                        <textarea
                            name="description"
                            value={promo.description}
                            onChange={handleChange}
                            rows="2"
                            placeholder="Keterangan mengenai promo event ini..."
                            className="w-full p-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all resize-none"
                        ></textarea>
                    </div>

                    {/* Type & Value */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Tipe Diskon</label>
                        <select
                            name="discount_type"
                            value={promo.discount_type}
                            onChange={handleChange}
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all cursor-pointer"
                        >
                            <option value="percentage">Persentase (%)</option>
                            <option value="nominal">Nominal (Rupiah)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Nilai Diskon</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="discount_value"
                                value={promo.discount_value}
                                onChange={handleChange}
                                required
                                placeholder="0"
                                className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base font-bold focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">
                                {promo.discount_type === 'percentage' ? '%' : 'Rp'}
                            </div>
                        </div>
                        {getMarginWarning() && (
                            <p className="text-[10px] text-red-500 mt-1 font-bold animate-pulse">
                                ⚠️ {getMarginWarning()}
                            </p>
                        )}
                    </div>

                    {/* Anti-Boncos */}
                    {promo.discount_type === 'percentage' && (
                        <div className="md:col-span-2 p-5 bg-orange-50 border border-orange-100 rounded-lg transition-all animate-fade-in">
                            <label className="block text-base font-bold text-orange-700 mb-2">Maksimal Potongan (Cap)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 font-bold">Rp</span>
                                <input
                                    type="number"
                                    name="max_discount"
                                    value={promo.max_discount}
                                    onChange={handleChange}
                                    required
                                    placeholder="0"
                                    className="w-full h-12 pl-12 pr-4 bg-white border border-orange-200 rounded-lg text-base focus:border-[#f97316] outline-none transition-all font-bold"
                                />
                            </div>
                            <p className="text-xs text-orange-600 mt-2 font-medium">Batas atas diskon untuk memastikan event tetap profitable.</p>
                        </div>
                    )}

                    {/* Periods */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Waktu Mulai</label>
                        <input
                            type="datetime-local"
                            name="start_date"
                            value={promo.start_date}
                            onChange={handleChange}
                            required
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Waktu Selesai</label>
                        <input
                            type="datetime-local"
                            name="end_date"
                            value={promo.end_date}
                            onChange={handleChange}
                            required
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                        />
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Prioritas Event</label>
                        <input
                            type="number"
                            name="priority"
                            value={promo.priority}
                            onChange={handleChange}
                            className="w-full h-12 px-4 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] outline-none transition-all"
                        />
                    </div>

                    {/* Transaction Targeting */}
                    <div>
                        <label className="block text-base font-semibold text-slate-700 mb-2">Target Transaksi</label>
                        <div className="flex gap-2">
                             {[
                                { id: 'register', label: 'Beli' },
                                { id: 'transfer', label: 'Transfer' },
                                { id: 'renew', label: 'Renew' }
                            ].map(act => (
                                <button
                                    key={act.id}
                                    type="button"
                                    onClick={() => handleActionToggle(act.id)}
                                    className={`px-3 py-1.5 h-12 flex-1 rounded-lg border-2 text-[11px] font-bold uppercase transition-all ${promo.eligible_actions.includes(act.id) ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                >
                                    {act.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* TLD SELECTOR */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-base font-semibold text-slate-700">Target TLD (Ekstensi Domain)</label>
                            <div className="flex gap-4">
                                <button type="button" onClick={handleSelectAllTlds} className="text-sm font-bold text-[#f97316] hover:underline">Pilih Semua</button>
                                <button type="button" onClick={handleClearAllTlds} className="text-sm font-bold text-slate-400 hover:underline">Hapus Semua</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-lg h-48 overflow-y-auto">
                            {availableTlds.map(tld => (
                                <button
                                    key={tld}
                                    type="button"
                                    onClick={() => handleTldToggle(tld)}
                                    className={`h-10 px-3 rounded-lg border-2 text-sm font-bold transition-all ${promo.selectedTlds.includes(tld) ? 'bg-[#f97316] border-[#f97316] text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                                >
                                    {tld}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Submit button */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 px-6 bg-[#f97316] text-white rounded-lg text-base font-bold shadow-sm shadow-orange-100 hover:bg-[#ea580c] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            'Publikasikan Promo Event'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePromoEventForm;
