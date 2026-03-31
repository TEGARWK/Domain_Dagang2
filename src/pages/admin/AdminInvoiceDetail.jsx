import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import html2pdf from "html2pdf.js";

const AdminInvoiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error, warning } = useNotification();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const handleDownloadPdf = () => {
        const element = document.getElementById('admin-invoice-print-area');
        // Because the element is hidden with "hidden print:block", we temporarily remove 'hidden'
        // just to render, though html2pdf clones the node, so tricking it works best like this:
        element.classList.remove('hidden');
        element.classList.add('block');
        
        const opt = {
          margin:       0.2,
          filename:     `Admin_Invoice_${id}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(element).save().then(() => {
            element.classList.remove('block');
            element.classList.add('hidden');
        });
    };

    const fetchDetail = async () => {
        try {
            const response = await api.get(`/billing/invoice/${id}`);
            setInvoice(response.data);
        } catch (err) {
            console.error("Fetch detail error:", err);
            error("Invoice tidak ditemukan atau akses ditolak.");
            navigate("/admin/invoices");
        } finally {
            setLoading(false);
        }
    };

    const handleCheckStatus = async () => {
        setChecking(true);
        try {
            const response = await api.get(`/prismalink/status/${id}`);
            if (response.data.status === 'PAID') {
                success("Status Pembayaran Terkonfirmasi: LUNAS");
                fetchDetail();
            } else {
                warning(`Status saat ini: ${response.data.status}. Belum ada pembayaran masuk.`);
            }
        } catch (err) {
            console.error(err);
            error("Gagal memeriksa status transaksi.");
        } finally {
            setChecking(false);
        }
    };

    const handleApprove = async () => {
        if (!window.confirm("Apakah Anda yakin ingin menerima pembayaran ini secara manual? Domain akan otomatis didaftarkan.")) return;
        setLoading(true);
        try {
            const response = await api.post(`/billing/invoice/${id}/pay`, {
                payment_method: "MANUAL_ADMIN"
            });
            if (response.data.warning) {
                warning(response.data.message);
            } else {
                success("Pembayaran diterima dan domain berhasil diaktifkan!");
            }
            fetchDetail();
        } catch (err) {
            console.error("Approve error:", err);
            error(err.response?.data?.error || "Gagal memproses pembayaran.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        success("ID Transaksi berhasil disalin!");
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-12 h-12 border-4 border-[#f1f5f9] border-t-[#F97316] rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Memuat Rincian Tagihan...</p>
        </div>
    );
    if (!invoice) return null;

    const formatRupiah = (num) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(num);
    };

    const hasFailedActivation = invoice.status === 'paid' && invoice.items?.some(item => item.domain_status !== 'active');

    return (
        <div className="relative animate-[fadeIn_0.5s_ease-out] pb-20">
            {/* ==========================================
                FORMAL PRINT VIEW (A4 Optimized)
                ========================================== */}
            <div id="admin-invoice-print-area" className="hidden print:block p-8 text-[#0f172a] bg-white relative overflow-hidden">
                
                {/* WATERMARK / STAMP LUNAS */}
                {invoice.status === "paid" && (
                    <div 
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none z-0 flex justify-center items-center"
                      style={{ opacity: 0.1 }}
                    >
                        <div className="border-[8px] border-[#16a34a] rounded-lg px-12 py-6 flex flex-col items-center justify-center bg-[rgba(255,255,255,0.5)]">
                            <span className="text-[4rem] leading-none font-bold text-[#16a34a] tracking-[0.2em] mb-2 uppercase">LUNAS</span>
                            <span className="text-xl font-bold text-[#16a34a] tracking-widest uppercase text-center">PT Aplikasi Dagang Teknologi</span>
                            <div className="w-full h-1 bg-[#16a34a] my-3 rounded-full"></div>
                            <span className="text-base font-semibold text-[#16a34a] tracking-widest uppercase">* OFFICIAL RECEIPT *</span>
                        </div>
                    </div>
                )}

                {/* 1. Header: Branding & Company Info */}
                <div className="flex justify-between items-start border-b-4 border-[#0f172a] pb-10 mb-10 relative z-10">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tighter text-[#0f172a] uppercase leading-none">
                            PT Aplikasi Dagang Teknologi
                        </h1>
                        <p className="text-[9px] font-semibold text-[#64748b] uppercase tracking-[0.4em] mt-1.5 mb-4">Technology Solution Provider</p>
                        
                        <div className="text-xs space-y-1 text-[#475569] font-medium">
                            <p className="font-bold text-[#0f172a] uppercase tracking-wider text-[10px]">PT Aplikasi Dagang Teknologi</p>
                            <p>Jl. Cigadung Raya Tengah No.52, RT.2</p>
                            <p>Cigadung, Kec. Cibeunying Kaler, Kota Bandung</p>
                            <p>Email: admin@aplikasidagang.co.id</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-bold text-[#e2e8f0] uppercase tracking-tighter leading-none mb-3">INVOICE</h2>
                        <div className="space-y-1.5">
                             <div>
                                <p className="text-[9px] font-semibold text-[#94a3b8] uppercase tracking-widest">Invoice Number</p>
                                <p className="text-base font-bold text-[#0f172a]">#INV-{invoice.id}</p>
                             </div>
                             <div>
                                <p className="text-[9px] font-semibold text-[#94a3b8] uppercase tracking-widest">Invoice Date</p>
                                <p className="text-xs font-semibold text-[#334155]">{invoice.date}</p>
                             </div>
                        </div>
                    </div>
                </div>

                {/* 2. Addresses & Summary Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="border-l-4 border-[#f97316] pl-5 py-1">
                        <h4 className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-[0.2em] mb-3">Bill To:</h4>
                        <div className="space-y-0.5">
                            <p className="text-base font-bold text-[#0f172a]">{invoice.customer.name}</p>
                            <p className="text-xs font-bold text-[#f97316]">{invoice.customer.email}</p>
                            <p className="text-xs font-medium text-[#475569]">{invoice.customer.phone || "-"}</p>
                        </div>
                    </div>
                    <div className="bg-[#f8fafc] p-4 rounded-lg">
                        <h4 className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-[0.2em] mb-3">Payment Summary:</h4>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <p className="text-[9px] font-semibold text-[#94a3b8] uppercase">Method</p>
                            <p className="text-[11px] font-bold text-[#0f172a] uppercase">{invoice.payment_method || "Pending Payment"}</p>
                            
                            <p className="text-[9px] font-semibold text-[#94a3b8] uppercase">Trx ID</p>
                            <p className="text-[9px] font-mono font-semibold text-[#475569] break-all">{invoice.plink_ref_no || "N/A"}</p>
                        </div>
                    </div>
                </div>

                {/* 3. Table Structure */}
                <div className="mb-8">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-y-2 border-[#0f172a]">
                                <th className="px-4 py-3 text-[10px] font-bold text-[#0f172a] uppercase tracking-widest">Layanan / Item</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-[#0f172a] uppercase tracking-widest text-center">Durasi</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-[#0f172a] uppercase tracking-widest text-right">Harga</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-[#0f172a] uppercase tracking-widest text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9]">
                            {invoice.items && invoice.items.map((item, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-[#0f172a] text-xs tracking-tight">{item.name}</p>
                                        <p className="text-[9px] text-[#94a3b8] font-semibold uppercase tracking-widest mt-0.5">{item.type || "Domain Registration"}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center text-[10px] font-semibold text-[#475569] uppercase">1 Tahun</td>
                                    <td className="px-4 py-3 text-right font-medium text-[#334155] text-xs">{formatRupiah(item.price)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-[#0f172a] text-xs">{formatRupiah(item.price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. Totals Block */}
                <div className="flex justify-end mb-12">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-[10px] font-semibold text-[#64748b] uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span className="text-[#0f172a]">{formatRupiah(invoice.total)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-semibold text-[#64748b] uppercase tracking-widest">
                            <span>Tax (11%)</span>
                            <span className="text-[#22c55e]">Rp 0 (Promo)</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 px-5 bg-[#0f172a] rounded-lg">
                            <span className="text-[10px] font-semibold text-white uppercase tracking-[0.2em]">Grand Total</span>
                            <span className="text-lg font-bold text-[#f97316]">{formatRupiah(invoice.total)}</span>
                        </div>
                    </div>
                </div>

                {/* 5. Formal Footer: Terms, Notes, & Signature */}
                <div className="grid grid-cols-2 gap-10 items-end border-t border-[#f1f5f9] pt-8 relative z-10">
                    <div className="space-y-4">
                        <div>
                            <h5 className="text-[9px] font-bold text-[#0f172a] uppercase tracking-widest mb-2">Notes & Instructions:</h5>
                            <p className="text-[9px] text-[#64748b] font-medium leading-relaxed italic">
                                * Faktur ini sah dan dihasilkan secara otomatis oleh sistem dagangdomain.com.<br/>
                                * Untuk pertanyaan terkait penagihan, silakan hubungi tim support melalui email admin@aplikasidagang.co.id.<br/>
                                * Domain yang telah didaftarkan tidak dapat dibatalkan atau dikembalikan (No Refund Policy).
                            </p>
                        </div>
                        <p className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-[0.4em]">Thank you for your business!</p>
                    </div>
                    <div className="text-center px-6">
                        <p className="text-[9px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-12">Authorized Signature</p>
                        <div className="border-t border-[#0f172a] pt-2">
                            <p className="text-xs font-bold text-[#0f172a] uppercase">Finance Department</p>
                            <p className="text-[8px] font-semibold text-[#64748b] uppercase tracking-widest">PT Aplikasi Dagang Teknologi</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==========================================
                SCREEN VIEW (Dashboard Layout)
                ========================================== */}
            <div className="print:hidden space-y-6">
                {/* Header / Breadcrumb */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Link 
                            to="/admin/invoices" 
                            className="w-12 h-12 flex items-center justify-center bg-white border border-[#e2e8f0] rounded-lg text-[#94a3b8] hover:text-[#f97316] hover:border-[#f97316] transition-all classic-shadow group"
                            title="Kembali ke Daftar"
                        >
                            <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-[#f1f5f9] text-[#64748b] text-[9px] font-bold uppercase rounded tracking-widest">Tagihan</span>
                                <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-tighter">#{invoice.id}</span>
                            </div>
                            <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight leading-none">Rincian Tagihan</h1>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={handleCheckStatus}
                            disabled={checking}
                            className="h-12 px-6 bg-white border border-[#e2e8f0] text-[#475569] rounded-lg text-sm font-semibold hover:border-[#f97316] hover:text-[#f97316] transition-all classic-shadow flex items-center gap-2 disabled:opacity-50"
                        >
                            <span className={`material-symbols-outlined text-lg ${checking ? 'animate-spin' : ''}`}>sync</span>
                            {checking ? 'Memeriksa...' : 'Cek Status'}
                        </button>
                        <button 
                            onClick={handleDownloadPdf}
                            className="h-12 px-6 bg-white border border-[#e2e8f0] text-[#475569] rounded-lg text-sm font-semibold hover:border-[#cbd5e1] transition-all classic-shadow flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            Download PDF
                        </button>
                        {invoice.status === 'pending' && (
                            <button 
                                onClick={handleApprove}
                                className="h-12 px-6 bg-[#F97316] text-white rounded-lg text-sm font-semibold hover:bg-[#0f172a] transition-all classic-shadow active:scale-95"
                            >
                                Terima Pembayaran
                            </button>
                        )}
                        {hasFailedActivation && (
                            <button 
                                onClick={handleApprove}
                                className="h-12 px-6 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-all classic-shadow flex items-center gap-2 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-lg">replay</span>
                                Retry Aktivasi
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl p-6 border border-[#f1f5f9] classic-shadow">
                            <div className="p-8 border-b border-[#f8fafc] flex justify-between items-center bg-[#f8fafc]/20">
                                <h3 className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest">Item Tagihan</h3>
                                <span className={`-lg text-[10px] font-bold uppercase tracking-widest border ${
                                    invoice.status === 'paid' ? 'bg-[#ecfdf5] text-[#059669] border-[#d1fae5]' : 'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                    {invoice.status === 'paid' ? 'Lunas' : 'Menunggu'}
                                </span>
                            </div>
                            <div className="p-8">
                                {invoice.plink_ref_no && (
                                    <div className="mb-8 p-5 bg-[#f8fafc] border border-[#f1f5f9] rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <div className="flex-1">
                                            <p className="text-[10px] uppercase font-bold text-[#94a3b8] tracking-wider mb-1">Transaction ID</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-mono font-bold text-[#475569] bg-white px-3 py-1.5 rounded-lg border border-[#e2e8f0]">{invoice.plink_ref_no}</p>
                                                <button 
                                                    onClick={() => handleCopy(invoice.plink_ref_no)}
                                                    className="p-2 text-[#94a3b8] hover:text-[#f97316] transition-colors"
                                                    title="Salin ID"
                                                >
                                                    <span className="material-symbols-outlined text-lg">content_copy</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="sm:text-right">
                                            <p className="text-[10px] uppercase font-bold text-[#94a3b8] tracking-wider mb-1">Payment Method</p>
                                            <p className="text-sm font-bold text-[#f97316] bg-[#fff7ed] px-3 py-1.5 rounded-lg border border-[#ffedd5] inline-block uppercase">{invoice.payment_method || "-"}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="overflow-x-auto print:overflow-visible">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-[#f8fafc]/50">
                                                <th className="px-4 py-4 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider rounded-l-xl">Deskripsi Layanan</th>
                                                <th className="px-4 py-4 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider text-center">Status</th>
                                                <th className="px-4 py-4 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider text-center">Durasi</th>
                                                <th className="px-4 py-4 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider text-right rounded-r-xl">Harga</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f8fafc] text-[#334155]">
                                            {invoice.items && invoice.items.map((item, i) => (
                                                <tr key={i} className="hover:bg-[#f8fafc]/30 transition-colors">
                                                    <td className="px-4 py-6">
                                                        <p className="font-bold text-[#0f172a] text-sm">{item.name}</p>
                                                        <p className="text-[10px] text-[#94a3b8] font-bold uppercase mt-0.5">{item.type || "Domain Registration"}</p>
                                                    </td>
                                                    <td className="px-4 py-6 text-center">
                                                        {item.domain_status === 'active' ? (
                                                            <span className="inline-flex -lg text-[9px] font-bold uppercase tracking-wider border border-[#d1fae5]">Aktif</span>
                                                        ) : (item.domain_status === 'processing' || item.domain_status === 'provisioned') ? (
                                                            <span className="inline-flex -lg text-[9px] font-bold uppercase tracking-wider border border-[#dbeafe] animate-pulse">Proses Aktivasi</span>
                                                        ) : item.domain_status ? (
                                                            <span className="inline-flex -lg text-[9px] font-bold uppercase tracking-wider border border-amber-100">{item.domain_status}</span>
                                                        ) : (
                                                            <span className="inline-flex -lg text-[9px] font-bold uppercase tracking-wider border border-[#e2e8f0]">Belum Terdaftar</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-6 text-center text-[11px] font-bold text-[#94a3b8] uppercase">1 Tahun</td>
                                                    <td className="px-4 py-6 text-right font-bold text-[#0f172a] text-sm">{formatRupiah(item.price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-10 space-y-3 bg-[#f8fafc]/50 p-6 rounded-xl border border-[#f1f5f9]">
                                    <div className="flex justify-between text-xs font-bold text-[#94a3b8] uppercase tracking-widest">
                                        <span>Subtotal</span>
                                        <span className="text-[#475569]">{formatRupiah(invoice.total)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-[#94a3b8] uppercase tracking-widest">
                                        <span>Pajak (0%)</span>
                                        <span className="text-[#475569]">Rp 0</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-5 mt-2 border-t border-[#e2e8f0]">
                                        <span className="text-sm font-bold text-[#0f172a] uppercase tracking-widest">Total Pembayaran</span>
                                        <span className="text-2xl font-bold text-[#f97316]">{formatRupiah(invoice.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 border border-[#f1f5f9] classic-shadow">
                            <h3 className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest mb-8">Informasi Pelanggan</h3>
                            <div className="space-y-5">
                                <div>
                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">Nama / Bisnis</p>
                                    <p className="text-sm font-bold text-[#0f172a]">{invoice.customer.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">Email Korespondensi</p>
                                    <p className="text-sm font-bold text-[#f97316]">{invoice.customer.email}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">Nomor Telepon</p>
                                    <p className="text-sm font-bold text-[#475569]">{invoice.customer.phone || "-"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-[#f1f5f9] classic-shadow">
                            <h3 className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest mb-8">Log Aktivitas</h3>
                            <div className="relative space-y-8 pl-4">
                                {/* Vertical Line */}
                                <div className="absolute left-4 top-1 bottom-1 w-[1px] bg-[#f1f5f9]"></div>
                                
                                {invoice.logs && invoice.logs.map((log, index) => (
                                    <div key={index} className="relative flex gap-4">
                                        <div className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${
                                            log.action.includes('Paid') || log.action.includes('Diterima') ? 'bg-[#10b981]' :
                                            log.action.includes('Expired') || log.action.includes('Kadaluarsa') ? 'bg-rose-500' :
                                            'bg-[#f97316]'
                                        }`}></div>
                                        <div className="pl-4">
                                            <p className="text-xs font-bold text-[#1e293b] leading-tight">{log.action}</p>
                                            <p className="text-[10px] text-[#94a3b8] font-medium mt-1 uppercase tracking-tighter">{log.date} <span className="mx-1">•</span> {log.by}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminInvoiceDetail;
