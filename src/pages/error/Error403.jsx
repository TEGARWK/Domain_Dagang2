import React from "react";
import { Link } from "react-router-dom";

const Error403 = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center font-sans overflow-hidden relative">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-red-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-pulse"></div>

      <div className="relative z-10 max-w-lg w-full">
        {/* Icon Lock */}
        <div className="w-24 h-24 bg-red-500/10 rounded-lg flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          Akses Ditolak
        </h1>
        <p className="text-slate-400 font-medium mb-8 leading-relaxed max-w-md mx-auto">
          Maaf, Anda tidak memiliki izin untuk masuk ke area ini. <br/>Halaman ini khusus untuk user dengan akses tertentu (VIP/Admin).
        </p>

        <div className="flex gap-4 justify-center">
            <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-200 transition-all duration-300"
            >
                Ke Dashboard
            </Link>
            <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-700 text-slate-300 rounded-lg font-bold hover:bg-slate-800 transition-all duration-300"
            >
                Halaman Utama
            </Link>
        </div>
      </div>
    </div>
  );
};

export default Error403;
