import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, ArrowLeft, Building2, FileText, Target, Image as ImageIcon, LayoutDashboard, X, Search, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/utils/apiConfig';
import { useTranslation } from 'react-i18next';

export default function AdminAds() {
  const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'advertisers'|'contracts'|'campaigns'|'creatives'|'placements'>('advertisers');
    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL'|'ACTIVE'|'EXPIRED'|'SCHEDULED'>('ALL');
    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<any | null>(null);
    const [formData, setFormData] = useState<any>({});
    
    // Host Search States
    const [hostSearchQuery, setHostSearchQuery] = useState('');
    const [hostSearchResults, setHostSearchResults] = useState<any[]>([]);
    
    // Dependent lists for dropdowns
    const [advertisers, setAdvertisers] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [placements, setPlacements] = useState<any[]>([]);
    const [approvedInquiries, setApprovedInquiries] = useState<any[]>([]);

    useEffect(() => {
        const checkAdmin = async () => {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/');
            try {
                const res = await fetch(`${API_BASE}/api/users/me`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (data.role !== 'ADMIN' && data.role !== 'MODERATOR') navigate('/');
                else fetchAllDependencies();
            } catch { navigate('/'); }
        };
        checkAdmin();
    }, [navigate]);

    const fetchAllDependencies = async () => {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        try {
            const [advRes, conRes, camRes, plaRes, inqRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/advertisers`, { headers }),
                fetch(`${API_BASE}/api/admin/contracts`, { headers }),
                fetch(`${API_BASE}/api/admin/campaigns`, { headers }),
                fetch(`${API_BASE}/api/admin/placements`, { headers }),
                fetch(`${API_BASE}/api/admin/ad-inquiries`, { headers })
            ]);
            setAdvertisers(await advRes.json());
            setContracts(await conRes.json());
            setCampaigns(await camRes.json());
            setPlacements(await plaRes.json());
            const inqs = await inqRes.json();
            setApprovedInquiries(inqs.filter((i:any) => i.status === 'APPROVED'));
            fetchData(activeTab);
        } catch(e) { console.error(e); }
    };

    const fetchData = async (tab = activeTab) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/${tab}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if(res.ok) setItems(await res.json());
        } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(activeTab); }, [activeTab]);

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('admin_ads.confirm_delete', '정말로 삭제하시겠습니까?'))) return;
        try {
            await fetch(`${API_BASE}/api/admin/${activeTab}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            fetchData();
        } catch(e) {}
    };

    const handleSave = async () => {
        try {
            if (activeTab === 'campaigns') {
                const isDuplicate = campaigns.some((c:any) => c.name === formData.name && (!editItem || c.id !== editItem.id));
                if (isDuplicate) {
                    alert(t('admin_ads.alert_dup_campaign', '이미 존재하는 캠페인 이름입니다. 다른 이름을 기입해주세요.'));
                    return;
                }
            }

            if (activeTab === 'advertisers' && !editItem && !formData.adInquiryId) {
                alert(t('admin_ads.alert_req_inquiry', '광고주 CRM 생성을 위해서는 먼저 승인된 광고 신청 내역을 선택하셔야 합니다.'));
                return;
            }

            if (activeTab === 'placements' && !editItem) {
                const isDuplicate = placements.some((p:any) => p.locationKey === formData.locationKey);
                if (isDuplicate) {
                    alert('해당 노출 위치(시스템 키워드)는 이미 생성되어 있습니다. 목록에서 찾아 수정해주세요.');
                    return;
                }
            }

            // Apply numeric and date conversions
            let payload = { ...formData };
            if (activeTab === 'contracts') {
                payload.totalBudget = parseFloat(payload.totalBudget || 0);
            }
            if (activeTab === 'campaigns') {
                payload.budget = parseFloat(payload.budget || 0);
            }
            if (activeTab === 'creatives') {
                payload.type = payload.type || 'IMAGE';
                payload.size = payload.size || 'MEDIUM';
                if (payload.type === 'IMAGE') {
                    payload.overlayPosition = payload.overlayPosition || 'BOTTOM_LEFT';
                    payload.overlayColor = payload.overlayColor || '#ffffff';
                }
            }

            const url = editItem 
                ? `${API_BASE}/api/admin/${activeTab}/${editItem.id}` 
                : `${API_BASE}/api/admin/${activeTab}`;
            const res = await fetch(url, {
                method: editItem ? 'PUT' : 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify(payload)
            });
            if(res.ok) {
                setIsModalOpen(false);
                fetchAllDependencies();
            } else {
                const err = await res.json();
                alert(t('admin_ads.alert_save_fail', '저장에 실패했습니다: {{error}}', {error: err.error || '알 수 없는 오류'}));
            }
        } catch (e) { alert(t('admin_ads.alert_save_err', '저장 중 오류 발생')); }
    };

    const searchHosts = async (q: string) => {
        setHostSearchQuery(q);
        if (q.length < 2) { setHostSearchResults([]); return; }
        try {
            const res = await fetch(`${API_BASE}/api/admin/hosts/search?q=${encodeURIComponent(q)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) setHostSearchResults(await res.json());
        } catch(e) {}
    };

    const openModal = (item?: any) => {
        setEditItem(item || null);
        setHostSearchQuery('');
        setHostSearchResults([]);
        if (item) {
            setFormData({...item});
        } else {
            // Default empty schemas
            if (activeTab === 'advertisers') setFormData({ companyName: '', managerName: '', managerEmail: '', status: 'ACTIVE', grade: 'STANDARD', userId: '', adInquiryId: '' });
            if (activeTab === 'contracts') setFormData({ advertiserId: '', name: '', startDate: new Date().toISOString().slice(0,10), endDate: new Date().toISOString().slice(0,10), totalBudget: 0, status: 'ACTIVE' });
            if (activeTab === 'campaigns') setFormData({ advertiserId: '', contractId: '', name: '', startDate: new Date().toISOString().slice(0,10), endDate: new Date().toISOString().slice(0,10), targetCountry: 'GLOBAL', status: 'ACTIVE' });
            if (activeTab === 'creatives') setFormData({ campaignId: '', name: '', type: 'IMAGE', size: 'MEDIUM', content: '', status: 'ACTIVE', placementId: '', cpcPrice: '1000', flavorTags: '', originTags: '' });
            if (activeTab === 'placements') setFormData({ name: '', locationKey: 'FEED_STANDARD', supportedSizes: 'SMALL,MEDIUM' });
        }
        setIsModalOpen(true);
    };

    const tabs = [
        { id: 'advertisers', label: t('admin_ads.tab_advertisers', '광고주 CRM'), icon: Building2 },
        { id: 'contracts', label: t('admin_ads.tab_contracts', '게재 계약'), icon: FileText },
        { id: 'campaigns', label: t('admin_ads.tab_campaigns', '캠페인 그룹'), icon: Target },
        { id: 'creatives', label: t('admin_ads.tab_creatives', '단위 소재(배너)'), icon: ImageIcon },
        { id: 'placements', label: t('admin_ads.tab_placements', '노출 영역'), icon: LayoutDashboard }
    ];

    return (
        <div className="absolute inset-0 bg-[#09090b] text-espresso-50 font-sans flex flex-col">
            {/* Header */}
            <header className="shrink-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-espresso-700">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-espresso-800 rounded-xl transition-colors text-espresso-200 hover:text-espresso-50">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Settings className="text-amber-500" size={24} />
                                Ads CRM (초격차 광고 서버)
                            </h1>
                        </div>
                    </div>
                    <button onClick={() => openModal()} className="bg-amber-500 hover:bg-amber-400 text-espresso-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-amber-500/20">
                        <Plus size={18} /><span className="hidden sm:inline">{t('admin_ads.btn_new', '새 항목 작성')}</span>
                    </button>
                </div>
                
                {/* Internal Tabs */}
                <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto no-scrollbar border-t border-espresso-700/50">
                    {tabs.map(t => (
                        <button 
                            key={t.id}
                            onClick={() => { setActiveTab(t.id as any); setSearchQuery(''); }}
                            className={`flex items-center gap-2 py-4 border-b-2 whitespace-nowrap px-1 transition-colors ${activeTab === t.id ? 'border-amber-500 text-amber-500 font-bold' : 'border-transparent text-espresso-300 hover:text-espresso-100'}`}
                        >
                            <t.icon size={16} />{t.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="shrink-0 border-b border-espresso-700/50 bg-[#09090b]">
                <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso-300" size={18} />
                        <input
                            type="text"
                            placeholder={t('admin_ads.ph_search', '{{tab}} 검색... (이름, 담당자, 회사명 등)', {tab: tabs.find(t => t.id === activeTab)?.label})}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-espresso-900 border border-espresso-700 text-espresso-50 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                    </div>
                    {activeTab !== 'placements' && (
                        <select 
                            className="bg-espresso-900 border border-espresso-700 text-espresso-50 px-4 py-2 rounded-xl focus:outline-none focus:border-amber-500/50 outline-none text-sm font-bold"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                        >
                            <option value="ALL">{t('admin_ads.filter_all', '전체 상태')}</option>
                            <option value="ACTIVE">{t('admin_ads.filter_active', '진행중 (ACTIVE)')}</option>
                            <option value="EXPIRED">{t('admin_ads.filter_expired', '종료 (소진/만료)')}</option>
                            <option value="SCHEDULED">{t('admin_ads.filter_scheduled', '대기중 (SCHEDULED)')}</option>
                        </select>
                    )}
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-4 pb-24 scroll-smooth">
                <div className="max-w-7xl mx-auto">
                {isLoading ? (
                    <div className="text-center py-20 text-espresso-300 animate-pulse">{t('admin_ads.loading', '데이터를 불러오는 중입니다...')}</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-32 rounded-3xl border border-dashed border-espresso-700">
                        <Settings className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                        <h3 className="text-lg font-bold text-espresso-50 mb-2">{t('admin_ads.no_data', '항목이 없습니다')}</h3>
                        <p className="text-espresso-300">{t('admin_ads.no_data_desc', '우측 상단 버튼을 눌러 새 데이터를 생성하세요.')}</p>
                    </div>
                ) : (() => {
                    const getItemStatusDetails = (item: any) => {
                        if (!item.status) return { category: 'NONE', label: 'UNKNOWN', color: 'bg-espresso-800 text-espresso-200 border border-espresso-600' };

                        let displayStatus = item.status;
                        let category = item.status === 'PAUSED' ? 'PAUSED' : item.status === 'COMPLETED' ? 'EXPIRED' : item.status;

                        let startDateToCheck = item.startDate || item.campaign?.startDate || item.contract?.startDate;
                        let endDateToCheck = item.endDate || item.campaign?.endDate || item.contract?.endDate;
                        let relevantContract = activeTab === 'contracts' ? item : activeTab === 'campaigns' ? item.contract : activeTab === 'creatives' ? item.campaign?.contract : null;

                        if (item.status === 'ACTIVE' || item.status === 'COMPLETED') {
                            const now = new Date();
                            let isBudgetExhausted = false;
                            let isExpired = false;
                            let isScheduled = false;

                            if (relevantContract && relevantContract.pricingModel !== 'FIXED' && relevantContract.spentBudget >= relevantContract.totalBudget && relevantContract.totalBudget > 0) {
                                displayStatus = t('admin_ads.status_expired_budget', 'EXPIRED (예산소진)');
                                category = 'EXPIRED';
                                isBudgetExhausted = true;
                            }

                            if (!isBudgetExhausted && endDateToCheck) {
                                const end = new Date(endDateToCheck);
                                end.setHours(23, 59, 59, 999);
                                if (end < now) {
                                    displayStatus = t('admin_ads.status_expired_time', 'EXPIRED (기간만료)');
                                    category = 'EXPIRED';
                                    isExpired = true;
                                }
                            }

                            if (!isExpired && !isBudgetExhausted && startDateToCheck) {
                                const start = new Date(startDateToCheck);
                                start.setHours(0, 0, 0, 0);
                                if (start > now) {
                                    displayStatus = t('admin_ads.status_scheduled', 'SCHEDULED (시작전)');
                                    category = 'SCHEDULED';
                                    isScheduled = true;
                                }
                            }

                            if (item.status === 'COMPLETED' && category !== 'EXPIRED') {
                                category = 'EXPIRED';
                            }
                        }

                        const color = (category === 'EXPIRED') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : category === 'SCHEDULED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : category === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-espresso-800 text-espresso-200 border border-espresso-600';

                        return { category, label: displayStatus, color };
                    };

                    const filteredItems = items.filter(item => {
                        if (activeTab !== 'placements' && statusFilter !== 'ALL') {
                            const { category } = getItemStatusDetails(item);
                            if (statusFilter === 'EXPIRED' && category !== 'EXPIRED' && category !== 'PAUSED') return false;
                            if (statusFilter === 'ACTIVE' && category !== 'ACTIVE') return false;
                            if (statusFilter === 'SCHEDULED' && category !== 'SCHEDULED') return false;
                        }

                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        if (item.companyName?.toLowerCase().includes(q)) return true;
                        if (item.name?.toLowerCase().includes(q)) return true;
                        if (item.managerName?.toLowerCase().includes(q)) return true;
                        if (item.managerEmail?.toLowerCase().includes(q)) return true;
                        if (item.advertiser?.companyName?.toLowerCase().includes(q)) return true;
                        if (item.campaign?.name?.toLowerCase().includes(q)) return true;
                        if (item.locationKey?.toLowerCase().includes(q)) return true;
                        return false;
                    });

                    if (filteredItems.length === 0) {
                        return (
                            <div className="text-center py-20 text-espresso-300 bg-espresso-900 rounded-2xl border border-espresso-700">
{t('admin_ads.no_result', '검색 결과가 없습니다.')}
</div>
                        );
                    }

                    return (
                    <div className="grid gap-4">
                        {filteredItems.map((item) => (
                            <div key={item.id} className="bg-espresso-900 p-5 rounded-2xl border border-espresso-700/50 flex flex-col md:flex-row gap-4 md:items-center justify-between flex-wrap group hover:border-amber-500/50 transition-colors">
                                <div className="flex-[2] min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-espresso-50 truncate">
                                            {activeTab === 'contracts' && !item.name 
                                                ? `계약: ${item.totalBudget?.toLocaleString()||0}원` 
                                                : (item.companyName || item.name || '이름 없는 항목')}
                                        </h3>
                                        {item.status && (
                                            (() => {
                                                const statusDetails = getItemStatusDetails(item);
                                                return (
                                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusDetails.color}`}>
                                                        {statusDetails.label}
                                                    </span>
                                                );
                                            })()
                                        )}
                                    </div>
                                    <p className="text-sm text-espresso-200 line-clamp-2">
                                        {activeTab === 'advertisers' && `${item.managerName} (${item.managerEmail})`}
                                        {activeTab === 'contracts' && `광고주: ${item.advertiser?.companyName || 'N/A'} | 기간: ${new Date(item.startDate).toLocaleDateString()} ~ ${new Date(item.endDate).toLocaleDateString()}`}
                                        {activeTab === 'campaigns' && `광고주: ${item.advertiser?.companyName} | 계액: ${item.contract?.totalBudget||0} | 국가: ${item.targetCountry}`}
                                        {activeTab === 'creatives' && `캠페인: ${item.campaign?.name} | 타입: ${item.type} | 배치: ${item.placement?.name || '기본'}`}
                                        {activeTab === 'placements' && `키워드: ${item.locationKey} | 지원 사이즈: ${item.supportedSizes}`}
                                    </p>
                                </div>

                                {activeTab === 'creatives' && (
                                    <div className="flex-1 shrink-0 flex items-center justify-center gap-6 border-l border-espresso-700/50 pl-4 py-2">
                                        <div className="text-center">
                                            <p className="text-[10px] text-espresso-300 font-medium">{t('admin_ads.lbl_impressions', '노출')}</p>
                                            <p className="font-mono font-black">{item.impressions || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-espresso-300 font-medium">{t('admin_ads.lbl_clicks', '클릭')}</p>
                                            <p className="font-mono font-black text-amber-500">{item.clicks || 0}</p>
                                        </div>
                                        <div className="text-center border-l border-espresso-700/50 pl-6 ml-2">
                                            <p className="text-[10px] text-espresso-300 font-medium">{t('admin_ads.lbl_budget_rem', '예산 잔액')}</p>
                                            <p className="font-mono font-black text-emerald-500">
                                                {item.campaign?.contract ? 
                                                    Math.max(0, (item.campaign.contract.totalBudget || 0) - (item.campaign.contract.spentBudget || 0)).toLocaleString() 
                                                    : 0}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-espresso-700/50 pt-4 md:pt-0 md:pl-4">
                                    {activeTab === 'contracts' && item.spentBudget > 0 ? (
                                        <div title="이미 노출이 시작되어 예산이 소진된 계약은 수정할 수 없습니다." className="p-2 bg-espresso-900/50 text-espresso-700 rounded-xl cursor-not-allowed">
                                            <Edit2 size={18} />
                                        </div>
                                    ) : (
                                        <button onClick={() => openModal(item)} className="p-2 bg-espresso-800 hover:bg-amber-500 hover:text-espresso-50 rounded-xl transition-colors text-espresso-200">
                                            <Edit2 size={18} />
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-espresso-800 hover:bg-rose-500 hover:text-espresso-50 rounded-xl transition-colors text-espresso-200">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    );
                })()}
                </div>
            </main>

            {/* Universal Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-espresso-950/80 backdrop-blur-sm">
                    <div className="bg-espresso-900 w-full max-w-2xl rounded-2xl border border-espresso-700 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-espresso-700 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold">{editItem ? t('admin_ads.modal_title_edit', '항목 수정') : t('admin_ads.modal_title_new', '새 항목 작성')}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-espresso-300 hover:text-espresso-50"><X size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            
                            {/* Advertisers Form */}
                            {activeTab === 'advertisers' && (
                                <>
                                    {!editItem && (
                                        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl space-y-3 mb-4">
                                            <label className="text-sm font-bold text-amber-500 block">{t('admin_ads.lbl_inq_req', '연결할 승인된 광고 문의 (필수)')}</label>
                                            <select 
                                                className="w-full bg-espresso-950 border border-amber-500/50 p-3 rounded-xl text-espresso-50 outline-none focus:border-amber-500"
                                                value={formData.adInquiryId || ''}
                                                onChange={e => {
                                                    const inqId = e.target.value;
                                                    const inq = approvedInquiries.find(i => i.id === inqId);
                                                    if (inq) {
                                                        setFormData({
                                                            ...formData,
                                                            adInquiryId: inqId,
                                                            companyName: inq.advertiser,
                                                            managerName: inq.contactName,
                                                            managerEmail: inq.contactEmail,
                                                            userId: inq.userId || ''
                                                        });
                                                    } else {
                                                        setFormData({...formData, adInquiryId: ''});
                                                    }
                                                }}
                                            >
                                                <option value="">{t('admin_ads.opt_sel_inq', '-- 먼저 승인된 광고 문의를 선택하세요 --')}</option>
                                                {approvedInquiries.map(inq => (
                                                    <option key={inq.id} value={inq.id}>{inq.advertiser} - {inq.contactName}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className={`bg-espresso-900 border border-espresso-600/50 p-4 rounded-xl space-y-4 mb-2 ${!editItem && !formData.adInquiryId ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <label className="text-sm font-bold text-amber-500 flex items-center gap-2">
                                            <Search size={16}/> 호스트(점주) 계정 연동
                                        </label>
                                        <p className="text-xs text-espresso-200">{t('admin_ads.desc_host_sync', '광고주 회사 담당자의 앱 계정을 연동하면, 해당 점주가 앱에서 직접 광고 성과를 모니터링 할 수 있습니다.')}</p>
                                        
                                        {!formData.userId ? (
                                            <div className="relative">
                                                <input 
                                                    className="w-full bg-espresso-950 border border-espresso-600 p-3 rounded-xl focus:border-amber-500 outline-none text-sm transition-colors" 
                                                    placeholder={t('admin_ads.ph_host_search', '가입된 호스트 닉네임 또는 이메일 검색 (2자 이상)...')} 
                                                    value={hostSearchQuery} 
                                                    onChange={e => searchHosts(e.target.value)}
                                                />
                                                {hostSearchResults.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-espresso-800 border border-zinc-600 rounded-xl max-h-56 overflow-y-auto shadow-2xl z-50">
                                                        {hostSearchResults.map(h => (
                                                            <button 
                                                                key={h.id} 
                                                                onClick={() => {
                                                                    const storeName = h.stores && h.stores.length > 0 ? h.stores[0].name : h.nickname;
                                                                    const storeOwner = h.stores && h.stores.length > 0 ? h.stores[0].ownerName : h.nickname;
                                                                    setFormData({
                                                                        ...formData, 
                                                                        userId: h.id, 
                                                                        managerName: storeOwner, 
                                                                        managerEmail: h.email,
                                                                        companyName: storeName
                                                                    });
                                                                    setHostSearchQuery('');
                                                                    setHostSearchResults([]);
                                                                }}
                                                                className="w-full text-left px-4 py-3 border-b border-espresso-600/50 hover:bg-espresso-700 flex items-center gap-3 transition-colors"
                                                            >
                                                                <img src={h.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${h.id}`} className="w-8 h-8 rounded-full" alt="Profile" />
                                                                <div>
                                                                    <p className="font-bold text-espresso-50 text-sm">{h.nickname}</p>
                                                                    <p className="text-xs text-espresso-200">{h.email}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-400 p-3 rounded-xl text-sm font-bold border border-emerald-500/20">
                                                <CheckCircle2 size={18} /> 계정 연동 완료: {formData.managerName} ({formData.managerEmail})
                                                <button onClick={() => setFormData({...formData, userId: ''})} className="ml-auto text-espresso-200 hover:text-espresso-50 transition-colors">
                                                    <X size={18}/>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`space-y-4 ${!editItem && !formData.adInquiryId ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <input className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" placeholder="회사/브랜드명 (Company Name)" value={formData.companyName||''} onChange={e=>setFormData({...formData, companyName: e.target.value})} />
                                        <input className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" placeholder="담당자 이름" value={formData.managerName||''} onChange={e=>setFormData({...formData, managerName: e.target.value})} />
                                        <input className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" placeholder="담당자 이메일" value={formData.managerEmail||''} onChange={e=>setFormData({...formData, managerEmail: e.target.value})} />
                                        <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" value={formData.status||'ACTIVE'} onChange={e=>setFormData({...formData, status: e.target.value})}>
                                            <option value="ACTIVE">활성 (ACTIVE)</option>
                                            <option value="PAUSED">중지 (PAUSED)</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Contracts Form */}
                            {activeTab === 'contracts' && (
                                <>
                                    <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" value={formData.advertiserId||''} onChange={e=>setFormData({...formData, advertiserId: e.target.value})}>
                                        <option value="">광고주 선택...</option>
                                        {advertisers.map(a => <option key={a.id} value={a.id}>{a.companyName}</option>)}
                                    </select>
                                    <input 
                                        className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl mt-2" 
                                        placeholder="관리용 계약명 (예: 봄맞이 메인 배너 프로모션)" 
                                        value={formData.name||''} 
                                        onChange={e=>setFormData({...formData, name: e.target.value})} 
                                    />
                                    <label className="text-sm text-espresso-300 font-bold mt-2 block">계약 기간</label>
                                    <div className="flex gap-2">
                                        <input type="date" className="flex-1 bg-espresso-900 border border-espresso-600 p-3 rounded-xl [color-scheme:dark]" value={formData.startDate?.slice(0,10)||''} onChange={e=>setFormData({...formData, startDate: e.target.value})} />
                                        <input type="date" className="flex-1 bg-espresso-900 border border-espresso-600 p-3 rounded-xl [color-scheme:dark]" value={formData.endDate?.slice(0,10)||''} onChange={e=>setFormData({...formData, endDate: e.target.value})} />
                                    </div>
                                    <label className="text-sm text-espresso-300 font-bold mt-2 block">광고 금액</label>
                                    <input type="number" className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" placeholder="총 예산 (Budget)" value={formData.totalBudget||0} onChange={e=>setFormData({...formData, totalBudget: e.target.value})} />
                                </>
                            )}

                            {/* Campaigns Form */}
                            {activeTab === 'campaigns' && (
                                <>
                                    <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" value={formData.advertiserId||''} onChange={e=>setFormData({...formData, advertiserId: e.target.value})}>
                                        <option value="">광고주 선택...</option>
                                        {advertisers.map(a => <option key={a.id} value={a.id}>{a.companyName}</option>)}
                                    </select>
                                    <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" value={formData.contractId||''} onChange={e=>{
                                        const cId = e.target.value;
                                        const c = contracts.find((c:any) => c.id === cId);
                                        if (c) {
                                            setFormData({...formData, contractId: cId, advertiserId: c.advertiserId, startDate: c.startDate, endDate: c.endDate});
                                        } else {
                                            setFormData({...formData, contractId: cId});
                                        }
                                    }}>
                                        <option value="">계약 선택...</option>
                                        {contracts
                                            .filter((c:any) => !formData.advertiserId || c.advertiserId === formData.advertiserId)
                                            .map((c:any) => <option key={c.id} value={c.id}>{c.name || '계약서명 없음'} ({c.totalBudget.toLocaleString()}원)</option>)}
                                    </select>
                                    <input className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" placeholder="캠페인 명" value={formData.name||''} onChange={e=>setFormData({...formData, name: e.target.value})} />
                                    <label className="text-sm text-espresso-300 font-bold">캠페인 기간</label>
                                    <div className="flex gap-2">
                                        <input type="date" className="flex-1 bg-espresso-900 border border-espresso-600 p-3 rounded-xl [color-scheme:dark]" value={formData.startDate?.slice(0,10)||''} onChange={e=>setFormData({...formData, startDate: e.target.value})} />
                                        <input type="date" className="flex-1 bg-espresso-900 border border-espresso-600 p-3 rounded-xl [color-scheme:dark]" value={formData.endDate?.slice(0,10)||''} onChange={e=>setFormData({...formData, endDate: e.target.value})} />
                                    </div>
                                    <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" value={formData.targetCountry||'GLOBAL'} onChange={e=>setFormData({...formData, targetCountry: e.target.value})}>
                                        <option value="GLOBAL">전 세계 (GLOBAL)</option>
                                        <option value="KR">대한민국 (KR)</option>
                                        <option value="US">미국 (US)</option>
                                    </select>
                                    
                                    <label className="text-sm text-espresso-300 font-bold mt-2 block">데이파팅 (요일/시간 타겟팅) - 선택</label>
                                    <input className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl mb-2" placeholder="노출 요일 (0=일, 1=월 ... 6=토) 예: 1,2,3,4,5" value={formData.targetDays||''} onChange={e=>setFormData({...formData, targetDays: e.target.value})} />
                                    <input className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl mb-4" placeholder="노출 시간 (00~23) 예: 08,09,12,18" value={formData.targetHours||''} onChange={e=>setFormData({...formData, targetHours: e.target.value})} />
                                </>
                            )}

                            {/* Creatives Form */}
                            {activeTab === 'creatives' && (
                                <>
                                    <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" value={formData.campaignId||''} onChange={e=>setFormData({...formData, campaignId: e.target.value})}>
                                        <option value="">캠페인 그룹 선택...</option>
                                        {[...campaigns]
                                            .filter((c:any) => c.status === 'ACTIVE')
                                            .sort((a:any, b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                            .map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <input className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" placeholder="소재 배너 이름" value={formData.name||''} onChange={e=>setFormData({...formData, name: e.target.value})} />
                                    
                                    <label className="text-sm text-espresso-300 font-bold mt-2 block">스페셜티 AI 타겟팅 태그 (선택)</label>
                                    <input className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" placeholder="맛 노트 태그 (예: 산미, 플로럴, 과일향)" value={formData.flavorTags||''} onChange={e=>setFormData({...formData, flavorTags: e.target.value})} />
                                    <input className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" placeholder="원산지 태그 (예: 에티오피아, 디카페인)" value={formData.originTags||''} onChange={e=>setFormData({...formData, originTags: e.target.value})} />

                                    <label className="text-sm text-espresso-300 font-bold mt-2 block">과금 모델 (CPC)</label>
                                    <input type="number" className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" placeholder="클릭당 과금 단가 (비워두면 CPM 정액제)" value={formData.cpcPrice||''} onChange={e=>setFormData({...formData, cpcPrice: e.target.value})} />

                                    <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl mt-4" value={formData.type||'IMAGE'} onChange={e=>setFormData({...formData, type: e.target.value})}>
                                        <option value="IMAGE">IMAGE 배너</option>
                                        <option value="VIDEO">VIDEO 오토플레이</option>
                                        <option value="HTML">HTML 커스텀</option>
                                        <option value="TEXT_LINK">TEXT_LINK (텍스트 버튼형)</option>
                                    </select>
                                    <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" value={formData.size||'MEDIUM'} onChange={e=>setFormData({...formData, size: e.target.value})}>
                                        <option value="SMALL">SMALL</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="LARGE">LARGE</option>
                                        <option value="FULL">FULL</option>
                                    </select>
                                    <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" value={formData.placementId||''} onChange={e=>setFormData({...formData, placementId: e.target.value})}>
                                        <option value="">노출 영역 (선택 안함 = 기본 STANDARD)</option>
                                        {placements.map(p => <option key={p.id} value={p.id}>{p.name} ({p.locationKey})</option>)}
                                    </select>
                                    {formData.type === 'HTML' ? (
                                        <textarea className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl font-mono text-xs" rows={4} placeholder="HTML/JS 코드" value={formData.content||''} onChange={e=>setFormData({...formData, content: e.target.value})} />
                                    ) : formData.type === 'TEXT_LINK' ? (
                                        <input className="w-full bg-espresso-900 border-amber-500/50 focus:border-amber-500 outline-none p-3 rounded-xl text-amber-500 placeholder:text-amber-500/50" placeholder="버튼에 표시될 문구 (예: 구매하기)" value={formData.content||''} onChange={e=>setFormData({...formData, content: e.target.value})} />
                                    ) : (
                                        <>
                                            <div className="relative flex items-center gap-2">
                                                <input className="flex-1 bg-espresso-900 border border-espresso-600 p-3 rounded-xl pr-28" placeholder="이미지 / 영상 URL" value={formData.content||''} onChange={e=>setFormData({...formData, content: e.target.value})} />
                                                <label className="absolute right-2 top-1/2 -translate-y-1/2 bg-espresso-800 hover:bg-amber-500 hover:text-espresso-50 text-espresso-200 text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-sm">
                                                    <ImageIcon size={14} /> 업로드
                                                    <input type="file" className="hidden" accept="image/*,video/*" onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        try {
                                                            const uploadData = new FormData();
                                                            uploadData.append('media', file);
                                                            const res = await fetch(`${API_BASE}/api/admin/upload-ad-media`, {
                                                                method: 'POST',
                                                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                                                                body: uploadData
                                                            });
                                                            if (res.ok) {
                                                                const data = await res.json();
                                                                setFormData({...formData, content: data.url});
                                                            } else {
                                                                alert('업로드 실패');
                                                            }
                                                        } catch (err) {
                                                            alert('업로드 에러 발생');
                                                        }
                                                    }} />
                                                </label>
                                            </div>
                                            {formData.type === 'IMAGE' && (
                                                <div className="bg-espresso-800/30 p-4 rounded-xl space-y-3 mt-4 border border-espresso-600/50">
                                                    <label className="text-sm text-amber-500 font-bold flex items-center justify-between">
                                                        <span>이미지 텍스트 오버레이 (다국어 광고 카피)</span>
                                                        <span className="text-xs text-espresso-300 font-normal">접속 국가에 맞춰 자동 변환</span>
                                                    </label>
                                                    {(() => {
                                                        let parsed = { ko: '', en: '' };
                                                        try {
                                                            if (formData.overlayText) {
                                                                const p = JSON.parse(formData.overlayText);
                                                                if (typeof p === 'object' && p !== null) {
                                                                    parsed.ko = p.ko || '';
                                                                    parsed.en = p.en || '';
                                                                } else {
                                                                    parsed.ko = formData.overlayText;
                                                                }
                                                            }
                                                        } catch (e) {
                                                            parsed.ko = formData.overlayText || '';
                                                        }

                                                        return (
                                                            <div className="flex flex-col gap-2">
                                                                <input 
                                                                    className="w-full bg-espresso-900 border border-espresso-600 focus:border-amber-500 outline-none p-3 rounded-xl" 
                                                                    placeholder="[한국어] 광고 카피 입력 (예: 봄맞이 커피 한잔!)" 
                                                                    value={parsed.ko} 
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        const newObj = { ...parsed, ko: val };
                                                                        // If both are empty, clear the string so it's null in DB
                                                                        const finalStr = (!newObj.ko && !newObj.en) ? '' : JSON.stringify(newObj);
                                                                        setFormData({...formData, overlayText: finalStr});
                                                                    }} 
                                                                />
                                                                <input 
                                                                    className="w-full bg-espresso-900 border border-espresso-600 focus:border-amber-500 outline-none p-3 rounded-xl" 
                                                                    placeholder="[영어] 광고 카피 입력 (예: Spring Coffee Time!)" 
                                                                    value={parsed.en} 
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        const newObj = { ...parsed, en: val };
                                                                        const finalStr = (!newObj.ko && !newObj.en) ? '' : JSON.stringify(newObj);
                                                                        setFormData({...formData, overlayText: finalStr});
                                                                    }} 
                                                                />
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <input type="number" className="bg-espresso-900 border border-espresso-600 p-3 rounded-xl text-sm" placeholder="크기(예: 24)" value={formData.overlayFontSize||''} onChange={e=>setFormData({...formData, overlayFontSize: e.target.value})} />
                                                        
                                                        <div className="flex bg-espresso-900 border border-espresso-600 rounded-xl overflow-hidden focus-within:border-amber-500 items-center">
                                                            <input type="color" className="w-10 h-full p-0.5 bg-transparent border-none cursor-pointer outline-none" value={formData.overlayColor||'#ffffff'} onChange={e=>setFormData({...formData, overlayColor: e.target.value})} />
                                                            <input type="text" className="flex-1 w-full bg-transparent border-none p-3 text-sm text-espresso-50 outline-none uppercase" placeholder="#FFFFFF" value={formData.overlayColor||'#ffffff'} onChange={e=>setFormData({...formData, overlayColor: e.target.value})} />
                                                        </div>

                                                        <select className="bg-espresso-900 border border-espresso-600 p-3 rounded-xl text-sm" value={formData.overlayPosition||'BOTTOM_LEFT'} onChange={e=>setFormData({...formData, overlayPosition: e.target.value})}>
                                                            <option value="TOP_LEFT">좌측상단</option>
                                                            <option value="TOP_CENTER">중앙상단</option>
                                                            <option value="TOP_RIGHT">우측상단</option>
                                                            <option value="CENTER_LEFT">좌측중앙</option>
                                                            <option value="CENTER">정중앙</option>
                                                            <option value="CENTER_RIGHT">우측중앙</option>
                                                            <option value="BOTTOM_LEFT">좌측하단</option>
                                                            <option value="BOTTOM_CENTER">중앙하단</option>
                                                            <option value="BOTTOM_RIGHT">우측하단</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <input className="w-full bg-espresso-900 border border-espresso-600 p-3 mt-4 rounded-xl" placeholder="클릭 랜딩 URL" value={formData.linkUrl||''} onChange={e=>setFormData({...formData, linkUrl: e.target.value})} />
                                </>
                            )}
                            
                            {/* Placements Form */}
                            {activeTab === 'placements' && (
                                <>
                                    <label className="text-sm text-espresso-300 font-bold mt-2">1. 노출 위치 (시스템 키워드)</label>
                                    <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" value={formData.locationKey||''} onChange={e=>{
                                            const val = e.target.value;
                                            let autoSize = 'SMALL,MEDIUM';
                                            if (val === 'STORE_TOP') autoSize = 'FULL';
                                            if (val === 'HOME_HERO') autoSize = 'LARGE,FULL';
                                            if (val === 'ETC_POPUP') autoSize = 'MEDIUM,LARGE';
                                            if (val === 'CURATOR_RESULT') autoSize = 'SMALL';
                                            if (val === 'CURATOR_LOADING') autoSize = 'MEDIUM,LARGE';
                                            if (val === 'FEED_SHORTS') autoSize = 'MEDIUM,LARGE,FULL';
                                            if (val === 'FEED_CLUB' || val === 'FEED_NEIGHBOR') autoSize = 'SMALL,MEDIUM';
                                            if (val === 'FEED_CLUB_PREMIUM' || val === 'FEED_NEIGHBOR_PREMIUM') autoSize = 'MEDIUM,LARGE';
                                            if (val === 'FEED_MAGAZINE') autoSize = 'MEDIUM,LARGE';

                                            setFormData({
                                                ...formData, 
                                                locationKey: val,
                                                // 선택 시 이름과 지원 사이즈 자동 동기화
                                                name: e.target.options[e.target.selectedIndex].text.split('(')[0].trim(),
                                                supportedSizes: autoSize
                                            });
                                        }}>
                                        <option value="">-- 앱 내 하드코딩된 노출 위치 지정 --</option>
                                        <optgroup label="커피톡 메인 피드">
                                            <option value="FEED_PREMIUM">커피톡 피드 상단 고정 (FEED_PREMIUM)</option>
                                            <option value="FEED_STANDARD">커피톡 피드 중간 일반 (FEED_STANDARD)</option>
                                        </optgroup>
                                        <optgroup label="소모임 / 크루">
                                            <option value="FEED_CLUB_PREMIUM">소모임 상단 고정 (FEED_CLUB_PREMIUM)</option>
                                            <option value="FEED_CLUB">소모임 중간 일반 (FEED_CLUB)</option>
                                        </optgroup>
                                        <optgroup label="이웃 소식 (근처 라이브)">
                                            <option value="FEED_NEIGHBOR_PREMIUM">이웃 소식 상단 고정 (FEED_NEIGHBOR_PREMIUM)</option>
                                            <option value="FEED_NEIGHBOR">이웃 소식 중간 일반 (FEED_NEIGHBOR)</option>
                                        </optgroup>
                                        <optgroup label="커피 숏폼 / 매거진">
                                            <option value="FEED_SHORTS">커피 숏폼/ASMR 탭 노출 (FEED_SHORTS)</option>
                                            <option value="FEED_MAGAZINE">AI 커피 매거진(프로필) 노출 (FEED_MAGAZINE)</option>
                                        </optgroup>
                                        <optgroup label="상점 / 홈 화면 / 팝업">
                                            <option value="STORE_TOP">상점 상세페이지 최상단 파노라마 (STORE_TOP)</option>
                                            <option value="HOME_HERO">홈 화면 메인 히어로 배너 (HOME_HERO)</option>
                                            <option value="ETC_POPUP">팝업형 긴급 공지 배너 (ETC_POPUP)</option>
                                        </optgroup>
                                        <optgroup label="AI 커피 처방전">
                                            <option value="CURATOR_LOADING">홈 AI 커피 처방전 로딩 (CURATOR_LOADING)</option>
                                            <option value="CURATOR_RESULT">홈 AI 커피 처방전 결과 (CURATOR_RESULT)</option>
                                        </optgroup>
                                    </select>
                                    
                                    <label className="text-sm text-espresso-300 font-bold mt-2">2. 영역 관리용 이름</label>
                                    <input className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" placeholder="관리용 노출 영역명 (자동 입력됨)" value={formData.name||''} onChange={e=>setFormData({...formData, name: e.target.value})} />
                                    
                                    <label className="text-sm text-espresso-300 font-bold mt-2">3. 지원하는 배너 크기 정책</label>
                                    <select className="w-full bg-espresso-900 border border-espresso-600 p-3 rounded-xl" value={formData.supportedSizes||'SMALL,MEDIUM'} onChange={e=>setFormData({...formData, supportedSizes: e.target.value})}>
                                        <option value="SMALL">SMALL (가장 얇은 띠 배너)</option>
                                        <option value="MEDIUM">MEDIUM (일반 피드 카드상자 크기)</option>
                                        <option value="LARGE">LARGE (세로로 긴 정사각형 비율)</option>
                                        <option value="FULL">FULL (화면을 가득 채우는 비율)</option>
                                        <option value="SMALL,MEDIUM">SMALL, MEDIUM 지원</option>
                                        <option value="MEDIUM,LARGE">MEDIUM, LARGE 지원</option>
                                        <option value="LARGE,FULL">LARGE, FULL 지원</option>
                                        <option value="ALL">모든 크기 지원 (ALL)</option>
                                    </select>
                                </>
                            )}
                        </div>
                        <div className="p-4 border-t border-espresso-700 shrink-0">
                            <button onClick={handleSave} className="w-full bg-amber-500 text-espresso-50 font-bold py-3 rounded-xl hover:bg-amber-400">
                                {editItem ? t('admin_ads.btn_save', '저장') : t('admin_ads.btn_create', '생성')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
