import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, ArrowLeft, Save, Upload, Download, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '@/utils/apiConfig';
import * as XLSX from 'xlsx';

export default function AdminSettings() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [policy, setPolicy] = useState({
        welcomeBeans: 0,
        welcomeFreePrescriptions: 3,
        prescriptionCost: 100,
        reviewReward: 50,
        p2pFeePercent: 0,
        exchangeRate: 1,
        minExchangeAmount: 10000,
        adFrequencyCapHours: 24
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    
    const [systemSettings, setSystemSettings] = useState({
        isHotspotFeatureEnabled: true,
        spamRateLimitCount: 5,
        spamRateLimitTimeMs: 60000,
        autoBlindReportCount: 5
    });
    const [isSavingSystem, setIsSavingSystem] = useState(false);

    // Banned Words state
    const [bannedWords, setBannedWords] = useState<any[]>([]);
    const [newBannedWord, setNewBannedWord] = useState('');
    const [newBannedCategory, setNewBannedCategory] = useState('PROFANITY');
    const [isWordsLoading, setIsWordsLoading] = useState(false);
    
    // Edit state
    const [editingWordId, setEditingWordId] = useState<string | null>(null);
    const [editWordText, setEditWordText] = useState('');
    const [editWordCategory, setEditWordCategory] = useState('');

    // Backup state
    const [backupData, setBackupData] = useState({
        backupType: 'full',
        tableName: '',
        savePath: 'C:\\tmp',
        fileName: `backup_${new Date().toISOString().slice(0, 10)}.sql`
    });
    const [isBackingUp, setIsBackingUp] = useState(false);

    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const alertShown = useRef(false);

    // Admin Access Check
    useEffect(() => {
        if (!token) {
            navigate('/');
        } else if (currentUser.role !== 'ADMIN') {
            if (!alertShown.current) {
                alertShown.current = true;
                alert(t('admin_dashboard.error_login_req'));
            }
            navigate(-1);
        } else {
            fetchPolicy();
            fetchSystemSettings();
            fetchBannedWords();
        }
    }, [navigate, token, currentUser.role, t]);

    const fetchPolicy = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/point-policy`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert('세션이 만료되었습니다. 다시 로그인해주세요.');
                window.location.href = '/';
                return;
            }

            if (!res.ok) throw new Error('Failed to load settings.');

            const data = await res.json();
            setPolicy({
                welcomeBeans: data.welcomeBeans || 0,
                welcomeFreePrescriptions: data.welcomeFreePrescriptions || 3,
                prescriptionCost: data.prescriptionCost || 0,
                reviewReward: data.reviewReward || 0,
                p2pFeePercent: data.p2pFeePercent || 0,
                exchangeRate: data.exchangeRate || 1,
                minExchangeAmount: data.minExchangeAmount || 10000,
                adFrequencyCapHours: data.adFrequencyCapHours !== undefined ? data.adFrequencyCapHours : 24
            });
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ text: '', type: '' });
        try {
            const res = await fetch(`${API_BASE}/api/admin/point-policy`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(policy)
            });

            if (!res.ok) throw new Error('Failed to save settings.');

            setMessage({ text: '통합 정책이 성공적으로 저장되었습니다.', type: 'success' });
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const fetchSystemSettings = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setSystemSettings(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSystemSettingsSave = async () => {
        setIsSavingSystem(true);
        setMessage({ text: '', type: '' });
        try {
            const res = await fetch(`${API_BASE}/api/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(systemSettings)
            });
            if (!res.ok) throw new Error('Failed to save system settings.');
            setMessage({ text: '시스템 환경설정이 성공적으로 저장되었습니다.', type: 'success' });
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setIsSavingSystem(false);
        }
    };

    const fetchBannedWords = async () => {
        try {
            setIsWordsLoading(true);
            const res = await fetch(`${API_BASE}/api/admin/banned-words`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setBannedWords(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsWordsLoading(false);
        }
    };

    const handleAddBannedWord = async () => {
        if (!newBannedWord.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/banned-words`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ word: newBannedWord.trim(), category: newBannedCategory })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to add banned word');
            }
            
            setMessage({ text: '금칙어가 추가되었습니다.', type: 'success' });
            setNewBannedWord('');
            fetchBannedWords();
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        }
    };

    const handleDeleteBannedWord = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/banned-words/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to delete banned word');
            fetchBannedWords();
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        }
    };

    const handleEditStart = (bw: any) => {
        setEditingWordId(bw.id);
        setEditWordText(bw.word);
        setEditWordCategory(bw.category);
    };

    const handleEditSave = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/banned-words/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ word: editWordText.trim(), category: editWordCategory })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update banned word');
            }
            
            setEditingWordId(null);
            fetchBannedWords();
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        }
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsWordsLoading(true);
        setMessage({ text: '엑셀 파일을 분석 중입니다...', type: 'success' });

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                
                // Get 2D array
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
                
                const wordsToUpload: any[] = [];
                let skipCount = 0;

                data.forEach((row, index) => {
                    // Skip empty rows
                    if (!row || row.length === 0 || !row[0]) return;
                    
                    const word = String(row[0]).trim();
                    const categoryRaw = row[1] ? String(row[1]).toUpperCase() : 'PROFANITY';
                    const localeRaw = row[2] ? String(row[2]).toLowerCase() : 'ko';

                    // Very basic header detection: if the first row says 'word', '금칙어', '금지어', etc., skip it
                    if (index === 0 && ['word', '금칙어', '단어', '금지어'].includes(word.toLowerCase())) {
                        skipCount++;
                        return;
                    }

                    // Map common Korean category inputs to Enum
                    let mappedCategory = 'PROFANITY';
                    if (categoryRaw.includes('정치') || categoryRaw === 'POLITICS') mappedCategory = 'POLITICS';
                    else if (categoryRaw.includes('혐오') || categoryRaw.includes('차별') || categoryRaw === 'SLUR') mappedCategory = 'SLUR';
                    else if (categoryRaw.includes('기타') || categoryRaw.includes('스팸') || categoryRaw === 'ETC') mappedCategory = 'ETC';
                    
                    wordsToUpload.push({
                        word,
                        category: mappedCategory,
                        locale: localeRaw
                    });
                });

                if (wordsToUpload.length === 0) {
                    throw new Error('업로드할 유효한 단어가 없습니다.');
                }

                setMessage({ text: `${wordsToUpload.length}개 단어를 서버로 전송 중...`, type: 'success' });

                const res = await fetch(`${API_BASE}/api/admin/banned-words/bulk`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ words: wordsToUpload })
                });

                if (!res.ok) {
                    throw new Error('서버 전송 중 오류가 발생했습니다.');
                }

                const resultData = await res.json();
                setMessage({ 
                    text: `업로드 완료: ${resultData.insertedCount}개 추가됨 (중복제외: ${resultData.skippedCount}개)`, 
                    type: 'success' 
                });
                
                fetchBannedWords();
            } catch (error: any) {
                console.error(error);
                setMessage({ text: '엑셀 처리 중 오류 발생: ' + error.message, type: 'error' });
                setIsWordsLoading(false);
            }
            
            // clear input
            e.target.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            ["금칙어(필수)", "카테고리(선택)", "언어코드(선택)"],
            ["(예시) 비속어", "비속어", "ko"],
            ["(예시) 정치단어", "정치", "ko"],
            ["(예시) 혐오단어", "혐오", "ko"],
            ["(예시) 스팸단어", "기타", "ko"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        // Set column widths
        ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "금칙어_양식");
        XLSX.writeFile(wb, "금칙어_대량등록_양식.xlsx");
    };

    const handleChange = (field: string, value: string) => {
        setPolicy(prev => ({
            ...prev,
            [field]: Number(value)
        }));
    };

    const handleBackupChange = (field: string, value: string) => {
        setBackupData(prev => ({ ...prev, [field]: value }));
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        setMessage({ text: '', type: '' });
        try {
            const res = await fetch(`${API_BASE}/api/admin/backup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(backupData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Backup failed.');

            setMessage({ text: `데이터베이스 백업 성공! 저장 위치: ${data.path}`, type: 'success' });
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <div className="h-full w-full bg-espresso-950 overflow-y-auto pb-safe font-sans">
            <div className="max-w-7xl mx-auto flex flex-col min-h-full">
                {/* Header */}
                <header className="px-6 py-6 pt-safe mt-4 shrink-0 border-b border-espresso-700 bg-espresso-950 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-espresso-900 flex items-center justify-center border border-coffee-100 text-coffee-600 hover:bg-espresso-950 transition-colors shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <Database className="text-espresso-50" size={28} />
                        <h1 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">통합 정책 설정</h1>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 p-6 space-y-8 animate-in fade-in duration-300">
                    {message.text && (
                        <div className={`p-4 text-sm font-medium rounded-2xl border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                            {message.text}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 rounded-full border-4 border-espresso-700 border-t-amber-100 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Section: System Features */}
                            <div className="bg-espresso-900 p-5 rounded-3xl border border-coffee-100 shadow-sm space-y-4">
                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2">시스템 기능 환경설정 (System Features)</h2>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-semibold text-espresso-300">실시간 인기 카페 '히트맵' 연동 (Hotspots)</label>
                                        <p className="text-xs text-coffee-400 mt-1">CoffeeTalk '근처 라이브' 필터 상단에 실시간 히트맵 지도를 활성화합니다.</p>
                                    </div>
                                    <button 
                                        onClick={() => setSystemSettings(prev => ({ ...prev, isHotspotFeatureEnabled: !prev.isHotspotFeatureEnabled }))}
                                        className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${systemSettings.isHotspotFeatureEnabled ? 'bg-amber-400' : 'bg-espresso-800'}`}
                                    >
                                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${systemSettings.isHotspotFeatureEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <button 
                                    onClick={handleSystemSettingsSave}
                                    disabled={isSavingSystem}
                                    className="w-full py-3 mt-4 bg-espresso-700 text-amber-100 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-espresso-600 transition-colors disabled:opacity-50"
                                >
                                    {isSavingSystem ? '저장 중...' : <><Save size={18} /> 시스템 기능 병경사항 적용</>}
                                </button>
                            </div>

                            {/* Section: Moderation Config */}
                            <div className="bg-espresso-900 p-5 rounded-3xl border border-coffee-100 shadow-sm space-y-4">
                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2">커뮤니티 검열 및 도배 방어 기준 (Moderation)</h2>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-espresso-300 mb-1">도배 방어 1단계: 분당 허용 작성 수 (회)</label>
                                    <input 
                                        type="number" 
                                        value={systemSettings.spamRateLimitCount || 5}
                                        onChange={(e) => setSystemSettings(prev => ({ ...prev, spamRateLimitCount: Number(e.target.value) }))}
                                        className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                    />
                                    <p className="text-xs text-coffee-400 mt-1">1분 이내에 이 횟수를 초과하여 글/댓글 작성 시 자동으로 차단되며 'SpamLogs'에 기록됩니다.</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-espresso-300 mb-1">신고 누적 3단계: 자동 블라인드 기준 (회)</label>
                                    <input 
                                        type="number" 
                                        value={systemSettings.autoBlindReportCount || 5}
                                        onChange={(e) => setSystemSettings(prev => ({ ...prev, autoBlindReportCount: Number(e.target.value) }))}
                                        className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                    />
                                    <p className="text-xs text-coffee-400 mt-1">특정 게시물이나 댓글에 이 횟수만큼 신고가 누적되면 자동으로 숨김 처리(블라인드)됩니다.</p>
                                </div>

                                <button 
                                    onClick={handleSystemSettingsSave}
                                    disabled={isSavingSystem}
                                    className="w-full py-3 mt-4 bg-espresso-700 text-amber-100 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-espresso-600 transition-colors disabled:opacity-50"
                                >
                                    {isSavingSystem ? '저장 중...' : <><Save size={18} /> 시스템 및 검열 기능 환경설정 적용</>}
                                </button>
                            </div>

                            {/* Section: Welcome Bonus */}
                            <div className="bg-espresso-900 p-5 rounded-3xl border border-coffee-100 shadow-sm space-y-4">
                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2">회원가입 정책 (Welcome Bonus)</h2>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-espresso-300 mb-1">가입 축하 지급 커피콩 (Beans)</label>
                                    <input 
                                        type="number" 
                                        value={policy.welcomeBeans}
                                        onChange={(e) => handleChange('welcomeBeans', e.target.value)}
                                        className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                    />
                                    <p className="text-xs text-coffee-400 mt-1">계정 생성 시 즉시 지급되는 보너스</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-espresso-300 mb-1">무료 처방전 발급 횟수</label>
                                    <input 
                                        type="number" 
                                        value={policy.welcomeFreePrescriptions}
                                        onChange={(e) => handleChange('welcomeFreePrescriptions', e.target.value)}
                                        className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                    />
                                    <p className="text-xs text-coffee-400 mt-1">이 횟수를 초과한 AI 큐레이팅 저장 시 비용 청구</p>
                                </div>
                            </div>

                            {/* Section: Costs & Rewards */}
                            <div className="bg-espresso-900 p-5 rounded-3xl border border-coffee-100 shadow-sm space-y-4">
                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2">서비스 가치 (Costs & Rewards)</h2>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-espresso-300 mb-1">1회 AI 처방전 발급 비용 (Beans)</label>
                                    <input 
                                        type="number" 
                                        value={policy.prescriptionCost}
                                        onChange={(e) => handleChange('prescriptionCost', e.target.value)}
                                        className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-espresso-300 mb-1">카페 리뷰 작성 보상 (Beans)</label>
                                    <input 
                                        type="number" 
                                        value={policy.reviewReward}
                                        onChange={(e) => handleChange('reviewReward', e.target.value)}
                                        className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                    />
                                </div>
                            </div>

                            {/* Section: Economy */}
                            <div className="bg-espresso-900 p-5 rounded-3xl border border-coffee-100 shadow-sm space-y-4">
                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2">커피콩 경제 (Economy)</h2>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-espresso-300 mb-1">선물 이체 수수료율 (%)</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        value={policy.p2pFeePercent}
                                        onChange={(e) => handleChange('p2pFeePercent', e.target.value)}
                                        className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                    />
                                    <p className="text-xs text-coffee-400 mt-1">유저간 콩 선물 시 차감되는 시스템 수수료</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-espresso-300 mb-1">환전 비율 (1콩=원)</label>
                                        <input 
                                            type="number" 
                                            value={policy.exchangeRate}
                                            onChange={(e) => handleChange('exchangeRate', e.target.value)}
                                            className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-espresso-300 mb-1">최소 환전 수량</label>
                                        <input 
                                            type="number" 
                                            value={policy.minExchangeAmount}
                                            onChange={(e) => handleChange('minExchangeAmount', e.target.value)}
                                            className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Advertisement Settings Section */}
                            <div className="bg-[#121215] rounded-3xl border border-espresso-800 p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none"></div>
                                
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">광고 정책 설정</h3>
                                        <p className="text-sm text-coffee-400">자체 광고 빈도 등 글로벌 광고 정책</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-coffee-300 mb-2">
                                            광고 노출 빈도 제한 (시간)
                                        </label>
                                        <input 
                                            type="number" 
                                            value={policy.adFrequencyCapHours}
                                            onChange={(e) => handleChange('adFrequencyCapHours', e.target.value)}
                                            className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                        />
                                        <p className="text-xs text-coffee-400 mt-1">유저 피로도 방지를 위해 동일 광고 재노출을 제한할 시간(기본 24시간)</p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleSave}
                                disabled={isSaving || isBackingUp}
                                className="w-full py-4 mt-4 bg-amber-100 text-espresso-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                {isSaving ? '저장 중...' : (
                                    <>
                                        <Save size={20} />
                                        통합 정책 저장
                                    </>
                                )}
                            </button>

                            {/* Section: Content Moderation */}
                            <div className="bg-espresso-900 p-5 rounded-3xl border border-coffee-100 shadow-sm space-y-4 mt-8">
                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2 flex items-center gap-2">
                                    커뮤니티 검열 금칙어 (Auto-Moderation)
                                </h2>
                                
                                <div className="flex gap-2 w-full">
                                    <select 
                                        value={newBannedCategory} 
                                        onChange={(e) => setNewBannedCategory(e.target.value)}
                                        className="shrink-0 bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-3 py-2 text-sm focus:outline-none w-24 sm:w-auto"
                                    >
                                        <option value="PROFANITY">비속어</option>
                                        <option value="POLITICS">정치적</option>
                                        <option value="SLUR">혐오/차별</option>
                                        <option value="ETC">기타 스팸</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        value={newBannedWord}
                                        onChange={(e) => setNewBannedWord(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddBannedWord()}
                                        placeholder="새로운 금칙어 입력"
                                        className="flex-1 min-w-0 bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-2 focus:outline-none focus:border-amber-100 font-medium" 
                                    />
                                    <button 
                                        onClick={handleAddBannedWord}
                                        className="shrink-0 bg-amber-400 text-espresso-900 font-bold px-4 py-2 rounded-xl whitespace-nowrap hover:bg-amber-300"
                                    >
                                        추가
                                    </button>
                                </div>
                                <div className="flex justify-between items-start mt-2 border-b border-espresso-800 pb-4 mb-4">
                                    <div className="text-xs text-coffee-400">
                                        <p>💡 엑셀 업로드 안내:</p>
                                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                            <li>템플릿 양식을 다운로드하여 작성 후 업로드하세요.</li>
                                            <li>이미 등록된 단어는 자동으로 중복 제외됩니다.</li>
                                        </ul>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleDownloadTemplate}
                                            className="bg-espresso-950 text-amber-200/80 hover:bg-espresso-800 font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 border border-espresso-700 transition-colors"
                                        >
                                            <Download size={16} /> 템플릿 양식 받기
                                        </button>
                                        <label className="cursor-pointer bg-espresso-800 text-espresso-200 hover:bg-espresso-700 font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 border border-espresso-700 transition-colors">
                                            <Upload size={16} /> 엑셀 대량 등록 (.xlsx)
                                            <input 
                                                type="file" 
                                                accept=".xlsx, .xls, .csv" 
                                                className="hidden" 
                                                onChange={handleExcelUpload}
                                            />
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                                    {isWordsLoading ? (
                                        <div className="text-center text-espresso-300 text-sm py-4">로딩 중...</div>
                                    ) : !newBannedWord.trim() ? (
                                        <div className="text-center text-espresso-400 text-sm py-8 bg-espresso-950/50 rounded-xl border border-dashed border-espresso-800">
                                            🔍 검색할 단어를 상단 입력창에 입력하세요.<br/>
                                            <span className="text-xs mt-1 text-espresso-500">입력된 문자가 포함된 금칙어가 이곳에 나타납니다.</span>
                                        </div>
                                    ) : (() => {
                                        const filteredWords = bannedWords.filter(bw => bw.word.includes(newBannedWord.trim()));
                                        if (filteredWords.length === 0) {
                                            return (
                                                <div className="text-center text-amber-500/80 text-sm py-8 bg-espresso-950/50 rounded-xl border border-dashed border-espresso-800">
                                                    일치하는 금칙어가 없습니다.<br/>우측 상단의 <b>[추가]</b> 버튼을 눌러 새로 등록하세요.
                                                </div>
                                            );
                                        }
                                        return filteredWords.map(bw => (
                                            <div key={bw.id} className="flex items-center justify-between bg-espresso-950 p-3 rounded-xl border border-espresso-800">
                                                {editingWordId === bw.id ? (
                                                    <div className="flex flex-1 items-center gap-2 mr-2 min-w-0">
                                                        <select
                                                            value={editWordCategory}
                                                            onChange={(e) => setEditWordCategory(e.target.value)}
                                                            className="shrink-0 bg-espresso-900 border border-espresso-700 rounded px-2 py-1 text-xs text-amber-100 w-20 sm:w-auto"
                                                        >
                                                            <option value="PROFANITY">비속어</option>
                                                            <option value="POLITICS">정치적</option>
                                                            <option value="SLUR">혐오/차별</option>
                                                            <option value="ETC">기타 스팸</option>
                                                        </select>
                                                        <input 
                                                            type="text" 
                                                            value={editWordText}
                                                            onChange={(e) => setEditWordText(e.target.value)}
                                                            className="flex-1 min-w-0 bg-espresso-900 border border-espresso-700 rounded px-2 py-1 text-sm text-espresso-50 focus:outline-none focus:border-amber-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs px-2 py-1 bg-red-900/50 text-red-200 rounded-md font-bold shrink-0">{bw.category}</span>
                                                        <span className="text-sm text-espresso-50 font-bold break-all">{bw.word}</span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {editingWordId === bw.id ? (
                                                        <>
                                                            <button 
                                                                onClick={() => handleEditSave(bw.id)}
                                                                className="text-amber-400 hover:text-amber-300 text-xs px-2 py-1 font-bold bg-amber-500/10 rounded"
                                                            >
                                                                저장
                                                            </button>
                                                            <button 
                                                                onClick={() => setEditingWordId(null)}
                                                                className="text-espresso-300 hover:text-espresso-100 text-xs px-2 py-1"
                                                            >
                                                                취소
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button 
                                                                onClick={() => handleEditStart(bw)}
                                                                className="text-espresso-300 hover:text-amber-400 text-xs px-2 py-1"
                                                            >
                                                                수정
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteBannedWord(bw.id)}
                                                                className="text-espresso-300 hover:text-red-400 text-xs px-2 py-1"
                                                            >
                                                                삭제
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    })()}
                                </div>
                            </div>

                            {/* Section: Database Backup */}
                            <div className="bg-espresso-900 p-5 rounded-3xl border border-coffee-100 shadow-sm space-y-4 mt-8">
                                <h2 className="text-lg font-bold text-amber-100 mb-2 border-b border-espresso-700 pb-2 flex items-center gap-2">
                                    <Database size={20} />
                                    데이터베이스 백업 (Database Backup)
                                </h2>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-espresso-300 mb-1">백업 유형 (Backup Type)</label>
                                    <select 
                                        value={backupData.backupType}
                                        onChange={(e) => handleBackupChange('backupType', e.target.value)}
                                        className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium appearance-none"
                                    >
                                        <option value="full">전체 데이터베이스 (Full DB Data + Schema)</option>
                                        <option value="schema">데이터베이스 스키마 (Schema Only)</option>
                                        <option value="table">특정 테이블 (Table Only)</option>
                                    </select>
                                </div>

                                {backupData.backupType === 'table' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-espresso-300 mb-1">테이블 이름 (Table Name)</label>
                                        <input 
                                            type="text" 
                                            value={backupData.tableName}
                                            onChange={(e) => handleBackupChange('tableName', e.target.value)}
                                            placeholder="예: User, Shop..."
                                            className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                        />
                                    </div>
                                )}
                                
                                <div>
                                    <label className="block text-sm font-semibold text-espresso-300 mb-1">백업 저장 폴더 (Save Directory Path)</label>
                                    <input 
                                        type="text" 
                                        value={backupData.savePath}
                                        onChange={(e) => handleBackupChange('savePath', e.target.value)}
                                        placeholder="C:\tmp"
                                        className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                    />
                                    <p className="text-xs text-coffee-400 mt-1">서버의 절대 경로나 상대 경로를 입력하세요.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-espresso-300 mb-1">백업 파일명 (File Name)</label>
                                    <input 
                                        type="text" 
                                        value={backupData.fileName}
                                        onChange={(e) => handleBackupChange('fileName', e.target.value)}
                                        placeholder="backup_name.sql"
                                        className="w-full bg-espresso-950 text-espresso-50 border border-coffee-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100 font-medium" 
                                    />
                                </div>

                                <button 
                                    onClick={handleBackup}
                                    disabled={isSaving || isBackingUp}
                                    className="w-full py-4 mt-2 bg-espresso-700 text-amber-100 border border-amber-100/50 hover:bg-espresso-800 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                                >
                                    {isBackingUp ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-amber-100 border-t-transparent rounded-full animate-spin"></div>
                                            백업 진행 중...
                                        </span>
                                    ) : (
                                        <>데이터베이스 백업 실행</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
