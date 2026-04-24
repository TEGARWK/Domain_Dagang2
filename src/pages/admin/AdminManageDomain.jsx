import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import CustomSelect from "../../components/ui/CustomSelect";

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

    // Admin State Override
    const [newStatus, setNewStatus] = useState("");

    useEffect(() => {
        fetchDomainDetail();
        fetchAuditLogs();
    }, [id]);

    const fetchDomainDetail = async () => {
        try {
            const res = await api.get(`/domains/detail/${id}`);
            setDomain(res.data);
            setNewStatus(res.data.status);
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

    const getStatusLabel = (status) => {
        const labels = {
            'active': 'Active',
            'expired': 'Expired',
            'provisioned': 'Provisioned',
            'failed': 'Failed',
            'error': 'Error',
            'registering': 'Registering',
            'pending': 'Pending',
            'unknown': 'Unknown'
        };
        return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
    };

    // --- LOGIC: Lifecycle Calculation ---
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
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-[#f97316] rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Memuat Konfigurasi Domain...</p>
        </div>
    );

    if (!domain) return null;

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] pb-24">
            {/* 1. Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <button 
                        onClick={() => navigate("/admin/domains")}
                        className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-[#f97316] hover:border-[#f97316] transition-all shadow-sm active:scale-90"
                    >
                        <span className="material-symbols-outlined font-bold">arrow_back</span>
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{domain.name}</h1>
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                                domain.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                domain.status === 'expired' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                (domain.status === 'failed' || domain.status === 'error') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                                {getStatusLabel(domain.status)}
                            </span>
                        </div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mt-1">
                             <span className="material-symbols-outlined text-xs">database</span>
                             Domain ID: #{domain.id}
                             <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
                             <span className="text-[#f97316]">Registrar: {domain.registrar_name || "Daftarnama"}</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex-1 md:flex-none px-8 py-3.5 bg-slate-900 text-white rounded-[1.25rem] text-[11px] font-bold uppercase tracking-widest hover:bg-[#f97316] transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <span className={`material-symbols-outlined text-lg ${syncing ? 'animate-spin' : ''}`}>sync</span>
                        {syncing ? "SYNCING..." : "SYNC REGISTRAR"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Lifecycle & User */}
                <div className="space-y-8">
                    {/* Domain Lifecycle Card */}
                    <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-2xl shadow-slate-200/30 group">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined font-bold">history</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Domain Lifecycle</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end pb-4 border-b border-slate-50">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Registration Date</p>
                                    <p className="text-sm font-bold text-slate-700">{lifecycle.regFormatted}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-200">event_available</span>
                            </div>

                            <div className="flex justify-between items-end pb-4 border-b border-slate-50">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expiration Date</p>
                                    <p className="text-sm font-bold text-slate-700">{lifecycle.expiryFormatted}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-200">event_busy</span>
                            </div>

                            {lifecycle.daysLeft !== null && (
                                <div className="pt-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remaining Validity</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${lifecycle.daysLeft <= 30 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                                            {lifecycle.daysLeft} Hari Lagi
                                        </p>
                                    </div>
                                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${
                                                lifecycle.daysLeft <= 30 ? 'bg-rose-500' : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${Math.min(100, (lifecycle.daysLeft / 365) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Owner Information Card */}
                    <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-2xl shadow-slate-200/30">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined font-bold">person_pin</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Domain Owner</h3>
                        </div>

                        <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-5 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center text-lg font-bold text-[#f97316]">
                                    {(domain.user_name || "U").charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 tracking-tight">{domain.user_name || "Unknown User"}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UID: #{domain.user_id}</p>
                                </div>
                            </div>
                        </div>

                        <Link 
                            to={`/admin/users/${domain.user_id}`}
                            className="w-full py-4 px-6 bg-slate-900 text-white rounded-[1.25rem] text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-[#f97316] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-slate-900/10"
                        >
                            <span className="material-symbols-outlined text-lg">manage_accounts</span>
                            KELEOLA PROFIL USER
                        </Link>
                    </div>

                    {/* Admin Status Override Card */}
                    <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-2xl shadow-slate-200/30">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined font-bold">tune</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Status Override</h3>
                        </div>

                        <div className="space-y-4">
                            <CustomSelect 
                                value={newStatus}
                                onChange={val => setNewStatus(val)}
                                options={[
                                    { value: 'active', label: '✓ ACTIVE' },
                                    { value: 'expired', label: '⚠ EXPIRED' },
                                    { value: 'redemptionPeriod', label: '⌛ REDEMPTION' },
                                    { value: 'pendingDelete', label: '✖ PENDING DELETE' },
                                    { value: 'registering', label: '🚀 REGISTERING' },
                                    { value: 'failed', label: '✘ FAILED' },
                                    { value: 'provisioned', label: '⚙ PROVISIONED' }
                                ]}
                            />
                            
                            <button 
                                onClick={handleStatusOverride}
                                disabled={saving}
                                className="w-full py-4 bg-orange-50 text-[#f97316] border border-orange-100 rounded-[1.25rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#f97316] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {saving ? "UPDATING..." : "UPDATE MANUAL STATUS"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Technical Grid & Logs */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Technical Breakdown Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        {/* Registrar Info */}
                        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-xl shadow-slate-200/30 hover:shadow-2xl transition-all border-l-4 border-l-[#f97316]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Registrar Details</p>
                            <div className="space-y-4">
                                <div className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Registrar Order ID</span>
                                    <span className="text-sm font-bold text-slate-800 font-mono tracking-tighter bg-white px-2 py-1 rounded-md border border-slate-200 w-fit">{domain.registrar_order_id || "N/A"}</span>
                                </div>
                                <div className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Registrar Domain ID</span>
                                    <span className="text-sm font-bold text-slate-800 font-mono tracking-tighter bg-white px-2 py-1 rounded-md border border-slate-200 w-fit">{domain.registrar_domain_id || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Nameservers Card */}
                        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-xl shadow-slate-200/30 hover:shadow-2xl transition-all border-l-4 border-l-indigo-500">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Nameservers Config</p>
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
                                        <div key={idx} className="flex items-center gap-2 group/ns">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                            <span className="text-xs font-bold text-slate-600 font-mono tracking-tight group-hover/ns:text-[#f97316] transition-colors">{ns}</span>
                                        </div>
                                    ));
                                })()}
                             </div>
                        </div>
                    </div>

                    {/* Audit Logs: Premium Timeline View */}
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-slate-100 text-slate-400 rounded-lg flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined font-bold">assignment_late</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">Aktivitas & Log Sistem</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Registrar & Automated Tasks</p>
                                </div>
                            </div>
                            <button 
                                onClick={fetchAuditLogs} 
                                className="px-4 py-2 bg-white border border-slate-100 text-[#f97316] text-[10px] font-bold uppercase tracking-[0.2em] rounded-lg hover:bg-orange-50 transition-all active:scale-90"
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar bg-white">
                            {logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-20 text-slate-300 gap-4">
                                     <span className="material-symbols-outlined text-6xl">history_toggle_off</span>
                                     <p className="text-xs font-bold uppercase tracking-widest italic">Belum ada aktivitas tercatat</p>
                                </div>
                            ) : (
                                <div className="p-8 space-y-6">
                                    {logs.map((log, idx) => {
                                        const isError = (log.event_type || '').includes('ERROR') || (log.event_type || '').includes('FAIL');
                                        return (
                                            <div key={log.id} className="relative pl-10 group/log">
                                                {/* Line */}
                                                {idx !== logs.length - 1 && (
                                                    <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-slate-50 group-hover/log:bg-slate-100 transition-colors"></div>
                                                )}
                                                {/* Point */}
                                                <div className={`absolute left-0 top-1 w-6 h-6 rounded-lg flex items-center justify-center shadow-sm border ${
                                                    isError ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                                }`}>
                                                    <span className={`material-symbols-outlined text-[14px] ${isError ? 'font-bold' : ''}`}>
                                                        {isError ? 'warning' : 'info'}
                                                    </span>
                                                </div>

                                                <div className="bg-slate-50/10 hover:bg-slate-50/50 p-4 rounded-lg border border-transparent hover:border-slate-100 transition-all">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
                                                            isError ? 'text-rose-600' : 'text-slate-400'
                                                        }`}>
                                                            {log.event_type || 'SYSTEM EVENT'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                                                            {new Date(log.created_at).toLocaleString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[13px] font-semibold text-slate-600 leading-relaxed italic pr-4">
                                                        "{log.reason}"
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Danger Zone: High Alert Redesign */}
                    <div className="bg-rose-50/30 rounded-[3rem] border border-rose-100 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-rose-200/10">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white text-rose-500 rounded-lg flex items-center justify-center shadow-sm border border-rose-100 shrink-0">
                                <span className="material-symbols-outlined text-3xl font-bold">delete_forever</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-rose-900 leading-none mb-1 uppercase tracking-tight">Danger Zone</h3>
                                <p className="text-[11px] text-rose-600/70 font-bold max-w-sm leading-relaxed">
                                    Hapus domain secara permanen dari sistem. Gunakan hanya untuk domain yang gagal total atau pembersihan data testing.
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleDelete}
                            className="w-full sm:w-auto px-10 py-4 bg-white text-rose-600 border border-rose-200 rounded-[1.25rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-rose-500/5 group"
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg group-hover:animate-bounce">delete_sweep</span>
                                Hapus Domain
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminManageDomain;
