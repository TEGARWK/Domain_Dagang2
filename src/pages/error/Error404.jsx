import React from "react";
import { Link } from "react-router-dom";

const Error404 = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center font-sans overflow-hidden relative">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#F97316] rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob animation-delay-2000"></div>

      <div className="relative z-10 max-w-lg w-full">
        {/* 404 Big Text */}
        <h1 className="text-[150px] font-bold text-slate-900 leading-none tracking-tighter select-none drop-shadow-sm">
          4<span className="text-[#F97316]">0</span>4
        </h1>
        
        <div className="bg-white/50 backdrop-blur-sm border border-white/60 p-8 rounded-xl shadow-xl mt-[-20px] relative z-20">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            Oops! Sepertinya Anda tersesat di antah berantah. Domain yang Anda cari mungkin sudah expired atau memang tidak pernah ada.
          </p>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-[#F97316] hover:shadow-lg hover:shadow-orange-200 transition-all duration-300 transform hover:-translate-y-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Kembali ke Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Error404;
