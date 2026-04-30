import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";

// IMPORT COMPONENTS (Pastikan file ini sudah kamu buat)
import Sidebar from "../components/dashboard/Sidebar";
import TopNavbar from "../components/dashboard/TopNavbar";
import { useConfirm } from "../context/ConfirmContext";
import { useConfig } from "../context/ConfigContext";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const config = useConfig();

  // State Data User & Cart
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- CEK SESSION USER & KERANJANG ---
  useEffect(() => {
    // Fungsi Safe Parse (Anti Crash)
    const safeParse = (key) => {
      const data = localStorage.getItem(key);
      try {
        if (!data || data === "undefined" || data === "null") return null;
        return JSON.parse(data);
      } catch (e) {
        localStorage.removeItem(key);
        return null;
      }
    };

    // 1. Cek User Saat Load Pertama
    const storedUser = safeParse("user");
    const storedCart = safeParse("cart");

    if (!storedUser) {
      // alert("⚠️ Sesi habis, silakan login kembali."); // Opsional: dimatikan biar gak ganggu UX saat refresh
      navigate("/login");
    } else {
      setUser(storedUser);
    }

    if (storedCart) {
      setCartCount(Array.isArray(storedCart) ? storedCart.length : 1);
    } else {
      setCartCount(0);
    }

    // 2. Event Listener (Update Realtime antar Tab & Same Tab)
    const handleStorageChange = () => {
      const u = safeParse("user");
      const c = safeParse("cart");

      // Note: Don't redirect here if user is missing temporarily, let the initial check handle it
      // or only redirect if explicitly logged out. For now, just update state.
      if (u) setUser(u);
      if (c) {
        setCartCount(Array.isArray(c) ? c.length : 1);
      } else {
        setCartCount(0);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("user_updated", handleStorageChange); // Custom Event
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("user_updated", handleStorageChange);
    };
  }, [navigate]);

   // --- FUNGSI LOGOUT (VERSI AMAN) ---
  const confirm = useConfirm();
  const handleLogout = async (e) => {
    if (e) e.preventDefault(); 

    const isConfirmed = await confirm({
      title: "Logout Akun",
      message: "Yakin ingin keluar dari akun?",
      confirmText: "Ya, Logout",
      type: "warning"
    });

    if (isConfirmed) {
      // Hapus User & Cart (Bersih-bersih)
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("cart");

      // Redirect ke Login
      navigate("/login");
    }
  };

  // Jangan render anak komponen jika user belum ter-load (Mencegah error 'name of null')
  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* 1. SIDEBAR (Props: user data & fungsi logout) */}
      <div className="w-0 lg:w-72 flex-none z-50">
        <Sidebar 
          user={user} 
          handleLogout={handleLogout} 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
        />
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* 2. TOP NAVBAR (Props: user & cartCount) */}
        <TopNavbar 
          user={user} 
          cartCount={cartCount} 
          setSidebarOpen={() => setIsSidebarOpen(true)} 
        />

        {/* 3. MAIN CONTENT (Halaman Dashboard Berubah-ubah disini) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar">
          {/* Background Gradient Halus */}
          <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-white/50 to-transparent pointer-events-none -z-10"></div>

          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
