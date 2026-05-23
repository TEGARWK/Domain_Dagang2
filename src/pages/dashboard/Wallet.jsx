import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";
import { useNotification } from '../../context/NotificationContext';
import { CreditCardIcon, ClockIcon, PlusIcon } from '@heroicons/react/24/outline';

const Wallet = () => {
    const [wallet, setWallet] = useState({ balance: 0, currency: 'IDR', transactions: [] });
    const [loading, setLoading] = useState(true);
    
    // Modal States
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const { success, error } = useNotification();
    const navigate = useNavigate();
    
    const [topUpAmount, setTopUpAmount] = useState('');
    const [processingTopUp, setProcessingTopUp] = useState(false);

    // Advanced Table States
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const walletRes = await api.get('/wallet');
            setWallet(walletRes.data);
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTopUp = async (e) => {
        e.preventDefault();
        setProcessingTopUp(true);
        try {
            const amount = typeof topUpAmount === 'number' ? topUpAmount : parseInt(topUpAmount.toString().replace(/\D/g, ''));
            if (!amount || amount < 10000) {
                error("Minimum Top Up Rp 10.000");
                setProcessingTopUp(false);
                return;
            }

            // Create Top Up Invoice
            const res = await api.post('/checkout/topup', { 
                userId: JSON.parse(localStorage.getItem('user')).id,
                amount: amount
            });

            // Redirect to Checkout Page with Invoice ID
            navigate(`/checkout?invoiceId=${res.data.invoiceId}`);

        } catch (err) {
            console.error(err);
            error(err.response?.data?.message || err.response?.data?.error || "Gagal membuat top up. Coba beberapa saat lagi.");
        } finally {
            setProcessingTopUp(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = () => {
        const exportData = formatDataForExport(processedTransactions, {
            date: 'Tanggal',
            type: 'Tipe',
            reference_type: 'Referensi',
            description: 'Keterangan',
            amount: 'Nominal',
            balance_after: 'Saldo Akhir'
        });
        exportToExcel(exportData, 'Wallet_History', 'Transactions');
    };

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const processedTransactions = React.useMemo(() => {
        let result = [...(wallet.transactions || [])];

        if (typeFilter !== "all") {
            result = result.filter(tx => tx.type === typeFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(tx => 
                (tx.reference_type || "").toLowerCase().includes(q) || 
                (tx.description || "").toLowerCase().includes(q)
            );
        }

        result.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (sortConfig.key === "amount" || sortConfig.key === "balance_after") {
                valA = parseFloat(valA || 0);
                valB = parseFloat(valB || 0);
            }
            if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
            if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [wallet.transactions, typeFilter, searchQuery, sortConfig]);

    const totalTransactions = processedTransactions.length;
    const totalPages = Math.ceil(totalTransactions / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTransactions = processedTransactions.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, typeFilter]);

    if (loading && wallet.transactions.length === 0) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-4 w-32 bg-slate-100 rounded mb-2"></div>
                <div className="h-32 bg-slate-200 rounded-xl"></div>
                <div className="bg-white rounded-xl border border-slate-100 h-96">
                    <div className="p-4 border-b border-slate-50">
                        <div className="h-6 w-48 bg-slate-50 rounded"></div>
                    </div>
                    <div className="p-4 space-y-4">
                        {Array(5).fill(0).map((_, i) => (
                            <div key={i} className="h-12 bg-slate-50/50 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">Dompet Saya</h1>
                <p className="text-xs text-slate-500">Kelola saldo dan riwayat transaksi anda.</p>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <p className="text-orange-100 font-medium mb-1">Saldo Aktif</p>
                        <h2 className="text-4xl font-bold">
                            Rp {(wallet?.balance || 0).toLocaleString('id-ID')}
                        </h2>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleExportExcel}
                            className="bg-emerald-500/20 text-white px-4 py-2.5 rounded-lg font-bold text-xs hover:bg-emerald-500/30 transition backdrop-blur-md border border-white/20 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">download</span>
                            Excel
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="bg-white/10 text-white px-4 py-2.5 rounded-lg font-bold text-xs hover:bg-white/20 transition backdrop-blur-md border border-white/20 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">print</span>
                            Print
                        </button>
                        <button 
                            onClick={() => setShowTopUpModal(true)}
                            className="bg-white text-orange-600 px-4 py-2.5 rounded-lg font-bold text-xs hover:bg-orange-50 transition shadow-md flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Isi Saldo
                        </button>
                    </div>
                </div>
                {/* Decor */}
                <div className="absolute -bottom-10 -right-10 text-white/10">
                    <CreditCardIcon className="w-48 h-48" />
                </div>
            </div>


            {/* --- PRINT SYSTEM OVERRIDE --- */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    body { background: #fff !important; }
                    .print\\:hidden, .sidebar, .navbar, .action-bar, .no-print, nav, .top-up-modal { display: none !important; }
                    .print-area { 
                        display: block !important; 
                        width: 210mm !important; 
                        height: 297mm !important; 
                        padding: 20mm !important;
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        background: white !important;
                        z-index: 9999 !important;
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            `}} />

            {/* ==========================================
                FORMAL WALLET STATEMENT (A4 Optimized)
                ========================================== */}
            <div id="wallet-statement-print-area" className="hidden print-area text-[#0f172a] bg-white relative overflow-hidden">
                <div className="flex justify-between items-start border-b-4 border-[#0f172a] pb-10 mb-10">
                    <div className="flex items-start gap-4">
                        <img src="/image/logo/ADTLogo.png" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tighter text-[#0f172a] uppercase leading-none">
                                PT Aplikasi Dagang Teknologi
                            </h1>
                            <p className="text-[9px] font-semibold text-[#64748b] uppercase tracking-[0.4em] mt-1.5">Technology Solution Provider</p>
                            <div className="text-[11px] space-y-1 text-[#475569] font-medium mt-4">
                                <p>Jl. Cigadung Raya Tengah No.52, RT.2</p>
                                <p>Bandung, Jawa Barat, Indonesia</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-bold text-[#e2e8f0] uppercase tracking-tighter leading-none mb-3">TRANSACTION STATEMENT</h2>
                        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Saldo Saat Ini: Rp {(wallet?.balance || 0).toLocaleString('id-ID')}</p>
                        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Dicetak: {new Date().toLocaleString('id-ID')}</p>
                    </div>
                </div>

                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-slate-900">
                            <th className="py-3 text-[10px] font-bold uppercase">Tanggal</th>
                            <th className="py-3 text-[10px] font-bold uppercase text-center">Tipe</th>
                            <th className="py-3 text-[10px] font-bold uppercase">Keterangan</th>
                            <th className="py-3 text-[10px] font-bold uppercase text-right">Nominal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {wallet.transactions?.slice(0, 20).map((tx, i) => (
                            <tr key={i}>
                                <td className="py-4 text-[11px] font-bold text-slate-400 uppercase">
                                    {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="py-4 text-center">
                                    <span className="text-[9px] font-bold uppercase tracking-widest border border-slate-100 px-2 py-1 rounded">
                                        {tx.type}
                                    </span>
                                </td>
                                <td className="py-4">
                                    <p className="text-xs font-bold text-slate-700">{tx.reference_type}</p>
                                    <p className="text-[10px] text-slate-400">{tx.description}</p>
                                </td>
                                <td className={`py-4 text-right text-xs font-bold ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                    {tx.type === 'CREDIT' ? '+' : '-'} Rp {(tx.amount || 0).toLocaleString('id-ID')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-20 pt-10 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 italic">Laporan ini sah sebagai bukti mutasi saldo resmi PT Aplikasi Dagang Teknologi.</p>
                    <p className="text-[10px] font-bold text-slate-900 mt-2">&copy; {new Date().getFullYear()} PT Aplikasi Dagang Teknologi</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="p-3 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight shrink-0">
                            <span className="material-symbols-outlined text-[#F97316] text-xl">history_edu</span>
                            Riwayat Transaksi
                        </h3>
                        <div className="flex flex-1 w-full max-w-xl relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f97316] transition-colors">search</span>
                            <input 
                                type="text" 
                                placeholder="Cari referensi atau keterangan..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-11 pr-4 bg-white border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <div className="w-full md:w-40">
                            <select 
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full h-10 px-4 bg-white border border-slate-100 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 focus:outline-none focus:border-[#f97316] transition-all"
                            >
                                <option value="all">Semua Tipe</option>
                                <option value="CREDIT">Masuk</option>
                                <option value="DEBIT">Keluar</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                <th className="px-4 py-3 border-b border-slate-100 cursor-pointer hover:text-slate-600 transition-colors group/th" onClick={() => handleSort('date')}>
                                    <div className="flex items-center gap-1">
                                        Tanggal
                                        <span className={`material-symbols-outlined text-sm ${sortConfig.key === 'date' ? 'text-[#f97316]' : 'text-slate-300 opacity-0 group-hover/th:opacity-100'}`}>
                                            {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                                        </span>
                                    </div>
                                </th>
                                <th className="px-4 py-3 border-b border-slate-100 text-center">Tipe</th>
                                <th className="px-4 py-3 border-b border-slate-100">Keterangan</th>
                                <th className="px-4 py-3 border-b border-slate-100 text-right cursor-pointer hover:text-slate-600 transition-colors group/th" onClick={() => handleSort('amount')}>
                                    <div className="flex items-center justify-end gap-1">
                                        Nominal
                                        <span className={`material-symbols-outlined text-sm ${sortConfig.key === 'amount' ? 'text-[#f97316]' : 'text-slate-300 opacity-0 group-hover/th:opacity-100'}`}>
                                            {sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                                        </span>
                                    </div>
                                </th>
                                <th className="px-4 py-3 border-b border-slate-100 text-right cursor-pointer hover:text-slate-600 transition-colors group/th" onClick={() => handleSort('balance_after')}>
                                    <div className="flex items-center justify-end gap-1">
                                        Saldo Akhir
                                        <span className={`material-symbols-outlined text-sm ${sortConfig.key === 'balance_after' ? 'text-[#f97316]' : 'text-slate-300 opacity-0 group-hover/th:opacity-100'}`}>
                                            {sortConfig.key === 'balance_after' ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                                        </span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                            {paginatedTransactions.length > 0 ? (
                                paginatedTransactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-1.5">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase">
                                                {new Date(tx.date).toLocaleDateString('id-ID', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                                                tx.type === 'CREDIT' 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                {tx.type === 'CREDIT' ? 'MASUK' : 'KELUAR'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-900 text-xs uppercase tracking-tight">{tx.reference_type}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{tx.description}</div>
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${
                                            tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'
                                        }`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'} Rp {(tx.amount || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-4 py-1.5 text-right text-slate-400 font-bold text-xs">
                                            Rp {(tx.balance_after || 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-10 text-center text-slate-400 font-bold italic">
                                        Belum ada riwayat transaksi.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Improved Pagination */}
                {totalPages > 1 && (
                    <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                            Halaman <span className="text-slate-900">{currentPage}</span> Dari <span className="text-slate-900">{totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                className="px-6 py-2.5 bg-white border border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-widest text-slate-600 hover:border-[#f97316] hover:text-[#f97316] transition-all disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-600 flex items-center gap-2 shadow-sm"
                            >
                                Kembali
                            </button>
                            <button 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className="px-6 py-2.5 bg-slate-900 text-white border border-slate-900 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-[#f97316] hover:border-[#f97316] transition-all disabled:opacity-30 disabled:hover:bg-slate-900 flex items-center gap-2 shadow-lg shadow-slate-900/10"
                            >
                                Lanjut
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Top Up Modal */}
            {showTopUpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Isi Saldo Wallet</h3>
                            <p className="text-sm text-slate-500">Masukkan nominal top up (Min. Rp 10.000)</p>
                        </div>
                        <form onSubmit={handleTopUp} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nominal (Rp)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        className="w-full pl-12 pr-4 py-4 rounded-lg border-2 border-slate-100 focus:border-orange-500 outline-none text-2xl font-bold text-slate-800 transition-all"
                                        placeholder="0"
                                        value={(() => {
                                            if (!topUpAmount) return '';
                                            return new Intl.NumberFormat('id-ID').format(topUpAmount);
                                        })()}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setTopUpAmount(val ? parseInt(val) : '');
                                        }}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Preset Buttons */}
                            <div className="grid grid-cols-3 gap-2">
                                {[10000, 50000, 100000, 250000, 500000, 1000000].map((nominal) => (
                                    <button
                                        key={nominal}
                                        type="button"
                                        onClick={() => setTopUpAmount(nominal)}
                                        className={`py-2 px-1 rounded-lg border text-sm font-bold transition-all ${
                                            topUpAmount === nominal 
                                            ? 'bg-orange-50 border-orange-500 text-orange-600' 
                                            : 'border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {nominal >= 1000000 
                                            ? `${nominal / 1000000}JT` 
                                            : `${nominal / 1000}RB`}
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowTopUpModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={processingTopUp || !topUpAmount}
                                    className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                                >
                                    {processingTopUp ? 'Memproses...' : 'Lanjut Bayar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Wallet;
