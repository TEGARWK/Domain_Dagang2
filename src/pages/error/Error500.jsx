import React from "react";
import { Link } from "react-router-dom";

const Error500 = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center font-sans overflow-hidden">
      
      <div className="relative z-10 max-w-lg w-full">
        {/* Illustration */}
        <div className="relative w-40 h-40 mx-auto mb-6">
            <div className="absolute inset-0 bg-yellow-400 rounded-full blur-[40px] opacity-20 animate-pulse"></div>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-yellow-500 relative z-10" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
          Server Bermasalah
        </h1>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
          Waduh! Server kami sedang mengalami gangguan teknis (Internal Server Error). <br/>
          Tim kami sedang memperbaikinya. Silakan coba lagi nanti.
        </p>

        <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#F97316] text-white rounded-lg font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all duration-300 transform hover:-translate-y-1 mb-4"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v3.27a1 1 0 01-2 0V13.1a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh Halaman
        </button>
        
        <div>
            <Link to="/" className="text-sm font-bold text-slate-400 hover:text-slate-600 transition">
                Kembali ke Home
            </Link>
        </div>
      </div>
    </div>
  );
};

export default Error500;
