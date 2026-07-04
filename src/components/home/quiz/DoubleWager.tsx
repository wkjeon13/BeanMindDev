import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, ShieldCheck, Coins } from 'lucide-react';

interface DoubleWagerProps {
  currentBeans: number;
  onDecision: (wager: boolean) => void;
}

const DoubleWager: React.FC<DoubleWagerProps> = ({ currentBeans, onDecision }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-6">
      {/* Golden Pulse Aura */}
      <motion.div 
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.6)]"
      >
        <Sparkles size={40} className="text-black" />
      </motion.div>

      <div className="space-y-2">
        <span className="text-[11px] font-black tracking-[0.3em] text-amber-400 uppercase">Double or Nothing</span>
        <h3 className="text-[20px] font-serif font-black text-white leading-tight">
          더블 챌린지 도전!
        </h3>
        <p className="text-[13px] text-espresso-200 max-w-[85%] mx-auto leading-relaxed">
          마지막 5번째 문제는 훨씬 더 특별합니다. <br />
          도전 시 정답을 맞추면 오늘 보상의 **2배**를 획득하지만, <br />
          틀릴 경우 **모든 보상이 소실**됩니다!
        </p>
      </div>

      <div className="bg-espresso-900 border border-espresso-800 rounded-2xl p-4 w-full max-w-[280px] flex items-center justify-around">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-espresso-400 font-bold">도전 수락 성공 시</span>
          <div className="flex items-center gap-1 text-amber-400 font-black text-sm">
            <Coins size={14} />
            <span>+{currentBeans * 2} Beans</span>
          </div>
        </div>
        <div className="w-[1px] h-8 bg-espresso-800" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-espresso-400 font-bold">실패 또는 포기 시</span>
          <div className="flex items-center gap-1 text-espresso-300 text-sm font-semibold">
            <span>{currentBeans} Beans / 0 Beans</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-[280px] pt-4">
        <button 
          onClick={() => onDecision(true)}
          className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black rounded-xl text-[14px] shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-95 transition-all"
        >
          🔥 2배 잭팟 도전하기
        </button>
        <button 
          onClick={() => onDecision(false)}
          className="w-full py-3.5 bg-espresso-800 hover:bg-espresso-750 text-espresso-200 font-bold rounded-xl text-[14px] active:scale-95 transition-all"
        >
          안전하게 현재 Beans 수령하기
        </button>
      </div>
    </div>
  );
};

export default DoubleWager;
