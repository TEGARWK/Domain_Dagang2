import React from "react";
import { Link } from "react-router-dom";

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-bl from-blue-50 to-transparent rounded-full blur-[120px] opacity-60"></div>
      
      <div className="relative z-10 max-w-2xl w-full">
        {/* Modern Coming Soon Header */}
        <div className="mb-10 relative inline-block">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto border border-blue-100 shadow-2xl shadow-blue-100 animate-float">
             <span className="material-symbols-outlined text-5xl sm:text-7xl text-blue-500">rocket_launch</span>
          </div>
        </div>
        
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
            Segera Hadir
          </h2>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed text-lg">
            Kami sedang mempersiapkan sesuatu yang luar biasa untuk Anda. Fitur ini akan segera tersedia di platform kami. Tetap pantau ya!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-full font-bold hover:from-blue-600 hover:to-blue-700 transition-all duration-500 group shadow-lg shadow-slate-200 hover:shadow-blue-200 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg">home</span>
              Kembali ke Beranda
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-full font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 whitespace-nowrap shadow-sm"
            >
              Hubungi Kami
            </Link>
          </div>

          <div className="mt-12">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Pengerjaan: 85%</span>
             </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ComingSoon;
