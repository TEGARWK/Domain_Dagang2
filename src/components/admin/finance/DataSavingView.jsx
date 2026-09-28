import React, { useState } from "react";
import { formatRupiah, Breadcrumb, WalletPreview } from "./SharedComponents";
import api from "../../../services/api";
import { toast } from "react-hot-toast";
import { ActionButton } from "../../ui/ActionBar";

const DataSavingView = ({ data, onBack, setActiveTab, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    type: "OUT",
    category: "Pajak",
    status: "Terealisasi",
    locationId: data.locations[0]?.id || "",
    amount: "",
    targetTransfer: "",
    description: "",
  });

  const handleMutation = async () => {
    if (!formData.amount || !formData.description) return toast.error("Isi semua data mutasi bro!");
    try {
      setLoading(true);
      await api.post("/finance/mutation", {
        period_id: data.period.id, type: formData.type, category: "SAVING",
        description: `[${formData.category}] ${formData.description} (Transfer ke: ${formData.targetTransfer})`,
        nominal: parseFloat(formData.amount), location_id: formData.locationId,
        created_at: `${formData.date} ${formData.time}`,
      });
      toast.success("Mutasi data saving berhasil dicatat!");
      setFormData({ ...formData, amount: "", description: "" });
      if (refreshData) refreshData();
    } catch {
      toast.error("Gagal nyatet mutasi. Coba lagi bro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <Breadcrumb current="Detail Data Saving" onBack={onBack} />

      <div className="card">
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 rounded-full bg-primary-500" />
          <div>
            <h2 className="text-sm font-bold text-neutral-800">Detail Data Saving</h2>
            <p className="text-[11px] text-neutral-400">
              Periode {new Date(0, data.period.month - 1).toLocaleString("id-ID", { month: "long" })} {data.period.year}
            </p>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {[
          { label: "Uang Tersedia", val: data.period.data_saving_total, color: "text-primary-500" },
          { label: "Sudah Dibayar", val: 0, color: "text-green-600" },
          { label: "Rencana", val: 0, color: "text-amber-600" },
          { label: "Sisa", val: data.period.data_saving_total, color: "text-rose-600" },
        ].map((c, i) => (
          <div key={i} className="card">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">{c.label}</p>
            <p className={`text-base font-bold ${c.color}`}>{formatRupiah(Math.round(c.val))}</p>
          </div>
        ))}
      </div>

      <WalletPreview locations={data.locations} onSeeDetail={() => setActiveTab("money")} />

      {/* Detail Table */}
      <div className="table-wrap">
        <div className="table-header">
          <h4 className="text-xs font-bold text-neutral-700">Detail Data Saving</h4>
        </div>
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th style={{ textAlign: "center" }}>Persen</th>
              <th style={{ textAlign: "right" }}>Uang Tersedia</th>
              <th style={{ textAlign: "right" }}>Sudah Dibayar</th>
              <th style={{ textAlign: "right" }}>Rencana</th>
              <th style={{ textAlign: "right" }}>Sisa</th>
            </tr>
          </thead>
          <tbody>
            {data.configs.filter((c) => c.type === "SAVING").map((c, i) => {
              const nominal = (parseFloat(c.percentage) / 100) * parseFloat(data.period.omset);
              return (
                <tr key={i}>
                  <td className="font-semibold text-neutral-700">{c.name}</td>
                  <td style={{ textAlign: "center" }} className="text-neutral-400 italic">{c.percentage}%</td>
                  <td style={{ textAlign: "right" }}>{formatRupiah(Math.round(nominal))}</td>
                  <td style={{ textAlign: "right" }} className="text-neutral-300">Rp 0</td>
                  <td style={{ textAlign: "right" }} className="text-neutral-300">Rp 0</td>
                  <td style={{ textAlign: "right" }} className="font-bold text-primary-500">{formatRupiah(Math.round(nominal))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tambah Mutasi Form */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 rounded-full bg-primary-500" />
          <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Tambah Mutasi Data Saving</h4>
        </div>
        <div className="form-row mb-4">
          <div className="form-group">
            <label className="form-label">Tanggal</label>
            <input type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Jam</label>
            <input type="time" className="form-input" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Arah</label>
            <select className="form-select" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
              <option value="OUT">Uang Keluar</option>
              <option value="IN">Uang Masuk</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
              <option value="Pajak">Pajak</option>
              <option value="Operasional">Operasional</option>
              <option value="Zakat">Zakat</option>
              <option value="Marketing">Marketing</option>
              <option value="Affiliasi">Affiliasi</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              <option value="Rencana">Rencana</option>
              <option value="Terealisasi">Terealisasi</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          </div>
        </div>
        <div className="form-row mb-4">
          <div className="form-group">
            <label className="form-label">Lokasi Utama</label>
            <select className="form-select" value={formData.locationId} onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}>
              {data.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tujuan Transfer</label>
            <input type="text" className="form-input" placeholder="Khusus transfer" value={formData.targetTransfer} onChange={(e) => setFormData({ ...formData, targetTransfer: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Nominal</label>
            <div className="input-icon-wrap">
              <span className="material-symbols-outlined">payments</span>
              <input type="number" className="form-input" placeholder="1.000.000" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-end mb-4">
          <div className="flex-1 form-group">
            <label className="form-label">Keterangan</label>
            <input type="text" className="form-input" placeholder="Contoh: biaya operasional / transfer antar rekening" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <ActionButton icon="add_circle" label={loading ? "Processing..." : "Tambah Mutasi"} onClick={handleMutation} disabled={loading} variant="primary" />
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-xs font-bold text-green-700 mb-1 flex items-center gap-2">Terkait Data Saving</p>
          <p className="text-[11px] text-green-600 italic leading-relaxed">
            Pilih kategori pos seperti Pajak, Marketing, atau Operasional. Mutasi akan muncul di Mutasi All dan detail Data Saving.
          </p>
        </div>
      </div>

      {/* Arus Kas Table */}
      <div className="table-wrap">
        <div className="table-header">
          <div>
            <h4 className="text-xs font-bold text-neutral-700">Arus Kas Khusus Data Saving</h4>
            <p className="text-[11px] text-neutral-400 italic">Alokasi revenue otomatis serta pembayaran dari pos Data Saving</p>
          </div>
        </div>
        <div className="p-4 border-b border-neutral-50">
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Cari</label>
              <input type="text" className="form-input" placeholder="Cari kategori, penerima, lokasi..." />
            </div>
            <div className="form-group">
              <label className="form-label">Arah</label>
              <select className="form-select"><option>Semua arah</option></select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select"><option>Semua status</option></select>
            </div>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select className="form-select"><option>Semua kategori</option></select>
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tanggal & Jam</th>
              <th>Arah</th>
              <th>Kategori</th>
              <th>Penerima/Sumber</th>
              <th>Lokasi</th>
              <th>Keterangan</th>
              <th style={{ textAlign: "right" }}>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {data.mutations.filter((m) => m.category === "SAVING" || m.category === "REVENUE").length > 0 ? (
              data.mutations.filter((m) => m.category === "SAVING" || m.category === "REVENUE").map((m, i) => (
                <tr key={i}>
                  <td>
                    <p className="font-semibold text-neutral-700">{new Date(m.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    <p className="text-[10px] text-neutral-400">{new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p>
                  </td>
                  <td><span className={`font-semibold ${m.type === "IN" ? "text-green-600" : "text-primary-600"}`}>{m.type === "IN" ? "Alokasi Revenue" : "Penggunaan Dana"}</span></td>
                  <td className="uppercase text-[11px] font-semibold text-neutral-500">{m.category}</td>
                  <td className="font-semibold text-neutral-700">{m.type === "IN" ? "Robi Gaming" : (m.description.split("]")[0].replace("[", "") || "-")}</td>
                  <td className="font-semibold text-neutral-500 uppercase">{m.location_name || "BCA PT ADT"}</td>
                  <td className="text-neutral-400 max-w-[200px] truncate">{m.description}</td>
                  <td style={{ textAlign: "right" }} className="font-bold text-neutral-700">{formatRupiah(Math.round(m.nominal))}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className="text-center py-12 text-neutral-400 text-xs font-semibold">Data mutasi tidak ditemukan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataSavingView;
