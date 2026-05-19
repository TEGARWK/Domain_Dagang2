import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import html2pdf from "html2pdf.js";
import { QRCodeCanvas } from "qrcode.react";
import { useNotification } from "../../context/NotificationContext";

const DetailInvoice = () => {
  const params = useParams();
  // Ambil ID dari params.id ATAU params.invoiceId (antisipasi beda nama di App.jsx)
  const id = params.id || params.invoiceId;

  const navigate = useNavigate();
  const { success, error, info } = useNotification();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) return;
      try {
        const response = await api.get(`/billing/invoice/${id}`);
        setInvoice(response.data);
      } catch (error) {
        console.error("Error fetching invoice:", error);
        setInvoice(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getBankName = (code) => {
    const bankCode = String(code || "").toLowerCase();
    if (bankCode === '014' || bankCode.includes('bca')) return "BCA Virtual Account";
    if (bankCode === '008' || bankCode.includes('mandiri')) return "Mandiri Virtual Account";
    if (bankCode === '009' || bankCode.includes('bni')) return "BNI Virtual Account";
    if (bankCode === '002' || bankCode.includes('bri')) return "BRI Virtual Account";
    if (bankCode === '013' || bankCode.includes('permata')) return "Permata Virtual Account";
    if (bankCode === '451' || bankCode.includes('bsi')) return "BSI Virtual Account";
    if (bankCode === '011' || bankCode.includes('danamon')) return "Danamon Virtual Account";
    return code || "Bank Transfer";
  };

  const getBankLogo = (code, iconUrl) => {
    if (iconUrl && (iconUrl.startsWith('http://') || iconUrl.startsWith('https://'))) return iconUrl;
    const bankCode = code ? String(code).toLowerCase() : '';
    const origin = window.location.origin;
    if (bankCode === '014' || bankCode.includes('bca')) return `${origin}/image/banks/bca.png`;
    if (bankCode === '008' || bankCode.includes('mandiri')) return `${origin}/image/banks/mandiri.png`;
    if (bankCode === '009' || bankCode.includes('bni')) return `${origin}/image/banks/bni.png`;
    if (bankCode === '002' || bankCode.includes('bri')) return `${origin}/image/banks/bri.png`;
    if (bankCode === '013' || bankCode.includes('permata')) return `${origin}/image/banks/permata.png`;
    if (bankCode === '011' || bankCode.includes('danamon')) return `${origin}/image/banks/danamon.png`;
    if (bankCode === '451' || bankCode.includes('bsi')) return `${origin}/image/banks/bsi.png`;
    if (bankCode.includes('qris') || bankCode === 'qr') return `${origin}/image/banks/qris.png`;
    return iconUrl || `${origin}/image/banks/${bankCode}.png`;
  };

  const formatDeadline = (expiredAt) => {
    if (!expiredAt) return invoice?.due_date || "-";
    try {
      const expiryDate = typeof expiredAt === 'number' && expiredAt < 10000000000 ? new Date(expiredAt * 1000) : new Date(expiredAt);
      if (isNaN(expiryDate.getTime())) return invoice?.due_date || "-";
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(expiryDate);
    } catch (e) { return invoice?.due_date || "-"; }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  // Tampilan Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin w-10 h-10 border-4 border-[#e2e8f0] border-t-[#F97316] rounded-full"></div>
        <p className="text-[#94a3b8] text-sm font-bold animate-pulse">
          Memuat Detail Invoice...
        </p>
      </div>
    );
  }

  // Tampilan jika data tidak ditemukan (biar user tau, bukan blank putih)
  if (!invoice) {
    return (
      <div className="text-center py-20 animate-[fadeIn_0.5s_ease-out]">
        <h3 className="text-xl font-bold text-[#1e293b]">
          Data Tidak Ditemukan
        </h3>
        <p className="text-[#64748b] mb-4">
          Invoice dengan ID tersebut tidak tersedia di database.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="text-[#F97316] font-bold hover:underline"
        >
          &larr; Kembali
        </button>
      </div>
    );
  }

  const getCategoryBadge = (cat) => {
    const c = (cat || 'REGISTER').toUpperCase();
    switch(c) {
        case 'TOPUP': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-md text-[10px] font-bold border border-purple-200 uppercase tracking-widest shadow-sm">Top-up Saldo</span>;
        case 'RENEW': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md text-[10px] font-bold border border-indigo-200 uppercase tracking-widest shadow-sm">Perpanjang Domain</span>;
        case 'TRANSFER': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md text-[10px] font-bold border border-amber-200 uppercase tracking-widest shadow-sm">Transfer Domain</span>;
        case 'RESTORE': return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-md text-[10px] font-bold border border-rose-200 uppercase tracking-widest shadow-sm">Restore Domain</span>;
        default: return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-[10px] font-bold border border-emerald-200 uppercase tracking-widest shadow-sm">Registrasi Domain</span>;
    }
  };

  return (
    <div className="pb-20">
      {/* --- ACTION BAR (Tombol Balik & Print) --- */}
      <div className="max-w-3xl mx-auto mb-4 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden px-4 sm:px-0">
        {/* --- PRINT SYSTEM OVERRIDE --- */}
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                @page { size: A4; margin: 0; }
                body { background: #fff !important; }
                .print\\:hidden, .sidebar, .navbar, .action-bar, footer { display: none !important; }
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
                .no-print { display: none !important; }
            }
        `}} />
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#64748b] hover:text-[#F97316] font-bold text-sm transition self-start md:self-auto"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          {(invoice.status === "pending" || invoice.status === "failed") && (
            (invoice.status === "pending" && invoice.has_proof) ? (
              <div className="flex-1 md:flex-none bg-slate-100 text-slate-500 px-5 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 border border-slate-200">
                <span className="material-symbols-outlined text-lg">verified_user</span>
                Pembayaran Dalam Proses Verifikasi
              </div>
            ) : (
              <button
                onClick={() => navigate(`/payment/${invoice.id}`)}
                className="flex-1 md:flex-none justify-center bg-[#F97316] text-white px-4 sm:px-5 py-2.5 rounded-lg font-bold text-xs sm:text-sm hover:bg-[#ea580c] transition classic-shadow flex items-center gap-2"
              >
                Bayar Sekarang
              </button>
            )
          )}
          <button
            onClick={handleDownloadPdf}
            className="flex-1 md:flex-none justify-center bg-[#0f172a] text-white px-4 sm:px-5 py-2.5 rounded-lg font-bold text-xs sm:text-sm hover:bg-[#F97316] transition classic-shadow flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* --- KERTAS INVOICE (Area yang akan di-print) --- */}
      <style dangerouslySetInnerHTML={{ __html: `
        #invoice-print-area {
          color-scheme: light !important;
        }
        /* Override Tailwind v4 oklch for html2canvas compatibility */
        #invoice-print-area, #invoice-print-area * {
          --color-orange-50: #fff7ed !important;
          --color-orange-100: #ffedd5 !important;
          --color-orange-500: #f97316 !important;
          --color-orange-600: #ea580c !important;
          --color-slate-50: #f8fafc !important;
          --color-slate-100: #f1f5f9 !important;
          --color-slate-200: #e2e8f0 !important;
          --color-slate-300: #cbd5e1 !important;
          --color-slate-400: #94a3b8 !important;
          --color-slate-500: #64748b !important;
          --color-slate-600: #475569 !important;
          --color-slate-700: #334155 !important;
          --color-slate-800: #1e293b !important;
          --color-slate-900: #0f172a !important;
          --color-emerald-50: #ecfdf5 !important;
          --color-emerald-100: #d1fae5 !important;
          --color-emerald-500: #10b981 !important;
          --color-emerald-600: #059669 !important;
          --color-emerald-700: #047857 !important;
          --color-purple-100: #f3e8ff !important;
          --color-purple-700: #7e22ce !important;
          --color-indigo-100: #e0e7ff !important;
          --color-indigo-700: #4338ca !important;
          --color-amber-100: #fef3c7 !important;
          --color-amber-700: #b45309 !important;
          --color-rose-100: #ffe4e6 !important;
          --color-rose-700: #be123c !important;
        }
      ` }} />
      <div className="max-w-3xl mx-auto classic-shadow-lg rounded-lg bg-white print:shadow-none sm:mx-4 md:mx-auto">
        <div id="invoice-print-area" className="bg-white p-4 sm:p-6 rounded-lg border border-[#f1f5f9] print:border-none print-area print:p-0 relative overflow-hidden">
        
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

        {/* HEADER: LOGO & STATUS */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b-2 border-[#1e293b] pb-4 mb-4 relative z-10">
          <div className="flex items-start gap-4">
            <img
              src="/image/logo/ADTLogo.png"
              alt="Logo"
              style={{ width: '70px', height: '70px', objectFit: 'contain' }}
            />
            <div>
                <h1 className="font-bold text-xl text-[#1e293b] tracking-tight leading-none">
                  PT Aplikasi Dagang Teknologi
                </h1>
                <span className="text-[#64748b] text-[10px] font-semibold tracking-widest uppercase">Technology Solution Provider</span>
            </div>
          </div>
          <div className="text-left md:text-right w-full md:w-auto flex flex-col items-start md:items-end gap-2">
            <h1 className="text-lg md:text-xl font-bold text-[#1e293b] break-all leading-none">
              #{invoice.id}
            </h1>
            <div className="flex flex-wrap gap-2 justify-start md:justify-end">
              {getCategoryBadge(invoice.category)}
              {invoice.status === "paid" ? (
                <span className="bg-[#dcfce7] text-[#15803d] px-3 py-1 rounded-md text-[10px] font-bold border border-[#bbf7d0] uppercase tracking-widest">
                  LUNAS
                </span>
              ) : invoice.status === "failed" ? (
                <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-md text-[10px] font-bold border border-rose-200 uppercase tracking-widest">
                  DITOLAK
                </span>
              ) : invoice.status === "cancelled" ? (
                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-md text-[10px] font-bold border border-slate-200 uppercase tracking-widest">
                  DIBATALKAN
                </span>
              ) : (
                <span className="bg-[#ffedd5] text-[#c2410c] px-3 py-1 rounded-md text-[10px] font-bold border border-[#fed7aa] uppercase tracking-widest">
                  PENDING
                </span>
              )}
            </div>
          </div>
        </div>
        {/* ALASAN PENOLAKAN (Jika Ada) */}
        {invoice.status === 'failed' && invoice.refund_reason && (
          <div className="mx-5 sm:mx-8 mb-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-4 animate-[fadeIn_0.5s_ease-out]">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-rose-600 shadow-sm shrink-0">
              <span className="material-symbols-outlined font-bold text-lg">error</span>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">Pembayaran Ditolak Admin</h4>
              <p className="text-sm font-bold text-rose-700 italic">"{invoice.refund_reason}"</p>
            </div>
          </div>
        )}

        {/* INFO PENGIRIM & PENERIMA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          <div className="relative z-10">
            <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">
              Diterbitkan Oleh:
            </p>
            <p className="font-bold text-[#1e293b] text-base mb-1">
              PT Aplikasi Dagang Teknologi
            </p>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Jl. Cigadung Raya Tengah No.52, RT.2,<br />
              Cigadung, Kec. Cibeunying Kaler, Kota Bandung,<br />
              Jawa Barat 40191<br />
              <span className="font-medium text-[#f97316]">admin@aplikasidagang.co.id</span> • 0813 8486 8040
            </p>
          </div>
          <div className="text-left md:text-right relative z-10">
            <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">
              Ditujukan Kepada:
            </p>
            <p className="font-bold text-[#1e293b] text-base mb-1">{invoice.customer.name}</p>
            <p className="text-xs text-[#64748b] leading-relaxed">
              <span className="font-semibold text-[#1e293b]">{invoice.customer.email}</span><br />
              {invoice.customer.phone || "-"}<br />
            </p>
          </div>
        </div>

        {/* INFO TANGGAL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 bg-[#0f172a] p-4 rounded-lg border border-[#1e293b] relative z-10">
          <div>
            <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-1">
              Tanggal Tagihan
            </p>
            <p className="font-semibold text-white mb-2">{invoice.date}</p>
            <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-1">
              Jatuh Tempo
            </p>
            <p className="font-bold text-white text-[11px] tracking-tight">{formatDeadline(invoice.payment_instructions?.expired_at || invoice.expired_at)}</p>
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-1">
              Metode Pembayaran
            </p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white rounded p-1 flex items-center justify-center border border-slate-700/50">
                <img 
                  src={getBankLogo(invoice.payment_instructions?.bank_code, invoice.payment_instructions?.manual_details?.logo_url)} 
                  alt="Logo Bank" 
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
              <p className="font-bold text-[#f97316] text-[11px] uppercase tracking-wider">
                {getBankName(invoice.payment_instructions?.bank_code || invoice.payment_method)}
              </p>
            </div>
          </div>
          <div className="text-left md:text-right sm:col-span-2 md:col-span-1">
            <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-1">
              Total Tagihan
            </p>
            <p className="font-bold text-2xl text-white tracking-tight">{formatRupiah(invoice.total)}</p>
          </div>
        </div>

        {/* TABEL ITEM */}
        <div className="mb-4">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-[#f1f5f9]">
              <tr>
                <th className="py-2 font-bold text-[#64748b] uppercase text-xs">
                  Deskripsi Layanan
                </th>
                <th className="py-2 font-bold text-[#64748b] uppercase text-xs text-right">
                  Harga
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f8fafc]">
              {invoice.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2">
                    <p className="font-semibold text-[#1e293b]">{item.name}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">{item.description}</p>
                  </td>
                  <td className="py-2 text-right font-semibold text-[#334155]">
                    {item.price === 0 ? "GRATIS" : formatRupiah(item.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* SUMMARY & SIGNATURE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 relative z-10 px-2">
          <div className="space-y-4">
             {invoice.status === 'failed' && invoice.refund_reason && (
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 mb-4 animate-[fadeIn_0.5s_ease-out]">
                    <div className="flex items-center gap-2 mb-2 text-rose-600">
                        <span className="material-symbols-outlined text-lg">error</span>
                        <h4 className="text-[11px] font-bold uppercase tracking-widest">Alasan Penolakan:</h4>
                    </div>
                    <p className="text-xs font-bold text-rose-700 italic">"{invoice.refund_reason}"</p>
                </div>
             )}
             <p className="text-[9px] text-[#94a3b8] font-semibold uppercase tracking-widest leading-relaxed">
                * Tagihan ini sah tanpa tanda tangan basah.<br/>
                * Harap simpan bukti pembayaran dengan baik.<br/>
                * Seluruh pembayaran bersifat final (No Refund Policy).
             </p>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#64748b] font-semibold uppercase tracking-wider">Subtotal (Bruto)</span>
              <span className="font-bold text-[#1e293b]">
                {formatRupiah(invoice.subtotal + (invoice.discount || 0))}
              </span>
            </div>

            {invoice.discount_meta?.referral?.immediate_discount > 0 && (
                <div className="flex justify-between text-xs text-[#c2410c] bg-orange-50 px-2 py-1 rounded">
                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">card_giftcard</span>
                        Potongan Referral
                    </span>
                    <span className="font-bold">- {formatRupiah(invoice.discount_meta.referral.immediate_discount)}</span>
                </div>
            )}

            {invoice.discount_meta?.voucher && (
                <div className="flex justify-between text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                    <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">confirmation_number</span>
                        Diskon Voucher ({invoice.discount_meta.voucher.code})
                    </span>
                    <span className="font-bold">- {formatRupiah(invoice.discount_meta.voucher.amount)}</span>
                </div>
            )}

            {invoice.tax > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-[#64748b] font-semibold uppercase tracking-wider">Pajak (PPN 11%)</span>
                <span className="font-bold text-[#1e293b]">+ {formatRupiah(invoice.tax)}</span>
              </div>
            )}
            {(invoice.service_fee > 0 || invoice.status === 'paid') && (
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#64748b] font-semibold uppercase tracking-wider">Biaya Layanan</span>
                <span className="font-bold text-[#3b82f6]">+ {formatRupiah(invoice.service_fee || 0)}</span>
              </div>
            )}
            <div className="border-t-2 border-[#1e293b] pt-3 flex justify-between items-center">
              <span className="text-[#1e293b] font-bold text-[10px] uppercase tracking-[0.2em]">Total Bayar</span>
              <span className="text-[#F97316] font-bold text-2xl tracking-tighter">{formatRupiah(invoice.total)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end relative z-10 mb-4">
             <div className="text-center w-40">
                 <p className="text-[9px] text-[#64748b] font-semibold uppercase tracking-widest mb-10">Authorized By</p>
                 <div className="border-t border-[#1e293b] pt-2">
                     <p className="text-xs font-bold text-[#1e293b] uppercase">Finance Dept.</p>
                     <p className="text-[8px] font-semibold text-[#64748b] uppercase tracking-widest">PT Aplikasi Dagang Teknologi</p>
                 </div>
             </div>
        </div>

        {/* --- ACTIVITY LOGS (NEW) --- */}
        {invoice.logs && invoice.logs.length > 0 && (
          <div className="mt-6 border-t-2 border-dashed border-[#f1f5f9] pt-6">
            <h3 className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest mb-6 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Log Aktivitas Pendaftaran
            </h3>
            <div className="space-y-4">
              {invoice.logs.map((log, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        log.action.includes("Gagal") || log.action.includes("Kurang") ? "bg-[#ef4444]" : "bg-[#22c55e]"
                    }`}></div>
                    <div className="w-0.5 h-full bg-[#f1f5f9] group-last:hidden"></div>
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-[#1e293b] leading-none mb-1">
                      {log.action}
                    </p>
                    <p className="text-xs text-[#64748b] leading-relaxed italic">
                      {log.description}
                    </p>
                    <p className="text-[10px] text-[#cbd5e1] font-bold mt-1">
                      {log.date} • By {log.by}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-12 pt-8 border-t border-[#f1f5f9] text-center">
          <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider mb-2">
            Terima kasih atas kepercayaan Anda!
          </p>
          <p className="text-[10px] text-[#94a3b8]">
            Invoice ini sah dan diterbitkan secara komputerisasi tanpa tanda
            tangan basah.
          </p>
        </div>
      </div>

    </div>
  </div>
  );
};

export default DetailInvoice;
