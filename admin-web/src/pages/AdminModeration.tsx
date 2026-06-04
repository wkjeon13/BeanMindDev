import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldAlert, Ban, RefreshCw, EyeOff, Search, HelpCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '@/utils/apiConfig';

const cleanContent = (content: string) => {
    if (!content) return '';
    return content
        .replace(/<!--BM_BGM:[\s\S]*?-->/g, '')
        .replace(/&lt;!--BM_BGM:[\s\S]*?--&gt;/g, '')
        .trim();
};

const extractBgm = (content: string) => {
    if (!content) return null;
    
    // Try to match normal HTML comment
    const matchNormal = content.match(/<!--BM_BGM:([\s\S]*?)-->/);
    if (matchNormal && matchNormal[1]) {
        try {
            return JSON.parse(matchNormal[1]);
        } catch (e) {
            // ignore
        }
    }
    
    // Try to match HTML entity comment
    const matchEntity = content.match(/&lt;!--BM_BGM:([\s\S]*?)--&gt;/);
    if (matchEntity && matchEntity[1]) {
        try {
            const decodedJsonStr = matchEntity[1]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'");
            return JSON.parse(decodedJsonStr);
        } catch (e) {
            // ignore
        }
    }
    
    return null;
};

export default function AdminModeration() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'SPAM' | 'BLIND' | 'REPORT' | 'DELETED'>('BLIND');
    const [showHelp, setShowHelp] = useState(false);
    
    const [spamLogs, setSpamLogs] = useState<any[]>([]);
    const [blindedPosts, setBlindedPosts] = useState<any[]>([]);
    const [blindedComments, setBlindedComments] = useState<any[]>([]);
    const [otherReports, setOtherReports] = useState<any[]>([]);
    const [deletedPosts, setDeletedPosts] = useState<any[]>([]);
    const [deletedComments, setDeletedComments] = useState<any[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);

    const fetchModerationData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch Stage 1, 2, 3 & 4 concurrently
            const [spamRes, blindRes, reportRes, deletedRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/moderation/spam-logs`, { headers }),
                fetch(`${API_BASE}/api/admin/moderation/blinded-content`, { headers }),
                fetch(`${API_BASE}/api/admin/moderation/other-reports`, { headers }),
                fetch(`${API_BASE}/api/admin/moderation/deleted-content`, { headers })
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
            if (deletedRes.ok) {
                const deleted = await deletedRes.json();
                setDeletedPosts(deleted.posts || []);
                setDeletedComments(deleted.comments || []);
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

    const handleRestoreDeleted = async (type: 'POST' | 'COMMENT', id: string) => {
        if (!window.confirm('정말 이 항목을 복구하시겠습니까? 일반 사용자 화면에 다시 노출됩니다.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/admin/content/restore`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type, id })
            });

            if (res.ok) {
                alert('복구되었습니다.');
                fetchModerationData(); // Refresh list
            } else {
                alert('복구 실패');
            }
        } catch (error) {
            console.error("Restore deleted content failed", error);
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
                <div className="flex items-center justify-between gap-3">
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
                    
                    <button
                        onClick={() => setShowHelp(true)}
                        className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 text-[11px] sm:text-xs font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-lg shadow-sm animate-in fade-in duration-300"
                    >
                        <HelpCircle size={16} />
                        <span>도움말 (Help)</span>
                    </button>
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
                    <button
                        onClick={() => setActiveTab('DELETED')}
                        className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'DELETED' ? 'bg-emerald-600 text-white' : 'text-coffee-300 hover:text-coffee-100'
                        }`}
                    >
                        <RefreshCw size={16}/> 4단계: 강제 삭제 및 복구
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
                                                    {cleanContent(post.content) || '(내용 없음 - 사진 게시물 등)'}
                                                    {extractBgm(post.content) && (
                                                        <div className="mt-2 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg w-fit flex items-center gap-1.5 font-semibold">
                                                            🎵 BGM: {extractBgm(post.content).title}
                                                        </div>
                                                    )}
                                                    {post.attachedCourse && (
                                                        <div className="mt-2 text-xs text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg w-fit flex items-center gap-1.5 font-semibold">
                                                            🗺️ 성지코스: {post.attachedCourse.name} {post.attachedCourse._count?.items ? `(성지 ${post.attachedCourse._count.items}개)` : ''}
                                                        </div>
                                                    )}
                                                    {post.poll && (
                                                        <div className="mt-3 p-3 bg-espresso-900/80 rounded-xl border border-indigo-500/20 text-xs text-left">
                                                            <div className="font-bold text-indigo-400 mb-2 flex items-center gap-1.5">
                                                                📊 투표: {post.poll.question}
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                {post.poll.options?.map((opt: any) => {
                                                                    const votesCount = opt._count?.votes || 0;
                                                                    return (
                                                                        <div key={opt.id} className="flex justify-between items-center text-coffee-200 bg-espresso-950/50 p-2 rounded border border-espresso-800">
                                                                            <span>{opt.text}</span>
                                                                            <span className="font-bold text-indigo-300">{votesCount}표</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
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

                        {/* TAB 4: DELETED CONTENT */}
                        {activeTab === 'DELETED' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2">강제 삭제된 게시글 ({deletedPosts.length})</h2>
                                {deletedPosts.length === 0 ? (
                                    <div className="text-center py-10 text-coffee-400">강제 삭제된 게시글이 없습니다.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {deletedPosts.map(post => (
                                            <div key={post.id} className="bg-espresso-900 p-4 rounded-xl border border-red-500/30">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded">POST</span>
                                                    <span className="text-xs text-coffee-400">삭제일: {post.deletedAt ? new Date(post.deletedAt).toLocaleString() : '-'}</span>
                                                </div>
                                                <div className="text-sm text-coffee-200 mb-1 break-words">
                                                    작성자: {post.author?.nickname || '알수없음'} ({post.author?.email})
                                                </div>
                                                <div className="text-xs text-red-400 mb-3 font-semibold">
                                                    삭제 관리자: {post.deletedBy || '시스템'} | 사유: {post.deleteReason || '없음'}
                                                </div>
                                                <div className="p-3 bg-espresso-950 rounded-lg text-sm text-amber-50 mb-4 whitespace-pre-wrap">
                                                    {cleanContent(post.content) || '(내용 없음 - 사진 게시물 등)'}
                                                    {extractBgm(post.content) && (
                                                        <div className="mt-2 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg w-fit flex items-center gap-1.5 font-semibold">
                                                            🎵 BGM: {extractBgm(post.content).title}
                                                        </div>
                                                    )}
                                                    {post.attachedCourse && (
                                                        <div className="mt-2 text-xs text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg w-fit flex items-center gap-1.5 font-semibold">
                                                            🗺️ 성지코스: {post.attachedCourse.name} {post.attachedCourse._count?.items ? `(성지 ${post.attachedCourse._count.items}개)` : ''}
                                                        </div>
                                                    )}
                                                    {post.poll && (
                                                        <div className="mt-3 p-3 bg-espresso-900/80 rounded-xl border border-indigo-500/20 text-xs text-left">
                                                            <div className="font-bold text-indigo-400 mb-2 flex items-center gap-1.5">
                                                                📊 투표: {post.poll.question}
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                {post.poll.options?.map((opt: any) => {
                                                                    const votesCount = opt._count?.votes || 0;
                                                                    return (
                                                                        <div key={opt.id} className="flex justify-between items-center text-coffee-200 bg-espresso-950/50 p-2 rounded border border-espresso-800">
                                                                            <span>{opt.text}</span>
                                                                            <span className="font-bold text-indigo-300">{votesCount}표</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-end">
                                                    <button 
                                                        onClick={() => handleRestoreDeleted('POST', post.id)}
                                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-1 shadow-md shadow-emerald-950/20"
                                                    >
                                                        <RefreshCw size={14} /> 콘텐츠 복구 (Restore)
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2 mt-8">강제 삭제된 댓글 ({deletedComments.length})</h2>
                                {deletedComments.length === 0 ? (
                                    <div className="text-center py-10 text-coffee-400">강제 삭제된 댓글이 없습니다.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {deletedComments.map(comment => (
                                            <div key={comment.id} className="bg-espresso-900 p-4 rounded-xl border border-red-500/30">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold bg-orange-500/20 text-orange-400 px-2 py-1 rounded">COMMENT</span>
                                                    <span className="text-xs text-coffee-400">삭제일: {comment.deletedAt ? new Date(comment.deletedAt).toLocaleString() : '-'}</span>
                                                </div>
                                                <div className="text-sm text-coffee-200 mb-1 break-words">
                                                    작성자: {comment.author?.nickname || '알수없음'} ({comment.author?.email})
                                                </div>
                                                <div className="text-sm text-coffee-400 mb-1 break-words">
                                                    원문 게시글 일부: {comment.post?.content ? (comment.post.content.length > 50 ? comment.post.content.substring(0, 50) + '...' : comment.post.content) : '없음'}
                                                </div>
                                                <div className="text-xs text-red-400 mb-3 font-semibold">
                                                    삭제 관리자: {comment.deletedBy || '시스템'} | 사유: {comment.deleteReason || '없음'}
                                                </div>
                                                <div className="p-3 bg-espresso-950 rounded-lg text-sm text-amber-50 mb-4 whitespace-pre-wrap">
                                                    {cleanContent(comment.content)}
                                                </div>
                                                <div className="flex justify-end">
                                                    <button 
                                                        onClick={() => handleRestoreDeleted('COMMENT', comment.id)}
                                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-1 shadow-md shadow-emerald-950/20"
                                                    >
                                                        <RefreshCw size={14} /> 콘텐츠 복구 (Restore)
                                                    </button>
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

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-espresso-900 border border-espresso-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto flex flex-col gap-5 text-left">
                        <button 
                            onClick={() => setShowHelp(false)}
                            className="absolute top-4 right-4 text-coffee-300 hover:text-amber-400 transition-colors p-1 rounded-lg"
                        >
                            <X size={20} />
                        </button>
                        
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-amber-100 flex items-center gap-2 border-b border-espresso-800 pb-3">
                                <HelpCircle className="text-amber-500" size={20} />
                                신고 및 차단 시스템 운영 가이드
                            </h3>
                            <p className="text-[11px] text-coffee-300 mt-2">
                                BeanMind 커뮤니티는 스팸 도배, 불건전 활동, 유해 게시글을 차단하기 위해 유기적인 3단계 방어벽 메커니즘을 구동하고 있습니다.
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            {/* 1단계 */}
                            <div className="p-4 bg-espresso-950/60 rounded-xl border border-red-500/20">
                                <h4 className="text-xs sm:text-sm font-bold text-red-400 flex items-center gap-2 mb-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                    1단계: 도배 차단 내역 (Rate Limit)
                                </h4>
                                <p className="text-[11px] text-coffee-200 leading-relaxed">
                                    단시간 내에 유저가 고의적으로 다량의 글을 등록하는 것을 **실시간 메모리 계측**을 통해 차단합니다. 1분당 최대 작성 기준치(기본 5회)를 초과할 시 작성을 원천 차단하고, 관리자 페이지에 즉각 탐지 로그를 생성합니다.
                                </p>
                            </div>
                            
                            {/* 2단계 */}
                            <div className="p-4 bg-espresso-950/60 rounded-xl border border-orange-500/20">
                                <h4 className="text-xs sm:text-sm font-bold text-orange-400 flex items-center gap-2 mb-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                    2단계: 개별 접수된 신고 (Moderation Reports)
                                </h4>
                                <p className="text-[11px] text-coffee-200 leading-relaxed">
                                    일반 유저들이 매장, 유저, 리뷰, 커뮤니티 게시글 및 댓글의 위험성(허위, 욕설, 유해 등)을 보고하여 **관리자가 검토하도록 접수한 원본 내역**입니다. 
                                    관리자는 직접 **"신고 승인 및 제재"**를 눌러 즉시 차단(블라인드 및 계정 정지)하거나 **"신고 반려(허위 신고 발송)"**, **"기록 삭제"** 처리를 내릴 수 있습니다.
                                </p>
                            </div>
                            
                            {/* 3단계 */}
                            <div className="p-4 bg-espresso-950/60 rounded-xl border border-amber-400/20">
                                <h4 className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-2 mb-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                    3단계: 커뮤니티 블라인드 (Auto-Blinded Content)
                                </h4>
                                <p className="text-[11px] text-coffee-200 leading-relaxed">
                                    누적 유저 신고 횟수가 시스템 블라인드 임계치(기본 5회)를 넘어섰거나, 본문에 즉각 차단 금칙어(음란물, 불법 사설 등)가 매칭되어 **서버에 의해 자동 숨김(isHidden = true) 처리된 대상물**의 상태입니다. 
                                    부당하게 숨겨진 대상이 있다면 관리자가 **"블라인드 해제 및 복구"**를 통해 즉시 정상 원복 시킬 수 있습니다.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-2 border-t border-espresso-800">
                            <button
                                onClick={() => setShowHelp(false)}
                                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-espresso-950 text-xs font-bold rounded-lg transition-colors"
                            >
                                확인 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
