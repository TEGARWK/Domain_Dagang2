import React from "react";
import { Link } from "react-router-dom";

const Error500 = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-orange-50 to-transparent rounded-full blur-[120px] opacity-60"></div>
      
      <div className="relative z-10 max-w-2xl w-full">
        {/* Modern 500 Header */}
        <div className="mb-10 relative inline-block">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-orange-50 rounded-xl flex items-center justify-center mx-auto border border-orange-100 shadow-xl shadow-orange-100 animate-bounce">
             <span className="material-symbols-outlined text-5xl sm:text-7xl text-[#F97316]">settings_slow_motion</span>
          </div>
        </div>
        
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
            Gangguan Sistem
          </h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed text-lg">
            Mohon maaf, sistem kami sedang mengalami gangguan teknis. Tim kami sedang bekerja untuk menanganinya. Silakan coba segarkan halaman.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-full font-bold hover:from-[#F97316] hover:to-[#EA580C] transition-all duration-500 group shadow-lg shadow-slate-200 hover:shadow-orange-200 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg group-hover:rotate-180 transition-transform duration-700">refresh</span>
              Segarkan Halaman
            </button>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-full font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 whitespace-nowrap shadow-sm"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Error500;
