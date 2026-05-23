import React from "react";
import { Link } from "react-router-dom";

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-orange-50 to-transparent rounded-full blur-[120px] opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-tl from-blue-50 to-transparent rounded-full blur-[120px] opacity-60"></div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Modern Maintenance Header */}
        <div className="mb-10 relative inline-block">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-orange-50 rounded-xl flex items-center justify-center mx-auto border border-orange-100 shadow-xl shadow-orange-100 animate-pulse rotate-6">
             <span className="material-symbols-outlined text-5xl sm:text-7xl text-[#F97316]">engineering</span>
          </div>
        </div>
        
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
            Pembaruan Sistem
          </h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed text-lg">
            Kami sedang melakukan pemeliharaan rutin untuk meningkatkan layanan kami. Kami akan kembali dalam beberapa saat. Terima kasih atas kesabaran Anda.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/6281222429289"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-full font-bold hover:from-[#F97316] hover:to-[#EA580C] transition-all duration-500 group shadow-lg shadow-slate-200 hover:shadow-orange-200 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg">support_agent</span>
              Hubungi Dukungan
            </a>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-full font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 whitespace-nowrap shadow-sm"
            >
              Cek Halaman Utama
            </Link>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-4 opacity-30">
             <div className="h-[1px] w-12 bg-slate-400"></div>
             <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Estimasi Selesai: 30 Menit</p>
             <div className="h-[1px] w-12 bg-slate-400"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
