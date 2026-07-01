import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, FileText, Plus, Trash2, ArrowLeft, RefreshCw, Layers, Edit3, Settings, HelpCircle, Save, Upload } from 'lucide-react';
import { API_BASE } from '@/utils/apiConfig';

interface OptionDto {
  id?: number;
  optionLetter: string;
  contentKo: string;
  contentEn: string;
  weightAcidity: number;
  weightSweetness: number;
  weightBitterness: number;
  weightBody: number;
}

interface QuestionDto {
  id?: number;
  questionNumber: number;
  contentKo: string;
  contentEn: string;
  options: OptionDto[];
}

interface ResultDto {
  id: string;
  resultNameKo: string;
  resultNameEn: string;
  descriptionKo: string;
  descriptionEn: string;
  targetAcidityMin?: number;
  targetAcidityMax?: number;
  targetSweetnessMin?: number;
  targetSweetnessMax?: number;
  targetBitternessMin?: number;
  targetBitternessMax?: number;
  targetBodyMin?: number;
  targetBodyMax?: number;
}

interface TasteTest {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  isActive: boolean;
  questions: QuestionDto[];
  results: ResultDto[];
}

export default function AdminTasteTest({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const navigate = useNavigate();
  const [tests, setTests] = useState<TasteTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<TasteTest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'questions' | 'results'>('info');

  // Edit State
  const [editingTestId, setEditingTestId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editIsActive, setEditIsActive] = useState(false);
  const [editQuestions, setEditQuestions] = useState<QuestionDto[]>([]);
  const [editResults, setEditResults] = useState<ResultDto[]>([]);
  
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const alertShown = useRef(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('media', file);

      const res = await fetch(`${API_BASE}/api/admin/upload-ad-media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setEditImageUrl(data.url);
      } else {
        alert('이미지 업로드에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // Admin Check
  useEffect(() => {
    if (!token) {
      if (!isEmbedded) navigate('/login');
    } else if (currentUser.role !== 'ADMIN') {
      if (!isEmbedded) {
        if (!alertShown.current) {
          alertShown.current = true;
          alert('관리자 권한이 필요합니다.');
        }
        navigate(-1);
      }
    } else {
      fetchTests();
    }
  }, [navigate, token, currentUser.role, isEmbedded]);

  const fetchTests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/taste-tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTests(data);
        if (data.length > 0 && !selectedTest) {
          loadTestForEditing(data[0]);
        }
      }
    } catch (err) {
      console.error('테스트 목록 로드 실패', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTestForEditing = (test: TasteTest) => {
    setSelectedTest(test);
    setEditingTestId(test.id);
    setEditTitle(test.title);
    setEditSubtitle(test.subtitle || '');
    setEditImageUrl(test.imageUrl || '');
    setEditIsActive(test.isActive);
    setEditQuestions(test.questions || []);
    setEditResults(test.results || []);
    setActiveTab('info');
  };

  const handleAddNewTestInit = () => {
    setSelectedTest(null);
    setEditingTestId('new_test_' + Date.now());
    setEditTitle('새로운 주간 커피 테이스트 테스트');
    setEditSubtitle('');
    setEditImageUrl('/uploads/tastetest/default.jpg');
    setEditIsActive(false);
    setEditQuestions([
      {
        questionNumber: 1,
        contentKo: '오늘 기분을 나타내는 선택지는?',
        contentEn: 'Which option represents your mood today?',
        options: [
          { optionLetter: 'A', contentKo: '활기참', contentEn: 'Energetic', weightAcidity: 3, weightSweetness: 0, weightBitterness: 0, weightBody: 0 },
          { optionLetter: 'B', contentKo: '차분함', contentEn: 'Calm', weightAcidity: 0, weightSweetness: 3, weightBitterness: 0, weightBody: 0 },
          { optionLetter: 'C', contentKo: '쌉쌀한 생각', contentEn: 'Bitter thoughts', weightAcidity: 0, weightSweetness: 0, weightBitterness: 3, weightBody: 3 }
        ]
      }
    ]);
    setEditResults([
      {
        id: 'FRUITY_LIGHT',
        resultNameKo: '산뜻하고 화사한 타입',
        resultNameEn: 'Bright Fruit Garden Type',
        descriptionKo: '산미가 화사하고 풍부한 커피가 어울려요.',
        descriptionEn: 'You match bright and acidic coffee.',
        targetAcidityMin: 3,
        targetAcidityMax: 10
      }
    ]);
    setActiveTab('info');
  };

  const handleSaveTest = async () => {
    if (!editingTestId.trim() || !editTitle.trim()) {
      alert('테스트 ID와 제목을 올바르게 입력해 주세요.');
      return;
    }

    const payload = {
      id: editingTestId.trim(),
      title: editTitle.trim(),
      subtitle: editSubtitle.trim(),
      imageUrl: editImageUrl.trim(),
      isActive: editIsActive,
      questions: editQuestions,
      results: editResults
    };

    try {
      const res = await fetch(`${API_BASE}/api/admin/taste-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('테스트 정보가 성공적으로 저장되었습니다.');
        fetchTests();
      } else {
        const errJson = await res.json();
        alert(`저장 실패: ${errJson.message || '서버 오류'}`);
      }
    } catch (err) {
      console.error(err);
      alert('통신 오류');
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!window.confirm('정말 이 맛 테스트를 삭제하시겠습니까?\n하위 질문과 답변 결과 매핑이 전부 삭제됩니다.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/taste-tests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('테스트가 삭제되었습니다.');
        setSelectedTest(null);
        fetchTests();
      } else {
        alert('삭제 실패');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/taste-tests/${id}/toggle-active?active=${!currentStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`상태가 ${!currentStatus ? '활성화' : '비활성화'} 처리되었습니다.`);
        fetchTests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Question Editors
  const handleAddQuestion = () => {
    const nextNum = editQuestions.length + 1;
    setEditQuestions([
      ...editQuestions,
      {
        questionNumber: nextNum,
        contentKo: `질문 ${nextNum}의 내용`,
        contentEn: `Question ${nextNum} Content`,
        options: [
          { optionLetter: 'A', contentKo: '선택지 A', contentEn: 'Option A', weightAcidity: 0, weightSweetness: 0, weightBitterness: 0, weightBody: 0 },
          { optionLetter: 'B', contentKo: '선택지 B', contentEn: 'Option B', weightAcidity: 0, weightSweetness: 0, weightBitterness: 0, weightBody: 0 },
          { optionLetter: 'C', contentKo: '선택지 C', contentEn: 'Option C', weightAcidity: 0, weightSweetness: 0, weightBitterness: 0, weightBody: 0 }
        ]
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    const updated = editQuestions.filter((_, i) => i !== index).map((q, idx) => ({
      ...q,
      questionNumber: idx + 1
    }));
    setEditQuestions(updated);
  };

  const handleQuestionTextChange = (index: number, lang: 'Ko' | 'En', value: string) => {
    const updated = [...editQuestions];
    if (lang === 'Ko') {
      updated[index].contentKo = value;
    } else {
      updated[index].contentEn = value;
    }
    setEditQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, field: string, value: any) => {
    const updated = [...editQuestions];
    const option = { ...updated[qIndex].options[oIndex], [field]: value };
    updated[qIndex].options[oIndex] = option;
    setEditQuestions(updated);
  };

  // Result Editors
  const handleAddResult = () => {
    setEditResults([
      ...editResults,
      {
        id: 'NEW_RESULT_' + Date.now(),
        resultNameKo: '새 커피 성향 유형',
        resultNameEn: 'New Coffee Type',
        descriptionKo: '결과 매치 성향 설명',
        descriptionEn: 'Result Type Description'
      }
    ]);
  };

  const handleRemoveResult = (index: number) => {
    setEditResults(editResults.filter((_, i) => i !== index));
  };

  const handleResultChange = (index: number, field: string, value: any) => {
    const updated = [...editResults];
    updated[index] = { ...updated[index], [field]: value };
    setEditQuestions(prev => [...prev]); // trigger state render refresh
    setEditResults(updated);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-8 h-8 rounded-full border-4 border-gray-300 border-t-gray-700 animate-spin mb-4" />
          <p className="font-medium">테스트 데이터를 불러오는 중...</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Taste Test Lists (5 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-800">등록된 취향 테스트 목록</h2>
              {isEmbedded && (
                <div className="flex gap-1.5">
                  <button onClick={handleAddNewTestInit} className="p-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm" title="새 테스트 추가">
                    <Plus size={10} /> 추가
                  </button>
                  <button onClick={fetchTests} className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-50 text-[10px] text-gray-700 flex items-center gap-1 shadow-sm" title="새로고침">
                    <RefreshCw size={10} />
                  </button>
                </div>
              )}
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                  {tests.length === 0 ? (
                    <p className="p-6 text-center text-sm text-gray-400">등록된 테스트가 없습니다.</p>
                  ) : (
                    tests.map((test) => {
                      const isSelected = selectedTest?.id === test.id;
                      return (
                        <div
                          key={test.id}
                          onClick={() => loadTestForEditing(test)}
                          className={`p-4 cursor-pointer hover:bg-indigo-50/30 transition-colors ${isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600 font-semibold' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-900 line-clamp-1">{test.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${test.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {test.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-1 mt-1">{test.subtitle}</p>
                          <div className="flex items-center justify-between mt-3 text-[11px] text-gray-500">
                            <span className="font-mono">ID: {test.id}</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleActive(test.id, test.isActive); }}
                                className="text-indigo-600 hover:underline"
                              >
                                {test.isActive ? '비활성화' : '활성화'}
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteTest(test.id); }}
                                className="text-red-500 hover:text-red-700"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Visual Question & Result Builder (8 cols) */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                
                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-3 px-4 text-sm font-bold text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                  >
                    <Settings size={16} /> 기본 정보 편집
                  </button>
                  <button
                    onClick={() => setActiveTab('questions')}
                    className={`flex-1 py-3 px-4 text-sm font-bold text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'questions' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                  >
                    <HelpCircle size={16} /> 퀴즈 문항 설계 ({editQuestions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('results')}
                    className={`flex-1 py-3 px-4 text-sm font-bold text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'results' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                  >
                    <Layers size={16} /> 결과 성향 매핑 ({editResults.length})
                  </button>
                </div>

                <div className="p-6 flex-1 min-h-[500px]">
                  
                  {/* Tab 1: Basic Info */}
                  {activeTab === 'info' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">테스트 고유 ID (영문/숫자)</label>
                        <input
                          type="text"
                          value={editingTestId}
                          onChange={(e) => setEditingTestId(e.target.value)}
                          placeholder="e.g. weekend_mood"
                          disabled={selectedTest !== null}
                          className="w-full bg-gray-50 border border-gray-300 h-10 px-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">테스트 메인 타이틀</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="이번 주말, 당신의 기분은?"
                          className="w-full bg-gray-50 border border-gray-300 h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">설명 (부제목)</label>
                        <input
                          type="text"
                          value={editSubtitle}
                          onChange={(e) => setEditSubtitle(e.target.value)}
                          placeholder="간단한 3가지 질문으로 매칭되는 커피를 찾아요..."
                          className="w-full bg-gray-50 border border-gray-300 h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">테스트 배너 이미지 경로</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editImageUrl}
                            onChange={(e) => setEditImageUrl(e.target.value)}
                            placeholder="/uploads/tastetest/test_banner.jpg"
                            className="flex-1 bg-gray-50 border border-gray-300 h-10 px-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <label className="bg-white hover:bg-gray-50 border border-gray-300 px-4 h-10 rounded-lg cursor-pointer flex items-center gap-2 shadow-sm text-sm font-bold text-gray-700 select-none shrink-0 transition-colors">
                            <Upload size={16} />
                            <span>{isUploading ? '업로드 중...' : '이미지 선택'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-3">
                        <input
                          type="checkbox"
                          id="editIsActive"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="editIsActive" className="text-sm font-bold text-gray-700">이 테스트를 활성화하여 홈 화면에 즉시 적용합니다.</label>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Question & Options Visual Builder */}
                  {activeTab === 'questions' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">질문 목록 편집</span>
                        <button onClick={handleAddQuestion} className="px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs font-bold flex items-center gap-1">
                          <Plus size={14} /> 질문 추가
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {editQuestions.map((question, qIdx) => (
                          <div key={qIdx} className="p-4 rounded-xl border border-gray-200 bg-gray-50 relative flex flex-col space-y-3">
                            <button
                              onClick={() => handleRemoveQuestion(qIdx)}
                              className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                            <span className="text-xs font-bold text-indigo-600 uppercase">문항 {question.questionNumber}</span>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">질문 한글</label>
                                <input
                                  type="text"
                                  value={question.contentKo}
                                  onChange={(e) => handleQuestionTextChange(qIdx, 'Ko', e.target.value)}
                                  className="w-full bg-white border border-gray-300 h-9 px-2 rounded-lg text-sm focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">질문 영문</label>
                                <input
                                  type="text"
                                  value={question.contentEn}
                                  onChange={(e) => handleQuestionTextChange(qIdx, 'En', e.target.value)}
                                  className="w-full bg-white border border-gray-300 h-9 px-2 rounded-lg text-sm focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Options List inside Question */}
                            <div className="border-t border-gray-200 pt-3">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">선택지 및 맛 스코어 가중치</span>
                              <div className="space-y-3">
                                {question.options.map((option, oIdx) => (
                                  <div key={oIdx} className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">{option.optionLetter}</span>
                                      <input
                                        type="text"
                                        value={option.contentKo}
                                        onChange={(e) => handleOptionChange(qIdx, oIdx, 'contentKo', e.target.value)}
                                        placeholder="한글 답변"
                                        className="flex-1 min-w-0 bg-gray-50 border border-gray-300 h-8 px-2 rounded text-xs"
                                      />
                                      <input
                                        type="text"
                                        value={option.contentEn}
                                        onChange={(e) => handleOptionChange(qIdx, oIdx, 'contentEn', e.target.value)}
                                        placeholder="영문 답변"
                                        className="flex-1 min-w-0 bg-gray-50 border border-gray-300 h-8 px-2 rounded text-xs"
                                      />
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                      <div>
                                        <label className="text-[9px] font-bold text-gray-400">산미</label>
                                        <input
                                          type="number"
                                          value={option.weightAcidity}
                                          onChange={(e) => handleOptionChange(qIdx, oIdx, 'weightAcidity', parseInt(e.target.value) || 0)}
                                          className="w-full bg-gray-50 border border-gray-200 h-7 rounded text-xs text-center"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-gray-400">단맛</label>
                                        <input
                                          type="number"
                                          value={option.weightSweetness}
                                          onChange={(e) => handleOptionChange(qIdx, oIdx, 'weightSweetness', parseInt(e.target.value) || 0)}
                                          className="w-full bg-gray-50 border border-gray-200 h-7 rounded text-xs text-center"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-gray-400">쓴맛</label>
                                        <input
                                          type="number"
                                          value={option.weightBitterness}
                                          onChange={(e) => handleOptionChange(qIdx, oIdx, 'weightBitterness', parseInt(e.target.value) || 0)}
                                          className="w-full bg-gray-50 border border-gray-200 h-7 rounded text-xs text-center"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-gray-400">바디</label>
                                        <input
                                          type="number"
                                          value={option.weightBody}
                                          onChange={(e) => handleOptionChange(qIdx, oIdx, 'weightBody', parseInt(e.target.value) || 0)}
                                          className="w-full bg-gray-50 border border-gray-200 h-7 rounded text-xs text-center"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Results Customizer */}
                  {activeTab === 'results' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">결과 커피 성향 매핑 룰</span>
                        <button onClick={handleAddResult} className="px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs font-bold flex items-center gap-1">
                          <Plus size={14} /> 결과 카드 추가
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {editResults.map((result, rIdx) => (
                          <div key={rIdx} className="p-4 rounded-xl border border-gray-200 bg-gray-50 relative flex flex-col space-y-3">
                            <button
                              onClick={() => handleRemoveResult(rIdx)}
                              className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">성향 코드 ID (영문)</label>
                                <input
                                  type="text"
                                  value={result.id}
                                  onChange={(e) => handleResultChange(rIdx, 'id', e.target.value)}
                                  placeholder="e.g. FRUITY_LIGHT"
                                  className="w-full bg-white border border-gray-300 h-8 px-2 rounded text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">성향 한글 이름</label>
                                <input
                                  type="text"
                                  value={result.resultNameKo}
                                  onChange={(e) => handleResultChange(rIdx, 'resultNameKo', e.target.value)}
                                  className="w-full bg-white border border-gray-300 h-8 px-2 rounded text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">성향 영문 이름</label>
                                <input
                                  type="text"
                                  value={result.resultNameEn}
                                  onChange={(e) => handleResultChange(rIdx, 'resultNameEn', e.target.value)}
                                  className="w-full bg-white border border-gray-300 h-8 px-2 rounded text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">성향 상세 설명 (한글)</label>
                                <textarea
                                  value={result.descriptionKo}
                                  onChange={(e) => handleResultChange(rIdx, 'descriptionKo', e.target.value)}
                                  className="w-full bg-white border border-gray-300 p-2 rounded text-xs h-16 resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">성향 상세 설명 (영문)</label>
                                <textarea
                                  value={result.descriptionEn}
                                  onChange={(e) => handleResultChange(rIdx, 'descriptionEn', e.target.value)}
                                  className="w-full bg-white border border-gray-300 p-2 rounded text-xs h-16 resize-none"
                                />
                              </div>
                            </div>

                            {/* Score Boundaries */}
                            <div className="border-t border-gray-200 pt-3">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">맛 점수 매칭 경계 (최소/최대 조건)</span>
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                  <label className="text-[9px] font-bold text-gray-400 block mb-0.5">산미 범위 (Min-Max)</label>
                                  <div className="flex items-center gap-1">
                                    <input type="number" placeholder="Min" value={result.targetAcidityMin ?? ''} onChange={(e) => handleResultChange(rIdx, 'targetAcidityMin', e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-white border h-7 text-center rounded text-xs" />
                                    <span>-</span>
                                    <input type="number" placeholder="Max" value={result.targetAcidityMax ?? ''} onChange={(e) => handleResultChange(rIdx, 'targetAcidityMax', e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-white border h-7 text-center rounded text-xs" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-gray-400 block mb-0.5">단맛 범위 (Min-Max)</label>
                                  <div className="flex items-center gap-1">
                                    <input type="number" placeholder="Min" value={result.targetSweetnessMin ?? ''} onChange={(e) => handleResultChange(rIdx, 'targetSweetnessMin', e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-white border h-7 text-center rounded text-xs" />
                                    <span>-</span>
                                    <input type="number" placeholder="Max" value={result.targetSweetnessMax ?? ''} onChange={(e) => handleResultChange(rIdx, 'targetSweetnessMax', e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-white border h-7 text-center rounded text-xs" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-gray-400 block mb-0.5">쓴맛 범위 (Min-Max)</label>
                                  <div className="flex items-center gap-1">
                                    <input type="number" placeholder="Min" value={result.targetBitternessMin ?? ''} onChange={(e) => handleResultChange(rIdx, 'targetBitternessMin', e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-white border h-7 text-center rounded text-xs" />
                                    <span>-</span>
                                    <input type="number" placeholder="Max" value={result.targetBitternessMax ?? ''} onChange={(e) => handleResultChange(rIdx, 'targetBitternessMax', e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-white border h-7 text-center rounded text-xs" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-gray-400 block mb-0.5">바디 범위 (Min-Max)</label>
                                  <div className="flex items-center gap-1">
                                    <input type="number" placeholder="Min" value={result.targetBodyMin ?? ''} onChange={(e) => handleResultChange(rIdx, 'targetBodyMin', e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-white border h-7 text-center rounded text-xs" />
                                    <span>-</span>
                                    <input type="number" placeholder="Max" value={result.targetBodyMax ?? ''} onChange={(e) => handleResultChange(rIdx, 'targetBodyMax', e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-white border h-7 text-center rounded text-xs" />
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Footer Save Area */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <button onClick={handleSaveTest} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-sm text-sm transition-all">
                    <Save size={16} /> 테스트 정보 저장하기
                  </button>
                </div>

              </div>
            </div>

          </div>
        );
  };

  if (isEmbedded) {
    return <div className="font-sans text-gray-900">{renderContent()}</div>;
  }

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
            <h1 className="text-2xl font-bold text-gray-900">주간 커피 TASTE TEST 관리</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddNewTestInit} className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm text-sm font-bold">
              <Plus size={16} /> 새 테스트 추가
            </button>
            <button onClick={fetchTests} className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 flex items-center gap-2 shadow-sm text-sm text-gray-700">
              <RefreshCw size={16} /> 새로고침
            </button>
          </div>
        </header>

        {renderContent()}
      </div>
    </div>
  );
}
