import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const BannerSection = () => {
    const navigate = useNavigate();
    
    // Default Banner Config
    const defaultBanner = {
        title: "Bundle: Beli Domain Gratis Email Bisnis!",
        subtitle: "Tingkatkan kredibilitas usahamu dengan email profesional. Promo terbatas untuk pengguna baru.",
        buttonText: "Lihat Promo",
        buttonLink: "/promo",
        color: "#F97316",
        imageUrl: "" // Empty string will show default gradient/placeholder if handled
    };

    const [banner, setBanner] = useState(defaultBanner);

    // Initial Load & Event Listener
    useEffect(() => {
        const fetchBanner = async () => {
             try {
                // Fetch the highest priority auto promo for the banner
                const response = await api.get("/vouchers/auto?subtotal=999999999");
                const data = response.data;
                
                if (data && data.length > 0) {
                    // Take the first active auto promo (highest priority due to backend sorting)
                    const promo = data[0];
                    setBanner({
                        title: promo.title,
                        subtitle: promo.subtitle || promo.description || "Dapatkan promo spesial hari ini.",
                        buttonText: "Lihat Promo",
                        buttonLink: "/promo", // Or we could link to a specific promo detail if we had one
                        color: "#F97316", // Default accent, potentially customize per promo in future
                        imageUrl: promo.banner_image || "",
                        // Detail Promo Baru
                        type: promo.type, 
                        value: promo.value,
                        eligible_tlds: promo.eligible_tlds,
                        end_date: promo.end_date
                    });
                } else {
                    // If no active promos, use default or hide
                    setBanner(defaultBanner);
                }
             } catch (error) {
                console.error("Failed to fetch banner from promo events:", error);
                
                // Jika API/database gagal, langsung pakai default banner (polos/tanpa gambar yang diinput user)
                setBanner(defaultBanner);
             }
        };

        fetchBanner();
        // Since we removed manual banner updates, we might not need this event listener anymore,
        // but keeping it doesn't hurt if we trigger it when a promo event is created/updated.
        window.addEventListener("banner_updated", fetchBanner);
        return () => window.removeEventListener("banner_updated", fetchBanner);
    }, []);

    return (
        <div className="max-w-7xl mx-auto rounded-[2rem] relative overflow-hidden shadow-2xl group border border-slate-900/5">
            {/* Background Image Container with Aspect Ratio/Height */}
            <div className="absolute inset-0 bg-slate-900">
                {(banner.imageUrl || banner.banner_image) ? (
                    <>
                        <img 
                            src={banner.imageUrl || banner.banner_image} 
                            alt="Promo Banner" 
                            className="w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-80 transition-all duration-700 ease-in-out" 
                        />
                        {/* More subtle gradient when there is an image */}
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-transparent"></div>
                    </>
                ) : (
                    // Default gradient if no image
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-black opacity-90"></div>
                )}
                {/* Secondary Bottom Gradient for better standalone visual */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 px-8 py-20 md:px-20 md:py-28 flex flex-col justify-center items-start max-w-3xl">
                 <div className="flex flex-wrap items-center gap-3 mb-6">
                     <span 
                        style={{ backgroundColor: banner.color || "#F97316" }}
                        className="text-white px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/50 flex items-center gap-2"
                     >
                        <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-pulse"></span>
                        Hot Deal
                    </span>
                    {/* Badge Tipe Diskon (Persentase / Nominal) */}
                    {banner.value && (
                         <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                             Diskon {banner.type === 'percentage' ? `${banner.value}%` : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(banner.value)}
                         </span>
                    )}
                 </div>
                
                <h2 className="text-4xl md:text-[3.5rem] font-black text-white leading-[1.1] tracking-tight drop-shadow-2xl mb-5">
                    {banner.title}
                </h2>
                {banner.subtitle && (
                    <p className="text-lg md:text-xl font-medium text-slate-200 mb-6 drop-shadow-md max-w-2xl leading-relaxed opacity-90">
                        {banner.subtitle}
                    </p>
                )}

                {/* Info TLD & Validitas */}
                <div className="flex flex-col sm:flex-row gap-4 mb-10 text-white/80 text-sm font-medium">
                    {banner.eligible_tlds && (
                        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/10">
                            <svg className="w-5 h-5 text-[#F97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            <span>Berlaku untuk: <strong className="text-white">
                                {Array.isArray(banner.eligible_tlds) 
                                    ? (banner.eligible_tlds.length > 0 ? banner.eligible_tlds.join(', ') : "Semua TLD")
                                    : (typeof banner.eligible_tlds === 'string' 
                                        ? JSON.parse(banner.eligible_tlds).join(', ') 
                                        : "Promo Spesial")}
                            </strong></span>
                        </div>
                    )}
                    
                    {banner.end_date && (
                        <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-red-500/30 text-red-100">
                             <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Berakhir: <strong className="text-white">{new Date(banner.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
                        </div>
                    )}
                </div>
                
                {banner.buttonText && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(banner.buttonLink || "/promo")}
                            className="group/btn relative px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-sm md:text-base transition-all duration-300 shadow-[0_10px_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-orange-500/30 transform hover:-translate-y-1 overflow-hidden"
                        >
                            <span 
                                className="absolute inset-0 w-full h-full -z-10 transition-all duration-300 ease-in-out scale-x-0 origin-left group-hover/btn:scale-x-100" 
                                style={{ backgroundColor: banner.color || "#F97316" }}
                            ></span>
                            <span className="relative z-10 group-hover/btn:text-white transition-colors duration-300 flex items-center gap-2">
                                {banner.buttonText}
                                <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Subtle Abstract Shapes matching Action Color */}
            <div 
                style={{ backgroundColor: banner.color || "#F97316" }}
                className="absolute top-1/4 right-10 w-[30rem] h-[30rem] blur-[160px] opacity-20 rounded-full pointer-events-none mix-blend-screen mix-blend-color-dodge mix-blend-plus-lighter"
            ></div>
            <div 
                style={{ backgroundColor: banner.color || "#F97316" }}
                className="absolute -bottom-1/4 right-1/4 w-[20rem] h-[20rem] blur-[120px] opacity-10 rounded-full pointer-events-none mix-blend-screen"
            ></div>
            
            {/* Outline highlight inside for depth */}
            <div className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none z-20" />
        </div>
    );
};

export default BannerSection;
