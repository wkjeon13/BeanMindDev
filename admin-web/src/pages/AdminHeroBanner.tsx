import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Image as ImageIcon, Loader2 } from 'lucide-react';

const API_BASE = '/api';

interface HeroBanner {
    id: string;
    title: string | null;
    titleEn: string | null;
    subtitle: string | null;
    subtitleEn: string | null;
    description: string | null;
    descriptionEn: string | null;
    backgroundImage: string;
    buttonText: string | null;
    buttonTextEn: string | null;
    buttonLink: string | null;
    textColor: string;
    alignment: string;
    countryCode: string;
    isActive: boolean;
    createdAt: string;
}

const ALIGNMENTS = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-center', label: 'Top Center' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'center-left', label: 'Center Left' },
    { value: 'center', label: 'Center' },
    { value: 'center-right', label: 'Center Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-center', label: 'Bottom Center' },
    { value: 'bottom-right', label: 'Bottom Right' }
];

export default function AdminHeroBanner() {
    const [banners, setBanners] = useState<HeroBanner[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentBanner, setCurrentBanner] = useState<Partial<HeroBanner>>({});
    const [uploading, setUploading] = useState(false);
    
    useEffect(() => {
        fetchBanners();
    }, []);

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    const fetchBanners = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/hero`, { headers: getHeaders() });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            if (Array.isArray(data)) {
                setBanners(data);
            } else {
                setBanners([]);
            }
        } catch (e) {
            console.error(e);
            setBanners([]);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const data = new FormData();
        data.append('image', file);

        setUploading(true);
        try {
            const res = await fetch(`${API_BASE}/admin/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: data
            });
            if (res.ok) {
                const json = await res.json();
                setCurrentBanner(prev => ({ ...prev, backgroundImage: json.url }));
            } else {
                alert('Upload failed');
            }
        } catch (err) {
            alert('Upload error');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!currentBanner.backgroundImage) return alert('Background Image is required');
        
        const method = currentBanner.id ? 'PUT' : 'POST';
        const url = currentBanner.id ? `${API_BASE}/admin/hero/${currentBanner.id}` : `${API_BASE}/admin/hero`;
        
        try {
            const res = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify({
                    ...currentBanner,
                    textColor: currentBanner.textColor || '#FFFFFF',
                    alignment: currentBanner.alignment || 'bottom-left',
                    countryCode: currentBanner.countryCode || 'GLOBAL',
                    isActive: currentBanner.isActive !== false
                })
            });
            if (!res.ok) throw new Error('Failed to save');
            setIsEditing(false);
            setCurrentBanner({});
            fetchBanners();
        } catch (e) {
            console.error(e);
            alert('Failed to save banner');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this banner?')) return;
        try {
            const res = await fetch(`${API_BASE}/admin/hero/${id}`, { 
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to delete');
            fetchBanners();
        } catch (e) {
            console.error(e);
        }
    };

    const getAlignmentClasses = (alignment: string = 'bottom-left') => {
        const parts = alignment.split('-');
        let justify = 'justify-end'; // vertical
        let items = 'items-start'; // horizontal
        
        if (parts[0] === 'top') justify = 'justify-start';
        if (parts[0] === 'center' && parts.length === 1) justify = 'justify-center';
        if (parts[0] === 'center' && parts.length > 1) justify = 'justify-center';
        
        if (parts[1] === 'center' || parts[0] === 'center' && parts.length === 1) items = 'items-center text-center';
        if (parts[1] === 'right') items = 'items-end text-right';
        
        return `${justify} ${items}`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Hero Banner Management</h1>
                {!isEditing && (
                    <button 
                        onClick={() => { setCurrentBanner({ alignment: 'bottom-left', textColor: '#FFFFFF', countryCode: 'GLOBAL', isActive: true }); setIsEditing(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                    >
                        <Plus size={20} /> Create Banner
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex gap-8">
                    {/* Form Section */}
                    <div className="flex-1 space-y-4">
                        <h2 className="text-lg font-bold border-b pb-2 mb-4">Banner Editor</h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Background Image *</label>
                            <div className="flex gap-4 items-start">
                                <div className="w-32 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center relative bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 overflow-hidden">
                                    {currentBanner.backgroundImage ? (
                                        <img src={currentBanner.backgroundImage.startsWith('http') ? currentBanner.backgroundImage : API_BASE + currentBanner.backgroundImage} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                                    ) : (
                                        <div className="text-center text-gray-500">
                                            <ImageIcon size={20} className="mx-auto mb-1 text-gray-400" />
                                            <span className="text-[10px] uppercase">Upload</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={uploading} />
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
                                            <Loader2 size={20} className="animate-spin text-blue-600" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <input 
                                        type="text" 
                                        value={currentBanner.backgroundImage || ''}
                                        onChange={e => setCurrentBanner({...currentBanner, backgroundImage: e.target.value})}
                                        className="w-full border rounded p-2 text-sm"
                                        placeholder="Or paste an image URL here..."
                                    />
                                    <p className="text-xs text-gray-500">Recommended size: 800x1200 (vertical). Upload an image or paste an external URL.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title (KR)</label>
                                <input type="text" value={currentBanner.title || ''} onChange={e => setCurrentBanner({...currentBanner, title: e.target.value})} className="w-full border rounded p-2" placeholder="e.g. 오늘의" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title (EN)</label>
                                <input type="text" value={currentBanner.titleEn || ''} onChange={e => setCurrentBanner({...currentBanner, titleEn: e.target.value})} className="w-full border rounded p-2" placeholder="e.g. Today's" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (KR) <span className="text-[10px] text-amber-500 ml-1">(Auto-generated)</span></label>
                                <input type="text" value="User's Recommended Coffee" disabled className="w-full border rounded p-2 bg-gray-100 text-gray-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (EN) <span className="text-[10px] text-amber-500 ml-1">(Auto-generated)</span></label>
                                <input type="text" value={currentBanner.subtitleEn || "User's Recommended Coffee"} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-500" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (KR)</label>
                                <textarea value={currentBanner.description || ''} onChange={e => setCurrentBanner({...currentBanner, description: e.target.value})} className="w-full border rounded p-2" rows={2} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (EN)</label>
                                <textarea value={currentBanner.descriptionEn || ''} onChange={e => setCurrentBanner({...currentBanner, descriptionEn: e.target.value})} className="w-full border rounded p-2" rows={2} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Button Text (KR)</label>
                                <input type="text" value={currentBanner.buttonText || ''} onChange={e => setCurrentBanner({...currentBanner, buttonText: e.target.value})} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Button Text (EN)</label>
                                <input type="text" value={currentBanner.buttonTextEn || ''} onChange={e => setCurrentBanner({...currentBanner, buttonTextEn: e.target.value})} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Button Link <span className="text-[10px] text-amber-500 ml-1">(Fixed)</span></label>
                                <input type="text" value="/curator" disabled className="w-full border rounded p-2 bg-gray-100 text-gray-500" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Text Alignment</label>
                                <select 
                                    value={currentBanner.alignment || 'bottom-left'}
                                    onChange={e => setCurrentBanner({...currentBanner, alignment: e.target.value})}
                                    className="w-full border rounded p-2"
                                >
                                    {ALIGNMENTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                                <input type="color" value={currentBanner.textColor || '#FFFFFF'} onChange={e => setCurrentBanner({...currentBanner, textColor: e.target.value})} className="w-full h-10 p-1 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                                <select value={currentBanner.countryCode || 'GLOBAL'} onChange={e => setCurrentBanner({...currentBanner, countryCode: e.target.value})} className="w-full border rounded p-2">
                                    <option value="GLOBAL">Global</option>
                                    <option value="KR">Korea</option>
                                    <option value="US">USA</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                            <input type="checkbox" id="isActive" checked={currentBanner.isActive !== false} onChange={e => setCurrentBanner({...currentBanner, isActive: e.target.checked})} className="w-4 h-4" />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                                <X size={16} /> Cancel
                            </button>
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                <Save size={16} /> Save Banner
                            </button>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="w-[320px] shrink-0 border-l pl-8">
                        <h2 className="text-lg font-bold border-b pb-2 mb-4">Mobile Preview</h2>
                        <div className="relative w-full h-[260px] bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-lg border border-gray-800">
                            {currentBanner.backgroundImage ? (
                                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${currentBanner.backgroundImage})` }} />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-600"><ImageIcon size={48} /></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                            
                            {/* Content */}
                            <div className={`absolute inset-0 p-6 flex flex-col z-10 ${getAlignmentClasses(currentBanner.alignment)}`} style={{ color: currentBanner.textColor || '#FFFFFF' }}>
                                {currentBanner.title && (
                                    <span className="block text-[20px] font-serif font-medium leading-[1.1] tracking-tight mb-1">
                                        {currentBanner.title}
                                    </span>
                                )}
                                <span className="block text-[22px] font-serif font-bold leading-[1.1] tracking-tight" style={{ color: currentBanner.textColor === '#FFFFFF' ? '#FCD34D' : currentBanner.textColor }}>
                                    Brazil Fazenda Progresso
                                </span>
                                {currentBanner.description && (
                                    <p className="text-[11px] mt-2 opacity-80 max-w-[80%]">{currentBanner.description}</p>
                                )}
                                <button className="mt-4 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border rounded-full border-current opacity-90 hover:opacity-100">
                                    {currentBanner.buttonText || 'Discover More'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banners.map(banner => (
                        <div key={banner.id} className={`bg-white rounded-xl shadow-sm border ${!banner.isActive ? 'opacity-60 grayscale' : 'border-gray-200'} overflow-hidden`}>
                            <div className="h-40 bg-gray-200 relative">
                                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${banner.backgroundImage})` }} />
                                <div className="absolute inset-0 bg-black/40" />
                                <div className={`absolute inset-0 p-4 flex flex-col ${getAlignmentClasses(banner.alignment)}`} style={{ color: banner.textColor }}>
                                    <div className="text-sm">{banner.title}</div>
                                    <div className="font-bold text-lg" style={{ color: banner.textColor === '#FFFFFF' ? '#FCD34D' : banner.textColor }}>Brazil Fazenda...</div>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <span className="px-2 py-1 text-[10px] font-bold bg-black/60 text-white rounded">{banner.countryCode}</span>
                                    {banner.isActive && <span className="px-2 py-1 text-[10px] font-bold bg-green-500/80 text-white rounded">ACTIVE</span>}
                                </div>
                            </div>
                            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
                                <button onClick={() => { setCurrentBanner(banner); setIsEditing(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(banner.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                    {banners.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            No banners found. Click 'Create Banner' to get started.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
