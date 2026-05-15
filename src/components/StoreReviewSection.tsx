import React, { useState, useEffect, useMemo } from 'react';
import { Star, StarHalf, MessageSquare, Image as ImageIcon, X, Gift, Coffee, ChevronLeft, ChevronRight, MoreHorizontal, Edit2, Trash2, Smile } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker from 'emoji-picker-react';

import { API_BASE } from '../utils/apiConfig';

interface StoreReviewSectionProps {
    storeId: string;
    reviews: any[];
    onReviewAdded: () => void;
    initialAiSummary?: string | null;
    shopOwnerId?: string;
    fetchReviews?: () => void;
}

interface RewardTiers {
    rewardTier1Name: string;
    rewardTier1Amount: number;
    rewardTier2Name: string;
    rewardTier2Amount: number;
    rewardTier3Name: string;
    rewardTier3Amount: number;
}



function StarRatingInput({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) {
    return (
        <div className="flex items-center justify-between bg-espresso-950 px-4 py-2 rounded-xl">
            <span className="font-bold text-[14px] text-espresso-100">{label}</span>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => {
                    const isHalf = value + 0.5 === star;
                    const isFull = value >= star;
                    return (
                        <button
                            key={star}
                            onClick={(e) => {
                                // Simple logic to detect left/right half click can be tricky,
                                // we'll use a standard click for full star, and maybe double check?
                                // Actually, HTML5 input range is much easier for 0.5 steps.
                            }}
                            className="relative w-6 h-6 focus:outline-none"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <input
                                type="range"
                                min="0" max="5" step="0.5"
                                value={value}
                                onChange={(e) => onChange(parseFloat(e.target.value))}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            />
                            {isFull ? (
                                <Star fill="#8B5A2B" className="text-espresso-200 w-6 h-6" />
                            ) : isHalf ? (
                                <StarHalf fill="#8B5A2B" className="text-espresso-200 w-6 h-6" />
                            ) : (
                                <Star className="text-coffee-300 w-6 h-6" />
                            )}
                        </button>
                    )
                })}
                <span className="w-6 text-right font-bold text-espresso-50 text-[14px] ml-2">{value.toFixed(1)}</span>
            </div>
        </div>
    );
}

// To properly implement 0.5 star rating via range input:
function CriteriaSlider({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) {
    return (
        <div className="flex items-center justify-between bg-espresso-950 px-4 py-3 rounded-xl mb-2">
            <span className="font-bold text-[14px] text-espresso-100">{label}</span>
            <div className="flex items-center gap-3 w-1/2">
                <input
                    type="range"
                    min="0" max="5" step="0.5"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-espresso-700 rounded-lg appearance-none cursor-pointer accent-coffee-700"
                />
                <div className="flex items-center gap-1 w-12 justify-end">
                    <Star fill="#8B5A2B" className="text-espresso-200 w-4 h-4" />
                    <span className="font-bold text-espresso-50 text-[14px]">{value.toFixed(1)}</span>
                </div>
            </div>
        </div>
    );
}

export default function StoreReviewSection({ storeId, reviews = [], onReviewAdded, initialAiSummary = null, shopOwnerId, fetchReviews }: StoreReviewSectionProps) {
    const { t } = useTranslation(['translation']);
    const { i18n } = useTranslation();
    const [isWriting, setIsWriting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    const CRITERIA = useMemo(() => [
        { key: 'taste', label: t('store_review.label_taste', '커피 맛') },
        { key: 'atmosphere', label: t('store_review.label_atmosphere', '분위기') },
        { key: 'interior', label: t('store_review.label_interior', '인테리어') },
        { key: 'service', label: t('store_review.label_service', '서비스') },
        { key: 'price', label: t('store_review.label_price', '가격') },
        { key: 'cleanliness', label: t('store_review.label_cleanliness', '청결도') }
    ], [t]);

    // Gallery state for multiple images
    const [selectedReviewGallery, setSelectedReviewGallery] = useState<{urls: string[], index: number} | null>(null);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const handleNextImage = () => {
        if (!selectedReviewGallery) return;
        if (selectedReviewGallery.index < selectedReviewGallery.urls.length - 1) {
            setSelectedReviewGallery({ ...selectedReviewGallery, index: selectedReviewGallery.index + 1 });
        }
    };

    const handlePrevImage = () => {
        if (!selectedReviewGallery) return;
        if (selectedReviewGallery.index > 0) {
            setSelectedReviewGallery({ ...selectedReviewGallery, index: selectedReviewGallery.index - 1 });
        }
    };

    const [ratings, setRatings] = useState({
        taste: 5.0, atmosphere: 5.0, interior: 5.0, service: 5.0, price: 5.0, cleanliness: 5.0
    });
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // AI Summary State
    const [aiSummary, setAiSummary] = useState<string | null>(initialAiSummary || null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    // Reward Tiers State
    const [rewardTiers, setRewardTiers] = useState<RewardTiers | null>(null);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [selectedRewardTarget, setSelectedRewardTarget] = useState<{ id: string, name: string, entityId: string } | null>(null);
    
    // Edit & Delete State
    const [activeReviewMenuId, setActiveReviewMenuId] = useState<string | null>(null);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    
    const currentUserId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').id : null;

    const handleEditReviewMode = (review: any) => {
        setEditingReviewId(review.id);
        setContent(review.content || '');
        setRatings({
            taste: review.taste || 5.0,
            atmosphere: review.atmosphere || 5.0,
            interior: review.interior || 5.0,
            service: review.service || 5.0,
            price: review.price || 5.0,
            cleanliness: review.cleanliness || 5.0
        });
        
        let loadedImages: string[] = [];
        try {
            if (review.imageUrls) {
                loadedImages = JSON.parse(review.imageUrls);
            }
        } catch (e) {
            loadedImages = [];
        }
        setImages(loadedImages);
        
        setActiveReviewMenuId(null);
        setIsWriting(true);
    };

    const handleDeleteReview = async (reviewId: string) => {
        setActiveReviewMenuId(null);
        if (!window.confirm(t('store_review.alert_delete_confirm', '정말 이 리뷰를 삭제하시겠습니까?'))) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/shops/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                if(fetchReviews) fetchReviews();
                else onReviewAdded(); // fallback
            } else {
                alert(t('store_review.alert_delete_fail', '리뷰 삭제에 실패했습니다.'));
            }
        } catch (e) {
            console.error('Delete error', e);
            alert(t('store_review.alert_error', '오류가 발생했습니다.'));
        }
    };

    useEffect(() => {
        if (initialAiSummary && initialAiSummary !== aiSummary) {
            setAiSummary(initialAiSummary);
        }
    }, [initialAiSummary]);

    const handleGenerateAiSummary = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert(t('store_review.alert_login_req', '로그인이 필요한 기능입니다.'));
            return;
        }

        setIsGeneratingSummary(true);
        try {
            const lang = i18n.language.startsWith('en') ? 'en' : 'ko';
            const res = await fetch(`${API_BASE}/api/ai-features/shop/${storeId}/summarize-reviews?lang=${lang}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAiSummary(data.summary);
            } else {
                const err = await res.json();
                alert(err.error || t('store_review.alert_ai_fail', 'AI 요약 생성에 실패했습니다.'));
            }
        } catch (error) {
            console.error(error);
            alert(t('store_review.alert_ai_error', 'AI 요약 요청 중 오류가 발생했습니다.'));
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (images.length + files.length > 5) {
            alert(t('store_review.alert_img_limit', '이미지는 최대 5장까지만 업로드 가능합니다.'));
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const submitReview = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        if (!content.trim()) {
            alert(t('store_review.alert_no_content', '리뷰 내용을 입력해주세요.'));
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert(t('store_review.alert_login_req', '로그인이 필요한 기능입니다.'));
            return;
        }

        setIsSubmitting(true);
        try {
            const isEdit = !!editingReviewId;
            const url = isEdit 
                ? `${API_BASE}/api/shops/reviews/${editingReviewId}` 
                : `${API_BASE}/api/shops/${storeId}/reviews`;
                
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...ratings, content, imageUrls: images })
            });

            if (res.ok) {
                setEditingReviewId(null);
                setIsWriting(false);
                setContent('');
                setImages([]);
                setRatings({ taste: 5.0, atmosphere: 5.0, interior: 5.0, service: 5.0, price: 5.0, cleanliness: 5.0 });
                onReviewAdded(); // Tell parent to re-fetch
            } else {
                alert(t('store_review.alert_review_fail', '리뷰 등록에 실패했습니다.'));
            }
        } catch (error) {
            console.error(error);
            alert(t('store_review.alert_error', '오류가 발생했습니다.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const averageRatings = useMemo(() => {
        if (reviews.length === 0) return null;

        const sums = {
            taste: 0,
            atmosphere: 0,
            interior: 0,
            service: 0,
            price: 0,
            cleanliness: 0
        };

        reviews.forEach(review => {
            sums.taste += review.taste;
            sums.atmosphere += review.atmosphere;
            sums.interior += review.interior;
            sums.service += review.service;
            sums.price += review.price;
            sums.cleanliness += review.cleanliness;
        });

        const count = reviews.length;
        return {
            taste: sums.taste / count,
            atmosphere: sums.atmosphere / count,
            interior: sums.interior / count,
            service: sums.service / count,
            price: sums.price / count,
            cleanliness: sums.cleanliness / count
        };
    }, [reviews]);

    const handleReportReview = async (reviewId: string) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert(t('store_review.alert_report_login', '신고 기능은 로그인이 필요합니다.'));
            return;
        }

        const reason = window.prompt(t('store_review.prompt_report_reason', '리뷰 신고 사유를 간단히 입력해주세요 (욕설, 스팸, 부적절한 리뷰 등):'));
        if (!reason || reason.trim() === '') return;

        if (window.confirm(t('store_review.confirm_report', '이 리뷰를 신고하시겠습니까?'))) {
            try {
                const res = await fetch(`${API_BASE}/api/users/report`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        targetId: reviewId,
                        targetType: 'REVIEW',
                        reason: reason.trim()
                    })
                });

                if (res.ok) {
                    alert(t('store_review.alert_report_ok', '리뷰 신고가 접수되었습니다. 관리자 검토 후 조치됩니다.'));
                } else {
                     alert(t('store_review.alert_report_fail', '신고 접수에 실패했습니다. 나중에 다시 시도해주세요.'));
                }
            } catch (err) {
                 console.error(err);
                 alert(t('store_review.alert_report_error', '신고 접수 중 오류가 발생했습니다.'));
            }
        }
    };

    const handleRewardClick = (targetId: string, authorName: string, entityId: string) => {
        setSelectedRewardTarget({ id: targetId, name: authorName, entityId });
        setShowRewardModal(true);
    };

    const processReward = async (amount: number, description: string) => {
        if (!selectedRewardTarget) return;
        
        const token = localStorage.getItem('token');
        if (!token) return alert('로그인이 필요합니다.');

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/points/reward`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetUserId: selectedRewardTarget.id,
                    amount,
                    description,
                    targetType: 'REVIEW',
                    targetEntityId: selectedRewardTarget.entityId
                })
            });

            if (res.ok) {
                alert(t('store_review.alert_reward_ok', '{{name}}님에게 커피콩 선물을 완료했습니다! ☕🎁', {name: selectedRewardTarget.name}));
                setShowRewardModal(false);
                setSelectedRewardTarget(null);
                onReviewAdded();
            } else {
                const errData = await res.json();
                alert(errData.error || t('store_review.alert_reward_fail', '선물에 실패했습니다.'));
            }
        } catch (error) {
            console.error('Failed to reward', error);
            alert(t('store_review.alert_error', '오류가 발생했습니다.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const ratingSummaryItems = averageRatings ? [
        { key: 'taste', icon: '☕', label: t('store_review.quote_taste', '"커피가 맛있어요"'), color: 'bg-teal-200/60', value: averageRatings.taste },
        { key: 'atmosphere', icon: '✨', label: t('store_review.quote_atmosphere', '"분위기가 좋아요"'), color: 'bg-amber-200/60', value: averageRatings.atmosphere },
        { key: 'interior', icon: '🛋️', label: t('store_review.quote_interior', '"인테리어가 멋져요"'), color: 'bg-blue-200/60', value: averageRatings.interior },
        { key: 'service', icon: '💖', label: t('store_review.quote_service', '"친절해요"'), color: 'bg-rose-200/60', value: averageRatings.service },
        { key: 'price', icon: '💰', label: t('store_review.quote_price', '"가성비가 좋아요"'), color: 'bg-green-200/60', value: averageRatings.price },
        { key: 'cleanliness', icon: '🧹', label: t('store_review.quote_cleanliness', '"매장이 청결해요"'), color: 'bg-purple-200/60', value: averageRatings.cleanliness },
    ].sort((a, b) => b.value - a.value) : [];

    return (
        <>
            {isWriting && (
                <div className="fixed inset-0 z-[200] bg-espresso-900 flex flex-col pt-safe-top overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-coffee-100">
                        <h3 className="font-bold text-espresso-50 text-lg tracking-tight">{t('store_review.title_write', '리뷰 작성하기')}</h3>
                        <button onClick={() => { setIsWriting(false); setEditingReviewId(null); }} className="p-2 text-espresso-300 rounded-full hover:bg-espresso-950 active:scale-95 transition-all">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                        <section>
                            <h4 className="font-bold text-espresso-50 mb-3 text-[15px]">{t('store_review.subtitle_ratings', '항목별 상세 평가 (0.5점 단위)')}</h4>
                            {CRITERIA.map(c => (
                                <CriteriaSlider
                                    key={c.key}
                                    label={c.label}
                                    value={(ratings as any)[c.key]}
                                    onChange={(val) => setRatings(prev => ({ ...prev, [c.key]: val }))}
                                />
                            ))}
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-3 relative">
                                <h4 className="font-bold text-espresso-50 text-[15px]">{t('store_review.subtitle_content', '리뷰 내용')}</h4>
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="p-1.5 text-espresso-200 hover:text-espresso-50 hover:bg-espresso-800 rounded-full transition-colors active:scale-95"
                                >
                                    <Smile size={18} />
                                </button>

                                {showEmojiPicker && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-[220]" 
                                            onClick={() => setShowEmojiPicker(false)}
                                        />
                                        <div className="absolute top-[100%] right-0 z-[230] shadow-2xl rounded-xl overflow-hidden border border-espresso-700 mt-2">
                                            <EmojiPicker 
                                                theme={"dark" as any}
                                                onEmojiClick={(emojiData) => {
                                                    setContent(prev => prev + emojiData.emoji);
                                                }} 
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full border-2 border-coffee-100 rounded-2xl p-4 min-h-[120px] focus:outline-none focus:border-coffee-500 bg-espresso-950/50 resize-none text-[16px] text-espresso-50 placeholder-espresso-300/70"
                                placeholder={t('store_review.ph_content', '매장에서의 경험은 어떠셨나요? 자세한 후기를 남겨주시면 다른 이용자들에게 큰 도움이 됩니다.')}
                            />
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-espresso-50 text-[15px]">{t('store_review.title_photos', '사진 첨부 ({{count}}/5)', {count: images.length})}</h4>
                                <label className="bg-espresso-800 text-espresso-200 px-3 py-1.5 rounded-lg text-[13px] font-bold cursor-pointer active:scale-95 transition-transform flex items-center gap-1.5">
                                    <ImageIcon size={16} /> {t('store_review.btn_add_photo', '사진 추가')}
                                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={images.length >= 5} />
                                </label>
                            </div>

                            {images.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                    {images.map((img, idx) => (
                                        <div key={idx} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-espresso-700">
                                            <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1 right-1 bg-espresso-950/50 text-espresso-50 rounded-full p-1 active:scale-95"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-4 bg-espresso-900/80 backdrop-blur-xl border-t border-coffee-100 pb-safe-bottom z-[210]">
                        <button
                            onClick={submitReview}
                            disabled={isSubmitting}
                            className="w-full bg-coffee-900 text-espresso-50 rounded-xl py-4 font-bold text-[16px] active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 disabled:opacity-50"
                        >
                            {isSubmitting ? t('store_review.btn_submitting', '등록 중...') : t('store_review.btn_submit', '리뷰 등록하기')}
                        </button>
                    </div>
                </div>
            )}

            <section className="pt-6 border-t border-coffee-100 mt-2">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <MessageSquare size={20} className="text-coffee-600" />
                        <h4 className="text-xl font-serif font-bold text-espresso-50">{t('store_review.title_visitors', '방문자 리뷰')}<span className="text-coffee-400 text-[16px]">({reviews.length})</span></h4>
                    </div>
                    <button
                        onClick={() => {
                            if (!localStorage.getItem('token')) {
                                alert(t('store_review.alert_write_login', '리뷰를 작성하려면 로그인이 필요합니다.'));
                                return;
                            }
                            // Reset state for new
                            setEditingReviewId(null);
                            setContent('');
                            setRatings({ taste: 5.0, atmosphere: 5.0, interior: 5.0, service: 5.0, price: 5.0, cleanliness: 5.0 });
                            setImages([]);
                            setIsWriting(true);
                        }}
                        className="px-4 py-2 bg-espresso-800 text-espresso-100 rounded-xl font-bold text-[13px] active:scale-95 transition-transform"
                    >{t('store_review.btn_write_review', '리뷰 작성')}</button>
                </div>

                {/* AI Review Summary Section */}
                {(aiSummary || reviews.length >= 3) && (
                    <div className="mb-8 p-5 bg-gradient-to-b from-espresso-900 to-espresso-950 border border-espresso-700/80 rounded-[1.5rem] relative overflow-hidden ring-1 ring-inset ring-white/5 shadow-xl">
                        <div className="absolute -right-4 -top-4 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute -bottom-6 -left-6 p-4 opacity-5 pointer-events-none text-espresso-200 text-espresso-200">
                            <MessageSquare size={120} />
                        </div>
                        
                        <div className="flex items-center justify-between mb-4 relative z-10 gap-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-espresso-800 flex items-center justify-center shadow-inner border border-espresso-700/80 shrink-0">
                                    <span className="text-[18px]">✨</span>
                                </div>
                                <div className="flex-1">
                                    <div className="text-[11px] font-black text-amber-500 uppercase tracking-[0.15em] mb-0.5">{t('store_review.badge_ai', 'AI Summary')}</div>
                                    <h5 className="font-bold text-white text-[16px] leading-tight font-serif tracking-tight">{t('store_review.title_ai_summary', '방문자 리뷰 요약')}</h5>
                                </div>
                            </div>
                            {!aiSummary && (
                                <button 
                                    onClick={handleGenerateAiSummary}
                                    disabled={isGeneratingSummary}
                                    className="shrink-0 whitespace-nowrap bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-espresso-950 text-[13px] font-bold px-4 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-70 flex items-center justify-center gap-1.5 min-w-[100px]"
                                >
                                    {isGeneratingSummary ? (
                                        <span className="flex items-center gap-1.5"><span className="animate-spin text-[14px]">↻</span>{t('store_review.lbl_analyzing', '분석 중...')}</span>
                                    ) : (
                                        <span className="flex items-center gap-1.5"><span className="text-[14px]">🪄</span>{t('store_review.lbl_view_summary', '요약 보기')}</span>
                                    )}
                                </button>
                            )}
                        </div>
                        
                        {aiSummary ? (
                            <div className="relative z-10 bg-espresso-950/70 p-5 rounded-xl border border-espresso-800/80 mt-1 shadow-inner">
                                <p className="text-white text-[15px] leading-[1.8] break-keep font-medium whitespace-pre-line">
                                    {aiSummary}
                                </p>
                            </div>
                        ) : (
                            <div className="relative z-10 bg-espresso-950/50 p-4 rounded-xl border border-espresso-800/80 mt-1 border-dashed">
                                <p className="text-espresso-300 text-[13px] font-medium leading-relaxed break-keep text-center">
                                    {t('store_review.ai_desc', '방문자 리뷰가 3개 이상 모이면 AI가 핵심 내용만 추출하여 요약해 드립니다.')}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {reviews.length > 0 && averageRatings && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <h5 className="font-bold text-espresso-50 text-[16px]">{t('store_review.title_good_points', '이런 점이 좋았어요')}</h5>
                            <span className="text-espresso-300 text-[13px]">{t('store_review.lbl_participants', '✓ {{count}}명 참여', {count: reviews.length})}</span>
                        </div>
                        <div className="space-y-2.5">
                            {ratingSummaryItems.map((item, idx) => (
                                <div key={item.key} className="flex items-center gap-3">
                                    <div className="flex-1 relative h-10 rounded-xl bg-espresso-950/50 overflow-hidden flex items-center">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(item.value / 5) * 100}%` }}
                                            transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
                                            className={`absolute top-0 left-0 h-full ${item.color} rounded-r-xl`}
                                        />
                                        <div className="relative z-10 font-bold text-espresso-50 text-[14px] px-3 flex items-center gap-2 w-full">
                                            <span>{item.icon}</span>
                                            <span>{item.label}</span>
                                        </div>
                                    </div>
                                    <div className="w-10 text-right font-bold text-espresso-200 text-[15px]">
                                        {item.value.toFixed(1)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {reviews.length === 0 ? (
                    <div className="bg-espresso-950 p-6 rounded-2xl text-center">
                        <MessageSquare size={32} className="mx-auto text-coffee-300 mb-3" />
                        <p className="text-espresso-300 text-[14px] font-medium" dangerouslySetInnerHTML={{ __html: t('store_review.empty_reviews', '아직 등록된 리뷰가 없습니다.<br />첫 번째 리뷰를 남겨주세요!') }}></p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reviews.map(review => (
                            <div key={review.id} className="bg-espresso-900 border border-coffee-100 rounded-xl px-4 py-3 shadow-sm relative">
                                <div className="flex justify-between items-start mb-1.5">
                                    <div className="flex items-center gap-2.5">
                                        <img
                                            src={review.user?.profileImageUrl ? (review.user.profileImageUrl.startsWith('http') ? review.user.profileImageUrl : `${API_BASE}${review.user.profileImageUrl}`) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.user?.nickname || 'Guest'}`}
                                            alt="profile"
                                            className="w-8 h-8 rounded-full border border-espresso-700 bg-espresso-950"
                                        />
                                        <div>
                                            <div className="font-bold text-espresso-50 text-[13px]">{review.user?.nickname || t('store_review.unknown_user', '알 수 없음')}</div>
                                            {review.earnedBeans > 0 && (
                                                <div className="inline-flex items-center gap-0.5 mt-0.5 mb-0.5 bg-amber-50 text-amber-600 font-bold px-1.5 py-0.5 rounded border border-amber-200/50 text-[10px]">
                                                    ☕ {review.earnedBeans}
                                                </div>
                                            )}
                                            <div className="text-[10px] text-coffee-400 font-mono">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </div>
                                            {/* Reward button for shop owner */}
                                            {shopOwnerId && localStorage.getItem('user') && JSON.parse(localStorage.getItem('user') || '{}').id === shopOwnerId && review.userId !== shopOwnerId && (
                                                <button
                                                    onClick={() => handleRewardClick(review.userId, review.user?.nickname || '알 수 없음', review.id)}
                                                    className="mt-0.5 text-[10px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors border border-amber-500/20"
                                                >
                                                    <Gift size={10} />{t('store_review.btn_reward', '보상')}</button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                                            <Star fill="#d97706" className="text-amber-500 w-3.5 h-3.5" />
                                            <span className="font-bold text-amber-900 text-[13px]">{review.overall ? review.overall.toFixed(1) : '5.0'}</span>
                                        </div>
                                        {currentUserId === review.userId && (
                                            <div className="relative">
                                                <button 
                                                    onClick={() => setActiveReviewMenuId(activeReviewMenuId === review.id ? null : review.id)}
                                                    className="p-1 rounded-full text-espresso-300 hover:text-espresso-50 hover:bg-espresso-800 transition-colors"
                                                >
                                                    <MoreHorizontal size={14} />
                                                </button>
                                                {activeReviewMenuId === review.id && (
                                                    <div className="absolute right-0 top-6 w-28 bg-espresso-800 border border-espresso-600 rounded-xl shadow-xl py-1.5 z-50">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleEditReviewMode(review); }} 
                                                            className="w-full text-left px-3 py-1.5 text-xs font-medium text-espresso-100 hover:bg-espresso-700 flex items-center gap-2"
                                                        >
                                                            <Edit2 size={12} />수정하기
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteReview(review.id); }} 
                                                            className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-espresso-700 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={12} />삭제하기
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p className="text-espresso-100 text-[13px] leading-relaxed break-keep pr-8 pb-1.5">
                                    {review.content}
                                </p>
                                
                                <button 
                                    onClick={() => handleReportReview(review.id)}
                                    className="absolute bottom-3 right-4 text-[10px] text-espresso-100 hover:text-red-400 font-medium transition-colors"
                                >{t('store_review.btn_report', '신고')}</button>

                                {review.imageUrls && JSON.parse(review.imageUrls).length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto mt-3 pb-1 hide-scrollbar">
                                        {JSON.parse(review.imageUrls).map((img: string, idx: number, arr: string[]) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => setSelectedReviewGallery({ urls: arr, index: idx })}
                                                className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-coffee-100 flex items-center justify-center active:scale-95 transition-transform"
                                                style={{ WebkitTapHighlightColor: 'transparent' }}
                                            >
                                                <img src={img.startsWith('http') || img.startsWith('blob:') || img.startsWith('data:') ? img : `${API_BASE}${img}`} alt={t('store_review.img_alt_review', '리뷰 첨부 이미지')} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Reward Tier Selection Modal */}
            {showRewardModal && selectedRewardTarget && rewardTiers && (
                <div className="fixed inset-0 z-[100] bg-espresso-950/50 flex items-center justify-center p-4">
                    <div className="bg-espresso-900 rounded-2xl w-[90%] max-w-[320px] p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-espresso-50 text-[16px]">
                                {t('store_review.modal_reward_title', '{{name}}님에게 보상하기', {name: selectedRewardTarget.name})}
                            </h3>
                            <button onClick={() => setShowRewardModal(false)} className="text-espresso-200 p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-[13px] text-espresso-300 mb-5 leading-relaxed break-keep">
                            {t('store_review.modal_reward_desc', '매장에 유용한 평가를 남긴 고객에게 지급할 보상 등급을 선택해주세요.')}
                        </p>
                        
                        <div className="space-y-2 mb-4">
                            {[
                                { name: rewardTiers.rewardTier1Name, amount: rewardTiers.rewardTier1Amount },
                                { name: rewardTiers.rewardTier2Name, amount: rewardTiers.rewardTier2Amount },
                                { name: rewardTiers.rewardTier3Name, amount: rewardTiers.rewardTier3Amount }
                            ].map((tier, idx) => {
                                const translatedName = tier.name === '참여' ? t('store_review.tier1', '참여') : 
                                                       tier.name === '감사' ? t('store_review.tier2', '감사') : 
                                                       tier.name === '최고' ? t('store_review.tier3', '최고') : tier.name;
                                return (
                                <button
                                    key={idx}
                                    onClick={() => processReward(tier.amount, `${tier.name} 보상`)}
                                    className="w-full flex items-center justify-between p-3.5 border border-coffee-100 rounded-xl hover:bg-amber-50 active:bg-amber-100 transition-colors group"
                                >
                                    <span className="font-bold text-espresso-100 group-hover:text-amber-700 text-[14px]">{translatedName}</span>
                                    <span className="font-black text-amber-500 flex items-center gap-1"><Coffee size={14}/> {tier.amount}{t('store_review.modal_reward_unit', '콩')}</span>
                                </button>
                                );
                            })}
                        </div>
                        <p className="text-center text-[11px] text-espresso-200">{t('store_review.modal_reward_warning', '보상 시 사장님의 커피콩이 즉시 차감됩니다.')}</p>
                    </div>
                </div>
            )}
            
            {/* Fullscreen Review Image Gallery Overlay */}
            <AnimatePresence>
                {selectedReviewGallery && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-espresso-950/95 flex flex-col items-center justify-center p-4 backdrop-blur-xl"
                        onClick={() => setSelectedReviewGallery(null)}
                        onTouchStart={e => setTouchStart(e.targetTouches[0].clientX)}
                        onTouchMove={e => setTouchEnd(e.targetTouches[0].clientX)}
                        onTouchEnd={() => {
                            if (!touchStart || !touchEnd) return;
                            const distance = touchStart - touchEnd;
                            const isLeftSwipe = distance > 50;
                            const isRightSwipe = distance < -50;
                            if (isLeftSwipe) handleNextImage();
                            if (isRightSwipe) handlePrevImage();
                            setTouchStart(0);
                            setTouchEnd(0);
                        }}
                    >
                        <button 
                            className="absolute top-6 right-4 p-4 bg-black/50 text-white rounded-full active:scale-95 transition-transform z-[9999]"
                            onClick={(e) => { e.stopPropagation(); setSelectedReviewGallery(null); }}
                            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedReviewGallery(null); }}
                        >
                            <X size={28} />
                        </button>
                        
                        {/* Page Indicator */}
                        {selectedReviewGallery.urls.length > 1 && (
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-espresso-950/50 text-espresso-50 text-[12px] font-bold px-3 py-1.5 rounded-full z-[310]">
                                {selectedReviewGallery.index + 1} / {selectedReviewGallery.urls.length}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedReviewGallery.index}
                                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -50, scale: 0.95 }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full h-[85vh] flex justify-center items-center"
                            >
                                <TransformWrapper 
                                    initialScale={1} 
                                    minScale={1} 
                                    maxScale={4} 
                                    centerOnInit 
                                    panning={{ velocityDisabled: true }} 
                                    doubleClick={{ disabled: false, step: 2 }}
                                >
                                    <TransformComponent wrapperClass="!w-full !h-full !flex items-center justify-center cursor-zoom-in" contentClass="!w-full !h-full !flex items-center justify-center">
                                        <img 
                                            src={selectedReviewGallery.urls[selectedReviewGallery.index].startsWith('http') || selectedReviewGallery.urls[selectedReviewGallery.index].startsWith('blob:') || selectedReviewGallery.urls[selectedReviewGallery.index].startsWith('data:') ? selectedReviewGallery.urls[selectedReviewGallery.index] : `${API_BASE}${selectedReviewGallery.urls[selectedReviewGallery.index]}`} 
                                            alt={t('store_review.img_alt_original', '리뷰 이미지 원본 {{index}}', {index: selectedReviewGallery.index + 1})} 
                                            className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl cursor-zoom-in"
                                        />
                                    </TransformComponent>
                                </TransformWrapper>
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation Arrows */}
                        {selectedReviewGallery.urls.length > 1 && selectedReviewGallery.index > 0 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-espresso-900/10 rounded-full text-espresso-50 backdrop-blur-md z-[310] active:scale-90 transition-transform"
                            >
                                <ChevronLeft size={24} className="mr-0.5" />
                            </button>
                        )}
                        {selectedReviewGallery.urls.length > 1 && selectedReviewGallery.index < selectedReviewGallery.urls.length - 1 && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-espresso-900/10 rounded-full text-espresso-50 backdrop-blur-md z-[310] active:scale-90 transition-transform"
                            >
                                <ChevronRight size={24} className="ml-0.5" />
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
