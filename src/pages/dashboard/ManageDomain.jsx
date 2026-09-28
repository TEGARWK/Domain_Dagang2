import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import api from "../../services/api";


// Helper untuk format tanggal
const formatDate = (dateString) => {
  if (!dateString) return "Processing...";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Processing...";
  return format(date, "dd MMM yyyy", { locale: idLocale });
};

const translateRegistrarError = (errorString) => {
  if (!errorString) return "Sedang memproses permintaan ke Registrar. Mohon tunggu beberapa saat.";

  const err = errorString.toLowerCase();

  if (err.includes("ip address has not been listed")) {
    return "Keamanan: Alamat IP server Anda belum terdaftar di whitelist Registrar. Silakan daftarkan IP server di panel Daftarnama.";
  }

  if (err.includes("not sell this duration")) {
    return "Konfigurasi: Durasi pendaftaran ini belum memiliki harga jual di panel Registrar Anda. Silakan set harga di menu TLD Pricing.";
  }

  if (err.includes("insufficient registrar balance") || err.includes("reseller balance is not enough")) {
    return "Saldo: Saldo reseller Anda tidak mencukupi untuk melakukan transaksi ini. Silakan top-up saldo Daftarnama Anda.";
  }

  if (err.includes("domain is not available") || err.includes("already registered")) {
    return "Ketersediaan: Domain ini sudah terdaftar atau tidak tersedia untuk dibeli saat ini.";
  }

  if (err.includes("contact") || err.includes("invalid data") || err.includes("email wajib diisi")) {
    return "Data User: Informasi profil user (Email/Telepon/Alamat) tidak lengkap atau tidak sesuai format standar registrar.";
  }

  try {
      const parsed = JSON.parse(errorString);
      if (parsed.message) return translateRegistrarError(parsed.message);
  } catch(e) {}

  return errorString;
};

// --- WHITE LABEL CONFIG ---
const WHITE_LABEL_DOMAIN = "api.sandboxv2.daftarnama.id";
const REGISTRAR_API_BASE = "api.sandboxv2.daftarnama.id";

// --- HELPER: Validate Hostname (FQDN) ---
const isValidHostname = (hostname) => {
  if (!hostname || typeof hostname !== "string") return false;
  if (hostname.includes("://")) return false;
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname)) return false;
  const fqdnRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/;
  return fqdnRegex.test(hostname);
};

const ManageDomain = ({ isAdmin = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const confirm = useConfirm();

  // --- STATE DECLARATIONS ---
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [domainData, setDomainData] = useState(null);

  // State for Nameservers
  const [nameservers, setNameservers] = useState(["", "", "", ""]);

  // State for DNS & Audit
  const [dnsRecords, setDnsRecords] = useState([]);
  const [loadingDns, setLoadingDns] = useState(false);
  const [dnsError, setDnsError] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // State for Modal
  const [showDnsModal, setShowDnsModal] = useState(false);
  const [newRecord, setNewRecord] = useState({ type: "A", name: "@", value: "", ttl: 14400 });

  // Security States
  const [fetchingEpp, setFetchingEpp] = useState(false);
  const [eppCode, setEppCode] = useState(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewalPrice, setRenewalPrice] = useState(null);
  const [restorePrice, setRestorePrice] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // --- TLD CHECK ---
  const idExtensions = ['.id', '.co.id', '.biz.id', '.my.id', '.web.id', '.ac.id', '.sch.id', '.or.id', '.ponpes.id', '.desa.id'];
  const docsRequiredExtensions = ['.co.id', '.ac.id', '.sch.id', '.or.id', '.ponpes.id', '.desa.id']; // Extensions that actually need manual verification
  
  const isIdDomain = domainData?.name ? idExtensions.some(ext => domainData.name.toLowerCase().endsWith(ext)) : false;
  const needsDocuments = domainData?.name ? docsRequiredExtensions.some(ext => domainData.name.toLowerCase().endsWith(ext)) : false;

  // --- DERIVED DATA ---
  const getDocumentInfo = () => {
    const status = domainData?.document_status_mapped || 'none';

    const config = {
      approved: {
        status: 'approved',
        title: "Dokumen Disetujui",
        desc: "Domain Anda telah diverifikasi dan aktif sepenuhnya.",
        color: "emerald",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200"
      },
      pending: {
        status: 'pending',
        title: "Sedang Diverifikasi",
        desc: "Dokumen telah dikirim dan sedang ditinjau oleh registrar (estimasi 1-24 jam).",
        color: "amber",
        badge: "bg-amber-100 text-amber-700 border-amber-200"
      },
      rejected: {
        status: 'rejected',
        title: "Dokumen Diperlukan / Ditolak",
        desc: "Lengkapi dokumen identitas atau perbaiki dokumen yang ditolak untuk mengaktifkan domain.",
        color: "rose",
        badge: "bg-rose-100 text-rose-700 border-rose-200"
      },
      none: { status: 'none' }
    };

    return config[status] || config.none;
  };

  const getVerificationCountdown = () => {
    if (!domainData?.registration_date) return null;
    const status = domainData?.document_status_mapped;
    if (status === 'approved' || status === 'pending' || status === 'none') return null;

    const regDate = new Date(domainData.registration_date);
    // Usually PANDI gives 7 days for most IDs, some are shorter. Let's assume 7 days for safety.
    const deadlineDate = new Date(regDate.getTime() + (7 * 24 * 60 * 60 * 1000));
    const now = new Date();
    const diff = deadlineDate - now;

    if (diff <= 0) return "Segera (Deadline Terlewati)";

    const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000));
    return `${daysLeft} hari lagi`;
  };

  const getRejectionReason = () => {
    let regData = {};
    if (domainData?.registrar_response_raw) {
      let raw = domainData.registrar_response_raw;
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          regData = parsed.data || parsed;
        } catch (e) { }
      } else {
        regData = raw.data || raw;
      }
    }
    return regData.document_notes || regData.rejection_reason || regData.status_description || "Hubungi support untuk informasi lebih lanjut.";
  };

  const getContactInfo = () => {
    let contact = {
      name: domainData?.user_name || "Guest",
      email: domainData?.user_email || "-",
      phone: domainData?.user_phone || "-",
      org: "Individual"
    };

    if (domainData?.registrant_snapshot) {
      try {
        const snap = typeof domainData.registrant_snapshot === 'string' 
          ? JSON.parse(domainData.registrant_snapshot) 
          : domainData.registrant_snapshot;
          
        if (snap.name) contact.name = snap.name;
        if (snap.email) contact.email = snap.email;
        if (snap.phone) contact.phone = snap.phone;
        if (snap.company || snap.org) contact.org = snap.company || snap.org;
      } catch (e) {
        console.error("Error parsing registrant_snapshot", e);
      }
    }

    return contact;
  };

  // --- FETCH HELPERS ---
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post(`/domains/${id}/sync`);
      if (res.data.success) {
        const newDomain = {
          ...domainData,
          ...res.data.data,
          registrar_response_raw: res.data.registrar_response_raw,
          status: res.data.registrar_response_raw ?
            (typeof res.data.registrar_response_raw === 'string' ? JSON.parse(res.data.registrar_response_raw) : res.data.registrar_response_raw).status
            : domainData.status
        };

        if (res.data.data.domain_name) newDomain.name = res.data.data.domain_name;
        setDomainData(newDomain);

        // Toast logic simplified for brevity
        success("Data berhasil disinkronkan.");
      }
    } catch (err) {
      console.error("Sync Error:", err);
      error("Gagal melakukan sinkronisasi data.");
    } finally {
      setSyncing(false);
    }
  };

  const fetchDnsRecords = async () => {
    setLoadingDns(true);
    setDnsError(null);
    try {
      const response = await api.get(`/domains/${id}/dns`);
      setDnsRecords(response.data);
    } catch (err) {
      console.error("Failed to fetch DNS", err);
      setDnsError(err.response?.data?.message || "Registrar DNS API sedang tidak menanggapi (Status 500)");
    } finally {
      setLoadingDns(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!isAdmin) return;
    setLoadingAudit(true);
    try {
      const res = await api.get(`/domains/${id}/audit-logs`);
      setAuditLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const res = await api.get("/wallet");
      setUserBalance(res.data.balance || 0);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  };

  // --- USE EFFECTS ---
  useEffect(() => {
    const fetchDomain = async () => {
      try {
        const response = await api.get(`/domains/detail/${id}`);
        const data = response.data;
        setDomainData(data);

        if (data.nameservers) {
          try {
            let parsedNS;
            if (Array.isArray(data.nameservers)) {
              parsedNS = data.nameservers;
            } else if (typeof data.nameservers === 'string') {
              try {
                parsedNS = JSON.parse(data.nameservers);
              } catch (e) {
                if (data.nameservers.includes(',')) {
                  parsedNS = data.nameservers.split(',');
                } else {
                  parsedNS = [data.nameservers];
                }
              }
            }

            if (Array.isArray(parsedNS)) {
              const newNS = [...parsedNS, "", "", "", ""].slice(0, 4);
              setNameservers(newNS);
            }
          } catch (e) {
            console.error("Error parsing NS", e);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        error("Gagal memuat data domain");
        navigate(isAdmin ? "/admin/domains" : "/dashboard/domains");
      }
    };

    fetchDomain();
    fetchUserBalance();
  }, [id, navigate]);

  useEffect(() => {
    if (domainData?.name) {
      const tld = "." + domainData.name.split('.').slice(1).join('.');
      api.get(`/pricing/all`)
        .then(res => {
          const pricing = res.data.find(p => p.tld === tld);
          if (pricing) {
            setRenewalPrice(pricing.price_renew);
            setRestorePrice(pricing.price_restore);
          }
        })
        .catch(err => console.error("Error fetching renewal price", err));
    }
  }, [domainData]);

  useEffect(() => {
    if (activeTab === "dns") {
      fetchDnsRecords();
    }
  }, [activeTab, id]);

  // --- HELPER FUNCTIONS ---
  const getRecordValue = (rec) => {
    const type = rec.type?.toUpperCase();
    switch (type) {
      case 'MX': return rec.exchange;
      case 'TXT': return rec.txt_data;
      case 'NS': return rec.ns;
      case 'SRV': return rec.target;
      default: return rec.address;
    }
  };

  const getRecordHost = (rec) => rec.subDomain || rec.name || "@";

  // --- HANDLERS (Simplified for readability) ---
  const handleUpdate = async (field, value) => {
    // --- 🛡️ VALIDASI SALDO UNTUK AUTO RENEW ---
    if (field === 'auto_renew' && value === true) {
      // Jika saldo nol atau tidak cukup (misal < 10.000 sebagai batas minimal perpanjang paling murah)
      if (userBalance <= 0) {
        Swal.fire({
          title: 'Saldo Tidak Mencukupi',
          text: 'Fitur Auto Renewal hanya bisa diaktifkan jika Anda memiliki saldo di akun untuk biaya perpanjangan otomatis.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Isi Saldo Sekarang',
          cancelButtonText: 'Nanti Saja',
          confirmButtonColor: '#F97316',
        }).then((result) => {
          if (result.isConfirmed) {
            navigate('/dashboard/wallet');
          }
        });
        return; // Batalkan update
      }
    }

    const originalValue = domainData[field];
    setDomainData((prev) => ({ ...prev, [field]: value }));
    try {
      await api.put(`/domains/detail/${id}`, { [field]: value });
      success(`Pengaturan ${field} berhasil diperbarui!`);
    } catch (err) {
      setDomainData((prev) => ({ ...prev, [field]: originalValue }));
      error(err.response?.data?.message || "Gagal memperbarui pengaturan");
    }
  };

  const handleSaveNameservers = async () => {
    const validNS = nameservers.filter(ns => ns.trim() !== "");
    if (validNS.length < 2) return error("Wajib mengisi minimal 2 Nameserver!");
    const invalidNS = validNS.filter(ns => !isValidHostname(ns));
    if (invalidNS.length > 0) return error(`Format Nameserver tidak valid: ${invalidNS.join(", ")}`);

    setLoading(true);
    try {
      await api.put(`/domains/detail/${id}`, { nameservers: validNS });
      success("Nameservers berhasil disimpan ke Registrar!");
    } catch (err) {
      error(err.response?.data?.message || "Gagal menyimpan Nameservers");
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateLock = async (newValue) => {
    const originalValue = domainData.is_locked;
    setDomainData(prev => ({ ...prev, is_locked: newValue }));
    setLockLoading(true);
    try {
      await api.put(`/domains/${id}/lock`, { is_locked: newValue });
      success(newValue ? "Perlindungan Transfer diaktifkan" : "Perlindungan Transfer dinonaktifkan");
    } catch (err) {
      setDomainData(prev => ({ ...prev, is_locked: originalValue }));
      error(err.response?.data?.message || "Gagal update Registrar Lock");
    } finally {
      setLockLoading(false);
    }
  };

  const handleShowEPP = async () => {
    setFetchingEpp(true);
    try {
      const res = await api.get(`/domains/${id}/epp`);
      setEppCode(res.data.epp_code);
      success("Kode EPP berhasil ditarik!");
    } catch (err) {
      error(err.response?.data?.message || "Gagal mengambil kode EPP");
    } finally {
      setFetchingEpp(false);
    }
  };

  const handleRenew = async () => {
    const formattedPrice = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(renewalPrice || 0);
    const isConfirmed = await confirm({
      title: "Konfirmasi Perpanjangan",
      message: `Biaya perpanjangan: ${formattedPrice}. Lanjutkan ke Checkout?`,
      type: "warning",
      confirmText: "Ya, Lanjutkan"
    });

    if (!isConfirmed) return;
    const cartItem = {
      name: domainData.name,
      price: formattedPrice,
      duration: 1,
      rawPrice: renewalPrice,
      action: 'renew'
    };
    localStorage.setItem("checkout_payload", JSON.stringify([cartItem]));
    window.dispatchEvent(new Event("storage"));
    success("🚀 Menuju halaman checkout perpanjangan...");
    navigate("/checkout");
  };

  const handleRestore = async () => {
    if (!restorePrice || restorePrice <= 0) {
      await confirm({
        title: "Hubungi Admin",
        message: "Biaya restore belum dikonfigurasi.",
        type: "warning",
        confirmText: "Oke",
        showCancelButton: false
      });
      return;
    }

    const formattedPrice = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(restorePrice);
    const isConfirmed = await confirm({
      title: "Konfirmasi Pemulihan",
      message: `Biaya pemulihan: ${formattedPrice}. Lanjutkan?`,
      type: "danger",
      confirmText: "Ya, Restore"
    });

    if (!isConfirmed) return;
    const cartItem = {
      name: domainData.name,
      price: formattedPrice,
      duration: 1,
      rawPrice: restorePrice,
      action: 'restore'
    };
    localStorage.setItem("checkout_payload", JSON.stringify([cartItem]));
    window.dispatchEvent(new Event("storage"));
    success("🛠️ Item pemulihan telah siap di checkout!");
    navigate("/checkout");
  };

  const handleUploadDocument = async () => {
    setUploadLoading(true);
    try {
      const res = await api.get(`/domains/${id}/document-url`);
      if (res.data.success && res.data.upload_url) {
        let finalUrl = res.data.upload_url;
        if (finalUrl.includes(REGISTRAR_API_BASE)) {
          finalUrl = finalUrl.replace(REGISTRAR_API_BASE, WHITE_LABEL_DOMAIN);
        }
        window.open(finalUrl, '_blank');
        success("Membuka halaman upload...");
      } else {
        throw new Error("URL upload tidak ditemukan.");
      }
    } catch (err) {
      error(err.response?.data?.message || "Gagal mengambil URL.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDns = async (recordId) => {
    const isConfirmed = await confirm({
      title: "Hapus DNS Record",
      message: "Hapus record ini?",
      type: "danger",
      confirmText: "Ya, Hapus"
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/domains/${id}/dns/${recordId}`);
      success("DNS Record deleted");
      fetchDnsRecords();
    } catch (err) {
      error("Gagal menghapus record");
    }
  };

  const handleAddDns = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/domains/${id}/dns`, newRecord);
      success("DNS Record added successfully!");
      setShowDnsModal(false);
      setNewRecord({ type: "A", name: "@", value: "", ttl: 14400 });
      fetchDnsRecords();
    } catch (err) {
      error("Gagal menambah record");
    }
  };

  const handleRetryRegistration = async () => {
    if (!isAdmin) return;
    const isConfirmed = await confirm({
      title: "Retry Registration",
      message: "Picu ulang pendaftaran?",
      type: "warning",
      confirmText: "Ya, Retry"
    });
    if (!isConfirmed) return;
    setLoading(true);
    try {
      const res = await api.post(`/domains/${id}/retry-registration`);
      if (res.data.success) {
        success(res.data.message);
        window.location.reload();
      }
    } catch (err) {
      error(err.response?.data?.message || "Gagal memicu retry");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER SECTIONS (UPDATED TYPOGRAPHY) ---

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <div className="animate-spin w-8 h-8 border-2 border-neutral-200 border-t-primary-500 rounded-full mb-4"></div>
      <p className="text-[12px] text-neutral-400">Memuat konfigurasi...</p>
    </div>
  );
  if (!domainData) return (
    <div className="empty-state h-[60vh]">
      <p className="text-[14px] font-semibold text-neutral-900 mb-1">Data tidak ditemukan</p>
      <p className="text-[12px] text-neutral-500 mb-4">Domain tidak tersedia atau telah dihapus.</p>
      <button onClick={() => navigate("/dashboard/domains")} className="btn btn-primary">Kembali</button>
    </div>
  );

  const renderOverview = () => {
    const docInfo = getDocumentInfo();
    const countdown = getVerificationCountdown();
    const isCritical = docInfo.status === 'upload_required' || docInfo.status === 'rejected' || docInfo.status === 'expired_needs_verification';

    return (
    <div className="space-y-5">
      {isCritical && needsDocuments && (
        <div className="flex items-center justify-between gap-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-600">warning</span>
            <p className="text-[12px] font-medium text-rose-800">Domain Anda membutuhkan verifikasi dokumen agar tetap aktif.</p>
          </div>
          <button onClick={() => setActiveTab('verifikasi')} className="btn btn-danger btn-sm flex-shrink-0">Perbaiki</button>
        </div>
      )}

      {domainData.status !== 'active' && domainData.registrar_error_log && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 mt-0.5">error</span>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-amber-900 mb-0.5">Registrar Sync Error</p>
              <p className="text-[12px] text-amber-800">{translateRegistrarError(domainData.registrar_error_log)}</p>
            </div>
            <button onClick={handleSync} disabled={syncing} className="btn btn-default btn-sm">Retry Sync</button>
          </div>
        </div>
      )}

      {docInfo.status === 'approved' && needsDocuments && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          <p className="text-[12px] font-medium text-emerald-800">Dokumen disetujui. Domain Anda aktif sepenuhnya.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Status Domain</p>
          <div className="flex items-center gap-2">
            <span className="text-[24px] font-bold text-neutral-900 capitalize">{domainData.status?.replace(/_/g, ' ') || ''}</span>
            <span className={`badge ${domainData.status === 'active' ? 'badge-success' : domainData.status === 'pending_transfer' ? 'badge-info' : 'badge-neutral'}`}>
              {domainData.status === 'active' ? 'Live' : domainData.status === 'pending_transfer' ? 'Transfer' : 'Status'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 flex justify-between items-center">
            <span className="text-[11px] text-neutral-500">Kadaluarsa</span>
            <span className="text-[12px] font-semibold text-neutral-900">{formatDate(domainData.expiration_date)}</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Auto Renewal</p>
            <button onClick={() => handleUpdate('auto_renew', !domainData.auto_renew)} className={`w-11 h-6 rounded-full p-0.5 transition-all ${domainData.auto_renew ? 'bg-emerald-500' : 'bg-neutral-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${domainData.auto_renew ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </button>
          </div>
          <span className="text-[24px] font-bold text-neutral-900">{domainData.auto_renew ? "Aktif" : "Mati"}</span>
          <p className="text-[11px] text-neutral-400 mt-2 italic">Perpanjangan otomatis via Saldo.</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Transfer Lock</p>
            <button onClick={() => handleUpdate('is_locked', !domainData.is_locked)} className={`w-11 h-6 rounded-full p-0.5 transition-all ${domainData.is_locked ? 'bg-blue-600' : 'bg-rose-500'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${domainData.is_locked ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </button>
          </div>
          <span className="text-[24px] font-bold text-neutral-900">{domainData.is_locked ? "On" : "Off"}</span>
          <p className="text-[11px] text-neutral-400 mt-2 italic">Proteksi transfer ke registrar lain.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header">
            <span className="material-symbols-outlined text-neutral-400 text-[16px]">settings_ethernet</span>
            <span>Informasi Teknis</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-start pb-4 border-b border-neutral-100">
              <div>
                <p className="text-[11px] font-semibold text-neutral-500 mb-1">Nameservers Aktif</p>
                <div className="space-y-1">
                  {(Array.isArray(nameservers) ? nameservers : []).filter(ns => ns).length > 0 ?
                    nameservers.filter(ns => ns).map((ns, i) => (
                      <span key={i} className="text-[12px] font-mono text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded inline-block mr-1">{ns}</span>
                    )) : <span className="text-[12px] text-neutral-400 italic">Default</span>
                  }
                </div>
              </div>
              <button onClick={() => setActiveTab('ns')} className="text-[11px] font-semibold text-primary-600 hover:underline">Edit</button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[11px] font-semibold text-neutral-500 mb-0.5">Registrar</p>
                <p className="text-[12px] font-semibold text-neutral-800">{domainData.registrar_name || "Daftarnama"}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-neutral-500 mb-0.5">Tgl Registrasi</p>
                <p className="text-[12px] font-semibold text-neutral-800">{formatDate(domainData.registration_date)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="material-symbols-outlined text-neutral-400 text-[16px]">contact_mail</span>
            <span>Kontak Administratif</span>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-neutral-900">{getContactInfo().name}</p>
                <p className="text-[12px] text-neutral-500">{getContactInfo().email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
              <div>
                <p className="text-[11px] font-semibold text-neutral-500 mb-0.5">Telepon</p>
                <p className="text-[12px] font-semibold text-neutral-800">{getContactInfo().phone}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-neutral-500 mb-0.5">Organisasi</p>
                <p className="text-[12px] font-semibold text-neutral-800">{getContactInfo().org}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {domainData.status === 'active' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge badge-warning">Billing Info</span>
                <span className="text-[14px] font-bold text-neutral-900">Perpanjang Masa Aktif</span>
              </div>
              <p className="text-[12px] text-neutral-500">Perpanjang sekarang untuk mencegah kehilangan akses dan biaya restore yang lebih mahal.</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button onClick={handleRenew} disabled={isRenewing} className="btn btn-primary">
                {isRenewing ? "Memproses..." : "Perpanjang (+1 Thn)"}
              </button>
              {renewalPrice && (
                <p className="text-[11px] text-neutral-500">Estimasi: <span className="font-semibold text-neutral-900">Rp {new Intl.NumberFormat("id-ID").format(renewalPrice)}</span></p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderNameservers = () => (
    <div className="space-y-4">
      <p className="text-[12px] text-neutral-500">Arahkan domain ke penyedia hosting lain melalui nameserver kustom.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {nameservers.map((ns, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-[11px] font-bold text-neutral-500 shrink-0">NS{idx + 1}</span>
            <input
              type="text"
              value={ns}
              onChange={(e) => { const newNs = [...nameservers]; newNs[idx] = e.target.value; setNameservers(newNs); }}
              placeholder={`ns${idx + 1}.hostinganda.com`}
              className="form-input"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <p className="text-[11px] text-neutral-400 italic flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">info</span>
          Perubahan nameserver membutuhkan waktu propagasi 24-48 jam.
        </p>
        <div className="flex gap-2">
          <button className="btn btn-default btn-sm">Reset ke Default</button>
          <button onClick={handleSaveNameservers} className="btn btn-primary btn-sm">Simpan</button>
        </div>
      </div>
    </div>
  );

  const renderDns = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-neutral-500">Kelola record A, CNAME, MX, dan TXT secara mandiri.</p>
        <button onClick={() => setShowDnsModal(true)} className="btn btn-primary btn-sm">
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add Record
        </button>
      </div>

      <div className="flex items-start gap-3 p-3 bg-primary-50 border border-primary-100 rounded-lg">
        <span className="material-symbols-outlined text-primary-500 text-[16px]">info</span>
        <p className="text-[11px] text-primary-700">Mode Sandbox: Manajemen DNS berjalan di infrastruktur sandbox registrar.</p>
      </div>

      {dnsError && (
        <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
          <span className="material-symbols-outlined text-rose-500 text-[16px]">warning</span>
          <div>
            <p className="text-[11px] font-semibold text-rose-900">Koneksi Registrar Bermasalah</p>
            <p className="text-[11px] text-rose-700">{dnsError}</p>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Host</th>
              <th>Value</th>
              <th>TTL</th>
              <th className="text-center">Priority</th>
              <th className="text-center"></th>
            </tr>
          </thead>
          <tbody>
            {loadingDns ? (
              <tr><td colSpan="6" className="p-8 text-center text-neutral-400">Loading...</td></tr>
            ) : dnsRecords.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-neutral-400">Belum ada record DNS.</td></tr>
            ) : (
              dnsRecords.map((rec) => (
                <tr key={rec.id}>
                  <td><span className="badge badge-neutral">{rec.type}</span></td>
                  <td className="font-medium text-neutral-700">{getRecordHost(rec)}</td>
                  <td className="text-neutral-500 font-mono text-[12px] max-w-[200px] truncate" title={getRecordValue(rec)}>{getRecordValue(rec)}</td>
                  <td className="text-neutral-400">{rec.ttl}</td>
                  <td className="text-center text-neutral-400">{rec.preference || rec.priority || "-"}</td>
                  <td className="text-center">
                    <button onClick={() => handleDeleteDns(rec.id)} className="btn-icon btn-sm text-neutral-400 hover:text-red-500 hover:bg-red-50">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderVerification = () => {
    const docInfo = getDocumentInfo();
    const rejectionReason = getRejectionReason();
    const isExpired = domainData?.status === 'expired';
    const countdown = getVerificationCountdown();

    if (!isIdDomain) return (
      <div className="py-20 text-center">
        <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-neutral-400 font-medium">Domain ini tidak memerlukan verifikasi dokumen tambahan.</p>
      </div>
    );

    if (docInfo.status === 'none') return null;

    return (
      <div className="space-y-6 sm:space-y-8 animate-[fadeIn_0.3s_ease-out]">
        {/* 1. Detail Header (Ketik Ulang Biar Presisi) */}
        <div className="bg-neutral-50/50 p-4 sm:p-8 rounded-lg border border-neutral-100">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            <div>
              <p className="text-[8px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Nama Domain</p>
              <p className="text-sm sm:text-base font-bold text-neutral-900 truncate">{domainData.name}</p>
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Registrar</p>
              <p className="text-sm sm:text-base font-bold text-neutral-900 uppercase truncate">{domainData.registrar_name || "Daftarnama"}</p>
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Registrasi</p>
              <p className="text-sm sm:text-base font-bold text-neutral-900">{formatDate(domainData.registration_date)}</p>
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 sm:mb-2">Kadaluarsa</p>
              <p className="text-sm sm:text-base font-bold text-neutral-900">{formatDate(domainData.expiration_date)}</p>
            </div>
          </div>
        </div>

        {/* 2. Verification Status - CONDITIONAL RENDER */}
        {docInfo.status === 'approved' ? (
          <div className="py-12 px-6 bg-emerald-50/30 border-2 border-emerald-100 rounded-xl flex flex-col items-center text-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl"></div>

            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping scale-125"></div>
              <div className="relative w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-200 border-4 border-white">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-neutral-900 mb-2 tracking-tight">Identitas Terverifikasi</h3>
            <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-6 max-w-sm">
              Seluruh syarat dokumen telah terpenuhi. Domain Anda telah diverifikasi secara resmi oleh Registrar.
            </p>
            
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100 shadow-sm">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Status: Approved
              </div>
              <button onClick={handleSync} className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 transition-colors uppercase tracking-widest flex items-center gap-1.5">
                <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Sync
              </button>
            </div>
          </div>
        ) : (
          <div className={`p-6 sm:p-8 rounded-xl border-2 shadow-xl shadow-neutral-100 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-6 transition-all ${
              docInfo.color === 'amber' ? 'bg-amber-50 border-amber-100' :
                docInfo.color === 'rose' ? 'bg-rose-50 border-rose-100' :
                  'bg-blue-50 border-blue-100'
            }`}>
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${
                  docInfo.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                    docInfo.color === 'rose' ? 'bg-rose-100 text-rose-600' :
                      'bg-blue-100 text-blue-600'
                }`}>
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2">
                  <h4 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">{docInfo.title}</h4>
                  <span className={`px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] border ${docInfo.badge}`}>
                    Aksi Dibutuhkan
                  </span>
                </div>
                <p className="text-xs sm:text-base text-neutral-600 leading-relaxed font-normal max-w-2xl">{docInfo.desc}</p>

                {countdown && (
                  <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-[8px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Sisa waktu:</span>
                    <span className={`text-xs font-bold ${countdown.includes('Segera') ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`}>{countdown}</span>
                  </div>
                )}

                {(docInfo.status === 'rejected' || docInfo.status === 'expired_needs_verification') && (
                  <div className="mt-4 p-4 bg-white/60 rounded-lg border border-rose-100/50 backdrop-blur-sm">
                    <p className="text-[8px] sm:text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1 text-center sm:text-left">Catatan Registrar:</p>
                    <p className="text-xs sm:text-sm font-bold text-rose-900 italic text-center sm:text-left">"{rejectionReason}"</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full lg:w-72">
              <button
                onClick={isExpired ? handleRenew : handleUploadDocument}
                disabled={uploadLoading}
                className="btn btn-primary h-12"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpired ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"} /></svg>
                {isExpired ? "Perpanjang + Upload" : "Upload Dokumen"}
              </button>

              <button
                onClick={handleSync}
                className="h-10 sm:h-12 rounded-lg font-bold text-[10px] sm:text-xs text-neutral-500 border border-neutral-200 bg-white hover:bg-neutral-50 transition-all flex items-center justify-center gap-2"
              >
                <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Cek Status Terbaru
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAuditLogs = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-neutral-900">Riwayat & Audit Trail</h3>
        <button onClick={fetchAuditLogs} className="btn btn-default btn-sm">Refresh</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Transisi</th>
              <th>Alasan</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length > 0 ? auditLogs.map(log => (
              <tr key={log.id}>
                <td className="text-neutral-500">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                <td>
                  <span className="flex items-center gap-2">
                    <span className="badge badge-neutral">{log.from_status || 'initial'}</span>
                    <span className="material-symbols-outlined text-[14px] text-neutral-300">chevron_right</span>
                    <span className="badge badge-success">{log.to_status}</span>
                  </span>
                </td>
                <td className="text-neutral-500 italic">{log.reason}</td>
              </tr>
            )) : (
              <tr><td colSpan="3" className="p-8 text-center text-neutral-400">Belum ada riwayat tercatat.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${domainData.is_locked ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
              <span className="material-symbols-outlined">{domainData.is_locked ? 'lock' : 'lock_open'}</span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-neutral-900">Registrar Transfer Lock</p>
              <p className="text-[11px] text-neutral-500 mt-0.5 mb-3">Mencegah pemindahan domain ke registrar lain tanpa izin Anda.</p>
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-[11px] font-semibold text-neutral-600">{domainData.is_locked ? 'Terkunci' : 'Terbuka'}</span>
                <button
                  onClick={() => handleUpdateLock(!domainData.is_locked)}
                  disabled={lockLoading}
                  className={`w-11 h-6 rounded-full p-0.5 transition-all ${domainData.is_locked ? 'bg-blue-600' : 'bg-neutral-300'} ${lockLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${domainData.is_locked ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center">
              <span className="material-symbols-outlined">vpn_key</span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-neutral-900">Domain Auth Code (EPP)</p>
              <p className="text-[11px] text-neutral-500 mt-0.5 mb-3">Gunakan kode ini untuk memindahkan domain ke provider lain.</p>
              {eppCode ? (
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-dashed border-primary-500/30">
                  <code className="text-[12px] font-bold text-neutral-800 select-all">{eppCode}</code>
                  <button onClick={() => { navigator.clipboard.writeText(eppCode); success("Kode EPP disalin!"); }} className="btn-icon btn-sm text-neutral-400 hover:text-primary-500">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                </div>
              ) : (
                <button onClick={handleShowEPP} disabled={fetchingEpp} className="btn btn-primary btn-sm w-full">
                  {fetchingEpp ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>Tampilkan Kode EPP</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
        <span className="material-symbols-outlined text-rose-500 text-[16px]">warning</span>
        <p className="text-[11px] text-rose-700">Transfer domain keluar membutuhkan Unlocked Status dan Kode EPP. Domain yang dipindah keluar tidak dapat dikontrol lagi melalui panel ini.</p>
      </div>
    </div>
  );

  return (
    <div className="px-6 pb-20 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(isAdmin ? "/admin/domains" : "/dashboard/domains")} className="btn btn-default btn-icon shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-neutral-900">{domainData.name || domainData.domain_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`badge ${domainData.status === 'active' ? 'badge-success' : domainData.status === 'provisioned' || domainData.status === 'registering' ? 'badge-info' : domainData.status === 'paid' ? 'badge-warning' : 'badge-danger'}`}>
                {domainData.status === 'registering' ? 'REGISTERING' : domainData.status === 'provisioned' ? 'MENUNGGU DOKUMEN' : domainData.status === 'paid' ? 'AWAITING' : (domainData.status || "").toUpperCase()}
              </span>
              <span className="text-[12px] text-neutral-500">Registrar: <span className="font-semibold text-neutral-700">{domainData.registrar_name || "Daftarnama"}</span></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} disabled={syncing} className="btn btn-default">
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>{syncing ? 'Sync...' : 'Refresh'}</span>
          </button>
          <a href={`https://${domainData.domain_name}`} target="_blank" rel="noreferrer" className="btn btn-default">
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            <span>Visit</span>
          </a>
        </div>
      </div>

      {/* TABS + CONTENT CARD */}
      <div className="card">
        <div className="flex gap-1 border-b border-neutral-100 px-4 pt-3 pb-0 overflow-x-auto">
          {[
            { id: "overview", label: "Overview" },
            needsDocuments && { id: "verifikasi", label: "Verifikasi" },
            { id: "ns", label: "Nameservers" },
            { id: "dns", label: "DNS Records" },
            isAdmin && { id: "audit", label: "Audit Log" },
            { id: "security", label: "Keamanan" },
          ].filter(Boolean).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-[12px] font-semibold transition border-b-2 -mb-px ${activeTab === tab.id ? 'text-primary-600 border-primary-500' : 'text-neutral-400 border-transparent hover:text-neutral-600'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`p-5 ${(domainData.status || "").toLowerCase() !== 'active' && (domainData.status || "").toLowerCase() !== 'provisioned' && activeTab !== 'verifikasi' && activeTab !== 'overview' ? 'opacity-70 pointer-events-none grayscale-[0.5]' : ''}`}>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "verifikasi" && renderVerification()}
          {activeTab === "ns" && renderNameservers()}
          {activeTab === "dns" && renderDns()}
          {activeTab === "audit" && renderAuditLogs()}
          {activeTab === "security" && renderSecurity()}
        </div>
      </div>

      {showDnsModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="text-[14px] font-bold text-neutral-900">Add DNS Record</h3>
              <button onClick={() => setShowDnsModal(false)} className="btn-icon btn-sm text-neutral-400 hover:text-red-500"><span className="material-symbols-outlined text-[18px]">close</span></button>
            </div>
            <form onSubmit={handleAddDns}>
              <div className="modal-body space-y-4">
                <div className="form-group">
                  <label className="form-label">Record Type</label>
                  <select value={newRecord.type} onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })} className="form-select">
                    <option value="A">A (IPv4 Address)</option>
                    <option value="CNAME">CNAME (Canonical Name)</option>
                    <option value="MX">MX (Mail Exchange)</option>
                    <option value="TXT">TXT (Text Record)</option>
                    <option value="NS">NS (Nameserver)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Host / Subdomain</label>
                  <input type="text" placeholder="e.g. @ or www" value={newRecord.name} onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Points To / Value</label>
                  <input type="text" placeholder="e.g. 192.168.1.1" value={newRecord.value} onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })} className="form-input" required />
                </div>
                <div className="flex gap-4">
                  <div className="form-group flex-1">
                    <label className="form-label">TTL</label>
                    <input type="number" value={newRecord.ttl} onChange={(e) => setNewRecord({ ...newRecord, ttl: e.target.value })} className="form-input" />
                  </div>
                  {newRecord.type === 'MX' && (
                    <div className="form-group flex-1">
                      <label className="form-label">Priority</label>
                      <input type="number" value={newRecord.priority || 10} onChange={(e) => setNewRecord({ ...newRecord, priority: e.target.value })} className="form-input" />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">Simpan Record DNS</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDomain;
