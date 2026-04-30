import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import PaymentGatewaySettings from "../../components/admin/PaymentGatewaySettings";
import DomainApiSettings from "../../components/admin/DomainApiSettings";
import MailApiSettings from "../../components/admin/MailApiSettings";
import EnvironmentSettings from "../../components/admin/EnvironmentSettings";
import IntegrationsSettings from "../../components/admin/IntegrationsSettings";
import api from "../../services/api";
import useAddress from "../../hooks/useAddress";
import AddressFields from "../../components/forms/AddressFields";
import { useConfirm } from "../../context/ConfirmContext";
import { InstagramIcon, YouTubeIcon, FacebookIcon, TikTokIcon, XIcon } from "../../components/common/SocialIcons";

const AdminSettings = () => {
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();

  // --- STATE DATA ---
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address_line1: "",
    city: "",
    state: "",
    district: "",
    village: "",
    zip_code: "",
    country: "",
    bio: "",
    avatar: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile"); // profile, security, site, contact, environment, integrations, domain_api, mail_api, payment

  // --- STATE: SITE SETTINGS ---
  const [siteSettings, setSiteSettings] = useState({
    footer_company_name: "",
    footer_address: "",
    footer_support_email: "",
    footer_whatsapp: "",
    footer_copyright: "",
    company_whatsapp: "",
    company_email: "",
    google_client_id: "",
    app_client_url: "",
    app_backend_url: "",
    social_links: []
  });
  const [isSiteSettingsLoading, setIsSiteSettingsLoading] = useState(false);

  // --- ADDRESS HOOK ---
  const addressHook = useAddress(profile.state, profile.city, profile.district, profile.village);

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // --- INITIAL LOAD ---
  useEffect(() => {
    const fetchAdminData = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get(`/users/${storedUser.id}`);
        const data = res.data;

        setProfile({
          firstName: data.name?.split(" ")[0] || "",
          lastName: data.name?.split(" ").slice(1).join(" ") || "",
          email: data.email,
          phone: data.phone || "",
          address_line1: data.address_line1 || "",
          city: data.city || "",
          state: data.state || "",
          district: data.district || "",
          village: data.village || "",
          zip_code: data.zip_code || "",
          country: data.country || "",
          bio: data.bio || "",
          avatar: data.avatar || null,
        });
      } catch (err) {
        console.error("Gagal ambil data admin:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSiteSettings = async () => {
      try {
        const res = await api.get("/content/site-settings");
        if (res.data?.success && res.data.data) {
          setSiteSettings(prev => ({
            ...prev,
            ...res.data.data,
            social_links: Array.isArray(res.data.data.social_links) ? res.data.data.social_links : []
          }));
        }
      } catch (err) {
        console.error("Gagal ambil site settings:", err);
      }
    };

    fetchAdminData();
    fetchSiteSettings();
  }, []);

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSecurityChange = (e) => {
    setSecurity({ ...security, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        warning("Ukuran file terlalu besar (Max 1MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAll = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser?.id) return;

    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    const payload = {
      name: fullName,
      phone: profile.phone,
      bio: profile.bio,
      address_line1: profile.address_line1,
      city: profile.city,
      state: profile.state,
      district: profile.district,
      village: profile.village,
      zip_code: profile.zip_code,
      country: profile.country,
      avatar: profile.avatar
    };

    try {
      await api.put(`/users/${storedUser.id}`, payload);
      success("✅ Profil Admin berhasil diperbarui!");
      const updatedUser = { ...storedUser, name: fullName, avatar: profile.avatar };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("user_updated"));
    } catch (err) {
      error("❌ Gagal menyimpan data profil");
    }
  };

  const handleChangePassword = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser?.id) return;

    if (security.newPassword !== security.confirmPassword) {
      warning("Konfirmasi password tidak cocok!");
      return;
    }
    if (security.newPassword.length < 8) {
      warning("Password baru minimal 8 karakter");
      return;
    }

    try {
      await api.put(`/users/change-password/${storedUser.id}`, {
        currentPassword: security.currentPassword,
        newPassword: security.newPassword
      });
      success("✅ Password Admin berhasil diubah!");
      setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      error(`❌ ${err.response?.data || "Gagal mengubah password"}`);
    }
  };

  const handleSiteSettingChange = (e) => {
    setSiteSettings({ ...siteSettings, [e.target.name]: e.target.value });
  };

  const handleSaveSiteSettings = async () => {
    setIsSiteSettingsLoading(true);
    try {
      await api.put("/content/site-settings", { settings: siteSettings });
      success("✅ Pengaturan berhasil disimpan!");
    } catch (err) {
      error("❌ Gagal menyimpan pengaturan");
    } finally {
      setIsSiteSettingsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.4s_ease-out] pb-20">
      {/* --- HEADER & TAB NAVIGATION --- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="px-8 pt-8 pb-6 border-b border-slate-50">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-orange-500">settings</span>
            Sistem Konfigurasi
          </h1>
          <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">
            Manajemen Identitas, Keamanan & Platform Gateway
          </p>
        </div>

        <div className="flex px-8 border-b border-slate-100 overflow-x-auto no-scrollbar gap-10">
          {[
            { id: "profile", label: "Profil Admin", icon: "person" },
            { id: "security", label: "Kata Sandi", icon: "lock" },
            { id: "site", label: "Branding & Footer", icon: "brush" },
            { id: "contact", label: "Kontak Support", icon: "contact_support" },
            { id: "environment", label: "URL Sistem", icon: "terminal" },
            { id: "integrations", label: "Google Auth", icon: "integration_instructions" },
            { id: "domain_api", label: "API Registrar", icon: "dns" },
            { id: "mail_api", label: "Server Email", icon: "alternate_email" },
            { id: "payment", label: "Gateway Pembayaran", icon: "payments" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1.5 py-4 px-2 border-b-2 transition-all duration-300 relative group min-w-fit whitespace-nowrap ${activeTab === tab.id
                  ? "border-orange-500 text-orange-600 bg-orange-50/20"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? "scale-110" : "group-hover:scale-110 transition-transform"}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] uppercase tracking-wider font-bold`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* --- CONTENT GRID --- */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* MAIN FORM AREA */}
          <div className="lg:col-span-8 space-y-8">

            {/* ──────────────── TAB: PROFILE ──────────────── */}
            {activeTab === "profile" && (
              <div className="space-y-8 animate-[scaleIn_0.3s_ease-out]">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8 flex flex-col md:flex-row items-center gap-8">
                  <div className="relative group w-32 h-32">
                    <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl relative transition-transform group-hover:scale-105 duration-300">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-6xl text-slate-300">account_circle</span>
                      )}
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-[2px]">
                        <span className="material-symbols-outlined text-2xl">photo_camera</span>
                      </div>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAvatarChange} />
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-slate-900">{profile.firstName} {profile.lastName}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Administrator</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 leading-relaxed">{profile.bio || "No biography provided."}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">person</span>
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Informasi Personal</h3>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Depan</label>
                      <input type="text" name="firstName" value={profile.firstName} onChange={handleProfileChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Belakang</label>
                      <input type="text" name="lastName" value={profile.lastName} onChange={handleProfileChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email (Locked)</label>
                      <input type="email" value={profile.email} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp</label>
                      <input type="text" name="phone" value={profile.phone} onChange={handleProfileChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">location_on</span>
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Alamat & Lokasi</h3>
                  </div>
                  <div className="p-8">
                    <AddressFields formData={profile} setFormData={setProfile} addressHook={addressHook} />
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── TAB: SECURITY ──────────────── */}
            {activeTab === "security" && (
              <div className="animate-[scaleIn_0.3s_ease-out] space-y-8">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">lock_open</span>
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Ubah Password Akses</h3>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-2 max-w-md">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password Saat Ini</label>
                      <input type="password" name="currentPassword" value={security.currentPassword} onChange={handleSecurityChange} placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password Baru</label>
                        <input type="password" name="newPassword" value={security.newPassword} onChange={handleSecurityChange} placeholder="Min. 8 karakter"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Konfirmasi Password</label>
                        <input type="password" name="confirmPassword" value={security.confirmPassword} onChange={handleSecurityChange} placeholder="Ulangi password"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── TAB: CONTACT SUPPORT ──────────────── */}
            {activeTab === "contact" && (
              <div className="animate-[scaleIn_0.3s_ease-out] space-y-8">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">contact_support</span>
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Konfigurasi Jalur Bantuan</h3>
                  </div>
                  <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nomor WhatsApp Support</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">+</span>
                          <input 
                            type="text" 
                            name="company_whatsapp" 
                            value={siteSettings.company_whatsapp || ""} 
                            onChange={handleSiteSettingChange} 
                            placeholder="628123456789"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3.5 text-sm font-bold text-slate-800 focus:border-green-500 focus:ring-4 ring-green-50/50 outline-none transition-all" 
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 italic">Gunakan format kode negara tanpa tanda + (Contoh: 62812xxx).</p>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Support Khusus</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">mail</span>
                          <input 
                            type="email" 
                            name="company_email" 
                            value={siteSettings.company_email || ""} 
                            onChange={handleSiteSettingChange} 
                            placeholder="support@domaindagang.id"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-800 focus:border-orange-500 focus:ring-4 ring-orange-50/50 outline-none transition-all" 
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 italic">Email ini akan muncul di halaman bantuan member.</p>
                      </div>

                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Query Lokasi Google Maps</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">map</span>
                          <input 
                            type="text" 
                            name="google_maps_query" 
                            value={siteSettings.google_maps_query || ""} 
                            onChange={handleSiteSettingChange} 
                            placeholder="Contoh: Aplikasi Dagang - Jasa Pembuatan Website Bandung"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-800 focus:border-red-500 focus:ring-4 ring-red-50/50 outline-none transition-all" 
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 italic">Isi dengan nama bisnis kamu di Google Maps atau alamat lengkap untuk memunculkan Pin Merah.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── TAB: SITE SETTINGS ──────────────── */}
            {activeTab === "site" && (
              <div className="animate-[scaleIn_0.3s_ease-out] space-y-8">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">brush</span>
                    <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Branding & Identitas</h3>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Perusahaan</label>
                      <input type="text" name="footer_company_name" value={siteSettings.footer_company_name} onChange={handleSiteSettingChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Teks Copyright</label>
                      <input type="text" name="footer_copyright" value={siteSettings.footer_copyright} onChange={handleSiteSettingChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alamat Footer</label>
                      <textarea name="footer_address" value={siteSettings.footer_address} onChange={handleSiteSettingChange} rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-orange-500 outline-none transition-all resize-none" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-pink-500">share</span>
                      <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Tautan Sosial Media</h3>
                    </div>
                    <button
                      onClick={() => {
                        const currentLinks = Array.isArray(siteSettings.social_links) ? siteSettings.social_links : [];
                        setSiteSettings({ ...siteSettings, social_links: [...currentLinks, { platform: "", url: "https://" }] });
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-pink-100 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Tambah Tautan
                    </button>
                  </div>

                  <div className="p-8 space-y-4">
                    {Array.isArray(siteSettings.social_links) && siteSettings.social_links.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {siteSettings.social_links.map((link, index) => (
                          <div key={index} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group animate-[scaleIn_0.2s_ease-out]">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 p-1.5">
                                <span className="material-symbols-outlined text-pink-500 text-lg">
                                  {link.platform?.toLowerCase().includes('fb') || link.platform?.toLowerCase().includes('facebook') ? 'facebook' :
                                    link.platform?.toLowerCase().includes('ig') || link.platform?.toLowerCase().includes('instagram') ? 'photo_camera' :
                                      link.platform?.toLowerCase().includes('yt') || link.platform?.toLowerCase().includes('youtube') ? 'video_library' :
                                        link.platform?.toLowerCase().includes('wa') || link.platform?.toLowerCase().includes('whatsapp') ? 'chat' :
                                          'link'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <input
                                  type="text"
                                  placeholder="Nama Platform"
                                  value={link.platform}
                                  onChange={e => {
                                    const newLinks = [...siteSettings.social_links];
                                    newLinks[index].platform = e.target.value;
                                    setSiteSettings({ ...siteSettings, social_links: newLinks });
                                  }}
                                  className="w-full bg-transparent text-[10px] font-bold text-slate-800 uppercase tracking-widest outline-none border-b border-transparent focus:border-pink-200 placeholder:text-slate-300"
                                />
                                <input
                                  type="text"
                                  placeholder="https://..."
                                  value={link.url}
                                  onChange={e => {
                                    const newLinks = [...siteSettings.social_links];
                                    newLinks[index].url = e.target.value;
                                    setSiteSettings({ ...siteSettings, social_links: newLinks });
                                  }}
                                  className="w-full bg-transparent text-xs font-medium text-slate-500 outline-none truncate"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newLinks = siteSettings.social_links.filter((_, i) => i !== index);
                                setSiteSettings({ ...siteSettings, social_links: newLinks });
                              }}
                              className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                          Belum ada tautan sosial media.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── TAB: ENVIRONMENT ──────────────── */}
            {activeTab === "environment" && (
              <EnvironmentSettings 
                settings={siteSettings} 
                onChange={handleSiteSettingChange} 
                onSave={handleSaveSiteSettings} 
                isLoading={isSiteSettingsLoading}
              />
            )}

            {/* ──────────────── TAB: INTEGRATIONS ──────────────── */}
            {activeTab === "integrations" && (
              <IntegrationsSettings
                settings={siteSettings}
                onChange={handleSiteSettingChange}
                onSave={handleSaveSiteSettings}
                isLoading={isSiteSettingsLoading}
              />
            )}

            {/* ──────────────── TAB: DOMAIN API ──────────────── */}
            {activeTab === "domain_api" && <DomainApiSettings />}

            {/* ──────────────── TAB: MAIL SERVER ──────────────── */}
            {activeTab === "mail_api" && <MailApiSettings />}

            {/* ──────────────── TAB: PAYMENT ──────────────── */}
            {activeTab === "payment" && (
              <PaymentGatewaySettings systemSettings={siteSettings} />
            )}

          </div>

          {/* ACTION SIDEBAR */}
          <div className="lg:col-span-4 space-y-6 sticky top-6">
            <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl shadow-slate-900/20">
              <h3 className="text-[10px] font-bold uppercase tracking-[3px] text-slate-400 mb-8 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-blue-400">task_alt</span>
                Kontrol Sistem
              </h3>

              <div className="space-y-4">
                {activeTab === "profile" && (
                  <button onClick={handleSaveAll} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined">save</span>
                    Simpan Profil Admin
                  </button>
                )}

                {activeTab === "security" && (
                  <button onClick={handleChangePassword} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined">lock_reset</span>
                    Ganti Kata Sandi
                  </button>
                )}

                {["site", "contact", "environment", "integrations"].includes(activeTab) && (
                  <button onClick={handleSaveSiteSettings} disabled={isSiteSettingsLoading} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                    <span className="material-symbols-outlined">{isSiteSettingsLoading ? "sync" : "save"}</span>
                    {isSiteSettingsLoading ? "Proses..." : `Simpan ${activeTab === 'site' ? 'Branding' : activeTab === 'contact' ? 'Kontak' : 'Pengaturan'}`}
                  </button>
                )}

                {activeTab === "domain_api" && (
                  <button onClick={() => document.getElementById('btn-save-domain-api').click()} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined">save</span>
                    Simpan API Registrar
                  </button>
                )}

                {activeTab === "mail_api" && (
                  <button onClick={() => document.getElementById('btn-save-mail-api').click()} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined">mail</span>
                    Simpan Server Email
                  </button>
                )}

                {activeTab === "payment" && (
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4 border border-dashed border-slate-800 rounded-xl">
                    Kontrol Gateway Aktif
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
