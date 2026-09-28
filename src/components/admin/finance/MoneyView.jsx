import React, { useState } from "react";
import { formatRupiah, Breadcrumb, formatInputRupiah, parseRupiah } from "./SharedComponents";
import api from "../../../services/api";
import { toast } from "react-hot-toast";
import { ActionButton } from "../../ui/ActionBar";

const MoneyView = ({ data, onBack, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    type: "OUT", category: "Lainnya", status: "Terealisasi",
    locationId: data.locations[0]?.id || "", receiver: "", targetTransfer: "", amount: "", description: "",
  });

  const handleMutation = async () => {
    if (!formData.amount || !formData.description) return toast.error("Isi semua data mutasi bro!");
    try {
      setLoading(true);
      await api.post("/finance/mutation", {
        period_id: data.period.id, type: formData.type, category: "SAVING",
        description: `[${formData.category}] ${formData.receiver ? formData.receiver + ": " : ""}${formData.description} ${formData.targetTransfer ? "(Transfer ke: " + formData.targetTransfer + ")" : ""}`,
        nominal: parseFloat(formData.amount), location_id: formData.locationId,
        created_at: `${formData.date} ${formData.time}`,
      });
      toast.success("Mutasi uang tersedia berhasil dicatat!");
      setFormData({ ...formData, amount: "", receiver: "", targetTransfer: "", description: "" });
      if (refreshData) refreshData();
    } catch {
      toast.error("Gagal nyatet mutasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <Breadcrumb current="Detail Uang Tersedia" onBack={onBack} />

      <div className="card">
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 rounded-full bg-primary-500" />
          <div>
            <h2 className="text-sm font-bold text-neutral-800">Daftar Lokasi Uang (Money Manager)</h2>
            <p className="text-[11px] text-neutral-400">Monitoring saldo real-time di semua dompet dan bank penampung.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {data.locations.map((loc, i) => (
          <div key={i} className={`card ${loc.is_main ? "border-blue-200" : ""}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-xs font-bold text-neutral-700 mb-1">{loc.name}</h4>
                <p className="text-[11px] text-neutral-400 max-w-[300px]">
                  {loc.is_main ? "Revenue sistem otomatis masuk ke lokasi ini." : "Saldo manual / transfer dari lokasi lain."}
                </p>
              </div>
              {loc.is_main && <span className="badge badge-info">Utama</span>}
            </div>
            <p className="text-xl font-bold text-neutral-800 mb-4">{formatRupiah(loc.balance)}</p>
            <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100 pt-4">
              <div className="text-center">
                <p className="text-[10px] font-semibold text-neutral-400 uppercase mb-1">Saldo dasar</p>
                <p className="text-[11px] font-bold text-neutral-600">{formatRupiah(0)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold text-neutral-400 uppercase mb-1">Revenue</p>
                <p className="text-[11px] font-bold text-neutral-600">{formatRupiah(loc.is_main ? data.period.omset : 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold text-neutral-400 uppercase mb-1">Mutasi</p>
                <p className="text-[11px] font-bold text-neutral-600">{formatRupiah(0)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ borderLeftColor: "var(--color-blue-500)" }}>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-500 mt-0.5">info</span>
          <div>
            <h5 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">Revenue otomatis masuk ke lokasi utama</h5>
            <p className="text-[11px] text-blue-600 italic">
              Setiap transaksi revenue otomatis masuk ke lokasi utama: <strong>{data.locations.find((l) => l.is_main)?.name || "N/A"}</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 rounded-full bg-primary-500" />
          <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Tambah Mutasi Uang Tersedia</h4>
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
              <option value="Lainnya">Lainnya</option>
              <option value="Transfer Keluar">Transfer Antar Rekening</option>
              <option value="Gaji Tim">Gaji Tim</option>
              <option value="Refund">Refund Dana</option>
              <option value="Biaya Server">Biaya Server</option>
              <option value="Biaya Marketing">Biaya Marketing</option>
              <option value="Pendaftar Baru">Pendaftar Baru</option>
              <option value="Renewal">Renewal</option>
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
            <label className="form-label">Penerima</label>
            <input type="text" className="form-input" placeholder="Tim IT / Tripay" value={formData.receiver} onChange={(e) => setFormData({ ...formData, receiver: e.target.value })} />
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
              <input type="text" className="form-input" value={formatInputRupiah(formData.amount)} onChange={(e) => setFormData({ ...formData, amount: parseRupiah(e.target.value) })} placeholder="1.000.000" />
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
          <h4 className="text-xs font-bold text-neutral-700">Arus Kas Uang Tersedia</h4>
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
            {data.mutations.filter((m) => m.category === "SAVING" || m.category === "REVENUE").length > 0 ? (
              data.mutations.filter((m) => m.category === "SAVING" || m.category === "REVENUE").map((m, i) => (
                <tr key={i}>
                  <td>
                    <p className="font-semibold text-neutral-700">{new Date(m.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    <p className="text-[10px] text-neutral-400">{new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p>
                  </td>
                  <td><span className={`font-semibold ${m.type === "IN" ? "text-green-600" : "text-primary-600"}`}>{m.type === "IN" ? "Arus Masuk" : "Uang Keluar"}</span></td>
                  <td className="text-[11px] font-semibold text-neutral-700 uppercase">{m.category === "REVENUE" ? "Revenue" : (m.description.split("]")[0].replace("[", "") || "Manual")}</td>
                  <td className="font-semibold text-neutral-700">{m.category === "REVENUE" ? "Robi Gaming" : "Administrator"}</td>
                  <td className="font-semibold text-neutral-500">{m.location_name || "BCA PT ADT"}</td>
                  <td className="text-neutral-400 max-w-[200px] truncate">{m.description}</td>
                  <td style={{ textAlign: "right" }} className="font-bold text-neutral-700">{formatRupiah(Math.round(m.nominal))}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`badge ${m.category === "REVENUE" ? "badge-info" : "badge-neutral"}`}>
                      {m.category === "REVENUE" ? "Otomatis" : "Manual"}
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

export default MoneyView;
