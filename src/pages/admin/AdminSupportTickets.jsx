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
    } finally { setLoading(false); }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await api.get(`/support/tickets/${ticketId}`);
      setSelectedTicket(response.data);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      error("Gagal mengambil detail tiket");
    }
  };

  useEffect(() => { fetchTickets(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selectedTicket]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return error("Ukuran file maksimal 5MB");
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
      if (selectedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', selectedFile);
        const uploadRes = await api.post('/upload/support', formData);
        if (uploadRes.data.success) attachments = [uploadRes.data.imageUrl];
        setIsUploading(false);
      }
      const res = await api.post(`/support/tickets/${selectedTicket.id}/replies`, { message: replyText.trim(), attachments });
      setSelectedTicket(prev => ({
        ...prev, replies: [...(prev.replies || []), { ...res.data.reply, sender_name: "Admin" }], status: 'answered'
      }));
      setReplyText("");
      removeSelectedFile();
      success("Balasan terkirim");
      fetchTickets();
    } catch (err) {
      error("Gagal mengirim balasan");
      setIsUploading(false);
    } finally { setIsSubmitting(false); }
  };

  const updateStatus = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      await api.put(`/support/tickets/${selectedTicket.id}/status`, { status: newStatus });
      setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      success(`Status diubah menjadi ${newStatus}`);
      fetchTickets();
    } catch (err) { error("Gagal merubah status"); }
  };

  const statusBadge = (status) => {
    const map = { open: "badge-info", answered: "badge-success", closed: "badge-neutral" };
    return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status === 'open' ? 'Terbuka' : status === 'answered' ? 'Dibalas' : 'Selesai'}</span>;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 animate-fade-in" style={{ height: 'calc(100vh - 96px)' }}>
      {/* Left: Ticket List */}
      <div className="lg:col-span-1 card flex flex-col overflow-hidden" style={{ padding: 0 }}>
        <div className="flex items-center justify-between p-3 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
          <div>
            <p className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider">Tiket Masuk</p>
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Total: {tickets.length}</p>
          </div>
          <span className="badge badge-info">{tickets.filter(t => t.status === 'open').length} Baru</span>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1.5">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="p-3 rounded-xl border border-neutral-50 animate-pulse">
                <div className="flex justify-between mb-2"><div className="h-3 w-12 bg-neutral-100 rounded" /><div className="h-3 w-10 bg-neutral-50 rounded" /></div>
                <div className="h-4 w-3/4 bg-neutral-100 rounded mb-3" />
                <div className="flex justify-between"><div className="h-3 w-20 bg-neutral-50 rounded" /><div className="h-3 w-8 bg-neutral-50 rounded" /></div>
              </div>
            ))
          ) : tickets.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 16px" }}>
              <div className="empty-state-icon"><span className="material-symbols-outlined">forum</span></div>
              <p>Belum ada tiket</p>
            </div>
          ) : tickets.map(ticket => (
            <div key={ticket.id} onClick={() => fetchTicketDetails(ticket.id)}
              className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-primary-50/30 border-primary-300' : 'bg-white border-neutral-50 hover:border-neutral-200'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[8px] font-bold text-neutral-400">#T-{String(ticket.id).padStart(5, '0')}</span>
                {statusBadge(ticket.status)}
              </div>
              <p className="text-[11px] font-bold text-neutral-800 leading-tight mb-2 line-clamp-1">{ticket.subject}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-neutral-100 flex items-center justify-center text-[8px] font-bold text-neutral-500">{ticket.user_name?.charAt(0).toUpperCase()}</div>
                  <span className="text-[9px] text-neutral-500 font-semibold truncate max-w-[80px]">{ticket.user_name}</span>
                </div>
                <span className="text-[8px] text-neutral-300 font-semibold">{new Date(ticket.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Chat Interface */}
      <div className="lg:col-span-3 card flex flex-col overflow-hidden" style={{ padding: 0 }}>
          {!selectedTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 bg-neutral-50/20">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-20">forum</span>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Pilih tiket untuk merespon</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-neutral-100 bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-neutral-50 text-neutral-400 flex items-center justify-center border border-neutral-100">
                    <span className="material-symbols-outlined text-lg">person</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-neutral-800 tracking-tight">{selectedTicket.subject}</h3>
                      {statusBadge(selectedTicket.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-primary-500">{selectedTicket.user_name}</span>
                      <span className="text-neutral-300 text-[10px]">•</span>
                      <span className="text-[10px] text-neutral-400 font-semibold">{selectedTicket.user_email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTicket.status !== 'closed' ? (
                    <button onClick={() => updateStatus('closed')} className="btn btn-ghost btn-sm">Close Ticket</button>
                  ) : (
                    <button onClick={() => updateStatus('open')} className="btn btn-ghost btn-sm">Re-open Ticket</button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-neutral-50/30">
                {/* Original Message */}
                <div className="flex flex-col items-start max-w-[85%]">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider">{selectedTicket.user_name}</span>
                    <span className="text-[9px] text-neutral-400 font-semibold">{new Date(selectedTicket.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl rounded-tl-none border border-neutral-100 shadow-sm text-xs text-neutral-700 leading-relaxed font-medium">
                    {selectedTicket.attachments?.map((url, i) => (
                      <div key={i} className="mb-3 overflow-hidden rounded-xl border border-neutral-100 cursor-pointer">
                        <img src={`${url}`} alt="attachment" className="max-w-full max-h-[400px] object-contain" onClick={() => window.open(`${url}`, '_blank')} />
                      </div>
                    ))}
                    <div>{selectedTicket.message}</div>
                  </div>
                </div>

                {/* Replies */}
                {selectedTicket.replies?.map((reply, idx) => (
                  <div key={reply.id || idx} className={`flex flex-col ${reply.is_admin ? 'items-end ml-auto' : 'items-start'} max-w-[85%]`}>
                    <div className={`flex items-center gap-2 mb-1 px-1 ${reply.is_admin ? 'flex-row-reverse' : ''}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${reply.is_admin ? 'text-primary-500' : 'text-neutral-700'}`}>
                        {reply.is_admin ? 'Admin' : selectedTicket.user_name}
                      </span>
                      <span className="text-[9px] text-neutral-400 font-semibold">{new Date(reply.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`p-3 rounded-xl text-xs leading-relaxed shadow-sm font-medium ${reply.is_admin ? 'bg-neutral-800 text-white rounded-tr-none' : 'bg-primary-500 text-white rounded-tl-none'}`}>
                      {reply.attachments?.map((url, i) => (
                        <div key={i} className={`mb-3 overflow-hidden rounded-xl border cursor-pointer ${reply.is_admin ? 'border-neutral-700' : 'border-primary-400'}`}>
                          <img src={`${url}`} alt="attachment" className="max-w-full max-h-[400px] object-contain" onClick={() => window.open(`${url}`, '_blank')} />
                        </div>
                      ))}
                      <div>{reply.message}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Reply Form */}
              <div className="p-3 border-t border-neutral-100 bg-white shrink-0">
                {previewUrl && (
                  <div className="mb-3 relative inline-block">
                    <img src={previewUrl} alt="preview" className="w-20 h-20 object-cover rounded-xl border-2 border-neutral-100 shadow" />
                    <button onClick={removeSelectedFile} type="button"
                      style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, background: "#ef4444", color: "#fff", borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                    </button>
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-neutral-800 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                )}
                <form onSubmit={handleSendReply} className="flex items-center gap-3">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current.click()} className="btn btn-ghost btn-sm" style={{ width: 36, height: 36, padding: 0 }}>
                    <span className="material-symbols-outlined text-sm">attach_file</span>
                  </button>
                  <textarea rows="1" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                    placeholder="Ketik pesan..." className="form-input" style={{ flex: 1, minHeight: 40, maxHeight: 100, resize: "none", borderRadius: 10 }} />
                  <button type="submit" disabled={isSubmitting || (!replyText.trim() && !selectedFile)}
                    className="btn btn-primary" style={{ width: 36, height: 36, padding: 0, minWidth: 36 }}>
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-sm">send</span>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
  );
};

export default AdminSupportTickets;
