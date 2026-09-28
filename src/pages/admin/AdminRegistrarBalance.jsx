import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const AdminRegistrarBalance = () => {
  const [balanceData, setBalanceData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { success, error } = useNotification();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/registrar-balance");
      if (res.data.success) {
        setBalanceData(res.data.balance);
        setHistory(res.data.history);
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await api.post("/admin/registrar-balance/sync");
      if (res.data.success) {
        success("Sinkronisasi saldo berhasil!");
        fetchData();
      }
    } catch (err) {
      error("Gagal sinkronisasi saldo: " + (err.response?.data?.message || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const fmt = (num) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

  if (loading && !balanceData) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-8 h-8 border-2 border-neutral-100 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Memuat saldo registrar...</p>
    </div>
  );

  const currentBal = parseFloat(balanceData?.current_balance || 0);
  const threshold = parseFloat(balanceData?.low_balance_threshold || 500000);
  const isLow = currentBal < threshold;

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            Registrar Balance
          </p>
          <h2 className="text-base font-bold text-neutral-800 tracking-tight">Saldo Daftarnama</h2>
        </div>
        <button onClick={handleSync} disabled={syncing} className="btn btn-primary">
          <span className={`material-symbols-outlined text-sm ${syncing ? 'animate-spin' : ''}`}>sync</span>
          {syncing ? "Sync..." : "Sync Saldo"}
        </button>
      </div>

      {/* Balance Card */}
      <div className={`card ${isLow ? '' : ''}`} style={{
        ...(isLow ? { borderColor: "var(--color-rose-200)", background: "var(--color-rose-50)" } : {})
      }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex-1">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${isLow ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              Saldo Tersedia
            </p>
            <div className={`text-4xl font-bold tracking-tight ${isLow ? 'text-rose-600' : 'text-neutral-800'}`}>
              {fmt(currentBal)}
            </div>
            {isLow && (
              <div className="flex items-center gap-2 mt-3 bg-white/80 px-4 py-2 rounded-lg border border-rose-200 w-fit">
                <span className="material-symbols-outlined text-rose-500 text-sm">warning</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Saldo Rendah — Isi segera di Daftarnama</span>
              </div>
            )}
          </div>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isLow ? 'bg-rose-100 text-rose-500' : 'bg-primary-50 text-primary-500'}`}>
            <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* History Table */}
        <div className="lg:col-span-2">
          <div className="table-wrap">
            <div className="table-header">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-primary-500" />
                <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Riwayat Mutasi Saldo</h3>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Tipe</th>
                  <th>Keterangan</th>
                  <th style={{ textAlign: "right" }}>Nominal</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-12 text-neutral-400 text-xs font-semibold">Belum ada catatan mutasi saldo.</td></tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-semibold text-neutral-700 text-xs">
                          {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase">
                          {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td>
                        <span className={`badge ${item.type === 'credit' ? 'badge-success' : item.type === 'debit' ? 'badge-danger' : 'badge-info'}`}>
                          {item.type}
                        </span>
                      </td>
                      <td>
                        <p className="text-xs font-semibold text-neutral-700">{item.description}</p>
                        <p className="text-[10px] font-bold text-neutral-400 tracking-wider mt-0.5">Ref: {item.reference_id || '-'}</p>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className={`font-bold text-xs ${item.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.type === 'debit' ? '-' : '+'}{fmt(item.amount)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Info Card */}
          <div className="card" style={{ background: "var(--color-neutral-800)", borderColor: "var(--color-neutral-700)" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary-400">info</span>
              <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Informasi Penting</h3>
            </div>
            <div className="space-y-4 text-[11px] text-neutral-400 font-semibold leading-relaxed">
              <p>Saldo ini adalah nominal Anda di <strong className="text-white">Daftarnama</strong>.</p>
              <p>DagangDomain hanya mencatat transaksi domain yang diproses melalui sistem.</p>
              <p className="border-t border-neutral-700 pt-4">
                Untuk Top-Up, login langsung ke Portal Daftarnama. Panel ini hanya untuk memantau sisa saldo.
              </p>
            </div>
          </div>

          {/* Last Synced */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">schedule</span>
              </div>
              <div>
                <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Last Synced</h3>
              </div>
            </div>
            <p className="text-xs font-bold text-neutral-500">
              {balanceData?.updated_at ? new Date(balanceData.updated_at).toLocaleString("id-ID") : "-"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegistrarBalance;
