import React, { useState, useEffect, useRef } from "react";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";
import { useConfig } from "../../context/ConfigContext";

const AdminSupportTickets = () => {
  const config = useConfig();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useNotification();
  const chatEndRef = useRef(null);

  // Attachment States
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await api.get(`/support/tickets/${ticketId}`);
      setSelectedTicket(response.data);
      scrollToBottom();
    } catch (err) {
      error("Gagal mengambil detail tiket");
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() && !selectedFile) return;
    if (!selectedTicket) return;

    setIsSubmitting(true);
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
      const res = await api.post(`/support/tickets/${selectedTicket.id}/replies`, {
        message: replyText.trim(),
        attachments
      });
      
      // 3. Update local state
      setSelectedTicket(prev => ({
        ...prev,
        replies: [...(prev.replies || []), { ...res.data.reply, sender_name: "Admin" }],
        status: 'answered'
      }));
      
      setReplyText("");
      removeSelectedFile();
      success("Balasan terkirim");
      fetchTickets(); // Refresh list to update status
    } catch (err) {
      error("Gagal mengirim balasan");
      setIsUploading(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      await api.put(`/support/tickets/${selectedTicket.id}/status`, { status: newStatus });
      setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      success(`Status diubah menjadi ${newStatus}`);
      fetchTickets();
    } catch (err) {
      error("Gagal merubah status");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-bold uppercase tracking-widest border border-blue-100">TERBUKA</span>;
      case "answered":
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-bold uppercase tracking-widest border border-emerald-100">DIBALAS</span>;
      case "closed":
        return <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded text-[8px] font-bold uppercase tracking-widest border border-slate-100">SELESAI</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[8px] font-bold uppercase tracking-widest border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="p-1 md:p-2 lg:p-3 w-full h-[calc(100vh-90px)] animate-[fadeIn_0.5s_ease-out] flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 flex-1 overflow-hidden">
        
        {/* LEFT COLUMN: TICKET LIST (1/4 = 25%) */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
          <div className="p-2 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between shrink-0">
             <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tighter text-[10px]">Tiket Masuk</h3>
                <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-widest leading-none">Total: {tickets.length}</p>
             </div>
             <div className="bg-[#F97316] text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                {tickets.filter(t => t.status === 'open').length} New
             </div>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar flex-1 p-1 space-y-1.5">
            {loading ? (
                Array(6).fill(0).map((_, i) => (
                    <div key={i} className="p-3 rounded-xl border border-slate-50 animate-pulse bg-white">
                        <div className="flex justify-between mb-2">
                            <div className="h-3 w-12 bg-slate-100 rounded"></div>
                            <div className="h-3 w-10 bg-slate-50 rounded"></div>
                        </div>
                        <div className="h-4 w-3/4 bg-slate-100 rounded mb-3"></div>
                        <div className="flex justify-between">
                            <div className="h-3 w-20 bg-slate-50 rounded"></div>
                            <div className="h-3 w-8 bg-slate-50 rounded"></div>
                        </div>
                    </div>
                ))
            ) : tickets.length === 0 ? (
              <p className="text-center py-10 text-slate-400 font-bold text-[9px] uppercase">No Tickets Found</p>
            ) : (
               tickets.map(ticket => (
                  <div 
                    key={ticket.id}
                    onClick={() => fetchTicketDetails(ticket.id)}
                    className={`p-1.5 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedTicket?.id === ticket.id 
                      ? 'bg-orange-50/30 border-[#F97316]' 
                      : 'bg-white border-slate-50 hover:border-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[8px] font-bold text-slate-400 opacity-60">#T-{String(ticket.id).padStart(5, '0')}</span>
                       {getStatusBadge(ticket.status)}
                    </div>
                    <h4 className="font-bold text-[11px] leading-tight mb-2 line-clamp-1 text-slate-800">{ticket.subject}</h4>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                             {ticket.user_name?.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-[9px] text-slate-500 font-semibold truncate max-w-[80px]">{ticket.user_name}</p>
                       </div>
                       <span className="text-[8px] text-slate-300 font-semibold">{new Date(ticket.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>
               ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT INTERFACE (3/4 = 75%) */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-lg border border-slate-100 h-full flex flex-col overflow-hidden relative">
           {!selectedTicket ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/20">
                 <span className="material-symbols-outlined text-4xl mb-2 opacity-20">forum</span>
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Select a ticket to respond</p>
              </div>
           ) : (
              <>
                 {/* Header Detail - COMPACT */}
                 <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 relative z-10">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
                          <span className="material-symbols-outlined text-xl">person</span>
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-0.5">
                             <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-none">{selectedTicket.subject}</h2>
                             {getStatusBadge(selectedTicket.status)}
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-semibold text-[#F97316]">{selectedTicket.user_name}</span>
                             <span className="text-slate-300 text-[10px]">•</span>
                             <span className="text-[10px] text-slate-400 font-medium">{selectedTicket.user_email}</span>
                          </div>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {selectedTicket.status !== 'closed' ? (
                          <button 
                             onClick={() => updateStatus('closed')}
                             className="px-4 py-2 rounded-lg text-[10px] font-bold bg-slate-50 text-slate-500 hover:bg-slate-100 transition border border-slate-200"
                          >
                             CLOSE TICKET
                          </button>
                       ) : (
                          <button 
                             onClick={() => updateStatus('open')}
                             className="px-4 py-2 rounded-lg text-[10px] font-bold bg-orange-50 text-[#F97316] hover:bg-orange-100 transition border border-orange-100"
                          >
                             RE-OPEN TICKET
                          </button>
                       )}
                    </div>
                 </div>

                 {/* Conversation Thread - FLEX-1 TO FILL SPACE */}
                 <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-3 custom-scrollbar bg-[#FAFAFA]">
                    {/* User's Original Message */}
                    <div className="flex flex-col items-start max-w-[85%]">
                       <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[10px] font-semibold text-slate-900 uppercase tracking-widest">{selectedTicket.user_name}</span>
                          <span className="text-[9px] text-slate-400 font-semibold">{new Date(selectedTicket.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                       <div className="bg-white p-2.5 rounded-xl rounded-tl-none border border-slate-100 shadow-sm text-xs text-slate-700 leading-relaxed font-medium">
                          {selectedTicket.attachments?.map((url, i) => (
                            <div key={i} className="mb-3 overflow-hidden rounded-xl border border-slate-100 shadow-inner group relative cursor-zoom-in">
                              <img 
                                src={`${url}`} 
                                alt="attachment" 
                                className="max-w-full max-h-[400px] object-contain transition-transform duration-300" 
                                onClick={() => window.open(`${url}`, '_blank')}
                              />
                            </div>
                          ))}
                          <div>{selectedTicket.message}</div>
                       </div>
                    </div>

                    {/* Replies */}
                    {selectedTicket.replies?.map((reply, idx) => (
                       <div key={reply.id || idx} className={`flex flex-col ${reply.is_admin ? 'items-end ml-auto' : 'items-start'} max-w-[85%]`}>
                          <div className={`flex items-center gap-2 mb-1 px-1 ${reply.is_admin ? 'flex-row-reverse' : ''}`}>
                             <span className={`text-[10px] font-semibold uppercase tracking-widest ${reply.is_admin ? 'text-[#F97316]' : 'text-slate-900'}`}>
                                {reply.is_admin ? 'Admin' : selectedTicket.user_name}
                             </span>
                             <span className="text-[9px] text-slate-400 font-semibold">{new Date(reply.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`p-2.5 rounded-xl text-xs leading-relaxed shadow-sm font-medium ${
                             reply.is_admin 
                             ? 'bg-slate-900 text-white rounded-tr-none' 
                             : 'bg-[#F97316] text-white rounded-tl-none'
                          }`}>
                             {reply.attachments?.map((url, i) => (
                                <div key={i} className={`mb-3 overflow-hidden rounded-xl border shadow-inner group relative cursor-zoom-in ${reply.is_admin ? 'border-slate-800' : 'border-orange-400'}`}>
                                  <img 
                                    src={`${url}`} 
                                    alt="attachment" 
                                    className="max-w-full max-h-[400px] object-contain transition-transform duration-300" 
                                    onClick={() => window.open(`${url}`, '_blank')}
                                  />
                                </div>
                              ))}
                             <div>{reply.message}</div>
                          </div>
                       </div>
                    ))}
                    <div ref={chatEndRef} />
                 </div>

                 {/* Admin Reply Form - COMPACT */}
                 <div className="p-2 border-t border-slate-100 bg-white shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                    {/* Preview Selected File */}
                    {previewUrl && (
                      <div className="mb-3 relative inline-block">
                         <img src={previewUrl} alt="preview" className="w-20 h-20 object-cover rounded-xl border-2 border-slate-100 shadow-lg" />
                         <button 
                           onClick={removeSelectedFile}
                           type="button"
                           className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all"
                         >
                           <span className="material-symbols-outlined text-[10px]">close</span>
                         </button>
                         {isUploading && (
                           <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
                             <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                           </div>
                         )}
                      </div>
                    )}

                    <form onSubmit={handleSendReply} className="relative flex items-center gap-3">
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
                         className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition-all border border-slate-100"
                       >
                         <span className="material-symbols-outlined text-lg">attach_file</span>
                       </button>

                       <textarea 
                          rows="1"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                          placeholder="Type a message..."
                          className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 ring-orange-100 transition-all focus:border-[#F97316] resize-none custom-scrollbar"
                       />

                       <button 
                          type="submit"
                          disabled={isSubmitting || (!replyText.trim() && !selectedFile)}
                          className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-black transition-all shadow-lg disabled:opacity-50"
                       >
                          {isSubmitting ? (
                             <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                          ) : (
                             <span className="material-symbols-outlined text-xl">send</span>
                          )}
                       </button>
                    </form>
                 </div>
              </>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportTickets;
