import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";
import { exportToExcel, formatDataForExport } from "../../utils/exportUtils";

const AdminTransferRequests = () => {
  const { success, error } = useNotification();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get("/transfers/admin/all");
      setRequests(response.data);
      applyFilters(response.data, activeFilter, searchTerm);
    } catch (err) {
      console.error("Error fetching transfers:", err);
      error("Gagal mengambil data pengajuan.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const applyFilters = (data, filter, search) => {
    let result = [...data];
    if (filter !== "all") result = result.filter(r => r.status === filter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => (r.domain_name || "").toLowerCase().includes(s) || (r.user_name || "").toLowerCase().includes(s) || (r.user_email || "").toLowerCase().includes(s));
    }
    setFilteredRequests(result);
  };

  const handleSearch = (e) => { const val = e.target.value; setSearchTerm(val); applyFilters(requests, activeFilter, val); };
  const handleFilterChange = (e) => { const val = e.target.value; setActiveFilter(val); applyFilters(requests, val, searchTerm); };

  const openEditModal = (req) => { setSelectedReq(req); setStatus(req.status); setNotes(req.admin_notes || ""); setShowModal(true); };

  const handleUpdate = async () => {
    try {
      await api.put(`/transfers/admin/${selectedReq.id}`, { status, admin_notes: notes });
      success("Status pengajuan berhasil diperbarui!");
      setShowModal(false);
      fetchRequests();
    } catch (err) { error("Gagal memperbarui status."); }
  };

  const handleExportExcel = () => {
    const exportData = formatDataForExport(filteredRequests, { domain_name: 'Domain', user_name: 'User', user_email: 'Email', current_registrar: 'Registrar Asal', status: 'Status', created_at: 'Tanggal' });
    exportToExcel(exportData, 'Transfer_Requests', 'Transfers');
  };

  const statusBadge = (status) => {
    if (status === 'COMPLETED') return 'badge-success';
    if (status === 'REJECTED') return 'badge-danger';
    if (status === 'PENDING_REVIEW') return 'badge-warning';
    return 'badge-info';
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="card" style={{ padding: 0 }}>
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1 w-full max-w-xl relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-lg">search</span>
              <input type="text" placeholder="Cari Domain, Nama User, atau Email..." value={searchTerm} onChange={handleSearch} className="form-input" style={{ paddingLeft: 36, height: 40 }} />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button onClick={handleExportExcel} className="btn btn-sm" style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
                <span className="material-symbols-outlined text-sm">download</span>
                Export
              </button>
              <select value={activeFilter} onChange={handleFilterChange} className="form-select" style={{ width: 160 }}>
                <option value="all">Semua Status</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
          {searchTerm && (
            <div className="mt-3 flex items-center gap-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Menampilkan <span className="text-primary-500">{filteredRequests.length}</span> hasil pencarian untuk "{searchTerm}"
              </p>
              <button onClick={() => { setSearchTerm(""); applyFilters(requests, activeFilter, ""); }} className="text-[10px] font-bold text-primary-500 uppercase tracking-wider hover:underline">Reset</button>
            </div>
          )}
        </div>

        <div className="table-wrap">
          <table className="table-main">
            <thead>
              <tr>
                <th>Target Domain</th>
                <th>User Profile</th>
                <th>Registrar Asal</th>
                <th className="text-center">Status</th>
                <th>Tanggal Pengajuan</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-10 w-40 bg-neutral-100 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-8 w-32 bg-neutral-50 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 bg-neutral-50 rounded" /></td>
                    <td className="px-4 py-4 text-center"><div className="h-6 w-20 bg-neutral-100 rounded-md mx-auto" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 bg-neutral-50 rounded" /></td>
                    <td className="px-4 py-4 text-center"><div className="h-8 w-16 bg-neutral-100 rounded-lg mx-auto" /></td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-12"><div className="empty-state"><div className="empty-state-icon"><span className="material-symbols-outlined">swap_horiz</span></div><p>Belum ada pengajuan migrasi.</p></div></td></tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">
                      <p className="font-bold text-neutral-800 text-sm">{r.domain_name}</p>
                      <p className="text-[10px] text-primary-500 font-bold uppercase tracking-tighter mt-0.5">EPP: {r.epp_code}</p>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-xs font-bold text-neutral-700">{r.user_name}</p>
                      <p className="text-[10px] text-neutral-400 font-semibold">{r.user_email}</p>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-xs font-bold text-neutral-500 uppercase tracking-tight">{r.current_registrar || "-"}</p>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`badge ${statusBadge(r.status)}`}>{(r.status || "UNKNOWN").replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-tighter">
                        {new Date(r.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => openEditModal(r)} className="btn btn-sm btn-primary">
                        Proses
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="text-sm font-bold text-neutral-800">Update Pengajuan</h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Domain: <span className="text-primary-500">{selectedReq.domain_name}</span></p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm" style={{ width: 32, height: 32, padding: 0 }}>
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="modal-body space-y-3">
              <div className="space-y-1">
                <label className="form-label">Ubah Status Pengajuan</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="form-select">
                  <option value="PENDING_REVIEW">PENDING REVIEW</option>
                  <option value="APPROVED">APPROVED (Kirim Invoice)</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="form-label">Catatan Internal / Instruksi</label>
                <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tulis alasan reject atau instruksi teknis untuk tim/user..." className="form-input" style={{ resize: "none" }} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Batal</button>
              <button onClick={handleUpdate} className="btn btn-primary">Simpan Status</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransferRequests;
