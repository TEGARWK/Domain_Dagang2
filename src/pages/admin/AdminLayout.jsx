import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminNavbar from "../../components/admin/AdminNavbar";

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem("adminSidebarCollapsed") === "true";
  });

  const user = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }, []);

  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden font-sans">
      <div className={`flex-none z-50 transition-all duration-300 relative ${isSidebarCollapsed ? "w-0 lg:w-20" : "w-0 lg:w-60"}`}>
        <AdminSidebar
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={(val) => {
            setIsSidebarCollapsed(val);
            localStorage.setItem("adminSidebarCollapsed", val);
          }}
        />
      </div>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminNavbar setSidebarOpen={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="layout-page page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
