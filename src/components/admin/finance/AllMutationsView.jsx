import React, { useState } from "react";
import { formatRupiah, Breadcrumb } from "./SharedComponents";
import api from "../../../services/api";
import { toast } from "react-hot-toast";
import { ActionButton } from "../../ui/ActionBar";

const AllMutationsView = ({ data, onBack, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    type: "IN", category: "Revenue Masuk / Settlement", status: "Terealisasi",
    source: "", locationId: data.locations[0]?.id || "", targetTransfer: "", amount: "", description: "",
  });

  const handleMutation = async () => {
    if (!formData.amount || !formData.description) return toast.error("Isi semua data mutasi bro!");
    try {
      setLoading(true);
      await api.post("/finance/mutation", {
        period_id: data.period.id,
        type: formData.type === "TRANSFER" ? "TRANSFER" : (formData.type === "Uang Masuk" ? "IN" : "OUT"),
        category: "SAVING",
        description: `[${formData.category}] ${formData.source ? formData.source + ": " : ""}${formData.description} ${formData.targetTransfer ? "(Transfer ke: " + formData.targetTransfer + ")" : ""}`,
        nominal: parseFloat(formData.amount), location_id: formData.locationId,
        created_at: `${formData.date} ${formData.time}`,
      });
      toast.success("Mutasi berhasil dicatat di Master Ledger!");
      setFormData({ ...formData, amount: "", source: "", targetTransfer: "", description: "" });
      if (refreshData) refreshData();
    } catch {
      toast.error("Gagal nyatet mutasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <Breadcrumb current="Mutasi All & Arus Kas" onBack={onBack} />

      <div className="card">
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 rounded-full bg-primary-500" />
          <div>
            <h2 className="text-sm font-bold text-neutral-800">Mutasi All & Arus Kas</h2>
            <p className="text-[11px] text-neutral-400">
              Periode {new Date(0, data.period.month - 1).toLocaleString("id-ID", { month: "long" })} {data.period.year}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 rounded-full bg-primary-500" />
          <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Tambah Mutasi Uang</h4>
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
              <option value="IN">Uang Masuk</option>
              <option value="OUT">Uang Keluar</option>
              <option value="TRANSFER">Transfer Antar Lokasi</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
              <option value="Revenue Masuk / Settlement">Revenue Masuk</option>
              <option value="Biaya Operasional">Biaya Operasional</option>
              <option value="Pajak">Pajak</option>
              <option value="Ambil Hak Bagi Hasil">Ambil Hak Bagi Hasil</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              <option value="Terealisasi">Terealisasi</option>
              <option value="Rencana">Rencana</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          </div>
        </div>
        <div className="form-row mb-4">
          <div className="form-group">
            <label className="form-label">Sumber Uang</label>
            <input type="text" className="form-input" placeholder="Tripay / PrismaLink" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} />
          </div>
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
            <input type="text" className="form-input" placeholder="Contoh: biaya operasional" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <ActionButton icon="add_circle" label={loading ? "Processing..." : "Tambah Mutasi"} onClick={handleMutation} disabled={loading} variant="primary" />
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <div>
            <h4 className="text-xs font-bold text-neutral-700">Mutasi All</h4>
            <p className="text-[11px] text-neutral-400 font-medium">Menampilkan {data.mutations.length} arus kas</p>
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
              <th style={{ textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.mutations.length > 0 ? (
              data.mutations.map((m, i) => (
                <tr key={i}>
                  <td>
                    <p className="font-semibold text-neutral-700">{new Date(m.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    <p className="text-[10px] text-neutral-400">{new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p>
                  </td>
                  <td><span className={`font-semibold ${m.type === "IN" ? "text-green-600" : "text-primary-600"}`}>{m.type === "IN" ? "Arus Masuk Sistem" : "Uang Keluar"}</span></td>
                  <td className="text-[11px] font-semibold text-neutral-700 uppercase">
                    {m.category === "REVENUE" ? "Revenue" : m.category === "DEPOSIT" ? "Top Up User" : (m.description.includes("]") ? m.description.split("]")[0].replace("[", "") : "Manual")}
                  </td>
                  <td className="font-semibold text-neutral-700">{m.category === "REVENUE" ? "Robi Permana" : "Administrator"}</td>
                  <td className="font-semibold text-neutral-500">{m.location_name || "BCA PT ADT"}</td>
                  <td className="text-neutral-400 max-w-[200px] truncate">{m.description}</td>
                  <td style={{ textAlign: "right" }} className="font-bold text-neutral-700">{formatRupiah(Math.round(m.nominal))}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`badge ${m.category === "REVENUE" || m.category === "DEPOSIT" ? "badge-info" : "badge-neutral"}`}>
                      {m.category === "REVENUE" || m.category === "DEPOSIT" ? "Otomatis" : "Manual"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="8" className="text-center py-12 text-neutral-400 text-xs font-semibold">Belum ada riwayat arus kas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllMutationsView;
