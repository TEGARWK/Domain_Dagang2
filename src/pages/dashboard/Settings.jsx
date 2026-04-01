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
  const [isPhoneEditing, setIsPhoneEditing] = useState(false);
  const [isEmailEditing, setIsEmailEditing] = useState(false);

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

  return (
    <div className="pb-24 animate-[fadeIn_0.5s_ease-out] max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. HEADER (PREMIUM DASHBOARD STYLE) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 py-6 border-b border-slate-100">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight leading-none">
            Pengaturan Akun
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            Kelola data personal dan preferensi keamanan Anda secara aman.
          </p>
        </div>
        <button
          id="save-btn"
          onClick={handleSaveAll}
          className="bg-slate-900 text-white px-10 py-4 rounded-lg font-medium hover:bg-orange-600 transition-all duration-300 shadow-lg hover:shadow-orange-200 active:scale-95 flex items-center justify-center gap-3 text-sm uppercase tracking-widest border border-transparent"
        >
          <span className="material-symbols-outlined text-xl">save</span>
          Simpan Perubahan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 2. SIDEBAR NAVIGATION (MODERN PILLS) */}
        <div className="lg:col-span-3">
          <div className="sticky top-8 space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-inner">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[2px] px-3 mb-4">Navigasi Utama</p>
            
            <button
              onClick={() => setActiveTab("profile")}
               className={`w-full text-left px-4 py-3.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 group ${activeTab === 'profile' ? 'bg-white text-orange-600 shadow-md ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-800 hover:bg-white/80'}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeTab === 'profile' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-800 border border-slate-200/50'}`}>
                 <span className="material-symbols-outlined text-[19px]">person</span>
              </div>
              Profil Saya
            </button>
            
            <button
              onClick={() => setActiveTab("security")}
               className={`w-full text-left px-4 py-3.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 group ${activeTab === 'security' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-800 hover:bg-white/80'}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-blue-600 border border-slate-200/50'}`}>
                 <span className="material-symbols-outlined text-[19px]">lock</span>
              </div>
              Keamanan Akun
            </button>
            
            <div className="pt-4 mt-4 border-t border-slate-200/50">
              <button
                onClick={() => setActiveTab("danger")}
                className={`w-full text-left px-4 py-3.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 group ${activeTab === 'danger' ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50/50'}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeTab === 'danger' ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-slate-100/50 text-slate-300 group-hover:bg-white group-hover:text-rose-600 border border-slate-200/50'}`}>
                  <span className="material-symbols-outlined text-[19px]">delete_forever</span>
                </div>
                Hapus Akun
              </button>
            </div>
          </div>
        </div>

        {/* 3. MAIN CONTENT CARDS */}
        <div className="lg:col-span-9 space-y-10">
          
          {/* SECTION: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-8 animate-[scaleIn_0.3s_ease-out]">
              <section className="bg-white rounded-2xl border border-slate-200 classic-shadow overflow-hidden">
                <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">Informasi Dasar</h3>
                  <p className="text-[13px] text-slate-500 mt-1 font-medium">Lengkapi data diri Anda untuk memudahkan verifikasi layanan.</p>
                </div>

                <div className="p-8">
                  <div className="flex flex-col-reverse md:flex-row gap-16">
                    {/* LEFT COLUMN: FORM */}
                    <div className="flex-1 max-w-2xl space-y-10">
                      
                      {/* Row: Nama Depan */}
                      <div className="space-y-2.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Nama Depan</label>
                        <div>
                          <input
                            type="text"
                            name="firstName"
                            value={profile.firstName}
                            onChange={handleProfileChange}
                            placeholder="Contoh: Budi"
                            className="w-full bg-slate-50/30 border border-slate-200 rounded-lg px-5 py-4 outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white text-sm transition-all font-medium text-slate-800 shadow-sm"
                          />
                          <p className="text-[10px] font-medium text-slate-400 mt-2.5 ml-1.5 uppercase tracking-widest opacity-70">Tampil di dashboard layanan.</p>
                        </div>
                      </div>

                      {/* Row: Nama Belakang */}
                      <div className="space-y-2.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Nama Belakang</label>
                        <input
                          type="text"
                          name="lastName"
                          value={profile.lastName}
                          onChange={handleProfileChange}
                          placeholder="Fulan"
                          className="w-full bg-slate-50/30 border border-slate-200 rounded-lg px-5 py-4 outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white text-sm transition-all font-medium text-slate-800 shadow-sm"
                        />
                      </div>

                      {/* Row: Email */}
                      <div className="space-y-2.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Alamat Email</label>
                        <div className="flex items-center gap-4">
                          <div className="relative flex-1 group">
                             <input
                              type="email"
                              name="email"
                              value={profile.email}
                              onChange={handleProfileChange}
                              readOnly={!isEmailEditing}
                              className={`w-full bg-white border ${isEmailEditing ? 'border-orange-500 ring-4 ring-orange-50' : 'border-slate-200'} rounded-lg px-5 pr-12 py-4 outline-none text-sm transition-all font-medium text-slate-800 shadow-sm ${!isEmailEditing ? 'bg-slate-50/80 text-slate-400 cursor-not-allowed border-dashed' : ''}`}
                            />
                            {!isEmailEditing && <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-lg group-hover:text-slate-400 transition-colors">lock</span>}
                          </div>
                          <button 
                            type="button"
                            onClick={() => setIsEmailEditing(!isEmailEditing)}
                            className={`px-6 py-4 rounded-lg text-[10px] font-bold transition-all uppercase tracking-[2px] shadow-sm active:scale-95 whitespace-nowrap min-w-[100px] ${isEmailEditing ? 'bg-orange-600 text-white shadow-orange-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {isEmailEditing ? 'Selesai' : 'Ubah'}
                          </button>
                        </div>
                      </div>

                      {/* Row: Nomor Telepon */}
                      <div className="space-y-2.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">No. Whatsapp</label>
                        <div className="flex items-center gap-4">
                          <div className="relative flex-1 group">
                            <input
                              type="text"
                              name="phone"
                              value={profile.phone}
                              onChange={handleProfileChange}
                              readOnly={!isPhoneEditing}
                              placeholder="081xxx"
                              className={`w-full bg-white border ${isPhoneEditing ? 'border-orange-500 ring-4 ring-orange-100' : 'border-slate-200'} rounded-lg px-5 pr-12 py-4 outline-none text-sm transition-all font-medium text-slate-800 shadow-sm ${!isPhoneEditing ? 'bg-slate-50/80 text-slate-400 cursor-not-allowed border-dashed' : ''}`}
                            />
                             {!isPhoneEditing && <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-lg group-hover:text-slate-400 transition-colors">lock</span>}
                          </div>
                          <button 
                            type="button"
                            onClick={() => setIsPhoneEditing(!isPhoneEditing)}
                            className={`px-6 py-4 rounded-lg text-[10px] font-bold transition-all uppercase tracking-[2px] shadow-sm active:scale-95 whitespace-nowrap min-w-[100px] ${isPhoneEditing ? 'bg-orange-600 text-white shadow-orange-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {isPhoneEditing ? 'Selesai' : 'Ubah'}
                          </button>
                        </div>
                      </div>

                      {/* Row: Bio */}
                      <div className="space-y-2.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Bio Singkat</label>
                        <textarea
                          name="bio"
                          rows="4"
                          value={profile.bio}
                          onChange={handleProfileChange}
                          placeholder="Ceritakan sedikit tentang visi bisnis Anda..."
                          className="w-full bg-slate-50/30 border border-slate-200 rounded-xl px-5 py-5 outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white text-sm transition-all font-medium text-slate-800 resize-none leading-relaxed shadow-sm min-h-[120px]"
                        ></textarea>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: AVATAR */}
                    <div className="md:w-72 flex flex-col items-center pt-2">
                       <div className="relative group">
                          <div className="w-52 h-52 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 overflow-hidden border-8 border-white shadow-2xl relative transition-all duration-700 group-hover:rounded-xl group-hover:scale-[1.02]">
                            {profile.avatar ? (
                              <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-7xl text-slate-300">account_circle</span>
                            )}
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-white gap-3 cursor-pointer backdrop-blur-sm">
                               <span className="material-symbols-outlined text-3xl animate-bounce">photo_camera</span>
                               <span className="text-[11px] font-medium uppercase tracking-[3px]">Ganti Foto</span>
                            </div>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAvatarChange} />
                          </div>
                          
                          {/* Floating Badge */}
                          <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-orange-200 border-4 border-white rotate-12 group-hover:rotate-0 transition-transform">
                             <span className="material-symbols-outlined text-2xl font-medium">verified</span>
                          </div>
                       </div>
                      
                      <div className="text-center px-4 mt-6">
                        <h4 className="text-base font-bold text-slate-800 tracking-tight mb-2 uppercase">{profile.firstName || 'Member'} {profile.lastName}</h4>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[3px] leading-relaxed">Maks. 1MB<br/>(JPG, PNG, WEBP)</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/50 px-8 py-6 border-t border-slate-100 flex justify-end gap-4">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-6 py-3.5 rounded-lg text-[10px] font-medium uppercase tracking-[2px] text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Batalkan
                    </button>
                    <button
                      onClick={handleSaveAll}
                      className="bg-orange-600 text-white px-10 py-3.5 rounded-xl text-[10px] font-medium uppercase tracking-[2px] hover:bg-slate-900 transition-all shadow-xl shadow-orange-100 active:scale-95 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      Simpan Profil
                    </button>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-slate-200 classic-shadow overflow-hidden">
                 <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight text-right">Data Alamat Registrasi</h3>
                    <p className="text-[13px] text-slate-500 mt-1 font-medium text-right">Dibutuhkan untuk validasi kepemilikan domain internasional.</p>
                </div>
                <div className="p-8">
                    <div className="max-w-2xl space-y-10">
                     <AddressFields 
                        formData={profile} 
                        setFormData={setProfile}
                        addressHook={addressHook}
                      />
                      
                      <div className="space-y-2.5">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Negara</label>
                        <input
                            type="text"
                            name="country"
                            placeholder="ID"
                            value={profile.country}
                            onChange={handleProfileChange}
                            className="max-w-[150px] bg-slate-50/30 border border-slate-200 rounded-lg px-5 py-4 outline-none focus:ring-4 focus:ring-orange-50 focus:border-orange-500 focus:bg-white text-sm transition-all font-medium text-slate-800 shadow-sm"
                        />
                      </div>
                    </div>
                </div>
              </section>
            </div>
          )}

          {/* SECTION: SECURITY */}
          {activeTab === "security" && (
            <div className="animate-[scaleIn_0.3s_ease-out] space-y-8">
              <section className="bg-white rounded-2xl border border-slate-200 classic-shadow overflow-hidden">
                <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                       <span className="material-symbols-outlined text-2xl">vpn_key</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight uppercase tracking-widest">Update Password</h3>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">Gunakan kombinasi simbol & angka demi keamanan ekstra.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">DIREKOMENDASIKAN</span>
                </div>

                <div className="p-8 space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 max-w-4xl">
                      <div className="space-y-2.5">
                         <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Password Saat Ini</label>
                         <input
                            type="password"
                            name="currentPassword"
                            value={security.currentPassword}
                            onChange={handleSecurityChange}
                            placeholder="••••••••"
                            className="w-full bg-slate-50/30 border border-slate-200 rounded-lg px-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 focus:bg-white text-sm transition-all font-medium shadow-sm"
                          />
                      </div>
                      <div className="md:block hidden"></div>
                      
                      <div className="space-y-2.5">
                         <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Password Baru</label>
                         <input
                            type="password"
                            name="newPassword"
                            value={security.newPassword}
                            onChange={handleSecurityChange}
                            placeholder="Min. 8 karakter"
                            className="w-full bg-slate-50/30 border border-slate-200 rounded-lg px-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 focus:bg-white text-sm transition-all font-medium shadow-sm"
                          />
                      </div>

                      <div className="space-y-2.5">
                         <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Ulangi Password</label>
                         <input
                            type="password"
                            name="confirmPassword"
                            value={security.confirmPassword}
                            onChange={handleSecurityChange}
                            placeholder="Konfirmasi password"
                            className="w-full bg-slate-50/30 border border-slate-200 rounded-lg px-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 focus:bg-white text-sm transition-all font-medium shadow-sm"
                          />
                      </div>
                   </div>

                   <div className="flex justify-end pt-6 border-t border-slate-100 gap-4">
                      <button
                        onClick={handleChangePassword}
                        className="bg-blue-600 text-white px-10 py-4 rounded-lg text-[10px] font-medium uppercase tracking-[2px] hover:bg-slate-900 transition-all shadow-xl shadow-blue-100 active:scale-95 flex items-center gap-2"
                      >
                         <span className="material-symbols-outlined text-lg">sync_lock</span>
                         Update Akses Akun
                      </button>
                   </div>
                </div>
              </section>

              {/* 2FA Card Placeholder */}
              <section className="bg-white rounded-2xl border border-slate-200 p-10 classic-shadow-lg flex flex-col md:flex-row items-center justify-between gap-8 border-l-8 border-l-emerald-500">
                 <div className="flex items-center gap-8 text-center md:text-left flex-col md:flex-row">
                    <div className="w-16 h-16 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg border-4 border-white rotate-6 transition-transform hover:rotate-0">
                       <span className="material-symbols-outlined text-3xl font-medium">verified_user</span>
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-800 tracking-tight text-xl flex items-center gap-2 justify-center md:justify-start">
                         Login 2-Step (2FA)
                         <span className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-full">ACTIVE</span>
                       </h4>
                       <p className="text-[13px] text-slate-400 mt-1 font-medium italic">"Gunakan verifikasi tambahan untuk perlindungan maksimal."</p>
                    </div>
                 </div>
                 <div 
                    onClick={() => setSecurity(s => ({...s, twoFactor: !s.twoFactor}))}
                    className={`w-16 h-9 rounded-full relative cursor-pointer transition-all duration-300 shadow-inner ${security.twoFactor ? 'bg-emerald-500 box-content' : 'bg-slate-200'}`}
                 >
                    <div className={`absolute top-1 w-7 h-7 bg-white rounded-full shadow-lg transition-all duration-500 ${security.twoFactor ? 'left-8' : 'left-1'}`}></div>
                 </div>
              </section>
            </div>
          )}

          {/* SECTION: DANGER ZONE */}
          {activeTab === "danger" && (
            <div className="animate-[scaleIn_0.3s_ease-out]">
               <section className="bg-rose-50/50 rounded-3xl border-4 border-rose-100 border-dashed p-12 text-center space-y-10 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-200/20 rounded-full blur-3xl"></div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-200/20 rounded-full blur-3xl"></div>
                  
                  <div className="w-28 h-28 rounded-2xl bg-rose-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-rose-200 border-8 border-rose-50 animate-bounce cursor-not-allowed">
                      <span className="material-symbols-outlined text-6xl">dangerous</span>
                  </div>
                  
                  <div className="max-w-md mx-auto space-y-4">
                    <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-tight">Kehilangan Akses <br/><span className="text-rose-600">Selamanya?</span></h3>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium uppercase tracking-wide">Domain, Saldo Wallet, dan Riwayat Transaksi Anda akan dimusnahkan permanen.</p>
                  </div>
                  
                  <div className="pt-6 relative z-10">
                    <button 
                       onClick={() => error("Fitur ini dibatasi demi keamanan domain aktif.")}
                       className="bg-slate-900 text-white px-12 py-5 rounded-xl text-[11px] font-medium uppercase tracking-[4px] hover:bg-rose-600 transition-all shadow-2xl shadow-slate-200 transform active:scale-95"
                    >
                       EKSEKUSI PENGHAPUSAN
                    </button>
                    <p className="text-[11px] text-slate-400 mt-8 font-medium uppercase tracking-[3px] hover:text-slate-900 cursor-pointer transition-all inline-block hover:scale-110" onClick={() => setActiveTab('profile')}>Kembali ke Keamanan</p>
                  </div>
               </section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
