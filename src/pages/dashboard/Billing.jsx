import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import DataTable from "../../components/ui/DataTable";
import StatsCard from "../../components/ui/StatsCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { ActionButton } from "../../components/ui/ActionBar";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";

const Billing = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;
    setLoading(true);
    try {
      const user = JSON.parse(storedUser);
      const response = await api.get(`/billing/user/${user.id}`);
      setInvoices(response.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleExportExcel = () => {
    const exportData = formatDataForExport(invoices, {
      id: "Invoice ID", created_at: "Tanggal", first_item: "Item", total: "Total", status: "Status"
    });
    exportToExcel(exportData, "My_Invoices", "Invoices");
  };

  const stats = useMemo(() => {
    let totalExpense = 0, pendingCount = 0, paidCount = 0;
    const methods = {};
    invoices.forEach((inv) => {
      const s = (inv.status || "").toLowerCase();
      if (s === "paid") { totalExpense += parseFloat(inv.total || 0); paidCount++; }
      if (s === "pending") pendingCount++;
      if (inv.payment_method) {
        methods[inv.payment_method] = (methods[inv.payment_method] || 0) + 1;
      }
    });
    let favMethod = "N/A", maxCount = 0;
    Object.entries(methods).forEach(([method, count]) => {
      if (count > maxCount) { maxCount = count; favMethod = method; }
    });
    return { totalExpense, pendingCount, paidCount, favMethod };
  }, [invoices]);

  const formatRupiah = (num) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num || 0);

  const columns = [
    { header: "Invoice", accessor: "id", width: "15%", render: (row) => (
      <span className="text-xs font-bold text-primary-500">#{row.id}</span>
    )},
    { header: "Item", accessor: "first_item", width: "25%", render: (row) => (
      <div>
        <p className="text-xs font-semibold text-neutral-800">{row.first_item || row.description || "-"}</p>
        <p className="text-[10px] text-neutral-400 mt-0.5">{row.domain || ""}</p>
      </div>
    )},
    { header: "Tanggal", accessor: "created_at", width: "20%", render: (row) => (
      <span className="text-xs text-neutral-500">
        {row.created_at ? new Date(row.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
      </span>
    )},
    { header: "Total", accessor: "total", width: "15%", align: "right", render: (row) => (
      <span className="text-xs font-bold text-neutral-800">{formatRupiah(row.total)}</span>
    )},
    { header: "Status", accessor: "status", width: "15%", align: "center", render: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: "", width: "10%", align: "center", sortable: false, render: (row) => (
      <button
        onClick={(e) => { e.stopPropagation(); window.location.href = `/dashboard/billing/${row.id}`; }}
        className="text-[10px] font-bold text-primary-500 hover:text-primary-600 transition inline-flex items-center gap-1"
      >
        Detail <span className="material-symbols-outlined text-xs">chevron_right</span>
      </button>
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Tagihan & Billing"
        subtitle="Riwayat transaksi dan tagihan Anda"
        icon="receipt_long"
        actions={<ActionButton icon="download" label="Export Excel" onClick={handleExportExcel} />}
      />

      <div className="stats-grid">
        <StatsCard title="Total Pengeluaran" value={formatRupiah(stats.totalExpense)} icon="payments" color="blue" trend="Semua Transaksi" />
        <StatsCard title="Lunas" value={stats.paidCount} icon="check_circle" color="green" trend="Pembayaran Sukses" />
        <StatsCard title="Pending" value={stats.pendingCount} icon="hourglass_empty" color="amber" trend="Menunggu Bayar" />
        <StatsCard title="Metode Favorit" value={stats.favMethod} icon="credit_card" color="purple" trend="Paling Sering" />
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        searchPlaceholder="Cari invoice..."
        emptyMessage="Belum ada tagihan"
        onRowClick={(row) => window.location.href = `/dashboard/billing/${row.id}`}
      />
    </div>
  );
};

export default Billing;
