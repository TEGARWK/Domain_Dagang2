import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import CustomSelect from "../../components/ui/CustomSelect";
import api from "../../services/api";

const AdminPromos = () => {
  const navigate = useNavigate();
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();
  
  // --- STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [availableTlds, setAvailableTlds] = useState([]);
  const [activeTab, setActiveTab] = useState("voucher"); // "voucher", "event"

  // Load Initial Data
  useEffect(() => {
    fetchCoupons();
    fetchTlds();
  }, []);

  const fetchTlds = async () => {
    try {
        const res = await api.get("/pricing/all");
        setAvailableTlds(res.data.map(t => t.tld));
    } catch (err) {
        console.error("Gagal load TLDs:", err);
    }
  };


  const fetchCoupons = async () => {
      try {
          const res = await api.get("/vouchers/all");
          setCoupons(res.data);
      } catch (err) {
          console.error("Gagal load coupons:", err);
      } finally {
          setLoadingCoupons(false);
      }
  };
  
  // New Coupon Form State
  const [newCoupon, setNewCoupon] = useState({ 
      title: "", code: "", type: "percentage", value: "", min_purchase: "", usage_limit_total: "", valid_until: "", 
      eligible_tlds: [], eligible_actions: ["register"], is_stackable: false, first_purchase_only: false, max_discount: 0,
      subtitle: "", banner_image: "", description: ""
  });
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- HANDLERS ---
  const handleEditClick = (coupon) => {
    setEditingCoupon(coupon);
    let tlds = coupon.eligible_tlds || [];
    if (typeof tlds === 'string') {
        try { tlds = JSON.parse(tlds); } catch (e) { tlds = []; }
    }

    const getLocalDatetime = (dateString) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "";
        const pad = n => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setNewCoupon({
        title: coupon.title || "",
        subtitle: coupon.subtitle || "",
        banner_image: coupon.banner_image || "",
        description: coupon.description || "",
        code: coupon.code,
        type: coupon.type || "percentage",
        value: coupon.value || "",
        min_purchase: coupon.min_purchase || 0,
        usage_limit_total: coupon.usage_limit_total || 0,
        valid_until: getLocalDatetime(coupon.valid_until),
        eligible_tlds: tlds,
        eligible_actions: coupon.eligible_actions || ["register"],
        is_stackable: !!coupon.is_stackable,
        is_new_user_only: !!coupon.is_new_user_only,
        max_discount: coupon.max_discount || 0,
        is_active: coupon.is_active !== undefined ? coupon.is_active : true,
        is_automatic: !!coupon.is_automatic,
        // New Promo Engine Fields
        start_date: getLocalDatetime(coupon.start_date),
        end_date: getLocalDatetime(coupon.end_date),
        usage_limit_per_user: coupon.usage_limit_per_user || 0,
        priority: coupon.priority || 0,
        segment: coupon.segment || "all"
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    
    setIsUploading(true);

    try {
        const res = await api.post("/upload/banner", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        
        if (res.data.success) {
            setNewCoupon(prev => ({ ...prev, banner_image: res.data.imageUrl }));
            success('Gambar banner berhasil diunggah!');
        } else {
            error(res.data.message || 'Gagal mengunggah gambar');
        }
    } catch (err) {
        console.error("Upload error:", err);
        error('Gagal mengunggah gambar. Pastikan ukuran file < 5MB dan format sesuai.');
    } finally {
        setIsUploading(false);
        e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validation: Title, Value are strictly required. Valid_until is only required for standard coupons.
    if (!newCoupon.title || !newCoupon.value || (!newCoupon.is_automatic && !newCoupon.valid_until) || (editingCoupon && !newCoupon.code)) {
        return warning("Judul, Nilai Diskon, dan Info Berlaku wajib diisi!");
    }
    
    try {
        const payload = {
            title: newCoupon.title,
            subtitle: newCoupon.subtitle,
            banner_image: newCoupon.banner_image,
            description: newCoupon.description,
            code: newCoupon.code, // Include code for updates (Backend validation handles immutability if needed, or update logic requires it)
            type: newCoupon.type,
            value: parseInt(newCoupon.value),
            min_purchase: newCoupon.min_purchase ? parseInt(newCoupon.min_purchase) : 0,
            usage_limit_total: newCoupon.usage_limit_total ? parseInt(newCoupon.usage_limit_total) : 0,
            // valid_until handled by computed field below
            eligible_tlds: newCoupon.eligible_tlds,
            eligible_actions: newCoupon.eligible_actions,
            is_stackable: !!newCoupon.is_stackable,
            is_new_user_only: !!newCoupon.is_new_user_only,
            max_discount: newCoupon.max_discount ? parseInt(newCoupon.max_discount) : 0,
            is_active: newCoupon.is_active,
            is_automatic: !!newCoupon.is_automatic,
            // New Promo Engine Fields
            start_date: newCoupon.start_date ? new Date(newCoupon.start_date).toISOString() : null,
            end_date: newCoupon.end_date ? new Date(newCoupon.end_date).toISOString() : null,
            valid_until: newCoupon.is_automatic && newCoupon.end_date 
                         ? new Date(newCoupon.end_date).toISOString() 
                         : (newCoupon.valid_until ? new Date(newCoupon.valid_until).toISOString() : null),
            usage_limit_per_user: newCoupon.usage_limit_per_user ? parseInt(newCoupon.usage_limit_per_user) : 1,
            priority: newCoupon.priority ? parseInt(newCoupon.priority) : 0,
            segment: newCoupon.segment || "all"
        };

        if (editingCoupon) {
            await api.put(`/vouchers/${editingCoupon.id}`, payload);
        } else {
            await api.post("/vouchers", payload);
        }

        success(`Voucher berhasil ${editingCoupon ? 'diperbarui' : 'dibuat'}!`);
        resetForm();
        setIsModalOpen(false);
        fetchCoupons();
    } catch (err) {
        error(err.response?.data || "Terjadi kesalahan server");
    }
  };

  const resetForm = () => {
    setEditingCoupon(null);
    setNewCoupon({ 
        title: "", code: "", type: "percentage", value: "", min_purchase: "", usage_limit_total: "", valid_until: "", 
        eligible_tlds: [], eligible_actions: ["register"], is_stackable: false, is_new_user_only: false, max_discount: 0,
        is_active: true, is_automatic: false,
        // New Promo Engine Fields
        start_date: "", end_date: "", usage_limit_per_user: "", priority: 0, segment: "all"
    });
  };

  const handleDeleteCoupon = async (id) => {
    const isConfirmed = await confirm({
        title: "Hapus Kupon",
        message: "Apakah Anda yakin ingin menghapus kupon ini secara permanen?",
        type: "danger",
        confirmText: "Ya, Hapus"
    });

    if (isConfirmed) {
        try {
            await api.delete(`/vouchers/${id}`);
            setCoupons(coupons.filter(c => c.id !== id));
            success("Kupon berhasil dihapus.");
        } catch (err) {
            error(err.response?.data || "Terjadi kesalahan server");
        }
    }
  };


  return (
    <div className="animate-[fadeIn_0.5s_ease-out] relative">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden min-h-[600px] flex flex-col">
        
        {/* HEADER & TABS */}
        <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col-reverse md:flex-row justify-between items-start md:items-center gap-6 bg-white shrink-0">
          
          {/* TABS NAVIGATION */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1.5 rounded-xl w-fit">
              <button 
                onClick={() => setActiveTab("voucher")}
                className={`px-6 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all flex items-center justify-center min-w-[140px] ${activeTab === 'voucher' ? 'bg-white text-[#F97316] shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/30'}`}
              >
                Vocer Belanja
              </button>
              <button 
                onClick={() => setActiveTab("event")}
                className={`px-6 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all flex items-center justify-center min-w-[140px] ${activeTab === 'event' ? 'bg-white text-[#F97316] shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/30'}`}
              >
                Promo Event
              </button>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 w-full md:w-auto justify-end">
               {activeTab === 'voucher' && (
                   <button 
                       onClick={() => navigate('/admin/promos/create-coupon')}
                       className="w-full md:w-auto px-6 py-3 bg-[#F97316] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-900 transition shadow-lg shadow-orange-600/20 flex items-center justify-center gap-3 group active:scale-95"
                   >
                       <div className="w-5 h-5 bg-white/20 rounded-md flex items-center justify-center group-hover:rotate-90 transition-transform">
                           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                       </div>
                       Buat Vocer Baru
                   </button>
               )}
               {activeTab === 'event' && (
                   <button 
                       onClick={() => navigate('/admin/promos/create-event')}
                       className="w-full md:w-auto px-6 py-3 bg-[#F97316] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-900 transition shadow-lg shadow-orange-600/20 flex items-center justify-center gap-3 group active:scale-95"
                   >
                      <div className="w-5 h-5 bg-white/20 rounded-md flex items-center justify-center group-hover:scale-125 transition-transform">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      Buat Event Baru
                  </button>
              )}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 flex flex-col">
          <div className="animate-fade-in flex-1">
             <div className="p-6 md:p-8 bg-white pb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                     Daftar {activeTab === 'voucher' ? 'Vocer Aktif' : 'Event Diskon'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                     Total {coupons.filter(c => activeTab === 'event' ? c.is_automatic : !c.is_automatic).length} Promo Ditemukan
                </p>
             </div>

             {loadingCoupons ? (
                 <div className="text-center py-32 text-slate-400 italic font-medium tracking-[0.3em]">SEDANG MEMUAT DATA...</div>
             ) : coupons.filter(c => activeTab === 'event' ? c.is_automatic : !c.is_automatic).length === 0 ? (
                 <div className="text-center py-40 flex flex-col items-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-6">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em] mb-8">Wah, belum ada {activeTab === 'voucher' ? 'Vocer' : 'Event'} nih!</p>
                    <button 
                        onClick={() => navigate(activeTab === 'voucher' ? '/admin/promos/create-coupon' : '/admin/promos/create-event')}
                        className="px-8 py-4 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#F97316] transition"
                    >
                        Buat {activeTab === 'voucher' ? 'Vocer' : 'Event'} Pertama
                    </button>
                 </div>
             ) : (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <th className="px-8 py-5">Kode & Nama</th>
                                <th className="px-8 py-5">Diskon</th>
                                <th className="px-8 py-5">Syarat</th>
                                <th className="px-8 py-5 text-center">Kuota</th>
                                <th className="px-8 py-5">Berlaku</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                            {coupons
                                .filter(c => activeTab === 'event' ? c.is_automatic : !c.is_automatic)
                                .map((v) => (
                                 <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center border border-orange-100 shrink-0">
                                                <span className="material-symbols-outlined text-base">confirmation_number</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-tight text-sm tracking-tight">{v.code}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{v.title}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border transition-all w-fit ${v.type === 'percentage' ? 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100' : 'bg-green-50 text-green-600 border-green-100 group-hover:bg-green-100'}`}>
                                                {v.type === 'percentage' ? `${v.value}%` : `Rp ${new Intl.NumberFormat('id-ID').format(v.value)}`}
                                            </span>
                                            {v.type === 'percentage' && v.max_discount > 0 && (
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                                    MAX: Rp {new Intl.NumberFormat('id-ID').format(v.max_discount)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1.5 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min. Blj:</span>
                                                <span className="text-xs font-bold text-slate-700 tracking-tight">Rp {new Intl.NumberFormat('id-ID').format(v.min_purchase || 0)}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {v.is_new_user_only && <span className="text-[8px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-md font-bold uppercase tracking-tighter border border-purple-100">New User</span>}
                                                {v.is_stackable && <span className="text-[8px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-bold uppercase tracking-tighter border border-blue-100">Stackable</span>}
                                                {v.is_automatic && <span className="text-[8px] px-1.5 py-0.5 bg-orange-50 text-[#F97316] rounded-md font-bold uppercase tracking-tighter border border-orange-100">Auto</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex items-center justify-center gap-1.5 font-bold">
                                            <span className="text-xs">{v.usage_limit_total > 0 ? `${v.usage_limit_total}x` : '∞'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-tighter text-[10px]">
                                            <span className="material-symbols-outlined text-[14px]">event</span>
                                            <span>{new Date(v.valid_until).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border transition-all w-fit flex items-center gap-1 ${v.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                            <div className={`w-1 h-1 rounded-full ${v.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                            {v.is_active ? 'Aktif' : 'Non-Aktif'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            <button 
                                                onClick={() => handleEditClick(v)}
                                                className="w-8 h-8 rounded-lg bg-white text-slate-400 hover:bg-orange-950 hover:text-white border border-slate-100 transition-all shadow-sm active:scale-90 flex items-center justify-center"
                                                title="Edit / Detail"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteCoupon(v.id)}
                                                className="w-8 h-8 rounded-lg bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 border border-slate-100 transition-all shadow-sm active:scale-90 flex items-center justify-center"
                                                title="Hapus"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             )}
          </div>
      </div>
    </div>

    {/* --- ADD/EDIT VOUCHER MODAL --- */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up border border-slate-100">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{editingCoupon ? 'Edit' : 'Buat'} Voucher Baru</h3>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5">Konfigurasi detail promo dan target audience.</p>
                      </div>
                      <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    
                    {/* SECTION 1: BASIC INFO */}
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-orange-100 text-[#F97316] flex items-center justify-center text-[10px]">1</span>
                            Informasi Dasar
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Judul Promo</label>
                                <input 
                                    type="text" placeholder="Contoh: Promo Gajian" required
                                    value={newCoupon.title} onChange={e => setNewCoupon({...newCoupon, title: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-[#F97316] outline-none transition"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kode Promo (Auto)</label>
                                <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-500 text-sm">
                                    {editingCoupon ? newCoupon.code : 'Dibuat Otomatis'}
                                </div>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Aktif</label>
                                <div className="flex bg-white p-1 rounded-lg border border-slate-200 w-fit">
                                    <button 
                                        type="button"
                                        onClick={() => setNewCoupon({...newCoupon, is_active: true})}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${newCoupon.is_active ? 'bg-green-100 text-green-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        Aktif
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setNewCoupon({...newCoupon, is_active: false})}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!newCoupon.is_active ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        Non-Aktif
                                    </button>
                                </div>
                            </div>
                            
                            {/* Banner Fields (Only for Automatic promos/events) */}
                            {newCoupon.is_automatic && (
                                <>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sub-judul / Teks Sekunder Banner</label>
                                        <input 
                                            type="text" placeholder="Contoh: .ID cuma Rp 10.000 (Opsional)" 
                                            value={newCoupon.subtitle || ''} onChange={e => setNewCoupon({...newCoupon, subtitle: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-[#F97316] outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deskripsi Promo</label>
                                        <textarea
                                            value={newCoupon.description || ''} onChange={e => setNewCoupon({...newCoupon, description: e.target.value})}
                                            rows="2" placeholder="Keterangan mengenai promo event ini..."
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-[#F97316] outline-none transition resize-none"
                                        ></textarea>
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gambar Banner</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={isUploading}
                                            className="w-full h-12 -lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-[#f97316] hover:file:bg-orange-100"
                                        />
                                        {isUploading && <p className="text-sm text-[#f97316] mt-2 font-bold animate-pulse">Sedang mengunggah gambar...</p>}
                                        {newCoupon.banner_image && !isUploading && (
                                            <div className="mt-4 relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 w-full max-w-none md:max-w-md">
                                                <img src={newCoupon.banner_image} alt="Banner Preview" className="w-full h-auto object-cover" />
                                                <button type="button" onClick={() => setNewCoupon(prev => ({...prev, banner_image: ''}))} className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition shadow-sm" title="Hapus Gambar">
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: DISCOUNT RULES */}
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">2</span>
                            Aturan Diskon
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                            <div className="space-y-3">
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setNewCoupon({...newCoupon, type: 'percentage', value: 0})}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${newCoupon.type === 'percentage' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Diskon (%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewCoupon({...newCoupon, type: 'fixed', value: 0})}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${newCoupon.type === 'fixed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Potongan (Rp)
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none text-sm">
                                        {newCoupon.type === 'percentage' ? '' : 'Rp'}
                                    </div>
                                    <input 
                                        type={newCoupon.type === 'percentage' ? "number" : "text"}
                                        placeholder="0"
                                        required 
                                        value={newCoupon.type === 'fixed' ? new Intl.NumberFormat('id-ID').format(newCoupon.value || 0) : newCoupon.value} 
                                        onChange={e => {
                                            if (newCoupon.type === 'fixed') {
                                                const val = e.target.value.replace(/\./g, '').replace(/,/g, '');
                                                if (!isNaN(val)) setNewCoupon({...newCoupon, value: val});
                                            } else {
                                                setNewCoupon({...newCoupon, value: e.target.value});
                                            }
                                        }}
                                        className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:border-[#F97316] outline-none text-base transition shadow-sm ${newCoupon.type === 'fixed' ? 'pl-10' : ''}`}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none text-sm">
                                        {newCoupon.type === 'percentage' ? '%' : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Maks. Potongan (Cap)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none text-xs">Rp</div>
                                    <input 
                                        type="text" placeholder="0 (Tanpa Batas)" 
                                        value={new Intl.NumberFormat('id-ID').format(newCoupon.max_discount || 0)} 
                                        onChange={e => {
                                             const val = e.target.value.replace(/\./g, '').replace(/,/g, '');
                                             if (!isNaN(val)) setNewCoupon({...newCoupon, max_discount: val});
                                        }}
                                        className="w-full px-4 py-2.5 pl-10 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                            </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Min. Belanja</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none text-xs">Rp</div>
                                    <input 
                                        type="text" placeholder="0" 
                                        value={new Intl.NumberFormat('id-ID').format(newCoupon.min_purchase || 0)} 
                                        onChange={e => {
                                             const val = e.target.value.replace(/\./g, '').replace(/,/g, '');
                                             if (!isNaN(val)) setNewCoupon({...newCoupon, min_purchase: val});
                                        }}
                                        className="w-full px-4 py-2.5 pl-10 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opsi Tambahan</label>
                                <div className="flex gap-2">
                                    <label className={`flex-1 flex items-center justify-center px-2 py-2.5 rounded-lg border cursor-pointer transition-all ${newCoupon.is_stackable ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                                        <input type="checkbox" className="hidden" checked={newCoupon.is_stackable} onChange={() => setNewCoupon({...newCoupon, is_stackable: !newCoupon.is_stackable})} />
                                        <span className="text-[10px] font-bold uppercase">Stackable</span>
                                    </label>
                                    <label className={`flex-1 flex items-center justify-center px-2 py-2.5 rounded-lg border cursor-pointer transition-all ${newCoupon.is_new_user_only ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                                        <input type="checkbox" className="hidden" checked={newCoupon.is_new_user_only} onChange={() => setNewCoupon({...newCoupon, is_new_user_only: !newCoupon.is_new_user_only})} />
                                        <span className="text-[10px] font-bold uppercase">User Baru Only</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2.5: CAMPAIGN & SEGMENTATION (NEW) */}
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                             <span className="w-5 h-5 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-[10px]">2.5</span>
                             Setelan Kampanye
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mulai</label>
                                <input 
                                    type="datetime-local"
                                    value={newCoupon.start_date} onChange={e => setNewCoupon({...newCoupon, start_date: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-purple-500 outline-none transition"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selesai</label>
                                <input 
                                    type="datetime-local"
                                    value={newCoupon.end_date} onChange={e => setNewCoupon({...newCoupon, end_date: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-purple-500 outline-none transition"
                                />
                            </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prioritas (Lebih Besar = Diutamakan)</label>
                                <input 
                                    type="number" placeholder="0"
                                    value={newCoupon.priority} onChange={e => setNewCoupon({...newCoupon, priority: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-purple-500 outline-none transition"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Segmen User</label>
                                <CustomSelect
                                    options={[
                                        { value: 'all', label: 'Semua User' },
                                        { value: 'new_user', label: 'User Baru' },
                                        { value: 'returning_user', label: 'User Lama (Returning)' },
                                        { value: 'vip', label: 'VIP (High Spenders)' }
                                    ]}
                                    value={newCoupon.segment}
                                    onChange={val => setNewCoupon({...newCoupon, segment: val})}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipe Voucher</label>
                                <div className="flex gap-4">
                                     <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${newCoupon.is_automatic ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200'}`}>
                                        <input type="checkbox" checked={newCoupon.is_automatic} onChange={() => setNewCoupon({...newCoupon, is_automatic: !newCoupon.is_automatic})} className="w-4 h-4 accent-purple-600" />
                                        <div>
                                            <div className="font-bold text-sm text-slate-900">Otomatis (Auto-Apply)</div>
                                            <div className="text-[10px] text-slate-500">Langsung memotong saat checkout jika syarat terpenuhi.</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: LIMITS */}
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">3</span>
                            Batas & Validitas
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Limit Total Penggunaan</label>
                                <input 
                                    type="text" placeholder="0 (Unlimited)" 
                                    value={new Intl.NumberFormat('id-ID').format(newCoupon.usage_limit_total || 0)} 
                                    onChange={e => {
                                         const val = e.target.value.replace(/\./g, '').replace(/,/g, '');
                                         if (!isNaN(val)) setNewCoupon({...newCoupon, usage_limit_total: val});
                                    }}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-slate-400 outline-none transition"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Limit Per User</label>
                                <input 
                                    type="text" placeholder="1" 
                                    value={new Intl.NumberFormat('id-ID').format(newCoupon.usage_limit_per_user || 0)} 
                                    onChange={e => {
                                         const val = e.target.value.replace(/\./g, '').replace(/,/g, '');
                                         if (!isNaN(val)) setNewCoupon({...newCoupon, usage_limit_per_user: val});
                                    }}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-slate-400 outline-none transition"
                                />
                            </div>
                            {!newCoupon.is_automatic && (
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Berlaku Hingga</label>
                                    <input 
                                        type="datetime-local" required 
                                        value={newCoupon.valid_until} onChange={e => setNewCoupon({...newCoupon, valid_until: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:border-slate-400 outline-none transition"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION 4: TARGETING */}
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-[10px]">4</span>
                            Target Khusus
                        </h4>
                         <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Jenis Transaksi</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'register', label: 'Pendaftaran' },
                                        { id: 'transfer', label: 'Transfer' },
                                        { id: 'renew', label: 'Perpanjangan' }
                                    ].map(act => (
                                        <button
                                            key={act.id}
                                            type="button"
                                            onClick={() => {
                                                const current = newCoupon.eligible_actions || [];
                                                if (current.includes(act.id)) {
                                                    setNewCoupon({...newCoupon, eligible_actions: current.filter(a => a !== act.id)});
                                                } else {
                                                    setNewCoupon({...newCoupon, eligible_actions: [...current, act.id]});
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                                (newCoupon.eligible_actions || []).includes(act.id) 
                                                    ? "bg-slate-900 text-white border-slate-900" 
                                                    : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
                                            }`}
                                        >
                                            {act.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Domain TLD (Kosong = Semua)</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableTlds.map(tld => (
                                        <button
                                            key={tld}
                                            type="button"
                                            onClick={() => {
                                                const current = newCoupon.eligible_tlds || [];
                                                if (current.includes(tld)) {
                                                    setNewCoupon({...newCoupon, eligible_tlds: current.filter(t => t !== tld)});
                                                } else {
                                                    setNewCoupon({...newCoupon, eligible_tlds: [...current, tld]});
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                                (newCoupon.eligible_tlds || []).includes(tld) 
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                                                    : "bg-white text-slate-400 border-slate-200 hover:text-blue-500 hover:border-blue-200"
                                            }`}
                                        >
                                            {tld}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-8 border-t border-slate-100 mt-8">
                        <button 
                            type="button" 
                            onClick={() => { setIsModalOpen(false); resetForm(); }}
                            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-lg font-bold uppercase tracking-wider hover:bg-slate-200 transition"
                        >
                            Batal
                        </button>
                        <button 
                            type="submit" 
                            className="flex-[2] py-4 bg-[#F97316] text-white rounded-lg font-bold uppercase tracking-widest hover:bg-orange-600 transition shadow-lg shadow-orange-200"
                        >
                            {editingCoupon ? 'Simpan Perubahan' : 'Buat Voucher'}
                        </button>
                    </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPromos;
