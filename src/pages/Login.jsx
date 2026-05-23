import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom"; // Tambah useLocation
import { useNotification } from "../context/NotificationContext";
import { GoogleLogin } from '@react-oauth/google';
import api from "../services/api";

const Login = () => {
  const { success } = useNotification();
  const navigate = useNavigate();
  const location = useLocation(); // Hook untuk cek history navigasi

  // State Data
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoadError, setGoogleLoadError] = useState(false);

  // Handle Perubahan Input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Submit Login (REAL BACKEND)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {

      // 1. Tembak API Login Backend
      const response = await api.post("/auth/login", formData);
      const result = response.data;

      // 2. Login Sukses!
      // Simpan data user ke LocalStorage (sebagai "tiket" masuk)
      // Result sudah mengandung { ...user, token }
      localStorage.setItem("user", JSON.stringify(result));
      localStorage.setItem("token", result.token); // Fix: Store token separately for API calls

      success(`Selamat datang kembali!`);

      // 3. Cek Redirect (Ke Admin, Checkout, atau Dashboard?)
      if (result.role === "admin") {
        navigate("/admin");
      } else if (location.state?.from === "checkout") {
        navigate("/checkout");
      } else {
        navigate("/dashboard");
      }
      
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data || "Email atau password salah.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError("");
    try {
        const referralCode = sessionStorage.getItem("referral_code") || "";
        const response = await api.post("/auth/google", {
            credential: credentialResponse.credential,
            referralCode: referralCode
        });
        const result = response.data;

        localStorage.setItem("user", JSON.stringify(result));
        localStorage.setItem("token", result.token);

        success(`Selamat datang kembali, ${result.name}!`);

        if (result.role === "admin") {
            navigate("/admin");
        } else if (location.state?.from === "checkout") {
            navigate("/checkout");
        } else {
            navigate("/dashboard");
        }
    } catch (err) {
        console.error("Google Login Error:", err);
        setError("Gagal masuk dengan Google. Silakan coba lagi.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4 overflow-hidden relative font-sans">
      {/* --- BACKGROUND DECORATION --- */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#F97316] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>

      {/* --- MAIN CARD CONTAINER --- */}
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/50 h-auto max-h-[90vh]">
        {/* 1. LEFT SIDE - PREMIUM BRANDING (ORANGE THEME) */}
        <div className="hidden md:flex w-5/12 bg-gradient-to-br from-[#F97316] to-orange-600 relative flex-col justify-between p-10 text-white overflow-hidden">
          {/* Grid Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          ></div>

          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white blur-[100px] opacity-10"></div>

          {/* Top: Logo Simple */}
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

          {/* Middle: Hero Text Minimalis */}
          <div className="relative z-10 mt-8">
            <h2 className="text-3xl font-bold leading-tight mb-4 text-white">
              Welcome <br />
              <span className="text-orange-100">Back, Boss.</span>
            </h2>
            <p className="text-orange-50 text-sm leading-relaxed max-w-xs font-medium">
              Lanjutkan mengelola aset digitalmu dengan mudah dan aman.
            </p>
          </div>

          {/* Bottom: Simple Status */}
          <div className="relative z-10 mt-8">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 w-fit">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#4ade80]"></div>
              <p className="text-[10px] font-bold text-white uppercase tracking-wider">
                System Normal
              </p>
            </div>
          </div>
        </div>

        {/* 2. RIGHT SIDE - FORM (Clean & Modern) */}
        <div className="w-full md:w-7/12 p-6 md:p-10 bg-white flex flex-col justify-center relative overflow-y-auto custom-scrollbar">
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
            <div className="mb-6 md:mb-8 text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Masuk Akun</h2>
              <p className="text-slate-500 text-xs md:text-sm mt-1">
                Masukkan email & sandi untuk akses.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 flex items-center gap-2 animate-bounce-in">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-slate-800 text-sm"
                  placeholder="nama@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Kata Sandi
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[10px] font-bold text-[#F97316] hover:underline"
                  >
                    Lupa Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-slate-800 text-sm"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-[#F97316] transition"
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#F97316] text-white font-bold py-2.5 md:py-3 rounded-lg hover:bg-slate-900 transition duration-300 shadow-lg shadow-orange-200 transform hover:-translate-y-0.5 active:translate-y-0 text-xs md:text-sm mt-2 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sedang Masuk...
                  </>
                ) : (
                  "Masuk Sekarang"
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span className="px-2 bg-white">Atau masuk dengan</span>
              </div>
            </div>

            <div className="w-full flex flex-col items-center mt-2">
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                        console.error("Google Login Component Error");
                        setError("Akses Google ditolak atau diblokir browser.");
                        setGoogleLoadError(true);
                    }}
                    useOneTap={false}
                    shape="pill"
                    theme="outline"
                    width={window.innerWidth < 640 ? "280" : "340"}
                    use_fedcm_for_prompt={false}
                    text="continue_with"
                />

                {googleLoadError && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl animate-pulse">
                        <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest mb-1">💡 Tips Masalah Login</p>
                        <p className="text-[11px] text-orange-700 leading-relaxed">
                            Jika tombol Google bermasalah, pastikan <strong>domain website ini</strong> sudah terdaftar di Google Cloud Console atau coba gunakan <strong>Incognito Mode</strong>.
                        </p>
                    </div>
                )}
            </div>

            <p className="text-center text-slate-500 mt-8 text-xs">
              Belum punya akun?{" "}
              <Link
                to="/register"
                className="text-[#F97316] font-bold hover:underline"
              >
                Daftar Gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
