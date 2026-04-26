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

// Helper untuk menerjemahkan error registrar ke bahasa yang lebih bersahabat
const translateRegistrarError = (errorString) => {
  if (!errorString) return "Terjadi kendala teknis minor saat pemrosesan otomatis. Domain Anda telah masuk antrean untuk aktivasi manual oleh tim teknis kami.";
  
  const err = errorString.toLowerCase();
  
  if (err.includes("insufficient registrar balance") || err.includes("reseller balance is not enough")) {
    return "Sistem kami sedang melakukan sinkronisasi data tambahan dengan Registrar pusat. Tim kami akan mengaktifkan domain Anda secara manual dalam waktu dekat (Estimasi 1-6 jam). Mohon ditunggu.";
  }
  
  if (err.includes("domain is not available") || err.includes("already registered")) {
    return "Domain ini baru saja masuk ke tahap pemrosesan khusus di sistem Registrar. Silakan hubungi tim Support kami melalui menu Bantuan untuk pengecekan status lebih lanjut.";
  }
  
  if (err.includes("contact") || err.includes("invalid data")) {
    return "Data kontak yang terdaftar memerlukan penyesuaian format standar internasional. Tim support kami akan menghubungi Anda melalui email atau WhatsApp untuk sinkronisasi data.";
  }
  
  return "Terjadi kendala teknis minor saat pemrosesan otomatis. Domain Anda telah masuk antrean untuk aktivasi manual oleh tim teknis kami.";
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
  
  // --- TLD CHECK ---
  const idExtensions = ['.id', '.co.id', '.biz.id', '.my.id', '.web.id', '.ac.id', '.sch.id', '.or.id', '.ponpes.id', '.desa.id'];
  const isIdDomain = domainData?.name ? idExtensions.some(ext => domainData.name.toLowerCase().endsWith(ext)) : false;

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
      upload_required: {
        status: 'upload_required',
        title: "Verifikasi Diperlukan",
        desc: "Lengkapi dokumen identitas untuk mengaktifkan domain ID Anda.",
        color: "blue",
        badge: "bg-blue-100 text-blue-700 border-blue-200"
      },
      rejected: {
        status: 'rejected',
        title: "Dokumen Ditolak",
        desc: "Verifikasi gagal. Silakan periksa kembali kelengkapan dokumen sesuai panduan.",
        color: "rose",
        badge: "bg-rose-100 text-rose-700 border-rose-200"
      },
      expired_needs_verification: {
        status: 'expired_needs_verification',
        title: "Butuh Verifikasi Ulang",
        desc: "Domain expired dan membutuhkan verifikasi dokumen baru untuk pengaktifan kembali.",
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
            } catch (e) {}
        } else {
            regData = raw.data || raw;
        }
    }
    return regData.document_notes || regData.rejection_reason || regData.status_description || "Hubungi support untuk informasi lebih lanjut.";
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
    localStorage.setItem("cart", JSON.stringify(cartItem));
    window.dispatchEvent(new Event("storage")); 
    success("🚀 Item telah ditambahkan ke keranjang!");
    navigate("/cart");
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
    if(!isConfirmed) return;
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
      {/* Action Required Banner */}
      {isCritical && isIdDomain && (
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

      {/* Registration Failure Banner */}
      {domainData.status === 'failed' && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg shadow-sm">
              <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div className="flex-1">
                      <h4 className="text-amber-900 font-bold uppercase tracking-widest text-sm mb-1">Sedang Dalam Proses Aktivasi Manual</h4>
                      <p className="text-amber-800 text-sm leading-relaxed mb-3">
                          {translateRegistrarError(domainData.last_registration_error)}
                      </p>
                      {domainData.last_registration_error && isAdmin && (
                          <div className="bg-white/50 p-3 rounded border border-amber-200 text-xs font-mono text-amber-900 break-all">
                              <strong>Detail Error (Admin Only):</strong> {domainData.last_registration_error}
                          </div>
                      )}
                      <div className="mt-4 flex items-center gap-3">
                          <a href="/dashboard/support" className="text-xs font-bold text-amber-900 hover:underline uppercase tracking-wider bg-amber-200/50 px-3 py-1.5 rounded">Hubungi Support</a>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Document Status Banner */}
      {docInfo.status !== 'none' && isIdDomain && (
          <div className={`p-6 border rounded-lg flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm border-l-4 ${docInfo.color === 'blue' ? 'bg-blue-50 border-blue-100 border-l-blue-500' : 'bg-amber-50 border-amber-100 border-l-amber-500'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${docInfo.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    {/* Changed from font-bold to font-bold */}
                    <h4 className={`text-base font-bold uppercase tracking-widest mb-1 ${docInfo.color === 'blue' ? 'text-blue-900' : 'text-amber-900'}`}>{docInfo.title}</h4>
                    {/* Changed to font-normal */}
                    <p className={`text-sm leading-relaxed font-normal max-w-xl ${docInfo.color === 'blue' ? 'text-blue-700' : 'text-amber-700'}`}>{docInfo.desc}</p>
                </div>
              </div>
              
              {docInfo.status === 'upload_required' && (
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    <button onClick={handleSync} disabled={syncing} className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-2 transition-all disabled:opacity-50 uppercase tracking-widest bg-blue-100/50 px-4 py-2 rounded-lg">
                        {syncing ? "..." : "🔄"} Refresh Status
                    </button>
                    {/* Changed from font-bold to font-bold */}
                    <button onClick={handleUploadDocument} disabled={uploadLoading} className="bg-blue-600 text-white h-12 px-8 rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 whitespace-nowrap w-full sm:w-auto active:scale-95">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                       Upload Dokumen
                    </button>
                </div>
              )}
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-50 rounded-lg border border-slate-100 shadow-sm">
          {/* Changed labels to font-semibold and text-[11px] */}
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Status Domain</p>
          <div className="flex items-center gap-3">
            {/* Changed from font-bold to font-bold */}
            <h3 className="text-2xl font-bold text-slate-900 capitalize">{domainData.status}</h3>
             <span className={`text-[10px] -lg font-bold uppercase tracking-widest border ${domainData.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {domainData.status === 'active' ? '● Live' : '● Status'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-4 font-medium">Exp: <span className="font-semibold text-slate-900">{formatDate(domainData.expiration_date)}</span></p>
        </div>

        <div className="p-6 bg-slate-50 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Auto Renewal</p>
              <h3 className="text-2xl font-bold text-slate-900">{domainData.auto_renew ? "Aktif" : "Mati"}</h3>
            </div>
            <button onClick={() => handleUpdate('auto_renew', !domainData.auto_renew)} className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ring-4 ring-transparent active:scale-95 ${domainData.auto_renew ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${domainData.auto_renew ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-4 font-medium">Tagihan otomatis via Saldo.</p>
        </div>

        <div className="p-6 bg-slate-50 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Registrar Lock</p>
              <h3 className="text-2xl font-bold text-slate-900">{domainData.is_locked ? "Locked" : "Unlocked"}</h3>
            </div>
            <button onClick={() => handleUpdate('is_locked', !domainData.is_locked)} className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ring-4 ring-transparent active:scale-95 ${domainData.is_locked ? 'bg-blue-600 shadow-lg shadow-blue-100' : 'bg-rose-500 shadow-lg shadow-rose-100'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${domainData.is_locked ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-4 font-medium">Status transfer protection.</p>
        </div>
      </div>

      {/* Main Info - Domain Lifecycle Logic (ICANN) */}
      {domainData.status === 'active' ? (
        <div className="p-8 rounded-lg border border-orange-100 bg-orange-50/50 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="flex-1">
            <h4 className="text-lg font-bold text-slate-900 mb-2">Perpanjang Masa Aktif Domain</h4>
            <p className="text-base text-slate-600 max-w-xl leading-relaxed font-normal">
              Domain Anda terdaftar sejak {formatDate(domainData.registration_date)}. Perpanjang sekarang untuk menjaga kontinuitas bisnis Anda.
            </p>
          </div>
          <button onClick={handleRenew} disabled={isRenewing} className="h-12 bg-[#F97316] hover:bg-slate-900 text-white px-8 rounded-lg font-bold text-sm transition-all shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 whitespace-nowrap w-full md:w-auto">
            {isRenewing ? "Memproses..." : "Perpanjang (+1 Tahun)"}
          </button>
        </div>
      ) : (domainData.status === 'expired' || domainData.status === 'redemption') ? (
        <div className="p-8 rounded-lg border border-rose-100 bg-rose-50/50 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="flex-1">
            <h4 className="text-lg font-bold text-rose-900 mb-2">Domain Kadaluarsa - Pemulihan Diperlukan</h4>
            <p className="text-base text-rose-700 max-w-xl leading-relaxed font-normal">
              Domain Anda telah melewati masa aktif. Anda masih dapat memulihkan domain ini selama masa tenggang (redemption period) sebelum dihapus secara permanen oleh registrar.
            </p>
          </div>
          <button onClick={handleRestore} disabled={isRestoring} className="h-12 bg-rose-600 hover:bg-rose-700 text-white px-8 rounded-lg font-bold text-sm transition-all shadow-lg shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 whitespace-nowrap w-full md:w-auto">
            {isRestoring ? "Memproses..." : "Restore Domain Sekarang"}
          </button>
        </div>
      ) : null}
    </div>
    );
  };

  const renderNameservers = () => (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-end mb-8">
        <div>
          {/* Changed font-bold to font-bold */}
          <h3 className="text-xl font-bold text-slate-900 mb-1">Custom Nameservers</h3>
          {/* Changed font-medium to font-normal */}
          <p className="text-base text-slate-500 font-normal leading-relaxed">Arahkan domain ke penyedia hosting lain melalui nameserver kustom.</p>
        </div>
        <button className="h-10 px-4 flex items-center justify-center text-xs font-bold text-[#F97316] bg-orange-50 rounded-lg border border-orange-100 hover:bg-orange-100 transition-all active:scale-95 uppercase tracking-widest">Reset ke Default</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-lg border border-slate-100">
        {nameservers.map((ns, idx) => (
          <div key={idx} className="flex items-center gap-3 transition-all">
            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center border border-slate-200 text-xs font-bold text-slate-400 shrink-0 shadow-sm">NS{idx + 1}</div>
            <input
              type="text"
              value={ns}
              onChange={(e) => { const newNs = [...nameservers]; newNs[idx] = e.target.value; setNameservers(newNs); }}
              placeholder={`ns${idx + 1}.hostinganda.com`}
              // MAJOR CHANGE: font-bold -> font-medium, focus:ring-4 removed (cleaner)
              className="flex-1 bg-white border border-slate-200 rounded-lg h-12 px-5 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 font-medium text-slate-700 transition-all placeholder:text-slate-300 shadow-sm"
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-3 text-slate-400 max-w-md">
           <svg className="w-5 h-5 flex-shrink-0 text-slate-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           <p className="text-xs font-normal italic leading-relaxed">Perubahan nameserver membutuhkan waktu propagasi 24-48 jam secara global.</p>
        </div>
        <button onClick={handleSaveNameservers} className="h-12 bg-slate-900 text-white px-10 rounded-lg font-bold text-sm hover:bg-[#F97316] transition-all shadow-lg shadow-slate-100 active:scale-95 whitespace-nowrap w-full md:w-auto">Simpan Konfigurasi</button>
      </div>
    </div>
  );

  const renderDNS = () => (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">DNS Zone Management</h3>
          <p className="text-base text-slate-500 font-normal leading-relaxed">Kelola record A, CNAME, MX, dan TXT secara mandiri.</p>
        </div>
        <button onClick={() => setShowDnsModal(true)} className="flex items-center gap-2 bg-slate-900 text-white h-12 px-6 rounded-lg font-bold text-sm hover:bg-[#F97316] transition-all shadow-lg shadow-slate-100 active:scale-95">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add New Record
        </button>
      </div>

      {/* Sandbox Notice - Typography Toned Down */}
      <div className="bg-orange-50 border border-orange-100 p-6 rounded-lg mb-8 flex items-start gap-4">
        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <p className="text-sm text-orange-900 font-bold uppercase tracking-widest mb-1 leading-none">Mode Pengembangan (Sandbox)</p>
          <p className="text-sm text-orange-800/80 leading-relaxed font-normal">Manajemen DNS saat ini berjalan di infrastruktur sandbox registrar.</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {/* Changed font-bold to font-semibold */}
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
                    {/* Changed font-bold to font-medium/semibold */}
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

    // If status is none, it means it's not applicable (though isIdDomain checked above)
    if (docInfo.status === 'none') return null;

    return (
        <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            {/* 1. Detail Header */}
            <div className="bg-slate-50/50 p-8 rounded-lg border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Domain</p>
                        <p className="text-base font-bold text-slate-900">{domainData.name}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Registrar</p>
                        <p className="text-base font-bold text-slate-900 uppercase">{domainData.registrar_name || "Daftarnama"}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tanggal Registrasi</p>
                        <p className="text-base font-bold text-slate-900">{formatDate(domainData.registration_date)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Kadaluarsa</p>
                        <p className="text-base font-bold text-slate-900">{formatDate(domainData.expiration_date)}</p>
                    </div>
                </div>
            </div>

            {/* 2. Verification Status Card */}
            <div className={`p-8 rounded-xl border-2 shadow-xl shadow-slate-100 flex flex-col lg:flex-row items-center justify-between gap-10 transition-all ${
                docInfo.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                docInfo.color === 'amber' ? 'bg-amber-50 border-amber-100' :
                docInfo.color === 'rose' ? 'bg-rose-50 border-rose-100' :
                'bg-blue-50 border-blue-100'
            }`}>
                <div className="flex items-start gap-6">
                    <div className={`w-20 h-20 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${
                        docInfo.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                        docInfo.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                        docInfo.color === 'rose' ? 'bg-rose-100 text-rose-600' :
                        'bg-blue-100 text-blue-600'
                    }`}>
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{docInfo.title}</h4>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border ${docInfo.badge}`}>
                                {docInfo.status === 'upload_required' ? 'Aksi Dibutuhkan' : 'Status'}
                            </span>
                        </div>
                        <p className="text-base text-slate-600 leading-relaxed font-normal max-w-2xl">{docInfo.desc}</p>
                        
                        {countdown && (
                            <div className="mt-4 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sisa waktu verifikasi:</span>
                                <span className={`text-xs font-bold ${countdown.includes('Segera') ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`}>{countdown}</span>
                            </div>
                        )}

                        {(docInfo.status === 'rejected' || docInfo.status === 'expired_needs_verification') && (
                            <div className="mt-6 p-5 bg-white/60 rounded-lg border border-rose-100/50 backdrop-blur-sm">
                                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Catatan Registrar:</p>
                                <p className="text-sm font-bold text-rose-900 italic">"{rejectionReason}"</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full lg:w-72">
                    <button 
                        onClick={isExpired ? handleRenew : handleUploadDocument} 
                        disabled={uploadLoading || docInfo.status === 'approved'} 
                        className={`h-14 rounded-lg font-bold text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale ${
                            docInfo.status === 'approved' ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-[#F97316] shadow-orange-100'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpired ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"} /></svg>
                        {isExpired ? "Perpanjang + Upload Dokumen" : "Upload Dokumen"}
                    </button>
                    
                    <button 
                        onClick={handleSync} 
                        disabled={syncing} 
                        className="h-14 rounded-lg bg-white border-2 border-slate-100 text-slate-600 font-bold text-sm hover:border-[#F97316] hover:text-[#F97316] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Refresh Status
                    </button>
                    
                    {/* Fallback Instruction */}
                    {docInfo.status === 'upload_required' && (
                        <p className="text-[10px] text-center text-slate-400 font-medium px-4">
                            Ada kendala upload? <br/>
                            <a href="mailto:support@daftarnama.id" className="text-[#F97316] font-bold hover:underline">Hubungi Support</a>
                        </p>
                    )}
                </div>
            </div>

            {/* 3. Tracking Info */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
                <div className="flex items-center gap-3 opacity-60">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Terakhir Sinkronisasi</p>
                        <p className="text-xs font-bold text-slate-600">{domainData.last_document_sync_at ? formatDate(domainData.last_document_sync_at) : "-"}</p>
                    </div>
                </div>

                <div className="w-[1px] h-8 bg-slate-200 hidden sm:block"></div>

                <div className="flex items-center gap-3 opacity-60">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Terakhir Upload</p>
                        <p className="text-xs font-bold text-slate-600">{domainData.last_document_upload_attempt_at ? formatDate(domainData.last_document_upload_attempt_at) : "-"}</p>
                    </div>
                </div>
            </div>
            
            {/* 4. Support Fallback Detail */}
            <div className="p-8 rounded-lg border border-dashed border-slate-200 text-center">
                 <h5 className="text-sm font-bold text-slate-900 mb-2">Perlu bantuan verifikasi?</h5>
                 <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                    Jika Anda mengalami kesulitan mengunggah dokumen melalui portal registrar, silakan kirimkan dokumen persyaratan ke email <span className="text-[#F97316] font-bold">help@dagangdomain.id</span> dengan menyertakan nama domain Anda.
                 </p>
            </div>
        </div>
    );
  };

  const renderSecurity = () => (
    <div className="animate-[fadeIn_0.3s_ease-out] space-y-6">
      <div onClick={() => !lockLoading && domainData?.status === 'active' && handleUpdateLock(!domainData.is_locked)} className={`p-8 rounded-lg border flex flex-col md:flex-row items-center gap-8 transition bg-white cursor-pointer group/lock ${lockLoading ? 'opacity-70 bg-slate-50 cursor-wait' : 'hover:border-blue-200 border-slate-100 shadow-sm'} ${domainData?.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 shadow-inner transition-colors ${domainData?.is_locked ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-slate-900 text-xl tracking-tight">Registrar Lock</h3>
            <div className="relative inline-flex items-center active:scale-95 transition-transform">
              <input type="checkbox" className="sr-only peer" readOnly checked={domainData?.is_locked} />
              <div className={`w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${lockLoading ? 'opacity-50' : ''}`}></div>
            </div>
          </div>
          <p className="text-base text-slate-600 leading-relaxed font-normal">
            Mengunci domain secara permanen agar tidak bisa ditransfer keluar tanpa otorisasi.
            {domainData?.is_locked ? (
                <span className="block mt-3 font-bold text-emerald-600 flex items-center gap-2 text-sm uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-lg w-fit">Domain Terlindungi</span>
            ) : (
                <span className="block mt-3 font-bold text-rose-600 text-sm uppercase tracking-widest bg-rose-50 px-4 py-2 rounded-lg w-fit">Domain Berisiko: Belum Terkunci</span>
            )}
          </p>
        </div>
      </div>

      <div onClick={() => !fetchingEpp && domainData?.status === 'active' && !eppCode && handleShowEPP()} className={`p-8 rounded-lg border border-slate-100 flex flex-col md:flex-row items-center gap-8 transition bg-white shadow-sm group/epp ${fetchingEpp ? 'opacity-70 bg-slate-50 cursor-wait' : 'hover:border-orange-200'} ${domainData?.status !== 'active' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        <div className="w-16 h-16 bg-orange-50 rounded-lg flex items-center justify-center text-[#F97316] shrink-0 shadow-inner">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
        </div>
        <div className="flex-1 w-full">
          <h3 className="font-bold text-slate-900 text-xl tracking-tight mb-2">EPP / Auth Code</h3>
          <p className="text-base text-slate-500 mb-6 font-normal leading-relaxed">
            Otorisasi rahasia untuk memindahkan domain.
            <span className="block text-rose-600 font-bold mt-3 text-sm uppercase tracking-widest bg-rose-50 px-4 py-2 rounded-lg w-fit">⚠️ Jangan bagikan kode ini kepada siapa pun.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-slate-50 border border-slate-200 h-14 px-6 rounded-lg font-mono text-slate-900 tracking-[0.4em] font-bold text-lg text-center flex-1 min-w-[200px] shadow-inner flex items-center justify-center overflow-hidden">
              {eppCode || "•••• •••• ••••"}
            </div>
            <button className="h-14 bg-slate-900 text-white px-8 rounded-lg font-bold text-sm hover:bg-[#F97316] transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-3 whitespace-nowrap active:scale-95" disabled={fetchingEpp || domainData?.status !== 'active'} onClick={(e) => { e.stopPropagation(); handleShowEPP(); }}>
              {fetchingEpp ? "Fetching..." : "Tampilkan Kode"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-[fadeIn_0.5s_ease-out]">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(isAdmin ? "/admin/domains" : "/dashboard/domains")} className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#F97316] hover:border-[#F97316] transition shadow-sm">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          {/* Changed font-bold to font-bold */}
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{domainData.name || domainData.domain_name}</h1>
          <div className="flex items-center gap-3 text-sm font-bold mt-1.5">
            <span className={`-lg border flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${domainData.status === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : (domainData.status === 'provisioned' || domainData.status === 'registering') ? 'text-blue-600 bg-blue-50 border-blue-100' : domainData.status === 'paid' ? 'text-orange-600 bg-orange-50 border-orange-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${domainData.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
              {domainData.status === 'registering' ? 'REGISTERING' : domainData.status === 'provisioned' ? 'PROVISIONING' : domainData.status === 'paid' ? 'AWAITING' : (domainData.status || "").toUpperCase()}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">Registrar: <span className="text-slate-900 font-bold uppercase">{domainData.registrar_name || "Daftarnama"}</span></span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-500 hover:bg-white hover:text-[#F97316] hover:border-[#F97316] hover:shadow-md transition-all disabled:opacity-50">
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
          <div className="hidden sm:block">
            <a href={`https://${domainData.domain_name}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-slate-500 hover:text-[#F97316] flex items-center gap-1 transition">Kunjungi Website <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden min-h-[500px]">
        <div className="bg-slate-50/50 border-b border-slate-100 p-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: "overview", label: "Overview", icon: "M4 6h16M4 12h16m-7 6h7" },
              isIdDomain && { id: "verifikasi", label: "Verifikasi", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
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
        <div className={`p-6 md:p-8 ${domainData.status !== 'active' && activeTab !== 'verifikasi' && activeTab !== 'overview' ? 'opacity-70 pointer-events-none grayscale-[0.5]' : ''}`}>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "verifikasi" && renderVerification()}
          {activeTab === "ns" && renderNameservers()}
          {activeTab === "dns" && renderDNS()}
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
                            onChange={val => setNewRecord({...newRecord, type: val})}
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
                        <input type="text" placeholder="e.g. @ or www" value={newRecord.name} onChange={(e) => setNewRecord({...newRecord, name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg h-12 px-5 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-50 font-medium text-slate-700 transition-all shadow-sm placeholder:text-slate-300" required />
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Points To / Value</label>
                        <input type="text" placeholder="e.g. 192.168.1.1" value={newRecord.value} onChange={(e) => setNewRecord({...newRecord, value: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg h-12 px-5 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-50 font-medium text-slate-700 transition-all shadow-sm placeholder:text-slate-300" required />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">TTL</label>
                            <input type="number" value={newRecord.ttl} onChange={(e) => setNewRecord({...newRecord, ttl: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg h-12 px-5 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-50 font-medium text-slate-700 transition-all shadow-sm" />
                        </div>
                        {newRecord.type === 'MX' && (
                            <div className="flex-1">
                                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Priority</label>
                                <input type="number" value={newRecord.priority || 10} onChange={(e) => setNewRecord({...newRecord, priority: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg h-12 px-5 outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-50 font-medium text-slate-700 transition-all shadow-sm" />
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