import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Music, Plus, Trash2, ArrowLeft, RefreshCw, Film } from 'lucide-react';
import { API_BASE } from '@/utils/apiConfig';

interface BgmSong {
  id: number;
  title: string;
  videoId: string;
}

interface BgmTheme {
  id: string;
  labelKo: string;
  labelEn: string;
  songs: BgmSong[];
}

export default function AdminBgm() {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<BgmTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<BgmTheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Theme Form State
  const [newThemeId, setNewThemeId] = useState('');
  const [newThemeLabelKo, setNewThemeLabelKo] = useState('');
  const [newThemeLabelEn, setNewThemeLabelEn] = useState('');
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);

  // Song Form State
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongVideoId, setNewSongVideoId] = useState('');
  const [isAddingSong, setIsAddingSong] = useState(false);

  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const alertShown = useRef(false);

  // Admin Access Check
  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else if (currentUser.role !== 'ADMIN') {
      if (!alertShown.current) {
        alertShown.current = true;
        alert('관리자 권한이 필요합니다.');
      }
      navigate(-1);
    } else {
      fetchThemes();
    }
  }, [navigate, token, currentUser.role]);

  const fetchThemes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/bgm/themes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setThemes(json.data);
          // If a theme was selected before reload, update its info
          if (selectedTheme) {
            const updated = json.data.find((t: BgmTheme) => t.id === selectedTheme.id);
            setSelectedTheme(updated || null);
          }
        }
      }
    } catch (err) {
      console.error('BGM 로드 실패', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThemeId.trim() || !newThemeLabelKo.trim() || !newThemeLabelEn.trim()) {
      alert('모든 테마 정보를 입력해 주세요.');
      return;
    }

    setIsCreatingTheme(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/bgm/themes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: newThemeId.trim(),
          labelKo: newThemeLabelKo.trim(),
          labelEn: newThemeLabelEn.trim()
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setThemes(prev => [...prev, json.data]);
        setNewThemeId('');
        setNewThemeLabelKo('');
        setNewThemeLabelEn('');
        alert('새 BGM 테마가 생성되었습니다.');
      } else {
        alert(`BGM 테마 생성 실패: ${json.error?.message || '서버 오류'}`);
      }
    } catch (err) {
      console.error(err);
      alert('서버 통신 실패');
    } finally {
      setIsCreatingTheme(false);
    }
  };

  const handleDeleteTheme = async (themeId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent select row trigger
    if (!window.confirm(`정말로 이 BGM 테마 [${themeId}]를 삭제하시겠습니까?\n테마에 속한 곡들이 모두 함께 삭제됩니다.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/bgm/themes/${themeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setThemes(prev => prev.filter(t => t.id !== themeId));
        if (selectedTheme && selectedTheme.id === themeId) {
          setSelectedTheme(null);
        }
        alert('테마가 삭제되었습니다.');
      } else {
        alert('테마 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서버 통신 실패');
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTheme) return;
    if (!newSongTitle.trim() || !newSongVideoId.trim()) {
      alert('곡 제목과 유튜브 Video ID를 모두 입력해 주세요.');
      return;
    }

    setIsAddingSong(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/bgm/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          themeId: selectedTheme.id,
          title: newSongTitle.trim(),
          videoId: newSongVideoId.trim()
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        // Update list
        const updatedTheme = json.data;
        setThemes(prev => prev.map(t => t.id === updatedTheme.id ? updatedTheme : t));
        setSelectedTheme(updatedTheme);
        setNewSongTitle('');
        setNewSongVideoId('');
        alert('곡이 정상적으로 추가되었습니다.');
      } else {
        alert(`곡 추가 실패: ${json.error?.message || '서버 오류'}`);
      }
    } catch (err) {
      console.error(err);
      alert('서버 통신 실패');
    } finally {
      setIsAddingSong(false);
    }
  };

  const handleDeleteSong = async (songId: number) => {
    if (!selectedTheme) return;
    if (!window.confirm('정말로 이 곡을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/bgm/songs/${songId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        // Update selection UI
        const updatedSongs = selectedTheme.songs.filter(s => s.id !== songId);
        const updatedTheme = { ...selectedTheme, songs: updatedSongs };
        setThemes(prev => prev.map(t => t.id === selectedTheme.id ? updatedTheme : t));
        setSelectedTheme(updatedTheme);
        alert('곡이 삭제되었습니다.');
      } else {
        alert('곡 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서버 통신 실패');
    }
  };

  return (
    <div className="h-full w-full bg-gray-100 min-h-screen p-6 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <Shield className="text-gray-800" size={28} />
            <h1 className="text-2xl font-bold text-gray-900">BGM 테마 및 음원 관리</h1>
          </div>
          <button onClick={fetchThemes} className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 flex items-center gap-2 shadow-sm text-sm text-gray-700">
            <RefreshCw size={16} /> 새로고침
          </button>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-8 h-8 rounded-full border-4 border-gray-300 border-t-gray-700 animate-spin mb-4" />
            <p className="font-medium">테마 목록을 불러오는 중...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side: Themes List (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              
              {/* Create Theme Form */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus size={18} className="text-indigo-600" /> 새 BGM 테마 생성
                </h2>
                <form onSubmit={handleCreateTheme} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">테마 ID (영문 고유키)</label>
                    <input
                      type="text"
                      value={newThemeId}
                      onChange={(e) => setNewThemeId(e.target.value)}
                      placeholder="e.g. jazz"
                      className="w-full bg-gray-50 border border-gray-300 h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">한글 라벨</label>
                    <input
                      type="text"
                      value={newThemeLabelKo}
                      onChange={(e) => setNewThemeLabelKo(e.target.value)}
                      placeholder="e.g. ☕ 아침 클래식 피아노"
                      className="w-full bg-gray-50 border border-gray-300 h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1">영문 라벨</label>
                      <input
                        type="text"
                        value={newThemeLabelEn}
                        onChange={(e) => setNewThemeLabelEn(e.target.value)}
                        placeholder="e.g. Morning Piano"
                        className="w-full bg-gray-50 border border-gray-300 h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isCreatingTheme}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold h-10 px-4 rounded-lg text-sm transition-all"
                    >
                      생성
                    </button>
                  </div>
                </form>
              </div>

              {/* Themes List Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-md font-bold text-gray-800">등록된 BGM 테마 목록</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                        <th className="p-3">테마 ID</th>
                        <th className="p-3">한글 라벨</th>
                        <th className="p-3">영문 라벨</th>
                        <th className="p-3 text-center">등록된 곡 수</th>
                        <th className="p-3 text-center">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {themes.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400">등록된 BGM 테마가 없습니다.</td>
                        </tr>
                      ) : (
                        themes.map((theme) => {
                          const isSelected = selectedTheme?.id === theme.id;
                          return (
                            <tr
                              key={theme.id}
                              onClick={() => setSelectedTheme(theme)}
                              className={`border-b border-gray-100 cursor-pointer hover:bg-indigo-50/50 transition-colors ${isSelected ? 'bg-indigo-50 font-semibold' : ''}`}
                            >
                              <td className="p-3 font-mono text-gray-700">{theme.id}</td>
                              <td className="p-3 text-gray-900">{theme.labelKo}</td>
                              <td className="p-3 text-gray-700">{theme.labelEn}</td>
                              <td className="p-3 text-center text-gray-900">{theme.songs?.length || 0}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={(e) => handleDeleteTheme(theme.id, e)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="테마 삭제"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Side: Songs Management (5 cols) */}
            <div className="lg:col-span-5">
              {selectedTheme ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col space-y-5 p-5">
                  <div className="border-b border-gray-200 pb-3">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">상세 곡 관리</span>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                      <Music size={18} className="text-gray-700" /> {selectedTheme.labelKo}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">Theme ID: {selectedTheme.id}</p>
                  </div>

                  {/* Add Song Form */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">새 곡 추가</h3>
                    <form onSubmit={handleAddSong} className="flex flex-col gap-3">
                      <div>
                        <input
                          type="text"
                          value={newSongTitle}
                          onChange={(e) => setNewSongTitle(e.target.value)}
                          placeholder="유튜브 음악 명칭 또는 설명"
                          className="w-full bg-gray-50 border border-gray-300 h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={newSongVideoId}
                            onChange={(e) => setNewSongVideoId(e.target.value)}
                            placeholder="YouTube Video ID (e.g. tN9ecELJ5A0)"
                            className="w-full bg-gray-50 border border-gray-300 h-10 pl-8 pr-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <Film size={14} className="absolute left-3 top-3 text-gray-400" />
                        </div>
                        <button
                          type="submit"
                          disabled={isAddingSong}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold h-10 px-4 rounded-lg text-sm transition-all flex items-center gap-1"
                        >
                          <Plus size={16} /> 추가
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Songs List */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">수록된 곡 목록</h3>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {selectedTheme.songs?.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">이 테마에는 수록된 곡이 없습니다. 새 곡을 추가해 보세요.</p>
                      ) : (
                        selectedTheme.songs.map((song) => (
                          <div key={song.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="text-sm font-bold text-gray-800 truncate">{song.title}</span>
                              <span className="text-xs text-gray-400 font-mono mt-0.5">Video ID: {song.videoId}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteSong(song.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center text-center text-gray-400">
                  <Music size={40} className="mb-3 opacity-60" />
                  <p className="font-semibold text-sm">곡 관리 안내</p>
                  <p className="text-xs mt-1">좌측 테마 목록에서 테마를 클릭하면<br />상세 곡 목록 확인 및 곡 추가/삭제가 가능합니다.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
