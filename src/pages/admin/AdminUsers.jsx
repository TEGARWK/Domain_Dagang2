import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import PageHeader from "../../components/ui/PageHeader";
import DataTable from "../../components/ui/DataTable";
import StatsCard from "../../components/ui/StatsCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { ActionButton } from "../../components/ui/ActionBar";
import CustomSelect from "../../components/ui/CustomSelect";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";

const AdminUsers = () => {
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/users");
      setUsers(response.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      error("Gagal memuat data user.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDeleteUser = async (userId, userName) => {
    const isConfirmed = await confirm({
      title: "Hapus User",
      message: `Yakin ingin menghapus user "${userName}"? Tindakan ini tidak bisa dibatalkan.`,
      confirmText: "Ya, Hapus",
      type: "danger",
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/users/${userId}`);
      success(`User "${userName}" berhasil dihapus.`);
      fetchUsers();
    } catch (err) {
      error("Gagal menghapus user.");
    }
  };

  const handleExportExcel = () => {
    const exportData = formatDataForExport(users, {
      name: "Nama", email: "Email", role: "Role", status: "Status", domain_count: "Domain", created_at: "Bergabung"
    });
    exportToExcel(exportData, "All_Users", "Users");
  };

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    member: users.filter((u) => u.role === "member" || !u.role).length,
    withDomains: users.filter((u) => (u.domain_count || 0) > 0).length,
  }), [users]);

  const columns = [
    { header: "User", accessor: "name", width: "22%", render: (row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 font-bold text-xs shrink-0">
          {(row.name || "U").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-800">{row.name || "Unknown"}</p>
          <p className="text-[10px] text-neutral-400">{row.email || "-"}</p>
        </div>
      </div>
    )},
    { header: "Role", accessor: "role", width: "12%", render: (row) => (
      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
        row.role === "admin" ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-blue-50 text-blue-600 border-blue-100"
      }`}>
        {row.role || "member"}
      </span>
    )},
    { header: "Domain", accessor: "domain_count", width: "10%", align: "center", render: (row) => (
      <span className="text-xs font-bold text-neutral-700">{row.domain_count || 0}</span>
    )},
    { header: "Status", accessor: "status", width: "12%", align: "center", render: (row) => (
      <StatusBadge status={row.status || "active"} />
    )},
    { header: "Bergabung", accessor: "created_at", width: "16%", render: (row) => (
      <span className="text-xs text-neutral-500">
        {row.created_at ? new Date(row.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
      </span>
    )},
    { header: "Login", accessor: "last_login", width: "16%", render: (row) => (
      <span className="text-xs text-neutral-500">
        {row.last_login ? new Date(row.last_login).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Tidak pernah"}
      </span>
    )},
    { header: "Aksi", width: "12%", align: "center", sortable: false, render: (row) => (
      <div className="flex items-center justify-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${row.id}`); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-50 text-neutral-400 hover:bg-neutral-100 transition" title="Detail">
          <span className="material-symbols-outlined text-sm">visibility</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(row.id, row.name); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 text-rose-400 hover:bg-rose-100 transition" title="Hapus">
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Daftar User"
        subtitle="Kelola seluruh pengguna platform"
        icon="group"
        actions={<ActionButton icon="download" label="Export Excel" onClick={handleExportExcel} />}
      />

      <div className="stats-grid">
        <StatsCard title="Total User" value={stats.total} icon="group" color="blue" trend="Semua Pengguna" />
        <StatsCard title="Admin" value={stats.admin} icon="admin_panel_settings" color="purple" trend="Administrator" />
        <StatsCard title="Member" value={stats.member} icon="person" color="green" trend="Pelanggan" />
        <StatsCard title="Punya Domain" value={stats.withDomains} icon="language" color="orange" trend="Aktif" />
      </div>

      <div className="card" style={{ padding: "16px" }}>
        <div style={{ width: 160 }}>
          <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Semua Role</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        searchPlaceholder="Cari user, email..."
        emptyMessage="Tidak ada user ditemukan"
        onRowClick={(row) => navigate(`/admin/users/${row.id}`)}
      />
    </div>
  );
};

export default AdminUsers;
