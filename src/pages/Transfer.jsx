import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";
import api from "../services/api";

const Transfer = () => {
  const navigate = useNavigate();
  const { success, error, info } = useNotification();

  const [domain, setDomain] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null); 
  const [eligibilityReason, setEligibilityReason] = useState("");
  const [eppCode, setEppCode] = useState("");
  const [registrar, setRegistrar] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferPrice, setTransferPrice] = useState(0); // [NEW] Dynamic Price State
  const [whoisPrivacy, setWhoisPrivacy] = useState(true);
  const [autoRenew, setAutoRenew] = useState(true);

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

    setIsSubmitting(true);
    try {
        const response = await api.post("/transfers", {
            domain_name: domain,
            epp_code: eppCode,
            current_registrar: registrar,
            config: { whoisPrivacy, autoRenew }
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
        const msg = err.response?.data?.message || err.response?.data || "Gagal mengirim pengajuan. Pastikan domain memenuhi syarat.";
        error(msg);
        
        if (err.response?.data?.reason) {
            info(`Alasan: ${err.response.data.reason}`);
        }

        if (err.response?.status === 401) {
            info("Harap login terlebih dahulu untuk mengajukan migrasi.");
            navigate("/login");
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-40 pb-24 min-h-screen bg-white relative overflow-hidden font-sans">
      {/* 1. HERO & CHECKER */}
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
        <div className="animate-fade-in-up">
           <span className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-orange-50 text-[#F97316] text-[12px] font-bold uppercase tracking-widest border border-orange-100 shadow-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse"></span>
            Layanan Migrasi Terpimpin
          </span>
        </div>
        <h1 className="text-[40px] md:text-[64px] font-bold text-slate-900 mb-8 tracking-tight leading-[1.05]">
          Pindahkan Domain ke <br />{" "}
          <span className="text-[#F97316]">DomainDagang.</span>
        </h1>
        <p className="text-slate-500 text-[17px] font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
          Nikmati kemudahan pengelolaan aset digital dengan pendampingan teknis penuh. 
          Proses migrasi Anda kami pantau secara manual untuk menjamin keamanan 100%.
        </p>

        {/* Input Box */}
        <div className="bg-white p-2 rounded-lg shadow-[0_20px_50px_rgba(15,23,42,0.1)] border border-slate-200 max-w-2xl mx-auto z-20 relative group">
          <form
            onSubmit={handleCheck}
            className="flex flex-col md:flex-row gap-2"
          >
            <input
              type="text"
              placeholder="Masukan nama domain (contoh: mybiz.com)"
              className="flex-1 pl-6 pr-4 h-12 md:h-[56px] text-sm md:text-base rounded-lg outline-none text-slate-800 placeholder:text-slate-400 bg-transparent"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                if (result) setResult(null);
              }}
            />
            <button
              type="submit"
              disabled={isChecking}
              className="bg-[#F97316] text-white px-6 md:px-10 h-12 md:h-[56px] rounded-lg font-bold text-xs md:text-sm uppercase tracking-widest hover:bg-orange-600 transition-all duration-300 shadow-xl shadow-orange-500/20 disabled:opacity-70 flex items-center justify-center gap-2 active:scale-95"
            >
              {isChecking ? "Mengecek..." : "Ajukan Migrasi"}
            </button>
          </form>
        </div>


        {/* RESULT / FORM CONTINUATION */}
        {result === "eligible" && (
          <div className="mt-12 p-10 bg-white border border-slate-100 rounded-xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.1)] max-w-2xl mx-auto text-left animate-fade-in-up relative z-10">
            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-5">
                <div className="bg-success-50 p-3.5 rounded-lg text-success border border-success-100">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                     Lengkapi Data Pengajuan
                  </h3>
                  <p className="text-slate-400 text-[13px] font-bold mt-1">
                     Isi detail migrasi untuk melanjutkan ke pembayaran.
                  </p>
                </div>
              </div>

              <div className="flex-1">

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      EPP Code / Auth Code
                    </label>
                    <input
                      type="text"
                      value={eppCode}
                      onChange={(e) => setEppCode(e.target.value)}
                      placeholder="Wajib diisi (Minta ke provider lama)"
                      className="w-full h-[52px] px-5 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10 transition-all text-sm font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Registrar Asal (Opsional)
                    </label>
                    <input
                      type="text"
                      value={registrar}
                      onChange={(e) => setRegistrar(e.target.value)}
                      placeholder="Contoh: Niagahoster, Rumahweb, dll"
                      className="w-full h-[52px] px-5 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:bg-white focus:border-[#F97316] focus:ring-4 focus:ring-orange-500/10 transition-all text-sm font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Configuration Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-orange-200 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-100 text-slate-400 group-hover:text-orange-500 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">security</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">WHOIS Privacy Protection</h4>
                        <p className="text-[11px] text-slate-500 font-medium tracking-tight">Sembunyikan data kontak publik Anda</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={whoisPrivacy} 
                        onChange={(e) => setWhoisPrivacy(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-orange-200 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-100 text-slate-400 group-hover:text-orange-500 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">autorenew</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Perpanjangan Otomatis</h4>
                        <p className="text-[11px] text-slate-500 font-medium tracking-tight">Perbarui domain otomatis sebelum expired</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoRenew} 
                        onChange={(e) => setAutoRenew(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]"></div>
                    </label>
                  </div>
                </div>

                <div className="p-4 md:p-5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <span className="uppercase tracking-wider text-[10px] text-slate-400 font-bold">Biaya Transfer (+1 Thn)</span>
                        <span className="text-[#F97316] text-base md:text-lg font-bold">Rp {parseInt(transferPrice).toLocaleString("id-ID")}</span>
                    </div>
                </div>

                <button
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 text-white h-[56px] rounded-lg font-bold text-[12px] uppercase tracking-widest hover:bg-[#F97316] transition-all duration-300 shadow-xl shadow-slate-900/10 active:scale-[0.98]"
                >
                  {isSubmitting ? "Memproses..." : "Lanjut ke Pembayaran"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. WHY TRANSFER SECTION */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-32 relative z-10">
        <div className="text-center mb-16">
           <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
             Kenapa Pindah ke <span className="text-[#F97316]">Kami?</span>
           </h2>
           <p className="text-slate-500 font-medium">Standar layanan enterprise untuk kepuasan pelanggan.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-10 bg-white rounded-xl border border-slate-100 hover:border-[#F97316]/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 group">
            <div className="w-16 h-16 bg-orange-50 text-[#F97316] rounded-lg flex items-center justify-center mb-8 group-hover:bg-[#F97316] group-hover:text-white transition-all duration-300 ring-8 ring-transparent group-hover:ring-orange-50">
              {/* Icon Jam Pasir / Waktu */}
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Tidak Ada Downtime</h3>
            <p className="text-slate-500 leading-relaxed font-medium text-[15px]">
              Website kamu tetap online 100% selama proses transfer berlangsung.
              Tidak ada gangguan bisnis sama sekali.
            </p>
          </div>
          <div className="p-10 bg-white rounded-xl border border-slate-100 hover:border-[#F97316]/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 group">
            <div className="w-16 h-16 bg-orange-50 text-[#F97316] rounded-lg flex items-center justify-center mb-8 group-hover:bg-[#F97316] group-hover:text-white transition-all duration-300 ring-8 ring-transparent group-hover:ring-orange-50">
              {/* Icon Dompet / Uang */}
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Harga Jujur</h3>
            <p className="text-slate-500 leading-relaxed font-medium text-[15px]">
              Banyak provider murah di awal tapi jeblok saat perpanjangan. Di
              sini harga kami flat dan transparan selamanya.
            </p>
          </div>
          <div className="p-10 bg-white rounded-xl border border-slate-100 hover:border-[#F97316]/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 group">
            <div className="w-16 h-16 bg-orange-50 text-[#F97316] rounded-lg flex items-center justify-center mb-8 group-hover:bg-[#F97316] group-hover:text-white transition-all duration-300 ring-8 ring-transparent group-hover:ring-orange-50">
              {/* Icon Perisai / Keamanan */}
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Whois Privacy Gratis</h3>
            <p className="text-slate-500 leading-relaxed font-medium text-[15px]">
              Lindungi data pribadi kamu dari spammer secara gratis selamanya. 
              Keamanan identitas digital Anda prioritas kami.
            </p>
          </div>
        </div>
      </div>

      {/* 3. STEP BY STEP */}
      <div className="max-w-4xl mx-auto px-6 lg:px-8 mt-32 text-center pb-20">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
          Cukup <span className="text-[#F97316]">3 Langkah</span> Mudah
        </h2>
        <p className="text-slate-500 font-medium mb-16">Proses migrasi simpel dan transparan.</p>
        
        <div className="relative">
          {/* Line Connector */}
          <div className="hidden md:block absolute top-[60px] left-0 w-full h-[2px] bg-slate-100 -z-10"></div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="relative group">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-xl mx-auto mb-8 border-4 border-white shadow-xl group-hover:bg-[#F97316] transition-all duration-300 transform group-hover:-translate-y-1">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-lg mb-3 tracking-tight">Unlock Domain</h4>
              <p className="text-[14px] text-slate-500 leading-relaxed font-medium">
                Buka kunci domain (Unlock) di panel provider lama kamu untuk memulai.
              </p>
            </div>
            <div className="relative group">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-xl mx-auto mb-8 border-4 border-white shadow-xl group-hover:bg-[#F97316] transition-all duration-300 transform group-hover:-translate-y-1">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-lg mb-3 tracking-tight">EPP Code</h4>
              <p className="text-[14px] text-slate-500 leading-relaxed font-medium">
                Dapatkan kode otorisasi (Auth Code) dari provider lama kamu.
              </p>
            </div>
            <div className="relative group">
              <div className="w-14 h-14 bg-[#F97316] text-white rounded-lg flex items-center justify-center font-bold text-xl mx-auto mb-8 border-4 border-white shadow-xl group-hover:bg-slate-900 transition-all duration-300 transform group-hover:-translate-y-1">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-lg mb-3 tracking-tight">Input di Sini</h4>
              <p className="text-[14px] text-slate-500 leading-relaxed font-medium">
                Masukkan nama domain dan kode EPP di atas, lalu lunasi invoice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
