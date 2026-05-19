import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";

const TransferDomain = () => {
  const navigate = useNavigate();
  const { success, error, info } = useNotification();
  const [domain, setDomain] = useState("");
  const [eppCode, setEppCode] = useState("");
  const [registrar, setRegistrar] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null); 
  const [eligibilityReason, setEligibilityReason] = useState("");
  const [transferPrice, setTransferPrice] = useState(0); // [NEW]

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!domain) return;
    if (!domain.includes(".")) {
      error("Format domain tidak valid.");
      return;
    }

    setIsChecking(true);
    setResult(null);
    setEligibilityReason("");

    try {
        // [NEW] Call Real Backend API
        const response = await api.post("/transfers/check", { domain_name: domain });
        
        if (response.data.eligible) {
            setResult("eligible");
            setTransferPrice(response.data.price);
        } else {
            setResult("not-eligible");
            setEligibilityReason(response.data.reason || "Domain tidak memenuhi syarat.");
        }

    } catch (err) {
        console.error("Check Error:", err);
        setResult("not-eligible");
        setEligibilityReason(err.response?.data?.message || "Gagal memeriksa domain.");
    } finally {
        setIsChecking(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!eppCode) {
      error("Kode EPP wajib diisi.");
      return;
    }

    setIsProcessing(true);
    try {
        const response = await api.post("/transfers", {
            domain_name: domain,
            epp_code: eppCode,
            current_registrar: registrar
        });
        
        success(response.data.message || "Pengajuan migrasi berhasil dibuat!");
        
        // Redirect to Invoice if invoiceId exists
        if (response.data.invoiceId) {
            navigate(`/checkout?invoiceId=${response.data.invoiceId}`);
        } else {
            // Fallback
            setResult(null);
            setDomain("");
            setEppCode("");
        }

    } catch (err) {
        console.error("Transfer Error:", err);
        const msg = err.response?.data?.message || err.response?.data || "Gagal mengirim pengajuan.";
        error(msg);
        
        if (err.response?.data?.reason) {
            info(`Alasan: ${err.response.data.reason}`);
        }
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] pb-10 relative overflow-hidden">
      {/* --- DECORATIVE BLOBS --- */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-500 rounded-full mix-blend-multiply filter blur-[120px] opacity-10 animate-blob pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500 rounded-full mix-blend-multiply filter blur-[120px] opacity-10 animate-blob animation-delay-2000 pointer-events-none"></div>

      {/* --- HERO HEADER --- */}
      <div className="relative bg-slate-900 rounded-xl p-4 md:p-6 overflow-hidden shadow-xl mt-4 md:mt-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#F97316] rounded-full blur-[120px] opacity-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 -lg bg-white/10 border border-white/20 text-[#F97316] text-[10px] font-bold uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse"></span>
              Migration Service (Instant Transfer)
            </div>
            <h1 className="text-2xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Pindahkan Domain <br className="hidden md:block" />
              <span className="text-[#F97316]">Secara Mandiri.</span>
            </h1>
            <p className="text-slate-400 text-xs md:text-base leading-relaxed">
              Ajukan migrasi domain Anda dan sistem kami akan menanganinya secara otomatis. 
              Proses transfer cepat, aman, dan tanpa hambatan.
            </p>
          </div>

          <div className="w-full md:w-auto md:min-w-[350px] bg-white/5 backdrop-blur-md border border-white/10 p-2 rounded-xl">
            <div className="p-4 space-y-4">
              <form onSubmit={handleCheck} className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2 block">
                        Domain Anda
                    </label>
                    <input
                        type="text"
                        placeholder="startupkeren.com"
                        className="w-full px-5 py-3 md:py-4 rounded-lg bg-slate-800/50 text-white placeholder:text-slate-500 font-bold outline-none border border-transparent focus:border-[#F97316]/50 focus:bg-slate-800 transition-all text-sm md:text-base"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                    />
                <button
                    type="submit"
                    disabled={isChecking}
                    className="w-full bg-[#F97316] text-white py-3 md:py-4 px-6 rounded-lg font-bold hover:bg-white hover:text-slate-900 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 text-xs md:text-sm uppercase tracking-widest"
                >
                    {isChecking ? "Mengecek..." : "Ajukan Migrasi"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>


      {/* --- CONTENT AREA --- */}
      <div className="w-full relative z-10">
        {result === "eligible" ? (
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-xl border border-slate-100 animate-[fadeInUp_0.4s_ease-out]">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Info */}
                    <div className="flex-1 space-y-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-3 bg-green-50 text-green-600 -lg text-xs font-bold border border-green-100">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Siap untuk Pengajuan
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">
                                {domain}
                            </h3>
                            <p className="text-slate-500 font-medium text-sm leading-relaxed">
                                Form ini melengkapi pengajuan migrasi Anda. Sistem kami akan memproses validitas EPP Code yang Anda masukkan secara real-time.
                            </p>
                        </div>

                        <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100 space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Keuntungan Pindah</h4>
                             <ul className="space-y-4">
                                {[
                                    "Harga perpanjangan flat & kompetitif",
                                    "Gratis WHOIS Privacy selamanya",
                                    "Manajemen DNS dengan fitur lengkap",
                                    "Layanan bantuan 24/7 (WhatsApp/Email)"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600 leading-relaxed">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#F97316]"></div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right: Action Form */}
                    <div className="w-full md:w-[320px] space-y-6">
                        <div className="space-y-4">
                             <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2 block">
                                    EPP / Auth Code
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: xYv-782-Zaa"
                                    className="w-full px-5 py-3 rounded-lg bg-slate-50 text-slate-800 placeholder:text-slate-400 font-bold outline-none border border-slate-200 focus:bg-white focus:border-[#F97316] transition-all"
                                    value={eppCode}
                                    onChange={(e) => setEppCode(e.target.value)}
                                />
                            </div>
                             <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2 block">
                                    Registrar Lama (Opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Niagahoster"
                                    className="w-full px-5 py-3 rounded-lg bg-slate-50 text-slate-800 placeholder:text-slate-400 outline-none border border-slate-200 focus:bg-white focus:border-[#F97316] transition-all"
                                    value={registrar}
                                    onChange={(e) => setRegistrar(e.target.value)}
                                />
                            </div>
                        </div>

                         <div className="space-y-4">
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                <p className="text-[10px] font-bold text-[#F97316] uppercase tracking-widest mb-1">Total Biaya Transfer</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-lg font-bold text-slate-900">Rp {parseInt(transferPrice).toLocaleString("id-ID")}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">/ 1 Tahun</p>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmitRequest}
                                disabled={isProcessing}
                                className={`w-full py-3.5 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 shadow-xl ${
                                    isProcessing 
                                        ? "bg-slate-100 text-slate-400" 
                                        : "bg-[#F97316] text-white hover:bg-slate-900 shadow-orange-500/20 active:scale-95"
                                }`}
                            >
                                {isProcessing ? "Memproses..." : "Lanjut Pembayaran"}
                            </button>
                         </div>
                    </div>
                </div>
            </div>
        ) : (
            /* --- STEPS PLACEHOLDER (Mirroring Public Transfer Page Style) --- */
            <div className="w-full mt-12 text-center pb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-3">
                    Cukup <span className="text-[#F97316]">3 Langkah</span> Mudah
                </h2>
                <p className="text-slate-500 text-xs font-medium mb-12">Proses migrasi simpel dan transparan.</p>
                
                <div className="relative">
                    {/* Line Connector */}
                    <div className="hidden md:block absolute top-[28px] left-0 w-full h-[2px] bg-slate-100 -z-10"></div>

                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            { step: 1, title: "Unlock Domain", desc: "Buka kunci domain (Unlock) di panel provider lama kamu untuk memulai." },
                            { step: 2, title: "EPP Code", desc: "Dapatkan kode otorisasi (Auth Code) dari provider lama kamu." },
                            { step: 3, title: "Input di Sini", desc: "Masukkan nama domain dan kode EPP di atas, lalu lunasi invoice." }
                        ].map((s, i) => (
                            <div key={i} className="relative group">
                                <div className={`w-14 h-14 ${s.step === 3 ? "bg-[#F97316]" : "bg-slate-900"} text-white rounded-lg flex items-center justify-center font-bold text-xl mx-auto mb-6 border-4 border-white shadow-xl group-hover:bg-[#F97316] transition-all duration-300 transform group-hover:-translate-y-1`}>
                                    {s.step}
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm mb-2 tracking-tight">{s.title}</h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed font-medium px-4">
                                    {s.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default TransferDomain;
