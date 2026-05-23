import React, { useState, useEffect, useRef } from "react";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";
import { useConfig } from "../../context/ConfigContext";

const Support = () => {
  const config = useConfig();
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

  // Attachment States
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleViewTicket = async (ticket) => {
    try {
      setLoadingTickets(true);
      const response = await api.get(`/support/tickets/${ticket.id}`);
      setViewingTicket(response.data);
      setActiveTab("history");
    } catch (err) {
      error("Gagal mengambil detail tiket");
    } finally {
      setLoadingTickets(false);
    }
  };

  const [replyMessage, setReplyMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return error("Ukuran file maksimal 5MB");
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() && !selectedFile) return;

    setIsReplying(true);
    try {
      let attachments = [];
      
      // 1. Upload file if exists
      if (selectedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', selectedFile);
        const uploadRes = await api.post('/upload/support', formData);
        if (uploadRes.data.success) {
          attachments = [uploadRes.data.imageUrl];
        }
        setIsUploading(false);
      }

      // 2. Send Reply
      const res = await api.post(`/support/tickets/${viewingTicket.id}/replies`, { 
        message: replyMessage,
        attachments
      });

      // 3. Update local state
      setViewingTicket(prev => ({
        ...prev,
        replies: [...prev.replies, { ...res.data.reply, sender_name: "Anda" }],
        status: 'open'
      }));
      
      setReplyMessage("");
      removeSelectedFile();
      success("Balasan terkirim");
    } catch (err) {
      error("Gagal mengirim balasan");
      setIsUploading(false);
    } finally {
      setIsReplying(false);
    }
  };

  const handleSendTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      return error("Subjek dan Isi Pesan harus diisi");
    }

    setIsSubmitting(true);
    try {
      await api.post("/support/tickets", { subject, message, attachments: [] });
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
      case "answered":
      case "replied":
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-bold uppercase tracking-widest leading-none flex items-center h-6">DIBALAS ADMIN</span>;
      case "closed":
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-widest leading-none flex items-center h-6">SELESAI</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-widest leading-none flex items-center h-6">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] pb-6 w-full px-2 md:px-4 lg:px-6 font-sans">
      {/* --- HEADER --- */}
      <div className="bg-white rounded-xl p-5 md:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-[#F97316] px-3 py-1 rounded-full text-xs font-bold mb-4">
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
          
          {!viewingTicket && (
            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-fit">
              <button 
                onClick={() => setActiveTab("faq")}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "faq" ? "bg-white text-[#F97316] shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700"}`}
              >
                FAQ Bantuan
              </button>
              <button 
                onClick={() => setActiveTab("ticket")}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "ticket" ? "bg-white text-[#F97316] shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700"}`}
              >
                Buat Tiket
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "history" ? "bg-white text-[#F97316] shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700"}`}
              >
                Riwayat Tiket
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* --- MAIN CONTENT --- */}
        <div className={viewingTicket ? "lg:col-span-12" : "lg:col-span-8"}>
          {activeTab === "faq" && (
            <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
               <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3 px-2 mb-4">
                 Pertanyaan Populer
                 <span className="w-8 h-1 bg-orange-200 rounded-full"></span>
               </h2>
               
               {loadingFaqs ? (
                  <div className="space-y-4 animate-pulse">
                      {Array(5).fill(0).map((_, i) => (
                          <div key={i} className="h-16 bg-white border border-slate-100 rounded-xl"></div>
                      ))}
                  </div>
               ) : faqs.length === 0 ? (
                  <div className="bg-white p-10 rounded-xl border border-slate-100 text-center">
                      <p className="text-slate-400 font-medium">Belum ada FAQ yang tersedia.</p>
                  </div>
               ) : (
                  faqs.map((faq, index) => (
                    <div key={faq.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button 
                        onClick={() => toggleFaq(index)}
                        className="w-full flex items-center justify-between p-5 text-left group"
                      >
                        <span className="font-bold text-slate-800 text-sm group-hover:text-[#F97316] transition-colors">{faq.question}</span>
                        <span className={`material-symbols-outlined transition-transform duration-300 text-slate-400 ${activeFaq === index ? "rotate-180" : ""}`}>
                          expand_more
                        </span>
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${activeFaq === index ? "max-h-[500px] border-t border-slate-50" : "max-h-0"}`}>
                        <div className="p-5 text-slate-600 text-sm leading-relaxed bg-slate-50/50">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  ))
               )}
            </div>
          )}

          {activeTab === "ticket" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8 animate-[fadeIn_0.3s_ease-out]">
               <h2 className="text-xl font-bold text-slate-900 mb-2">Buka Tiket Dukungan</h2>
               <p className="text-slate-500 text-sm mb-8 font-medium">Tim kami akan merespons tiket Anda dalam waktu kurang dari 24 jam.</p>
               
               <form onSubmit={handleSendTicket} className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Subjek Masalah</label>
                     <input 
                        type="text" 
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Contoh: Gagal aktivasi domain, Masalah pembayaran, dll"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:ring-4 ring-orange-100 transition focus:border-orange-300"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Detail Kendala</label>
                     <textarea 
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
                  /* --- DETAIL VIEW (CONVERSATION THREAD) --- */
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[650px]">
                     {/* Header Detail */}
                     <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
                        <div className="flex items-center gap-3">
                           <button onClick={() => setViewingTicket(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-[#F97316] transition">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                           </button>
                           <div>
                              <h3 className="font-bold text-slate-800 text-sm leading-none mb-1 truncate max-w-[200px] sm:max-w-md">{viewingTicket.subject}</h3>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Tiket: #T-{String(viewingTicket.id).padStart(5, '0')}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           {getStatusBadge(viewingTicket.status)}
                        </div>
                     </div>
                     
                     {/* Chat Messages */}
                     <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                        {/* Initial Message (Always from Member) */}
                        <div className="flex flex-col items-end ml-auto max-w-[85%]">
                           <div className="flex items-center gap-2 mb-1.5 px-1 flex-row-reverse">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Anda</span>
                              <span className="text-[9px] text-slate-400">{new Date(viewingTicket.created_at).toLocaleString('id-ID')}</span>
                           </div>
                           <div className="bg-[#F97316] text-white p-4 rounded-2xl rounded-tr-none shadow-sm text-sm leading-relaxed">
                              {viewingTicket.attachments?.map((url, i) => (
                                <div key={i} className="mb-3 overflow-hidden rounded-lg border border-white/20 shadow-inner group relative cursor-zoom-in">
                                  <img 
                                    src={`${url}`} 
                                    alt="attachment" 
                                    className="max-w-full max-h-72 object-contain hover:scale-105 transition-transform duration-500" 
                                    onClick={() => window.open(`${url}`, '_blank')}
                                  />
                                </div>
                              ))}
                              <div>{viewingTicket.message}</div>
                           </div>
                        </div>

                        {/* Replies */}
                        {viewingTicket.replies?.map((reply, idx) => (
                           <div key={reply.id || idx} className={`flex flex-col ${!reply.is_admin ? 'items-end ml-auto' : 'items-start'} max-w-[85%]`}>
                              <div className={`flex items-center gap-2 mb-1.5 px-1 ${!reply.is_admin ? 'flex-row-reverse' : ''}`}>
                                 <span className={`text-[10px] font-bold uppercase ${reply.is_admin ? 'text-blue-600' : 'text-slate-500'}`}>
                                    {reply.is_admin ? 'Admin DomainDagang' : 'Anda'}
                                 </span>
                                 <span className="text-[9px] text-slate-400">{new Date(reply.created_at).toLocaleString('id-ID')}</span>
                              </div>
                              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                 !reply.is_admin 
                                 ? 'bg-[#F97316] text-white rounded-tr-none' 
                                 : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                              }`}>
                                 {reply.attachments?.map((url, i) => (
                                    <div key={i} className={`mb-3 overflow-hidden rounded-lg border shadow-inner group relative cursor-zoom-in ${!reply.is_admin ? 'border-white/20' : 'border-slate-100'}`}>
                                      <img 
                                        src={`${url}`} 
                                        alt="attachment" 
                                        className="max-w-full max-h-72 object-contain hover:scale-105 transition-transform duration-500" 
                                        onClick={() => window.open(`${url}`, '_blank')}
                                      />
                                    </div>
                                  ))}
                                 <div>{reply.message}</div>
                              </div>
                           </div>
                        ))}
                     </div>

                     {/* Reply Form */}
                     {viewingTicket.status !== 'closed' ? (
                        <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl">
                            {/* Preview Selected File */}
                            {previewUrl && (
                              <div className="mb-3 relative inline-block group">
                                <img src={previewUrl} alt="preview" className="w-20 h-20 object-cover rounded-xl border-2 border-orange-100 shadow-md" />
                                <button 
                                  onClick={removeSelectedFile}
                                  type="button"
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-xs">close</span>
                                </button>
                                {isUploading && (
                                  <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                  </div>
                                )}
                              </div>
                            )}

                            <form onSubmit={handleReply} className="flex items-center gap-3">
                               <input 
                                 type="file"
                                 ref={fileInputRef}
                                 onChange={handleFileChange}
                                 accept="image/*"
                                 className="hidden"
                               />
                               <button 
                                 type="button"
                                 onClick={() => fileInputRef.current.click()}
                                 className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
                                 title="Lampirkan Gambar"
                               >
                                 <span className="material-symbols-outlined">attach_file</span>
                               </button>
                               <input 
                                  type="text"
                                  value={replyMessage}
                                  onChange={e => setReplyMessage(e.target.value)}
                                  placeholder="Tulis balasan Anda di sini..."
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-orange-100 transition focus:border-orange-300"
                               />
                               <button 
                                  type="submit"
                                  disabled={isReplying || (!replyMessage.trim() && !selectedFile)}
                                  className="w-12 h-12 bg-[#F97316] text-white rounded-xl flex items-center justify-center hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 disabled:opacity-50 shrink-0"
                               >
                                  {isReplying ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                               </button>
                            </form>
                        </div>
                     ) : (
                        <div className="p-6 text-center bg-slate-50 rounded-b-xl border-t border-slate-100">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Tiket ini telah ditutup oleh admin.</p>
                        </div>
                     )}
                  </div>
               ) : (
                  /* --- LIST VIEW --- */
                  <div className="space-y-4">
                      {loadingTickets ? (
                        <div className="space-y-4 animate-pulse">
                            {Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-24 bg-white border border-slate-100 rounded-xl shadow-sm"></div>
                            ))}
                        </div>
                      ) : myTickets.length === 0 ? (
                        <div className="bg-white p-16 rounded-xl border border-slate-100 text-center shadow-sm">
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
                               onClick={() => handleViewTicket(ticket)}
                               className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-orange-200 transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6 group"
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

        {/* --- SIDEBAR --- */}
        {!viewingTicket && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="text-xl font-bold mb-4 relative z-10">Pusat Layanan Cepat</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">
                Selain melalui tiket dukungan, Anda juga sangat disarankan untuk melihat direktori FAQ kami yang terus di-update.
              </p>
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-orange-500 text-xl">schedule</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AVG Ticket Response</p>
                    <p className="text-sm font-bold">1 - 2 Jam</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-green-500 text-xl">verified_user</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Keamanan</p>
                    <p className="text-sm font-bold">Enkripsi End-to-End</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Hubungi via Jalur Spesifik</h3>
              <div className="space-y-6">
                <a href={`https://wa.me/${config.company_whatsapp}`} target="_blank" className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-all shrink-0">
                    <i className="fab fa-whatsapp text-xl"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">WhatsApp Support</p>
                    <p className="text-xs text-slate-400 font-medium">Fast response via chat</p>
                  </div>
                </a>
                
                <a href={`mailto:${config.company_email}`} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
                    <span className="material-symbols-outlined text-xl">mail</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{config.company_email}</p>
                    <p className="text-xs text-slate-400 font-medium">Technical Issue & Finance</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;
