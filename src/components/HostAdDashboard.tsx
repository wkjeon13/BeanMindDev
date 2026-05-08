import React, { useState, useEffect } from 'react';
import { Target, BarChart2, MousePointerClick, Calendar, ArrowRight, Activity, Zap, Info, FileText, ChevronDown, ChevronUp, X, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../utils/apiConfig';
import { useNavigate } from 'react-router-dom';

export default function HostAdDashboard({ advertiserId, hostAppId, filterScope = 'ALL', hideStats = false }: { advertiserId?: string, hostAppId?: string, filterScope?: string, hideStats?: boolean }) {
  const { t } = useTranslation(['translation']);
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedInquiries, setExpandedInquiries] = useState<Record<string, boolean>>({});
    const [isAllInquiriesExpanded, setIsAllInquiriesExpanded] = useState(true);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');

    // Ad Inquiry Modal States
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [inquiryForm, setInquiryForm] = useState({ advertiser: '', contactName: '', contactPhone: '', contactEmail: '', content: '', agreePrivacy: false });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const handleInquirySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/community/ad-inquiries`, {
                 method: 'POST',
                 headers: { 
                     'Content-Type': 'application/json',
                     ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                 },
                 body: JSON.stringify({ ...inquiryForm, userId: data?.userId })
            });
            if (res.ok) {
                 setSubmitSuccess(true);
                 setTimeout(() => { 
                     setShowInquiryModal(false); 
                     setSubmitSuccess(false); 
                     setInquiryForm({ advertiser: '', contactName: '', contactPhone: '', contactEmail: '', content: '', agreePrivacy: false }); 
                 }, 2000);
            } else {
                 alert(t('host_ad.alert_submit_fail', '문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.'));
            }
        } catch(err) {
            alert(t('host_ad.alert_network_err', '네트워크 오류가 발생했습니다.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchAdData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE}/api/users/my-ads`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error("Failed to load ad data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAdData();
    }, []);

    if (isLoading) {
        return <div className="animate-pulse bg-espresso-900/50 rounded-3xl p-6 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)] h-64 flex items-center justify-center text-espresso-300 font-bold">{t('host_ad.lbl_loading', '광고 성과 데이터를 불러오는 중...')}</div>;
    }

    const renderInquiryModal = () => (
        <AnimatePresence>
            {showInquiryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-espresso-950/80 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-espresso-900 border border-espresso-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
                    >
                        <div className="flex justify-between items-center p-5 border-b border-espresso-700/80 shrink-0">
                            <h3 className="text-lg font-black text-espresso-50 flex items-center gap-2">
                                <Target className="text-amber-500" size={20} /> {t('host_ad.title_ad_inquiry', '광고 입점 문의')}</h3>
                            <button onClick={() => setShowInquiryModal(false)} className="text-espresso-300 hover:text-espresso-50 transition-colors bg-espresso-800/50 p-1.5 rounded-full">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                            {submitSuccess ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 flex flex-col items-center justify-center text-center h-full"
                                >
                                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h4 className="text-lg font-bold text-espresso-50 mb-2">{t('host_ad.msg_submit_ok', '문의가 성공적으로 접수되었습니다!')}</h4>
                                    <p className="text-sm text-espresso-200" dangerouslySetInnerHTML={{ __html: t('host_ad.msg_submit_desc', '담당자가 내용을 검토한 후,<br/>입력하신 이메일/연락처로 회신 드리겠습니다.') }}></p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleInquirySubmit} className="space-y-4">
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-2">
                                        <p className="text-xs text-amber-500/90 leading-relaxed font-medium">
                                            {!false && <span dangerouslySetInnerHTML={{__html: t('host_ad.msg_req_host', 'BeanMind 플랫폼 광고를 위해서는 우선 호스트로 회원가입을 하셔야 합니다.<br/>')}}></span>}
                                            {t('host_ad.msg_req_desc', '아래의 정보를 입력하시고 문의하기 버튼을 누르시면 관리자에게 접수가 완료됩니다.')}
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-espresso-200 ml-1">{t('host_ad.lbl_advertiser', '광고주 (상호명/회사명)')} <span className="text-rose-500">*</span></label>
                                        <input required type="text" value={inquiryForm.advertiser} onChange={e => setInquiryForm({...inquiryForm, advertiser: e.target.value})} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-4 py-3 text-sm text-espresso-50 focus:outline-none focus:border-amber-500 transition-colors" placeholder={t('host_ad.ph_advertiser', '예: 빈마인드 로스터리')} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-espresso-200 ml-1">{t('host_ad.lbl_contact_name', '담당자 성함')} <span className="text-rose-500">*</span></label>
                                            <input required type="text" value={inquiryForm.contactName} onChange={e => setInquiryForm({...inquiryForm, contactName: e.target.value})} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-4 py-3 text-sm text-espresso-50 focus:outline-none focus:border-amber-500 transition-colors" placeholder={t('host_ad.ph_contact_name', '홍길동')} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-espresso-200 ml-1">{t('host_ad.lbl_phone', '연락처')} <span className="text-rose-500">*</span></label>
                                            <input required type="tel" value={inquiryForm.contactPhone} onChange={e => setInquiryForm({...inquiryForm, contactPhone: e.target.value})} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-4 py-3 text-sm text-espresso-50 focus:outline-none focus:border-amber-500 transition-colors" placeholder="010-0000-0000" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-espresso-200 ml-1">{t('host_ad.lbl_email', '이메일 주소')} <span className="text-rose-500">*</span></label>
                                        <input required type="email" value={inquiryForm.contactEmail} onChange={e => setInquiryForm({...inquiryForm, contactEmail: e.target.value})} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-4 py-3 text-sm text-espresso-50 focus:outline-none focus:border-amber-500 transition-colors" placeholder="example@email.com" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-espresso-200 ml-1">{t('host_ad.lbl_content', '광고 내용 및 형식')} <span className="text-rose-500">*</span></label>
                                        <textarea required value={inquiryForm.content} onChange={e => setInquiryForm({...inquiryForm, content: e.target.value})} rows={4} className="w-full bg-espresso-950 border border-espresso-700 rounded-xl px-4 py-3 text-sm text-espresso-50 focus:outline-none focus:border-amber-500 transition-colors resize-none" placeholder={t('host_ad.ph_content', '희망하시는 광고 위치, 예산, 노출 방식, 링크 URL 등 자유롭게 적어주세요.')} />
                                    </div>

                                    <div className="mt-4 bg-espresso-900/50 p-3 rounded-xl border border-espresso-700">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input 
                                                required 
                                                type="checkbox" 
                                                className="mt-0.5 w-4 h-4 accent-amber-500 rounded shrink-0" 
                                                checked={inquiryForm.agreePrivacy} 
                                                onChange={e => setInquiryForm({...inquiryForm, agreePrivacy: e.target.checked})} 
                                            />
                                            <div className="text-xs text-espresso-200 leading-relaxed">
                                                <span className="font-bold text-espresso-100 block mb-0.5">{t('host_ad.lbl_privacy', '[필수] 개인정보 수집 및 이용 동의')}</span>
                                                {t('host_ad.desc_privacy', '광고 서비스 제공, 고객 상담, 분쟁 해결을 위해 관리자가 회원의 성명, 연락처, 이메일을 열람할 수 있습니다. 의뢰(문의) 시 이 항목에 동의하는 것으로 간주합니다.')}
                                            </div>
                                        </label>
                                    </div>

                                    <button disabled={isSubmitting} type="submit" className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-espresso-50 font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2 mt-4 active:scale-[0.98]">
                                        {isSubmitting ? (
                                            <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                        ) : (
                                            <>{t('host_ad.btn_submit', '문의 접수하기')} <ArrowRight size={16} /></>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    const renderInquiriesList = () => {
        const inquiries = data?.inquiries || [];
        if (inquiries.length === 0) return null;

        const getStatusBadge = (status: string) => {
            switch(status) {
                case 'PENDING': return <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-espresso-800 text-espresso-100 border border-espresso-600 whitespace-nowrap shadow-sm">{t('host_ad.status_pending', '접수 대기')}</span>;
                case 'REVIEWING': return <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap shadow-sm">{t('host_ad.status_reviewing', '검토 중')}</span>;
                case 'MORE_INFO_NEEDED': return <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 whitespace-nowrap shadow-sm">{t('host_ad.status_more_info', '추가 정보 필요')}</span>;
                case 'APPROVED': return <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap shadow-sm">{t('host_ad.status_approved', '승인 완료')}</span>;
                case 'REJECTED': return <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 whitespace-nowrap shadow-sm">{t('host_ad.status_rejected', '반려됨')}</span>;
                default: return <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-espresso-800 text-espresso-200 whitespace-nowrap shadow-sm">{status}</span>;
            }
        };

        return (
            <div className="mt-8 space-y-4">
                <button 
                    onClick={() => setIsAllInquiriesExpanded(!isAllInquiriesExpanded)}
                    className="w-full flex items-center justify-between text-sm font-bold text-espresso-100 pb-2 border-b border-espresso-700 hover:text-espresso-50 transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <FileText size={16} className="text-amber-500" /> {t('host_ad.title_my_inquiry', '나의 광고 입점 문의 내역')}
                    </span>
                    {isAllInquiriesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <AnimatePresence>
                    {isAllInquiriesExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-3 overflow-hidden"
                        >
                            {inquiries.map((inquiry: any) => {
                                const isObjExpanded = expandedInquiries[inquiry.id] || false;
                                return (
                                <div key={inquiry.id} className="bg-espresso-900 border border-espresso-700/80 rounded-2xl p-4 hover:border-espresso-600 transition-colors shadow-sm relative overflow-hidden group">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500/40 to-transparent"></div>
                                    
                                    {/* Header Section (Clickable) */}
                                    <div 
                                        className="flex justify-between items-start pl-2 cursor-pointer select-none"
                                        onClick={() => setExpandedInquiries(prev => ({ ...prev, [inquiry.id]: !isObjExpanded }))}
                                    >
                                        <div className="flex flex-col gap-1.5 flex-1 pr-4">
                                            <div className="flex items-center justify-between w-full">
                                                <h4 className="text-espresso-50 font-bold text-sm flex items-center gap-2">
                                                    {inquiry.advertiser}
                                                    {isObjExpanded ? <ChevronUp size={16} className="text-espresso-300" /> : <ChevronDown size={16} className="text-espresso-300" />}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-espresso-300 mt-0.5">{new Date(inquiry.createdAt).toLocaleString()}</p>
                                            <span className="text-[11px] font-medium text-blue-400 mt-0.5">{t('host_ad.msg_check_mail', '✨ 자세한 내용은 메일을 확인하세요.')}</span>
                                        </div>
                                        <div className="shrink-0 pt-0.5">
                                            {getStatusBadge(inquiry.status)}
                                        </div>
                                    </div>
                                    
                                    {/* Accordion Content */}
                                    <AnimatePresence>
                                        {isObjExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="text-[13px] text-espresso-200 mt-4 bg-espresso-950/40 p-3 rounded-xl whitespace-pre-wrap ml-2 border border-espresso-700/50">
                                                    {inquiry.content}
                                                </div>
                                                
                                                {inquiry.adminMemo && (
                                                    <div className="mt-3 ml-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                                                        <div className="flex items-center gap-1.5 mb-1.5 text-amber-500">
                                                            <Info size={14} />
                                                            <span className="text-xs font-bold">{t('host_ad.lbl_admin_msg', '관리자 메시지 (회신)')}</span>
                                                        </div>
                                                        <p className="text-[13px] text-amber-100/80 whitespace-pre-wrap leading-relaxed">{inquiry.adminMemo}</p>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )})}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    if (!data?.hasAds) {
        if (hideStats) return null; // Prevent showing the empty state twice

        return (
            <>
                <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-[#1e1a14] p-8 rounded-3xl border border-amber-500/10 text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-30"></div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20 group-hover:scale-110 transition-transform duration-500">
                        <Target className="text-amber-500" size={28} />
                    </div>
                    <h3 className="text-xl font-black text-espresso-50 mb-2 tracking-tight">{t('host_ad.title_ad_center', 'AI 커피 큐레이터 광고 센터')}</h3>
                    <p className="text-espresso-200 text-sm mb-6 max-w-sm mx-auto">{t('host_ad.msg_no_ads', '아직 진행 중인 광고 캠페인이 없습니다. 원두 추천 앱 상단에 내 카페 브랜드를 홍보해보세요!')}</p>
                    <button onClick={() => setShowInquiryModal(true)} className="bg-amber-500 hover:bg-amber-400 text-espresso-50 px-6 py-3 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center gap-2 mx-auto active:scale-95 mb-4">
                        {t('host_ad.title_ad_inquiry', '광고 입점 문의')} <ArrowRight size={16} />
                    </button>
                    <div className="bg-espresso-950/50 p-4 rounded-xl border border-espresso-700/80 inline-block text-left relative overflow-hidden group/info">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-xl"></div>
                        <p className="text-espresso-100 text-sm font-bold mb-2">{t('host_ad.msg_contact_us', '광고 문의는 아래로 연락 주십시오. 감사합니다.')}</p>
                        <div className="text-espresso-200 text-sm space-y-1">
                            <p className="flex items-center gap-2">
                                <span className="font-medium text-espresso-300 w-24">{t('host_ad.lbl_phone_contact', '광고 문의 전화번호:')}</span> 
                                <span className="text-amber-500 font-mono">010-6344-2234</span>
                            </p>
                            <p className="flex items-center gap-2">
                                <span className="font-medium text-espresso-300 w-24">{t('host_ad.lbl_email_contact', '이메일:')}</span> 
                                <span className="text-espresso-100">wjeon@infosk.co.kr</span>
                            </p>
                        </div>
                    </div>
                </div>
                {renderInquiriesList()}
                {renderInquiryModal()}
            </>
        );
    }

    const { advertiser, campaigns, stats } = data;

    const isContractLive = (camp: any) => camp.contract && camp.contract.status !== 'PAUSED' && new Date(camp.contract.startDate) <= new Date() && new Date(camp.contract.endDate) >= new Date();
    const isCampaignLive = (camp: any) => camp.status === 'ACTIVE' && new Date(camp.startDate) <= new Date() && new Date(camp.endDate) >= new Date();
    const isLive = (camp: any) => isContractLive(camp) && isCampaignLive(camp);

    const getDisplayData = () => {
        if (selectedCampaignId === 'ALL') {
            const uniqueContracts = Array.from(
                new Map(campaigns.filter((c: any) => c.contract).map((c: any) => [c.contract.id, c.contract])).values()
            );
            const totalBudgetSum = uniqueContracts.reduce((sum: number, contract: any) => sum + (contract.totalBudget || 0), 0);
            const totalSpentSum = uniqueContracts.reduce((sum: number, contract: any) => sum + (contract.spentBudget || 0), 0);
            return {
                impressions: stats.totalImpressions,
                clicks: stats.totalClicks,
                remainingBudget: Math.max(0, Number(totalBudgetSum) - Number(totalSpentSum)),
                liveCampaignsCount: campaigns.filter(isLive).length
            };
        } else {
            const camp = campaigns.find((c: any) => c.id === selectedCampaignId);
            if (!camp) return { impressions: 0, clicks: 0, remainingBudget: 0, liveCampaignsCount: 0 };
            const budget = camp.contract ? Math.max(0, Number(camp.contract.totalBudget || 0) - Number(camp.contract.spentBudget || 0)) : 0;
            return {
                impressions: camp.stats?.impressions || 0,
                clicks: camp.stats?.clicks || 0,
                remainingBudget: budget,
                liveCampaignsCount: isLive(camp) ? 1 : 0
            };
        }
    };

    const displayData = getDisplayData();

    // Filter campaigns based on scope
    const displayCampaigns = campaigns.filter((camp: any) => {
        if (selectedCampaignId !== 'ALL' && camp.id !== selectedCampaignId) return false;
        if (filterScope === 'ACTIVE') return isLive(camp);
        if (filterScope === 'EXPIRED') return !isLive(camp);
        return true;
    });

    if (hideStats && displayCampaigns.length === 0) {
        return null;
    }

    return (
        <div className={`bg-gradient-to-br from-zinc-900 to-[#0e0e0e] rounded-3xl border border-espresso-700 p-6 shadow-2xl relative overflow-hidden`}>
            {/* Background Accents */}
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none"></div>

            {!hideStats && (
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-xl font-black text-espresso-50 flex items-center gap-2 tracking-tight flex-wrap">
                                <span className="flex items-center gap-2">
                                    <Activity className="text-amber-500 shrink-0" size={22} /> 
                                    {t('host_ad.title_my_ads', '내 광고 성과')}
                                </span>
                                <span className="text-[11px] px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg font-bold border border-amber-500/20 whitespace-nowrap">{t('host_ad.lbl_live', '실시간')}</span>
                            </h2>
                            <p className="text-sm text-espresso-200 mt-1">{t('host_ad.lbl_dashboard', '{{name}}님의 라이브 대시보드', {name: advertiser.companyName})}</p>
                        </div>
                        <div className="shrink-0">
                            {advertiser?.status === 'PAUSED' ? (
                                <div className="bg-rose-500/10 text-rose-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-500/20 inline-block">
                                    {t('host_ad.msg_suspended', '광고 계정 중지됨')}
                                </div>
                            ) : (
                                <button onClick={() => setShowInquiryModal(true)} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-espresso-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-amber-400/50">
                                    {t('host_ad.btn_ad_inquiry', '✨ 광고 추가 문의')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Campaign Selector */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 mb-6 relative z-10">
                        <span className="text-xs text-espresso-300 font-bold">{t('host_ad.lbl_filter', '대시보드 표시 기준')}</span>
                        <select 
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            className="bg-espresso-900 border border-espresso-600 text-espresso-100 text-[13px] font-medium rounded-xl px-3 py-2 outline-none focus:border-amber-500 transition-colors cursor-pointer min-w-[200px]"
                        >
                            <option value="ALL">{t('host_ad.opt_all', '모든 캠페인 (진행중+만료)')}</option>
                            {campaigns.filter(isLive).map((camp: any) => (
                                <option key={camp.id} value={camp.id}>{camp.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Top Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                        <div className="bg-espresso-950/40 backdrop-blur-sm p-4 rounded-2xl border border-espresso-700">
                            <div className="flex items-center gap-2 text-espresso-200 mb-2">
                                <BarChart2 size={16} className="text-amber-500" />
                                <span className="text-xs font-bold">{t('host_ad.lbl_impressions', '누적 노출수')}</span>
                            </div>
                            <p className="text-2xl font-black text-espresso-50 truncate">{displayData.impressions.toLocaleString()}<span className="text-sm text-espresso-300 font-normal ml-1">회</span></p>
                        </div>
                        <div className="bg-espresso-950/40 backdrop-blur-sm p-4 rounded-2xl border border-espresso-700">
                            <div className="flex items-center gap-2 text-espresso-200 mb-2">
                                <MousePointerClick size={16} className="text-blue-500" />
                                <span className="text-xs font-bold">{t('host_ad.lbl_clicks', '누적 클릭수')}</span>
                            </div>
                            <p className="text-2xl font-black text-espresso-50 truncate">{displayData.clicks.toLocaleString()}<span className="text-sm text-espresso-300 font-normal ml-1">회</span></p>
                        </div>
                        <div className="bg-espresso-950/40 backdrop-blur-sm p-4 rounded-2xl border border-espresso-700">
                            <div className="flex items-center gap-2 text-espresso-200 mb-2">
                                <Zap size={16} className="text-emerald-500" />
                                <span className="text-xs font-bold">{t('host_ad.lbl_budget', '예산 잔액 {{extra}}', {extra: selectedCampaignId === 'ALL' ? '(총합)' : ''})}</span>
                            </div>
                            <p className="text-xl font-black text-amber-400 truncate">
                                {displayData.remainingBudget.toLocaleString()} <span className="text-sm text-espresso-300 font-normal ml-1">원</span>
                            </p>
                        </div>
                        <div className="bg-espresso-950/40 backdrop-blur-sm p-4 rounded-2xl border border-espresso-700">
                            <div className="flex items-center gap-2 text-espresso-200 mb-2">
                                <Target size={16} className="text-rose-500" />
                                <span className="text-xs font-bold">{t('host_ad.lbl_live_campaigns', '진행중 캠페인')}</span>
                            </div>
                            <p className="text-2xl font-black text-espresso-50 truncate">{displayData.liveCampaignsCount}<span className="text-sm text-espresso-300 font-normal ml-1">개</span></p>
                        </div>
                    </div>
                </>
            )}

            {/* Campaign List */}
            <div className="space-y-4">
                {filterScope === 'EXPIRED' ? (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)} 
                        className="w-full text-sm font-bold text-espresso-300 py-3 border-b border-espresso-700 flex items-center justify-between hover:text-espresso-200 transition-colors"
                    >
                        <span className="flex items-center gap-2"><FileText size={16} /> {t('host_ad.title_expired', '만료된 광고 내역')}</span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                ) : (
                    <h3 className="text-sm font-bold text-espresso-100 flex items-center gap-2 pb-2">
                        <FileText size={16} /> {t('host_ad.title_live', '진행 중인 캠페인 그룹')}
                    </h3>
                )}

                <AnimatePresence>
                    {(filterScope !== 'EXPIRED' || isExpanded) && (
                        <motion.div
                            initial={filterScope === 'EXPIRED' ? { height: 0, opacity: 0 } : false}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 overflow-hidden"
                        >
                            {displayCampaigns.length === 0 ? (
                                <div className="text-center py-6 bg-espresso-950/40 rounded-xl border border-espresso-700/50 text-espresso-300 text-sm">
                                    {t('host_ad.msg_no_campaign', '현재 등록된 캠페인이 없습니다.')}
                                </div>
                            ) : (
                    displayCampaigns.map((camp: any) => {
                        const campIsLive = isLive(camp);
                        return (
                            <div key={camp.id} className={`relative border rounded-2xl p-5 transition-colors ${filterScope === 'EXPIRED' ? 'bg-espresso-950 border-zinc-900/50 opacity-80' : 'bg-espresso-900 border-espresso-700/80 hover:border-espresso-600'}`}>
                                {/* Status Dot */}
                                <div className={`absolute top-5 right-5 w-2 h-2 rounded-full ${campIsLive ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse' : 'bg-red-500'}`} title={campIsLive ? t('host_ad.tooltip_live', '송출 중') : t('host_ad.tooltip_stopped', '중지됨 (또는 기한 만료)')}></div>
                                
                                <div className="pr-8 mb-4">
                                    <h4 className="text-espresso-50 font-bold text-base truncate">{camp.name}</h4>
                                    <div className="flex flex-col gap-1 mt-2 text-xs text-espresso-200">
                                        {camp.contract && (
                                            <div className="flex items-center gap-2">
                                                <FileText size={12} className={isContractLive(camp) ? "text-emerald-500 text-opacity-70" : "text-rose-500 text-opacity-70"} />
                                                <span className={isContractLive(camp) ? "" : "line-through opacity-60"}>
                                                    {t('host_ad.lbl_contract', '계약: {{start}} ~ {{end}}', {start: new Date(camp.contract.startDate).toLocaleDateString(), end: new Date(camp.contract.endDate).toLocaleDateString()})}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Calendar size={12} className={isCampaignLive(camp) ? "text-emerald-500 text-opacity-70" : "text-rose-500 text-opacity-70"} />
                                            <span className={isCampaignLive(camp) ? "" : "line-through opacity-60"}>
                                                {t('host_ad.lbl_campaign', '캠페인: {{start}} ~ {{end}}', {start: new Date(camp.startDate).toLocaleDateString(), end: new Date(camp.endDate).toLocaleDateString()})}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mt-4">
                                    {camp.creatives.length > 0 ? (
                                        camp.creatives.map((creative: any, idx: number) => (
                                            <div key={creative.id} className="flex gap-3 bg-espresso-950/50 p-3 rounded-xl border border-espresso-700/50">
                                                <span className="text-xs text-espresso-300 font-mono shrink-0 mt-0.5">{(idx+1).toString().padStart(2, '0')}</span>
                                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {creative.status === 'ACTIVE' && campIsLive ? (
                                                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap">{t('host_ad.badge_live', '송출중')}</span>
                                                        ) : creative.status === 'ACTIVE' && !campIsLive ? (
                                                            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 whitespace-nowrap">{t('host_ad.badge_expired', '광고만료')}</span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-espresso-300 bg-espresso-800 px-2 py-0.5 rounded-md whitespace-nowrap">{t('host_ad.badge_paused', '중지됨')}</span>
                                                        )}
                                                        {creative.cpcPrice ? (
                                                            <span className="text-[10px] text-amber-500 font-bold whitespace-nowrap">{t('host_ad.lbl_cpc', 'CPC: {{price}}원', {price: creative.cpcPrice})}</span>
                                                        ) : (
                                                            <span className="text-[10px] text-espresso-300 whitespace-nowrap">{t('host_ad.lbl_cpm', '정액/CPM 모델')}</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 mt-0.5">
                                                        <p className="text-sm text-espresso-100 font-bold truncate">{creative.name}</p>
                                                        <p className="text-[10px] text-espresso-300 uppercase truncate mt-0.5">{creative.type} • {creative.placement?.name || '공통 위치'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-espresso-300 bg-espresso-950/50 p-3 rounded-xl border border-espresso-700/50 flex items-center gap-2">
                                            <Info size={14} /> {t('host_ad.msg_no_creative', '등록된 배너 소재(Creative)가 없습니다.')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Render Inquiries List if there are any */}
            {filterScope !== 'EXPIRED' && renderInquiriesList()}

            {renderInquiryModal()}
        </div>
    );
}
