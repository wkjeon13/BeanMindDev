import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Ticket, Check, RefreshCw, AlertCircle, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HostCouponListModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    initialFilter?: 'ALL' | 'UNUSED' | 'USED';
    onRefreshStats?: () => void;
}

export default function HostCouponListModal({ isOpen, onClose, storeId, initialFilter = 'ALL', onRefreshStats }: HostCouponListModalProps) {
    const { t } = useTranslation();
    const [coupons, setCoupons] = useState<any[]>([]);
    const [filteredCoupons, setFilteredCoupons] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNUSED' | 'USED'>('ALL');
    const [isLoading, setIsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const token = localStorage.getItem('token');

    // 쿠폰 리스트 조회
    const fetchCoupons = async () => {
        if (!storeId || !token) return;
        setIsLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`/api/stamps/owner/coupons/${storeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCoupons(data);
            } else {
                setErrorMsg(t('host_coupons.err_fetch', '쿠폰 목록을 불러오는 데 실패했습니다.'));
            }
        } catch (e) {
            setErrorMsg(t('host_coupons.err_network', '네트워크 통신 오류가 발생했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && storeId) {
            fetchCoupons();
        }
    }, [isOpen, storeId]);

    // 모달이 열릴 때 대시보드로부터 들어오는 초기 필터 반영
    useEffect(() => {
        if (isOpen) {
            setStatusFilter(initialFilter);
        }
    }, [isOpen, initialFilter]);

    // 필터링 적용
    useEffect(() => {
        if (statusFilter === 'ALL') {
            setFilteredCoupons(coupons);
        } else {
            setFilteredCoupons(coupons.filter(c => c.status === statusFilter));
        }
    }, [coupons, statusFilter]);

    // 쿠폰 수동 사용 완료 처리 (웹 POS 기능)
    const handleUseCoupon = async (couponId: string) => {
        if (!token) return;
        if (!window.confirm(t('host_coupons.alert_use_confirm', '이 무료 쿠폰을 사용 완료 처리하시겠습니까? (이 작업은 되돌릴 수 없습니다.)'))) return;

        setActionLoading(couponId);
        setErrorMsg('');
        try {
            const res = await fetch(`/api/stamps/coupons/${couponId}/use`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                // 쿠폰 리스트 새로고침
                await fetchCoupons();
                // 대시보드 통계 숫자 갱신용 부모 콜백 실행
                if (onRefreshStats) {
                    onRefreshStats();
                }
            } else {
                const err = await res.json();
                setErrorMsg(err.message || t('host_coupons.err_use_fail', '쿠폰 사용 처리에 실패했습니다.'));
            }
        } catch (e) {
            setErrorMsg(t('host_coupons.err_network', '네트워크 통신 오류가 발생했습니다.'));
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 antialiased">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-espresso-950/85 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ scale: 0.96, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.96, opacity: 0 }}
                    className="w-full max-w-[700px] bg-gradient-to-br from-espresso-900 to-[#19110b] border border-espresso-800 p-6 rounded-[32px] shadow-2xl relative z-10 text-xs text-espresso-100 flex flex-col max-h-[85vh]"
                >
                    {/* 모달 헤더 */}
                    <div className="flex justify-between items-center pb-3 border-b border-espresso-850 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                <Ticket size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-serif font-black text-amber-500 tracking-tight">
                                    {t('host_coupons.title', '🎫 매장 무료 쿠폰 발급/사용 현황 스튜디오')}
                                </h3>
                                <p className="text-[10px] text-espresso-400 mt-0.5">{t('host_coupons.desc', '이 가맹점에서 단골 고객들이 발행받은 무료 혜택 리스트 현황입니다.')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={fetchCoupons} 
                                className="p-1.5 hover:bg-espresso-850 border border-espresso-800 text-espresso-300 hover:text-espresso-50 rounded-lg active:scale-90 transition-all cursor-pointer"
                                title={t('common.refresh', '새로고침')}
                            >
                                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                            <button onClick={onClose} className="p-1.5 hover:bg-espresso-850 text-espresso-400 hover:text-espresso-50 rounded-lg transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="mt-4 bg-red-950/40 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-center gap-2 shrink-0">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* 필터링 헤더 */}
                    <div className="flex items-center justify-between mt-4 py-2 px-3 bg-espresso-950/40 rounded-xl border border-espresso-850 shrink-0">
                        <div className="flex items-center gap-1.5 text-espresso-300">
                            <Filter size={12} />
                            <span className="font-bold text-[10px] uppercase tracking-wider">{t('host_coupons.filter', '상태 필터')}</span>
                        </div>
                        <div className="flex gap-1">
                            {(['ALL', 'UNUSED', 'USED'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setStatusFilter(filter)}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${statusFilter === filter ? 'bg-[#D4AF37] text-espresso-950 shadow-md' : 'text-espresso-300 hover:bg-espresso-800/40'}`}
                                >
                                    {filter === 'ALL' && t('host_coupons.filter_all', '전체 목록')}
                                    {filter === 'UNUSED' && t('host_coupons.filter_issued', '사용 대기')}
                                    {filter === 'USED' && t('host_coupons.filter_used', '사용 완료')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 쿠폰 테이블 리스트 */}
                    <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2 hide-scrollbar min-h-0">
                        {isLoading && coupons.length === 0 ? (
                            <div className="py-20 text-center space-y-2">
                                <div className="w-6 h-6 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
                                <p className="text-espresso-400">{t('host_coupons.loading', '쿠폰 발급 데이터를 가져오고 있습니다...')}</p>
                            </div>
                        ) : filteredCoupons.length > 0 ? (
                            <div className="border border-espresso-850 rounded-2xl overflow-hidden bg-espresso-950/20">
                                <table className="w-full text-left border-collapse text-[11px]">
                                    <thead>
                                        <tr className="bg-espresso-950/80 text-espresso-300 font-bold border-b border-espresso-850">
                                            <th className="p-3">{t('host_coupons.tbl_customer', '적립 단골고객')}</th>
                                            <th className="p-3">{t('host_coupons.tbl_code', '쿠폰 고유코드')}</th>
                                            <th className="p-3">{t('host_coupons.tbl_reward', '무료 혜택 설명')}</th>
                                            <th className="p-3">{t('host_coupons.tbl_dates', '발급일 / 만료일')}</th>
                                            <th className="p-3 text-right">{t('host_coupons.tbl_status', '사용 상태')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-espresso-850/60 font-medium">
                                        {filteredCoupons.map((c) => (
                                            <tr key={c.id} className="hover:bg-espresso-900/30 transition-colors">
                                                <td className="p-3">
                                                    <span className="font-bold text-espresso-50 block">{c.userNickname}</span>
                                                    <span className="text-[9px] text-espresso-400 font-mono block mt-0.5">{c.userEmail}</span>
                                                </td>
                                                <td className="p-3 font-mono text-[10.5px] text-[#D4AF37] select-all font-bold">
                                                    {c.couponCode}
                                                </td>
                                                <td className="p-3 font-bold text-espresso-200">
                                                    {c.rewardDesc || t('host_coupons.default_reward', '아메리카노 1잔 무료 교환')}
                                                </td>
                                                <td className="p-3 text-[10px] text-espresso-350 space-y-0.5 font-mono">
                                                    <div>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : new Date(new Date(c.expiresAt).getTime() - 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                                                    <div className="text-red-400/80">{new Date(c.expiresAt).toLocaleDateString()} {t('host_coupons.expire_suffix', '만료')}</div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    {c.status === 'USED' ? (
                                                        <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 font-bold px-2 py-1 rounded-lg text-[9px] border border-green-500/10">
                                                            <Check size={8} />
                                                            {t('host_coupons.status_used', '사용 완료')}
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            <span className="bg-amber-500/10 text-[#D4AF37] font-bold px-2 py-1 rounded-lg text-[9px] border border-amber-500/15">
                                                                {t('host_coupons.status_issued', '사용 대기')}
                                                            </span>
                                                            <button
                                                                onClick={() => handleUseCoupon(c.id)}
                                                                disabled={actionLoading !== null}
                                                                className="px-2.5 py-1 bg-[#D4AF37] hover:bg-amber-500 text-espresso-950 font-black text-[9px] rounded-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                {actionLoading === c.id ? t('host_coupons.processing', '처리 중') : t('host_coupons.btn_use', '쿠폰 수동 사용')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-espresso-400 opacity-60">
                                {t('host_coupons.no_data', '필터에 매칭되는 무료 쿠폰 발급 내역이 존재하지 않습니다.')}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
