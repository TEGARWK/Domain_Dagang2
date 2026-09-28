import React, { useState } from "react";
import { formatRupiah, Breadcrumb, formatInputRupiah, parseRupiah } from "./SharedComponents";
import api from "../../../services/api";
import { toast } from "react-hot-toast";
import { ActionButton } from "../../ui/ActionBar";

const ConfigView = ({ data: initialData, onBack, onRefresh }) => {
  const [configs, setConfigs] = useState(initialData.configs || []);
  const [holders, setHolders] = useState(initialData.holders || []);
  const [locations, setLocations] = useState(initialData.locations || []);
  const [loading, setLoading] = useState(false);

  const savingTotal = configs.filter((c) => c.type === "SAVING").reduce((acc, curr) => acc + parseFloat(curr.percentage || 0), 0);
  const shareTotal = holders.reduce((acc, curr) => acc + parseFloat(curr.share_percentage || 0), 0);

  const handleConfigChange = (index, field, value) => {
    const newConfigs = [...configs];
    newConfigs[index][field] = field === "percentage" ? parseFloat(value) || 0 : value;
    setConfigs(newConfigs);
  };

  const addSavingPos = () => setConfigs([...configs, { type: "SAVING", name: "Pos Baru", percentage: 0 }]);
  const removeConfig = (index) => setConfigs(configs.filter((_, i) => i !== index));

  const handleHolderChange = (index, field, value) => {
    const newHolders = [...holders];
    newHolders[index][field] = field === "share_percentage" ? parseFloat(value) || 0 : value;
    setHolders(newHolders);
  };

  const addHolder = () => setHolders([...holders, { name: "Stakeholder Baru", share_percentage: 0 }]);
  const removeHolder = (index) => setHolders(holders.filter((_, i) => i !== index));

  const handleLocationChange = (index, field, value) => {
    const newLocations = [...locations];
    if (field === "is_main") {
      newLocations.forEach((l, i) => (l.is_main = i === index));
    } else {
      newLocations[index][field] = (field === "balance" || field === "base_balance") ? parseFloat(value) || 0 : value;
    }
    setLocations(newLocations);
  };

  const addLocation = () => setLocations([...locations, { name: "Lokasi Baru", is_main: false, balance: 0 }]);
  const removeLocation = (index) => setLocations(locations.filter((_, i) => i !== index));

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        period_id: initialData.period.id,
        configs: [...configs, ...holders.map((h) => ({ type: "DISTRIBUTION", name: h.name, percentage: h.share_percentage }))],
        locations, holders,
      };
      const response = await api.post("/finance/configs", payload);
      if (response.data.success) {
        toast.success("Konfigurasi berhasil disimpan!");
        if (onRefresh) onRefresh();
      }
    } catch {
      toast.error("Gagal menyimpan konfigurasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <Breadcrumb current="Konfigurasi Keuangan" onBack={onBack} />

      <div className="card">
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 rounded-full bg-primary-500" />
          <div>
            <h2 className="text-sm font-bold text-neutral-800">Konfigurasi Bulanan</h2>
            <p className="text-[11px] text-neutral-400">
              Periode {new Date(initialData.period.year, initialData.period.month - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {[
          { label: "Periode Aktif", val: new Date(initialData.period.year, initialData.period.month - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" }), sub: "Pengaturan dipakai untuk bulan terpilih", color: "text-neutral-800" },
          { label: "Data Saving", val: formatRupiah(initialData.period.data_saving_total), sub: "Total tersedia untuk dibayarkan", color: "text-primary-500" },
          { label: "Bagi Hasil", val: formatRupiah(initialData.period.net_profit), sub: "Total hak periode ini", color: "text-green-600" },
          { label: "Lokasi Utama", val: locations.find((l) => l.is_main)?.name || "-", sub: "Revenue otomatis masuk ke sini", color: "text-blue-600" },
        ].map((c, i) => (
          <div key={i} className="card">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">{c.label}</p>
            <p className={`text-base font-bold ${c.color} mb-1`}>{c.val}</p>
            <p className="text-[10px] text-neutral-400 italic">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="card flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary-500 mt-0.5">lightbulb</span>
          <div>
            <h4 className="text-xs font-bold text-neutral-700 mb-1">Panduan konfigurasi bulanan</h4>
            <p className="text-[11px] text-blue-600 max-w-2xl">Atur persentase Data Saving, pembagian Bagi Hasil, dan saldo dasar lokasi uang tersedia.</p>
          </div>
        </div>
        <ActionButton icon="save" label={loading ? "Menyimpan..." : "Simpan"} onClick={handleSave} disabled={loading} variant="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Data Saving */}
        <div className="card">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="text-xs font-bold text-neutral-700 mb-1">Data Saving Bulanan</h4>
              <p className="text-[11px] text-neutral-400 italic">Atur pembagian target biaya untuk tiap pos.</p>
            </div>
            <div className="bg-primary-50 text-primary-600 px-3 py-1.5 rounded-lg border border-primary-100 text-center">
              <p className="text-[9px] font-bold uppercase tracking-tighter">Total</p>
              <p className="text-xs font-bold">{savingTotal.toFixed(2)}%</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-neutral-50 rounded-full mb-2 overflow-hidden">
            <div className="h-full bg-primary-500 transition-all duration-500 rounded-full" style={{ width: `${Math.min(savingTotal, 100)}%` }} />
          </div>
          <p className="text-[10px] font-semibold text-primary-600 mb-4 italic">Total ideal 100%</p>
          <div className="space-y-3">
            {configs.filter((c) => c.type === "SAVING").map((c, i) => (
              <div key={i} className="flex gap-3 items-end pb-3 border-b border-neutral-50 last:border-0">
                <div className="flex-1 form-group">
                  <label className="form-label">Nama Pos</label>
                  <input type="text" className="form-input" value={c.name} onChange={(e) => handleConfigChange(i, "name", e.target.value)} />
                </div>
                <div className="w-20 form-group">
                  <label className="form-label">Persen</label>
                  <div className="relative">
                    <input type="number" className="form-input text-right pr-6" value={c.percentage} onChange={(e) => handleConfigChange(i, "percentage", e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-neutral-400">%</span>
                  </div>
                </div>
                <button onClick={() => removeConfig(i)} className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            ))}
            <button onClick={addSavingPos} className="w-full border-2 border-dashed border-neutral-100 p-3 rounded-lg text-[11px] font-bold text-neutral-400 hover:border-primary-200 hover:text-primary-500 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">add_circle</span> Tambah Pos
            </button>
          </div>
        </div>

        {/* Bagi Hasil */}
        <div className="card">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="text-xs font-bold text-neutral-700 mb-1">Bagi Hasil Pengelola</h4>
              <p className="text-[11px] text-neutral-400 italic">Atur porsi pembagian keuntungan bersih.</p>
            </div>
            <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg border border-green-100 text-center">
              <p className="text-[9px] font-bold uppercase tracking-tighter">Total</p>
              <p className="text-xs font-bold">{shareTotal.toFixed(2)}%</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-neutral-50 rounded-full mb-2 overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-500 rounded-full" style={{ width: `${Math.min(shareTotal, 100)}%` }} />
          </div>
          <p className="text-[10px] font-semibold text-green-600 mb-4 italic">Total ideal 100%</p>
          <div className="space-y-3">
            {holders.map((h, i) => (
              <div key={i} className="flex gap-3 items-end pb-3 border-b border-neutral-50 last:border-0">
                <div className="flex-1 form-group">
                  <label className="form-label">Stakeholder</label>
                  <input type="text" className="form-input" value={h.name} onChange={(e) => handleHolderChange(i, "name", e.target.value)} />
                </div>
                <div className="w-20 form-group">
                  <label className="form-label">Persen</label>
                  <div className="relative">
                    <input type="number" className="form-input text-right pr-6" value={h.share_percentage} onChange={(e) => handleHolderChange(i, "share_percentage", e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-neutral-400">%</span>
                  </div>
                </div>
                <button onClick={() => removeHolder(i)} className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            ))}
            <button onClick={addHolder} className="w-full border-2 border-dashed border-neutral-100 p-3 rounded-lg text-[11px] font-bold text-neutral-400 hover:border-green-200 hover:text-green-600 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">add_circle</span> Tambah Stakeholder
            </button>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 rounded-full bg-blue-500" />
          <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Uang Tersedia (Money Manager)</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {locations.map((l, i) => (
            <div key={i} className={`card ${l.is_main ? "bg-blue-50/30 border-blue-200" : ""}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h5 className="text-xs font-bold text-neutral-700 mb-1">{l.name}</h5>
                  <p className="text-[10px] text-neutral-400 italic">{l.is_main ? "Menerima revenue otomatis" : "Lokasi cadangan"}</p>
                </div>
                {l.is_main && <span className="badge badge-info">Lokasi Utama</span>}
              </div>
              <div className="flex gap-3 items-end mb-4">
                <div className="flex-1 form-group">
                  <label className="form-label">Nama Lokasi</label>
                  <input type="text" className="form-input" value={l.name} onChange={(e) => handleLocationChange(i, "name", e.target.value)} />
                </div>
                <div className="w-32 form-group">
                  <label className="form-label text-right">Saldo Dasar</label>
                  <div className="input-icon-wrap">
                    <span className="material-symbols-outlined">payments</span>
                    <input type="text" className="form-input text-right" value={formatInputRupiah(l.balance)} onChange={(e) => handleLocationChange(i, "balance", parseRupiah(e.target.value))} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!l.is_main && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleLocationChange(i, "is_main", true)}>Jadikan Utama</button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => removeLocation(i)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addLocation} className="border-2 border-dashed border-neutral-100 p-4 rounded-lg text-[11px] font-bold text-neutral-400 hover:border-primary-200 hover:text-primary-500 transition-all flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-sm">add_circle</span> Tambah Lokasi Baru
        </button>
        <div className="border-t border-neutral-100 pt-4 flex justify-between items-center">
          <p className="text-[11px] text-neutral-400 italic">Simpan perubahan untuk periode ini.</p>
          <ActionButton icon="save" label={loading ? "Menyimpan..." : "Simpan Konfigurasi"} onClick={handleSave} disabled={loading} variant="primary" />
        </div>
      </div>
    </div>
  );
};

export default ConfigView;
