import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const EmptyDashboard = ({ wallet }) => {
  const navigate = useNavigate();
  const [isReferred, setIsReferred] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkReferral = async () => {
      try {
        const res = await api.get("/referral/check-eligibility");
        setIsReferred(res.data.eligible);
      } catch (err) {
        console.error("Gagal cek status referral:", err);
      } finally {
        setLoading(false);
      }
    };
    checkReferral();
  }, []);

  const formatRupiah = (num) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num || 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-neutral-200 rounded-xl">
        <div className="animate-spin w-8 h-8 border-4 border-neutral-200 border-t-primary-500 rounded-full mb-3" />
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Mengecek Penawaran...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-0 overflow-hidden" style={{ background: "linear-gradient(135deg, var(--color-neutral-900), #1e293b)", borderColor: "var(--color-neutral-700)" }}>
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="w-14 h-14 bg-white text-neutral-900 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="material-symbols-outlined text-3xl">{isReferred ? "card_giftcard" : "sell"}</span>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-2 mb-1">
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight uppercase">
                {isReferred ? "Potongan Harga Pertama Anda!" : "Dapatkan Diskon Domain Kamu!"}
              </h3>
              <span className={`px-2 py-0.5 border text-[9px] font-bold text-white rounded-full uppercase tracking-wider ${isReferred ? 'bg-green-500/30 border-green-500/50' : 'bg-primary-500/30 border-primary-500/50'}`}>
                {isReferred ? "Bonus Referral" : "Promo Member"}
              </span>
            </div>
            <p className="text-neutral-400 text-sm font-medium leading-relaxed max-w-xl mt-1">
              {isReferred ? (
                <>Selamat! Anda berhak mendapatkan <span className="text-primary-400 font-bold">Diskon Spesial</span> karena bergabung melalui link teman. Gunakan sekarang!</>
              ) : (
                <>Pilih nama domain impianmu hari ini dan nikmati <span className="text-primary-400 font-bold">Harga Spesial Member</span> yang lebih hemat!</>
              )}
            </p>
          </div>
          <div className="shrink-0">
            <button onClick={() => navigate("/dashboard/buy")} className="btn btn-primary">
              <span className="material-symbols-outlined">search</span>
              Cek Harga
            </button>
          </div>
        </div>
      </div>

      <div className="card text-center" style={{ background: "linear-gradient(135deg, var(--color-neutral-900), #1e293b)", borderColor: "var(--color-neutral-700)" }}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-white/5 border border-white/10 text-white/60 text-[9px] font-bold mb-4 uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            Welcome to Domain Dagang
          </div>
          <h2 className="text-2xl md:text-3xl font-black mb-2 leading-tight tracking-tight text-white">
            Halo, Calon <span className="text-primary-500">Sultan Digital!</span>
          </h2>
          <p className="text-neutral-400 mb-6 text-sm leading-relaxed font-medium">
            Mulai bangun identitas digital Anda sekarang. Amankan domain impian sebelum diambil orang lain.
          </p>
          <button onClick={() => navigate("/dashboard/buy")} className="btn btn-primary">
            <span className="material-symbols-outlined">search</span>
            Cari Nama Domain Kamu
          </button>
        </div>
      </div>

      <div onClick={() => navigate("/dashboard/wallet")} className="card flex items-center justify-between group cursor-pointer hover:border-primary-500 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-50 text-primary-500 rounded-xl flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-all">
            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Saldo Akun Anda</p>
            <h3 className="text-xl font-black text-neutral-800 tracking-tight">{formatRupiah(wallet?.balance)}</h3>
          </div>
        </div>
        <button className="btn btn-default btn-sm">
          <span className="material-symbols-outlined">add_circle</span>
          Top Up
        </button>
      </div>

      <div className="stats-grid">
        <div onClick={() => navigate("/dashboard/buy")} className="card group cursor-pointer hover:border-primary-500 transition-all">
          <div className="w-10 h-10 bg-neutral-900 text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
            <span className="material-symbols-outlined text-xl">language</span>
          </div>
          <h3 className="font-bold text-base text-neutral-900 mb-1 tracking-tight">Daftar Domain Baru</h3>
          <p className="text-xs text-neutral-400 font-medium">Beli domain .COM, .ID, dan lainnya dengan harga termurah dan aktivasi instan.</p>
        </div>
        <div onClick={() => navigate("/dashboard/transfer")} className="card group cursor-pointer hover:border-blue-500 transition-all">
          <div className="w-10 h-10 bg-neutral-900 text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
            <span className="material-symbols-outlined text-xl">move_up</span>
          </div>
          <h3 className="font-bold text-base text-neutral-900 mb-1 tracking-tight">Transfer Domain</h3>
          <p className="text-xs text-neutral-400 font-medium">Pindahkan domain Anda ke sini dan dapatkan harga perpanjangan yang lebih kompetitif.</p>
        </div>
      </div>
    </div>
  );
};

export default EmptyDashboard;
