import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreatePromoEventForm from '../../components/admin/CreatePromoEventForm';

const AdminCreateEvent = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-4 animate-fade-in">
            <button
                onClick={() => navigate('/admin/promos')}
                className="flex items-center gap-2 text-neutral-400 hover:text-neutral-800 font-bold uppercase text-[10px] tracking-wider transition-all group"
            >
                <div className="w-7 h-7 rounded-full bg-white border border-neutral-100 flex items-center justify-center shadow-sm group-hover:-translate-x-1 transition-transform">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                </div>
                Kembali ke Daftar Promo
            </button>

            <CreatePromoEventForm />
        </div>
    );
};

export default AdminCreateEvent;
