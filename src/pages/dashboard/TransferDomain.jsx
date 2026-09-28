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
  const [transferPrice, setTransferPrice] = useState(0);

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

        if (response.data.invoiceId) {
            navigate(`/checkout?invoiceId=${response.data.invoiceId}`);
        } else {
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
    <div className="px-6 pb-20 animate-fade-in">
      {/* HERO SECTION — Search Domain */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="badge badge-neutral">Migration Service</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
            </div>
            <h1 className="text-[20px] md:text-[24px] font-bold text-neutral-900 leading-tight mb-2">
              Pindahkan Domain <span className="text-primary-500">Secara Mandiri</span>
            </h1>
            <p className="text-[12px] text-neutral-500 leading-relaxed max-w-lg">
              Ajukan migrasi domain Anda dan sistem kami akan menanganinya secara otomatis.
              Proses transfer cepat, aman, dan tanpa hambatan.
            </p>
          </div>

          <div className="w-full md:w-[360px]">
            <form onSubmit={handleCheck} className="space-y-3">
              <div className="form-group">
                <label className="form-label">Nama Domain</label>
                <input
                  type="text"
                  placeholder="startupkeren.com"
                  className="form-input"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>
              <button type="submit" disabled={isChecking} className="btn btn-primary w-full">
                {isChecking ? "Mengecek..." : "Cek Ketersediaan"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      {result === "eligible" ? (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
            <span className="badge badge-success">Siap untuk Diproses</span>
          </div>
          <h2 className="text-[18px] font-bold text-neutral-900 mb-6">{domain}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">EPP / Auth Code</label>
                <input
                  type="text"
                  placeholder="Contoh: xYv-782-Zaa"
                  className="form-input"
                  value={eppCode}
                  onChange={(e) => setEppCode(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Registrar Lama (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Niagahoster"
                  className="form-input"
                  value={registrar}
                  onChange={(e) => setRegistrar(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-neutral-50 rounded-lg border border-neutral-100 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="badge badge-warning">Biaya Transfer</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-[24px] font-bold text-neutral-900">
                  Rp {parseInt(transferPrice).toLocaleString("id-ID")}
                </span>
                <span className="text-[12px] text-neutral-400">/ 1 Tahun</span>
              </div>

              <div className="space-y-3 pt-3 border-t border-neutral-100">
                {["Harga perpanjangan flat & kompetitif", "Gratis WHOIS Privacy selamanya", "Manajemen DNS fitur lengkap", "Layanan bantuan 24/7"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-[14px]">check</span>
                    <span className="text-[12px] text-neutral-600">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmitRequest}
                disabled={isProcessing}
                className="btn btn-primary w-full"
              >
                {isProcessing ? "Memproses..." : "Lanjut Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      ) : result === "not-eligible" ? (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-rose-500 text-[24px]">block</span>
          </div>
          <p className="text-[14px] font-semibold text-neutral-900 mb-1">Domain Tidak Dapat Diproses</p>
          <p className="text-[12px] text-neutral-500 mb-5 max-w-md mx-auto">{eligibilityReason}</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setResult(null)} className="btn btn-primary">Coba Domain Lain</button>
            <button onClick={() => navigate("/dashboard/support")} className="btn btn-default">Hubungi Support</button>
          </div>
        </div>
      ) : (
        <>
          {/* STEPS — Cara Kerja */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { step: 1, title: "Cek Domain", desc: "Masukkan nama domain yang ingin dipindahkan. Sistem akan memeriksa status eligibilitasnya secara otomatis." },
              { step: 2, title: "Masukkan Kode EPP", desc: "Dapatkan kode otorisasi (Auth Code) dari provider lama Anda, lalu masukkan di sini." },
              { step: 3, title: "Bayar & Selesai", desc: "Lunasi biaya transfer, dan domain akan pindah secara otomatis ke DomainDagang." }
            ].map((s, i) => (
              <div key={i} className="card text-center p-5 group">
                <div className="w-12 h-12 bg-primary-50 text-primary-500 rounded-lg flex items-center justify-center mx-auto mb-4 font-bold text-[18px] group-hover:bg-primary-500 group-hover:text-white transition-colors">
                  {s.step}
                </div>
                <h4 className="text-[13px] font-semibold text-neutral-900 mb-1">{s.title}</h4>
                <p className="text-[12px] text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* FEATURES + FAQ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="text-[13px] font-semibold text-neutral-900 mb-4">Keuntungan Pindah ke DomainDagang</h3>
              <div className="space-y-4">
                {[
                  { icon: "verified", title: "Aktivasi Instan", desc: "Domain aktif secara otomatis setelah pembayaran dikonfirmasi." },
                  { icon: "shield", title: "Keamanan Penuh", desc: "Proteksi WHOIS dan Domain Lock untuk keamanan aset digital Anda." },
                  { icon: "dns", title: "DNS Management", desc: "Kelola record A, CNAME, MX, TXT dengan mudah via dashboard." },
                  { icon: "support_agent", title: "Bantuan 24/7", desc: "Tim support siap membantu kendala teknis kapan saja." }
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-primary-50 text-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{f.icon}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-neutral-900">{f.title}</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-[13px] font-semibold text-neutral-900 mb-4">Pertanyaan Populer</h3>
              <div className="space-y-1">
                {[
                  { q: "Berapa lama proses transfer?", a: "Rata-rata 5-7 hari kerja, tergantung respon dari registrar lama Anda." },
                  { q: "Apakah website saya akan down?", a: "Tidak. Proses transfer tidak mengganggu website atau email Anda." },
                  { q: "Apa itu kode EPP?", a: "Kode otorisasi yang diterbitkan oleh registrar lama untuk memvalidasi kepemilikan domain." }
                ].map((faq, i) => (
                  <details key={i} className="group">
                    <summary className="flex items-center justify-between py-3 px-3 rounded-lg cursor-pointer text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors list-none">
                      {faq.q}
                      <span className="material-symbols-outlined text-neutral-400 text-[16px] group-open:rotate-180 transition-transform">expand_more</span>
                    </summary>
                    <p className="px-3 pb-3 text-[11px] text-neutral-500 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* SUPPORT BANNER */}
          <div className="card p-5 mt-6 bg-primary-500 border-primary-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className="text-[14px] font-bold text-white mb-0.5">Butuh bantuan memilih domain?</h3>
                <p className="text-[12px] text-white/80">Tim ahli kami siap membantu mencarikan nama terbaik untuk bisnis Anda.</p>
              </div>
              <button onClick={() => navigate("/dashboard/support")} className="btn bg-white text-primary-600 hover:bg-neutral-100 border-0 flex-shrink-0">
                Hubungi CS Kami
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TransferDomain;
