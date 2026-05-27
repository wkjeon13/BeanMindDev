import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Search, RefreshCw, AlertCircle, Filter, Undo, Receipt, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HostTransactionDetailModal from './HostTransactionDetailModal';

interface HostTransactionListModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    onRefreshStats?: () => void;
}

export default function HostTransactionListModal({ isOpen, onClose, storeId, onRefreshStats }: HostTransactionListModalProps) {
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // 필터 및 검색 상태
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'EARN' | 'CANCEL_ROLLBACK'>('ALL');

    // 상세 영수증 보기 모달용 상태
    const [selectedTxn, setSelectedTxn] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const token = localStorage.getItem('token');

    // 전체 적립/롤백 거래 이력 페칭
    const fetchTransactions = async () => {
        if (!storeId || !token) return;
        setIsLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`/api/stamps/owner/transactions/${storeId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            } else {
                setErrorMsg(t('host_txns.err_fetch', '거래 이력을 불러오는 데 실패했습니다.'));
            }
        } catch (e) {
            setErrorMsg(t('host_txns.err_network', '네트워크 통신 오류가 발생했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && storeId) {
            fetchTransactions();
        }
    }, [isOpen, storeId]);

    // 검색 및 필터링 적용
    useEffect(() => {
        let result = [...transactions];

        // 1. 이용자 닉네임/이메일 검색 필터링
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                txn =>
                    (txn.userNickname && txn.userNickname.toLowerCase().includes(term)) ||
                    (txn.userEmail && txn.userEmail.toLowerCase().includes(term))
            );
        }

        // 2. 거래 구분 필터링
        if (typeFilter !== 'ALL') {
            result = result.filter(txn => txn.txnType === typeFilter);
        }

        // 3. 일자별 필터링
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter(txn => new Date(txn.createdAt) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter(txn => new Date(txn.createdAt) <= end);
        }

        setFilteredTransactions(result);
    }, [transactions, searchTerm, typeFilter, startDate, endDate]);

    // 수동 롤백 (적립 전면 취소)
    const handleRollback = async (txn: any) => {
        if (!token) return;
        
        // 롤백 의사 확인 팝업
        const confirmMsg = t('host_scanner.alert_rollback_confirm', {
            name: txn.userNickname,
            amount: txn.amount,
            board: t(txn.cardTitle, txn.cardTitle)
        });
        if (!window.confirm(confirmMsg)) return;

        setActionLoading(txn.id);
        setErrorMsg('');
        try {
            const res = await fetch('/api/stamps/rollback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: txn.userId,
                    configId: txn.configId,
                    storeId: txn.storeId,
                    amount: txn.amount,
                    targetTxnId: txn.id
                })
            });

            if (res.ok) {
                // 이력 리스트 새로고침
                await fetchTransactions();
                // 대시보드 통계 숫자 갱신용 부모 콜백 실행
                if (onRefreshStats) {
                    onRefreshStats();
                }
            } else {
                const err = await res.json();
                setErrorMsg(err.message || t('host_scanner.err_rollback_fail', '롤백 취소 처리에 실패했습니다.'));
            }
        } catch (e) {
            setErrorMsg(t('host_txns.err_network', '네트워크 통신 오류가 발생했습니다.'));
        } finally {
            setActionLoading(null);
        }
    };

    const openDetail = (txn: any) => {
        setSelectedTxn(txn);
        setIsDetailOpen(true);
    };

    if (!isOpen) return null;

    return (
        <>
            <AnimatePresence>
                <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 antialiased">
                    {/* 뒷배경 암전 */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-espresso-950/85 backdrop-blur-sm"
                    />
                    
                    {/* 모달 본체 */}
                    <motion.div 
                        initial={{ scale: 0.96, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }} 
                        exit={{ scale: 0.96, opacity: 0 }}
                        className="w-full max-w-[850px] bg-gradient-to-br from-espresso-900 to-[#19110b] border border-espresso-800 p-6 rounded-[32px] shadow-2xl relative z-10 text-xs text-espresso-100 flex flex-col max-h-[85vh]"
                    >
                        {/* 헤더 */}
                        <div className="flex justify-between items-center pb-3 border-b border-espresso-850 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-espresso-800 border border-espresso-750 flex items-center justify-center text-espresso-200">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-serif font-black text-amber-500 tracking-tight">
                                        {t('host_txns.title', '⏱️ 스탬프 적립/취소 거래 상세 이력 스튜디오')}
                                    </h3>
                                    <p className="text-[10px] text-espresso-400 mt-0.5">{t('host_txns.desc', '이 매장에서 발생한 스탬프 적립 및 전면 취소(롤백) 전체 상세 내역을 필터링 및 검색할 수 있습니다.')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={fetchTransactions} 
                                    className="p-1.5 hover:bg-espresso-850 border border-espresso-800 text-espresso-300 hover:text-espresso-550 rounded-lg active:scale-90 transition-all cursor-pointer"
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

                        {/* 필터 및 검색 패널 그리드 */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mt-4 p-4 bg-espresso-950/40 rounded-2xl border border-espresso-850 shrink-0">
                            {/* 이용고객 검색 */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-espresso-450 uppercase tracking-wider block">{t('host_txns.search_label', '고객 검색 (이름/이메일)')}</label>
                                <div className="relative">
                                    <Search size={12} className="absolute left-3 top-2.5 text-espresso-450" />
                                    <input 
                                        type="text" 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder={t('host_txns.search_placeholder', '단골 닉네임 또는 이메일 입력')}
                                        className="w-full bg-espresso-950/80 border border-espresso-800 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-espresso-100 outline-none focus:border-amber-500/50"
                                    />
                                </div>
                            </div>

                            {/* 거래 구분 필터 */}
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-espresso-450 uppercase tracking-wider block">{t('host_txns.type_label', '거래 구분 필터')}</label>
                                <div className="flex bg-espresso-950 border border-espresso-800 rounded-xl p-0.5">
                                    {(['ALL', 'EARN', 'CANCEL_ROLLBACK'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setTypeFilter(type)}
                                            className={`flex-1 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer ${typeFilter === type ? 'bg-[#D4AF37] text-espresso-950 shadow-sm' : 'text-espresso-350 hover:bg-espresso-850/50'}`}
                                        >
                                            {type === 'ALL' && t('host_txns.type_all', '전체')}
                                            {type === 'EARN' && t('host_txns.type_earn', '적립')}
                                            {type === 'CANCEL_ROLLBACK' && t('host_txns.type_rollback', '롤백')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 기간 범위 필터 (시작일 / 종료일) */}
                            <div className="md:col-span-2 grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-espresso-450 uppercase tracking-wider block">{t('host_txns.start_date_label', '조회 시작일')}</label>
                                    <div className="relative">
                                        <Calendar size={11} className="absolute left-2.5 top-2.5 text-espresso-450 pointer-events-none" />
                                        <input 
                                            type="date" 
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="w-full bg-espresso-950/80 border border-espresso-800 rounded-xl pl-7.5 pr-2 py-1.5 text-[10px] text-espresso-100 outline-none focus:border-amber-500/50 font-mono select-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-espresso-450 uppercase tracking-wider block">{t('host_txns.end_date_label', '조회 종료일')}</label>
                                    <div className="relative">
                                        <Calendar size={11} className="absolute left-2.5 top-2.5 text-espresso-450 pointer-events-none" />
                                        <input 
                                            type="date" 
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full bg-espresso-950/80 border border-espresso-800 rounded-xl pl-7.5 pr-2 py-1.5 text-[10px] text-espresso-100 outline-none focus:border-amber-500/50 font-mono select-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 리스트 테이블 */}
                        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2 hide-scrollbar min-h-0">
                            {isLoading && transactions.length === 0 ? (
                                <div className="py-20 text-center space-y-2">
                                    <div className="w-6 h-6 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
                                    <p className="text-espresso-400">{t('host_txns.loading', '거래 데이터를 가져오고 있습니다...')}</p>
                                </div>
                            ) : filteredTransactions.length > 0 ? (
                                <div className="border border-espresso-850 rounded-2xl overflow-hidden bg-espresso-950/20">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                        <thead>
                                            <tr className="bg-espresso-950/80 text-espresso-300 font-bold border-b border-espresso-850">
                                                <th className="p-3">{t('host_txns.tbl_customer', '단골 단골고객')}</th>
                                                <th className="p-3">{t('host_txns.tbl_type', '구분')}</th>
                                                <th className="p-3">{t('host_txns.tbl_board', '적립 대상 쿠폰판')}</th>
                                                <th className="p-3">{t('host_txns.tbl_amount', '스탬프 가감')}</th>
                                                <th className="p-3">{t('host_txns.tbl_date', '처리 일시')}</th>
                                                <th className="p-3 text-right">{t('host_txns.tbl_actions', '작업')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-espresso-850/60 font-medium">
                                            {filteredTransactions.map((txn) => (
                                                <tr key={txn.id} className="hover:bg-espresso-900/30 transition-colors">
                                                    <td className="p-3">
                                                        <span className="font-bold text-espresso-50 block">{txn.userNickname}</span>
                                                        <span className="text-[9px] text-espresso-400 font-mono block mt-0.5">{txn.userEmail}</span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border ${
                                                            txn.txnType === 'EARN' 
                                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/10' 
                                                                : 'bg-red-500/10 text-red-400 border-red-500/10'
                                                        }`}>
                                                            {txn.txnType === 'EARN' ? t('host_txns.type_earn', '적립') : t('host_txns.type_rollback', '롤백')}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-semibold text-espresso-200">
                                                        {t(txn.cardTitle, txn.cardTitle) as string}
                                                    </td>
                                                    <td className="p-3 font-mono font-black text-xs">
                                                        <span className={txn.amount > 0 ? 'text-amber-500' : 'text-red-500'}>
                                                            {txn.amount > 0 ? `+${txn.amount}` : txn.amount}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-[10px] text-espresso-350 font-mono">
                                                        {new Date(txn.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="p-3 text-right space-x-1 shrink-0">
                                                        <button
                                                            onClick={() => openDetail(txn)}
                                                            className="px-2 py-1 bg-espresso-850 hover:bg-espresso-800 border border-espresso-750 text-[#D4AF37] font-bold text-[9px] rounded-lg active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1"
                                                        >
                                                            <Receipt size={10} />
                                                            {t('host_txns.btn_receipt', '상세 영수증')}
                                                        </button>
                                                        {txn.txnType === 'EARN' && (
                                                            <button
                                                                onClick={() => handleRollback(txn)}
                                                                disabled={actionLoading !== null}
                                                                className="px-2 py-1 bg-red-500/10 hover:bg-red-500 hover:text-espresso-950 border border-red-500/20 text-red-400 font-bold text-[9px] rounded-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                                                            >
                                                                <Undo size={10} />
                                                                {actionLoading === txn.id ? t('host_coupons.processing', '처리 중') : t('host_txns.btn_rollback', '롤백 취소')}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-20 text-center text-espresso-400 opacity-60">
                                    {t('host_txns.no_data', '필터에 매칭되는 거래 내역이 존재하지 않습니다.')}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>

            {/* 영수증 모달 연계 */}
            <HostTransactionDetailModal 
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                transaction={selectedTxn}
            />
        </>
    );
}
