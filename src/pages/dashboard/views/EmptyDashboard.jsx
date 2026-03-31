import React from "react";
import { useNavigate } from "react-router-dom";

const EmptyDashboard = ({ wallet }) => {
  const navigate = useNavigate();

  // Helper Format Rupiah
  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num || 0);
  };


  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F97316] rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30 text-xs font-bold mb-6">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Welcome Aboard!
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            Halo, Calon Sultan Digital!
          </h2>
          <p className="text-slate-400 mb-8 text-sm md:text-base leading-relaxed">
            Dashboard Anda masih kosong nih. Amankan nama domain impian Anda
            sekarang sebelum diambil orang lain.
          </p>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate("/dashboard/buy")}
              className="group bg-[#F97316] text-white px-10 py-4 rounded-xl font-bold hover:bg-white hover:text-slate-900 transition-all duration-300 shadow-2xl shadow-orange-500/30 flex items-center justify-center gap-3 transform hover:-translate-y-1 active:scale-95 border-2 border-transparent hover:border-orange-500"
            >
              <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">add_shopping_cart</span>
              Cari & Beli Domain Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Balance Card for Empty State */}
      <div 
        onClick={() => navigate("/dashboard/wallet")}
        className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-[#F97316] transition-all"
      >
        <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-orange-50 text-[#F97316] rounded-lg flex items-center justify-center group-hover:bg-[#F97316] group-hover:text-white transition-all">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            </div>
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Saldo Tersedia</p>
                <h3 className="text-2xl font-bold text-slate-800">{formatRupiah(wallet?.balance)}</h3>
            </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[#F97316] font-bold text-sm">
            Top Up Saldo
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
        </div>
      </div>

      {/* Promo Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm hover:border-orange-200 transition group cursor-pointer"
          onClick={() => navigate("/dashboard/buy")}
        >
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <h3 className="font-bold text-lg text-slate-900 mb-2">
            Harga Terbaik
          </h3>
          <p className="text-slate-500 text-sm">
            Domain .COM hanya Rp 145rb/tahun. Aktif instan tanpa ribet.
          </p>
        </div>
        <div
          className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm hover:border-orange-200 transition group cursor-pointer"
          onClick={() => navigate("/dashboard/transfer")}
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <h3 className="font-bold text-lg text-slate-900 mb-2">
            Punya Domain?
          </h3>
          <p className="text-slate-500 text-sm">
            Transfer domain lama Anda ke sini. Kami bantu teknisnya sampai
            beres.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyDashboard;
