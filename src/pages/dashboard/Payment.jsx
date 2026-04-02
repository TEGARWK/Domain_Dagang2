import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import api from "../../services/api";

const Payment = () => {
  const { success, error } = useNotification();
  const confirm = useConfirm();
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Helper for Logo Path
  const getBankLogo = (code) => `/image/banks/${code.toLowerCase()}.png`;

  // Data State
  const [invoice, setInvoice] = useState(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [paymentState, setPaymentState] = useState('PENDING'); // 'PENDING', 'PAID'
  const [paymentResult, setPaymentResult] = useState(location.state?.paymentResult || null); // Data form Previous Page
  const [showSuccessPopup, setShowSuccessPopup] = useState(location.state?.paymentSuccess || false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Polling Interval
  useEffect(() => {
     let interval;
     if (paymentState !== 'PAID') { // Poll while not yet paid
         interval = setInterval(async () => {
             try {
                 const res = await api.get(`/prismalink/status/${invoiceId}`);
                 const status = res.data.data?.transaction_status;
                 const isPaid = ['PAID', 'SETTLEMENT', 'SUCCESS', 'SETTLED', 'SETLD'].includes(status);

                 if (isPaid) {
                     if (paymentState !== 'PAID') { // Only trigger once
                        setPaymentState('PAID');
                        setShowSuccessPopup(true);
                        clearInterval(interval);
                        success("Pembayaran Berhasil Diterima!");
                        
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
      const expiryDate = new Date(paymentResult.expired_at).getTime();
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

  // Manual Status Check
  const handleCheckStatus = async () => {
      const btn = document.getElementById('btn-check-status');
      if(!btn) return;

      const originalText = btn.innerText;
      btn.innerText = "Mengecek...";
      btn.disabled = true;

      try {
          const res = await api.get(`/prismalink/status/${invoiceId}`);
          const status = res.data.data?.transaction_status;
          const isPaid = ['PAID', 'SETTLEMENT', 'SUCCESS', 'SETTLED', 'SETLD'].includes(status);
          
          if (isPaid) {
               setPaymentState('PAID');
               setShowSuccessPopup(true);
               success("Status Terupdate: LUNAS!");
          } else {
               // Masih pending
               success(`Status: ${status || 'MENUNGGU PEMBAYARAN'}`);
          }
      } catch (err) {
          console.error("Check status error", err);
          error("Gagal mengecek status. Silakan coba lagi.");
      } finally {
          const btn = document.getElementById('btn-check-status');
          if(btn) {
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
 
  // --- RENDER HELPERS ---
  
  // Render Instruksi Pembayaran (VA / QR)
  const renderInstructions = () => {
      if (!paymentResult) return null;

      const isQR = paymentResult.qr_string || paymentResult.qr_image;
      
      return (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden animate-[fadeIn_0.5s_ease-out] border border-slate-100">
              {/* Header Instruksi - Simplified */}
              <div className="p-8 text-center border-b border-slate-50 bg-slate-50/50">
                  <div className="inline-flex items-center gap-2 bg-orange-100/50 border border-orange-100 px-3 py-1 rounded-full mb-4">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                      <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">
                          Selesaikan dalam {timeLeft > 0 ? formatCountdown(timeLeft) : "Expired"}
                      </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {isQR ? "Scan QRIS Anda" : "Pembayaran Virtual Account"}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                      {isQR ? "Gunakan aplikasi E-Wallet atau Mobile Banking Anda" : `Silakan transfer ke nomor VA ${paymentResult.bank_code || ""}`}
                  </p>
              </div>

              <div className="p-10">
                  {/* Main Payment Display */}
                  <div className="flex flex-col items-center">
                      {isQR ? (
                          <div className="w-full max-w-sm flex flex-col items-center">
                              {/* QR Container */}
                              <div className="relative p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm mb-8">
                                  {paymentResult.qr_image ? (
                                      <img src={paymentResult.qr_image} alt="QRIS" className="w-64 h-64 object-contain mx-auto" />
                                  ) : (
                                      <div className="bg-white p-2">
                                          <QRCodeCanvas value={paymentResult.qr_string} size={256} />
                                      </div>
                                  )}
                                  
                                  {/* QRIS BRANDING */}
                                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-center gap-3">
                                     <img src="/image/banks/qris.png" alt="QRIS" className="h-6 grayscale hover:grayscale-0 transition opacity-80" onError={(e) => e.target.src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Qris.svg/1200px-Logo_Qris.svg.png"} />
                                  </div>
                              </div>

                              {/* SUPPORTED LOGOS */}
                              <div className="w-full">
                                  <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Mendukung Pembayaran</p>
                                  <div className="grid grid-cols-4 gap-4 opacity-60">
                                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Gopay_logo.svg/1200px-Gopay_logo.svg.png" className="h-4 object-contain mx-auto" alt="Gopay" />
                                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Logo_ovo_purple.svg/1200px-Logo_ovo_purple.svg.png" className="h-4 object-contain mx-auto" alt="OVO" />
                                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Logo_DANA.svg/1200px-Logo_DANA.svg.png" className="h-4 object-contain mx-auto" alt="DANA" />
                                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/LinkAja.svg/1200px-LinkAja.svg.png" className="h-4 object-contain mx-auto" alt="LinkAja" />
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="w-full max-w-md">
                              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center relative overflow-hidden group">
                                  {/* Bank Logo Floating */}
                                  <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                      <img src={getBankLogo(paymentResult.bank_code || "")} className="h-10 object-contain" alt="" />
                                  </div>

                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Nomor Virtual Account</p>
                                  <div className="flex items-center justify-center gap-4 mb-4">
                                      <span className="text-3xl md:text-4xl font-mono font-black text-slate-900 tracking-tighter">
                                          {paymentResult.va_number}
                                      </span>
                                      <button 
                                          onClick={() => {navigator.clipboard.writeText(paymentResult.va_number); success("Nomor VA Disalin!");}}
                                          className="p-2.5 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-orange-500 hover:border-orange-200 rounded-xl transition-all active:scale-90"
                                      >
                                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                      </button>
                                  </div>
                                  <p className="text-sm font-bold text-slate-600">Nama Akun: {paymentResult.user_name || "Pelanggan"}</p>
                              </div>
                              
                              <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                                  <span className="material-symbols-outlined text-blue-500 text-[20px]">info</span>
                                  <p className="text-xs text-blue-700 leading-relaxed font-medium">Pembayaran akan diverifikasi secara otomatis dalam hitungan detik setelah transfer berhasil. Tidak perlu kirim bukti.</p>
                              </div>
                          </div>
                      )}
                  </div>
                  
                  {/* Total Amount Display */}
                  <div className="mt-12 p-8 bg-slate-900 rounded-2xl text-white flex flex-col md:flex-row justify-between items-center gap-4 border border-slate-800 shadow-2xl shadow-slate-900/20">
                      <div className="text-center md:text-left">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Total Pembayaran</p>
                          <div className="text-3xl font-black text-white tracking-tight">
                              {formatRupiah(paymentResult.amount)}
                          </div>
                      </div>
                       <button 
                          onClick={() => {navigator.clipboard.writeText(paymentResult.amount); success("Jumlah Disalin!");}}
                          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors border border-white/10 flex items-center gap-2 group"
                      >
                          <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">content_copy</span>
                          Salin Jumlah
                      </button>
                  </div>

                  {/* Manual Check Button */}
                  <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                          id="btn-check-status"
                          onClick={handleCheckStatus}
                          className="bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                      >
                          <span className="material-symbols-outlined text-[20px]">sync</span>
                          Cek Status Pembayaran
                      </button>
                      <button
                          onClick={() => navigate(`/checkout?invoiceId=${invoiceId}`)}
                          className="bg-white text-slate-500 border-2 border-slate-100 py-4 rounded-xl font-bold hover:border-slate-200 hover:text-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]"></div>
              <div className="relative bg-white rounded-lg p-8 max-w-md w-full shadow-2xl animate-[scaleIn_0.3s_ease-out] border border-white/20">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 text-green-600 mb-6 shadow-lg shadow-green-100">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Pembayaran Sukses!</h2>
                    <p className="text-slate-500 mb-8">Terima kasih, pembayaran Anda telah diterima.</p>

                    <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-slate-500">Total Bayar</span>
                            <span className="font-bold text-[#F97316]">{formatRupiah(invoice.total)}</span>
                        </div>
                         <p className="text-xs text-slate-400 text-center mt-4">
                            {getSuccessMessage()}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button onClick={() => navigate(getSuccessRedirectPath())} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition">
                            {getSuccessButtonLabel()}
                        </button>
                    </div>
                  </div>
              </div>
          </div>
      )}


      {/* Tombol Kembali Mobile */}
      <div className="max-w-7xl mx-auto mb-4 lg:hidden">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-500 hover:text-[#F97316] font-bold text-sm transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Kembali
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- KOLOM KIRI (70%) --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* HEADER INVOICE (Always Visible) */}
          <div className="bg-white p-6 md:p-8 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <button onClick={handleBack} className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-[#F97316] transition" title="Kembali">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  </button>
                  <h1 className="text-2xl font-bold text-slate-800">Pembayaran Invoice</h1>
                </div>
                <p className="text-slate-500 text-sm ml-0 lg:ml-11">ID Tagihan: <span className="font-bold text-slate-700">{invoice.id}</span></p>
              </div>
              <div className={`px-4 py-2 rounded-lg text-right border ${paymentState === 'PAID' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-100 text-[#F97316]'}`}>
                <p className="text-xs font-bold uppercase tracking-wider">Status</p>
                <p className="font-bold text-lg">{paymentState === 'PAID' ? 'LUNAS' : 'MENUNGGU'}</p>
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
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 sticky top-8">
            <h3 className="text-lg font-black text-slate-900 mb-6 tracking-tight">Ringkasan Pesanan</h3>
            
            <div className="space-y-5 mb-8">
              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 leading-snug">{item.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{item.desc}</p>
                  </div>
                  <span className="text-sm font-black text-slate-900 whitespace-nowrap">
                    {item.price === 0 ? "GRATIS" : formatRupiah(item.price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-50">
              <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Pembayaran</span>
              </div>
              <div className="flex justify-between items-end">
                  <span className="text-2xl font-black text-[#F97316] tracking-tighter">{formatRupiah(invoice.total)}</span>
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
