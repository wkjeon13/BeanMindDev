import React, { useRef, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
    overlayMode?: boolean;
    id?: string;
}

export default function PullToRefresh({ onRefresh, children, className = '', style, disabled = false, overlayMode = false, id }: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef<number | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const maxPullDistance = 80;
    const triggerDistance = 60;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled) return;
        if (scrollContainerRef.current && scrollContainerRef.current.scrollTop <= 1) {
            startY.current = e.touches[0].clientY;
        } else {
            startY.current = null;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        // Prevent default only if we are actively pulling down at the top
        if (startY.current === null || isRefreshing) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            if (e.cancelable) {
                e.preventDefault(); // Stop native overscroll glow
            }
            const distance = Math.min(diff * 0.4, maxPullDistance);
            setPullDistance(distance);
        } else {
            // Started scrolling down the list normally
            startY.current = null;
        }
    };

    const handleTouchEnd = async () => {
        if (startY.current === null || isRefreshing) return;
        
        if (pullDistance > triggerDistance) {
            setIsRefreshing(true);
            setPullDistance(triggerDistance);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
        startY.current = null;
    };

    return (
        <div
            className={`relative w-full h-full flex flex-col overflow-hidden bg-transparent`}
            style={style}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* The absolute spinner stays locked to the top of the outer wrapper */}
            <div 
                className="absolute top-0 left-0 right-0 z-0 w-full flex justify-center items-center overflow-hidden transition-opacity duration-200 pointer-events-none text-amber-500"
                style={{ height: `${triggerDistance}px`, opacity: pullDistance / triggerDistance }}
            >
                {isRefreshing ? (
                    <div className="bg-espresso-900 rounded-full shadow-lg p-2 border border-espresso-700">
                        <Loader2 size={24} className="animate-spin text-amber-500" />
                    </div>
                ) : (
                    <div className="bg-espresso-900 rounded-full shadow-lg p-2 border border-espresso-700 pointer-events-none">
                        <Loader2 size={24} className="text-amber-500/50" style={{ transform: `rotate(${pullDistance * 4}deg)` }} />
                    </div>
                )}
            </div>
            
            {/* The inner wrapper handles native scrolling (and CSS snapping). Tracking touch outside and moving this entirely prevents snap-engine jitter and reflow flicker. */}
            <div 
                id={id}
                ref={scrollContainerRef}
                className={`w-full flex-1 overflow-y-auto overflow-x-hidden ${className} transition-transform duration-200 z-10`}
                style={overlayMode ? undefined : { transform: `translate3d(0, ${isRefreshing ? triggerDistance : pullDistance}px, 0)` }}
            >
                {children}
            </div>
        </div>
    );
}
