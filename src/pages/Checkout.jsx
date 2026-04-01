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
  
  // Coupon State
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [autoPromo, setAutoPromo] = useState(null); // Active automatic event
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);
  const [appliedVoucher, setAppliedVoucher] = useState(null); // Full voucher object
  const [couponError, setCouponError] = useState("");
  const [manualDiscount, setManualDiscount] = useState(0);
  const [autoDiscount, setAutoDiscount] = useState(0);
  const [backendSummary, setBackendSummary] = useState(null);
  
  // Payment State
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [expandedMethod, setExpandedMethod] = useState(null);

  const fetchPromos = async (items = null) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { "Authorization": `Bearer ${token}` };

      // 1. Get Automatic Promos (Active Events)
      const res = await api.get("/promos/active");
      const data = res.data;
      applyBestAutoPromo(data, items || cartItems);

      // 2. Get Available Coupons (Manual)
      if (token) {
        const cRes = await api.get("/coupons");
        setAvailableVouchers(cRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch promos:", err);
    }
  };

  const handleApplyVoucher = async (code) => {
      if (!code) return;
      
      try {
          const token = localStorage.getItem("token");
          // Calculate effective subtotal (after Auto Promo)
          const effectiveTotal = calculateTotalLine() - autoDiscount;

          const res = await api.post("/coupons/validate", { 
              code, 
              amount: effectiveTotal, 
              items: cartItems,
              hasPromoEvent: !!autoPromo
          });
          
          const data = res.data;

          if (res.status === 200 && data.valid) {
              setSelectedVoucherId(code); // Using Code as ID/Value
              setAppliedVoucher(data.coupon);
              setManualDiscount(data.discount_amount);
              setCouponError("");
              setShowVoucherModal(false);
              success("Kupon berhasil dipasang!");
          } else {
              const msg = typeof data === 'string' ? data : (data.reason || "Kupon tidak valid");
              throw new Error(msg);
          }
      } catch (err) {
          console.error("Coupon Error:", err);
          setManualDiscount(0);
          setSelectedVoucherId(null);
          setAppliedVoucher(null);
          setCouponError(err.message || "Kupon tidak memenuhi syarat");
      }
  };

  const handleRemoveVoucher = () => {
      setSelectedVoucherId(null);
      setAppliedVoucher(null);
      setManualDiscount(0);
  };
 
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
            const [pricingRes, userRes, gwRes, walletRes] = await Promise.all([
                api.get('/pricing/all'),
                api.get(`/users/${storedUser.id}`).catch(() => ({ data: storedUser })),
                api.get("/payment-gateways").catch(() => ({ data: [] })),
                api.get("/wallet").catch(() => ({ data: null }))
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
                
                if (inv.subtotal && inv.total < inv.subtotal) {
                    setAutoDiscount(inv.subtotal - inv.total);
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

                if (items.length > 0) {
                    // Fetch Promos only if we have items
                    await fetchPromos(items);
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


  // Recalculate automatic discount when cart or pricing changes
  useEffect(() => {
    if (loading) return;
    recalculateAutoDiscount();
  }, [cartItems, pricingMap, loading]);

  // Helper to check item eligibility for Promo Event
  const isItemEligible = (item, promo) => {
      if (!promo) return false;
      
      // Handle new applicable_tlds format (Array of objects {tld, min_purchase})
      // If null or empty, assume all? No, mostly specific.
      const rules = promo.applicable_tlds || [];
      if (rules.length === 0) return false; // Strict by default

      const tld = "." + item.name.split('.').slice(1).join('.');
      
      // Check if TLD is in rules
      return rules.some(rule => rule.tld === 'all' || rule.tld === tld);
  };

  const applyBestAutoPromo = (autos, items = null) => {
    const currentItems = items || cartItems;
    if (!autos || autos.length === 0) {
      setAutoPromo(null);
      setAutoDiscount(0);
      return;
    }

    const currentTotal = calculateTotalLine();
    
    // 1. Filter Eligible Promos based on TLD presence & Min Purchase
    const validPromos = autos.filter(auto => {
      const minPurchase = parseFloat(auto.min_purchase || 0);
      if (currentTotal < minPurchase) return false;

      // Check if ANY item in cart matches the promo TLDs
      return currentItems.some(item => isItemEligible(item, auto));
    });

    if (validPromos.length === 0) {
       setAutoPromo(null);
       setAutoDiscount(0);
       return;
    }

    // 2. Find Best Promo (Highest Discount Amount)
    let bestPromo = null;
    let maxDiscount = 0;

    validPromos.forEach(promo => {
        let discount = 0;
        
        // Calculate discountable amount (sum of eligible items)
        const eligibleAmount = currentItems.reduce((sum, item) => {
            return isItemEligible(item, promo) ? sum + getItemLineTotal(item) : sum;
        }, 0);

        if (promo.discount_type === 'percentage') {
            discount = (eligibleAmount * parseFloat(promo.discount_value)) / 100;
            if (promo.max_discount_amount > 0) {
                 discount = Math.min(discount, parseFloat(promo.max_discount_amount));
            }
        } else {
            discount = parseFloat(promo.discount_value);
        }

        if (discount > maxDiscount) {
            maxDiscount = discount;
            bestPromo = promo;
        } else if (discount === maxDiscount) {
            // Tie-breaker: Priority
            if (bestPromo && (promo.priority || 0) > (bestPromo.priority || 0)) {
                bestPromo = promo;
            }
        }
    });

    if (bestPromo) {
       setAutoPromo(bestPromo);
       setAutoDiscount(Math.floor(maxDiscount));
    } else {
       setAutoPromo(null);
       setAutoDiscount(0);
    }
  };


  const recalculateAutoDiscount = async () => {
    // 1. Fetch available promos (Keep existing logic for voucher selection UI)
    fetchPromos();
    
    // 2. Fetch backend preview for final math (Anti-Boncos)
    if (cartItems.length > 0) {
        try {
            const token = localStorage.getItem("token");
            const res = await api.post("/checkout/preview", {
                items: cartItems,
                userVoucherCode: selectedVoucherId
            });
            setBackendSummary(res.data);
        } catch (err) {
            console.error("Failed to fetch cart preview:", err);
        }
    }
  };
  
  const isTopUpOnly = cartItems.length > 0 && cartItems.every(item => item.action === 'topup');
  const isRenewOnly = cartItems.length > 0 && cartItems.every(item => item.action === 'renew');
  const isTransferOnly = cartItems.length > 0 && cartItems.every(item => item.action === 'transfer');
  const isRegisterOnly = cartItems.length > 0 && cartItems.every(item => !item.action || item.action === 'register');

  // Helper Format Rupiah
  const formatRupiah = (num) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  // --- KALKULASI TOTAL AKURAT ---


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
      
      
      // Prevent calculation if pricing data is not yet loaded
      if (loading) return 0;

      // Handle TOPUP items (No TLD lookup)
      if (item.action === 'topup' || item.type === 'topup') {
          return parseFloat(item.price || 0);
      }
      
      const p = pricingMap[tld];
      if (!p) {
          // Warning only if NOT loading, price missing and NOT a topup
          console.warn(`[Checkout] Price not found for TLD: ${tld}. Available:`, Object.keys(pricingMap));
          return 0;
      }

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
    // INVOICE MODE: Total is fixed from invoice
    if (invoiceMode && invoiceDetails) {
        return parseFloat(invoiceDetails.total); 
    }
    
    // CART MODE: Sum items
    return cartItems.reduce((acc, item) => {
      return acc + getItemLineTotal(item);
    }, 0);
  };

  let lineTotal = calculateTotalLine();

  // --- CALCULATION LOGIC ---
  let grandTotal = 0;
  let totalDiscount = 0;
  let rawTotalDiscount = 0;
  let netAmount = 0;
  let ppnAmount = 0;

  if (invoiceMode && invoiceDetails) {
      grandTotal = parseFloat(invoiceDetails.total);
      netAmount = parseFloat(invoiceDetails.net_amount || invoiceDetails.total);
      ppnAmount = parseFloat(invoiceDetails.tax_amount || 0);
      totalDiscount = parseFloat(invoiceDetails.total_discount || 0);
  } else if (backendSummary) {
      // Use Backend Truth (Anti-Boncos)
      grandTotal = backendSummary.total_payable;
      totalDiscount = backendSummary.total_discount;
      netAmount = backendSummary.final_total;
      ppnAmount = backendSummary.tax_amount;
      lineTotal = backendSummary.subtotal; 

      // Sync local display variables with backend breakdown
      // We sum item_discount components if split not provided in top level
      let calculatedAuto = 0;
      let calculatedManual = 0;

      if (backendSummary.items) {
          backendSummary.items.forEach(bi => {
              // We can't perfectly distinguish auto vs manual per item from backend yet
              // unless we look at event_applied vs coupon.
              // For now, if all items have event_applied, it's all auto.
              // Simplified: just match the total to avoid confusion.
          });
      }

      // Final synchronization to prevent display mismatch
      // If there's a discrepancy (like capping), we adjust display discounts
      if (backendSummary.total_discount !== (autoDiscount + manualDiscount)) {
          // Adjust display to match truth
          if (manualDiscount > 0 && autoDiscount > 0) {
              // Proportionally adjust or just use total?
              // Let's just use manual as priority if set
          } else if (autoDiscount > 0) {
              setAutoDiscount(backendSummary.total_discount);
          } else if (manualDiscount > 0) {
              setManualDiscount(backendSummary.total_discount);
          }
      }
  } else {
      // Fallback local logic (Tax Inclusive)
      const PPN_RATE = 0.11;
      rawTotalDiscount = autoDiscount + manualDiscount;
      totalDiscount = rawTotalDiscount; 
      
      // Total Payable matches the Net Amount (Inclusive of Tax)
      grandTotal = lineTotal - totalDiscount;
      
      // Calculate Tax component for display
      ppnAmount = Math.floor(grandTotal - (grandTotal / (1 + PPN_RATE)));
      netAmount = grandTotal; 
  }


  const getActionLabel = (item) => {
    const action = item?.action || 'register';
    if (action === 'renew') return "Perpanjangan Domain";
    if (action === 'transfer') return "Transfer Domain";
    if (action === 'restore') return "Pemulihan Domain (Redemption)";
    return "Pendaftaran Baru";
  };
  
  const getBankLogo = (code) => {
      const bankCode = code ? code.toLowerCase() : '';
      if (bankCode.includes('bca')) return '/image/banks/bca.png';
      if (bankCode.includes('mandiri')) return '/image/banks/mandiri.png';
      if (bankCode.includes('bni')) return '/image/banks/bni.png';
      if (bankCode.includes('bri')) return '/image/banks/bri.png';
      if (bankCode.includes('cimb')) return '/image/banks/cimb.png';
      if (bankCode.includes('permata')) return '/image/banks/permata.png';
      if (bankCode.includes('bsi')) return '/image/banks/bsi.png';
      if (bankCode.includes('danamon')) return '/image/banks/danamon.png';
      if (bankCode.includes('qris')) return '/image/banks/qris.png';
      
      // Fallback for E-Wallets if not specifically in banks folder
      if (bankCode.includes('ovo')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Logo_ovo_sweet_purple.svg/2560px-Logo_ovo_sweet_purple.svg.png';
      if (bankCode.includes('dana')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Logo_dana_blue.svg/2560px-Logo_dana_blue.svg.png';
      if (bankCode.includes('linkaja')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/LinkAja.svg/2560px-LinkAja.svg.png';
      if (bankCode.includes('shopeepay')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/ShopeePay.svg/2560px-ShopeePay.svg.png';
      
      return `https://via.placeholder.com/100x50?text=${code}`;
  };

  // --- HANDLE PAY (CONSOLIDATED) ---
  const handlePay = async () => {
    if (!user || cartItems.length === 0) return;
    if (!selectedGateway) return error("Pilih metode pembayaran terlebih dahulu.");
    
    // Safety check for pricing
    if (grandTotal <= 0) {
        return error("Total pembayaran tidak valid. Pastikan harga domain sudah muncul.");
    }

    setIsProcessing(true);

    try {
      let invoiceId;
      
      if (invoiceMode && invoiceDetails) {
          // SKIP INVOICE CREATION, USE EXISTING
          invoiceId = invoiceDetails.id;
      } else {
          // 1. Create Invoice
          const checkoutRes = await api.post("/checkout", {
              userId: user.id,
              totalAmount: grandTotal,
              userVoucherCode: selectedVoucherId,
              items: cartItems, 
              config: { whoisPrivacy, autoRenew, nameservers }
          });

          const checkoutData = checkoutRes.data;
          if (checkoutRes.status !== 200 || !checkoutData.invoiceId) {
              throw new Error(checkoutData.message || "Gagal membuat invoice.");
          }
          invoiceId = checkoutData.invoiceId;
      }

      // 2. Initiate Payment
      if (selectedGateway.type === 'WALLET') {
          // WALLET PAYMENT
          const payRes = await api.post(`/billing/invoice/${invoiceId}/pay-wallet`);
          if (payRes.data.success) {
              // Success! Clear cart & redirect
              // Success! Clear only purchased items
              const selectionData = localStorage.getItem("checkout_payload");
              if (selectionData) {
                  const purchased = JSON.parse(selectionData);
                  const currentCart = JSON.parse(localStorage.getItem("cart") || "[]");
                  const updatedCart = currentCart.filter(item => 
                      !purchased.some(p => p.name === item.name && p.action === item.action)
                  );
                  localStorage.setItem("cart", JSON.stringify(updatedCart));
                  localStorage.removeItem("checkout_payload");
              } else {
                  localStorage.removeItem("cart");
              }
              window.dispatchEvent(new Event("storage"));
              
              success("Pembayaran Berhasil via Wallet!");
              setTimeout(() => {
                  navigate(`/payment/${invoiceId}`, { state: { paymentSuccess: true } });
              }, 1000);
          } else {
              throw new Error(payRes.data.error || "Gagal bayar wallet");
          }
      } else {
          // PRISMALINK PAYMENT (VA/QRIS)
          const payload = {
              invoice_number: invoiceId, // Use the new invoice ID
              payment_method: selectedGateway.id, 
              bank_code: selectedGateway.code,    
              payment_channel: selectedGateway.type 
          };

          const payRes = await api.post("/prismalink/create", payload);
          const payData = payRes.data;

          if (payData.success) {
              // Success! Clear cart & redirect with PAYMENT DATA
              localStorage.removeItem("cart");
              window.dispatchEvent(new Event("storage"));

              success("Kode Pembayaran Dibuat!");
              navigate(`/payment/${invoiceId}`, { state: { paymentResult: payData.data } });
          } else {
              throw new Error(payData.message || "Gagal inisiasi pembayaran");
          }
      }

    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data?.details || err.message || "Terjadi kesalahan sistem.";
      error(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const groupedGateways = {
    'VA': gateways.filter(g => g.type === 'VA'),
    'QRIS': gateways.filter(g => g.type === 'QRIS' || g.type === 'EWALLET')
  };

  if (loading || !user)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">
        Memuat Data...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-20 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header Khusus Checkout */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to={backLink}
            className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#F97316] hover:border-orange-200 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isTopUpOnly ? "Isi Saldo Wallet" : 
               isRenewOnly ? "Perpanjang Masa Aktif" : 
               isTransferOnly ? "Transfer Domain Anda" : 
               "Selesaikan Pembayaran"}
            </h1>
            <p className="text-sm text-slate-500">
              {isTopUpOnly ? "Lanjutkan pembayaran untuk menambah saldo wallet Anda." : 
               isRenewOnly ? "Amankan domain Anda lebih lama dengan perpanjang masa aktif." :
               isTransferOnly ? "Segera aktivasi transfer domain Anda ke platform kami." :
               "Satu langkah lagi untuk mengaktifkan domain impian Anda."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* --- KIRI: KONFIGURASI --- */}
          <div className="lg:col-span-2 space-y-8">
            {!isTopUpOnly && !isRenewOnly && (
                <>
                {/* 1. Informasi Registran */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xs">
                        1
                      </span>
                      Informasi Registran
                    </h3>
                    <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100">
                        WHOIS DATA
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-400 font-bold uppercase mb-1">
                        Nama Pemilik
                      </p>
                      <p className="font-bold text-slate-800">{user.name}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-400 font-bold uppercase mb-1">
                        Email Kontak
                      </p>
                      <p className="font-bold text-slate-800">{user.email}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 italic">
                    *Data ini akan digunakan sebagai informasi kepemilikan domain yang sah sesuai kebijakan ICANN.
                  </p>

                  {/* VALIDATION ALERT */}
                  {(!user.address_line1 || !user.city || !user.zip_code || !user.phone) && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-red-800">Data Registran Tidak Lengkap</h4>
                        <p className="text-xs text-red-600 mt-1">
                          Silakan lengkapi Alamat, Kota, dan Kode Pos di Profil Anda agar domain bisa didaftarkan.
                        </p>
                        <Link to="/dashboard/settings#section-profile" className="inline-block mt-2 text-xs font-bold text-red-700 underline decoration-2 underline-offset-4 hover:text-red-800">
                          Lengkapi Profil Sekarang →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                {isRegisterOnly && (
                    <>
                    {/* 2. Konfigurasi & Proteksi */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xs">
                      2
                    </span>
                    Konfigurasi & Proteksi
                  </h3>

                  <div className="space-y-6">
                    {/* WHOIS PRIVACY */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-orange-50 border border-orange-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-[#F97316] shadow-sm">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">WHOIS Privacy Protection</h4>
                          <p className="text-xs text-slate-500">Sembunyikan data pribadi Anda dari publik</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-green-600">FREE</span>
                        <button 
                          onClick={() => setWhoisPrivacy(!whoisPrivacy)}
                          className={`w-12 h-6 rounded-full transition-colors relative ${whoisPrivacy ? 'bg-[#F97316]' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${whoisPrivacy ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>
                    </div>

                    {/* NAMESERVERS (HIDDEN - DEFAULT AUTO SET) */}
                    
                    {/* AUTO RENEW */}
                    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-700">Perpanjangan Otomatis</h4>
                          <p className="text-[10px] text-slate-500">
                            Domain akan diperpanjang otomatis sebelum kedaluwarsa. Dapat dimatikan kapan saja.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAutoRenew(!autoRenew)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${autoRenew ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${autoRenew ? 'left-5.5' : 'left-0.5'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>
               </>
            )}
          </>
        )}
            
            {/* 3. Metode Pembayaran */}
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200 mt-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xs">
                  {isTopUpOnly || isRenewOnly ? '1' : isTransferOnly ? '2' : '3'}
                </span>
                Metode Pembayaran
              </h3>

              <div className="space-y-4">
                  {/* Wallet - Disabled for TopUp Only */}
                  {wallet && !isTopUpOnly && (
                    <div className={`border transition-all duration-300 rounded-lg overflow-hidden ${selectedGateway?.type === 'WALLET' ? 'border-orange-500 ring-4 ring-orange-500/10 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}>
                         <button 
                            onClick={() => {
                                setExpandedMethod('WALLET');
                                setSelectedGateway({ id: 'WALLET', type: 'WALLET', name: 'Saldo Wallet' });
                            }}
                            className="w-full flex items-center justify-between p-5 bg-white text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-orange-100/50 border border-orange-100 flex items-center justify-center p-2 text-orange-600">
                                    <span className="material-symbols-outlined">account_balance_wallet</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg">Saldo Wallet</h4>
                                    <p className="text-xs text-slate-500">Bayar instan tanpa biaya admin</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase">Sisa Saldo</p>
                                <p className={`font-bold text-lg ${wallet.balance >= grandTotal ? 'text-slate-800' : 'text-red-500'}`}>
                                    {formatRupiah(wallet.balance)}
                                </p>
                            </div>
                        </button>
                        
                         <div className={`transition-all duration-300 ease-in-out ${selectedGateway?.type === 'WALLET' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-5 pt-0">
                                {wallet.balance >= grandTotal ? (
                                    <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-bold flex items-center gap-2 border border-green-100">
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Saldo mencukupi. Klik "Bayar Sekarang" di ringkasan order.
                                    </div>
                                ) : (
                                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center justify-between border border-red-100">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined">error</span>
                                            <span className="font-bold">Saldo kurang {formatRupiah(grandTotal - wallet.balance)}</span>
                                        </div>
                                        <Link to="/dashboard/wallet" className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition shadow-sm">
                                            Isi Saldo
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                  )}

                  {/* Virtual Account */}
                  {groupedGateways['VA'].length > 0 && (
                    <div className={`border transition-all duration-300 rounded-lg overflow-hidden ${expandedMethod === 'VA' ? 'border-orange-500 ring-4 ring-orange-500/10 shadow-lg' : 'border-slate-200 hover:border-slate-300'}`}>
                         <button 
                            onClick={() => setExpandedMethod(expandedMethod === 'VA' ? null : 'VA')}
                            className="w-full flex items-center justify-between p-5 bg-white text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-2 text-slate-600">
                                    <span className="material-symbols-outlined">account_balance</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg">Virtual Account</h4>
                                    <p className="text-xs text-slate-500">Verifikasi Otomatis (BCA, Mandiri, BRI, dll)</p>
                                </div>
                            </div>
                            <span className={`material-symbols-outlined transition-transform duration-300 ${expandedMethod === 'VA' ? 'rotate-180 text-orange-600' : 'text-slate-400'}`}>expand_more</span>
                        </button>
                        
                        <div className={`grid transition-all duration-300 ease-in-out ${expandedMethod === 'VA' ? 'grid-rows-[1fr] opacity-100 pb-5 px-5' : 'grid-rows-[0fr] opacity-0 pb-0 px-5'}`}>
                            <div className="overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                    {groupedGateways['VA'].map(gw => (
                                        <label key={gw.id} className={`group relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${selectedGateway?.id === gw.id ? 'border-orange-500 bg-orange-50/50' : 'border-slate-100 bg-white hover:border-orange-200'}`}>
                                            <input 
                                                type="radio" 
                                                name="payment_method" 
                                                value={gw.id} 
                                                checked={selectedGateway?.id === gw.id} 
                                                onChange={() => setSelectedGateway(gw)} 
                                                className="peer sr-only" 
                                            />
                                            <div className="w-12 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1 mr-3 relative overflow-hidden">
                                                <img 
                                                    src={getBankLogo(gw.code)} 
                                                    alt={gw.code}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='block'}}
                                                />
                                                <span className="hidden font-bold text-[10px] text-slate-500 text-center leading-tight">{gw.code}</span>
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm group-hover:text-orange-600 transition-colors">{gw.name}</span>
                                            
                                            <div className={`absolute right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all ${selectedGateway?.id === gw.id ? 'bg-orange-500 scale-100' : 'bg-slate-200 scale-0'}`}>
                                                <span className="material-symbols-outlined text-white text-[14px]">check</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                  )}

                  {/* QRIS */}
                  {groupedGateways['QRIS'].map(gw => (
                      <label key={gw.id} className={`group relative flex items-center p-5 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedGateway?.id === gw.id ? 'border-orange-500 bg-orange-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                          <input type="radio" name="payment_method" value={gw.id} checked={selectedGateway?.id === gw.id} onChange={() => setSelectedGateway(gw)} className="peer sr-only" />
                          <div className="flex items-center gap-4 w-full">
                              <div className="w-14 h-14 flex-shrink-0 bg-white rounded-lg border border-slate-100 flex items-center justify-center shadow-sm p-2">
                                  <img 
                                      src={getBankLogo('QRIS')} 
                                      alt="QRIS"
                                      className="w-full h-full object-contain"
                                      onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}}
                                  />
                                  <div className="hidden text-slate-700 font-bold text-xs">QRIS</div>
                              </div>
                              <div className="flex-1">
                                  <h4 className="font-bold text-slate-800 text-lg group-hover:text-orange-600 transition-colors">QRIS / E-Wallet</h4>
                                  <p className="text-xs text-slate-500 mt-1">Scan pakai GoPay, OVO, Dana, LinkAja</p>
                              </div>
                              
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedGateway?.id === gw.id ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200 text-transparent'}`}>
                                  <span className="material-symbols-outlined text-[16px]">check</span>
                              </div>
                          </div>
                      </label>
                  ))}
              </div>
            </div>
          </div>

          {/* --- KANAN: RINGKASAN ORDER --- */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl border border-slate-100 sticky top-10">
              <h3 className="font-bold text-xl text-slate-900 mb-6">
                Ringkasan
              </h3>

              {autoPromo && (
                  <div className="mb-6 p-4 bg-orange-100/50 border border-orange-200 rounded-lg flex items-center justify-between animate-fade-in">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#F97316] text-white rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </div>
                          <div>
                              <p className="text-[10px] font-bold text-[#F97316] uppercase tracking-widest">
                                  {autoPromo.title}
                              </p>
                              <p className="font-bold text-slate-800 text-[10px] uppercase leading-tight opacity-60">Promo Event</p>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Potongan</p>
                          <p className="font-bold text-green-600">- Rp {autoDiscount.toLocaleString('id-ID')}</p>
                      </div>
                  </div>
              )}
              {!isTopUpOnly && (
                <div className="mb-6 border-b border-dashed border-slate-200 pb-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">Makin Hemat Pakai Vocer</label>
                    
                    {selectedVoucherId ? (
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-600 text-white rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined">confirmation_number</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-green-600 uppercase">Vocer Terpasang</p>
                                    <p className="font-bold text-slate-800 uppercase text-xs">{appliedVoucher?.code || 'Voucher'}</p>
                                </div>
                            </div>
                            <button onClick={handleRemoveVoucher} className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setShowVoucherModal(true)}
                            className="w-full flex items-center justify-between p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 group hover:border-[#F97316] hover:text-[#F97316] hover:bg-orange-50/30 transition-all duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined group-hover:animate-bounce">confirmation_number</span>
                                <span className="font-bold text-xs uppercase tracking-widest">Gunakan Vocer Belanja</span>
                            </div>
                            <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
                        </button>
                    )}

                    {couponError && <p className="text-[9px] text-red-500 mt-2 font-bold uppercase tracking-tight flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{couponError}</p>}
                </div>
              )}

              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-4 mb-6">
                {cartItems.map((item, index) => {
                    // Get effective calculation for this item from backend
                    const backendItem = backendSummary?.items?.[index];
                    
                    const originalPrice = backendItem ? backendItem.item_subtotal : getItemLineTotal(item);
                    const effectivePrice = backendItem ? backendItem.effective_price : (originalPrice - (isItemEligible(item, autoPromo) ? autoDiscount : 0));
                    const itemDiscount = originalPrice - effectivePrice;
                    const hasDiscount = itemDiscount > 0;

                    return (
                      <div key={index} className={`relative p-4 rounded-xl border transition-all duration-300 ${hasDiscount ? 'bg-orange-50/30 border-orange-100 shadow-sm' : 'bg-slate-50/30 border-slate-100'}`}>
                        {/* Row 1: Domain Name & Delete Button */}
                        <div className="flex justify-between items-start mb-2 group/item">
                          <div className="flex-1 min-w-0 pr-2">
                             <div className="flex items-center flex-wrap gap-2">
                                <p className="font-black text-sm text-slate-800 tracking-tight leading-tight truncate max-w-full" title={item.name}>
                                  {item.name}
                                </p>
                                {hasDiscount && (
                                    <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shadow-sm shadow-red-200">
                                        <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                                        PROMO
                                    </span>
                                )}
                             </div>
                             
                             <div className="flex items-center gap-2 mt-1.5">
                               <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-[#F97316] border border-orange-100 uppercase tracking-tighter shadow-xs">
                                 {item.action === 'topup' ? 'TOPUP' : 
                                  item.action === 'renew' ? 'PERPANJANG' : 
                                  item.action === 'transfer' ? 'TRANSFER' : 
                                  'BARU'}
                               </span>
                               {item.action !== 'topup' && (
                                 <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                     • {item.duration} Tahun
                                 </span>
                               )}
                             </div>
                          </div>

                          {!invoiceMode && (
                              <button 
                                  onClick={() => handleRemoveItem(index)}
                                  className="shrink-0 w-8 h-8 flex items-center justify-center bg-white text-red-400 rounded-lg border border-slate-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                                  title="Hapus Item"
                              >
                                  <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                              </button>
                          )}
                        </div>

                        {/* Row 2: Price Line */}
                        <div className="pt-3 border-t border-slate-100/50 flex justify-between items-end">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Harga Total</span>
                            <div className="text-right">
                              {hasDiscount ? (
                                  <>
                                      <p className="text-[10px] text-slate-400 line-through decoration-red-400/50 mb-0">
                                        {formatRupiah(originalPrice)}
                                      </p>
                                      <p className="font-black text-[#F97316] text-sm tracking-tight">
                                        {formatRupiah(effectivePrice)}
                                      </p>
                                  </>
                              ) : (
                                  <p className="font-black text-slate-800 text-sm tracking-tight">
                                    {formatRupiah(originalPrice)}
                                  </p>
                              )}
                            </div>
                        </div>
                      </div>
                    );
                })}
              </div>

              <div className="space-y-3 py-6 border-t border-b border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-700">
                    {formatRupiah(lineTotal)}
                  </span>
                </div>
                {autoDiscount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600 font-bold">
                        <span>Promo Event ({autoPromo?.title})</span>
                        <span>- {formatRupiah(autoDiscount)}</span>
                    </div>
                )}
                 {manualDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-bold">
                        <span>Diskon Vocer ({appliedVoucher?.code})</span>
                        <span>- {formatRupiah(manualDiscount)}</span>
                    </div>
                )}
                
                {rawTotalDiscount > totalDiscount && (
                    <div className="p-2 bg-blue-50 text-[10px] text-blue-600 font-bold rounded-lg border border-blue-100 uppercase tracking-tight text-center">
                        ⚠️ Total diskon telah mencapai batas maksimal (Capped)
                    </div>
                )}

                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-slate-100">
                  <span className="text-slate-500">Net Amount</span>
                  <span className="font-bold text-slate-900">{formatRupiah(netAmount)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">PPN (11%)</span>
                  <span className="font-bold text-slate-700">{formatRupiah(ppnAmount)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end mt-6 mb-8">
                <span className="text-slate-500 font-bold">Total Bayar</span>
                <span className="text-3xl font-bold text-[#F97316]">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* Login Status */}
              <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <p className="text-xs text-blue-700 text-center">
                  Masuk sebagai: <strong>{user.name}</strong> ({user.email})
                </p>
              </div>

              <button
                onClick={handlePay}
                disabled={isProcessing || !selectedGateway}
                className="w-full bg-[#F97316] text-white py-4 rounded-lg font-bold shadow-lg shadow-orange-200 hover:bg-slate-900 transition transform hover:-translate-y-1 active:translate-y-0 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? "Memproses..." : "Bayar Sekarang"}
              </button>

              <div className="mt-6 space-y-3 text-center">
                <p className="text-xs text-slate-500">
                  Setelah pembayaran, domain akan aktif dan dapat dikelola melalui Dashboard.
                </p>
                <div className="inline-block bg-slate-100 -lg border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-medium">
                    ℹ️ Aktivasi domain biasanya memerlukan beberapa menit hingga 1 jam.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/* --- VOUCHER MODAL --- */}
      {showVoucherModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up border border-slate-100">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Pilih Vocer Belanja</h3>
                          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Koleksi vocer yang kamu klaim</p>
                      </div>
                      <button onClick={() => setShowVoucherModal(false)} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition shadow-sm">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  
                  <div className="p-6 max-h-[450px] overflow-y-auto space-y-4 custom-scrollbar">
                      {/* Manual Input */}
                      <div className="flex gap-2 mb-4">
                          <input 
                              type="text" 
                              placeholder="Punya kode kupon?" 
                              className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#F97316]"
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleApplyVoucher(e.target.value);
                              }}
                              id="manualCouponInput"
                          />
                          <button 
                              onClick={() => {
                                  const val = document.getElementById('manualCouponInput').value;
                                  if (val) handleApplyVoucher(val);
                              }}
                              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-800 transition"
                          >
                              Pakai
                          </button>
                      </div>

                      {availableVouchers.length === 0 ? (
                          <div className="text-center py-16 flex flex-col items-center gap-4">
                             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                <span className="material-symbols-outlined text-[40px]">confirmation_number</span>
                             </div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kamu belum punya vocer. <br/>Cek di halaman voucher!</p>
                             <button onClick={() => navigate('/vouchers')} className="text-xs font-bold text-[#F97316] uppercase tracking-widest underline decoration-2 underline-offset-4 mt-2">Cek Voucher Tersedia →</button>
                          </div>
                      ) : (
                          availableVouchers.map((v) => {
                              const minPurchase = parseFloat(v.min_purchase_amount || 0);
                              const isMinMet = (lineTotal - autoDiscount) >= minPurchase;
                              const isDisabled = !isMinMet;
                              const isPercentage = v.discount_type === 'percentage';

                              return (
                                  <div 
                                    key={v.id} 
                                    className={`relative group p-5 rounded-lg border-2 transition-all ${
                                        isDisabled 
                                            ? 'bg-slate-50 border-slate-100 opacity-60' 
                                            : 'bg-white border-slate-100 hover:border-[#F97316] hover:bg-orange-50/30 cursor-pointer'
                                    }`}
                                    onClick={() => !isDisabled && handleApplyVoucher(v.code)}
                                  >
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex gap-4">
                                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${isDisabled ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white shadow-lg shadow-slate-200'}`}>
                                                  <span className="material-symbols-outlined">confirmation_number</span>
                                              </div>
                                              <div>
                                                  <p className="font-bold text-slate-900 text-base leading-tight uppercase tracking-tight mb-1">{v.code}</p>
                                                  <div className="flex items-center gap-2">
                                                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${isDisabled ? 'bg-slate-200 text-slate-500' : 'bg-orange-100 text-[#F97316]'}`}>
                                                          {isPercentage ? `${v.discount_value}%` : `OFF ${formatRupiah(v.discount_value)}`}
                                                      </span>
                                                      {!v.is_stackable && (
                                                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-500">
                                                              NO PROMO
                                                          </span>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedVoucherId === v.code ? 'bg-[#F97316] border-[#F97316]' : 'border-slate-200'}`}>
                                              {selectedVoucherId === v.code && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                                          </div>
                                      </div>
                                      
                                      <div className="mt-4 pt-4 border-t border-dashed border-slate-100 flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                              <span className={`material-symbols-outlined text-[14px] ${isMinMet ? 'text-green-500' : 'text-red-400'}`}>
                                                {isMinMet ? 'check_circle' : 'info'}
                                              </span>
                                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Min. {formatRupiah(minPurchase)}</p>
                                          </div>
                                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                              <span className="material-symbols-outlined text-[14px]">event</span>
                                              S/D: {v.expires_at ? new Date(v.expires_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : 'Selamanya'}
                                          </p>
                                      </div>
                                  </div>
                              );
                          })
                      )}
                  </div>
              </div>
          </div>
      )}
      </div>
    </div>
  );
};
export default Checkout;
