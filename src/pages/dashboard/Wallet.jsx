import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { CreditCardIcon, ClockIcon, PlusIcon } from '@heroicons/react/24/outline';

const Wallet = () => {
    const [wallet, setWallet] = useState({ balance: 0, currency: 'IDR', transactions: [] });
    const [loading, setLoading] = useState(true);
    
    // Modal States
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const { success, error } = useNotification();
    const navigate = useNavigate();
    
    // Top Up Form
    const [topUpAmount, setTopUpAmount] = useState('');
    const [processingTopUp, setProcessingTopUp] = useState(false);
    

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const walletRes = await api.get('/wallet');
            setWallet(walletRes.data);
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTopUp = async (e) => {
        e.preventDefault();
        setProcessingTopUp(true);
        try {
            const amount = typeof topUpAmount === 'number' ? topUpAmount : parseInt(topUpAmount.toString().replace(/\D/g, ''));
            if (!amount || amount < 10000) {
                error("Minimum Top Up Rp 10.000");
                setProcessingTopUp(false);
                return;
            }

            // Create Top Up Invoice
            const res = await api.post('/checkout/topup', { 
                userId: JSON.parse(localStorage.getItem('user')).id,
                amount: amount
            });

            // Redirect to Checkout Page with Invoice ID
            navigate(`/checkout?invoiceId=${res.data.invoiceId}`);

        } catch (err) {
            console.error(err);
            error(err.response?.data?.message || err.response?.data?.error || "Gagal membuat top up. Coba beberapa saat lagi.");
        } finally {
            setProcessingTopUp(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Wallet...</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Dompet Saya</h1>
                <p className="text-slate-500">Kelola saldo dan riwayat transaksi anda.</p>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <p className="text-orange-100 font-medium mb-1">Saldo Aktif</p>
                        <h2 className="text-4xl font-bold">
                            Rp {(wallet?.balance || 0).toLocaleString('id-ID')}
                        </h2>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowTopUpModal(true)}
                            className="bg-white text-orange-600 px-6 py-3 rounded-lg font-bold hover:bg-orange-50 transition shadow-md flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Isi Saldo
                        </button>
                    </div>
                </div>
                {/* Decor */}
                <div className="absolute -bottom-10 -right-10 text-white/10">
                    <CreditCardIcon className="w-48 h-48" />
                </div>
            </div>


            {/* Transactions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="p-4 sm:p-8 border-b border-slate-50 bg-slate-50/30">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                        <span className="material-symbols-outlined text-[#F97316]">history_edu</span>
                        Riwayat Transaksi
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                <th className="px-8 py-5 border-b border-slate-100">Tanggal</th>
                                <th className="px-8 py-5 border-b border-slate-100 text-center">Tipe</th>
                                <th className="px-8 py-5 border-b border-slate-100">Keterangan</th>
                                <th className="px-8 py-5 border-b border-slate-100 text-right">Nominal</th>
                                <th className="px-8 py-5 border-b border-slate-100 text-right">Saldo Akhir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                            {wallet.transactions.length > 0 ? (
                                wallet.transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase">
                                                {new Date(tx.date).toLocaleDateString('id-ID', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                                                tx.type === 'CREDIT' 
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                : 'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                {tx.type === 'CREDIT' ? 'MASUK' : 'KELUAR'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-900 text-xs uppercase tracking-tight">{tx.reference_type}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{tx.description}</div>
                                        </td>
                                        <td className={`px-8 py-5 text-right font-bold ${
                                            tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'
                                        }`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'} Rp {(tx.amount || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-8 py-5 text-right text-slate-400 font-bold text-xs">
                                            Rp {(tx.balance_after || 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-10 text-center text-slate-400 font-bold italic">
                                        Belum ada riwayat transaksi.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Top Up Modal */}
            {showTopUpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Isi Saldo Wallet</h3>
                            <p className="text-sm text-slate-500">Masukkan nominal top up (Min. Rp 10.000)</p>
                        </div>
                        <form onSubmit={handleTopUp} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nominal (Rp)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        className="w-full pl-12 pr-4 py-4 rounded-lg border-2 border-slate-100 focus:border-orange-500 outline-none text-2xl font-bold text-slate-800 transition-all"
                                        placeholder="0"
                                        value={(() => {
                                            if (!topUpAmount) return '';
                                            return new Intl.NumberFormat('id-ID').format(topUpAmount);
                                        })()}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setTopUpAmount(val ? parseInt(val) : '');
                                        }}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Preset Buttons */}
                            <div className="grid grid-cols-3 gap-2">
                                {[10000, 50000, 100000, 250000, 500000, 1000000].map((nominal) => (
                                    <button
                                        key={nominal}
                                        type="button"
                                        onClick={() => setTopUpAmount(nominal)}
                                        className={`py-2 px-1 rounded-lg border text-sm font-bold transition-all ${
                                            topUpAmount === nominal 
                                            ? 'bg-orange-50 border-orange-500 text-orange-600' 
                                            : 'border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {nominal >= 1000000 
                                            ? `${nominal / 1000000}JT` 
                                            : `${nominal / 1000}RB`}
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowTopUpModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={processingTopUp || !topUpAmount}
                                    className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                                >
                                    {processingTopUp ? 'Memproses...' : 'Lanjut Bayar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Wallet;
