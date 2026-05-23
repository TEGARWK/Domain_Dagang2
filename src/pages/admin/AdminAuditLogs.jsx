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

  const getActionBadge = (action) => {
    if (action.startsWith("CREATE")) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (action.startsWith("UPDATE")) return "bg-blue-50 text-blue-600 border-blue-100";
    if (action.startsWith("DELETE")) return "bg-red-50 text-red-600 border-red-100";
    return "bg-slate-50 text-slate-600 border-slate-100";
  };

  return (
    <div className="p-2 md:p-4 w-full animate-[fadeIn_0.5s_ease-out]">
      <div className="flex justify-end mb-3">
        
        <div className="flex flex-wrap gap-3">
          <select 
            value={filter.entity_type}
            onChange={(e) => setFilter({...filter, entity_type: e.target.value})}
            className="h-10 px-4 bg-white border border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-widest text-slate-600 outline-none focus:ring-4 focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all shadow-sm"
          >
            <option value="">Semua Tipe</option>
            <option value="faq">FAQ</option>
            <option value="voucher">Voucher</option>
            <option value="pricing">Harga</option>
            <option value="user">User</option>
            <option value="domain">Domain</option>
          </select>
          <button 
            onClick={handleExportExcel}
            className="h-10 px-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Export
          </button>
          <button 
            onClick={fetchLogs}
            className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 rounded-lg hover:bg-orange-50 hover:text-[#f97316] border border-slate-200 transition-all shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-4 py-2">Waktu</th>
                <th className="px-4 py-2">Aktor</th>
                <th className="px-4 py-2">Aksi</th>
                <th className="px-4 py-2">Entitas</th>
                <th className="px-4 py-2">Detail</th>
                <th className="px-4 py-2">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                 Array(10).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                        <td className="px-4 py-4"><div className="h-8 w-24 bg-slate-100 rounded"></div></td>
                        <td className="px-4 py-4"><div className="h-8 w-32 bg-slate-50 rounded"></div></td>
                        <td className="px-4 py-4"><div className="h-6 w-20 bg-slate-100 rounded-full"></div></td>
                        <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-50 rounded"></div></td>
                        <td className="px-4 py-4"><div className="h-12 w-48 bg-slate-50 rounded-lg"></div></td>
                        <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-50 rounded"></div></td>
                    </tr>
                 ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-20 text-center text-slate-400 font-medium">
                    Belum ada log aktivitas tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-1.5">
                      <p className="text-sm font-bold text-slate-700">
                        {format(new Date(log.created_at), "HH:mm:ss", { locale: localeID })}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                        {format(new Date(log.created_at), "dd MMM yyyy", { locale: localeID })}
                      </p>
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#F97316] flex items-center justify-center font-bold text-xs">
                          {log.user_name ? log.user_name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-none mb-1">
                            {log.user_name || "System"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">{log.user_email || "Auto-Task"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border transition-all ${getActionBadge(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
                        {log.entity_type} <span className="text-slate-300 mx-1">/</span> #{log.entity_id}
                      </p>
                    </td>
                    <td className="px-4 py-1.5 max-w-xs">
                       <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          {log.new_value ? (
                             <pre className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap overflow-hidden">
                                {JSON.stringify(log.new_value, null, 2).substring(0, 100)}...
                             </pre>
                          ) : (
                             <p className="text-[10px] text-slate-400 italic">No details provided</p>
                          )}
                       </div>
                    </td>
                    <td className="px-4 py-1.5">
                      <p className="text-xs font-mono font-bold text-slate-500">{log.ip_address}</p>
                      <p className="text-[9px] text-slate-300 truncate w-32" title={log.user_agent}>
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
