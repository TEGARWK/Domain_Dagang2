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

    const [backendSummary, setBackendSummary] = useState(null);

    // Payment State
    const [gateways, setGateways] = useState([]);
    const [selectedGateway, setSelectedGateway] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [expandedMethod, setExpandedMethod] = useState(null);
    const [serviceFee, setServiceFee] = useState(0);
    const [isFetchingFee, setIsFetchingFee] = useState(false);

    // Voucher State
    const [appliedVoucher, setAppliedVoucher] = useState(null); // { code, discountAmount }
    const [voucherError, setVoucherError] = useState("");
    const [myVouchers, setMyVouchers] = useState([]);
    const [showVoucherPicker, setShowVoucherPicker] = useState(false);
    const selectedVoucherId = appliedVoucher?.code || null;

    // Preview State (Source of Truth)
    const [previewData, setPreviewData] = useState(null);
    const [isFetchingPreview, setIsFetchingPreview] = useState(false);



    const handleRemoveItem = (index) => {
        const updatedItems = cartItems.filter((_, i) => i !== index);
        setCartItems(updatedItems);

        if (updatedItems.length === 0) {
            localStorage.removeItem("checkout_payload");
            localStorage.removeItem("cart");
            navigate("/cart"); // Go back to cart if empty
        } else {
            // Update both if we are in cart mode
            const selectionData = localStorage.getItem("checkout_payload");
            if (selectionData) {
                localStorage.setItem("checkout_payload", JSON.stringify(updatedItems));
            } else {
                localStorage.setItem("cart", JSON.stringify(updatedItems));
            }
        }
        window.dispatchEvent(new Event("storage"));
    };

    // --- CEK BACK LINK ---
    const isUserLoggedIn = localStorage.getItem("user");
    const backLink = isUserLoggedIn ? "/dashboard" : "/";

    // Load Data saat halaman dibuka
    useEffect(() => {
        const initCheckout = async () => {
            setLoading(true);
            try {
                const safeParse = (key) => {
                    const data = localStorage.getItem(key);
                    try {
                        if (!data || data === "undefined" || data === "null") return null;
                        return JSON.parse(data);
                    } catch (error) {
                        localStorage.removeItem(key);
                        return null;
                    }
                };


                const storedUser = safeParse("user");
                if (!storedUser) {
                    warning("Silakan daftar/login untuk melanjutkan pembayaran.");
                    navigate("/register", { state: { from: "checkout" } });
                    return;
                }

                // 1. Parallel fetch basic data
                const [pricingRes, userRes, gwRes, walletRes, myVouchersRes] = await Promise.all([
                    api.get('/pricing/all'),
                    api.get(`/users/${storedUser.id}`).catch(() => ({ data: storedUser })),
                    api.get("/payment-gateways").catch(() => ({ data: [] })),
                    api.get("/wallet").catch(() => ({ data: null })),
                    api.get("/vouchers/my-vouchers").catch(() => ({ data: [] }))
                ]);

                // Set basic data
                const map = {};
                pricingRes.data.forEach(p => {
                    const key = p.tld.startsWith('.') ? p.tld : `.${p.tld}`;
                    map[key] = p;
                });
                setPricingMap(map);
                setUser(userRes.data);
                setGateways(gwRes.data);
                setWallet(walletRes.data);
                // Filter only claimed (unused) vouchers
                const claimedVouchers = Array.isArray(myVouchersRes.data)
                    ? myVouchersRes.data.filter(v => v.claim_status === 'claimed')
                    : [];
                setMyVouchers(claimedVouchers);

                // 2. Handle specific mode (Invoice vs Cart)
                const queryParams = new URLSearchParams(location.search);
                const invoiceId = queryParams.get("invoiceId");

                if (invoiceId) {
                    setInvoiceMode(true);
                    const invRes = await api.get(`/billing/invoice/${invoiceId}`);
                    const inv = invRes.data;
                    setInvoiceDetails(inv);

                    const mappedItems = inv.items.map(item => {
                        const name = item.name.toLowerCase();
                        let extension = "";

                        // Improved TLD Extraction for .biz.id etc
                        const tldRegex = /\.[a-z]{2,}(\.[a-z]{2})?$/;
                        const match = name.match(tldRegex);
                        if (match) {
                            extension = match[0];
                        } else if (name.includes('.')) {
                            const parts = name.split('.');
                            extension = `.${parts[parts.length - 1]}`;
                        }

                        return {
                            name: item.name,
                            action: item.action_type || item.action || item.type,
                            price: item.price,
                            duration: item.duration || item.years || 1,
                            extension: extension
                        };
                    });
                    setCartItems(mappedItems);

                    if (inv.coupon_code) {
                        setAppliedVoucher({
                            code: inv.coupon_code,
                            discountAmount: parseFloat(inv.discount || 0)
                        });
                    }
                } else {
                    // NORMAL CART MODE
                    const selectionData = safeParse("checkout_payload");
                    const cartData = selectionData || safeParse("cart");
                    let items = Array.isArray(cartData) ? cartData : (cartData ? [cartData] : []);

                    // --- NEW: SENSITIVE FILTERING (Ghost Item Buster) ---
                    const domainParam = queryParams.get("domain");
                    if (domainParam) {
                        const filtered = items.filter(it => it.name.toLowerCase() === domainParam.toLowerCase());
                        if (filtered.length > 0) {
                            items = filtered; // Only show the requested domain if it's in our cart/payload
                        }
                    }

                    setCartItems(items);

                    // Auto-apply pending voucher from "PAKAI" button in Vouchers page
                    const pendingVoucherCode = localStorage.getItem("pending_voucher");
                    if (pendingVoucherCode && claimedVouchers.length > 0) {
                        const found = claimedVouchers.find(v => v.code === pendingVoucherCode);
                        if (found) {
                            // Local discount check for auto-apply
                            const tempGross = items.reduce((acc, it) => acc + (it.price || 0), 0);
                            const meetsMin = parseFloat(found.min_purchase || 0) <= tempGross;
                            if (meetsMin) {
                                let discountAmount = 0;
                                if (found.type === 'percentage') {
                                    discountAmount = Math.floor(tempGross * (parseFloat(found.value) / 100));
                                    if (parseFloat(found.max_discount) > 0) discountAmount = Math.min(discountAmount, parseFloat(found.max_discount));
                                } else {
                                    discountAmount = Math.min(parseFloat(found.value), tempGross);
                                }
                                setAppliedVoucher({ code: found.code, discountAmount });
                            }
                        }
                        localStorage.removeItem("pending_voucher");
                    }
                }
            } catch (err) {
                console.error("Initialization error:", err);
                error("Gagal memuat data checkout.");
                const queryParams = new URLSearchParams(location.search);
                if (queryParams.get("invoiceId")) {
                    navigate("/dashboard/billing");
                }
            } finally {
                setLoading(false);
            }
        };

        initCheckout();
    }, [navigate, location.search]);

    // --- NEW: PREVIEW EFFECT (Source of Truth) ---
    useEffect(() => {
        if (loading || isProcessing || invoiceMode || cartItems.length === 0) return;

        const fetchPreview = async () => {
            setIsFetchingPreview(true);
            try {
                const payload = {
                    userId: user.id,
                    items: cartItems,
                    userVoucherCode: selectedVoucherId
                };
                const res = await api.post('/checkout/preview', payload);
                if (res.data) {
                    setPreviewData(res.data);
                    // Sync voucher warning if any
                    if (res.data.voucher_warning) {
                        setVoucherError(res.data.voucher_warning);
                    } else {
                        setVoucherError("");
                    }
                }
            } catch (err) {
                console.error("Preview failed:", err);
            } finally {
                setIsFetchingPreview(false);
            }
        };

        const timeoutId = setTimeout(fetchPreview, 300); // Small debounce
        return () => clearTimeout(timeoutId);
    }, [cartItems, selectedVoucherId, loading, invoiceMode]);






    const isTopUpOnly = cartItems.length > 0 && cartItems.every(item => item.action === 'topup');
    const isRenewOnly = cartItems.length > 0 && cartItems.every(item => item.action === 'renew');
    const isTransferOnly = cartItems.length > 0 && cartItems.every(item => item.action === 'transfer');
    const isRegisterOnly = cartItems.length > 0 && cartItems.every(item => !item.action || item.action === 'register');

    const formatRupiah = (num) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(num);
    };

    const getItemLineTotal = (item) => {
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

        if (loading) return 0;
        if (item.action === 'topup' || item.type === 'topup') {
            return parseFloat(item.price || 0);
        }

        const p = pricingMap[tld];
        if (!p) return 0;

        const duration = item.duration || 1;
        const action = item.action || 'register';
        const regPrice = parseFloat(p.price_register);
        const renewPrice = parseFloat(p.price_renew);
        const transferPrice = parseFloat(p.price_transfer);

        if (action === 'renew') {
            return renewPrice * duration;
        } else if (action === 'transfer') {
            return transferPrice + (renewPrice * (duration - 1));
        } else if (action === 'restore') {
            return parseFloat(p.price_restore || 0);
        } else {
            if (duration > 1) {
                return regPrice + (renewPrice * (duration - 1));
            }
            return regPrice;
        }
    };

    const calculateTotalLine = () => {
        if (invoiceMode && invoiceDetails) {
            return parseFloat(invoiceDetails.total);
        }
        return cartItems.reduce((acc, item) => {
            return acc + getItemLineTotal(item);
        }, 0);
    };

    let lineTotal = calculateTotalLine();

    let grandTotal = 0;
    let grossSubtotal = 0;
    let netAmount = 0;
    let ppnAmount = 0;
    const voucherDiscount = previewData ? (previewData.total_discount || 0) : (appliedVoucher?.discountAmount || 0);
    const referralDiscount = previewData?.referral_discount || 0;

    const PPN_RATE = 0.11;
    if (invoiceMode && invoiceDetails) {
        // Base subtotal from invoice
        grossSubtotal = parseFloat(invoiceDetails.subtotal || (parseFloat(invoiceDetails.total) / 1.11));
        const discountedSubtotal = Math.max(0, grossSubtotal - voucherDiscount);

        const hasDomainInInv = invoiceDetails.items?.some(it =>
            it.name?.includes('.') ||
            (it.description || "").toLowerCase().includes('reg') ||
            (it.action_type || "").toLowerCase().includes('register')
        );

        if (hasDomainInInv) {
            ppnAmount = Math.floor(discountedSubtotal * PPN_RATE);
            grandTotal = discountedSubtotal + ppnAmount;
        } else {
            ppnAmount = 0;
            grandTotal = discountedSubtotal;
        }
        netAmount = discountedSubtotal;
    } else if (previewData) {
        // Use backend provided data
        grandTotal = previewData.total_payable;
        netAmount = previewData.net_amount;
        ppnAmount = previewData.tax_amount;
        grossSubtotal = previewData.subtotal;
    } else {
        // Fallback / Initial Local Logic
        grossSubtotal = lineTotal;
        const hasDomainItem = cartItems.some(item => {
            const act = (item.action || 'register').toLowerCase();
            return ['register', 'renew', 'transfer', 'restore'].includes(act);
        });

        const discountedSubtotal = Math.max(0, grossSubtotal - voucherDiscount);

        if (hasDomainItem) {
            ppnAmount = Math.floor(discountedSubtotal * PPN_RATE);
            grandTotal = discountedSubtotal + ppnAmount;
        } else {
            ppnAmount = 0;
            grandTotal = discountedSubtotal;
        }
        netAmount = discountedSubtotal;
    }

    const getBankLogo = (code) => {
        const bankCode = code ? code.toLowerCase() : '';
        if (bankCode.includes('bca')) return '/image/banks/bca.png';
        if (bankCode.includes('mandiri')) return '/image/banks/mandiri.png';
        if (bankCode.includes('bni')) return '/image/banks/bni.png';
        if (bankCode.includes('bri')) return '/image/banks/bri.png';
        if (bankCode.includes('bsi')) return '/image/banks/bsi.png';
        if (bankCode.includes('cimb')) return '/image/banks/cimb.png';
        if (bankCode.includes('danamon')) return '/image/banks/danamon.png';
        if (bankCode.includes('permata')) return '/image/banks/permata.png';
        if (bankCode.includes('muamalat')) return '/image/banks/muamalat.png';

        if (bankCode.includes('qris')) return '/image/banks/qris.png';
        if (bankCode.includes('ovo')) return '/image/banks/ovo.png';
        if (bankCode.includes('dana')) return '/image/banks/dana.png';
        if (bankCode.includes('linkaja')) return '/image/banks/linkaja.png';
        if (bankCode.includes('gopay')) return '/image/banks/gopay.png';
        if (bankCode.includes('shopeepay')) return '/image/banks/shopeepay.png';

        return '/image/no-image.png';
    };

    // --- SERVICE FEE CALCULATION ---
    useEffect(() => {
        const fetchFee = async () => {
            if (!selectedGateway || selectedGateway.id === 'WALLET') {
                setServiceFee(0);
                return;
            }

            setIsFetchingFee(true);
            try {
                // Calculate amount to be charged before payment fee
                const baseAmount = netAmount + ppnAmount;
                const res = await api.get(`/payment-gateways/calculate-fee?channel=${selectedGateway.code}&amount=${baseAmount}`);
                if (res.data.success) {
                    setServiceFee(res.data.data.total_fee);
                }
            } catch (err) {
                console.error("Failed to fetch service fee:", err);
            } finally {
                setIsFetchingFee(false);
            }
        };

        fetchFee();
    }, [selectedGateway, netAmount, ppnAmount]);

    const totalToPay = grandTotal + serviceFee;

    const handlePay = async () => {
        if (!user || cartItems.length === 0) return;
        if (!selectedGateway) return error("Pilih metode pembayaran terlebih dahulu.");
        if (grandTotal <= 0) return error("Total pembayaran tidak valid.");

        if (!isTopUpOnly && (!user.address_line1 || !user.city || !user.zip_code || !user.phone)) {
            return warning("Data profil belum lengkap! Lengkapi kontak & alamat Anda terlebih dahulu.");
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

            if (selectedGateway.type === 'WALLET') {
                const payRes = await api.post(`/billing/invoice/${invoiceId}/pay-wallet`);
                if (payRes.data.success) {
                    localStorage.removeItem("checkout_payload");
                    localStorage.removeItem("cart");
                    window.dispatchEvent(new Event("storage"));
                    success("Pembayaran Berhasil!");
                    setTimeout(() => navigate(`/payment/${invoiceId}`), 1000);
                } else {
                    throw new Error(payRes.data.error || "Gagal bayar wallet");
                }
            } else {
                const payload = {
                    invoice_number: invoiceId,
                    payment_channel: selectedGateway.id
                };
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
        'bankva': gateways.filter(g => g.type === 'VA' || g.type === 'VIRTUALACCOUNT'),
        'qris': gateways.filter(g => g.type === 'QRIS' || g.type === 'SCANNERQRIS'),
        'ewallet': gateways.filter(g => g.type === 'EWALLET' || g.type === 'E-WALLET')
    };

    if (loading || !user)
        return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Memuat Data...</div>;

    return (
        <div className="min-h-screen bg-slate-50 pt-10 pb-20 px-4 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link to={backLink} className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#F97316] hover:border-orange-200 transition">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {isTopUpOnly ? "Isi Saldo Wallet" : isRenewOnly ? "Perpanjang Masa Aktif" : isTransferOnly ? "Transfer Domain Anda" : "Selesaikan Pembayaran"}
                        </h1>
                        <p className="text-sm text-slate-500">Satu langkah lagi untuk mengaktifkan layanan Anda.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-8">
                        {!isTopUpOnly && (
                            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xs font-bold">1</span>
                                        Informasi Registran
                                    </h3>
                                    <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
                                        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Data Kontak</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Nama Lengkap</p>
                                        <p className="font-bold text-slate-800 text-xs">{user.name}</p>
                                    </div>
                                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Email Kontak</p>
                                        <p className="font-bold text-slate-800 text-xs truncate">{user.email}</p>
                                    </div>
                                </div>
                                {(!user.address_line1 || !user.city || !user.zip_code || !user.phone) && (
                                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-4 shadow-sm animate-[fadeIn_0.5s_ease-out]">
                                        <div className="w-10 h-10 rounded-full bg-white text-orange-600 flex items-center justify-center shrink-0 shadow-sm border border-orange-100">
                                            <span className="material-symbols-outlined text-[20px]">warning</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-bold text-orange-900 tracking-tight">Perhatian: Data Kontak Belum Lengkap</h4>
                                            <p className="text-[11px] text-orange-800/80 leading-relaxed mt-1 mb-3">Aturan pendaftaran domain mewajibkan pengisian <b>Alamat dan Nomor Telepon</b> yang valid sebagai bukti resmi kepemilikan Anda.</p>
                                            <Link to="/dashboard/settings" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white bg-orange-600 hover:bg-slate-900 px-4 py-2 rounded-lg transition-colors uppercase tracking-[1px] shadow-sm active:scale-95">
                                                Perbarui Profil Anda
                                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- ORDER SUMMARY (WHITE THEME) --- */}
                        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 mt-5 overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px] font-bold">
                                        {isTopUpOnly ? '1' : '2'}
                                    </span>
                                    Ringkasan Pesanan
                                </h3>
                            </div>
                            <div className="space-y-4 mb-6">
                                {cartItems.map((item, index) => {
                                    let originalPrice = getItemLineTotal(item);

                                    return (
                                        <div key={index} className="p-3 rounded-xl border transition-all bg-slate-50/30 border-slate-100">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className="font-bold text-xs text-slate-800 truncate">{item.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[8px] font-black text-[#F97316] uppercase border border-orange-100 bg-white px-1 py-0.2 rounded-sm">{item.action || 'Register'}</span>
                                                        {item.action !== 'topup' && item.type !== 'topup' && (
                                                            <span className="text-[8px] font-bold text-slate-400 tracking-wider">• {item.duration} THN</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {!invoiceMode && (
                                                    <button onClick={() => handleRemoveItem(index)} className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition">
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                            <div className="pt-1.5 border-t border-slate-200/40 flex justify-between items-center">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Harga Dasar</span>
                                                <div className="text-right">
                                                    <p className="font-black text-slate-800 text-xs">{formatRupiah(originalPrice)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* --- STEP 3: VOUCHER DISKON --- */}
                        {!isTopUpOnly && (
                            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 mt-5 relative">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                                        <span className="material-symbols-outlined text-[#F97316] text-xl">local_activity</span>
                                        Voucher
                                    </h3>

                                    {!appliedVoucher && (
                                        <button
                                            onClick={() => setShowVoucherPicker(!showVoucherPicker)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors group"
                                        >
                                            <span className="text-[#F97316] text-[10px] font-black uppercase tracking-[0.15em] transition-all">
                                                Gunakan Voucher
                                            </span>
                                            <span className={`material-symbols-outlined text-[#F97316] text-lg transition-transform duration-300 ${showVoucherPicker ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                    )}

                                    {voucherError && (
                                        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg animate-pulse">
                                            <p className="text-[10px] font-bold text-red-600 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm">error</span>
                                                {voucherError}
                                            </p>
                                        </div>
                                    )}

                                    {appliedVoucher && !voucherError && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                                Aktif
                                            </span>
                                            <button
                                                onClick={async () => {
                                                    if (invoiceMode && invoiceDetails) {
                                                        try {
                                                            await api.post(`/billing/invoice/${invoiceDetails.id}/recalculate`, { voucherCode: null });
                                                        } catch (err) {
                                                            console.error("Failed to remove voucher from invoice:", err);
                                                        }
                                                    }
                                                    setAppliedVoucher(null);
                                                    setVoucherError("");
                                                }}
                                                className="w-7 h-7 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {showVoucherPicker && !appliedVoucher && (
                                    <div className="absolute top-14 right-5 w-[300px] md:w-[350px] bg-white border border-slate-100 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                                        <div className="p-4 border-b border-slate-50 bg-slate-50/30">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">confirmation_number</span>
                                                Voucher Saya
                                            </p>
                                        </div>
                                        <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {Array.isArray(myVouchers) && myVouchers.length > 0 ? (
                                                <div className="space-y-2">
                                                    {myVouchers.map((v) => {
                                                        const baseForDiscount = netAmount + ppnAmount;
                                                        const minPrice = parseFloat(v.min_purchase || 0);
                                                        const meetsMin = minPrice <= baseForDiscount;

                                                        const eligibleTlds = v.eligible_tlds || [];
                                                        const eligibleActions = v.eligible_actions || [];
                                                        const hasConditions = eligibleTlds.length > 0 || eligibleActions.length > 0;

                                                        const tldMatch = !eligibleTlds.length || cartItems.some(item => eligibleTlds.includes(item.extension || ""));
                                                        const actionMatch = !eligibleActions.length || cartItems.some(item => eligibleActions.includes(item.action || "register"));
                                                        const isEligible = !hasConditions || (tldMatch && actionMatch);

                                                        const canApply = meetsMin && isEligible;

                                                        let previewDiscount = 0;
                                                        if (meetsMin) {
                                                            if (v.type === 'percentage') {
                                                                previewDiscount = Math.floor(baseForDiscount * (parseFloat(v.value || 0) / 100));
                                                                const maxD = parseFloat(v.max_discount || 0);
                                                                if (maxD > 0) previewDiscount = Math.min(previewDiscount, maxD);
                                                            } else {
                                                                previewDiscount = Math.min(parseFloat(v.value || 0), baseForDiscount);
                                                            }
                                                        }

                                                        return (
                                                            <div
                                                                key={v.claim_id || v.id}
                                                                onClick={async () => {
                                                                    if (!canApply) return;

                                                                    if (invoiceMode && invoiceDetails) {
                                                                        try {
                                                                            const res = await api.post(`/billing/invoice/${invoiceDetails.id}/recalculate`, { voucherCode: v.code });
                                                                            setAppliedVoucher({
                                                                                code: v.code,
                                                                                discountAmount: res.data.discount || previewDiscount
                                                                            });
                                                                            setInvoiceDetails(res.data);
                                                                        } catch (err) {
                                                                            setVoucherError(err.response?.data?.error || "Gagal menerapkan voucher.");
                                                                            return;
                                                                        }
                                                                    } else {
                                                                        setAppliedVoucher({ code: v.code, discountAmount: previewDiscount });
                                                                    }
                                                                    setVoucherError("");
                                                                    setShowVoucherPicker(false);
                                                                }}
                                                                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all group ${canApply
                                                                        ? 'border-emerald-50 bg-white hover:border-emerald-200 cursor-pointer hover:shadow-sm'
                                                                        : 'border-slate-50 bg-slate-50/50 opacity-60 cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 transition-colors ${canApply ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-slate-100 text-slate-300'
                                                                        }`}>
                                                                        <p className="font-black text-[10px] leading-none">{v.type === 'percentage' ? `${parseFloat(v.value)}%` : `${Math.floor(parseFloat(v.value) / 1000)}K`}</p>
                                                                        <p className="text-[6px] font-bold uppercase opacity-80 mt-0.5">OFF</p>
                                                                    </div>
                                                                    <div className="overflow-hidden">
                                                                        <p className="font-bold text-slate-800 text-[11px] leading-tight truncate">{v.title || 'Promo Voucher'}</p>
                                                                        <p className="text-[9px] text-slate-400 mt-0.5">Min. {formatRupiah(minPrice)}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    {canApply ? (
                                                                        <p className="text-[10px] text-emerald-600 font-black">-{formatRupiah(previewDiscount)}</p>
                                                                    ) : (
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                                                                                <span className="material-symbols-outlined text-slate-300 text-[14px]">lock</span>
                                                                            </div>
                                                                            {!meetsMin && (
                                                                                <span className="text-[7px] font-bold text-orange-400 uppercase tracking-tighter">Kurang {formatRupiah(minPrice - baseForDiscount)}</span>
                                                                            )}
                                                                            {!tldMatch && eligibleTlds.length > 0 && (
                                                                                <span className="text-[7px] font-bold text-red-400 uppercase tracking-tighter">Hanya {eligibleTlds.join(',')}</span>
                                                                            )}
                                                                            {!actionMatch && eligibleActions.length > 0 && (
                                                                                <span className="text-[7px] font-bold text-red-400 uppercase tracking-tighter">Aksi: {eligibleActions.join(',')}</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 px-4">
                                                    <span className="material-symbols-outlined text-slate-200 text-3xl mb-2">local_activity</span>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada promo diklaim</p>
                                                    <button onClick={() => navigate('/dashboard/promo')} className="text-[#F97316] text-[9px] font-black uppercase mt-3 hover:underline">Klaim Sekarang</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {appliedVoucher && (
                                    <div className="mt-3 animate-in zoom-in-95 duration-200">
                                        <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                    <span className="material-symbols-outlined text-[18px]">verified</span>
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-[10px] tracking-wider uppercase flex items-center gap-1.5">
                                                        {appliedVoucher.code}
                                                        <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">Voucher Terpasang</span>
                                                    </p>
                                                    <p className="text-[11px] font-bold text-emerald-600 mt-0.5">Berhasil dpt diskon {formatRupiah(appliedVoucher.discountAmount)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {isRegisterOnly && (
                            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 mt-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xs font-bold">4</span>
                                        Konfigurasi Domain
                                    </h3>
                                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Setup Tersedia</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${whoisPrivacy ? 'bg-orange-50/50 border-orange-200' : 'bg-slate-50 border-slate-100'}`} onClick={() => setWhoisPrivacy(!whoisPrivacy)}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${whoisPrivacy ? 'bg-white text-orange-600 shadow-sm' : 'bg-white text-slate-400'}`}>
                                                <span className="material-symbols-outlined text-base">security</span>
                                            </div>
                                            <div className={`w-9 h-4.5 rounded-full relative transition-colors ${whoisPrivacy ? 'bg-orange-500' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${whoisPrivacy ? 'left-[18px]' : 'left-0.5'}`}></div>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-xs">ID Protection</h4>
                                        <p className="text-[9px] text-slate-500 mt-1">Sembunyikan data kontak WHOIS.</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-[9px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded">FREE</span>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${autoRenew ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100'}`} onClick={() => setAutoRenew(!autoRenew)}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${autoRenew ? 'bg-white text-blue-600 shadow-sm' : 'bg-white text-slate-400'}`}>
                                                <span className="material-symbols-outlined text-base">sync</span>
                                            </div>
                                            <div className={`w-9 h-4.5 rounded-full relative transition-colors ${autoRenew ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${autoRenew ? 'left-[18px]' : 'left-0.5'}`}></div>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-xs">Auto Renew</h4>
                                        <p className="text-[9px] text-slate-500 mt-1">Perpanjang otomatis masa aktif.</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">AUTO</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- METODE PEMBAYARAN --- */}
                        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 mt-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px] font-bold">
                                        {isTopUpOnly ? '2' : isRegisterOnly ? '4' : '3'}
                                    </span>
                                    Pembayaran
                                </h3>
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 uppercase tracking-widest">Secured</span>
                            </div>

                            <div className="space-y-2">
                                {wallet && !isTopUpOnly && (
                                    <div className={`border-2 transition-all rounded-xl overflow-hidden ${selectedGateway?.id === 'WALLET' ? 'border-[#F97316] bg-orange-50/20' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                        <button onClick={() => { setExpandedMethod('WALLET'); setSelectedGateway({ id: 'WALLET', code: 'WALLET', type: 'WALLET', name: 'Saldo Wallet' }); }} className="w-full flex items-center justify-between p-4 text-left">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedGateway?.id === 'WALLET' ? 'bg-[#F97316] text-white' : 'bg-orange-50 text-[#F97316]'}`}>
                                                    <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-xs">Saldo Wallet</h4>
                                                    <p className="text-[9px] text-slate-500">Auto-konfirmasi</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black text-xs ${wallet.balance >= totalToPay ? 'text-slate-800' : 'text-red-500'}`}>{formatRupiah(wallet.balance)}</p>
                                                {wallet.balance < totalToPay && <p className="text-[8px] font-black text-red-400 uppercase tracking-tighter mt-0.5">Saldo Kurang</p>}
                                            </div>
                                        </button>
                                    </div>
                                )}
                                {groupedGateways['bankva'].length > 0 && (
                                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                                        <button onClick={() => setExpandedMethod(expandedMethod === 'bankva' ? null : 'bankva')} className="w-full flex items-center justify-between p-3.5 bg-white text-left">
                                            <div className="flex items-center gap-3"><span className="material-symbols-outlined text-slate-500 text-base">account_balance</span><h4 className="font-bold text-slate-800 text-xs">Virtual Account</h4></div>
                                            <span className={`material-symbols-outlined text-base transition-transform ${expandedMethod === 'bankva' ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                        {expandedMethod === 'bankva' && (
                                            <div className="p-3 bg-slate-50 border-t border-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                <div className="grid grid-cols-1 gap-2 pr-1">
                                                    {groupedGateways['bankva'].map(gw => (
                                                        <label key={gw.id} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedGateway?.id === gw.id ? 'border-orange-500 bg-white shadow-sm' : 'border-white bg-white hover:border-orange-100'}`}>
                                                            <input type="radio" name="payment_method" value={gw.id} checked={selectedGateway?.id === gw.id} onChange={() => setSelectedGateway(gw)} className="sr-only" />
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-8 flex items-center justify-center bg-slate-50 rounded-lg p-1">
                                                                    <img src={getBankLogo(gw.code)} alt={gw.name} className="max-h-full max-w-full object-contain" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-slate-800 text-xs uppercase">{gw.name.replace('Virtual Account', '').trim()}</h4>
                                                                    <p className="text-[8px] text-slate-500 tracking-tight">Bayar via Transfer Virtual Account</p>
                                                                </div>
                                                            </div>
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedGateway?.id === gw.id ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 text-transparent'}`}>
                                                                <span className="material-symbols-outlined text-[10px]">check</span>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {groupedGateways['qris'].length > 0 && (
                                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                                        <button onClick={() => setExpandedMethod(expandedMethod === 'qris' ? null : 'qris')} className="w-full flex items-center justify-between p-3.5 bg-white text-left">
                                            <div className="flex items-center gap-3"><span className="material-symbols-outlined text-slate-500 text-base">qr_code_2</span><h4 className="font-bold text-slate-800 text-xs">QRIS</h4></div>
                                            <span className={`material-symbols-outlined text-base transition-transform ${expandedMethod === 'qris' ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                        {expandedMethod === 'qris' && (
                                            <div className="p-3 bg-slate-50 border-t border-slate-100">
                                                {groupedGateways['qris'].map(gw => {
                                                    let displayName = gw.name;
                                                    if (displayName.includes('(Customizable)')) displayName = 'QRIS Dinamis';
                                                    if (displayName === 'QRIS') displayName = 'QRIS Standard';
                                                    if (displayName.includes('ShopeePay')) displayName = 'QRIS via ShopeePay';

                                                    return (
                                                        <label key={gw.id} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedGateway?.id === gw.id ? 'border-orange-500 bg-white' : 'border-white bg-white hover:border-orange-100'}`}>
                                                            <input type="radio" name="payment_method" value={gw.id} checked={selectedGateway?.id === gw.id} onChange={() => setSelectedGateway(gw)} className="sr-only" />
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-8 flex items-center justify-center bg-slate-50 rounded-lg p-1 border border-slate-100">
                                                                    <img src={gw.icon_url || getBankLogo('qris')} alt="QRIS" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-slate-800 text-xs">{displayName}</h4>
                                                                    <p className="text-[8px] text-slate-500 tracking-tight">{gw.code.includes('SHOPEE') ? 'Langsung buka aplikasi Shopee' : 'Scan via OVO, GoPay, DANA, BCA, dll'}</p>
                                                                </div>
                                                            </div>
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedGateway?.id === gw.id ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 text-transparent'}`}><span className="material-symbols-outlined text-[10px]">check</span></div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {groupedGateways['ewallet'].length > 0 && (
                                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                                        <button onClick={() => setExpandedMethod(expandedMethod === 'ewallet' ? null : 'ewallet')} className="w-full flex items-center justify-between p-3.5 bg-white text-left">
                                            <div className="flex items-center gap-3"><span className="material-symbols-outlined text-slate-500 text-base">account_balance_wallet</span><h4 className="font-bold text-slate-800 text-xs">E-Wallet Direct</h4></div>
                                            <span className={`material-symbols-outlined text-base transition-transform ${expandedMethod === 'ewallet' ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                        {expandedMethod === 'ewallet' && (
                                            <div className="p-3 bg-slate-50 border-t border-slate-100 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                <div className="grid grid-cols-1 gap-1.5 pr-1">
                                                    {groupedGateways['ewallet'].map(gw => (
                                                        <label key={gw.id} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedGateway?.id === gw.id ? 'border-orange-500 bg-white shadow-sm' : 'border-white bg-white hover:border-orange-100'}`}>
                                                            <input type="radio" name="payment_method" value={gw.id} checked={selectedGateway?.id === gw.id} onChange={() => setSelectedGateway(gw)} className="sr-only" />
                                                            <div className="flex items-center gap-3">
                                                                <img src={getBankLogo(gw.code)} alt={gw.name} className="h-5 object-contain" />
                                                                <div><h4 className="font-bold text-slate-800 text-xs">{gw.name}</h4><p className="text-[8px] text-slate-500 tracking-tight">Bayar langsung {gw.name}.</p></div>
                                                            </div>
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedGateway?.id === gw.id ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 text-transparent'}`}><span className="material-symbols-outlined text-[10px]">check</span></div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sticky top-5 overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F97316] to-orange-400"></div>
                            <h3 className="font-black text-slate-900 uppercase text-[9px] tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#F97316] text-sm">assessment</span>
                                Tagihan
                            </h3>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="font-medium text-slate-500 text-[10px]">Subtotal Pesanan</span>
                                    <div className="flex items-center gap-2">
                                        {voucherDiscount > 0 && (
                                            <span className="text-slate-400 line-through text-[11px]">{formatRupiah(grossSubtotal)}</span>
                                        )}
                                        <span className="font-bold text-slate-800">{formatRupiah(netAmount)}</span>
                                    </div>
                                </div>
                                {!isTopUpOnly && (
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="font-medium text-slate-500 text-[10px]">PPN (11%)</span>
                                        <span className="font-bold text-slate-800">+ {formatRupiah(ppnAmount)}</span>
                                    </div>
                                )}
                                {voucherDiscount > 0 && (
                                    <div className="flex justify-between items-center text-[11px] bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">
                                        <span className="font-bold text-emerald-600 text-[10px] flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">confirmation_number</span>
                                            Voucher {appliedVoucher?.code}
                                        </span>
                                        <span className="font-black text-emerald-600">- {formatRupiah(voucherDiscount)}</span>
                                    </div>
                                )}
                                {referralDiscount > 0 && (
                                    <div className="flex justify-between items-center text-[11px] bg-orange-50 px-2 py-1.5 rounded-lg border border-orange-100 mt-2">
                                        <span className="font-bold text-[#F97316] text-[10px] flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">celebration</span>
                                            Diskon Referral
                                        </span>
                                        <span className="font-black text-[#F97316]">- {formatRupiah(referralDiscount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center py-2 border-y border-slate-50 border-dashed text-[11px]">
                                    <span className="font-medium text-slate-500 text-[10px]">Biaya Layanan</span>
                                    <span className={`font-bold ${isFetchingFee ? 'animate-pulse text-slate-300' : (selectedGateway && serviceFee === 0) ? 'text-emerald-500 flex items-center gap-1' : 'text-slate-800'}`}>
                                        {isFetchingFee ? (
                                            "Menghitung..."
                                        ) : !selectedGateway ? (
                                            "—"
                                        ) : serviceFee > 0 ? (
                                            `+ ${formatRupiah(serviceFee)}`
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[12px]">task_alt</span>
                                                Gratis Biaya Layanan
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-6 text-center">
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-0.5">Total Bayar</span>
                                <span className="text-xl font-black text-[#F97316] tracking-tight">{formatRupiah(totalToPay)}</span>
                            </div>

                            <button
                                onClick={handlePay}
                                disabled={isProcessing || !selectedGateway}
                                className="w-full bg-[#F97316] text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-200 hover:bg-slate-900 transition disabled:bg-slate-200 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Wait...
                                    </>
                                ) : (
                                    <>
                                        Konfirmasi Pembayaran
                                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </>
                                )}
                            </button>

                            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-blue-500 text-xs">verified_user</span>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Garansi Transaksi Aman & Terenkripsi</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default Checkout;
