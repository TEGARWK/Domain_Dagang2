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
    // console.log("[Debug Logo] Code:", code, "URL:", iconUrl); // Hapus log ini setelah beres

    // 1. Jika iconUrl sudah link lengkap (http/https), pakai itu langsung
    if (iconUrl && (iconUrl.startsWith('http://') || iconUrl.startsWith('https://'))) {
      return iconUrl;
    }

    const bankCode = code ? String(code).toLowerCase() : '';
    const origin = window.location.origin;

    // 2. PRIORITIZE Local Mappings (including numerical codes for Prismalink)
    if (bankCode === '014' || bankCode.includes('bca')) return `${origin}/image/banks/bca.png`;
    if (bankCode === '008' || bankCode.includes('mandiri')) return `${origin}/image/banks/mandiri.png`;
    if (bankCode === '009' || bankCode.includes('bni')) return `${origin}/image/banks/bni.png`;
    if (bankCode === '002' || bankCode.includes('bri')) return `${origin}/image/banks/bri.png`;
    if (bankCode === '013' || bankCode.includes('permata')) return `${origin}/image/banks/permata.png`;
    if (bankCode === '011' || bankCode.includes('danamon')) return `${origin}/image/banks/danamon.png`;
    if (bankCode === '451' || bankCode.includes('bsi')) return `${origin}/image/banks/bsi.png`;
    if (bankCode === '022' || bankCode.includes('cimb')) return `${origin}/image/banks/cimb.png`;

    if (bankCode.includes('qris') || bankCode === 'qr') return `${origin}/image/banks/qris.png`;

    // E-Wallet Local Paths
    if (bankCode === 'ovo') return `${origin}/image/banks/ovo.png`;
    if (bankCode === 'dana') return `${origin}/image/banks/dana.png`;
    if (bankCode === 'shopeepay') return `${origin}/image/banks/shopeepay.png`;
    if (bankCode === 'gopay') return `${origin}/image/banks/gopay.png`;
    if (bankCode === 'linkaja') return `${origin}/image/banks/linkaja.png`;

    // 3. FALLBACK
    return iconUrl || `${origin}/image/banks/${bankCode}.png`;
  };

  // Data State
  const [invoice, setInvoice] = useState(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [paymentState, setPaymentState] = useState('PENDING'); // 'PENDING', 'PAID'
  const [paymentResult, setPaymentResult] = useState(location.state?.paymentResult || null); // Data form Previous Page
  const [showSuccessPopup, setShowSuccessPopup] = useState(location.state?.paymentSuccess || false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [activeInstruction, setActiveInstruction] = useState(0); // For instructions accordion
  const [isCopied, setIsCopied] = useState(false); // For VA copy feedback

  // Proof Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [modalMode, setModalMode] = useState("cancel"); // "cancel" or "change_method"
  const [cancelReason, setCancelReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  const cancellationReasons = [
    "Ganti pikiran",
    "Ketemu harga lebih murah",
    "Salah ketik nama domain",
    "Gak jadi rilis project",
    "Lainnya"
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return error("Ukuran file maksimal 5MB");
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadProof = async () => {
    if (!selectedFile) return error("Silakan pilih file bukti pembayaran");

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      // 1. Upload to server
      const uploadRes = await api.post("/upload/proof", formData);
      const imageUrl = uploadRes.data.imageUrl;

      // 2. Save to database
      const confirmRes = await api.post(`/billing/invoice/${invoiceId}/confirm-payment`, {
        payment_proof: imageUrl
      });

      if (confirmRes.data.success) {
        success(confirmRes.data.message);
        // Update local state to show the uploaded proof
        setPaymentResult(prev => ({
          ...prev,
          payment_proof: imageUrl
        }));
        setSelectedFile(null);
        setPreviewUrl(null);

        // Redirect after a short delay so user can see the success state
        setTimeout(() => {
          info("Mengalihkan ke daftar tagihan...");
          navigate("/dashboard/billing");
        }, 3000);
      }
    } catch (err) {
      console.error("Upload proof error:", err);
      error(err.response?.data?.message || "Gagal mengupload bukti pembayaran");
    } finally {
      setIsUploading(false);
    }
  };

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
          // Detect provider: check explicit flag OR check unique Prismalink fields
          const provider = paymentResult?.provider ||
            (paymentResult?.plink_ref_no || paymentResult?.va_number_list ? 'prismalink' : 'tripay');
          if (provider === 'manual') return; // Skip polling for manual transfers

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
    const calculateRemaining = () => {
      // Prioritaskan expiry dari payment request. 
      const expAt = paymentResult?.expired_at || paymentResult?.manual_details?.expired_at || invoice?.due_date;

      if (!expAt) {
        setTimeLeft(null); // Gunakan null untuk menandakan "Waktu Tidak Terbatas/Belum Ditentukan"
        return;
      }

      let expiryDate;
      if (typeof expAt === 'number' && expAt < 10000000000) {
        expiryDate = expAt * 1000;
      } else {
        expiryDate = new Date(expAt).getTime();
      }

      const now = new Date().getTime();

      if (isNaN(expiryDate)) {
        setTimeLeft(null);
        return;
      }

      const diffInSeconds = Math.max(0, Math.floor((expiryDate - now) / 1000));
      setTimeLeft(diffInSeconds);
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);

    return () => clearInterval(timer);
  }, [paymentResult, invoice]);

  // --- FETCH INVOICE ---
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const invRes = await api.get(`/billing/invoice/${invoiceId}`);
        setInvoice(invRes.data);

        // Recover payment details if lost on refresh
        if (!paymentResult) {
          const pi = invRes.data.payment_instructions;
          if (pi) {
            // Recover untuk semua jenis: Tripay, Prismalink, dan Manual
            const hasTripay = pi.expired_at || pi.pay_code || pi.qr_string;
            const hasPrismalink = pi.va_number_list || pi.plink_ref_no;
            const hasManual = pi.manual_details;
            if (hasTripay || hasPrismalink || hasManual) {
              setPaymentResult(pi);
            }
          }
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
    try {
      let expiryDate;
      if (typeof expiredAt === 'number' && expiredAt < 10000000000) {
        expiryDate = new Date(expiredAt * 1000);
      } else {
        expiryDate = new Date(expiredAt);
      }

      if (isNaN(expiryDate.getTime())) {
        return "-";
      }

      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(expiryDate);
    } catch (e) {
      console.error("formatDeadline error:", e);
      return "-";
    }
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
      if (provider === 'manual') {
        info("Pembayaran manual sedang menunggu konfirmasi admin. Silakan kirim bukti transfer jika diperlukan.", "Status Pending");
        return;
      }

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

    // Buka modal dengan mode "cancel"
    setModalMode("cancel");
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    const finalReason = cancelReason === "Lainnya" ? otherReason : cancelReason;
    if (!finalReason) {
      info("Silakan pilih atau masukkan alasan.");
      return;
    }

    if (modalMode === "change_method") {
      // Hanya pindah halaman, jangan dicancel di DB
      setShowCancelModal(false);
      setCancelReason("");
      setOtherReason("");
      navigate(`/checkout?invoiceId=${invoiceId}`);
      return;
    }

    try {
      const response = await api.put(`/billing/invoice/${invoiceId}/cancel`, { reason: finalReason });
      if (response.data.success) {
        success(response.data.message || "Tagihan berhasil dibatalkan");
        setShowCancelModal(false);
        navigate("/dashboard/billing");
      }
    } catch (err) {
      console.error("Cancel invoice error:", err);
      error(err.response?.data?.message || "Gagal membatalkan tagihan");
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

  const handleDownloadQR = () => {
    try {
      // 0. KHUSUS MANUAL: Download gambar asli dari admin
      const manualInfo = paymentResult.manual_details || (paymentResult.provider === 'manual' ? paymentResult : null);
      const manualQR = manualInfo?.qris_url || manualInfo?.qr_image;

      if (manualQR) {
        const downloadUrl = manualQR.startsWith('http') ? manualQR : `${window.location.origin}${manualQR}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `QRIS-${invoiceId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        success("QR Code berhasil disimpan.");
        return;
      }

      // 1. OTOMATIS: Generate Premium Card
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

      ctx.fillStyle = '#FF6B00'; // Orange
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

  // Render Instruksi Pembayaran (VA / QR / Manual)
  const renderInstructions = () => {
    if (!paymentResult) return null;

    // Detect Manual Payment (Can be flat from state or nested from API)
    const manualInfo = paymentResult.manual_details || (paymentResult.provider === 'manual' ? paymentResult : null);

    // Prismalink Handling
    let plinkVA = null;
    let plinkBank = null;
    if (paymentResult.va_number_list) {
      try {
        const vaList = typeof paymentResult.va_number_list === 'string' ? JSON.parse(paymentResult.va_number_list) : paymentResult.va_number_list;
        plinkVA = vaList[0]?.va;
        plinkBank = vaList[0]?.bank; // Ambil kode bank dari sini (misal: 014)
      } catch (e) { }
    }

    // Deteksi metode E-Wallet yang lebih akurat
    const methodLower = (paymentResult.payment_method || paymentResult.method || "").toLowerCase();
    const isEwalletMethod = methodLower.includes('ovo') || methodLower.includes('dana') || methodLower.includes('shopeepay') || methodLower.includes('linkaja') || methodLower.includes('gopay');
    
    const isVA = !!(paymentResult.pay_code || paymentResult.va_number || plinkVA) && !isEwalletMethod;
    const isQR = !!(paymentResult.qr_string || paymentResult.qr_url || paymentResult.qr_image || paymentResult.qris_data || manualInfo?.qris_url || manualInfo?.qr_image);
    const isEwallet = isEwalletMethod || (!!paymentResult.pay_url && !isVA && !isQR);

    // Final Payment Value (Code or QR)
    const qrValue = paymentResult.qris_data || paymentResult.qr_string || paymentResult.pay_code;
    const vaValue = plinkVA || paymentResult.pay_code || paymentResult.va_number;

    return (
      <div className="relative bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden animate-[fadeIn_0.5s_ease-out] border border-slate-100">
        {/* EXPIRED OVERLAY */}
        {timeLeft === 0 && (paymentResult.expired_at || invoice?.due_date) && paymentState !== 'PAID' && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-6 text-center">
            <div className="bg-white border border-red-100 rounded-3xl p-8 shadow-2xl shadow-red-200/50 max-w-sm">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">timer_off</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-tighter">Waktu Habis</h3>
              <p className="text-xs text-slate-500 font-medium mb-6">Masa berlaku invoice ini sudah berakhir. Silakan ganti metode atau lakukan pemesanan ulang.</p>
              <div className="space-y-3">
                <button onClick={() => navigate(`/checkout?invoiceId=${invoiceId}`)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95">
                  Ganti Metode
                </button>
                <button onClick={() => navigate('/checkout')} className="w-full bg-white text-slate-400 border border-slate-200 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
                  Order Baru
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Header Instruksi - Premium Deadline & Countdown */}
        <div className="p-5 px-6 bg-slate-50/80 border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 items-center gap-1.5 flex">
                <span className="material-symbols-outlined text-[12px]">event_available</span>
                Batas Akhir Pembayaran
              </p>
              <p className="text-xs font-bold text-slate-700">
                {formatDeadline(paymentResult.expired_at || paymentResult.manual_details?.expired_at || invoice?.due_date)}
              </p>
            </div>

            <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 transition-colors ${timeLeft !== 0 ? 'bg-orange-50 border-orange-100' : 'bg-red-50 border-red-100'}`}>
              <div className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${timeLeft !== 0 ? 'bg-orange-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${timeLeft !== 0 ? 'bg-orange-500' : 'bg-red-500'}`}></span>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Sisa Waktu</p>
                <p className={`text-sm font-bold tracking-tighter leading-none ${timeLeft !== 0 ? 'text-orange-600' : 'text-red-600'}`}>
                  {timeLeft !== null && timeLeft > 0 ? formatCountdown(timeLeft) : (timeLeft === 0 ? "EXPIRED" : "MENUNGGU")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          {/* Main Payment Display */}
          <div className="flex flex-col items-center">
            {isEwallet ? (
              <div className="flex flex-col items-center w-full max-w-md mx-auto">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden w-full mb-8">
                  <div className="bg-slate-50/80 p-6 border-b border-slate-100 text-center">
                    <div className="w-16 h-10 bg-white rounded-lg shadow-sm border border-slate-100 p-1.5 flex items-center justify-center mx-auto mb-3">
                      <img src={getBankLogo(methodLower, paymentResult.icon_url)} className="max-h-full max-w-full object-contain" alt="E-Wallet Logo" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 tracking-tight uppercase">PEMBAYARAN E-WALLET</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{methodLower.toUpperCase()}</p>
                  </div>

                  <div className="p-8 text-center">
                    <div className="w-full bg-orange-50/50 p-6 rounded-2xl border border-orange-100 mb-8">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pembayaran</p>
                      <p className="text-3xl font-bold text-orange-600 tracking-tighter">{formatRupiah(actualPaidTotal)}</p>
                    </div>

                    {paymentResult.pay_url ? (
                      <a 
                        href={paymentResult.pay_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg active:scale-95"
                      >
                        <span className="material-symbols-outlined">payments</span>
                        BAYAR SEKARANG
                      </a>
                    ) : (
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-[11px] text-blue-600 font-bold leading-relaxed">
                          Silakan cek notifikasi di aplikasi <b>{methodLower.toUpperCase()}</b> Anda untuk menyelesaikan pembayaran.
                        </p>
                      </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-slate-50">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Status: <span className="text-orange-500 animate-pulse">MENUNGGU KONFIRMASI</span></p>
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left mb-4">Cara Pembayaran</p>
                  <ul className="space-y-3">
                    {[
                      `Buka aplikasi <b>${methodLower.toUpperCase()}</b> di HP Anda.`,
                      "Cek menu <b>Notifikasi</b> atau <b>Riwayat</b> (jika notifikasi tidak muncul).",
                      "Pastikan saldo cukup dan klik <b>Bayar / Konfirmasi</b>.",
                      "Sistem akan otomatis memproses pesanan Anda setelah sukses."
                    ].map((step, sIdx) => (
                      <li key={sIdx} className="flex gap-3 items-start text-left">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                          {sIdx + 1}
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : isQR ? (
              <div className="flex flex-col items-center w-full max-w-sm mx-auto">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden w-full">
                  {/* Kondisional Header: Hanya muncul jika BUKAN QRIS Manual */}
                  {!(manualInfo && (manualInfo.qris_url || manualInfo.qr_image)) && (
                    <div className="bg-slate-50/80 p-6 border-b border-slate-100 text-center">
                      <h2 className="text-lg font-bold text-slate-800 tracking-tighter uppercase mb-0.5">DOMAIN DAGANG</h2>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Metode Pembayaran QRIS</p>
                    </div>
                  )}

                  {/* QR Core Section */}
                  <div className={`${(manualInfo && (manualInfo.qris_url || manualInfo.qr_image)) ? 'p-0' : 'p-6 pb-2'}`}>
                    <div className={`${(manualInfo && (manualInfo.qris_url || manualInfo.qr_image)) ? 'mb-0' : 'bg-white p-3 mb-4 flex items-center justify-center min-h-[200px]'}`}>
                      {manualInfo && (manualInfo.qris_url || manualInfo.qr_image) ? (
                        <img
                          src={
                            (manualInfo.qris_url || manualInfo.qr_image).startsWith('http') 
                            ? (manualInfo.qris_url || manualInfo.qr_image) 
                            : `${window.location.origin}${manualInfo.qris_url || manualInfo.qr_image}`
                          }
                          alt="QRIS Manual"
                          className="w-full h-auto object-contain mx-auto"
                          onError={(e) => {
                            if (e.target.src !== `${api.defaults.baseURL.replace('/api', '')}${manualInfo.qris_url || manualInfo.qr_image}`) {
                               e.target.src = `${api.defaults.baseURL.replace('/api', '')}${manualInfo.qris_url || manualInfo.qr_image}`;
                            }
                          }}
                        />
                      ) : (
                        <div className="bg-white w-full">
                          <QRCodeCanvas
                            value={qrValue}
                            size={250}
                            level="H"
                            includeMargin={false}
                            className="mx-auto w-full h-auto"
                          />
                        </div>
                      )}
                    </div>

                    {/* Footer Info (Matching Image) - Compact Mode */}
                    <div className="text-center p-6 pt-2 space-y-2 pb-6">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Pembayaran</p>
                        <p className="text-2xl font-bold text-[#FF6B00] tracking-tighter">{formatRupiah(actualPaidTotal)}</p>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 tracking-tight">ID: {invoiceId}</p>
                      </div>

                      <div className="pt-1">
                        <p className="text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                          OTOMATIS TERVERIFIKASI • AMAN & TERENKRIPSI
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Below Card */}
                <div className="w-full mt-6 space-y-3">
                  <button
                    onClick={handleDownloadQR}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                  >
                    <span className="material-symbols-outlined text-lg">download</span>
                    Simpan QR Code
                  </button>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left mb-4">Cara Bayar QRIS</p>
                    <ul className="space-y-3">
                      {[
                        "Buka aplikasi e-wallet (OVO, DANA, GoPay) atau m-banking Anda.",
                        "Pilih menu <b>Scan / Bayar</b> dan arahkan kamera ke QR Code di atas.",
                        "Periksa nominal dan selesaikan pembayaran."
                      ].map((step, sIdx) => (
                        <li key={sIdx} className="flex gap-3 items-start text-left">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                            {sIdx + 1}
                          </span>
                          <p className="text-[11px] text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              /* --- UNIFIED VA CARD (Manual, Tripay, Prismalink) --- */
              <div className="w-full max-w-md mx-auto">
                <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden group">
                  {/* Bank Header Section */}
                  {(() => {
                    const pMethod = String(paymentResult.payment_method || "").toLowerCase();
                    const pBank = String(plinkBank || "").toLowerCase();
                    const provider = manualInfo ? 'manual' : (paymentResult.provider || (plinkVA ? 'prismalink' : 'tripay'));
                      let bankName = "";
                      let logoCode = "";

                      if (manualInfo) {
                        bankName = manualInfo.bank_name;
                        logoCode = manualInfo.bank_name;
                      } else {
                        // Normalize codes for matching
                        const codeToMatch = (pMethod || pBank || paymentResult.bank_code || "").toLowerCase();
                        
                        if (codeToMatch.includes('014') || codeToMatch.includes('bca')) { bankName = "BCA"; logoCode = "014"; }
                        else if (codeToMatch.includes('008') || codeToMatch.includes('mandiri')) { bankName = "Mandiri"; logoCode = "008"; }
                        else if (codeToMatch.includes('002') || codeToMatch.includes('bri')) { bankName = "BRI"; logoCode = "002"; }
                        else if (codeToMatch.includes('009') || codeToMatch.includes('bni')) { bankName = "BNI"; logoCode = "009"; }
                        else if (codeToMatch.includes('013') || codeToMatch.includes('permata')) { bankName = "Permata"; logoCode = "013"; }
                        else if (codeToMatch.includes('451') || codeToMatch.includes('bsi')) { bankName = "BSI"; logoCode = "451"; }
                        else if (codeToMatch.includes('022') || codeToMatch.includes('cimb')) { bankName = "CIMB"; logoCode = "022"; }
                        else if (codeToMatch.includes('011') || codeToMatch.includes('danamon')) { bankName = "Danamon"; logoCode = "011"; }
                        else {
                          bankName = (paymentResult.bank_name || paymentResult.method?.replace('_', ' ') || "Bank Transfer");
                          logoCode = codeToMatch;
                        }
                      }

                    const isManual = provider === 'manual';
                    const displayTitle = isManual ? `Transfer Bank ${bankName}` : (bankName.toLowerCase().includes("virtual account") ? bankName : `Virtual Account ${bankName}`);
                    const sectionLabel = isManual ? `Nomor Rekening ${bankName}` : `Nomor ${displayTitle}`;

                    return (
                      <>
                        <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex flex-col items-center gap-3 relative overflow-hidden">
                          {/* Provider Badge */}
                          <div className="absolute top-4 right-4">
                            <span className={`text-[7px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${isManual ? 'bg-blue-100 text-blue-600' : provider === 'prismalink' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                              {provider}
                            </span>
                          </div>

                          <div className="w-20 h-12 bg-white rounded-xl shadow-sm border border-slate-100 p-2 flex items-center justify-center">
                            <img
                              src={manualInfo?.logo_url || getBankLogo(logoCode, paymentResult.icon_url)}
                              className="max-h-full max-w-full object-contain"
                              alt="Bank Logo"
                            />
                          </div>
                          <div className="text-center">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                              {displayTitle}
                            </h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Metode Pembayaran</p>
                          </div>
                        </div>

                        {/* VA/Rekening Number Section */}
                        <div className="p-8 pb-4 text-center bg-white">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isManual ? 'bg-blue-500' : 'bg-[#FF6B00]'}`}></span>
                            {sectionLabel}
                          </p>
                          <div className="flex items-center justify-center gap-3 mb-4">
                            <span className="text-3xl md:text-4xl font-mono font-bold text-slate-900 tracking-tighter">
                              {manualInfo ? manualInfo.account_number : vaValue}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(manualInfo ? manualInfo.account_number : vaValue);
                                setIsCopied(true);
                                setTimeout(() => setIsCopied(false), 2000);
                                success("Nomor disalin ke clipboard");
                              }}
                              className={`p-2.5 border rounded-xl transition-all active:scale-90 flex items-center justify-center ${isCopied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white shadow-sm border-slate-100 text-slate-400 hover:text-[#FF6B00] hover:border-orange-200'}`}
                            >
                              {isCopied ? (
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                              ) : (
                                <span className="material-symbols-outlined text-[20px]">content_copy</span>
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Terdaftar atas nama: <span className="text-slate-900">{manualInfo ? manualInfo.account_holder : (paymentResult.customer_name || paymentResult.user_name || invoice?.user_name || "Pelanggan")}</span></p>
                        </div>

                        {/* Total Section in Card */}
                        <div className="p-8 pt-4 pb-10 text-center bg-white">
                          <div className="w-full bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pembayaran</p>
                            <div className="flex items-center justify-center gap-2">
                              <p className="text-2xl font-bold text-orange-600 tracking-tighter">{formatRupiah(actualPaidTotal)}</p>
                              <button
                                onClick={() => { navigator.clipboard.writeText(actualPaidTotal); success("Nominal disalin"); }}
                                className="text-orange-300 hover:text-orange-500 transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                              </button>
                            </div>
                          </div>
                          {manualInfo && (
                            <p className="text-[8px] text-center font-bold text-slate-400 uppercase tracking-tight mt-3 italic leading-relaxed">
                              *MOHON TRANSFER SESUAI NOMINAL HINGGA DIGIT TERAKHIR
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* INSTRUCTIONS SECTION (ACCORDION) */}
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-orange-500 text-lg">format_list_numbered</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Cara Pembayaran</p>
                  </div>

                  <div className="space-y-2 text-left">
                    {manualInfo ? (
                      <div className="space-y-3">
                        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm transition-all hover:border-slate-200">
                          <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Langkah Pembayaran Manual</span>
                          </div>
                          <div className="p-5 space-y-4">
                            <div className="flex gap-4 items-start">
                              <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md">1</span>
                              <div>
                                <p className="text-[11px] font-bold text-slate-800 mb-1">Lakukan Transfer Dana</p>
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                  Transfer ke nomor rekening <b>{manualInfo.bank_name}</b> yang tertera di atas. Pastikan nominal transfer <b>TIDAK KURANG & TIDAK LEBIH</b> agar proses verifikasi lebih cepat.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-4 items-start">
                              <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md">2</span>
                              <div>
                                <p className="text-[11px] font-bold text-slate-800 mb-1">Ambil Bukti Transfer</p>
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                  Simpan foto struk ATM atau screenshot aplikasi m-banking Anda yang menunjukkan status <b>BERHASIL</b>.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-4 items-start">
                              <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md">3</span>
                              <div>
                                <p className="text-[11px] font-bold text-slate-800 mb-1">Kirim Konfirmasi</p>
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                  Klik tombol <b>"Kirim Konfirmasi"</b> di bawah setelah memilih file bukti, atau kirim bukti tersebut melalui <b>WhatsApp Admin</b>.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      [
                        {
                          title: "M-Banking / Internet Banking",
                          steps: [
                            "Buka aplikasi mobile banking Anda.",
                            "Pilih menu <b>Transfer</b> atau <b>Pembayaran</b>.",
                            "Pilih menu <b>Virtual Account</b>.",
                            `Masukkan nomor VA: <b>${vaValue}</b>`,
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
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{group.title}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform duration-300 ${activeInstruction === idx ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>

                          {activeInstruction === idx && (
                            <div className="px-5 pb-5 pt-1 animate-[fadeIn_0.3s_ease-out]">
                              <ul className="space-y-3">
                                {group.steps.map((step, sIdx) => (
                                  <li key={sIdx} className="flex gap-3 items-start">
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                                      {sIdx + 1}
                                    </span>
                                    <p className="text-[11px] text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: step }} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Manual Proof Upload (Only for Manual) */}
                {manualInfo && (
                  <div className="mt-8 border-t border-slate-100 pt-8 animate-[fadeIn_0.5s_ease-out]">
                    {paymentResult.payment_proof || paymentResult.manual_details?.payment_proof ? (
                      <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="material-symbols-outlined">verified</span>
                        </div>
                        <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-1">Bukti Terkirim</p>
                        <p className="text-[11px] text-green-600 font-medium mb-4">Bukti pembayaran Anda sedang diverifikasi admin.</p>
                        <div className="relative group overflow-hidden rounded-xl aspect-video bg-white border border-green-100">
                          <img
                            src={paymentResult.payment_proof || paymentResult.manual_details?.payment_proof}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            alt="Bukti"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Upload Bukti Transfer</p>
                        {previewUrl ? (
                          <div className="relative mb-4 group">
                            <img src={previewUrl} alt="Preview" className="w-full aspect-video object-cover rounded-xl border border-slate-200" />
                            <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg"><span className="material-symbols-outlined text-sm">close</span></button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 hover:border-orange-300 mb-4 transition-all group">
                            <span className="material-symbols-outlined text-3xl text-slate-300 group-hover:text-orange-400 mb-2">add_a_photo</span>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Pilih Bukti Transfer</p>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                          </label>
                        )}
                        <button onClick={handleUploadProof} disabled={!selectedFile || isUploading} className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${!selectedFile || isUploading ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-orange-600'}`}>
                          {isUploading ? 'MENGIRIM...' : 'Kirim Konfirmasi'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Manual Action Buttons */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              id="btn-check-status"
              onClick={handleCheckStatus}
              className="bg-orange-600 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              Cek Status
            </button>
            <button
              onClick={() => navigate(`/checkout?invoiceId=${invoiceId}`)}
              className="bg-white text-slate-400 border border-slate-200 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center gap-2"
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

  const getCategoryBadge = (cat) => {
    const c = (cat || 'REGISTER').toUpperCase();
    switch (c) {
      case 'TOPUP': return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm">Top-up Saldo</span>;
      case 'RENEW': return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm">Perpanjang</span>;
      case 'TRANSFER': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm">Transfer</span>;
      case 'RESTORE': return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm">Restore</span>;
      default: return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm">Registrasi</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin w-10 h-10 border-4 border-slate-200 border-t-[#FF6B00] rounded-full"></div>
        <p className="text-slate-400 text-sm font-bold animate-pulse">
          Memuat Data Invoice...
        </p>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <>
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
                <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">Pembayaran Berhasil!</h2>
                <p className="text-sm text-slate-500 mb-8 font-medium">Terima kasih, tagihan Anda telah kami terima dan sedang diproses.</p>

                <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Total yang diBayar</span>
                    <span className="text-lg font-bold text-[#FF6B00]">{formatRupiah(actualPaidTotal)}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Status Transaksi</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold uppercase">SUKSES</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center mb-6 font-medium animate-pulse">
                  {getSuccessMessage()}
                </p>

                <button onClick={() => navigate(getSuccessRedirectPath())} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition active:scale-95">
                  {getSuccessButtonLabel()}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={handleBack} className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#FF6B00] hover:border-orange-200 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Pembayaran</h1>
              <p className="text-sm text-slate-500">Selesaikan tagihan Anda dengan aman.</p>
            </div>
            <div className="ml-auto flex flex-col items-end">
              <div className={`px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${paymentState === 'PAID' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-100 text-[#FF6B00]'}`}>
                {paymentState === 'PAID' ? 'LUNAS' : 'MENUNGGU'}
              </div>
              <p className="text-[9px] text-slate-400 mt-1 font-bold tracking-widest uppercase">Invoice: {invoice.id}</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {paymentResult ? (
              renderInstructions()
            ) : (
              <div className="bg-white p-8 rounded-lg border border-slate-200 text-center shadow-lg animate-[fadeIn_0.5s_ease-out]">
                <div className="w-20 h-20 bg-orange-100 text-[#FF6B00] rounded-full flex items-center justify-center mx-auto mb-6 shadow-orange-100 shadow-xl">
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
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF6B00] to-orange-400"></div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 uppercase text-[9px] tracking-[0.2em] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FF6B00] text-sm">assessment</span>
                  Tagihan
                </h3>
                {getCategoryBadge(invoice.category)}
              </div>

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
                      <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
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
                          <span className="font-bold text-[#FF6B00] text-[10px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">card_giftcard</span>
                            Potongan Referral
                          </span>
                          <span className="font-bold text-[#FF6B00]">- {formatRupiah(invoice.discount_meta.referral.immediate_discount)}</span>
                        </div>
                      )}

                      {invoice.discount_meta?.voucher && (
                        <div className="flex justify-between items-center bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100 text-[11px]">
                          <span className="font-bold text-emerald-600 text-[10px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">confirmation_number</span>
                            Diskon Voucher ({invoice.discount_meta.voucher.code})
                          </span>
                          <span className="font-bold text-emerald-600">- {formatRupiah(invoice.discount_meta.voucher.amount)}</span>
                        </div>
                      )}

                      {/* FALLBACK: Jika ada diskon tapi meta tidak terbaca/format lama */}
                      {discountAmount > 0 && !(invoice.discount_meta?.referral || invoice.discount_meta?.voucher) && (
                        <div className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 text-[11px]">
                          <span className="font-bold text-slate-600 text-[10px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">sell</span>
                            Potongan Harga
                          </span>
                          <span className="font-bold text-slate-600">- {formatRupiah(discountAmount)}</span>
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
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest block mb-1">Total Pembayaran</span>
                  <span className="text-xl font-bold text-[#FF6B00] tracking-tight">
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

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-[scaleUp_0.3s_ease-out]">
            <div className="p-8">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-3xl">cancel</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">
                {modalMode === "change_method" ? "Ganti Metode?" : "Batalkan Tagihan?"}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                {modalMode === "change_method"
                  ? "Beritahu kami alasan Anda ingin mengganti metode pembayaran untuk membantu kami meningkatkan layanan."
                  : "Beritahu kami alasan Anda membatalkan pesanan ini untuk membantu kami meningkatkan layanan."
                }
              </p>

              <div className="space-y-4">
                <div className="relative group">
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    <option value="">Pilih Alasan...</option>
                    {cancellationReasons.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {cancelReason === "Lainnya" && (
                  <textarea
                    placeholder="Masukkan alasan Anda..."
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all min-h-[100px]"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                    setOtherReason("");
                  }}
                  className="h-12 border border-slate-200 rounded-lg font-bold text-[11px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="h-12 bg-rose-500 text-white rounded-lg font-bold text-[11px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                >
                  {modalMode === "change_method" ? "Ya, Ganti Metode" : "Ya, Batalkan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Payment;
