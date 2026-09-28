import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import PageHeader from "../../components/ui/PageHeader";
import DataTable from "../../components/ui/DataTable";
import StatsCard from "../../components/ui/StatsCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { ActionButton } from "../../components/ui/ActionBar";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";
import CustomSelect from "../../components/ui/CustomSelect";

const AdminInvoices = () => {
  const { success, error } = useNotification();
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get("/billing/all");
      setInvoices(response.data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      error("Gagal memuat data invoice.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handlePay = async (id) => {
    try {
      await api.put(`/billing/invoice/${id}/pay`);
      success("Invoice berhasil dibayarkan");
      fetchInvoices();
    } catch (err) {
      error("Gagal membayarkan invoice");
    }
  };

  const handleReject = async (id) => {
    const isConfirmed = await confirm({ title: "Reject Invoice", message: "Yakin ingin mereject invoice ini?", confirmText: "Ya, Reject", type: "warning" });
    if (!isConfirmed) return;
    try {
      await api.put(`/billing/invoice/${id}/reject`);
      success("Invoice berhasil di-reject");
      fetchInvoices();
    } catch (err) {
      error("Gagal mereject invoice");
    }
  };

  const handleExportExcel = () => {
    const exportData = formatDataForExport(invoices, {
      id: "Invoice ID", customer_name: "Customer", total: "Total", status: "Status", created_at: "Tanggal"
    });
    exportToExcel(exportData, "All_Invoices", "Invoices");
  };

  const formatRupiah = (num) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num || 0);

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    if (statusFilter !== "all") result = result.filter(inv => inv.status === statusFilter);
    if (categoryFilter !== "all") result = result.filter(inv => (inv.category || inv.action_type || "REGISTER").toUpperCase() === categoryFilter.toUpperCase());
    if (startDate) { const s = new Date(startDate); s.setHours(0,0,0,0); result = result.filter(inv => new Date(inv.created_at) >= s); }
    if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); result = result.filter(inv => new Date(inv.created_at) <= e); }
    return result;
  }, [invoices, statusFilter, categoryFilter, startDate, endDate]);

  const stats = useMemo(() => ({
    total: invoices.length,
    pending: invoices.filter(i => i.status === "pending").length,
    paid: invoices.filter(i => i.status === "paid").length,
    revenue: invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + parseFloat(i.total || 0), 0),
  }), [invoices]);

  const columns = [
    { header: "Invoice", accessor: "id", width: "14%", render: (row) => (
      <span className="text-xs font-bold text-primary-500">#{row.id}</span>
    )},
    { header: "Customer", accessor: "customer_name", width: "18%", render: (row) => (
      <div>
        <p className="text-xs font-semibold text-neutral-800">{row.customer_name || row.user_name || "-"}</p>
        <p className="text-[10px] text-neutral-400">{row.user_email || ""}</p>
      </div>
    )},
    { header: "Item", accessor: "description", width: "20%", render: (row) => (
      <div>
        <p className="text-xs text-neutral-600">{row.description || row.domain || "-"}</p>
        {row.category && <span className="text-[9px] text-neutral-400 font-semibold uppercase">{row.category}</span>}
      </div>
    )},
    { header: "Tanggal", accessor: "created_at", width: "15%", render: (row) => (
      <span className="text-xs text-neutral-500">{row.created_at ? new Date(row.created_at).toLocaleDateString("id-ID") : "-"}</span>
    )},
    { header: "Total", accessor: "total", width: "13%", align: "right", render: (row) => (
      <span className="text-xs font-bold text-neutral-800">{formatRupiah(row.total)}</span>
    )},
    { header: "Status", accessor: "status", width: "10%", align: "center", render: (row) => <StatusBadge status={row.status} /> },
    { header: "Aksi", width: "10%", align: "center", sortable: false, render: (row) => (
      <div className="flex items-center justify-center gap-1">
        {row.status === "pending" && (
          <>
            <button onClick={(e) => { e.stopPropagation(); handlePay(row.id); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition" title="Bayar">
              <span className="material-symbols-outlined text-sm">check</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleReject(row.id); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition" title="Reject">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </>
        )}
        <button onClick={(e) => { e.stopPropagation(); window.location.href = `/admin/invoices/${row.id}`; }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-50 text-neutral-400 hover:bg-neutral-100 transition" title="Detail">
          <span className="material-symbols-outlined text-sm">visibility</span>
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Kelola Invoice"
        subtitle="Semua transaksi dan tagihan pelanggan"
        icon="receipt_long"
        actions={<ActionButton icon="download" label="Export Excel" onClick={handleExportExcel} />}
      />

      <div className="stats-grid">
        <StatsCard title="Total Invoice" value={stats.total} icon="receipt_long" color="blue" trend="Semua" />
        <StatsCard title="Pending" value={stats.pending} icon="hourglass_empty" color="amber" trend="Menunggu" />
        <StatsCard title="Lunas" value={stats.paid} icon="check_circle" color="green" trend="Sukses" />
        <StatsCard title="Total Revenue" value={formatRupiah(stats.revenue)} icon="monetization_on" color="purple" trend="Pendapatan" />
      </div>

      <div className="card" style={{ padding: "16px" }}>
        <div className="flex flex-wrap items-center gap-3">
          <select className="form-select" style={{ width: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="form-select" style={{ width: 140 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">Semua Kategori</option>
            <option value="REGISTER">Register</option>
            <option value="RENEW">Renew</option>
            <option value="TRANSFER">Transfer</option>
            <option value="TOPUP">Top-up</option>
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input" style={{ width: 150 }} />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input" style={{ width: 150 }} />
          <button onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); setStartDate(""); setEndDate(""); }} className="btn btn-ghost btn-sm">
            Reset
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredInvoices}
        loading={loading}
        searchPlaceholder="Cari invoice, customer..."
        emptyMessage="Tidak ada invoice ditemukan"
        searchable={true}
      />
    </div>
  );
};

export default AdminInvoices;
