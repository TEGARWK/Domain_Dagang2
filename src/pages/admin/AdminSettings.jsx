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

const AdminSettings = () => {
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();

  const [profile, setProfile] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    address_line1: "", city: "", state: "", district: "", village: "",
    zip_code: "", country: "", bio: "", avatar: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  const [siteSettings, setSiteSettings] = useState({
    footer_company_name: "", footer_address: "", footer_support_email: "",
    footer_whatsapp: "", footer_copyright: "", company_whatsapp: "",
    company_email: "", google_client_id: "", app_client_url: "",
    app_backend_url: "", social_links: []
  });
  const [isSiteSettingsLoading, setIsSiteSettingsLoading] = useState(false);

  const addressHook = useAddress(profile.state, profile.city, profile.district, profile.village);

  const [security, setSecurity] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });

  useEffect(() => {
    const fetchAdminData = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.id) { setIsLoading(false); return; }
      try {
        const res = await api.get(`/users/${storedUser.id}`);
        const data = res.data;
        setProfile({
          firstName: data.name?.split(" ")[0] || "", lastName: data.name?.split(" ").slice(1).join(" ") || "",
          email: data.email, phone: data.phone || "", address_line1: data.address_line1 || "",
          city: data.city || "", state: data.state || "", district: data.district || "",
          village: data.village || "", zip_code: data.zip_code || "", country: data.country || "",
          bio: data.bio || "", avatar: data.avatar || null,
        });
      } catch (err) { console.error("Gagal ambil data admin:", err); }
      finally { setIsLoading(false); }
    };
    const fetchSiteSettings = async () => {
      try {
        const res = await api.get("/content/site-settings");
        if (res.data?.success && res.data.data) {
          setSiteSettings(prev => ({
            ...prev, ...res.data.data,
            social_links: Array.isArray(res.data.data.social_links) ? res.data.data.social_links : []
          }));
        }
      } catch (err) { console.error("Gagal ambil site settings:", err); }
    };
    fetchAdminData();
    fetchSiteSettings();
  }, []);

  const handleProfileChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
  const handleSecurityChange = (e) => setSecurity({ ...security, [e.target.name]: e.target.value });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { warning("Ukuran file terlalu besar (Max 1MB)"); return; }
      const reader = new FileReader();
      reader.onloadend = () => setProfile((prev) => ({ ...prev, avatar: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAll = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser?.id) return;
    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    try {
      await api.put(`/users/${storedUser.id}`, {
        name: fullName, phone: profile.phone, bio: profile.bio,
        address_line1: profile.address_line1, city: profile.city, state: profile.state,
        district: profile.district, village: profile.village, zip_code: profile.zip_code,
        country: profile.country, avatar: profile.avatar
      });
      success("Profil Admin berhasil diperbarui!");
      localStorage.setItem("user", JSON.stringify({ ...storedUser, name: fullName, avatar: profile.avatar }));
      window.dispatchEvent(new Event("user_updated"));
    } catch (err) { error("Gagal menyimpan data profil"); }
  };

  const handleChangePassword = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser?.id) return;
    if (security.newPassword !== security.confirmPassword) { warning("Konfirmasi password tidak cocok!"); return; }
    if (security.newPassword.length < 8) { warning("Password baru minimal 8 karakter"); return; }
    try {
      await api.put(`/users/change-password/${storedUser.id}`, {
        currentPassword: security.currentPassword, newPassword: security.newPassword
      });
      success("Password Admin berhasil diubah!");
      setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) { error(`${err.response?.data || "Gagal mengubah password"}`); }
  };

  const handleSiteSettingChange = (e) => setSiteSettings({ ...siteSettings, [e.target.name]: e.target.value });

  const handleSaveSiteSettings = async () => {
    setIsSiteSettingsLoading(true);
    try { await api.put("/content/site-settings", { settings: siteSettings }); success("Pengaturan berhasil disimpan!"); }
    catch (err) { error("Gagal menyimpan pengaturan"); }
    finally { setIsSiteSettingsLoading(false); }
  };

  const tabs = [
    { id: "profile", label: "Profil Admin", icon: "person" },
    { id: "security", label: "Kata Sandi", icon: "lock" },
    { id: "site", label: "Branding & Footer", icon: "brush" },
    { id: "contact", label: "Kontak Support", icon: "contact_support" },
    { id: "environment", label: "URL Sistem", icon: "terminal" },
    { id: "integrations", label: "Google Auth", icon: "integration_instructions" },
    { id: "domain_api", label: "API Registrar", icon: "dns" },
    { id: "mail_api", label: "Server Email", icon: "alternate_email" },
    { id: "payment", label: "Gateway Pembayaran", icon: "payments" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-neutral-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-10">
      <div className="card" style={{ padding: 0, overflow: "visible" }}>
        <div className="px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary-500 text-xl">settings</span>
            <div>
              <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Sistem Konfigurasi</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">Manajemen Identitas, Keamanan & Platform Gateway</p>
            </div>
          </div>
        </div>

        <div className="flex px-4 border-b border-neutral-100 overflow-x-auto no-scrollbar gap-4">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-3 px-2 border-b-2 transition-all shrink-0 min-w-fit whitespace-nowrap ${activeTab === tab.id
                ? "border-primary-500 text-primary-600 bg-primary-50/20"
                : "border-transparent text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50/50"
              }`}
            >
              <span className={`material-symbols-outlined text-lg ${activeTab === tab.id ? "" : ""}`}>{tab.icon}</span>
              <span className="text-[9px] uppercase tracking-wider font-bold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start mt-4">
        <div className="lg:col-span-8 space-y-4">

          {/* ─── TAB: PROFILE ─── */}
          {activeTab === "profile" && (
            <div className="space-y-4 animate-fade-in">
              <div className="card p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative group w-28 h-28 shrink-0">
                  <div className="w-full h-full rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg relative transition-transform group-hover:scale-105">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-5xl text-neutral-300">account_circle</span>
                    )}
                    <div className="absolute inset-0 bg-neutral-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white cursor-pointer backdrop-blur-[2px]">
                      <span className="material-symbols-outlined text-xl">photo_camera</span>
                    </div>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAvatarChange} />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-base font-bold text-neutral-800">{profile.firstName} {profile.lastName}</h3>
                  <div className="flex items-center justify-center md:justify-start gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Active Administrator</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-3 leading-relaxed">{profile.bio || "No biography provided."}</p>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="material-symbols-outlined text-neutral-400">person</span>
                  <span>Informasi Personal</span>
                </div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Nama Depan</label>
                    <input type="text" name="firstName" value={profile.firstName} onChange={handleProfileChange} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Nama Belakang</label>
                    <input type="text" name="lastName" value={profile.lastName} onChange={handleProfileChange} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Email (Locked)</label>
                    <input type="email" value={profile.email} readOnly className="form-input" style={{ background: "var(--color-neutral-100)", color: "var(--color-neutral-400)", cursor: "not-allowed" }} />
                  </div>
                  <div>
                    <label className="form-label">WhatsApp</label>
                    <input type="text" name="phone" value={profile.phone} onChange={handleProfileChange} className="form-input" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="material-symbols-outlined text-neutral-400">location_on</span>
                  <span>Alamat & Lokasi</span>
                </div>
                <div className="p-3">
                  <AddressFields formData={profile} setFormData={setProfile} addressHook={addressHook} />
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: SECURITY ─── */}
          {activeTab === "security" && (
            <div className="space-y-4 animate-fade-in">
              <div className="card">
                <div className="card-header">
                  <span className="material-symbols-outlined text-neutral-400">lock_open</span>
                  <span>Ubah Password Akses</span>
                </div>
                <div className="p-3 space-y-3">
                  <div className="space-y-2 max-w-md">
                    <label className="form-label">Password Saat Ini</label>
                    <input type="password" name="currentPassword" value={security.currentPassword} onChange={handleSecurityChange} placeholder="••••••••" className="form-input" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="form-label">Password Baru</label>
                      <input type="password" name="newPassword" value={security.newPassword} onChange={handleSecurityChange} placeholder="Min. 8 karakter" className="form-input" />
                    </div>
                    <div className="space-y-2">
                      <label className="form-label">Konfirmasi Password</label>
                      <input type="password" name="confirmPassword" value={security.confirmPassword} onChange={handleSecurityChange} placeholder="Ulangi password" className="form-input" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: CONTACT ─── */}
          {activeTab === "contact" && (
            <div className="space-y-4 animate-fade-in">
              <div className="card">
                <div className="card-header">
                  <span className="material-symbols-outlined text-neutral-400">contact_support</span>
                  <span>Konfigurasi Jalur Bantuan</span>
                </div>
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="form-label">Nomor WhatsApp Support</label>
                      <input type="text" name="company_whatsapp" value={siteSettings.company_whatsapp || ""} onChange={handleSiteSettingChange} placeholder="628123456789" className="form-input" />
                      <p className="text-[10px] text-neutral-400 italic">Gunakan format kode negara tanpa tanda + (Contoh: 62812xxx).</p>
                    </div>
                    <div className="space-y-2">
                      <label className="form-label">Email Support Khusus</label>
                      <input type="email" name="company_email" value={siteSettings.company_email || ""} onChange={handleSiteSettingChange} placeholder="support@domaindagang.id" className="form-input" />
                      <p className="text-[10px] text-neutral-400 italic">Email ini akan muncul di halaman bantuan member.</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="form-label">Query Lokasi Google Maps</label>
                      <input type="text" name="google_maps_query" value={siteSettings.google_maps_query || ""} onChange={handleSiteSettingChange} className="form-input" />
                      <p className="text-[10px] text-neutral-400 italic">Isi dengan nama bisnis kamu di Google Maps atau alamat lengkap untuk memunculkan Pin Merah.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: SITE ─── */}
          {activeTab === "site" && (
            <div className="space-y-4 animate-fade-in">
              <div className="card">
                <div className="card-header">
                  <span className="material-symbols-outlined text-neutral-400">brush</span>
                  <span>Branding & Identitas</span>
                </div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="form-label">Nama Perusahaan</label>
                    <input type="text" name="footer_company_name" value={siteSettings.footer_company_name} onChange={handleSiteSettingChange} className="form-input" />
                  </div>
                  <div className="space-y-2">
                    <label className="form-label">Teks Copyright</label>
                    <input type="text" name="footer_copyright" value={siteSettings.footer_copyright} onChange={handleSiteSettingChange} className="form-input" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="form-label">Alamat Footer</label>
                    <textarea name="footer_address" value={siteSettings.footer_address} onChange={handleSiteSettingChange} rows={3} className="form-input" style={{ resize: "none" }} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header" style={{ justifyContent: "space-between" }}>
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-neutral-400">share</span>
                    <span>Tautan Sosial Media</span>
                  </div>
                  <button onClick={() => {
                    const currentLinks = Array.isArray(siteSettings.social_links) ? siteSettings.social_links : [];
                    setSiteSettings({ ...siteSettings, social_links: [...currentLinks, { platform: "", url: "https://" }] });
                  }} className="btn btn-sm btn-ghost">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Tambah Tautan
                  </button>
                </div>
                <div className="p-3 space-y-3">
                  {Array.isArray(siteSettings.social_links) && siteSettings.social_links.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {siteSettings.social_links.map((link, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 bg-neutral-50/50 group">
                          <div className="w-8 h-8 rounded-lg bg-white border border-neutral-100 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-sm text-neutral-400">link</span>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <input type="text" placeholder="Nama Platform" value={link.platform}
                              onChange={e => { const n = [...siteSettings.social_links]; n[index].platform = e.target.value; setSiteSettings({ ...siteSettings, social_links: n }); }}
                              className="w-full bg-transparent text-[9px] font-bold text-neutral-700 uppercase tracking-wider outline-none" />
                            <input type="text" placeholder="https://..." value={link.url}
                              onChange={e => { const n = [...siteSettings.social_links]; n[index].url = e.target.value; setSiteSettings({ ...siteSettings, social_links: n }); }}
                              className="w-full bg-transparent text-xs text-neutral-500 outline-none" />
                          </div>
                          <button onClick={() => {
                            setSiteSettings({ ...siteSettings, social_links: siteSettings.social_links.filter((_, i) => i !== index) });
                          }} className="w-7 h-7 flex items-center justify-center text-neutral-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed border-neutral-100 rounded-xl">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Belum ada tautan sosial media.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: ENVIRONMENT ─── */}
          {activeTab === "environment" && (
            <EnvironmentSettings
              settings={siteSettings}
              onChange={handleSiteSettingChange}
              onSave={handleSaveSiteSettings}
              isLoading={isSiteSettingsLoading}
            />
          )}

          {/* ─── TAB: INTEGRATIONS ─── */}
          {activeTab === "integrations" && (
            <IntegrationsSettings
              settings={siteSettings}
              onChange={handleSiteSettingChange}
              onSave={handleSaveSiteSettings}
              isLoading={isSiteSettingsLoading}
            />
          )}

          {/* ─── TAB: DOMAIN API ─── */}
          {activeTab === "domain_api" && <DomainApiSettings />}

          {/* ─── TAB: MAIL API ─── */}
          {activeTab === "mail_api" && <MailApiSettings />}

          {/* ─── TAB: PAYMENT ─── */}
          {activeTab === "payment" && <PaymentGatewaySettings systemSettings={siteSettings} />}

        </div>

        {/* ACTION SIDEBAR */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          <div className="card" style={{ background: "var(--color-neutral-800)" }}>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary-400">task_alt</span>
              Kontrol Sistem
            </h3>
            <div className="space-y-3">
              {activeTab === "profile" && (
                <button onClick={handleSaveAll} className="btn btn-primary" style={{ width: "100%" }}>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Simpan Profil Admin
                </button>
              )}
              {activeTab === "security" && (
                <button onClick={handleChangePassword} className="btn" style={{ width: "100%", background: "#2563eb", color: "#fff", border: "none" }}>
                  <span className="material-symbols-outlined text-sm">lock_reset</span>
                  Ganti Kata Sandi
                </button>
              )}
              {["site", "contact", "environment", "integrations"].includes(activeTab) && (
                <button onClick={handleSaveSiteSettings} disabled={isSiteSettingsLoading} className="btn btn-primary" style={{ width: "100%" }}>
                  <span className="material-symbols-outlined text-sm">{isSiteSettingsLoading ? "sync" : "save"}</span>
                  {isSiteSettingsLoading ? "Proses..." : `Simpan ${activeTab === 'site' ? 'Branding' : activeTab === 'contact' ? 'Kontak' : 'Pengaturan'}`}
                </button>
              )}
              {activeTab === "domain_api" && (
                <button onClick={() => document.getElementById('btn-save-domain-api').click()} className="btn" style={{ width: "100%", background: "#2563eb", color: "#fff", border: "none" }}>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Simpan API Registrar
                </button>
              )}
              {activeTab === "mail_api" && (
                <button onClick={() => document.getElementById('btn-save-mail-api').click()} className="btn btn-primary" style={{ width: "100%" }}>
                  <span className="material-symbols-outlined text-sm">mail</span>
                  Simpan Server Email
                </button>
              )}
              {activeTab === "payment" && (
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider text-center py-4 border border-dashed border-neutral-700 rounded-xl">
                  Kontrol Gateway Aktif
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
