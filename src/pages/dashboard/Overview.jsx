import React, { useState, useEffect } from "react";
// Import View Components
// Pastikan file ini sudah dibuat di folder src/pages/dashboard/views/
import EmptyDashboard from "./views/EmptyDashboard";
import ActiveDashboard from "./views/ActiveDashboard";
import api from "../../services/api";

const Overview = () => {
  const [domains, setDomains] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [activities, setActivities] = useState([]);
  const [referralInfo, setReferralInfo] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA REALTIME ---
  useEffect(() => {
    const fetchData = async () => {
      // 1. Ambil User ID dari LocalStorage
      const storedUser = localStorage.getItem("user");

      // Jika user tidak ditemukan/corrupt, hentikan loading (layout akan handle redirect)
      if (!storedUser || storedUser === "undefined") {
        setLoading(false);
        return;
      }

      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);

        // 2. Fetch Domains, Invoices, Wallet & Activities Parallel
        const [domainRes, invoiceRes, walletRes, activityRes, referralRes] = await Promise.all([
          api.get(`/domains/user/${userData.id}`).catch(e => ({ data: [] })), 
          api.get(`/billing/user/${userData.id}`).catch(e => ({ data: [] })),
          api.get(`/wallet`).catch(e => ({ data: null })),
          api.get(`/users/activities/me?limit=5`).catch(e => ({ data: [] })),
          api.get(`/referral/my-stats`).catch(e => ({ data: null }))
        ]);

        setDomains(domainRes.data || []);
        setInvoices(invoiceRes.data || []);
        setWallet(walletRes.data);
        setActivities(activityRes.data || []);
        setReferralInfo(referralRes?.data?.data || null);
        
      } catch (err) {
        console.error("Terjadi kesalahan koneksi:", err);
      } finally {
        // Apapun yang terjadi (sukses/gagal), matikan loading
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="animate-spin w-10 h-10 border-4 border-neutral-200 border-t-primary-500 rounded-full"></div>
        <p className="text-neutral-400 text-sm font-semibold animate-pulse">
          Memuat Data...
        </p>
      </div>
    );
  }

  // --- LOGIC PEMISAH TAMPILAN (CONDITIONAL RENDERING) ---
  return (
    <>
      {domains.length > 0 ? (
        // A. Jika User PUNYA Domain -> Tampilkan Dashboard Aktif
        <ActiveDashboard 
          domains={domains} 
          pendingInvoicesCount={invoices.filter(inv => inv.status === 'pending').length}
          wallet={wallet}
          activities={activities}
          referralInfo={referralInfo}
        />
      ) : (
        // B. Jika User BELUM PUNYA Domain -> Tampilkan Dashboard Kosong (Jualan)
        <EmptyDashboard 
          user={user}
          wallet={wallet}
          referralInfo={referralInfo}
        />
      )}
    </>
  );

};

export default Overview;
