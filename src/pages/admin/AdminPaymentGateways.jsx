import React, { useState, useEffect } from "react";
import PaymentGatewaySettings from "../../components/admin/PaymentGatewaySettings";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const AdminPaymentGateways = () => {
  const { error } = useNotification();
  const [siteSettings, setSiteSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const res = await api.get("/content/site-settings");
        if (res.data?.success && res.data.data) {
          setSiteSettings(res.data.data);
        }
      } catch (err) {
        console.error("Gagal mengambil site settings:", err);
        error("Gagal memuat konfigurasi sistem untuk gateway.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSiteSettings();
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.4s_ease-out] pb-20">
      {/* --- HEADER --- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-orange-500">payments</span>
              Metode Pembayaran
            </h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
              Konfigurasi Tripay, Prismalink, dan Transfer Manual
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100">
             <span className="material-symbols-outlined text-orange-500 text-sm">verified_user</span>
             <span className="text-[10px] font-bold text-orange-700 uppercase tracking-tight">Gateway Manager</span>
          </div>
        </div>
      </div>

      {/* --- SETTINGS COMPONENT --- */}
      <div className="w-full">
        <PaymentGatewaySettings systemSettings={siteSettings} />
      </div>
    </div>
  );
};

export default AdminPaymentGateways;
