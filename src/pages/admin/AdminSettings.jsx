import React, { useState, useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api"; 
import useAddress from "../../hooks/useAddress";
import AddressFields from "../../components/forms/AddressFields";
import { useConfirm } from "../../context/ConfirmContext";

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
  
  const [isPhoneEditing, setIsPhoneEditing] = useState(false);
  const [isEmailEditing, setIsEmailEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

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
    
    fetchAdminData();
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
    const loadingBtn = document.getElementById("save-btn");
    if (loadingBtn) loadingBtn.innerHTML = "Menyimpan...";
    
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

      success("✅ Password Admin berhasil diubah!");
      setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      error(`❌ ${err.response?.data || "Gagal mengubah password"}`);
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
      {/* HEADER SECTION */}
      <div className="mb-10 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Profile Settings</h1>
          <p className="text-slate-500 mt-1 font-medium">Kelola identitas dan keamanan akses root Anda.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setActiveTab("profile")}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                Profil
            </button>
            <button 
                onClick={() => setActiveTab("security")}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                Keamanan
            </button>
        </div>
      </div>

      <div className="max-w-5xl">
        {activeTab === "profile" ? (
          <div className="space-y-8 animate-[scaleIn_0.3s_ease-out]">
            {/* AVATAR CARD */}
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
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">
                        <span className="material-symbols-outlined text-[16px] font-bold">admin_panel_settings</span>
                    </div>
                </div>
                <div className="text-center md:text-left flex-1">
                    <h2 className="text-2xl font-bold text-slate-900">{profile.firstName} {profile.lastName}</h2>
                    <p className="text-slate-500 font-medium flex items-center justify-center md:justify-start gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Administrator Role
                    </p>
                    <p className="text-sm text-slate-400 mt-4 max-w-md">{profile.bio || "No bio available for this administrator."}</p>
                </div>
            </div>

            {/* FORM CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="col-span-full">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px] border-b border-slate-100 pb-2 mb-6">Personal Information</h3>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nama Depan</label>
                        <input
                            type="text"
                            name="firstName"
                            value={profile.firstName}
                            onChange={handleProfileChange}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 text-sm font-bold text-slate-800 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nama Belakang</label>
                        <input
                            type="text"
                            name="lastName"
                            value={profile.lastName}
                            onChange={handleProfileChange}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 text-sm font-bold text-slate-800 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center pr-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email (Read-only)</label>
                        </div>
                        <input
                            type="email"
                            value={profile.email}
                            readOnly
                            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3.5 outline-none text-sm font-bold text-slate-500 cursor-not-allowed"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">No. WhatsApp</label>
                        <input
                            type="text"
                            name="phone"
                            value={profile.phone}
                            onChange={handleProfileChange}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 text-sm font-bold text-slate-800 transition-all"
                        />
                    </div>

                    <div className="col-span-full">
                         <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[2px] border-b border-slate-100 pb-2 mb-6 mt-4">Address Details</h3>
                         <AddressFields 
                            formData={profile} 
                            setFormData={setProfile}
                            addressHook={addressHook}
                        />
                    </div>
                </div>

                <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex justify-end items-center gap-4">
                    <button
                        id="save-btn"
                        onClick={handleSaveAll}
                        className="bg-slate-900 text-white px-10 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[2px] hover:bg-orange-600 transition-all shadow-xl active:scale-95 flex items-center gap-3"
                    >
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Update Admin Profile
                    </button>
                </div>
            </div>
          </div>
        ) : (
          <div className="animate-[scaleIn_0.3s_ease-out]">
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 space-y-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">security</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Account Security</h3>
                            <p className="text-sm text-slate-500 font-medium">Pastikan password Anda kuat untuk menjaga akses root.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Password Saat Ini</label>
                            <input
                                type="password"
                                name="currentPassword"
                                value={security.currentPassword}
                                onChange={handleSecurityChange}
                                placeholder="••••••••"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm font-bold text-slate-800 transition-all"
                            />
                        </div>
                        <div className="hidden md:block"></div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Password Baru</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={security.newPassword}
                                onChange={handleSecurityChange}
                                placeholder="Minimal 8 karakter"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm font-bold text-slate-800 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Ulangi Password Baru</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={security.confirmPassword}
                                onChange={handleSecurityChange}
                                placeholder="Konfirmasi password baru"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm font-bold text-slate-800 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={handleChangePassword}
                        className="bg-slate-900 text-white px-10 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[2px] hover:bg-blue-600 transition-all shadow-xl active:scale-95 flex items-center gap-3"
                    >
                        <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                        Reset Access Password
                    </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
