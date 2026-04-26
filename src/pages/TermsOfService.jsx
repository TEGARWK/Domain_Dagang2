import React from "react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <h1 className="text-[44px] lg:text-[56px] font-bold text-slate-900 mb-6 tracking-tight leading-[1.1]">
          Terms of <span className="text-[#F97316]">Service</span>
        </h1>
        <p className="text-[17px] text-slate-500 font-medium leading-relaxed mb-12 italic">
          Terakhir diperbarui: 27 April 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-10 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Ketentuan Umum</h2>
            <p>
              Dengan mengakses dan menggunakan platform DomainDagang, Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Layanan kami disediakan oleh PT. Aplikasi Dagang Teknologi, sebuah perusahaan yang tunduk pada hukum Republik Indonesia.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Pendaftaran Domain</h2>
            <p>
              Setiap pendaftaran domain tunduk pada ketersediaan dan aturan yang ditetapkan oleh masing-masing Registry (misalnya PANDI untuk domain .ID atau ICANN untuk domain global). Anda bertanggung jawab penuh atas keakuratan data WHOIS yang Anda berikan.
            </p>
          </section>

          <section className="bg-orange-50 p-8 rounded-2xl border border-orange-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Pembayaran dan Perpanjangan</h2>
            <p>
              Semua transaksi bersifat final. Domain yang telah didaftarkan tidak dapat dibatalkan atau direfund kecuali ditentukan lain oleh kebijakan registrar. Anda bertanggung jawab untuk memantau masa aktif domain Anda dan melakukan perpanjangan tepat waktu untuk menghindari kehilangan kepemilikan domain.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Batasan Tanggung Jawab</h2>
            <p>
              DomainDagang tidak bertanggung jawab atas kerugian bisnis, kehilangan data, atau sengketa merek dagang yang timbul dari pemilihan nama domain oleh pengguna. Kami bertindak sebagai perantara teknis antara Anda dan Registry/Registrar resmi.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Perubahan Ketentuan</h2>
            <p>
              Kami berhak untuk mengubah syarat dan ketentuan ini sewaktu-waktu. Perubahan akan berlaku segera setelah dipublikasikan di halaman ini. Penggunaan berkelanjutan atas layanan kami setelah perubahan tersebut dianggap sebagai persetujuan Anda terhadap ketentuan baru.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
