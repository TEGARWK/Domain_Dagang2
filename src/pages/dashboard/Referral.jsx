import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const Referral = () => {
  const [stats, setStats] = useState(null);
  const [codeData, setCodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { success, error, info } = useNotification();

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const [statsRes, codeRes] = await Promise.all([
        api.get("/referral/my-stats"),
        api.get("/referral/my-code"),
      ]);

      setStats(statsRes.data.data);
      setCodeData(codeRes.data.data);
    } catch (err) {
      console.error("Gagal load data referral:", err);
      const msg = err.response?.data?.message || "Gagal memuat data referral.";
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    success("Berhasil disalin ke clipboard!");
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const handleUpdateCode = async (e) => {
    e.preventDefault();
    if (!customCode) return error("Masukkan kode baru!");
    
    try {
      setIsUpdating(true);
      const res = await api.post("/referral/update-code", { newCode: customCode });
      if (res.data.success) {
        success("Kode referral berhasil diubah!");
        setShowCustomModal(false);
        fetchReferralData();
      }
    } catch (err) {
      error(err.response?.data?.message || "Gagal mengubah kode.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin w-10 h-10 border-4 border-slate-200 border-t-[#F97316] rounded-full"></div>
        <p className="text-slate-400 text-sm font-bold animate-pulse uppercase tracking-widest">
            Menghitung Cuan...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-[fadeIn_0.5s_ease-out]">
      
      {/* --- HEADER AREA --- */}
      <div className="relative overflow-hidden rounded-lg bg-slate-900 p-8 md:p-12 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#F97316]/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse"></span>
            Program Afiliasi
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-2xl">
            Undang Teman & <span className="text-[#F97316]">Dapatkan Reward</span>
          </h1>
          <p className="text-slate-400 font-medium max-w-xl text-base leading-relaxed">
            Berikan diskon <span className="text-white font-bold">Rp 5.000</span> untuk temanmu, dan dapatkan komisi hingga <span className="text-[#F97316] font-bold">Rp 35.000</span> per orang!
          </p>
        </div>
        
        {/* Decorative Floaties */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#F97316] rounded-full blur-[80px] opacity-20"></div>
      </div>

      {/* --- STATS OVERVIEW --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm flex items-center gap-4 hover:border-orange-100 transition">
          <div className="w-12 h-12 bg-orange-50 text-[#F97316] rounded-lg flex items-center justify-center shrink-0">
             <span className="material-symbols-outlined text-2xl">group</span>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Teman Terdaftar</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats?.total_referrals}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm flex items-center gap-4 hover:border-amber-100 transition">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center shrink-0">
             <span className="material-symbols-outlined text-2xl">pending_actions</span>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Bonus Pending</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatRupiah(stats?.pending_rewards)}</h3>
          </div>
        </div>

        <div className="bg-[#F97316] p-6 rounded-lg shadow-lg shadow-orange-900/10 flex items-center gap-4 hover:scale-[1.02] transition group">
          <div className="w-12 h-12 bg-white/20 text-white rounded-lg flex items-center justify-center shrink-0 backdrop-blur-md">
             <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
          <div className="text-white">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Total Pendapatan</p>
            <h3 className="text-2xl font-bold">{formatRupiah(stats?.active_rewards)}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- LEFT SIDE: SHARE BOX & TIER --- */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Share Box */}
          <div className="bg-white p-6 md:p-8 rounded-lg border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-[#F97316]"></span>
              Bagikan Link Referral
            </h3>
            
            <div className="space-y-6">
               <div className="relative group">
                  <input 
                    type="text" 
                    readOnly 
                    value={codeData?.referral_link}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-4 pr-32 font-medium text-slate-600 focus:border-[#F97316] transition-all outline-none text-sm"
                  />
                  <button 
                    onClick={() => copyToClipboard(codeData?.referral_link)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-[#F97316] transition-all active:scale-95 shadow-md"
                  >
                    Salin
                  </button>
               </div>

               <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-slate-100"></div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Atau</span>
                  <div className="flex-1 h-px bg-slate-100"></div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex items-center justify-between group hover:border-orange-200 transition">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Kode Referral</span>
                      <span className="text-xl font-bold text-slate-800 tracking-tight">{codeData?.referral_code}</span>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => {
                           if (stats?.total_referrals < 5) {
                             return info("Fitur ini khusus untuk member Silver/Gold. Ajak 5 orang lagi!");
                           }
                           setCustomCode(codeData?.referral_code);
                           setShowCustomModal(true);
                         }}
                         className="px-3 py-1 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase hover:bg-slate-900 hover:text-white transition group/btn flex items-center gap-1"
                       >
                         Custom
                         <span className="material-symbols-outlined text-[12px] group-hover/btn:rotate-12 transition">edit</span>
                       </button>
                       <button 
                         onClick={() => copyToClipboard(codeData?.referral_code)}
                         className="w-10 h-10 rounded-lg bg-white text-slate-400 hover:text-[#F97316] hover:shadow-sm transition-all flex items-center justify-center border border-slate-100"
                       >
                         <span className="material-symbols-outlined text-lg">content_copy</span>
                       </button>
                    </div>
                  </div>

                  <div className="bg-orange-50/50 rounded-lg p-4 border border-orange-100 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider block mb-0.5">Level Akun</span>
                      <span className="text-xl font-bold text-[#F97316] tracking-tight uppercase">{stats?.current_tier}</span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-white text-[#F97316] shadow-sm flex items-center justify-center border border-orange-100">
                       <span className="material-symbols-outlined text-lg">workspace_premium</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Tier Progress */}
          {stats?.next_tier && (
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 relative overflow-hidden group">
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-0.5">Menuju Level {stats.next_tier.name}</h4>
                    <p className="text-[11px] font-medium text-slate-500">Ajak <span className="text-slate-900 font-bold">{stats.next_tier.needed} orang lagi</span> untuk cuan lebih besar!</p>
                 </div>
                 <div className="flex items-end gap-1">
                    <span className="text-xl font-bold text-slate-800 leading-none">{stats.total_referrals}</span>
                    <span className="text-[10px] font-bold text-slate-400 mb-0.5">/ {stats.next_tier.min}</span>
                 </div>
               </div>
               
               <div className="mt-4 relative h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-orange-500 transition-all duration-1000 ease-out"
                    style={{ width: `${(stats.total_referrals / stats.next_tier.min) * 100}%` }}
                  ></div>
               </div>
            </div>
          )}

        </div>

        {/* --- RIGHT SIDE: HISTORY --- */}
        <div className="lg:col-span-5">
           <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Riwayat Referral
                </h3>
              </div>
              
              <div className="flex-1">
                {stats?.referral_history.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {stats.referral_history.map(item => (
                      <div key={item.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${item.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {item.referee_name_masked.charAt(0)}
                          </div>
                          <div className="truncate">
                             <p className="font-bold text-slate-800 text-xs truncate">{item.referee_name_masked}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                             </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                           <p className={`font-bold text-xs ${item.status === 'active' ? 'text-emerald-600' : 'text-amber-500'}`}>
                             {item.status === 'active' ? '+' : ''}{formatRupiah(item.reward_amount)}
                           </p>
                           <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                              {item.status === 'active' ? 'Cair' : 'Pending'}
                           </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                       <span className="material-symbols-outlined text-slate-200 text-2xl">person_add</span>
                    </div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider px-4">
                      Belum ada teman terdaftar.
                    </p>
                  </div>
                )}
              </div>
           </div>
        </div>

      </div>

      {/* --- FAQ SECTION --- */}
      <div className="bg-white p-10 rounded-lg border border-slate-100 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-8 text-center uppercase tracking-tight">Cara Kerja Referral</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="text-center space-y-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mx-auto text-sm font-bold shadow-sm">1</div>
              <h4 className="font-bold text-slate-800 text-sm">Bagikan Link</h4>
              <p className="text-xs text-slate-500 leading-relaxed px-4">Berikan link atau kode unikmu ke teman atau klien.</p>
           </div>
           <div className="text-center space-y-3">
              <div className="w-10 h-10 bg-orange-50 text-[#F97316] rounded-lg flex items-center justify-center mx-auto text-sm font-bold shadow-sm">2</div>
              <h4 className="font-bold text-slate-800 text-sm">Teman Belanja</h4>
              <p className="text-xs text-slate-500 leading-relaxed px-4">Temanmu dapat diskon otomatis saat daftar & beli domain.</p>
           </div>
           <div className="text-center space-y-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mx-auto text-sm font-bold shadow-sm">3</div>
              <h4 className="font-bold text-slate-800 text-sm">Dapatkan Cuan</h4>
              <p className="text-xs text-slate-500 leading-relaxed px-4">Bonus masuk ke saldo Walletmu dalam 3 hari kerja.</p>
           </div>
        </div>
      </div>

      {/* --- CUSTOM CODE MODAL --- */}
      {showCustomModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCustomModal(false)}></div>
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="bg-slate-900 p-6 text-white">
              <h4 className="text-lg font-bold">Custom Kode Referral</h4>
              <p className="text-slate-400 text-xs mt-1">Branding-kan kode unikmu sendiri!</p>
            </div>
            
            <form onSubmit={handleUpdateCode} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kode Baru</label>
                <input 
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="CONTOH: DAGANGPROMO"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-bold text-slate-800 focus:border-[#F97316] transition-all outline-none"
                  autoFocus
                />
                <p className="text-[9px] text-slate-400 leading-relaxed italic">
                  * Minimal 4 karakter, maksimal 15. Hanya huruf & angka.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3">
                 <span className="material-symbols-outlined text-amber-500 text-lg shrink-0">warning</span>
                 <div>
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">Aturan Kebijakan</p>
                    <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
                       Dilarang menggunakan kata-kata kasar, SARA, atau bahasa yang tidak pantas. Admin berhak meriset kode jika melanggar ketentuan.
                    </p>
                 </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isUpdating}
                  className="flex-2 px-8 py-3 bg-[#F97316] text-white text-sm font-bold rounded-lg shadow-lg shadow-orange-900/20 hover:bg-[#EA580C] transition active:scale-95 disabled:opacity-50"
                >
                  {isUpdating ? "Memproses..." : "Simpan Kode"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Referral;
