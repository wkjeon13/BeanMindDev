import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '@/utils/apiConfig';

export default function AdminAnnouncements() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Announcement Modal State
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [editAnnouncementId, setEditAnnouncementId] = useState<string | null>(null);
    const [announcementContent, setAnnouncementContent] = useState('');
    const [announcementLinkUrl, setAnnouncementLinkUrl] = useState('');
    const [isSystemPopup, setIsSystemPopup] = useState(false);
    const [noticeRegion, setNoticeRegion] = useState<'GLOBAL' | 'KR' | 'US'>('GLOBAL');
    const [announcementStartDate, setAnnouncementStartDate] = useState('');
    const [announcementEndDate, setAnnouncementEndDate] = useState('');
    const [announcementImage, setAnnouncementImage] = useState<File | null>(null);
    const [announcementImagePreview, setAnnouncementImagePreview] = useState<string | null>(null);
    const [announcementContentEn, setAnnouncementContentEn] = useState('');
    const [announcementImageEn, setAnnouncementImageEn] = useState<File | null>(null);
    const [announcementImagePreviewEn, setAnnouncementImagePreviewEn] = useState<string | null>(null);
    const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Admin Access Check
    useEffect(() => {
        if (!token || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR')) {
            alert(t('admin_dashboard.error_login_req'));
            navigate('/');
        } else {
            fetchData();
        }
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/admin/announcements`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                    return;
                }
                const data = await res.json();
                throw new Error(data.error || t('admin_dashboard.error_server'));
            }

            const data = await res.json();
            setAnnouncements(data);
        } catch (err: any) {
            setError(err.message || t('admin_dashboard.error_server'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAnnouncementModal = (anno?: any) => {
        if (anno) {
            setEditAnnouncementId(anno.id);
            setAnnouncementContent(anno.content || '');
            setAnnouncementLinkUrl(anno.recipeData || '');

            const formatLocalDate = (dateString: string) => {
                const d = new Date(dateString);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            setAnnouncementStartDate(anno.pinnedStartDate ? formatLocalDate(anno.pinnedStartDate) : '');
            setAnnouncementEndDate(anno.pinnedEndDate ? formatLocalDate(anno.pinnedEndDate) : '');
            setAnnouncementImagePreview(anno.image || null);
            setAnnouncementImage(null);
            setAnnouncementContentEn(anno.contentEn || '');
            setAnnouncementImagePreviewEn(anno.imageEn || null);
            setAnnouncementImageEn(null);
            setIsSystemPopup(anno.isSystemPopup || false);
            setNoticeRegion(anno.countryCode || 'GLOBAL');
        } else {
            setEditAnnouncementId(null);
            setAnnouncementContent('');
            setAnnouncementLinkUrl('');
            setAnnouncementStartDate('');
            setAnnouncementEndDate('');
            setAnnouncementImage(null);
            setAnnouncementImagePreview(null);
            setAnnouncementContentEn('');
            setAnnouncementImageEn(null);
            setAnnouncementImagePreviewEn(null);
            setIsSystemPopup(false);
            setNoticeRegion('GLOBAL');
        }
        setIsAnnouncementModalOpen(true);
    };

    const handleSaveAnnouncement = async () => {
        const hasContent = Boolean(announcementContent.trim() || announcementContentEn.trim());
        const hasImage = Boolean(announcementImage || announcementImagePreview || announcementImageEn || announcementImagePreviewEn);

        if (!hasContent && !hasImage) {
            alert(t('admin_announcements.err_empty_all', '공지 내용 또는 첨부 이미지 중 하나 이상을 등록해주세요.'));
            return;
        }

        setIsSavingAnnouncement(true);
        try {
            const formData = new FormData();
            let base64Image = null;
            let base64ImageEn = null;

            if (announcementImage) {
                base64Image = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(announcementImage);
                });
            }
            if (announcementImageEn) {
                base64ImageEn = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(announcementImageEn);
                });
            }

            const payload: any = {
                content: announcementContent,
                contentEn: announcementContentEn,
                startDate: announcementStartDate ? new Date(`${announcementStartDate}T00:00:00`).toISOString() : null,
                endDate: announcementEndDate ? new Date(`${announcementEndDate}T23:59:59`).toISOString() : null,
                isSystemPopup,
                countryCode: noticeRegion,
                linkUrl: announcementLinkUrl.trim() || null,
            };

            if (base64Image) {
                payload.image = base64Image;
            } else if (announcementImagePreview && !announcementImagePreview.startsWith('blob:')) {
                payload.image = announcementImagePreview;
            }
            if (base64ImageEn) {
                payload.imageEn = base64ImageEn;
            } else if (announcementImagePreviewEn && !announcementImagePreviewEn.startsWith('blob:')) {
                payload.imageEn = announcementImagePreviewEn;
            }

            const url = editAnnouncementId 
                ? `${API_BASE}/api/admin/announcements/${editAnnouncementId}`
                : `${API_BASE}/api/admin/announcements`;

            const res = await fetch(url, {
                method: editAnnouncementId ? 'PUT' : 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(editAnnouncementId ? t('admin_announcements.alert_save_ok_edit', '공지가 수정되었습니다.') : t('admin_announcements.alert_save_ok_new', '새 공지가 등록되었습니다.'));
                setIsAnnouncementModalOpen(false);
                fetchData();
            } else {
                const data = await res.json();
                alert(t('admin_announcements.alert_save_fail', '오류: {{error}}', {error: data.error}));
            }
        } catch (err) {
            console.error('Save announcement error:', err);
            alert(t('admin_dashboard.error_server'));
        } finally {
            setIsSavingAnnouncement(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!window.confirm(t('admin_announcements.confirm_delete', '정말로 이 공지를 삭제하시겠습니까?'))) return;

        try {
            const res = await fetch(`${API_BASE}/api/admin/announcements/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert(t('admin_announcements.alert_delete_ok', '공지가 삭제되었습니다.'));
                fetchData();
            } else {
                const data = await res.json();
                alert(t('admin_announcements.alert_save_fail', '오류: {{error}}', {error: data.error}));
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        }
    };

    return (
        <div className="h-full w-full bg-espresso-950 overflow-y-auto pb-safe font-sans">
            <div className="max-w-7xl mx-auto flex flex-col min-h-full">
                {/* Header */}
                <header className="px-6 py-6 pt-safe mt-4 shrink-0 border-b border-espresso-700">
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-espresso-900 flex items-center justify-center border border-coffee-100 text-coffee-600 hover:bg-espresso-950 transition-colors active:scale-95 shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <Shield className="text-espresso-50" size={28} />
                        <h1 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('admin_announcements.title', '시스템 공지 관리')}</h1>
                    </div>
                    <p className="text-sm text-espresso-300 pl-14">{t('admin_announcements.subtitle', '시스템 팝업 및 커피톡 상단에 보여질 공지사항을 관리합니다.')}</p>
                </header>

                {/* Content */}
                <div className="flex-1 p-4 space-y-4">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-coffee-400">
                            <div className="w-8 h-8 rounded-full border-4 border-espresso-700 border-t-coffee-900 animate-spin mb-4" />
                            <p className="font-medium">{t('admin_dashboard.loading')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
                                <h2 className="text-lg font-bold text-espresso-50">{t('admin_announcements.title', '시스템 공지 관리')}</h2>
                                <button 
                                    onClick={() => handleOpenAnnouncementModal()}
                                    className="px-4 py-2 bg-coffee-900 text-espresso-50 text-sm font-bold rounded-xl hover:bg-coffee-800 transition-colors flex items-center gap-1.5"
                                >{t('admin_announcements.btn_new', '+ 새 공지 작성')}</button>
                            </div>

                            {announcements.length === 0 ? (
                                <div className="text-center py-10 text-coffee-400">{t('admin_announcements.no_data', '등록된 공지가 없습니다.')}</div>
                            ) : (
                                announcements.map((anno) => {
                                    const isActive = (!anno.pinnedStartDate || new Date(anno.pinnedStartDate).getTime() <= Date.now()) && 
                                                     (!anno.pinnedEndDate || new Date(anno.pinnedEndDate).getTime() >= Date.now());
                                    return (
                                        <div key={anno.id} className={`bg-espresso-900 p-5 rounded-2xl shadow-sm border ${isActive ? 'border-amber-400' : 'border-coffee-100'} flex flex-col gap-3`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${isActive ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-espresso-300'}`}>
                                                        {isActive ? '진행중' : '대기/종료'}
                                                    </span>
                                                    <span className="text-xs text-espresso-300">
                                                        {anno.pinnedStartDate ? new Date(anno.pinnedStartDate).toLocaleDateString() : t('admin_announcements.lbl_unscheduled', '지정안됨')} ~ {anno.pinnedEndDate ? new Date(anno.pinnedEndDate).toLocaleDateString() : t('admin_announcements.lbl_unscheduled', '지정안됨')}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleOpenAnnouncementModal(anno)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">{t('admin_announcements.btn_edit', '수정')}</button>
                                                    <button onClick={() => handleDeleteAnnouncement(anno.id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">{t('admin_announcements.btn_delete', '삭제')}</button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-espresso-50 whitespace-pre-wrap leading-relaxed">{anno.content}</p>
                                            {anno.image && (
                                                <div className="w-32 h-32 rounded-lg overflow-hidden border border-coffee-100">
                                                    <img src={anno.image.startsWith('/') ? `${API_BASE}${anno.image}` : anno.image} alt="announcement image" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Announcement Modal Edit/Create */}
            <AnimatePresence>
                {isAnnouncementModalOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAnnouncementModalOpen(false)} className="fixed inset-0 bg-coffee-950/80 backdrop-blur-sm z-[9998]" />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} 
                            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} 
                            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }} 
                            transition={{ type: "spring", stiffness: 300, damping: 30 }} 
                            className="fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-2xl bg-espresso-900 rounded-2xl z-[9999] p-6 flex flex-col max-h-[90vh] shadow-2xl border border-espresso-700"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-espresso-50">{editAnnouncementId ? t('admin_announcements.modal_title_edit', '공지 수정') : t('admin_announcements.modal_title_new', '새 공지 작성')}</h2>
                                <button onClick={() => setIsAnnouncementModalOpen(false)} className="text-coffee-400 hover:text-coffee-600"><X size={24} /></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pb-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-espresso-50">{t('admin_announcements.lbl_content', '내용 (KR)')}</label>
                                        <span className="text-[11px] text-espresso-400">※ 이미지만 등록 시 생략 가능</span>
                                    </div>
                                    <textarea 
                                        value={announcementContent} 
                                        onChange={e => setAnnouncementContent(e.target.value)} 
                                        placeholder={t('admin_announcements.ph_content', '공지 내용을 입력하세요... (이미지 공지 시 비워둘 수 있습니다)')} 
                                        className="w-full bg-espresso-950 border border-espresso-700 p-3 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-espresso-50 placeholder:text-espresso-500 text-[14px] min-h-[90px] resize-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-espresso-50">{t('admin_announcements.lbl_content_en', '내용 (EN)')}</label>
                                        <span className="text-[11px] text-espresso-400">※ 이미지만 등록 시 생략 가능</span>
                                    </div>
                                    <textarea 
                                        value={announcementContentEn} 
                                        onChange={e => setAnnouncementContentEn(e.target.value)} 
                                        placeholder={t('admin_announcements.ph_content_en', '영문 공지 내용을 입력하세요...')} 
                                        className="w-full bg-espresso-950 border border-espresso-700 p-3 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-espresso-50 placeholder:text-espresso-500 text-[14px] min-h-[90px] resize-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-espresso-50">공지 이동 링크 URL (선택)</label>
                                        <span className="text-[11px] text-espresso-400">이미지 클릭 시 연결될 URL</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={announcementLinkUrl} 
                                        onChange={e => setAnnouncementLinkUrl(e.target.value)} 
                                        placeholder="https://example.com 또는 웹페이지 경로..." 
                                        className="w-full bg-espresso-950 border border-espresso-700 h-[42px] px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-700 text-espresso-50 text-sm placeholder:text-espresso-500" 
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-espresso-50">{t('admin_announcements.lbl_start', '시작일 (선택)')}</label>
                                        <input type="date" style={{ colorScheme: 'dark' }} value={announcementStartDate} onChange={e => setAnnouncementStartDate(e.target.value)} className="w-full bg-espresso-950 border border-espresso-700 h-[42px] px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-700 text-espresso-50 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-espresso-50">{t('admin_announcements.lbl_end', '종료일 (선택)')}</label>
                                        <input type="date" style={{ colorScheme: 'dark' }} value={announcementEndDate} onChange={e => setAnnouncementEndDate(e.target.value)} className="w-full bg-espresso-950 border border-espresso-700 h-[42px] px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-700 text-espresso-50 text-sm" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-espresso-50">{t('admin_announcements.lbl_img', '첨부 이미지 (KR)')}</label>
                                        <div className="flex items-center gap-3">
                                            <label className="shrink-0 w-24 h-24 border-2 border-dashed border-espresso-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-espresso-950 hover:border-coffee-500 transition-colors">
                                                <span className="text-xs font-bold text-espresso-300">{t('admin_announcements.btn_upload', '+ 업로드')}</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                    if(e.target.files && e.target.files[0]) {
                                                        setAnnouncementImage(e.target.files[0]);
                                                        setAnnouncementImagePreview(URL.createObjectURL(e.target.files[0]));
                                                    }
                                                }} />
                                            </label>
                                            {announcementImagePreview && (
                                                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-coffee-100">
                                                    <img src={announcementImagePreview.startsWith('/') ? `${API_BASE}${announcementImagePreview}` : announcementImagePreview} alt="preview" className="w-full h-full object-cover" />
                                                    <button onClick={() => { setAnnouncementImage(null); setAnnouncementImagePreview(null); }} className="absolute top-1 right-1 bg-espresso-950/50 text-espresso-50 rounded-full p-1"><X size={14}/></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-espresso-50">{t('admin_announcements.lbl_img_en', '첨부 이미지 (EN)')}</label>
                                        <div className="flex items-center gap-3">
                                            <label className="shrink-0 w-24 h-24 border-2 border-dashed border-espresso-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-espresso-950 hover:border-coffee-500 transition-colors">
                                                <span className="text-xs font-bold text-espresso-300">{t('admin_announcements.btn_upload', '+ 업로드')}</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                    if(e.target.files && e.target.files[0]) {
                                                        setAnnouncementImageEn(e.target.files[0]);
                                                        setAnnouncementImagePreviewEn(URL.createObjectURL(e.target.files[0]));
                                                    }
                                                }} />
                                            </label>
                                            {announcementImagePreviewEn && (
                                                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-coffee-100">
                                                    <img src={announcementImagePreviewEn.startsWith('/') ? `${API_BASE}${announcementImagePreviewEn}` : announcementImagePreviewEn} alt="preview" className="w-full h-full object-cover" />
                                                    <button onClick={() => { setAnnouncementImageEn(null); setAnnouncementImagePreviewEn(null); }} className="absolute top-1 right-1 bg-espresso-950/50 text-espresso-50 rounded-full p-1"><X size={14}/></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 pb-2 border-t border-espresso-700/50 mt-2 shrink-0">
                                    <label className="text-sm font-bold text-espresso-50 block mb-3">타겟 지역 (Region)</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'GLOBAL', label: 'GLOBAL', desc: '전 세계' },
                                            { id: 'KR', label: 'KR', desc: '대한민국' },
                                            { id: 'US', label: 'US', desc: '미국' }
                                        ].map((region) => (
                                            <button
                                                key={region.id}
                                                onClick={() => setNoticeRegion(region.id as any)}
                                                className={`flex-1 p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${noticeRegion === region.id ? 'border-coffee-500 bg-coffee-500/10' : 'border-espresso-800 bg-espresso-950 hover:border-coffee-500/50'}`}
                                            >
                                                <span className={`text-sm font-bold ${noticeRegion === region.id ? 'text-coffee-400' : 'text-espresso-100'}`}>{region.label}</span>
                                                <span className="text-[11px] text-espresso-400 mt-0.5">{region.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 pb-2 border-t border-espresso-700/50 mt-2 shrink-0">
                                    <label className="text-sm font-bold text-espresso-50 block mb-3">공지 노출 유형</label>
                                    <div className="space-y-2">
                                        <div 
                                            onClick={() => setIsSystemPopup(false)}
                                            className={`flex items-start gap-3 cursor-pointer group w-full p-3 rounded-xl border transition-all ${!isSystemPopup ? 'border-coffee-500 bg-coffee-500/10' : 'border-espresso-800 bg-espresso-950 hover:border-coffee-500/50'}`}
                                        >
                                            <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                                                <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors ${!isSystemPopup ? 'border-coffee-500' : 'border-espresso-500'}`}>
                                                    <div className={`w-2.5 h-2.5 rounded-full bg-coffee-500 transition-opacity ${!isSystemPopup ? 'opacity-100' : 'opacity-0'}`}></div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col pointer-events-none">
                                                <span className={`text-sm font-bold transition-colors ${!isSystemPopup ? 'text-coffee-400' : 'text-espresso-100 group-hover:text-espresso-50'}`}>커피톡 공지</span>
                                                <span className="text-[12px] text-espresso-400 mt-1 leading-relaxed">커피톡 피드 상단에만 고정되어 노출됩니다.</span>
                                            </div>
                                        </div>

                                        <div 
                                            onClick={() => setIsSystemPopup(true)}
                                            className={`flex items-start gap-3 cursor-pointer group w-full p-3 rounded-xl border transition-all ${isSystemPopup ? 'border-red-500 bg-red-500/10' : 'border-espresso-800 bg-espresso-950 hover:border-red-500/50'}`}
                                        >
                                            <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                                                <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors ${isSystemPopup ? 'border-red-500' : 'border-espresso-500'}`}>
                                                    <div className={`w-2.5 h-2.5 rounded-full bg-red-500 transition-opacity ${isSystemPopup ? 'opacity-100' : 'opacity-0'}`}></div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col pointer-events-none">
                                                <span className={`text-sm font-bold transition-colors ${isSystemPopup ? 'text-red-400' : 'text-espresso-100 group-hover:text-espresso-50'}`}>전체 공지 (시스템 팝업)</span>
                                                <span className="text-[12px] text-espresso-400 mt-1 leading-relaxed">사용자가 앱 진입 시 중앙 팝업창으로만 노출됩니다. (피드 제외)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-coffee-100 mt-auto">
                                <button 
                                    onClick={handleSaveAnnouncement} 
                                    disabled={isSavingAnnouncement || (!announcementContent.trim() && !announcementContentEn.trim() && !announcementImage && !announcementImagePreview && !announcementImageEn && !announcementImagePreviewEn)} 
                                    className="w-full bg-coffee-900 text-espresso-50 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-coffee-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingAnnouncement ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : '저장하기'}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
