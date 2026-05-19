import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminNavbar from "../../components/admin/AdminNavbar";

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem("adminSidebarCollapsed") === "true";
  });

  const toggleSidebarCollapse = (val) => {
    setIsSidebarCollapsed(val);
    localStorage.setItem("adminSidebarCollapsed", val);
  };
  // --- ROLE PROTECTION LOGIC ---
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans print:bg-white print:overflow-visible print:h-auto">
      {/* Sidebar Container Wrapper - Prevent shift on mobile */}
      <div className={`flex-none print:hidden z-50 transition-all duration-300 relative ${isSidebarCollapsed ? "w-0 lg:w-20" : "w-0 lg:w-72"}`}>
        <AdminSidebar 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={toggleSidebarCollapse}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* Navbar */}
        <div className="print:hidden">
          <AdminNavbar setSidebarOpen={() => setIsSidebarOpen(true)} />
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto py-3 sm:py-4 px-3 md:px-4 print:p-0 print:overflow-visible">
          <div className="w-full print:max-w-none print:m-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
