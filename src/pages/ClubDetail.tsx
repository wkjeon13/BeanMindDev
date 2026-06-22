import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { API_BASE } from '../utils/apiConfig';
import { ChevronLeft, ChevronRight, Users, Shield, UserCheck, MessageSquare, Send, MapPin, Bookmark, Settings, Check, X as CloseIcon, UserMinus, Edit2, Camera, Smile, MoreHorizontal, Pin, Trash2, ImageIcon, Image, Calendar, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SharedCoffeeMap from '../components/SharedCoffeeMap';
import MediaRenderer from '../components/community/MediaRenderer';
import { UserPublicProfileModal } from '../components/UserPublicProfileModal';
import { parseCoverImages } from '../utils/imageParser';
import { useTranslation } from 'react-i18next';
import EmojiPicker from 'emoji-picker-react';
import CommentSheet from '../components/community/CommentSheet';

export const getRoleLabel = (role: string, t: any) => {
    switch(role) {
        case 'OWNER': return t('club_detail.role_owner', '방장');
        case 'ADMIN': return t('club_detail.role_admin', '부방장(운영진)');
        case 'EVENT_MANAGER': return t('club_detail.role_event_manager', '일정 관리자');
        case 'CONTENT_MANAGER': return t('club_detail.role_content_manager', '게시판 관리자');
        case 'MEMBER': return t('club_detail.role_member', '정회원');
        case 'NEWBIE': return t('club_detail.role_newbie', '새내기');
        default: return role;
    }
};

export default function ClubDetail() {
    const { t } = useTranslation(['translation']);
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [club, setClub] = useState<any>(location.state?.club || null);
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(!location.state?.club);
    const [isDetailFetched, setIsDetailFetched] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<'FEED' | 'SCHEDULE' | 'GALLERY'>('FEED');
    const [showEventForm, setShowEventForm] = useState(false);
    const [eventFormData, setEventFormData] = useState({ date: '', time: '', location: '', title: '', content: '' });

    // Comment/Post enhancements
    const [postImageFiles, setPostImageFiles] = useState<File[]>([]);
    const [postImagePreviews, setPostImagePreviews] = useState<string[]>([]);
    const postFileInputRef = useRef<HTMLInputElement>(null);
    const postInputRef = useRef<HTMLTextAreaElement>(null);
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editPostExistingImages, setEditPostExistingImages] = useState<string[]>([]);
    const [activePostMenuId, setActivePostMenuId] = useState<string | null>(null);

    // Full screen image gallery state
    const [activeGalleryUrls, setActiveGalleryUrls] = useState<string[]>([]);
    const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);

    // Join Form States
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinAnswers, setJoinAnswers] = useState({ coffee: '', availability: '', intro: '' });

    // Manager states
    const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
    const [clubMembers, setClubMembers] = useState<any[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);

    // Edit description state
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editDescContent, setEditDescContent] = useState('');
    const [isSavingDesc, setIsSavingDesc] = useState(false);

    // Comments State
    // (Removed activeCommentPostId as comments are now embedded)

    // Edit cover image state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUpdatingRecruitment, setIsUpdatingRecruitment] = useState(false);

    let currentUserId = '';
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.id;
        }
    } catch {}
    const [selectedUserIdForProfile, setSelectedUserIdForProfile] = useState<string | null>(null);

    const loadMembers = async () => {
        setIsLoadingMembers(true);
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}/members`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setClubMembers(data.members || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingMembers(false);
        }
    };

    const handleMemberAction = async (targetUserId: string, action: 'APPROVE' | 'KICK') => {
        if (!window.confirm(action === 'APPROVE' ? t('club_detail.confirm_approve') : t('club_detail.confirm_reject'))) return;
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}/members/${targetUserId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });
            if (res.ok) {
                loadMembers();
                if (action === 'APPROVE') {
                    setClub((prev: any) => ({ ...prev, _count: { ...prev._count, members: prev._count.members + 1 } }));
                }
            } else {
                alert('요청 처리에 실패했습니다.');
            }
        } catch (e) {
            alert('오류가 발생했습니다.');
        }
    };

    const handleRoleChange = async (targetUserId: string, newRole: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}/members/${targetUserId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'UPDATE_ROLE', role: newRole })
            });
            if (res.ok) {
                loadMembers();
                fetchClubInfo(); // refresh myMembership if needed
            } else {
                const data = await res.json();
                alert(data.error || '권한 변경에 실패했습니다.');
            }
        } catch (e) {
            alert('오류가 발생했습니다.');
        }
    };

    const handleBadgeChange = async (targetUserId: string, currentBadgesStr: string | null, badgeToToggle: string) => {
        try {
            let badges: string[] = [];
            if (currentBadgesStr) {
                try { badges = JSON.parse(currentBadgesStr); } catch(e) {}
            }
            if (badges.includes(badgeToToggle)) {
                badges = badges.filter(b => b !== badgeToToggle);
            } else {
                badges.push(badgeToToggle);
            }

            const res = await fetch(`${API_BASE}/api/clubs/${id}/members/${targetUserId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'UPDATE_BADGES', badges })
            });
            if (res.ok) {
                loadMembers();
            } else {
                alert('배지 변경에 실패했습니다.');
            }
        } catch (e) {
            alert('오류가 발생했습니다.');
        }
    };

    const handleToggleBookmark = async () => {
        if (!localStorage.getItem('token')) {
            alert('로그인이 필요합니다.');
            navigate('/profile');
            return;
        }
        setIsTogglingBookmark(true);
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}/bookmark`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setClub((prev: any) => ({ ...prev, isBookmarked: data.bookmarked }));
            }
        } catch (e) {
            console.error('Bookmark toggle failed', e);
        } finally {
            setIsTogglingBookmark(false);
        }
    };

    const fetchClubInfo = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setClub(data);
                return data;
            } else {
                alert('모임 정보를 불러오지 못했습니다.');
                navigate('/clubs');
                return null;
            }
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    const fetchPosts = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/community/posts?clubId=${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                setPosts(await res.json());
            }
        } catch(e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (!id) return;
        
        // 캐시(location.state)가 없어서 즉시 렌더링을 못 할 때만 로딩 바를 띄움
        if (!location.state?.club) {
            setIsLoading(true);
        }
        
        const loadInitialData = async () => {
            const clubData = await fetchClubInfo();
            
            if (clubData) {
                const isMember = clubData.myMembership && ['OWNER', 'ADMIN', 'MEMBER'].includes(clubData.myMembership.role);
                // 비공개 소모임인 경우에만 비회원의 게시글 조회를 차단
                if (!clubData.isPrivate || isMember) {
                    await fetchPosts();
                }
            }
            setIsLoading(false);
            setIsDetailFetched(true);
        };
        loadInitialData();
    }, [id, location.state]);

    const handleJoinClick = () => {
        if (!localStorage.getItem('token')) {
            alert('로그인이 필요합니다.');
            navigate('/profile');
            return;
        }
        // 이전에 가입 요청한 적 없으면 폼 모달 열기
        if (!club.myMembership) {
            setIsJoinModalOpen(true);
        } else {
            const isPending = club.myMembership.role === 'PENDING';
            const confirmMsg = isPending ? t('club_detail.confirm_cancel') : t('club_detail.confirm_leave');
            if (window.confirm(confirmMsg)) {
                submitJoinRequest();
            }
        }
    };

    const submitJoinRequest = async (applicationData?: any) => {
        setIsJoining(true);
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}/join`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    applicationData: applicationData ? JSON.stringify(applicationData) : null 
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'LEFT') {
                    setClub((prev: any) => ({ ...prev, myMembership: null, _count: { ...prev._count, members: prev._count.members - 1 } }));
                } else if (data.status === 'PENDING') {
                    setIsJoinModalOpen(false);
                    alert('가입 신청이 완료되었습니다. 방장 승인 후 활동 가능합니다.');
                    setClub((prev: any) => ({ ...prev, myMembership: { role: 'PENDING', joinedAt: data.joinedAt || new Date().toISOString() } }));
                } else {
                    setClub((prev: any) => ({ ...prev, myMembership: { role: 'MEMBER' }, _count: { ...prev._count, members: prev._count.members + 1 } }));
                }
            } else {
                const err = await res.json();
                alert(err.error?.message || err.error || '요청 실패');
            }
        } catch (e) {
            alert('오류 발생');
        } finally {
            setIsJoining(false);
        }
    };

    const handleRecruitmentToggle = async (checked: boolean) => {
        setIsUpdatingRecruitment(true);
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}/recruitment`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRecruiting: checked })
            });
            if (res.ok) {
                const updated = await res.json();
                setClub((prev: any) => ({ ...prev, isRecruiting: updated.isRecruiting, recruitDeadline: updated.recruitDeadline }));
            }
        } catch (error) {
            console.error('Failed to toggle recruitment', error);
        } finally {
            setIsUpdatingRecruitment(false);
        }
    };

    const handlePrivacyToggle = async (checked: boolean) => {
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPrivate: checked })
            });
            if (res.ok) {
                const updated = await res.json();
                setClub((prev: any) => ({ ...prev, isPrivate: updated.isPrivate }));
                fetchPosts(); // Refetch posts correctly just in case
            } else {
                alert('비공개 설정 변경에 실패했습니다.');
            }
        } catch (error) {
            console.error('Failed to toggle privacy', error);
        }
    };

    const handleDeadlineChange = async (dateStr: string) => {
        setIsUpdatingRecruitment(true);
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}/recruitment`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ recruitDeadline: dateStr ? new Date(dateStr).toISOString() : null })
            });
            if (res.ok) {
                const updated = await res.json();
                setClub((prev: any) => ({ ...prev, recruitDeadline: updated.recruitDeadline }));
            }
        } catch (error) {
            console.error('Failed to update deadline', error);
        } finally {
            setIsUpdatingRecruitment(false);
        }
    };

    const handleSaveDesc = async () => {
        if (!editDescContent.trim()) return;
        setIsSavingDesc(true);
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description: editDescContent })
            });

            if (res.ok) {
                setIsEditingDesc(false);
                fetchClubInfo(); // refresh club info
            } else {
                alert('소모임 내용 수정에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('수정 중 오류가 발생했습니다.');
        } finally {
            setIsSavingDesc(false);
        }
    };

    const handleEditLocation = async () => {
        const newLocation = window.prompt("모임 장소를 입력해주세요. (예: 강남역 카페, 서울숲 등)", club.locationName || "");
        if (newLocation === null || newLocation === club.locationName) return;
        
        let clubLat: number | undefined;
        let clubLng: number | undefined;

        if (newLocation.trim()) {
            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newLocation.trim())}`);
                if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    if (geoData && geoData.length > 0) {
                        clubLat = parseFloat(geoData[0].lat);
                        clubLng = parseFloat(geoData[0].lon);
                    }
                }
            } catch(e) {
                console.warn('Geocoding failed', e);
            }
        }

        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    locationName: newLocation.trim(),
                    lat: clubLat,
                    lng: clubLng 
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setClub((prev: any) => ({ ...prev, locationName: updated.locationName }));
            } else {
                alert('장소 수정에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다.');
        }
    };

    const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (files.length > 10) {
            alert('최대 10장까지만 첨부할 수 있습니다.');
            return;
        }

        setIsUploadingImage(true);
        const promises = files.map(file => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        });

        try {
            const base64Images = await Promise.all(promises);
            const res = await fetch(`${API_BASE}/api/clubs/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ coverImageUrl: JSON.stringify(base64Images) })
            });

            if (res.ok) {
                fetchClubInfo(); 
            } else {
                alert('사진 변경에 실패했습니다.');
            }
        } catch (err) {
            alert('오류가 발생했습니다.');
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removePostImage = (index: number) => {
        setPostImagePreviews(prev => {
            const newPreviews = [...prev];
            const removedUrl = newPreviews[index];
            newPreviews.splice(index, 1);
            if (removedUrl.startsWith('http') || removedUrl.startsWith('/uploads/')) {
                setEditPostExistingImages(ex => ex.filter(url => url !== removedUrl));
            } else {
                const localIndex = index - editPostExistingImages.length;
                if (localIndex >= 0) {
                    setPostImageFiles(f => f.filter((_, i) => i !== localIndex));
                }
            }
            return newPreviews;
        });
    };

    const handlePostImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const remaining = 5 - postImageFiles.length;
            const filesToAdd = files.slice(0, remaining);
            setPostImageFiles(prev => [...prev, ...filesToAdd]);
            const newPreviews = filesToAdd.map(f => URL.createObjectURL(f));
            setPostImagePreviews(prev => [...prev, ...newPreviews]);
            if (files.length > remaining) alert('최대 5개의 파일만 첨부할 수 있습니다.');
        }
        if (postFileInputRef.current) postFileInputRef.current.value = '';
    };

    const handleTogglePin = async (postId: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/community/posts/${postId}/pin`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const { isPinned } = await res.json();
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned } : p));
            } else {
                alert('고정 상태 변경에 실패했습니다.');
            }
        } catch(e) { console.error('Pin toggle failed', e); }
    };

    const handleEditPostMode = (post: any) => {
        setNewPostContent(post.content);
        setEditingPostId(post.id);
        setActivePostMenuId(null);
        let loaded: string[] = [];
        if (post.image) {
            try { loaded = JSON.parse(post.image); } 
            catch(e) { loaded = [post.image]; }
        }
        setEditPostExistingImages(loaded);
        setPostImagePreviews(loaded);
        setPostImageFiles([]);
        setTimeout(() => {
            if (postInputRef.current) {
                postInputRef.current.focus();
                postInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
    };

    const handleDeletePost = async (postId: string) => {
        setActivePostMenuId(null);
        if (!window.confirm('정말 이 공지/게시글을 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/community/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== postId));
                setClub((prev: any) => ({ ...prev, _count: { ...prev._count, posts: Math.max(0, prev._count.posts - 1) } }));
            } else {
                alert('삭제에 실패했습니다.');
            }
        } catch(e) { console.error('Delete failed', e); }
    };

    const handleReportPost = async (postId: string) => {
        const reason = window.prompt("신고 사유를 간단히 입력해주세요.\n('음란물', '불법', '범죄' 등의 키워드 포함 시 즉시 블라인드 처리될 수 있습니다.)");
        if (reason === null) return;
        try {
            const res = await fetch(`${API_BASE}/api/community/posts/${postId}/report`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason.trim() || '유저 자발적 신고' })
            });
            if (res.ok) {
                const data = await res.json();
                alert('신고가 접수되었습니다.');
                if (data.isHidden) {
                    setPosts(prev => prev.filter(p => p.id !== postId));
                    setClub((prev: any) => ({ ...prev, _count: { ...prev._count, posts: Math.max(0, prev._count.posts - 1) } }));
                }
            } else {
                const err = await res.json();
                alert(err.error || '신고 처리에 실패했습니다.');
            }
        } catch(e) { console.error('Report failed', e); }
        setActivePostMenuId(null);
    };

    const handleWritePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostContent.trim() && postImageFiles.length === 0) return;
        setIsSubmittingPost(true);
        setShowEmojiPicker(false);

        try {
            if (editingPostId) {
                const formData = new FormData();
                if (newPostContent.trim()) formData.append('content', newPostContent);
                if (editPostExistingImages.length > 0) formData.append('existingImages', JSON.stringify(editPostExistingImages));
                postImageFiles.forEach(file => formData.append('images', file));

                const res = await fetch(`${API_BASE}/api/community/posts/${editingPostId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: formData
                });
                if (res.ok) {
                    const updatedPost = await res.json();
                    setPosts(prev => prev.map(p => p.id === editingPostId ? updatedPost : p));
                    setNewPostContent(''); setEditingPostId(null); setEditPostExistingImages([]);
                    setPostImageFiles([]); setPostImagePreviews([]);
                } else alert('수정에 실패했습니다.');
            } else {
                const formData = new FormData();
                if (newPostContent.trim()) formData.append('content', newPostContent);
                formData.append('clubId', id as string);
                formData.append('postType', 'NORMAL');
                postImageFiles.forEach(file => formData.append('images', file));

                const res = await fetch(`${API_BASE}/api/community/posts`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: formData
                });
                if (res.ok) {
                    await fetchPosts();
                    setNewPostContent('');
                    setPostImageFiles([]); setPostImagePreviews([]);
                    setClub((prev: any) => ({ ...prev, _count: { ...prev._count, posts: prev._count.posts + 1 } }));
                } else alert('등록에 실패했습니다.');
            }
        } catch (e) {
            console.error('Post write/edit error', e);
        } finally {
            setIsSubmittingPost(false);
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventFormData.title.trim() || !eventFormData.date || !eventFormData.time || !eventFormData.location.trim()) {
            alert('일정의 모든 필수 항목을 입력해주세요.');
            return;
        }
        setIsSubmittingPost(true);

        try {
            const formData = new FormData();
            formData.append('content', `${eventFormData.title}\n\n${eventFormData.content}`);
            formData.append('clubId', id as string);
            formData.append('postType', 'EVENT');
            formData.append('cafeLocation', eventFormData.location);
            
            // store details in recipeData
            const eventDetails = {
                eventDate: `${eventFormData.date}T${eventFormData.time}:00`,
                location: eventFormData.location
            };
            formData.append('recipeData', JSON.stringify(eventDetails));

            // Attach RSVP Poll
            const pollData = {
                question: `${eventFormData.title} 참석 투표`,
                options: ["참석", "미정", "불참"]
            };
            formData.append('pollData', JSON.stringify(pollData));

            postImageFiles.forEach(file => formData.append('images', file));

            const res = await fetch(`${API_BASE}/api/community/posts`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            if (res.ok) {
                await fetchPosts();
                setEventFormData({ date: '', time: '', location: '', title: '', content: '' });
                setShowEventForm(false);
                setPostImageFiles([]); setPostImagePreviews([]);
                setClub((prev: any) => ({ ...prev, _count: { ...prev._count, posts: prev._count.posts + 1 } }));
            } else alert('일정 등록에 실패했습니다.');
        } catch (e) {
            console.error('Event create error', e);
        } finally {
            setIsSubmittingPost(false);
        }
    };

    const handleVote = async (postId: string, optionId: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/community/posts/${postId}/poll/vote`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ optionId })
            });
            if (res.ok) {
                await fetchPosts();
            } else {
                alert('투표 처리에 실패했습니다.');
            }
        } catch(e) {
            console.error('Vote error', e);
        }
    };

    const handleDeleteClub = async () => {
        if (window.prompt("정말로 이 소모임을 폭파하시겠습니까?\n이 행동은 되돌릴 수 없으며 모든 멤버가 이용할 수 없게 됩니다.\n폭파하시려면 '폭파' 라고 정확히 입력해주세요.") !== '폭파') return;
        
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                alert('소모임이 성공적으로 폐쇄(폭파)되었습니다.');
                navigate('/clubs', { replace: true });
            } else {
                const err = await res.json();
                alert(err.error || '소모임 삭제에 실패했습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다.');
        }
    };

    const handleHideClub = async () => {
        if (!window.confirm("이 모임을 모임장님의 내 소모임 목록에서도 완전히 지우시겠습니까?")) return;
        try {
            const res = await fetch(`${API_BASE}/api/clubs/${id}/hide`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                alert('목록에서 성공적으로 숨겨졌습니다.');
                navigate('/clubs', { replace: true, state: { activeTab: 'MY_CLUBS' } });
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (isLoading) return <div className="absolute inset-0 bg-espresso-950 flex justify-center items-center text-espresso-200">{t('club_detail.loading')}</div>;
    if (!club) return null;

    const role = club.myMembership?.role;

    if (club.isDeleted) {
        return (
            <div className="absolute inset-0 bg-espresso-950 text-espresso-50 flex flex-col font-sans items-center justify-center p-6 text-center animate-in fade-in z-[200]">
                <Shield size={64} className="text-red-500 mb-4 opacity-80" />
                <h1 className="text-2xl font-black mb-2 whitespace-nowrap md:whitespace-normal">❌ 폐쇄된 소모임입니다.</h1>
                <p className="text-espresso-300 text-sm mb-8 leading-relaxed">이 소모임은 모임장에 의해 완전히 폐쇄(폭파)되었습니다.<br/>더 이상 접근하거나 소통할 수 없습니다.</p>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                    <button onClick={() => navigate('/clubs', { state: { activeTab: 'MY_CLUBS' } })} className="flex-1 px-6 py-3 bg-espresso-800 text-white rounded-xl font-bold hover:bg-espresso-700 transition-colors">
                        목록으로 돌아가기
                    </button>
                    {(role === 'OWNER' || club.ownerId === currentUserId) && (
                        <button onClick={handleHideClub} className="flex-1 px-6 py-3 bg-red-600/20 text-red-500 rounded-xl font-bold hover:bg-red-600/40 border border-red-500/30 transition-colors">
                            내 소모임에서 지우기
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const isMember = role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
    const isPending = role === 'PENDING';

    return (
        <div className="absolute inset-0 bg-espresso-950 text-espresso-50 flex flex-col font-sans">
            <header className="shrink-0 z-50 bg-espresso-900/80 backdrop-blur-xl border-b border-espresso-700/80 pt-safe">
                <div className="flex justify-between items-center px-4 h-14">
                    <button onClick={() => navigate('/clubs')} className="p-2 -ml-2 text-espresso-200 hover:text-espresso-50 hover:bg-espresso-800 rounded-full">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-[17px] font-extrabold truncate max-w-[200px]">{club.name}</h1>
                    <button 
                        onClick={handleToggleBookmark} 
                        disabled={isTogglingBookmark}
                        className={`p-2 -mr-2 rounded-full transition-colors ${club.isBookmarked ? 'text-amber-500' : 'text-espresso-300 hover:text-espresso-50 hover:bg-espresso-800'}`}
                    >
                        <Bookmark size={24} fill={club.isBookmarked ? "currentColor" : "none"} />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-24">
                {/* Hidden File Input for Cover Image */}
                <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCoverImageChange} />
                
                {/* Hero Section */}
                <div className="bg-espresso-900/30 border-b border-espresso-800 py-6 flex flex-col items-center text-center relative overflow-hidden">
                    {club.coverImageUrl && (
                        <div className="absolute inset-0 opacity-20">
                            <img src={parseCoverImages(club.coverImageUrl)[0]} className="w-full h-full object-cover blur-sm" alt="cover" />
                        </div>
                    )}
                    <div className="w-full max-w-full overflow-x-auto snap-x flex gap-4 px-6 mb-6 hide-scrollbar z-10">
                        {(() => {
                            const images = parseCoverImages(club.coverImageUrl);
                            if (images.length === 0) {
                                return (
                                    <div className="min-w-[85vw] sm:min-w-[400px] max-w-[400px] aspect-square bg-espresso-800 rounded-[32px] flex items-center justify-center shrink-0 border-2 border-amber-900/30 shadow-2xl relative snap-center mx-auto overflow-hidden group">
                                        <Users size={64} className="text-amber-500" />
                                        {role === 'OWNER' && (
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} className="flex flex-col items-center gap-2 text-white hover:scale-105 transition-transform">
                                                    <Camera size={40} className={isUploadingImage ? 'animate-pulse text-amber-500' : 'text-espresso-50 drop-shadow-md'} />
                                                    <span className="font-bold text-sm bg-black/60 px-4 py-1.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap">
                                                        {isUploadingImage ? t('club_detail.btn_uploading') : t('club_detail.btn_add_image')}
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Multiple Images Layout
                            const isSingle = images.length === 1;
                            return images.map((img, idx) => (
                                <div key={idx} className={`${isSingle ? 'mx-auto' : ''} min-w-[85vw] sm:min-w-[400px] max-w-[400px] aspect-square bg-espresso-800 rounded-[32px] shrink-0 border-2 border-amber-900/30 shadow-2xl relative snap-center overflow-hidden group`}>
                                    <img src={img} className="w-full h-full object-cover" alt={`icon ${idx+1}`} />
                                    {role === 'OWNER' && idx === 0 && ( /* 첫번째 이미지에만 변경버튼 노출 */
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} className="flex flex-col items-center gap-2 text-white hover:scale-105 transition-transform">
                                                <Camera size={40} className={isUploadingImage ? 'animate-pulse text-amber-500' : 'text-espresso-50 drop-shadow-md'} />
                                                <span className="font-bold text-sm bg-black/60 px-4 py-1.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap">
                                                    {isUploadingImage ? t('club_detail.btn_uploading') : t('club_detail.btn_change_image', { count: images.length })}
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>
                    <h2 className="text-xl font-black mb-1 z-10">{club.name}</h2>
                    <p className="text-[13px] text-amber-500 font-bold mb-2 z-10 flex items-center justify-center gap-1">
                        {t('club_detail.lbl_owner')}: {club.owner?.nickname || t('club_detail.lbl_unknown')}
                    </p>
                    
                    {isEditingDesc ? (
                        <div className="z-10 w-full max-w-[95%] mb-4 flex flex-col items-center animate-in fade-in zoom-in-95">
                            <textarea 
                                value={editDescContent} 
                                onChange={(e) => setEditDescContent(e.target.value)} 
                                className="w-full bg-espresso-950/80 border border-emerald-500/50 rounded-xl p-4 text-[14px] leading-relaxed text-espresso-50 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[160px] shadow-inner"
                                placeholder={t('club_detail.ph_desc')}
                            />
                            <div className="flex gap-2 mt-2 w-full justify-end">
                                <button onClick={() => setIsEditingDesc(false)} className="px-3 py-1.5 text-xs text-espresso-300 hover:text-white bg-espresso-800 rounded-lg transition-colors">{t('club_detail.btn_cancel')}</button>
                                <button onClick={handleSaveDesc} disabled={isSavingDesc} className="px-4 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold transition-colors">{isSavingDesc ? '...' : t('club_detail.btn_save')}</button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 max-w-[80%] mb-4 group flex items-start justify-center">
                            <p className="text-sm text-espresso-300 whitespace-pre-wrap">{club.description}</p>
                            {role === 'OWNER' && (
                                <button 
                                    onClick={() => { setEditDescContent(club.description); setIsEditingDesc(true); }} 
                                    className="ml-2 p-1.5 text-espresso-400 hover:text-amber-500 bg-espresso-900/50 hover:bg-espresso-800 rounded-full transition-all md:opacity-0 group-hover:opacity-100 mt-[-2px] shrink-0"
                                >
                                    <Edit2 size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex gap-4 text-xs font-semibold text-espresso-400 z-10 mb-2 flex-wrap justify-center items-center">
                        {club.isRecruiting ?? true ? (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/50 rounded-full w-fit">
                                {t('club_detail.lbl_recruiting')} {club.recruitDeadline && `(~${new Date(club.recruitDeadline).toLocaleDateString()})`}
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 bg-espresso-800 text-espresso-400 border border-espresso-700/50 rounded-full w-fit">
                                {t('club_detail.lbl_recruitment_closed')}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-4 text-xs font-semibold text-espresso-400 z-10 mb-5 flex-wrap justify-center items-center">
                         {isMember && (
                             <span className="flex items-center gap-1 text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full"><Shield size={14} className="text-amber-500"/> {t('club_detail.lbl_my_role', '나의 권한')}: {getRoleLabel(role, t)}</span>
                         )}
                         <span className="flex items-center gap-1"><Users size={14} className="text-amber-500"/> {club._count?.members ?? club.memberCount ?? 0} {t('club_detail.unit_member')}</span>
                         <span className="flex items-center gap-1"><MessageSquare size={14} className="text-amber-500"/> {club._count?.posts ?? 0} {t('club_detail.unit_post')}</span>
                         <span className="flex items-center gap-1"><Shield size={14} className={club.isPrivate ? "text-red-500" : "text-emerald-500"}/> {club.isPrivate ? t('club_detail.lbl_private') : t('club_detail.lbl_public')}</span>
                         {club.createdAt && (
                             <span className="flex items-center gap-1"><Calendar size={14} className="text-amber-500"/> {new Date(club.createdAt).toLocaleDateString()}</span>
                         )}
                         {club.locationName && (
                             <span className="flex items-center gap-1 text-espresso-200 group/loc cursor-pointer" onClick={() => { if (role === 'OWNER') handleEditLocation(); }}>
                                 <MapPin size={14} className="text-amber-500" />
                                 {club.locationName}
                                 {role === 'OWNER' && <Edit2 size={12} className="opacity-0 group-hover/loc:opacity-100 transition-opacity text-espresso-400 hover:text-amber-500 ml-0.5" />}
                             </span>
                         )}
                         {role === 'OWNER' && !club.locationName && (
                             <span className="flex items-center gap-1 text-espresso-200 cursor-pointer hover:text-amber-500 transition-colors" onClick={handleEditLocation}>
                                 <MapPin size={14} className="text-amber-500 opacity-50" />
                                 장소 추가하기
                             </span>
                         )}
                    </div>

                    <button 
                        onClick={(role === 'OWNER' || role === 'ADMIN') ? () => { setIsManagerModalOpen(true); loadMembers(); } : handleJoinClick}
                        disabled={!isDetailFetched || isJoining || (!isMember && !isPending && !(club.isRecruiting ?? true) && role !== 'OWNER' && role !== 'ADMIN')}
                        className={`z-10 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${
                            !isDetailFetched ? 'bg-espresso-800 text-espresso-400 border border-espresso-700' :
                            isPending ? 'bg-espresso-800 text-espresso-300 hover:bg-red-900/40 hover:text-red-400 border border-espresso-700 hover:border-red-800/50' :
                            isMember && role !== 'OWNER' && role !== 'ADMIN' ? 'bg-espresso-800 text-espresso-300 hover:bg-espresso-700' :
                            (!isMember && !isPending && !(club.isRecruiting ?? true) && role !== 'OWNER' && role !== 'ADMIN') ? 'bg-espresso-800 text-espresso-500 cursor-not-allowed border border-espresso-700' :
                            'bg-gradient-to-r from-amber-500 to-orange-500 text-espresso-950 shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95'
                        }`}
                    >
                        {!isDetailFetched ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-espresso-400 border-t-transparent rounded-full animate-spin"></span> 확인 중...</span> :
                        (role === 'OWNER' || role === 'ADMIN') ? <><Settings size={18} /> {t('club_detail.btn_manage')}</> : 
                        isPending ? `⏳ ${t('club_detail.status_pending')} (${new Date(club.myMembership?.joinedAt).toLocaleDateString()} ${t('club_detail.lbl_applied')}) - ${t('club_detail.btn_cancel_join')}` : 
                        isMember ? <><UserCheck size={18} /> {new Date(club.myMembership?.joinedAt).toLocaleDateString()} {t('club_detail.status_joined')} ({t('club_detail.btn_leave')})</> : 
                        (club.isRecruiting ?? true) ? t('club_detail.btn_join') : t('club_detail.lbl_recruitment_closed')}
                    </button>
                </div>

                {/* Tab Navigation */}
                {(!club.isPrivate || isMember) && (
                    <div className="flex border-b border-espresso-800 bg-espresso-950/80 sticky top-0 z-40 backdrop-blur-md px-2 mt-4">
                        <button onClick={() => setActiveTab('FEED')} className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'FEED' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-espresso-400 hover:text-espresso-200'}`}>
                            <MessageSquare size={16} /> {t('club_detail.tab_feed')}
                        </button>
                        <button onClick={() => setActiveTab('SCHEDULE')} className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'SCHEDULE' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-espresso-400 hover:text-espresso-200'}`}>
                            <Calendar size={16} /> {t('club_detail.tab_schedule')}
                        </button>
                        <button onClick={() => setActiveTab('GALLERY')} className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'GALLERY' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-espresso-400 hover:text-espresso-200'}`}>
                            <Grid size={16} /> {t('club_detail.tab_gallery')}
                        </button>
                    </div>
                )}

                {!isMember && club.isPrivate ? (
                    <div className="p-10 text-center text-espresso-300 flex flex-col items-center">
                        <Shield size={48} className="mb-4 text-espresso-600 opacity-50" />
                        <p className="font-bold mb-2">{t('club_detail.msg_private_title')}</p>
                        <p className="text-sm">{t('club_detail.msg_private_desc')}</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        {activeTab === 'FEED' && isMember && (
                            <div className="bg-espresso-900 border border-espresso-700 p-4 rounded-2xl flex flex-col gap-3">
                                {postImagePreviews.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                        {postImagePreviews.map((preview, index) => (
                                            <div key={index} className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-espresso-600 relative group">
                                                <MediaRenderer src={preview} className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removePostImage(index)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                                    <CloseIcon size={20} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <form onSubmit={handleWritePost} className="flex items-center gap-2 relative">
                                    <input type="file" multiple ref={postFileInputRef} className="hidden" accept="image/*,video/*" onChange={handlePostImageChange} />
                                    <button type="button" onClick={() => postFileInputRef.current?.click()} disabled={isSubmittingPost} className="p-2 bg-espresso-800 text-espresso-200 rounded-xl hover:text-white transition-colors shrink-0">
                                        <ImageIcon size={18} />
                                    </button>
                                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={isSubmittingPost} className="p-2 bg-espresso-800 text-espresso-200 rounded-xl hover:text-white transition-colors shrink-0">
                                        <Smile size={18} />
                                    </button>
                                    
                                    {showEmojiPicker && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-40" 
                                                onClick={() => setShowEmojiPicker(false)}
                                            />
                                            <div className="absolute bottom-[110%] left-0 z-50 shadow-2xl rounded-xl overflow-hidden border border-espresso-700">
                                                <EmojiPicker 
                                                    theme={"dark" as any}
                                                    onEmojiClick={(emojiData, e) => {
                                                        setNewPostContent(prev => prev + emojiData.emoji);
                                                    }} 
                                                />
                                            </div>
                                        </>
                                    )}

                                    <textarea 
                                        ref={postInputRef}
                                        className="flex-1 bg-espresso-950 text-[13px] sm:text-sm px-3 py-2.5 rounded-xl border border-espresso-800 text-white placeholder-espresso-500 focus:outline-none focus:border-amber-500 resize-none min-h-[44px] max-h-32 hide-scrollbar whitespace-pre-wrap"
                                        placeholder={editingPostId ? "수정할 내용을 입력하세요..." : t('club_detail.ph_post')}
                                        value={newPostContent}
                                        onChange={e => setNewPostContent(e.target.value)}
                                        disabled={isSubmittingPost}
                                        rows={1}
                                        style={!newPostContent ? { whiteSpace: 'nowrap', overflow: 'hidden' } : {}}
                                    />
                                    {editingPostId && (
                                        <button type="button" onClick={() => { setEditingPostId(null); setNewPostContent(''); setPostImageFiles([]); setPostImagePreviews([]); setEditPostExistingImages([]); }} className="p-2.5 text-espresso-400 bg-espresso-800 rounded-xl hover:text-white transition-colors">
                                            <CloseIcon size={18} />
                                        </button>
                                    )}
                                    <button type="submit" disabled={isSubmittingPost || (!newPostContent.trim() && postImageFiles.length === 0)} className="bg-amber-500 text-espresso-950 p-2.5 justify-center items-center flex rounded-xl disabled:opacity-50 hover:bg-amber-400 active:scale-95 transition-all">
                                        <Send size={18} className="translate-x-0.5" />
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'FEED' && posts.length === 0 ? (
                            <p className="text-center p-10 text-espresso-400 text-sm">{t('club_detail.msg_no_posts')}</p>
                        ) : activeTab === 'FEED' && (
                            posts.filter(p => p.postType !== 'EVENT').sort((a,b) => Number(b.isPinned) - Number(a.isPinned)).map(post => (
                                <article key={post.id} className={`p-4 rounded-2xl ${post.isPinned ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-espresso-900/50 border border-espresso-800/80'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { if (post.author?.id || post.authorId) setSelectedUserIdForProfile(post.author?.id || post.authorId); }}>
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-espresso-800 border border-espresso-700 shrink-0">
                                                <img src={post.author?.profileImageUrl ? (post.author.profileImageUrl.startsWith('http') ? post.author.profileImageUrl : `${API_BASE}${post.author.profileImageUrl}`) : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80'} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {post.isPinned && <Pin size={12} className="fill-amber-500 text-amber-500" />}
                                                    <h4 className="font-bold text-[14px] text-espresso-50">{post.author?.nickname}</h4>
                                                    {post.author?.clubMemberships && post.author.clubMemberships.length > 0 ? (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ml-1 font-bold ${
                                                            post.author.clubMemberships[0].role === 'OWNER' ? 'bg-amber-500/20 text-amber-500' :
                                                            ['ADMIN', 'EVENT_MANAGER', 'CONTENT_MANAGER'].includes(post.author.clubMemberships[0].role) ? 'bg-emerald-500/20 text-emerald-400' :
                                                            'bg-espresso-800 text-espresso-400'
                                                        }`}>
                                                            {getRoleLabel(post.author.clubMemberships[0].role, t)}
                                                        </span>
                                                    ) : post.author?.id === club.ownerId ? (
                                                        <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded ml-1 font-bold">{t('club_detail.lbl_owner', '모임장')}</span>
                                                    ) : null}
                                                </div>
                                                <p className="text-[11px] text-espresso-400 mt-0.5">{new Date(post.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center relative">
                                            <button onClick={() => setActivePostMenuId(activePostMenuId === post.id ? null : post.id)} className="p-1.5 rounded-full text-espresso-400 hover:text-white hover:bg-espresso-800 transition-colors">
                                                <MoreHorizontal size={18} />
                                            </button>
                                            
                                            {activePostMenuId === post.id && (
                                                <div className="absolute right-0 top-8 w-32 bg-espresso-800 border border-espresso-600 rounded-xl shadow-xl py-1.5 z-50">
                                                    {['OWNER', 'ADMIN', 'CONTENT_MANAGER'].includes(role) && (
                                                       <button onClick={(e) => { e.stopPropagation(); handleTogglePin(post.id); setActivePostMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[13px] font-medium text-espresso-100 hover:bg-espresso-700 flex items-center gap-2">
                                                           <Pin size={14} className={post.isPinned ? "text-amber-500 fill-amber-500" : ""} /> {post.isPinned ? '고정 해제' : '상단 고정'}
                                                       </button>
                                                    )}
                                                    {(post.author?.id === currentUserId || post.authorId === currentUserId) && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleEditPostMode(post); }} className="w-full text-left px-3 py-1.5 text-[13px] font-medium text-espresso-100 hover:bg-espresso-700 flex items-center gap-2">
                                                            <Edit2 size={14} /> {t('community_comments.btn_edit', '수정하기')}
                                                        </button>
                                                    )}
                                                    {(post.author?.id !== currentUserId && post.authorId !== currentUserId) && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleReportPost(post.id); }} className="w-full text-left px-3 py-1.5 text-[13px] font-medium text-red-500 hover:bg-espresso-700 flex items-center gap-2">
                                                            <span className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white font-bold leading-none mr-1">!</span> {t('coffee_talk.btn_report', '신고하기')}
                                                        </button>
                                                    )}
                                                    {(post.author?.id === currentUserId || post.authorId === currentUserId || role === 'OWNER' || role === 'ADMIN' || role === 'CONTENT_MANAGER') && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }} className="w-full text-left px-3 py-1.5 text-[13px] font-medium text-red-500 hover:bg-espresso-700 flex items-center gap-2 border-t border-espresso-700/50 mt-1 pt-1">
                                                            <Trash2 size={14} /> {t('community_comments.btn_delete', '삭제하기')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[14px] text-espresso-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                                    {post.image && (() => {
                                        let urls = [];
                                        try { const p = JSON.parse(post.image); urls = Array.isArray(p) ? p : [post.image]; } catch(e) { urls = [post.image]; }
                                        return (
                                            <div className="mt-3 flex overflow-x-auto gap-2 no-scrollbar">
                                                {urls.map((url: string, idx: number) => (
                                                    <div 
                                                        key={idx} 
                                                        className="shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-espresso-700 cursor-pointer hover:opacity-90 transition-opacity active:scale-95"
                                                        onClick={() => {
                                                            const globalUrls = urls.map((u: string) => u.startsWith('/') ? `${API_BASE}${u}` : u);
                                                            setActiveGalleryUrls(globalUrls);
                                                            setActiveGalleryIndex(idx);
                                                        }}
                                                    >
                                                        <MediaRenderer src={url} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                    
                                    <div className="mt-1">
                                        <CommentSheet 
                                            isOpen={true} 
                                            postId={post.id} 
                                            onClose={() => {}} 
                                            isEmbedded={true}
                                        />
                                    </div>
                                </article>
                            ))
                        )}

                        {activeTab === 'SCHEDULE' && isMember && (
                            <div className="space-y-4">
                                {['OWNER', 'ADMIN', 'EVENT_MANAGER'].includes(role) && (
                                    <div className="bg-espresso-900 border border-espresso-700 p-4 rounded-2xl flex flex-col gap-3">
                                        <button 
                                            onClick={() => setShowEventForm(!showEventForm)}
                                            className="w-full py-2 bg-amber-500/20 text-amber-500 font-bold rounded-xl border border-amber-500/30 hover:bg-amber-500 hover:text-espresso-950 transition-colors flex justify-center items-center gap-2"
                                        >
                                            <Calendar size={18} /> 
                                            {showEventForm ? t('club_detail.btn_close_event_form') : t('club_detail.btn_create_event')}
                                        </button>

                                        {showEventForm && (
                                            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3 mt-2">
                                                <input 
                                                    className="bg-espresso-950 text-sm px-3 py-2.5 rounded-xl border border-espresso-800 text-white focus:outline-none focus:border-amber-500"
                                                    placeholder={t('club_detail.ph_event_title')}
                                                    value={eventFormData.title}
                                                    onChange={e => setEventFormData({...eventFormData, title: e.target.value})}
                                                    required
                                                />
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="date"
                                                        className="flex-1 bg-espresso-950 text-sm px-3 py-2.5 rounded-xl border border-espresso-800 text-white focus:outline-none focus:border-amber-500"
                                                        value={eventFormData.date}
                                                        onChange={e => setEventFormData({...eventFormData, date: e.target.value})}
                                                        required
                                                    />
                                                    <input 
                                                        type="time"
                                                        className="flex-1 bg-espresso-950 text-sm px-3 py-2.5 rounded-xl border border-espresso-800 text-white focus:outline-none focus:border-amber-500"
                                                        value={eventFormData.time}
                                                        onChange={e => setEventFormData({...eventFormData, time: e.target.value})}
                                                        required
                                                    />
                                                </div>
                                                <input 
                                                    className="bg-espresso-950 text-sm px-3 py-2.5 rounded-xl border border-espresso-800 text-white focus:outline-none focus:border-amber-500"
                                                    placeholder={t('club_detail.ph_event_location')}
                                                    value={eventFormData.location}
                                                    onChange={e => setEventFormData({...eventFormData, location: e.target.value})}
                                                    required
                                                />
                                                <textarea 
                                                    className="bg-espresso-950 text-sm px-3 py-2.5 rounded-xl border border-espresso-800 text-white resize-none h-20 focus:outline-none focus:border-amber-500"
                                                    placeholder={t('club_detail.ph_event_content')}
                                                    value={eventFormData.content}
                                                    onChange={e => setEventFormData({...eventFormData, content: e.target.value})}
                                                />
                                                <button type="submit" disabled={isSubmittingPost} className="bg-amber-500 text-espresso-950 py-3 rounded-xl font-bold mt-1 hover:bg-amber-400">
                                                    {t('club_detail.btn_register_event')}
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                )}

                                {posts.filter(p => p.postType === 'EVENT').length === 0 ? (
                                    <div className="p-10 text-center text-espresso-400">
                                        <Calendar size={48} className="mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">{t('club_detail.msg_no_events')}</p>
                                    </div>
                                ) : (
                                    posts.filter(p => p.postType === 'EVENT').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(post => {
                                        let eventDate = '';
                                        let location = '';
                                        try {
                                            if (post.recipeData) {
                                                const d = JSON.parse(post.recipeData);
                                                eventDate = d.eventDate;
                                                location = d.location;
                                            }
                                        } catch(e) {}
                                        
                                        const eventTimeStr = eventDate ? new Date(eventDate).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                                        const isPast = eventDate && new Date(eventDate).getTime() < Date.now();

                                        return (
                                            <article key={post.id} className={`p-5 rounded-2xl border ${isPast ? 'bg-espresso-900/40 border-espresso-800/50 opacity-80' : 'bg-emerald-900/20 border-emerald-500/30 shadow-lg'}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isPast ? 'bg-espresso-800 text-espresso-400' : 'bg-emerald-500 text-white'}`}>
                                                            {isPast ? t('club_detail.lbl_event_ended') : t('club_detail.lbl_event_dday') + Math.max(0, Math.ceil((new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                                                        </span>
                                                        <h3 className="text-lg font-black text-espresso-50 mt-2">{post.content.split('\n')[0]}</h3>
                                                        <div className="flex items-center gap-4 mt-2 text-[13px] font-medium text-espresso-200">
                                                            <div className="flex items-center gap-1.5"><Calendar size={14} className="text-amber-500" /> {eventTimeStr}</div>
                                                            <div className="flex items-center gap-1.5"><MapPin size={14} className="text-amber-500" /> {location}</div>
                                                        </div>
                                                    </div>
                                                    {(post.author?.id === currentUserId || post.authorId === currentUserId || ['OWNER', 'ADMIN', 'CONTENT_MANAGER', 'EVENT_MANAGER'].includes(role)) && (
                                                        <button onClick={() => handleDeletePost(post.id)} className="p-2 text-espresso-500 hover:text-red-500 bg-espresso-900/50 rounded-full transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[13px] text-espresso-300 whitespace-pre-wrap mt-3 border-t border-espresso-800/50 pt-3">{post.content.split('\n').slice(1).join('\n')}</p>
                                                
                                                {/* RSVP Poll Section */}
                                                {post.poll && (
                                                    <div className="mt-5 bg-espresso-950/60 rounded-xl p-4 border border-espresso-800/50">
                                                        <h4 className="text-[13px] font-bold text-amber-500 mb-3 flex items-center gap-2"><UserCheck size={14} /> {post.poll.question}</h4>
                                                        <div className="flex gap-2">
                                                            {post.poll.options.map((opt: any) => {
                                                                const isVoted = opt.votes && opt.votes.some((v: any) => v.userId === currentUserId);
                                                                return (
                                                                    <button 
                                                                        key={opt.id}
                                                                        onClick={() => handleVote(post.id, opt.id)}
                                                                        className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all flex flex-col items-center gap-1 ${isVoted ? 'bg-amber-500 text-espresso-950 shadow-md scale-105' : 'bg-espresso-900 text-espresso-300 hover:bg-espresso-800 border border-espresso-800'}`}
                                                                    >
                                                                        <span>{opt.text}</span>
                                                                        <span className={`text-[11px] ${isVoted ? 'text-espresso-900' : 'text-espresso-500'}`}>{opt._count?.votes || 0}명</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {activeTab === 'GALLERY' && isMember && (
                            <div className="space-y-4">
                                {(() => {
                                    const allImages: string[] = [];
                                    posts.forEach(post => {
                                        if (post.image) {
                                            try {
                                                const parsed = JSON.parse(post.image);
                                                if (Array.isArray(parsed)) allImages.push(...parsed);
                                                else allImages.push(post.image);
                                            } catch(e) {
                                                allImages.push(post.image);
                                            }
                                        }
                                    });
                                    if (allImages.length === 0) {
                                        return (
                                            <div className="p-10 text-center text-espresso-400 flex flex-col items-center">
                                                <Grid size={48} className="mb-4 opacity-20" />
                                                <p className="text-sm">아직 소모임에 공유된 사진이 없습니다.</p>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="grid grid-cols-3 gap-1">
                                            {allImages.map((url, idx) => {
                                                const globalUrls = allImages.map(u => u.startsWith('/') ? `${API_BASE}${u}` : u);
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className="aspect-square bg-espresso-900 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                                                        onClick={() => {
                                                            setActiveGalleryUrls(globalUrls);
                                                            setActiveGalleryIndex(idx);
                                                        }}
                                                    >
                                                        <MediaRenderer src={url} className="w-full h-full object-cover" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                    </div>
                )}
            </main>
            {/* Manager Modal */}
            <AnimatePresence>
                {isManagerModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    >
                        <motion.div 
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-espresso-900 border border-espresso-700 w-full sm:max-w-md h-[80vh] sm:h-auto sm:max-h-[85vh] rounded-t-[32px] sm:rounded-[24px] flex flex-col overflow-hidden"
                        >
                            <div className="p-4 border-b border-espresso-800 flex justify-between items-center sticky top-0 bg-espresso-900/90 backdrop-blur-md z-10">
                                <h2 className="text-lg font-bold text-espresso-50 ml-2">{t('club_detail.title_manage_members')}</h2>
                                <button onClick={() => setIsManagerModalOpen(false)} className="p-2 text-espresso-400 hover:text-white bg-espresso-800 rounded-full">
                                    <CloseIcon size={20} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-[100px] sm:pb-10 hide-scrollbar">
                                {isLoadingMembers ? (
                                    <div className="text-center py-10 text-espresso-400 text-sm">{t('club_detail.loading_list')}</div>
                                ) : (
                                    <>
                                        {/* Recruitment Controls */}
                                        <div className="bg-espresso-950 p-4 rounded-xl border border-espresso-800 flex flex-col gap-3 mb-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[13px] font-bold text-amber-500">{t('club_detail.title_recruit_status')}</span>
                                                <button 
                                                    disabled={isUpdatingRecruitment}
                                                    onClick={() => handleRecruitmentToggle(!(club.isRecruiting ?? true))}
                                                    className={`relative w-12 h-6 rounded-full transition-colors ${club.isRecruiting ?? true ? 'bg-amber-500' : 'bg-espresso-700'}`}
                                                >
                                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${club.isRecruiting ?? true ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[11px] text-espresso-300 font-bold">{t('club_detail.lbl_deadline')}</span>
                                                <input 
                                                    type="date" 
                                                    disabled={isUpdatingRecruitment}
                                                    value={club.recruitDeadline ? new Date(club.recruitDeadline).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => handleDeadlineChange(e.target.value)}
                                                    className="bg-espresso-800 border border-espresso-700 text-espresso-50 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {role === 'OWNER' && (
                                            <div className="bg-espresso-950 p-4 rounded-xl border border-espresso-800 flex flex-col gap-3 mb-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[13px] font-bold text-red-500">소모임 비공개 전환</span>
                                                    <button 
                                                        onClick={() => handlePrivacyToggle(!club.isPrivate)}
                                                        className={`relative w-12 h-6 rounded-full transition-colors ${club.isPrivate ? 'bg-red-500' : 'bg-espresso-700'}`}
                                                    >
                                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${club.isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-espresso-400">비공개로 전환하면 모임 멤버 외에는 게시글을 볼 수 없습니다.</p>
                                            </div>
                                        )}

                                        {/* Member Stats Header */}
                                        <div className="bg-espresso-950 p-4 rounded-xl border border-espresso-800 flex justify-between items-center px-6 mb-2">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[11px] text-espresso-400 font-bold mb-1">현재 참여 중인 {t('club_detail.unit_member')}</span>
                                                <span className="text-xl font-black text-emerald-500">{clubMembers.filter(m => m.role !== 'PENDING').length}</span>
                                            </div>
                                            <div className="w-px h-8 bg-espresso-800"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[11px] text-espresso-400 font-bold mb-1">{t('club_detail.lbl_left_members')}</span>
                                                <span className="text-xl font-black text-red-500/80">{club?.leftCount || 0}</span>
                                            </div>
                                        </div>

                                        {/* Pending List */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-bold text-amber-500 px-1 border-b border-espresso-800 pb-2">{t('club_detail.title_pending_members')} ({clubMembers.filter(m => m.role === 'PENDING').length}{t('club_detail.unit_person')})</h3>
                                            {clubMembers.filter(m => m.role === 'PENDING').length === 0 ? (
                                                <p className="text-xs text-espresso-400 px-1 py-2">{t('club_detail.msg_no_pending')}</p>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    {clubMembers.filter(m => m.role === 'PENDING').map(m => (
                                                        <div key={m.id} className="bg-espresso-950 p-4 rounded-2xl border border-espresso-800 flex flex-col">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-3">
                                                                    <img src={m.user.profileImageUrl ? (m.user.profileImageUrl.startsWith('http') ? m.user.profileImageUrl : `${API_BASE}${m.user.profileImageUrl}`) : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100'} className="w-10 h-10 rounded-full object-cover border border-espresso-700" alt="profile" />
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-sm text-white">{m.user.nickname}</span>
                                                                        <span className="text-[10px] text-espresso-400 font-medium">{new Date(m.joinedAt).toLocaleDateString()} {t('club_detail.lbl_applied')}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleMemberAction(m.userId, 'APPROVE')} className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors"><Check size={18} /></button>
                                                                    <button onClick={() => handleMemberAction(m.userId, 'KICK')} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><CloseIcon size={18} /></button>
                                                                </div>
                                                            </div>
                                                            {m.applicationData && (() => {
                                                                try {
                                                                    const data = JSON.parse(m.applicationData);
                                                                    return (
                                                                        <div className="mt-2 p-4 bg-espresso-900 border border-espresso-800 rounded-xl text-xs space-y-3">
                                                                            <div><span className="text-amber-500 font-bold mb-1.5 block">☕ {t('club_detail.lbl_taste')}</span><p className="text-espresso-200 leading-relaxed">{data.coffee}</p></div>
                                                                            <div><span className="text-amber-500 font-bold mb-1.5 block">🕒 {t('club_detail.lbl_time_loc')}</span><p className="text-espresso-200 leading-relaxed">{data.availability}</p></div>
                                                                            <div><span className="text-amber-500 font-bold mb-1.5 block">💬 {t('club_detail.lbl_intro')}</span><p className="text-espresso-200 leading-relaxed">{data.intro}</p></div>
                                                                        </div>
                                                                    );
                                                                } catch(e) { return null; }
                                                            })()}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Active Members */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-bold text-espresso-300 px-1 border-b border-espresso-800 pb-2">{t('club_detail.lbl_current_members')} ({clubMembers.filter(m => m.role !== 'PENDING').length}{t('club_detail.unit_person')})</h3>
                                            <div className="flex flex-col gap-2">
                                                {clubMembers.filter(m => m.role !== 'PENDING').map(m => (
                                                    <div key={m.id} className="bg-espresso-950/50 p-3 rounded-xl border border-espresso-800/50 flex flex-col opacity-80">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative">
                                                                    <img src={m.user.profileImageUrl ? (m.user.profileImageUrl.startsWith('http') ? m.user.profileImageUrl : `${API_BASE}${m.user.profileImageUrl}`) : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100'} className="w-10 h-10 rounded-full object-cover border border-espresso-700" alt="profile" />
                                                                    {m.role === 'OWNER' && <div className="absolute -top-1 -right-1 bg-amber-500 p-0.5 rounded-full"><Settings size={10} className="text-black" /></div>}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm text-espresso-100">{m.user.nickname}</span>
                                                                    <span className="text-[10px] text-espresso-500">
                                                                        {getRoleLabel(m.role, t)} • {new Date(m.joinedAt).toLocaleDateString()} {t('club_detail.status_joined')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 items-center">
                                                                {role === 'OWNER' && m.role !== 'OWNER' && (
                                                                    <select
                                                                        value={m.role}
                                                                        onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                                                                        className="bg-espresso-900 border border-espresso-700 text-espresso-50 text-[10px] rounded px-1 py-1 focus:outline-none"
                                                                    >
                                                                        <option value="ADMIN">부방장</option>
                                                                        <option value="EVENT_MANAGER">일정 관리자</option>
                                                                        <option value="CONTENT_MANAGER">게시판 관리자</option>
                                                                        <option value="MEMBER">정회원</option>
                                                                        <option value="NEWBIE">새내기</option>
                                                                    </select>
                                                                )}
                                                                {m.role !== 'OWNER' && (
                                                                    <button onClick={() => handleMemberAction(m.userId, 'KICK')} className="p-1 text-espresso-500 hover:text-red-400 rounded-lg transition-colors">
                                                                        <UserMinus size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {role === 'OWNER' && (
                                                            <div className="mt-2 flex gap-1 items-center bg-espresso-900/50 p-1.5 rounded-lg border border-espresso-800/30">
                                                                <span className="text-[10px] text-espresso-400 mr-1">배지 부여:</span>
                                                                {[
                                                                    { id: 'PHOTOGRAPHER', icon: '📸', label: '포토그래퍼' },
                                                                    { id: 'TOP_CHATTER', icon: '💬', label: '수다쟁이' },
                                                                    { id: 'SOCIAL_BUTTERFLY', icon: '🏃', label: '프로참석러' },
                                                                    { id: 'CUPPER', icon: '☕', label: '커피 감별사' }
                                                                ].map(badge => {
                                                                    let hasBadge = false;
                                                                    try { hasBadge = m.badges && JSON.parse(m.badges).includes(badge.id); } catch(e) {}
                                                                    return (
                                                                        <button 
                                                                            key={badge.id}
                                                                            onClick={() => handleBadgeChange(m.userId, m.badges, badge.id)}
                                                                            className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${hasBadge ? 'bg-amber-500 text-black' : 'bg-espresso-800 text-espresso-400 hover:bg-espresso-700'}`}
                                                                            title={badge.label}
                                                                        >
                                                                            {badge.icon}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        {m.applicationData && (() => {
                                                            try {
                                                                const data = JSON.parse(m.applicationData);
                                                                return (
                                                                    <div className="mt-3 p-3 bg-espresso-900 border border-espresso-800/50 rounded-lg text-xs space-y-2">
                                                                        <div><span className="text-amber-500/80 font-bold mb-1 block">☕ {t('club_detail.lbl_taste')}</span><p className="text-espresso-300">{data.coffee}</p></div>
                                                                        <div><span className="text-amber-500/80 font-bold mb-1 block">🕒 {t('club_detail.lbl_time_loc')}</span><p className="text-espresso-300">{data.availability}</p></div>
                                                                        <div><span className="text-amber-500/80 font-bold mb-1 block">💬 {t('club_detail.lbl_intro')}</span><p className="text-espresso-300">{data.intro}</p></div>
                                                                    </div>
                                                                );
                                                            } catch(e) { return null; }
                                                        })()}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Danger Zone */}
                                        {role === 'OWNER' && (
                                            <div className="mt-8 pt-6 border-t border-red-500/20">
                                                <button 
                                                    onClick={handleDeleteClub}
                                                    className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Trash2 size={20} />
                                                    소모임 삭제 (폭파하기)
                                                </button>
                                                <p className="text-[11px] text-red-400 text-center mt-2 font-medium">경고: 이 동작은 취소할 수 없으며, 모든 멤버가 더 이상 접근할 수 없게 됩니다.</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Join Form Modal */}
            <AnimatePresence>
                {isJoinModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    >
                        <motion.div 
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-espresso-900 w-full sm:max-w-md rounded-t-[32px] sm:rounded-[24px] flex flex-col p-6 shadow-2xl pb-10 sm:pb-6"
                        >
                            <h2 className="text-xl font-bold mb-2">{t('club_detail.title_join_form')}</h2>
                            <p className="text-sm text-espresso-400 mb-6">{t('club_detail.desc_join_form')}</p>
                            
                            <div className="space-y-5 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-amber-500 mb-2">☕ {t('club_detail.lbl_join_taste')}</label>
                                    <input 
                                        className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors" 
                                        placeholder={t('club_detail.ph_join_taste')}
                                        value={joinAnswers.coffee}
                                        onChange={e => setJoinAnswers(prev => ({...prev, coffee: e.target.value}))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-amber-500 mb-2">🕒 {t('club_detail.lbl_time_loc')}</label>
                                    <input 
                                        className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors" 
                                        placeholder={t('club_detail.ph_join_time_loc')}
                                        value={joinAnswers.availability}
                                        onChange={e => setJoinAnswers(prev => ({...prev, availability: e.target.value}))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-amber-500 mb-2">💬 {t('club_detail.lbl_join_intro')}</label>
                                    <textarea 
                                        className="w-full bg-espresso-950 border border-espresso-800 rounded-xl px-4 py-3 text-sm h-28 resize-none focus:outline-none focus:border-amber-500 transition-colors" 
                                        placeholder={t('club_detail.ph_join_intro')}
                                        value={joinAnswers.intro}
                                        onChange={e => setJoinAnswers(prev => ({...prev, intro: e.target.value}))}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setIsJoinModalOpen(false)} className="flex-1 py-3.5 bg-espresso-800 text-espresso-300 rounded-xl font-bold hover:bg-espresso-700 transition-colors">{t('club_detail.btn_cancel')}</button>
                                <button 
                                    onClick={() => submitJoinRequest(joinAnswers)}
                                    disabled={!joinAnswers.coffee.trim() || !joinAnswers.availability.trim() || isJoining}
                                    className="flex-1 py-3.5 bg-amber-500 text-espresso-950 rounded-xl font-bold disabled:opacity-50 hover:bg-amber-400 transition-colors"
                                >
                                    {isJoining ? t('club_detail.btn_submitting') : t('club_detail.btn_submit_form')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Map Modal */}

            
            {/* User Profile Modal */}
            {selectedUserIdForProfile && (
                <UserPublicProfileModal 
                    userId={selectedUserIdForProfile} 
                    onClose={() => setSelectedUserIdForProfile(null)} 
                />
            )}

            {/* Fullscreen Post Image Modal */}
            {activeGalleryIndex !== null && activeGalleryUrls[activeGalleryIndex] && (
                <div 
                    className="fixed inset-0 z-[500] bg-espresso-950/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setActiveGalleryIndex(null)}
                >
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActiveGalleryIndex(null); }}
                        className="absolute top-6 right-6 p-3 bg-espresso-900/10 text-espresso-50 rounded-full hover:bg-espresso-900/40 transition-colors z-[520]"
                    >
                        <CloseIcon size={24} />
                    </button>

                    {activeGalleryIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setActiveGalleryIndex(activeGalleryIndex - 1); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-espresso-950/50 hover:bg-espresso-950/70 rounded-full text-espresso-50 z-[520] backdrop-blur-sm transition-colors shadow-2xl"
                        >
                            <ChevronLeft size={32} />
                        </button>
                    )}

                    {activeGalleryIndex < activeGalleryUrls.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setActiveGalleryIndex(activeGalleryIndex + 1); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-espresso-950/50 hover:bg-espresso-950/70 rounded-full text-espresso-50 z-[520] backdrop-blur-sm transition-colors shadow-2xl"
                        >
                            <ChevronRight size={32} />
                        </button>
                    )}

                    <MediaRenderer 
                        src={activeGalleryUrls[activeGalleryIndex]} 
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl z-[510]" 
                    />

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-espresso-950/60 backdrop-blur-md px-4 py-1.5 rounded-full text-espresso-50 font-medium text-sm tracking-widest shadow-xl z-[520]">
                        {activeGalleryIndex + 1} / {activeGalleryUrls.length}
                    </div>
                </div>
            )}
        </div>
    );
}
