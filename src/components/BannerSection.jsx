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

    const [banner, setBanner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);

    // Initial Load & Event Listener
    useEffect(() => {
        const fetchBanner = async () => {
             try {
                // Since promo system is reset, we show default banner or nothing
                setBanner(null); 
             } catch (error) {
                console.error("Failed to fetch banner:", error);
                setBanner(null);
             } finally {
                setLoading(false);
             }
        };

        fetchBanner();
        // Since we removed manual banner updates, we might not need this event listener anymore,
        // but keeping it doesn't hurt if we trigger it when a promo event is created/updated.
        window.addEventListener("banner_updated", fetchBanner);
        return () => window.removeEventListener("banner_updated", fetchBanner);
    }, []);

    if (loading) return null; // Or a subtle skeleton if preferred
    if (!banner) return null;

    return (
        <section className="py-12 px-6 lg:px-8">
            <div className="max-w-7xl mx-auto rounded-xl relative overflow-hidden shadow-xl group border border-slate-900/5">
                {/* Background Image Container with Aspect Ratio/Height */}
                <div className="absolute inset-0 bg-slate-900">
                    {(banner.imageUrl || banner.banner_image) ? (
                        <>
                            {(!imgLoaded && !imgError) && (
                                <div className="absolute inset-0 bg-slate-800 animate-pulse"></div>
                            )}
                            <img 
                                src={((banner.imageUrl || banner.banner_image) && ((banner.imageUrl || banner.banner_image).startsWith('http') || (banner.imageUrl || banner.banner_image).startsWith('blob:'))) ? (banner.imageUrl || banner.banner_image) : `${import.meta.env.VITE_BACKEND_URL || ''}${banner.imageUrl || banner.banner_image}`} 
                                onLoad={() => setImgLoaded(true)}
                                onError={(e) => { 
                                    setImgError(true);
                                    e.target.onerror = null; 
                                    e.target.src = "/fallback-banner.jpg"; 
                                }}
                                alt="Promo Banner" 
                                className={`w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-80 transition-all duration-700 ease-in-out ${!imgLoaded ? 'invisible' : 'visible'}`} 
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
                            className="text-white px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-orange-900/50 flex items-center gap-2"
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
                    
                    <h2 className="text-4xl md:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight drop-shadow-xl mb-5">
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
                <div className="absolute inset-0 rounded-xl border border-white/5 pointer-events-none z-20" />
            </div>
        </section>
    );
};

export default BannerSection;
