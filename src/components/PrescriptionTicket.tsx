import React, { useMemo } from 'react';
import { Coffee, Share, Save, Lock, ChevronRight, Star, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { CoffeeBean, Brand } from '../types';

interface PrescriptionTicketProps {
    recommendation: { bean: CoffeeBean; brand: Brand };
    aiExplanation: string;
    isLoggedIn: boolean;
    isSaving?: boolean;
    hideSave?: boolean;
    date?: string;
    rating?: number | null;
    isRating?: boolean;
    onRate?: (rating: number) => void;
    onSave?: () => void;
    onShare?: () => void;
    onShareCoffeeTalk?: () => void;
    onGoToLogin?: () => void;
    onDelete?: () => void;
    isDeleting?: boolean;
    userTasteProfile?: { acidity: number; sweetness: number; bitterness: number; body: number; } | null;
}

export default function PrescriptionTicket({
    recommendation,
    aiExplanation,
    isLoggedIn,
    isSaving = false,
    hideSave = false,
    date,
    rating,
    isRating = false,
    onRate,
    onSave,
    onShare,
    onShareCoffeeTalk,
    onGoToLogin,
    onDelete,
    isDeleting = false,
    userTasteProfile
}: PrescriptionTicketProps) {
    const { t } = useTranslation();
    const displayDate = date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const ticketId = useMemo(() => Math.random().toString().substring(2, 10), []);

    if (!recommendation || !recommendation.bean || !recommendation.brand) {
        return (
            <div className="w-full p-6 text-center bg-coffee-950 rounded-[1.5rem] border border-coffee-800 text-coffee-300">
                {t('curator.invalid_prescription', '올바르지 않은 처방전 데이터입니다.')}
            </div>
        );
    }

    const displayExplanation = useMemo(() => {
        if (hideSave && aiExplanation === "☕ 특별한 커피 에세이를 작성하는 중입니다...") {
            return `고객님의 취향에 최적화된 **${recommendation.bean.name}** 원두 처방전입니다.\n\n해당 처방전은 생성 도중 이탈되었거나 에세이 작성이 완료되지 않은 상태로 저장되었습니다. 아래의 상세 커피 프로필 정보(산미, 단맛, 쓴맛, 바디감)를 참고해 주세요!`;
        }
        return aiExplanation;
    }, [aiExplanation, hideSave, recommendation.bean.name]);

    const parsedPrefs = useMemo(() => {
        if (userTasteProfile) return userTasteProfile;
        try {
            const match = aiExplanation?.match(/<!-- PREFDATA: (.*?) -->/);
            if (match) {
                const parsed = JSON.parse(match[1]);
                return {
                    acidity: parsed.tasteAcidity,
                    sweetness: parsed.tasteSweetness,
                    bitterness: parsed.tasteBitterness,
                    body: parsed.tasteBody
                };
            }
        } catch (e) {
            console.warn("Failed to parse embedded pref data:", e);
        }
        return null;
    }, [userTasteProfile, aiExplanation]);

    const displayAcidity = parsedPrefs ? parsedPrefs.acidity : recommendation.bean.acidity;
    const displaySweetness = parsedPrefs ? parsedPrefs.sweetness : recommendation.bean.sweetness;
    const displayBitterness = parsedPrefs ? parsedPrefs.bitterness : recommendation.bean.bitterness;
    const displayBody = parsedPrefs ? parsedPrefs.body : recommendation.bean.body;

    return (
        <div className="w-full relative">
            {/* The Ticket Itself */}
            <div className="w-full bg-coffee-950 rounded-[1.5rem] overflow-hidden shadow-2xl relative text-coffee-50 ticket-cutout border border-coffee-800">
                
                {/* Receipt Header */}
                <div className="px-6 pt-8 pb-5 border-b-2 border-dashed border-coffee-800 text-center relative bg-coffee-900/80">
                    <div className="font-mono text-[12px] tracking-[0.30em] text-espresso-300 mb-2 uppercase font-bold">
                        AI Coffee Prescription
                    </div>
                    <div className="font-serif italic text-coffee-400 text-[14px] relative z-10 flex justify-center items-center gap-3">
                        <span>{displayDate}</span>
                        <span className="w-1 h-1 bg-coffee-600 rounded-full"></span>
                        <span className="font-mono">#{ticketId}</span>
                    </div>
                </div>

                {/* Main Body */}
                <div className="p-6 sm:p-8 bg-coffee-950/50 relative">
                    {/* Watermark Logo */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                        <Coffee size={200} className="text-espresso-50" />
                    </div>

                    <div className="relative z-10">
                        <div className="inline-block px-3 py-1 bg-amber-900/30 text-amber-400 text-[10px] font-black tracking-widest uppercase rounded-full border border-amber-700/50 mb-4 shadow-sm">
                            Perfect Match
                        </div>
                        
                        <h1 className="text-3xl sm:text-4xl font-serif font-black text-coffee-50 leading-[1.15] mb-3 break-keep">
                            {recommendation.bean.name}
                        </h1>
                        
                        <div className="flex items-center gap-2 text-coffee-300 text-[16px] font-medium mb-8">
                            <Coffee size={14} className="text-espresso-300" />
                            <span>Roasted by <strong className="text-coffee-100">{recommendation.brand.name}</strong></span>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-8">
                            <div className="px-4 py-2 bg-coffee-900/60 rounded-xl border border-coffee-800/80 text-[13px] font-bold text-coffee-200 shadow-inner">
                                {recommendation.bean.roastLevel} Roast
                            </div>
                            <div className="px-4 py-2 bg-coffee-900/60 rounded-xl border border-coffee-800/80 text-[13px] font-bold text-coffee-200 shadow-inner">
                                {recommendation.bean.origin}
                            </div>
                        </div>

                        {/* Taste Profile (Minimalist Bars) */}
                        <div className="space-y-4 mb-10 bg-coffee-900/40 p-5 rounded-2xl border border-coffee-800/50">
                            <h3 className="text-[13px] font-bold text-espresso-300 uppercase tracking-[0.2em] mb-5">Taste Profile</h3>
                            {[ 
                                { label: t('curator.t_acidity_title', 'Acidity'), val: displayAcidity, color: 'bg-amber-400' },
                                { label: t('curator.t_sweetness_title', 'Sweetness'), val: displaySweetness, color: 'bg-rose-400' },
                                { label: t('curator.t_bitterness_title', 'Bitterness'), val: displayBitterness, color: 'bg-coffee-400' },
                                { label: t('curator.t_body_title', 'Body'), val: displayBody, color: 'bg-amber-600' }
                            ].map(t => (
                                <div key={t.label} className="flex items-center gap-4">
                                    <span className="w-20 text-[14px] font-bold text-coffee-300">{t.label}</span>
                                    <div className="flex-1 flex gap-1 items-center">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= t.val ? t.color : 'bg-coffee-800/60'}`} />
                                        ))}
                                    </div>
                                    <span className="w-8 text-right text-[14px] font-bold text-coffee-400">{t.val}/5</span>
                                </div>
                            ))}
                        </div>

                        {/* AI Explanation / Curator's Note */}
                        <div className="relative">
                            <h3 className="text-[13px] font-bold text-espresso-300 uppercase tracking-[0.2em] mb-5">Curator's Note</h3>
                            <div className={`prose prose-sm max-w-none text-coffee-200 leading-relaxed font-medium ${!isLoggedIn ? 'max-h-[220px] overflow-hidden' : ''}`}>
                                {displayExplanation === "☕ 특별한 커피 에세이를 작성하는 중입니다..." ? (
                                    <div className="flex flex-col items-center justify-center py-6 bg-coffee-900/20 rounded-xl border border-coffee-800/50 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-amber-500/5 animate-pulse" />
                                        <div className="w-8 h-8 mb-4 rounded-full border-t-[3px] border-amber-400 border-r-[3px] border-r-transparent animate-spin relative z-10" />
                                        <p className="text-amber-300 font-bold tracking-wide animate-pulse relative z-10 text-[13px]">
                                            ☕ 특별한 커피 에세이를 작성하는 중입니다...
                                        </p>
                                        <p className="text-coffee-300 text-[11px] mt-2 relative z-10">
                                            AI가 프로필을 분석하여 문장을 구성하고 있습니다
                                        </p>
                                    </div>
                                ) : (
                                    <ReactMarkdown
                                        components={{
                                            strong: ({ node, ...props }) => <strong {...props} className="text-amber-200 font-bold bg-amber-900/30 px-1 py-0.5 rounded border border-amber-700/30" />,
                                            a: ({ node, ...props }) => {
                                                const href = props.href || '';
                                                const safeHref = href.startsWith('http') ? href : `https://${href}`;
                                                return <a {...props} href={safeHref} target="_blank" rel="noopener noreferrer" className="text-amber-400 font-bold underline decoration-amber-700 hover:decoration-amber-500 underline-offset-4 transition-all" />;
                                            },
                                            h3: ({ node, ...props }) => {
                                                let content = props.children;
                                                const textContent = Array.isArray(content) ? content.join('') : (typeof content === 'string' ? content : '');
                                                
                                                if (textContent.includes('디저트 페어링') || textContent.includes('Dessert Pairing')) {
                                                    content = `🥐 ${t('curator.header_dessert', '추천 디저트 페어링')}`;
                                                } else if (textContent.includes('음악 플레이리스트') || textContent.includes('Music Playlist')) {
                                                    content = `🎵 ${t('curator.header_music', '추천 음악 플레이리스트')}`;
                                                }
                                                
                                                return <h3 {...props} className="text-coffee-100 font-serif font-bold text-xl mt-8 mb-4 border-b border-coffee-800 pb-2">{content}</h3>;
                                            }
                                        }}
                                    >
                                        {displayExplanation ? displayExplanation.replace(/<!-- BEANDATA:[\s\S]*?-->/g, '').replace(/<!-- BEANDATA:[\s\S]*/g, '').trim() : ''}
                                    </ReactMarkdown>
                                )}
                            </div>

                            {/* Blur effect if not logged in */}
                            {!isLoggedIn && onGoToLogin && (
                                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-coffee-950 via-coffee-950/80 to-transparent z-10 flex flex-col items-center justify-end pb-4">
                                     <button onClick={onGoToLogin} className="flex items-center gap-2 bg-coffee-800 border border-coffee-700 text-coffee-50 px-6 py-3 rounded-full font-bold text-sm shadow-xl hover:bg-coffee-700 transition-transform active:scale-95">
                                         <Lock size={16} /> {t('curator.login_for_details', '로그인하고 처방전 전체 보기')}
                                     </button>
                                </div>
                            )}
                        </div>

                        {/* Rating Section (Visible in Archive) */}
                        {(rating !== undefined || onRate) && (
                            <div className="mt-8 pt-6 border-t border-dashed border-coffee-800 text-center">
                                <h3 className="text-[12px] font-bold text-coffee-300 mb-3">
                                    {rating ? '내가 남긴 별점' : '이 커피, 얼마나 만족하셨나요?'}
                                </h3>
                                <div className="flex justify-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => onRate && !rating && !isRating && onRate(star)}
                                            disabled={!!rating || isRating}
                                            className={`p-1 transition-transform ${(!rating && onRate && !isRating) ? 'hover:scale-110 active:scale-95 cursor-pointer' : 'cursor-default'}`}
                                        >
                                            <Star
                                                size={32}
                                                className={`transition-colors ${(rating || 0) >= star ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-espresso-200 hover:text-coffee-600'}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions & Barcode */}
                <div className="bg-coffee-900 pt-8 pb-10 px-6 receipt-bottom relative border-t-2 border-dashed border-coffee-800 shrink-0">
                    <div className="flex flex-col gap-3 relative z-20">
                        <div className="flex gap-3 w-full">
                            {isLoggedIn && !hideSave && (
                                <button 
                                    onClick={onSave}
                                    disabled={isSaving}
                                    className="flex-1 bg-coffee-800 text-coffee-50 py-4 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg hover:bg-coffee-700 disabled:opacity-70 border border-coffee-700"
                                >
                                    <Save size={18} /> {isSaving ? t('curator.status_saving', '저장 중...') : t('curator.save_prescription', '처방전 저장')}
                                </button>
                            )}
                            {onShareCoffeeTalk && (
                                <button 
                                    onClick={onShareCoffeeTalk}
                                    className="flex-1 bg-gradient-to-tr from-amber-700 to-amber-500 text-espresso-50 py-4 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] border border-amber-600/50"
                                >
                                    <Coffee size={18} className="text-espresso-50/80" /> {t('curator.share_coffeetalk', '커피톡 공유')}
                                </button>
                            )}
                            <button 
                                onClick={onShare}
                                className={`py-4 px-6 bg-coffee-800 border border-coffee-700 text-coffee-200 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-coffee-700 ${(!isLoggedIn || hideSave) && !onShareCoffeeTalk ? 'flex-1' : ''}`}
                            >
                                <Share size={18} /> {t('shared.btn_share', '외부 공유')}
                            </button>
                        </div>
                        {onDelete && (
                            <button 
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="w-full bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/40 py-4 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                <Trash2 size={18} className="text-rose-400/80" /> {isDeleting ? '삭제 중...' : '처방전 삭제'}
                            </button>
                        )}
                    </div>

                    {/* Fake Barcode Graphic */}
                    <div className="mt-8 flex justify-center items-end h-10 opacity-30 px-4">
                        {Array(40).fill(0).map((_, i) => (
                            <div 
                                key={i} 
                                className="bg-coffee-500/50 mr-[2px]" 
                                style={{ 
                                    width: `${Math.random() > 0.5 ? 2 : 4}px`, 
                                    height: `${Math.random() > 0.3 ? 100 : 70}%` 
                                }} 
                            />
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Drop shadow underneath */}
            <div className="absolute -inset-2 bg-amber-900/10 blur-2xl -z-10 rounded-[3rem]"></div>
        </div>
    );
}

