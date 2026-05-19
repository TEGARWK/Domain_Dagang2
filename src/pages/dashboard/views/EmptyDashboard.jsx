import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const EmptyDashboard = ({ wallet }) => {
  const navigate = useNavigate();
  const [isReferred, setIsReferred] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkReferralStatus = async () => {
      try {
        const res = await api.get("/referral/check-eligibility");
        setIsReferred(res.data.eligible);
      } catch (err) {
        console.error("Gagal cek status referral:", err);
      } finally {
        setLoading(false);
      }
    };
    checkReferralStatus();
  }, []);

  // Helper Format Rupiah
  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/5 rounded-2xl border-2 border-dashed border-slate-200">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full mb-2"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Mengecek Penawaran...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-[fadeIn_0.5s_ease-out]">
      {/* Redesigned Discount / Referral Banner */}
      <div className="relative group overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-95 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-[80px] animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          {/* Icon Badge */}
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative w-16 h-16 bg-white text-slate-900 rounded-2xl flex items-center justify-center shadow-2xl transform group-hover:rotate-6 transition-transform duration-500">
              <span className="material-symbols-outlined text-4xl">
                {isReferred ? "card_giftcard" : "sell"}
              </span>
            </div>
          </div>

          {/* New Text Content - Focused on Discount */}
          <div className="flex-1 text-center md:text-left space-y-1">
            <div className="flex flex-col md:flex-row items-center gap-2 mb-1">
               <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
                 {isReferred ? "Potongan Harga Pertama Anda! 🎁" : "Dapatkan Diskon Domain Kamu! 🏷️"}
               </h3>
               <span className={`px-2 py-0.5 border text-[9px] font-bold text-white rounded-full uppercase tracking-widest backdrop-blur-sm ${isReferred ? 'bg-green-500/30 border-green-500/50' : 'bg-orange-500/30 border-orange-500/50'}`}>
                 {isReferred ? "Bonus Referral" : "Promo Member"}
               </span>
            </div>
            
            <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed max-w-xl">
              {isReferred ? (
                <>Selamat! Anda berhak mendapatkan <span className="text-orange-400 font-bold underline">Diskon Spesial</span> karena bergabung melalui link teman. Gunakan sekarang sebelum masa berlaku habis!</>
              ) : (
                <>Pilih nama domain impianmu hari ini dan nikmati <span className="text-orange-400 font-bold">Harga Spesial Member</span> yang lebih hemat untuk pendaftaran pertama Anda!</>
              )}
            </p>
          </div>

          {/* Action Button */}
          <div className="shrink-0">
            <button 
              onClick={() => navigate("/dashboard/buy")}
              className="px-6 py-4 bg-white text-slate-900 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all shadow-lg shadow-white/10 flex items-center gap-2 group/btn"
            >
              Cek Harga Diskon
              <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 md:p-8 text-center text-white relative overflow-hidden shadow-2xl border border-slate-700/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]"></div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/5 border border-white/10 text-white/80 text-[10px] font-bold mb-6 uppercase tracking-[0.2em] backdrop-blur-md">
            🚀 Welcome to Domain Dagang
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight tracking-tight">
            Halo, Calon <span className="text-orange-500">Sultan Digital!</span>
          </h2>
          <p className="text-slate-400 mb-8 text-sm md:text-base leading-relaxed font-medium">
            Mulai bangun identitas digital Anda sekarang. Amankan domain impian <br className="hidden md:block" /> 
            sebelum diambil orang lain dan nikmati kemudahan kelola domain dalam satu tempat.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate("/dashboard/buy")}
              className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black hover:bg-white hover:text-slate-900 transition-all duration-300 shadow-2xl shadow-orange-500/40 flex items-center justify-center gap-3 transform hover:-translate-y-1 active:scale-95"
            >
              <span className="material-symbols-outlined">search</span>
              Cari Nama Domain Kamu
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Summary */}
      <div 
        onClick={() => navigate("/dashboard/wallet")}
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl flex items-center justify-between group cursor-pointer hover:border-orange-500 transition-all duration-500"
      >
        <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all duration-500 shadow-inner">
                <span className="material-symbols-outlined text-3xl font-bold text-inherit">account_balance_wallet</span>
            </div>
            <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Saldo Akun Anda</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatRupiah(wallet?.balance)}</h3>
            </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-900 rounded-lg font-bold text-xs uppercase tracking-widest group-hover:bg-orange-500 group-hover:text-white transition-all">
            Top Up
            <span className="material-symbols-outlined text-sm font-bold group-hover:translate-x-1 transition-transform">add_circle</span>
        </button>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg hover:border-orange-500 transition-all duration-500 group cursor-pointer relative overflow-hidden"
          onClick={() => navigate("/dashboard/buy")}
        >
          <div className="relative z-10">
            <div className="w-14 h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center mb-5 group-hover:bg-orange-500 transition-colors shadow-lg">
              <span className="material-symbols-outlined text-3xl">language</span>
            </div>
            <h3 className="font-black text-xl text-slate-900 mb-2 tracking-tight">Daftar Domain Baru</h3>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">Beli domain .COM, .ID, dan lainnya dengan harga termurah dan aktivasi instan.</p>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg hover:border-blue-500 transition-all duration-500 group cursor-pointer relative overflow-hidden"
          onClick={() => navigate("/dashboard/transfer")}
        >
          <div className="relative z-10">
            <div className="w-14 h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-500 transition-colors shadow-lg">
              <span className="material-symbols-outlined text-3xl">move_up</span>
            </div>
            <h3 className="font-black text-xl text-slate-900 mb-2 tracking-tight">Transfer Domain</h3>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">Pindahkan domain Anda ke sini dan dapatkan harga perpanjangan yang lebih kompetitif.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyDashboard;
