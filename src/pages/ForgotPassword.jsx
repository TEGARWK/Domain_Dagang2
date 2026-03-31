import React, { useState } from "react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        setError(data.message || data || "Gagal mengirim link reset.");
      }
    } catch (err) {
      console.error("Forgot Pass Error:", err);
      setError("Terjadi kesalahan koneksi ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4 overflow-hidden relative">
      {/* --- BACKGROUND DECORATION --- */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#F97316] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>

      {/* --- MAIN CARD CONTAINER --- */}
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/50 h-auto max-h-[90vh]">
        {/* 1. LEFT SIDE - PREMIUM BRANDING (ORANGE THEME) */}
        <div className="hidden md:flex w-5/12 bg-gradient-to-br from-[#F97316] to-orange-600 relative flex-col justify-between p-10 text-white overflow-hidden">
          {/* Grid Pattern & Glow */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          ></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white blur-[100px] opacity-10"></div>

          {/* Top: Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/100 rounded-lg flex items-center justify-center border border-white/30 shadow-sm">
              <img
                src="/image/logo/ADTLogo.png"
                alt="Logo"
                className="w-6 h-auto"
              />
            </div>
            <span className="font-bold text-lg tracking-wide text-white">
              Domain Dagang
            </span>
          </div>

          {/* Middle: Content */}
          <div className="relative z-10 mt-8">
            <h2 className="text-3xl font-bold leading-tight mb-4 text-white">
              Jangan khawatir, <br />
              <span className="text-orange-100">Kami Bantu Anda.</span>
            </h2>
            <p className="text-orange-50 text-sm leading-relaxed max-w-xs font-medium">
              Keamanan akun Anda adalah prioritas kami. Pulihkan akses dengan
              mudah.
            </p>
          </div>

          {/* Bottom: Badge */}
          <div className="relative z-10 mt-8">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 w-fit">
              <svg
                className="w-4 h-4 text-orange-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <p className="text-[10px] font-bold text-white uppercase tracking-wider">
                Secure Recovery
              </p>
            </div>
          </div>
        </div>

        {/* 2. RIGHT SIDE - FORM */}
        <div className="w-full md:w-7/12 p-8 md:p-12 bg-white flex flex-col justify-center relative overflow-y-auto">
          {/* TOMBOL BACK TO HOME */}
          <Link
            to="/"
            className="absolute top-6 left-8 inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#F97316] transition group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 transition">
              <svg
                className="w-4 h-4 group-hover:-translate-x-0.5 transition"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </div>
            <span>Kembali</span>
          </Link>

          <div className="max-w-sm w-full mx-auto mt-6">
            {!isSubmitted ? (
              // --- STATE 1: FORM INPUT ---
              <>
                <div className="mb-8">
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-4 text-[#F97316]">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 19l-1 1-1-1-2-2-2-2-.707-.707a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Lupa Password?
                  </h2>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    Masukkan alamat email yang terdaftar, kami akan mengirimkan
                    link untuk mereset kata sandi Anda.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3 text-red-600">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs font-bold leading-tight">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Email Terdaftar
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-slate-800 text-sm"
                      placeholder="nama@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full text-white font-bold py-3.5 rounded-lg transition duration-300 shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 text-sm ${
                      isLoading ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-[#F97316] hover:bg-slate-900 shadow-orange-200'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Mengirim...</span>
                      </div>
                    ) : (
                      "Kirim Link Reset"
                    )}
                  </button>
                </form>
              </>
            ) : (
              // --- STATE 2: SUCCESS MESSAGE ---
              <div className="text-center animate-[fadeIn_0.5s_ease-out]">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-lg shadow-green-100">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Cek Email Anda
                </h2>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                  Kami telah mengirimkan instruksi reset password ke{" "}
                  <strong>{email}</strong>. Silakan cek inbox atau folder spam
                  Anda.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-[#F97316] font-bold text-sm hover:underline"
                >
                  Kirim ulang email
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-slate-400 text-xs mb-2">
                Ingat kata sandi Anda?
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-slate-700 font-bold text-sm hover:text-[#F97316] transition"
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
                    d="M11 16l-4-4m0 0l4-4m-4 4h14"
                  />
                </svg>
                Kembali ke Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
