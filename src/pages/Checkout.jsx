import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";
import api from "../services/api";

const Checkout = () => {
    const { success, error, warning } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();

    // State Data
    const [cartItems, setCartItems] = useState([]);
    const [invoiceMode, setInvoiceMode] = useState(false);
    const [invoiceDetails, setInvoiceDetails] = useState(null);
    const [user, setUser] = useState(null);
    const [whoisPrivacy, setWhoisPrivacy] = useState(true);
    const [autoRenew, setAutoRenew] = useState(true);
    const [nameservers, setNameservers] = useState(["ns1.domaindagang.id", "ns2.domaindagang.id"]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pricingMap, setPricingMap] = useState({});
    const [loading, setLoading] = useState(true);

    // Payment State
    const [gateways, setGateways] = useState([]);
    const [selectedGateway, setSelectedGateway] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [serviceFee, setServiceFee] = useState(0);
    const [isFetchingFee, setIsFetchingFee] = useState(false);

    // Voucher State
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [myVouchers, setMyVouchers] = useState([]);
    const [isVoucherExpanded, setIsVoucherExpanded] = useState(false);
    const selectedVoucherId = appliedVoucher?.code || null;

    // Preview State
    const [previewData, setPreviewData] = useState(null);
    const [isFetchingPreview, setIsFetchingPreview] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [showAllItems, setShowAllItems] = useState(false);

    const getCategoryIcon = (key) => {
        if (key === 'bankva') return 'account_balance';
        if (key === 'qris') return 'qr_code_2';
        if (key === 'manual_bank') return 'payments';
        if (key === 'ewallet') return 'account_balance_wallet';
        return 'payments';
    };

    const isVoucherEligible = (v) => {
        console.log("[VoucherUI] Checking:", v.code, v);
        // 1. Min Purchase Check
        const minPur = parseFloat(v.min_transaction || 0);
        if (minPur > grossSubtotal) return { eligible: false, reason: `Min. Belanja ${formatRupiah(minPur)}` };

        // 2. Applicable To / TLD Check
        console.log("[VoucherUI] Checking Eligibility for:", v.code, {
            raw_applicable_to: v.applicable_to,
            type: typeof v.applicable_to,
            cart: cartItems.map(i => i.name)
        });

        let eligibleTlds = [];
        try {
            eligibleTlds = typeof v.applicable_to === 'string' ? JSON.parse(v.applicable_to || "[]") : (v.applicable_to || []);
        } catch (e) {
            console.error("[VoucherUI] JSON Parse Error for applicable_to:", e);
            eligibleTlds = [];
        }

        console.log("[VoucherUI] Parsed Eligible TLDs:", eligibleTlds);

        if (eligibleTlds.length > 0 && !eligibleTlds.includes('all')) {
            const hasMatchingItem = cartItems.some(item => {
                const name = (item.name || "").toLowerCase();
                const match = eligibleTlds.some(tld => {
                    const normTld = tld.toLowerCase().startsWith('.') ? tld.toLowerCase() : `.${tld.toLowerCase()}`;
                    return name.endsWith(normTld);
                });
                console.log(`[VoucherUI] Item ${name} vs TLDs: ${match}`);
                return match;
            });
            if (!hasMatchingItem) {
                return { eligible: false, reason: `Khusus domain: ${eligibleTlds.join(', ').toUpperCase()}` };
            }
        }

        // 3. Action Check (Register, Renew, etc)
        let eligibleActions = [];
        try {
            eligibleActions = typeof v.eligible_actions === 'string' ? JSON.parse(v.eligible_actions || "[]") : (v.eligible_actions || []);
        } catch (e) { eligibleActions = []; }

        if (eligibleActions.length > 0 && !eligibleActions.includes('all')) {
            const hasMatchingAction = cartItems.some(item => {
                const itemAction = (item.action || 'register').toLowerCase();
                return eligibleActions.some(act => act.toLowerCase() === itemAction);
            });
            if (!hasMatchingAction) {
                return { eligible: false, reason: `Hanya untuk: ${eligibleActions.join(', ').toUpperCase()}` };
            }
        }

        return { eligible: true };
    };

    const getCategoryName = (key) => {
        if (key === 'bankva') return 'Virtual Account';
        if (key === 'qris') return 'QRIS / QR Code';
        if (key === 'manual_bank') return 'Transfer Manual';
        if (key === 'ewallet') return 'E-Wallet';
        return key.toUpperCase();
    };

    // --- INITIALIZATION ---
    useEffect(() => {
        const initCheckout = async () => {
            setLoading(true);
            try {
                const storedUserRaw = localStorage.getItem("user");
                if (!storedUserRaw) {
                    warning("Silakan login untuk melanjutkan.");
                    navigate("/register", { state: { from: "checkout" } });
                    return;
                }
                const storedUser = JSON.parse(storedUserRaw);

                const [pricingRes, userRes, gwRes, walletRes, myVouchersRes] = await Promise.all([
                    api.get('/pricing/all'),
                    api.get(`/users/${storedUser.id}`).catch(() => ({ data: storedUser })),
                    api.get("/payment-gateways").catch(() => ({ data: [] })),
                    api.get("/wallet").catch(() => ({ data: null })),
                    api.get("/vouchers/my-vouchers").catch(() => ({ data: [] }))
                ]);

                const map = {};
                pricingRes.data.forEach(p => {
                    const key = p.tld.startsWith('.') ? p.tld : `.${p.tld}`;
                    map[key] = p;
                });
                setPricingMap(map);
                setUser(userRes.data);
                setGateways(gwRes.data);
                setWallet(walletRes.data);
                setMyVouchers(Array.isArray(myVouchersRes.data) ? myVouchersRes.data.filter(v => (v.status || v.claim_status) === 'claimed') : []);

                const queryParams = new URLSearchParams(location.search);
                const invoiceId = queryParams.get("invoiceId");

                if (invoiceId) {
                    setInvoiceMode(true);
                    const invRes = await api.get(`/billing/invoice/${invoiceId}`);
                    const inv = invRes.data;
                    setInvoiceDetails(inv);
                    setCartItems(inv.items.map(it => ({
                        name: it.name,
                        action: it.action_type || 'register',
                        price: it.price,
                        duration: it.duration || 1
                    })));
                    if (inv.coupon_code) {
                        setAppliedVoucher({ 
                            code: inv.coupon_code, 
                            title: inv.coupon_title || inv.coupon_code,
                            discountAmount: parseFloat(inv.discount || 0) 
                        });
                    }
                } else {
                    const cartData = JSON.parse(localStorage.getItem("checkout_payload") || localStorage.getItem("cart") || "[]");
                    let items = Array.isArray(cartData) ? cartData : [cartData];
                    const domainParam = queryParams.get("domain");
                    if (domainParam) {
                        items = items.filter(it => it.name.toLowerCase() === domainParam.toLowerCase());
                    }
                    setCartItems(items);

                    // AUTO APPLY PENDING VOUCHER
                    const pendingCode = localStorage.getItem("pending_voucher");
                    if (pendingCode && Array.isArray(myVouchersRes.data)) {
                        const v = myVouchersRes.data.find(x => x.code === pendingCode && (x.status === 'claimed' || x.claim_status === 'claimed'));
                        if (v) {
                            setAppliedVoucher({
                                code: v.code,
                                title: v.title,
                                discountAmount: 0 // Will be calculated by preview effect
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Init Error:", err);
                error("Gagal memuat data.");
            } finally {
                setLoading(false);
            }
        };
        initCheckout();
    }, [navigate, location.search]);

    // --- PREVIEW EFFECT ---
    useEffect(() => {
        if (loading || isProcessing || invoiceMode || cartItems.length === 0) return;
        const fetchPreview = async () => {
            setIsFetchingPreview(true);
            try {
                const res = await api.post('/checkout/preview', { userId: user.id, items: cartItems, userVoucherCode: selectedVoucherId });
                if (res.data) setPreviewData(res.data);
            } catch (err) { console.error("Preview Error:", err); }
            finally { setIsFetchingPreview(false); }
        };
        const tid = setTimeout(fetchPreview, 300);
        return () => clearTimeout(tid);
    }, [cartItems, selectedVoucherId, loading, invoiceMode]);

    // --- DERIVED VARIABLES ---
    const isTopUpOnly = cartItems.length > 0 && cartItems.every(item => item.action === 'topup');
    const walletBalance = wallet?.balance || 0;
    const formatRupiah = (num) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);

    const getItemLineTotal = (item) => {
        // Ensure price is a number even if it's stored as a string with 'Rp'
        const parsePrice = (p) => {
            if (typeof p === 'number') return p;
            if (!p) return 0;
            return parseFloat(String(p).replace(/[^\d.-]/g, '')) || 0;
        };

        if (item.action === 'topup' || item.type === 'topup') return parsePrice(item.price);
        
        let tld = "";
        if (item.extension) {
            tld = item.extension.startsWith('.') ? item.extension : `.${item.extension}`;
        } else if (item.name && item.name.includes('.')) {
            const name = item.name.toLowerCase();
            const tldRegex = /\.[a-z]{2,}(\.[a-z]{2})?$/;
            const match = name.match(tldRegex);
            if (match) {
                tld = match[0];
            } else {
                const parts = name.split('.');
                tld = `.${parts[parts.length - 1]}`;
            }
        }

        const p = pricingMap[tld];
        if (!p) return parsePrice(item.price || item.rawPrice);
        const duration = item.duration || 1;
        const reg = parseFloat(p.price_register);
        const ren = parseFloat(p.price_renew);
        const tra = parseFloat(p.price_transfer);
        const res = parseFloat(p.price_restore || 0);

        const action = (item.action || 'register').toLowerCase();
        if (action === 'renew') return ren * duration;
        if (action === 'transfer') return tra + (ren * (duration - 1));
        if (action === 'restore') return res;
        return reg + (ren * (duration - 1));
    };

    let grossSubtotal = invoiceMode && invoiceDetails ? parseFloat(invoiceDetails.subtotal) : (previewData ? previewData.subtotal : cartItems.reduce((acc, it) => acc + getItemLineTotal(it), 0));
    const voucherDiscount = previewData ? (previewData.total_discount || 0) : (appliedVoucher?.discountAmount || 0);
    const referralDiscount = previewData?.referral_discount || 0;
    const netAmount = Math.max(0, grossSubtotal - voucherDiscount - referralDiscount);
    const ppnAmount = isTopUpOnly ? 0 : Math.floor(netAmount * 0.11);
    const grandTotal = netAmount + ppnAmount;

    // --- FEE CALCULATION ---
    useEffect(() => {
        const fetchFee = async () => {
            // Force zero fee for: No gateway, Wallet, Prismalink, or Manual
            if (!selectedGateway || 
                selectedGateway.id === 'WALLET' || 
                selectedGateway.provider === 'prismalink' || 
                selectedGateway.provider === 'manual' ||
                selectedGateway.provider !== 'tripay'
            ) {
                setServiceFee(0);
                return;
            }

            setIsFetchingFee(true);
            try {
                const base = invoiceMode && invoiceDetails ? parseFloat(invoiceDetails.total) : grandTotal;
                // Only call Tripay fee API if provider is explicitly tripay
                const res = await api.get(`/payment-gateways/calculate-fee?channel=${selectedGateway.code || selectedGateway.id}&amount=${base}&provider=tripay`);
                if (res.data.success) {
                    setServiceFee(parseFloat(res.data.data.total_fee || 0));
                } else {
                    setServiceFee(0);
                }
            } catch (err) { 
                console.error("Fee calc error:", err);
                setServiceFee(0); 
            } finally { 
                setIsFetchingFee(false); 
            }
        };
        fetchFee();
    }, [selectedGateway, grandTotal, invoiceMode]);

    const totalToPay = grandTotal + serviceFee;
    
    // --- NEW HANDLERS: CART EDITING ---
    const handleRemoveItem = (idx) => {
        const newCart = cartItems.filter((_, i) => i !== idx);
        setCartItems(newCart);
        localStorage.setItem("cart", JSON.stringify(newCart));
        window.dispatchEvent(new Event("storage"));
        if (newCart.length === 0) {
            navigate("/dashboard/buy");
        }
    };

    const updateItemDuration = (idx, years) => {
        const newCart = [...cartItems];
        newCart[idx].duration = parseInt(years);
        setCartItems(newCart);
        localStorage.setItem("cart", JSON.stringify(newCart));
        window.dispatchEvent(new Event("storage"));
    };

    // --- HANDLERS ---
    const handlePay = async () => {
        if (!user || cartItems.length === 0) return;
        if (!selectedGateway) return error("Pilih metode pembayaran terlebih dahulu.");
        
        // Thorough Validation for domain registration (address details)
        if (!isTopUpOnly) {
            const missingFields = [];
            if (!user.phone) missingFields.push("No. HP");
            if (!user.address_line1) missingFields.push("Alamat");
            if (!user.city) missingFields.push("Kota");
            if (!user.state) missingFields.push("Provinsi");
            if (!user.zip_code) missingFields.push("Kode Pos");

            if (missingFields.length > 0) {
                return warning(`Profil belum lengkap! Mohon isi ${missingFields.join(", ")} di menu Pengaturan.`);
            }
        }
        
        setIsProcessing(true);
        try {
            let invoiceId;
            if (invoiceMode && invoiceDetails) {
                invoiceId = invoiceDetails.id;
            } else {
                const checkoutRes = await api.post("/checkout", {
                    userId: user.id,
                    totalAmount: grandTotal,
                    userVoucherCode: selectedVoucherId,
                    items: cartItems,
                    config: { whoisPrivacy, autoRenew, nameservers }
                });
                invoiceId = checkoutRes.data.invoiceId;
            }

            if (selectedGateway.id === 'WALLET') {
                const payRes = await api.post(`/billing/invoice/${invoiceId}/pay-wallet`);
                if (payRes.data.success) {
                    localStorage.removeItem("cart");
                    localStorage.removeItem("checkout_payload");
                    window.dispatchEvent(new Event("storage"));
                    success("Pembayaran Berhasil!");
                    setTimeout(() => navigate(`/payment/${invoiceId}`), 1000);
                } else {
                    throw new Error(payRes.data.error || "Gagal bayar wallet");
                }
            } else if (selectedGateway.provider === 'manual') {
                const payload = { invoice_number: invoiceId, payment_channel: selectedGateway.id };
                const payRes = await api.post("/billing/invoice/pay-manual", payload);
                if (payRes.data.success) {
                    localStorage.removeItem("cart");
                    window.dispatchEvent(new Event("storage"));
                    success("Pesanan Berhasil Dibuat!");
                    navigate(`/payment/${invoiceId}`, { state: { paymentResult: payRes.data.data } });
                } else {
                    throw new Error(payRes.data.message || "Gagal inisiasi pembayaran manual");
                }
            } else if (selectedGateway.provider === 'prismalink') {
                const payload = { invoice_number: invoiceId, payment_channel: selectedGateway.code };
                const payRes = await api.post("/prismalink/initialize", payload);
                if (payRes.data.success) {
                    localStorage.removeItem("cart");
                    window.dispatchEvent(new Event("storage"));
                    success("Menyiapkan Pembayaran...");
                    navigate(`/payment/${invoiceId}`, { state: { paymentResult: { ...payRes.data.data, provider: 'prismalink' } } });
                } else {
                    throw new Error(payRes.data.message || "Gagal inisiasi pembayaran Prismalink");
                }
            } else {
                const payload = { invoice_number: invoiceId, payment_channel: selectedGateway.id };
                const payRes = await api.post("/tripay/closed/create", payload);
                if (payRes.data.success) {
                    localStorage.removeItem("cart");
                    window.dispatchEvent(new Event("storage"));
                    success("Kode Pembayaran Dibuat!");
                    navigate(`/payment/${invoiceId}`, { state: { paymentResult: payRes.data.data?.data || payRes.data.data } });
                } else {
                    throw new Error(payRes.data.message || "Gagal inisiasi pembayaran");
                }
            }
        } catch (err) {
            error(err.message || "Terjadi kesalahan sistem.");
        } finally {
            setIsProcessing(false);
        }
    };

    const groupedGateways = {
        'bankva': gateways.filter(g => g.provider !== 'manual' && (g.type === 'VA' || g.type === 'VIRTUALACCOUNT' || g.type === 'DD')),
        'manual_bank': gateways.filter(g => g.provider === 'manual' && 
            (g.type === 'VA' || g.type === 'VIRTUALACCOUNT' || g.gateway_type === 'bank') && 
            g.type !== 'QRIS' && g.type !== 'EWALLET'
        ),
        'qris': gateways.filter(g => g.type === 'QRIS' || g.type === 'SCANNERQRIS' || g.type === 'QR'),
        'ewallet': gateways.filter(g => g.type === 'EWALLET' || g.type === 'E-WALLET' || g.type === 'CC'), // CC sementara masuk kategori ewallet atau buat baru jika perlu
    };

    const getBankLogo = (gw) => {
        if (gw.icon_url) return gw.icon_url;
        const c = String(gw.code || "").toLowerCase();
        const n = String(gw.name || "").toLowerCase();
        
        if (c.includes('bca') || c === '014' || n.includes('bca')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bank_Central_Asia.svg/1200px-Bank_Central_Asia.svg.png';
        if (c.includes('mandiri') || c === '008' || n.includes('mandiri')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2016.svg/2560px-Bank_Mandiri_logo_2016.svg.png';
        if (c.includes('bni') || c === '009' || n.includes('bni')) return 'https://upload.wikimedia.org/wikipedia/id/thumb/5/55/BNI_logo.svg/1200px-BNI_logo.svg.png';
        if (c.includes('bri') || c === '002' || n.includes('bri')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/BRI_Logo.svg/1200px-BRI_Logo.svg.png';
        if (c.includes('permata') || c === '013' || n.includes('permata')) return 'https://upload.wikimedia.org/wikipedia/id/thumb/e/e0/PermataBank_logo.svg/1200px-PermataBank_logo.svg.png';
        if (c.includes('danamon') || c === '011' || n.includes('danamon')) return 'https://upload.wikimedia.org/wikipedia/id/thumb/0/0e/Danamon_Logo.svg/1200px-Danamon_Logo.svg.png';
        if (c.includes('bsi') || c === '451' || n.includes('bsi')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Bank_Syariah_Indonesia.svg/2560px-Logo_Bank_Syariah_Indonesia.svg.png';
        if (c.includes('qris') || n.includes('qris')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_QRIS.svg/1200px-Logo_QRIS.svg.png';
        
        return '/image/banks/default.png';
    };

    const backLink = invoiceMode ? "/dashboard/billing" : "/dashboard";

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Memuat Data...</div>;

    return (
        <div className="min-h-screen bg-slate-50/50 py-6 px-2 md:px-4 lg:px-6">
            <div className="w-full">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate(backLink)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#FF6B00] transition-all shadow-sm">
                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Checkout</h2>
                        <p className="text-sm text-slate-500 font-medium">Selesaikan pembayaran untuk mengaktifkan layanan.</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                            {/* Step 1: Registran */}
                            <div className="p-6 border-b border-slate-50">
                                <div className="flex items-center gap-3 mb-5">
                                    <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Informasi Registran</h3>
                                </div>
                                <div className="grid md:grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Nama Lengkap</p>
                                        <p className="text-xs font-bold text-slate-800">{user.name}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                                        <p className="text-xs font-bold text-slate-800">{user.email}</p>
                                    </div>
                                </div>
                                {(!user.address_line1 || !user.phone || !user.city || !user.state || !user.zip_code) && (
                                    <div className="mt-3 p-3 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-3">
                                        <span className="material-symbols-outlined text-orange-600 text-sm">warning</span>
                                        <div className="flex-1">
                                            <p className="text-[10px] text-orange-800 font-bold">Profil Belum Lengkap</p>
                                            <Link to="/dashboard/settings" className="text-[9px] text-orange-600 font-bold uppercase underline">Lengkapi Sekarang</Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Item */}
                            <div className="p-6 border-b border-slate-50 bg-slate-50/20">
                                <div className="flex items-center gap-3 mb-5">
                                    <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                                    <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Daftar Layanan</h3>
                                </div>
                                <div className="space-y-2">
                                    {(showAllItems ? cartItems : cartItems.slice(0, 2)).map((item, i) => (
                                        <div key={i} className="p-3 bg-white rounded-xl border border-slate-100 flex justify-between items-center shadow-sm animate-in fade-in duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF6B00] flex items-center justify-center"><span className="material-symbols-outlined text-lg">language</span></div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-[10px] uppercase">{item.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{item.action}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                                        {invoiceMode ? (
                                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{item.duration || 1} Tahun</span>
                                                        ) : (
                                                            <select 
                                                                value={item.duration || 1}
                                                                onChange={(e) => updateItemDuration(i, e.target.value)}
                                                                className="text-[9px] font-extrabold text-[#FF6B00] bg-orange-50/50 border-none rounded-md py-0 px-1 focus:ring-0 cursor-pointer outline-none hover:bg-orange-100 transition-colors"
                                                            >
                                                                {[1,2,3,4,5,6,7,8,9,10].map(y => (
                                                                    <option key={y} value={y} className="text-slate-700">{y} Tahun</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold text-slate-900 text-xs">{formatRupiah(getItemLineTotal(item))}</span>
                                                {!invoiceMode && (
                                                    <button 
                                                        onClick={() => handleRemoveItem(i)}
                                                        className="w-7 h-7 rounded-lg bg-white border border-slate-100 text-slate-300 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 transition-all flex items-center justify-center group"
                                                        title="Hapus item"
                                                    >
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {cartItems.length > 2 && !showAllItems && (
                                        <button 
                                            onClick={() => setShowAllItems(true)}
                                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 rounded-xl text-[9px] font-bold text-slate-400 uppercase tracking-widest transition-all"
                                        >
                                            +{cartItems.length - 2} Layanan Lainnya
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Step 3: Konfigurasi (Muncul jika ada Register) */}
                            {cartItems.some(it => (it.action || 'register').toLowerCase() === 'register') && (
                                <div className="p-6 border-b border-slate-50 bg-slate-50/10">
                                    <div className="flex items-center gap-3 mb-5">
                                        <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                                        <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Konfigurasi Layanan</h3>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><span className="material-symbols-outlined text-lg">security</span></div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">WHOIS Privacy</p>
                                                    <p className="text-[9px] text-slate-400 font-medium uppercase">Sembunyikan data pribadi</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setWhoisPrivacy(!whoisPrivacy)} className={`w-10 h-5 rounded-full transition-all relative ${whoisPrivacy ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${whoisPrivacy ? 'right-0.5' : 'left-0.5'}`}></div>
                                            </button>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><span className="material-symbols-outlined text-lg">autorenew</span></div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">Auto Renew</p>
                                                    <p className="text-[9px] text-slate-400 font-medium uppercase">Perpanjang otomatis</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setAutoRenew(!autoRenew)} className={`w-10 h-5 rounded-full transition-all relative ${autoRenew ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${autoRenew ? 'right-0.5' : 'left-0.5'}`}></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* .ID Document Warning Banner */}
                            {cartItems.some(it => {
                                const name = (it.name || "").toLowerCase();
                                return name.endsWith(".co.id") || name.endsWith(".ac.id") || name.endsWith(".sch.id") || 
                                       name.endsWith(".or.id") || name.endsWith(".ponpes.id") || name.endsWith(".desa.id");
                            }) && (
                                <div className="mx-6 mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-4 shadow-sm animate-[fadeIn_0.3s_ease-out]">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-lg">info</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-blue-900 uppercase tracking-tight mb-1">Peringatan Dokumen</p>
                                        <p className="text-[9px] text-blue-800 font-medium leading-relaxed">
                                            Domain yang Anda pilih (.co.id, .ac.id, dll) memerlukan verifikasi dokumen legalitas. Anda wajib melengkapi persyaratan di Dashboard setelah pembayaran agar domain dapat diaktifkan.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="p-6">
                                 <div className="flex items-center gap-3 mb-8">
                                     <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">{cartItems.some(it => (it.action || 'register').toLowerCase() === 'register') ? '4' : '3'}</span>
                                     <h3 className="text-xs font-bold text-slate-900 uppercase tracking-[0.2em]">Metode Pembayaran</h3>
                                 </div>

                                <div className="space-y-3">
                                    {!cartItems.some(it => (it.action || '').toLowerCase() === 'topup') && (
                                        <div 
                                            onClick={() => {
                                                if (walletBalance >= totalToPay) {
                                                    setSelectedGateway({ id: 'WALLET', name: 'Wallet', type: 'WALLET' });
                                                } else if (selectedGateway?.id === 'WALLET') {
                                                    setSelectedGateway(null);
                                                }
                                            }} 
                                            className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                                                walletBalance < totalToPay 
                                                ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-50' 
                                                : 'cursor-pointer hover:border-slate-200'
                                            } ${selectedGateway?.id === 'WALLET' ? 'border-[#FF6B00] bg-orange-50/50 shadow-md' : 'border-slate-100'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedGateway?.id === 'WALLET' ? 'bg-[#FF6B00] text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-[10px] uppercase tracking-wider">Saldo Akun (Wallet)</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className={`text-[9px] font-bold ${walletBalance < totalToPay ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                            {formatRupiah(walletBalance)}
                                                        </p>
                                                        {walletBalance < totalToPay && (
                                                            <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 animate-pulse">
                                                                -{formatRupiah(totalToPay - walletBalance)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {selectedGateway?.id === 'WALLET' ? (
                                                <span className="material-symbols-outlined text-[#FF6B00] text-xl">check_circle</span>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>
                                            )}
                                        </div>
                                    )}

                                    {/* Accordion Categories */}
                                    {Object.entries(groupedGateways).map(([key, list]) => list.length > 0 && (
                                        <div key={key} className="border border-slate-100 rounded-xl overflow-hidden">
                                            <div 
                                                onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                                                className={`p-4 flex items-center justify-between cursor-pointer transition-all ${expandedCategory === key ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`material-symbols-outlined text-xl ${expandedCategory === key ? 'text-[#FF6B00]' : 'text-slate-400'}`}>{getCategoryIcon(key)}</span>
                                                    <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{getCategoryName(key)}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">{list.length} Channel</span>
                                                    <span className={`material-symbols-outlined text-slate-300 text-sm transition-transform ${expandedCategory === key ? 'rotate-180' : ''}`}>expand_more</span>
                                                </div>
                                            </div>

                                            {expandedCategory === key && (
                                                <div className="p-3 bg-white border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="max-h-[380px] overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2">
                                                        {list.map(gw => (
                                                            <div 
                                                                key={gw.id} 
                                                                onClick={() => setSelectedGateway(gw)} 
                                                                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedGateway?.id === gw.id ? 'border-[#FF6B00] bg-orange-50/20' : 'border-slate-100 hover:border-slate-200'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-8 flex items-center justify-center p-1 bg-white border border-slate-100 rounded-lg shadow-sm"><img src={getBankLogo(gw)} alt={gw.name} className="max-h-full max-w-full object-contain" /></div>
                                                                    <div>
                                                                        <p className="font-bold text-slate-800 text-[10px] uppercase tracking-tight">{gw.name.replace('VA', '').trim()}</p>
                                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{key === 'bankva' ? 'Virtual Account' : 'Payment Channel'}</p>
                                                                    </div>
                                                                </div>
                                                                {selectedGateway?.id === gw.id && <span className="material-symbols-outlined text-[#FF6B00] text-xl">check_circle</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xl shadow-slate-200/40 sticky top-6">
                            <h3 className="font-bold text-slate-900 uppercase text-[9px] tracking-[0.3em] mb-4">Ringkasan Tagihan</h3>
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase"><span>Subtotal</span><span className="text-slate-900 font-bold">{formatRupiah(grossSubtotal)}</span></div>
                                
                                {previewData?.referral_discount > 0 && (
                                    <div className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase">
                                        <div className="flex items-center gap-1">
                                            <span>Diskon Referral</span>
                                            <span className="material-symbols-outlined text-xs">verified</span>
                                        </div>
                                        <span>-{formatRupiah(previewData.referral_discount)}</span>
                                    </div>
                                )}

                                {voucherDiscount > 0 && (
                                    <div className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className="flex items-center gap-1">
                                            <span>Promo Terpasang</span>
                                            <span className="material-symbols-outlined text-xs">verified</span>
                                        </div>
                                        <span>-{formatRupiah(voucherDiscount)}</span>
                                    </div>
                                )}

                                {!isTopUpOnly && (
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase border-t border-slate-50 pt-2">
                                        <span>Pajak (11%)</span>
                                        <span className="text-slate-900 font-bold">+{formatRupiah(ppnAmount)}</span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase"><span>Layanan</span><span className="text-slate-900 font-bold">{isFetchingFee ? '...' : formatRupiah(serviceFee)}</span></div>
                            </div>

                            {!isTopUpOnly && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="h-px bg-slate-100 flex-1"></div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gunakan Promo</span>
                                        <div className="h-px bg-slate-100 flex-1"></div>
                                    </div>

                                    {!appliedVoucher ? (
                                        <>
                                            <button 
                                                onClick={() => setIsVoucherExpanded(!isVoucherExpanded)} 
                                                className={`w-full py-4 px-5 rounded-xl flex items-center justify-between group transition-all duration-300 border-2 ${isVoucherExpanded ? 'bg-orange-50/50 border-[#FF6B00] shadow-lg' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isVoucherExpanded ? 'bg-[#FF6B00] text-white shadow-lg' : 'bg-slate-50 text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100'}`}>
                                                        <span className="material-symbols-outlined text-xl">confirmation_number</span>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-none mb-1">Pilih Voucher</p>
                                                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">{myVouchers.length} Promo Tersedia</p>
                                                    </div>
                                                </div>
                                                <span className={`material-symbols-outlined text-slate-300 text-sm transition-transform duration-300 ${isVoucherExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                            </button>
                                            
                                            {isVoucherExpanded && (
                                                <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto pr-1.5 custom-scrollbar animate-in slide-in-from-top-2 duration-300">
                                                    {myVouchers.length === 0 ? (
                                                        <div className="text-center py-10 px-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                                            <span className="material-symbols-outlined text-slate-200 text-3xl mb-2">layers_clear</span>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Belum ada promo yang kamu klaim. <br/>Klaim di halaman Promo.</p>
                                                            <Link to="/dashboard/promo" className="text-[9px] text-[#FF6B00] font-bold uppercase underline mt-4 block">Cari Promo →</Link>
                                                        </div>
                                                    ) : (
                                                        myVouchers.map(v => {
                                                            const eligibility = isVoucherEligible(v);
                                                            const canUse = eligibility.eligible;
                                                            return (
                                                                <div 
                                                                    key={v.id} 
                                                                    onClick={() => { 
                                                                        if(canUse) { 
                                                                            setAppliedVoucher({ 
                                                                                code: v.code, 
                                                                                title: v.title,
                                                                                discountAmount: v.discount_type === 'percentage' ? Math.floor(grossSubtotal * (v.discount_value/100)) : v.discount_value 
                                                                            }); 
                                                                            setIsVoucherExpanded(false); 
                                                                            success(`Voucher "${v.title}" terpasang!`); 
                                                                        } else {
                                                                            warning(eligibility.reason);
                                                                        }
                                                                    }} 
                                                                    className={`p-4 rounded-xl border-2 transition-all duration-300 group/v relative overflow-hidden ${canUse ? 'border-slate-100 hover:border-[#FF6B00] cursor-pointer bg-white shadow-sm hover:shadow-md' : 'opacity-60 grayscale-[0.5] bg-slate-50 border-transparent cursor-not-allowed'}`}
                                                                >
                                                                    <div className="flex justify-between items-start relative z-10">
                                                                        <div className="flex-1 pr-4">
                                                                            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-tight mb-1 truncate group-hover/v:text-[#FF6B00] transition-colors">{v.title}</h4>
                                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{v.discount_type === 'percentage' ? `DISKON ${v.discount_value}%` : `DISKON ${formatRupiah(v.discount_value)}`}</p>
                                                                        </div>
                                                                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${canUse ? 'bg-orange-50 text-[#FF6B00] group-hover/v:bg-[#FF6B00] group-hover/v:text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                                            <span className="material-symbols-outlined text-sm">{canUse ? 'add_circle' : 'lock'}</span>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {!canUse && (
                                                                        <div className="mt-3 pt-3 border-t border-slate-200/50 relative z-10">
                                                                            <p className="text-[8px] text-rose-500 font-bold uppercase flex items-center gap-1">
                                                                                <span className="material-symbols-outlined text-[12px]">info</span> 
                                                                                {eligibility.reason}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Background Decor */}
                                                                    <span className="absolute bottom-[-10px] right-[-10px] material-symbols-outlined text-[64px] text-slate-50 opacity-20 rotate-12 group-hover/v:text-orange-50 group-hover/v:opacity-40 transition-all">local_activity</span>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="p-4 bg-emerald-50/50 border-2 border-emerald-500/30 rounded-xl flex items-center justify-between shadow-lg shadow-emerald-500/5 animate-in zoom-in-95 duration-300">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20"><span className="material-symbols-outlined text-2xl">check_circle</span></div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-0.5">Voucher Digunakan</p>
                                                    <p className="text-[11px] font-bold text-slate-900 uppercase italic truncate max-w-[140px]">{appliedVoucher.title}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setAppliedVoucher(null);
                                                    localStorage.removeItem("pending_voucher");
                                                }} 
                                                className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center active:scale-90"
                                            >
                                                <span className="material-symbols-outlined text-xl">close</span>
                                            </button>
                                        </div>
                                    )}
                                    
                                    {previewData?.voucher_warning && (
                                        <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
                                            <span className="material-symbols-outlined text-rose-500 text-sm">error</span>
                                            <p className="text-[9px] text-rose-600 font-bold uppercase">{previewData.voucher_warning}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="py-5 border-y-2 border-dashed border-slate-100 mb-6 text-center bg-slate-50/50 -mx-6">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-1.5">Total Bayar</p>
                                <p className="text-2xl font-bold text-slate-900 tracking-tighter">{formatRupiah(totalToPay)}</p>
                            </div>

                            <button onClick={handlePay} disabled={isProcessing || !selectedGateway} className="w-full bg-[#FF6B00] text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-orange-200 hover:bg-slate-900 transition-all disabled:opacity-50">
                                {isProcessing ? "Memproses..." : "Bayar Sekarang"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
