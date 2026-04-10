import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store';

export function Countdown() {
  const { countdown } = useGameStore();

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed:', e));
    } else if (countdown === 0) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed:', e));
    }
  }, [countdown]);

  if (countdown === null) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <AnimatePresence mode="wait">
        <motion.div
          key={countdown}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5, ease: "backOut" }}
          className="relative"
        >
          <span className="text-[200px] font-black font-['Anton'] text-[#1DB954] drop-shadow-[0_0_30px_rgba(29,185,84,0.5)]">
            {countdown === 0 ? "GO!" : countdown}
          </span>
          
          {/* Decorative circles */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="absolute inset-0 border-4 border-[#1DB954] rounded-full"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
