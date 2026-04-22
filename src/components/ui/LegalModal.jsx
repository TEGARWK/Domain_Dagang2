import React from "react";

const LegalModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Overlay with blur */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-20">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="w-1.5 h-6 bg-[#F97316] rounded-full"></span>
              {data.title}
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Terakhir diperbarui: {data.lastUpdated}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10 custom-scrollbar">
          {data.sections.map((section, index) => (
            <div key={index} className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                {section.title}
              </h4>
              <p className="text-[14px] text-slate-600 leading-relaxed font-medium">
                {section.content}
              </p>
            </div>
          ))}
          
          <div className="pt-6 border-t border-slate-50">
             <p className="text-[13px] text-slate-400 font-medium leading-relaxed italic">
                Jika Anda memiliki pertanyaan mengenai {data.title} ini, silakan hubungi tim bantuan kami melalui email ke <span className="text-[#F97316] font-bold">support@domaindagang.com</span>.
             </p>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex justify-center sticky bottom-0 z-20">
          <button
            onClick={onClose}
            className="min-w-[120px] bg-slate-900 text-white h-12 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#F97316] transition-all transform active:scale-95 shadow-lg shadow-slate-200"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
