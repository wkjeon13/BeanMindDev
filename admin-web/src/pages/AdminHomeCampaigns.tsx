import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { API_BASE } from '@/utils/apiConfig';

const AdminHomeCampaigns = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/admin/home-campaigns`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        } else {
          setError('Failed to fetch config');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSaveSection = async (sectionKey: string) => {
    setSaving({ ...saving, [sectionKey]: true });
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = { [sectionKey]: config[sectionKey] };
      const res = await fetch(`${API_BASE}/api/admin/home-campaigns`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        setError(`Failed to save ${sectionKey}`);
      } else {
        alert('Saved successfully!');
      }
    } catch (err) {
      setError('Network error while saving');
    } finally {
      setSaving({ ...saving, [sectionKey]: false });
    }
  };

  const handleChange = (section: string, field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: string, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading({ ...uploading, [section]: true });
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('media', file);
      
      const res = await fetch(`${API_BASE}/api/admin/upload-ad-media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        handleChange(section, field, data.url);
      } else {
        alert('Image upload failed');
      }
    } catch (err) {
      alert('Upload error');
    } finally {
      setUploading({ ...uploading, [section]: false });
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading configurations...</div>;
  if (!config) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Home Campaigns (SDUI)</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* FLASH DROP HAS BEEN MOVED TO A DEDICATED PAGE */}


      {/* ROULETTE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Daily Roulette</h2>
            <p className="text-sm text-gray-500 mt-1">Displayed as the 3rd section.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSaveSection('HOME_ROULETTE')}
              disabled={saving['HOME_ROULETTE']}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saving['HOME_ROULETTE'] ? 'Saving...' : 'Save Section'}
            </button>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={config.HOME_ROULETTE.isActive} onChange={(e) => handleChange('HOME_ROULETTE', 'isActive', e.target.checked)} />
                <div className={`block w-14 h-8 rounded-full ${config.HOME_ROULETTE.isActive ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${config.HOME_ROULETTE.isActive ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="ml-3 font-medium text-gray-900">{config.HOME_ROULETTE.isActive ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
        </div>
        
        {config.HOME_ROULETTE.isActive && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="datetime-local" className="w-full p-2 border border-gray-300 rounded-lg" 
                value={config.HOME_ROULETTE.startTime ? config.HOME_ROULETTE.startTime.substring(0,16) : ''} 
                onChange={(e) => handleChange('HOME_ROULETTE', 'startTime', new Date(e.target.value).toISOString())} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="datetime-local" className="w-full p-2 border border-gray-300 rounded-lg" 
                value={config.HOME_ROULETTE.endTime ? config.HOME_ROULETTE.endTime.substring(0,16) : ''} 
                onChange={(e) => handleChange('HOME_ROULETTE', 'endTime', new Date(e.target.value).toISOString())} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Cups (1 ~ 5)</label>
              <input 
                type="number" 
                min="1" max="5"
                className="w-full p-2 border border-gray-300 rounded-lg" 
                value={config.HOME_ROULETTE.cupCount ?? 3} 
                onChange={(e) => handleChange('HOME_ROULETTE', 'cupCount', Math.min(5, Math.max(1, parseInt(e.target.value, 10) || 3)))} 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cup Rewards Range (Randomized per cup)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Minimum Beans</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border border-gray-300 rounded-lg" 
                    value={config.HOME_ROULETTE.minReward ?? 10} 
                    onChange={(e) => handleChange('HOME_ROULETTE', 'minReward', parseInt(e.target.value, 10) || 0)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Maximum Beans</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border border-gray-300 rounded-lg" 
                    value={config.HOME_ROULETTE.maxReward ?? 100} 
                    onChange={(e) => handleChange('HOME_ROULETTE', 'maxReward', parseInt(e.target.value, 10) || 0)} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NATIVE AD */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Native Ad (Special Magazine)</h2>
            <p className="text-sm text-gray-500 mt-1">Displayed inserted between user feed sections.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSaveSection('HOME_NATIVE_AD')}
              disabled={saving['HOME_NATIVE_AD']}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saving['HOME_NATIVE_AD'] ? 'Saving...' : 'Save Section'}
            </button>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={config.HOME_NATIVE_AD.isActive} onChange={(e) => handleChange('HOME_NATIVE_AD', 'isActive', e.target.checked)} />
                <div className={`block w-14 h-8 rounded-full ${config.HOME_NATIVE_AD.isActive ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${config.HOME_NATIVE_AD.isActive ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="ml-3 font-medium text-gray-900">{config.HOME_NATIVE_AD.isActive ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
        </div>
        
        {config.HOME_NATIVE_AD.isActive && (
          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Title</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" value={config.HOME_NATIVE_AD.title || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'title', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Title (English)</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" value={config.HOME_NATIVE_AD.titleEn || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'titleEn', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Link URL</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" value={config.HOME_NATIVE_AD.linkUrl || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'linkUrl', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner Height (px)</label>
              <input type="number" className="w-full p-2 border border-gray-300 rounded-lg" value={config.HOME_NATIVE_AD.height || 400} onChange={(e) => handleChange('HOME_NATIVE_AD', 'height', parseInt(e.target.value, 10) || 400)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor Name</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" value={config.HOME_NATIVE_AD.sponsorName || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'sponsorName', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor Name (English)</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" value={config.HOME_NATIVE_AD.sponsorNameEn || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'sponsorNameEn', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <div className="flex gap-2">
                <input type="text" className="flex-1 p-2 border border-gray-300 rounded-lg" value={config.HOME_NATIVE_AD.imageUrl || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'imageUrl', e.target.value)} />
                <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2">
                  <Upload size={16} />
                  <span className="text-sm font-medium text-gray-700">{uploading['HOME_NATIVE_AD'] ? 'Uploading...' : 'Upload'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'HOME_NATIVE_AD', 'imageUrl')} disabled={uploading['HOME_NATIVE_AD']} />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WEEKLY MBTI */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Weekly Coffee Taste Test</h2>
            <p className="text-sm text-gray-500 mt-1">Displayed based on user's layout preference (weekly_mbti).</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSaveSection('HOME_WEEKLY_MBTI')}
              disabled={saving['HOME_WEEKLY_MBTI']}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saving['HOME_WEEKLY_MBTI'] ? 'Saving...' : 'Save Section'}
            </button>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={config.HOME_WEEKLY_MBTI?.isActive ?? true} onChange={(e) => handleChange('HOME_WEEKLY_MBTI', 'isActive', e.target.checked)} />
                <div className={`block w-14 h-8 rounded-full ${(config.HOME_WEEKLY_MBTI?.isActive ?? true) ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${(config.HOME_WEEKLY_MBTI?.isActive ?? true) ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="ml-3 font-medium text-gray-900">{(config.HOME_WEEKLY_MBTI?.isActive ?? true) ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
        </div>
        
        {(config.HOME_WEEKLY_MBTI?.isActive ?? true) && (
          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" value={config.HOME_WEEKLY_MBTI?.badgeText || ''} placeholder="Taste Test" onChange={(e) => handleChange('HOME_WEEKLY_MBTI', 'badgeText', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" value={config.HOME_WEEKLY_MBTI?.title || ''} placeholder="이번 주말, 당신의 기분은?" onChange={(e) => handleChange('HOME_WEEKLY_MBTI', 'title', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg" value={config.HOME_WEEKLY_MBTI?.subtitle || ''} placeholder="간단한 3가지 질문으로 어울리는 커피를 찾아요." onChange={(e) => handleChange('HOME_WEEKLY_MBTI', 'subtitle', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Background Image URL</label>
              <div className="flex gap-2">
                <input type="text" className="flex-1 p-2 border border-gray-300 rounded-lg" value={config.HOME_WEEKLY_MBTI?.imageUrl || ''} placeholder="Default unsplash image..." onChange={(e) => handleChange('HOME_WEEKLY_MBTI', 'imageUrl', e.target.value)} />
                <label className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2">
                  <Upload size={16} />
                  <span className="text-sm font-medium text-gray-700">{uploading['HOME_WEEKLY_MBTI'] ? 'Uploading...' : 'Upload'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'HOME_WEEKLY_MBTI', 'imageUrl')} disabled={uploading['HOME_WEEKLY_MBTI']} />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminHomeCampaigns;
