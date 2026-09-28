import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import DataTable from "../../components/ui/DataTable";
import StatsCard from "../../components/ui/StatsCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { ActionButton } from "../../components/ui/ActionBar";
import { useNotification } from "../../context/NotificationContext";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";

const Wallet = () => {
  const [wallet, setWallet] = useState({ balance: 0, currency: "IDR", transactions: [] });
  const [loading, setLoading] = useState(true);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [processingTopUp, setProcessingTopUp] = useState(false);
  const { success, error } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const walletRes = await api.get("/wallet");
        setWallet(walletRes.data);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleTopUp = async (e) => {
    e.preventDefault();
    setProcessingTopUp(true);
    try {
      const amount = parseInt(topUpAmount.replace(/\D/g, "")) || 0;
      if (amount < 10000) {
        error("Minimum Top Up Rp 10.000");
        setProcessingTopUp(false);
        return;
      }
      const res = await api.post("/checkout/topup", {
        userId: JSON.parse(localStorage.getItem("user")).id,
        amount,
      });
      navigate(`/checkout?invoiceId=${res.data.invoiceId}`);
    } catch (err) {
      error(err.response?.data?.message || "Gagal membuat top up");
    } finally {
      setProcessingTopUp(false);
    }
  };

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    const exportData = formatDataForExport(wallet.transactions, {
      date: "Tanggal", type: "Tipe", description: "Keterangan", amount: "Jumlah"
    });
    exportToExcel(exportData, "Wallet_Transactions", "Transactions");
  };

  const formatRupiah = (num) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num || 0);

  const stats = useMemo(() => {
    let totalIn = 0, totalOut = 0;
    (wallet.transactions || []).forEach((tx) => {
      if ((tx.type || "").toLowerCase() === "credit") totalIn += parseFloat(tx.amount || 0);
      else totalOut += parseFloat(tx.amount || 0);
    });
    return { totalIn, totalOut, count: (wallet.transactions || []).length };
  }, [wallet.transactions]);

  const columns = [
    { header: "Tanggal", accessor: "date", width: "20%", render: (row) => (
      <span className="text-xs text-neutral-500">
        {row.date ? new Date(row.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
      </span>
    )},
    { header: "Tipe", accessor: "type", width: "12%", render: (row) => (
      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${(row.type || "").toLowerCase() === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
        {(row.type || "").toLowerCase() === "credit" ? "Masuk" : "Keluar"}
      </span>
    )},
    { header: "Referensi", accessor: "reference_type", width: "15%", render: (row) => (
      <span className="text-xs text-neutral-400 font-medium">{row.reference_type || "-"}</span>
    )},
    { header: "Keterangan", accessor: "description", width: "28%", render: (row) => (
      <span className="text-xs text-neutral-600">{row.description || "-"}</span>
    )},
    { header: "Jumlah", accessor: "amount", width: "15%", align: "right", render: (row) => (
      <span className={`text-xs font-bold ${(row.type || "").toLowerCase() === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
        {(row.type || "").toLowerCase() === "credit" ? "+" : "-"}{formatRupiah(row.amount)}
      </span>
    )},
    { header: "Status", accessor: "status", width: "10%", align: "center", render: (row) => (
      <StatusBadge status={row.status || "completed"} />
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Dompet & Saldo"
        subtitle="Kelola saldo dan lihat riwayat transaksi"
        icon="account_balance_wallet"
        actions={
          <>
            <ActionButton icon="print" label="Print" onClick={handlePrint} />
            <ActionButton icon="download" label="Export" onClick={handleExportExcel} />
            <ActionButton icon="add" label="Top Up" onClick={() => setShowTopUpModal(true)} variant="primary" />
          </>
        }
      />

      <div className="card" style={{ background: "linear-gradient(135deg, var(--color-neutral-900), #1e293b)", borderColor: "var(--color-neutral-700)" }}>
        <p className="text-neutral-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Saldo Tersedia</p>
        <h3 className="text-2xl font-black text-white mb-4 tracking-tight">{formatRupiah(wallet.balance)}</h3>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTopUpModal(true)} className="btn btn-primary">
            <span className="material-symbols-outlined">add</span>
            Top Up Saldo
          </button>
          <span className="text-neutral-500 text-[10px] font-semibold uppercase tracking-wider">Currency: {wallet.currency || "IDR"}</span>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard title="Total Pemasukan" value={formatRupiah(stats.totalIn)} icon="arrow_downward" color="green" trend="Kredit" />
        <StatsCard title="Total Pengeluaran" value={formatRupiah(stats.totalOut)} icon="arrow_upward" color="rose" trend="Debit" />
        <StatsCard title="Total Transaksi" value={stats.count} icon="receipt_long" color="blue" trend="Semua Mutasi" />
      </div>

      <div>
        <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
          Riwayat Transaksi
        </h3>
        <DataTable
          columns={columns}
          data={wallet.transactions || []}
          loading={loading}
          searchPlaceholder="Cari transaksi..."
          emptyMessage="Belum ada transaksi"
        />
      </div>

      {showTopUpModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowTopUpModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3>Top Up Saldo</h3>
              <button onClick={() => setShowTopUpModal(false)} className="btn btn-ghost btn-icon">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleTopUp}>
              <div className="modal-body space-y-4">
                <div className="form-group">
                  <label className="form-label">Jumlah Top Up</label>
                  <div className="input-icon-wrap">
                    <span className="material-symbols-outlined" style={{ fontWeight: 700 }}>payments</span>
                    <input
                      type="text"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="100000"
                      className="form-input"
                      style={{ paddingLeft: 34, fontSize: 15, fontWeight: 700 }}
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1 font-medium">Minimal top up Rp 10.000</p>
                </div>
                <div className="flex gap-2">
                  {[50000, 100000, 250000, 500000].map((amount) => (
                    <button key={amount} type="button" onClick={() => setTopUpAmount(String(amount))} className="btn btn-default btn-sm flex-1">
                      {formatRupiah(amount)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowTopUpModal(false)} className="btn btn-default">Batal</button>
                <button type="submit" disabled={processingTopUp} className="btn btn-primary">
                  {processingTopUp ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><span className="material-symbols-outlined">arrow_forward</span> Lanjut Bayar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
