import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const Footer = () => {
  const [payments, setPayments] = useState([]);
  // State site settings: key-value flat object dari API
  const [settings, setSettings] = useState({});

  useEffect(() => {
    // Fetch payment gateways untuk kolom "Pembayaran"
    const fetchPayments = async () => {
      try {
        const res = await api.get("/payment-gateways");
        if (Array.isArray(res.data)) setPayments(res.data);
      } catch (err) {
        console.error("Failed to fetch payment gateways for footer:", err);
      }
    };

    // Fetch site settings (nama perusahaan, alamat, sosmed, copyright, dll)
    const fetchSettings = async () => {
      try {
        const res = await api.get("/content/site-settings");
        if (res.data?.success) setSettings(res.data.data);
      } catch (err) {
        console.error("Failed to fetch site settings for footer:", err);
      }
    };

    fetchPayments();
    fetchSettings();
  }, []);

  // Helper: ambil value dari settings dengan fallback
  const s = (key, fallback = "") => settings[key] ?? fallback;

  // Data sosial media dari settings
  const socials = [
    {
      name: "Instagram",
      url: s("footer_instagram"),
      icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
    },
    {
      name: "Youtube",
      url: s("footer_youtube"),
      icon: "M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z",
    },
    {
      name: "Facebook",
      url: s("footer_facebook"),
      icon: "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z",
    },
    {
      name: "TikTok",
      url: s("footer_tiktok"),
      icon: "M12.525.02c1.31 0 2.591.21 3.794.602V4.83a4.912 4.912 0 0 1-2.903-.943v10.13a5.027 5.027 0 0 1-5.027 5.027 5.027 5.027 0 0 1-5.027-5.027 5.027 5.027 0 0 1 5.027-5.027c.563 0 1.096.09 1.593.263V.02h2.543z",
    },
    {
      name: "X",
      url: s("footer_x"),
      icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    },
  ].filter((social) => social.url); // Hanya tampilkan sosmed yang URL-nya sudah diisi

  return (
    <footer className="bg-white border-t border-slate-100 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* GRID CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          {/* 1. BRAND & INFO */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3 group cursor-pointer">
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

            {/* Alamat & Kontak — dari site_settings */}
            {(s("footer_address") || s("company_whatsapp") || s("footer_whatsapp") || s("company_email") || s("footer_support_email")) && (
              <div className="space-y-3">
                {s("footer_address") && (
                  <div className="flex items-start gap-3 text-slate-400">
                    <svg className="w-4 h-4 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-[12px] leading-relaxed">
                      {s("footer_company_name") && (
                        <span className="font-bold text-slate-500 block mb-0.5 uppercase tracking-wider">
                          {s("footer_company_name")}
                        </span>
                      )}
                      {s("footer_address")}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pl-7">
                  {(s("company_whatsapp") || s("footer_whatsapp")) && (
                    <a href={`https://wa.me/${(s("company_whatsapp") || s("footer_whatsapp")).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-green-500 transition-colors text-[12px] font-medium">
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      {s("company_whatsapp") || s("footer_whatsapp")}
                    </a>
                  )}
                  {(s("company_email") || s("footer_support_email")) && (
                    <a href={`mailto:${s("company_email") || s("footer_support_email")}`} className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors text-[12px] font-medium">
                      <span className="material-symbols-outlined text-[16px]">mail</span>
                      {s("company_email") || s("footer_support_email")}
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Link
                to="/dashboard/support"
                className="inline-flex items-center gap-2.5 bg-orange-50 hover:bg-orange-500 border border-orange-200 hover:border-orange-500 text-orange-600 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-300 group/cta"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Hubungi Support via Tiket</span>
                <svg className="w-3.5 h-3.5 group-hover/cta:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Sosial Media Dinamis — dari site_settings.social_links */}
            {Array.isArray(settings.social_links) && settings.social_links.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {settings.social_links.map((social, index) => {
                  const getIcon = (platform) => {
                    const p = (platform || '').toLowerCase();
                    if (p.includes('ig') || p.includes('instagram')) return "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z";
                    if (p.includes('yt') || p.includes('youtube')) return "M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z";
                    if (p.includes('fb') || p.includes('facebook')) return "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z";
                    if (p.includes('tiktok')) return "M12.525.02c1.31 0 2.591.21 3.794.602V4.83a4.912 4.912 0 0 1-2.903-.943v10.13a5.027 5.027 0 0 1-5.027 5.027 5.027 5.027 0 0 1-5.027-5.027 5.027 5.027 0 0 1 5.027-5.027c.563 0 1.096.09 1.593.263V.02h2.543z";
                    if (p.includes('x') || p.includes('twitter')) return "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";
                    return "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z";
                  };

                  return (
                    <a
                      key={index}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#F97316] hover:text-white transition shadow-sm border border-slate-100"
                      title={social.platform}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d={getIcon(social.platform)} />
                      </svg>
                    </a>
                  );
                })}
              </div>
            )}
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
                <Link to="/transfer" className="hover:text-[#F97316] transition">
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
                <Link to="/dashboard/support" className="hover:text-[#F97316] transition">
                  Tiket Support
                </Link>
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
              {payments.length > 0 ? (
                payments.slice(0, 9).map((pay) => {
                   const getBankLogo = (code) => {
                      const bankCode = code ? String(code).toLowerCase() : '';
                      if (bankCode === '014' || bankCode.includes('bca')) return '/image/banks/bca.png';
                      if (bankCode === '008' || bankCode.includes('mandiri')) return '/image/banks/mandiri.png';
                      if (bankCode === '009' || bankCode.includes('bni')) return '/image/banks/bni.png';
                      if (bankCode === '002' || bankCode.includes('bri')) return '/image/banks/bri.png';
                      if (bankCode === '013' || bankCode.includes('permata')) return '/image/banks/permata.png';
                      if (bankCode === '011' || bankCode.includes('danamon')) return '/image/banks/danamon.png';
                      if (bankCode === '451' || bankCode.includes('bsi')) return '/image/banks/bsi.png';
                      if (bankCode.includes('qris') || bankCode === 'qr' || bankCode === 'qris') return '/image/banks/qris.png';
                      if (bankCode === 'cc' || bankCode === 'credit_card') return '/image/banks/visa_master.png';
                      if (!bankCode) return '/image/banks/generic.png'; // Fallback jika kode kosong
                      return `/image/banks/${bankCode}.png`;
                  };
                  return (
                    <div
                      key={pay.code}
                      className="bg-white border border-slate-100 p-2 rounded-lg flex items-center justify-center hover:border-orange-200 transition shadow-sm h-10"
                      title={pay.name}
                    >
                      <img src={getBankLogo(pay.code)} className="h-4 object-contain" alt={pay.name} />
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 text-[10px] text-slate-400 italic">
                  Otomatis verifikasi 24 jam.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COPYRIGHT — dari site_settings */}
        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-xs">
            {s("footer_copyright", `© ${new Date().getFullYear()} DomainDagang. All rights reserved.`)}
          </p>
          <div className="flex gap-6 text-xs text-slate-400 font-medium">
            <Link to="/privacy-policy" className="hover:text-slate-600">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-slate-600">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
