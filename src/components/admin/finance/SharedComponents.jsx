import React from "react";

export const formatRupiah = (num) => {
  const value = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(value || 0);
};

export const formatInputRupiah = (value) => {
  if (!value && value !== 0) return "";
  return value.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const parseRupiah = (value) => {
  if (!value) return 0;
  return parseFloat(value.toString().replace(/\./g, "")) || 0;
};

export const Breadcrumb = ({ current, onBack }) => (
  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mb-5 uppercase tracking-wider font-bold">
    <span className="material-symbols-outlined text-sm cursor-pointer hover:text-primary-500 transition-all" onClick={onBack}>home</span>
    <span className="cursor-pointer hover:text-primary-500 transition-all" onClick={onBack}>Keuangan</span>
    <span className="material-symbols-outlined text-xs text-neutral-300">chevron_right</span>
    <span className="text-neutral-600">{current}</span>
  </div>
);

export const WalletPreview = ({ locations, onSeeDetail }) => (
  <div className="card">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-blue-500" />
        <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Preview Lokasi Uang Tersedia</h4>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onSeeDetail}>Lihat detail</button>
    </div>
    <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
      {locations.map((l) => (
        <div key={l.id} className="card">
          <p className="text-[11px] font-bold text-neutral-700 mb-2 flex items-center justify-between">
            {l.name}
            {l.is_main && <span className="badge badge-info text-[9px]">Utama</span>}
          </p>
          <p className="text-base font-bold text-neutral-800">{formatRupiah(l.balance)}</p>
        </div>
      ))}
    </div>
  </div>
);
