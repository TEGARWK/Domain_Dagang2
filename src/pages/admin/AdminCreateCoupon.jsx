import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreateCouponForm from '../../components/admin/CreateCouponForm';

const AdminCreateCoupon = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* BACK BUTTON */}
            <button 
                onClick={() => navigate('/admin/promos')}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold uppercase text-[10px] tracking-widest transition-all group"
            >
                <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:-translate-x-1 transition-transform">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                </div>
                Kembali ke Daftar Promo
            </button>

            <CreateCouponForm />
        </div>
    );
};

export default AdminCreateCoupon;
