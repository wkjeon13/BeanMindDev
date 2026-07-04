import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { API_BASE } from '../../../utils/apiConfig';
import DripTimer from './DripTimer';
import DoubleWager from './DoubleWager';
import QuizResult from './QuizResult';

interface QuizModalProps {
  quizSet: {
    id: string;
    title: string;
    themeRegion: string;
    questions: Array<{
      id: string;
      questionText: string;
      option1: string;
      option2: string;
      option3: string;
      option4: string;
      beansReward: number;
    }>;
  };
  onClose: () => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ quizSet, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionId: string; chosenOption: number | null }>>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isWagerState, setIsWagerState] = useState(false);
  const [wagerDecision, setWagerDecision] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Time Countdown Timer (15s per question)
  useEffect(() => {
    if (isWagerState || result || submitting) return;

    if (timeLeft === 0) {
      // Auto move to next on timeout (treat as null answer)
      handleAnswerSelect(null);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, currentIdx, isWagerState, result, submitting]);

  const handleAnswerSelect = (optionIdx: number | null) => {
    const currentQ = quizSet.questions[currentIdx];
    const updatedAnswers = [...answers, { questionId: currentQ.id, chosenOption: optionIdx }];
    setAnswers(updatedAnswers);

    if (currentIdx < 4) {
      // Move to next question
      setCurrentIdx(currentIdx + 1);
      setTimeLeft(15); // Reset timer
    } else {
      // 5th question finished. Check if user wants to play double-or-nothing
      setIsWagerState(true);
    }
  };

  const handleWagerDecision = async (wager: boolean) => {
    setWagerDecision(wager);
    setIsWagerState(false);
    setSubmitting(true);

    // Call submit answers API
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          setId: quizSet.id,
          answers,
          wagerDouble: wager
        })
      });

      if (res.ok) {
        const resultData = await res.json();
        setResult(resultData);
      } else {
        alert('답안 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
        onClose();
      }
    } catch (e) {
      alert('네트워크 오류가 발생했습니다.');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate current total accumulated points for the banner
  const getAccumulatedBeans = () => {
    let pts = 0;
    // We mock check local answers up to 4 questions (doesn't score on backend yet, but helps UI display)
    answers.forEach((ans, idx) => {
      if (ans.chosenOption !== null) {
        // Since we don't know correct answers on client side, we simply assume they accumulated standard beans for feedback
        pts += quizSet.questions[idx]?.beansReward || 10;
      }
    });
    return pts;
  };

  const currentQuestion = quizSet.questions[currentIdx];

  return (
    <div className="fixed inset-0 z-[200] bg-[#0c0704]/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-espresso-950 w-full sm:w-[420px] max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl border-t sm:border border-espresso-800 overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 pb-safe">
        {/* Header */}
        <div className="px-5 py-4 border-b border-espresso-800 flex items-center justify-between bg-espresso-900/60">
          <div>
            <h2 className="text-[15px] font-bold text-espresso-50">{quizSet.title}</h2>
            <span className="text-[9px] font-bold text-amber-500 tracking-wider block mt-0.5">WORLD COFFEE QUIZ</span>
          </div>
          {!result && !submitting && (
            <button onClick={onClose} className="p-2 -mr-2 text-espresso-400 hover:text-espresso-50 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          {submitting ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] text-espresso-300 font-medium">답안을 제출하고 포인트를 채점 중입니다...</p>
            </div>
          ) : result ? (
            <QuizResult result={result} onClose={onClose} />
          ) : isWagerState ? (
            <DoubleWager currentBeans={getAccumulatedBeans()} onDecision={handleWagerDecision} />
          ) : (
            <div className="space-y-6">
              {/* Progress and Timer */}
              <div className="flex items-center justify-between text-xs text-espresso-300 font-bold px-1">
                <span>QUESTION {currentIdx + 1} / 5</span>
                <span className="text-amber-500 tracking-wider">+{currentQuestion.beansReward} BEANS</span>
              </div>

              {/* Drip Timer animation */}
              <DripTimer timeLeft={timeLeft} totalTime={15} />

              {/* Question Text */}
              <div className="bg-espresso-900/40 border border-espresso-850 rounded-2xl p-5 min-h-[90px] flex items-center shadow-inner">
                <p className="text-[15px] font-medium text-espresso-50 leading-relaxed text-left w-full">
                  {currentQuestion.questionText}
                </p>
              </div>

              {/* 4 Options Buttons */}
              <div className="space-y-2.5 pt-2">
                {[1, 2, 3, 4].map(idx => {
                  const optionText = (currentQuestion as any)[`option${idx}`];
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(idx)}
                      className="w-full p-4 bg-espresso-900 border border-espresso-800 hover:border-amber-500/40 hover:bg-espresso-850 rounded-2xl text-[14px] font-medium text-espresso-100 text-left transition-all active:scale-[0.99] flex items-center justify-between group"
                    >
                      <span>{optionText}</span>
                      <span className="w-5 h-5 rounded-full border border-espresso-700 group-hover:border-amber-500/50 flex items-center justify-center text-[10px] text-espresso-400 group-hover:text-amber-400 transition-colors">
                        {idx}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizModal;
