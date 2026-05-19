import React from "react";

export const formatRupiah = (num) => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);
};

// Format untuk input (tanpa Rp, hanya titik ribuan)
export const formatInputRupiah = (value) => {
  if (!value && value !== 0) return "";
  const stringValue = value.toString().replace(/\D/g, "");
  return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Mengubah format input kembali ke angka murni
export const parseRupiah = (value) => {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/\./g, "")) || 0;
};

export const Breadcrumb = ({ current, onBack }) => (
  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-6 uppercase tracking-widest font-bold">
    <span className="material-symbols-outlined text-sm cursor-pointer hover:text-orange-600 transition-all" onClick={onBack}>home</span>
    <span className="cursor-pointer hover:text-orange-600 transition-all" onClick={onBack}>Keuangan</span>
    <span className="material-symbols-outlined text-[10px]">chevron_right</span>
    <span className="text-slate-600">{current}</span>
  </div>
);

export const WalletPreview = ({ locations, onSeeDetail }) => (
  <div className="bg-blue-50/20 border border-blue-100 p-6 rounded-2xl mb-6">
     <div className="flex justify-between items-center mb-6">
        <div>
           <h4 className="font-bold text-slate-800 text-sm">Preview Lokasi Uang Tersedia</h4>
           <p className="text-[10px] text-slate-500 font-medium italic">Gunakan ringkasan ini untuk memantau sebaran saldo real-time.</p>
        </div>
        <button className="text-[10px] font-bold text-blue-600 bg-white px-4 py-2 rounded-xl border border-blue-100 shadow-sm hover:bg-blue-50 transition-all" onClick={onSeeDetail}>Lihat detail uang tersedia</button>
     </div>
     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {locations.map(l => (
           <div key={l.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative group overflow-hidden">
              <p className="text-[9px] font-bold text-slate-800 mb-2 flex items-center justify-between">
                {l.name}
                {l.is_main && <span className="bg-blue-50 text-blue-600 text-[7px] px-1.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-tighter">Utama</span>}
              </p>
              <h3 className="text-base font-bold text-slate-900 mb-1">{formatRupiah(l.balance)}</h3>
              <p className="text-[8px] font-semibold text-slate-400 uppercase italic">Saldo Dasar Rp 0</p>
           </div>
        ))}
     </div>
  </div>
);
