import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface DripTimerProps {
  timeLeft: number;
  totalTime: number;
}

const DripTimer: React.FC<DripTimerProps> = ({ timeLeft, totalTime }) => {
  const percentage = (timeLeft / totalTime) * 100;
  
  return (
    <div className="flex flex-col items-center gap-3 py-2 bg-espresso-950/40 rounded-2xl border border-espresso-800/30 p-4">
      <div className="flex items-center gap-2 text-espresso-300 font-bold text-xs tracking-wider">
        <Clock size={14} className="text-amber-500 animate-pulse" />
        <span>BREWING TIME</span>
        <span className={`font-mono text-sm ml-1 ${timeLeft <= 5 ? 'text-red-500 animate-bounce font-black' : 'text-amber-400'}`}>
          {timeLeft}s
        </span>
      </div>

      <div className="w-full max-w-[200px] h-10 relative flex items-center justify-between gap-1">
        {/* Filter Cone Graphic (Upper part) */}
        <div className="w-10 h-10 relative border-2 border-espresso-700 bg-espresso-900 rounded-t-none rounded-b-[18px] overflow-hidden flex flex-col justify-end">
          {/* Water draining */}
          <motion.div 
            animate={{ height: `${percentage}%` }}
            transition={{ ease: "linear", duration: 0.2 }}
            className="w-full bg-amber-900/30 shadow-inner"
          />
        </div>

        {/* Drip Drop Animation */}
        <div className="flex-1 flex flex-col items-center justify-center relative h-full">
          {timeLeft > 0 && (
            <motion.div
              animate={{ 
                y: [ -12, 12 ],
                opacity: [ 1, 0 ]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 0.6,
                ease: "easeIn"
              }}
              className="w-1.5 h-3 bg-amber-600 rounded-full shadow-md"
            />
          )}
        </div>

        {/* Server Decanter Graphic (Lower part) */}
        <div className="w-12 h-10 border-2 border-espresso-700 bg-espresso-900 rounded-t-lg rounded-b-xl overflow-hidden flex flex-col justify-end relative shadow-inner">
          {/* Brewed coffee filling up */}
          <motion.div 
            animate={{ height: `${100 - percentage}%` }}
            transition={{ ease: "linear", duration: 0.2 }}
            className="w-full bg-gradient-to-t from-amber-950 to-amber-700"
          />
          {/* Bubbles on surface */}
          <div className="absolute bottom-1 w-full flex justify-around opacity-60">
            <div className="w-1 h-1 bg-amber-500 rounded-full animate-ping" />
            <div className="w-0.5 h-0.5 bg-amber-400 rounded-full" />
            <div className="w-1 h-1 bg-amber-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DripTimer;
