import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";

const AdminSupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const { success, error } = useNotification();

  const fetchTickets = async () => {
    try {
      const response = await api.get("/support/tickets/all");
      setTickets(response.data);
    } catch (err) {
      error("Gagal memuat daftar tiket dukungan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleReplyChange = (e) => setReplyText(e.target.value);

  const submitReply = async (statusUpdate) => {
    if (!selectedTicket) return;
    
    // Status can be explicitly forced (e.g., 'closed') or default to 'replied' if admin types something
    let newStatus = statusUpdate || (replyText.trim() ? "replied" : selectedTicket.status);

    try {
      await api.put(`/support/tickets/${selectedTicket.id}`, {
        status: newStatus,
        admin_reply: replyText.trim() ? replyText : selectedTicket.admin_reply,
      });

      success(`Tiket berhasil diperbarui`);
      fetchTickets();
      setSelectedTicket(null); // Close detail view
      setReplyText("");
    } catch (err) {
      error(err.response?.data?.error || "Gagal memperbarui tiket");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[8px] font-extrabold uppercase tracking-widest border border-blue-100">TERBUKA</span>;
      case "replied":
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-extrabold uppercase tracking-widest border border-emerald-100">DIBALAS</span>;
      case "closed":
        return <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md text-[8px] font-extrabold uppercase tracking-widest border border-slate-100">SELESAI</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[8px] font-extrabold uppercase tracking-widest border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      {/* Header Removed */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* KOLOM KIRI: DAFTAR TIKET */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col h-[75vh]">
          <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between shrink-0">
             <h3 className="font-extrabold text-slate-900 uppercase tracking-tight text-sm">Daftar Tiket</h3>
             <span className="bg-orange-50 text-[#F97316] px-2.5 py-1 rounded-lg text-[10px] font-extrabold border border-orange-100">{tickets.length}</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 p-4 space-y-3 bg-slate-50/10">
            {loading ? (
              <p className="text-center py-10 text-slate-400 font-medium text-sm">Memuat...</p>
            ) : tickets.length === 0 ? (
              <p className="text-center py-10 text-slate-400 font-medium text-sm">Belum ada pesan masuk.</p>
            ) : (
               tickets.map(ticket => (
                  <div 
                    key={ticket.id}
                    onClick={() => { setSelectedTicket(ticket); setReplyText(ticket.admin_reply || ""); }}
                    className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-white border-[#F97316] shadow-lg shadow-orange-100/50 -translate-y-1' : 'bg-white border-slate-100 hover:border-orange-200 hover:bg-white hover:shadow-md'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                       {getStatusBadge(ticket.status)}
                       <span className="text-[10px] font-bold text-slate-400 opacity-60">
                         {new Date(ticket.created_at).toLocaleDateString('id-ID')}
                       </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-xs leading-tight mb-2 line-clamp-2">{ticket.subject}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {ticket.user_name?.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold truncate shrink">{ticket.user_name}</p>
                    </div>
                  </div>
               ))
            )}
          </div>
        </div>

        {/* KOLOM KANAN: DETAIL & BALAS TIKET */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 h-[75vh] flex flex-col overflow-hidden relative">
           {!selectedTicket ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                 <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                 </svg>
                 <p className="font-medium">Pilih tiket di samping untuk membaca detail pesan.</p>
              </div>
           ) : (
              <>
                  <div className="p-8 border-b border-slate-50 shrink-0 bg-slate-50/30 flex justify-between items-start">
                    <div>
                       <div className="flex items-center gap-3 mb-3">
                         <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest opacity-60">Oleh: {selectedTicket.user_name}</span>
                         {getStatusBadge(selectedTicket.status)}
                       </div>
                       <h2 className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">{selectedTicket.subject}</h2>
                       <p className="text-xs font-bold text-slate-400 mt-2 bg-white px-2 py-1 rounded-md border border-slate-100 w-fit">{selectedTicket.user_email}</p>
                    </div>
                  </div>

                 <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                    <div className="space-y-8">
                       {/* Pesan Pengguna */}
                       <div>
                         <label className="text-[10px] font-bold text-[#F97316] uppercase tracking-widest mb-3 flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                           Pesan Member
                         </label>
                         <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed text-sm">
                           {selectedTicket.message}
                         </div>
                       </div>

                       {/* Balasan Admin */}
                       <div>
                         <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                           Tanggapan Staf (Dilihat oleh Member)
                         </label>
                         <textarea
                           value={replyText}
                           onChange={handleReplyChange}
                           placeholder="Ketik balasan Anda di sini... (Balasan ini akan muncul di dashboard member)"
                           className="w-full h-40 bg-white border border-slate-200 rounded-lg p-6 text-sm font-medium text-slate-800 outline-none focus:ring-4 ring-blue-50 focus:border-blue-300 transition custom-scrollbar resize-none"
                         />
                       </div>
                    </div>
                 </div>

                  {/* ACTION FOOTER */}
                  <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-white shrink-0">
                     <button 
                        onClick={() => submitReply('closed')}
                        className="px-6 py-3 rounded-lg font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95"
                     >
                        Tutup Tiket (Selesai)
                     </button>
                     <button 
                        onClick={() => submitReply()}
                        className="px-8 py-3 rounded-lg font-extrabold bg-[#F97316] text-white hover:bg-slate-900 transition shadow-xl shadow-orange-600/20 text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95"
                     >
                        Simpan & Kirim Balasan
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                     </button>
                  </div>
              </>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportTickets;
