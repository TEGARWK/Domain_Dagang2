import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import { useConfirm } from "../../context/ConfirmContext";
import api from "../../services/api";

const AdminFAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const { success, error } = useNotification();
  const confirm = useConfirm();

  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "Umum",
    order_num: 0,
  });

  const fetchFaqs = async () => {
    try {
      const response = await api.get("/faqs");
      setFaqs(response.data);
    } catch (err) {
      error("Gagal memuat FAQ atau terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleOpenModal = (faq = null) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        category: faq.category || "Umum",
        order_num: faq.order_num || 0,
      });
    } else {
      setEditingFaq(null);
      setFormData({
        question: "",
        answer: "",
        category: "Umum",
        order_num: faqs.length,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFaq(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingFaq;
    
    try {
      if (isEditing) {
        await api.put(`/faqs/${editingFaq.id}`, formData);
        success("FAQ berhasil diperbarui");
      } else {
        await api.post("/faqs", formData);
        success("FAQ berhasil ditambahkan");
      }
      fetchFaqs();
      handleCloseModal();
    } catch (err) {
      error(err.response?.data?.error || "Kesalahan saat menyimpan FAQ");
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
        title: "Hapus FAQ",
        message: "Yakin ingin menghapus FAQ ini?",
        type: "danger",
        confirmText: "Ya, Hapus"
    });
    if (!isConfirmed) return;

    try {
      await api.delete(`/faqs/${id}`);
      success("FAQ berhasil dihapus");
      fetchFaqs();
    } catch (err) {
      error("Gagal menghapus FAQ atau masalah jaringan");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-[#F97316] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-orange-600/20 flex items-center gap-3 group active:scale-95"
        >
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-90 transition-transform">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          Tambah FAQ
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="p-4 sm:p-8 border-b border-slate-50 bg-slate-50/30">
          <h3 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">Daftar Pertanyaan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-8 py-5">Urutan</th>
                <th className="px-8 py-5">Pertanyaan & Jawaban</th>
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="3" className="py-20 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-slate-100 border-t-[#F97316] rounded-full mx-auto"></div>
                    <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Sinkronisasi Data...</p>
                  </td>
                </tr>
              ) : faqs.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-20 text-center text-slate-400 font-medium">
                    Belum ada daftar FAQ.
                  </td>
                </tr>
              ) : (
                faqs.map((faq) => (
                  <tr key={faq.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg text-[10px] font-extrabold uppercase tracking-widest shadow-sm group-hover:bg-orange-50 group-hover:border-orange-100 transition-all">
                        #{faq.order_num}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[8px] font-bold uppercase tracking-widest">
                          {faq.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 mb-1 leading-tight tracking-tight">
                        {faq.question}
                      </h3>
                      <p className="text-slate-500 text-xs leading-relaxed whitespace-pre-wrap max-w-2xl line-clamp-2" title={faq.answer}>
                        {faq.answer}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(faq)}
                          className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 rounded-lg hover:bg-orange-950 hover:text-white border border-slate-100 transition-all shadow-sm active:scale-90"
                          title="Edit FAQ"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit_note</span>
                        </button>
                        <button
                          onClick={() => handleDelete(faq.id)}
                          className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-500 border border-slate-100 transition-all shadow-sm active:scale-90"
                          title="Hapus FAQ"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH/EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {editingFaq ? "Edit FAQ" : "Tambah FAQ Baru"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                  Pertanyaan (Question)
                </label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-medium text-slate-800 outline-none focus:ring-4 ring-orange-100 transition focus:border-orange-300"
                  placeholder="Contoh: Bagaimana cara transfer domain?"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                  Jawaban (Answer)
                </label>
                <textarea
                  required
                  rows="4"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-medium text-slate-800 outline-none focus:ring-4 ring-orange-100 transition focus:border-orange-300 custom-scrollbar"
                  placeholder="Jawaban lengkap..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                    Kategori Bantuan
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-medium text-slate-800 outline-none focus:ring-4 ring-orange-100 transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                    Urutan Tampil (No)
                  </label>
                  <input
                    type="number"
                    value={formData.order_num}
                    onChange={(e) => setFormData({ ...formData, order_num: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-medium text-slate-800 outline-none focus:ring-4 ring-orange-100 transition"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-[#F97316] text-white rounded-lg font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/30"
                >
                  Simpan FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFAQs;
