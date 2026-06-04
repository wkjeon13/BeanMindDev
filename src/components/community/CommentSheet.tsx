import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, MessageCircle, MoreHorizontal, Edit2, Trash2, Image as ImageIcon, Info, Pin, Gift, Coffee, MapPin, Heart, Bookmark, Star, ChevronLeft, ChevronRight, Smile } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../utils/apiConfig';
import MediaRenderer from './MediaRenderer';
import { useTranslation } from 'react-i18next';
import EmojiPicker from 'emoji-picker-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion, AnimatePresence } from 'motion/react';
import { formatRelativeTime } from '../../utils/dateFormatter';

interface CommentReaction {
    id: string;
    emoji: string;
    userId: string;
}

interface Comment {
    id: string;
    content: string;
    imageUrl?: string;
    createdAt: string;
    author: {
        id: string;
        nickname: string;
        profileImageUrl: string | null;
        role: string;
    };
    earnedBeans: number;
    isPinned?: boolean;
    post?: {
        authorId: string;
    };
    reactions?: CommentReaction[];
    replies?: Comment[];
}

interface ReplyTo {
    parentId: string;
    authorName: string;
}

interface RewardTiers {
    rewardTier1Name: string;
    rewardTier1Amount: number;
    rewardTier2Name: string;
    rewardTier2Amount: number;
    rewardTier3Name: string;
    rewardTier3Amount: number;
}

interface CommentSheetProps {
    postId: string;
    isOpen: boolean;
    onClose: () => void;
    post?: any;
    isInline?: boolean;
    isEmbedded?: boolean;
    isLiked?: boolean;
    isBookmarked?: boolean;
    onLike?: () => void;
    onBookmark?: () => void;
    onShare?: () => void;
    onCommentCountChange?: (postId: string, newCount: number) => void;
}

const renderWithLinks = (text: string | undefined): React.ReactNode => {
    if (!text) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a 
                    key={i} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:text-amber-400 underline transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

interface ParsedBgm {
    title: string;
    videoId: string;
}

const parseBgmFromContent = (content: string | undefined): { cleanContent: string; bgm: ParsedBgm | null } => {
    if (!content) return { cleanContent: '', bgm: null };
    
    // 1. Try to parse normal HTML comment BGM
    const bgmRegex = /<!--BM_BGM:([\s\S]*?)-->/;
    const match = content.match(bgmRegex);
    if (match && match[1]) {
        try {
            const bgm = JSON.parse(match[1]) as ParsedBgm;
            const cleanContent = content.replace(bgmRegex, '').trim();
            return { cleanContent, bgm };
        } catch (e) {
            console.error('BGM parse error (normal):', e);
        }
    }
    
    // 2. Try to parse HTML entity BGM
    const entityRegex = /&lt;!--BM_BGM:([\s\S]*?)--&gt;/;
    const matchEntity = content.match(entityRegex);
    if (matchEntity && matchEntity[1]) {
        try {
            const decodedJsonStr = matchEntity[1]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'");
            const bgm = JSON.parse(decodedJsonStr) as ParsedBgm;
            const cleanContent = content.replace(entityRegex, '').trim();
            return { cleanContent, bgm };
        } catch (e) {
            console.error('BGM parse error (entity):', e);
        }
    }
    
    return { cleanContent: content, bgm: null };
};

export default function CommentSheet({ postId, isOpen, onClose, post, isInline, isEmbedded, isLiked, isBookmarked, onLike, onBookmark, onShare, onCommentCountChange }: CommentSheetProps) {
  const { t } = useTranslation(['translation']);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
    const [fullImageState, setFullImageState] = useState<{urls: string[], currentIndex: number} | null>(null);
    const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
    const [activePickerId, setActivePickerId] = useState<string | null>(null);
    const [showEmojiGuide, setShowEmojiGuide] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [rewardTiers, setRewardTiers] = useState<RewardTiers | null>(null);
    const [showRewardModal, setShowRewardModal] = useState(false);
        const [selectedRewardTarget, setSelectedRewardTarget] = useState<{ id: string, name: string, entityId: string } | null>(null);
    const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [showRootInput, setShowRootInput] = useState(false);

    
    // Derived state for current user to show active reactions and pin permissions
    const userStr = localStorage.getItem('user');
    let currentUserId = '';
    let currentUserRole = '';
    let currentUserProfileImageUrl = '';
    try {
        if (userStr) {
            const u = JSON.parse(userStr);
            currentUserId = u.id || '';
            currentUserRole = u.role || '';
            let rawUrl = u.profileImageUrl || '';
            if (rawUrl) {
                if (rawUrl.includes('/uploads/')) {
                    // Extract relative path to ignore stale hardcoded hosts in localStorage
                    const uploadPath = rawUrl.substring(rawUrl.indexOf('/uploads/'));
                    currentUserProfileImageUrl = `${API_BASE}${uploadPath}`;
                } else if (rawUrl.startsWith('http')) {
                    currentUserProfileImageUrl = rawUrl;
                } else {
                    currentUserProfileImageUrl = `${API_BASE}${rawUrl}`;
                }
            }
        }
    } catch (e) {}

    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const isFirstLoadRef = useRef(true);
    const onCommentCountChangeRef = useRef(onCommentCountChange);

    useEffect(() => {
        onCommentCountChangeRef.current = onCommentCountChange;
    }, [onCommentCountChange]);

    useEffect(() => {
        const handleClickOutside = () => setActivePickerId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Fetch comments when sheet opens
    useEffect(() => {
        if (!isOpen) {
            isFirstLoadRef.current = true;
            return;
        }

        const fetchComments = async () => {
            setIsLoading(true);
            try {
                const url = `${API_BASE}/api/community/posts/${postId}/comments`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setComments(data);
                }
            } catch (error) {
                console.error("Failed to fetch comments", error);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchRewardTiers = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await fetch(`${API_BASE}/api/users/reward-tiers`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        setRewardTiers(await res.json());
                    }
                } catch (e) {
                    console.error('Failed to fetch tiers', e);
                }
            }
        };

        fetchComments();
        fetchRewardTiers();
    }, [postId, isOpen]);

    useEffect(() => {
        // 비동기 댓글 로딩이 진행 중인 경우에는 부모 연동을 건너뜁니다.
        if (isLoading) return;
        
        // 최초 마운트 후 첫 댓글 로드 완료 시점에는 
        // 부모의 기존 댓글수를 무작정 덮어쓰는 행위를 완벽히 스킵(보호)합니다.
        if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false;
            return;
        }

        if (onCommentCountChangeRef.current) {
            onCommentCountChangeRef.current(postId, comments.length);
        }
    }, [comments.length, postId, isLoading]);

    const removeImage = (index: number) => {
        setImagePreviews(prev => {
            const newPreviews = [...prev];
            const removedUrl = newPreviews[index];
            newPreviews.splice(index, 1);
            
            // if it was an existing url, remove it from existingImageUrls too
            if (removedUrl.startsWith('http') || removedUrl.startsWith('/uploads/')) {
                setExistingImageUrls(ex => ex.filter(url => url !== removedUrl));
            } else {
                // it was a local file, find local file index (which is index - existingImageUrls.length basically)
                const localIndex = index - existingImageUrls.length;
                if (localIndex >= 0) {
                    setImageFiles(f => f.filter((_, i) => i !== localIndex));
                }
            }
            return newPreviews;
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const remaining = 10 - imageFiles.length;
            const filesToAdd = files.slice(0, remaining);
            
            setImageFiles(prev => [...prev, ...filesToAdd]);
            const newPreviews = filesToAdd.map(f => URL.createObjectURL(f));
            setImagePreviews(prev => [...prev, ...newPreviews]);
            
            if (files.length > remaining) {
                alert(t('community_comments.alert_file_limit', '최대 10개의 사진/동영상만 첨부할 수 있습니다.'));
            }
        }
        // clear input value so same files can be re-selected if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    
    const handleEditCommentMode = (comment: Comment) => {
        setNewComment(comment.content);
        setEditingCommentId(comment.id);
        setActiveCommentMenuId(null);
        setReplyingTo(null);
        
        let loaded: string[] = [];
        if (comment.imageUrl) {
            try {
                loaded = JSON.parse(comment.imageUrl);
            } catch(e) {
                if (comment.imageUrl.startsWith('[')) {
                   loaded = [];
                } else {
                   loaded = [comment.imageUrl]; // old format fallback
                }
            }
        }
        setExistingImageUrls(loaded);
        setImagePreviews(loaded);
        setImageFiles([]); // Reset local files
        
        // Focus the input
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleDeleteComment = async (commentId: string) => {
        setActiveCommentMenuId(null);
        if (!window.confirm(t('community_comments.alert_delete_confirm', '정말 이 댓글을 삭제하시겠습니까?'))) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/community/comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                // Remove from local state
                const filterReplies = (commentsList: Comment[]): Comment[] => {
                    return commentsList.filter(c => c.id !== commentId).map(c => ({
                        ...c,
                        replies: c.replies ? filterReplies(c.replies) : []
                    }));
                };
                setComments(prev => filterReplies(prev));
            } else {
                alert(t('community_comments.alert_delete_fail', '삭제에 실패했습니다.'));
            }
        } catch (e) {
            console.error('Delete error', e);
            alert(t('community_comments.alert_error', '오류가 발생했습니다.'));
        }
    };

    const handleAdminDeleteComment = async (commentId: string) => {
        setActiveCommentMenuId(null);
        let reason = window.prompt("⚠️ 관리자 권한으로 삭제합니다.\n\n해당 댓글을 삭제하는 사유를 입력해주세요. 입력된 사유는 즉시 작성자에게 메일로 발송됩니다.");
        if (reason === null) return;
        if (!reason.trim()) {
            alert("삭제 사유를 반드시 입력해야 합니다.");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/admin/content/delete`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type: 'COMMENT', id: commentId, reason: reason.trim() })
            });

            if (res.ok) {
                const filterReplies = (commentsList: Comment[]): Comment[] => {
                    return commentsList.filter(c => c.id !== commentId).map(c => ({
                        ...c,
                        replies: c.replies ? filterReplies(c.replies) : []
                    }));
                };
                setComments(prev => filterReplies(prev));
                alert("삭제 및 알림 발송이 완료되었습니다.");
            } else {
                const err = await res.json();
                alert(err.error || "관리자 삭제에 실패했습니다.");
            }
        } catch (e) {
            console.error('Admin Delete error', e);
            alert("오류가 발생했습니다.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() && imageFiles.length === 0) return;
        setShowEmojiPicker(false);

        const token = localStorage.getItem('token');
        if (!token) {
            if (window.confirm(t('community_comments.alert_login', '로그인이 필요한 서비스입니다. 로그인 화면으로 이동하시겠습니까?'))) {
                onClose();
                navigate('/profile');
            }
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingCommentId) {
                // UPDATE logic
                const formData = new FormData();
                if (newComment.trim()) formData.append('content', newComment);
                if (existingImageUrls.length > 0) formData.append('existingImages', JSON.stringify(existingImageUrls));
                imageFiles.forEach(file => formData.append('images', file));

                const res = await fetch(`${API_BASE}/api/community/comments/${editingCommentId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (res.ok) {
                    const updatedComment = await res.json();
                    
                    const updateInList = (commentsList: Comment[]): Comment[] => {
                        return commentsList.map(c => {
                            if (c.id === editingCommentId) return { ...c, content: updatedComment.content, imageUrl: updatedComment.imageUrl, updatedAt: updatedComment.updatedAt };
                            if (c.replies) return { ...c, replies: updateInList(c.replies) };
                            return c;
                        });
                    };
                    setComments(prev => updateInList(prev));
                    setNewComment('');
                    setEditingCommentId(null);
                    setExistingImageUrls([]);
                    setImageFiles([]);
                    setImagePreviews([]);
                } else {
                    const errData = await res.json().catch(() => ({}));
                    let errMsg = errData.error || t('community_comments.alert_edit_fail', '수정에 실패했습니다.');
                    if (errMsg === 'ERR_INVALID_TOKEN' || errMsg === 'ERR_UNAUTHORIZED') errMsg = '로그인 세션이 만료되었습니다. 다시 로그인해주세요.';
                    alert(errMsg);
                }
            } else {
                // CREATE logic
                const formData = new FormData();
                if (newComment.trim()) formData.append('content', newComment);
                
                if (replyingTo) {
                    formData.append('parentId', replyingTo.parentId);
                }
                
                imageFiles.forEach(file => formData.append('images', file));

                const url = `${API_BASE}/api/community/posts/${postId}/comments`;

                const res = await fetch(url, {
                    method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                const addedComment = await res.json();
                
                if (replyingTo) {
                    setComments(prev => prev.map(c => 
                        c.id === replyingTo.parentId 
                            ? { ...c, replies: [...(c.replies || []), addedComment] }
                            : c
                    ));
                } else {
                    setComments(prev => [...prev, addedComment]);
                }
                
                setNewComment('');
                setImageFiles([]);
                setImagePreviews([]);
                setReplyingTo(null);
                setEditingCommentId(null);
                setShowRootInput(false);
                // Scroll to bottom could be added here
            } else {
                const errData = await res.json().catch(() => ({}));
                let errMsg = errData.error || t('community_comments.alert_post_fail', '댓글 작성에 실패했습니다.');
                if (errMsg === 'ERR_INVALID_TOKEN' || errMsg === 'ERR_UNAUTHORIZED') errMsg = '로그인 세션이 만료되었습니다. 다시 로그인해주세요.';
                alert(errMsg);
            }
            }
        } catch (error) {
            console.error('Failed to post comment', error);
            alert(t('community_comments.alert_error', '오류가 발생했습니다.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReaction = async (commentId: string, emoji: string, isReply = false, parentId?: string) => {
        setActivePickerId(null);
        const token = localStorage.getItem('token');
        if (!token) return navigate('/profile');

        try {
            const res = await fetch(`${API_BASE}/api/community/comments/${commentId}/reactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ emoji })
            });

            if (res.ok) {
                const { action } = await res.json();
                const userId = localStorage.getItem('userId') || ''; // Need user ID to update local state perfectly, or we just re-fetch. Let's do a quick re-fetch of the specific post comments for total accuracy, or optimistic update.
                // For simplicity across nested updates, re-fetching is safest to get true server state of reactions.
                const fetchRes = await fetch(`${API_BASE}/api/community/posts/${postId}/comments`);
                if (fetchRes.ok) {
                    const data = await fetchRes.json();
                    setComments(data);
                }
            }
        } catch (error) {
            console.error('Failed to toggle reaction', error);
        }
    };

    const handlePin = async (commentId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/profile');

        try {
            const res = await fetch(`${API_BASE}/api/community/comments/${commentId}/pin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const fetchRes = await fetch(`${API_BASE}/api/community/posts/${postId}/comments`);
                if (fetchRes.ok) {
                    const data = await fetchRes.json();
                    setComments(data);
                }
            } else {
                const errData = await res.json();
                alert(errData.error || t('community_comments.alert_pin_fail', '고정 처리에 실패했습니다.'));
            }
        } catch (error) {
            console.error('Failed to pin comment', error);
            alert(t('community_comments.alert_error', '오류가 발생했습니다.'));
        }
    };

    const handleReportComment = async (commentId: string) => {
        const reason = window.prompt("신고 사유를 간단히 입력해주세요.\n('음란물', '불법', '범죄' 등의 키워드 포함 시 즉시 블라인드 처리될 수 있습니다.)");
        if (reason === null) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/community/comments/${commentId}/report`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason.trim() || '유저 자발적 신고' })
            });
            if (res.ok) {
                const data = await res.json();
                alert('신고가 접수되었습니다.');
                if (data.isHidden) {
                    const fetchRes = await fetch(`${API_BASE}/api/community/posts/${postId}/comments`);
                    if (fetchRes.ok) {
                        const updatedData = await fetchRes.json();
                        setComments(updatedData);
                    }
                }
            } else {
                const err = await res.json();
                alert(err.error || '신고 처리에 실패했습니다.');
            }
        } catch(e) { console.error('Report failed', e); }
        setActiveCommentMenuId(null);
    };

    const handleRewardClick = (targetId: string, authorName: string, entityId: string) => {
        setSelectedRewardTarget({ id: targetId, name: authorName, entityId });
        setShowRewardModal(true);
    };

    const processReward = async (amount: number, description: string) => {
        if (!selectedRewardTarget) return;
        
        const token = localStorage.getItem('token');
        if (!token) return navigate('/profile');

        setIsLoading(true);
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
                    targetType: 'COMMENT',
                    targetEntityId: selectedRewardTarget.entityId
                })
            });

            if (res.ok) {
                alert(t('community_comments.alert_reward_ok', '{{name}}님에게 커피콩 선물을 완료했습니다! ☕🎁', {name: selectedRewardTarget.name}));
                setShowRewardModal(false);
                setSelectedRewardTarget(null);
                const fetchRes = await fetch(`${API_BASE}/api/community/posts/${postId}/comments`);
                if (fetchRes.ok) {
                    const data = await fetchRes.json();
                    setComments(data);
                }
            } else {
                const errData = await res.json();
                let errMsg = errData.error || t('community_comments.alert_reward_fail', '선물에 실패했습니다.');
                if (errData.error?.startsWith('ERR_')) errMsg = t(`api_error.${errData.error}`);
                alert(errMsg);
            }
        } catch (error) {
            console.error('Failed to reward', error);
            alert(t('community_comments.alert_error', '오류가 발생했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    const renderReactionPicker = (comment: Comment, isReply = false, parentId?: string) => {
        const reactions = comment.reactions || [];
        const totalCount = reactions.length;
        const userReaction = reactions.find(r => r.userId === currentUserId);
        
        return (
            <div className="flex flex-col items-center justify-center mt-1 w-8">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleReaction(comment.id, '❤️', isReply, parentId);
                    }}
                    className="p-1.5 rounded-full text-espresso-400 hover:text-red-500 transition-transform active:scale-75"
                >
                    <Heart size={14} className={userReaction ? "fill-red-500 text-red-500" : ""} />
                </button>
                {totalCount > 0 && <span className="text-[11px] text-espresso-400 font-medium -mt-1">{totalCount}</span>}
            </div>
        );
    };

    if (!isOpen) return null;

    const handleReplyClick = (commentId: string, authorName: string) => {
        setReplyingTo({ parentId: commentId, authorName });
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    const renderInputArea = (isInline = false, placeholderText = "Add a reply...") => {
        if (isInline) {
            return (
                <div className="mt-2 mb-2 pl-4 flex items-center gap-2 relative z-20">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-espresso-800 shrink-0 border border-espresso-700 shadow-sm">
                        <img src={currentUserProfileImageUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80'} className="w-full h-full object-cover" />
                    </div>
                    <form onSubmit={handleSubmit} className="flex-1 flex items-center bg-espresso-900/60 border border-espresso-700/50 rounded-full px-3 py-1.5">
                         <input 
                            ref={inputRef as any} 
                            type="text" 
                            value={newComment} 
                            onChange={e=>setNewComment(e.target.value)} 
                            placeholder={placeholderText} 
                            className="flex-1 bg-transparent text-espresso-50 text-[13px] focus:outline-none placeholder:text-espresso-500"
                            onFocus={(e) => {
                                setTimeout(() => {
                                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 500);
                            }}
                        />
                         <button type="submit" disabled={!newComment.trim() || isSubmitting} className="text-amber-500 disabled:opacity-50"><Send size={14}/></button>
                    </form>
                </div>
            );
        }

        return (
            <div className="absolute bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-8 bg-gradient-to-t from-[#120a05] via-[#120a05]/80 to-transparent pointer-events-none">
                <div className="w-full max-w-lg pointer-events-auto flex flex-col gap-2 relative">
                    {replyingTo && (
                        <div className="flex items-center justify-between px-4 py-1.5 bg-espresso-900/80 backdrop-blur-md rounded-full text-[11px] text-espresso-200 self-start border border-espresso-700/50 shadow-lg absolute -top-8 left-2">
                            <span><strong className="text-espresso-50">{replyingTo.authorName}</strong>님에게 답글 남기는 중...</span>
                            <button onClick={() => setReplyingTo(null)} className="ml-2 hover:text-espresso-50"><X size={12} /></button>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full bg-espresso-800 border border-espresso-600 focus-within:border-amber-500/50 transition-colors rounded-full p-1.5 shadow-xl">
                        <input type="file" accept="image/*,video/*" multiple ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-espresso-800 shrink-0 ml-0.5 border border-espresso-700/50 shadow-inner">
                            <img src={currentUserProfileImageUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80'} className="w-full h-full object-cover" alt="My avatar" />
                        </div>
                        <input
                            ref={inputRef as any}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-1 min-w-0 bg-transparent text-espresso-50 text-[14px] px-2 focus:outline-none placeholder:text-espresso-500"
                            disabled={isSubmitting}
                            onFocus={(e) => {
                                setTimeout(() => {
                                    e.target.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                }, 500);
                            }}
                        />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 text-amber-500/80 hover:text-amber-400 p-1 transition-colors">
                            <ImageIcon size={18} />
                        </button>
                        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="shrink-0 text-amber-500/80 hover:text-amber-400 p-1 mr-1 transition-colors">
                            <Smile size={18} />
                        </button>
                        <button type="submit" disabled={isSubmitting || (!newComment.trim() && imageFiles.length === 0)} className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-[#120a05] shrink-0 disabled:opacity-50 transition-transform active:scale-95 shadow-md border border-amber-400/50">
                            <Send size={15} className="ml-0.5" />
                        </button>

                        {showEmojiPicker && (
                            <div className="absolute bottom-[110%] right-0 z-50 shadow-2xl rounded-xl overflow-hidden border border-espresso-700/80">
                                <EmojiPicker theme={"dark" as any} onEmojiClick={(e) => setNewComment(prev => prev + e.emoji)} />
                            </div>
                        )}
                    </form>
                    
                    {imagePreviews.length > 0 && (
                        <div className="absolute bottom-[110%] left-0 right-0 flex gap-2 overflow-x-auto no-scrollbar p-2 bg-espresso-950/80 backdrop-blur-xl rounded-2xl border border-espresso-700/50 shadow-xl">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-espresso-600 relative group">
                                    {preview.startsWith('data:video') || preview.includes('video') || preview.includes('mp4') ? (
                                        <video src={preview} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    )}
                                    <button onClick={() => removeImage(index)} type="button" className="absolute inset-0 bg-espresso-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-espresso-50">
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className={isEmbedded ? "w-full flex flex-col bg-transparent mt-1 relative" : (isInline ? "mt-3 w-full rounded-2xl overflow-hidden border border-espresso-700/50 flex flex-col bg-[#160d08]" : "fixed inset-0 z-[250] flex flex-col pointer-events-auto bg-[#120a05] overflow-hidden")}>
                
            <div className={`relative w-full flex flex-col flex-1 ${isEmbedded ? '' : (isInline ? 'bg-[#160d08] max-h-[50vh]' : 'bg-gradient-to-b from-[#1c120c] to-[#120a05] h-full w-full shadow-2xl pb-[max(env(safe-area-inset-bottom),16px)] animation-slide-up overflow-hidden')}`}>
                
                {/* Header */}
                {!isEmbedded && (
                    <div className={`relative flex items-center justify-center px-4 pb-3 border-b border-espresso-700/50 sticky top-0 bg-[#1c120c]/90 backdrop-blur-md z-10 ${isInline ? 'pt-3' : 'pt-[max(env(safe-area-inset-top,16px),16px)]'}`}>
                        <button onClick={onClose} className="absolute left-4 p-2 -ml-2 text-amber-500 hover:text-amber-400 transition-colors" style={{ top: isInline ? '50%' : 'calc(max(env(safe-area-inset-top,16px),16px) + 12px)', transform: isInline ? 'translateY(-50%)' : 'translateY(-50%)' }}>
                            {isInline ? <ChevronLeft size={16} className="-rotate-90" /> : <ChevronLeft size={24} />}
                        </button>
                        <h3 className="text-espresso-50 font-bold text-[16px]">{t('community_comments.title_count', 'Comments ({{count}})', {count: comments.length})}</h3>
                    </div>
                )}

                {/* Post Details Wrapper */}
                <div className={isEmbedded ? "" : "flex-1 overflow-y-auto pb-32"}>
                    {post && !isEmbedded && (
                        <div className="p-5 border-b border-espresso-700 bg-espresso-950">
                            {/* Author Info */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-espresso-600 shrink-0 bg-espresso-800">
                                    <img src={post.author.avatar || (post.author.profileImageUrl ? (post.author.profileImageUrl.startsWith('http') ? post.author.profileImageUrl : `${API_BASE}${post.author.profileImageUrl}`) : `https://api.dicebear.com/7.x/notionists/svg?seed=${post.author.id}`)} alt="avatar" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[14px] text-espresso-50 flex items-center gap-1">
                                        {post.author.name || post.author.nickname || 'Unknown'}
                                        {(post.author.name || post.author.nickname) === '로스터리 아카이브' && <Star size={12} className="text-amber-400 fill-amber-400" />}
                                    </h3>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {(post.author.badges || (post.author.role === 'OWNER' && post.author.stores && post.author.stores.length > 0 ? [post.author.stores[0].name.substring(0,6)] : (post.author.role === 'ADMIN' ? ['Admin'] : [])))?.map((badge: string, i: number) => (
                                        <span key={i} className="text-[10px] bg-espresso-800 text-amber-400 px-1.5 py-0.5 rounded border border-amber-900/30">
                                          {badge}
                                        </span>
                                      ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Media Carousel */}
                            {(() => {
                                let urls = [];
                                if (post.image) {
                                    try {
                                        const parsed = JSON.parse(post.image);
                                        urls = Array.isArray(parsed) ? parsed : [post.image];
                                    } catch(e) {
                                        urls = [post.image];
                                    }
                                }
                                if (urls.length > 0) {
                                    return (
                                        <div className="w-full flex overflow-x-auto snap-x snap-mandatory rounded-2xl mb-4 border border-espresso-700 bg-espresso-900 no-scrollbar relative">
                                            {urls.map((url: string, idx: number) => (
                                                <div key={idx} className="w-full shrink-0 snap-center relative aspect-[4/3]">
                                                    <MediaRenderer src={url} className="w-full h-full object-contain" autoPlay={true} />
                                                    {urls.length > 1 && (
                                                        <div className="absolute top-2 right-2 bg-espresso-950/60 text-espresso-50 text-[10px] px-2 py-0.5 rounded-full font-mono backdrop-blur-sm">
                                                            {idx + 1} / {urls.length}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Content */}
                            {(() => {
                                const { cleanContent, bgm } = parseBgmFromContent(post.content);
                                return (
                                    <div className="mb-4">
                                        <p className="text-[14px] leading-relaxed text-espresso-50 whitespace-pre-wrap">{renderWithLinks(cleanContent)}</p>
                                        {bgm && (
                                            <div className="mt-2 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg w-fit flex items-center gap-1.5 font-semibold">
                                                🎵 BGM: {bgm.title}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Geo Tag */}
                            {post.cafeName && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3 mb-4 shadow-sm w-full cursor-pointer hover:bg-amber-500/20 transition-colors"
                                     onClick={() => navigate('/map', { state: { targetLat: post.cafeLat, targetLng: post.cafeLng, targetName: post.cafeName } })}
                                >
                                    <div className="bg-amber-500/20 p-2 rounded-full shrink-0">
                                        <MapPin size={16} className="text-amber-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[12px] font-bold text-amber-500 leading-tight break-all whitespace-normal">{post.cafeName}</p>
                                        <p className="text-[10px] text-espresso-200 mt-0.5 whitespace-normal pr-2">{t('community_comments.lbl_view_map', '매장 위치 확인하기')}</p>
                                    </div>
                                </div>
                            )}

                            {/* Tasting Note */}
                            {post.tastingNote && (
                              <div className="bg-espresso-800/40 rounded-xl p-3 border border-espresso-600/50">
                                <p className="text-[11px] font-bold text-amber-500 mb-2 uppercase tracking-wide">Taster's Note</p>
                                <div className="space-y-1.5">
                                  {[
                                    { label: '산미 (Acidity)', val: post.tastingNote.acidity },
                                    { label: '단맛 (Sweetness)', val: post.tastingNote.sweetness },
                                    { label: '바디감 (Body)', val: post.tastingNote.body }
                                  ].map(item => (
                                    <div key={item.label} className="flex items-center gap-3 text-[11px]">
                                      <span className="w-24 text-espresso-200">{item.label}</span>
                                      <div className="flex-1 h-1.5 bg-espresso-800 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-amber-500 rounded-full" 
                                          style={{ width: `${(item.val / 5) * 100}%` }}
                                        />
                                      </div>
                                      <span className="w-7 text-right font-mono text-espresso-100">{item.val}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Bar */}
                            <div className="flex items-center justify-between mb-1 mt-4 px-1">
                              <div className="flex items-center gap-5">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onLike?.(); }}
                                  className="flex items-center gap-1.5 group transition-colors"
                                >
                                  <Heart 
                                    size={24} 
                                    className={`transition-all duration-300 ${isLiked ? 'fill-rose-500 text-rose-500 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'text-espresso-50 group-hover:text-rose-400'}`} 
                                  />
                                  <span className={`text-[14px] font-medium ${isLiked ? 'text-rose-500' : 'text-espresso-50'}`}>
                                    {post.likes}
                                  </span>
                                </button>
                                <button className="flex items-center gap-1.5 text-espresso-50 pointer-events-none">
                                  <MessageCircle size={22} />
                                  <span className="text-[14px] font-medium">{post.comments || comments.length}</span>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onShare?.(); }} className="flex items-center gap-1.5 text-espresso-50 hover:text-emerald-400 transition-colors">
                                  <Send size={22} className="-mt-0.5" />
                                </button>
                              </div>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onBookmark?.(); }} 
                                  className={`transition-colors ${isBookmarked ? 'text-amber-400' : 'text-espresso-50 hover:text-amber-400'}`}
                              >
                                <Bookmark size={24} className={isBookmarked ? 'fill-amber-400' : ''} />
                              </button>
                            </div>
                        </div>
                    )}

                {/* Root Comment Action for Embedded Mode */}
                {isEmbedded && !replyingTo && (
                    <div className="mb-2">
                        {showRootInput ? (
                            <div className="pt-2">
                                {renderInputArea(true, "Add a comment...")}
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 mt-1 mb-2 text-[12px] font-bold text-espresso-400">
                                <button 
                                    onClick={() => setShowRootInput(true)} 
                                    className="hover:text-amber-500 transition-colors text-amber-500/80"
                                >
                                    Reply
                                </button>
                            </div>
                        )}
                        <div className="border-t border-espresso-800/50 w-full" />
                    </div>
                )}

                {/* Comment List */}
                <div className={`py-2 space-y-5 relative ${isEmbedded ? 'pb-2' : 'px-5 min-h-[50vh] pb-32 pt-4'}`}>
                    {isLoading ? (
                        <p className="text-center text-espresso-300 py-10">{t('community_comments.loading', '댓글을 불러오는 중...')}</p>
                    ) : comments.length === 0 ? (
                        isEmbedded ? null : (
                            <div className="flex flex-col items-center justify-center py-10 text-espresso-300">
                                <MessageCircle size={40} className="mb-3 opacity-20" />
                                <p>{t('community_comments.no_comments', '첫 번째 댓글을 남겨보세요.')}</p>
                            </div>
                        )
                    ) : (
                        [...comments].sort((a: any, b: any) => Number(b.isPinned || false) - Number(a.isPinned || false)).map(comment => (
                            <div key={comment.id} onDoubleClick={() => handleReaction(comment.id, '❤️', false, undefined)} className={`flex gap-3 transition-colors duration-300 select-none ${comment.isPinned ? 'bg-amber-500/5 -mx-3 px-3 py-3 rounded-2xl border border-amber-500/20' : ''} ${replyingTo?.parentId === comment.id ? 'bg-amber-900/10 -mx-3 px-3 py-3 rounded-2xl' : ''}`}>
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-[#160d08] shrink-0 border border-espresso-700/50 mt-0.5 shadow-sm">
                                    <img src={comment.author.profileImageUrl ? (comment.author.profileImageUrl.startsWith('http') ? comment.author.profileImageUrl : `${API_BASE}${comment.author.profileImageUrl}`) : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80'} alt="avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-1.5 flex-wrap mb-1">
                                                {comment.isPinned && <span className="text-[10px] bg-amber-500/20 text-amber-500 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"><Pin size={10} className="fill-amber-500"/> Pinned</span>}
                                                <span className="text-[13px] font-bold text-amber-500">{comment.author.nickname}</span>
                                                <span className="text-[11px] text-espresso-400 font-medium">{formatRelativeTime(comment.createdAt)}</span>
                                                {comment.author.role === 'OWNER' && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded ml-1">Owner</span>}
                                                {comment.earnedBeans > 0 && <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">☕ {comment.earnedBeans}</span>}
                                            </div>
                                            
                                            <p className="text-[14.5px] text-espresso-50/90 leading-[1.4] break-words mb-1.5">{renderWithLinks(comment.content)}</p>
                                            
                                            {/* Images logic */}
                                            {comment.imageUrl && (() => {
                                                let urls = [];
                                                try {
                                                    const parsed = JSON.parse(comment.imageUrl);
                                                    urls = Array.isArray(parsed) ? parsed : [comment.imageUrl];
                                                } catch(e) {
                                                    urls = [comment.imageUrl];
                                                }
                                                return (
                                                    <div className="mt-2 flex overflow-x-auto gap-2 no-scrollbar mb-2">
                                                        {urls.map((url: string, idx: number) => (
                                                            <div key={idx} className="shrink-0 text-left rounded-xl overflow-hidden w-[100px] h-[100px] border border-espresso-700/50 cursor-pointer active:opacity-70 transition-opacity relative" onClick={(e) => { e.stopPropagation(); setFullImageState({ urls: urls.map((u: string) => u.startsWith('/') ? `${API_BASE}${u}` : u), currentIndex: idx }); }}>
                                                                <MediaRenderer src={url} className="w-full h-full object-cover" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}

                                            {/* Bottom Action Row */}
                                            <div className="flex items-center gap-4 mt-1 text-[12px] font-bold text-espresso-400">
                                                <button onClick={(e) => { e.stopPropagation(); handleReplyClick(comment.id, comment.author.nickname); }} className="hover:text-amber-500 transition-colors text-amber-500/80">Reply</button>
                                                
                                                {currentUserId === comment.post?.authorId && currentUserId !== comment.author.id && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleRewardClick(comment.author.id, comment.author.nickname, comment.id); }} className="hover:text-amber-500 transition-colors">Reward</button>
                                                )}

                                                <div className="relative">
                                                    <button onClick={(e) => { e.stopPropagation(); setActiveCommentMenuId(activeCommentMenuId === comment.id ? null : comment.id); }} className="hover:text-espresso-200 transition-colors">
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                    {activeCommentMenuId === comment.id && (
                                                        <div className="absolute left-0 top-5 w-32 bg-espresso-800 border border-espresso-600 rounded-xl shadow-xl py-1.5 z-50">
                                                            {currentUserId === comment.author.id && (
                                                                <>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleEditCommentMode(comment); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-espresso-100 hover:bg-espresso-700 flex items-center gap-2"><Edit2 size={12} />Edit</button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-espresso-700 flex items-center gap-2 border-b border-espresso-700 pb-2 mb-1"><Trash2 size={12} />Delete</button>
                                                                </>
                                                            )}
                                                            {currentUserId !== comment.author.id && (
                                                                <button onClick={(e) => { e.stopPropagation(); handleReportComment(comment.id); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-espresso-700 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white font-bold leading-none">!</span> Report</button>
                                                            )}
                                                            {currentUserId === comment.post?.authorId && (
                                                                <button onClick={(e) => { e.stopPropagation(); handlePin(comment.id); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-amber-500 hover:bg-espresso-700 flex items-center gap-2 border-t border-espresso-700 pt-2 mt-1"><Pin size={12} />Pin</button>
                                                            )}
                                                            {(currentUserRole === 'ADMIN' || currentUserRole === 'MODERATOR') && currentUserId !== comment.author.id && (
                                                                <button onClick={(e) => { e.stopPropagation(); handleAdminDeleteComment(comment.id); }} className="w-full text-left px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-950/30 flex items-center gap-2 border-t border-espresso-700 mt-1 pt-2"><Trash2 size={12} />Delete (Admin)</button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reaction Area */}
                                        <div className="shrink-0 text-center flex flex-col items-center justify-start mt-0.5">
                                            {renderReactionPicker(comment)}
                                        </div>
                                    </div>

                                    {/* Replies section */}
                                    {comment.replies && comment.replies.length > 0 && (
                                        <div className="mt-3 relative">
                                            {/* Vertical thread line connecting parent to replies */}
                                            <div className="absolute left-[-25px] top-[-10px] bottom-6 w-px bg-espresso-700/40 rounded-b-full z-0" />
                                            <div className="space-y-4">
                                                {comment.replies.map(reply => (
                                                    <div key={reply.id} onDoubleClick={(e) => { e.stopPropagation(); handleReaction(reply.id, '❤️', true, comment.id); }} className="flex gap-2.5 transition-colors duration-300 select-none relative z-10">
                                                        {/* Horizontal curve for thread line */}
                                                        <div className="absolute left-[-25px] top-[14px] w-[17px] h-[1px] bg-espresso-700/40 z-0" />
                                                        
                                                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[#160d08] shrink-0 border border-espresso-700/50 mt-0.5 shadow-sm relative z-10">
                                                            <img src={reply.author.profileImageUrl ? (reply.author.profileImageUrl.startsWith('http') ? reply.author.profileImageUrl : `${API_BASE}${reply.author.profileImageUrl}`) : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80'} alt="avatar" className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-baseline gap-1.5 flex-wrap mb-1">
                                                                        <span className="text-[13px] font-bold text-amber-500">{reply.author.nickname}</span>
                                                                        <span className="text-[11px] text-espresso-400 font-medium">{formatRelativeTime(reply.createdAt)}</span>
                                                                        {reply.author.role === 'OWNER' && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded ml-1">Owner</span>}
                                                                        {reply.earnedBeans > 0 && <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">☕ {reply.earnedBeans}</span>}
                                                                    </div>
                                                                    
                                                                    <p className="text-[14.5px] text-espresso-50/90 leading-[1.4] break-words mb-1.5">
                                                                        <span className="text-espresso-300/80 mr-1 text-[13px]">@{comment.author.nickname}</span>
                                                                        {renderWithLinks(reply.content)}
                                                                    </p>
                                                                    
                                                                    {reply.imageUrl && (() => {
                                                                        let urls = [];
                                                                        try {
                                                                            const parsed = JSON.parse(reply.imageUrl);
                                                                            urls = Array.isArray(parsed) ? parsed : [reply.imageUrl];
                                                                        } catch(e) {
                                                                            urls = [reply.imageUrl];
                                                                        }
                                                                        return (
                                                                            <div className="mt-2 flex overflow-x-auto gap-2 no-scrollbar mb-2">
                                                                                {urls.map((url: string, idx: number) => (
                                                                                    <div key={idx} className="shrink-0 text-left rounded-xl overflow-hidden w-[80px] h-[80px] border border-espresso-700/50 cursor-pointer active:opacity-70 transition-opacity relative" onClick={(e) => { e.stopPropagation(); setFullImageState({ urls: urls.map((u: string) => u.startsWith('/') ? `${API_BASE}${u}` : u), currentIndex: idx }); }}>
                                                                                        <MediaRenderer src={url} className="w-full h-full object-cover" />
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    <div className="flex items-center gap-4 mt-1 text-[12px] font-bold text-espresso-400">
                                                                        <button onClick={(e) => { e.stopPropagation(); handleReplyClick(comment.id, reply.author.nickname); }} className="hover:text-amber-500 transition-colors text-amber-500/80">Reply</button>
                                                                        
                                                                        {currentUserId === comment.post?.authorId && currentUserId !== reply.author.id && (
                                                                            <button onClick={(e) => { e.stopPropagation(); handleRewardClick(reply.author.id, reply.author.nickname, reply.id); }} className="hover:text-amber-500 transition-colors">Reward</button>
                                                                        )}

                                                                        <div className="relative">
                                                                            <button onClick={(e) => { e.stopPropagation(); setActiveCommentMenuId(activeCommentMenuId === reply.id ? null : reply.id); }} className="hover:text-espresso-200 transition-colors">
                                                                                <MoreHorizontal size={14} />
                                                                            </button>
                                                                            {activeCommentMenuId === reply.id && (
                                                                                <div className="absolute left-0 top-5 w-32 bg-espresso-800 border border-espresso-600 rounded-xl shadow-xl py-1.5 z-50">
                                                                                    {currentUserId === reply.author.id && (
                                                                                        <>
                                                                                            <button onClick={(e) => { e.stopPropagation(); handleEditCommentMode(reply); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-espresso-100 hover:bg-espresso-700 flex items-center gap-2"><Edit2 size={12} />Edit</button>
                                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteComment(reply.id); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-espresso-700 flex items-center gap-2 border-b border-espresso-700 pb-2 mb-1"><Trash2 size={12} />Delete</button>
                                                                                        </>
                                                                                    )}
                                                                                    {currentUserId !== reply.author.id && (
                                                                                        <button onClick={(e) => { e.stopPropagation(); handleReportComment(reply.id); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-espresso-700 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white font-bold leading-none">!</span> Report</button>
                                                                                    )}
                                                                                    {(currentUserRole === 'ADMIN' || currentUserRole === 'MODERATOR') && currentUserId !== reply.author.id && (
                                                                                        <button onClick={(e) => { e.stopPropagation(); handleAdminDeleteComment(reply.id); }} className="w-full text-left px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-950/30 flex items-center gap-2 border-t border-espresso-700 mt-1 pt-2"><Trash2 size={12} />Delete (Admin)</button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="shrink-0 text-center flex flex-col items-center justify-start mt-0.5">
                                                                    {renderReactionPicker(reply, true, comment.id)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {replyingTo?.parentId === comment.id && renderInputArea(true)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                </div>

                {/* Input Area (For Modal Mode only) */}
                {!isEmbedded && !replyingTo && renderInputArea(false)}
            </div>

            {/* Fullscreen Image/Media Modal */}
            {fullImageState && (() => {
                let touchStartX = 0;
                return (
                    <div 
                        className="fixed inset-0 z-[300] bg-espresso-950/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setFullImageState(null)}
                        onTouchStart={(e) => { touchStartX = e.changedTouches[0].screenX; }}
                        onTouchEnd={(e) => {
                            const touchEndX = e.changedTouches[0].screenX;
                            if (fullImageState.urls.length <= 1) return;
                            if (touchEndX < touchStartX - 50) {
                                e.stopPropagation();
                                setFullImageState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex + 1) % prev.urls.length } : null);
                            } else if (touchEndX > touchStartX + 50) {
                                e.stopPropagation();
                                setFullImageState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex - 1 + prev.urls.length) % prev.urls.length } : null);
                            }
                        }}
                    >
                        <button 
                            onClick={(e) => { e.stopPropagation(); setFullImageState(null); }}
                            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setFullImageState(null); }}
                            className="absolute top-6 right-6 p-4 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-[9999]"
                        >
                            <X size={28} />
                        </button>
                        
                        {/* Left/Right Controls for Desktop & Large Tablets */}
                        {fullImageState.urls.length > 1 && (
                            <>
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setFullImageState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex - 1 + prev.urls.length) % prev.urls.length } : null); 
                                    }}
                                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-espresso-900/50 text-espresso-50 rounded-full hover:bg-espresso-900/70 transition-colors z-[310]"
                                >
                                    <ChevronLeft size={32} className="opacity-80" />
                                </button>
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setFullImageState(prev => prev ? { ...prev, currentIndex: (prev.currentIndex + 1) % prev.urls.length } : null); 
                                    }}
                                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-espresso-900/50 text-espresso-50 rounded-full hover:bg-espresso-900/70 transition-colors z-[310]"
                                >
                                    <ChevronRight size={32} className="opacity-80" />
                                </button>
                                
                                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-espresso-950/60 px-4 py-1.5 rounded-full text-espresso-50 text-[13px] font-mono tracking-widest backdrop-blur-sm z-[310]">
                                    {fullImageState.currentIndex + 1} / {fullImageState.urls.length}
                                </div>
                            </>
                        )}
    
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={fullImageState.currentIndex}
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
                                        <MediaRenderer 
                                            src={fullImageState.urls[fullImageState.currentIndex]} 
                                            className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl cursor-zoom-in"
                                            autoPlay={true}
                                        />
                                    </TransformComponent>
                                </TransformWrapper>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                );
            })()}
        </div>

            {/* Reward Tier Selection Modal */}
            {showRewardModal && selectedRewardTarget && rewardTiers && (
                <div className="fixed inset-0 z-[500] bg-espresso-950/50 flex flex-col items-center justify-center p-4">
                    <div className="bg-espresso-900 rounded-2xl w-[90%] max-w-[320px] p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-espresso-50 text-[16px]">
                                {t('community_comments.modal_reward_title', '{{name}}님에게 보상하기', {name: selectedRewardTarget.name})}
                            </h3>
                            <button onClick={() => setShowRewardModal(false)} className="text-espresso-200 p-1 hover:text-espresso-300 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-[13px] text-espresso-300 mb-5 leading-relaxed break-keep">
                            {t('community_comments.modal_reward_desc', '유용한 댓글을 작성한 {{name}}님에게 지급할 보상 등급을 선택해주세요.', {name: selectedRewardTarget.name})}
                        </p>
                        
                        <div className="space-y-2 mb-4">
                            {[
                                { name: rewardTiers.rewardTier1Name, amount: rewardTiers.rewardTier1Amount },
                                { name: rewardTiers.rewardTier2Name, amount: rewardTiers.rewardTier2Amount },
                                { name: rewardTiers.rewardTier3Name, amount: rewardTiers.rewardTier3Amount }
                            ].map((tier, idx) => {
                                const translatedName = tier.name === '참여' ? t('community_comments.tier1', '참여') : 
                                                       tier.name === '감사' ? t('community_comments.tier2', '감사') : 
                                                       tier.name === '최고' ? t('community_comments.tier3', '최고') : tier.name;
                                return (
                                <button
                                    key={idx}
                                    onClick={() => processReward(tier.amount, `${tier.name} 보상`)}
                                    className="w-full flex items-center justify-between p-3.5 border border-coffee-100 rounded-xl hover:bg-amber-50 active:bg-amber-100 transition-colors group"
                                >
                                    <span className="font-bold text-espresso-100 group-hover:text-amber-700 text-[14px]">{translatedName}</span>
                                    <span className="font-black text-amber-500 flex items-center gap-1"><Coffee size={14} /> {tier.amount}{t('community_comments.modal_reward_unit', '콩')}</span>
                                </button>
                                );
                            })}
                        </div>
                        <p className="text-center text-[11px] text-espresso-200">{t('community_comments.modal_reward_warning', '보상 시 회원님의 커피콩이 즉시 차감됩니다.')}</p>
                    </div>
                </div>
            )}
        </>
    );
}
