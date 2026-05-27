import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Receipt, Clock, User, Coffee, ArrowRight, CornerDownRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HostTransactionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: any;
}

export default function HostTransactionDetailModal({ isOpen, onClose, transaction }: HostTransactionDetailModalProps) {
    const { t } = useTranslation();

    if (!isOpen || !transaction) return null;

    // itemsEarned 파싱
    let parsedItems: Record<string, number> = {};
    if (transaction.itemsEarned) {
        try {
            parsedItems = JSON.parse(transaction.itemsEarned);
        } catch (e) {
            console.error("Failed to parse itemsEarned json:", e);
        }
    }

    const hasItems = Object.keys(parsedItems).length > 0;

    // 기존에 품목 정보(hasItems)가 없을 경우 도장판 타이틀(cardTitle)을 파싱하여 폴백 품목 명칭 확보
    let fallbackMenuName = t('host_transaction.general_earn', '기본 스탬프 일괄 적립');
    if (transaction.cardTitle) {
        const cleanTitle = transaction.cardTitle.replace(/ 단골| 도장판| 정책/g, '').replace('☕ ', '').trim();
        if (cleanTitle) {
            fallbackMenuName = `${cleanTitle} 적립`;
        }
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 flex items-center justify-center z-[110] p-4 antialiased">
                {/* 배경 블러 */}
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-espresso-950/80 backdrop-blur-md"
                />
                
                {/* 영수증 스타일 모달 본체 */}
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 15 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="w-full max-w-[400px] bg-[#1e140d] border border-espresso-800 p-6 rounded-[28px] shadow-2xl relative z-10 text-xs text-espresso-100 flex flex-col font-sans"
                >
                    {/* 상단 닫기 */}
                    <button 
                        onClick={onClose} 
                        className="absolute right-4 top-4 p-1.5 hover:bg-espresso-850 text-espresso-400 hover:text-espresso-50 rounded-lg transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>

                    {/* 영수증 아이콘 및 헤더 */}
                    <div className="flex flex-col items-center text-center pb-4 border-b border-dashed border-espresso-800 shrink-0 mt-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-2">
                            <Receipt size={24} />
                        </div>
                        <h3 className="text-sm font-serif font-black text-amber-500 tracking-tight">
                            {t('host_transaction.detail_title', '🎫 스탬프 적립 상세 영수증')}
                        </h3>
                        <p className="text-[9px] text-espresso-450 mt-0.5 uppercase tracking-wider font-mono">
                            TXID: {transaction.id}
                        </p>
                    </div>

                    {/* 영수증 핵심 정보 리스트 */}
                    <div className="py-4 space-y-3.5 border-b border-espresso-850 shrink-0">
                        {/* 이용고객 */}
                        <div className="flex justify-between items-start">
                            <span className="text-espresso-400 font-bold flex items-center gap-1.5 shrink-0">
                                <User size={12} className="text-espresso-400" />
                                {t('host_transaction.customer', '이용 고객')}
                            </span>
                            <span className="text-right font-semibold">
                                <span className="text-espresso-50 font-bold block">{transaction.userNickname}</span>
                                {transaction.userEmail && (
                                    <span className="text-[9px] text-espresso-400 font-mono block mt-0.5">{transaction.userEmail}</span>
                                )}
                            </span>
                        </div>

                        {/* 스탬프 정책판 */}
                        <div className="flex justify-between items-center">
                            <span className="text-espresso-400 font-bold flex items-center gap-1.5">
                                <Coffee size={12} className="text-espresso-400" />
                                {t('host_transaction.stamp_board', '적립 대상 쿠폰판')}
                            </span>
                            <span className="text-espresso-200 font-bold text-right max-w-[200px] truncate">
                                {t(transaction.cardTitle, transaction.cardTitle) as string}
                            </span>
                        </div>

                        {/* 처리 일시 */}
                        <div className="flex justify-between items-center">
                            <span className="text-espresso-400 font-bold flex items-center gap-1.5">
                                <Clock size={12} className="text-espresso-400" />
                                {t('host_transaction.date', '처리 일시')}
                            </span>
                            <span className="text-espresso-300 font-mono font-medium">
                                {new Date(transaction.createdAt).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* 적립/품목 상세 내용 (영수증 스타일의 격자 배치) */}
                    <div className="py-4 flex-1 overflow-y-auto max-h-[160px] hide-scrollbar">
                        <h4 className="text-[10px] text-espresso-400 font-black uppercase tracking-wider mb-2.5 flex items-center gap-1">
                            <CornerDownRight size={10} className="text-[#D4AF37]" />
                            {t('host_transaction.details', '적립된 상세 품목 내역')}
                        </h4>

                        {hasItems ? (
                            <div className="bg-espresso-950/40 p-3 rounded-xl border border-espresso-850/60 space-y-2">
                                {Object.entries(parsedItems).map(([menuName, qty]) => (
                                    <div key={menuName} className="flex justify-between items-center text-xs">
                                        <span className="text-espresso-200 font-semibold flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/50" />
                                            {menuName}
                                        </span>
                                        <span className="font-mono font-black text-[#D4AF37]">
                                            +{qty} {t('host_dashboard.unit_count', '개')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-espresso-950/40 p-3 rounded-xl border border-espresso-850/60 flex justify-between items-center text-xs">
                                <span className="text-espresso-200 font-semibold flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/50" />
                                    {fallbackMenuName}
                                </span>
                                <span className="font-mono font-black text-[#D4AF37]">
                                    +{transaction.amount} {t('host_dashboard.unit_count', '개')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 하단 최종 합계 영수증 마감 디자인 */}
                    <div className="pt-4 border-t border-dashed border-espresso-800 shrink-0">
                        <div className="bg-espresso-950/60 p-3.5 rounded-xl border border-espresso-850 flex justify-between items-center">
                            <span className="text-espresso-350 font-bold uppercase tracking-wider text-[10px]">
                                {transaction.txnType === 'EARN' ? t('host_transaction.total_earn', '최종 적립 합계') : t('host_transaction.total_rollback', '최종 롤백 합계')}
                            </span>
                            <span className={`font-mono font-black text-base ${transaction.amount > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount} Stamps
                            </span>
                        </div>

                        {/* 닫기 버튼 */}
                        <button 
                            onClick={onClose}
                            className="w-full mt-4 py-2.5 bg-espresso-850 hover:bg-espresso-800 border border-espresso-750 text-[#D4AF37] font-black rounded-xl transition-all shadow active:scale-98 cursor-pointer text-center text-[11px]"
                        >
                            {t('common.close', '확인 및 영수증 닫기')}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
