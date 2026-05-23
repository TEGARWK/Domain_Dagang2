import React from "react";
import { Link } from "react-router-dom";

const Error404 = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-orange-100 to-transparent rounded-full blur-[120px] opacity-40"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-tl from-blue-50 to-transparent rounded-full blur-[120px] opacity-40"></div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Modern 404 Header */}
        <div className="mb-8 relative inline-block">
          <h1 className="text-[120px] sm:text-[180px] font-bold text-slate-900 leading-none tracking-tight select-none opacity-[0.03] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
            404
          </h1>
          <div className="relative flex items-center justify-center gap-4">
            <span className="text-6xl sm:text-8xl font-bold text-slate-900">4</span>
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-[#F97316] rounded-xl rotate-12 flex items-center justify-center shadow-xl shadow-orange-200">
               <span className="text-white text-4xl sm:text-6xl font-bold -rotate-12">0</span>
            </div>
            <span className="text-6xl sm:text-8xl font-bold text-slate-900">4</span>
          </div>
        </div>
        
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed text-lg">
            Maaf, halaman yang Anda tuju tidak tersedia atau telah dipindahkan. Pastikan alamat URL sudah benar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-full font-bold hover:from-[#F97316] hover:to-[#EA580C] transition-all duration-500 group shadow-lg shadow-slate-200 hover:shadow-orange-200 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Kembali ke Beranda
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-full font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 whitespace-nowrap shadow-sm"
            >
              Laporkan Masalah
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Error404;
