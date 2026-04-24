import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-100 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* GRID CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          {/* 1. BRAND & INFO */}
          <div className="space-y-6">
            <Link
              to="/"
              className="flex items-center gap-3 group cursor-pointer"
            >
              <img
                src="/image/logo/ADTLogo.png"
                alt="ADT Logo"
                className="w-10 h-auto object-contain group-hover:scale-110 transition-transform duration-500"
              />
              <span className="font-bold text-2xl text-slate-900 group-hover:text-[#F97316] transition">
                Domain<span className="text-[#F97316]">Dagang</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed">
              Platform jual beli dan manajemen domain termudah di Indonesia.
              Mulai aset digitalmu hari ini.
            </p>
            
            {/* Address */}
            <div className="flex items-start gap-3 text-slate-400">
               <svg className="w-5 h-5 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
               <p className="text-[12px] leading-relaxed">
                 <span className="font-bold text-slate-500 block mb-0.5">PT. Aplikasi Dagang Teknologi</span>
                 Jl. Cigadung Raya Tengah No.52, RT.2, Cigadung, Kec. Cibeunying Kaler, Kota Bandung, Jawa Barat 40191
               </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 pt-2">
                <div className="flex items-center gap-3 text-slate-500 text-xs">
                    <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.588-5.946 0-6.556 5.332-11.888 11.888-11.888 3.176 0 6.161 1.237 8.404 3.48s3.484 5.229 3.484 8.408c0 6.556-5.332 11.888-11.888 11.888-2.003 0-3.963-.505-5.7-1.467l-6.305 1.656zm6.303-4.71c1.667.98 3.323 1.499 5.289 1.499 5.201 0 9.435-4.234 9.435-9.435 0-2.52-0.982-4.888-2.766-6.672-1.784-1.784-4.152-2.766-6.672-2.766-5.201 0-9.435 4.234-9.435 9.435 0 2.093.569 3.863 1.652 5.534l-1.005 3.673 3.772-.991zm10.302-6.903c-.279-.14-1.647-.812-1.903-.905-.256-.092-.441-.139-.627.139-.186.279-.719.905-.881 1.091-.162.186-.325.21-.604.07-.279-.14-1.18-.435-2.247-1.387-.83-.741-1.39-1.654-1.553-1.934-.163-.28-.018-.431.122-.57.126-.125.279-.325.418-.488.14-.163.186-.279.279-.465.093-.186.047-.349-.023-.488-.07-.14-.627-1.511-.859-2.07-.226-.547-.454-.472-.627-.48l-.534-.006c-.186 0-.488.07-.743.349-.256.279-.976.953-.976 2.325s1.001 2.697 1.14 2.883c.14.186 1.968 3.005 4.767 4.213.665.287 1.185.459 1.589.587.669.213 1.278.183 1.758.112.536-.08 1.647-.674 1.879-1.325.233-.651.233-1.209.163-1.325-.07-.116-.256-.186-.535-.326z"/></svg>
                    </div>
                    <span className="font-bold tracking-tight">0812 2242 9289</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-xs">
                    <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <span className="font-bold tracking-tight">0812 2242 9289</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-xs">
                    <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="font-bold tracking-tight lowercase">info@aplikasidagang.co.id</span>
                </div>
            </div>

            {/* Socials - Rebuilt for All requested platforms */}
            <div className="flex flex-wrap gap-2 pt-4">
              {[
                { name: 'Instagram', url: 'https://instagram.com/Jasaweb_pro', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                { name: 'Youtube', url: 'https://youtube.com/@aplikasidagang', icon: 'M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z' },
                { name: 'Facebook', url: 'https://facebook.com/aplikasidagang', icon: 'M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z' },
                { name: 'TikTok', url: 'https://tiktok.com/@aplikasidagang', icon: 'M12.525.02c1.31 0 2.591.21 3.794.602V4.83a4.912 4.912 0 0 1-2.903-.943v10.13a5.027 5.027 0 0 1-5.027 5.027 5.027 5.027 0 0 1-5.027-5.027 5.027 5.027 0 0 1 5.027-5.027c.563 0 1.096.09 1.593.263V.02h2.543z' },
                { name: 'X', url: 'https://x.com/aplikasidagang', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#F97316] hover:text-white transition shadow-sm border border-slate-100"
                  title={social.name}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* 2. LAYANAN */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">
              Layanan
            </h4>
            <ul className="space-y-3 text-slate-500 text-sm font-medium">
              <li>
                <Link to="/domain" className="hover:text-[#F97316] transition">
                  Daftar Harga Domain
                </Link>
              </li>
              <li>
                <Link
                  to="/transfer"
                  className="hover:text-[#F97316] transition"
                >
                  Transfer Domain
                </Link>
              </li>
              <li>
                <Link to="/promo" className="hover:text-[#F97316] transition">
                  Promo Terbaru
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-[#F97316] transition">
                  Keranjang Belanja
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. BANTUAN */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">
              Bantuan
            </h4>
            <ul className="space-y-3 text-slate-500 text-sm font-medium">
              <li>
                <Link to="/login" className="hover:text-[#F97316] transition">
                  Member Area
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#F97316] transition">
                  Pendaftaran Akun
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-[#F97316] transition">
                  Lupa Password
                </Link>
              </li>
              <li>
                <a 
                  href="https://wa.me/6281222429289" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-[#F97316] transition"
                >
                  Kontak Support
                </a>
              </li>
            </ul>
          </div>

          {/* 4. PEMBAYARAN */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">
              Pembayaran
            </h4>
            <p className="text-slate-500 text-xs mb-3">
              Otomatis verifikasi 24 jam.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["BCA", "Mandiri", "BRI", "BNI", "QRIS", "GoPay"].map((bank) => (
                <div
                  key={bank}
                  className="bg-slate-50 text-slate-600 px-2 py-1.5 rounded text-[10px] font-bold border border-slate-200 text-center hover:border-[#F97316] transition cursor-default"
                >
                  {bank}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-xs">
            &copy; 2026 PT. Aplikasi Dagang Teknologi. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-slate-400 font-medium">
            <a href="#" className="hover:text-slate-600">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-slate-600">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
