import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

const PaymentGatewaySettings = ({ systemSettings }) => {
  const { success, error } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentWebhookUrl, setCurrentWebhookUrl] = useState("");
  const [activeView, setActiveView] = useState('main'); // 'main', 'tripay_channels', 'prismalink_channels'
  
  // Tripay States
  const [tripayConfig, setTripayConfig] = useState({
      provider: 'tripay',
      is_active: false,
      mode: 'production',
      enabled_methods: ["VA", "QRIS", "EWALLET"],
      enabled_banks: { VA: [], QRIS: ["QRIS"], EWALLET: [] },
      merchant_code: "",
      api_key: "",
      private_key: "",
      webhook_url: ""
  });

  const [allTripayChannels, setAllTripayChannels] = useState([]);

  // Prismalink States
  const [prismalinkConfig, setPrismalinkConfig] = useState({
      provider: 'prismalink',
      is_active: false,
      mode: 'production',
      merchant_id: "",
      key_id: "",
      store_key: "",
      backend_callback: "",
      frontend_callback: "",
      enabled_methods: []
  });

  const [visibleKeys, setVisibleKeys] = useState({
    tripay_api_key: false,
    tripay_private_key: false,
    prismalink_key_id: false,
    prismalink_store_key: false
  });

  const toggleKeyVisibility = (key) => {
    setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const PRISMALINK_METHODS = [
      { id: '014', name: 'BCA Virtual Account', type: 'VA', bank_id: '014' },
      { id: '008', name: 'Mandiri Virtual Account', type: 'VA', bank_id: '008' },
      { id: '009', name: 'BNI Virtual Account', type: 'VA', bank_id: '009' },
      { id: '002', name: 'BRI Virtual Account', type: 'VA', bank_id: '002' },
      { id: '013', name: 'Permata Virtual Account', type: 'VA', bank_id: '013' },
      { id: '011', name: 'Danamon Virtual Account', type: 'VA', bank_id: '011' },
      { id: '451', name: 'BSI Virtual Account', type: 'VA', bank_id: '451' },
      { id: 'QR', name: 'QRIS (GPN)', type: 'QR', bank_id: '' },
      { id: 'CC', name: 'Credit Card', type: 'CC', bank_id: '' }
  ];

  // Manual States
  const [manualMethods, setManualMethods] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
      id: null,
      bank_name: "",
      account_number: "",
      account_holder: "",
      instructions: "",
      qris_url: "",
      logo_url: "",
      gateway_type: "bank",
      is_active: true
  });

  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    fetchConfig();
    fetchAllChannels();
    
    // Prioritaskan URL dari sistem settings, kalau kosong baru pake fallback localhost
    const backendUrl = systemSettings?.app_backend_url || window.location.origin.replace(':5173', ':3009');
    setCurrentWebhookUrl(`${backendUrl.replace(/\/$/, '')}/api/tripay/webhook`);
  }, [systemSettings]);

  const handleSyncUrls = (gateway) => {
    if (!systemSettings?.app_backend_url) {
      error("URL Backend belum diatur di tab 'URL Sistem'!");
      return;
    }

    const bUrl = systemSettings.app_backend_url.replace(/\/$/, '');
    const cUrl = (systemSettings.app_client_url || window.location.origin).replace(/\/$/, '');

    if (gateway === 'tripay') {
      setTripayConfig(prev => ({ ...prev, webhook_url: `${bUrl}/api/tripay/webhook` }));
      success("Webhook Tripay disinkronkan!");
    } else if (gateway === 'prismalink') {
      setPrismalinkConfig(prev => ({ 
        ...prev, 
        backend_callback: `${bUrl}/api/prismalink/webhook`,
        frontend_callback: `${cUrl}/dashboard/billing`
      }));
      success("Callback Prismalink disinkronkan!");
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.get("/payment-gateways/admin");
      const tripay = res.data.find(p => String(p.provider).toLowerCase() === 'tripay');
      const prismalink = res.data.find(p => String(p.provider).toLowerCase() === 'prismalink');
      const manual = res.data.filter(p => String(p.provider).toLowerCase() === 'manual');

      if (tripay) {
          const rawBanks = typeof tripay.enabled_banks === 'string' ? JSON.parse(tripay.enabled_banks) : (tripay.enabled_banks || {});
          
          // FLAT ARRAY: Ambil semua kode bank dari semua grup dan jadikan satu array saja
          const flatCodes = [...new Set(Object.values(rawBanks).flat())].filter(c => c);

          setTripayConfig({
              ...tripay,
              enabled_methods: typeof tripay.enabled_methods === 'string' ? JSON.parse(tripay.enabled_methods) : (tripay.enabled_methods || []),
              enabled_banks: flatCodes // Sekarang isinya cuma array ['BCAVA', 'QRISC', ...]
          });
          setInstructions(tripay.instructions || "");
      }

      if (prismalink) {
          setPrismalinkConfig({
              ...prismalink,
              merchant_id: prismalink.merchant_code || "",
              key_id: prismalink.api_key || "",
              store_key: prismalink.private_key || "",
              backend_callback: prismalink.webhook_url || "",
              frontend_callback: prismalink.frontend_callback || "",
              enabled_methods: typeof prismalink.enabled_methods === 'string' ? JSON.parse(prismalink.enabled_methods) : (prismalink.enabled_methods || [])
          });
      }

      setManualMethods(manual);
    } catch (err) {
      error("Gagal memuat konfigurasi pembayaran.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllChannels = async () => {
    try {
        const res = await api.get("/payment-gateways/tripay-channels");
        if (res.data.success) {
            setAllTripayChannels(res.data.data);
        }
    } catch (err) {
        console.error("Failed to fetch Tripay channels:", err);
    }
  };

  const saveTripay = async () => {
    setSaving(true);
    try {
      // Kita simpan FLAT ARRAY langsung agar backend yang handle normalisasinya
      // Ini jauh lebih aman daripada mapping grup di frontend yang rawan error jika data channel belum load
      const payload = { 
        provider: 'tripay',
        is_active: tripayConfig.is_active,
        mode: tripayConfig.mode,
        api_key: tripayConfig.api_key,
        merchant_code: tripayConfig.merchant_code,
        private_key: tripayConfig.private_key,
        webhook_url: tripayConfig.webhook_url,
        enabled_banks: JSON.stringify(tripayConfig.enabled_banks),
        enabled_methods: JSON.stringify(tripayConfig.enabled_methods),
        instructions
      };

      await api.put(`/payment-gateways/tripay`, payload);
      success("Konfigurasi Tripay berhasil disimpan!");
    } catch (err) {
      console.error(err);
      error("Gagal menyimpan konfigurasi Tripay.");
    } finally {
      setSaving(false);
    }
  };

  const savePrismalink = async () => {
    setSaving(true);
    try {
        const payload = { 
            provider: 'prismalink',
            is_active: prismalinkConfig.is_active,
            mode: prismalinkConfig.mode,
            api_key: prismalinkConfig.key_id,
            merchant_code: prismalinkConfig.merchant_id,
            private_key: prismalinkConfig.store_key,
            webhook_url: prismalinkConfig.backend_callback,
            frontend_callback: prismalinkConfig.frontend_callback,
            enabled_methods: prismalinkConfig.enabled_methods
        };
        await api.put(`/payment-gateways/prismalink`, payload);
        success("Konfigurasi Prismalink berhasil disimpan!");
    } catch (err) {
        error("Gagal menyimpan konfigurasi Prismalink.");
    } finally {
        setSaving(false);
    }
  };

  const handleImageUpload = async (e, type) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);
      
      const oldUrl = type === 'bank' ? editForm.logo_url : editForm.qris_url;
      if (oldUrl) formData.append('oldImageUrl', oldUrl);

      setSaving(true);
      try {
          const res = await api.post("/upload/gateway", formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (res.data.success) {
              if (type === 'bank') setEditForm({ ...editForm, logo_url: res.data.imageUrl });
              else setEditForm({ ...editForm, qris_url: res.data.imageUrl });
              success("Gambar berhasil diunggah!");
          }
      } catch (err) {
          error("Gagal mengunggah gambar.");
      } finally {
          setSaving(false);
      }
  };

  const toggleTripayActive = async () => {
      const newStatus = !tripayConfig.is_active;
      setTripayConfig(prev => ({ ...prev, is_active: newStatus }));
      try {
          const payload = {
              provider: 'tripay',
              is_active: newStatus,
              api_key: tripayConfig.api_key,
              merchant_code: tripayConfig.merchant_code,
              private_key: tripayConfig.private_key,
              webhook_url: tripayConfig.webhook_url,
              mode: tripayConfig.mode,
              enabled_banks: JSON.stringify(tripayConfig.enabled_banks),
              enabled_methods: JSON.stringify(tripayConfig.enabled_methods),
              instructions
          };
          await api.put(`/payment-gateways/tripay`, payload);
          success(`Tripay berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      } catch (err) { error("Gagal mengupdate status Tripay"); fetchConfig(); }
  };

  const togglePrismalinkActive = async () => {
      const newStatus = !prismalinkConfig.is_active;
      setPrismalinkConfig(prev => ({ ...prev, is_active: newStatus }));
      try {
          const payload = { ...prismalinkConfig, is_active: newStatus, merchant_id: prismalinkConfig.merchant_id, key_id: prismalinkConfig.key_id, secret_key: prismalinkConfig.store_key, backend_callback: prismalinkConfig.backend_callback };
          await api.put(`/payment-gateways/prismalink`, payload);
          success(`Prismalink berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      } catch (err) { error("Gagal mengupdate status Prismalink"); fetchConfig(); }
  };

  const toggleManualActive = async () => {
      const currentStatus = manualMethods.some(m => m.is_active);
      const newStatus = !currentStatus;
      setManualMethods(prev => prev.map(m => ({ ...m, is_active: newStatus })));
      setSaving(true);
      try {
          const promises = manualMethods.map(m => api.put(`/payment-gateways/manual/${m.id}`, { ...m, is_active: newStatus }));
          await Promise.all(promises);
          success(`Semua metode manual berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
          fetchConfig();
      } catch (err) { error("Gagal mengupdate metode manual"); fetchConfig(); } finally { setSaving(false); }
  };

  const toggleSingleManualStatus = async (method) => {
      const newStatus = !method.is_active;
      // Optimistic Update
      setManualMethods(prev => prev.map(m => m.id === method.id ? { ...m, is_active: newStatus } : m));
      try {
          await api.put(`/payment-gateways/manual/${method.id}`, { ...method, is_active: newStatus });
          success(`${method.bank_name} berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      } catch (err) {
          error("Gagal mengupdate status.");
          fetchConfig();
      }
  };

  const toggleTripayBank = (group, bankCode) => {
      setTripayConfig(prev => {
          const currentBanks = Array.isArray(prev.enabled_banks) ? prev.enabled_banks : [];
          const isSelected = currentBanks.includes(bankCode);
          const newBanks = isSelected 
              ? currentBanks.filter(c => c !== bankCode) 
              : [...currentBanks, bankCode];
          
          return { ...prev, enabled_banks: newBanks };
      });
  };

  const togglePrismalinkMethod = (methodId) => {
      setPrismalinkConfig(prev => {
          const current = prev.enabled_methods || [];
          const isSelected = current.includes(methodId);
          const newMethods = isSelected ? current.filter(m => m !== methodId) : [...current, methodId];
          return { ...prev, enabled_methods: newMethods };
      });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    success("URL Webhook disalin!");
  };

  const handleEditManual = (method) => {
      setEditForm(method);
      setIsEditing(true);
  };

  const handleAddManual = (type) => {
      setEditForm({ id: null, bank_name: "", account_number: "", account_holder: "", instructions: "", qris_url: "", logo_url: "", gateway_type: type, is_active: true });
      setIsEditing(true);
  };

  const handleSaveManual = async () => {
      setSaving(true);
      try {
          if (editForm.id) {
              await api.put(`/payment-gateways/manual/${editForm.id}`, editForm);
              success("Metode pembayaran manual diperbarui!");
          } else {
              await api.post("/payment-gateways/manual", editForm);
              success("Metode pembayaran manual ditambahkan!");
          }
          setIsEditing(false);
          fetchConfig();
      } catch (err) {
          error("Gagal menyimpan metode manual.");
      } finally {
          setSaving(false);
      }
  };

  const handleDeleteManual = async (id) => {
      if (!window.confirm("Hapus metode pembayaran ini?")) return;
      try {
          await api.delete(`/payment-gateways/manual/${id}`);
          success("Metode pembayaran dihapus!");
          fetchConfig();
      } catch (err) {
          error("Gagal menghapus metode.");
      }
  };

  const renderManualForm = () => (
      <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{editForm.id ? 'Edit' : 'Tambah'} {editForm.gateway_type === 'bank' ? 'Bank' : 'QRIS'}</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Bank / Wallet</label>
                  <input type="text" value={editForm.bank_name} onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })} placeholder="Contoh: BCA, Mandiri, Dana" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nomor Rekening / HP</label>
                  <input type="text" value={editForm.account_number} onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Pemilik</label>
                  <input type="text" value={editForm.account_holder} onChange={(e) => setEditForm({ ...editForm, account_holder: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none" />
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Logo {editForm.gateway_type === 'bank' ? 'Bank' : 'QRIS'}</label>
                  <div className="flex gap-4 items-center">
                      {(editForm.logo_url || editForm.qris_url) && <img src={editForm.gateway_type === 'bank' ? editForm.logo_url : editForm.qris_url} className="w-12 h-12 rounded-lg object-contain bg-white border p-1" alt="preview" />}
                      <input type="file" onChange={(e) => handleImageUpload(e, editForm.gateway_type)} className="text-[10px] text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Instruksi Pembayaran</label>
                  <textarea value={editForm.instructions} onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })} rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 focus:border-blue-500 outline-none" />
              </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 rounded-xl transition">Batal</button>
              <button onClick={handleSaveManual} disabled={saving} className="px-8 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition">Simpan Metode</button>
          </div>
      </div>
  );

  if (isLoading) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Memuat konfigurasi...</div>;

  // VIEW: TRIPAY CHANNELS
  if (activeView === 'tripay_channels') {
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setActiveView('main')} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition shadow-sm">
                          <span className="material-symbols-outlined">arrow_back</span>
                      </button>
                      <div>
                          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Atur Channel Tripay</h2>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Pilih bank & e-wallet yang ingin kamu aktifkan</p>
                      </div>
                  </div>
                  <button onClick={() => { saveTripay(); setActiveView('main'); }} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      Simpan & Selesai
                  </button>
              </div>

               <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-10 shadow-sm">
                  {tripayConfig.enabled_methods.map(group => {
                      // Normalize group name for matching
                      const groupChannels = allTripayChannels.filter(ch => (ch.group || '').toUpperCase().replace(/\s+/g, '') === group.toUpperCase().replace(/\s+/g, ''));
                      if (groupChannels.length === 0) return null;
                      
                      return (
                          <div key={group} className="space-y-6">
                              <div className="flex items-center gap-3">
                                  <div className="px-3 py-1 bg-blue-50 rounded-lg text-blue-600 text-[9px] font-black uppercase tracking-widest">{group}</div>
                                  <div className="h-[1px] flex-1 bg-slate-100"></div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {groupChannels.map(ch => {
                                      const isSelected = Array.isArray(tripayConfig.enabled_banks) && tripayConfig.enabled_banks.includes(ch.code);
                                      return (
                                          <div key={ch.code} 
                                              onClick={() => toggleTripayBank(group, ch.code)}
                                              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50/20 shadow-sm' : 'border-slate-100 bg-slate-50/30 hover:border-slate-300'}`}>
                                              <div className="flex items-center gap-3 min-w-0">
                                                  <div className={`w-12 h-10 rounded-xl flex items-center justify-center p-2 shrink-0 shadow-sm transition-all ${isSelected ? 'bg-white' : 'bg-white grayscale opacity-40'}`}>
                                                      <img src={ch.icon_url} className="w-full h-full object-contain" alt={ch.name} />
                                                  </div>
                                                  <div className="min-w-0">
                                                      <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${isSelected ? 'text-blue-900' : 'text-slate-500'}`}>{ch.name}</h4>
                                                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{group}</span>
                                                  </div>
                                              </div>

                                              <div className="relative inline-flex items-center shrink-0">
                                                  <div className={`w-9 h-5 rounded-full transition-all relative ${isSelected ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                                      <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-all ${isSelected ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  // VIEW: PRISMALINK CHANNELS
  if (activeView === 'prismalink_channels') {
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setActiveView('main')} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition shadow-sm">
                          <span className="material-symbols-outlined">arrow_back</span>
                      </button>
                      <div>
                          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Atur Channel Prismalink</h2>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Pilih metode pembayaran yang didukung Prismalink</p>
                      </div>
                  </div>
                  <button onClick={() => { savePrismalink(); setActiveView('main'); }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      Simpan & Selesai
                  </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-10">
                  {/* GROUP: VIRTUAL ACCOUNT */}
                  <div className="space-y-6">
                      <div className="flex items-center gap-3">
                          <div className="px-3 py-1 bg-indigo-50 rounded-lg text-indigo-600 text-[9px] font-black uppercase tracking-widest">Virtual Account</div>
                          <div className="h-[1px] flex-1 bg-slate-100"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {PRISMALINK_METHODS.filter(m => m.type === 'VA').map(method => {
                              const isSelected = (prismalinkConfig.enabled_methods || []).includes(method.id);
                              const getBankLogo = (code) => {
                                  const bankCode = code ? String(code).toLowerCase() : '';
                                  if (bankCode === '014' || bankCode.includes('bca')) return '/image/banks/bca.png';
                                  if (bankCode === '008' || bankCode.includes('mandiri')) return '/image/banks/mandiri.png';
                                  if (bankCode === '009' || bankCode.includes('bni')) return '/image/banks/bni.png';
                                  if (bankCode === '002' || bankCode.includes('bri')) return '/image/banks/bri.png';
                                  if (bankCode === '013' || bankCode.includes('permata')) return '/image/banks/permata.png';
                                  if (bankCode === '011' || bankCode.includes('danamon')) return '/image/banks/danamon.png';
                                  if (bankCode === '451' || bankCode.includes('bsi')) return '/image/banks/bsi.png';
                                  if (!bankCode) return '/image/banks/generic.png'; // Fallback jika kode kosong
                                  return `/image/banks/${bankCode}.png`;
                              };

                              return (
                                  <div key={method.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${isSelected ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' : 'border-slate-100 bg-slate-50/30'}`}>
                                      <div className="flex items-center gap-3 min-w-0">
                                          <div className={`w-12 h-10 rounded-xl flex items-center justify-center p-2 shrink-0 shadow-sm transition-all ${isSelected ? 'bg-white' : 'bg-white grayscale opacity-40'}`}>
                                              <img src={getBankLogo(method.bank_id)} alt={method.name} className="w-full h-full object-contain" />
                                          </div>
                                          <div className="min-w-0">
                                              <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${isSelected ? 'text-indigo-900' : 'text-slate-500'}`}>{method.name.replace('Virtual Account', '').trim()}</h4>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">VA</span>
                                          </div>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                          <input type="checkbox" checked={isSelected} onChange={() => togglePrismalinkMethod(method.id)} className="sr-only peer" />
                                          <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                      </label>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* GROUP: QRIS & LAINNYA */}
                  <div className="space-y-6">
                      <div className="flex items-center gap-3">
                          <div className="px-3 py-1 bg-orange-50 rounded-lg text-orange-600 text-[9px] font-black uppercase tracking-widest">QRIS & Kartu Kredit</div>
                          <div className="h-[1px] flex-1 bg-slate-100"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {PRISMALINK_METHODS.filter(m => m.type !== 'VA').map(method => {
                              const isSelected = (prismalinkConfig.enabled_methods || []).includes(method.id);
                              return (
                                  <div key={method.id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${isSelected ? 'border-orange-400 bg-orange-50/20 shadow-sm' : 'border-slate-100 bg-slate-50/30'}`}>
                                      <div className="flex items-center gap-3 min-w-0">
                                          <div className={`w-12 h-10 rounded-xl flex items-center justify-center p-2 shrink-0 shadow-sm transition-all ${isSelected ? 'bg-white' : 'bg-white grayscale opacity-40'}`}>
                                              {method.id === 'QR' ? (
                                                  <img src="/image/banks/qris.png" className="w-full h-full object-contain" alt="QRIS" />
                                              ) : (
                                                  <img src="/image/banks/visa_master.png" className="w-full h-full object-contain" alt="Credit Card" />
                                              )}
                                          </div>
                                          <div className="min-w-0">
                                              <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${isSelected ? 'text-orange-900' : 'text-slate-500'}`}>{method.name}</h4>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{method.type === 'QR' ? 'QRIS' : 'Credit Card'}</span>
                                          </div>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                          <input type="checkbox" checked={isSelected} onChange={() => togglePrismalinkMethod(method.id)} className="sr-only peer" />
                                          <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                                      </label>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tripay Card */}
          <div className={`p-6 rounded-2xl border bg-white transition-all duration-300 ${tripayConfig.is_active ? 'border-emerald-200 shadow-lg shadow-emerald-500/5' : 'border-slate-200 opacity-80'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tripayConfig.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-2xl font-bold">bolt</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Tripay</h3>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5 tracking-tight">Otomatis VA/QRIS</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={tripayConfig.is_active} onChange={toggleTripayActive} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
              <div className={`w-1.5 h-1.5 rounded-full ${tripayConfig.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              <span className={`text-[10px] font-bold tracking-tight ${tripayConfig.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                {tripayConfig.is_active ? 'Status: Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>

          {/* Prismalink Card */}
          <div className={`p-6 rounded-2xl border bg-white transition-all duration-300 ${prismalinkConfig.is_active ? 'border-indigo-200 shadow-lg shadow-indigo-500/5' : 'border-slate-200 opacity-80'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${prismalinkConfig.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-2xl font-bold">account_balance_wallet</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Prismalink</h3>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5 tracking-tight">Credit Card & VA</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={prismalinkConfig.is_active} onChange={togglePrismalinkActive} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
              <div className={`w-1.5 h-1.5 rounded-full ${prismalinkConfig.is_active ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
              <span className={`text-[10px] font-bold tracking-tight ${prismalinkConfig.is_active ? 'text-indigo-600' : 'text-slate-400'}`}>
                {prismalinkConfig.is_active ? 'Status: Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>

          {/* Manual Card */}
          <div className={`p-6 rounded-2xl border bg-white transition-all duration-300 ${manualMethods.some(m => m.is_active) ? 'border-blue-200 shadow-lg shadow-blue-500/5' : 'border-slate-200 opacity-80'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${manualMethods.some(m => m.is_active) ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-2xl font-bold">account_balance</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Manual</h3>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5 tracking-tight">Bank & QRIS Manual</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={manualMethods.some(m => m.is_active)} onChange={toggleManualActive} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
              <div className={`w-1.5 h-1.5 rounded-full ${manualMethods.some(m => m.is_active) ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
              <span className={`text-[10px] font-bold tracking-tight ${manualMethods.some(m => m.is_active) ? 'text-blue-600' : 'text-slate-400'}`}>
                {manualMethods.some(m => m.is_active) ? 'Status: Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>
      </div>

      <div className="space-y-12">
        {/* TRIPAY CONFIG */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-500">bolt</span>
                    <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Teknis Tripay (Otomatis)</h2>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                    <button onClick={() => setTripayConfig({ ...tripayConfig, mode: 'sandbox' })} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${tripayConfig.mode === 'sandbox' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Sandbox</button>
                    <button onClick={() => setTripayConfig({ ...tripayConfig, mode: 'production' })} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${tripayConfig.mode === 'production' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Live</button>
                </div>
            </div>
            <div className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">API Key</label>
                        <div className="relative">
                            <input 
                                type={visibleKeys.tripay_api_key ? "text" : "password"} 
                                value={tripayConfig.api_key} 
                                onChange={(e) => setTripayConfig({ ...tripayConfig, api_key: e.target.value })} 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-12 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" 
                            />
                            <button 
                                type="button"
                                onClick={() => toggleKeyVisibility('tripay_api_key')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {visibleKeys.tripay_api_key ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Private Key</label>
                        <div className="relative">
                            <input 
                                type={visibleKeys.tripay_private_key ? "text" : "password"} 
                                value={tripayConfig.private_key} 
                                onChange={(e) => setTripayConfig({ ...tripayConfig, private_key: e.target.value })} 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-12 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none transition-all" 
                            />
                            <button 
                                type="button"
                                onClick={() => toggleKeyVisibility('tripay_private_key')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {visibleKeys.tripay_private_key ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Merchant Code</label>
                        <input type="text" value={tripayConfig.merchant_code} onChange={(e) => setTripayConfig({ ...tripayConfig, merchant_code: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Webhook URL</label>
                          <button 
                            onClick={() => handleSyncUrls('tripay')}
                            className="text-[9px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded"
                          >
                            <span className="material-symbols-outlined text-xs">sync</span>
                            Ambil dari URL Sistem
                          </button>
                        </div>
                        <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={tripayConfig.webhook_url || currentWebhookUrl} 
                              onChange={(e) => setTripayConfig({ ...tripayConfig, webhook_url: e.target.value })}
                              placeholder="https://domain.com/api/tripay/webhook"
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-800 focus:border-blue-500 outline-none transition-all shadow-sm" 
                            />
                            <button 
                              type="button"
                              onClick={() => copyToClipboard(tripayConfig.webhook_url || currentWebhookUrl)} 
                              className="px-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                            >
                              <span className="material-symbols-outlined text-lg">content_copy</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Metode Pembayaran Aktif</label>
                        <button onClick={() => setActiveView('tripay_channels')} className="w-full flex flex-col bg-white border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-2xl p-4 transition-all group">
                            <div className="flex items-center justify-between w-full mb-3">
                                <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-600 uppercase tracking-wider">Atur Channel Pembayaran</span>
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500">chevron_right</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(() => {
                                    const uniqueCodes = Array.isArray(tripayConfig.enabled_banks) ? tripayConfig.enabled_banks : [];
                                    
                                    return uniqueCodes.length > 0 ? (
                                        uniqueCodes.map(code => {
                                            const ch = allTripayChannels.find(c => c.code === code);
                                            return ch ? <img key={`tripay-${code}`} src={ch.icon_url} className="h-4 object-contain grayscale-[0.2] opacity-70" title={ch.name} /> : null;
                                        })
                                    ) : (
                                        <span className="text-[9px] font-bold text-slate-300 uppercase">Belum ada channel yang dipilih</span>
                                    );
                                })()}
                            </div>
                        </button>
                    </div>

                    <button onClick={saveTripay} disabled={saving} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-3">
                        <span className="material-symbols-outlined text-lg">save</span>
                        {saving ? "Proses..." : "Simpan Konfigurasi"}
                    </button>
                </div>
            </div>
        </section>

        {/* PRISMALINK CONFIG */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-indigo-500">account_balance_wallet</span>
                    <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Teknis Prismalink Gateway</h2>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                    <button onClick={() => setPrismalinkConfig({ ...prismalinkConfig, mode: 'sandbox' })} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${prismalinkConfig.mode === 'sandbox' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Sandbox</button>
                    <button onClick={() => setPrismalinkConfig({ ...prismalinkConfig, mode: 'production' })} className={`px-3 py-1 rounded-md text-[9px] font-black uppercase ${prismalinkConfig.mode === 'production' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Live</button>
                </div>
            </div>
            <div className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Merchant ID</label>
                        <input type="text" value={prismalinkConfig.merchant_id} onChange={(e) => setPrismalinkConfig({ ...prismalinkConfig, merchant_id: e.target.value })} placeholder="0017750..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Key ID</label>
                        <div className="relative">
                            <input 
                                type={visibleKeys.prismalink_key_id ? "text" : "password"} 
                                value={prismalinkConfig.key_id} 
                                onChange={(e) => setPrismalinkConfig({ ...prismalinkConfig, key_id: e.target.value })} 
                                placeholder="b233760..." 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-12 text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all" 
                            />
                            <button 
                                type="button"
                                onClick={() => toggleKeyVisibility('prismalink_key_id')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {visibleKeys.prismalink_key_id ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Store Key (Secret)</label>
                        <div className="relative">
                            <input 
                                type={visibleKeys.prismalink_store_key ? "text" : "password"} 
                                value={prismalinkConfig.store_key} 
                                onChange={(e) => setPrismalinkConfig({ ...prismalinkConfig, store_key: e.target.value })} 
                                placeholder="Kunci rahasia dari Prismalink" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-12 text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all" 
                            />
                            <button 
                                type="button"
                                onClick={() => toggleKeyVisibility('prismalink_store_key')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {visibleKeys.prismalink_store_key ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Backend Callback URL (Webhook)</label>
                          <button 
                            onClick={() => handleSyncUrls('prismalink')}
                            className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded"
                          >
                            <span className="material-symbols-outlined text-xs">sync</span>
                            Ambil dari URL Sistem
                          </button>
                        </div>
                        <input type="text" value={prismalinkConfig.backend_callback} onChange={(e) => setPrismalinkConfig({ ...prismalinkConfig, backend_callback: e.target.value })} placeholder="https://domain.com/api/prismalink/webhook" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Frontend Callback URL (Redirect URL)</label>
                        <input type="text" value={prismalinkConfig.frontend_callback} onChange={(e) => setPrismalinkConfig({ ...prismalinkConfig, frontend_callback: e.target.value })} placeholder="https://domain.com/dashboard/billing" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none" />
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Metode Pembayaran Aktif</label>
                        <button onClick={() => setActiveView('prismalink_channels')} className="w-full flex flex-col bg-white border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl p-4 transition-all group">
                            <div className="flex items-center justify-between w-full mb-3">
                                <span className="text-[10px] font-black text-slate-500 group-hover:text-indigo-600 uppercase tracking-wider">Atur Channel Pembayaran</span>
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500">chevron_right</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {(prismalinkConfig.enabled_methods || []).length > 0 ? (
                                    prismalinkConfig.enabled_methods.map(id => {
                                        const method = PRISMALINK_METHODS.find(m => m.id === id);
                                        if (!method) return null;

                                        // Bank Logo Mapping
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
                                            <div key={`prismalink-summary-${id}`} className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 opacity-80">
                                                <img src={getBankLogo(method.bank_id || method.id)} className="h-3 object-contain" alt={method.name} />
                                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-tight">{method.name.replace('Virtual Account', '').replace('VirtualAccount', '').trim()}</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <span className="text-[9px] font-bold text-slate-300 uppercase">Belum ada metode yang dipilih</span>
                                )}
                            </div>
                        </button>
                    </div>

                    <button onClick={savePrismalink} disabled={saving} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-3">
                        <span className="material-symbols-outlined text-lg">save</span>
                        {saving ? "Proses..." : "Simpan Konfigurasi"}
                    </button>
                </div>
            </div>
        </section>

        {/* MANUAL BANK SECTION */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-500">account_balance</span>
                    <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Daftar Rekening Bank</h2>
                </div>
                <button onClick={() => handleAddManual('bank')} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider">Tambah Bank</button>
            </div>
            <div className="p-8">
                {isEditing && editForm.gateway_type === 'bank' && renderManualForm()}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {manualMethods.filter(m => (m.gateway_type || 'bank') === 'bank').map(m => (
                        <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-100 transition-all group shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center p-2 group-hover:bg-white transition-colors">
                                    {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-contain" alt="logo" /> : <span className="material-symbols-outlined text-slate-300">account_balance</span>}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{m.bank_name}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold">{m.account_number} • {m.account_holder}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={m.is_active} onChange={() => toggleSingleManualStatus(m)} className="sr-only peer" />
                                    <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEditManual(m)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                    <button onClick={() => handleDeleteManual(m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* QRIS SECTION */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-orange-500">qr_code_scanner</span>
                    <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Daftar QRIS Manual</h2>
                </div>
                <button onClick={() => handleAddManual('qris')} className="px-4 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider">Tambah QRIS</button>
            </div>
            <div className="p-8">
                {isEditing && editForm.gateway_type === 'qris' && renderManualForm()}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {manualMethods.filter(m => m.gateway_type === 'qris').map(m => (
                        <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-orange-100 transition-all group shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center p-2 group-hover:bg-white transition-colors">
                                    {m.qris_url ? <img src={m.qris_url} className="w-full h-full object-contain" alt="qris" /> : <span className="material-symbols-outlined text-slate-300">qr_code</span>}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{m.bank_name}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold">QRIS • {m.account_holder}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={m.is_active} onChange={() => toggleSingleManualStatus(m)} className="sr-only peer" />
                                    <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-600"></div>
                                </label>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEditManual(m)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-orange-600 hover:bg-orange-50 transition"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                    <button onClick={() => handleDeleteManual(m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
      </div>
    </div>
  );
};

export default PaymentGatewaySettings;
