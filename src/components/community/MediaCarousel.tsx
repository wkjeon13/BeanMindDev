import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import MediaRenderer from './MediaRenderer';

interface MediaCarouselProps {
    mediaUrls: string[];
    initialIndex?: number;
    onClose: () => void;
}

export default function MediaCarousel({ mediaUrls, initialIndex = 0, onClose }: MediaCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaUrls.length - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev < mediaUrls.length - 1 ? prev + 1 : 0));
    };

    if (!mediaUrls || mediaUrls.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-espresso-950/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-safe shrink-0 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-espresso-950/80 to-transparent">
                <span className="text-espresso-50 font-mono font-medium tracking-widest text-sm drop-shadow-md">
                    {currentIndex + 1} / {mediaUrls.length}
                </span>
                <button 
                    onClick={onClose}
                    className="p-2 bg-espresso-950/50 hover:bg-espresso-950/80 rounded-full transition-colors text-espresso-50"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative flex items-center justify-center min-h-0 w-full pt-safe" onClick={onClose}>
                {/* Media Container */}
                <div 
                    className="relative w-full max-w-4xl h-full flex items-center justify-center p-4"
                    onClick={(e) => e.stopPropagation()} // Prevent close on clicking media itself
                >
                    <TransformWrapper
                        initialScale={1}
                        minScale={1}
                        maxScale={4}
                        centerOnInit={true}
                        wheel={{ step: 0.1 }}
                        doubleClick={{ step: 0.5 }}
                    >
                        <TransformComponent 
                            wrapperStyle={{ width: "100%", height: "100%" }} 
                            contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                            <MediaRenderer 
                                src={`${mediaUrls[currentIndex]}${mediaUrls[currentIndex].includes('?') ? '&' : '?'}carousel=true`} 
                                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                                autoPlay={true}
                            />
                        </TransformComponent>
                    </TransformWrapper>

                    {/* Navigation Buttons (Desktop mostly, mobile users usually rely on close or swipe if we add swipe library later) */}
                    {mediaUrls.length > 1 && (
                        <>
                            <button 
                                onClick={handlePrev}
                                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-espresso-950/40 hover:bg-espresso-950/70 text-espresso-50 rounded-full transition-colors backdrop-blur-md border border-espresso-600"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button 
                                onClick={handleNext}
                                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-espresso-950/40 hover:bg-espresso-950/70 text-espresso-50 rounded-full transition-colors backdrop-blur-md border border-espresso-600"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Thumbnails (bottom) */}
            {mediaUrls.length > 1 && (
                <div className="shrink-0 p-4 pb-safe bg-espresso-950/90 border-t border-espresso-700">
                    <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar max-w-2xl mx-auto">
                        {mediaUrls.map((url, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`relative w-14 h-14 shrink-0 rounded-md overflow-hidden transition-all duration-200 ${
                                    idx === currentIndex 
                                        ? 'ring-2 ring-amber-500 scale-110 opacity-100 z-10' 
                                        : 'opacity-50 hover:opacity-100 ring-1 ring-white/20'
                                }`}
                            >
                                <MediaRenderer src={url} className="w-full h-full object-cover" autoPlay={false} />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
