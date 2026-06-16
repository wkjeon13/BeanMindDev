import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Image as ImageIcon, Loader2, Timer, Zap } from 'lucide-react';

const API_BASE = '/api';

interface FlashDrop {
    id: string;
    title: string;
    titleEn?: string;
    description: string;
    descriptionEn?: string;
    imageUrl: string;
    linkUrl: string | null;
    region: string;
    startTime: string;
    endTime: string;
    maxQuantity: number;
    claimedCount: number;
    status: string;
    createdAt: string;
}

export default function AdminFlashDrop() {
    const [drops, setDrops] = useState<FlashDrop[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentDrop, setCurrentDrop] = useState<Partial<FlashDrop>>({});
    const [uploading, setUploading] = useState(false);
    
    useEffect(() => {
        fetchDrops();
    }, []);

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    const fetchDrops = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/flash-drops`, { headers: getHeaders() });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            if (Array.isArray(data)) {
                setDrops(data);
            } else {
                setDrops([]);
            }
        } catch (e) {
            console.error(e);
            setDrops([]);
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
                setCurrentDrop(prev => ({ ...prev, imageUrl: json.url }));
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
        if (!currentDrop.title || !currentDrop.imageUrl || !currentDrop.startTime || !currentDrop.endTime) {
            return alert('Title, Image, Start Time, and End Time are required');
        }
        
        const method = currentDrop.id ? 'PUT' : 'POST';
        const url = currentDrop.id ? `${API_BASE}/admin/flash-drops/${currentDrop.id}` : `${API_BASE}/admin/flash-drops`;
        
        try {
            const res = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify({
                    ...currentDrop,
                    maxQuantity: currentDrop.maxQuantity || 0,
                    status: currentDrop.status || 'ACTIVE'
                })
            });
            if (res.status === 401 || res.status === 403) {
                window.location.href = '/';
                return;
            }
            if (!res.ok) throw new Error('Failed to save');
            setIsEditing(false);
            setCurrentDrop({});
            fetchDrops();
        } catch (e) {
            console.error(e);
            alert('Failed to save flash drop');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this flash drop?')) return;
        try {
            const res = await fetch(`${API_BASE}/admin/flash-drops/${id}`, { 
                method: 'DELETE',
                headers: getHeaders()
            });
            if (res.status === 401 || res.status === 403) {
                window.location.href = '/';
                return;
            }
            if (!res.ok) throw new Error('Failed to delete');
            fetchDrops();
        } catch (e) {
            console.error(e);
        }
    };

    const formatDateForInput = (dateString?: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    const isLive = currentDrop.startTime && currentDrop.endTime ? 
        (new Date() >= new Date(currentDrop.startTime) && new Date() < new Date(currentDrop.endTime)) : false;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Flash Drop Management</h1>
                {!isEditing && (
                    <button 
                        onClick={() => { setCurrentDrop({ status: 'ACTIVE', maxQuantity: 0 }); setIsEditing(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                    >
                        <Plus size={20} /> Create Flash Drop
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 flex gap-8">
                    {/* Form Section */}
                    <div className="flex-1 space-y-4">
                        <h2 className="text-lg font-bold border-b pb-2 mb-4">Flash Drop Editor</h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Background Image *</label>
                            <div className="flex gap-4 items-start">
                                <div className="w-32 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center relative bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer shrink-0 overflow-hidden">
                                    {currentDrop.imageUrl ? (
                                        <img src={currentDrop.imageUrl.startsWith('http') ? currentDrop.imageUrl : API_BASE + currentDrop.imageUrl} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
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
                                        value={currentDrop.imageUrl || ''}
                                        onChange={e => setCurrentDrop({...currentDrop, imageUrl: e.target.value})}
                                        className="w-full border rounded p-2 text-sm"
                                        placeholder="Or paste an image URL here..."
                                    />
                                    <p className="text-xs text-gray-500">Recommended size: 800x400 (horizontal).</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title (KR) *</label>
                                <input type="text" value={currentDrop.title || ''} onChange={e => setCurrentDrop({...currentDrop, title: e.target.value})} className="w-full border rounded p-2" placeholder="e.g. 초특가 예가체프 이벤트" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title (EN)</label>
                                <input type="text" value={currentDrop.titleEn || ''} onChange={e => setCurrentDrop({...currentDrop, titleEn: e.target.value})} className="w-full border rounded p-2" placeholder="e.g. Flash Drop Event" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (KR)</label>
                                <textarea value={currentDrop.description || ''} onChange={e => setCurrentDrop({...currentDrop, description: e.target.value})} className="w-full border rounded p-2" rows={2} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (EN)</label>
                                <textarea value={currentDrop.descriptionEn || ''} onChange={e => setCurrentDrop({...currentDrop, descriptionEn: e.target.value})} className="w-full border rounded p-2" rows={2} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                                <input type="datetime-local" value={formatDateForInput(currentDrop.startTime)} onChange={e => setCurrentDrop({...currentDrop, startTime: new Date(e.target.value).toISOString()})} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                                <input type="datetime-local" value={formatDateForInput(currentDrop.endTime)} onChange={e => setCurrentDrop({...currentDrop, endTime: new Date(e.target.value).toISOString()})} className="w-full border rounded p-2" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                                <input type="text" value={currentDrop.linkUrl || ''} onChange={e => setCurrentDrop({...currentDrop, linkUrl: e.target.value})} className="w-full border rounded p-2" placeholder="e.g. https://..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Quantity</label>
                                <input type="number" value={currentDrop.maxQuantity || 0} onChange={e => setCurrentDrop({...currentDrop, maxQuantity: parseInt(e.target.value)})} className="w-full border rounded p-2" min={0} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                                <select value={currentDrop.region || 'GLOBAL'} onChange={e => setCurrentDrop({...currentDrop, region: e.target.value})} className="w-full border rounded p-2">
                                    <option value="GLOBAL">Global</option>
                                    <option value="KR">Korea (KR)</option>
                                    <option value="US">United States (US)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select value={currentDrop.status || 'ACTIVE'} onChange={e => setCurrentDrop({...currentDrop, status: e.target.value})} className="w-full border rounded p-2">
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                                <X size={16} /> Cancel
                            </button>
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                <Save size={16} /> Save
                            </button>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="w-[320px] shrink-0 border-l pl-8">
                        <h2 className="text-lg font-bold border-b pb-2 mb-4">Mobile Preview</h2>
                        <div className="relative w-full h-[110px] bg-gray-900 rounded-2xl overflow-hidden shadow-lg border border-gray-800">
                            {currentDrop.imageUrl ? (
                                <img src={currentDrop.imageUrl.startsWith('http') ? currentDrop.imageUrl : API_BASE + currentDrop.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-600"><ImageIcon size={32} /></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
                            <div className="absolute inset-0 px-5 py-3 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`flex items-center gap-1 text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 border border-white/20 backdrop-blur-md rounded-full ${isLive ? 'text-red-400 bg-red-500/10' : 'text-white bg-black/40'}`}>
                                        {isLive ? <Zap size={8} /> : <Timer size={8} />}
                                        {isLive ? 'Live Now' : 'Upcoming'}
                                    </span>
                                    <span className="text-[10px] font-serif tracking-widest text-amber-500">게릴라 특가</span>
                                </div>
                                
                                <h4 className="text-[16px] font-serif leading-[1.1] text-white mb-1 truncate">{currentDrop.title || '배너 제목'}</h4>
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] text-white/70 font-light max-w-[70%] truncate">{currentDrop.description || '배너 설명'}</p>
                                    <span className="text-[12px] font-serif tracking-widest text-white">427:44:59</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drops.map(drop => (
                        <div key={drop.id} className={`bg-white rounded-xl shadow-sm border ${drop.status !== 'ACTIVE' ? 'opacity-60 grayscale' : 'border-gray-200'} overflow-hidden`}>
                            <div className="h-28 bg-gray-200 relative">
                                <img src={drop.imageUrl.startsWith('http') ? drop.imageUrl : API_BASE + drop.imageUrl} alt={drop.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
                                <div className="absolute inset-0 p-4 flex flex-col justify-center text-white">
                                    <div className="font-bold text-lg">{drop.title}</div>
                                    <div className="text-xs opacity-80 mt-1">{new Date(drop.startTime).toLocaleDateString()} ~ {new Date(drop.endTime).toLocaleDateString()}</div>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-2">
                                    {drop.status === 'ACTIVE' && <span className="px-2 py-1 text-[10px] font-bold bg-green-500/80 text-white rounded">ACTIVE</span>}
                                </div>
                            </div>
                            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
                                <button onClick={() => { setCurrentDrop(drop); setIsEditing(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(drop.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                    {drops.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            No flash drops found. Click 'Create Flash Drop' to get started.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
