import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import api from "../../services/api";

const Payment = () => {
  const { success, error, info, warning } = useNotification();
  const confirm = useConfirm();
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Helper for Logo Path (Improved for Tripay & Prismalink)
  const getBankLogo = (code, iconUrl) => {
    const bankCode = code ? code.toLowerCase() : '';
    
    // 1. PRIORITIZE Local Mappings (Check your /public/image/banks/ folder)
    if (bankCode.includes('bca')) return '/image/banks/bca.png';
    if (bankCode.includes('mandiri')) return '/image/banks/mandiri.png';
    if (bankCode.includes('bni')) return '/image/banks/bni.png';
    if (bankCode.includes('bri')) return '/image/banks/bri.png';
    if (bankCode.includes('cimb')) return '/image/banks/cimb.png';
    if (bankCode.includes('permata')) return '/image/banks/permata.png';
    if (bankCode.includes('bsi')) return '/image/banks/bsi.png';
    if (bankCode.includes('danamon')) return '/image/banks/danamon.png';
    if (bankCode.includes('qris')) return '/image/banks/qris.png';

    // E-Wallet Local Paths
    if (bankCode === 'ovo') return '/image/banks/ovo.png';
    if (bankCode === 'dana') return '/image/banks/dana.png';
    if (bankCode === 'shopeepay') return '/image/banks/shopeepay.png';
    if (bankCode === 'gopay') return '/image/banks/gopay.png';
    if (bankCode === 'linkaja') return '/image/banks/linkaja.png';

    // 2. FALLBACK: Use Tripay's icon_url if provided, else generic default
    return iconUrl || `/image/banks/${bankCode}.png`;
  };

  // Data State
  const [invoice, setInvoice] = useState(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [paymentState, setPaymentState] = useState('PENDING'); // 'PENDING', 'PAID'
  const [paymentResult, setPaymentResult] = useState(location.state?.paymentResult || null); // Data form Previous Page
  const [showSuccessPopup, setShowSuccessPopup] = useState(location.state?.paymentSuccess || false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeInstruction, setActiveInstruction] = useState(0); // For instructions accordion
  const [isCopied, setIsCopied] = useState(false); // For VA copy feedback

  // --- CENTRALIZED TOTAL CALCULATION ---
  // Some Tripay responses separate 'amount' (base) and 'total_fee'.
  // We ensure the total displayed is always Sum of Base + All Fees.
  const getActualTotal = () => {
    // 1. Ambil biaya layanan (Prioritaskan dari paymentResult/Tripay)
    // Sesuai aturan: Kita hanya peduli fee_customer.
    const sFee = Number(paymentResult?.fee_customer ?? invoice?.service_fee ?? 0);
    
    // 2. Ambil nilai dasar invoice (Harga + PPN)
    const baseTotal = parseFloat(invoice?.total || invoice?.final_amount || 0);

    // 3. Logic khusus untuk "Gratis Biaya Layanan" (Merchant Charged)
    if (sFee === 0) {
        return baseTotal;
    }

    // 4. Logic untuk "Customer Charged" (BCA, BNI, dll)
    if (paymentResult?.amount) {
        const gatewayAmount = Number(paymentResult.amount);
        // Jika gatewayAmount sama dengan base, berarti fee belum nempel di field amount
        if (gatewayAmount <= baseTotal) {
            return baseTotal + sFee;
        }
        return gatewayAmount;
    }

    return baseTotal + sFee;
  };
  const actualPaidTotal = getActualTotal();

  // Polling Interval
  useEffect(() => {
    let interval;
    if (paymentState !== 'PAID') { // Poll while not yet paid
      interval = setInterval(async () => {
        try {
          const provider = paymentResult?.provider || 'tripay';
          const id = provider === 'tripay' ? (paymentResult.reference || paymentResult.merchant_ref || invoiceId) : invoiceId;
          const endpoint = provider === 'tripay' ? `/tripay/status/${id}` : `/prismalink/status/${id}`;

          const res = await api.get(endpoint);
          const status = (res.data.data?.transaction_status || res.data.data?.status || "").toUpperCase();
          const isPaid = ['PAID', 'SETTLEMENT', 'SUCCESS', 'SETTLED', 'SETLD'].includes(status);

          if (isPaid) {
            if (paymentState !== 'PAID') { // Only trigger once
              setPaymentState('PAID');
              setShowSuccessPopup(true);
              clearInterval(interval);
              success("Pembayaran berhasil diterima!");

              // Auto-redirect based on content
              setTimeout(() => {
                navigate(getSuccessRedirectPath());
              }, 3000);
            }
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 5000); // Cek tiap 5 detik
    }
    return () => clearInterval(interval);
  }, [paymentState, invoiceId, navigate, success]);

  // Countdown Logic
  useEffect(() => {
    if (!paymentResult?.expired_at) return;

    const calculateRemaining = () => {
      if (!paymentResult?.expired_at) return;

      let expiryDate;
      if (typeof paymentResult.expired_at === 'number' && paymentResult.expired_at < 10000000000) {
        // It's a Unix Epoch (seconds) - typical Tripay
        expiryDate = paymentResult.expired_at * 1000;
      } else {
        // It's a JS timestamp or Date string
        expiryDate = new Date(paymentResult.expired_at).getTime();
      }

      const now = new Date().getTime();

      if (isNaN(expiryDate)) {
        setTimeLeft(0);
        return;
      }

      const diffInSeconds = Math.max(0, Math.floor((expiryDate - now) / 1000));
      setTimeLeft(diffInSeconds);
    };

    calculateRemaining(); // Initial call
    const timer = setInterval(calculateRemaining, 1000);

    return () => clearInterval(timer);
  }, [paymentResult]);

  // --- FETCH INVOICE ---
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const invRes = await api.get(`/billing/invoice/${invoiceId}`);
        setInvoice(invRes.data);

        // Recover payment details if lost on refresh
        if (!paymentResult && invRes.data.payment_instructions?.expired_at) {
          setPaymentResult(invRes.data.payment_instructions);
        }

        // Cek jika invoice sudah paid
        if (invRes.data.status === 'paid' || invRes.data.status === 'PAID') {
          setPaymentState('PAID');
          setShowSuccessPopup(true);
        }
      } catch (err) {
        console.error(err);
        error("Gagal memuat data pembayaran.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  // --- FORMAT RUPIAH ---
  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const formatCountdown = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDeadline = (expiredAt) => {
    if (!expiredAt) return "-";
    let expiryDate;
    if (typeof expiredAt === 'number' && expiredAt < 10000000000) {
      expiryDate = new Date(expiredAt * 1000);
    } else {
      expiryDate = new Date(expiredAt);
    }
    
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(expiryDate);
  };

  // Manual Status Check
  const handleCheckStatus = async () => {
    const btn = document.getElementById('btn-check-status');
    if (!btn) return;

    const originalText = btn.innerText;
    btn.innerText = "Mengecek...";
    btn.disabled = true;

    try {
      const provider = paymentResult?.provider || 'tripay';
      const id = provider === 'tripay' ? (paymentResult.reference || paymentResult.merchant_ref || invoiceId) : invoiceId;
      const endpoint = provider === 'tripay' ? `/tripay/status/${id}` : `/prismalink/status/${id}`;
      const res = await api.get(endpoint);

      const status = (res.data.data?.transaction_status || res.data.data?.status || "").toUpperCase();
      const isPaid = ['PAID', 'SETTLEMENT', 'SUCCESS', 'SETTLED', 'SETLD'].includes(status);

      if (isPaid) {
        setPaymentState('PAID');
        setShowSuccessPopup(true);
        success("Tagihan Anda telah dilunasi.", "Pembayaran Lunas");
      } else {
        // Masih pending
        info(`Status: ${status || 'MENUNGGU PEMBAYARAN'}`, "Status Transaksi");
      }
    } catch (err) {
      console.error("Check status error", err);
      error("Gagal mengecek status. Silakan coba lagi.");
    } finally {
      const btn = document.getElementById('btn-check-status');
      if (btn) {
        btn.innerText = originalText;
        btn.disabled = false;
      }
    }
  };

  // --- NAVIGATION HELPERS ---
  const handleBack = async () => {
    // Jika sudah lunas, langsung kembali tanpa konfirmasi
    if (paymentState === 'PAID') {
      navigate(-1);
      return;
    }

    const isConfirmed = await confirm({
      title: "Batalkan Pembayaran?",
      message: "Transaksi Anda belum selesai. Apakah Anda yakin ingin membatalkan pembayaran ini?",
      type: "warning",
      confirmText: "Ya, Batalkan",
      cancelText: "Lanjutkan Pembayaran"
    });

    if (isConfirmed) {
      navigate("/dashboard/billing");
    }
  };

  const getSuccessRedirectPath = () => {
    if (!invoice) return "/dashboard";
    const isTopUp = invoice.items.some(item =>
      item.name.toLowerCase().includes('top up') ||
      item.desc?.toLowerCase().includes('top up') ||
      item.action_type === 'topup'
    );
    return isTopUp ? "/dashboard/wallet" : "/dashboard/domains";
  };

  const getSuccessMessage = () => {
    const path = getSuccessRedirectPath();
    return path === "/dashboard/wallet"
      ? "Mengalihkan ke halaman saldo saya dalam 3 detik..."
      : "Mengalihkan ke halaman domain dalam 3 detik...";
  };

  const getSuccessButtonLabel = () => {
    const path = getSuccessRedirectPath();
    return path === "/dashboard/wallet" ? "Ke Saldo Saya" : "Ke Halaman Domain Saya";
  };

  // Download Premium QRIS Card Logic
  const handleDownloadQR = () => {
    try {
      const qrSource = document.querySelector('canvas');
      const cardWidth = 500;
      const cardHeight = 750;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = cardWidth;
      canvas.height = cardHeight;

      // 1. Background & Styling
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cardWidth, cardHeight);
      
      // Decorative Header Background
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, cardWidth, 120);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, cardWidth, 120);

      // 2. Header Text
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DOMAIN DAGANG', cardWidth / 2, 55);
      
      ctx.fillStyle = '#64748B';
      ctx.font = '900 12px sans-serif';
      ctx.fillText('METODE PEMBAYARAN QRIS', cardWidth / 2, 85);

      // 3. Draw QR Code
      if (qrSource) {
        // Draw the QR from Canvas
        const qrSize = 320;
        const xPos = (cardWidth - qrSize) / 2;
        const yPos = 160;
        
        // QR Border/Container
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth = 20;
        ctx.strokeRect(xPos - 10, yPos - 10, qrSize + 20, qrSize + 20);
        
        ctx.drawImage(qrSource, xPos, yPos, qrSize, qrSize);
      } else if (paymentResult.qr_image || paymentResult.qr_url) {
         // Fallback for simple download if internal canvas not found
         const link = document.createElement('a');
         link.href = paymentResult.qr_image || paymentResult.qr_url;
         link.download = `QRIS-${invoiceId}.png`;
         link.click();
         return;
      }

      // 4. Footer Information
      const footerY = 560;
      
      // Amount Section
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('TOTAL PEMBAYARAN', cardWidth / 2, footerY);
      
      ctx.fillStyle = '#F97316'; // Orange
      ctx.font = '900 38px sans-serif';
      const amountText = formatRupiah(actualPaidTotal);
      ctx.fillText(amountText, cardWidth / 2, footerY + 50);

      // Invoice ID
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`ID: ${invoiceId}`, cardWidth / 2, footerY + 90);

      // Instructions / Security Note
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 10px sans-serif';
      ctx.fillText('OTOMATIS TERVERIFIKASI • AMAN & TERENKRIPSI', cardWidth / 2, footerY + 125);
      
      // 5. Final Download
      const finalUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement('a');
      downloadLink.download = `PAY-QRIS-${invoiceId}.png`;
      downloadLink.href = finalUrl;
      downloadLink.click();
      
      success("Informasi pembayaran berhasil disimpan.");
    } catch (err) {
      console.error("Premium Download error", err);
      // Fallback
      error("Gagal membuat kartu premium. Silakan screenshot layar.");
    }
  };

  // --- RENDER HELPERS ---

  // Render Instruksi Pembayaran (VA / QR)
  const renderInstructions = () => {
    if (!paymentResult) return null;

    // Amankan pengecekan tipe pembayaran
    const isVA = !!(paymentResult.pay_code || paymentResult.va_number);
    const isQR = !!(paymentResult.qr_string || paymentResult.qr_url || paymentResult.qr_image);
    const isEwallet = !isVA && !isQR && !!paymentResult.pay_url;
    // In sandbox, Tripay qr_string is 'SANDBOX MODE...' which is still valid to render as QR
    const qrValue = paymentResult.qr_string || paymentResult.pay_code;

    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden animate-[fadeIn_0.5s_ease-out] border border-slate-100">
        {/* Header Instruksi - Premium Deadline & Countdown */}
        <div className="p-5 px-6 bg-slate-50/80 border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 items-center gap-1.5 flex">
                <span className="material-symbols-outlined text-[12px]">event_available</span>
                Batas Akhir Pembayaran
              </p>
              <p className="text-xs font-bold text-slate-700">
                {formatDeadline(paymentResult.expired_at)}
              </p>
            </div>
            
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 transition-colors ${timeLeft > 0 ? 'bg-orange-50 border-orange-100' : 'bg-red-50 border-red-100'}`}>
              <div className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${timeLeft > 0 ? 'bg-orange-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${timeLeft > 0 ? 'bg-orange-500' : 'bg-red-500'}`}></span>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sisa Waktu</p>
                <p className={`text-sm font-black tracking-tighter leading-none ${timeLeft > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                  {timeLeft > 0 ? formatCountdown(timeLeft) : "EXPIRED"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          {/* Main Payment Display */}
          <div className="flex flex-col items-center">
            {isEwallet ? (
              <div className="w-full max-w-sm flex flex-col items-center">
                               <div className="bg-white rounded-xl p-6 border border-slate-100 text-center relative overflow-hidden group mb-6 w-full max-w-sm">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
                                         <span className="material-symbols-outlined text-2xl">smartphone</span>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Bayar</p>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter">
                                        {formatRupiah(actualPaidTotal)}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
                                         Klik tombol di bawah untuk membuka aplikasi e-wallet Anda (OVO/DANA/ShopeePay) dan menyelesaikan pembayaran secara otomatis.
                                    </p>
                                    {paymentResult.pay_url && (
                                         <a href={paymentResult.pay_url} target="_blank" rel="noreferrer" className="w-full block text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-95">
                                            Buka Aplikasi & Bayar
                                         </a>
                                    )}
                               </div>
              </div>
            ) : isQR ? (
              <div className="w-full max-w-sm flex flex-col items-center">
                  {/* QR Container */}
                  <div className="relative p-5 bg-white rounded-2xl border-2 border-slate-100 shadow-sm mb-6 group/qr">
                      <div className="relative">
                          {paymentResult.qr_image ? (
                              <img src={paymentResult.qr_image} alt="QRIS" className="w-64 h-64 object-contain mx-auto" />
                          ) : (
                              <div className="bg-white p-2">
                                  <QRCodeCanvas value={qrValue} size={256} />
                              </div>
                          )}
                          
                          {/* Hover Overlay for Instructions */}
                          <div className="absolute inset-0 bg-white/80 opacity-0 group-hover/qr:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center backdrop-blur-[2px]">
                              <span className="material-symbols-outlined text-orange-500 mb-2">qr_code_scanner</span>
                              <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Pindai QR ini</p>
                              <p className="text-[9px] text-slate-400 font-bold leading-tight">Gunakan aplikasi m-banking atau e-wallet favorit Anda</p>
                          </div>
                      </div>
                      
                      {/* QRIS BRANDING */}
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-center gap-3">
                         <img src="/image/banks/qris.png" alt="QRIS" className="h-6 grayscale hover:grayscale-0 transition opacity-80" onError={(e) => { e.target.onerror = null; e.target.src = "/image/no-image.png"; }} />
                      </div>
                  </div>

                  <button 
                      onClick={handleDownloadQR}
                      className="mb-8 flex items-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all active:scale-95 group"
                  >
                      <span className="material-symbols-outlined text-sm group-hover:animate-bounce">download</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Simpan QR Code</span>
                  </button>

                  {/* INSTRUCTIONS FOR QRIS */}
                  <div className="w-full mt-4 border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-orange-500 text-lg">format_list_numbered</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Cara Bayar QRIS</p>
                    </div>
                    <div className="space-y-3 text-left bg-white rounded-xl">
                      {[
                        "Ambil tangkapan layar (Screenshot) atau klik 'Simpan QR Code'.",
                        "Buka aplikasi m-Banking atau e-Wallet (GOPAY, OVO, ShopeePay, DANA).",
                        "Pilih menu <b>Scan / Bayar</b> lalu unggah QR dari galeri.",
                        "Masukkan PIN dan konfirmasi pembayaran."
                      ].map((step, sIdx) => (
                        <div key={sIdx} className="flex gap-3 items-start">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                            {sIdx + 1}
                          </span>
                          <p className="text-[11px] text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SUPPORTED LOGOS */}
                  <div className="w-full mt-8 opacity-40">
                    <div className="grid grid-cols-4 gap-4">
                      <img src={getBankLogo('gopay')} className="h-3 object-contain mx-auto grayscale" alt="Gopay" />
                      <img src={getBankLogo('ovo')} className="h-3 object-contain mx-auto grayscale" alt="OVO" />
                      <img src={getBankLogo('dana')} className="h-3 object-contain mx-auto grayscale" alt="DANA" />
                      <img src={getBankLogo('linkaja')} className="h-3 object-contain mx-auto grayscale" alt="LinkAja" />
                    </div>
                  </div>
              </div>
            ) : (
              <div className="w-full max-w-md">
                <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-100 text-center relative overflow-hidden group">
                  {/* Bank Logo Floating */}
                  <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <img src={getBankLogo(paymentResult.bank_code || paymentResult.method || "", paymentResult.icon_url)} className="h-8 object-contain" alt="" />
                  </div>

                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    Nomor Virtual Account
                  </p>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-2xl md:text-3xl font-mono font-black text-slate-900 tracking-tighter">
                      {paymentResult.pay_code || paymentResult.va_number}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(paymentResult.pay_code || paymentResult.va_number);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                        success("Nomor VA berhasil disalin");
                      }}
                      className={`p-2 border rounded-lg transition-all active:scale-90 flex items-center justify-center ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white shadow-sm border-slate-100 text-slate-400 hover:text-orange-500 hover:border-orange-200'}`}
                    >
                      {isCopied ? (
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Terdaftar atas nama: <span className="text-slate-900">{paymentResult.user_name || paymentResult.customer_name || "Pelanggan"}</span></p>
                </div>

                {/* INSTRUCTIONS SECTION (ACCORDION) */}
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-orange-500 text-lg">format_list_numbered</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Cara Pembayaran</p>
                  </div>

                  <div className="space-y-2 text-left">
                    {[
                      {
                        title: "M-Banking / Internet Banking",
                        steps: [
                          "Buka aplikasi mobile banking Anda.",
                          "Pilih menu <b>Transfer</b> atau <b>Pembayaran</b>.",
                          "Pilih menu <b>Virtual Account</b>.",
                          `Masukkan nomor VA: <b>${paymentResult.pay_code || paymentResult.va_number}</b>`,
                          "Periksa detail tagihan, masukkan PIN, dan konfirmasi pembayaran."
                        ]
                      },
                      {
                        title: "ATM",
                        steps: [
                          "Masukkan kartu ATM dan PIN Anda.",
                          "Pilih menu <b>Transaksi Lainnya</b>.",
                          "Pilih <b>Transfer</b> -> <b>Ke Rekening Virtual Account</b>.",
                          `Masukkan nomor VA: <b>${paymentResult.pay_code || paymentResult.va_number}</b>`,
                          "Ikuti instruksi di layar untuk menyelesaikan pembayaran."
                        ]
                      }
                    ].map((group, idx) => (
                      <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:border-slate-200">
                        <button
                          onClick={() => setActiveInstruction(activeInstruction === idx ? -1 : idx)}
                          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                        >
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{group.title}</span>
                          <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform duration-300 ${activeInstruction === idx ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>

                        {activeInstruction === idx && (
                          <div className="px-5 pb-5 pt-1 animate-[fadeIn_0.3s_ease-out]">
                            <ul className="space-y-3">
                              {group.steps.map((step, sIdx) => (
                                <li key={sIdx} className="flex gap-3 items-start">
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                                    {sIdx + 1}
                                  </span>
                                  <p className="text-[11px] text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Total Amount Display */}
          <div className="mt-8 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bayar</p>
              <div className="text-xl font-black text-slate-900 tracking-tighter">
                {formatRupiah(actualPaidTotal)}
              </div>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(paymentResult.amount); success("Jumlah berhasil disalin"); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              Salin
            </button>
          </div>

          {/* Manual Action Buttons */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              id="btn-check-status"
              onClick={handleCheckStatus}
              className="bg-orange-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              Cek Status
            </button>
            <button
              onClick={() => navigate(`/checkout?invoiceId=${invoiceId}`)}
              className="bg-white text-slate-400 border border-slate-200 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Ganti Metode
            </button>
          </div>

          {/* Polling Indicator */}
          <div className="mt-8 flex justify-center items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Memonitor status pembayaran secara real-time...
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin w-10 h-10 border-4 border-slate-200 border-t-[#F97316] rounded-full"></div>
        <p className="text-slate-400 text-sm font-bold animate-pulse">
          Memuat Data Invoice...
        </p>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-20 px-4 font-sans animate-[fadeIn_0.5s_ease-out] relative">

      {/* --- SUCCESS POPUP MODAL --- */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]"></div>
          <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-[scaleIn_0.3s_ease-out] border border-white/20">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 text-green-500 mb-6 shadow-xl shadow-green-100">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Pembayaran Berhasil!</h2>
              <p className="text-sm text-slate-500 mb-8 font-medium">Terima kasih, tagihan Anda telah kami terima dan sedang diproses.</p>

              <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left border border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Total yang diBayar</span>
                  <span className="text-lg font-black text-[#F97316]">{formatRupiah(actualPaidTotal)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Status Transaksi</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-black uppercase">SUKSES</span>
                </div>
              </div>
              
              <p className="text-[11px] text-slate-400 text-center mb-6 font-medium animate-pulse">
                {getSuccessMessage()}
              </p>

              <button onClick={() => navigate(getSuccessRedirectPath())} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition active:scale-95">
                {getSuccessButtonLabel()}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto mb-8">
         <div className="flex items-center gap-4 mb-2">
          <button onClick={handleBack} className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#F97316] hover:border-orange-200 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pembayaran</h1>
            <p className="text-sm text-slate-500">Selesaikan tagihan Anda dengan aman.</p>
          </div>
          <div className="ml-auto flex flex-col items-end">
             <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${paymentState === 'PAID' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-100 text-[#F97316]'}`}>
                {paymentState === 'PAID' ? 'LUNAS' : 'MENUNGGU'}
             </div>
             <p className="text-[9px] text-slate-400 mt-1 font-bold tracking-widest uppercase">Invoice: {invoice.id}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- KOLOM KIRI (70%) --- */}
        <div className="lg:col-span-2 space-y-6">

          {/* HEADER INVOICE (Always Visible) */}
          <div className="bg-white p-5 md:p-8 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-0 md:mb-6 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-800">Pembayaran Invoice</h1>
                </div>
                <p className="text-slate-500 text-[11px] md:text-sm">ID Tagihan: <span className="font-bold text-slate-700">{invoice.id}</span></p>
              </div>
              <div className={`px-4 py-2 rounded-lg text-center md:text-right border ${paymentState === 'PAID' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-100 text-[#F97316]'}`}>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Status</p>
                <p className="font-bold text-base md:text-lg">{paymentState === 'PAID' ? 'LUNAS' : 'MENUNGGU'}</p>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          {paymentResult ? (
            renderInstructions()
          ) : (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center shadow-lg animate-[fadeIn_0.5s_ease-out]">
              <div className="w-20 h-20 bg-orange-100 text-[#F97316] rounded-full flex items-center justify-center mx-auto mb-6 shadow-orange-100 shadow-xl">
                <span className="material-symbols-outlined text-[40px]">hourglass_empty</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Menunggu Pembayaran</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                Tagihan ini belum dibayar. Jika Anda baru saja melakukan checkout, silakan cek status pembayaran.
              </p>

              <div className="flex justify-center gap-4">
                <button
                  id="btn-check-status"
                  onClick={handleCheckStatus}
                  className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-slate-800 transition transform hover:-translate-y-1 active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                  Cek Status
                </button>
                <button
                  onClick={() => navigate('/dashboard/billing')}
                  className="bg-white text-slate-500 border border-slate-200 px-6 py-3 rounded-lg font-bold hover:bg-slate-50 transition"
                >
                  Ke Billing
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- KOLOM KANAN (30%) - ORDER SUMMARY --- */}
        <div className="lg:col-span-1">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sticky top-5 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F97316] to-orange-400"></div>
            <h3 className="font-black text-slate-900 uppercase text-[9px] tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#F97316] text-sm">assessment</span>
                Tagihan
            </h3>

            <div className="space-y-5 mb-8">
              {invoice.items.map((item, idx) => {
                  const isTopUpItem = item.name.toLowerCase().includes('top up') || item.desc?.toLowerCase().includes('top up') || item.action_type === 'topup';
                  // Use raw price from invoice item (now Base Price in Additive Mode)
                  const rawPrice = parseFloat(item.price || 0);
                  const displayPrice = rawPrice;

                  return (
                    <div key={idx} className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800 leading-snug">{item.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{item.desc}</p>
                      </div>
                      <span className="text-sm font-black text-slate-900 whitespace-nowrap">
                        {rawPrice === 0 ? "GRATIS" : formatRupiah(displayPrice)}
                      </span>
                    </div>
                  );
              })}
            </div>

            <div className="pt-6 border-t border-slate-50 space-y-3">
                {(() => {
                  const isTopUpInv = invoice.items.some(it => it.name.toLowerCase().includes('top up') || it.action_type === 'topup');
                  // Ambil service fee (khusus Customer) agar total sinkron
                  const sFee = Number(paymentResult?.fee_customer ?? invoice?.service_fee ?? 0);
                  
                  // Use static values from invoice (mapped from backend)
                  const netBase = Number(invoice.subtotal || 0);
                  const taxAmount = Number(invoice.tax || 0);
                  const discountAmount = Number(invoice.discount || 0);

                  return (
                    <>
                      <div className="flex justify-between items-center transition-all animate-in fade-in slide-in-from-top-1 text-[11px]">
                        <span className="font-medium text-slate-500 text-[10px]">Harga Dasar (Net)</span>
                        <div className="flex items-center gap-2">
                          {discountAmount > 0 && (
                            <span className="text-slate-400 line-through text-[11px]">{formatRupiah(netBase)}</span>
                          )}
                          <span className="font-bold text-slate-800">{formatRupiah(netBase - discountAmount)}</span>
                        </div>
                      </div>

                      {/* RINCIAN DISKON BERDASARKAN METADATA */}
                      {invoice.discount_meta?.referral?.immediate_discount > 0 && (
                        <div className="flex justify-between items-center bg-orange-50 px-2 py-1.5 rounded-lg border border-orange-100 text-[11px]">
                          <span className="font-bold text-[#F97316] text-[10px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">card_giftcard</span>
                            Potongan Referral
                          </span>
                          <span className="font-black text-[#F97316]">- {formatRupiah(invoice.discount_meta.referral.immediate_discount)}</span>
                        </div>
                      )}

                      {invoice.discount_meta?.voucher && (
                        <div className="flex justify-between items-center bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100 text-[11px]">
                          <span className="font-bold text-emerald-600 text-[10px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">confirmation_number</span>
                            Diskon Voucher ({invoice.discount_meta.voucher.code})
                          </span>
                          <span className="font-black text-emerald-600">- {formatRupiah(invoice.discount_meta.voucher.amount)}</span>
                        </div>
                      )}

                      {/* FALLBACK: Jika ada diskon tapi meta tidak terbaca/format lama */}
                      {discountAmount > 0 && !(invoice.discount_meta?.referral || invoice.discount_meta?.voucher) && (
                        <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 text-[11px]">
                          <span className="font-bold text-slate-600 text-[10px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">sell</span>
                            Potongan Harga
                          </span>
                          <span className="font-black text-slate-600">- {formatRupiah(discountAmount)}</span>
                        </div>
                      )}

                      {!isTopUpInv && (
                        <div className="flex justify-between items-center transition-all animate-in fade-in slide-in-from-top-1 text-[11px]">
                          <span className="font-medium text-slate-500 text-[10px]">Pajak (PPN 11%)</span>
                          <span className="font-bold text-slate-800">+ {formatRupiah(taxAmount)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center transition-all animate-in fade-in slide-in-from-top-1 py-2 border-y border-slate-50 border-dashed text-[11px]">
                        <span className="font-medium text-slate-500 text-[10px]">Biaya Layanan</span>
                        <span className={`font-bold ${sFee > 0 ? 'text-slate-800' : 'text-emerald-500 flex items-center gap-1'}`}>
                          {sFee > 0 ? (
                            `+ ${formatRupiah(sFee)}`
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[12px]">task_alt</span>
                              Gratis Biaya Layanan
                            </>
                          )}
                        </span>
                      </div>
                    </>
                  );
              })()}

              <div className="pt-4 border-t border-dashed border-slate-100 mb-6 text-center">
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1">Total Pembayaran</span>
                <span className="text-xl font-black text-[#F97316] tracking-tight">
                  {formatRupiah(actualPaidTotal)}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50">
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="material-symbols-outlined text-slate-400 text-[16px]">verified_user</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Pembayaran Aman & Terenkripsi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
