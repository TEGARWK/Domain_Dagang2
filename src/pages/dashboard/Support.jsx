import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";

const Support = () => {
  const [activeTab, setActiveTab] = useState("faq"); // "faq" or "ticket"
  const [activeFaq, setActiveFaq] = useState(null);
  
  // Data States
  const [faqs, setFaqs] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Form State
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail View State
  const [viewingTicket, setViewingTicket] = useState(null);
  const { success, error } = useNotification();

  useEffect(() => {
    fetchFaqs();
    fetchMyTickets();
  }, []);

  const fetchFaqs = async () => {
    try {
      const response = await api.get("/faqs");
      setFaqs(response.data);
    } catch(err) {
      console.error("Gagal load FAQ:", err);
    } finally {
      setLoadingFaqs(false);
    }
  };

  const fetchMyTickets = async () => {
    try {
      const response = await api.get("/support/tickets/my-tickets");
      setMyTickets(response.data);
    } catch(err) {
      console.error("Gagal load My Tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSendTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      return error("Subjek dan Isi Pesan harus diisi");
    }

    setIsSubmitting(true);

    try {
      await api.post("/support/tickets", { subject, message });
      success("Tiket dukungan berhasil dikirim.");
      setSubject("");
      setMessage("");
      fetchMyTickets(); // Refresh lists
      setActiveTab("history"); // Move to history tab to see the ticket
    } catch (err) {
      error(err.response?.data?.error || "Gagal mengirim pesan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-widest leading-none flex items-center h-6">TERBUKA</span>;
      case "replied":
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-bold uppercase tracking-widest leading-none flex items-center h-6">DIBALAS ADMIN</span>;
      case "closed":
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-widest leading-none flex items-center h-6">SELESAI</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-widest leading-none flex items-center h-6">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] pb-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
      {/* --- HEADER --- */}
      <div className="bg-white rounded-xl p-6 md:p-10 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-[#F97316] -lg text-xs font-bold mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Pusat Dukungan Member
            </div>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-4">
              Ada yang bisa kami bantu?
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed text-sm">
              Temukan jawaban cepat untuk pertanyaan umum Anda atau kirimkan tiket bantuan agar Admin kami dapat langsung membantu Anda.
            </p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-lg w-full sm:w-fit overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => { setActiveTab("faq"); setViewingTicket(null); }}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === "faq" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Katalog FAQ
            </button>
            <button 
              onClick={() => { setActiveTab("ticket"); setViewingTicket(null); }}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === "ticket" ? "bg-[#F97316] text-white shadow-lg shadow-orange-200" : "text-slate-500 hover:text-slate-800"}`}
            >
              Kirim Tiket / Pesan
            </button>
            <button 
              onClick={() => { setActiveTab("history"); setViewingTicket(null); }}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === "history" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
            >
              Riwayat Tiketku
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- MAIN CONTENT --- */}
        <div className="lg:col-span-2">
          {activeTab === "faq" && (
            <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 px-2 mb-6">
                Pertanyaan Umum 
                <span className="w-8 h-1 bg-orange-200 rounded-full"></span>
              </h2>
              
              <div className="space-y-3">
                {loadingFaqs ? (
                   <p className="text-center py-10 text-slate-400 font-medium text-sm">Memuat FAQ...</p>
                ) : faqs.length === 0 ? (
                   <p className="text-center py-10 text-slate-400 font-medium text-sm">Belum ada daftar pertanyaan umum.</p>
                ) : (
                  faqs.map((faq, index) => (
                    <div 
                      key={faq.id} 
                      className={`bg-white rounded-lg border transition-all duration-300 ${activeFaq === index ? 'border-orange-200 shadow-lg shadow-orange-100' : 'border-slate-100 hover:border-orange-100'}`}
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full flex items-center justify-between p-5 text-left"
                      >
                        <span className={`font-bold text-sm md:text-base pr-4 ${activeFaq === index ? 'text-[#F97316]' : 'text-slate-700'}`}>
                          {index + 1}. {faq.question}
                        </span>
                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${activeFaq === index ? 'bg-[#F97316] text-white rotate-180' : 'bg-slate-50 text-slate-400'}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ${activeFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-5 pt-0 text-slate-500 text-sm leading-relaxed border-t border-slate-50 whitespace-pre-wrap">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "ticket" && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 px-2 mb-6">
                 Buka Tiket Bantuan Baru
                 <span className="w-8 h-1 bg-orange-200 rounded-full"></span>
               </h2>
               <form onSubmit={handleSendTicket} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                  <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Subjek Masalah</label>
                     <input 
                       type="text"
                       required
                       value={subject}
                       onChange={e => setSubject(e.target.value)}
                       placeholder="Contoh: Kesulitan saat transfer domain .id saya"
                       className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-4 ring-orange-100 transition focus:border-orange-300"
                     />
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Penjelasan Detail</label>
                     <textarea 
                       required
                       rows="6"
                       value={message}
                       onChange={e => setMessage(e.target.value)}
                       placeholder="Ceritakan detail kendala yang dialami dengan selengkap mungkin agar kami dapat segera membantumu..."
                       className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-4 ring-orange-100 transition focus:border-orange-300 custom-scrollbar resize-none"
                     />
                  </div>
                  <div className="flex justify-end pt-2">
                     <button 
                       type="submit" 
                       disabled={isSubmitting}
                       className="px-8 py-3.5 bg-[#F97316] text-white rounded-lg font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                     >
                       {isSubmitting ? "Mengirim..." : "Kirim Tiket Sekarang"}
                       {!isSubmitting && <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                     </button>
                  </div>
               </form>
            </div>
          )}

          {activeTab === "history" && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 px-2 mb-6">
                 Riwayat Tiketku
                 <span className="w-8 h-1 bg-orange-200 rounded-full"></span>
               </h2>
               
               {viewingTicket ? (
                  /* --- DETAIL VIEW (READ RECORD) --- */
                  <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
                     <button onClick={() => setViewingTicket(null)} className="flex items-center gap-2 text-slate-400 hover:text-orange-500 text-xs font-bold mb-6 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        Kembali ke Daftar
                     </button>
                     <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                        <div>
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                             <div className="w-fit">{getStatusBadge(viewingTicket.status)}</div>
                             <span className="text-[10px] font-bold text-slate-400 mt-1 sm:mt-0">Dirubah: {new Date(viewingTicket.updated_at).toLocaleString('id-ID')}</span>
                           </div>
                           <h3 className="text-2xl font-bold text-slate-900 leading-tight">{viewingTicket.subject}</h3>
                        </div>
                     </div>
                     
                     <div className="space-y-6">
                        {/* Pesan Member */}
                        <div className="bg-orange-50/50 p-6 rounded-lg border border-orange-100">
                           <label className="text-[10px] font-bold text-[#F97316] uppercase tracking-widest block mb-2">Pesan Anda</label>
                           <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{viewingTicket.message}</p>
                           <p className="text-[10px] mt-4 font-bold text-slate-400">Terkirim: {new Date(viewingTicket.created_at).toLocaleString('id-ID')}</p>
                        </div>
                        {/* Tanggapan Admin */}
                        {viewingTicket.admin_reply && (
                           <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100">
                              <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-2 flex flex-row items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Tanggapan Admin
                              </label>
                              <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{viewingTicket.admin_reply}</p>
                           </div>
                        )}
                        {!viewingTicket.admin_reply && viewingTicket.status !== 'closed' && (
                           <p className="text-center italic text-xs text-slate-400 py-4">Tiket ini sedang dalam antrian dan akan segera ditanggapi oleh admin.</p>
                        )}
                     </div>
                  </div>
               ) : (
                  /* --- LIST VIEW --- */
                  <div className="space-y-4">
                      {loadingTickets ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#F97316] rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat Riwayat...</span>
                        </div>
                      ) : myTickets.length === 0 ? (
                        <div className="bg-white p-16 rounded-2xl border border-slate-100 text-center shadow-sm">
                           <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                              <span className="material-symbols-outlined text-slate-200 text-4xl">confirmation_number</span>
                           </div>
                           <p className="font-bold text-slate-900 uppercase tracking-tight mb-1">Tidak Ada Riwayat Tiket</p>
                           <p className="text-xs text-slate-400 font-medium tracking-tight">Kamu belum pernah membuat tiket bantuan sebelumnya.</p>
                        </div>
                     ) : (
                         myTickets.map(ticket => (
                            <div 
                              key={ticket.id} 
                              onClick={() => setViewingTicket(ticket)}
                              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-orange-200 transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                            >
                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-0.5 bg-slate-50 rounded italic">#T-{String(ticket.id).padStart(5, '0')}</span>
                                     <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(ticket.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  </div>
                                  <h4 className="font-bold text-slate-900 text-base mb-1 truncate group-hover:text-[#F97316] transition-colors">{ticket.subject}</h4>
                                  <p className="text-xs text-slate-500 font-medium truncate max-w-sm">{ticket.message}</p>
                               </div>
                               <div className="shrink-0 flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-0 border-slate-50">
                                  {getStatusBadge(ticket.status)}
                                  <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-[#F97316] transition-all shrink-0">
                                     <span className="material-symbols-outlined text-sm">chevron_right</span>
                                  </div>
                               </div>
                            </div>
                         ))
                     )}
                  </div>
               )}
            </div>
          )}
        </div>

        {/* --- SIDEBAR INFO --- */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-lg p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h4 className="text-lg font-bold mb-2">Pusat Layanan Cepat</h4>
                <p className="text-slate-400 text-xs mb-6 leading-relaxed">Selain melalui tiket dukungan, Anda juga sangat disarankan untuk melihat direktori FAQ kami yang terus di-update.</p>
                <div className="space-y-3">
                   <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Avg Ticket Response</p>
                        <p className="text-xs font-bold">~ 1 - 2 Jam</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Keamanan</p>
                        <p className="text-xs font-bold">Enkripsi End-to-End</p>
                      </div>
                   </div>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
             <h4 className="font-bold text-slate-900 mb-4 text-sm">Hubungi via Email Spesifik</h4>
             <a href="mailto:support@dagangdomain.id" className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-[#F97316] transition">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                   <p className="text-xs text-slate-500 font-medium">support@dagangdomain.id</p>
                   <p className="text-[10px] text-slate-400">Technical Issue & Finance</p>
                </div>
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
