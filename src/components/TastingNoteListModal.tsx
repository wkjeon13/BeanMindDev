import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, Coffee, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../utils/apiConfig';

interface TastingNote {
    id: string;
    coffeeName: string;
    brand: string | null;
    rawUserNote: string;
    aiTranslatedNote: string;
    acidity: number;
    sweetness: number;
    bitterness: number;
    body: number;
    aroma: number;
    flavorTags: string | null;
    imageUrl?: string | null;
    createdAt: string;
}

interface TastingNoteListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDataChanged: () => void;
}

export const TastingNoteListModal: React.FC<TastingNoteListModalProps> = ({ isOpen, onClose, onDataChanged }) => {
    const { t } = useTranslation();
    const [notes, setNotes] = useState<TastingNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNotes = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/ai-features/tasting-note`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotes(data);
            }
        } catch (error) {
            console.error("Failed to load tasting notes", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotes();
        }
    }, [isOpen]);

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('profile.confirm_note_delete', '정말로 이 테이스팅 노트를 삭제하시겠습니까?\n삭제 시 나의 커피 취향 점수도 재연산됩니다.'))) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/ai-features/tasting-note/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert(t('profile.note_deleted', '테이스팅 노트가 삭제되었습니다.'));
                fetchNotes();
                onDataChanged();
            } else {
                const err = await res.json();
                alert(err.error || t('profile.note_delete_failed', '삭제에 실패했습니다.'));
            }
        } catch (error) {
            console.error("Failed to delete tasting note", error);
            alert(t('profile.note_delete_error', '오류가 발생했습니다.'));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
            <div 
                className="absolute inset-0 z-0" 
                onClick={onClose}
            />
            
            <div className="relative z-10 w-full sm:w-[500px] h-full bg-[#111110] shadow-[auto_0_30px_60px_-15px_rgba(0,0,0,0.8)] border-l border-espresso-800/30 overflow-y-auto overflow-x-hidden flex flex-col transform transition-transform duration-300">
                {/* Header */}
                <div 
                    className="px-5 pb-4 flex items-center justify-between border-b border-espresso-800 bg-[#171716] sticky top-0 z-20"
                    style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 24px), 24px) + 8px)' }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-amber-500 font-serif font-bold text-lg pt-0.5" style={{ lineHeight: 1 }}>✨</span>
                        <span className="font-bold text-[15px] text-amber-500 tracking-tight">{t('profile.title_tasting_notes', '테이스팅 노트 목록')}</span>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-espresso-300 hover:text-white transition-colors p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-5 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-amber-900 border-t-amber-500 rounded-full animate-spin mb-4" />
                            <p className="text-espresso-300 text-sm">{t('profile.loading', '로딩 중...')}</p>
                        </div>
                    ) : notes.length > 0 ? (
                        <div className="space-y-4">
                            {notes.map((note) => (
                                <div 
                                    key={note.id} 
                                    className="bg-espresso-950/40 border border-espresso-800/40 p-4 rounded-xl relative shadow-md"
                                >
                                    {/* Action Row */}
                                    <button 
                                        onClick={() => handleDelete(note.id)}
                                        className="absolute top-4 right-4 text-espresso-400 hover:text-red-500 transition-colors p-1"
                                        title={t('profile.delete_note', '삭제')}
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    {/* Note Image */}
                                    {note.imageUrl && (
                                        <div className="w-full h-40 rounded-lg overflow-hidden mb-3 border border-espresso-800/30">
                                            <img 
                                                src={note.imageUrl.startsWith('http') ? note.imageUrl : `${API_BASE}${note.imageUrl}`} 
                                                className="w-full h-full object-cover" 
                                                alt={note.coffeeName} 
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Date & Title */}
                                    <div className="flex items-center gap-1.5 text-xs text-espresso-400 mb-2">
                                        <Calendar size={12} />
                                        <span>{new Date(note.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500">
                                            <Coffee size={14} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm">{note.coffeeName}</h3>
                                            {note.brand && <p className="text-xs text-espresso-300">{note.brand}</p>}
                                        </div>
                                    </div>

                                    {/* Notes Content */}
                                    <div className="space-y-3 mb-4">
                                        {/* User Note */}
                                        <div className="bg-[#171716] p-3 rounded-lg border border-espresso-800/20">
                                            <div className="text-[10px] font-bold text-espresso-400 mb-1">{t('profile.lbl_my_note', '작성한 노트')}</div>
                                            <p className="text-xs text-espresso-200 leading-relaxed whitespace-pre-wrap">{note.rawUserNote}</p>
                                        </div>

                                        {/* AI Note */}
                                        <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 mb-1">
                                                <Sparkles size={10} />
                                                <span>{t('profile.lbl_ai_note', 'AI 소믈리에 테이스팅')}</span>
                                            </div>
                                            <p className="text-xs text-amber-100 leading-relaxed whitespace-pre-wrap">{note.aiTranslatedNote}</p>
                                        </div>
                                    </div>

                                    {/* Flavor Scores */}
                                    <div className="grid grid-cols-5 gap-1 text-center py-2 border-t border-b border-espresso-800/30 mb-3 bg-black/20 rounded-lg">
                                        {[
                                            { name: t('profile.radar_acidity_short', '산미'), val: note.acidity },
                                            { name: t('profile.radar_sweetness_short', '단맛'), val: note.sweetness },
                                            { name: t('profile.radar_bitterness_short', '쓴맛'), val: note.bitterness },
                                            { name: t('profile.radar_body_short', '바디'), val: note.body },
                                            { name: t('profile.radar_aroma_short', '향미'), val: note.aroma }
                                        ].map((flavor, index) => (
                                            <div key={index} className="flex flex-col">
                                                <span className="text-[9px] text-espresso-400 font-bold">{flavor.name}</span>
                                                <span className="text-xs font-extrabold text-amber-500 mt-0.5">{flavor.val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Flavor Tags */}
                                    {note.flavorTags && (
                                        <div className="flex flex-wrap gap-1">
                                            {note.flavorTags.split(',').map((tag, i) => (
                                                <span 
                                                    key={i} 
                                                    className="px-2 py-0.5 bg-white/5 border border-white/10 text-gray-300 rounded text-[9px]"
                                                >
                                                    #{tag.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-espresso-300 text-sm opacity-75">
                            {t('profile.no_tasting_notes', '기록된 테이스팅 노트가 없습니다.')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
