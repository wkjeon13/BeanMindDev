import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, Trash2, CheckCircle, XCircle, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '@/utils/apiConfig';

export default function AdminUsers() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [userSearchInput, setUserSearchInput] = useState('');
    const [userFilterType, setUserFilterType] = useState<'ALL' | 'GENERAL' | 'HOST'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        setCurrentPage(1);
    }, [userSearchInput, userFilterType]);

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
            const res = await fetch(`${API_BASE}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || t('admin_dashboard.error_server'));
            }

            const data = await res.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message || t('admin_dashboard.error_server'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (id: string, nickname: string) => {
        const input = window.prompt(`[보안 인증] 정말 해당 유저를 삭제하시겠습니까? 데이터가 완전히 영구 삭제됩니다.\n계속하시려면 대상 유저의 닉네임 '${nickname}' 을(를) 정확히 입력해주세요.`);
        if (input !== nickname) {
            if (input !== null) alert('입력한 닉네임이 일치하지 않아 취소되었습니다.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert(t('admin_dashboard.user_alert_delete_ok'));
                fetchData();
            } else {
                const data = await res.json();
                alert(t('admin_dashboard.user_alert_delete_fail', { error: data.error }));
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        }
    };

    const handleUpdateUserStatus = async (id: string, nickname: string, newStatus: 'ACTIVE' | 'SUSPENDED') => {
        const actionStr = newStatus === 'ACTIVE' ? t('admin_dashboard.user_btn_unsuspend') : t('admin_dashboard.user_btn_suspend');
        const input = window.prompt(`[보안 인증] 정말 타겟 유저를 ${actionStr} 처리하시겠습니까?\n계속하시려면 대상 유저의 닉네임 '${nickname}' 을(를) 정확히 입력해주세요.`);
        if (input !== nickname) {
            if (input !== null) alert('입력한 닉네임이 일치하지 않아 취소되었습니다.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                alert(t('admin_dashboard.user_alert_suspend_ok', { action: actionStr }));
                fetchData();
            } else {
                const data = await res.json();
                alert(t('admin_dashboard.user_alert_suspend_fail', { error: data.error }));
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        }
    };

    const handleUpdateUserLimit = async (id: string, nickname: string, currentLimit: number) => {
        const newLimitStr = window.prompt(t('admin_dashboard.user_prompt_limit', { nickname, current: currentLimit }), currentLimit.toString());
        if (newLimitStr === null) return;
        
        const newLimit = parseInt(newLimitStr, 10);
        if (isNaN(newLimit) || newLimit < 0) {
            alert(t('admin_dashboard.user_alert_limit_invalid'));
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${id}/limit`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ limit: newLimit })
            });

            if (res.ok) {
                alert(t('admin_dashboard.user_alert_limit_ok', { limit: newLimit }));
                fetchData();
            } else {
                const data = await res.json();
                alert(t('admin_dashboard.user_alert_limit_fail', { error: data.error }));
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        }
    };

    const handleUpdateUserRole = async (id: string, nickname: string, newRole: string) => {
        const confirmMsg = newRole === 'ADMIN'
            ? `${nickname}님을 통합 관리자(SUPER_ADMIN)로 승격시키시겠습니까?`
            : newRole === 'MODERATOR' 
                ? `${nickname}님을 운영 매니저(MODERATOR)로 승격시키시겠습니까?`
                : `${nickname}님의 모든 권한을 회수하고 유저로 강등하시겠습니까?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${id}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (res.ok) {
                alert(`성공적으로 역할이 ${newRole}로 변경되었습니다.`);
                fetchData();
            } else {
                const data = await res.json();
                alert(`권한 변경 오류: ${data.error}`);
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        }
    };

    const handleBulkUpdateLimit = async () => {
        const newLimitStr = window.prompt(t('admin_dashboard.user_prompt_bulk_limit'), '5');
        if (newLimitStr === null) return;
        
        const newLimit = parseInt(newLimitStr, 10);
        if (isNaN(newLimit) || newLimit < 0) {
            alert(t('admin_dashboard.user_alert_limit_invalid'));
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/bulk-limit`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ limit: newLimit })
            });

            if (res.ok) {
                alert(t('admin_dashboard.user_alert_bulk_limit_ok', { limit: newLimit }));
                fetchData();
            } else {
                const data = await res.json();
                alert(t('admin_dashboard.user_alert_bulk_limit_fail', { error: data.error }));
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        }
    };

    // Calculate counts
    const generalUserCount = users.filter(user => user.role !== 'OWNER' && user.role !== 'HOST' && (!user.stores || user.stores.length === 0)).length;
    const hostUserCount = users.filter(user => user.role === 'OWNER' || user.role === 'HOST' || (user.stores && user.stores.length > 0)).length;
    const allUserCount = users.length;

    // 1. Filter by search input
    const isSearching = userSearchInput.trim().length > 0;
    let filteredUsers = users.filter(user => {
        const isHostProfile = user.role === 'OWNER' || user.role === 'HOST' || (user.stores && user.stores.length > 0);
        // Status filter
        if (userFilterType === 'GENERAL' && isHostProfile) return false;
        if (userFilterType === 'HOST' && !isHostProfile) return false;

        if (!isSearching) return true;
        const searchLower = userSearchInput.toLowerCase();
        return (
            (user.nickname && user.nickname.toLowerCase().includes(searchLower)) ||
            (user.email && user.email.toLowerCase().includes(searchLower))
        );
    });

    // 2. Pagination
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
    const displayUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
                        <h1 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('admin_dashboard.tab_users')}</h1>
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
                                <div className="flex flex-col gap-2">
                                    <h2 className="text-lg font-bold text-espresso-50">
                                        {isSearching ? t('admin_dashboard.user_search_result', { count: filteredUsers.length }) : t('admin_dashboard.user_total', { count: filteredUsers.length })}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-1 bg-espresso-800/50 p-1 rounded-lg">
                                        <button onClick={() => setUserFilterType('ALL')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${userFilterType === 'ALL' ? 'bg-espresso-900 text-espresso-50 shadow-sm' : 'text-espresso-300 hover:text-espresso-200'}`}>{t('admin_dashboard.user_filter_all')} <span className="text-[10px] opacity-70 ml-0.5">({allUserCount})</span></button>
                                        <button onClick={() => setUserFilterType('GENERAL')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${userFilterType === 'GENERAL' ? 'bg-espresso-900 text-espresso-50 shadow-sm' : 'text-espresso-300 hover:text-espresso-200'}`}>{t('admin_dashboard.user_filter_general')} <span className="text-[10px] opacity-70 ml-0.5">({generalUserCount})</span></button>
                                        <button onClick={() => setUserFilterType('HOST')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${userFilterType === 'HOST' ? 'bg-espresso-900 text-espresso-50 shadow-sm' : 'text-espresso-300 hover:text-espresso-200'}`}>{t('admin_dashboard.user_filter_host')} <span className="text-[10px] opacity-70 ml-0.5">({hostUserCount})</span></button>
                                        <div className="flex-1 min-w-4" />
                                        <button onClick={handleBulkUpdateLimit} className="px-3 py-1 text-xs font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md transition-colors whitespace-nowrap">
                                            {t('admin_dashboard.user_btn_bulk_limit')}
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder={t('admin_dashboard.user_ph_search')}
                                        value={userSearchInput}
                                        onChange={(e) => setUserSearchInput(e.target.value)}
                                        className="w-full sm:w-64 bg-espresso-900 border border-espresso-700 h-10 pl-9 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-coffee-700 outline-none"
                                    />
                                </div>
                            </div>

                            {displayUsers.length === 0 ? (
                                <div className="text-center py-10 text-coffee-400">{t('admin_dashboard.user_no_result')}</div>
                            ) : (
                                displayUsers.map((user) => (
                                    <div key={user.id} className="bg-espresso-900 p-5 rounded-2xl border border-coffee-100 shadow-sm flex flex-col sm:items-start justify-between gap-4">
                                        <div className="flex w-full items-start justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`font-bold text-lg ${user.status === 'SUSPENDED' ? 'text-coffee-400 line-through' : 'text-espresso-50'}`}>{user.nickname}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase ${user.role === 'ADMIN' ? 'bg-red-100 text-red-700' : user.role === 'MODERATOR' ? 'bg-blue-100 text-blue-700' : 'bg-espresso-800 text-espresso-200'}`}>
                                                        {user.role === 'ADMIN' ? t('admin_dashboard.user_role_admin') : user.role === 'MODERATOR' ? '매니저' : (user.role === 'OWNER' || user.role === 'HOST') ? t('admin_dashboard.user_role_host') : user.role}
                                                    </span>
                                                    {user.stores?.length > 0 && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase bg-purple-100 text-purple-700">
                                                            {t('admin_dashboard.user_role_host')}
                                                        </span>
                                                    )}
                                                    {user.status === 'SUSPENDED' && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase bg-red-100 text-red-700">{t('admin_dashboard.user_status_suspended')}</span>
                                                    )}
                                                    {user.isEmailVerified ? (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase bg-green-100 text-green-700">{t('admin_dashboard.user_status_verified')}</span>
                                                    ) : (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase bg-orange-100 text-orange-700">{t('admin_dashboard.user_status_unverified')}</span>
                                                    )}
                                                </div>
                                                <p className={`text-[13px] font-mono ${user.status === 'SUSPENDED' ? 'text-coffee-400 line-through' : 'text-espresso-300'}`}>{user.email}</p>
                                                <div className="text-[11px] text-coffee-400 mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                                    <span>{t('admin_dashboard.user_join_date', { date: new Date(user.createdAt).toLocaleDateString() })}</span>
                                                    <span className="flex items-center gap-2 border sm:border-0 border-coffee-100 p-1.5 sm:p-0 rounded-md sm:rounded-none mt-1 sm:mt-0">
                                                        <span className="font-bold text-espresso-200">{t('admin_dashboard.user_ai_usage')}</span> 
                                                        <span className={user._count?.prescriptions >= (user.aiPrescriptionLimit || 3) ? 'text-red-500 font-bold' : 'text-espresso-50 font-bold'}>
                                                            {user._count?.prescriptions || 0} / {user.aiPrescriptionLimit || 3} 회
                                                        </span>
                                                        {user.prescriptions && user.prescriptions.length > 0 && (
                                                            <span className="text-[9px] text-coffee-400 ml-1">
                                                                {t('admin_dashboard.user_ai_recent', { date: new Date(user.prescriptions[0].createdAt).toLocaleDateString() })}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            {user.id !== currentUser.id && (
                                                <div className="flex flex-wrap sm:flex-nowrap gap-2 justify-end">
                                                    
                                                    {/* SUPER_ADMIN 만 역할 변경 권한 가짐 */}
                                                    {currentUser.role === 'ADMIN' && (
                                                        <>
                                                            {(user.role === 'USER' || user.role === 'OWNER') && (
                                                                <>
                                                                <button
                                                                    onClick={() => handleUpdateUserRole(user.id, user.nickname, 'MODERATOR')}
                                                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors"
                                                                >
                                                                    운영매니저 임명
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateUserRole(user.id, user.nickname, 'ADMIN')}
                                                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs hover:bg-purple-100 transition-colors"
                                                                >
                                                                    <Shield size={14} /> 최고관리자 임명
                                                                </button>
                                                                </>
                                                            )}
                                                            
                                                            {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                                                                <button
                                                                    onClick={() => handleUpdateUserRole(user.id, user.nickname, 'USER')}
                                                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
                                                                    title="권한 회수 (강등)"
                                                                >
                                                                    <Shield size={14} className="rotate-180" /> 권한 회수
                                                                </button>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* 운영 매니저는 최고 관리자를 관리할 수 없음 */}
                                                    {!(currentUser.role !== 'ADMIN' && user.role === 'ADMIN') && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateUserLimit(user.id, user.nickname, user.aiPrescriptionLimit || 3)}
                                                                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors"
                                                            >
                                                                {t('admin_dashboard.user_btn_change_limit')}
                                                            </button>
                                                            
                                                            <button
                                                                onClick={() => handleUpdateUserStatus(user.id, user.nickname, user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                                                                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${user.status === 'ACTIVE' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                                            >
                                                                {user.status === 'ACTIVE' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                                                {user.status === 'ACTIVE' ? t('admin_dashboard.user_btn_suspend') : t('admin_dashboard.user_btn_unsuspend')}
                                                            </button>

                                                            <button
                                                                onClick={() => handleDeleteUser(user.id, user.nickname)}
                                                                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                                {t('admin_dashboard.user_btn_delete')}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}

                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t border-espresso-800">
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg bg-espresso-900 border border-espresso-700 text-espresso-200 hover:bg-espresso-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${currentPage === i + 1 ? 'bg-amber-500 text-espresso-950' : 'bg-transparent text-espresso-200 hover:bg-espresso-800'}`}
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
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
