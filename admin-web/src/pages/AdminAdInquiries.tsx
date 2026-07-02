import React, { useState, useEffect } from 'react';
import { ArrowLeft, Inbox, Search, Mail, CheckCircle2, XCircle, Clock, FileText, Send, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/utils/apiConfig';
import { useTranslation } from 'react-i18next';

export default function AdminAdInquiries() {
  const { t } = useTranslation();
    const navigate = useNavigate();
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedInquiry, setSelectedInquiry] = useState<any | null>(null);
    const [adminMemo, setAdminMemo] = useState('');
    const [pendingStatus, setPendingStatus] = useState('');
    
    // Email Modal
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailForm, setEmailForm] = useState({ subject: '', message: '', newStatus: '' });
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/');
            try {
                const res = await fetch(`${API_BASE}/api/users/me`, { headers: { 'Authorization': `Bearer ${token}` } });
                const resJson = await res.json();
                const userData = resJson.data || resJson;
                if (userData.role !== 'ADMIN' && userData.role !== 'MODERATOR') navigate('/');
                else fetchInquiries();
            } catch { navigate('/'); }
        };
        checkAdmin();
    }, [navigate]);

    const fetchInquiries = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/ad-inquiries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setInquiries(await res.json());
            }
        } catch (error) {
            console.error("Failed to fetch inquiries:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/ad-inquiries/${id}/status`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (res.ok) {
                const updated = await res.json();
                setInquiries(prev => prev.map(inq => inq.id === id ? { ...updated, user: inq.user } : inq));
                if (selectedInquiry?.id === id) setSelectedInquiry({ ...updated, user: selectedInquiry.user });
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(t('admin_inquiries.alert_status_fail', '상태 변경 실패: {{error}}', { error: errData.error || res.statusText || '서버 오류' }));
            }
        } catch (error) {
            alert(t('admin_inquiries.alert_status_fail', '상태 변경 실패'));
        }
    };

    const handleSaveMemo = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/ad-inquiries/${id}/status`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ adminMemo })
            });
            
            if (res.ok) {
                const updated = await res.json();
                setInquiries(prev => prev.map(inq => inq.id === id ? { ...updated, user: inq.user } : inq));
                if (selectedInquiry?.id === id) setSelectedInquiry({ ...updated, user: selectedInquiry.user });
                alert(t('admin_inquiries.alert_memo_ok', '메모가 저장되었습니다.'));
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(t('admin_inquiries.alert_memo_fail', '메모 저장 실패: {{error}}', { error: errData.error || res.statusText || '서버 오류' }));
            }
        } catch (error) {
            alert(t('admin_inquiries.alert_memo_fail', '메모 저장 실패'));
        }
    };

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInquiry) return;
        
        setIsSendingEmail(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/ad-inquiries/${selectedInquiry.id}/email`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailForm)
            });
            
            if (res.ok) {
                const result = await res.json();
                if (result.success) {
                    alert(t('admin_inquiries.alert_mail_ok', '성공적으로 메일이 발송되었습니다.'));
                    setIsEmailModalOpen(false);
                    fetchInquiries(); // refresh list to get latest status if changed
                    if (result.inquiry) setSelectedInquiry({ ...result.inquiry, user: selectedInquiry.user });
                } else {
                    alert(t('admin_inquiries.alert_mail_fail', '메일 발송에 실패했습니다. (사유: {{error}})', {error: result.error || '알 수 없음'}));
                }
            } else {
                alert(t('admin_inquiries.alert_error_server', '서버 오류 발생'));
            }
        } catch (error) {
            alert(t('admin_inquiries.alert_network', '네트워크 오류'));
        } finally {
            setIsSendingEmail(false);
        }
    };

    const openEmailModal = (inquiry: any) => {
        setSelectedInquiry(inquiry);
        setEmailForm({
            subject: t('admin_inquiries.mail_subject', '[BeanMind] 광고 입점 문의 관련 안내입니다.'),
            message: t('admin_inquiries.mail_body', '안녕하세요, {{name}} 님.\nBeanMind 광고 입점 문의에 감사드립니다.\n\n', {name: inquiry.contactName}),
            newStatus: inquiry.status
        });
        setIsEmailModalOpen(true);
    };

    const selectInquiry = (inq: any) => {
        setSelectedInquiry(inq);
        setAdminMemo(inq.adminMemo || '');
        setPendingStatus(inq.status || 'PENDING');
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'PENDING': return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1"><Clock size={12}/>{t('admin_inquiries.status_pending', '접수됨')}</span>;
            case 'REVIEWING': return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"><FileText size={12}/>{t('admin_inquiries.status_reviewing', '검토중')}</span>;
            case 'MORE_INFO_NEEDED': return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1"><Mail size={12}/>{t('admin_inquiries.status_more_info', '추가요청됨')}</span>;
            case 'APPROVED': return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 size={12}/>{t('admin_inquiries.status_approved', '승인됨')}</span>;
            case 'REJECTED': return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1"><XCircle size={12}/>{t('admin_inquiries.status_rejected', '거절됨')}</span>;
            default: return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-espresso-800 text-espresso-200 border border-espresso-600">{status}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-espresso-950 text-espresso-50 font-sans selection:bg-amber-900 selection:text-amber-100 flex flex-col pb-safe">
            <header className="px-6 py-6 pt-safe border-b border-espresso-700/80 bg-espresso-950/50 backdrop-blur-md sticky top-0 z-50 flex items-center gap-4">
                <button onClick={() => selectedInquiry && window.innerWidth < 768 ? setSelectedInquiry(null) : navigate(-1)} className="w-10 h-10 rounded-full bg-espresso-900 flex items-center justify-center border border-espresso-700 text-espresso-200 hover:text-espresso-50 hover:bg-espresso-800 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                        <Inbox size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-espresso-50 tracking-tight leading-none">{t('admin_inquiries.title', '광고 신청 관리')}</h1>
                        <p className="text-xs text-espresso-300 mt-1">{t('admin_inquiries.subtitle', '접수된 네이티브 광고 문의 검토 및 답변')}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-7xl mx-auto w-full">
                {/* List View */}
                <div className={`w-full md:w-1/3 border-r border-espresso-700/50 flex flex-col bg-[#0e0e0e] ${selectedInquiry ? 'hidden md:flex' : 'flex'} h-[calc(100vh-84px)]`}>
                    <div className="p-4 border-b border-espresso-700/50 flex-shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso-300" size={16} />
                            <input 
                                type="text" 
                                placeholder={t('admin_inquiries.ph_search', '회사명, 담당자 필터링...')} 
                                className="w-full bg-espresso-900 border border-espresso-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-espresso-50 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {isLoading ? (
                            <div className="text-center py-10 text-espresso-300 font-medium">{t('admin_inquiries.loading', '불러오는 중...')}</div>
                        ) : inquiries.length === 0 ? (
                            <div className="text-center py-10 text-espresso-300 text-sm flex flex-col items-center gap-2">
                                <Inbox size={32} className="opacity-20" />
                                접수된 문의가 없습니다.
                            </div>
                        ) : (
                            inquiries.map(inq => (
                                <button 
                                    key={inq.id} 
                                    onClick={() => selectInquiry(inq)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedInquiry?.id === inq.id ? 'bg-espresso-900 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'bg-espresso-950 border-espresso-700/50 hover:border-espresso-600'}`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-espresso-50 truncate pr-2">{inq.advertiser}</h3>
                                        {getStatusBadge(inq.status)}
                                    </div>
                                    <p className="text-xs text-espresso-200 mb-1 flex items-center justify-between">
                                        <span>{inq.contactName}</span>
                                        <span className="text-[10px] text-espresso-300 font-mono">{new Date(inq.createdAt).toLocaleDateString()}</span>
                                    </p>
                                    <p className="text-xs text-espresso-300 truncate">{inq.contactEmail}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Detail View */}
                <div className={`flex-1 flex flex-col bg-espresso-950 overflow-y-auto custom-scrollbar ${!selectedInquiry ? 'hidden md:flex' : 'flex'} h-[calc(100vh-84px)]`}>
                    {!selectedInquiry ? (
                        <div className="h-full flex flex-col items-center justify-center text-espresso-300 p-8 text-center space-y-4">
                            <div className="w-20 h-20 rounded-full border border-dashed border-espresso-700 flex items-center justify-center bg-espresso-900/50">
                                <Inbox size={32} className="text-zinc-700" />
                            </div>
                            <p>{t('admin_inquiries.no_selection', '목록에서 문의 내역을 선택해주세요.')}</p>
                        </div>
                    ) : (
                        <div className="p-6 md:p-8 animate-in fade-in flex-1">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                                <div>
                                    <div className="mb-2">{getStatusBadge(selectedInquiry.status)}</div>
                                    <h2 className="text-2xl font-black text-espresso-50 tracking-tight">{selectedInquiry.advertiser}</h2>
                                    <p className="text-sm text-espresso-200 mt-1">{t('admin_inquiries.lbl_date', '접수 일시: {{date}}', {date: new Date(selectedInquiry.createdAt).toLocaleString()})}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={pendingStatus}
                                        onChange={(e) => setPendingStatus(e.target.value)}
                                        disabled={selectedInquiry.status === 'REJECTED' || selectedInquiry.status === 'APPROVED'}
                                        className="bg-espresso-900 border border-espresso-700 rounded-xl px-4 py-2.5 text-sm text-espresso-50 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="PENDING">{t('admin_inquiries.status_pending', '접수됨')}</option>
                                        <option value="REVIEWING">{t('admin_inquiries.status_reviewing', '검토중')}</option>
                                        <option value="MORE_INFO_NEEDED">{t('admin_inquiries.status_more_info', '추가요청됨')}</option>
                                        <option value="APPROVED">{t('admin_inquiries.status_approved', '승인됨')}</option>
                                        <option value="REJECTED">{t('admin_inquiries.status_rejected', '거절됨')}</option>
                                    </select>
                                    {pendingStatus !== selectedInquiry.status && (
                                        <button 
                                            onClick={() => handleStatusChange(selectedInquiry.id, pendingStatus)}
                                            className="bg-amber-500 hover:bg-amber-400 text-espresso-950 px-3 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 whitespace-nowrap"
                                        >
                                            저장
                                        </button>
                                    )}
                                    <button onClick={() => openEmailModal(selectedInquiry)} className="bg-emerald-500 hover:bg-emerald-400 text-espresso-50 px-4 py-2.5 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center gap-2 active:scale-95">
                                        <Mail size={16} /> 답장 보내기
                                    </button>
                                </div>
                            </div>

                            <div className="bg-espresso-900 rounded-2xl border border-espresso-700 overflow-hidden mb-6">
                                <div className="p-5 border-b border-espresso-700/80 bg-espresso-900/30">
                                    <h3 className="font-bold text-espresso-50 flex items-center gap-2">
                                        <FileText size={16} className="text-emerald-500" /> 연락처 및 상세 정보
                                    </h3>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-espresso-300 uppercase tracking-wider mb-1 block">{t('admin_inquiries.lbl_manager', '담당자 성함')}</label>
                                        <p className="text-sm text-espresso-50 font-medium">{selectedInquiry.contactName}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-espresso-300 uppercase tracking-wider mb-1 block">{t('admin_inquiries.lbl_phone', '연락처')}</label>
                                        <p className="text-sm text-espresso-50 font-mono">{selectedInquiry.contactPhone}</p>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] font-bold text-espresso-300 uppercase tracking-wider mb-1 block">{t('admin_inquiries.lbl_email', '이메일 계정')}</label>
                                        <p className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2">
                                            {selectedInquiry.contactEmail} 
                                            {selectedInquiry.user && <span className="bg-blue-500/10 text-[10px] px-2 py-0.5 rounded-md border border-blue-500/20 text-blue-400">{t('admin_inquiries.lbl_registered', '가입된 회원 ({{nickname}})', {nickname: selectedInquiry.user.nickname})}</span>}
                                        </p>
                                    </div>
                                    <div className="sm:col-span-2 mt-2 pt-6 border-t border-espresso-700/50">
                                        <label className="text-[10px] font-bold text-espresso-300 uppercase tracking-wider mb-3 block">{t('admin_inquiries.lbl_content', '광고 희망 내용')}</label>
                                        <div className="bg-espresso-950/50 p-4 rounded-xl border border-espresso-700/50">
                                            <p className="text-sm text-espresso-100 whitespace-pre-wrap leading-relaxed">
                                                {selectedInquiry.content}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-500/5 rounded-2xl border border-amber-500/10 overflow-hidden">
                                <div className="p-5 border-b border-amber-500/10 bg-amber-500/5 flex justify-between items-center">
                                    <h3 className="font-bold text-amber-500 flex items-center gap-2">
                                        <AlertCircle size={16} /> 관리자 전용 메모
                                    </h3>
                                    <button 
                                        onClick={() => handleSaveMemo(selectedInquiry.id)}
                                        className="text-xs bg-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-espresso-50 font-bold px-3 py-1.5 rounded-lg transition-colors border border-amber-500/30"
                                    >{t('admin_inquiries.btn_save_memo', '메모 저장')}</button>
                                </div>
                                <div className="p-5">
                                    <textarea 
                                        value={adminMemo}
                                        onChange={(e) => setAdminMemo(e.target.value)}
                                        placeholder={t('admin_inquiries.ph_memo', '이 광고주에 대한 내부 논의, 승인/거절 이유, 추가 협상 내용 등을 기록하세요. (광고주에게는 보이지 않습니다)')}
                                        className="w-full h-32 bg-espresso-950/40 border border-amber-500/20 rounded-xl p-4 text-sm text-espresso-100 focus:outline-none focus:border-amber-500 transition-colors resize-none placeholder:text-espresso-300"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Email Composer Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-espresso-950/80 backdrop-blur-sm">
                    <div className="bg-espresso-900 border border-espresso-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col">
                        <div className="flex justify-between items-center p-5 border-b border-espresso-700/80 bg-espresso-900/50">
                            <h3 className="text-lg font-black text-espresso-50 flex items-center gap-2">
                                <Send className="text-emerald-500" size={20} /> 광고 문의 이메일 발송
                            </h3>
                            <button onClick={() => setIsEmailModalOpen(false)} className="text-espresso-300 hover:text-espresso-50 transition-colors p-1 rounded-full hover:bg-espresso-800">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSendEmail} className="p-6 flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-espresso-300 uppercase">{t('admin_inquiries.modal_mail_to', '수신자')}</label>
                                <div className="bg-espresso-950 border border-espresso-700 rounded-xl px-4 py-3 text-sm text-espresso-100 flex items-center gap-2">
                                    <Mail size={16} className="text-espresso-300" />
                                    {selectedInquiry?.contactEmail} ({selectedInquiry?.contactName})
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-espresso-300 uppercase">{t('admin_inquiries.modal_mail_subject', '제목')}</label>
                                <input 
                                    type="text" 
                                    required
                                    value={emailForm.subject} 
                                    onChange={e => setEmailForm({...emailForm, subject: e.target.value})} 
                                    className="bg-espresso-950 border border-espresso-700 rounded-xl px-4 py-3 text-sm text-espresso-50 focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-espresso-300 uppercase flex justify-between items-center">
                                    <span>{t('admin_inquiries.modal_mail_content', '내용 (HTML 포맷 가능)')}</span>
                                </label>
                                <textarea 
                                    required
                                    value={emailForm.message} 
                                    onChange={e => setEmailForm({...emailForm, message: e.target.value})} 
                                    rows={8}
                                    className="bg-espresso-950 border border-espresso-700 rounded-xl px-4 py-3 text-sm text-espresso-50 focus:outline-none focus:border-emerald-500 transition-colors resize-none leading-relaxed font-mono"
                                />
                            </div>

                            <div className="flex flex-col gap-1 mb-2">
                                <label className="text-xs font-bold text-espresso-300 uppercase">{t('admin_inquiries.modal_curr_status', '현재 문의 상태')}</label>
                                <div className="mt-1">
                                    {selectedInquiry && getStatusBadge(selectedInquiry.status)}
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-espresso-700/80">
                                <button type="button" onClick={() => setIsEmailModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-espresso-200 hover:text-espresso-50 transition-colors">{t('admin_inquiries.btn_cancel', '취소')}</button>
                                <button disabled={isSendingEmail} type="submit" className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-espresso-50 px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2">
                                    {isSendingEmail ? <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin"></span> : <Send size={16} />} 
                                    시스템 메일 발송
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
