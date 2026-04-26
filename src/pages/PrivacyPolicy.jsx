import React from "react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <h1 className="text-[44px] lg:text-[56px] font-bold text-slate-900 mb-6 tracking-tight leading-[1.1]">
          Privacy <span className="text-[#F97316]">Policy</span>
        </h1>
        <p className="text-[17px] text-slate-500 font-medium leading-relaxed mb-12 italic">
          Terakhir diperbarui: 27 April 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-10 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Pendahuluan</h2>
            <p>
              Selamat datang di DomainDagang (PT. Aplikasi Dagang Teknologi). Kami sangat menghargai privasi Anda dan berkomitmen untuk melindungi data pribadi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda saat menggunakan layanan kami.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Informasi yang Kami Kumpulkan</h2>
            <p>
              Kami mengumpulkan informasi yang Anda berikan langsung kepada kami saat mendaftar akun, melakukan pembelian domain, atau menghubungi dukungan pelanggan. Informasi ini meliputi:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Nama lengkap dan informasi kontak (email, nomor telepon).</li>
              <li>Data identitas untuk verifikasi pendaftaran domain .ID (KTP/Passport).</li>
              <li>Informasi alamat untuk keperluan penagihan dan administrasi registrar.</li>
              <li>Data transaksi dan riwayat pembayaran.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Penggunaan Informasi</h2>
            <p>
              Informasi Anda digunakan untuk:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Memproses pendaftaran dan manajemen domain Anda ke Registrar.</li>
              <li>Mengirimkan invoice, pengingat masa aktif domain, dan notifikasi keamanan.</li>
              <li>Meningkatkan layanan kami dan memberikan dukungan teknis.</li>
              <li>Kepatuhan terhadap regulasi PANDI (Pengelola Nama Domain Internet Indonesia).</li>
            </ul>
          </section>

          <section className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Keamanan Data</h2>
            <p>
              Kami menggunakan teknologi enkripsi SSL (Secure Socket Layer) dan protokol keamanan standar industri untuk melindungi data Anda. Kami tidak akan pernah menjual atau memberikan data pribadi Anda kepada pihak ketiga untuk tujuan pemasaran tanpa izin eksplisit dari Anda.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Kontak Kami</h2>
            <p>
              Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, silakan hubungi kami melalui email di <span className="text-[#F97316] font-bold">admin@aplikasidagang.co.id</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
