import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";
import useAddress from "../hooks/useAddress";
import AddressFields from "../components/forms/AddressFields";
import { GoogleLogin } from '@react-oauth/google';
import api from "../services/api";
import LegalModal from "../components/ui/LegalModal";
import { LEGAL_CONTENT } from "../constants/legalContent";

const Register = () => {
  const { success, warning } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

    const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    bio: "",
    address_line1: "",
    city: "",
    state: "",
    district: "",
    village: "",
    zip_code: "",
    country: "ID",
    referralCode: sessionStorage.getItem("referral_code") || "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoadError, setGoogleLoadError] = useState(false);

  // --- LEGAL MODAL STATE ---
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  const openLegalModal = (type) => {
    setModalContent(LEGAL_CONTENT[type]);
    setIsLegalModalOpen(true);
  };

  // --- ADDRESS HOOK ---
  const addressHook = useAddress();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };



  // --- LOGIC UTAMA DISINI ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      warning("Password dan Konfirmasi Password tidak cocok!");
      return;
    }

    setIsLoading(true);

    try {
      // 1. REQUEST REGISTER
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      const response = await api.post("/auth/register", {
        name: fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        bio: formData.bio,
        address_line1: formData.address_line1,
        state: formData.state,
        city: formData.city,
        district: formData.district,
        village: formData.village,
        zip_code: formData.zip_code,
        country: formData.country,
        referralCode: formData.referralCode,
      });

      if (response.status === 200 || response.status === 201) {
        success("Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun.");
        
        // Hapus kode referral dari penyimpanan agar tidak lengket untuk registrasi berikutnya
        sessionStorage.removeItem("referral_code");

        // Redirect ke login setelah 3 detik
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        throw new Error(response.data?.message || "Gagal mendaftar.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Terjadi kesalahan koneksi ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError("");
    try {
        const response = await api.post("/auth/google", {
            credential: credentialResponse.credential,
            referralCode: formData.referralCode
        });
        const result = response.data;

        localStorage.setItem("user", JSON.stringify(result));
        localStorage.setItem("token", result.token);

        success(`Selamat datang, ${result.name}!`);

        if (result.role === "admin") {
            navigate("/admin");
        } else if (location.state?.from === "checkout") {
            navigate("/checkout");
        } else {
            navigate("/dashboard");
        }
    } catch (err) {
        console.error("Google Auth Error:", err);
        setError("Gagal mendaftar dengan Google. Silakan coba lagi.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4 overflow-hidden relative font-sans">
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#F97316] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>

      {/* MAIN CARD */}
      <div className="max-w-5xl w-full bg-white rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/50 h-[90vh]">
        {/* LEFT SIDE - BRANDING */}
        <div className="hidden md:flex w-5/12 bg-gradient-to-br from-[#F97316] to-orange-600 relative flex-col justify-between p-10 text-white overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          ></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white blur-[100px] opacity-10"></div>

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

          <div className="relative z-10 mt-8">
            <h2 className="text-3xl font-bold leading-tight mb-4 text-white">
              Mulailah <br />
              <span className="text-orange-100">Perjalanan Digital Anda.</span>
            </h2>
            <p className="text-orange-50 text-sm leading-relaxed max-w-xs font-medium">
              Platform manajemen domain #1. Aman, Cepat, dan Terpercaya.
            </p>
          </div>

          <div className="relative z-10 mt-8">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20 w-fit shadow-lg">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full bg-orange-300 border-2 border-orange-500"
                  ></div>
                ))}
              </div>
              <div className="pr-2">
                <p className="text-[10px] text-orange-100 uppercase tracking-wider">
                  Trusted By
                </p>
                <p className="text-xs font-bold text-white">15k+ Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - FORM */}
        <div className="w-full md:w-7/12 p-6 md:p-10 bg-white flex flex-col relative overflow-y-auto custom-scrollbar">
          <Link
            to="/"
            className="absolute top-6 left-8 inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#F97316] transition group z-20"
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
                  d="M10 19l-7-7 7-7m-7 7h18"
                />
              </svg>
            </div>
            <span>Kembali</span>
          </Link>

          <div className="max-w-md w-full mx-auto mt-16 md:mt-12">
            <div className="mb-6 text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">Buat Akun</h2>
              <p className="text-slate-500 text-xs md:text-sm mt-1">
                Lengkapi data diri untuk memulai.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 flex items-center gap-2 animate-[fadeIn_0.3s_ease-out]">
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
              
              {/* --- SECTION 1: ACCOUNT INFO --- */}
              <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Nama Depan
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-slate-800 text-sm"
                        placeholder="John"
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Nama Belakang
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-slate-800 text-sm"
                        placeholder="Crish"
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Email Address
                       </label>
                       <input
                         type="email"
                         name="email"
                         value={formData.email}
                         className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-slate-800 text-sm"
                         placeholder="nama@email.com"
                         onChange={handleChange}
                         required
                       />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        No. Handphone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-slate-800 text-sm"
                        placeholder="0812..."
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Bio Singkat <span className="text-slate-300 normal-case italic font-normal">(Opsional)</span>
                    </label>
                    <textarea
                      name="bio"
                      rows="2"
                      value={formData.bio}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-slate-800 text-sm resize-none"
                      placeholder="Ceritakan sedikit tentang Anda..."
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Kode Referral <span className="text-slate-300 normal-case italic font-normal">(Opsional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="referralCode"
                        value={formData.referralCode}
                        className="w-full px-4 py-2.5 rounded-lg bg-orange-50/50 border border-orange-100 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-bold text-[#F97316] text-sm uppercase tracking-widest placeholder:text-slate-300"
                        placeholder="CONTOH-1234"
                        onChange={handleChange}
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center">
                         <span className="material-symbols-outlined text-orange-400 text-sm">workspace_premium</span>
                      </div>
                    </div>
                  </div>
              </div>

              {/* --- SECTION 2: ADDRESS INFO --- */}
              <div className="pt-2 pb-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <div className="flex items-center gap-2 mb-3">
                    <span className="p-1 rounded-full bg-orange-100 text-[#F97316]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <h3 className="text-xs font-bold text-slate-700">Alamat Lengkap</h3>
                 </div>
                 
                 <div className="space-y-4">
                     <AddressFields 
                        formData={formData} 
                        setFormData={setFormData}
                        addressHook={addressHook}
                     />
                 </div>
              </div>

              {/* --- SECTION 3: PASSWORD --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-slate-800 text-sm"
                      placeholder="Min. 8 karakter"
                      onChange={handleChange}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-[#F97316] transition"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Konfirmasi Sandi
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-slate-800 text-sm"
                      placeholder="Ulangi sandi"
                      onChange={handleChange}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-[#F97316] transition"
                    >
                       {showConfirmPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#F97316] focus:ring-[#F97316] cursor-pointer"
                  required
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Setuju dengan{" "}
                  <button 
                    type="button"
                    onClick={() => openLegalModal('terms')}
                    className="text-[#F97316] font-bold hover:underline bg-transparent border-none p-0 inline"
                  >
                    Ketentuan
                  </button>{" "}
                  &{" "}
                  <button 
                    type="button"
                    onClick={() => openLegalModal('privacy')}
                    className="text-[#F97316] font-bold hover:underline bg-transparent border-none p-0 inline"
                  >
                    Privasi
                  </button>.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#F97316] text-white font-bold py-2.5 md:py-3 rounded-lg hover:bg-slate-900 transition duration-300 shadow-lg shadow-orange-200 transform hover:-translate-y-0.5 active:translate-y-0 text-xs md:text-sm mt-4 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  "Daftar Sekarang"
                )}
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span className="px-2 bg-white">Atau daftar dengan</span>
              </div>
            </div>

            <div className="w-full flex flex-col items-center mt-2">
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                        console.error("Google Register Component Error");
                        setError("Akses Google ditolak atau diblokir browser.");
                        setGoogleLoadError(true);
                    }}
                    useOneTap
                    shape="pill"
                    theme="outline"
                    width={window.innerWidth < 640 ? "280" : "340"}
                    use_fedcm_for_prompt={false}
                    text="signup_with"
                />

                {googleLoadError && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl animate-pulse">
                        <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest mb-1">💡 Tips Masalah Daftar</p>
                        <p className="text-[11px] text-orange-700 leading-relaxed text-center">
                            Jika tombol Google bermasalah, pastikan <strong>domain website ini</strong> sudah terdaftar di Google Cloud Console atau coba gunakan <strong>Incognito Mode</strong>.
                        </p>
                    </div>
                )}
            </div>

            <p className="text-center text-slate-500 mt-6 text-xs">
              Sudah punya akun?{" "}
              <Link
                to="/login"
                className="text-[#F97316] font-bold hover:underline"
              >
                Masuk disini
              </Link>
            </p>
          </div>
        </div>
      </div>

      <LegalModal 
        isOpen={isLegalModalOpen} 
        onClose={() => setIsLegalModalOpen(false)} 
        data={modalContent} 
      />
    </div>
  );
};

export default Register;
