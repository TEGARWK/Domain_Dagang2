import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useConfirm } from "../../context/ConfirmContext";
import { useNotification } from "../../context/NotificationContext";
import PageHeader from "../../components/ui/PageHeader";
import DataTable from "../../components/ui/DataTable";
import StatsCard from "../../components/ui/StatsCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { ActionButton } from "../../components/ui/ActionBar";
import CustomSelect from "../../components/ui/CustomSelect";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";

const AdminDomains = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all_domains");
  const { success, error } = useNotification();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const response = await api.get("/domains/all");
      const formatted = (response.data || []).map((d) => ({
        id: d.id,
        name: d.domain_name,
        user: d.user_name || "Unknown",
        expiry: d.expiration_date,
        status: d.status?.toLowerCase() || "unknown",
        docStatus: d.document_status_mapped || "N/A",
        is_transfer: d.is_transfer,
        daysLeft: d.expiration_date ? Math.ceil((new Date(d.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      }));
      setDomains(formatted);
    } catch (err) {
      console.error("Error fetching domains:", err);
      error("Gagal memuat data domain.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDomains(); }, []);

  const handleExportExcel = () => {
    const exportData = formatDataForExport(domains, {
      name: "Domain", user: "Pemilik", status: "Status", expiry: "Expired"
    });
    exportToExcel(exportData, "All_Domains", "Domains");
  };

  const stats = useMemo(() => ({
    total: domains.length,
    active: domains.filter((d) => d.status === "active").length,
    expiredCount: domains.filter((d) => d.status === "expired" || (d.daysLeft !== null && d.daysLeft < 0)).length,
    troubled: domains.filter((d) => d.status === "failed" || d.status === "error" || d.docStatus === "rejected").length,
  }), [domains]);

  const filteredDomains = useMemo(() => {
    if (statusFilter === "all") return domains;
    return domains.filter((d) => d.status === statusFilter);
  }, [domains, statusFilter]);

  const columns = [
    { header: "Domain", accessor: "name", width: "25%", render: (row) => (
      <div>
        <p className="text-xs font-bold text-neutral-800">{row.name}</p>
        <p className="text-[10px] text-neutral-400 mt-0.5">#{row.id}</p>
      </div>
    )},
    { header: "Pemilik", accessor: "user", width: "18%", render: (row) => (
      <span className="text-xs text-neutral-600">{row.user}</span>
    )},
    { header: "Tipe", accessor: "is_transfer", width: "10%", render: (row) => (
      <span className="text-[10px] font-semibold text-neutral-400 uppercase">{row.is_transfer ? "Transfer" : "Register"}</span>
    )},
    { header: "Expired", accessor: "expiry", width: "20%", render: (row) => {
      if (!row.expiry) return <span className="text-neutral-300">-</span>;
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">{new Date(row.expiry).toLocaleDateString("id-ID")}</span>
          {row.daysLeft !== null && (
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
              row.daysLeft < 0 ? "bg-rose-50 text-rose-600" :
              row.daysLeft < 30 ? "bg-amber-50 text-amber-600" :
              "bg-emerald-50 text-emerald-600"
            }`}>
              {row.daysLeft < 0 ? "Expired" : `${row.daysLeft}h`}
            </span>
          )}
        </div>
      );
    }},
    { header: "Dokumen", accessor: "docStatus", width: "12%", align: "center", render: (row) => (
      <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
        row.docStatus === "verified" ? "bg-emerald-50 text-emerald-600" :
        row.docStatus === "rejected" ? "bg-rose-50 text-rose-600" :
        row.docStatus === "pending" ? "bg-amber-50 text-amber-600" :
        "bg-neutral-50 text-neutral-400"
      }`}>{row.docStatus}</span>
    )},
    { header: "Status", accessor: "status", width: "10%", align: "center", render: (row) => (
      <StatusBadge status={row.status} pulse={row.status === "pending_transfer"} />
    )},
    { header: "Aksi", width: "5%", align: "center", sortable: false, render: (row) => (
      <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/domains/${row.id}`); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-50 text-neutral-400 hover:bg-neutral-100 transition" title="Detail">
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Manajemen Domain"
        subtitle="Kelola seluruh domain pelanggan"
        icon="language"
        actions={<ActionButton icon="download" label="Export Excel" onClick={handleExportExcel} />}
      />

      <div className="stats-grid">
        <StatsCard title="Total Domain" value={stats.total} icon="language" color="blue" trend="Semua" />
        <StatsCard title="Aktif" value={stats.active} icon="check_circle" color="green" trend="Dalam Layanan" />
        <StatsCard title="Expired" value={stats.expiredCount} icon="error" color="rose" trend="Perlu Tindakan" />
        <StatsCard title="Bermasalah" value={stats.troubled} icon="warning" color="amber" trend="Perlu Review" />
      </div>

      <div className="card" style={{ padding: "16px" }}>
        <select className="form-select" style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="expired">Expired</option>
          <option value="pending_transfer">Pending Transfer</option>
          <option value="failed">Gagal</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filteredDomains}
        loading={loading}
        searchPlaceholder="Cari domain..."
        emptyMessage="Tidak ada domain ditemukan"
        onRowClick={(row) => navigate(`/admin/domains/${row.id}`)}
      />
    </div>
  );
};

export default AdminDomains;
