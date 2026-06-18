import React, { useEffect, useRef, useState } from 'react';
import { Play, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../../utils/apiConfig';

interface MediaRendererProps {
    src: string;
    className?: string;
    autoPlay?: boolean;
    onClick?: () => void;
    forceVideo?: boolean;
    hideControls?: boolean;
    disablePauseOnClick?: boolean;
}

export default function MediaRenderer({ src, className = '', autoPlay = true, onClick, forceVideo = false, hideControls = false, disablePauseOnClick = false }: MediaRendererProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false); // Track if video has buffered first frame
    const [isMuted, setIsMuted] = useState(true);
    const [hasError, setHasError] = useState(false);
    const manuallyPaused = useRef(false);

    // Detect Android platform (Webview or native environment)
    const isAndroid = typeof window !== 'undefined' && 
        (((window as any).Capacitor?.getPlatform() === 'android') || 
         (window.navigator.userAgent.toLowerCase().includes('android') && window.location.href.startsWith('http://localhost')));

    // On Android, delay video tag loading until clicked to avoid WebView renderer OOM crash
    const [isActivated, setIsActivated] = useState(!isAndroid);

    // Normalize src for uploads
    let displaySrc = src && src.startsWith('/') && !src.startsWith('//') ? `${API_BASE}${src}` : src;

    // Fix for native devices: If the DB stored an absolute localhost URL, rewrite it to the actual API_BASE
    // Exclude client-side Blob URLs generated for local preview
    if (displaySrc && typeof displaySrc === 'string' && !displaySrc.startsWith('blob:')) {
        if (displaySrc.includes('localhost') && !API_BASE.includes('localhost')) {
            displaySrc = displaySrc.replace(/https?:\/\/localhost:\d+/, API_BASE);
        }
        if (displaySrc.includes('127.0.0.1') && !API_BASE.includes('127.0.0.1')) {
            displaySrc = displaySrc.replace(/https?:\/\/127\.0\.0\.1:\d+/, API_BASE);
        }
    }

    // Basic extension check for video
    const isVideo = forceVideo || (displaySrc && displaySrc.split('?')[0].match(/\.(mp4|webm|ogg|mov|m4v|3gp|avi)(\b|$)/i)) || (displaySrc && displaySrc.includes('video'));

    useEffect(() => {
        setIsReady(!isVideo);
        // Safety net for cached videos where events might fire before React registers them
        if (isVideo && videoRef.current && videoRef.current.readyState >= 3) {
            setIsReady(true);
        }
    }, [displaySrc, isVideo]);

    useEffect(() => {
        if (!isVideo || !autoPlay) return;

        // Intersection Observer to play only when visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!manuallyPaused.current) {
                        videoRef.current?.play().then(() => setIsPlaying(true)).catch(e => console.log('Auto-play blocked:', e));
                    }
                } else {
                    videoRef.current?.pause();
                    setIsPlaying(false);
                    manuallyPaused.current = false;
                }
            });
        }, { threshold: 0.5 });

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => {
            if (videoRef.current) {
                observer.unobserve(videoRef.current);
            }
        };
    }, [src, isVideo, autoPlay]);

    const handleVideoClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // prevent post bubbling if used in feed
        
        if (!isActivated) {
            setIsActivated(true);
            // Wait for video element to mount before playing
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play()
                        .then(() => setIsPlaying(true))
                        .catch(err => console.log('Play activation failed:', err));
                }
            }, 100);
            if (onClick) onClick();
            return;
        }

        if (videoRef.current && !disablePauseOnClick) {
            if (videoRef.current.paused) {
                manuallyPaused.current = false;
                videoRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log('Manual play blocked', e));
            } else {
                manuallyPaused.current = true;
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
        if (onClick) onClick();
    };

    const toggleMute = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (videoRef.current) {
            const newMutedState = !isMuted;
            videoRef.current.muted = newMutedState;
            setIsMuted(newMutedState);
        }
    };

    if (isVideo) {
        if (hasError) {
            return (
                <div className={`relative ${className} bg-espresso-950 flex flex-col items-center justify-center p-4 text-center border border-espresso-800 rounded-lg group`}>
                    <AlertTriangle size={28} className="text-espresso-400 mb-2 opacity-60" />
                    <span className="text-[11px] font-bold text-espresso-300">지원되지 않는 미디어 형식</span>
                    <span className="text-[10px] text-espresso-400 mt-1">이 모바일 환경의 하드웨어 디코더가<br />해당 영상 코덱을 지원하지 않습니다.</span>
                </div>
            );
        }

        // Render beautiful placeholder if video is not yet activated (Click-to-Play defense on Android)
        if (!isActivated) {
            return (
                <div 
                    className={`relative ${className} bg-espresso-950 flex items-center justify-center overflow-hidden cursor-pointer group`}
                    onClick={handleVideoClick}
                >
                    <img 
                        src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80" 
                        alt="Play video" 
                        className="w-full h-full object-cover opacity-60 filter blur-[0.5px] group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-espresso-950/30">
                        <div className="bg-amber-500/80 hover:bg-amber-500 p-4 rounded-full shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                            <Play size={28} className="text-white fill-white ml-1" />
                        </div>
                        <span className="text-[11px] font-medium text-amber-100 mt-3 bg-espresso-950/80 px-2.5 py-1 rounded-full border border-amber-500/20 backdrop-blur-sm">
                            터치하여 재생
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div className={`relative ${className.replace(/(?:[a-zA-Z0-9:-]+)?object-\w+/g, '')} group`} onClick={onClick ? onClick : handleVideoClick}>
                <video
                    ref={videoRef}
                    crossOrigin="anonymous"
                    className={`w-full h-full bg-espresso-950 ${className?.match(/(?:[a-zA-Z0-9:-]+)?object-\w+/g)?.join(' ') || 'object-cover'} transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}
                    loop
                    playsInline
                    muted={isMuted}
                    preload="metadata"
                    onClick={handleVideoClick}
                    onError={() => setHasError(true)}
                    onCanPlay={() => setIsReady(true)}
                    onLoadedData={() => setIsReady(true)}
                    onPlaying={() => setIsReady(true)}
                    poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                    controls={false}
                >
                    {/* Primary source with type if applicable */}
                    {!displaySrc.startsWith('blob:') && (
                        <source
                            src={displaySrc}
                            type={(() => {
                                const ext = displaySrc.split('.').pop()?.split('?')[0].toLowerCase() || 'mp4';
                                if (ext === 'mov') return 'video/quicktime';
                                if (ext === 'webm') return 'video/webm';
                                return `video/${ext}`;
                            })()}
                        />
                    )}
                    {/* Fallback source without explicit type to let the browser guess if the first fails */}
                    <source src={displaySrc} />
                </video>

                {/* Smooth Fade Preloader Overlay (Skeleton) */}
                <div className={`absolute inset-0 z-0 bg-espresso-900 pointer-events-none transition-opacity duration-[600ms] ${isReady ? 'opacity-0' : 'opacity-100'} flex items-center justify-center overflow-hidden`}>
                    {/* Animated shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-espresso-800/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    <div className="w-12 h-12 border-2 border-espresso-800 border-t-amber-500/50 rounded-full animate-spin"></div>
                </div>

                {/* Play Overlay */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-espresso-950/20 pointer-events-none transition-opacity">
                        <div className="bg-espresso-950/50 p-3 rounded-full backdrop-blur-sm">
                            <Play size={24} className="text-espresso-50 fill-white ml-1" />
                        </div>
                    </div>
                )}

                {/* Volume Indicator (Shows when playing) */}
                {!hideControls && isPlaying && (
                    <button
                        onClick={toggleMute}
                        onPointerDown={(e) => { e.stopPropagation(); }}
                        onTouchEnd={(e) => { e.stopPropagation(); }}
                        className="absolute top-2 right-2 z-30 bg-black/60 p-3.5 rounded-full backdrop-blur-sm shadow-sm transition-transform active:scale-90 flex items-center justify-center cursor-pointer"
                    >
                        {isMuted ? (
                            <VolumeX size={24} className="text-white opacity-100 drop-shadow-md" />
                        ) : (
                            <Volume2 size={24} className="text-white opacity-100 drop-shadow-md" />
                        )}
                    </button>
                )}
            </div>
        );
    }

    return <img src={displaySrc} alt="media" className={`w-full h-full ${!className.includes('object-') ? 'object-cover' : ''} ${className}`} onClick={onClick} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80'; }} />;
}
