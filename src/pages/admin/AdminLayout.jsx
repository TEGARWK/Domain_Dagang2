import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminNavbar from "../../components/admin/AdminNavbar";

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  // --- ROLE PROTECTION LOGIC ---
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans print:bg-white print:overflow-visible print:h-auto">
      {/* Sidebar Container Wrapper - Prevent shift on mobile */}
      <div className="w-0 lg:w-72 flex-none print:hidden z-50">
        <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* Navbar */}
        <div className="print:hidden">
          <AdminNavbar setSidebarOpen={() => setIsSidebarOpen(true)} />
        </div>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto py-6 sm:py-10 px-4 md:px-8 print:p-0 print:overflow-visible">
          <div className="max-w-7xl mx-auto print:max-w-none print:m-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
