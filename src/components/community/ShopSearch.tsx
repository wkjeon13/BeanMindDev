import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, Coffee } from 'lucide-react';
import { API_BASE, getDeviceCountryCode } from '../../utils/apiConfig';
import { useTranslation } from 'react-i18next';

interface Shop {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    thumbnailUrl?: string;
}

interface ShopSearchProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (shop: Shop) => void;
}

export default function ShopSearch({ isOpen, onClose, onSelect }: ShopSearchProps) {
  const { t } = useTranslation(['translation']);
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<Shop[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch popular/recent cafes when mounted without query
    useEffect(() => {
        if (!isOpen) return;
        if (searchQuery.length === 0) {
            handleSearch(''); 
        }
    }, [isOpen, searchQuery]);

    const handleSearch = async (query: string) => {
        setIsLoading(true);
        try {
            // Reusing the existing shops API for search without restricting countryCode to ensure registered cafes are visible
            const endpoint = query 
                ? `/api/shops?q=${encodeURIComponent(query)}`
                : `/api/shops`; // Fetch all if no query
                
            const url = `${API_BASE}${endpoint}`;
            const res = await fetch(url);
            
            if (res.ok) {
                const resData = await res.json();
                // Handle both wrapped ApiResponse and plain array formats
                let fetchedShops: any[] = [];
                if (resData && typeof resData === 'object' && 'data' in resData && Array.isArray(resData.data)) {
                    fetchedShops = resData.data;
                } else if (Array.isArray(resData)) {
                    fetchedShops = resData;
                }

                // Map API response to Component Shop structure
                const mapped = fetchedShops.map(d => ({
                    id: d.id,
                    name: d.name,
                    address: d.address,
                    lat: d.lat,
                    lng: d.lng,
                    thumbnailUrl: d.media && d.media[0] ? d.media[0].url : undefined
                }));
                setResults(mapped);
            }
        } catch (error) {
            console.error('Failed to search shops:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce search input
    useEffect(() => {
        if (!isOpen) return;
        const timeoutId = setTimeout(() => {
            if (searchQuery) handleSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex flex-col justify-end">
            <div className="absolute inset-0 bg-espresso-950/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-espresso-950 w-full h-[90vh] rounded-t-3xl flex flex-col shadow-2xl animation-slide-up pb-safe">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-espresso-700 shrink-0">
                    <h2 className="text-xl font-bold text-espresso-50">{t('community_shop_search.title', '매장 연결하기')}</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-espresso-200 hover:text-espresso-50 transition-colors bg-espresso-800/50 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-espresso-700/50 shrink-0">
                    <div className="relative flex items-center">
                        <Search size={18} className="absolute left-4 text-espresso-300" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('community_shop_search.ph_search', '방문하신 카페 이름을 검색하세요')}
                            className="w-full bg-espresso-800/80 border border-espresso-600 text-espresso-50 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-amber-600/50 transition-colors placeholder:text-espresso-300"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto px-4 py-2 scroll-smooth">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-espresso-300">
                            <Coffee size={40} className="mb-4 opacity-20" />
                            <p>{t('community_shop_search.no_results', '검색 결과가 없습니다.')}</p>
                            <p className="text-sm mt-1">{t('community_shop_search.no_results_desc', '올바른 상호명인지 확인해보세요.')}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {results.map(shop => (
                                <button
                                    key={shop.id}
                                    onClick={() => onSelect(shop)}
                                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-espresso-800/50 transition-colors text-left group border border-transparent hover:border-espresso-600/50"
                                >
                                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-espresso-800 border border-espresso-600 relative">
                                        {shop.thumbnailUrl ? (
                                            <img src={`${API_BASE}${shop.thumbnailUrl}`} alt={shop.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-espresso-300">
                                                <Coffee size={20} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-espresso-950/50 to-transparent"></div>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="text-[15px] font-bold text-espresso-50 truncate group-hover:text-amber-400 transition-colors">{shop.name}</h4>
                                        <div className="flex items-center gap-1 mt-1 text-espresso-300">
                                            <MapPin size={12} className="shrink-0" />
                                            <p className="text-[12px] truncate">{shop.address}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
