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
            const data = res.data;
            
            // Auto-parse registrar_response_raw if it's a string
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest animate-pulse">Memuat Konfigurasi Domain...</p>
        </div>
    );

    if (!domain) return null;

    return (
        <div className="space-y-3 animate-[fadeIn_0.5s_ease-out] pb-20 px-4 sm:px-0">
            {/* 1. Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-0 border-slate-100 shadow-sm sm:shadow-none">
                <div className="flex items-start sm:items-center gap-4 sm:gap-5 w-full sm:w-auto">
                    <button 
                        onClick={() => navigate("/admin/domains")}
                        className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-[#f97316] hover:border-[#f97316] transition-all shadow-sm active:scale-90 shrink-0"
                    >
                        <span className="material-symbols-outlined font-semibold text-lg sm:text-xl">arrow_back</span>
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                            <h1 className="text-xl sm:text-3xl font-semibold text-slate-900 tracking-tight truncate">{domain.name}</h1>
                            <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest border shrink-0 ${
                                domain.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                domain.status === 'expired' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                (domain.status === 'failed' || domain.status === 'error') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                                {getStatusLabel(domain.status)}
                            </span>
                        </div>
                        <p className="text-slate-400 font-semibold text-[9px] sm:text-[10px] uppercase tracking-widest flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                             <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">database</span> #{domain.id}</span>
                             <span className="hidden sm:inline w-1 h-1 bg-slate-300 rounded-full"></span>
                             <span className="text-[#f97316] shrink-0">Registrar: {domain.registrar_name || "Daftarnama"}</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex-1 md:flex-none px-6 sm:px-8 py-3 sm:py-3.5 bg-slate-900 text-white rounded-xl sm:rounded-[1.25rem] text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest hover:bg-[#f97316] transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <span className={`material-symbols-outlined text-lg ${syncing ? 'animate-spin' : ''}`}>sync</span>
                        {syncing ? "SYNCING..." : "SYNC REGISTRAR"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column: Lifecycle & User */}
                <div className="space-y-3">
                    {/* Domain Lifecycle Card */}
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xl shadow-slate-200/30 group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined font-semibold text-lg sm:text-xl">history</span>
                            </div>
                            <h3 className="text-xs sm:text-sm font-semibold text-slate-800 uppercase tracking-tight">Domain Lifecycle</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-end pb-3 sm:pb-4 border-b border-slate-50">
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Registration Date</p>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-700">{lifecycle.regFormatted}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-200 text-xl">event_available</span>
                            </div>

                            <div className="flex justify-between items-end pb-3 sm:pb-4 border-b border-slate-50">
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Expiration Date</p>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-700">{lifecycle.expiryFormatted}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-200 text-xl">event_busy</span>
                            </div>

                            {lifecycle.daysLeft !== null && (
                                <div className="pt-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Remaining Validity</p>
                                        <p className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest ${lifecycle.daysLeft <= 30 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
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
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xl shadow-slate-200/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined font-semibold text-lg sm:text-xl">person_pin</span>
                            </div>
                            <h3 className="text-xs sm:text-sm font-semibold text-slate-800 uppercase tracking-tight">Domain Owner</h3>
                        </div>

                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 sm:p-4 mb-4 space-y-3">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center text-base sm:text-lg font-semibold text-[#f97316]">
                                    {(domain.user_name || "U").charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight truncate">{domain.user_name || "Unknown User"}</p>
                                    <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-widest">UID: #{domain.user_id}</p>
                                </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <span className="material-symbols-outlined text-sm">mail</span>
                                    <span className="text-[11px] font-medium truncate">{domain.user_email || "-"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <span className="material-symbols-outlined text-sm">call</span>
                                    <span className="text-[11px] font-medium">{domain.user_phone || "-"}</span>
                                </div>
                            </div>
                        </div>

                        <Link 
                            to={`/admin/users/${domain.user_id}`}
                            className="w-full py-3.5 sm:py-4 px-6 bg-slate-900 text-white rounded-xl sm:rounded-[1.25rem] text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest hover:bg-[#f97316] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-slate-900/10"
                        >
                            <span className="material-symbols-outlined text-lg">manage_accounts</span>
                            KELOLA USER
                        </Link>
                    </div>

                    {/* Purchase Details Card */}
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xl shadow-slate-200/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined font-semibold text-lg sm:text-xl">shopping_cart</span>
                            </div>
                            <h3 className="text-xs sm:text-sm font-semibold text-slate-800 uppercase tracking-tight">Detail Pembelian</h3>
                        </div>

                        <div className="space-y-4">
                             <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                 <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Invoice ID</span>
                                 <Link to={`/admin/invoices/${domain.invoice_id}`} className="text-xs font-semibold text-[#f97316] hover:underline truncate max-w-[150px]">{domain.invoice_id || "-"}</Link>
                             </div>
                             <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                 <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Harga Beli</span>
                                 <span className="text-xs font-semibold text-slate-700">Rp {(parseInt(domain.purchase_price || 0)).toLocaleString("id-ID")}</span>
                             </div>
                             <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                 <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Status Bayar</span>
                                 <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md ${domain.invoice_status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                     {domain.invoice_status || "-"}
                                 </span>
                             </div>
                        </div>
                    </div>

                    {/* Admin Status Override Card */}
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xl shadow-slate-200/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined font-semibold text-lg sm:text-xl">tune</span>
                            </div>
                            <h3 className="text-xs sm:text-sm font-semibold text-slate-800 uppercase tracking-tight">Status Override</h3>
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
                                className="w-full py-3.5 sm:py-4 bg-orange-50 text-[#f97316] border border-orange-100 rounded-xl sm:rounded-[1.25rem] text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest hover:bg-[#f97316] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {saving ? "UPDATING..." : "UPDATE MANUAL STATUS"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Technical Grid & Logs */}
                <div className="lg:col-span-2 space-y-3">
                    {/* Technical Breakdown Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-left">
                        {/* Registrar Info */}
                        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xl shadow-slate-200/30 hover:shadow-xl transition-all border-l-4 border-l-[#f97316]">
                            <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Registrar Details</p>
                            <div className="space-y-4">
                                <div className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-tighter mb-1">Registrar Order ID</span>
                                    <span className="text-xs sm:text-sm font-semibold text-slate-800 font-mono tracking-tighter bg-white px-2 py-1 rounded-md border border-slate-200 w-fit">
                                        {domain.registrar_order_id || 
                                         domain.registrar_response_raw?.data?.order_id || 
                                         domain.invoice_id || 
                                         "N/A"}
                                    </span>
                                </div>
                                <div className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-tighter mb-1">Registrar Domain ID</span>
                                    <span className="text-xs sm:text-sm font-semibold text-slate-800 font-mono tracking-tighter bg-white px-2 py-1 rounded-md border border-slate-200 w-fit">
                                        {domain.registrar_domain_id || 
                                         domain.registrar_response_raw?.data?.domain_id || 
                                         domain.name || 
                                         "N/A"}
                                    </span>
                                </div>
                                {domain.registrar_response_raw?.data?.customer_username && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <span className="material-symbols-outlined text-xs text-slate-400">account_circle</span>
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">Portal User: {domain.registrar_response_raw.data.customer_username}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Nameservers Card */}
                        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xl shadow-slate-200/30 hover:shadow-xl transition-all border-l-4 border-l-indigo-500">
                             <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Nameservers Config</p>
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
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0"></div>
                                            <span className="text-[11px] sm:text-xs font-semibold text-slate-600 font-mono tracking-tight group-hover/ns:text-[#f97316] transition-colors truncate">{ns}</span>
                                        </div>
                                    ));
                                })()}
                             </div>
                        </div>
                    </div>

                    {/* Registrant Detailed Contacts */}
                    {domain.registrar_response_raw?.data?.registrant_contact && (
                        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-xl shadow-slate-200/30">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined font-semibold">contact_page</span>
                                </div>
                                <h3 className="text-xs sm:text-sm font-semibold text-slate-800 uppercase tracking-tight">Registrant Contact (Raw)</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Registrant</p>
                                        <p className="text-xs font-semibold text-slate-700">{domain.registrar_response_raw.data.registrant_contact.name}</p>
                                        <p className="text-[10px] text-slate-500">{domain.registrar_response_raw.data.registrant_contact.email}</p>
                                        <p className="text-[10px] text-slate-500">{domain.registrar_response_raw.data.registrant_contact.phone_number}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Admin</p>
                                        <p className="text-xs font-semibold text-slate-700">{domain.registrar_response_raw.data.admin_contact.name}</p>
                                        <p className="text-[10px] text-slate-500">{domain.registrar_response_raw.data.admin_contact.email}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Technical</p>
                                        <p className="text-xs font-semibold text-slate-700">{domain.registrar_response_raw.data.technical_contact.name}</p>
                                        <p className="text-[10px] text-slate-500">{domain.registrar_response_raw.data.technical_contact.email}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Registrar User</p>
                                        <p className="text-[11px] font-mono font-semibold text-[#f97316]">{domain.registrar_response_raw.data.customer_username}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* API Raw Data Card (Daftarnama Data Check) */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined">database</span>
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-tight leading-none mb-1">Raw API Data</h3>
                                    <p className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Data sinkronisasi terakhir dari registrar</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-900/5">
                            <pre className="text-[10px] sm:text-[11px] font-mono text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 overflow-x-auto custom-scrollbar max-h-[200px]">
                                {JSON.stringify(domain.registrar_response_raw ? (typeof domain.registrar_response_raw === 'string' ? JSON.parse(domain.registrar_response_raw) : domain.registrar_response_raw) : "No raw data available.", null, 2)}
                            </pre>
                        </div>
                    </div>

                    {/* Audit Logs: Premium Timeline View */}
                    <div className="bg-white rounded-xl sm:rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-slate-100 text-slate-400 rounded-lg flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined font-semibold text-lg sm:text-xl">assignment_late</span>
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-tight leading-none mb-1">Log Sistem</h3>
                                    <p className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Aktivitas & Event</p>
                                </div>
                            </div>
                            <button 
                                onClick={fetchAuditLogs} 
                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-100 text-[#f97316] text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest rounded-lg hover:bg-orange-50 transition-all active:scale-90"
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto custom-scrollbar bg-white">
                            {logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-16 sm:p-12 text-slate-300 gap-4">
                                     <span className="material-symbols-outlined text-5xl sm:text-6xl">history_toggle_off</span>
                                     <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest italic text-center">Belum ada aktivitas tercatat</p>
                                </div>
                            ) : (
                                <div className="p-4 space-y-4">
                                    {logs.map((log, idx) => {
                                        const isError = (log.event_type || '').includes('ERROR') || (log.event_type || '').includes('FAIL');
                                        return (
                                            <div key={log.id} className="relative pl-8 sm:pl-10 group/log">
                                                {/* Line */}
                                                {idx !== logs.length - 1 && (
                                                    <div className="absolute left-[9px] sm:left-[11px] top-5 sm:top-6 bottom-0 w-[1.5px] sm:w-[2px] bg-slate-50 group-hover/log:bg-slate-100 transition-colors"></div>
                                                )}
                                                {/* Point */}
                                                <div className={`absolute left-0 top-1 w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shadow-sm border ${
                                                    isError ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                                }`}>
                                                    <span className={`material-symbols-outlined text-[12px] sm:text-[14px] ${isError ? 'font-semibold' : ''}`}>
                                                        {isError ? 'warning' : 'info'}
                                                    </span>
                                                </div>

                                                <div className="bg-slate-50/10 hover:bg-slate-50/50 p-2 sm:p-3 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                        <span className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest ${
                                                            isError ? 'text-rose-600' : 'text-slate-400'
                                                        }`}>
                                                            {log.event_type || 'SYSTEM EVENT'}
                                                        </span>
                                                        <span className="text-[8px] sm:text-[9px] text-slate-400 font-semibold bg-white px-2 py-0.5 rounded-lg border border-slate-100 w-fit">
                                                            {new Date(log.created_at).toLocaleString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] sm:text-[13px] font-semibold text-slate-600 leading-relaxed italic">
                                                        "{log.message || log.reason || "No description provided."}"
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
                    <div className="bg-rose-50/30 rounded-xl border border-rose-100 p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xl shadow-rose-200/10">
                        <div className="flex items-center gap-4 sm:gap-5">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white text-rose-500 rounded-lg flex items-center justify-center shadow-sm border border-rose-100 shrink-0">
                                <span className="material-symbols-outlined text-2xl sm:text-3xl font-semibold">delete_forever</span>
                            </div>
                            <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-rose-900 leading-none mb-1 uppercase tracking-tight">Danger Zone</h3>
                                <p className="text-[9px] sm:text-[11px] text-rose-600/70 font-semibold max-w-sm leading-relaxed">
                                    Hapus domain secara permanen dari sistem. Gunakan hanya untuk pembersihan data atau domain gagal.
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleDelete}
                            className="w-full md:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-white text-rose-600 border border-rose-200 rounded-xl sm:rounded-[1.25rem] text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-rose-500/5 group"
                        >
                            <div className="flex items-center justify-center gap-2">
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
