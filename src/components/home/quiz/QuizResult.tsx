import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Check, X, ChevronDown, ChevronUp, AlertCircle, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuizResultProps {
  result: {
    correctCount: number;
    earnedBeans: number;
    doubleAttempted: boolean;
    isSuccess: boolean;
    details: Array<{
      questionId: string;
      questionText: string;
      chosenOption: number | null;
      correctAnswer: number;
      isCorrect: boolean;
      explanation: string;
    }>;
  };
  onClose: () => void;
}

const QuizResult: React.FC<QuizResultProps> = ({ result, onClose }) => {
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const getWagerMessage = () => {
    if (!result.doubleAttempted) return '안전하게 수령 완료!';
    return result.isSuccess ? '🔥 더블 챌린지 성공! 2배 적립 잭팟!' : '⚠️ 더블 챌린지 오답으로 Beans 소실';
  };

  return (
    <div className="flex flex-col space-y-6 max-h-[80vh] overflow-y-auto hide-scrollbar px-1">
      {/* Header Result Aura */}
      <div className="text-center py-4 bg-espresso-900/50 rounded-3xl border border-espresso-800/40 p-5 space-y-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Award size={36} strokeWidth={1.5} />
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-espresso-200 text-xs font-black tracking-widest uppercase">퀴즈 챌린지 결과</h3>
          <p className="text-[26px] font-serif font-black text-white">
            {result.correctCount} / 5 정답!
          </p>
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${result.doubleAttempted && !result.isSuccess ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
            {getWagerMessage()}
          </span>
        </div>

        {/* Earned Beans Box */}
        <div className="bg-espresso-950/60 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 max-w-[200px] mx-auto border border-espresso-800/50 mt-2">
          <Coins size={18} className="text-amber-500" />
          <span className="font-mono font-black text-[18px] text-amber-400">
            +{result.earnedBeans} Beans
          </span>
        </div>
      </div>

      {/* Explanations List */}
      <div className="space-y-3">
        <h4 className="text-[12px] font-black text-espresso-400 tracking-wider uppercase px-1">오답 정리 및 원두 정보 해설</h4>
        
        {result.details.map((detail, idx) => (
          <div 
            key={detail.questionId}
            className="bg-espresso-900 border border-espresso-850 rounded-2xl overflow-hidden shadow-sm"
          >
            <div 
              onClick={() => toggleExpand(idx)}
              className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-espresso-850/50 transition-colors"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${detail.isCorrect ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {detail.isCorrect ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] font-bold text-espresso-400 mb-0.5">Q{idx + 1} {idx === 4 && '더블 찬스 문제'}</span>
                  <p className="text-[13px] font-medium text-espresso-50 leading-relaxed truncate">{detail.questionText}</p>
                </div>
              </div>

              <div className="text-espresso-400">
                {expandedIndex === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {expandedIndex === idx && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="px-4 pb-4 pt-1 border-t border-espresso-850 bg-espresso-950/40 text-[12px] text-espresso-200 leading-relaxed space-y-2.5"
              >
                <div className="flex items-center gap-2 font-medium bg-espresso-900 p-2 rounded-lg">
                  <span className="text-espresso-400">선택한 답: <strong className={detail.isCorrect ? 'text-emerald-400' : 'text-red-400'}>{detail.chosenOption || '무응답'}</strong></span>
                  <div className="w-[1px] h-3 bg-espresso-800" />
                  <span className="text-espresso-400">올바른 정답: <strong className="text-amber-400">{detail.correctAnswer}번</strong></span>
                </div>
                
                <div className="pl-1">
                  <span className="block font-bold text-amber-500/90 mb-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    커피 해설 및 상식
                  </span>
                  <p className="text-espresso-300 font-medium whitespace-pre-wrap">{detail.explanation || '등록된 해설 정보가 없습니다.'}</p>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-4">
        <button 
          onClick={onClose}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-espresso-950 font-black rounded-2xl text-[15px] shadow-lg transition-colors active:scale-98"
        >
          챌린지 종료 및 홈으로
        </button>
      </div>
    </div>
  );
};

export default QuizResult;
