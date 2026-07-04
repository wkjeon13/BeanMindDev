import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Image as ImageIcon, Loader2, Upload, Plus, Trash, Edit, Check } from 'lucide-react';
import { API_BASE } from '@/utils/apiConfig';
import AdminTasteTest from './AdminTasteTest';

// Quiz Set Sub-manager inside Admin Campaigns Page
const AdminQuizManager = () => {
  const [quizSets, setQuizSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSet, setEditingSet] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    title: '',
    themeRegion: 'GLOBAL',
    scheduledDate: new Date().toISOString().slice(0, 10),
    isActive: true,
    questions: Array.from({ length: 5 }, (_, i) => ({
      questionText: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correctAnswer: 1,
      explanation: '',
      beansReward: 10
    }))
  });

  const fetchQuizSets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/quiz-sets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setQuizSets(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizSets();
  }, []);

  const handleQuestionChange = (qIdx: number, field: string, value: any) => {
    const updatedQs = [...form.questions];
    updatedQs[qIdx] = { ...updatedQs[qIdx], [field]: value };
    setForm({ ...form, questions: updatedQs });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // Validate empty questions
    const hasEmpty = form.questions.some((q: any) => !q.questionText || !q.option1 || !q.option2 || !q.option3 || !q.option4);
    if (hasEmpty) {
      alert('5개 문항의 모든 질문과 보기(1~4) 텍스트를 기입해야 합니다.');
      return;
    }

    try {
      const method = editingSet ? 'PUT' : 'POST';
      const url = editingSet 
        ? `${API_BASE}/api/admin/quiz-sets/${editingSet.id}` 
        : `${API_BASE}/api/admin/quiz-sets`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        alert(editingSet ? '퀴즈 세트가 성공적으로 수정되었습니다.' : '새로운 퀴즈 세트가 등록되었습니다.');
        setEditingSet(null);
        setForm({
          title: '',
          themeRegion: 'GLOBAL',
          scheduledDate: new Date().toISOString().slice(0, 10),
          isActive: true,
          questions: Array.from({ length: 5 }, (_, i) => ({
            questionText: '',
            option1: '',
            option2: '',
            option3: '',
            option4: '',
            correctAnswer: 1,
            explanation: '',
            beansReward: 10
          }))
        });
        fetchQuizSets();
      } else {
        const errData = await res.json();
        alert(errData.message || '저장에 실패했습니다.');
      }
    } catch (err) {
      alert('저장 중 네트워크 오류가 발생했습니다.');
    }
  };

  const handleEdit = (set: any) => {
    setEditingSet(set);
    setForm({
      title: set.title,
      themeRegion: set.themeRegion,
      scheduledDate: set.scheduledDate ? set.scheduledDate.substring(0, 10) : '',
      isActive: set.isActive,
      questions: set.questions.map((q: any) => ({
        questionText: q.questionText,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        beansReward: q.beansReward || 10
      }))
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 퀴즈 세트를 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/quiz-sets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('삭제 완료');
        fetchQuizSets();
      }
    } catch (e) {
      alert('삭제 실패');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-bold text-gray-900 text-md">
          {editingSet ? '퀴즈 세트 수정하기' : '새로운 퀴즈 세트 등록 (5문제 필수)'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">퀴즈 제목</label>
            <input type="text" required placeholder="예: 에티오피아 원두 상식 1편" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">테마 지역 (Theme Region)</label>
            <select className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white" value={form.themeRegion} onChange={e => setForm({ ...form, themeRegion: e.target.value })}>
              <option value="GLOBAL">글로벌 (스탬프 적립 없음)</option>
              <option value="ETHIOPIA">에티오피아 (ETHIOPIA)</option>
              <option value="COLOMBIA">콜롬비아 (COLOMBIA)</option>
              <option value="BRAZIL">브라질 (BRAZIL)</option>
              <option value="KENYA">케냐 (KENYA)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">배포 예정일 (Scheduled Date)</label>
            <input type="date" required className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} />
          </div>
        </div>

        {/* Questons Render */}
        <div className="space-y-6 pt-4 border-t border-gray-200">
          {form.questions.map((q: any, idx: number) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm">
              <span className="inline-block text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                문제 {idx + 1} {idx === 4 && '(더블 찬스 질문)'}
              </span>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">질문 문항</label>
                <input type="text" placeholder={`예: 질문 내용 ${idx + 1}`} required className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={q.questionText} onChange={e => handleQuestionChange(idx, 'questionText', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">보기 1</label>
                  <input type="text" required className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={q.option1} onChange={e => handleQuestionChange(idx, 'option1', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">보기 2</label>
                  <input type="text" required className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={q.option2} onChange={e => handleQuestionChange(idx, 'option2', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">보기 3</label>
                  <input type="text" required className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={q.option3} onChange={e => handleQuestionChange(idx, 'option3', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">보기 4</label>
                  <input type="text" required className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={q.option4} onChange={e => handleQuestionChange(idx, 'option4', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">올바른 정답 선택</label>
                  <select className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white" value={q.correctAnswer} onChange={e => handleQuestionChange(idx, 'correctAnswer', parseInt(e.target.value, 10))}>
                    <option value={1}>보기 1번 정답</option>
                    <option value={2}>보기 2번 정답</option>
                    <option value={3}>보기 3번 정답</option>
                    <option value={4}>보기 4번 정답</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">맞출 시 보상 (Beans)</label>
                  <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={q.beansReward} onChange={e => handleQuestionChange(idx, 'beansReward', parseInt(e.target.value, 10) || 10)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">해설 및 원두 정보</label>
                <textarea rows={2} placeholder="정답/오답 해설을 기입하세요." className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={q.explanation} onChange={e => handleQuestionChange(idx, 'explanation', e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          {editingSet && (
            <button type="button" onClick={() => { setEditingSet(null); setForm({ title: '', themeRegion: 'GLOBAL', scheduledDate: new Date().toISOString().slice(0, 10), isActive: true, questions: Array.from({ length: 5 }, () => ({ questionText: '', option1: '', option2: '', option3: '', option4: '', correctAnswer: 1, explanation: '', beansReward: 10 })) }); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 text-sm rounded-lg font-medium">
              취소
            </button>
          )}
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-sm rounded-lg font-bold flex items-center gap-1.5 shadow-sm">
            <Check size={16} />
            {editingSet ? '수정 내용 저장' : '새 퀴즈 등록'}
          </button>
        </div>
      </form>

      {/* Quiz List Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h4 className="font-bold text-gray-900 text-sm">예약 및 기등록된 퀴즈 세트 리스트</h4>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">로딩 중...</div>
        ) : quizSets.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">등록된 퀴즈 세트가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-[11px] text-gray-700 uppercase font-black border-b border-gray-200">
                <tr>
                  <th className="p-3">배포 예정일</th>
                  <th className="p-3">타이틀</th>
                  <th className="p-3">테마 지역</th>
                  <th className="p-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quizSets.map((set) => (
                  <tr key={set.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-900 text-xs">
                      {set.scheduledDate ? set.scheduledDate.substring(0, 10) : '미지정'}
                    </td>
                    <td className="p-3 text-xs font-medium text-gray-700">{set.title}</td>
                    <td className="p-3 text-xs">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${set.themeRegion === 'GLOBAL' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-800'}`}>
                        {set.themeRegion}
                      </span>
                    </td>
                    <td className="p-3 flex justify-center gap-2">
                      <button onClick={() => handleEdit(set)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(set.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

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
          // Ensure HOME_QUIZ default object exists
          if (!data.HOME_QUIZ) {
            data.HOME_QUIZ = { isActive: true, startTime: '', endTime: '' };
          }
          setConfig(data);
        } else {
          setError('Failed to fetch config');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setConfig(prev => {
          if (prev && !prev.HOME_QUIZ) {
            return { ...prev, HOME_QUIZ: { isActive: true, startTime: '', endTime: '' } };
          }
          return prev;
        });
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

      {/* DAILY COFFEE QUIZ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Daily Coffee Quiz</h2>
            <p className="text-sm text-gray-500 mt-1">Displayed as the daily mini-game.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSaveSection('HOME_QUIZ')}
              disabled={saving['HOME_QUIZ']}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {saving['HOME_QUIZ'] ? 'Saving...' : 'Save Section'}
            </button>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={config.HOME_QUIZ?.isActive ?? true} onChange={(e) => handleChange('HOME_QUIZ', 'isActive', e.target.checked)} />
                <div className={`block w-14 h-8 rounded-full ${(config.HOME_QUIZ?.isActive ?? true) ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${(config.HOME_QUIZ?.isActive ?? true) ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="ml-3 font-medium text-gray-900">{(config.HOME_QUIZ?.isActive ?? true) ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
        </div>
        
        {(config.HOME_QUIZ?.isActive ?? true) && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="datetime-local" className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
                  value={config.HOME_QUIZ?.startTime ? config.HOME_QUIZ.startTime.substring(0,16) : ''} 
                  onChange={(e) => handleChange('HOME_QUIZ', 'startTime', e.target.value ? new Date(e.target.value).toISOString() : '')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="datetime-local" className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
                  value={config.HOME_QUIZ?.endTime ? config.HOME_QUIZ.endTime.substring(0,16) : ''} 
                  onChange={(e) => handleChange('HOME_QUIZ', 'endTime', e.target.value ? new Date(e.target.value).toISOString() : '')} />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <AdminQuizManager />
            </div>
          </div>
        )}
      </div>

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
              <input type="datetime-local" className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
                value={config.HOME_ROULETTE.startTime ? config.HOME_ROULETTE.startTime.substring(0,16) : ''} 
                onChange={(e) => handleChange('HOME_ROULETTE', 'startTime', new Date(e.target.value).toISOString())} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="datetime-local" className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
                value={config.HOME_ROULETTE.endTime ? config.HOME_ROULETTE.endTime.substring(0,16) : ''} 
                onChange={(e) => handleChange('HOME_ROULETTE', 'endTime', new Date(e.target.value).toISOString())} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Cups (1 ~ 5)</label>
              <input 
                type="number" 
                min="1" max="5"
                className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
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
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
                    value={config.HOME_ROULETTE.minReward ?? 10} 
                    onChange={(e) => handleChange('HOME_ROULETTE', 'minReward', parseInt(e.target.value, 10) || 0)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Maximum Beans</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm" 
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
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={config.HOME_NATIVE_AD.title || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'title', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Title (English)</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={config.HOME_NATIVE_AD.titleEn || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'titleEn', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Link URL</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={config.HOME_NATIVE_AD.linkUrl || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'linkUrl', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner Height (px)</label>
              <input type="number" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={config.HOME_NATIVE_AD.height || 400} onChange={(e) => handleChange('HOME_NATIVE_AD', 'height', parseInt(e.target.value, 10) || 400)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor Name</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={config.HOME_NATIVE_AD.sponsorName || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'sponsorName', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor Name (English)</label>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg text-sm" value={config.HOME_NATIVE_AD.sponsorNameEn || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'sponsorNameEn', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <div className="flex gap-2">
                <input type="text" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm" value={config.HOME_NATIVE_AD.imageUrl || ''} onChange={(e) => handleChange('HOME_NATIVE_AD', 'imageUrl', e.target.value)} />
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
        </div>
        <div className="p-6">
          <AdminTasteTest isEmbedded={true} />
        </div>
      </div>

    </div>
  );
};

export default AdminHomeCampaigns;
