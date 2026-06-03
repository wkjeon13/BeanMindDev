import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, ArrowLeft, ChevronLeft, ChevronRight, Activity, Monitor, Smartphone, Globe, Terminal, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '@/utils/apiConfig';

export default function AdminAccessLogs() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any[]>([]);
    const [osStats, setOsStats] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [error, setError] = useState('');

    // Search and filter states
    const [emailFilter, setEmailFilter] = useState('');
    const [ipFilter, setIpFilter] = useState('');
    const [osFilter, setOsFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);

    const limit = 20;

    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Admin Access Check
    useEffect(() => {
        if (!token || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR')) {
            alert(t('admin_dashboard.error_login_req', '관리자 권한이 필요한 페이지입니다.'));
            navigate('/');
        } else {
            fetchLogs();
            fetchStats();
        }
    }, [currentPage, osFilter, actionFilter]);

    // Reset page to 1 when search filters change
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchLogs();
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        setError('');
        try {
            let url = `${API_BASE}/api/admin/access-logs?page=${currentPage}&limit=${limit}`;
            if (emailFilter.trim()) url += `&email=${encodeURIComponent(emailFilter.trim())}`;
            if (ipFilter.trim()) url += `&ipAddress=${encodeURIComponent(ipFilter.trim())}`;
            if (osFilter) url += `&deviceOS=${osFilter}`;
            if (actionFilter) url += `&actionType=${actionFilter}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                    return;
                }
                const data = await res.json();
                throw new Error(data.error || '접속 로그를 불러오는데 실패했습니다.');
            }

            const data = await res.json();
            setLogs(data.logs || []);
            setTotalPages(data.totalPages || 1);
            setTotalLogs(data.total || 0);
        } catch (err: any) {
            setError(err.message || '서버 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        setIsStatsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/access-logs/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats || []);
                setOsStats(data.osStats || []);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setIsStatsLoading(false);
        }
    };

    // CSV Download Function
    const handleExportCSV = () => {
        if (logs.length === 0) {
            alert('다운로드할 로그 데이터가 없습니다.');
            return;
        }

        // Header Row
        let csvContent = '\uFEFF'; // UTF-8 BOM for Korean Excel alignment
        csvContent += '이메일,닉네임,접속IP,기기OS,페이지경로,액션타입,접속일시\n';

        // Log Rows
        logs.forEach(log => {
            const email = log.email || '비회원';
            const nickname = log.user?.nickname || '비회원';
            const ip = log.ipAddress || '';
            const os = log.deviceOS || 'Unknown';
            const page = log.pagePath || '';
            const action = log.actionType || '';
            const date = new Date(log.createdAt).toLocaleString();

            csvContent += `"${email}","${nickname}","${ip}","${os}","${page}","${action}","${date}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `beanmind_access_logs_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper: Map OS to Lucide Icon
    const renderOSIcon = (os: string) => {
        const lowerOS = (os || '').toLowerCase();
        if (lowerOS.includes('windows')) return <Monitor size={16} className="text-blue-400" />;
        if (lowerOS.includes('ios') || lowerOS.includes('android')) return <Smartphone size={16} className="text-green-400" />;
        if (lowerOS.includes('linux')) return <Terminal size={16} className="text-gray-400" />;
        return <Globe size={16} className="text-amber-400" />;
    };

    // Calculate dynamic OS percentage list for custom bar
    const totalOSCount = osStats.reduce((sum, item) => sum + item.count, 0);

    // Dynamic scale for Stats chart
    const maxActiveUsers = stats.length > 0 ? Math.max(...stats.map(s => s.activeUsers), 1) : 1;

    return (
        <div className="h-full w-full bg-espresso-950 overflow-y-auto pb-safe font-sans">
            <div className="max-w-7xl mx-auto flex flex-col min-h-full">
                {/* Header */}
                <header className="px-6 py-6 pt-safe mt-4 shrink-0 border-b border-espresso-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-espresso-900 flex items-center justify-center border border-coffee-100 text-coffee-600 hover:bg-espresso-950 transition-colors active:scale-95 shadow-sm">
                                <ArrowLeft size={20} />
                            </button>
                            <Shield className="text-espresso-50" size={28} />
                            <h1 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">사용자 접속 로그 관리</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchStats} className="p-2.5 rounded-xl bg-espresso-900 border border-espresso-700 text-espresso-200 hover:bg-espresso-800 transition-colors" title="통계 새로고침">
                                <RefreshCw size={18} />
                            </button>
                            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-espresso-50 font-bold transition-all shadow-sm border border-amber-500/50">
                                <FileSpreadsheet size={18} />
                                CSV 다운로드
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 p-4 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {/* Stats Dashboards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 7-Days Active Users Custom Chart */}
                        <div className="bg-espresso-900 p-5 rounded-2xl border border-coffee-100 shadow-sm col-span-2 flex flex-col justify-between">
                            <div>
                                <h3 className="text-md font-bold text-espresso-50 flex items-center gap-2 mb-1">
                                    <Activity size={18} className="text-green-500" />
                                    최근 7일간의 방문자 (DAU) 추이
                                </h3>
                                <p className="text-xs text-espresso-300 mb-6">일별 고유 접속자(회원 및 비회원 IP 기준) 집계 추이</p>
                            </div>
                            
                            {isStatsLoading ? (
                                <div className="flex justify-center items-center h-48 text-coffee-400">
                                    <div className="w-6 h-6 rounded-full border-2 border-espresso-700 border-t-coffee-900 animate-spin mr-2" />
                                    <span>로딩 중...</span>
                                </div>
                            ) : stats.length === 0 ? (
                                <div className="text-center py-10 text-coffee-400 h-48 flex items-center justify-center">통계 데이터가 존재하지 않습니다.</div>
                            ) : (
                                <div className="flex items-end justify-between h-48 gap-3 pt-6 border-b border-espresso-700/60 px-4">
                                    {stats.map((s, index) => {
                                        const percentHeight = Math.max(10, Math.round((s.activeUsers / maxActiveUsers) * 100));
                                        return (
                                            <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                                                {/* Tooltip value */}
                                                <span className="opacity-0 group-hover:opacity-100 bg-espresso-950 text-espresso-50 text-[10px] px-1.5 py-0.5 rounded border border-coffee-100 transition-opacity whitespace-nowrap mb-1">
                                                    {s.activeUsers}명
                                                </span>
                                                {/* Bar */}
                                                <div 
                                                    style={{ height: `${percentHeight}%` }}
                                                    className="w-full bg-gradient-to-t from-amber-700 to-amber-500 rounded-t-lg group-hover:from-amber-600 group-hover:to-amber-400 transition-all duration-300 relative shadow-[0_-4px_10px_rgba(245,158,11,0.15)]"
                                                />
                                                {/* Label date */}
                                                <span className="text-[10px] text-espresso-300 font-semibold mt-1 font-mono">
                                                    {s.date.substring(5)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* OS Distribution Custom Panel */}
                        <div className="bg-espresso-900 p-5 rounded-2xl border border-coffee-100 shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="text-md font-bold text-espresso-50 flex items-center gap-2 mb-1">
                                    <Monitor size={18} className="text-blue-500" />
                                    접속 기기(OS) 분포 비율
                                </h3>
                                <p className="text-xs text-espresso-300 mb-6">사용자 브라우저 기기 OS 탐색 누적 비중</p>
                            </div>

                            {isStatsLoading ? (
                                <div className="flex justify-center items-center h-48 text-coffee-400">
                                    <div className="w-6 h-6 rounded-full border-2 border-espresso-700 border-t-coffee-900 animate-spin" />
                                </div>
                            ) : osStats.length === 0 ? (
                                <div className="text-center py-10 text-coffee-400 h-48 flex items-center justify-center">OS 데이터 없음</div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Segmented bar graph */}
                                    <div className="w-full h-4 bg-espresso-950 rounded-full overflow-hidden flex border border-espresso-700/50">
                                        {osStats.map((item, index) => {
                                            const pct = totalOSCount > 0 ? (item.count / totalOSCount) * 100 : 0;
                                            const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-gray-500'];
                                            const color = colors[index % colors.length];
                                            return (
                                                <div 
                                                    key={index} 
                                                    style={{ width: `${pct}%` }} 
                                                    className={`${color} h-full`}
                                                    title={`${item.deviceOS}: ${Math.round(pct)}%`}
                                                />
                                            );
                                        })}
                                    </div>
                                    
                                    {/* OS list with counts */}
                                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold pt-2">
                                        {osStats.map((item, index) => {
                                            const pct = totalOSCount > 0 ? (item.count / totalOSCount) * 100 : 0;
                                            const colors = ['text-blue-400', 'text-green-400', 'text-amber-400', 'text-purple-400', 'text-gray-400'];
                                            const colorClass = colors[index % colors.length];
                                            return (
                                                <div key={index} className="flex items-center justify-between p-2 bg-espresso-950/40 border border-espresso-800 rounded-xl">
                                                    <span className="flex items-center gap-1.5 text-espresso-200">
                                                        <span className={colorClass}>{renderOSIcon(item.deviceOS)}</span>
                                                        {item.deviceOS}
                                                    </span>
                                                    <span className="text-espresso-50 font-mono">{Math.round(pct)}% <span className="text-[10px] text-espresso-400 font-normal">({item.count}건)</span></span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filter and Search Form */}
                    <form onSubmit={handleSearchSubmit} className="bg-espresso-900 p-5 rounded-2xl border border-coffee-100 shadow-sm flex flex-col md:flex-row items-end gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1 w-full">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-espresso-300 font-bold">이메일 검색</label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso-500" />
                                    <input 
                                        type="text"
                                        value={emailFilter}
                                        onChange={(e) => setEmailFilter(e.target.value)}
                                        placeholder="이메일 주소 입력"
                                        className="w-full bg-espresso-950/60 border border-espresso-700 h-10 pl-9 pr-3 rounded-xl text-white text-sm outline-none focus:border-coffee-500"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-espresso-300 font-bold">접속 IP 검색</label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso-500" />
                                    <input 
                                        type="text"
                                        value={ipFilter}
                                        onChange={(e) => setIpFilter(e.target.value)}
                                        placeholder="IP 주소 입력"
                                        className="w-full bg-espresso-950/60 border border-espresso-700 h-10 pl-9 pr-3 rounded-xl text-white text-sm outline-none focus:border-coffee-500"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-espresso-300 font-bold">기기 OS 필터</label>
                                <select 
                                    value={osFilter}
                                    onChange={(e) => setOsFilter(e.target.value)}
                                    className="w-full bg-espresso-950/60 border border-espresso-700 h-10 px-3 rounded-xl text-white text-sm outline-none focus:border-coffee-500 appearance-none"
                                >
                                    <option value="">모든 기기 OS</option>
                                    <option value="Windows">Windows</option>
                                    <option value="iOS">iOS</option>
                                    <option value="Android">Android</option>
                                    <option value="macOS">macOS</option>
                                    <option value="Linux">Linux</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-espresso-300 font-bold">액션 타입 필터</label>
                                <select 
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="w-full bg-espresso-950/60 border border-espresso-700 h-10 px-3 rounded-xl text-white text-sm outline-none focus:border-coffee-500 appearance-none"
                                >
                                    <option value="">모든 액션</option>
                                    <option value="LOGIN">LOGIN (로그인)</option>
                                    <option value="LOGOUT">LOGOUT (로그아웃)</option>
                                    <option value="PAGE_VIEW">PAGE_VIEW (페이지 조회)</option>
                                </select>
                            </div>
                        </div>
                        <button 
                            type="submit"
                            className="w-full md:w-auto h-10 px-6 bg-espresso-950 text-espresso-50 font-bold border border-coffee-100 hover:bg-espresso-800 transition-colors rounded-xl flex items-center justify-center gap-2"
                        >
                            <Search size={16} />
                            조회하기
                        </button>
                    </form>

                    {/* Logs Grid Table */}
                    <div className="bg-espresso-900 rounded-2xl border border-coffee-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-espresso-800 flex justify-between items-center bg-espresso-900/50">
                            <h2 className="text-md font-bold text-espresso-50">
                                검색된 접속 기록 <span className="font-mono text-amber-500 ml-1">({totalLogs}건)</span>
                            </h2>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-coffee-400">
                                <div className="w-8 h-8 rounded-full border-4 border-espresso-700 border-t-coffee-900 animate-spin mb-4" />
                                <p className="font-medium">로그 로딩 중...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-20 text-coffee-400">검색 조건에 맞는 접속 기록이 존재하지 않습니다.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm text-espresso-300">
                                    <thead className="bg-espresso-950/40 text-xs font-bold text-espresso-200 border-b border-espresso-800 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3.5">사용자 이메일</th>
                                            <th className="px-6 py-3.5">닉네임</th>
                                            <th className="px-6 py-3.5">접속 IP</th>
                                            <th className="px-6 py-3.5 text-center">기기 OS</th>
                                            <th className="px-6 py-3.5">페이지 경로</th>
                                            <th className="px-6 py-3.5 text-center">액션 타입</th>
                                            <th className="px-6 py-3.5">일시</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-espresso-800/50 font-medium">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-espresso-950/20 transition-colors">
                                                <td className="px-6 py-4 text-espresso-50 font-semibold font-mono" title={log.email || ''}>
                                                    {log.email ? (
                                                        log.email.endsWith('@apple.user.local') || log.email.includes('apple') ? (
                                                            log.email.length > 15 ? `${log.email.substring(0, 15)}....` : log.email
                                                        ) : log.email
                                                    ) : (
                                                        <span className="text-espresso-500 font-normal">비회원(Anonymous)</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-espresso-200">
                                                    {log.user?.nickname || <span className="text-espresso-500 font-normal font-sans">-</span>}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs">{log.ipAddress || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {renderOSIcon(log.deviceOS)}
                                                        <span className="text-xs font-semibold">{log.deviceOS || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-amber-500/80">{log.pagePath || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase ${log.actionType === 'LOGIN' ? 'bg-green-500/15 text-green-400' : log.actionType === 'LOGOUT' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'}`}>
                                                        {log.actionType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-espresso-400">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Footer */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 py-4 border-t border-espresso-800 bg-espresso-900/30">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg bg-espresso-900 border border-espresso-700 text-espresso-200 hover:bg-espresso-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === i + 1 ? 'bg-amber-500 text-espresso-950' : 'bg-transparent text-espresso-200 hover:bg-espresso-800'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg bg-espresso-900 border border-espresso-700 text-espresso-200 hover:bg-espresso-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
