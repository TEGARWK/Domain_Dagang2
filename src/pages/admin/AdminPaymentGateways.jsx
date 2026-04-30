import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AdminPaymentGateways = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect ke halaman settings dengan tab payment aktif jika ada (atau sekedar ke settings)
    navigate("/admin/settings", { replace: true });
  }, [navigate]);

  return (
    <div className="p-10 text-center font-bold text-slate-400 animate-pulse">
      Memindahkan ke Pengaturan...
    </div>
  );
};

export default AdminPaymentGateways;
