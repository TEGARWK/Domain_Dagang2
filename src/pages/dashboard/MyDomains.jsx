import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import PageHeader from "../../components/ui/PageHeader";
import DataTable from "../../components/ui/DataTable";
import StatsCard from "../../components/ui/StatsCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { ActionButton } from "../../components/ui/ActionBar";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";

const MyDomains = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState(false);

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userId = user?.id;

  const fetchDomains = async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get(`/domains/user/${userId}`);
      setDomains(res.data || []);
    } catch (err) {
      console.error("Gagal mengambil domain:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDomains(); }, [userId]);

  const handleResync = async () => {
    setResyncing(true);
    try {
      await api.post("/domains/resync", {});
      fetchDomains();
    } catch (err) {
      console.error("Resync error:", err);
    } finally {
      setResyncing(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = formatDataForExport(domains, {
      name: "Domain", expiration_date: "Tanggal Expire", status: "Status"
    });
    exportToExcel(exportData, "My_Domains", "Domains");
  };

  const getDaysLeft = (expiry) => {
    if (!expiry) return null;
    return Math.floor((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const stats = useMemo(() => ({
    total: domains.length,
    active: domains.filter(d => d.status?.toLowerCase() === "active").length,
    expired: domains.filter(d => d.status?.toLowerCase() === "expired").length,
    expiringSoon: domains.filter(d => {
      const days = getDaysLeft(d.expiration_date);
      return days !== null && days > 0 && days < 30;
    }).length,
  }), [domains]);

  const columns = [
    { header: "Domain", accessor: "name", width: "25%", render: (row) => (
      <div>
        <p className="font-bold text-neutral-800">{row.name}</p>
        <p className="text-[10px] text-neutral-400 font-medium mt-0.5">ID: {row.id}</p>
      </div>
    )},
    { header: "Tipe", accessor: "is_transfer", width: "10%", render: (row) => (
      <span className="text-[10px] font-semibold text-neutral-400 uppercase">{row.is_transfer ? "Transfer" : "Register"}</span>
    )},
    { header: "Expired", accessor: "expiration_date", width: "20%", render: (row) => {
      if (!row.expiration_date) return <span className="text-neutral-300">-</span>;
      const days = getDaysLeft(row.expiration_date);
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">{new Date(row.expiration_date).toLocaleDateString("id-ID")}</span>
          {days !== null && (
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${days < 0 ? "bg-rose-50 text-rose-600" : days < 30 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
              {days < 0 ? "Expired" : `${days} hari`}
            </span>
          )}
        </div>
      );
    }},
    { header: "Status", accessor: "status", width: "15%", align: "center", render: (row) => (
      <StatusBadge status={row.status} pulse={row.status === "pending_transfer"} />
    )},
    { header: "Aksi", width: "15%", align: "center", sortable: false, render: (row) => (
      <Link to={`/dashboard/domains/${row.id}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-500 hover:text-primary-600 transition">
        Kelola
        <span className="material-symbols-outlined text-xs">arrow_forward</span>
      </Link>
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Domain Saya"
        subtitle="Kelola seluruh domain Anda dalam satu tempat"
        icon="language"
        actions={
          <>
            <ActionButton icon="sync" label="Resync" onClick={handleResync} loading={resyncing} />
            <ActionButton icon="download" label="Export" onClick={handleExportExcel} />
          </>
        }
      />

      <div className="stats-grid">
        <StatsCard title="Total Domain" value={stats.total} icon="language" color="blue" trend="Semua Domain" />
        <StatsCard title="Aktif" value={stats.active} icon="check_circle" color="green" trend="Dalam Layanan" />
        <StatsCard title="Hampir Expired" value={stats.expiringSoon} icon="warning" color="amber" trend="< 30 Hari" />
        <StatsCard title="Expired" value={stats.expired} icon="error" color="rose" trend="Perlu Diperpanjang" />
      </div>

      <DataTable
        columns={columns}
        data={domains}
        loading={loading}
        searchPlaceholder="Cari domain..."
        emptyMessage="Belum ada domain terdaftar"
        onRowClick={(row) => window.location.href = `/dashboard/domains/${row.id}`}
      />
    </div>
  );
};

export default MyDomains;
