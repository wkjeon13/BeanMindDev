import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogIn, Store, ShieldCheck, ChevronRight, ChevronUp, ChevronDown, Mail, Lock, Shield, Users, Globe, Send, Inbox, Coffee, Database, MapPin, Share2, Trash2, KeyRound, Image as ImageIcon } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useGoogleLogin, GoogleLogin } from '@react-oauth/google';
import { API_BASE, getDeviceCountryCode } from '../utils/apiConfig';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { AppleSignIn } from '@capawesome/capacitor-apple-sign-in';
import { Share } from '@capacitor/share';
import { useTranslation } from 'react-i18next';
import HostAdDashboard from '../components/HostAdDashboard';
import PrescriptionTicket from '../components/PrescriptionTicket';
import HostQRScannerModal from '../components/community/HostQRScannerModal';
import { COFFEE_BEANS, BRANDS } from '../data/coffeeData';
import IAPPaymentModal from '../components/points/IAPPaymentModal';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { MagazineAd } from '../components/ads/MagazineAd';
import { useAdStore } from '../store/adStore';
import { compressImage } from '../utils/imageUtils';

// 지능형 품목 설정 복구 파서 (Promotion 카드 타이틀로부터 정적 품목 복원 지원)
const getItemsConfig = (cfg: any) => {
    if (!cfg) return null;
    let parsed = cfg.itemsConfig;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch (e) {
            parsed = null;
        }
    }
    
    if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
    }
    
    if (cfg.cardType === 'PROMOTION' && cfg.cardTitle) {
        const tokens = cfg.cardTitle.split(/[+,]/);
        const items: { key: string; label: string; target: number }[] = [];
        let index = 0;
        for (const token of tokens) {
            const trimmed = token.trim();
            if (!trimmed) continue;
            
            const match = trimmed.match(/^([^0-9]+?)\s*(\d+)\s*(?:잔|개|병|팩|개입)?$/);
            if (match) {
                const label = match[1].trim();
                const target = parseInt(match[2], 10);
                if (label && !isNaN(target)) {
                    items.push({
                        key: `item_${index}`,
                        label: label,
                        target: target
                    });
                    index++;
                }
            }
        }
        if (items.length > 0) {
            return items;
        }
    }
    
    return null;
};

export default function Profile() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    // 💡 도장판 남은 유효기간 D-Day 계산 헬퍼 함수
    const getStampCardRemainingDays = (updatedAtStr: string, validDays: number) => {
        if (!updatedAtStr) return null;
        const updatedAt = new Date(updatedAtStr);
        const expireDate = new Date(updatedAt.getTime() + validDays * 24 * 60 * 60 * 1000);
        const today = new Date();
        
        // 날짜 차이 구하기 (시간 부분은 제하고 날짜끼리만 비교)
        today.setHours(0, 0, 0, 0);
        expireDate.setHours(0, 0, 0, 0);
        
        const diffTime = expireDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays >= 0 ? diffDays : 0;
    };
    const location = useLocation();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    // JWT auth state
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
    const [authView, setAuthView] = useState<'login' | 'register' | 'google_register' | 'apple_register' | 'naver_register' | 'verify' | 'verify_request' | 'find_id' | 'find_pw' | 'reset_pw'>('login');

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [nickname, setNickname] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(() => sessionStorage.getItem('adminMenuOpen') === 'true');
    const [role, setRole] = useState<'USER' | 'OWNER'>('USER');
    const [ageGroup, setAgeGroup] = useState('');
    const [gender, setGender] = useState('');
    const [favoriteCafe, setFavoriteCafe] = useState('');
    const [authError, setAuthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pointBalance, setPointBalance] = useState(0);

    // Stamp O2O States
    const [myStampCards, setMyStampCards] = useState<any[]>([]);
    const [myStampCoupons, setMyStampCoupons] = useState<any[]>([]);
    const [myCouponHistory, setMyCouponHistory] = useState<any[]>([]);
    const [couponSubTab, setCouponSubTab] = useState<'UNUSED' | 'USED'>('UNUSED');
    const [activeStampTab, setActiveStampTab] = useState<'REGULAR' | 'PROMOTION' | 'COUPON'>('REGULAR');
    const [isStampModalOpen, setIsStampModalOpen] = useState(false);
    const [isHostScannerOpen, setIsHostScannerOpen] = useState(false);
    const [currentCouponForQR, setCurrentCouponForQR] = useState<any>(null);
    const [isCouponQRModalOpen, setIsCouponQRModalOpen] = useState(false);

    // Clear sensitive form state when modal closes or view changes
    React.useEffect(() => {
        if (!isLoginModalOpen) {
            const timer = setTimeout(() => {
                setAuthView('login');
                setEmail('');
                setNickname('');
                setAuthError('');
                setPassword('');
                setPasswordConfirm('');
                setVerificationCode('');
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isLoginModalOpen]);

    React.useEffect(() => {
        setPassword('');
        setPasswordConfirm('');
        setVerificationCode('');
    }, [authView]);

    const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

    // Coffee Passport States
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
    const [passportCheckins, setPassportCheckins] = useState<any[]>([]);
    const [myCourses, setMyCourses] = useState<any[]>([]);
    const [uploadingCourseId, setUploadingCourseId] = useState<string | null>(null);
    const courseImageInputRef = React.useRef<HTMLInputElement>(null);
    const [tasteMatrix, setTasteMatrix] = useState<any>(null);
    const [isPassportExpanded, setIsPassportExpanded] = useState(true);
    
    // Ads State
    const [magazineAd, setMagazineAd] = useState<any>(null);
    const { canShowAd, recordAdView } = useAdStore();

    // Memo Record States
    const [selectedCheckinForMemo, setSelectedCheckinForMemo] = useState<any>(null);
    const [memoInput, setMemoInput] = useState('');
    const [memoImageFiles, setMemoImageFiles] = useState<File[]>([]);
    const [memoImagePreviews, setMemoImagePreviews] = useState<string[]>([]);
    const memoFileInputRef = React.useRef<HTMLInputElement>(null);

    const handleMemoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (memoImagePreviews.length + files.length > 5) {
                alert(t('store_review.alert_img_limit', '최대 5장까지만 업로드 가능합니다.'));
                return;
            }
            files.forEach(file => {
                setMemoImageFiles(prev => [...prev, file]);
                const reader = new FileReader();
                reader.onloadend = () => setMemoImagePreviews(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
        }
    };

    const handleCourseImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !uploadingCourseId) return;
        const file = e.target.files[0];
        
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('coverImage', file);
            
            const res = await fetch(`${API_BASE}/api/users/collections/${uploadingCourseId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            
            if (res.ok) {
                const updatedCourse = await res.json();
                setMyCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
            } else {
                alert(t('profile.alert_upload_fail', '이미지 업로드에 실패했습니다.'));
            }
        } catch (error) {
            console.error(error);
            alert(t('profile.alert_error', '오류가 발생했습니다.'));
        } finally {
            setIsLoading(false);
            setUploadingCourseId(null);
            if (courseImageInputRef.current) courseImageInputRef.current.value = '';
        }
    };

    const handleSaveMemo = async () => {
        if (!selectedCheckinForMemo) return;
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('memo', memoInput);
            
            memoImageFiles.forEach((file) => {
                formData.append('images', file);
            });
            
            const keptImages = memoImagePreviews
                .filter(p => p.startsWith('http') || p.startsWith('/'))
                .map(p => p.replace(API_BASE, ''));
            formData.append('keptImages', JSON.stringify(keptImages));
            
            const response = await fetch(`${API_BASE}/api/users/checkins/${selectedCheckinForMemo.storeId}/memo`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            
            if (response.ok) {
                const updated = await response.json();
                setPassportCheckins(prev => prev.map(c => c.id === updated.id ? { ...c, memo: updated.memo, memoImageUrl: updated.memoImageUrl } : c));
                setSelectedCheckinForMemo(null);
                setMemoInput('');
                setMemoImageFiles([]);
                setMemoImagePreviews([]);
            }
        } catch(e) { console.error(e); } finally { setIsLoading(false); }
    };

    // Taste Profile
    const [isTasteProfileOpen, setIsTasteProfileOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [tastePref, setTastePref] = useState({ acidity: 3, sweetness: 3, body: 3, bitterness: 3, aroma: '' });
    
    const AROMA_TAGS = ['플로럴', '프루티/베리', '시트러스', '와이니', '초콜릿', '카라멜', '너티/견과류', '허브/스파이스', '스위트/꿀', '기타/특수'];

    const getAromaLabel = (tag: string) => {
        switch(tag) {
            case '플로럴': return t('profile.aroma_floral', '플로럴');
            case '프루티/베리': return t('profile.aroma_fruity', '프루티/베리');
            case '시트러스': return t('profile.aroma_citrus', '시트러스');
            case '와이니': return t('profile.aroma_winey', '와이니');
            case '초콜릿': return t('profile.aroma_chocolate', '초콜릿');
            case '카라멜': return t('profile.aroma_caramel', '카라멜');
            case '너티/견과류': return t('profile.aroma_nutty', '너티/견과류');
            case '허브/스파이스': return t('profile.aroma_herb', '허브/스파이스');
            case '스위트/꿀': return t('profile.aroma_sweet', '스위트/꿀');
            case '기타/특수': return t('profile.aroma_other', '기타/특수');
            default: return tag;
        }
    };

    // Profile Edit States
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [newNickname, setNewNickname] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [currentPasswordInput, setCurrentPasswordInput] = useState('');
    const [newPasswordInput, setNewPasswordInput] = useState('');
    const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
    const [sharePrescriptionTarget, setSharePrescriptionTarget] = useState<any>(null);
    const [shareMessage, setShareMessage] = useState(t('profile.share_msg_default'));
    
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [newBio, setNewBio] = useState('');
    const [newBioImages, setNewBioImages] = useState<File[]>([]);
    const [existingBioImages, setExistingBioImages] = useState<string[]>([]);
    const [newBioImagePreviews, setNewBioImagePreviews] = useState<string[]>([]);
    const bioFileInputRef = React.useRef<HTMLInputElement>(null);

    const handleBioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setNewBioImages(prev => [...prev, ...files]);
            
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setNewBioImagePreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeBioImage = (index: number) => {
        setNewBioImages(prev => prev.filter((_, i) => i !== index));
        setNewBioImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingBioImage = (index: number) => {
        setExistingBioImages(prev => prev.filter((_, i) => i !== index));
    };


    React.useEffect(() => {
        const savedScroll = sessionStorage.getItem('profileScrollY');
        if (savedScroll) {
            setTimeout(() => {
                const container = document.getElementById('profile-scroll-container');
                if (container) container.scrollTop = parseInt(savedScroll, 10);
                sessionStorage.removeItem('profileScrollY');
            }, 50);
        }
    }, []);

    const fetchStampData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const cardRes = await fetch(`${API_BASE}/api/stamps/cards/my?_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (cardRes.ok) {
                const cardData = await cardRes.json();
                setMyStampCards(cardData);
            }
            
            const couponRes = await fetch(`${API_BASE}/api/stamps/coupons/my?_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (couponRes.ok) {
                const couponData = await couponRes.json();
                setMyStampCoupons(couponData);
            }

            const historyRes = await fetch(`${API_BASE}/api/stamps/coupons/history?_t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (historyRes.ok) {
                const historyData = await historyRes.json();
                setMyCouponHistory(historyData);
            }
        } catch (err) {
            console.error("Failed to fetch stamps or coupons", err);
        }
    };

    const navigateToAdmin = (path: string) => {
        const container = document.getElementById('profile-scroll-container');
        if (container) sessionStorage.setItem('profileScrollY', container.scrollTop.toString());
        navigate(path);
    };

    React.useEffect(() => {
        if (isAuthenticated) {
            fetchStampData();
            if (location.state?.openStampQR) {
                setIsStampModalOpen(true);
                try { navigate(location.pathname, { replace: true, state: {} }); } catch (e) {}
            }
            const token = localStorage.getItem('token');
            if (token) {
                // Fetch latest user data to keep role and info in sync
                fetch(`${API_BASE}/api/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => {
                    if (res.status === 401 || res.status === 403) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                        return;
                    }
                    if (res.ok) return res.json();
                })
                .then(userData => {
                    if (userData) {
                        localStorage.setItem('user', JSON.stringify(userData));
                        // Trigger state update immediately to reflect OWNER role
                        setCurrentUser(userData);
                        setTastePref({
                            acidity: userData.prefAcidity || 3,
                            sweetness: userData.prefSweetness || 3,
                            body: userData.prefBody || 3,
                            bitterness: userData.prefBitterness || 3,
                            aroma: userData.prefAroma || ''
                        });
                    }
                })
                .catch(err => console.error("Failed to fetch user:", err));

                // Fetch points
                fetch(`${API_BASE}/api/points`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.balance !== undefined) setPointBalance(data.balance);
                })
                .catch(err => console.error("Failed to fetch points:", err));

                // Fetch prescriptions for Passport
                fetch(`${API_BASE}/api/users/prescriptions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setPrescriptions(data);
                })
                .catch(err => console.error("Failed to fetch prescriptions:", err));

                // Fetch Pilgrimage Check-ins
                fetch(`${API_BASE}/api/users/checkins`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setPassportCheckins(data);
                })
                .catch(err => console.error("Failed to fetch checkins:", err));

                // Fetch Pilgrimage Courses
                fetch(`${API_BASE}/api/users/collections`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setMyCourses(data.filter((c: any) => c.isPilgrimageCourse === true));
                    }
                })
                .catch(err => console.error("Failed to fetch collections:", err));

                // Fetch Taste Matrix
                fetch(`${API_BASE}/api/ai-features/tasting-note/matrix`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => setTasteMatrix(data))
                .catch(err => console.error("Failed to fetch matrix:", err));

                // Fetch Magazine Ads
                fetch(`${API_BASE}/api/ads/serve?tab=MAGAZINE&lang=${i18n.language || 'en'}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.fallback === 'ADMOB') {
                        setMagazineAd(data);
                    } else if (data.ad && canShowAd(data.ad.id, (data.frequencyCapHours ?? 24) * 60 * 60 * 1000)) {
                        setMagazineAd(data);
                        recordAdView(data.ad.id, 'DIRECT', 'MAGAZINE');
                    } else {
                        setMagazineAd({ fallback: 'ADMOB' });
                    }
                })
                .catch(err => console.error("Failed to fetch magazine ad:", err));
            }
        }
    }, [isAuthenticated, i18n.language]);

    // QR 모달이 열려있는 동안 3초 간격으로 실시간 적립 상태를 가져오는 폴링 메커니즘
    React.useEffect(() => {
        let intervalId: any;
        if ((isStampModalOpen || isCouponQRModalOpen) && isAuthenticated) {
            fetchStampData();
            intervalId = setInterval(() => {
                fetchStampData();
            }, 3000);
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isStampModalOpen, isCouponQRModalOpen, isAuthenticated]);

    // 💡 실시간 O2O 지갑 상시 동기화: 로그인 상태인 동안 5초 주기로 스탬프와 쿠폰만 가볍게 백그라운드 리페치
    React.useEffect(() => {
        let intervalId: any;
        if (isAuthenticated) {
            intervalId = setInterval(() => {
                fetchStampData();
            }, 5000);
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isAuthenticated]);

    // Badge Logic
    const getBadgeTier = (count: number) => {
        if (count >= 50) return { name: t('profile.badge_master', 'Master Roaster'), icon: '☕', next: null, progress: 100 };
        if (count >= 20) return { name: t('profile.badge_gold', 'Gold Pilgrim'), icon: '🥇', next: 50, progress: (count / 50) * 100 };
        if (count >= 5) return { name: t('profile.badge_silver', 'Silver Pilgrim'), icon: '🥈', next: 20, progress: (count / 20) * 100 };
        if (count >= 1) return { name: t('profile.badge_bronze', 'Bronze Pilgrim'), icon: '🥉', next: 5, progress: (count / 5) * 100 };
        return { name: t('profile.badge_newbie'), icon: '🌱', next: 1, progress: 0 };
    };

    const currentBadge = getBadgeTier(passportCheckins.length);

    const handleSharePassport = async () => {
        const text = t('profile.passport_share_template', { nickname: currentUser?.nickname || '유저', icon: currentBadge.icon, badge: currentBadge.name, count: passportCheckins.length });
        try {
            await Share.share({ title: t('profile.passport_share_title'), text, url: window.location.href, dialogTitle: t('profile.passport_share_title') });
        } catch (err) {
            if (navigator.share) {
                navigator.share({ title: t('profile.passport_share_title'), text, url: window.location.href }).catch(() => {
                    navigator.clipboard.writeText(text);
                    alert(t('profile.pass_share_copied'));
                });
            } else {
                navigator.clipboard.writeText(text);
                alert(t('profile.pass_share_copied'));
            }
        }
    };

    const parsedEarnedBadges = React.useMemo(() => {
        try {
            return typeof currentUser?.earnedBadges === 'string' ? JSON.parse(currentUser.earnedBadges) : (currentUser?.earnedBadges || []);
        } catch { return []; }
    }, [currentUser?.earnedBadges]);

    const handleEquipBadge = async (badgeName: string) => {
        const token = localStorage.getItem('token');
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/users/me/badge`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ badgeName })
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentUser((prev: any) => ({ ...prev, equippedBadge: data.user.equippedBadge, earnedBadges: data.user.earnedBadges }));
                localStorage.setItem('user', JSON.stringify({ ...currentUser, equippedBadge: data.user.equippedBadge, earnedBadges: data.user.earnedBadges }));
                alert(`[${badgeName}] 뱃지가 장착되었습니다!`);
            }
        } catch(e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleCoursePublic = async (e: React.MouseEvent, courseId: string, currentPublic: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/users/collections/${courseId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic: !currentPublic })
            });
            if (res.ok) {
                setMyCourses(prev => prev.map(c => c.id === courseId ? { ...c, isPublic: !currentPublic } : c));
            }
        } catch (error) {
            console.error("Toggle course public error", error);
        }
    };

    const handleShareCourse = async (e: React.MouseEvent, course: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (!course.isPublic) {
            handleToggleCoursePublic(e as any, course.id, false);
            alert("공유를 위해 코스가 'PUBLIC(공개)' 상태로 자동 전환되었습니다!");
            course.isPublic = true;
        }
        
        const shareUrl = `${window.location.origin}/map?courseId=${course.id}`;
        const text = t('profile.course_share_template', { name: course.name, desc: course.description ? `"${course.description}"\n` : '', count: course.items?.length || course._count?.items || 0 });
        
        try {
            await Share.share({ title: course.name, text, url: shareUrl, dialogTitle: course.name });
        } catch (err) {
            if (navigator.share) {
                navigator.share({ title: course.name, text, url: shareUrl }).catch(() => {
                    navigator.clipboard.writeText(`${text}\n${shareUrl}`);
                    alert('코스 링크가 클립보드에 복사되었습니다.');
                });
            } else {
                navigator.clipboard.writeText(`${text}\n${shareUrl}`);
                alert('코스 링크가 클립보드에 복사되었습니다.');
            }
        }
    };
    
    const handleDeleteCourse = async (e: React.MouseEvent, courseId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!window.confirm(t('profile.confirm_course_delete'))) return;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/users/collections/${courseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMyCourses(prev => prev.filter(c => c.id !== courseId));
            } else {
                alert('코스 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error("Delete course error", error);
            alert('네트워크 오류가 발생했습니다.');
        }
    };


    // State for temporary Google User during Role Selection
    const [tempGoogleUser, setTempGoogleUser] = useState<any>(null);
    const [tempAppleUser, setTempAppleUser] = useState<any>(null);
    const [tempNaverUser, setTempNaverUser] = useState<any>(null);

    React.useEffect(() => {
        // Deep link listener for returning from Google OAuth Custom Chrome Tab
        const handleDeepLink = async (event: any) => {
            if (event.url && (event.url.includes('capcurator://google-login') || event.url.includes('localhost:3002/profile'))) {
                const hashParams = event.url.split('#')[1];
                if (hashParams) {
                    await Browser.close().catch(() => console.log('browser already closed'));
                    const params = new URLSearchParams(hashParams);
                    const accessToken = params.get('access_token');
                    if (accessToken) {
                        setIsLoginModalOpen(true);
                        handleGoogleCallback(accessToken);
                    }
                }
            } else if (event.url && event.url.includes('capcurator://apple-login')) {
                // Handle Apple Login Deep Link Callback from Custom Chrome Tab
                try {
                    const urlObj = new URL(event.url);
                    const error = urlObj.searchParams.get('error');
                    
                    if (error) {
                        await Browser.close().catch(() => console.log('browser already closed'));
                        setAuthError(`Apple Login Error: ${error}`);
                        setIsLoading(false);
                        return;
                    }
                    
                    const token = urlObj.searchParams.get('token');
                    const userStr = urlObj.searchParams.get('user');
                    
                    if (token) {
                        await Browser.close().catch(() => console.log('browser already closed'));
                        setIsLoginModalOpen(true);
                        
                        let name;
                        if (userStr) {
                            try {
                                const userObj = JSON.parse(decodeURIComponent(userStr));
                                if (userObj?.name) {
                                    name = `${userObj.name.firstName || ''} ${userObj.name.lastName || ''}`.trim();
                                }
                            } catch (e) {
                                console.error("Failed to parse apple user", e);
                            }
                        }
                        
                        handleAppleCredentialResponse({ credential: token, name: name || undefined });
                    }
                } catch (e) {
                    console.error("Error processing apple deep link", e);
                }
            } else if (event.url && event.url.includes('capcurator://naver-login')) {
                // Handle Naver Login Deep Link
                try {
                    const urlObj = new URL(event.url);
                    const error = urlObj.searchParams.get('error');
                    
                    if (error) {
                        await Browser.close().catch(() => console.log('browser already closed'));
                        setAuthError(`Naver Login Error: ${error}`);
                        setIsLoading(false);
                        return;
                    }
                    
                    const token = urlObj.searchParams.get('token');
                    const userStr = urlObj.searchParams.get('user');
                    
                    if (token) {
                        await Browser.close().catch(() => console.log('browser already closed'));
                        setIsLoginModalOpen(true);
                        
                        // Token received, handle login
                        try {
                            const res = await fetch(`${API_BASE}/api/users/me`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (res.ok) {
                                const userData = await res.json();
                                localStorage.setItem('token', token);
                                localStorage.setItem('user', JSON.stringify(userData));
                                window.dispatchEvent(new Event('authStateChanged'));
                                setIsAuthenticated(true);
                                setIsLoginModalOpen(false);
                            }
                        } catch (e) {
                            console.error("Failed to fetch user data for naver login", e);
                        }
                    } else if (userStr) {
                        // Registration required
                        await Browser.close().catch(() => console.log('browser already closed'));
                        setIsLoginModalOpen(true);
                        try {
                            const userObj = JSON.parse(decodeURIComponent(userStr));
                            setTempNaverUser(userObj);
                            setAuthView('naver_register');
                        } catch (e) {
                            console.error("Failed to parse naver user", e);
                        }
                    }
                } catch (e) {
                    console.error("Error processing naver deep link", e);
                }
            }
        };
        CapApp.addListener('appUrlOpen', handleDeepLink);

        // Fallback or PC check: if returning directly to URL via standard browser redirect
        const hash = window.location.hash;
        if (hash && hash.includes('jwt_token=')) {
            const params = new URLSearchParams(hash.replace('#', '?'));
            const jwtToken = params.get('jwt_token');
            if (jwtToken) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setIsLoginModalOpen(true);
                
                fetch(`${API_BASE}/api/users/me`, {
                    headers: { 'Authorization': `Bearer ${jwtToken}` }
                }).then(async res => {
                    if (res.ok) {
                        const userData = await res.json();
                        localStorage.setItem('token', jwtToken);
                        localStorage.setItem('user', JSON.stringify(userData));
                        window.dispatchEvent(new Event('authStateChanged'));
                        setIsAuthenticated(true);
                        setIsLoginModalOpen(false);
                    }
                }).catch(e => console.error(e));
            }
        } else if (hash && hash.includes('naver_user=')) {
            const params = new URLSearchParams(hash.replace('#', '?'));
            const userStr = params.get('naver_user');
            if (userStr) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                try {
                    const userObj = JSON.parse(decodeURIComponent(userStr));
                    setTempNaverUser(userObj);
                    setIsLoginModalOpen(true);
                    setAuthView('naver_register');
                } catch (e) {
                    console.error("Failed to parse naver user", e);
                }
            }
        } else if (hash && hash.includes('naver_error=')) {
            const params = new URLSearchParams(hash.replace('#', '?'));
            const errorMsg = params.get('naver_error');
            if (errorMsg) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setIsLoginModalOpen(true);
                setAuthError(`Naver Login Error: ${errorMsg}`);
            }
        } else if (hash && hash.includes('access_token')) {
            // If we are currently inside an external browser app instead of our Capacitor Native App:
            const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();
            if (!isNative && hash.includes('state=native_google_login')) {
                // We are bouncing from Chrome back into Native App!
                window.location.href = `capcurator://google-login${hash}`;
                return;
            }

            const params = new URLSearchParams(hash.replace('#', '?'));
            const accessToken = params.get('access_token');
            if (accessToken) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setIsLoginModalOpen(true);
                handleGoogleCallback(accessToken);
            }
        }
        
        return () => {
            CapApp.removeAllListeners();
        };
    }, []);

    const handleShareCoffeeTalk = (prescription: any) => {
        setSharePrescriptionTarget(prescription);
        setShareMessage(t('profile.share_msg_default'));
    };

    const submitShareCoffeeTalk = async () => {
        if (!sharePrescriptionTarget) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('content', shareMessage.trim() || t('profile.share_msg_default'));
            formData.append('recipeData', JSON.stringify({
                type: 'prescription',
                id: sharePrescriptionTarget.id,
                beanName: sharePrescriptionTarget.beanName,
                brand: sharePrescriptionTarget.brand,
                aiComment: sharePrescriptionTarget.aiComment,
                createdAt: sharePrescriptionTarget.createdAt,
                rating: sharePrescriptionTarget.rating
            }));
            
            const res = await fetch(`${API_BASE}/api/community/posts`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                alert("커피톡에 공유되었습니다! ☕");
                setSharePrescriptionTarget(null);
                setShareMessage("");
                navigate('/community');
            } else {
                alert("공유에 실패했습니다.");
            }
        } catch (e) {
            console.error("Share error", e);
            alert("공유 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRatePrescription = async (prescriptionId: string, rating: number, beanName: string, brandName: string, aiComment?: string) => {
        setIsLoading(true);
        let bean: any = COFFEE_BEANS.find(b => b.name === beanName);
        if (aiComment) {
            try {
                const match = aiComment.match(/<!-- BEANDATA: (.*?) -->/);
                if (match) bean = JSON.parse(match[1]);
            } catch(e) {}
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/users/prescriptions/${prescriptionId}/rating`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    rating, 
                    beanAcidity: bean?.acidity || 3, 
                    beanSweetness: bean?.sweetness || 3, 
                    beanBody: bean?.body || 3 
                })
            });
            if (res.ok) {
                const data = await res.json();
                setPrescriptions(prev => prev.map(p => p.id === prescriptionId ? data.prescription : p));
                setSelectedPrescription(data.prescription);
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setCurrentUser(data.user);
                    setTastePref({
                        acidity: data.user.prefAcidity || 3,
                        sweetness: data.user.prefSweetness || 3,
                        body: data.user.prefBody || 3,
                        bitterness: data.user.prefBitterness || 3,
                        aroma: data.user.prefAroma || ''
                    });
                }
            } else {
                console.error("Failed to rate prescription");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleCallback = async (accessToken: string) => {
        setAuthError('');
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: accessToken })
            });
            const data = await response.json();

            if (response.status === 202 && data.requiresRoleSelection) {
                setTempGoogleUser(data.tempUser);
                setAuthView('google_register');
            } else if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user?.preferredLanguage) {
                    i18n.changeLanguage(data.user.preferredLanguage);
                }
                window.dispatchEvent(new Event('authStateChanged'));
                setIsAuthenticated(true);
                setIsLoginModalOpen(false);
            } else {
                setAuthError(data.error || t('profile.err_google_fail'));
            }
        } catch (err) {
            setAuthError(t('profile.err_server'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        setAuthError('');
        if (!email || !password) {
            setAuthError(t('profile.err_email_pw_req'));
            return;
        }
        setIsLoading(true);
        
        const normalizedEmail = email.trim().toLowerCase();
        
        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail, password })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user?.preferredLanguage) {
                    i18n.changeLanguage(data.user.preferredLanguage);
                }
                window.dispatchEvent(new Event('authStateChanged'));
                setIsAuthenticated(true);
                setIsLoginModalOpen(false);
                setEmail('');
                setPassword('');
            } else {
                if (data.requiresVerification) {
                    setAuthView('verify');
                    setAuthError(t('profile.err_verify_req'));
                    if (data.developmentOnlyCode) {
                        alert(`[테스트용 메시지] 새로운 인증 코드 발급: ${data.developmentOnlyCode}`);
                    }
                } else {
                    setAuthError(data.error || t('profile.err_login_fail'));
                }
            }
        } catch (err) {
            setAuthError(t('profile.err_server_conn'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const isNative = Capacitor.isNativePlatform();
        
        // As per @capawesome/capacitor-google-sign-in docs, clientId MUST be the Web Client ID on ALL platforms.
        // HARDCODED because .env is not synced via git to the Mac build machine for iOS builds!
        // We must use the NEW Web Client ID from the current Firebase project (beanmind-61b70).
        const clientId = '737925841182-o7jds5r2egkjbgl9c9h2gq4rrg8ms0ps.apps.googleusercontent.com';

        if (isNative) {
            try {
                setIsLoading(true);
                await GoogleSignIn.initialize({
                    clientId: clientId,
                });
                const result = await GoogleSignIn.signIn();
                if (result.idToken) {
                    // Send the idToken to backend
                    await handleGoogleCredentialResponse({ credential: result.idToken });
                } else {
                    setAuthError(t('profile.err_google_fail'));
                    setIsLoading(false);
                }
            } catch (err: any) {
                console.error('Native Google Sign-In failed', err);
                const errorMessage = err?.message || 'Unknown error';
                setAuthError(`Google Login Failed: ${errorMessage}`);
                setIsLoading(false);
            }
            return;
        }

        let currentOrigin = window.location.origin;

        const redirectUri = encodeURIComponent(currentOrigin + '/profile');
        
        const baseState = 'web_google_login';
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&state=${baseState}&scope=email%20profile`;
        
        window.location.href = url;
    };

    const handleGoogleCredentialResponse = async (credentialResponse: any) => {
        setAuthError('');
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential })
            });
            const data = await response.json();

            if (response.status === 202 && data.requiresRoleSelection) {
                // Needs role selection
                setTempGoogleUser(data.tempUser);
                setAuthView('google_register');
            } else if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user?.preferredLanguage) {
                    i18n.changeLanguage(data.user.preferredLanguage);
                }
                window.dispatchEvent(new Event('authStateChanged'));
                setIsAuthenticated(true);
                setIsLoginModalOpen(false);
            } else {
                setAuthError(data.error || t('profile.err_google_fail'));
            }
        } catch (err) {
            setAuthError(t('profile.err_server'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleRegisterSubmit = async () => {
        if (!tempGoogleUser) return;
        if (!ageGroup || !gender) {
            setAuthError(t('profile.err_all_req'));
            return;
        }
        setAuthError('');
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/google/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: tempGoogleUser.email,
                    name: tempGoogleUser.name,
                    googleId: tempGoogleUser.googleId,
                    role,
                    ageGroup,
                    gender,
                    favoriteCafe,
                    countryCode: getDeviceCountryCode(),
                    preferredLanguage: i18n.language
                })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user?.preferredLanguage) {
                    i18n.changeLanguage(data.user.preferredLanguage);
                }
                window.dispatchEvent(new Event('authStateChanged'));
                setIsAuthenticated(true);
                setIsLoginModalOpen(false);
            } else {
                setAuthError(data.error || t('profile.err_reg_fail'));
            }
        } catch (err) {
            setAuthError(t('profile.err_server'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        const isNative = Capacitor.isNativePlatform();
        if (!isNative) {
            setAuthError(t('profile.err_apple_native_only', 'Apple Login is only supported on mobile apps.'));
            return;
        }

        try {
            setIsLoading(true);
            
            const isAndroid = Capacitor.getPlatform() === 'android';
            
            if (isAndroid) {
                // Use Capacitor Browser (Chrome Custom Tab) for Android to bypass Apple's WebView security blocks
                // This ensures 2FA works correctly and Apple does not reject the identity verification.
                const clientId = import.meta.env.VITE_APPLE_CLIENT_ID || 'com.beanmind.curator.web';
                const redirectUri = import.meta.env.VITE_APPLE_REDIRECT_URL || 'https://www.beanmindcurator.com/api/auth/apple/callback';
                const state = Math.random().toString(36).substring(2, 15);
                const authUrl = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code%20id_token&scope=name%20email&response_mode=form_post&state=${state}`;
                
                await Browser.open({ url: authUrl });
                setIsLoading(false);
                return; // The DeepLink listener will handle the rest!
            } else {
                // iOS uses native AuthenticationServices
                const result = await AppleSignIn.signIn();
                if (result.idToken) {
                    await handleAppleCredentialResponse({ credential: result.idToken, name: result.givenName ? `${result.givenName} ${result.familyName}`.trim() : undefined });
                } else {
                    setAuthError(t('profile.err_apple_fail', 'Apple Login Failed.'));
                    setIsLoading(false);
                }
            }
        } catch (err: any) {
            console.error('Native Apple Sign-In failed', err);
            const errorMessage = err?.message || 'Unknown error';
            setAuthError(`Apple Login Failed: ${errorMessage}`);
            setIsLoading(false);
        }
    };

    const handleAppleCredentialResponse = async (credentialResponse: any) => {
        setAuthError('');
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/apple`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential, name: credentialResponse.name })
            });
            const data = await response.json();

            if (response.status === 202 && data.requiresRoleSelection) {
                setTempAppleUser(data.tempUser);
                setAuthView('apple_register');
            } else if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user?.preferredLanguage) {
                    i18n.changeLanguage(data.user.preferredLanguage);
                }
                window.dispatchEvent(new Event('authStateChanged'));
                setIsAuthenticated(true);
                setIsLoginModalOpen(false);
            } else {
                setAuthError(data.error || t('profile.err_apple_fail', 'Apple Login Failed.'));
            }
        } catch (err) {
            setAuthError(t('profile.err_server'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleNaverLogin = async () => {
        try {
            setIsLoading(true);
            const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
            if (!clientId) {
                setAuthError("Naver Client ID is missing in environment configuration.");
                setIsLoading(false);
                return;
            }
            const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();
            const redirectUri = encodeURIComponent(import.meta.env.VITE_NAVER_REDIRECT_URL || 'https://www.beanmindcurator.com/api/auth/naver/callback');
            const originB64 = btoa(window.location.origin).replace(/=/g, '');
            const state = (isNative ? 'app_' : `web_${originB64}_`) + Math.random().toString(36).substring(2, 15);
            const authUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
            
            if (isNative) {
                await Browser.open({ url: authUrl });
            } else {
                window.location.href = authUrl;
            }
            setIsLoading(false);
        } catch (err: any) {
            console.error('Naver Login failed', err);
            setAuthError(`Naver Login Failed: ${err?.message || 'Unknown error'}`);
            setIsLoading(false);
        }
    };

    const handleNaverRegisterSubmit = async () => {
        if (!tempNaverUser) return;
        if (!ageGroup || !gender) {
            setAuthError(t('profile.err_all_req'));
            return;
        }
        setAuthError('');
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/naver/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: tempNaverUser.email,
                    name: tempNaverUser.name,
                    naverId: tempNaverUser.naverId,
                    profileImageUrl: tempNaverUser.profileImageUrl,
                    role,
                    ageGroup: tempNaverUser.ageGroup || ageGroup,
                    gender: tempNaverUser.gender || gender,
                    favoriteCafe,
                    countryCode: getDeviceCountryCode(),
                    preferredLanguage: i18n.language
                })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user?.preferredLanguage) {
                    i18n.changeLanguage(data.user.preferredLanguage);
                }
                window.dispatchEvent(new Event('authStateChanged'));
                setIsAuthenticated(true);
                setIsLoginModalOpen(false);
                setTempNaverUser(null);
            } else {
                setAuthError(data.error || t('profile.err_register_fail', 'Register Failed.'));
            }
        } catch (err) {
            setAuthError(t('profile.err_server'));
        } finally {
            setIsLoading(false);
        }
    };


    const handleAppleRegisterSubmit = async () => {
        if (!tempAppleUser) return;
        if (!ageGroup || !gender) {
            setAuthError(t('profile.err_all_req'));
            return;
        }
        setAuthError('');
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/apple/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: tempAppleUser.email,
                    name: tempAppleUser.name,
                    appleId: tempAppleUser.appleId,
                    role,
                    ageGroup,
                    gender,
                    favoriteCafe,
                    countryCode: getDeviceCountryCode(),
                    preferredLanguage: i18n.language
                })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.dispatchEvent(new Event('authStateChanged'));
                setIsAuthenticated(true);
                setIsLoginModalOpen(false);
                setTempAppleUser(null);
            } else {
                setAuthError(data.error || t('profile.err_register_fail', 'Register Failed.'));
            }
        } catch (err) {
            setAuthError(t('profile.err_server'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async () => {
        setAuthError('');
        if (!email || !password || !nickname || !ageGroup || !gender) {
            setAuthError(t('profile.err_all_req'));
            return;
        }
        if (password !== passwordConfirm) {
            setAuthError(t('profile.err_pw_mismatch'));
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, nickname, role, ageGroup, gender, favoriteCafe, countryCode: getDeviceCountryCode(), preferredLanguage: i18n.language })
            });
            const data = await response.json();

            if (response.ok || data.requiresVerification) {
                alert(t('profile.alert_code_sent'));
                setAuthView('verify');
                setPassword('');
                setPasswordConfirm('');
            } else {
                setAuthError(data.error || t('profile.err_reg_fail2', '회원가입에 실패했습니다.'));
            }
        } catch (err) {
            setAuthError(t('profile.err_server_conn'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyRequest = async () => {
        setAuthError('');
        if (!email) {
            setAuthError(t('profile.err_email_req'));
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/resend-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();

            if (response.ok) {
                alert(t('profile.alert_code_sent'));
                setAuthView('verify');
            } else {
                setAuthError(data.error || t('profile.err_code_send_fail'));
            }
        } catch (err) {
            setAuthError(t('profile.err_server'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        setAuthError('');
        if (!verificationCode) {
            setAuthError(t('profile.err_code_req'));
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: verificationCode })
            });
            const data = await response.json();

            if (response.ok) {
                alert(t('profile.alert_verify_success'));
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.user?.preferredLanguage) {
                    i18n.changeLanguage(data.user.preferredLanguage);
                }
                window.dispatchEvent(new Event('authStateChanged'));
                setIsAuthenticated(true);
                setIsLoginModalOpen(false);
            } else {
                setAuthError(data.error || t('profile.err_verify_fail'));
            }
        } catch (err) {
            setAuthError(t('profile.err_server'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        setAuthError('');
        try {
            const response = await fetch(`${API_BASE}/api/auth/resend-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (response.ok) {
                alert(t('profile.alert_new_code_sent'));
            } else {
                const data = await response.json();
                setAuthError(data.error || t('profile.err_send_fail'));
            }
        } catch (err) {
            setAuthError(t('profile.err_server'));
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Prevent accidental cross-contamination of un-saved global state
        localStorage.removeItem('bm_sync_presc');
        localStorage.removeItem('bm_curation_ad');
        
        window.dispatchEvent(new Event('authStateChanged'));
        setIsAuthenticated(false);
    };

    const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const compressedBase64 = await compressImage(file, 512, 512, 0.8);
            
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/users/profile-image`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ profileImageUrl: compressedBase64 })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                setCurrentUser(data.user);
                alert(t('profile.alert_photo_changed'));
            } else {
                alert(t('profile.alert_photo_fail'));
            }
        } catch (err) {
            alert(t('profile.alert_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProfileImage = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(t('profile.confirm_photo_delete'))) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/users/profile-image`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ profileImageUrl: null })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                setCurrentUser(data.user);
                alert(t('profile.alert_photo_deleted'));
                // window.location.reload(); // Removed to prevent System Notice from reappearing
            } else {
                alert(t('profile.alert_photo_del_fail'));
            }
        } catch (err) {
            alert(t('profile.alert_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateNickname = async () => {
        if (!newNickname.trim()) return;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/users/profile/nickname`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ nickname: newNickname })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                setCurrentUser(data.user);
                setIsEditingNickname(false);
                alert(t('profile.alert_nickname_changed', '닉네임이 성공적으로 변경되었습니다.'));
            } else {
                alert(data.error || '오류가 발생했습니다.');
            }
        } catch (err) {
            alert('서버 접근 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) return;
        if (newPasswordInput !== confirmPasswordInput) {
            alert(t('profile.err_pw_mismatch', '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.'));
            return;
        }
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/users/profile/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currentPassword: currentPasswordInput, newPassword: newPasswordInput })
            });
            const data = await res.json();
            if (res.ok) {
                setIsChangingPassword(false);
                setCurrentPasswordInput('');
                setNewPasswordInput('');
                setConfirmPasswordInput('');
                alert(t('profile.alert_password_changed', '비밀번호가 성공적으로 변경되었습니다. 보안을 위해 다시 로그인 해 주세요.'));
                handleLogout();
            } else {
                alert(data.error || '오류가 발생했습니다.');
            }
        } catch (err) {
            alert('서버 접근 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFindId = async () => {
        setAuthError('');
        if (!nickname) { setAuthError(t('profile.err_nickname_req')); return; }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/auth/find-id`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname })
            });
            const data = await res.json();
            if (res.ok) alert(t('profile.alert_find_id_success', { email: data.email }));
            else setAuthError(data.error || t('profile.err_find_id_fail'));
        } catch (err) { setAuthError(t('profile.err_server')); } finally { setIsLoading(false); }
    };

    const handleUpdatePublicProfile = async (bioStr?: string, isPublic?: boolean) => {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/users/profile/shared`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    bio: bioStr !== undefined ? bioStr : currentUser.bio,
                    isPublicProfile: isPublic !== undefined ? isPublic : (currentUser.isPublicProfile ?? true)
                })
            });
            if (res.ok) {
                const data = await res.json();
                setCurrentUser((prev: any) => ({ ...prev, bio: data.user.bio, isPublicProfile: data.user.isPublicProfile }));
                localStorage.setItem('user', JSON.stringify({ ...currentUser, bio: data.user.bio, isPublicProfile: data.user.isPublicProfile }));
                setIsEditingBio(false);
            } else {
                alert('프로필 업데이트에 실패했습니다.');
            }
        } catch (error) {
            console.error("Update profile error", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPwRequest = async () => {
        setAuthError('');
        if (!email) { setAuthError(t('profile.err_email_req')); return; }
        
        // Ensure email is lowercase and trimmed (iOS keyboard often auto-capitalizes first letter)
        const normalizedEmail = email.trim().toLowerCase();
        
        // Clear any old verification code before sending a new one
        setVerificationCode('');
        
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/auth/reset-password-request`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: normalizedEmail })
            });
            const data = await res.json();
            if (res.ok) {
                alert(t('profile.alert_pw_reset_sent'));
                setAuthView('reset_pw');
            } else setAuthError(data.error || t('profile.err_req_fail'));
        } catch (err) { setAuthError(t('profile.err_server')); } finally { setIsLoading(false); }
    };

    const handleResetPw = async () => {
        setAuthError('');
        if (!verificationCode || !password || !passwordConfirm) { setAuthError(t('profile.err_code_pw_req')); return; }
        if (password !== passwordConfirm) { setAuthError(t('profile.err_pw_mismatch')); return; }
        setIsLoading(true);
        
        const normalizedEmail = email.trim().toLowerCase();
        
        try {
            const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: normalizedEmail, code: verificationCode, newPassword: password })
            });
            const data = await res.json();
            if (res.ok) {
                alert(t('profile.alert_pw_reset_success'));
                setAuthView('login');
                setPassword('');
                setPasswordConfirm('');
                setVerificationCode('');
            } else setAuthError(data.error || t('profile.err_reset_fail'));
        } catch (err) { setAuthError(t('profile.err_server')); } finally { setIsLoading(false); }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm(t('profile.confirm_account_del'))) {
            return;
        }

        setIsLoading(true); // Assuming you have an isLoading state for general loading
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/users/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert(t('profile.alert_account_del_success'));
                handleLogout(); // 로그아웃 처리 및 리다이렉트
            } else {
                const data = await response.json();
                alert(t('profile.alert_account_del_fail', { error: data.error || 'Unknown error' }));
            }
        } catch (error) {
            console.error("Account deletion error:", error);
            alert(t('profile.alert_account_del_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleChargePoints = async (amount: number, transactionId?: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/points/verify-iap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount, transactionId })
            });
            if (res.ok) {
                const data = await res.json();
                setPointBalance(data.balance);
                // 모달 측에서 이미 success 애니메이션을 띄웠으므로 alert 생략되거나 간소화
            } else {
                alert(t('profile.alert_charge_fail', '충전 실패. 다시 시도해주세요.'));
            }
        } catch (error) {
            console.error("Charge error:", error);
            alert(t('profile.alert_charge_error', '서버 오류가 발생했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        const handleAuthChange = () => {
            setCurrentUser(JSON.parse(localStorage.getItem('user') || '{}'));
            setIsAuthenticated(!!localStorage.getItem('token'));
        };
        window.addEventListener('authStateChanged', handleAuthChange);
        return () => window.removeEventListener('authStateChanged', handleAuthChange);
    }, []);


    return (
        <div id="profile-scroll-container" className="h-full w-full bg-espresso-950 overflow-y-auto pb-24 font-sans selection:bg-espresso-700 selection:text-espresso-50 relative">
            {/* 💡 상단 시스템 영역(상태바) 겹침 방지 불투명 가드 (Sticky StatusBar Shield) */}
            <div className="sticky top-0 left-0 right-0 h-[env(safe-area-inset-top,24px)] bg-espresso-950 z-50 pointer-events-none w-full shrink-0" />
            
            <IAPPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onSuccess={handleChargePoints} userId={currentUser?.id || ''} />
            <div className="max-w-md md:max-w-2xl mx-auto relative flex flex-col min-h-full">

                {/* Header Options */}
                <header className="px-6 py-8 pb-4 pt-safe mt-4 shrink-0 flex justify-between items-center">
                    <h1 className="text-3xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.title', '내 정보')}</h1>
                    <button 
                        onClick={() => {
                            const newLang = i18n.language === 'ko' ? 'en' : 'ko';
                            i18n.changeLanguage(newLang);
                            if (isAuthenticated) {
                                const token = localStorage.getItem('token');
                                fetch(`${API_BASE}/api/users/profile/language`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({ preferredLanguage: newLang })
                                }).then(res => res.json())
                                .then(data => {
                                    if (data.user) {
                                        localStorage.setItem('user', JSON.stringify(data.user));
                                    }
                                }).catch(err => console.error('Failed to sync language preference:', err));
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-espresso-800/50 hover:bg-espresso-800 transition-colors border border-espresso-700"
                    >
                        <Globe size={16} className="text-amber-500" />
                        <span className="text-xs font-bold text-espresso-100 uppercase tracking-wider">
                            {i18n.language === 'ko' ? 'EN' : 'KR'}
                        </span>
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 px-6 space-y-6 flex flex-col">

                    {/* User Profile & Account Settings Container */}
                    <section className="bg-espresso-900 rounded-[2rem] shadow-sm border border-espresso-700 flex flex-col overflow-hidden">
                        {/* User Profile / Login Card */}
                        <div className={`p-6 flex items-center justify-between ${isAuthenticated ? 'border-b border-espresso-700' : ''}`}>
                            {isAuthenticated ? (
                                <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                                        <div className="relative group shrink-0">
                                            <div
                                                className="w-16 h-16 bg-espresso-900 rounded-full flex items-center justify-center text-amber-500 text-2xl font-bold font-serif shadow-inner overflow-hidden cursor-pointer"
                                                onClick={() => document.getElementById('profileImageInput')?.click()}
                                            >
                                                {currentUser?.profileImageUrl ? (
                                                    <img src={currentUser.profileImageUrl.includes('/uploads/') ? `${API_BASE}${currentUser.profileImageUrl.substring(currentUser.profileImageUrl.indexOf('/uploads/'))}` : (currentUser.profileImageUrl.startsWith('http') ? currentUser.profileImageUrl : `${API_BASE}${currentUser.profileImageUrl}`)} alt="profile" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.png'; }} />
                                                ) : (
                                                    <img src="/images/default-avatar.png" alt="profile" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                id="profileImageInput"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleProfileImageUpload}
                                            />
                                            <div
                                                onClick={() => document.getElementById('profileImageInput')?.click()}
                                                className="absolute inset-0 bg-espresso-950/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-espresso-50 text-[11px] font-bold text-center"
                                            >
                                                {t('profile.lbl_photo_change')}
                                            </div>
                                            {currentUser?.profileImageUrl && (
                                                <button
                                                    onClick={handleDeleteProfileImage}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-espresso-50 flex items-center justify-center text-[10px] shadow-sm hover:bg-red-600 transition-colors z-10"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-xl font-bold text-espresso-50 tracking-tight truncate">{t('profile.lbl_hello_user', { nickname: currentUser?.nickname || '유저' })}</h2>
                                            <p className="text-sm text-espresso-200 mt-0.5 mb-2 truncate">
                                                {currentUser?.email?.endsWith('@apple.user.local') ? t('profile.apple_account', 'Apple Account') : (currentUser?.email || 'user@beanmind.com')}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                <Link to="/profile/points" className="inline-flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/50 active:bg-amber-500/20 transition-colors whitespace-nowrap shrink-0">
                                                    <span className="text-amber-500 text-[13px]">☕</span>
                                                    <span className="text-amber-400 font-bold text-[13px]">{pointBalance.toLocaleString()} {t('profile.unit_bean', '콩')}</span>
                                                </Link>
                                                <button 
                                                    onClick={() => setIsPaymentModalOpen(true)} 
                                                    disabled={isLoading}
                                                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-xs font-bold px-2 py-1 rounded-lg border border-amber-500/30 transition-colors whitespace-nowrap shrink-0"
                                                >
                                                    {t('profile.lbl_charge')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-espresso-900 border border-espresso-700 text-espresso-100 px-4 py-2 text-sm rounded-xl font-bold active:scale-95 transition-transform whitespace-nowrap shrink-0 sm:self-center self-end"
                                    >
                                        {t('profile.btn_logout')}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-espresso-50 tracking-tight">{t('profile.login_need_title')}</h2>
                                        <p className="text-[13px] text-espresso-200 mt-1">{t('profile.login_need_desc')}</p>
                                    </div>
                                    <button
                                        onClick={() => { setAuthView('login'); setIsLoginModalOpen(true); }}
                                        className="bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#09090B] w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 shrink-0"
                                    >
                                        <LogIn size={20} className="ml-1" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Account Settings (Nickname, Password) */}
                        {isAuthenticated && (
                            <div className="bg-espresso-900/20">
                                {/* Nickname Editor */}
                                <div className="p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[14px] font-bold text-espresso-100 flex items-center gap-2"><User size={16} /> {t('profile.edit_nickname', '닉네임 변경')}</span>
                                        {!isEditingNickname && (
                                            <button onClick={() => { setIsEditingNickname(true); setNewNickname(currentUser?.nickname || ''); }} className="text-[11px] bg-espresso-800 px-3 py-1.5 rounded-md font-bold text-amber-500 hover:bg-espresso-700 uppercase tracking-widest">{t('profile.btn_edit', '수정')}</button>
                                        )}
                                    </div>
                                    <AnimatePresence>
                                        {isEditingNickname && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex gap-2">
                                                <input type="text" value={newNickname} onChange={e => setNewNickname(e.target.value)} placeholder={t('profile.ph_new_nickname', '새 닉네임 입력')} className="flex-1 w-full bg-espresso-950 border border-espresso-700 rounded-lg px-3 py-2 text-[14px] font-bold text-espresso-50 outline-none focus:border-amber-500/50" />
                                                <button onClick={handleUpdateNickname} disabled={isLoading} className="bg-amber-600/20 text-amber-500 font-bold px-4 rounded-lg text-xs whitespace-nowrap active:scale-95 disabled:opacity-50 tracking-widest uppercase">{t('profile.btn_save_changes', '저장')}</button>
                                                <button onClick={() => setIsEditingNickname(false)} className="bg-espresso-800 text-espresso-200 px-4 rounded-lg text-xs font-bold active:scale-95 uppercase">{t('profile.btn_cancel', '취소')}</button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Divider */}
                                {currentUser?.loginType !== 'GOOGLE' && <div className="border-t border-espresso-700 mx-4"></div>}

                                {/* Password Editor */}
                                {currentUser?.loginType !== 'GOOGLE' && (
                                    <div className="p-4 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[14px] font-bold text-espresso-100 flex items-center gap-2"><Lock size={16} /> {t('profile.edit_password', '비밀번호 변경')}</span>
                                            {!isChangingPassword && (
                                                <button onClick={() => setIsChangingPassword(true)} className="text-[11px] bg-espresso-800 px-3 py-1.5 rounded-md font-bold text-amber-500 hover:bg-espresso-700 uppercase tracking-widest">{t('profile.btn_edit', '수정')}</button>
                                            )}
                                        </div>
                                        <AnimatePresence>
                                            {isChangingPassword && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 mt-2">
                                                    <input type="password" value={currentPasswordInput} onChange={e => setCurrentPasswordInput(e.target.value)} placeholder={t('profile.ph_current_pw', '현재 등록된 암호 입력')} className="w-full bg-espresso-950 border border-espresso-700 rounded-lg px-3 py-2.5 text-[14px] font-bold text-espresso-50 outline-none focus:border-amber-500/50" />
                                                    <input type="password" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} placeholder={t('profile.ph_new_pw', '새 암호 (영어, 특수문자, 숫자 포함 8자 이상)')} className="w-full bg-espresso-950 border border-espresso-700 rounded-lg px-3 py-2.5 text-[14px] font-bold text-espresso-50 outline-none focus:border-amber-500/50" />
                                                    <input type="password" value={confirmPasswordInput} onChange={e => setConfirmPasswordInput(e.target.value)} placeholder={t('profile.ph_pw_confirm', '새 암호 확인')} className="w-full bg-espresso-950 border border-espresso-700 rounded-lg px-3 py-2.5 text-[14px] font-bold text-espresso-50 outline-none focus:border-amber-500/50" />
                                                    <div className="flex gap-2 justify-end pt-2">
                                                        <button onClick={() => setIsChangingPassword(false)} className="bg-espresso-800 text-espresso-200 text-xs font-bold px-5 py-3 rounded-xl active:scale-95 tracking-wider uppercase">{t('profile.btn_cancel', '취소')}</button>
                                                        <button onClick={handleChangePassword} disabled={isLoading} className="bg-amber-600/20 text-amber-500 text-xs font-bold px-5 py-3 rounded-xl whitespace-nowrap active:scale-95 disabled:opacity-50 border border-amber-600/30 tracking-wider uppercase">{t('profile.btn_change_pw', '비밀번호 안전하게 변경')}</button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Public Profile Editor */}
                                {currentUser && (
                                    <div className="p-4 flex flex-col gap-3 border-t border-espresso-700">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[14px] font-bold text-espresso-100 flex items-center gap-2"><User size={16} /> {t('profile.lbl_public_bio')}</span>
                                            {!isEditingBio && (
                                                <button onClick={() => { setIsEditingBio(true); setNewBio(currentUser?.bio || ''); setExistingBioImages(currentUser?.bioMediaUrls ? JSON.parse(currentUser.bioMediaUrls) : []); }} className="text-[11px] bg-espresso-800 px-3 py-1.5 rounded-md font-bold text-amber-500 hover:bg-espresso-700 uppercase tracking-widest">{t('profile.btn_edit', '수정')}</button>
                                            )}
                                        </div>
                                        <AnimatePresence>
                                            {isEditingBio ? (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-2 relative mt-2">
                                                    <textarea 
                                                        value={newBio} 
                                                        onChange={e => setNewBio(e.target.value)} 
                                                        placeholder={t('profile.ph_bio')} 
                                                        maxLength={100}
                                                        className="w-full bg-espresso-950 border border-espresso-700 rounded-lg px-3 py-2 text-[13px] text-espresso-50 outline-none focus:border-amber-500/50 resize-none h-20"
                                                    />
                                                    {(existingBioImages.length > 0 || newBioImagePreviews.length > 0) && (
                                                        <div className="flex gap-2 overflow-x-auto py-2">
                                                            {existingBioImages.map((url, idx) => (
                                                                <div key={`existing-${idx}`} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-espresso-700">
                                                                    {url.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
                                                                        <video src={`${API_BASE}${url}`} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <img src={`${API_BASE}${url}`} className="w-full h-full object-cover" />
                                                                    )}
                                                                    <button onClick={() => removeExistingBioImage(idx)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                                                                </div>
                                                            ))}
                                                            {newBioImagePreviews.map((url, idx) => (
                                                                <div key={`new-${idx}`} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-espresso-700">
                                                                    {newBioImages[idx]?.type.startsWith('video/') ? (
                                                                        <video src={url} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <img src={url} className="w-full h-full object-cover" />
                                                                    )}
                                                                    <button onClick={() => removeBioImage(idx)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center gap-2 mt-1">
                                                        <button onClick={() => bioFileInputRef.current?.click()} className="text-espresso-400 hover:text-amber-500 transition-colors p-2 active:scale-95">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                                        </button>
                                                        <input type="file" ref={bioFileInputRef} className="hidden" multiple accept="image/*,video/*" onChange={handleBioFileChange} />
                                                        <div className="flex gap-2">
                                                            <button onClick={handleUpdatePublicProfile.bind(null, newBio, undefined)} disabled={isLoading} className="bg-amber-600/20 text-amber-500 font-bold px-4 py-2 rounded-lg text-xs hover:bg-amber-600/30 active:scale-95 disabled:opacity-50 tracking-widest uppercase">{t('profile.btn_save')}</button>
                                                            <button onClick={() => { setIsEditingBio(false); setNewBioImages([]); setNewBioImagePreviews([]); }} className="bg-espresso-800 text-espresso-200 px-4 py-2 rounded-lg text-xs font-bold hover:bg-espresso-700 active:scale-95 uppercase">{t('profile.btn_cancel')}</button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <p className="text-[13px] text-espresso-300 mt-1 cursor-pointer hover:text-espresso-200 transition-colors" onClick={() => { setIsEditingBio(true); setNewBio(currentUser?.bio || ''); setExistingBioImages(currentUser?.bioMediaUrls ? JSON.parse(currentUser.bioMediaUrls) : []); }}>
                                                    {currentUser.bio || t('profile.lbl_no_bio')}
                                                </p>
                                            )}
                                        </AnimatePresence>
                                        
                                        <div className="flex items-center justify-between mt-2 pt-4 border-t border-espresso-700">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-espresso-100">{t('profile.lbl_enable_public_profile')}</span>
                                                <span className="text-[11px] text-espresso-400 mt-1">{t('profile.desc_enable_public_profile')}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleUpdatePublicProfile(undefined, currentUser.isPublicProfile === false ? true : false)}
                                                disabled={isLoading}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${currentUser.isPublicProfile !== false ? 'bg-amber-500' : 'bg-espresso-800'}`}
                                            >
                                                <span className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${(currentUser.isPublicProfile !== false) ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* STORE & ADS MANAGEMENT (Host Only) */}
                    {isAuthenticated && currentUser?.role === 'OWNER' && (
                        <div className="space-y-4 mt-6 p-6 bg-gradient-to-br from-espresso-900 to-[#150f0b] rounded-[2rem] border border-amber-500/40 relative shadow-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="text-lg font-serif font-black text-amber-500 tracking-tight flex items-center gap-1.5">
                                        {t('profile.business_center_title', '💼 Business Center')}
                                    </h3>
                                    <p className="text-[11px] text-espresso-200">{t('profile.business_center_desc', '매장 정보 관리 및 모바일 웹 POS 시스템')}</p>
                                </div>
                                <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest uppercase">HOST</span>
                            </div>

                            {/* Manage Existing Shop */}
                            <div className="bg-espresso-950/40 rounded-2xl border border-amber-500/20 overflow-hidden shadow-sm group">
                                <button onClick={() => navigate('/profile/manage-shop')} className="w-full px-5 py-4 flex items-center justify-between active:bg-espresso-950 transition-colors">
                                    <span className="font-bold text-[15px] text-espresso-50 group-hover:text-amber-400 transition-colors">{t('profile.menu_manage_shop')}</span>
                                    <ChevronRight size={18} className="text-espresso-300 group-hover:text-amber-400 transition-colors" />
                                </button>
                            </div>

                            {/* B2B Web Dashboard & Host QR Stamp Scanner */}
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => navigate('/profile/host-web')} 
                                    className="flex flex-col items-center justify-center p-5 bg-[#140e0b]/40 border border-amber-500/30 rounded-2xl active:scale-[0.98] transition-all hover:bg-[#140e0b]/60 cursor-pointer text-left w-full"
                                >
                                    <Database size={22} className="text-amber-400 mb-2" />
                                    <span className="font-bold text-[13px] text-espresso-50">{t('profile.btn_pos_dashboard', '웹 POS 대시보드')}</span>
                                    <span className="text-[10px] text-espresso-300 mt-1">{t('profile.desc_pos_dashboard', '정책설정 & B2B 통계')}</span>
                                </button>
                                <button 
                                    onClick={() => setIsHostScannerOpen(true)} 
                                    className="flex flex-col items-center justify-center p-5 bg-[#140e0b]/40 border border-amber-500/30 rounded-2xl active:scale-[0.98] transition-all hover:bg-[#140e0b]/60 cursor-pointer text-left w-full"
                                >
                                    <Coffee size={22} className="text-amber-400 mb-2" />
                                    <span className="font-bold text-[13px] text-espresso-50">{t('profile.btn_host_scanner', '점주용 QR 스캐너')}</span>
                                    <span className="text-[10px] text-espresso-300 mt-1">{t('profile.desc_host_scanner', '스탬프 적립 및 취소')}</span>
                                </button>
                            </div>

                            {/* Add New Shop */}
                            <button
                                onClick={() => navigate('/register')}
                                className="w-full bg-[#140e0b]/30 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-2 items-start active:scale-[0.98] transition-all hover:bg-[#140e0b]/50 group"
                            >
                                <div className="flex justify-between w-full">
                                    <div className="bg-espresso-950/60 p-2.5 rounded-xl text-espresso-200 shadow-sm border border-espresso-800 group-hover:scale-105 transition-transform">
                                        <Store size={20} />
                                    </div>
                                    <div className="text-espresso-300 bg-[#140e0b]/60 px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase">
                                        {t('profile.owner_banner')}
                                    </div>
                                </div>
                                <div className="text-left mt-1">
                                    <h3 className="font-serif font-bold text-[15px] text-espresso-50">{t('profile.owner_add_shop')}</h3>
                                    <p className="text-[11px] text-espresso-200 leading-relaxed mt-1 break-keep">
                                        {t('profile.owner_add_shop_desc').split('\n').map((line, i) => (
                                            <React.Fragment key={i}>
                                                {line}
                                                <br />
                                            </React.Fragment>
                                        ))}
                                    </p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* 🎫 BeanStamp 스탬프 지갑 */}
                    {isAuthenticated && (
                        <section className="bg-gradient-to-br from-espresso-900 to-[#1b120c] rounded-[2rem] border border-amber-500/40 overflow-hidden relative shadow-2xl p-6 mt-6">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-serif font-black text-amber-500 tracking-tight flex items-center gap-1.5">
                                        {t('profile.beanstamp_title', '🎫 BeanStamp 지갑')}
                                    </h3>
                                    <p className="text-[11px] text-espresso-200">{t('profile.beanstamp_subtitle', '단골 매장 도장판 및 적립용 QR')}</p>
                                </div>
                                
                                {/* 적립용 QR 생성 버튼 */}
                                <button 
                                    onClick={() => setIsStampModalOpen(true)}
                                    className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                                >
                                    <Share2 size={13} /> {t('profile.btn_my_qr', '내 QR 코드')}
                                </button>
                            </div>

                            {/* 탭 헤더 */}
                            <div className="flex bg-espresso-950/60 rounded-xl p-1 mb-4 border border-espresso-800">
                                <button 
                                    onClick={() => setActiveStampTab('REGULAR')}
                                    className={`flex-1 text-center py-2 text-[12px] font-bold rounded-lg transition-all ${activeStampTab === 'REGULAR' ? 'bg-amber-600 text-white shadow-sm' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/10'}`}
                                >
                                    {t('profile.tab_regular', '일반 음료')}
                                </button>
                                <button 
                                    onClick={() => setActiveStampTab('PROMOTION')}
                                    className={`flex-1 text-center py-2 text-[12px] font-bold rounded-lg transition-all ${activeStampTab === 'PROMOTION' ? 'bg-amber-600 text-white shadow-sm' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/10'}`}
                                >
                                    {t('profile.tab_promotion', '프로모션')}
                                </button>
                                <button 
                                    onClick={() => setActiveStampTab('COUPON')}
                                    className={`flex-1 text-center py-2 text-[12px] font-bold rounded-lg transition-all ${activeStampTab === 'COUPON' ? 'bg-amber-600 text-white shadow-sm' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/10'} flex justify-center items-center gap-1.5`}
                                >
                                    {t('profile.tab_coupon', '무료 쿠폰')}
                                    {myStampCoupons.length > 0 && (
                                        <span className="bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center font-mono">
                                            {myStampCoupons.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* 탭 바디 */}
                            {activeStampTab === 'REGULAR' || activeStampTab === 'PROMOTION' ? (
                                <div className="space-y-4">
                                    {myStampCards.filter(c => c.cardType === activeStampTab).length > 0 ? (
                                        myStampCards.filter(c => c.cardType === activeStampTab).map((card) => {
                                            const dots = Array.from({ length: card.maxStamps }, (_, i) => i < card.currentStamps);
                                            
                                            return (
                                                <div key={card.id} className="bg-espresso-950/40 p-4 rounded-2xl border border-espresso-800 space-y-3">
                                                    <div className="flex justify-between items-center gap-2">
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            {card.storeLogo ? (
                                                                <img src={`${API_BASE}${card.storeLogo}`} className="w-8 h-8 rounded-full border border-espresso-700 flex-shrink-0" alt={card.storeName} />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-espresso-800 border border-espresso-700 flex items-center justify-center text-espresso-200 text-xs flex-shrink-0">☕</div>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="font-bold text-[14px] text-espresso-50 leading-tight truncate">{card.storeName}</h4>
                                                                <p className="text-[10px] text-espresso-300 truncate">{t(card.cardTitle, card.cardTitle) as string}</p>
                                                                {(() => {
                                                                    const remaining = getStampCardRemainingDays(card.updatedAt, card.validDays || 90);
                                                                    if (remaining === null) return null;
                                                                    const expireDate = new Date(new Date(card.updatedAt).getTime() + (card.validDays || 90) * 24 * 60 * 60 * 1000);
                                                                    return (
                                                                        <p className="text-[9px] text-amber-500 font-mono mt-0.5 font-bold truncate">
                                                                            {t('profile.lbl_expiry', '유효기간')}: {expireDate.toLocaleDateString()} (D-{remaining})
                                                                        </p>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <span className="font-mono font-black text-amber-500 text-[16px]">{card.currentStamps}</span>
                                                            <span className="font-mono text-espresso-300 text-[12px]"> / {card.maxStamps}</span>
                                                            <p className="text-[9px] text-[#D4AF37] font-bold mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{t('profile.lbl_reward_on_complete', '완성 시')}: {card.rewardDesc}</p>
                                                        </div>
                                                    </div>

                                                    {/* 도장판 그리드 또는 복합 카테고리별 분할 도장판 */}
                                                    {(() => {
                                                        const resolvedItemsConfig = getItemsConfig(card);
                                                        const isPromotion = card.cardType === "PROMOTION" && resolvedItemsConfig !== null;
                                                        if (isPromotion && resolvedItemsConfig) {
                                                            const itemsProgress = typeof card.itemsProgress === 'string' ? JSON.parse(card.itemsProgress) : (card.itemsProgress || {});
                                                            return (
                                                                <div className="space-y-3 pt-2">
                                                                    {resolvedItemsConfig.map((item: any) => {
                                                                        const currentVal = itemsProgress[item.key] || 0;
                                                                        const targetVal = item.target;
                                                                        const itemDots = Array.from({ length: targetVal }, (_, i) => i < currentVal);
                                                                        return (
                                                                            <div key={item.key} className="space-y-1 bg-espresso-950/20 p-2.5 rounded-xl border border-espresso-800/30">
                                                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                                                    <span className="text-espresso-100">{t('profile.lbl_stamp_card_title', { label: item.label, defaultValue: `${item.label} 도장판` })}</span>
                                                                                    <span className="font-mono text-[#D4AF37]">{currentVal} / {t('profile.unit_stamps', { count: targetVal, defaultValue: `${targetVal}개` })}</span>
                                                                                </div>
                                                                                <div className="grid grid-cols-6 gap-2.5 pt-1">
                                                                                    {itemDots.map((isStamped, dIdx) => (
                                                                                        <div 
                                                                                            key={dIdx} 
                                                                                            className={`aspect-square rounded-lg border flex items-center justify-center transition-all ${isStamped ? 'bg-gradient-to-br from-amber-500 to-amber-700 border-amber-400 shadow-md shadow-amber-500/10 scale-105' : 'border-dashed border-espresso-750 bg-espresso-900/20'}`}
                                                                                        >
                                                                                            {isStamped ? (
                                                                                                <span className="text-espresso-950 font-black text-[10px]">☕</span>
                                                                                            ) : (
                                                                                                <span className="text-[9px] font-mono text-espresso-750 font-bold">{dIdx + 1}</span>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        }

                                                        // 기존 일반 그리드
                                                        return (
                                                            <div className="grid grid-cols-5 gap-2.5 pt-2">
                                                                {dots.map((isStamped, dIdx) => (
                                                                    <div 
                                                                        key={dIdx} 
                                                                        className={`aspect-square rounded-full border flex items-center justify-center transition-all ${isStamped ? 'bg-gradient-to-br from-amber-500 to-amber-700 border-amber-400 shadow-md shadow-amber-500/10 scale-105' : 'border-dashed border-espresso-700 bg-espresso-900/30'}`}
                                                                    >
                                                                        {isStamped ? (
                                                                            <span className="text-espresso-950 font-black text-[13px]">☕</span>
                                                                        ) : (
                                                                            <span className="text-[11px] font-mono text-espresso-700 font-bold">{dIdx + 1}</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}

                                                    <div className="flex justify-between items-center pt-1.5 border-t border-espresso-800/40 mt-1">
                                                        <span className="text-[9.5px] text-espresso-300">
                                                            {t('profile.lbl_total_stamps', '총 누적 적립')}: <span className="text-[#D4AF37] font-black font-mono">{t('profile.unit_stamps', { count: (card.completedCount * card.maxStamps) + card.currentStamps, defaultValue: `${(card.completedCount * card.maxStamps) + card.currentStamps}개` })}</span>
                                                        </span>
                                                        <span className="text-[9.5px] text-espresso-300">
                                                            {t('profile.lbl_complete_count', '완성 횟수')}: <span className="text-amber-500 font-black">{t('profile.unit_times', { count: card.completedCount, defaultValue: `${card.completedCount}회` })}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-espresso-300 text-xs opacity-75">
                                            {t('profile.no_stamp_cards', { type: activeStampTab === 'REGULAR' ? t('profile.tab_regular', '일반 음료') : t('profile.tab_promotion', '프로모션'), defaultValue: `적립된 ${activeStampTab === 'REGULAR' ? '일반' : '시즌 프로모션'} 스탬프 카드가 없습니다.` })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // 무료 쿠폰함
                                <div className="space-y-4">
                                    {/* 무료 쿠폰 서브 탭 (사용 가능 / 사용 내역) */}
                                    <div className="flex justify-center bg-espresso-950/40 rounded-xl p-1 mb-2 border border-espresso-800/60 max-w-[280px] mx-auto">
                                        <button
                                            onClick={() => setCouponSubTab('UNUSED')}
                                            className={`flex-1 text-center py-1.5 text-[11px] font-bold rounded-lg transition-all ${couponSubTab === 'UNUSED' ? 'bg-amber-600 text-white shadow-sm' : 'text-espresso-300 hover:text-espresso-100'}`}
                                        >
                                            {t('profile.coupon_subtab_unused', '사용 가능한 쿠폰')}
                                        </button>
                                        <button
                                            onClick={() => setCouponSubTab('USED')}
                                            className={`flex-1 text-center py-1.5 text-[11px] font-bold rounded-lg transition-all ${couponSubTab === 'USED' ? 'bg-amber-600 text-white shadow-sm' : 'text-espresso-300 hover:text-espresso-100'}`}
                                        >
                                            {t('profile.coupon_subtab_used', '사용/만료 내역')}
                                        </button>
                                    </div>

                                    {couponSubTab === 'UNUSED' ? (
                                        <div className="space-y-3">
                                            {myStampCoupons.length > 0 ? (
                                                myStampCoupons.map((coupon) => (
                                                    <div key={coupon.id} className="bg-gradient-to-r from-amber-900/30 to-espresso-900 p-4 rounded-2xl border border-amber-500/10 flex justify-between items-center relative overflow-hidden ticket-cutout">
                                                        <div className="absolute right-0 top-0 bg-amber-500 text-espresso-950 text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                                                            FREE
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h4 className="font-bold text-[14px] text-espresso-50">{t('profile.coupon_reward_title', { storeName: coupon.storeName, defaultValue: `${coupon.storeName} 무료 혜택` })}</h4>
                                                            {coupon.rewardDesc && (
                                                                <p className="text-[12px] text-amber-400 font-bold mt-0.5">{coupon.rewardDesc}</p>
                                                            )}
                                                            <p className="text-[11px] text-[#D4AF37]/80 font-bold">{t('profile.lbl_coupon_code', '쿠폰 코드')}: {coupon.couponCode}</p>
                                                            <p className="text-[10px] text-espresso-300">
                                                                {t('profile.lbl_expire_date', '만료일')}: {new Date(coupon.expiresAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                setCurrentCouponForQR(coupon);
                                                                setIsCouponQRModalOpen(true);
                                                            }}
                                                            className="bg-amber-500 text-espresso-950 font-black text-xs px-3.5 py-2 rounded-xl active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer"
                                                        >
                                                            {t('profile.btn_use_now', '사용하기')}
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-espresso-300 text-xs opacity-75">
                                                    {t('profile.no_free_coupons', '사용 가능한 무료 쿠폰이 없습니다.')}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {myCouponHistory.length > 0 ? (
                                                myCouponHistory.map((coupon) => {
                                                    const isExpired = coupon.status === 'EXPIRED';
                                                    return (
                                                        <div key={coupon.id} className="bg-espresso-950/20 p-4 rounded-2xl border border-espresso-850 flex justify-between items-center relative overflow-hidden ticket-cutout opacity-60 grayscale">
                                                            <div className={`absolute right-0 top-0 text-espresso-950 text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-wider ${isExpired ? 'bg-red-500/80 text-white' : 'bg-espresso-700 text-espresso-200'}`}>
                                                                {isExpired ? t('profile.coupon_status_expired', '만료') : t('profile.coupon_status_used', '사용완료')}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <h4 className="font-bold text-[14px] text-espresso-400">{coupon.storeName} {t('profile.coupon_history_title_suffix', '무료 쿠폰')}</h4>
                                                                {coupon.rewardDesc && (
                                                                    <p className="text-[12px] text-espresso-300 font-bold mt-0.5">{coupon.rewardDesc}</p>
                                                                )}
                                                                <p className="text-[11px] text-espresso-400">{t('profile.lbl_coupon_code', '쿠폰 코드')}: {coupon.couponCode}</p>
                                                                {coupon.usedAt ? (
                                                                    <p className="text-[10px] text-amber-500/80 font-bold">
                                                                        {t('profile.lbl_used_date', '사용일')}: {new Date(coupon.usedAt).toLocaleDateString()} {new Date(coupon.usedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-[10px] text-red-400/80 font-bold">
                                                                        {t('profile.lbl_expired_date', '만료일')}: {new Date(coupon.expiresAt).toLocaleDateString()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] font-bold text-espresso-500 px-3.5 py-2 select-none border border-espresso-800 rounded-xl">
                                                                {isExpired ? t('profile.lbl_expired', '기간 만료') : t('profile.lbl_used', '사용 완료')}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-8 text-espresso-300 text-xs opacity-75">
                                                    {t('profile.no_coupon_history', '사용 완료되거나 만료된 쿠폰 내역이 없습니다.')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Taste Matrix (Radar Chart) */}
                    {isAuthenticated && tasteMatrix && (
                        <section className="bg-[#1e1e21] rounded-2xl border border-amber-500/50 overflow-hidden relative shadow-lg">
                            <div className="px-5 py-4 flex items-center justify-between border-b border-espresso-700">
                                <div className="flex items-center gap-2">
                                    <span className="text-amber-500 font-serif font-bold text-lg pt-0.5" style={{lineHeight: 1}}>✨</span>
                                    <span className="font-bold text-[15px] text-amber-500 tracking-tight">{t('profile.title_taste_matrix', '마이 취향 매트릭스')}</span>
                                </div>
                                <Link to="/profile/tasting-note" className="text-xs bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full font-bold">
                                    {t('profile.btn_write_note', '+ 노트 작성')}
                                </Link>
                            </div>
                            <div className="p-5 flex flex-col items-center">
                                <div className="w-full h-64 min-h-[250px] min-w-[250px]">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={tasteMatrix.matrix}>
                                            <PolarGrid stroke="#3f3f46" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 'bold' }} tickFormatter={(tick) => {
                                                const map: Record<string, string> = {
                                                    '산미': t('profile.radar_acidity', '산미 (Acidity)'),
                                                    '단맛': t('profile.radar_sweetness', '단맛 (Sweetness)'),
                                                    '쓴맛': t('profile.radar_bitterness', '쓴맛 (Bitterness)'),
                                                    '바디감': t('profile.radar_body', '바디감 (Body)'),
                                                    '아로마': t('profile.radar_aroma', '아로마 (Aroma)')
                                                };
                                                return map[tick] || tick;
                                            }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                            <Radar
                                                name="Taste"
                                                dataKey="A"
                                                stroke="#f59e0b"
                                                strokeWidth={2}
                                                fill="#f59e0b"
                                                fillOpacity={0.4}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                {tasteMatrix.recentTags && tasteMatrix.recentTags.length > 0 && (
                                    <div className="mt-4 w-full">
                                        <div className="text-[11px] font-bold text-gray-500 mb-2">{t('profile.lbl_recent_tags', '최근 기록된 풍미 태그')}</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {tasteMatrix.recentTags.map((tag: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 text-gray-300 rounded-md text-[10px]">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Taste Profile Editor */}
                    {isAuthenticated && (
                        <section className="bg-espresso-900 rounded-2xl border border-espresso-700 overflow-hidden">
                            <button 
                                onClick={() => setIsTasteProfileOpen(!isTasteProfileOpen)} 
                                className="w-full px-5 py-4 flex items-center justify-between active:bg-espresso-950 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-amber-500 font-serif font-bold text-lg text-center pt-0.5" style={{lineHeight: 1}}>☕</span>
                                    <span className="font-bold text-[15px] text-amber-500 tracking-tight">{t('profile.menu_taste_profile', '내 커피 취향 (Taste Profile)')}</span>
                                </div>
                                <motion.div animate={{ rotate: isTasteProfileOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronRight size={18} className="text-amber-500/80" />
                                </motion.div>
                            </button>
                            <AnimatePresence>
                                {isTasteProfileOpen && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-espresso-950/30 px-5 pb-5 pt-2">
                                        <p className="text-[12px] text-espresso-200 mb-5 leading-relaxed">
                                            {t('profile.taste_desc', '설정하신 프로필은 커뮤니티의 취향 매칭 피드에 반영되어 나와 가장 잘 맞는 스페셜티 커피를 찾아줍니다.')}
                                        </p>
                                        
                                        {/* Sliders */}
                                        <div className="space-y-4">
                                            {[
                                                { label: t('profile.taste_acidity', '산미 (Acidity)'), key: 'acidity', color: 'from-yellow-500 to-amber-400' },
                                                { label: t('profile.taste_sweetness', '단맛 (Sweetness)'), key: 'sweetness', color: 'from-orange-500 to-amber-500' },
                                                { label: t('profile.taste_bitterness', '쓴맛 (Bitterness)'), key: 'bitterness', color: 'from-amber-700 to-amber-800' },
                                                { label: t('profile.taste_body', '바디감 (Body)'), key: 'body', color: 'from-amber-600 to-amber-700' },
                                            ].map(({ label, key, color }) => (
                                                <div key={key}>
                                                    <div className="flex justify-between items-end mb-1.5">
                                                        <span className="text-[13px] font-bold text-espresso-100">{label}</span>
                                                        <span className="text-[12px] font-medium text-amber-500">{t('profile.lbl_taste_points', { points: tastePref[key as keyof typeof tastePref] })}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0" max="5" step="0.5"
                                                        value={tastePref[key as keyof typeof tastePref]}
                                                        onChange={(e) => setTastePref({ ...tastePref, [key]: parseFloat(e.target.value) })}
                                                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-espresso-800"
                                                        style={{ 
                                                            background: `linear-gradient(to right, #f59e0b 0%, #d97706 ${(Number(tastePref[key as keyof typeof tastePref])/5)*100}%, #27272a ${(Number(tastePref[key as keyof typeof tastePref])/5)*100}%, #27272a 100%)` 
                                                        }}
                                                    />
                                                    <div className="flex justify-between px-1 mt-1">
                                                        <span className="text-[10px] text-espresso-300">{t('profile.lbl_low')}</span>
                                                        <span className="text-[10px] text-espresso-300">{t('profile.lbl_high')}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 향(Aroma) 선호도 다중 선택 구역 */}
                                        <div className="pt-6 pb-6 mt-4 border-t border-b border-espresso-700">
                                            <div className="flex justify-between items-center mb-3 text-sm">
                                                <span className="font-bold text-espresso-50 flex items-center gap-2">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M11 6c-2 0-3 1-3 3s1 3 3 3 3-1 3-3-1-3-3-3z"></path><path d="M12 21v-4"></path><path d="M9 13.5l-3 5.5"></path><path d="M15 13.5l3 5.5"></path></svg>
                                                    {t('profile.lbl_aroma_notes', '선호하는 향 노트 (Aroma)')}
                                                </span>
                                                <span className="text-amber-500 font-bold border-b border-amber-500/30 pb-0.5">{t('profile.lbl_max_3', '최대 3개')}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {AROMA_TAGS.map(tag => {
                                                    const currentTags = tastePref.aroma ? tastePref.aroma.split(',').filter(Boolean) : [];
                                                    const isSelected = currentTags.includes(tag);
                                                    return (
                                                        <button
                                                            key={tag}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                let newTags = [...currentTags];
                                                                if (isSelected) {
                                                                    newTags = newTags.filter(t => t !== tag);
                                                                } else {
                                                                    if (newTags.length >= 3) {
                                                                        alert(t('profile.msg_aroma_max', '최대 3개까지만 선택 가능합니다.'));
                                                                        return;
                                                                    }
                                                                    newTags.push(tag);
                                                                }
                                                                setTastePref({...tastePref, aroma: newTags.join(',')});
                                                            }}
                                                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${isSelected ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-espresso-800 text-espresso-300 border-espresso-700 hover:border-espresso-600'}`}
                                                        >
                                                            {isSelected && <span className="mr-1">✓</span>}
                                                            {getAromaLabel(tag)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={async () => {
                                                setIsLoading(true);
                                                try {
                                                    const res = await fetch(`${API_BASE}/api/users/me/taste`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                                                        body: JSON.stringify({
                                                            prefAcidity: tastePref.acidity,
                                                            prefSweetness: tastePref.sweetness,
                                                            prefBody: tastePref.body,
                                                            prefBitterness: tastePref.bitterness,
                                                            prefAroma: tastePref.aroma
                                                        })
                                                    });
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        localStorage.setItem('user', JSON.stringify(data.user));
                                                        setCurrentUser(data.user);
                                                        alert(t('profile.alert_taste_saved', '내 취향이 성공적으로 저장되었습니다!'));
                                                        setIsTasteProfileOpen(false);
                                                    } else {
                                                        alert(t('profile.alert_save_fail', '저장에 실패했습니다.'));
                                                    }
                                                } catch (err) {
                                                    alert(t('profile.alert_error', '오류가 발생했습니다.'));
                                                } finally {
                                                    setIsLoading(false);
                                                }
                                            }}
                                            disabled={isLoading}
                                            className="mt-6 w-full py-3 bg-[#1e1e21] border border-amber-500/50 text-amber-500 font-bold text-[14px] rounded-xl active:scale-95 transition-all hover:bg-amber-500/10"
                                        >
                                            {isLoading ? t('profile.btn_saving', '저장 중...') : t('profile.btn_save_taste', '적용 및 취향 저장하기')}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </section>
                    )}




                    <div className="my-6"></div>

                    {/* COFFEE PASSPORT (My Prescriptions) */}
                    {isAuthenticated && (
                        <section className="bg-coffee-900 rounded-[2rem] border border-coffee-700 overflow-hidden relative shadow-2xl">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=1000&auto=format&fit=crop')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                            
                            <div className="px-6 py-5 relative z-10 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-serif font-bold text-coffee-50 tracking-tight flex items-center gap-2">
                                        ☕ {t('profile.title_ai_prescriptions', 'AI Coffee Prescriptions')}
                                    </h3>
                                    <p className="text-xs text-coffee-300 mt-1">{t('profile.title_prescription_history')}</p>
                                </div>
                                <div className="bg-coffee-800/50 px-3 py-1 rounded-full border border-coffee-700">
                                    <span className="text-coffee-200 font-mono text-sm font-bold">{prescriptions.length}</span>
                                </div>
                            </div>

                            {prescriptions.length > 0 ? (
                                <div className="px-5 pb-6 overflow-x-auto hide-scrollbar flex gap-4 snap-x snap-mandatory relative z-10">
                                    {prescriptions.map((p, idx) => (
                                        <div 
                                            key={p.id || idx}
                                            onClick={() => setSelectedPrescription(p)}
                                            className="shrink-0 w-40 h-52 snap-center bg-[#fdfcfb] rounded-2xl p-4 flex flex-col justify-between shadow-xl cursor-pointer active:scale-95 transition-transform border border-espresso-700 relative overflow-hidden ticket-cutout"
                                        >
                                            <div className="border-b border-dashed border-espresso-700 pb-2 mb-2">
                                                <div className="text-[10px] font-bold text-coffee-400 uppercase tracking-widest text-center truncate">{t('profile.lbl_ai_prescribed', 'AI PRESCRIBED')}</div>
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center relative z-10">
                                                <h4 className="text-[13px] font-black text-espresso-50 leading-tight mb-2 line-clamp-3">
                                                    {p.beanName}
                                                </h4>
                                                <p className="text-[11px] font-bold text-coffee-600 line-clamp-1">by {p.brand}</p>
                                            </div>
                                            <div className="pt-3 border-t border-dashed border-espresso-700 text-[10px] font-mono font-bold text-coffee-400 text-center receipt-bottom">
                                                {new Date(p.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-6 pb-8 relative z-10 flex flex-col items-center justify-center text-center opacity-60">
                                    <div className="w-16 h-16 rounded-full border border-dashed border-coffee-500/50 flex items-center justify-center mb-3">
                                        <Coffee className="text-coffee-400" size={24} />
                                    </div>
                                    <p className="text-sm text-coffee-200 font-medium">{t('profile.msg_no_prescriptions')}</p>
                                    <button onClick={() => navigate('/')} className="mt-4 px-5 py-2 bg-coffee-800 hover:bg-coffee-700 text-coffee-100 text-xs font-bold rounded-full transition-colors">
                                        {t('profile.btn_get_prescription')}
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* PILGRIMAGE PASSPORT */}
                    {isAuthenticated && (
                        <section className="bg-espresso-900 rounded-[2rem] border border-espresso-700 overflow-hidden relative shadow-2xl mt-6">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507133750070-4ed0b28e62d4?q=80&w=1000&auto=format&fit=crop')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                            
                            <div 
                                className="px-6 py-5 relative z-10 flex justify-between items-start bg-espresso-950/40 gap-4 cursor-pointer active:bg-espresso-900/50 transition-colors"
                                onClick={() => setIsPassportExpanded(!isPassportExpanded)}
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[19px] whitespace-nowrap font-serif font-black text-amber-500 tracking-tight flex items-center gap-2 truncate">
                                        <MapPin size={20} className="shrink-0" /> {t('profile.title_passport')}
                                        {isPassportExpanded ? <ChevronUp size={20} className="text-espresso-400 shrink-0" /> : <ChevronDown size={20} className="text-espresso-400 shrink-0" />}
                                    </h3>
                                    <p className="text-[11px] text-espresso-200 mt-1.5 font-medium select-text break-keep truncate">
                                        {t('profile.lbl_current_tier')} <span className="font-bold text-amber-400">{currentBadge.icon} {currentBadge.name}</span>
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <div className="bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30 whitespace-nowrap">
                                        <span className="text-amber-500 font-mono text-[11px] sm:text-xs font-bold">{t('profile.lbl_places', { count: passportCheckins.length, defaultValue: '{{count}} Places' })}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={passportCheckins.length > 0 ? (e) => { e.stopPropagation(); navigate('/map?passport=true'); } : undefined} 
                                            disabled={passportCheckins.length === 0}
                                            className={`p-1.5 rounded-full shadow-sm transition-colors border ${passportCheckins.length > 0 ? 'bg-espresso-800/80 hover:bg-espresso-700 text-amber-500 border-amber-700/50' : 'bg-espresso-900 text-espresso-700 border-espresso-700 cursor-not-allowed'}`} 
                                            title="View Route map"
                                        >
                                            <MapPin size={16} />
                                        </button>
                                        <button 
                                            onClick={passportCheckins.length > 0 ? (e) => { e.stopPropagation(); handleSharePassport(); } : undefined} 
                                            disabled={passportCheckins.length === 0}
                                            className={`p-1.5 rounded-full shadow-sm transition-colors border ${passportCheckins.length > 0 ? 'bg-espresso-800/80 hover:bg-espresso-700 text-espresso-50 border-espresso-700' : 'bg-espresso-900 text-espresso-700 border-espresso-700 cursor-not-allowed'}`}
                                        >
                                            <Share2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Expandable Body */}
                            <AnimatePresence>
                                {isPassportExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                            
                            {/* Progress Bar UI */}
                            <div className="px-6 pb-4 relative z-10 bg-espresso-950/40 border-b border-espresso-700">
                                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider mb-2">
                                    <span className="text-espresso-300">{t('profile.lbl_progression', 'Progression')}</span>
                                    {currentBadge.next ? (
                                        <span className="text-amber-500/90">{passportCheckins.length} / {currentBadge.next} {t('profile.lbl_to_next_tier', 'TO NEXT TIER')}</span>
                                    ) : (
                                        <span className="text-amber-500/90">{t('profile.lbl_max_level', 'MAX LEVEL ACHIEVED')}</span>
                                    )}
                                </div>
                                <div className="w-full bg-espresso-950 rounded-full h-2.5 overflow-hidden border border-espresso-700">
                                    <div 
                                        className="bg-gradient-to-r from-amber-600 to-amber-400 h-2.5 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-1000" 
                                        style={{ width: `${currentBadge.progress}%` }}
                                    ></div>
                                </div>
                            </div>

                            {passportCheckins.length > 0 ? (
                                <div className="px-6 py-6 grid grid-cols-2 gap-4 relative z-10 bg-espresso-950/20">
                                    {passportCheckins.map((checkin, idx) => {
                                        const store = checkin.store;
                                        // Use same fallback mapping logic as main map
                                        let heroImage = store?.markerImageUrl || store?.mainImageUrl;
                                        if (heroImage?.startsWith('/mock-bucket')) heroImage = 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800';
                                        
                                        let finalHeroImage = heroImage;
                                        if (finalHeroImage && finalHeroImage.startsWith('/') && !finalHeroImage.startsWith('http')) {
                                            finalHeroImage = `${API_BASE}${finalHeroImage}`;
                                        }
                                        
                                        const imageUrl = finalHeroImage || 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=40&w=200';
                                        
                                        return (
                                            <div key={checkin.id || idx} className="relative aspect-square rounded-[1.5rem] bg-espresso-800 border-2 border-espresso-700 overflow-hidden shadow-lg group pointer-events-auto cursor-pointer active:scale-95 transition-transform" onClick={() => navigate('/map', { state: { targetShopId: store?.id, targetLat: store?.lat, targetLng: store?.lng, targetName: store?.name } })}>
                                                <img src={imageUrl} alt={store?.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-espresso-950 via-espresso-950/20 to-transparent pointer-events-none"></div>
                                                
                                                {/* Record button overlay */}
                                                <button 
                                                    className={`absolute top-2 left-2 w-10 h-10 border-[2px] rounded-full flex items-center justify-center rotate-[-10deg] backdrop-blur-md shadow-md z-[15] transition-transform hover:scale-105 active:scale-95 ${checkin.memo || checkin.memoImageUrl ? 'border-amber-500/90 bg-amber-950/60 text-amber-500' : 'border-espresso-400/90 bg-espresso-950/60 text-espresso-400'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedCheckinForMemo(checkin);
                                                        setMemoInput(checkin.memo || '');
                                                        let initialPreviews: string[] = [];
                                                        if (checkin.memoImageUrl) {
                                                            if (checkin.memoImageUrl.startsWith('[')) {
                                                                try {
                                                                    const urls = JSON.parse(checkin.memoImageUrl);
                                                                    initialPreviews = urls.map((u: string) => u.startsWith('/') ? `${API_BASE}${u}` : u);
                                                                } catch(e) {}
                                                            } else {
                                                                initialPreviews = [checkin.memoImageUrl.startsWith('/') ? `${API_BASE}${checkin.memoImageUrl}` : checkin.memoImageUrl];
                                                            }
                                                        }
                                                        setMemoImagePreviews(initialPreviews);
                                                        setMemoImageFiles([]);
                                                    }}
                                                >
                                                    <span className="text-[10px] font-black uppercase whitespace-nowrap rotate-[10deg]">
                                                        {checkin.memo || checkin.memoImageUrl ? t('profile.btn_recorded', '기록됨') : t('profile.btn_record', '기록')}
                                                    </span>
                                                </button>
                                                
                                                {/* Stamp overlay */}
                                                <div className="absolute top-2 right-2 w-10 h-10 border-[2px] border-amber-500/90 rounded-full flex items-center justify-center rotate-[15deg] bg-amber-950/60 backdrop-blur-md shadow-md pointer-events-none">
                                                    <span className="text-amber-500 text-[10px] font-black uppercase whitespace-nowrap -rotate-[15deg]">{t('profile.lbl_visited', 'VISITED')}</span>
                                                </div>

                                                <div className="absolute bottom-0 left-0 w-full p-3 pointer-events-none">
                                                    <h4 className="text-[13px] font-black text-espresso-50 leading-tight drop-shadow-md truncate">{store?.name}</h4>
                                                    <p className="text-[10px] font-medium text-espresso-200 truncate mt-0.5">{store?.address}</p>
                                                    <p className="text-[9px] font-mono font-bold text-amber-500 mt-1 opacity-80">{new Date(checkin.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="px-6 py-10 relative z-10 flex flex-col items-center justify-center text-center bg-espresso-950/20">
                                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-espresso-700 flex items-center justify-center mb-4 bg-espresso-900">
                                        <MapPin className="text-espresso-400" size={24} />
                                    </div>
                                    <p className="text-sm text-espresso-100 font-bold mb-1">{t('profile.msg_empty_passport')}</p>
                                    <p className="text-xs text-espresso-300 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: t('profile.desc_empty_passport') }}></p>
                                    <button onClick={() => navigate('/map')} className="mt-4 px-5 py-2 bg-espresso-800 hover:bg-espresso-700 focus:outline-none text-amber-500 text-xs font-bold rounded-full transition-colors font-mono tracking-wider">
                                        {t('profile.btn_explore_map')}
                                    </button>
                                </div>
                            )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </section>
                    )}

                    {/* MAGAZINE AD INJECTION */}
                    {isAuthenticated && magazineAd && (
                        <MagazineAd adData={magazineAd.ad || magazineAd} />
                    )}

                    {/* PILGRIMAGE COURSES */}
                    {isAuthenticated && (
                        <section className="bg-[#121215] rounded-[2rem] border border-espresso-700 overflow-hidden relative shadow-2xl mt-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none"></div>
                            
                            <div className="px-6 py-5 relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="text-xl font-serif font-black text-amber-400 tracking-tight flex items-center gap-2">
                                            <Globe size={20} className="opacity-80" /> {t('profile.title_my_courses')}
                                        </h3>
                                        <p className="text-xs text-espresso-200 mt-1 font-medium">{t('profile.desc_my_courses')}</p>
                                    </div>
                                    <div className="bg-espresso-800/50 px-3 py-1 rounded-full border border-espresso-700">
                                        <span className="text-espresso-200 font-mono text-sm font-bold">{myCourses.length}</span>
                                    </div>
                                </div>
                                {/*
                                <button
                                    onClick={() => navigate('/profile/tour-wizard')}
                                    className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold text-[14px] rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <span style={{ fontSize: '16px' }}>✨</span> {t('profile.btn_ai_tour_generator', 'AI 성지순례 투어 코스 자동 생성기')}
                                </button>
                                */}
                            </div>

                            {myCourses.length > 0 ? (
                                <div className="px-6 pb-6 overflow-x-auto hide-scrollbar flex gap-4 snap-x snap-mandatory relative z-10">
                                    {myCourses.map((course, idx) => {
                                        let rawImageUrl = course.coverImageUrl || course.items?.[0]?.store?.mainImageUrl || 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=600&auto=format&fit=crop';
                                        if (rawImageUrl.includes('/uploads/')) {
                                            rawImageUrl = `${API_BASE}${rawImageUrl.substring(rawImageUrl.indexOf('/uploads/'))}`;
                                        } else if (!rawImageUrl.startsWith('http')) {
                                            rawImageUrl = `${API_BASE}${rawImageUrl}`;
                                        }
                                        const coverImage = rawImageUrl;
                                        const validItemCount = course.placesCount ?? (course._count?.items || 0);
                                        
                                        return (
                                            <div 
                                                key={course.id || idx}
                                                className="shrink-0 w-56 h-64 snap-center bg-espresso-950 rounded-[1.5rem] flex flex-col shadow-xl cursor-pointer active:scale-95 transition-transform border border-espresso-700 relative overflow-hidden group"
                                                onClick={() => navigate(`/course/${course.id}`)}
                                            >
                                                <div className="h-32 w-full relative overflow-hidden">
                                                    <img src={coverImage} alt={course.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-espresso-950 to-transparent"></div>
                                                    {course.isPublic ? (
                                                        <div 
                                                            onClick={(e) => handleToggleCoursePublic(e, course.id, course.isPublic)}
                                                            className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-400 text-espresso-950 text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm transition-colors cursor-pointer flex items-center gap-1 z-10"
                                                        >
                                                            <Globe size={10} /> PUBLIC
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            onClick={(e) => handleToggleCoursePublic(e, course.id, course.isPublic)}
                                                            className="absolute top-3 right-3 bg-espresso-800 hover:bg-espresso-700 text-espresso-300 text-[10px] items-center flex gap-1 font-black uppercase px-2 py-0.5 rounded shadow-sm border border-espresso-700 transition-colors cursor-pointer z-10"
                                                        >
                                                            <Lock size={10} /> PRIVATE
                                                        </div>
                                                    )}
                                                    {/* Actions */}
                                                    <div className="absolute bottom-3 right-3 flex gap-2 z-10">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setUploadingCourseId(course.id);
                                                                if (courseImageInputRef.current) courseImageInputRef.current.click();
                                                            }}
                                                            className="p-2 w-8 h-8 flex items-center justify-center bg-espresso-950/80 hover:bg-amber-900/80 rounded-full text-amber-500 backdrop-blur-sm border border-amber-900/50 shadow-lg transition-transform active:scale-95"
                                                        >
                                                            <ImageIcon size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDeleteCourse(e, course.id)}
                                                            className="p-2 w-8 h-8 flex items-center justify-center bg-espresso-950/80 hover:bg-red-900/80 rounded-full text-red-500 backdrop-blur-sm border border-red-900/50 shadow-lg transition-transform active:scale-95"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleShareCourse(e, course)}
                                                            className="p-2 w-8 h-8 flex items-center justify-center bg-espresso-950/80 hover:bg-espresso-800 rounded-full text-amber-500 backdrop-blur-sm border border-espresso-700 shadow-lg transition-transform active:scale-95"
                                                        >
                                                            <Share2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex-1 p-4 flex flex-col justify-between">
                                                    <div>
                                                        <h4 className="text-[14px] font-black text-espresso-50 leading-tight line-clamp-2 mb-1">{course.name}</h4>
                                                        {course.description && (
                                                            <p className="text-[11px] text-espresso-300 line-clamp-2">{course.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] text-amber-500 font-bold border-t border-espresso-700 pt-2">
                                                        <span>{t('profile.lbl_places', { count: validItemCount, defaultValue: '{{count}} Places' })}</span>
                                                        <ChevronRight size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="px-6 py-10 relative z-10 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-espresso-700 flex items-center justify-center mb-4 bg-espresso-950/50">
                                        <Globe className="text-espresso-500" size={24} />
                                    </div>
                                    <p className="text-sm text-espresso-100 font-bold mb-1">{t('profile.msg_no_courses')}</p>
                                    <p className="text-xs text-espresso-300 font-medium leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: t('profile.desc_no_courses') }}></p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* User History Menu */}
                    <section className="bg-espresso-900 rounded-2xl border border-espresso-700 overflow-hidden divide-y divide-espresso-700">
                        <button onClick={() => isAuthenticated ? navigate('/profile/activity') : setIsLoginModalOpen(true)} className="w-full px-5 py-4 flex items-center justify-between active:bg-espresso-950 transition-colors">
                            <span className="font-bold text-[15px] text-espresso-50">{t('profile.menu_activity', '내 활동 내역')}</span>
                            <ChevronRight size={18} className="text-espresso-300" />
                        </button>
                        <button onClick={() => isAuthenticated ? navigate('/profile/prescriptions') : setIsLoginModalOpen(true)} className="w-full px-5 py-4 flex items-center justify-between active:bg-espresso-950 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-[15px] text-espresso-50">{t('profile.menu_history')}</span>
                                <span className="text-[11px] bg-espresso-800 text-espresso-200 px-2 py-0.5 rounded-md font-medium border border-espresso-600">{t('profile.btn_view_all')}</span>
                            </div>
                            <ChevronRight size={18} className="text-espresso-300" />
                        </button>
                        <button onClick={() => isAuthenticated ? navigate('/profile/bookmarks') : setIsLoginModalOpen(true)} className="w-full px-5 py-4 flex items-center justify-between active:bg-espresso-950 transition-colors">
                            <span className="font-bold text-[15px] text-espresso-50">{t('profile.menu_saved_shops')}</span>
                            <ChevronRight size={18} className="text-espresso-300" />
                        </button>
                        <button onClick={() => isAuthenticated ? navigate('/profile/bookmarked-posts') : setIsLoginModalOpen(true)} className="w-full px-5 py-4 flex items-center justify-between active:bg-espresso-950 transition-colors">
                            <span className="font-bold text-[15px] text-espresso-50">{t('profile.menu_my_collection', '나의 컬렉션')}</span>
                            <ChevronRight size={18} className="text-espresso-300" />
                        </button>




                    </section>
                    



                    
                    {/* Spacer to push account settings down */}
                    <div className="flex-1"></div>

                    {/* Account Settings (Delete Account) */}
                    {isAuthenticated && (
                        <section className="pt-4 pb-6 px-1 space-y-2">
                            <button onClick={handleDeleteAccount} className="w-full mt-2 text-center py-4 text-[13px] font-bold text-espresso-300 hover:text-red-500 transition-colors bg-espresso-900/50 rounded-xl hover:bg-espresso-900 border border-transparent hover:border-red-900/30">
                                {t('profile.btn_delete_account', '회원탈퇴 및 데이터 삭제')}
                            </button>
                        </section>
                    )}

                </div>
            </div>

            {/* 🎫 User Stamp QR Code Modal */}
            <AnimatePresence>
                {isStampModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => {
                                setIsStampModalOpen(false);
                                fetchStampData();
                            }}
                            className="fixed inset-0 bg-espresso-950/80 backdrop-blur-sm z-[110]"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-gradient-to-br from-espresso-900 to-[#1b120c] rounded-3xl border border-amber-900/40 p-6 z-[120] text-center shadow-2xl space-y-6"
                        >
                            <div>
                                <h3 className="font-serif font-black text-xl text-amber-500">{t('profile.qr_modal_title', '단골 적립용 QR')}</h3>
                                <p className="text-xs text-espresso-200 mt-1">{t('profile.qr_modal_desc', '매장 점주에게 이 QR 코드를 보여주세요.')}</p>
                            </div>

                            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto border-2 border-amber-500/20">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUser.id)}&color=0f172a`} 
                                    alt="User Stamp QR" 
                                    className="w-48 h-48 mx-auto"
                                
                                />
                            </div>

                            <div className="space-y-1 bg-espresso-950/60 py-3 px-4 rounded-2xl border border-espresso-800">
                                <span className="text-xs text-espresso-300 font-bold">{t('profile.qr_modal_unique_code', '고유 식별코드')}</span>
                                <p className="font-mono text-xs font-black text-amber-400 select-all truncate">{currentUser.id}</p>
                            </div>

                            <button 
                                onClick={() => {
                                    setIsStampModalOpen(false);
                                    fetchStampData();
                                }}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-espresso-950 font-black text-[14px] rounded-xl active:scale-95 transition-all shadow-md cursor-pointer"
                            >
                                {t('profile.btn_close', '닫기')}
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* 🎫 User Coupon QR Code Modal */}
            <AnimatePresence>
                {isCouponQRModalOpen && currentCouponForQR && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => {
                                setIsCouponQRModalOpen(false);
                                fetchStampData();
                            }}
                            className="fixed inset-0 bg-espresso-950/80 backdrop-blur-sm z-[110]"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-gradient-to-br from-espresso-900 to-[#1b120c] rounded-3xl border border-amber-900/40 p-6 z-[120] text-center shadow-2xl space-y-6"
                        >
                            <div>
                                <span className="bg-amber-500 text-espresso-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">COUPON</span>
                                <h3 className="font-serif font-black text-lg text-espresso-50 mt-2">{currentCouponForQR.storeName}</h3>
                                <p className="text-[11px] text-amber-400 font-bold mt-0.5">{t('profile.coupon_qr_modal_subtitle', '무료 쿠폰 사용하기')}</p>
                                <p className="text-xs text-espresso-200 mt-1 break-keep">{t('profile.coupon_qr_modal_desc', '매장 직원에게 제시하여 혜택을 받으세요.')}</p>
                            </div>

                            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto border-2 border-amber-500/20">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentCouponForQR.id)}&color=0f172a`} 
                                    alt="Coupon QR" 
                                    className="w-48 h-48 mx-auto"
                                />
                            </div>

                            <div className="space-y-1 bg-espresso-950/60 py-3 px-4 rounded-2xl border border-espresso-800">
                                <span className="text-xs text-espresso-300 font-bold">{t('profile.lbl_coupon_code', '쿠폰 코드')}</span>
                                <p className="font-mono text-xs font-black text-amber-400 select-all">{currentCouponForQR.couponCode}</p>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={async () => {
                                        // 수동 모바일 사용 처리 지원
                                        if (window.confirm(t('profile.confirm_manual_use', '쿠폰을 지금 사용 처리하시겠습니까?'))) {
                                            try {
                                                const token = localStorage.getItem('token');
                                                const res = await fetch(`${API_BASE}/api/stamps/coupons/${currentCouponForQR.id}/use`, {
                                                    method: 'POST',
                                                    headers: { 'Authorization': `Bearer ${token}` }
                                                });
                                                if (res.ok) {
                                                    alert(t('profile.alert_use_success', '쿠폰 사용이 완료되었습니다! 🎉'));
                                                    setIsCouponQRModalOpen(false);
                                                    fetchStampData();
                                                } else {
                                                    const err = await res.json();
                                                    alert(err.message || t('profile.alert_use_fail', '쿠폰 사용에 실패했습니다.'));
                                                }
                                            } catch (err) {
                                                alert(t('profile.alert_use_error', '오류가 발생했습니다.'));
                                            }
                                        }
                                    }}
                                    className="flex-1 py-3 bg-[#1e1e21] border border-amber-500/50 text-amber-500 font-black text-[14px] rounded-xl active:scale-95 transition-all cursor-pointer"
                                >
                                    {t('profile.btn_manual_use', '수동 사용하기')}
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsCouponQRModalOpen(false);
                                        fetchStampData();
                                    }}
                                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-espresso-950 font-black text-[14px] rounded-xl active:scale-95 transition-all cursor-pointer"
                                >
                                    {t('profile.btn_close', '닫기')}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* 🎫 Host QR Stamp Scanner Modal */}
            <AnimatePresence>
                {isHostScannerOpen && (
                    <HostQRScannerModal 
                        isOpen={isHostScannerOpen} 
                        onClose={() => {
                            setIsHostScannerOpen(false);
                            fetchStampData(); // 스캔 완료 후 유저 데이터 갱신 지원
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Login Modal */}
            <AnimatePresence>
                {isLoginModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsLoginModalOpen(false)}
                            className="fixed inset-0 bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50/40 backdrop-blur-sm z-[110]"
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed bottom-0 left-0 w-full bg-espresso-900 rounded-t-[2rem] z-[120] p-6 pb-safe flex flex-col max-h-[90vh] overflow-y-auto hide-scrollbar"
                        >
                            <div className="w-12 h-1.5 bg-espresso-700 rounded-full mx-auto mb-6 shrink-0" />

                            {authView === 'login' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-espresso-950 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-espresso-700">
                                            <ShieldCheck size={28} />
                                        </div>
                                        <h3 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.modal_welcome')}</h3>
                                        <p className="text-sm text-espresso-200 mt-2">{t('profile.modal_welcome_desc')}</p>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        {/* Social Placeholder Buttons */}
                                        <div className="w-full flex flex-col gap-3 py-2">
                                            <button
                                                onClick={() => handleGoogleLogin()}
                                                disabled={isLoading}
                                                className="w-full bg-espresso-900 text-espresso-50 h-14 rounded-2xl border border-transparent shadow-sm flex items-center justify-center gap-3 font-bold text-[15px] active:scale-95 transition-transform disabled:opacity-50"
                                            >
                                                <svg viewBox="0 0 24 24" className="w-5 h-5">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                                {t('profile.google_start')}
                                            </button>
                                            
                                            <button
                                                onClick={() => handleAppleLogin()}
                                                disabled={isLoading}
                                                className="w-full bg-white text-black h-14 rounded-2xl border border-transparent shadow-sm flex items-center justify-center gap-3 font-bold text-[15px] active:scale-95 transition-transform disabled:opacity-50"
                                            >
                                                <svg viewBox="0 0 384 512" className="w-5 h-5" fill="black">
                                                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                                                </svg>
                                                {t('profile.btn_apple_login', 'Continue with Apple')}
                                            </button>

                                            <button
                                                onClick={() => handleNaverLogin()}
                                                disabled={isLoading}
                                                className="w-full bg-[#03C75A] text-white h-14 rounded-2xl border border-transparent shadow-sm flex items-center justify-center gap-3 font-bold text-[15px] active:scale-95 transition-transform disabled:opacity-50"
                                            >
                                                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                                                    <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
                                                </svg>
                                                {t('profile.btn_naver_login', 'Continue with Naver')}
                                            </button>
                                        </div>
                                        <div className="relative py-4 flex items-center">
                                            <div className="flex-grow border-t border-espresso-700"></div>
                                            <span className="shrink-0 mx-4 text-espresso-300 text-xs font-bold uppercase">{t('profile.or_email')}</span>
                                            <div className="flex-grow border-t border-espresso-700"></div>
                                        </div>

                                        {/* Email Form */}
                                        <div className="bg-espresso-950 p-2 rounded-2xl space-y-2 border border-espresso-700">
                                            <div className="relative">
                                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_email')} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300" />
                                            </div>
                                            <div className="relative">
                                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_password')} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300" />
                                            </div>
                                        </div>

                                        {authError && <div className="text-red-500 text-sm font-medium px-2">{authError.startsWith('ERR_') ? t('api_error.' + authError, authError) : authError}</div>}

                                        <button
                                            onClick={handleLogin}
                                            disabled={isLoading}
                                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#09090B] h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 mt-2 active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 disabled:opacity-70"
                                        >
                                            {isLoading ? t('profile.status_processing') : t('profile.btn_login_email')}
                                        </button>

                                        <div className="flex justify-center flex-wrap gap-4 mt-6 text-[13px] font-medium text-espresso-200">
                                            <button onClick={() => { setAuthError(''); setAuthView('register'); }} className="hover:text-espresso-50 transition-colors">{t('profile.nav_email_reg')}</button>
                                            <span className="text-coffee-200">|</span>
                                            <button onClick={() => { setAuthError(''); setAuthView('verify_request'); }} className="hover:text-espresso-50 transition-colors">{t('profile.nav_email_verify')}</button>
                                            <span className="text-coffee-200">|</span>
                                            <button onClick={() => { setAuthError(''); setAuthView('find_id'); }} className="hover:text-espresso-50 transition-colors">{t('profile.nav_find_id')}</button>
                                            <span className="text-coffee-200">|</span>
                                            <button onClick={() => { setAuthError(''); setAuthView('find_pw'); }} className="hover:text-espresso-50 transition-colors">{t('profile.nav_find_pw')}</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {authView === 'verify_request' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-8 pt-4">
                                        <h3 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.verify_title')}</h3>
                                        <p className="text-sm text-espresso-200 mt-2 break-keep">
                                            {t('profile.verify_desc_req').split('\n').map((line, i) => (
                                                <React.Fragment key={i}>{line}<br/></React.Fragment>
                                            ))}
                                        </p>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div className="bg-espresso-950 p-2 rounded-2xl border border-espresso-700">
                                            <div className="relative">
                                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                                                    placeholder={t('profile.ph_email')}
                                                    className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300"
                                                />
                                            </div>
                                        </div>

                                        {authError && <div className="text-red-500 text-sm font-medium px-2">{authError.startsWith('ERR_') ? t('api_error.' + authError, authError) : authError}</div>}

                                        <button
                                            onClick={handleVerifyRequest}
                                            disabled={isLoading}
                                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#09090B] h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 mt-2 active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 disabled:opacity-70"
                                        >
                                            {isLoading ? t('profile.status_processing') : t('profile.btn_send_code')}
                                        </button>
                                    </div>
                                    <button onClick={() => { setAuthError(''); setAuthView('login'); }} className="absolute top-4 left-4 p-2 text-espresso-300 hover:text-espresso-50">
                                        &larr; {t('profile.go_back')}
                                    </button>
                                </div>
                            )}

                            {authView === 'verify' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 bg-espresso-950 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-espresso-700">
                                            <Mail size={28} />
                                        </div>
                                        <h3 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.verify_title')}</h3>
                                        <p className="text-sm text-espresso-200 mt-2">
                                            <span className="font-bold text-espresso-200">{email || 'Email'}</span> 
                                            {t('profile.verify_desc_sent').split('\n').map((line, i) => (
                                                <React.Fragment key={i}>{line}<br/></React.Fragment>
                                            ))}
                                        </p>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="bg-espresso-950 p-2 rounded-2xl border border-espresso-700">
                                            <div className="relative">
                                                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input
                                                    type="text"
                                                    value={verificationCode}
                                                    onChange={e => setVerificationCode(e.target.value)}
                                                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                                                    placeholder={t('profile.ph_verify_code')}
                                                    className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none font-bold tracking-[0.2em] placeholder:tracking-normal"
                                                    maxLength={6}
                                                />
                                            </div>
                                        </div>

                                        {authError && <div className="text-red-500 text-sm font-medium px-2 text-center">{authError.startsWith('ERR_') ? t('api_error.' + authError, authError) : authError}</div>}

                                        <button
                                            onClick={handleVerifyEmail}
                                            disabled={isLoading}
                                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#09090B] h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 mt-2 active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 disabled:opacity-70"
                                        >
                                            {isLoading ? t('profile.status_processing') : t('profile.btn_verify_complete')}
                                        </button>

                                        <div className="flex justify-center flex-wrap gap-4 mt-6 text-[13px] font-medium text-espresso-200">
                                            <span className="text-espresso-300">{t('profile.resend_q')}</span>
                                            <button onClick={handleResendCode} className="font-bold text-espresso-50 border-b border-coffee-700 pb-0.5">{t('profile.btn_resend')}</button>
                                        </div>
                                    </div>
                                    <button onClick={() => { setAuthError(''); setAuthView('login'); }} className="absolute top-4 left-4 p-2 text-espresso-300 hover:text-espresso-50">
                                        &larr; {t('profile.go_back')}
                                    </button>
                                </div>
                            )}

                            {authView === 'register' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.reg_title')}</h3>
                                        <p className="text-sm text-espresso-200 mt-2">{t('profile.reg_desc')}</p>
                                    </div>
                                    <div className="space-y-4 mb-6">
                                        {/* Role Selection */}
                                        <div className="flex bg-espresso-950 border border-espresso-700 rounded-2xl p-1 mb-2 shadow-inner">
                                            <button
                                                onClick={() => setRole('USER')}
                                                className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all ${role === 'USER' ? 'bg-amber-600 text-white shadow-md' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/30'}`}
                                            >
                                                {t('profile.role_user')}
                                            </button>
                                            <button
                                                onClick={() => setRole('OWNER')}
                                                className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all ${role === 'OWNER' ? 'bg-amber-600 text-white shadow-md' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/30'}`}
                                            >
                                                {t('profile.role_owner')}
                                            </button>
                                        </div>

                                        <div className="bg-espresso-950 p-2 rounded-2xl space-y-2 border border-espresso-700">
                                            <div className="relative">
                                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_nickname')} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300" />
                                            </div>
                                            <div className="relative">
                                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_email')} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300" />
                                            </div>
                                            <div>
                                                <div className="relative">
                                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_password')} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300" />
                                                </div>
                                                <p className="text-[11px] text-amber-500/90 pl-3 mt-1.5 mb-1 font-medium tracking-tight">
                                                    {t('profile.password_policy')}
                                                </p>
                                            </div>
                                            <div className="relative">
                                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_pw_confirm')} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300" />
                                            </div>
                                        </div>

                                        <div className="bg-espresso-950 p-2 rounded-2xl space-y-2 border border-espresso-700">
                                            <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100">
                                                <option value="" disabled>{t('profile.ph_age')}</option>
                                                <option value="10대 이하">{t('profile.age_10s')}</option>
                                                <option value="20대">{t('profile.age_20s')}</option>
                                                <option value="30대">{t('profile.age_30s')}</option>
                                                <option value="40대">{t('profile.age_40s')}</option>
                                                <option value="50대">{t('profile.age_50s')}</option>
                                                <option value="60대 이상">{t('profile.age_60s')}</option>
                                            </select>
                                            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100">
                                                <option value="" disabled>{t('profile.ph_gender')}</option>
                                                <option value="남성">{t('profile.gender_m')}</option>
                                                <option value="여성">{t('profile.gender_f')}</option>
                                                <option value="선택 안함">{t('profile.gender_n')}</option>
                                            </select>
                                            <select value={favoriteCafe} onChange={e => setFavoriteCafe(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100">
                                                <option value="" disabled>{t('profile.ph_fav_cafe')}</option>
                                                <option value="스타벅스">{t('profile.cafe_starbucks')}</option>
                                                <option value="블루보틀">{t('profile.cafe_bluebottle')}</option>
                                                <option value="폴바셋">{t('profile.cafe_paulbassett')}</option>
                                                <option value="동네 로스터리">{t('profile.cafe_roastery')}</option>
                                            </select>
                                        </div>

                                        {authError && <div className="text-red-500 text-sm font-medium px-2">{authError.startsWith('ERR_') ? t('api_error.' + authError, authError) : authError}</div>}

                                        <button
                                            onClick={handleRegister}
                                            disabled={isLoading}
                                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#09090B] h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 mt-4 active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 disabled:opacity-70"
                                        >
                                            {isLoading ? t('profile.status_processing') : t('profile.btn_reg_complete')}
                                        </button>
                                        <div className="text-center mt-4 pt-2">
                                            <button onClick={() => { setAuthError(''); setAuthView('login'); }} className="text-[13px] font-medium text-espresso-200 hover:text-espresso-50 underline underline-offset-4">{t('profile.go_login')}</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {authView === 'google_register' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-8">
                                        <h3 className="text-xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.extra_info_title')}</h3>
                                        <p className="text-sm text-espresso-200 mt-2">{t('profile.extra_info_desc')}</p>
                                    </div>
                                    <div className="space-y-4 mb-6">
                                        {/* Role Selection */}
                                        <div className="flex bg-espresso-950 border border-espresso-700 rounded-2xl p-1 mb-2 shadow-inner">
                                            <button
                                                onClick={() => setRole('USER')}
                                                className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all ${role === 'USER' ? 'bg-amber-600 text-white shadow-md' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/30'}`}
                                            >
                                                {t('profile.role_user')}
                                            </button>
                                            <button
                                                onClick={() => setRole('OWNER')}
                                                className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all ${role === 'OWNER' ? 'bg-amber-600 text-white shadow-md' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/30'}`}
                                            >
                                                {t('profile.role_owner')}
                                            </button>
                                        </div>

                                        <div className="bg-espresso-950 p-2 rounded-2xl space-y-2 border border-espresso-700">
                                            <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100">
                                                <option value="" disabled>{t('profile.ph_age')}</option>
                                                <option value="10대 이하">{t('profile.age_10s')}</option>
                                                <option value="20대">{t('profile.age_20s')}</option>
                                                <option value="30대">{t('profile.age_30s')}</option>
                                                <option value="40대">{t('profile.age_40s')}</option>
                                                <option value="50대">{t('profile.age_50s')}</option>
                                                <option value="60대 이상">{t('profile.age_60s')}</option>
                                            </select>
                                            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100">
                                                <option value="" disabled>{t('profile.ph_gender')}</option>
                                                <option value="남성">{t('profile.gender_m')}</option>
                                                <option value="여성">{t('profile.gender_f')}</option>
                                                <option value="선택 안함">{t('profile.gender_n')}</option>
                                            </select>
                                            <select value={favoriteCafe} onChange={e => setFavoriteCafe(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100">
                                                <option value="" disabled>{t('profile.ph_fav_cafe')}</option>
                                                <option value="스타벅스">{t('profile.cafe_starbucks')}</option>
                                                <option value="블루보틀">{t('profile.cafe_bluebottle')}</option>
                                                <option value="폴바셋">{t('profile.cafe_paulbassett')}</option>
                                                <option value="동네 로스터리">{t('profile.cafe_roastery')}</option>
                                            </select>
                                        </div>

                                        {authError && <div className="text-red-500 text-sm font-medium px-2 text-center">{authError.startsWith('ERR_') ? t('api_error.' + authError, authError) : authError}</div>}

                                        <button
                                            onClick={handleGoogleRegisterSubmit}
                                            disabled={isLoading}
                                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#09090B] h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 mt-4 active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 disabled:opacity-70"
                                        >
                                            {isLoading ? t('profile.status_processing') : t('profile.btn_reg_complete')}
                                        </button>
                                    </div>
                                    <button onClick={() => { setAuthError(''); setAuthView('login'); }} className="absolute top-4 left-4 p-2 text-espresso-300 hover:text-espresso-50">
                                        &larr; {t('profile.go_back')}
                                    </button>
                                </div>
                            )}

                            {authView === 'apple_register' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-8">
                                        <h3 className="text-xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.extra_info_title')}</h3>
                                        <p className="text-sm text-espresso-200 mt-2">{t('profile.extra_info_desc')}</p>
                                    </div>
                                    <div className="space-y-4 mb-6">
                                        {/* Role Selection */}
                                        <div className="flex bg-espresso-950 border border-espresso-700 rounded-2xl p-1 mb-2 shadow-inner">
                                            <button
                                                onClick={() => setRole('USER')}
                                                className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all ${role === 'USER' ? 'bg-amber-600 text-white shadow-md' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/30'}`}
                                            >
                                                {t('profile.role_user')}
                                            </button>
                                            <button
                                                onClick={() => setRole('OWNER')}
                                                className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all ${role === 'OWNER' ? 'bg-amber-600 text-white shadow-md' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/30'}`}
                                            >
                                                {t('profile.role_owner')}
                                            </button>
                                        </div>

                                        <div className="bg-espresso-950 p-2 rounded-2xl space-y-2 border border-espresso-700">
                                            <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100">
                                                <option value="" disabled>{t('profile.ph_age')}</option>
                                                <option value="10대 이하">{t('profile.age_10s')}</option>
                                                <option value="20대">{t('profile.age_20s')}</option>
                                                <option value="30대">{t('profile.age_30s')}</option>
                                                <option value="40대">{t('profile.age_40s')}</option>
                                                <option value="50대">{t('profile.age_50s')}</option>
                                                <option value="60대 이상">{t('profile.age_60s')}</option>
                                            </select>
                                            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100">
                                                <option value="" disabled>{t('profile.ph_gender')}</option>
                                                <option value="남성">{t('profile.gender_m')}</option>
                                                <option value="여성">{t('profile.gender_f')}</option>
                                                <option value="선택 안함">{t('profile.gender_n')}</option>
                                            </select>
                                            <select value={favoriteCafe} onChange={e => setFavoriteCafe(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100">
                                                <option value="" disabled>{t('profile.ph_fav_cafe')}</option>
                                                <option value="스타벅스">{t('profile.cafe_starbucks')}</option>
                                                <option value="블루보틀">{t('profile.cafe_bluebottle')}</option>
                                                <option value="폴바셋">{t('profile.cafe_paulbassett')}</option>
                                                <option value="동네 로스터리">{t('profile.cafe_roastery')}</option>
                                            </select>
                                        </div>

                                        {authError && <div className="text-red-500 text-sm font-medium px-2 text-center">{authError.startsWith('ERR_') ? t('api_error.' + authError, authError) : authError}</div>}

                                        <button
                                            onClick={handleAppleRegisterSubmit}
                                            disabled={isLoading}
                                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#09090B] h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 mt-4 active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 disabled:opacity-70"
                                        >
                                            {isLoading ? t('profile.status_processing') : t('profile.btn_reg_complete')}
                                        </button>
                                    </div>
                                    <button onClick={() => { setAuthError(''); setAuthView('login'); }} className="absolute top-4 left-4 p-2 text-espresso-300 hover:text-espresso-50">
                                        &larr; {t('profile.go_back')}
                                    </button>
                                </div>
                            )}

                            {authView === 'naver_register' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-8">
                                        <h3 className="text-xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.extra_info_title')}</h3>
                                        <p className="text-sm text-espresso-200 mt-2">{t('profile.extra_info_desc')}</p>
                                    </div>
                                    <div className="space-y-4 mb-6">
                                        {/* Role Selection */}
                                        <div className="flex bg-espresso-950 border border-espresso-700 rounded-2xl p-1 mb-2 shadow-inner">
                                            <button
                                                onClick={() => setRole('USER')}
                                                className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all ${role === 'USER' ? 'bg-amber-600 text-white shadow-md' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/30'}`}
                                            >
                                                {t('profile.role_user')}
                                            </button>
                                            <button
                                                onClick={() => setRole('OWNER')}
                                                className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all ${role === 'OWNER' ? 'bg-amber-600 text-white shadow-md' : 'text-espresso-300 hover:text-espresso-100 hover:bg-espresso-900/30'}`}
                                            >
                                                {t('profile.role_owner')}
                                            </button>
                                        </div>

                                        <div className="bg-espresso-950 p-2 rounded-2xl space-y-2 border border-espresso-700">
                                            <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100 mb-2">
                                                <option value="" disabled>{t('profile.ph_age')}</option>
                                                <option value="10s">{t('profile.age_10s')}</option>
                                                <option value="20s">{t('profile.age_20s')}</option>
                                                <option value="30s">{t('profile.age_30s')}</option>
                                                <option value="40s">{t('profile.age_40s')}</option>
                                                <option value="50s">{t('profile.age_50s')}</option>
                                                <option value="60s+">{t('profile.age_60s')}</option>
                                            </select>
                                            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100 mb-2">
                                                <option value="" disabled>{t('profile.ph_gender')}</option>
                                                <option value="MALE">{t('profile.gender_m')}</option>
                                                <option value="FEMALE">{t('profile.gender_f')}</option>
                                                <option value="선택 안함">{t('profile.gender_n')}</option>
                                            </select>
                                            <select value={favoriteCafe} onChange={e => setFavoriteCafe(e.target.value)} className="w-full bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 outline-none text-[15px] font-medium text-espresso-100">
                                                <option value="" disabled>{t('profile.ph_fav_cafe')}</option>
                                                <option value="스타벅스">{t('profile.cafe_starbucks')}</option>
                                                <option value="블루보틀">{t('profile.cafe_bluebottle')}</option>
                                                <option value="폴바셋">{t('profile.cafe_paulbassett')}</option>
                                                <option value="동네 로스터리">{t('profile.cafe_roastery')}</option>
                                            </select>
                                        </div>

                                        {authError && <div className="text-red-500 text-sm font-medium px-2 text-center">{authError.startsWith('ERR_') ? t('api_error.' + authError, authError) : authError}</div>}

                                        <button
                                            onClick={handleNaverRegisterSubmit}
                                            disabled={isLoading}
                                            className="w-full bg-[#03C75A] drop-shadow-md shadow-[#03C75A]/20 border border-[#03C75A]/50 text-white h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 mt-4 active:scale-95 transition-transform shadow-lg shadow-[#03C75A]/20 disabled:opacity-70"
                                        >
                                            {isLoading ? t('profile.status_processing') : t('profile.btn_reg_complete')}
                                        </button>
                                    </div>
                                    <button onClick={() => { setAuthError(''); setAuthView('login'); }} className="absolute top-4 left-4 p-2 text-espresso-300 hover:text-espresso-50">
                                        &larr; {t('profile.go_back')}
                                    </button>
                                </div>
                            )}

                            {authView === 'find_id' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-6 pt-4">
                                        <h3 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.find_id_title')}</h3>
                                        <p className="text-sm text-espresso-200 mt-2 break-keep">{t('profile.find_id_desc')}</p>
                                    </div>
                                    <div className="space-y-4 mb-6">
                                        <div className="bg-espresso-950 p-2 rounded-2xl border border-espresso-700">
                                            <div className="relative">
                                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_nickname')} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300" />
                                            </div>
                                        </div>

                                        {authError && <div className="text-red-500 text-sm font-medium px-2">{authError.startsWith('ERR_') ? t('api_error.' + authError, authError) : authError}</div>}

                                        <button onClick={handleFindId} disabled={isLoading} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#09090B] h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 disabled:opacity-70">
                                            {isLoading ? t('profile.status_processing') : t('profile.btn_find_id')}
                                        </button>
                                        <div className="text-center mt-4 pt-2">
                                            <button onClick={() => { setAuthError(''); setAuthView('login'); }} className="text-[13px] font-medium text-espresso-200 hover:text-espresso-50 underline underline-offset-4">{t('profile.go_login_back')}</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {authView === 'find_pw' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-6 pt-4">
                                        <h3 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.find_pw_title')}</h3>
                                        <p className="text-sm text-espresso-200 mt-2 break-keep">
                                            {t('profile.find_pw_desc').split('\n').map((line, i) => (
                                                <React.Fragment key={i}>{line}<br/></React.Fragment>
                                            ))}
                                        </p>
                                    </div>
                                    <div className="space-y-4 mb-6">
                                        <div className="bg-espresso-950 p-2 rounded-2xl border border-espresso-700">
                                            <div className="relative">
                                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_email')} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300" />
                                            </div>
                                        </div>

                                        {authError && <div className="text-red-500 text-sm font-medium px-2">{authError.startsWith('ERR_') ? t('api_error.' + authError, authError) : authError}</div>}

                                        <button onClick={handleResetPwRequest} disabled={isLoading} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#09090B] h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 disabled:opacity-70">
                                            {isLoading ? t('profile.status_processing') : t('profile.btn_send_code')}
                                        </button>
                                        <div className="text-center mt-4 pt-2">
                                            <button onClick={() => { setAuthError(''); setAuthView('login'); }} className="text-[13px] font-medium text-espresso-200 hover:text-espresso-50 underline underline-offset-4">{t('profile.go_login_back')}</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {authView === 'reset_pw' && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-6 pt-4">
                                        <h3 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">{t('profile.reset_pw_title')}</h3>
                                        <p className="text-sm text-espresso-200 mt-2 break-keep">
                                            {t('profile.reset_pw_desc').split('\n').map((line, i) => (
                                                <React.Fragment key={i}>{line}<br/></React.Fragment>
                                            ))}
                                        </p>
                                    </div>
                                    <div className="space-y-4 mb-6">
                                        <div className="bg-espresso-950 p-2 rounded-2xl space-y-2 border border-espresso-700">
                                            <div className="relative">
                                                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_verify_code')} maxLength={6} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold tracking-[0.2em] placeholder:tracking-normal placeholder:font-normal placeholder:text-espresso-300" />
                                            </div>
                                            <div>
                                                <div className="relative">
                                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_new_pw')} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300" />
                                                </div>
                                                <p className="text-[11px] text-amber-500/90 pl-3 mt-1.5 mb-1 font-medium tracking-tight">
                                                    {t('profile.password_policy')}
                                                </p>
                                            </div>
                                            <div className="relative">
                                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-300" />
                                                <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)} placeholder={t('profile.ph_new_pw_confirm')} className="w-full pl-12 bg-espresso-900 border-espresso-600 text-espresso-50 placeholder:text-espresso-300 focus:ring-2 focus:ring-amber-600/60 focus:border-amber-600/60 outline-none text-[15px] font-bold text-espresso-50 placeholder:font-normal placeholder:text-espresso-300" />
                                            </div>
                                        </div>

                                        {authError && <div className="text-red-500 text-sm font-medium px-2">{authError.startsWith('ERR_') ? t('api_error.' + authError, authError) : authError}</div>}

                                        <button onClick={handleResetPw} disabled={isLoading} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B5952F] drop-shadow-md shadow-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#09090B] h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-coffee-900/20 disabled:opacity-70">
                                            {isLoading ? t('profile.status_processing') : t('profile.btn_save_pw')}
                                        </button>
                                        <div className="text-center mt-4 pt-2">
                                            <button onClick={() => { setAuthError(''); setAuthView('login'); }} className="text-[13px] font-medium text-espresso-200 hover:text-espresso-50 underline underline-offset-4">{t('profile.go_login_back')}</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            {/* Prescription Zoom Modal */}
            <AnimatePresence>
                {selectedPrescription && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[300] bg-espresso-950/80 backdrop-blur-md flex flex-col pt-safe px-0 pb-6 overflow-y-auto hide-scrollbar"
                        onClick={() => setSelectedPrescription(null)}
                    >
                        <div className="flex justify-end pt-4 pb-2 px-4 w-full max-w-sm mx-auto sticky top-0 z-[310]" onClick={(e) => e.stopPropagation()}>
                            <button 
                                onClick={() => setSelectedPrescription(null)}
                                className="w-10 h-10 bg-espresso-800/80 rounded-full flex items-center justify-center text-espresso-100 hover:text-espresso-50 border border-espresso-600 shadow-xl backdrop-blur-sm"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col items-center justify-center pt-2 pb-12 cursor-default" onClick={(e) => e.stopPropagation()}>
                            <PrescriptionTicket
                                recommendation={{
                                    bean: (() => {
                                        try {
                                            const match = selectedPrescription.aiComment?.match(/<!-- BEANDATA: (.*?) -->/);
                                            if (match) return JSON.parse(match[1]);
                                        } catch(e) {}
                                        return COFFEE_BEANS.find(b => b.name === selectedPrescription.beanName) || { 
                                            name: selectedPrescription.beanName, roast: 'Blend/Single', region: 'Global' 
                                        };
                                    })() as any,
                                    brand: BRANDS.find(b => b.name === selectedPrescription.brand) || { name: selectedPrescription.brand } as any
                                }}
                                aiExplanation={selectedPrescription.aiComment}
                                isLoggedIn={true}
                                hideSave={true}
                                rating={selectedPrescription.rating}
                                onRate={(r) => handleRatePrescription(selectedPrescription.id, r, selectedPrescription.beanName, selectedPrescription.brand, selectedPrescription.aiComment)}
                                isRating={isLoading}
                                date={new Date(selectedPrescription.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                                onShareCoffeeTalk={() => handleShareCoffeeTalk(selectedPrescription)}
                                onShare={async () => {
                                    try {
                                        await Share.share({ title: 'My Coffee Prescription', url: window.location.href, dialogTitle: 'My Coffee Prescription' });
                                    } catch (err) {
                                        if (navigator.share) {
                                            navigator.share({ title: 'My Coffee Prescription', url: window.location.href }).catch(() => {});
                                        }
                                    }
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Share Prescription Modal */}
            <AnimatePresence>
                {sharePrescriptionTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-espresso-950/80 backdrop-blur-md"
                        onClick={() => !isLoading && setSharePrescriptionTarget(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-espresso-900 border border-espresso-700 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-serif font-black text-amber-500 mb-2">{t('profile.title_share_coffeetalk')}</h3>
                            <p className="text-xs text-espresso-200 mb-5 leading-relaxed font-medium">
                                {t('profile.desc_share_coffeetalk')}
                            </p>
                            
                            <textarea
                                value={shareMessage}
                                onChange={(e) => setShareMessage(e.target.value)}
                                placeholder={t('profile.share_msg_default')}
                                className="w-full bg-espresso-950 border border-espresso-700 rounded-2xl p-4 text-[13px] text-espresso-50 placeholder:text-espresso-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 min-h-[120px] resize-none mb-6 shadow-inner"
                                disabled={isLoading}
                            />
                            
                            <div className="flex gap-3 mt-auto">
                                <button
                                    onClick={() => setSharePrescriptionTarget(null)}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-espresso-800 text-espresso-300 hover:bg-espresso-700 transition-colors"
                                    disabled={isLoading}
                                >
                                    {t('profile.btn_cancel')}
                                </button>
                                <button
                                    onClick={submitShareCoffeeTalk}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-amber-500 hover:bg-amber-400 text-espresso-950 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('profile.btn_share_submitting') : t('profile.btn_share')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Check-in Memo Modal */}
            <AnimatePresence>
                {selectedCheckinForMemo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-espresso-950/80 backdrop-blur-md"
                        onClick={() => !isLoading && setSelectedCheckinForMemo(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-espresso-900 border border-espresso-700 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-serif font-black text-amber-500">{selectedCheckinForMemo?.store?.name} {t('profile.title_visit_record', '방문 기록')}</h3>
                                <button onClick={() => setSelectedCheckinForMemo(null)} className="text-espresso-400 hover:text-white p-1"><Trash2 size={16} className="opacity-0" />✕</button>
                            </div>
                            
                            <textarea
                                value={memoInput}
                                onChange={(e) => setMemoInput(e.target.value)}
                                placeholder={t('profile.ph_visit_memo', '이 매장 방문에 대한 짧은 메모를 남겨보세요.')}
                                className="w-full bg-espresso-950 border border-espresso-700 rounded-2xl p-4 text-[13px] text-espresso-50 placeholder:text-espresso-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 min-h-[120px] resize-none mb-4 shadow-inner"
                                disabled={isLoading}
                            />

                            <div className="mb-6">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple
                                    className="hidden" 
                                    ref={memoFileInputRef} 
                                    onChange={handleMemoFileChange} 
                                    disabled={isLoading}
                                />
                                {memoImagePreviews.length > 0 && (
                                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
                                        {memoImagePreviews.map((preview, idx) => (
                                            <div key={idx} className="relative flex-shrink-0 w-28 h-28 border border-espresso-700 rounded-xl overflow-hidden snap-center group">
                                                <img src={preview} alt="Memo preview" className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => {
                                                        const existingCount = memoImagePreviews.length - memoImageFiles.length;
                                                        if (idx >= existingCount) {
                                                            setMemoImageFiles(prev => prev.filter((_, i) => i !== (idx - existingCount)));
                                                        }
                                                        setMemoImagePreviews(prev => prev.filter((_, i) => i !== idx));
                                                    }}
                                                    className="absolute top-1 right-1 bg-black/60 p-1.5 rounded-full text-white opacity-80 hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {memoImagePreviews.length < 5 && (
                                    <button 
                                        onClick={() => memoFileInputRef.current?.click()}
                                        className="w-full py-4 border-2 border-dashed border-espresso-700 rounded-xl text-espresso-400 font-bold hover:bg-espresso-800 hover:text-espresso-300 transition-colors text-sm flex items-center justify-center gap-2"
                                    >
                                        <Store size={18} /> {t('profile.btn_attach_photo', '사진 첨부하기 (옵션)')} {memoImagePreviews.length > 0 ? `(${memoImagePreviews.length}/5)` : ''}
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex gap-3 mt-auto pt-2 border-t border-espresso-700">
                                { (selectedCheckinForMemo.memo || selectedCheckinForMemo.memoImageUrl) && (
                                    <button
                                        onClick={() => { setMemoInput(''); setMemoImagePreviews([]); setMemoImageFiles([]); }}
                                        className="flex-shrink-0 px-4 py-3.5 rounded-xl font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                                        disabled={isLoading}
                                    >
                                        {t('profile.btn_delete_record', '삭제')}
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveMemo}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-amber-500 hover:bg-amber-400 text-espresso-950 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('profile.btn_saving_record', '저장 중...') : t('profile.btn_save_record', '기록 저장')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <input 
                type="file" 
                ref={courseImageInputRef} 
                onChange={handleCourseImageChange} 
                className="hidden" 
                accept="image/*" 
            />
        </div>
    );
}
