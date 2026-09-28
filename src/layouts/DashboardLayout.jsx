import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import TopNavbar from "../components/dashboard/TopNavbar";
import { useConfirm } from "../context/ConfirmContext";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  useEffect(() => {
    const safeParse = (key) => {
      const data = localStorage.getItem(key);
      try {
        if (!data || data === "undefined" || data === "null") return null;
        return JSON.parse(data);
      } catch {
        localStorage.removeItem(key);
        return null;
      }
    };

    const storedUser = safeParse("user");
    const storedCart = safeParse("cart");

    if (!storedUser) {
      navigate("/login");
      return;
    }
    setUser(storedUser);
    setCartCount(Array.isArray(storedCart) ? storedCart.length : storedCart ? 1 : 0);

    const handleStorageChange = () => {
      const u = safeParse("user");
      const c = safeParse("cart");
      if (u) setUser(u);
      setCartCount(Array.isArray(c) ? c.length : c ? 1 : 0);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("user_updated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("user_updated", handleStorageChange);
    };
  }, [navigate]);

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
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("cart");
      navigate("/login");
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden font-sans">
      <div className={`flex-none z-50 transition-all duration-300 relative ${isSidebarCollapsed ? "w-0 lg:w-20" : "w-0 lg:w-60"}`}>
        <Sidebar
          user={user}
          handleLogout={handleLogout}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      </div>
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <TopNavbar
          user={user}
          cartCount={cartCount}
          setSidebarOpen={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="layout-page page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
