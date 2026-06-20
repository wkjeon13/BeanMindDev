import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Coffee, Gift, Wallet, ArrowDownCircle, ArrowUpCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../utils/apiConfig';
import { formatLocalTime } from '../utils/dateFormatter';

interface Transaction {
    id: string;
    amount: number;
    description: string;
    createdAt: string;
}

interface RewardTiers {
    rewardTier1Name: string;
    rewardTier1Amount: number;
    rewardTier2Name: string;
    rewardTier2Amount: number;
    rewardTier3Name: string;
    rewardTier3Amount: number;
}

export default function PointHistory() {
    const navigate = useNavigate();
    const { t } = useTranslation(['translation']);
    const [balance, setBalance] = useState<number>(0);
    const [history, setHistory] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'CHARGE' | 'REWARD_RECEIVED' | 'REWARD_SENT' | 'USED'>('ALL');
    const [rewardTiers, setRewardTiers] = useState<RewardTiers>({
        rewardTier1Name: '참여', rewardTier1Amount: 10,
        rewardTier2Name: '감사', rewardTier2Amount: 50,
        rewardTier3Name: '최고', rewardTier3Amount: 100
    });
    const [isSavingTiers, setIsSavingTiers] = useState(false);
    const [showTierSettings, setShowTierSettings] = useState(false);

    const translateDescription = (desc: string) => {
        if (desc === 'AI 커피 처방전 발급') return t('point_history.desc_prescription', 'AI 커피 처방전 발급');
        if (desc === '카페 리뷰 작성 보상') return t('point_history.desc_shop_review', '카페 리뷰 작성 보상');
        if (desc === '7-Day Check-in Jackpot' || desc === '7일 출석체크 당첨') return t('point_history.desc_7day_jackpot', '7-Day Check-in Jackpot');
        if (desc === 'Daily Check-in' || desc === '출석체크') return t('point_history.desc_daily_checkin', 'Daily Check-in');
        
        if (desc.startsWith('[성지순례 업적]')) {
            const match = desc.match(/\[성지순례 업적\] ([\d]+)회 누적 달성 보상/);
            if (match) return t('point_history.desc_pilgrimage_reward', '[성지순례 업적] {{count}}회 누적 달성 보상', { count: match[1] });
        }
        
        if (desc.includes('스토어 인앱결제')) {
            const match = desc.match(/스토어 인앱결제 \(([\d,]+)콩\)/);
            if (match) return t('point_history.desc_iap', '스토어 인앱결제 ({{amount}}콩)', { amount: match[1] });
        }
        if (desc.includes('충전 완료')) {
            const match = desc.match(/커피콩 ([\d,]+)알 충전 완료/);
            if (match) return t('point_history.desc_charge_done', '커피콩 {{amount}}알 충전 완료', { amount: match[1] });
        }
        if (desc.startsWith('보상 🎁:')) {
            if (desc.includes('님에게')) {
                const match = desc.match(/보상 🎁: (.*?)님에게 \((.*?)\)(?: \[수수료 (.*?)콩 포함\])?/);
                if (match) {
                    const [_, name, reason, fee] = match;
                    if (fee) return t('point_history.desc_reward_sent_fee', '보상 🎁: {{name}}님에게 ({{reason}}) [수수료 {{fee}}콩 포함]', { name, reason, fee });
                    return t('point_history.desc_reward_sent', '보상 🎁: {{name}}님에게 ({{reason}})', { name, reason });
                }
            }
            if (desc.includes('님으로부터')) {
                const match = desc.match(/보상 🎁: (.*?)님으로부터 \((.*?)\)(?: \[수수료 (.*?)% 공제\])?/);
                if (match) {
                    const [_, name, reason, fee] = match;
                    if (fee) return t('point_history.desc_reward_received_fee', '보상 🎁: {{name}}님으로부터 ({{reason}}) [수수료 {{fee}}% 공제]', { name, reason, fee });
                    return t('point_history.desc_reward_received', '보상 🎁: {{name}}님으로부터 ({{reason}})', { name, reason });
                }
            }
        }
        return desc;
    };

    useEffect(() => {
        const fetchHistory = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                alert(t('point_history.alert_login_req', '로그인이 필요합니다.'));
                navigate('/profile');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/points`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setBalance(data.balance);
                    setHistory(data.history);
                } else {
                    console.error('Failed to fetch point history');
                }

                const tiersRes = await fetch(`${API_BASE}/api/users/reward-tiers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (tiersRes.ok) {
                    const tiersData = await tiersRes.json();
                    setRewardTiers(tiersData);
                }
            } catch (error) {
                console.error('Error fetching point history:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [navigate]);

    const handleSaveTiers = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setIsSavingTiers(true);
        try {
            const res = await fetch(`${API_BASE}/api/users/reward-tiers`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(rewardTiers)
            });

            if (res.ok) {
                alert(t('point_history.alert_tiers_saved', '보상 등급 설정이 저장되었습니다.'));
                setShowTierSettings(false);
            } else {
                const errData = await res.json();
                alert(errData.error || t('point_history.alert_tiers_fail', '설정 저장에 실패했습니다.'));
            }
        } catch (error) {
            console.error('Failed to save reward tiers', error);
            alert(t('point_history.alert_error', '오류가 발생했습니다.'));
        } finally {
            setIsSavingTiers(false);
        }
    };

    const filteredHistory = history.filter(tx => {
        if (filter === 'ALL') return true;
        
        // This relies on descriptions to filter roughly. If we had an enum status in the DB it would be better.
        // For MVP, checking descriptions matching keywords:
        const isCharge = tx.description.includes('충전') || tx.description.includes('인앱결제');
        const isReceived = tx.amount > 0 && tx.description.includes('보상');
        const isSent = tx.amount < 0 && tx.description.includes('보상');

        if (filter === 'CHARGE') return isCharge;
        if (filter === 'REWARD_RECEIVED') return isReceived;
        if (filter === 'REWARD_SENT') return isSent;
        if (filter === 'USED') return tx.amount < 0;
        
        return true;
    });

    // 총 사용한 커피콩 계산 (음수 금액의 절대값 합산)
    const totalUsedPoints = history
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 bg-espresso-900 flex flex-col min-h-[100dvh]"
        >
            {/* Header */}
            <header className="sticky top-0 z-30 bg-espresso-900/95 backdrop-blur-xl border-b border-coffee-100 pt-safe">
                <div className="h-14 px-4 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-coffee-600 active:bg-espresso-950 rounded-full transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="font-serif text-lg font-bold text-espresso-50 tracking-tight">{t('point_history.title', '커피콩 내역')}</h1>
                    <div className="w-10" />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto pb-safe">
                {/* Balance Card */}
                <div className="p-6">
                    <div className="bg-espresso-900 rounded-3xl p-6 shadow-sm border border-coffee-100 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Coffee size={100} />
                        </div>
                        <span className="text-espresso-300 font-bold text-[14px] mb-2 relative z-10 flex items-center gap-1.5"><Wallet size={16} /> {t('point_history.balance_label', '보유 커피콩')}</span>
                        <div className="flex items-end gap-1 mb-1 relative z-10">
                            <span className="text-4xl font-black text-espresso-50 tracking-tighter">{balance.toLocaleString()}</span>
                            <span className="text-coffee-600 font-bold mb-1">{t('point_history.unit_bean', '콩')}</span>
                        </div>
                        
                        {/* 총 사용 커피콩 합계 */}
                        <div className="text-[12px] text-espresso-400 mb-6 relative z-10 flex items-center gap-1">
                            <span>{t('point_history.total_used_label', '총 사용 커피콩')}:</span>
                            <span className="text-red-400 font-bold">{totalUsedPoints.toLocaleString()}</span>
                            <span>{t('point_history.unit_bean', '콩')}</span>
                        </div>
                        
                        <div className="flex gap-3 w-full relative z-10">
                            <button 
                                onClick={() => alert(t('point_history.alert_charge_wip', '실제 결제 충전 기능은 준비 중입니다.'))}
                                className="flex-1 py-3 bg-coffee-900 text-espresso-50 rounded-xl font-bold text-[14px] active:scale-95 transition-transform"
                            >
                                {t('point_history.btn_charge', '충전하기')}
                            </button>
                            <button 
                                onClick={() => alert(t('point_history.alert_exchange_wip', '수익금 정산(환전) 기능은 준비 중입니다.'))}
                                className="flex-1 py-3 bg-espresso-900 text-espresso-50 border border-espresso-700 rounded-xl font-bold text-[14px] active:scale-95 transition-transform"
                            >
                                {t('point_history.btn_exchange', '환전하기')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Reward Tiers Settings */}
                <div className="px-4 mb-6">
                    <button 
                        onClick={() => setShowTierSettings(!showTierSettings)}
                        className="w-full flex items-center justify-between p-4 bg-espresso-900 border border-coffee-100 rounded-2xl shadow-sm text-espresso-100 font-bold text-[14px]"
                    >
                        <span className="flex items-center gap-2"><Settings size={18} className="text-espresso-300" /> {t('point_history.tier_settings_title', '보상 등급 커스텀 설정')}</span>
                        <ChevronLeft size={18} className={`transition-transform text-coffee-400 ${showTierSettings ? '-rotate-90' : 'rotate-180'}`} />
                    </button>

                    {showTierSettings && (
                        <div className="mt-2 p-4 bg-espresso-900 border border-coffee-100 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-200">
                            <p className="text-[12px] text-espresso-300 mb-4 leading-relaxed">
                                {t('point_history.tier_settings_desc', '내 게시물(또는 매장)에 달린 유용한 댓글/리뷰에 선물할 커피콩의 등급 이름과 지급 수량을 직접 설정해보세요.')}
                            </p>
                            <div className="space-y-3">
                                {[1, 2, 3].map((tierNum) => {
                                    const nameKey = `rewardTier${tierNum}Name` as keyof RewardTiers;
                                    const amountKey = `rewardTier${tierNum}Amount` as keyof RewardTiers;
                                    
                                    return (
                                        <div key={tierNum} className="flex items-center gap-2">
                                            <span className="text-[12px] font-bold text-coffee-400 w-10 shrink-0">{t('point_history.tier_level', '{{num}}단계', { num: tierNum })}</span>
                                            <input 
                                                type="text" 
                                                value={rewardTiers[nameKey]} 
                                                onChange={(e) => setRewardTiers({...rewardTiers, [nameKey]: e.target.value})}
                                                placeholder={t('point_history.ph_tier_name', '등급명 (예: 참여)')}
                                                className="flex-1 min-w-0 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-espresso-600"
                                            />
                                            <div className="relative w-24 shrink-0">
                                                <input 
                                                    type="number" 
                                                    value={rewardTiers[amountKey]} 
                                                    onChange={(e) => setRewardTiers({...rewardTiers, [amountKey]: Number(e.target.value)})}
                                                    placeholder={t('point_history.ph_tier_amount', '콩 수량')}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-3 pr-8 py-2 text-[13px] text-right font-bold outline-none focus:border-espresso-600"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-coffee-400 font-bold">{t('point_history.unit_bean', '콩')}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button 
                                onClick={handleSaveTiers}
                                disabled={isSavingTiers}
                                className="mt-4 w-full py-2.5 bg-coffee-600 text-espresso-50 rounded-xl font-bold text-[13px] hover:bg-coffee-700 transition-colors disabled:opacity-50"
                            >
                                {isSavingTiers ? t('point_history.btn_saving', '저장 중...') : t('point_history.btn_save_tiers', '설정 저장하기')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="sticky top-0 z-20 bg-espresso-900/95 backdrop-blur-md px-4 py-3 border-b border-zinc-100 mb-2">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                        {[
                            { id: 'ALL', label: t('point_history.filter_all', '전체') },
                            { id: 'CHARGE', label: t('point_history.filter_charge', '충전') },
                            { id: 'REWARD_RECEIVED', label: t('point_history.filter_reward_received', '받은 보상') },
                            { id: 'REWARD_SENT', label: t('point_history.filter_reward_sent', '보낸 보상') },
                            { id: 'USED', label: t('point_history.filter_used', '사용') }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id as any)}
                                className={`px-4 py-2 rounded-full font-bold text-[13px] whitespace-nowrap transition-colors ${
                                    filter === f.id ? 'bg-coffee-900 text-espresso-50 shadow-md shadow-coffee-900/20' : 'bg-zinc-100 text-espresso-800 hover:bg-zinc-200'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* History List */}
                <div className="px-4 pb-20">
                    {isLoading ? (
                        <div className="py-20 flex justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-espresso-700 border-t-coffee-900 animate-spin" />
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                            <Coffee size={40} className="mb-3 text-espresso-100" />
                            <p className="font-medium text-espresso-300">{t('point_history.no_history', '조회된 내역이 없습니다.')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredHistory.map((tx) => {
                                const isPositive = tx.amount > 0;
                                const isCharge = tx.description.includes('충전');
                                
                                return (
                                    <div key={tx.id} className="flex items-center p-4 bg-espresso-900 border border-coffee-50 rounded-2xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 mr-4 ${
                                            isCharge ? 'bg-blue-50 text-blue-500' :
                                            isPositive ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'
                                        }`}>
                                            {isCharge ? <Wallet size={20} /> :
                                             isPositive ? <Gift size={20} /> : <Gift size={20} />}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="text-[11px] font-bold text-coffee-400 mb-0.5 font-mono">
                                                {formatLocalTime(tx.createdAt, 'yyyy. MM. dd. HH:mm:ss')}
                                            </div>
                                            <div className="font-medium text-espresso-50 text-[14px] truncate leading-snug">
                                                {translateDescription(tx.description)}
                                            </div>
                                        </div>
                                        
                                        <div className={`font-black tracking-tight shrink-0 flex items-center gap-1 ${
                                            isPositive ? 'text-blue-600' : 'text-red-500'
                                        }`}>
                                            {isPositive ? '+' : ''}{tx.amount.toLocaleString()} {t('point_history.unit_bean', '콩')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
