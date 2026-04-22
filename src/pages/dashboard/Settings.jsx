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
    district: "",
    village: "",
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
  // Pass current profile state, city, district, and village as initial values for pre-fill
  const addressHook = useAddress(profile.state, profile.city, profile.district, profile.village);

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
          district: data.district || "",
          village: data.village || "",
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
      district: profile.district,
      village: profile.village,
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
        district: profile.district,
        village: profile.village,
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
    <div className="pb-32 animate-[fadeIn_0.5s_ease-out] max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
      {/* 1. HEADER */}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 2. SIDEBAR NAVIGATION */}
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
            <div className="animate-[scaleIn_0.3s_ease-out]">
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                
                {/* BANNER HEADER */}
                <div className="h-32 bg-gradient-to-r from-orange-500 to-amber-400 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                </div>

                <div className="px-4 sm:px-8 pb-10 relative">
                    {/* AVATAR OVERLAY */}
                    <div className="flex flex-col sm:flex-row sm:justify-between items-center sm:items-end -mt-12 mb-8 gap-4 sm:gap-0">
                        <div className="relative group z-10 w-24 h-24 rounded-2xl bg-white p-1.5 shadow-xl flex-shrink-0">
                            <div className="w-full h-full rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 relative bg-slate-50 transition-all duration-300">
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-4xl text-slate-300">account_circle</span>
                                )}
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white cursor-pointer backdrop-blur-[2px]">
                                    <span className="material-symbols-outlined text-xl">camera_alt</span>
                                </div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAvatarChange} />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
                                <span className="material-symbols-outlined text-[14px] font-bold">verified</span>
                            </div>
                        </div>
                        <div className="pb-1 text-center sm:text-right mt-2 sm:mt-0">
                           <h3 className="text-xl font-bold text-slate-800 tracking-tight">{profile.firstName || 'Member'} {profile.lastName}</h3>
                           <p className="text-[12px] text-slate-500 font-medium">{profile.email}</p>
                        </div>
                    </div>

                    {/* TWO COLUMN FORM GRID */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                        
                        {/* LEFT: BASIC INFO */}
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px] border-b border-slate-100 pb-2">Informasi Personal</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Nama Depan</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={profile.firstName}
                                        onChange={handleProfileChange}
                                        placeholder="Budi"
                                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 text-sm font-medium text-slate-800 transition-all"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Nama Belakang</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={profile.lastName}
                                        onChange={handleProfileChange}
                                        placeholder="Fulan"
                                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 text-sm font-medium text-slate-800 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex justify-between">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Alamat Email</label>
                                  <button onClick={() => setIsEmailEditing(!isEmailEditing)} className="text-[10px] uppercase font-bold text-orange-600 hover:text-slate-900 tracking-wider">Ubah</button>
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={profile.email}
                                    onChange={handleProfileChange}
                                    readOnly={!isEmailEditing}
                                    className={`w-full border rounded-lg px-4 py-3 outline-none text-sm font-medium text-slate-800 transition-all ${isEmailEditing ? 'bg-white border-orange-500 ring-2 ring-orange-50' : 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'}`}
                                />
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex justify-between">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">No. Whatsapp</label>
                                  <button onClick={() => setIsPhoneEditing(!isPhoneEditing)} className="text-[10px] uppercase font-bold text-orange-600 hover:text-slate-900 tracking-wider">Ubah</button>
                                </div>
                                <input
                                    type="text"
                                    name="phone"
                                    value={profile.phone}
                                    onChange={handleProfileChange}
                                    readOnly={!isPhoneEditing}
                                    placeholder="081xxx"
                                    className={`w-full border rounded-lg px-4 py-3 outline-none text-sm font-medium text-slate-800 transition-all ${isPhoneEditing ? 'bg-white border-orange-500 ring-2 ring-orange-50' : 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'}`}
                                />
                            </div>

                            <div className="space-y-2.5">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Bio Singkat</label>
                                <textarea
                                    name="bio"
                                    rows="3"
                                    value={profile.bio}
                                    onChange={handleProfileChange}
                                    placeholder="Ceritakan sedikit rentang bisnis Anda..."
                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 text-sm font-medium text-slate-800 transition-all resize-none"
                                ></textarea>
                            </div>
                        </div>

                        {/* RIGHT: ADDRESS */}
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px] border-b border-slate-100 pb-2">Alamat Penagihan & Registrasi</h4>
                            
                            <div className="space-y-4">
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
                                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 text-sm font-medium text-slate-800 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* PROFILE CARD FOOTER ACTION BAR */}
                <div className="bg-slate-50/50 px-4 sm:px-8 py-6 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-end items-center gap-4 mt-auto">
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block mr-4 text-right leading-tight">
                         Ada perubahan<br/><span className="text-orange-500 font-extrabold">belum disimpan</span>
                     </p>
                     <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
                         <button
                            onClick={() => window.location.reload()}
                            className="flex-1 sm:flex-none px-6 py-3.5 rounded-lg text-[10px] font-bold uppercase tracking-[2px] text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors text-center"
                         >
                            Batalkan
                         </button>
                         <button
                            id="save-btn"
                            onClick={handleSaveAll}
                            className="flex-1 sm:flex-none justify-center bg-orange-600 text-white px-6 sm:px-10 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-[2px] hover:bg-slate-900 transition-all shadow-xl shadow-orange-100 active:scale-95 flex items-center gap-2 sm:gap-3"
                         >
                            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">cloud_upload</span>
                            Simpan Profil
                         </button>
                     </div>
                </div>
              </section>
            </div>
          )}

          {/* SECTION: SECURITY */}
          {activeTab === "security" && (
            <div className="animate-[scaleIn_0.3s_ease-out] space-y-8">
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50/50 px-4 sm:px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                       <span className="material-symbols-outlined text-2xl">vpn_key</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight uppercase tracking-widest">Update Password</h3>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">Gunakan kombinasi simbol & angka demi keamanan ekstra.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-8 space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 sm:gap-y-8 max-w-4xl">
                      <div className="space-y-2.5">
                         <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1.5">Password Saat Ini</label>
                         <input
                            type="password"
                            name="currentPassword"
                            value={security.currentPassword}
                            onChange={handleSecurityChange}
                            placeholder="••••••••"
                            className="w-full bg-slate-50/30 border border-slate-200 rounded-lg px-5 py-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm font-medium shadow-sm"
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
                            className="w-full bg-slate-50/30 border border-slate-200 rounded-lg px-5 py-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm font-medium shadow-sm"
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
                            className="w-full bg-slate-50/30 border border-slate-200 rounded-lg px-5 py-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm font-medium shadow-sm"
                          />
                      </div>
                   </div>

                   <div className="flex justify-end pt-6 border-t border-slate-100">
                      <button
                        onClick={handleChangePassword}
                        className="w-full sm:w-auto justify-center bg-slate-900 text-white px-8 py-3 rounded-xl text-[11px] font-medium uppercase tracking-[2px] hover:bg-blue-600 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                      >
                         <span className="material-symbols-outlined text-lg">sync_lock</span>
                         Ubah Password
                      </button>
                   </div>
                </div>
              </section>

            </div>
          )}

          {/* SECTION: DANGER ZONE */}
          {activeTab === "danger" && (
            <div className="animate-[scaleIn_0.3s_ease-out]">
               <section className="bg-rose-50/50 rounded-3xl border-2 border-rose-200 border-dashed p-12 text-center space-y-8">
                  <div className="w-24 h-24 rounded-2xl bg-rose-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-rose-200 animate-pulse">
                      <span className="material-symbols-outlined text-5xl">dangerous</span>
                  </div>
                  
                  <div className="max-w-md mx-auto space-y-3">
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight leading-tight">Kehilangan Akses <br/><span className="text-rose-600">Selamanya?</span></h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">Domain dan Saldo Wallet Anda akan dimusnahkan permanen.</p>
                  </div>
                  
                  <div className="pt-4">
                    <button 
                       onClick={() => error("Fitur ini dibatasi demi keamanan domain aktif.")}
                       className="bg-slate-900 text-white px-10 py-4 rounded-xl text-[11px] font-medium uppercase tracking-[4px] hover:bg-rose-600 transition-all shadow-xl active:scale-95"
                    >
                       Tutup Akun
                    </button>
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
