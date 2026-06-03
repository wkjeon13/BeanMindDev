import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, ChevronLeft, ChevronRight, RefreshCw, FileText, CheckCircle2, XCircle, Trash2, Eye, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '@/utils/apiConfig';

export default function AdminCompliance() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<'admin_actions' | 'ccpa_requests' | 'consents' | 'policies'>('admin_actions');
    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Admin Auth Check
    useEffect(() => {
        if (!token || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR')) {
            alert(t('admin_dashboard.error_login_req', '관리자 권한이 필요한 페이지입니다.'));
            navigate('/');
        }
    }, [token, currentUser, navigate, t]);

    // Tab 1: Admin Actions State
    const [actionLogs, setActionLogs] = useState<any[]>([]);
    const [adminEmailFilter, setAdminEmailFilter] = useState('');
    const [actionTypeFilter, setActionTypeFilter] = useState('');
    const [targetTypeFilter, setTargetTypeFilter] = useState('');
    const [actionsPage, setActionsPage] = useState(1);
    const [actionsTotalPages, setActionsTotalPages] = useState(1);
    const [isActionsLoading, setIsActionsLoading] = useState(false);

    // Tab 2: CCPA Requests State
    const [ccpaRequests, setCcpaRequests] = useState<any[]>([]);
    const [ccpaEmailFilter, setCcpaEmailFilter] = useState('');
    const [ccpaTypeFilter, setCcpaTypeFilter] = useState('');
    const [ccpaStatusFilter, setCcpaStatusFilter] = useState('');
    const [ccpaPage, setCcpaPage] = useState(1);
    const [ccpaTotalPages, setCcpaTotalPages] = useState(1);
    const [isCcpaLoading, setIsCcpaLoading] = useState(false);

    // Tab 3: Consent History State
    const [consentLogs, setConsentLogs] = useState<any[]>([]);
    const [consentEmailFilter, setConsentEmailFilter] = useState('');
    const [consentPolicyFilter, setConsentPolicyFilter] = useState('');
    const [consentPage, setConsentPage] = useState(1);
    const [consentTotalPages, setConsentTotalPages] = useState(1);
    const [isConsentLoading, setIsConsentLoading] = useState(false);

    // Tab 4: Legal Policy Management State
    const [policies, setPolicies] = useState<any[]>([]);
    const [isPoliciesLoading, setIsPoliciesLoading] = useState(false);
    
    // Create/Edit/View Policy Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);
    
    // Form for new policy
    const [newPolicyType, setNewPolicyType] = useState('TERMS_OF_SERVICE');
    const [newPolicyVersion, setNewPolicyVersion] = useState('');
    const [newPolicyTitle, setNewPolicyTitle] = useState('');
    const [newPolicyContent, setNewPolicyContent] = useState('');
    const [newPolicyIsActive, setNewPolicyIsActive] = useState(false);
    const [isSavingPolicy, setIsSavingPolicy] = useState(false);

    // CCPA Action Modal State
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [actionTakenText, setActionTakenText] = useState('');
    const [modalStatus, setModalStatus] = useState<'COMPLETED' | 'REJECTED'>('COMPLETED');
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    // Fetch Admin Actions
    const fetchAdminActions = async () => {
        setIsActionsLoading(true);
        try {
            let url = `${API_BASE}/api/admin/compliance/admin-actions?page=${actionsPage}&limit=15`;
            if (adminEmailFilter.trim()) url += `&adminEmail=${encodeURIComponent(adminEmailFilter.trim())}`;
            if (actionTypeFilter) url += `&actionType=${actionTypeFilter}`;
            if (targetTypeFilter) url += `&targetType=${targetTypeFilter}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setActionLogs(data.logs || []);
                setActionsTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error('Failed to fetch admin actions:', err);
        } finally {
            setIsActionsLoading(false);
        }
    };

    // Fetch CCPA Requests
    const fetchCcpaRequests = async () => {
        setIsCcpaLoading(true);
        try {
            let url = `${API_BASE}/api/admin/compliance/requests?page=${ccpaPage}&limit=15`;
            if (ccpaEmailFilter.trim()) url += `&requestEmail=${encodeURIComponent(ccpaEmailFilter.trim())}`;
            if (ccpaTypeFilter) url += `&requestType=${ccpaTypeFilter}`;
            if (ccpaStatusFilter) url += `&status=${ccpaStatusFilter}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCcpaRequests(data.requests || []);
                setCcpaTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error('Failed to fetch CCPA requests:', err);
        } finally {
            setIsCcpaLoading(false);
        }
    };

    // Fetch Consents
    const fetchConsents = async () => {
        setIsConsentLoading(true);
        try {
            let url = `${API_BASE}/api/admin/compliance/consents?page=${consentPage}&limit=15`;
            if (consentEmailFilter.trim()) url += `&email=${encodeURIComponent(consentEmailFilter.trim())}`;
            if (consentPolicyFilter) url += `&policyType=${consentPolicyFilter}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConsentLogs(data.consents || []);
                setConsentTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error('Failed to fetch consents:', err);
        } finally {
            setIsConsentLoading(false);
        }
    };

    // Fetch Legal Policies
    const fetchPolicies = async () => {
        setIsPoliciesLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/compliance/policies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPolicies(data || []);
            }
        } catch (err) {
            console.error('Failed to fetch legal policies:', err);
        } finally {
            setIsPoliciesLoading(false);
        }
    };

    const handleActivatePolicy = async (id: string) => {
        if (!confirm('해당 약관 버전을 현재 게시 버전으로 활성화하시겠습니까? 기존 활성 버전은 비활성화됩니다.')) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/compliance/policies/${id}/activate`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('해당 약관 버전이 성공적으로 활성화되었습니다.');
                fetchPolicies();
            } else {
                const data = await res.json();
                alert(data.error || '활성화 처리에 실패했습니다.');
            }
        } catch (err) {
            alert('오류가 발생했습니다.');
        }
    };

    const handleDeletePolicy = async (id: string) => {
        if (!confirm('해당 약관 버전을 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/compliance/policies/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('해당 약관 버전이 성공적으로 삭제되었습니다.');
                fetchPolicies();
            } else {
                const data = await res.json();
                alert(data.message || '삭제 처리에 실패했습니다.');
            }
        } catch (err) {
            alert('오류가 발생했습니다.');
        }
    };

    const handleSavePolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPolicyVersion.trim() || !newPolicyTitle.trim() || !newPolicyContent.trim()) {
            alert('모든 필수 항목을 입력해주세요.');
            return;
        }

        if (!/^v\d+\.\d+\.\d+$/.test(newPolicyVersion.trim())) {
            alert('버전은 v1.0.0 형식으로 입력해야 합니다. (예: v1.1.0)');
            return;
        }

        setIsSavingPolicy(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/compliance/policies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    policyType: newPolicyType,
                    version: newPolicyVersion.trim(),
                    title: newPolicyTitle.trim(),
                    content: newPolicyContent.trim(),
                    isActive: newPolicyIsActive
                })
            });

            if (res.ok) {
                alert('새로운 약관 버전이 성공적으로 등록되었습니다.');
                setIsCreateModalOpen(false);
                setNewPolicyVersion('');
                setNewPolicyTitle('');
                setNewPolicyContent('');
                setNewPolicyIsActive(false);
                fetchPolicies();
            } else {
                const data = await res.json();
                alert(data.message || '약관 저장에 실패했습니다.');
            }
        } catch (err) {
            alert('네트워크 오류가 발생했습니다.');
        } finally {
            setIsSavingPolicy(false);
        }
    };

    // Trigger searches based on active tab
    useEffect(() => {
        if (activeTab === 'admin_actions') fetchAdminActions();
        if (activeTab === 'ccpa_requests') fetchCcpaRequests();
        if (activeTab === 'consents') fetchConsents();
        if (activeTab === 'policies') fetchPolicies();
    }, [activeTab, actionsPage, ccpaPage, consentPage]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === 'admin_actions') {
            setActionsPage(1);
            fetchAdminActions();
        } else if (activeTab === 'ccpa_requests') {
            setCcpaPage(1);
            fetchCcpaRequests();
        } else if (activeTab === 'consents') {
            setConsentPage(1);
            fetchConsents();
        }
    };

    const handleOpenActionModal = (req: any, status: 'COMPLETED' | 'REJECTED') => {
        setSelectedRequest(req);
        setModalStatus(status);
        setActionTakenText(status === 'COMPLETED' ? '요청한 본인 정보 파기 및 제3자 제공 거부 조치 완료' : '본인 확인 실패 또는 요청 불일치로 인한 반려');
    };

    const handleSubmitAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;
        setIsSubmittingAction(true);

        try {
            const res = await fetch(`${API_BASE}/api/admin/compliance/requests/${selectedRequest.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: modalStatus,
                    actionTaken: actionTakenText
                })
            });

            if (res.ok) {
                alert('해당 요청에 대한 조치 결과가 안전하게 기록되었습니다.');
                setSelectedRequest(null);
                fetchCcpaRequests();
            } else {
                const data = await res.json();
                alert(data.error || '조치 저장을 실패했습니다.');
            }
        } catch (err) {
            alert('네트워크 오류가 발생했습니다.');
        } finally {
            setIsSubmittingAction(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-emerald-500" />
                        Compliance & Privacy Audit
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        한국(통비법, 개인정보보호법) 및 미국(CCPA/CPRA, FTC Act) 법률 준수를 위한 규제 감사 대시보드
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {activeTab === 'policies' && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-emerald-950/20"
                        >
                            <FileText className="w-4 h-4" />
                            새 약관 버전 등록
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (activeTab === 'admin_actions') fetchAdminActions();
                            if (activeTab === 'ccpa_requests') fetchCcpaRequests();
                            if (activeTab === 'consents') fetchConsents();
                            if (activeTab === 'policies') fetchPolicies();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 rounded-lg text-sm transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Compliance Law Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <Shield className="w-5 h-5" />
                        </span>
                        <h3 className="font-semibold text-white">개인정보보호법 (어드민 감사)</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        개인정보처리시스템 접속 기록 보존 의무에 따라 관리자 및 점주(Host)의 회원 조회, 수정, 삭제 이력을 실시간 감사 로그로 3년 이상 영구 보존합니다.
                    </p>
                </div>
                <div className="bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <ShieldAlert className="w-5 h-5" />
                        </span>
                        <h3 className="font-semibold text-white">소비자 권리 (CCPA / CPRA)</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        미국 캘리포니아 거주 사용자 등의 삭제 요청(Right to Delete) 및 정보 판매 거부(Opt-out) 권리 접수와 이에 대한 파기 조치 서명을 2년간 보관합니다.
                    </p>
                </div>
                <div className="bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <FileText className="w-5 h-5" />
                        </span>
                        <h3 className="font-semibold text-white">약관 동의 이력 (FTC 기준)</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        개인정보 처리방침 및 이용약관 버전에 대한 회원가입 시 동의 일시, IP 주소 및 상태를 로깅하여 비자발적 동의 관련 소송 증적을 보존합니다.
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 mb-6">
                <button
                    onClick={() => setActiveTab('admin_actions')}
                    className={`px-5 py-3 font-semibold text-sm transition border-b-2 -mb-[2px] ${
                        activeTab === 'admin_actions'
                            ? 'border-emerald-500 text-emerald-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    어드민 감사 로그 (Admin Actions)
                </button>
                <button
                    onClick={() => setActiveTab('ccpa_requests')}
                    className={`px-5 py-3 font-semibold text-sm transition border-b-2 -mb-[2px] ${
                        activeTab === 'ccpa_requests'
                            ? 'border-emerald-500 text-emerald-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    CCPA 개인정보 요청 처리 (Privacy Requests)
                </button>
                <button
                    onClick={() => setActiveTab('consents')}
                    className={`px-5 py-3 font-semibold text-sm transition border-b-2 -mb-[2px] ${
                        activeTab === 'consents'
                            ? 'border-emerald-500 text-emerald-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    약관 동의 감사 이력 (Consent History)
                </button>
                <button
                    onClick={() => setActiveTab('policies')}
                    className={`px-5 py-3 font-semibold text-sm transition border-b-2 -mb-[2px] ${
                        activeTab === 'policies'
                            ? 'border-emerald-500 text-emerald-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                >
                    약관 버전 관리 (Legal Policies)
                </button>
            </div>

            {/* Search Filters */}
            <form onSubmit={handleSearch} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    {activeTab === 'policies' && (
                        <div className="flex-1 py-1 text-sm text-slate-400 font-medium">
                            서비스의 이용약관 및 개인정보 처리방침의 개정 이력을 관리하고, 실시간 가입 동의 시 게시할 버전을 제어합니다.
                        </div>
                    )}

                    {activeTab === 'admin_actions' && (
                        <>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-400 mb-1">어드민 이메일</label>
                                <input
                                    type="text"
                                    placeholder="어드민 계정 검색..."
                                    value={adminEmailFilter}
                                    onChange={(e) => setAdminEmailFilter(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-semibold text-slate-400 mb-1">작업 유형</label>
                                <select
                                    value={actionTypeFilter}
                                    onChange={(e) => setActionTypeFilter(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">전체 유형</option>
                                    <option value="VIEW">VIEW (조회)</option>
                                    <option value="UPDATE">UPDATE (수정)</option>
                                    <option value="DELETE">DELETE (삭제)</option>
                                    <option value="DOWNLOAD">DOWNLOAD (다운로드)</option>
                                </select>
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-semibold text-slate-400 mb-1">대상 종류</label>
                                <select
                                    value={targetTypeFilter}
                                    onChange={(e) => setTargetTypeFilter(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">전체 대상</option>
                                    <option value="USER">USER (사용자)</option>
                                    <option value="STORE">STORE (매장)</option>
                                    <option value="PAYMENT">PAYMENT (결제)</option>
                                    <option value="ACCESS_LOG">ACCESS_LOG (접속기록)</option>
                                </select>
                            </div>
                        </>
                    )}

                    {activeTab === 'ccpa_requests' && (
                        <>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-400 mb-1">신청인 이메일</label>
                                <input
                                    type="text"
                                    placeholder="이메일 검색..."
                                    value={ccpaEmailFilter}
                                    onChange={(e) => setCcpaEmailFilter(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-semibold text-slate-400 mb-1">요청 종류</label>
                                <select
                                    value={ccpaTypeFilter}
                                    onChange={(e) => setCcpaTypeFilter(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">전체 종류</option>
                                    <option value="ACCESS">ACCESS (열람)</option>
                                    <option value="DELETE">DELETE (삭제)</option>
                                    <option value="OPT_OUT">OPT_OUT (제공거부)</option>
                                </select>
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-semibold text-slate-400 mb-1">처리 상태</label>
                                <select
                                    value={ccpaStatusFilter}
                                    onChange={(e) => setCcpaStatusFilter(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">전체 상태</option>
                                    <option value="PENDING">PENDING (대기중)</option>
                                    <option value="COMPLETED">COMPLETED (완료)</option>
                                    <option value="REJECTED">REJECTED (반려됨)</option>
                                </select>
                            </div>
                        </>
                    )}

                    {activeTab === 'consents' && (
                        <>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-400 mb-1">가입자 이메일</label>
                                <input
                                    type="text"
                                    placeholder="회원 이메일 검색..."
                                    value={consentEmailFilter}
                                    onChange={(e) => setConsentEmailFilter(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-semibold text-slate-400 mb-1">동의 약관 종류</label>
                                <select
                                    value={consentPolicyFilter}
                                    onChange={(e) => setConsentPolicyFilter(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">전체 약관</option>
                                    <option value="PRIVACY_POLICY">PRIVACY_POLICY (개인정보처리방침)</option>
                                    <option value="TERMS_OF_SERVICE">TERMS_OF_SERVICE (이용약관)</option>
                                </select>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition"
                    >
                        <Search className="w-4 h-4" />
                        조회
                    </button>
                </div>
            </form>

            {/* Audit Log Content Grid */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl overflow-hidden">
                {activeTab === 'admin_actions' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-300 font-semibold">
                                    <th className="p-4">수행 시간</th>
                                    <th className="p-4">취급자 (Role)</th>
                                    <th className="p-4">수행 액션</th>
                                    <th className="p-4">조작 대상 리소스</th>
                                    <th className="p-4">상세 행위 증적</th>
                                    <th className="p-4">IP 주소</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isActionsLoading ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-400">활동 로그 로딩 중...</td>
                                    </tr>
                                ) : actionLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">감사 대상 로그가 존재하지 않습니다.</td>
                                    </tr>
                                ) : (
                                    actionLogs.map((log) => (
                                        <tr key={log.id} className="border-b border-slate-800/60 hover:bg-slate-900/20 text-slate-300">
                                            <td className="p-4 text-xs font-mono">{new Date(log.createdAt).toLocaleString()}</td>
                                            <td className="p-4">
                                                <div className="font-semibold text-white">{log.adminEmail}</div>
                                                <div className="text-xs text-slate-500">{log.adminRole}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    log.actionType === 'DELETE' ? 'bg-red-500/10 text-red-400' :
                                                    log.actionType === 'UPDATE' ? 'bg-amber-500/10 text-amber-400' :
                                                    log.actionType === 'DOWNLOAD' ? 'bg-purple-500/10 text-purple-400' :
                                                    'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                    {log.actionType}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-semibold text-slate-400">
                                                {log.targetType} {log.targetId && `(${log.targetId.substring(0, 8)}...)`}
                                            </td>
                                            <td className="p-4 text-slate-200">{log.details}</td>
                                            <td className="p-4 text-xs font-mono text-slate-400">{log.ipAddress}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'ccpa_requests' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-300 font-semibold">
                                    <th className="p-4">접수 시간</th>
                                    <th className="p-4">요청 이메일</th>
                                    <th className="p-4">권리 종류</th>
                                    <th className="p-4">처리 상태</th>
                                    <th className="p-4">조치 증적 내역</th>
                                    <th className="p-4">처리 관리자</th>
                                    <th className="p-4">관리 작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isCcpaLoading ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-400">CCPA 요청 목록 로딩 중...</td>
                                    </tr>
                                ) : ccpaRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-500">접수된 권리 행사 건이 존재하지 않습니다.</td>
                                    </tr>
                                ) : (
                                    ccpaRequests.map((req) => (
                                        <tr key={req.id} className="border-b border-slate-800/60 hover:bg-slate-900/20 text-slate-300">
                                            <td className="p-4 text-xs font-mono">{new Date(req.createdAt).toLocaleString()}</td>
                                            <td className="p-4 text-white font-semibold">{req.requestEmail}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    req.requestType === 'DELETE' ? 'bg-red-500/10 text-red-400' :
                                                    req.requestType === 'ACCESS' ? 'bg-blue-500/10 text-blue-400' :
                                                    'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                    {req.requestType}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded text-xs font-bold ${
                                                    req.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    req.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-yellow-500/10 text-yellow-400'
                                                }`}>
                                                    {req.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    {req.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400 text-xs max-w-[200px] truncate" title={req.actionTaken}>
                                                {req.actionTaken || '-'}
                                            </td>
                                            <td className="p-4 text-xs font-mono text-slate-400">{req.processedBy ? `${req.processedBy.substring(0, 8)}...` : '-'}</td>
                                            <td className="p-4">
                                                {req.status === 'PENDING' ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleOpenActionModal(req, 'COMPLETED')}
                                                            className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-600/40 text-emerald-400 rounded text-xs transition"
                                                        >
                                                            승인/완료
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenActionModal(req, 'REJECTED')}
                                                            className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/35 border border-red-600/40 text-red-400 rounded text-xs transition"
                                                        >
                                                            반려
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500 font-medium">조치 종결됨</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'consents' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-300 font-semibold">
                                    <th className="p-4">동의 수집 시간</th>
                                    <th className="p-4">가입 이메일</th>
                                    <th className="p-4">약관 동의 대상</th>
                                    <th className="p-4">버전 정보</th>
                                    <th className="p-4">동의 여부</th>
                                    <th className="p-4">수집 당시 IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isConsentLoading ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-400">동의 이력 로딩 중...</td>
                                    </tr>
                                ) : consentLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">수집된 동의 이력이 존재하지 않습니다.</td>
                                    </tr>
                                ) : (
                                    consentLogs.map((log) => (
                                        <tr key={log.id} className="border-b border-slate-800/60 hover:bg-slate-900/20 text-slate-300">
                                            <td className="p-4 text-xs font-mono">{new Date(log.agreedAt).toLocaleString()}</td>
                                            <td className="p-4">
                                                <div className="font-semibold text-white">{log.email}</div>
                                                <div className="text-xs text-slate-500">회원명: {log.user?.nickname || '-'}</div>
                                            </td>
                                            <td className="p-4 text-xs font-semibold text-slate-400">{log.policyType}</td>
                                            <td className="p-4 font-semibold text-emerald-400">{log.version}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400`}>
                                                    AGREED
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-mono text-slate-400">{log.ipAddress}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'policies' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-300 font-semibold">
                                    <th className="p-4">구분</th>
                                    <th className="p-4">버전</th>
                                    <th className="p-4">약관 제목</th>
                                    <th className="p-4">상태</th>
                                    <th className="p-4">마지막 수정일</th>
                                    <th className="p-4">관리 작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isPoliciesLoading ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-400">약관 목록 로딩 중...</td>
                                    </tr>
                                ) : policies.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">등록된 약관 이력이 없습니다.</td>
                                    </tr>
                                ) : (
                                    policies.map((policy) => (
                                        <tr key={policy.id} className="border-b border-slate-800/60 hover:bg-slate-900/20 text-slate-300">
                                            <td className="p-4 font-semibold text-slate-300">
                                                {policy.policyType === 'TERMS_OF_SERVICE' ? '이용약관' : '개인정보 처리방침'}
                                            </td>
                                            <td className="p-4 font-mono font-bold text-amber-500">{policy.version}</td>
                                            <td className="p-4 text-white font-medium">{policy.title}</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    policy.isActive 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                                        : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                                                }`}>
                                                    {policy.isActive ? '게시 중 (Active)' : '비활성'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-mono text-slate-400">
                                                {new Date(policy.updatedAt).toLocaleString()}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setSelectedPolicy(policy); setIsViewModalOpen(true); }}
                                                        className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded transition border border-slate-700"
                                                        title="약관 전문 보기"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {!policy.isActive && (
                                                        <>
                                                            <button
                                                                onClick={() => handleActivatePolicy(policy.id)}
                                                                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-600/40 text-emerald-400 rounded text-xs transition"
                                                            >
                                                                활성화
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePolicy(policy.id)}
                                                                className="p-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 rounded transition"
                                                                title="버전 삭제"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {activeTab !== 'policies' && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/20">
                        <div className="text-xs text-slate-400 font-medium">
                            Page {activeTab === 'admin_actions' ? actionsPage : activeTab === 'ccpa_requests' ? ccpaPage : consentPage} of{' '}
                            {activeTab === 'admin_actions' ? actionsTotalPages : activeTab === 'ccpa_requests' ? ccpaTotalPages : consentTotalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                disabled={
                                    activeTab === 'admin_actions' ? actionsPage <= 1 :
                                    activeTab === 'ccpa_requests' ? ccpaPage <= 1 :
                                    consentPage <= 1
                                }
                                onClick={() => {
                                    if (activeTab === 'admin_actions') setActionsPage(p => p - 1);
                                    if (activeTab === 'ccpa_requests') setCcpaPage(p => p - 1);
                                    if (activeTab === 'consents') setConsentPage(p => p - 1);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 disabled:opacity-30 disabled:hover:bg-slate-800 border border-slate-700 rounded transition"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={
                                    activeTab === 'admin_actions' ? actionsPage >= actionsTotalPages :
                                    activeTab === 'ccpa_requests' ? ccpaPage >= ccpaTotalPages :
                                    consentPage >= consentTotalPages
                                }
                                onClick={() => {
                                    if (activeTab === 'admin_actions') setActionsPage(p => p + 1);
                                    if (activeTab === 'ccpa_requests') setCcpaPage(p => p + 1);
                                    if (activeTab === 'consents') setConsentPage(p => p + 1);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 disabled:opacity-30 disabled:hover:bg-slate-800 border border-slate-700 rounded transition"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* CCPA Privacy Action Signature Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl p-6 overflow-hidden">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
                            <Shield className={`w-6 h-6 ${modalStatus === 'COMPLETED' ? 'text-emerald-500' : 'text-red-500'}`} />
                            <h3 className="text-lg font-bold text-white">
                                CCPA 권리 요청 조치 서명 ({modalStatus})
                            </h3>
                        </div>

                        <form onSubmit={handleSubmitAction}>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <span className="text-slate-400 font-medium">요청 대상인: </span>
                                    <span className="text-white font-semibold">{selectedRequest.requestEmail}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium">행사한 소비자 권리: </span>
                                    <span className="text-emerald-400 font-bold">{selectedRequest.requestType}</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                        구체적으로 취한 파기 / 공유 제한 등 조치 내용 (감사 증적으로 저장됩니다)
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={actionTakenText}
                                        onChange={(e) => setActionTakenText(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-emerald-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRequest(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold rounded-lg transition"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingAction}
                                    className={`px-5 py-2 text-white text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${
                                        modalStatus === 'COMPLETED'
                                            ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                                            : 'bg-red-600 hover:bg-red-500 active:bg-red-700'
                                    }`}
                                >
                                    {isSubmittingAction ? '처리 중...' : '서명 및 완료'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 새 약관 등록 모달 */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-emerald-500" />
                                새 약관 개정 버전 등록
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSavePolicy} className="space-y-4 flex-1 flex flex-col overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">약관 구분</label>
                                    <select
                                        value={newPolicyType}
                                        onChange={(e) => setNewPolicyType(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="TERMS_OF_SERVICE">이용약관 (Terms of Service)</option>
                                        <option value="PRIVACY_POLICY">개인정보 처리방침 (Privacy Policy)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">버전 명 (vX.Y.Z)</label>
                                    <input
                                        type="text"
                                        placeholder="v1.1.0"
                                        value={newPolicyVersion}
                                        onChange={(e) => setNewPolicyVersion(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">약관 제목</label>
                                <input
                                    type="text"
                                    placeholder="BeanMind Curator 서비스 이용약관 개정안"
                                    value={newPolicyTitle}
                                    onChange={(e) => setNewPolicyTitle(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>

                            <div className="flex-1 flex flex-col min-h-[250px] overflow-hidden">
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">약관 전문 내용</label>
                                <textarea
                                    value={newPolicyContent}
                                    onChange={(e) => setNewPolicyContent(e.target.value)}
                                    className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-800 focus:outline-none focus:border-emerald-500 resize-none overflow-y-auto"
                                    placeholder="법적 약관 전문을 여기에 입력해 주세요..."
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="policy-active-chk"
                                    checked={newPolicyIsActive}
                                    onChange={(e) => setNewPolicyIsActive(e.target.checked)}
                                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                                />
                                <label htmlFor="policy-active-chk" className="text-xs text-slate-300 cursor-pointer font-semibold select-none">
                                    등록 즉시 현재 활성 버전으로 게시 (주의: 기존 활성 버전은 비활성화됩니다)
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-850 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold rounded-lg transition"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPolicy}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition"
                                >
                                    {isSavingPolicy ? '저장 중...' : '약관 등록'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 약관 상세 보기 모달 */}
            {isViewModalOpen && selectedPolicy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">
                                    {selectedPolicy.title}
                                </h3>
                                <div className="flex gap-2 mt-1 items-center">
                                    <span className="text-xs text-slate-400">구분: {selectedPolicy.policyType === 'TERMS_OF_SERVICE' ? '이용약관' : '개인정보 처리방침'}</span>
                                    <span className="text-xs text-slate-500">|</span>
                                    <span className="text-xs font-mono text-amber-500 font-bold">버전: {selectedPolicy.version}</span>
                                    {selectedPolicy.isActive && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded">현재 활성 게시중</span>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => { setSelectedPolicy(null); setIsViewModalOpen(false); }} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 border border-slate-850 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {selectedPolicy.content}
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-850 pt-4 mt-4">
                            {!selectedPolicy.isActive && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleActivatePolicy(selectedPolicy.id);
                                        setSelectedPolicy(null);
                                        setIsViewModalOpen(false);
                                    }}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition"
                                >
                                    이 버전으로 활성화
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => { setSelectedPolicy(null); setIsViewModalOpen(false); }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold rounded-lg transition"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
