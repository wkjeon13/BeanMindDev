import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, Loader2, Globe, Wand2 } from 'lucide-react';
import { API_BASE } from '@/utils/apiConfig';

const SUPPORTED_LANGUAGES = [
  { code: 'ko', label: 'Korean' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
];

export default function AdminPairings() {
  const [pairings, setPairings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('ko');
  
  const defaultTranslations = SUPPORTED_LANGUAGES.map(l => ({
    languageCode: l.code, name: '', coffee: '', desc: '', season: '', tasteProfile: ''
  }));

  const [formData, setFormData] = useState({
    icon: '',
    availableRegions: 'GLOBAL',
    isActive: true,
    order: 0,
    translations: defaultTranslations
  });
  
  const [uploading, setUploading] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    fetchPairings();
  }, []);

  const fetchPairings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/pairings?t=${new Date().getTime()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPairings(data);
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        setError('Failed to fetch pairings');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('image', file);

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });
      if (res.ok) {
        const json = await res.json();
        setFormData(prev => ({ ...prev, icon: json.url }));
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      alert('Upload error');
    } finally {
      setUploading(false);
    }
  };

  const openModal = (pairing?: any) => {
    if (pairing) {
      setEditingId(pairing.id);
      
      // Merge existing translations with defaults so all tabs exist
      const mergedTranslations = SUPPORTED_LANGUAGES.map(lang => {
        const existing = pairing.translations?.find((t: any) => t.languageCode === lang.code);
        if (existing) {
          return {
            ...existing,
            name: existing.name || '',
            coffee: existing.coffee || '',
            desc: existing.desc || '',
            season: existing.season || '',
            tasteProfile: existing.tasteProfile || ''
          };
        }
        return { languageCode: lang.code, name: '', coffee: '', desc: '', season: '', tasteProfile: '' };
      });

      setFormData({
        icon: pairing.icon || '',
        availableRegions: pairing.availableRegions || 'GLOBAL',
        isActive: pairing.isActive,
        order: pairing.order || 0,
        translations: mergedTranslations
      });
    } else {
      setEditingId(null);
      setFormData({
        icon: '',
        availableRegions: 'GLOBAL',
        isActive: true,
        order: 0,
        translations: defaultTranslations
      });
    }
    setActiveTab('ko');
    setIsModalOpen(true);
  };

  const handleTranslationChange = (field: string, value: string) => {
    setFormData(prev => {
      const newTranslations = prev.translations.map(t => {
        if (t.languageCode === activeTab) {
          return { ...t, [field]: value };
        }
        return t;
      });
      return { ...prev, translations: newTranslations };
    });
  };

  const handleAutoTranslate = async () => {
    const koTranslation = formData.translations.find(t => t.languageCode === 'ko');
    if (!koTranslation || !koTranslation.name.trim() || !koTranslation.coffee.trim()) {
      alert('Please fill out both Dessert Name and Matching Coffee in the Korean tab first.');
      return;
    }

    setTranslating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/pairings/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: koTranslation.name,
          coffee: koTranslation.coffee,
          desc: koTranslation.desc,
          season: koTranslation.season,
          tasteProfile: koTranslation.tasteProfile
        })
      });

      if (res.ok) {
        const translated = await res.json();
        setFormData(prev => {
          const newTranslations = prev.translations.map(t => {
            if (t.languageCode !== 'ko' && translated[t.languageCode]) {
              return {
                ...t,
                name: translated[t.languageCode].name || t.name,
                coffee: translated[t.languageCode].coffee || t.coffee,
                desc: translated[t.languageCode].desc || t.desc,
                season: translated[t.languageCode].season || t.season,
                tasteProfile: translated[t.languageCode].tasteProfile || t.tasteProfile
              };
            }
            return t;
          });
          return { ...prev, translations: newTranslations };
        });
        alert('Translation complete!');
      } else {
        alert('Translation failed. Please try again.');
      }
    } catch (err) {
      alert('Network error during translation.');
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.icon) {
      alert('Please upload an image icon.');
      return;
    }

    // Validate translations
    const validTranslations = [];
    const partialTranslations = [];

    for (const t of formData.translations) {
      const hasName = t.name.trim() !== '';
      const hasCoffee = t.coffee.trim() !== '';
      const hasOther = t.desc.trim() !== '' || t.season.trim() !== '' || t.tasteProfile.trim() !== '';
      
      if (hasName && hasCoffee) {
        validTranslations.push(t);
      } else if (hasName || hasCoffee || hasOther) {
        partialTranslations.push(t.languageCode.toUpperCase());
      }
    }

    if (partialTranslations.length > 0) {
      alert(`The following languages are partially filled. Both 'Dessert Name' and 'Matching Coffee' are required: ${partialTranslations.join(', ')}`);
      return;
    }

    if (validTranslations.length === 0) {
      alert('Please fill out at least one language translation completely (Name & Coffee required).');
      return;
    }

    const payload = {
      ...formData,
      translations: validTranslations
    };

    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `${API_BASE}/api/admin/pairings/${editingId}` 
        : `${API_BASE}/api/admin/pairings`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchPairings();
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        alert('Failed to save pairing');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this pairing entirely?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/pairings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPairings();
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        alert('Failed to delete');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const currentTabTranslation = formData.translations.find(t => t.languageCode === activeTab) || formData.translations[0];

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's Perfect Pairing</h1>
          <p className="text-sm text-gray-500 mt-1">Manage localized dessert and coffee pairings.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
        >
          <Plus size={18} /> Add Pairing
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
              <th className="p-4 font-medium">Image</th>
              <th className="p-4 font-medium">Primary Name (KO/EN)</th>
              <th className="p-4 font-medium">Languages</th>
              <th className="p-4 font-medium">Regions</th>
              <th className="p-4 font-medium">Order</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pairings.map(p => {
              const defaultName = p.translations?.find((t: any) => t.languageCode === 'ko')?.name 
                               || p.translations?.find((t: any) => t.languageCode === 'en')?.name 
                               || p.translations?.[0]?.name || 'Untitled';
              
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {p.icon ? (
                        <img src={p.icon} alt={defaultName} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-400 m-auto mt-3" />
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-gray-900">{defaultName}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {p.translations?.map((t: any) => (
                        <span key={t.languageCode} className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 rounded">
                          {t.languageCode}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{p.availableRegions}</td>
                  <td className="p-4 text-gray-600">{p.order}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openModal(p)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {pairings.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">No pairings found. Add one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Pairing' : 'Add New Pairing'}</h2>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="pairing-form" className="space-y-8">
                
                {/* Global Settings Section */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Globe size={16} /> Global Settings
                  </h3>
                  <div className="flex gap-6">
                    <div className="w-1/4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image Icon *</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center h-32 bg-white hover:bg-gray-50 transition-colors cursor-pointer relative overflow-hidden">
                        {formData.icon ? (
                          <img src={formData.icon} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                        ) : (
                          <div className="text-center text-gray-500">
                            <ImageIcon size={24} className="mx-auto mb-2 text-gray-400" />
                            <span className="text-[10px] uppercase">Upload</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={uploading} />
                        {uploading && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                            <Loader2 size={24} className="animate-spin text-indigo-600" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Regions</label>
                        <select value={formData.availableRegions} onChange={(e) => setFormData({...formData, availableRegions: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg">
                          <option value="GLOBAL">GLOBAL (All)</option>
                          <option value="KR">Korea (KR) Only</option>
                          <option value="US">USA (US) Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                        <input type="number" value={formData.order} onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})} className="w-full p-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={formData.isActive ? 'true' : 'false'} onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})} className="w-full p-2 border border-gray-300 rounded-lg">
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Localized Translations Section */}
                <div>
                  <div className="flex justify-between items-end border-b border-gray-200 mb-6">
                    <div className="flex">
                      {SUPPORTED_LANGUAGES.map(lang => {
                        const hasData = formData.translations.find(t => t.languageCode === lang.code)?.name.trim() !== '';
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => setActiveTab(lang.code)}
                            className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === lang.code 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {lang.label} {hasData && <span className="ml-1 w-2 h-2 inline-block bg-green-500 rounded-full" title="Data entered"></span>}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoTranslate}
                      disabled={translating}
                      className="mb-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {translating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      Auto Translate from Korean
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dessert Name ({activeTab.toUpperCase()})</label>
                        <input type="text" value={currentTabTranslation.name} onChange={(e) => handleTranslationChange('name', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="e.g. Croissant" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Matching Coffee ({activeTab.toUpperCase()})</label>
                        <input type="text" value={currentTabTranslation.coffee} onChange={(e) => handleTranslationChange('coffee', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="e.g. Flat White" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description ({activeTab.toUpperCase()})</label>
                      <textarea value={currentTabTranslation.desc} onChange={(e) => handleTranslationChange('desc', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" rows={2} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
                        <input type="text" value={currentTabTranslation.season} onChange={(e) => handleTranslationChange('season', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="e.g. Spring" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Taste Profile</label>
                        <input type="text" value={currentTabTranslation.tasteProfile} onChange={(e) => handleTranslationChange('tasteProfile', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="e.g. Sweet & Creamy" />
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between gap-3 bg-gray-50 rounded-b-xl">
              <div className="text-sm text-gray-500 pt-2">
                Empty languages will be ignored.
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                  Save All Translations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
