import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import StatusBadge from "../../components/ui/StatusBadge";
import { ActionButton } from "../../components/ui/ActionBar";

const AdminInvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error, warning } = useNotification();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("Bukti transfer tidak valid atau dana belum masuk.");

  useEffect(() => { fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    try {
      const response = await api.get(`/billing/invoice/${id}`);
      setInvoice(response.data);
    } catch (err) {
      error("Invoice tidak ditemukan atau akses ditolak.");
      navigate("/admin/invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    success("Tersalin!");
  };

  const handleDownloadPdf = () => window.print();

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      let endpoint = "";
      let providerName = "";
      if (invoice.plink_ref_no) {
        endpoint = `/prismalink/status/${id}`;
        providerName = "Prismalink";
      } else if (invoice.payment_instructions?.va_number || invoice.payment_method?.includes("VA")) {
        endpoint = `/tripay/status/${id}`;
        providerName = "Tripay";
      } else {
        return warning("Metode pembayaran manual harus diverifikasi manual oleh Admin.");
      }
      const response = await api.get(endpoint);
      if (response.data.status === 'PAID' || response.data.status === 'success') {
        success(`Status Pembayaran ${providerName} Terkonfirmasi: LUNAS`);
        fetchDetail();
      } else {
        warning(`Status di ${providerName}: ${response.data.status || "PENDING"}. Belum ada pembayaran.`);
      }
    } catch {
      error("Gagal memeriksa status transaksi di provider.");
    } finally {
      setChecking(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return error("Alasan penolakan wajib diisi.");
    setRejecting(true);
    try {
      await api.post(`/billing/invoice/${id}/reject`, { reason: rejectReason });
      success("Pembayaran berhasil ditolak.");
      setShowRejectModal(false);
      fetchDetail();
    } catch (err) {
      error(err.response?.data?.error || "Gagal menolak pembayaran.");
    } finally {
      setRejecting(false);
    }
  };

  const handleApprove = async () => {
    const isRetry = invoice.status === 'paid';
    let msg = isRetry
      ? "Apakah Anda yakin ingin mencoba ulang proses aktivasi untuk pesanan ini?"
      : "Apakah Anda yakin ingin menerima pembayaran ini secara manual?";
    const cat = (invoice.category || 'REGISTER').toUpperCase();
    if (cat === 'TOPUP') msg += isRetry ? "" : "\nSaldo akan ditambahkan ke Wallet pelanggan.";
    else if (cat === 'RENEW') msg += "\nDomain akan diperpanjang.";
    else if (cat === 'TRANSFER') msg += "\nProses transfer domain akan dimulai.";
    else if (cat === 'RESTORE') msg += "\nDomain akan dipulihkan.";
    else msg += "\nDomain akan didaftarkan.";
    if (!window.confirm(msg)) return;

    setApproving(true);
    try {
      const response = await api.post(`/billing/invoice/${id}/pay`, { payment_method: "MANUAL_ADMIN" });
      if (response.data.warning) warning(response.data.message);
      else success("Pembayaran diterima dan domain berhasil diaktifkan!");
      await fetchDetail();
    } catch (err) {
      error(err.response?.data?.error || "Gagal memproses pembayaran.");
    } finally {
      setApproving(false);
    }
  };

  const formatRupiah = (num) => {
    if (num === undefined || num === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency", currency: "IDR", minimumFractionDigits: 0,
    }).format(num);
  };

  const getCatBadge = (cat) => {
    const c = (cat || "REGISTER").toUpperCase();
    const map = {
      TOPUP: { label: "Top-up Saldo", color: "purple" },
      RENEW: { label: "Perpanjang", color: "indigo" },
      TRANSFER: { label: "Transfer", color: "amber" },
      RESTORE: { label: "Restore", color: "rose" },
      REGISTER: { label: "Registrasi", color: "emerald" },
    };
    const m = map[c] || map.REGISTER;
    return <span className={`badge badge-${m.color}`}>{m.label}</span>;
  };

  const getStatusText = () => {
    if (!invoice) return "";
    if (invoice.status === 'paid') return { label: "Lunas", color: "green" };
    if (invoice.status === 'failed') return { label: "Ditolak", color: "rose" };
    if (invoice.status === 'cancelled') return { label: "Dibatalkan", color: "neutral" };
    if (invoice.status === 'pending' && invoice.has_proof) return { label: "Menunggu Verifikasi", color: "indigo" };
    return { label: "Menunggu Bayar", color: "amber" };
  };

  const getDomainStatus = (item) => {
    if (item.domain_status === 'active') return { label: "Aktif", color: "green" };
    if (item.domain_status === 'processing' || item.domain_status === 'provisioned')
      return { label: "Proses Aktivasi", color: "amber" };
    if (item.domain_status) return { label: item.domain_status, color: "neutral" };
    return { label: "Belum Terdaftar", color: "neutral" };
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-8 h-8 border-2 border-neutral-100 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Memuat Rincian Tagihan...</p>
    </div>
  );
  if (!invoice) return null;

  const st = getStatusText();

  return (
    <div className="space-y-5 animate-fade-in pb-20">

      {/* --- PRINT STYLES --- */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 0; }
          body { background: #fff !important; }
          .no-print, .sidebar, .topbar { display: none !important; }
          .print-area {
            display: block !important;
            width: 210mm !important; min-height: 297mm !important;
            padding: 20mm !important;
            position: fixed !important; top: 0 !important; left: 0 !important;
            background: white !important; z-index: 9999 !important;
            -webkit-print-color-adjust: exact !important; color-adjust: exact !important;
          }
        }
      `}} />

      {/* --- HEADER --- */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/invoices" className="btn btn-ghost btn-sm">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Kembali
          </Link>
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Rincian Tagihan
            </p>
            <h2 className="text-sm font-bold text-neutral-800 tracking-tight">#{invoice.id}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ActionButton icon="sync" label={checking ? "Memeriksa..." : "Cek Status"} onClick={handleCheckStatus} disabled={checking} />
          <ActionButton icon="download" label="Download PDF" onClick={handleDownloadPdf} />
          {invoice.status === 'pending' && (
            <>
              <ActionButton icon="block" label="Tolak" onClick={() => setShowRejectModal(true)} variant="rose" />
              <ActionButton icon="check_circle" label={approving ? "Memproses..." : "Terima"} onClick={handleApprove} variant="primary" disabled={approving} />
            </>
          )}
          {invoice.status === 'paid' && invoice.items?.some(item => item.domain_status !== 'active') && (
            <ActionButton icon="replay" label={approving ? "Mengaktifkan..." : "Retry Aktivasi"} onClick={handleApprove} variant="rose" disabled={approving} />
          )}
        </div>
      </div>

      {/* --- PRINT AREA --- */}
      <div id="invoice-print" className="print-area hidden p-10 bg-white">
        <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-6 mb-6">
          <div>
            <h1 className="text-lg font-bold text-neutral-900 uppercase">PT Aplikasi Dagang Teknologi</h1>
            <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mt-1">Technology Solution Provider</p>
            <p className="text-[10px] text-neutral-500 mt-2">Jl. Cigadung Raya Tengah No.52, Bandung</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-neutral-200 uppercase tracking-tighter">INVOICE</h2>
            <p className="text-[9px] font-semibold text-neutral-400 uppercase mt-2">#{invoice.id}</p>
            <p className="text-[10px] text-neutral-500">{invoice.date}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border-l-2 border-primary-500 pl-4">
            <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-1">Bill To:</p>
            <p className="text-sm font-bold text-neutral-900">{invoice.customer?.name}</p>
            <p className="text-[10px] text-primary-500 font-semibold">{invoice.customer?.email}</p>
          </div>
          <div className="bg-neutral-50 p-4 rounded-lg">
            <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">Payment Summary</p>
            <p className="text-[10px]"><span className="font-semibold text-neutral-400">Method:</span> {invoice.payment_method || "Pending"}</p>
            <p className="text-[10px]"><span className="font-semibold text-neutral-400">Trx ID:</span> {invoice.plink_ref_no || "N/A"}</p>
          </div>
        </div>
        <table className="w-full text-left mb-6">
          <thead>
            <tr className="border-y border-neutral-300">
              <th className="py-2 text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Item</th>
              <th className="py-2 text-[9px] font-bold text-neutral-600 uppercase tracking-widest text-center">Durasi</th>
              <th className="py-2 text-[9px] font-bold text-neutral-600 uppercase tracking-widest text-right">Harga</th>
              <th className="py-2 text-[9px] font-bold text-neutral-600 uppercase tracking-widest text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {invoice.items?.map((item, i) => (
              <tr key={i}>
                <td className="py-2"><p className="text-xs font-bold text-neutral-900">{item.name}</p><p className="text-[9px] text-neutral-400">{item.type || "Domain"}</p></td>
                <td className="py-2 text-center text-[10px] text-neutral-500">1 Tahun</td>
                <td className="py-2 text-right text-xs text-neutral-600">{formatRupiah(item.price)}</td>
                <td className="py-2 text-right text-xs font-bold text-neutral-900">{formatRupiah(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mb-8">
          <div className="w-56 space-y-1.5">
            <div className="flex justify-between text-[10px] text-neutral-500"><span>Subtotal</span><span>{formatRupiah(invoice.subtotal)}</span></div>
            {invoice.discount > 0 && <div className="flex justify-between text-[10px] text-rose-600"><span>Diskon</span><span>-{formatRupiah(invoice.discount)}</span></div>}
            <div className="flex justify-between text-[10px] text-neutral-500"><span>PPN (11%)</span><span>{formatRupiah(invoice.tax)}</span></div>
            {invoice.service_fee > 0 && <div className="flex justify-between text-[10px] text-neutral-500"><span>Biaya Layanan</span><span>{formatRupiah(invoice.service_fee)}</span></div>}
            <div className="flex justify-between items-center pt-3 border-t border-neutral-300">
              <span className="text-[10px] font-bold text-neutral-900 uppercase tracking-wider">Total</span>
              <span className="text-base font-bold text-primary-500">{formatRupiah(invoice.total)}</span>
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-100 pt-4 text-[9px] text-neutral-400 italic">
          <p>* Faktur ini sah dan dihasilkan otomatis oleh sistem dagangdomain.com.</p>
          <p>* Domain yang telah didaftarkan tidak dapat dibatalkan atau dikembalikan.</p>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT — Items */}
        <div className="lg:col-span-2 space-y-5">

          <div className="card">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-3">
                <span className="w-1 h-5 rounded-full bg-primary-500" />
                <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Item Tagihan</h3>
                {getCatBadge(invoice.category)}
              </div>
              <div className={`badge badge-${st.color}`}>{st.label}</div>
            </div>

            {invoice.plink_ref_no && (
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                <div>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Transaction ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono font-bold text-neutral-600 bg-white px-2 py-1 rounded border border-neutral-100">{invoice.plink_ref_no}</code>
                    <button onClick={() => handleCopy(invoice.plink_ref_no)} className="text-neutral-300 hover:text-primary-500 transition-colors">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Payment Method</p>
                  <span className="badge badge-amber">{invoice.payment_method || "-"}</span>
                </div>
              </div>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Deskripsi Layanan</th>
                    <th style={{ textAlign: "center" }}>Status Domain</th>
                    <th style={{ textAlign: "center" }}>Durasi</th>
                    <th style={{ textAlign: "right" }}>Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, i) => {
                    const ds = getDomainStatus(item);
                    return (
                      <tr key={i}>
                        <td>
                          <p className="font-semibold text-neutral-700 text-sm">{item.name}</p>
                          <p className="text-[10px] text-neutral-400 font-semibold uppercase">{item.type || "Domain Registration"}</p>
                        </td>
                        <td style={{ textAlign: "center" }}><StatusBadge status={ds.color} label={ds.label} /></td>
                        <td style={{ textAlign: "center" }} className="text-[10px] text-neutral-400 font-semibold uppercase">1 Tahun</td>
                        <td style={{ textAlign: "right" }} className="font-semibold text-neutral-700">{formatRupiah(item.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1.5 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
              <div className="flex justify-between text-[11px] text-neutral-400 font-semibold">
                <span>Subtotal</span>
                <span className="text-neutral-600">{formatRupiah(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-[11px] text-rose-500 font-semibold">
                  <span>Diskon</span>
                  <span>-{formatRupiah(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-neutral-400 font-semibold">
                <span>PPN (11%)</span>
                <span className="text-neutral-600">{formatRupiah(invoice.tax)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-neutral-400 font-semibold">
                <span>Biaya Layanan</span>
                <span className="text-neutral-600">{formatRupiah(invoice.service_fee || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 mt-2 border-t border-neutral-200">
                <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">Total Tagihan</span>
                <span className="text-base font-bold text-primary-500">{formatRupiah(invoice.total)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT — Sidebar */}
        <div className="space-y-4">

          {/* Customer Info */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 rounded-full bg-blue-500" />
              <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Informasi Pelanggan</h3>
            </div>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Nama / Bisnis</span>
                <span className="info-value">{invoice.customer?.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value text-primary-500">{invoice.customer?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Telepon</span>
                <span className="info-value">{invoice.customer?.phone || "-"}</span>
              </div>
            </div>
          </div>

          {/* Payment Proof */}
          {invoice.payment_instructions?.payment_proof && (
            <div className="card" style={{ borderLeftColor: "var(--color-primary-500)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-primary-500" />
                  <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Bukti Bayar</h3>
                </div>
                <span className="badge badge-amber">Manual</span>
              </div>
              <div className="relative group overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50 mb-3">
                <img src={invoice.payment_instructions.payment_proof} alt="Bukti Bayar" className="w-full object-contain max-h-[240px] transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a href={invoice.payment_instructions.payment_proof} target="_blank" rel="noreferrer"
                     className="bg-white text-neutral-800 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary-500 hover:text-white transition-colors">
                    Lihat Full
                  </a>
                </div>
              </div>
              <p className="text-[10px] text-neutral-400 italic leading-relaxed">
                * Periksa mutasi rekening sebelum menekan <strong>Terima Pembayaran</strong>.
              </p>
            </div>
          )}

          {/* Activity Log */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 rounded-full bg-neutral-300" />
              <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">Log Aktivitas</h3>
            </div>
            <div className="relative pl-4 space-y-4">
              <div className="absolute left-[5px] top-1 bottom-1 w-px bg-neutral-100" />
              {invoice.logs?.map((log, i) => {
                const dotColor =
                  log.action.toLowerCase().includes("paid") || log.action.toLowerCase().includes("diterima") ? "bg-green-500" :
                  log.action.toLowerCase().includes("expired") || log.action.toLowerCase().includes("kadaluarsa") ? "bg-rose-500" :
                  "bg-primary-500";
                return (
                  <div key={i} className="relative flex items-start gap-3">
                    <span className={`absolute -left-[13px] w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${dotColor}`} />
                    <div>
                      <p className="text-xs font-semibold text-neutral-700 leading-tight">{log.action}</p>
                      <p className="text-[9px] text-neutral-400 font-medium mt-0.5">{log.date} &middot; {log.by}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* --- REJECT MODAL --- */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => !rejecting && setShowRejectModal(false)} />
          <div className="modal w-full max-w-md">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">block</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-800">Tolak Pembayaran</h3>
                <p className="text-[10px] font-bold text-rose-500/70 uppercase tracking-wider">Konfirmasi Penolakan</p>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="ml-auto w-7 h-7 flex items-center justify-center text-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="py-4">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Alasan Penolakan</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Masukkan alasan..."
                className="form-input min-h-[100px] resize-none" />
              <p className="text-[10px] text-neutral-400 italic mt-1">* Alasan akan dikirim ke email pelanggan.</p>
            </div>
            <div className="flex gap-3 pt-4 border-t border-neutral-100">
              <button onClick={() => setShowRejectModal(false)} disabled={rejecting}
                className="btn btn-ghost flex-1">Batalkan</button>
              <button onClick={handleReject} disabled={rejecting}
                className="btn btn-rose flex-1 flex items-center justify-center gap-2">
                {rejecting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {rejecting ? "Memproses..." : "Konfirmasi Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminInvoiceDetail;
