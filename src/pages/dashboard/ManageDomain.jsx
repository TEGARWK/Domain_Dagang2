import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import api from "../../services/api";
import CustomSelect from "../../components/ui/CustomSelect";

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

  if (loading) return <div className="flex flex-col items-center justify-center h-[60vh]"><div className="animate-spin w-10 h-10 border-4 border-slate-200 border-t-[#F97316] rounded-full mb-4"></div><p className="text-slate-400 font-medium animate-pulse">Memuat konfigurasi...</p></div>;
  if (!domainData) return <div className="flex flex-col items-center justify-center h-[60vh]"><p className="text-slate-500 font-medium">Data domain tidak ditemukan.</p><button onClick={() => navigate("/dashboard/domains")} className="mt-4 text-[#F97316] hover:underline font-medium">Kembali</button></div>;

  const renderOverview = () => {
    const docInfo = getDocumentInfo();
    const countdown = getVerificationCountdown();
    const isCritical = docInfo.status === 'upload_required' || docInfo.status === 'rejected' || docInfo.status === 'expired_needs_verification';

    return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* 1. Action Banners (Critical/Verification) */}
      {isCritical && needsDocuments && (
          <div className="bg-rose-600 text-white p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-rose-100 animate-pulse">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <p className="text-sm font-bold">⚠️ Action Required: Domain Anda membutuhkan verifikasi dokumen agar tetap aktif.</p>
              </div>
              <button onClick={() => setActiveTab('verifikasi')} className="text-xs font-bold bg-white text-rose-600 px-4 py-2 rounded-lg uppercase tracking-wider hover:bg-slate-50 transition-colors">
                  Perbaiki Sekarang
              </button>
          </div>
      )}

      {/* Registrar Error Log (New) */}
      {domainData.status !== 'active' && domainData.registrar_error_log && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-xl shadow-sm animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">error</span>
                  </div>
                  <div className="flex-1">
                      <h4 className="text-sm font-bold text-orange-900 uppercase tracking-wider mb-1">Registrar Sync Error</h4>
                      <p className="text-sm text-orange-800 font-medium leading-relaxed">
                          {translateRegistrarError(domainData.registrar_error_log)}
                      </p>
                      <p className="text-[10px] text-orange-400 mt-3 font-mono italic">
                          Raw Log: {domainData.registrar_error_log.substring(0, 100)}...
                      </p>
                  </div>
                  <button onClick={handleSync} disabled={syncing} className="bg-white border border-orange-200 text-orange-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors uppercase">
                      Retry Sync
                  </button>
              </div>
          </div>
      )}

      {/* Success Banner (If approved) */}
      {docInfo.status === 'approved' && needsDocuments && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-center gap-4 shadow-sm">
            <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-widest">DOKUMEN DISETUJUI</p>
              <p className="text-xs text-emerald-700 font-medium">Domain Anda telah diverifikasi dan aktif sepenuhnya.</p>
            </div>
          </div>
      )}

      {/* 2. Primary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 group-hover:text-emerald-500 transition-colors">Status Domain</p>
          <div className="flex items-center gap-3">
            <h3 className="text-3xl font-bold text-slate-900 capitalize">{domainData.status?.replace(/_/g, ' ') || ''}</h3>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${
                domainData.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                domainData.status === 'pending_transfer' ? 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse' :
                'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {domainData.status === 'active' ? '● Live' : domainData.status === 'pending_transfer' ? '● Transfer' : '● Status'}
              </span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200/60 flex justify-between items-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase">Kadaluarsa</p>
            <p className="text-xs font-bold text-slate-900">{formatDate(domainData.expiration_date)}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 group-hover:text-blue-500 transition-colors">Auto Renewal</p>
              <h3 className="text-3xl font-bold text-slate-900">{domainData.auto_renew ? "Aktif" : "Mati"}</h3>
            </div>
            <button onClick={() => handleUpdate('auto_renew', !domainData.auto_renew)} className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ring-4 ring-transparent active:scale-95 ${domainData.auto_renew ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${domainData.auto_renew ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase italic">Perpanjangan otomatis via Saldo.</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 group-hover:text-rose-500 transition-colors">Transfer Lock</p>
              <h3 className="text-3xl font-bold text-slate-900">{domainData.is_locked ? "On" : "Off"}</h3>
            </div>
            <button onClick={() => handleUpdate('is_locked', !domainData.is_locked)} className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ring-4 ring-transparent active:scale-95 ${domainData.is_locked ? 'bg-blue-600 shadow-lg shadow-blue-100' : 'bg-rose-500 shadow-lg shadow-rose-100'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${domainData.is_locked ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase italic">Proteksi transfer ke registrar lain.</p>
        </div>
      </div>

      {/* 3. Detailed Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Technical Info */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">settings_ethernet</span>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Informasi Teknis</h4>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-start pb-4 border-b border-slate-50">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nameservers Aktif</p>
                  <div className="space-y-1">
                    {(Array.isArray(nameservers) ? nameservers : []).filter(ns => ns).length > 0 ? 
                      nameservers.filter(ns => ns).map((ns, i) => (
                        <p key={i} className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded inline-block mr-2">{ns}</p>
                      )) : <p className="text-xs text-slate-400 italic">Belum diset (Default)</p>
                    }
                  </div>
               </div>
               <button onClick={() => setActiveTab('ns')} className="text-[10px] font-bold text-blue-600 hover:underline uppercase">Edit</button>
            </div>
            <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Registrar API</p>
                  <p className="text-xs font-bold text-slate-800">{domainData.registrar_name || "Daftarnama"} <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded ml-1 text-slate-500 tracking-tighter">API V2</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tgl Registrasi</p>
                  <p className="text-xs font-bold text-slate-800">{formatDate(domainData.registration_date)}</p>
                </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">contact_mail</span>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Kontak Administratif</h4>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-2xl">person</span>
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-900">{getContactInfo().name}</h5>
                <p className="text-xs text-slate-500">{getContactInfo().email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Telepon</p>
                <p className="text-xs font-bold text-slate-800">{getContactInfo().phone}</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Organisasi</p>
                 <p className="text-xs font-bold text-slate-800">{getContactInfo().org}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Billing / Lifecycle Card */}
      {domainData.status === 'active' && (
        <div className="p-6 rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50/50 to-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-widest rounded">Billing Info</span>
              <h4 className="text-lg font-bold text-slate-900">Perpanjang Masa Aktif</h4>
            </div>
            <p className="text-sm text-slate-600 max-w-xl leading-relaxed font-medium">
              Amankan domain Anda lebih lama. Perpanjang sekarang untuk mencegah kehilangan akses dan biaya pemulihan (restore) yang lebih mahal di masa depan.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 relative z-10">
            <button onClick={handleRenew} disabled={isRenewing} className="h-14 bg-slate-900 hover:bg-[#F97316] text-white px-10 rounded-xl font-bold text-sm transition-all shadow-xl shadow-slate-100 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 whitespace-nowrap w-full md:w-auto">
              {isRenewing ? "Memproses..." : "Perpanjang Sekarang (+1Th)"}
            </button>
            {renewalPrice && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Biaya: <span className="text-slate-900">Rp {new Intl.NumberFormat("id-ID").format(renewalPrice)}</span></p>
            )}
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderNameservers = () => (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
        <div className="max-w-md">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">Custom Nameservers</h3>
          <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">Arahkan domain ke penyedia hosting lain melalui nameserver kustom.</p>
        </div>
        <button className="h-9 px-4 flex items-center justify-center text-[10px] font-bold text-[#F97316] bg-orange-50 rounded-lg border border-orange-100 hover:bg-orange-100 transition-all active:scale-95 uppercase tracking-widest w-full sm:w-auto">Reset ke Default</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-3 sm:p-5 rounded-lg border border-slate-100">
        {nameservers.map((ns, idx) => (
          <div key={idx} className="flex items-center gap-3 transition-all">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white flex items-center justify-center border border-slate-200 text-[10px] sm:text-xs font-bold text-slate-400 shrink-0 shadow-sm">NS{idx + 1}</div>
            <input
              type="text"
              value={ns}
              onChange={(e) => { const newNs = [...nameservers]; newNs[idx] = e.target.value; setNameservers(newNs); }}
              placeholder={`ns${idx + 1}.hostinganda.com`}
              className="flex-1 bg-white border border-slate-200 rounded-lg h-10 sm:h-12 px-4 sm:px-5 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 font-medium text-slate-700 text-sm transition-all placeholder:text-slate-300 shadow-sm"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-3 text-slate-400 max-w-md">
          <svg className="w-5 h-5 flex-shrink-0 text-slate-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-[10px] sm:text-xs font-normal italic leading-relaxed text-slate-400">Perubahan nameserver membutuhkan waktu propagasi 24-48 jam secara global.</p>
        </div>
        <button onClick={handleSaveNameservers} className="h-12 bg-slate-900 text-white px-10 rounded-lg font-bold text-sm hover:bg-[#F97316] transition-all shadow-lg shadow-slate-100 active:scale-95 whitespace-nowrap w-full md:w-auto">Simpan Konfigurasi</button>
      </div>
    </div>
  );

  const renderDns = () => (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">DNS Zone Management</h3>
          <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">Kelola record A, CNAME, MX, dan TXT secara mandiri.</p>
        </div>
        <button onClick={() => setShowDnsModal(true)} className="flex items-center justify-center gap-2 bg-slate-900 text-white h-12 px-6 rounded-lg font-bold text-sm hover:bg-[#F97316] transition-all shadow-lg shadow-slate-100 active:scale-95 w-full sm:w-auto">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add New Record
        </button>
      </div>

      {/* Sandbox Notice */}
      <div className="bg-orange-50 border border-orange-100 p-4 sm:p-6 rounded-lg mb-8 flex items-start gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <p className="text-[10px] sm:text-sm text-orange-900 font-bold uppercase tracking-widest mb-1 leading-none">Mode Pengembangan (Sandbox)</p>
          <p className="text-xs sm:text-sm text-orange-800/80 leading-relaxed font-normal">Manajemen DNS berjalan di infrastruktur sandbox registrar.</p>
        </div>
      </div>

      {/* DNS Error Alert */}
      {dnsError && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg mb-6 flex items-start gap-3 animate-shake">
            <span className="material-symbols-outlined text-rose-500">warning</span>
            <div>
                <p className="text-xs font-bold text-rose-900 uppercase tracking-tight">Koneksi Registrar Bermasalah</p>
                <p className="text-xs text-rose-700 font-medium">{dnsError}</p>
            </div>
        </div>
      )}

      {/* MOBILE DNS CARDS */}
      <div className="block sm:hidden space-y-3">
        {loadingDns ? (
          <div className="p-10 text-center text-slate-400 text-sm font-bold animate-pulse">Loading Records...</div>
        ) : dnsRecords.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">Belum ada record DNS.</div>
        ) : (
          dnsRecords.map((rec) => (
            <div key={rec.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-[#F97316] transition-colors"></div>
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 border border-slate-200 uppercase">{rec.type}</span>
                <button onClick={() => handleDeleteDns(rec.id)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Host</p>
                  <p className="text-sm font-bold text-slate-800 break-all">{getRecordHost(rec)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Value</p>
                  <p className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 break-all">{getRecordValue(rec)}</p>
                </div>
                <div className="flex gap-6 pt-2">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">TTL</p>
                    <p className="text-xs font-bold text-slate-700">{rec.ttl}</p>
                  </div>
                  {(rec.preference || rec.priority) && (
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Priority</p>
                      <p className="text-xs font-bold text-slate-700">{rec.preference || rec.priority}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden sm:block border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-500">Type</th>
              <th className="p-4 font-semibold text-slate-500">Host</th>
              <th className="p-4 font-semibold text-slate-500">Value</th>
              <th className="p-4 font-semibold text-slate-500">TTL</th>
              <th className="p-4 font-semibold text-slate-500 text-center">Priority</th>
              <th className="p-4 font-semibold text-slate-500 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loadingDns ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading DNS Records...</td></tr>
            ) : dnsRecords.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">Belum ada record DNS.</td></tr>
            ) : (
              dnsRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition">
                  <td className="p-4"><span className="font-semibold bg-slate-100 px-2.5 py-1 rounded text-xs text-slate-600 border border-slate-200">{rec.type}</span></td>
                  <td className="p-4 font-semibold text-slate-700">{getRecordHost(rec)}</td>
                  <td className="p-4 text-slate-600 font-mono text-xs truncate max-w-[150px]" title={getRecordValue(rec)}>{getRecordValue(rec)}</td>
                  <td className="p-4 text-slate-400 text-xs font-medium">{rec.ttl}</td>
                  <td className="p-4 text-center text-slate-400 text-xs font-medium">{rec.preference || rec.priority || "-"}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDeleteDns(rec.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-slate-400 font-medium">Domain ini tidak memerlukan verifikasi dokumen tambahan.</p>
      </div>
    );

    if (docInfo.status === 'none') return null;

    return (
      <div className="space-y-6 sm:space-y-8 animate-[fadeIn_0.3s_ease-out]">
        {/* 1. Detail Header (Ketik Ulang Biar Presisi) */}
        <div className="bg-slate-50/50 p-4 sm:p-8 rounded-lg border border-slate-100">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            <div>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Nama Domain</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 truncate">{domainData.name}</p>
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Registrar</p>
              <p className="text-sm sm:text-base font-bold text-slate-900 uppercase truncate">{domainData.registrar_name || "Daftarnama"}</p>
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Registrasi</p>
              <p className="text-sm sm:text-base font-bold text-slate-900">{formatDate(domainData.registration_date)}</p>
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">Kadaluarsa</p>
              <p className="text-sm sm:text-base font-bold text-slate-900">{formatDate(domainData.expiration_date)}</p>
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

            <h3 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Identitas Terverifikasi</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6 max-w-sm">
              Seluruh syarat dokumen telah terpenuhi. Domain Anda telah diverifikasi secara resmi oleh Registrar.
            </p>
            
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100 shadow-sm">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                Status: Approved
              </div>
              <button onClick={handleSync} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest flex items-center gap-1.5">
                <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Sync
              </button>
            </div>
          </div>
        ) : (
          <div className={`p-6 sm:p-8 rounded-xl border-2 shadow-xl shadow-slate-100 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-6 transition-all ${
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
                  <h4 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{docInfo.title}</h4>
                  <span className={`px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] border ${docInfo.badge}`}>
                    Aksi Dibutuhkan
                  </span>
                </div>
                <p className="text-xs sm:text-base text-slate-600 leading-relaxed font-normal max-w-2xl">{docInfo.desc}</p>

                {countdown && (
                  <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sisa waktu:</span>
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
                className="h-12 sm:h-14 rounded-lg font-bold text-xs sm:text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-[#F97316] shadow-orange-100 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpired ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"} /></svg>
                {isExpired ? "Perpanjang + Upload" : "Upload Dokumen"}
              </button>

              <button
                onClick={handleSync}
                className="h-10 sm:h-12 rounded-lg font-bold text-[10px] sm:text-xs text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
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
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Riwayat & Audit Trail</h3>
        <button onClick={fetchAuditLogs} className="h-10 px-4 flex items-center justify-center text-xs font-bold text-[#F97316] bg-orange-50 rounded-lg border border-orange-100 hover:bg-orange-100 transition-all active:scale-95 uppercase tracking-widest">Refresh Data</button>
      </div>
      <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest">Waktu</th>
              <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest">Transisi</th>
              <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest">Alasan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditLogs.length > 0 ? auditLogs.map(log => (
              <tr key={log.id} className="hover:bg-white transition-colors">
                <td className="px-4 py-3 text-slate-500 font-medium">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-2 font-bold">
                    <span className="text-slate-400 capitalize bg-slate-100 px-2 py-0.5 rounded text-[10px] tracking-widest border border-slate-200">{log.from_status || 'initial'}</span>
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5-5 5M6 7l5 5-5 5" /></svg>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] tracking-widest border border-emerald-100 uppercase">{log.to_status}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 italic">{log.reason}</td>
              </tr>
            )) : (
              <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-400">Belum ada riwayat tercatat.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Registrar Lock Card */}
        <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${domainData.is_locked ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                <span className="material-symbols-outlined text-2xl font-bold">{domainData.is_locked ? 'lock' : 'lock_open'}</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 tracking-tight">Registrar Transfer Lock</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proteksi Transfer Domain</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-normal mb-8">
              Mencegah pemindahan domain ke registrar lain tanpa izin Anda. Tetap aktifkan fitur ini kecuali jika Anda berniat melakukan transfer.
            </p>
          </div>
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{domainData.is_locked ? 'Status: Terkunci' : 'Status: Terbuka'}</span>
            <button
              onClick={() => handleUpdateLock(!domainData.is_locked)}
              disabled={lockLoading}
              className={`w-14 h-7 rounded-full p-1.5 transition-all duration-300 relative ${domainData.is_locked ? 'bg-blue-600' : 'bg-slate-300'} ${lockLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${domainData.is_locked ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </div>

        {/* EPP Code Card */}
        <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center border border-orange-100 shadow-sm">
                <span className="material-symbols-outlined text-2xl font-bold">vpn_key</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 tracking-tight">Domain Auth Code (EPP)</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kode Rahasia Transfer</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-normal mb-8">
              Gunakan kode ini untuk memindahkan domain Anda ke provider lain. <span className="font-bold text-rose-600">Jangan pernah membagikan kode ini kepada siapa pun!</span>
            </p>
          </div>
          <div className="space-y-3">
            {eppCode ? (
              <div className="p-4 bg-white border-2 border-dashed border-[#F97316]/30 rounded-xl flex items-center justify-between group">
                <code className="text-sm font-bold text-slate-800 tracking-wider select-all">{eppCode}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(eppCode); success("Kode EPP disalin!"); }}
                  className="p-2 text-slate-400 hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition"
                  title="Salin Kode"
                >
                  <span className="material-symbols-outlined text-lg">content_copy</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleShowEPP}
                disabled={fetchingEpp}
                className="w-full h-12 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#F97316] transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
              >
                {fetchingEpp ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">visibility</span>
                    <span>Tampilkan Kode EPP</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Warning Alert */}
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined font-bold">warning</span>
        </div>
        <div>
          <h5 className="text-sm font-bold text-rose-900 uppercase tracking-widest mb-1 leading-none">Peringatan Keamanan</h5>
          <p className="text-xs text-rose-700/80 leading-relaxed font-medium italic">
            Proses transfer domain keluar membutuhkan Unlocked Status dan Kode EPP. Domain yang dipindah keluar tidak dapat dikontrol lagi melalui panel ini.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 pb-20 animate-[fadeIn_0.5s_ease-out] px-1 sm:px-0">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(isAdmin ? "/admin/domains" : "/dashboard/domains")} className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#F97316] hover:border-[#F97316] transition shadow-sm shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate">{domainData.name || domainData.domain_name}</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold mt-1.5">
              <span className={`px-2 py-0.5 border flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest rounded-md ${domainData.status === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : (domainData.status === 'provisioned' || domainData.status === 'registering') ? 'text-blue-600 bg-blue-50 border-blue-100' : domainData.status === 'paid' ? 'text-orange-600 bg-orange-50 border-orange-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                <span className={`w-1 h-1 rounded-full ${domainData.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                {domainData.status === 'registering' ? 'REGISTERING' : domainData.status === 'provisioned' ? 'MENUNGGU DOKUMEN' : domainData.status === 'paid' ? 'AWAITING' : (domainData.status || "").toUpperCase()}
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-500 font-medium">Registrar: <span className="text-slate-900 font-bold uppercase">{domainData.registrar_name || "Daftarnama"}</span></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto">
          <button onClick={handleSync} disabled={syncing} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-500 hover:bg-white hover:text-[#F97316] hover:border-[#F97316] hover:shadow-md transition-all disabled:opacity-50">
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span>{syncing ? 'Sync...' : 'Refresh'}</span>
          </button>
          <a href={`https://${domainData.domain_name}`} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none h-[38px] flex items-center justify-center gap-2 px-4 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:text-[#F97316] hover:border-[#F97316] transition shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            <span>Visit</span>
          </a>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden min-h-[500px]">
        <div className="bg-slate-50/50 border-b border-slate-100 p-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: "overview", label: "Overview", icon: "M4 6h16M4 12h16m-7 6h7" },
              needsDocuments && { id: "verifikasi", label: "Verifikasi", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
              { id: "ns", label: "Nameservers", icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" },
              { id: "dns", label: "DNS Records", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" },
              isAdmin && { id: "audit", label: "Audit Log", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
              { id: "security", label: "Keamanan", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
            ].filter(Boolean).map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition whitespace-nowrap ${activeTab === tab.id ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className={`p-6 md:p-8 ${(domainData.status || "").toLowerCase() !== 'active' && (domainData.status || "").toLowerCase() !== 'provisioned' && activeTab !== 'verifikasi' && activeTab !== 'overview' ? 'opacity-70 pointer-events-none grayscale-[0.5]' : ''}`}>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "verifikasi" && renderVerification()}
          {activeTab === "ns" && renderNameservers()}
          {activeTab === "dns" && renderDns()}
          {activeTab === "audit" && renderAuditLogs()}
          {activeTab === "security" && renderSecurity()}
        </div>
      </div>

      {/* MODAL ADD DNS (Typography Updated) */}
      {showDnsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Add DNS Record</h3>
              <button onClick={() => setShowDnsModal(false)} className="text-slate-400 hover:text-red-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleAddDns} className="p-8 space-y-6 bg-slate-50/30">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Record Type</label>
                <CustomSelect
                  value={newRecord.type}
                  onChange={val => setNewRecord({ ...newRecord, type: val })}
                  options={[
                    { value: "A", label: "A (IPv4 Address)" },
                    { value: "CNAME", label: "CNAME (Canonical Name)" },
                    { value: "MX", label: "MX (Mail Exchange)" },
                    { value: "TXT", label: "TXT (Text Record)" },
                    { value: "NS", label: "NS (Nameserver)" }
                  ]}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Host / Subdomain</label>
                <input type="text" placeholder="e.g. @ or www" value={newRecord.name} onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg h-12 px-5 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-50 font-medium text-slate-700 transition-all shadow-sm placeholder:text-slate-300" required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Points To / Value</label>
                <input type="text" placeholder="e.g. 192.168.1.1" value={newRecord.value} onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg h-12 px-5 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-50 font-medium text-slate-700 transition-all shadow-sm placeholder:text-slate-300" required />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">TTL</label>
                  <input type="number" value={newRecord.ttl} onChange={(e) => setNewRecord({ ...newRecord, ttl: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg h-12 px-5 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-50 font-medium text-slate-700 transition-all shadow-sm" />
                </div>
                {newRecord.type === 'MX' && (
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Priority</label>
                    <input type="number" value={newRecord.priority || 10} onChange={(e) => setNewRecord({ ...newRecord, priority: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg h-12 px-5 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-50 font-medium text-slate-700 transition-all shadow-sm" />
                  </div>
                )}
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white h-12 rounded-lg font-bold text-sm hover:bg-[#F97316] transition-all shadow-lg shadow-slate-100 active:scale-95 flex items-center justify-center gap-3 mt-4">
                Simpan Record DNS
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDomain;
