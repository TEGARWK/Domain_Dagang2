import React, { useState } from "react";
import { formatRupiah, Breadcrumb, WalletPreview } from "./SharedComponents";
import api from "../../../services/api";
import { toast } from "react-hot-toast";
import { ActionButton } from "../../ui/ActionBar";

const ProfitShareView = ({ data, onBack, setActiveTab, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    type: "OUT", holderId: data.holders[0]?.id || "", status: "Terealisasi",
    locationId: data.locations[0]?.id || "", amount: "", targetTransfer: "", description: "",
  });

  const totalTaken = data.holders.reduce((acc, h) => acc + parseFloat(h.total_taken || 0), 0);
  const totalBalance = data.holders.reduce((acc, h) => acc + parseFloat(h.balance || 0), 0);

  const handleWithdraw = async () => {
    if (!formData.amount || !formData.description) return toast.error("Isi semua data penarikan bro!");
    try {
      setLoading(true);
      const selectedHolder = data.holders.find((h) => h.id == formData.holderId);
      await api.post("/finance/mutation", {
        period_id: data.period.id, type: formData.type, category: "PROFIT_SHARE",
        description: `[TARIK HAK] ${selectedHolder?.name}: ${formData.description} (Transfer ke: ${formData.targetTransfer})`,
        nominal: parseFloat(formData.amount), location_id: formData.locationId,
        created_at: `${formData.date} ${formData.time}`,
      });
      toast.success("Mutasi bagi hasil berhasil dicatat!");
      setFormData({ ...formData, amount: "", targetTransfer: "", description: "" });
      if (refreshData) refreshData();
    } catch {
      toast.error("Gagal nyatet mutasi. Coba lagi bro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <Breadcrumb current="Detail Bagi Hasil Pengelola" onBack={onBack} />

      <div className="card">
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 rounded-full bg-primary-500" />
          <div>
            <h2 className="text-sm font-bold text-neutral-800">Detail Bagi Hasil Pengelola</h2>
            <p className="text-[11px] text-neutral-400">
              Periode {new Date(0, data.period.month - 1).toLocaleString("id-ID", { month: "long" })} {data.period.year}
            </p>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {[
          { label: "Saldo Awal", val: 15056, color: "text-neutral-600" },
          { label: "Hak Bulan Ini", val: data.period.net_profit, color: "text-green-600" },
          { label: "Sudah Diambil", val: totalTaken, color: "text-blue-600" },
          { label: "Belum Diambil", val: totalBalance, color: "text-primary-500" },
        ].map((c, i) => (
          <div key={i} className="card">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">{c.label}</p>
            <p className={`text-base font-bold ${c.color}`}>{formatRupiah(Math.round(c.val))}</p>
          </div>
        ))}
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {data.holders.map((h, i) => (
          <div key={i} className="card hover:border-primary-200 transition-all">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">{h.name}</p>
            <p className="text-lg font-bold text-primary-500 mb-1">{formatRupiah(Math.round(h.balance))}</p>
            <p className="text-[10px] text-neutral-400 italic">Total hak {formatRupiah(Math.round(h.current_month_right))} - diambil {formatRupiah(Math.round(h.total_taken))}</p>
          </div>
        ))}
      </div>

      <WalletPreview locations={data.locations} onSeeDetail={() => setActiveTab("money")} />

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 rounded-full bg-primary-500" />
          <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Tambah Mutasi Bagi Hasil</h4>
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
            <label className="form-label">Penerima</label>
            <select className="form-select" value={formData.holderId} onChange={(e) => setFormData({ ...formData, holderId: e.target.value })}>
              {data.holders.map((h) => <option key={h.id} value={h.id}>Ambil Hak {h.name}</option>)}
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
            <input type="text" className="form-input" placeholder="Contoh: biaya operasional" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <ActionButton icon="add_circle" label={loading ? "Processing..." : "Tambah Mutasi"} onClick={handleWithdraw} disabled={loading} variant="primary" />
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-xs font-bold text-green-700 mb-1">Terkait Bagi Hasil</p>
          <p className="text-[11px] text-green-600 italic">Pilih kategori penerima seperti PT, Tim IT, atau Investor.</p>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <h4 className="text-xs font-bold text-neutral-700">Arus Kas Khusus Bagi Hasil</h4>
        </div>
        <div className="p-4 border-b border-neutral-50">
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label">Cari</label>
              <input type="text" className="form-input" placeholder="Cari kategori, penerima..." />
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
            {data.mutations.filter((m) => m.category === "PROFIT_SHARE" || m.category === "REVENUE").length > 0 ? (
              data.mutations.filter((m) => m.category === "PROFIT_SHARE" || m.category === "REVENUE").map((m, i) => (
                <tr key={i}>
                  <td>
                    <p className="font-semibold text-neutral-700">{new Date(m.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    <p className="text-[10px] text-neutral-400">{new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p>
                  </td>
                  <td><span className={`font-semibold ${m.type === "IN" ? "text-green-600" : "text-primary-600"}`}>{m.type === "IN" ? "Alokasi Revenue" : "Pengambilan Hak"}</span></td>
                  <td className="uppercase text-[11px] font-semibold text-neutral-500">{m.category === "REVENUE" ? "Revenue" : "Ambil Hak"}</td>
                  <td className="font-semibold text-neutral-700">{m.category === "REVENUE" ? "Robi Gaming" : (m.description.split(":")[0].replace("[TARIK HAK]", "").trim())}</td>
                  <td className="font-semibold text-neutral-500 uppercase">{m.location_name || "BCA PT ADT"}</td>
                  <td className="text-neutral-400 max-w-[200px] truncate">{m.description}</td>
                  <td style={{ textAlign: "right" }} className="font-bold text-neutral-700">{formatRupiah(Math.round(m.nominal))}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className="text-center py-12 text-neutral-400 text-xs font-semibold">Belum ada riwayat arus kas bagi hasil.</td></tr>
            )}
          </tbody>
        </table>
        <div className="table-footer">
          <span className="table-footer-info">Menampilkan {data.mutations.filter((m) => m.category === "PROFIT_SHARE" || m.category === "REVENUE").length} arus kas</span>
        </div>
      </div>
    </div>
  );
};

export default ProfitShareView;
