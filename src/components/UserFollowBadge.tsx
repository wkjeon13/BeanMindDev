import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../utils/apiConfig';

interface UserFollowBadgeProps {
    targetUserId: string;
    targetUserName: string;
    currentUserId?: string;
    onFollowToggled?: (isFollowing: boolean) => void;
}

export default function UserFollowBadge({ targetUserId, targetUserName, currentUserId, onFollowToggled }: UserFollowBadgeProps) {
    const { t } = useTranslation();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!currentUserId || currentUserId === targetUserId) return;
        
        const fetchStatus = async () => {
            const token = localStorage.getItem('token');
            if(!token) return;
            try {
                const res = await fetch(`${API_BASE}/api/users/${targetUserId}/follow-status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setIsFollowing(data.isFollowing);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchStatus();

        const handleFollowSync = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail.targetUserId === targetUserId) {
                setIsFollowing(customEvent.detail.isFollowing);
            }
        };

        window.addEventListener('FOLLOW_STATUS_CHANGED', handleFollowSync);
        return () => window.removeEventListener('FOLLOW_STATUS_CHANGED', handleFollowSync);
    }, [targetUserId, currentUserId]);

    if (!currentUserId || currentUserId === targetUserId) return null;

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        if (!token) {
            alert(t('coffee_talk.alert_login_follow', '팔로우하려면 로그인이 필요합니다.'));
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/users/${targetUserId}/follow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIsFollowing(data.isFollowing);
                window.dispatchEvent(new CustomEvent('FOLLOW_STATUS_CHANGED', { 
                    detail: { targetUserId, isFollowing: data.isFollowing } 
                }));
                if (onFollowToggled) onFollowToggled(data.isFollowing);
            } else {
                const err = await res.json();
                alert(err.error || '오류가 발생했습니다.');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`shrink-0 whitespace-nowrap text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 transition-colors border shadow-sm ${
                isFollowing 
                    ? 'bg-amber-900/40 text-amber-500 border-amber-700/50 hover:bg-amber-900/60' 
                    : 'bg-espresso-800/80 text-espresso-200 border-espresso-600/50 hover:bg-espresso-700 hover:text-espresso-50'
            }`}
        >
            {isFollowing ? <UserCheck size={10} /> : <UserPlus size={10} />}
            {isFollowing ? t('coffee_talk.btn_following', '팔로잉') : t('coffee_talk.btn_follow', '팔로우')}
        </button>
    );
}
