import React, { useState, useEffect } from 'react';
import { Award, HelpCircle, ChevronRight, CheckCircle, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../utils/apiConfig';
import QuizModal from './quiz/QuizModal';

const QuizBannerCard = () => {
  const { t } = useTranslation();
  const [quizData, setQuizData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchQuizStatus = async () => {
    const token = localStorage.getItem('token');
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/api/quiz/today`, { headers });
      if (res.ok) {
        const data = await res.json();
        setQuizData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizStatus();
  }, []);

  if (loading || !quizData || !quizData.hasQuiz) return null;

  return (
    <section className="w-full py-2 px-4">
      <div 
        onClick={() => !quizData.hasAttempted && setIsModalOpen(true)}
        className={`bg-gradient-to-r from-[#1b110a] via-[#24170e] to-[#120a05] border border-espresso-700/60 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] relative overflow-hidden transition-all duration-300 ${quizData.hasAttempted ? 'opacity-80 cursor-default' : 'cursor-pointer hover:border-amber-500/30 hover:scale-[1.01]'}`}
      >
        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${quizData.hasAttempted ? 'bg-espresso-800 text-espresso-400' : 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]'}`}>
              {quizData.hasAttempted ? <CheckCircle size={24} /> : <HelpCircle size={24} strokeWidth={1.5} />}
            </div>
            
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase">
                {quizData.quizSet?.themeRegion === 'GLOBAL' ? 'Daily Curation Game' : `Expedition: ${quizData.quizSet?.themeRegion}`}
              </span>
              <h3 className="text-[16px] font-bold text-espresso-50 tracking-tight leading-snug">
                {quizData.quizSet?.title || '오늘의 커피 상식 퀴즈'}
              </h3>
              <p className="text-[11px] text-espresso-300 font-medium">
                {quizData.hasAttempted 
                  ? t('home.quiz_completed', '오늘의 퀴즈를 모두 완료했습니다!') 
                  : t('home.quiz_call_to_action', '5문제를 풀고 더블 Beans 찬스에 도전해 보세요.')}
              </p>
            </div>
          </div>

          {!quizData.hasAttempted && (
            <div className="w-8 h-8 rounded-full bg-espresso-800 flex items-center justify-center text-espresso-300 group-hover:text-amber-400 group-hover:bg-espresso-700 transition-colors">
              <ChevronRight size={16} />
            </div>
          )}
        </div>

        {/* 5-day streak indicator helper */}
        <div className="mt-4 pt-3.5 border-t border-espresso-800/40 flex items-center justify-between text-[11px] text-espresso-400 font-medium relative z-10">
          <span className="flex items-center gap-1">
            <Award size={13} className="text-amber-500" />
            최대 +100 Beans 보상
          </span>
          <span className="flex items-center gap-1 font-bold text-espresso-200">
            오늘의 문제 5개
          </span>
        </div>
      </div>

      {isModalOpen && (
        <QuizModal 
          quizSet={quizData.quizSet} 
          onClose={() => {
            setIsModalOpen(false);
            fetchQuizStatus(); // Refresh quiz status
          }} 
        />
      )}
    </section>
  );
};

export default QuizBannerCard;
