import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ entity_type: "", action: "" });
  const { error } = useNotification();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.entity_type) params.append("entity_type", filter.entity_type);
      if (filter.action) params.append("action", filter.action);
      const response = await api.get(`/admin/logs?${params.toString()}`);
      setLogs(response.data);
    } catch (err) {
      error("Gagal memuat log aktivitas");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = formatDataForExport(logs, {
      created_at: 'Waktu',
      user_name: 'Aktor',
      action: 'Aksi',
      entity_type: 'Entitas',
      ip_address: 'IP Address'
    });
    exportToExcel(exportData, 'Audit_Logs', 'Logs');
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const actionBadge = (action) => {
    if (action.startsWith("CREATE")) return "badge-success";
    if (action.startsWith("UPDATE")) return "badge-info";
    if (action.startsWith("DELETE")) return "badge-danger";
    return "badge-neutral";
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Audit Log</h2>
          <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">Riwayat aktivitas sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter.entity_type}
            onChange={(e) => setFilter({ ...filter, entity_type: e.target.value })}
            className="form-select"
            style={{ width: 140 }}
          >
            <option value="">Semua Tipe</option>
            <option value="faq">FAQ</option>
            <option value="voucher">Voucher</option>
            <option value="pricing">Harga</option>
            <option value="user">User</option>
            <option value="domain">Domain</option>
          </select>
          <button onClick={handleExportExcel} className="btn btn-sm" style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
            <span className="material-symbols-outlined text-sm">download</span>
            Export
          </button>
          <button onClick={fetchLogs} className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0 }}>
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table-main">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aktor</th>
                <th>Aksi</th>
                <th>Entitas</th>
                <th>Detail</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-8 w-24 bg-neutral-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-8 w-32 bg-neutral-50 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-6 w-20 bg-neutral-100 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-neutral-50 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-12 w-48 bg-neutral-50 rounded-lg" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-neutral-50 rounded" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12">
                    <div className="empty-state">
                      <div className="empty-state-icon"><span className="material-symbols-outlined">history</span></div>
                      <p>Belum ada log aktivitas tercatat.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2">
                      <p className="text-sm font-bold text-neutral-700">
                        {format(new Date(log.created_at), "HH:mm:ss", { locale: localeID })}
                      </p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
                        {format(new Date(log.created_at), "dd MMM yyyy", { locale: localeID })}
                      </p>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center font-bold text-[11px]">
                          {log.user_name ? log.user_name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-800 leading-none mb-0.5">
                            {log.user_name || "System"}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-semibold">{log.user_email || "Auto-Task"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`badge ${actionBadge(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-xs font-bold text-neutral-600 uppercase tracking-tighter">
                        {log.entity_type} <span className="text-neutral-300 mx-0.5">/</span> #{log.entity_id}
                      </p>
                    </td>
                    <td className="px-4 py-2 max-w-xs">
                      <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                        {log.new_value ? (
                          <pre className="text-[10px] text-neutral-500 font-mono whitespace-pre-wrap overflow-hidden leading-relaxed">
                            {JSON.stringify(log.new_value, null, 2).substring(0, 100)}...
                          </pre>
                        ) : (
                          <p className="text-[10px] text-neutral-400 italic">No details provided</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-xs font-mono font-bold text-neutral-500">{log.ip_address}</p>
                      <p className="text-[9px] text-neutral-300 truncate w-32" title={log.user_agent}>
                        {log.user_agent}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
