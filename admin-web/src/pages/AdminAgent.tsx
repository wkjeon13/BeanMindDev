import React, { useState, useEffect } from 'react';
import { 
    Bot, Play, Square, RotateCw, Clock, Sparkles, Coffee, 
    Film, Award, CheckCircle2, XCircle, AlertTriangle, 
    ExternalLink, Eye, Gift, QrCode, Store, User, Hash, Tag
} from 'lucide-react';
import { API_BASE } from '@/utils/apiConfig';

interface AgentStats {
    totalFeeds: number;
    totalShorts: number;
    totalStamps: number;
    totalCoupons: number;
}

interface AgentState {
    isRunning: boolean;
    intervalHours: number;
    lastRun: string | null;
    nextRun: string | null;
    currentAccountIndex: number;
    stats: AgentStats;
    isExecuting: boolean;
    recentLogs: AgentLogEntry[];
}

interface AgentLogEntry {
    id: string;
    timestamp: string;
    userEmail: string;
    userNickname: string;
    userRole: string;
    storeName: string;
    coffeeMenu: string;
    pairingDessert: string;
    stampsEarned: number;
    totalStamps: number;
    couponIssued: boolean;
    couponCode?: string;
    postType: 'NORMAL' | 'SHORTS';
    shortsCategory?: string;
    postId: string;
    contentPreview: string;
    imageUrl: string;
    bgmTitle: string;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
}

export default function AdminAgent() {
    const [status, setStatus] = useState<AgentState | null>(null);
    const [logs, setLogs] = useState<AgentLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<AgentLogEntry | null>(null);
    const [activeTab, setActiveTab] = useState<'ALL' | 'NORMAL' | 'SHORTS'>('ALL');

    const getAuthHeaders = (): Record<string, string> => {
        const t = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (t && t !== 'null' && t !== 'undefined' && t.trim() !== '') {
            headers['Authorization'] = `Bearer ${t.trim()}`;
        }
        return headers;
    };

    const fetchStatusAndLogs = async () => {
        try {
            setError(null);
            const headers = getAuthHeaders();
            const [statusRes, logsRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/agent/status`, { headers }),
                fetch(`${API_BASE}/api/admin/agent/logs?limit=50`, { headers })
            ]);

            if (!statusRes.ok) {
                if (statusRes.status === 401 || statusRes.status === 403) {
                    console.warn('[AdminAgent] Auth check returned', statusRes.status);
                    const errData = await statusRes.json().catch(() => ({}));
                    throw new Error(errData.message || errData.error || '관리자 인증이 만료되었거나 접근 권한이 없습니다.');
                }
                throw new Error('에이전트 상태 조회에 실패했습니다.');
            }
            const statusData = await statusRes.json();
            if (statusData.success) {
                setStatus(statusData.status);
            }

            if (logsRes.ok) {
                const logsData = await logsRes.json();
                if (logsData.success) {
                    setLogs(logsData.logs);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch agent data:', err);
            setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatusAndLogs();
        // 30-second polling for live status
        const interval = setInterval(fetchStatusAndLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleToggleScheduler = async () => {
        try {
            setIsToggling(true);
            setError(null);
            const headers = {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            };
            const res = await fetch(`${API_BASE}/api/admin/agent/toggle`, {
                method: 'POST',
                headers
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage(data.message);
                setTimeout(() => setSuccessMessage(null), 4000);
                await fetchStatusAndLogs();
            } else {
                throw new Error(data.error || '스케줄러 전환 실패');
            }
        } catch (err: any) {
            setError(err.message || '스케줄러 상태 전환 중 오류가 발생했습니다.');
        } finally {
            setIsToggling(false);
        }
    };

    const handleTriggerNow = async () => {
        if (isTriggering || status?.isExecuting) return;
        try {
            setIsTriggering(true);
            setError(null);
            setSuccessMessage('AI 에이전트가 실행 중입니다. (계정 로그인 -> 매장 방문 -> QR 스탬프 -> Gemini 글 생성 -> Imagen 3 이미지 생성 -> 피드 등록)... 약 10~20초 소요됩니다.');
            
            const headers = {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            };
            const res = await fetch(`${API_BASE}/api/admin/agent/trigger`, {
                method: 'POST',
                headers
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage(`에이전트 사이클이 성공적으로 완료되었습니다! (${data.result.userNickname} @ ${data.result.storeName})`);
                await fetchStatusAndLogs();
            } else {
                throw new Error(data.message || data.error || '실행 실패');
            }
        } catch (err: any) {
            setError(err.message || '에이전트 즉시 실행 중 오류가 발생했습니다.');
        } finally {
            setIsTriggering(false);
        }
    };

    const formatDate = (isoString?: string | null) => {
        if (!isoString) return '-';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return isoString;
        }
    };

    const filteredLogs = logs.filter(log => {
        if (activeTab === 'NORMAL') return log.postType === 'NORMAL';
        if (activeTab === 'SHORTS') return log.postType === 'SHORTS';
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <Bot className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">AI 자동 피드 생성 에이전트</h1>
                            {status?.isRunning ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    자동 스케줄 실행 중 (1시간 주기)
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-gray-400"></span>
                                    스케줄러 일시 정지 (수동 대기)
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            실제 DB 매장 랜덤 방문 • Host QR 스캔 & 스탬프/쿠폰 적립 • Gemini 리뷰 & Imagen 3 사진 생성 • 24개 계정 순환
                        </p>
                    </div>
                </div>

                {/* Control Actions */}
                <div className="flex items-center space-x-3 shrink-0">
                    <button
                        onClick={fetchStatusAndLogs}
                        disabled={isLoading}
                        className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors shrink-0"
                        title="새로고침"
                    >
                        <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={handleToggleScheduler}
                        disabled={isToggling}
                        className={`flex items-center px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm whitespace-nowrap shrink-0 ${
                            status?.isRunning 
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                    >
                        {status?.isRunning ? (
                            <>
                                <Square className="w-4 h-4 mr-2 fill-current" />
                                스케줄러 중지
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2 fill-current" />
                                1시간 자동실행 시작
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleTriggerNow}
                        disabled={isTriggering || status?.isExecuting}
                        className="flex items-center px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-md shadow-amber-600/20 disabled:opacity-50 transition-all whitespace-nowrap shrink-0"
                    >
                        {isTriggering || status?.isExecuting ? (
                            <>
                                <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                                AI 에이전트 활동 중...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                즉시 1회 실행 (Run Now)
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Notification Banners */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center justify-between text-sm">
                    <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-3 text-rose-500 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-500 font-bold ml-4">✕</button>
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm">
                    <div className="flex items-center">
                        <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 font-bold ml-4">✕</button>
                </div>
            )}

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">누적 생성 피드</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{status?.stats.totalFeeds || 0}건</p>
                        <p className="text-xs text-amber-600 mt-1">커피톡 일반 피드</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <Coffee className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">누적 ASMR 숏폼</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{status?.stats.totalShorts || 0}건</p>
                        <p className="text-xs text-indigo-600 mt-1">커피 ASMR / 숏폼</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                        <Film className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">적립된 스탬프</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{status?.stats.totalStamps || 0}개</p>
                        <p className="text-xs text-emerald-600 mt-1">Host QR 실시간 적립</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <Award className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">자동 발급된 쿠폰</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{status?.stats.totalCoupons || 0}장</p>
                        <p className="text-xs text-purple-600 mt-1">10스탬프 달성 리워드</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                        <Gift className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Agent Operating Status Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-amber-600" />
                    에이전트 실행 환경 및 스케줄 상태
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <span className="text-gray-500 block text-xs">최근 실행 시각</span>
                        <span className="font-semibold text-gray-900 mt-1 block">
                            {formatDate(status?.lastRun)}
                        </span>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                        <span className="text-gray-500 block text-xs">다음 예정 시각</span>
                        <span className="font-semibold text-gray-900 mt-1 block">
                            {status?.isRunning ? formatDate(status?.nextRun) : '스케줄 중지됨'}
                        </span>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                        <span className="text-gray-500 block text-xs">현재 순환 계정 차례</span>
                        <span className="font-semibold text-gray-900 mt-1 block">
                            #{status?.currentAccountIndex !== undefined ? status.currentAccountIndex + 1 : 1} (총 24개 계정)
                        </span>
                        <span className="text-xs text-gray-400">user1~user14 / host1~host10</span>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                        <span className="text-gray-500 block text-xs">AI 이미지 엔진</span>
                        <span className="font-semibold text-gray-900 mt-1 block flex items-center text-amber-700">
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> Google Imagen 3
                        </span>
                        <span className="text-xs text-gray-400">Gemini 2.5 Flash 텍스트</span>
                    </div>
                </div>
            </div>

            {/* Execution History Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">에이전트 실행 및 활동 이력</h2>
                        <p className="text-xs text-gray-500 mt-0.5">매 회차별 계정, 방문 매장, QR 스탬프 적립, AI 피드 생성 세부 내역</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                        <button
                            onClick={() => setActiveTab('ALL')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            전체 ({logs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('NORMAL')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'NORMAL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            커피톡 피드
                        </button>
                        <button
                            onClick={() => setActiveTab('SHORTS')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'SHORTS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            ASMR 숏폼
                        </button>
                    </div>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Bot className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="text-base font-medium text-gray-600">아직 실행 이력이 없습니다.</p>
                        <p className="text-xs text-gray-400 mt-1">상단의 "즉시 1회 실행" 버튼을 눌러 첫 피드를 생성해보세요.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-700">
                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                <tr>
                                    <th className="py-3 px-4 whitespace-nowrap">실행 일시</th>
                                    <th className="py-3 px-4 whitespace-nowrap">사용자 계정</th>
                                    <th className="py-3 px-4 whitespace-nowrap">방문 커피 전문점</th>
                                    <th className="py-3 px-4 whitespace-nowrap">주문 & 페어링</th>
                                    <th className="py-3 px-4 whitespace-nowrap">QR 스탬프 / 쿠폰</th>
                                    <th className="py-3 px-4 whitespace-nowrap">피드 유형</th>
                                    <th className="py-3 px-4 whitespace-nowrap">페어링 BGM</th>
                                    <th className="py-3 px-4 text-center whitespace-nowrap">미리보기</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-500">
                                            {formatDate(log.timestamp)}
                                        </td>

                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                                                    {log.userNickname?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-gray-900 block text-xs">{log.userNickname}</span>
                                                    <span className="text-[11px] text-gray-400">{log.userEmail}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="flex items-center text-xs font-medium text-gray-800">
                                                <Store className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                                {log.storeName}
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                                            <div className="font-medium text-gray-900">{log.coffeeMenu}</div>
                                            <div className="text-[11px] text-gray-400">+ {log.pairingDessert}</div>
                                        </td>

                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
                                                    <QrCode className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                    +{log.stampsEarned} (누적 {log.totalStamps}/10)
                                                </span>
                                                {log.couponIssued && (
                                                    <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 w-max">
                                                        <Gift className="w-3 h-3 mr-1" />
                                                        쿠폰발급 ({log.couponCode})
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {log.postType === 'SHORTS' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                                                    <Film className="w-3 h-3 mr-1" /> ASMR 숏폼
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                                                    <Coffee className="w-3 h-3 mr-1" /> 커피톡 피드
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap max-w-[200px] truncate" title={log.bgmTitle}>
                                            🎵 {log.bgmTitle}
                                        </td>

                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" /> 보기
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Log Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                                <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
                                    <Sparkles className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">
                                        {selectedLog.postType === 'SHORTS' ? '☕️ 커피 ASMR 숏폼 상세' : '☕️ 커피톡 피드 상세'}
                                    </h3>
                                    <p className="text-xs text-gray-400">{formatDate(selectedLog.timestamp)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            {/* Generated AI Image */}
                            {selectedLog.imageUrl && (
                                <div className="rounded-xl overflow-hidden border border-gray-200 bg-black max-h-72 flex items-center justify-center">
                                    <img
                                        src={selectedLog.imageUrl}
                                        alt="AI Generated Coffee & Pairing"
                                        className="object-contain max-h-72 w-full"
                                        onError={(e: any) => {
                                            e.target.src = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80';
                                        }}
                                    />
                                </div>
                            )}

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl">
                                <div>
                                    <span className="text-gray-400 block">방문 계정</span>
                                    <span className="font-semibold text-gray-900">{selectedLog.userNickname} ({selectedLog.userEmail})</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">이용 커피 전문점</span>
                                    <span className="font-semibold text-gray-900">{selectedLog.storeName}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">주문 커피 및 페어링</span>
                                    <span className="font-semibold text-gray-900">{selectedLog.coffeeMenu} + {selectedLog.pairingDessert}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">스탬프 적립 내역</span>
                                    <span className="font-semibold text-emerald-700">+{selectedLog.stampsEarned}개 적립 (누적 {selectedLog.totalStamps}개)</span>
                                </div>
                                {selectedLog.couponIssued && (
                                    <div className="col-span-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-800">
                                        🎁 <strong>쿠폰 발급 완료:</strong> 10스탬프 달성으로 무료 음료 교환권({selectedLog.couponCode})이 발급되었습니다.
                                    </div>
                                )}
                                <div className="col-span-2">
                                    <span className="text-gray-400 block">페어링 BGM</span>
                                    <span className="font-medium text-gray-700">🎵 {selectedLog.bgmTitle}</span>
                                </div>
                            </div>

                            {/* Feed Preview Content */}
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">피드 본문 미리보기</span>
                                <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-100">
                                    {selectedLog.contentPreview}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
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
