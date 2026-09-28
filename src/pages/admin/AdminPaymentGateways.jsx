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
        if (res.data?.success && res.data.data) setSiteSettings(res.data.data);
      } catch (err) {
        console.error("Gagal mengambil site settings:", err);
        error("Gagal memuat konfigurasi sistem untuk gateway.");
      } finally { setIsLoading(false); }
    };
    fetchSiteSettings();
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-neutral-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-10">
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary-500 text-xl">payments</span>
            <div>
              <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Metode Pembayaran</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">Konfigurasi Tripay, Prismalink, dan Transfer Manual</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-50 rounded-lg border border-primary-100">
            <span className="material-symbols-outlined text-primary-500 text-sm">verified_user</span>
            <span className="text-[10px] font-bold text-primary-700 uppercase tracking-tight">Gateway Manager</span>
          </div>
        </div>
      </div>

      <PaymentGatewaySettings systemSettings={siteSettings} />
    </div>
  );
};

export default AdminPaymentGateways;
