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

  const [formData, setFormData] = useState({ question: "", answer: "", category: "Umum", order_num: 0 });

  const fetchFaqs = async () => {
    try {
      const response = await api.get("/faqs");
      setFaqs(response.data);
    } catch (err) {
      error("Gagal memuat FAQ atau terjadi kesalahan jaringan");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchFaqs(); }, []);

  const handleOpenModal = (faq = null) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({ question: faq.question, answer: faq.answer, category: faq.category || "Umum", order_num: faq.order_num || 0 });
    } else {
      setEditingFaq(null);
      setFormData({ question: "", answer: "", category: "Umum", order_num: faqs.length });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingFaq(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFaq) {
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
    if (await confirm({ title: "Hapus FAQ", message: "Yakin ingin menghapus FAQ ini?", type: "danger", confirmText: "Ya, Hapus" })) {
      try {
        await api.delete(`/faqs/${id}`);
        success("FAQ berhasil dihapus");
        fetchFaqs();
      } catch (err) {
        error("Gagal menghapus FAQ atau masalah jaringan");
      }
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            FAQ Management
          </p>
          <h2 className="text-base font-bold text-neutral-800 tracking-tight">Daftar Pertanyaan</h2>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary btn-sm">
          <span className="material-symbols-outlined text-sm">add</span>
          Tambah FAQ
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Urutan</th>
              <th>Pertanyaan & Jawaban</th>
              <th style={{ width: 100, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" className="text-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-neutral-100 border-t-primary-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Memuat data...</p>
                </div>
              </td></tr>
            ) : faqs.length === 0 ? (
              <tr><td colSpan="3" className="text-center py-12 text-neutral-400 text-xs font-semibold">Belum ada daftar FAQ.</td></tr>
            ) : faqs.map((faq) => (
              <tr key={faq.id}>
                <td>
                  <span className="bg-neutral-100 px-3 py-1 rounded-lg text-[10px] font-bold text-neutral-500 border border-neutral-200">
                    #{faq.order_num}
                  </span>
                </td>
                <td>
                  <span className="badge badge-neutral mb-2 d-inline-block">{faq.category}</span>
                  <h3 className="text-sm font-bold text-neutral-800 mb-1 leading-tight">{faq.question}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed whitespace-pre-wrap max-w-2xl line-clamp-2">{faq.answer}</p>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleOpenModal(faq)} className="btn btn-ghost btn-icon btn-sm" title="Edit FAQ">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDelete(faq.id)} className="btn btn-ghost btn-icon btn-sm" title="Hapus FAQ" style={{ color: "var(--color-rose-500)" }}>
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>{editingFaq ? "Edit FAQ" : "Tambah FAQ Baru"}</h3>
              <button onClick={handleCloseModal} style={{ width: 32, height: 32, background: "var(--color-neutral-50)", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-neutral-400)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div className="form-group">
                  <label className="form-label">Pertanyaan</label>
                  <input type="text" required value={formData.question} onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    className="form-input" placeholder="Contoh: Bagaimana cara transfer domain?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Jawaban</label>
                  <textarea required rows="4" value={formData.answer} onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                    className="form-input" style={{ minHeight: 100, resize: "vertical" }} placeholder="Jawaban lengkap..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Urutan</label>
                    <input type="number" value={formData.order_num} onChange={(e) => setFormData({ ...formData, order_num: parseInt(e.target.value) || 0 })}
                      className="form-input" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={handleCloseModal} className="btn btn-ghost">Batal</button>
                <button type="submit" className="btn btn-primary">Simpan FAQ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFAQs;
