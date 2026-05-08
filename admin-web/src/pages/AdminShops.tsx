import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Store, Search, Mail, Send, X, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '@/utils/apiConfig';

export default function AdminShops() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [shops, setShops] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [shopSearchInput, setShopSearchInput] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedShopId, setExpandedShopId] = useState<string | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailTarget, setEmailTarget] = useState<{ email: string, nickname: string, shopName: string } | null>(null);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [isEmailSending, setIsEmailSending] = useState(false);

    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Admin Access Check
    useEffect(() => {
        if (!token || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR')) {
            alert(t('admin_dashboard.error_login_req'));
            navigate('/');
        } else {
            fetchData();
        }
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/admin/shops`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || t('admin_dashboard.error_server'));
            }

            const data = await res.json();
            setShops(data);
        } catch (err: any) {
            if (err.message === 'ERR_INVALID_TOKEN') {
                alert(t('profile.err_session_expired', '세션이 만료되었습니다. 다시 로그인해주세요.'));
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/');
            } else {
                setError(err.message || t('admin_dashboard.error_server'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateShopPlan = async (id: string, name: string, currentPlan: string) => {
        const newPlan = currentPlan === 'PREMIUM' ? 'BASIC' : 'PREMIUM';
        const actionStr = newPlan === 'PREMIUM' ? t('admin_dashboard.shop_btn_premium_on') : t('admin_dashboard.shop_btn_premium_off');
        
        if (!window.confirm(t('admin_dashboard.shop_confirm_plan', { name, action: actionStr }))) return;

        try {
            const res = await fetch(`${API_BASE}/api/admin/shops/${id}/plan`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ storePlan: newPlan })
            });

            if (res.ok) {
                alert(t('admin_dashboard.shop_alert_plan_ok', { plan: newPlan }));
                fetchData();
            } else {
                const data = await res.json();
                alert(t('admin_dashboard.shop_alert_plan_fail', { error: data.error }));
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        }
    };

    const handleUpdateShopStatus = async (id: string, name: string, status: 'APPROVED' | 'REJECTED') => {
        let rejectionReasonText = null;
        if (status === 'REJECTED') {
            const reason = window.prompt(t('admin_dashboard.shop_prompt_reject', { name }));
            if (reason === null) return; // User cancelled the prompt
            rejectionReasonText = reason;
        } else {
            if (!window.confirm(t('admin_dashboard.shop_confirm_approve', { name }))) return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/shops/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, rejectionReason: rejectionReasonText })
            });

            if (res.ok) {
                alert(t('admin_dashboard.shop_alert_status_ok', { status: status === 'APPROVED' ? t('admin_dashboard.shop_btn_approve') : t('admin_dashboard.shop_btn_reject') }));
                fetchData();
            } else {
                const data = await res.json();
                alert(t('admin_dashboard.shop_alert_status_fail', { error: data.error }));
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        }
    };

    const handleAllowResubmit = async (id: string, name: string) => {
        if (!window.confirm(t('admin_dashboard.shop_confirm_resubmit', { name }))) return;

        try {
            const res = await fetch(`${API_BASE}/api/admin/shops/${id}/allow-resubmit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                alert(t('admin_dashboard.shop_alert_resubmit_ok'));
                fetchData();
            } else {
                const data = await res.json();
                alert(t('admin_dashboard.shop_alert_resubmit_fail', { error: data.error }));
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        }
    };

    const handleSendEmail = async () => {
        if (!emailTarget || !emailSubject.trim() || !emailBody.trim()) return;
        setIsEmailSending(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: emailTarget.email, subject: emailSubject, message: emailBody })
            });
            if (res.ok) {
                alert(t('admin_dashboard.email_alert_send_ok'));
                setIsEmailModalOpen(false);
                setEmailSubject('');
                setEmailBody('');
            } else {
                const data = await res.json();
                alert(t('admin_dashboard.email_alert_send_fail', { error: data.error }));
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        } finally {
            setIsEmailSending(false);
        }
    };

    // 1. Filter by search input
    const isSearching = shopSearchInput.trim().length > 0;
    let filteredShops = shops.filter(shop => {
        if (!isSearching) return true;
        const searchLower = shopSearchInput.toLowerCase();
        return (
            (shop.name && shop.name.toLowerCase().includes(searchLower)) ||
            (shop.owner?.nickname && shop.owner.nickname.toLowerCase().includes(searchLower)) ||
            (shop.address && shop.address.toLowerCase().includes(searchLower))
        );
    });

    const itemsPerPage = 15;
    const totalPages = Math.ceil(filteredShops.length / itemsPerPage);
    const paginatedShops = filteredShops.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Dashboard Data (When NOT Searching)
    const pendingShops = shops.filter(shop => shop.status === 'PENDING' || shop.status === 'REVOKED');
    const recentShops = shops.filter(shop => shop.status === 'APPROVED').slice(0, 10);

    const renderShopCard = (shop: any) => {
        const isExpanded = expandedShopId === shop.id;
        return (
            <div key={shop.id} className="bg-espresso-900 rounded-2xl border border-coffee-100 shadow-sm overflow-hidden flex flex-col transition-all">
                {/* Header (Always Visible, Click to Expand) */}
                <div
                    onClick={() => setExpandedShopId(isExpanded ? null : shop.id)}
                    className="p-5 flex items-start justify-between cursor-pointer hover:bg-espresso-950/50 transition-colors"
                >
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-espresso-50 text-[17px] hover:text-espresso-200 transition-colors">{shop.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase ${shop.status === 'APPROVED' ? 'bg-green-100 text-green-700' : shop.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                {shop.status === 'APPROVED' ? t('admin_dashboard.shop_status_approved', '승인완료') : shop.status === 'REJECTED' ? t('admin_dashboard.shop_status_rejected', '거절') : shop.status === 'PENDING' ? t('admin_dashboard.shop_status_pending', '진행중') : shop.status === 'REVOKED' ? t('admin_dashboard.shop_status_revoked', '승인해제') : shop.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                    <div className="p-5 pt-0 space-y-4 border-t border-coffee-50 mt-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-espresso-950 p-3 rounded-xl text-[13px] text-espresso-200 break-keep leading-relaxed mt-4">
                            <span className="font-bold text-espresso-50 block mb-1">{t('admin_dashboard.shop_short_desc')}</span>
                            {shop.shortDesc}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] text-espresso-200">
                            <div>
                                <span className="font-bold text-espresso-50 block mb-1">{t('admin_dashboard.shop_long_desc')}</span>
                                <p className="whitespace-pre-wrap">{shop.longDesc}</p>
                                {shop.status === 'REJECTED' && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                                        <span className="font-bold text-red-900 block mb-1 text-[12px]">{t('admin_dashboard.shop_rejection_reason')}</span>
                                        <p className="text-red-800 whitespace-pre-wrap leading-relaxed text-[13px]">{shop.rejectionReason || t('admin_dashboard.shop_no_rejection_reason')}</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                {shop.websiteUrl && (
                                    <p><strong className="text-espresso-50">{t('admin_dashboard.shop_website')}</strong> <a href={shop.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-coffee-600 underline hover:text-espresso-100">{shop.websiteUrl}</a></p>
                                )}
                                <p><strong className="text-espresso-50">{t('admin_dashboard.shop_sig_bean')}</strong> {shop.signatureBean}</p>
                                <p><strong className="text-espresso-50">{t('admin_dashboard.shop_sig_menu')}</strong> {shop.signatureMenu}</p>
                                <p><strong className="text-espresso-50">{t('admin_dashboard.shop_dessert')}</strong> {shop.dessertPairing}</p>
                                <p><strong className="text-espresso-50">{t('admin_dashboard.shop_equipment')}</strong> {shop.equipment}</p>
                                <p><strong className="text-espresso-50">{t('admin_dashboard.shop_hours')}</strong> {shop.hours}</p>
                                <div className="flex gap-2 font-bold text-[11px] mt-1 tracking-wide">
                                    {shop.hasDecaf && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-center">{t('admin_dashboard.shop_opt_decaf')}</span>}
                                    {shop.hasOatMilk && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-center">{t('admin_dashboard.shop_opt_oat')}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-espresso-900 border border-coffee-100 p-3 rounded-xl grid grid-cols-4 gap-2 text-center text-[12px] text-coffee-600">
                            <div><span className="block font-bold text-espresso-50 mb-0.5">{t('admin_dashboard.shop_taste_acidity')}</span>{shop.acidity}/5</div>
                            <div><span className="block font-bold text-espresso-50 mb-0.5">{t('admin_dashboard.shop_taste_sweet')}</span>{shop.sweetness}/5</div>
                            <div><span className="block font-bold text-espresso-50 mb-0.5">{t('admin_dashboard.shop_taste_bitter')}</span>{shop.bitterness}/5</div>
                            <div><span className="block font-bold text-espresso-50 mb-0.5">{t('admin_dashboard.shop_taste_body')}</span>{shop.body}/5</div>
                        </div>

                        {shop.media && shop.media.length > 0 && (
                            <div>
                                <span className="font-bold text-espresso-50 block mb-2 text-[13px]">{t('admin_dashboard.shop_media')}</span>
                                <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                                    {shop.media.map((m: any) => (
                                        <div key={m.id} className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-coffee-100 snap-center bg-espresso-950">
                                            {m.type === 'IMAGE' ? (
                                                <img src={m.url} alt="shop media" className="w-full h-full object-cover" />
                                            ) : (
                                                <video src={m.url} className="w-full h-full object-cover" muted loop playsInline />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-coffee-100">
                            <button
                                onClick={() => {
                                    setEmailTarget({ email: shop.owner.email, nickname: shop.owner.nickname, shopName: shop.name });
                                    setIsEmailModalOpen(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-[14px] hover:bg-blue-100 transition-colors basis-full sm:basis-auto"
                            >
                                <Mail size={18} />
                                {t('admin_dashboard.shop_btn_email')}
                            </button>

                            {shop.status !== 'APPROVED' && (
                                shop.status === 'REJECTED' && shop.approvalRequestsCount >= 3 ? (
                                    <button
                                        onClick={() => handleAllowResubmit(shop.id, shop.name)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-purple-50 text-purple-700 rounded-xl font-bold text-[14px] hover:bg-purple-100 transition-colors"
                                    >
                                        <CheckCircle size={18} />
                                        {t('admin_dashboard.shop_btn_allow_resubmit')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleUpdateShopStatus(shop.id, shop.name, 'APPROVED')}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-50 text-green-700 rounded-xl font-bold text-[14px] hover:bg-green-100 transition-colors"
                                    >
                                        <CheckCircle size={18} />
                                        {t('admin_dashboard.shop_btn_approve')}
                                    </button>
                                )
                            )}

                            {shop.status === 'APPROVED' && (
                                <button
                                    onClick={() => handleUpdateShopPlan(shop.id, shop.name, shop.storePlan || 'BASIC')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-[14px] transition-colors ${shop.storePlan === 'PREMIUM' ? 'bg-slate-50 text-slate-700 hover:bg-slate-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'}`}
                                >
                                    {shop.storePlan === 'PREMIUM' ? t('admin_dashboard.shop_btn_premium_off') : t('admin_dashboard.shop_btn_premium_on')}
                                </button>
                            )}
                            {shop.status !== 'REJECTED' && (
                                <button
                                    onClick={() => handleUpdateShopStatus(shop.id, shop.name, 'REJECTED')}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-[14px] hover:bg-red-100 transition-colors"
                                >
                                    <XCircle size={18} />
                                    {shop.status === 'APPROVED' ? t('admin_dashboard.shop_btn_unapprove') : t('admin_dashboard.shop_btn_reject')}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full w-full bg-espresso-950 overflow-y-auto pb-safe font-sans">
            <div className="max-w-7xl mx-auto flex flex-col min-h-full">
                {/* Header */}
                <header className="px-6 py-6 pt-safe mt-4 shrink-0 border-b border-espresso-700">
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-espresso-900 flex items-center justify-center border border-coffee-100 text-coffee-600 hover:bg-espresso-950 transition-colors active:scale-95 shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <Shield className="text-espresso-50" size={28} />
                        <h1 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('admin_dashboard.tab_shops')}</h1>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 p-4 space-y-4">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-coffee-400">
                            <div className="w-8 h-8 rounded-full border-4 border-espresso-700 border-t-coffee-900 animate-spin mb-4" />
                            <p className="font-medium">{t('admin_dashboard.loading')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
                                <h2 className="text-lg font-bold text-espresso-50">
                                    {isSearching ? t('admin_dashboard.shop_search_result', { count: filteredShops.length }) : t('admin_dashboard.shop_total', { count: filteredShops.length })}
                                </h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder={t('admin_dashboard.shop_ph_search')}
                                        value={shopSearchInput}
                                        onChange={(e) => {
                                            setShopSearchInput(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full sm:w-64 bg-espresso-900 border border-espresso-700 h-10 pl-9 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-coffee-700 outline-none"
                                    />
                                </div>
                            </div>
                            {isSearching ? (
                                <>
                                    {filteredShops.length === 0 ? (
                                        <div className="text-center py-10 text-coffee-400">{t('admin_dashboard.shop_no_result')}</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {paginatedShops.map((shop) => renderShopCard(shop))}
                                        </div>
                                    )}

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-center items-center gap-2 mt-6 pb-4">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 rounded-lg bg-espresso-900 border border-espresso-700 text-espresso-200 disabled:opacity-30 hover:bg-espresso-800 transition-colors"
                                            >
                                                이전
                                            </button>
                                            <div className="flex gap-1">
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                                                            currentPage === page
                                                                ? 'bg-coffee-900 text-espresso-50 border border-coffee-700'
                                                                : 'bg-espresso-900 text-espresso-300 border border-espresso-700 hover:bg-espresso-800'
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1.5 rounded-lg bg-espresso-900 border border-espresso-700 text-espresso-200 disabled:opacity-30 hover:bg-espresso-800 transition-colors"
                                            >
                                                다음
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-6 mt-4">
                                    <section>
                                        <h3 className="text-[15px] font-bold mb-4 text-espresso-200 flex items-center gap-2">
                                            승인 대기 중인 매장
                                            <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full text-xs">{pendingShops.length}</span>
                                        </h3>
                                        {pendingShops.length === 0 ? (
                                            <div className="text-center py-6 bg-espresso-900/50 rounded-2xl border border-coffee-100 border-dashed text-coffee-400 text-sm">
                                                대기 중인 매장이 없습니다.
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {pendingShops.map((shop) => renderShopCard(shop))}
                                            </div>
                                        )}
                                    </section>
                                    
                                    <section>
                                        <h3 className="text-[15px] font-bold mb-4 text-espresso-200 pt-4 border-t border-espresso-700">
                                            최근 등록된 매장
                                        </h3>
                                        {recentShops.length === 0 ? (
                                            <div className="text-center py-6 bg-espresso-900/50 rounded-2xl border border-coffee-100 border-dashed text-coffee-400 text-sm">
                                                운영 중인 매장이 없습니다.
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {recentShops.map((shop) => renderShopCard(shop))}
                                            </div>
                                        )}
                                    </section>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Email Modal */}
            <AnimatePresence>
                {isEmailModalOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEmailModalOpen(false)} className="fixed inset-0 bg-coffee-950/80 backdrop-blur-sm z-[9998]" />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} 
                            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} 
                            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} 
                            transition={{ type: "spring", stiffness: 300, damping: 30 }} 
                            className="fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-4xl bg-espresso-900 rounded-2xl z-[9999] p-6 flex flex-col h-[85vh] shadow-2xl border border-espresso-700"
                        >
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <div>
                                    <h3 className="text-xl font-serif font-bold text-espresso-50">{t('admin_dashboard.email_modal_title')}</h3>
                                    <p className="text-[13px] text-espresso-300 mt-1">
                                        <span className="font-bold text-espresso-200">{emailTarget?.nickname}</span> ({emailTarget?.shopName})
                                    </p>
                                </div>
                                <button onClick={() => setIsEmailModalOpen(false)} className="p-2 -mr-2 bg-espresso-800 text-coffee-600 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto w-full space-y-4 pr-1">
                                <div>
                                    <label className="block text-[13px] font-bold text-coffee-600 mb-1">{t('admin_dashboard.email_label_to')}</label>
                                    <input type="text" value={emailTarget?.email || ''} disabled className="w-full bg-espresso-800 border border-espresso-700 h-10 px-4 rounded-xl text-espresso-300 outline-none text-[14px] cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-coffee-600 mb-1">{t('admin_dashboard.email_label_subject')}</label>
                                    <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder={t('admin_dashboard.email_ph_subject')} className="w-full bg-espresso-950 border border-espresso-700 h-10 px-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[14px]" />
                                </div>
                                <div className="flex-1 flex flex-col min-h-[150px]">
                                    <label className="block text-[13px] font-bold text-coffee-600 mb-1">{t('admin_dashboard.email_label_body')}</label>
                                    <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder={t('admin_dashboard.email_ph_body')} className="w-full flex-1 bg-espresso-950 border border-espresso-700 p-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[14px] resize-none h-32" />
                                </div>
                            </div>

                            <button onClick={handleSendEmail} disabled={isEmailSending || !emailSubject.trim() || !emailBody.trim()} className="mt-4 w-full h-12 bg-coffee-900 text-espresso-50 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all shrink-0">
                                {isEmailSending ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <><Send size={18} /> {t('admin_dashboard.email_btn_send')}</>}
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
