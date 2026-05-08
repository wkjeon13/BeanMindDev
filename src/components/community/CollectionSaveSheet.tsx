import React, { useState, useEffect } from 'react';
import { X, Plus, Folder, Check, Bookmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../utils/apiConfig';

interface Collection {
    id: string;
    name: string;
    isPublic: boolean;
    _count: { items: number };
    items: any[];
}

interface CollectionSaveSheetProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
    onSaveStateChange?: (postId: string, isSaved: boolean) => void;
}

export default function CollectionSaveSheet({ isOpen, onClose, postId, onSaveStateChange }: CollectionSaveSheetProps) {
  const { t } = useTranslation(['translation']);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [savedCollectionIds, setSavedCollectionIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchCollections();
        } else {
            setIsCreating(false);
            setNewCollectionName('');
        }
    }, [isOpen]);

    const fetchCollections = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/users/collections`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setCollections(data);
                // Check which collections already have this post
                const savedIds = new Set<string>();
                data.forEach((col: Collection) => {
                    if (col.items.some((item: any) => item.post?.id === postId)) {
                        savedIds.add(col.id);
                    }
                });
                setSavedCollectionIds(savedIds);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollectionName.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/users/collections`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newCollectionName.trim(), isPublic: true })
            });
            
            if (res.ok) {
                const newCol = await res.json();
                setNewCollectionName('');
                setIsCreating(false);
                // Immediately add the post to the newly created collection
                await toggleSaveToCollection(newCol.id, false);
                await fetchCollections(); // Refresh list
            }
        } catch (error) {
            console.error('Error creating collection:', error);
        }
    };

    const toggleSaveToCollection = async (collectionId: string, isAlreadySaved: boolean) => {
        try {
            const token = localStorage.getItem('token');
            const method = isAlreadySaved ? 'DELETE' : 'POST';
            const url = isAlreadySaved 
                ? `${API_BASE}/api/users/collections/${collectionId}/items/${postId}`
                : `${API_BASE}/api/users/collections/${collectionId}/items`;

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: isAlreadySaved ? null : JSON.stringify({ postId })
            });

            if (res.ok) {
                setSavedCollectionIds(prev => {
                    const newSet = new Set(prev);
                    if (isAlreadySaved) {
                        newSet.delete(collectionId);
                    } else {
                        newSet.add(collectionId);
                    }
                    if (onSaveStateChange) {
                        onSaveStateChange(postId, newSet.size > 0);
                    }
                    return newSet;
                });
                fetchCollections(); // Update item counts quietly
            }
        } catch (error) {
            console.error('Error toggling save:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-espresso-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="bg-espresso-950 w-full max-w-lg sm:rounded-3xl rounded-t-2xl border border-espresso-700 flex flex-col h-[70vh] sm:h-auto sm:max-h-[85vh] relative z-10 animate-in slide-in-from-bottom-full duration-200">
                <div className="flex items-center justify-between p-4 border-b border-espresso-700/80">
                    <h2 className="text-lg font-bold text-espresso-50 tracking-tight flex items-center gap-2">
                        <Bookmark size={20} className="text-amber-500" />{t('community_collections.title_save', '컬렉션에 저장')}</h2>
                    <button onClick={onClose} className="p-2 text-espresso-200 hover:text-espresso-50 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32 text-espresso-300 text-sm">{t('community_collections.loading', '로딩 중...')}</div>
                    ) : (
                        <>
                            {collections.length === 0 && !isCreating && (
                                <div className="text-center py-8 text-espresso-300">
                                    <Folder size={48} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">{t('community_collections.no_collections', '아직 컬렉션이 없습니다.')}</p>
                                    <p className="text-xs mt-1">{t('community_collections.no_col_desc', '마음에 드는 리뷰를 주제별로 모아보세요!')}</p>
                                </div>
                            )}

                            {collections.map(col => {
                                const isSaved = savedCollectionIds.has(col.id);
                                return (
                                    <button 
                                        key={col.id}
                                        onClick={() => toggleSaveToCollection(col.id, isSaved)}
                                        className="w-full flex items-center gap-4 p-3 rounded-2xl border border-espresso-700/80 hover:bg-espresso-800/40 transition-colors text-left group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-espresso-800 flex items-center justify-center shrink-0 overflow-hidden">
                                            {col.items && col.items.length > 0 && col.items[0].post?.image ? (
                                                 <img src={(() => {
                                                     let img = col.items[0].post?.image;
                                                     try {
                                                         const parsed = JSON.parse(img);
                                                         if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
                                                     } catch(e) {}
                                                     return img.startsWith('http') ? img : `${API_BASE}${img}`;
                                                 })()} className="w-full h-full object-cover" />
                                            ) : (
                                                 <Folder size={20} className="text-espresso-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-[15px] font-bold text-espresso-50">{col.name}</h3>
                                            <p className="text-[12px] text-espresso-300">{t('community_collections.item_count', '항목 {{count}}개', {count: col._count.items})} {col.isPublic ? t('community_collections.lbl_public', '· 공개') : t('community_collections.lbl_private', '· 비공개')}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSaved ? 'bg-amber-500 border-amber-500 text-espresso-50' : 'border-espresso-600 text-transparent group-hover:border-zinc-500'}`}>
                                            <Check size={14} className={isSaved ? 'opacity-100' : 'opacity-0'} />
                                        </div>
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-espresso-700/80 bg-espresso-900/50 rounded-b-3xl shrink-0">
                    {isCreating ? (
                        <form onSubmit={handleCreateCollection} className="flex gap-2">
                            <input 
                                autoFocus
                                type="text"
                                placeholder={t('community_collections.ph_new_name', '새 컬렉션 이름')}
                                value={newCollectionName}
                                onChange={e => setNewCollectionName(e.target.value)}
                                className="flex-1 bg-espresso-950 border border-espresso-600 rounded-xl px-4 py-3 text-sm text-espresso-50 placeholder:text-espresso-300 focus:outline-none focus:border-amber-500"
                            />
                            <button 
                                type="submit"
                                disabled={!newCollectionName.trim()}
                                className="px-5 font-bold text-espresso-50 bg-amber-500 rounded-xl hover:bg-amber-400 disabled:opacity-50 disabled:bg-espresso-800 flex items-center justify-center transition-colors"
                            >{t('community_collections.btn_create', '생성')}</button>
                        </form>
                    ) : (
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="w-full py-3.5 flex items-center justify-center gap-2 text-[14px] font-bold text-espresso-100 bg-espresso-800 rounded-xl hover:bg-espresso-700 transition-colors"
                        >
                            <Plus size={18} /> 새 컬렉션 만들기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
