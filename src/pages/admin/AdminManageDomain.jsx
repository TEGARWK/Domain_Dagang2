import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";

const SC = {
  sectionHeader: "text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2",
  dot: "w-1 h-4 rounded-full",
};

const AdminManageDomain = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const confirm = useConfirm();

  const [domain, setDomain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState([]);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    fetchDomainDetail();
    fetchAuditLogs();
  }, [id]);

  const fetchDomainDetail = async () => {
    try {
      const res = await api.get(`/domains/detail/${id}`);
      const data = res.data;
      if (data.registrar_response_raw && typeof data.registrar_response_raw === 'string') {
        try {
          data.registrar_response_raw = JSON.parse(data.registrar_response_raw);
        } catch (e) {
          console.error("Failed to parse raw data:", e);
        }
      }
      setDomain(data);
      setNewStatus(data.status);
    } catch (err) {
      console.error(err);
      error("Gagal memuat detail domain.");
      navigate("/admin/domains");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get(`/domains/${id}/audit-logs`);
      setLogs(res.data);
    } catch (err) {
      console.error("Logs error:", err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post(`/domains/${id}/sync`);
      success("Sinkronisasi berhasil!");
      fetchDomainDetail();
      fetchAuditLogs();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Gagal sinkronisasi dengan Registrar.";
      error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleStatusOverride = async () => {
    setSaving(true);
    try {
      await api.put(`/domains/${id}/admin`, { status: newStatus });
      success("Status domain berhasil diupdate secara manual.");
      fetchDomainDetail();
      fetchAuditLogs();
    } catch (err) {
      error("Gagal melakukan override status.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: "Konfirmasi Hapus",
      message: "Apakah Anda yakin ingin menghapus domain ini dari sistem? Tindakan ini tidak dapat dibatalkan.",
      type: "danger",
      confirmText: "Ya, Hapus!"
    });
    if (isConfirmed) {
      try {
        await api.delete(`/domains/${id}`);
        success("Domain berhasil dihapus.");
        navigate("/admin/domains");
      } catch (err) {
        error("Gagal menghapus domain.");
      }
    }
  };

  const getStatusBadge = (status) => {
    const cls = status === 'active' ? 'badge-success'
      : status === 'expired' ? 'badge-warning'
      : (status === 'failed' || status === 'error') ? 'badge-danger'
      : 'badge-info';
    return cls;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'active': 'Active', 'expired': 'Expired', 'provisioned': 'Provisioned',
      'failed': 'Failed', 'error': 'Error', 'registering': 'Registering',
      'pending': 'Pending', 'unknown': 'Unknown'
    };
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const lifecycle = useMemo(() => {
    if (!domain) return null;
    const now = new Date();
    const expiry = domain.expiration_date ? new Date(domain.expiration_date) : null;
    const reg = domain.registration_date ? new Date(domain.registration_date) : null;
    let daysLeft = null;
    if (expiry) {
      daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }
    return {
      daysLeft,
      expiryFormatted: expiry ? expiry.toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' }) : "-",
      regFormatted: reg ? reg.toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' }) : "-",
    };
  }, [domain]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-8 h-8 border-2 border-neutral-100 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Memuat konfigurasi domain...</p>
    </div>
  );

  if (!domain) return null;

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/domains" className="btn btn-ghost btn-sm">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Kembali
          </Link>
          <div>
            <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Manajemen Domain
            </p>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-neutral-800 tracking-tight">{domain.name}</h2>
              <span className={`badge ${getStatusBadge(domain.status)}`}>{getStatusLabel(domain.status)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} disabled={syncing} className="btn btn-primary">
            <span className={`material-symbols-outlined text-sm ${syncing ? 'animate-spin' : ''}`}>sync</span>
            {syncing ? "Sync..." : "Sync Registrar"}
          </button>
        </div>
      </div>

      {/* Meta Row */}
      <div className="flex items-center gap-4 text-[11px] font-semibold text-neutral-400">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">database</span>
          #{domain.id}
        </span>
        <span className="w-1 h-1 bg-neutral-300 rounded-full" />
        <span>Registrar: {domain.registrar_name || "Daftarnama"}</span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Sidebar */}
        <div className="space-y-4">
          {/* Domain Lifecycle */}
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">history</span>
              </div>
              <div>
                <h3 className={SC.sectionHeader}>Domain Lifecycle</h3>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Registration</p>
                <p className="text-xs font-semibold text-neutral-700">{lifecycle.regFormatted}</p>
              </div>
              <div className="border-t border-neutral-50 pt-4">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Expiration</p>
                <p className="text-xs font-semibold text-neutral-700">{lifecycle.expiryFormatted}</p>
              </div>
              {lifecycle.daysLeft !== null && (
                <div className="border-t border-neutral-50 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Masa Aktif</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${lifecycle.daysLeft <= 30 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {lifecycle.daysLeft} hari
                    </p>
                  </div>
                  <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${lifecycle.daysLeft <= 30 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (lifecycle.daysLeft / 365) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Owner Information */}
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">person_pin</span>
              </div>
              <div>
                <h3 className={SC.sectionHeader}>Domain Owner</h3>
              </div>
            </div>
            <div className="bg-neutral-50/50 border border-neutral-100 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-neutral-100 flex items-center justify-center text-sm font-bold text-primary-500">
                  {(domain.user_name || "U").charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-700 truncate">{domain.user_name || "Unknown User"}</p>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">UID: #{domain.user_id}</p>
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-neutral-100">
                <div className="flex items-center gap-2 text-neutral-500">
                  <span className="material-symbols-outlined text-sm">mail</span>
                  <span className="text-[11px] font-semibold truncate">{domain.user_email || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500">
                  <span className="material-symbols-outlined text-sm">call</span>
                  <span className="text-[11px] font-semibold">{domain.user_phone || "-"}</span>
                </div>
              </div>
            </div>
            <Link to={`/admin/users/${domain.user_id}`} className="btn btn-primary w-full">
              <span className="material-symbols-outlined text-sm">manage_accounts</span>
              Kelola User
            </Link>
          </div>

          {/* Purchase Details */}
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">shopping_cart</span>
              </div>
              <div>
                <h3 className={SC.sectionHeader}>Detail Pembelian</h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-neutral-50">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Invoice</span>
                <Link to={`/admin/invoices/${domain.invoice_id}`} className="text-xs font-bold text-primary-500 hover:underline truncate max-w-[140px]">{domain.invoice_id || "-"}</Link>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-50">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Harga Beli</span>
                <span className="text-xs font-bold text-neutral-700">Rp {(parseInt(domain.purchase_price || 0)).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Status Bayar</span>
                <span className={`badge ${domain.invoice_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{domain.invoice_status || "-"}</span>
              </div>
            </div>
          </div>

          {/* Status Override */}
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">tune</span>
              </div>
              <div>
                <h3 className={SC.sectionHeader}>Status Override</h3>
              </div>
            </div>
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">Manual Status</label>
                <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="redemptionPeriod">Redemption</option>
                  <option value="pendingDelete">Pending Delete</option>
                  <option value="registering">Registering</option>
                  <option value="failed">Failed</option>
                  <option value="provisioned">Provisioned</option>
                </select>
              </div>
              <button onClick={handleStatusOverride} disabled={saving} className="btn btn-ghost w-full">
                {saving ? "Updating..." : "Update Manual Status"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Technical Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Registrar Details */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <span className={SC.dot + " bg-primary-500"} />
                <h3 className={SC.sectionHeader}>Registrar Details</h3>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Order ID</span>
                  <span className="text-xs font-bold text-neutral-700 font-mono bg-white px-2 py-1 rounded-md border border-neutral-200 w-fit">
                    {domain.registrar_order_id || domain.registrar_response_raw?.data?.order_id || domain.invoice_id || "N/A"}
                  </span>
                </div>
                <div className="flex flex-col bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Domain ID</span>
                  <span className="text-xs font-bold text-neutral-700 font-mono bg-white px-2 py-1 rounded-md border border-neutral-200 w-fit">
                    {domain.registrar_domain_id || domain.registrar_response_raw?.data?.domain_id || domain.name || "N/A"}
                  </span>
                </div>
                {domain.registrar_response_raw?.data?.customer_username && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="material-symbols-outlined text-xs text-neutral-400">account_circle</span>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">Portal User: {domain.registrar_response_raw.data.customer_username}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Nameservers */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <span className={SC.dot + " bg-indigo-500"} />
                <h3 className={SC.sectionHeader}>Nameservers</h3>
              </div>
              <div className="space-y-2">
                {(() => {
                  let nsList = ["ns1.daftarnama.id", "ns2.daftarnama.id"];
                  try {
                    if (Array.isArray(domain.nameservers)) {
                      nsList = domain.nameservers;
                    } else if (typeof domain.nameservers === 'string' && domain.nameservers.startsWith('[')) {
                      nsList = JSON.parse(domain.nameservers);
                    }
                  } catch (e) {
                    console.error("Failed to parse nameservers:", e);
                  }
                  return nsList.map((ns, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                      <span className="text-xs font-semibold text-neutral-600 font-mono tracking-tight truncate">{ns}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Registrant Contacts */}
          {domain.registrar_response_raw?.data?.registrant_contact && (
            <div className="card">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">contact_page</span>
                </div>
                <div>
                  <h3 className={SC.sectionHeader}>Registrant Contact (Raw)</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Registrant</p>
                    <p className="text-xs font-bold text-neutral-700">{domain.registrar_response_raw.data.registrant_contact.name}</p>
                    <p className="text-[11px] text-neutral-500 font-semibold">{domain.registrar_response_raw.data.registrant_contact.email}</p>
                    <p className="text-[11px] text-neutral-500 font-semibold">{domain.registrar_response_raw.data.registrant_contact.phone_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Admin</p>
                    <p className="text-xs font-bold text-neutral-700">{domain.registrar_response_raw.data.admin_contact.name}</p>
                    <p className="text-[11px] text-neutral-500 font-semibold">{domain.registrar_response_raw.data.admin_contact.email}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Technical</p>
                    <p className="text-xs font-bold text-neutral-700">{domain.registrar_response_raw.data.technical_contact.name}</p>
                    <p className="text-[11px] text-neutral-500 font-semibold">{domain.registrar_response_raw.data.technical_contact.email}</p>
                  </div>
                  <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Registrar User</p>
                    <p className="text-[11px] font-mono font-bold text-primary-500">{domain.registrar_response_raw.data.customer_username}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Raw API Data */}
          <div className="card" style={{ padding: 0 }}>
            <div className="flex items-center gap-3 p-5 border-b border-neutral-100 bg-neutral-50/30">
              <div className="w-9 h-9 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">database</span>
              </div>
              <div>
                <h3 className={SC.sectionHeader}>Raw API Data</h3>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Data sinkronisasi dari registrar</p>
              </div>
            </div>
            <pre className="text-[11px] font-mono text-neutral-600 p-5 overflow-x-auto max-h-[220px]">
              {JSON.stringify(domain.registrar_response_raw ? (typeof domain.registrar_response_raw === 'string' ? JSON.parse(domain.registrar_response_raw) : domain.registrar_response_raw) : "No raw data available.", null, 2)}
            </pre>
          </div>

          {/* Audit Logs */}
          <div className="card" style={{ padding: 0 }}>
            <div className="flex items-center justify-between p-5 border-b border-neutral-100 bg-neutral-50/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-neutral-100 text-neutral-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">assignment_late</span>
                </div>
                <div>
                  <h3 className={SC.sectionHeader}>Log Sistem</h3>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Aktivitas & Event</p>
                </div>
              </div>
              <button onClick={fetchAuditLogs} className="btn btn-ghost btn-sm">Refresh</button>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {logs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><span className="material-symbols-outlined">history_toggle_off</span></div>
                  <p>Belum ada aktivitas tercatat</p>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {logs.map((log, idx) => {
                    const isError = (log.event_type || '').includes('ERROR') || (log.event_type || '').includes('FAIL');
                    return (
                      <div key={log.id} className="relative pl-9 group/log">
                        {idx !== logs.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-0 w-[1.5px] bg-neutral-100 group-hover/log:bg-neutral-200 transition-colors" />
                        )}
                        <div className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-lg flex items-center justify-center border ${
                          isError ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-neutral-100 text-neutral-500 border-neutral-100'
                        }`}>
                          <span className="material-symbols-outlined text-xs">{isError ? 'warning' : 'info'}</span>
                        </div>
                        <div className="p-3 rounded-xl border border-transparent hover:border-neutral-100 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isError ? 'text-rose-600' : 'text-neutral-500'}`}>
                              {log.event_type || 'SYSTEM EVENT'}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-bold bg-white px-2 py-0.5 rounded-lg border border-neutral-100 w-fit">
                              {new Date(log.created_at).toLocaleString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[12px] font-semibold text-neutral-600 leading-relaxed italic">
                            "{log.message || log.reason || "No description."}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ borderColor: "var(--color-rose-200)", background: "var(--color-rose-50)" }}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-white text-rose-500 flex items-center justify-center border border-rose-100 shrink-0">
                  <span className="material-symbols-outlined text-xl">delete_forever</span>
                </div>
                <div>
                  <h3 className={SC.sectionHeader} style={{ color: "var(--color-rose-800)" }}>Danger Zone</h3>
                  <p className="text-[11px] font-semibold text-rose-500 max-w-sm leading-relaxed">
                    Hapus domain permanen dari sistem. Gunakan untuk pembersihan data atau domain gagal.
                  </p>
                </div>
              </div>
              <button onClick={handleDelete} className="btn btn-rose w-full md:w-auto">
                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                Hapus Domain
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminManageDomain;
