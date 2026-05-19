import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import CustomSelect from "../../components/ui/CustomSelect";
import { useConfirm } from "../../context/ConfirmContext";
import { useNotification } from "../../context/NotificationContext";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";
import AdminTransferRequests from "./AdminTransferRequests";

const AdminDomains = () => {
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("all_domains"); // all_domains, transfer_requests
    const { success, error } = useNotification();
    const navigate = useNavigate();
    const [selectedIds, setSelectedIds] = useState([]);
    const confirm = useConfirm();
    
    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    useEffect(() => {
        fetchDomains();
    }, []);

    const fetchDomains = async () => {
        setLoading(true);
        try {
            const response = await api.get("/domains/all");
            const formatted = response.data.map(d => ({
                id: d.id,
                name: d.domain_name,
                user: d.user_name || "Unknown",
                expiry: d.expiration_date,
                status: d.status?.toLowerCase() || 'unknown',
                docStatus: d.document_status_mapped || "N/A",
                lastSync: d.last_document_sync_at,
                is_transfer: d.is_transfer,
                // Add calculation for days left
                daysLeft: d.expiration_date ? Math.ceil((new Date(d.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
            }));
            setDomains(formatted);
        } catch (err) {
            console.error("Error fetching domains:", err);
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIC: Stats Calculation ---
    const stats = useMemo(() => {
        return {
            total: domains.length,
            active: domains.filter(d => d.status === 'active').length,
            expiredCount: domains.filter(d => d.status === 'expired').length,
            troubled: domains.filter(d => d.status === 'failed' || d.status === 'error' || d.docStatus === 'rejected').length
        };
    }, [domains]);

    // --- LOGIC: Filtering, Searching, & Sorting ---
    const sortedAndFilteredData = useMemo(() => {
        let result = [...domains];

        // 1. Filter by Status
        if (statusFilter !== "all") {
            result = result.filter(d => d.status === statusFilter);
        }

        // 2. Search
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            result = result.filter(d => 
                d.name.toLowerCase().includes(s) || 
                d.user.toLowerCase().includes(s)
            );
        }

        // 3. Sort
        result.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'expiry') {
                valA = a.expiry ? new Date(a.expiry) : new Date(0);
                valB = b.expiry ? new Date(b.expiry) : new Date(0);
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [domains, statusFilter, searchTerm, sortConfig]);

    // --- LOGIC: Pagination ---
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedAndFilteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(currentItems.map(d => d.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectItem = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkSync = async () => {
        const isConfirmed = await confirm({
            title: "Sinkronisasi Massal",
            message: `Sinkronkan ${selectedIds.length} domain terpilih dengan registrar?`,
            confirmText: "Ya, Sinkronkan Semua"
        });
        if (!isConfirmed) return;
        
        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => api.post(`/domains/${id}/sync`).catch(() => null)));
            success(`${selectedIds.length} Domain berhasil disinkronkan!`);
        } finally {
            setLoading(false);
            setSelectedIds([]);
            fetchDomains();
        }
    };

    const handleExportExcel = () => {
        const exportData = formatDataForExport(sortedAndFilteredData, {
            id: 'DID',
            name: 'Domain',
            user: 'Owner',
            status: 'Status',
            expiry: 'Expiration'
        });
        exportToExcel(exportData, 'Data_Domains', 'Domains');
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

    const handleSyncSingle = async (id, name) => {
        setLoading(true);
        try {
            await api.post(`/domains/${id}/sync`);
            success(`Domain ${name} berhasil disinkronkan!`);
            fetchDomains();
        } catch (err) {
            console.error(err);
            error(`Gagal sinkronisasi ${name}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncAll = async () => {
        const isConfirmed = await confirm({
            title: "Sinkronisasi Domain",
            message: "Sinkronisasi 10 domain teratas? Proses ini mungkin memakan waktu.",
            type: "warning",
            confirmText: "Ya, Sinkronkan"
        });
        if(!isConfirmed) return;
        setLoading(true);
        try {
            const toSync = currentItems.slice(0, 5); 
            await Promise.all(toSync.map(d => api.post(`/domains/${d.id}/sync`).catch(() => null)));
            fetchDomains();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Utility: Get Initial For Avatar
    const getInitial = (name) => name.charAt(0).toUpperCase();

    return (
        <div className="space-y-4 animate-[fadeIn_0.5s_ease-out] pb-20">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
                {/* Total Domains - HIGH IMPACT */}
                <div className="relative overflow-hidden bg-[#f97316] p-3 rounded-xl shadow-xl shadow-orange-200/50 flex items-center gap-4 group hover:shadow-xl hover:shadow-orange-300/40 hover:-translate-y-1 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16 transition-transform duration-1000 group-hover:bg-white/30 group-hover:scale-150"></div>
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-2xl transition-transform duration-1000 group-hover:scale-125"></div>
                    
                    <div className="relative z-10 w-14 h-14 bg-white/20 backdrop-blur-md text-white rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 border border-white/30 shadow-inner">
                        <span className="material-symbols-outlined text-2xl font-bold">domain</span>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em] leading-none">Total Managed</p>
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></span>
                        </div>
                        <h3 className="text-3xl font-bold text-white leading-none tracking-tight">{loading ? "..." : stats.total}</h3>
                        <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-2">ACTIVE DOMAINS</p>
                    </div>
                </div>

                {/* Active Domains */}
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                        <span className="material-symbols-outlined text-2xl">check_circle</span>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Active Status</p>
                        <h3 className="text-2xl font-bold text-slate-900 leading-none">{loading ? "..." : stats.active}</h3>
                        <p className="text-[10px] font-bold text-emerald-500 mt-1">Ready for Use</p>
                    </div>
                </div>

                {/* Expired Domains */}
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                        <span className="material-symbols-outlined text-2xl">event_busy</span>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Expired Domains</p>
                        <h3 className="text-2xl font-bold text-slate-900 leading-none">{loading ? "..." : stats.expiredCount}</h3>
                        <p className="text-[10px] font-bold text-amber-500 mt-1">Need Renewal</p>
                    </div>
                </div>

                {/* Troubled/Pending */}
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
                        <span className="material-symbols-outlined text-2xl">warning</span>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Troubled Info</p>
                        <h3 className="text-2xl font-bold text-slate-900 leading-none">{loading ? "..." : stats.troubled}</h3>
                        <p className="text-[10px] font-bold text-rose-500 mt-1">Action Required</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm w-fit mx-auto lg:mx-1">
                <button 
                    onClick={() => setActiveTab("all_domains")}
                    className={`px-8 py-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                        activeTab === "all_domains" 
                        ? "bg-slate-900 text-white shadow-lg" 
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    }`}
                >
                    Semua Domain
                </button>
                <button 
                    onClick={() => setActiveTab("transfer_requests")}
                    className={`px-8 py-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                        activeTab === "transfer_requests" 
                        ? "bg-slate-900 text-white shadow-lg" 
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    }`}
                >
                    Permintaan Transfer
                </button>
            </div>

            {activeTab === "all_domains" ? (
                <>
            {/* Main Content Area */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                {/* Unified Header: Search & Filter */}
                <div className="p-3 sm:p-3 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4 sm:gap-6">
                        <div className="flex-1 w-full max-w-xl relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f97316] transition-colors">search</span>
                            <input 
                                type="text" 
                                placeholder="Cari Domain, Pemilik, atau Extension..." 
                                value={searchTerm}
                                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                                className="w-full h-12 pl-12 pr-6 bg-white border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-48">
                                <CustomSelect
                                    value={statusFilter}
                                    onChange={(val) => {setStatusFilter(val); setCurrentPage(1);}}
                                    options={[
                                    ]}
                                />
                            </div>
                            <button 
                                onClick={handleExportExcel}
                                className="h-12 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Export
                            </button>
                            <button 
                                onClick={handleSyncAll}
                                disabled={loading}
                                className="h-12 px-6 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#f97316] transition-all shadow-lg shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>sync</span>
                                SYNC ALL
                            </button>
                        </div>
                    </div>
                </div>

                {/* Domain Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <th className="px-4 py-3 w-10">
                                    <input 
                                        type="checkbox" 
                                        onChange={handleSelectAll}
                                        checked={selectedIds.length === currentItems.length && currentItems.length > 0}
                                        className="w-4 h-4 rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
                                    />
                                </th>
                                <th className="px-4 py-2 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('name')}>
                                    <div className="flex items-center gap-2">
                                        Domain & Path
                                        <span className="material-symbols-outlined text-xs">{sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'sort'}</span>
                                    </div>
                                </th>
                                <th className="px-4 py-2 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('user')}>
                                    <div className="flex items-center gap-2">
                                        Owner
                                        <span className="material-symbols-outlined text-xs">{sortConfig.key === 'user' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'sort'}</span>
                                    </div>
                                </th>
                                <th className="px-4 py-2 text-center">Status</th>
                                <th className="px-4 py-2 cursor-pointer hover:text-slate-600 transition-all group" onClick={() => requestSort('expiry')}>
                                    <div className="flex items-center gap-2">
                                        Expiration
                                        <span className="material-symbols-outlined text-xs">{sortConfig.key === 'expiry' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'sort'}</span>
                                    </div>
                                </th>
                                <th className="px-4 py-2 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                            {loading ? (
                                Array(itemsPerPage).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-4"><div className="h-4 w-4 bg-slate-100 rounded"></div></td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-slate-100 rounded-lg"></div>
                                                <div>
                                                    <div className="h-4 w-40 bg-slate-100 rounded mb-2"></div>
                                                    <div className="h-2 w-16 bg-slate-50 rounded"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 bg-slate-50 rounded-lg"></div>
                                                <div className="h-4 w-24 bg-slate-100 rounded"></div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center"><div className="h-6 w-20 bg-slate-100 rounded-lg mx-auto"></div></td>
                                        <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
                                        <td className="px-4 py-4 text-center"><div className="h-10 w-32 bg-slate-100 rounded-lg mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-300">
                                            <span className="material-symbols-outlined text-6xl">domain_disabled</span>
                                            <p className="text-xs font-bold uppercase tracking-widest italic">Tidak ada domain ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((dom) => (
                                    <tr key={dom.id} className={`hover:bg-slate-50/40 transition group ${selectedIds.includes(dom.id) ? 'bg-orange-50/30' : ''}`}>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(dom.id)}
                                                onChange={() => handleSelectItem(dom.id)}
                                                className="w-4 h-4 rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
                                            />
                                        </td>
                                        <td className="px-4 py-1.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-lg">language</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-slate-800 text-sm tracking-tight">{dom.name}</p>
                                                        {dom.is_transfer ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                                                Transfer
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                                New
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">DID: #{dom.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5">
                                            <div 
                                                onClick={() => navigate(`/admin/users?search=${dom.user}`)}
                                                className="flex items-center gap-3 cursor-pointer group/owner"
                                            >
                                                <div className="w-7 h-7 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase group-hover/owner:bg-indigo-500 group-hover/owner:text-white transition-colors">
                                                    {getInitial(dom.user)}
                                                </div>
                                                <p className="text-xs font-bold text-slate-600 tracking-tight group-hover/owner:text-indigo-600 transition-colors underline decoration-dotted decoration-slate-300 underline-offset-4">{dom.user}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5 text-center">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${
                                                dom.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100' :
                                                dom.status === 'expired' ? 'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-100' :
                                                (dom.status === 'failed' || dom.status === 'error') ? 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-100' :
                                                'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-100'
                                            }`}>
                                                {getStatusLabel(dom.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-1.5">
                                            <div className="flex flex-col">
                                                <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-tight">
                                                    {dom.expiry ? new Date(dom.expiry).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                                                </p>
                                                {dom.daysLeft !== null && (
                                                    <p className={`text-[9px] font-semibold uppercase tracking-tighter mt-0.5 ${
                                                        dom.status === 'expired' || dom.daysLeft <= 30 ? 'text-rose-500' : 'text-slate-400'
                                                    }`}>
                                                        {dom.status === 'expired' ? 'Sudah Expired' : `${dom.daysLeft} Hari Lagi`}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => navigate(`/admin/invoices?search=${dom.name}`)}
                                                    title="Lihat Invoices Domain"
                                                    className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 border border-slate-100 rounded-lg hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-100 transition-all shadow-sm active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleSyncSingle(dom.id, dom.name)}
                                                    disabled={loading}
                                                    title="Sync Registrar"
                                                    className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 border border-slate-100 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                                >
                                                    <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>sync</span>
                                                </button>
                                                <Link 
                                                    to={`/admin/domains/${dom.id}`}
                                                    title="Detail & Settings"
                                                    className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 border border-slate-100 rounded-lg hover:bg-[#f97316] hover:text-white hover:border-[#f97316] transition-all shadow-sm active:scale-90"
                                                >
                                                    <span className="material-symbols-outlined text-lg">settings_applications</span>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer: Pagination */}
                {!loading && sortedAndFilteredData.length > 0 && (
                    <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="bg-white px-5 py-2.5 rounded-lg border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Showing <span className="text-[#f97316] font-bold">{indexOfFirstItem + 1}</span> to <span className="text-[#f97316] font-bold">{Math.min(indexOfLastItem, sortedAndFilteredData.length)}</span> of <span className="text-slate-800 font-bold">{sortedAndFilteredData.length}</span> entries
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-6 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-widest text-slate-600 hover:border-[#F97316] hover:text-[#F97316] transition-all disabled:opacity-30 flex items-center gap-2 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                                Kembali
                            </button>
                            
                            <button 
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-6 py-2.5 bg-slate-900 text-white border border-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-[#F97316] hover:border-[#F97316] transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-slate-900/10"
                            >
                                Lanjut
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
                </>
            ) : (
                <AdminTransferRequests />
            )}

            {/* Floating Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-black/40 flex items-center gap-8 animate-in slide-in-from-bottom-10 duration-300 border border-slate-800">
                    <div className="flex flex-col">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Terpilih</p>
                        <p className="text-xl font-bold leading-none">{selectedIds.length} <span className="text-xs text-slate-500 font-medium">Domain</span></p>
                    </div>
                    
                    <div className="w-px h-10 bg-slate-800"></div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleBulkSync}
                            className="h-11 px-6 bg-[#F97316] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-900/20"
                        >
                            <span className="material-symbols-outlined text-lg">sync</span>
                            Sinkronkan Semua
                        </button>
                        <button 
                            onClick={() => setSelectedIds([])}
                            className="w-11 h-11 flex items-center justify-center bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 transition-all"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDomains;
