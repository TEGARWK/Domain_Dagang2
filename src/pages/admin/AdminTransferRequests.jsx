import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";
import CustomSelect from "../../components/ui/CustomSelect";

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const applyFilters = (data, filter, search) => {
    let result = [...data];
    
    if (filter !== "all") {
      result = result.filter(r => r.status === filter);
    }
    
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => 
        (r.domain_name || "").toLowerCase().includes(s) || 
        (r.user_name || "").toLowerCase().includes(s) ||
        (r.user_email || "").toLowerCase().includes(s)
      );
    }
    
    setFilteredRequests(result);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    applyFilters(requests, activeFilter, val);
  };

  const handleFilterChange = (val) => {
    setActiveFilter(val);
    applyFilters(requests, val, searchTerm);
  };

  const openEditModal = (req) => {
      setSelectedReq(req);
      setStatus(req.status);
      setNotes(req.admin_notes || "");
      setShowModal(true);
  };

  const handleUpdate = async () => {
      try {
          await api.put(`/transfers/admin/${selectedReq.id}`, {
              status,
              admin_notes: notes
          });
          success("Status pengajuan berhasil diperbarui!");
          setShowModal(false);
          fetchRequests();
      } catch (err) {
          error("Gagal memperbarui status.");
      }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] pb-10">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        {/* Unified Header */}
        <div className="p-4 sm:p-8 border-b border-slate-50 bg-slate-50/30">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
                <div className="flex-1 w-full max-w-xl relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f97316] transition-colors">search</span>
                    <input 
                        type="text" 
                        placeholder="Cari Domain, Nama User, atau Email..." 
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full h-12 pl-12 pr-6 bg-white border border-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#f97316]/10 focus:border-[#f97316] transition-all placeholder:text-slate-300"
                    />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-48">
                        <CustomSelect
                            value={activeFilter}
                            onChange={handleFilterChange}
                            options={[
                                { value: 'all', label: 'Semua Status' },
                                { value: 'PENDING_REVIEW', label: 'Pending Review' },
                                { value: 'APPROVED', label: 'Approved' },
                                { value: 'PROCESSING', label: 'Processing' },
                                { value: 'COMPLETED', label: 'Completed' },
                                { value: 'REJECTED', label: 'Rejected' },
                            ]}
                        />
                    </div>
                </div>
            </div>
            {searchTerm && (
                <div className="mt-4 flex items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Menampilkan <span className="text-[#f97316]">{filteredRequests.length}</span> hasil pencarian untuk "{searchTerm}"
                    </p>
                    <button onClick={() => {setSearchTerm(""); applyFilters(requests, activeFilter, "");}} className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest hover:underline">Reset</button>
                </div>
            )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-8 py-5">Target Domain</th>
                <th className="px-8 py-5">User Profile</th>
                <th className="px-8 py-5">Registrar Asal</th>
                <th className="px-8 py-5 text-center">Status Histori</th>
                <th className="px-8 py-5">Tanggal Pengajuan</th>
                <th className="px-8 py-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {loading ? (
                <tr><td colSpan="6" className="px-8 py-10 text-center text-slate-400 font-bold italic">Memuat data pengajuan...</td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan="6" className="px-8 py-10 text-center text-slate-400 font-bold italic">Belum ada pengajuan migrasi.</td></tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                        <p className="font-bold text-slate-900 text-sm">{r.domain_name}</p>
                        <p className="text-[10px] text-[#f97316] font-bold uppercase tracking-tighter mt-0.5">EPP: {r.epp_code}</p>
                    </td>
                    <td className="px-8 py-5">
                        <p className="text-xs font-semibold text-slate-800">{r.user_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{r.user_email}</p>
                    </td>
                    <td className="px-8 py-5">
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">{r.current_registrar || "-"}</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border transition-all ${
                        r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100' :
                        r.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-100' :
                        r.status === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-100' :
                        'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100'
                      }`}>
                        {(r.status || "UNKNOWN").replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                            {new Date(r.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => openEditModal(r)}
                        className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#f97316] transition-all shadow-sm active:scale-95"
                      >
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

      {/* EDIT MODAL */}
      {showModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white rounded-2xl p-10 max-w-xl w-full shadow-2xl border border-slate-100 animate-[scaleIn_0.3s_ease-out]">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Update Pengajuan</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Domain: <span className="text-[#f97316]">{selectedReq.domain_name}</span></p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ubah Status Pengajuan</label>
                        <CustomSelect 
                            value={status} 
                            onChange={val => setStatus(val)}
                            options={[
                                { value: "PENDING_REVIEW", label: "🔍 PENDING REVIEW" },
                                { value: "APPROVED", label: "✅ APPROVED (Kirim Invoice)" },
                                { value: "PROCESSING", label: "⚙️ PROCESSING" },
                                { value: "COMPLETED", label: "🏁 COMPLETED" },
                                { value: "REJECTED", label: "❌ REJECTED" }
                            ]}
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Catatan Internal / Instruksi</label>
                        <textarea 
                            rows="4"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Tulis alasan reject atau instruksi teknis untuk tim/user..."
                            className="w-full p-5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#f97316]/20 focus:border-[#f97316] transition-all text-sm font-medium text-slate-600 placeholder:text-slate-300"
                        ></textarea>
                      </div>
                  </div>

                  <div className="flex gap-4 mt-12">
                      <button 
                        onClick={() => setShowModal(false)}
                        className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                      >
                          Batal
                      </button>
                      <button 
                        onClick={handleUpdate}
                        className="flex-1 h-14 bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-[#f97316] transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                      >
                          Simpan Status
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminTransferRequests;
