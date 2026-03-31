import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api"; // Import API Service
import useAddress from "../../hooks/useAddress";
import AddressFields from "../../components/forms/AddressFields";
import { useConfirm } from "../../context/ConfirmContext";

const Settings = () => {
  const { success, error, warning } = useNotification();
  const confirm = useConfirm();
  // --- STATE DATA ---
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    address_line1: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    bio: "",
    avatar: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // --- ADDRESS HOOK ---
  // Pass current profile state/city as initial values for pre-fill
  const addressHook = useAddress(profile.state, profile.city);

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactor: true,
  });


  // --- INITIAL LOAD (FETCH FROM API) ---
  useEffect(() => {
    const fetchUserData = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Use API Service
        const res = await api.get(`/users/${storedUser.id}`);
        const data = res.data;

        setProfile({
          firstName: data.name?.split(" ")[0] || "",
          lastName: data.name?.split(" ").slice(1).join(" ") || "",
          email: data.email,
          phone: data.phone || "",
          address: data.address || "", // legacy
          address_line1: data.address_line1 || "",
          city: data.city || "",
          state: data.state || "",
          zip_code: data.zip_code || "",
          country: data.country || "",
          bio: data.bio || "",
          avatar: data.avatar || null,
        });
      } catch (err) {
        console.error("Gagal ambil data user:", err);
        // Error handling is managed by Interceptor (401) or here for others
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
    
  }, []);

  // --- HANDLERS ---
  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSecurityChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setSecurity({ ...security, [e.target.name]: value });
  };


  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        warning("Ukuran file terlalu besar (Max 1MB)");
        return;
      }
      // Convert to Base64 (Untuk disimpan ke DB sebagai string text untuk demo ini)
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAll = async () => {
    const loadingBtn = document.getElementById("save-btn");
    if (loadingBtn) loadingBtn.innerHTML = "Menyimpan...";
    
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser?.id) return;

    const fullName = `${profile.firstName} ${profile.lastName}`.trim();

    const payload = {
      name: fullName,
      phone: profile.phone,
      bio: profile.bio,
      address: profile.address, // legacy field remains for compatibility if needed
      address_line1: profile.address_line1,
      city: profile.city,
      state: profile.state,
      zip_code: profile.zip_code,
      country: profile.country,
      avatar: profile.avatar 
    };

    try {
      await api.put(`/users/${storedUser.id}`, payload);
      
      success("✅ Data berhasil disimpan ke Database!");
      
      // Update local storage
      const updatedUser = { 
        ...storedUser, 
        name: fullName, 
        phone: profile.phone,
        bio: profile.bio,
        address: profile.address,
        address_line1: profile.address_line1,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zip_code,
        country: profile.country,
        avatar: profile.avatar 
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      // TRIGGER UPDATE IN NAVBAR (SAME TAB)
      window.dispatchEvent(new Event("user_updated")); 

    } catch (err) {
      console.error(err);
      error("❌ Gagal menyimpan data profil");
    } finally {
       if (loadingBtn) loadingBtn.innerHTML = "Simpan Perubahan";
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

      success("✅ Password berhasil diubah!");
      setSecurity({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          twoFactor: security.twoFactor
      });

    } catch (err) {
      console.error(err);
      const msg = err.response?.data || "Gagal mengubah password";
      error(`❌ ${msg}`);
    }
  };

// ... (State logic unchanged, this is a replacement of the entire return block for UI refresh)
  return (
    <div className="pb-24 animate-[fadeIn_0.5s_ease-out] max-w-5xl mx-auto">
      {/* 1. HEADER (SIMPLIFED & ELEGANT) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Pengaturan Akun
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Kelola data personal dan preferensi keamanan Anda.
          </p>
        </div>
        <button
          id="save-btn"
          onClick={handleSaveAll}
          className="bg-[#0f172a] text-white px-8 py-3.5 rounded font-bold hover:bg-[#F97316] transition-all duration-300 shadow-sm flex items-center gap-2 text-sm uppercase tracking-wide"
        >
          <span className="material-symbols-outlined text-lg">save</span>
          Simpan Perubahan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* 2. SIDEBAR NAVIGATION (MINIMALIST) */}
        <div className="lg:col-span-3">
          <div className="sticky top-8 space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4">Navigasi</p>
            
            <button
              onClick={() => setActiveTab("profile")}
               className={`w-full text-left px-4 py-3 rounded text-sm font-bold transition-all flex items-center gap-3 group ${activeTab === 'profile' ? 'bg-orange-50 text-[#F97316]' : 'text-slate-600 hover:text-[#F97316] hover:bg-orange-50/50'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm ${activeTab === 'profile' ? 'bg-white text-[#F97316]' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-[#F97316]'}`}>
                 <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              Profil Saya
            </button>
            
            <button
              onClick={() => setActiveTab("security")}
               className={`w-full text-left px-4 py-3 rounded text-sm font-bold transition-all flex items-center gap-3 group ${activeTab === 'security' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm ${activeTab === 'security' ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-blue-600'}`}>
                 <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
              Keamanan Akun
            </button>
            
            <button
               onClick={() => setActiveTab("danger")}
               className={`w-full text-left px-4 py-3 rounded text-sm font-bold transition-all flex items-center gap-3 group mt-4 ${activeTab === 'danger' ? 'bg-rose-50 text-rose-500' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50/50'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activeTab === 'danger' ? 'bg-white text-rose-500' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-rose-500'}`}>
                 <span className="material-symbols-outlined text-[18px]">delete</span>
              </div>
              Hapus Akun
            </button>
          </div>
        </div>

        {/* 3. MAIN CONTENT CARDS */}
        <div className="lg:col-span-9 space-y-10">
          
          {/* SECTION: PROFILE (RESTYLED TO MATCH SCREENSHOT) */}
          {activeTab === "profile" && (
            <>
              <section id="section-profile" className="scroll-mt-24">
            <div className="bg-white rounded p-8 border border-slate-200">
              
              <div className="border-b border-slate-200 pb-4 mb-8">
                <h3 className="text-xl font-normal text-slate-800 tracking-tight">Profil Saya</h3>
                <p className="text-sm text-slate-500 mt-1">Kelola informasi profil Anda untuk mengontrol, melindungi dan mengamankan akun</p>
              </div>

              <div className="flex flex-col-reverse md:flex-row gap-12">
                {/* KIRI: DATA DIRI */}
                <div className="flex-1 space-y-6 lg:pr-12">
                  
                  {/* Row: Username / Nama Depan */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-500 text-right">Nama Depan</label>
                    <div>
                      <input
                        type="text"
                        name="firstName"
                        value={profile.firstName}
                        onChange={handleProfileChange}
                        className="w-full bg-white border border-slate-300 rounded px-4 py-2 outline-none focus:border-slate-500 text-sm transition-all"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Nama ini akan tampil di layanan Anda.</p>
                    </div>
                  </div>

                  {/* Row: Nama Belakang */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-500 text-right">Nama Belakang</label>
                    <input
                      type="text"
                      name="lastName"
                      value={profile.lastName}
                      onChange={handleProfileChange}
                      className="w-full bg-white border border-slate-300 rounded px-4 py-2 outline-none focus:border-slate-500 text-sm transition-all"
                    />
                  </div>

                  {/* Row: Email */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-500 text-right">Email</label>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-700">{profile.email}</span>
                      <a href="#" className="text-sm text-blue-600 hover:underline">Ubah</a>
                    </div>
                  </div>

                  {/* Row: Nomor Telepon */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-500 text-right">Nomor Telepon</label>
                    <div className="flex items-center gap-3">
                      {profile.phone ? (
                         <span className="text-sm text-slate-700">{profile.phone}</span>
                      ) : (
                         <input
                          type="text"
                          name="phone"
                          value={profile.phone}
                          onChange={handleProfileChange}
                          placeholder="Masukkan no handphone"
                          className="w-full bg-white border border-slate-300 rounded px-4 py-2 outline-none focus:border-slate-500 text-sm transition-all"
                        />
                      )}
                      {profile.phone && <a href="#" className="text-sm text-blue-600 hover:underline">Ubah</a>}
                    </div>
                  </div>

                  {/* Row: Bio/Nama Toko Placeholder */}
                  <div className="grid grid-cols-[120px_1fr] items-center gap-6 mt-4">
                    <label className="text-sm text-slate-500 text-right pt-2 self-start">Bio Singkat</label>
                    <textarea
                      name="bio"
                      rows="2"
                      value={profile.bio}
                      onChange={handleProfileChange}
                      className="w-full bg-white border border-slate-300 rounded px-4 py-2 outline-none focus:border-slate-500 text-sm transition-all resize-none"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-[120px_1fr] items-center gap-6 mt-4">
                      <div className="col-start-2">
                        <button
                          id="save-profile-btn"
                          onClick={() => {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                              handleSaveAll();
                          }}
                          className="bg-[#EE4D2D] text-white px-6 py-2 rounded text-sm font-medium hover:bg-[#d44124] transition-all"
                        >
                          Simpan
                        </button>
                      </div>
                  </div>
                </div>

                {/* KANAN: FOTO PROFIL */}
                <div className="md:w-[350px] border-l border-slate-100 flex flex-col items-center justify-start pt-4 px-8">
                  <div className="w-28 h-28 rounded-full bg-slate-100 flex items-center justify-center text-4xl text-slate-300 mb-6 overflow-hidden border border-slate-200">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-5xl">person</span>
                    )}
                  </div>
                  
                  <label className="cursor-pointer bg-white border border-slate-300 text-slate-700 px-6 py-2 rounded text-sm hover:bg-slate-50 transition-all mb-4 w-full text-center">
                    Pilih Gambar
                    <input type="file" className="hidden" accept="image/jpeg, image/png" onChange={handleAvatarChange} />
                  </label>
                  
                  <div className="text-center">
                    <p className="text-xs text-slate-400 leading-relaxed">Ukuran gambar: maks. 1 MB<br/>Format gambar: .JPEG, .PNG</p>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* SECTION: ADDRESS DATA */}
          <section id="section-address" className="scroll-mt-24">
             <div className="bg-white rounded p-8 border border-slate-200">
               <div className="border-b border-slate-200 pb-4 mb-8">
                <h3 className="text-xl font-normal text-slate-800 tracking-tight">Alamat Registrasi</h3>
                <p className="text-sm text-slate-500 mt-1">Data alamat Anda dibutuhkan untuk registrasi domain ICANN.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-12">
                <div className="flex-1 space-y-6 lg:pr-12 md:pr-0">
                   <AddressFields 
                        formData={profile} 
                        setFormData={setProfile}
                        addressHook={addressHook}
                    />

                    {/* ROW: NEGARA */}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-6">
                      <label className="text-sm text-slate-500 text-right">Negara</label>
                      <input
                          type="text"
                          name="country"
                          placeholder="Negara (Contoh: ID)"
                          value={profile.country}
                          onChange={handleProfileChange}
                          className="w-full bg-white border border-slate-300 rounded px-4 py-2 outline-none focus:border-slate-500 text-sm transition-all"
                      />
                    </div>
                </div>
              </div>

             </div>
          </section>
            </>
          )}

          {/* SECTION: SECURITY (CLEAN CARD) */}
          {activeTab === "security" && (
            <section id="section-security" className="scroll-mt-24">
            <div className="bg-white rounded border border-slate-200 p-8 md:p-10 shadow-sm">
              
               <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-50">
                <div className="w-12 h-12 rounded bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                   <span className="material-symbols-outlined text-2xl">security</span>
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Keamanan Akun</h3>
                   <p className="text-xs font-medium text-slate-500 mt-1">Ganti password atau aktifkan keamanan tambahan.</p>
                </div>
              </div>

              {/* Password Fields */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Password Lama</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={security.currentPassword}
                    onChange={handleSecurityChange}
                    className="w-full max-w-md bg-white border border-slate-300 rounded px-4 py-2 outline-none focus:border-slate-500 transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Password Baru</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={security.newPassword}
                    onChange={handleSecurityChange}
                     className="w-full max-w-md bg-white border border-slate-300 rounded px-4 py-2 outline-none focus:border-slate-500 transition-all text-sm font-medium"
                    placeholder="Minimal 8 karakter"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ulangi Password Baru</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={security.confirmPassword}
                    onChange={handleSecurityChange}
                     className="w-full max-w-md bg-white border border-slate-300 rounded px-4 py-2 outline-none focus:border-slate-500 transition-all text-sm font-medium"
                    placeholder="Ketik ulang password baru"
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleChangePassword}
                    className="bg-white border-2 border-slate-200 text-blue-600 px-6 py-2 rounded font-bold text-xs hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                  >
                    Simpan Password Baru
                  </button>
                </div>
              </div>

               <div className="mt-10 pt-8 border-t border-slate-200 flex items-center justify-between p-5 bg-slate-50/50 rounded border border-slate-200">
                <div className="pr-6">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-500">verified_user</span>
                      Login 2-Step (2FA)
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">
                    Amankan akun Anda dengan kode OTP tambahan saat login. Direkomendasikan!
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="twoFactor"
                    checked={security.twoFactor}
                    onChange={handleSecurityChange}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                </label>
              </div>

            </div>
          </section>
          )}

          {/* SECTION: DANGER ZONE (ELEGANT RED WARNING) */}
          {activeTab === "danger" && (
            <section id="section-danger" className="scroll-mt-24">
              <div className="bg-white rounded p-8 md:p-10 border border-slate-200 shadow-sm relative overflow-hidden group">
                {/* Soft Red Background Glow effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[50px] mix-blend-multiply opacity-50 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative z-10">
                    <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                       <span className="material-symbols-outlined text-rose-500">warning</span>
                       Penutupan Akun
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mb-6 max-w-2xl">
                      Sekali Anda menghapus akun, proses ini <b>TIDAK DAPAT</b> dibatalkan. Semua data domain Anda, riwayat tagihan, dan file konfigurasi akan dihapus permanen dari server kami.
                    </p>
                    
                    <button 
                      onClick={async () => {
                        const isConfirmed = await confirm({
                          title: "Hapus Akun Permanen",
                          message: "Apakah Anda sangat yakin ingin menghapus akun? Semua layanan dan domain akan dihentikan seketika.",
                          type: "danger",
                          confirmText: "Hapus Permanen"
                        });
                        if (isConfirmed) {
                          error("Fitur ini diblokir demi keamanan. Hubungi Admin.");
                        }
                      }}
                      className="bg-white border-2 border-rose-100 text-rose-500 px-6 py-2.5 rounded font-bold text-xs hover:border-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                    >
                      Hapus Akun Secara Permanen
                    </button>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
