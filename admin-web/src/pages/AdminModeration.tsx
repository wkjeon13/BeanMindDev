import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldAlert, Ban, RefreshCw, EyeOff, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '@/utils/apiConfig';

export default function AdminModeration() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'SPAM' | 'BLIND' | 'REPORT'>('BLIND');
    
    const [spamLogs, setSpamLogs] = useState<any[]>([]);
    const [blindedPosts, setBlindedPosts] = useState<any[]>([]);
    const [blindedComments, setBlindedComments] = useState<any[]>([]);
    const [otherReports, setOtherReports] = useState<any[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);

    const fetchModerationData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch Stage 1, 2 & 3 concurrently
            const [spamRes, blindRes, reportRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/moderation/spam-logs`, { headers }),
                fetch(`${API_BASE}/api/admin/moderation/blinded-content`, { headers }),
                fetch(`${API_BASE}/api/admin/moderation/other-reports`, { headers })
            ]);

            if (spamRes.ok) {
                const spams = await spamRes.json();
                setSpamLogs(spams);
            }
            if (blindRes.ok) {
                const blinds = await blindRes.json();
                setBlindedPosts(blinds.posts || []);
                setBlindedComments(blinds.comments || []);
            }
            if (reportRes.ok) {
                const reports = await reportRes.json();
                setOtherReports(reports || []);
            }
        } catch (error) {
            console.error("Failed to load moderation data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchModerationData();
    }, []);

    const handleRestore = async (type: 'POST' | 'COMMENT', id: string) => {
        if (!window.confirm('정말 이 항목의 블라인드를 해제하시겠습니까? 관련 신고 내역도 초기화됩니다.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/moderation/blinded-content/${type}/${id}/restore`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert('해제되었습니다.');
                fetchModerationData(); // Refresh list
            } else {
                alert('해제 실패');
            }
        } catch (error) {
            console.error("Restore failed", error);
        }
    };

    const handleResolveReport = async (id: string) => {
        if (!window.confirm('이 신고 내역을 확인 및 처리 완료(기록 삭제) 하시겠습니까?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/moderation/reports/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchModerationData();
            } else {
                alert('처리 실패');
            }
        } catch (error) {
            console.error("Resolve report failed", error);
        }
    };

    const handleRejectReport = async (id: string, targetName: string) => {
        const reason = window.prompt("허위 신고 사유 입력 (신고자에게 안내됩니다):\n\n예: 정상적인 매장 활동으로 특이사항이 발견되지 않음");
        if (reason === null) return; // Cancelled
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/moderation/reports/${id}/reject`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason, targetName })
            });
            if (res.ok) {
                alert("신고자에게 허위 신고 알림 이메일이 발송되었으며 해당 로그는 삭제 불가 상태로 보존됩니다.");
                fetchModerationData();
            } else {
                alert('처리 실패');
            }
        } catch (error) {
            console.error("Reject report failed", error);
        }
    };

    const handleAcceptReport = async (id: string, targetType: string, targetName: string) => {
        let actionMsg = '';
        if (targetType === 'STORE') actionMsg = `'${targetName}' 매장을 강제 거절(블라인드) 처리하시겠습니까?`;
        else if (targetType === 'USER') actionMsg = `'${targetName}' 유저를 이용 정지(SUSPEND) 처리하시겠습니까?`;
        else if (targetType === 'REVIEW') actionMsg = `해당 리뷰를 영구 삭제하시겠습니까?`;
        else if (targetType === 'POST') actionMsg = `해당 커뮤니티 게시글을 강제 블라인드 처리하시겠습니까?`;
        else if (targetType === 'COMMENT') actionMsg = `해당 커뮤니티 댓글을 강제 블라인드 처리하시겠습니까?`;
        else actionMsg = `대상을 제재 처리하시겠습니까?`;

        if (!window.confirm(actionMsg + '\n(신고 내역은 승인 처리되어 자동 삭제됩니다.)')) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/moderation/reports/${id}/accept`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert("대상이 제재 처리되었습니다.");
                fetchModerationData();
            } else {
                alert('처리 실패');
            }
        } catch (error) {
            console.error("Accept report failed", error);
        }
    };

    return (
        <div className="flex flex-col min-h-[100dvh] bg-espresso-950 font-sans pb-20">
            {/* Header */}
            <div className="bg-espresso-900 border-b border-espresso-800 p-4 sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/profile')}
                        className="text-coffee-200 hover:text-amber-400 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-amber-50 truncate flex items-center gap-2">
                        <ShieldAlert size={20} className="text-amber-500"/>
                        신고 및 차단 내역 (Moderation)
                    </h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 max-w-7xl mx-auto w-full">
                
                {/* Tabs */}
                <div className="flex flex-col sm:flex-row bg-espresso-900 rounded-xl p-1 mb-6 border border-coffee-200 gap-1">
                    <button
                        onClick={() => setActiveTab('BLIND')}
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'BLIND' ? 'bg-amber-400 text-espresso-950' : 'text-coffee-300 hover:text-coffee-100'
                        }`}
                    >
                        <EyeOff size={16}/> 3단계: 커뮤니티 블라인드
                    </button>
                    <button
                        onClick={() => setActiveTab('REPORT')}
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'REPORT' ? 'bg-orange-500 text-white' : 'text-coffee-300 hover:text-coffee-100'
                        }`}
                    >
                        <ShieldAlert size={16}/> 2단계: 개별 접수된 신고
                    </button>
                    <button
                        onClick={() => setActiveTab('SPAM')}
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'SPAM' ? 'bg-red-500 text-white' : 'text-coffee-300 hover:text-coffee-100'
                        }`}
                    >
                        <Ban size={16}/> 1단계: 도배 차단 내역
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* TAB 1: BLINDED CONTENT */}
                        {activeTab === 'BLIND' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2">블라인드 된 게시글 ({blindedPosts.length})</h2>
                                {blindedPosts.length === 0 ? (
                                    <div className="text-center py-10 text-coffee-400">숨겨진 게시글이 없습니다.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {blindedPosts.map(post => (
                                            <div key={post.id} className="bg-espresso-900 p-4 rounded-xl border border-red-500/30">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded">POST</span>
                                                    <span className="text-xs text-coffee-400">{new Date(post.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div className="text-sm text-coffee-200 mb-3 break-words">
                                                    작성자: {post.author?.nickname || '알수없음'} ({post.author?.email})
                                                </div>
                                                <div className="p-3 bg-espresso-950 rounded-lg text-sm text-amber-50 mb-4 whitespace-pre-wrap">
                                                    {post.content || '(내용 없음 - 사진 게시물 등)'}
                                                </div>
                                                <div className="flex justify-end">
                                                    <button 
                                                        onClick={() => handleRestore('POST', post.id)}
                                                        className="px-4 py-2 bg-espresso-700 hover:bg-espresso-600 text-amber-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-1"
                                                    >
                                                        <RefreshCw size={14} /> 블라인드 해제 및 복구
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2 mt-8">블라인드 된 댓글 ({blindedComments.length})</h2>
                                {blindedComments.length === 0 ? (
                                    <div className="text-center py-10 text-coffee-400">숨겨진 댓글이 없습니다.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {blindedComments.map(comment => (
                                            <div key={comment.id} className="bg-espresso-900 p-4 rounded-xl border border-red-500/30">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold bg-orange-500/20 text-orange-400 px-2 py-1 rounded">COMMENT</span>
                                                    <span className="text-xs text-coffee-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div className="text-sm text-coffee-200 mb-3 break-words">
                                                    작성자: {comment.author?.nickname || '알수없음'} ({comment.author?.email})
                                                </div>
                                                <div className="p-3 bg-espresso-950 rounded-lg text-sm text-amber-50 mb-4 whitespace-pre-wrap">
                                                    {comment.content}
                                                </div>
                                                <div className="flex justify-end">
                                                    <button 
                                                        onClick={() => handleRestore('COMMENT', comment.id)}
                                                        className="px-4 py-2 bg-espresso-700 hover:bg-espresso-600 text-amber-100 rounded-lg text-sm font-bold transition-colors flex items-center gap-1"
                                                    >
                                                        <RefreshCw size={14} /> 블라인드 해제 및 복구
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB ADDITION FOR REPORT */}
                        {activeTab === 'REPORT' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2">매장/유저/리뷰 신고 내역 ({otherReports.length})</h2>
                                {otherReports.length === 0 ? (
                                    <div className="text-center py-10 text-coffee-400">접수된 개별 신고 내역이 없습니다.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {otherReports.map(report => (
                                            <div key={report.id} className={`bg-espresso-900 p-4 rounded-xl border ${report.status === 'REJECTED' ? 'border-red-900/50 opacity-80' : 'border-orange-500/30'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-xs font-bold bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                                                            {report.targetType}
                                                        </span>
                                                        {report.status === 'REJECTED' && (
                                                            <span className="text-xs font-bold bg-red-900/80 text-red-100 px-2 py-1 rounded border border-red-500">
                                                                반려됨(허위신고)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-coffee-400">{new Date(report.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div className="text-sm text-coffee-200 mb-1 break-words font-bold">
                                                    신고 대상: <span className="text-amber-100">{report.targetName}</span>
                                                </div>
                                                <div className="text-sm text-coffee-300 mb-3 break-words">
                                                    신고자: {report.reporterName}
                                                </div>
                                                <div className="p-3 bg-espresso-950 rounded-lg text-sm text-amber-50 mb-4 whitespace-pre-wrap flex-1">
                                                    {report.reason}
                                                </div>
                                                <div className="flex justify-end gap-2 flex-wrap">
                                                    <button 
                                                        onClick={() => handleAcceptReport(report.id, report.targetType, report.targetName)}
                                                        disabled={report.status === 'REJECTED'}
                                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${
                                                            report.status === 'REJECTED' ? 'bg-espresso-800 text-coffee-500 cursor-not-allowed hidden' : 'bg-red-600 hover:bg-red-500 text-white shadow-lg'
                                                        }`}
                                                    >
                                                        <ShieldAlert size={14} /> 신고 승인 및 대상 제재
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => handleRejectReport(report.id, report.targetName)}
                                                        disabled={report.status === 'REJECTED'}
                                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${
                                                            report.status === 'REJECTED' ? 'bg-espresso-800 text-coffee-500 cursor-not-allowed' : 'bg-red-900 border-red-500/50 border text-red-100 hover:bg-red-800'
                                                        }`}
                                                    >
                                                        <Ban size={14} /> 신고 반려 (허위신고 경고)
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => handleResolveReport(report.id)}
                                                        disabled={report.status === 'REJECTED'}
                                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 ${
                                                            report.status === 'REJECTED' ? 'bg-espresso-800 text-coffee-500 cursor-not-allowed hidden' : 'bg-espresso-700 hover:bg-espresso-600 text-orange-200 border-orange-500/30 border'
                                                        }`}
                                                    >
                                                        <RefreshCw size={14} /> 단순 처리 (기록 삭제)
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: SPAM LOGS */}
                        {activeTab === 'SPAM' && (
                            <div className="space-y-6">
                                <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl mb-4">
                                    <h3 className="text-red-400 font-bold mb-1">도배 방어벽(Rate Limit) 동작 내역</h3>
                                    <p className="text-xs text-coffee-300">
                                        단시간에 여러 번 작성 시도를 하여 서버 단에서 사전에 차단(저장 실패)된 내역입니다. 계속해서 도배를 시도하는 유저는 직접 제재(계정 일시정지 등)를 고려할 수 있습니다.
                                    </p>
                                </div>

                                {spamLogs.length === 0 ? (
                                    <div className="text-center py-10 text-coffee-400">최근 도배 차단 내역이 없습니다.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {spamLogs.map(log => (
                                            <div key={log.id} className="bg-espresso-900 p-4 rounded-xl border border-espresso-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 mx-0 rounded border border-amber-500/50">
                                                            {log.action}
                                                        </span>
                                                        <span className="text-xs text-red-400 font-bold ml-1">초과 차단됨</span>
                                                    </div>
                                                    <div className="text-sm font-bold text-amber-50">
                                                        {log.user?.nickname} <span className="text-xs text-coffee-400">({log.user?.email})</span>
                                                    </div>
                                                    <p className="text-xs text-coffee-300 line-clamp-2 mt-1 bg-espresso-950 p-2 rounded border border-espresso-800/50">
                                                        "{log.content}"
                                                    </p>
                                                </div>
                                                <div className="text-xs text-coffee-400 whitespace-nowrap text-right">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
