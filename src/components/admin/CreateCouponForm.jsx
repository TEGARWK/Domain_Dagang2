import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CreateCouponForm = ({ voucherId, onSuccess, onCancel }) => {
  const [coupon, setCoupon] = useState({
    title: '', code: '', description: '',
    discount_type: 'flat', discount_value: '', max_discount: '0',
    min_purchase: '0', quota: '0', max_use_per_user: '1',
    started_at: '', expired_at: '',
    selectedTlds: [], eligible_actions: ['register'],
    is_automatic: false, priority: '0', segment: 'all',
    is_new_user_only: false, is_stackable: false
  });

  const isEdit = !!voucherId;
  const [availableTlds, setAvailableTlds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await api.get('/pricing/all');
        if (Array.isArray(res.data)) {
          setAvailableTlds(res.data.map(item => item.tld).sort());
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
            title: v.title || '', code: v.code || '', description: v.description || '',
            discount_type: v.discount_type || 'flat', discount_value: v.discount_value?.toString() || '',
            max_discount: v.max_discount?.toString() || '0', min_purchase: v.min_transaction?.toString() || '0',
            quota: v.quota?.toString() || '0', max_use_per_user: v.max_use_per_user?.toString() || '1',
            started_at: v.started_at ? new Date(v.started_at).toISOString().slice(0, 16) : '',
            expired_at: v.expired_at ? new Date(v.expired_at).toISOString().slice(0, 16) : '',
            selectedTlds: v.applicable_to ? (typeof v.applicable_to === 'string' ? JSON.parse(v.applicable_to) : v.applicable_to) : [],
            eligible_actions: v.eligible_actions ? (typeof v.eligible_actions === 'string' ? JSON.parse(v.eligible_actions) : v.eligible_actions) : ['register'],
            is_automatic: v.is_automatic || false, priority: v.priority?.toString() || '0',
            segment: v.segment || 'all', is_new_user_only: v.is_new_user_only || false,
            is_stackable: v.is_stackable || false
          });
        }
      } catch (err) { console.error("Fetch Voucher Error:", err); }
    };

    fetchPricing();
    fetchVoucher();
  }, [voucherId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCoupon(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleActionToggle = (action) => {
    setCoupon(prev => {
      const current = [...prev.eligible_actions];
      return current.includes(action)
        ? { ...prev, eligible_actions: current.filter(a => a !== action) }
        : { ...prev, eligible_actions: [...current, action] };
    });
  };

  const handleTldToggle = (tld) => {
    setCoupon(prev => ({
      ...prev,
      selectedTlds: prev.selectedTlds.includes(tld)
        ? prev.selectedTlds.filter(t => t !== tld)
        : [...prev.selectedTlds, tld]
    }));
  };

  const handleSelectAllTlds = () => setCoupon(prev => ({ ...prev, selectedTlds: [...availableTlds] }));
  const handleClearAllTlds = () => setCoupon(prev => ({ ...prev, selectedTlds: [] }));

  const formatRupiah = (value) => value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
  const parseNumber = (value) => value.replace(/\./g, '');
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = parseNumber(value);
    if (/^\d*$/.test(cleanValue)) setCoupon(prev => ({ ...prev, [name]: cleanValue }));
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'PRM-';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', msg: '' });
    try {
      const finalCode = coupon.code || generateRandomCode();
      const payload = {
        title: coupon.title, code: finalCode.toUpperCase(), discount_type: coupon.discount_type,
        discount_value: parseFloat(coupon.discount_value),
        max_discount: coupon.discount_type === 'percentage' ? parseFloat(coupon.max_discount) : 0,
        quota: parseInt(coupon.quota) || 0, max_use_per_user: parseInt(coupon.max_use_per_user) || 1,
        min_transaction: parseFloat(coupon.min_purchase) || 0,
        applicable_to: JSON.stringify(coupon.selectedTlds),
        started_at: coupon.started_at ? new Date(coupon.started_at).toISOString() : null,
        expired_at: coupon.expired_at ? new Date(coupon.expired_at).toISOString() : null,
        is_new_user_only: coupon.is_new_user_only, is_stackable: coupon.is_stackable,
        description: coupon.description, is_automatic: false,
        priority: parseInt(coupon.priority) || 0, segment: coupon.segment,
        eligible_actions: coupon.eligible_actions
      };

      if (isEdit) {
        await api.put(`/admin/vouchers/${voucherId}`, payload);
      } else {
        await api.post("/admin/vouchers/create", payload);
        setCoupon({
          title: '', code: '', description: '', discount_type: 'flat', discount_value: '',
          max_discount: '0', min_purchase: '0', quota: '0', max_use_per_user: '1',
          started_at: '', expired_at: '', selectedTlds: [], eligible_actions: ['register'],
          is_automatic: false, priority: '0', segment: 'all', is_new_user_only: false, is_stackable: false
        });
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Promo Create Error:", err);
      setStatus({ type: 'error', msg: err.response?.data?.message || err.message || 'Gagal menyimpan promo.' });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-neutral-200 shadow-xl">
      {/* Header */}
      <div className="card" style={{ background: "var(--color-neutral-800)", border: "none", borderRadius: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">{isEdit ? 'Edit Promo' : 'Buat Promo Baru'}</h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">Sistem Klaim & Koleksi</p>
          </div>
          {onCancel && (
            <button type="button" onClick={onCancel}
              style={{ width: 32, height: 32, background: "rgba(255,255,255,0.1)", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {status.msg && (
          <div className={`card ${status.type === 'success' ? '' : ''}`} style={{ padding: "12px 16px", background: status.type === 'success' ? "var(--color-emerald-50)" : "var(--color-rose-50)", borderColor: status.type === 'success' ? "var(--color-emerald-200)" : "var(--color-rose-200)" }}>
            <p className={`text-xs font-bold ${status.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{status.msg}</p>
          </div>
        )}

        {/* Section 1: Profile */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
            <span className={SC.dot + " bg-primary-500"} />
            <h3 className={SC.sectionHeader}>Profil Promo</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="form-group">
              <label className="form-label">Nama Promo (Judul)</label>
              <input type="text" name="title" value={coupon.title} onChange={handleChange} required
                placeholder="Contoh: Diskon Merdeka .ID" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Syarat & Ketentuan</label>
              <textarea name="description" value={coupon.description} onChange={handleChange} rows="3"
                placeholder="Jelaskan aturan mainnya..." className="form-input" style={{ minHeight: 80, resize: "vertical" }} />
            </div>
          </div>
        </div>

        {/* Section 2: Discount */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
            <span className={SC.dot + " bg-emerald-500"} />
            <h3 className={SC.sectionHeader}>Besar Diskon</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Tipe Potongan</label>
              <select name="discount_type" value={coupon.discount_type} onChange={handleChange} className="form-select">
                <option value="flat">Nominal (Rp)</option>
                <option value="percentage">Persentase (%)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nilai Potongan</label>
              <div className="relative">
                <input type="text" name="discount_value" value={formatRupiah(coupon.discount_value)} onChange={handleNumberChange} required placeholder="0" className="form-input" />
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: "var(--color-neutral-400)" }}>
                  {coupon.discount_type === 'percentage' ? '%' : 'Rp'}
                </span>
              </div>
            </div>
            {coupon.discount_type === 'percentage' && (
              <div className="md:col-span-2 card" style={{ background: "var(--color-primary-50)", borderColor: "var(--color-primary-200)" }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: "var(--color-primary-600)" }}>Maksimal Diskon (Rp)</label>
                  <input type="text" name="max_discount" value={formatRupiah(coupon.max_discount)} onChange={handleNumberChange} required placeholder="0" className="form-input" />
                </div>
                <p className="text-[10px] font-bold text-primary-500 mt-1">Batas maksimal nominal diskon persentase.</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Criteria */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
            <span className={SC.dot + " bg-blue-500"} />
            <h3 className={SC.sectionHeader}>Kriteria & Target</h3>
          </div>
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Berlaku Untuk Aksi</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'register', label: 'Daftar', icon: 'app_registration' },
                  { id: 'transfer', label: 'Transfer', icon: 'move_up' },
                  { id: 'renew', label: 'Perpanjang', icon: 'autorenew' }
                ].map(act => (
                  <button key={act.id} type="button" onClick={() => handleActionToggle(act.id)}
                    className={`btn btn-sm ${coupon.eligible_actions.includes(act.id) ? 'btn-primary' : 'btn-ghost'}`}>
                    <span className="material-symbols-outlined text-sm">{act.icon}</span>
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Min. Belanja (Rp)</label>
                <input type="text" name="min_purchase" value={formatRupiah(coupon.min_purchase)} onChange={handleNumberChange} placeholder="0" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Target Segment</label>
                <select name="segment" value={coupon.segment} onChange={handleChange} className="form-select">
                  <option value="all">Semua Member</option>
                  <option value="regular">Member Biasa</option>
                  <option value="premium">Premium / Reseller</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <div className="flex justify-between items-center mb-2">
                <label className="form-label" style={{ margin: 0 }}>Target Ekstensi Domain</label>
                <div className="flex gap-3">
                  <button type="button" onClick={handleSelectAllTlds} className="text-[10px] font-bold text-primary-500 hover:underline uppercase tracking-wider">Semua</button>
                  <button type="button" onClick={handleClearAllTlds} className="text-[10px] font-bold text-neutral-400 hover:underline uppercase tracking-wider">Bersihkan</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 p-3 bg-neutral-50 border border-neutral-100 rounded-xl max-h-40 overflow-y-auto custom-scrollbar">
                {availableTlds.map(tld => (
                  <button key={tld} type="button" onClick={() => handleTldToggle(tld)}
                    className={`h-9 px-2 rounded-lg border-2 text-[11px] font-bold uppercase tracking-tight transition-all ${coupon.selectedTlds.includes(tld) ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300'}`}>
                    {tld}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold text-neutral-400 mt-1 italic">Kosongkan jika berlaku untuk SEMUA domain.</p>
            </div>
          </div>
        </div>

        {/* Section 4: Time & Quota */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
            <span className={SC.dot + " bg-purple-500"} />
            <h3 className={SC.sectionHeader}>Waktu & Kuota</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Tgl Mulai</label>
              <input type="datetime-local" name="started_at" value={coupon.started_at} onChange={handleChange} required className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Tgl Berakhir</label>
              <input type="datetime-local" name="expired_at" value={coupon.expired_at} onChange={handleChange} required className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Total Kuota Stok</label>
              <input type="number" name="quota" value={coupon.quota} onChange={handleChange} placeholder="0 (Unlimited)" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Maks. Pakai / User</label>
              <input type="number" name="max_use_per_user" value={coupon.max_use_per_user} onChange={handleChange} placeholder="1" className="form-input" />
            </div>
          </div>
        </div>

        {/* Section 5: Rules */}
        <div className="card" style={{ background: "var(--color-neutral-800)", borderColor: "var(--color-neutral-700)" }}>
          <div className="flex items-center gap-2 border-b border-neutral-700 pb-3 mb-4">
            <span className={SC.dot + " bg-primary-400"} />
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Aturan & Prioritas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="is_new_user_only" checked={coupon.is_new_user_only} onChange={handleChange}
                  style={{ width: 18, height: 18, accentColor: "var(--color-primary-500)" }} />
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Khusus User Baru</span>
                  <p className="text-[10px] font-bold text-neutral-400">Hanya untuk member yang belum pernah transaksi.</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="is_stackable" checked={coupon.is_stackable} onChange={handleChange}
                  style={{ width: 18, height: 18, accentColor: "var(--color-primary-500)" }} />
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Stackable</span>
                  <p className="text-[10px] font-bold text-neutral-400">Bisa digabung dengan diskon referral/promo lain.</p>
                </div>
              </label>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: "var(--color-neutral-400)" }}>Prioritas (0-999)</label>
              <input type="number" name="priority" value={coupon.priority} onChange={handleChange} placeholder="0"
                className="form-input" style={{ background: "rgba(255,255,255,0.05)", borderColor: "var(--color-neutral-700)", color: "#fff" }} />
              <p className="text-[10px] font-bold text-neutral-500 mt-1 uppercase tracking-wider">Makin tinggi, makin atas munculnya.</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ flex: 1, height: 48 }}>
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>{isEdit ? 'Simpan Perubahan' : 'Terbitkan Promo'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const SC = {
  sectionHeader: "text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2",
  dot: "w-1 h-4 rounded-full",
};

export default CreateCouponForm;
