import { useNavigate, Link, useParams } from "react-router-dom";
import { useConfirm } from "../context/ConfirmContext";
import { useState } from "react";
import { useNotification } from '../context/NotificationContext';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { success, error: notifyError } = useNotification(); // Renamed error to notifyError to avoid conflict

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await confirm({
          title: "Berhasil!",
          message: "Kata sandi Anda telah diperbarui. Silakan login kembali.",
          type: "success",
          confirmText: "Login Sekarang"
        });
        navigate("/login");
      } else {
        setError(data.message || data || "Gagal mereset kata sandi.");
        notifyError(data.message || data || "Gagal mereset kata sandi."); // Use notifyError for notification
      }
    } catch (err) {
      console.error("Reset Pass Error:", err);
      setError("Terjadi kesalahan koneksi ke server.");
      notifyError("Terjadi kesalahan koneksi ke server."); // Use notifyError for notification
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#F97316] rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>
      
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-10 relative z-10 border border-white/50">
        <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-lg flex items-center justify-center mx-auto mb-4 text-[#F97316]">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Pasang Sandi Baru</h2>
            <p className="text-slate-500 text-sm mt-2">Buat kata sandi baru yang kuat dan aman untuk akun Anda.</p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-bold leading-tight flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kata Sandi Baru</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-sm pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Konfirmasi Kata Sandi</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 outline-none transition font-medium text-sm pr-12"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white font-bold py-3.5 rounded-lg transition duration-300 shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 text-sm ${
                isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#F97316] hover:bg-slate-900 shadow-orange-200'
            }`}
          >
            {isLoading ? "Memproses..." : "Simpan Kata Sandi"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link to="/login" className="text-slate-400 text-xs font-bold hover:text-[#F97316] transition">Batal & Kembali ke Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
