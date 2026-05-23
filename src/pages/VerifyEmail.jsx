import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("Sedang memverifikasi email Anda...");
  const hasCalled = React.useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Token verifikasi tidak ditemukan.");
      return;
    }

    if (hasCalled.current) return;
    hasCalled.current = true;

    const verifyToken = async () => {
      try {
        const response = await fetch(
          `/api/auth/verify?token=${token}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              // BYPASS NGROK WARNING
              "ngrok-skip-browser-warning": "true",
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage("Email berhasil diverifikasi! Mengalihkan ke Dashboard...");

          // AUTO-LOGIN: Save user data and token to localStorage
          localStorage.setItem("user", JSON.stringify(data.user));
          
          // Trigger storage event for Navbar update
          window.dispatchEvent(new Event("storage"));

          // Redirect to Dashboard after 2 seconds
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        } else {
          setStatus("error");
          setMessage(data.message || data || "Gagal memverifikasi email.");
        }
      } catch (err) {
        console.error("Verify Error:", err);
        setStatus("error");
        setMessage("Terjadi kesalahan saat menghubungi server.");
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-10 text-center animate-in fade-in zoom-in duration-500">
        
        {/* ICON / SPINNER */}
        <div className="mb-8 flex justify-center">
          {status === "loading" && (
            <div className="w-20 h-20 border-4 border-slate-100 border-t-[#F97316] rounded-full animate-spin"></div>
          )}
          {status === "success" && (
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-bounce">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* TEXT */}
        <h2 className={`text-2xl font-bold mb-4 ${
          status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : "text-slate-800"
        }`}>
          {status === "success" ? "Verifikasi Berhasil!" : status === "error" ? "Verifikasi Gagal" : "Memproses..."}
        </h2>
        
        <p className="text-slate-500 font-bold leading-relaxed mb-8">
          {message}
        </p>

        {/* ACTIONS */}
        {status === "error" && (
          <button 
            onClick={() => navigate("/login")}
            className="w-full py-4 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition shadow-xl"
          >
            Kembali ke Login
          </button>
        )}

        {status === "loading" && (
            <p className="text-xs text-slate-400 font-medium">Jangan tutup halaman ini...</p>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
