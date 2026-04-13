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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-vox-paper">
      <AnimatePresence mode="wait">
        <motion.div
          key={countdown}
          initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.5, opacity: 0, rotate: 20 }}
          transition={{ duration: 0.4, ease: "backOut" }}
          className="relative"
        >
          <span className="vox-title text-[8rem] md:text-[15rem] text-vox-black drop-shadow-vox">
            {countdown === 0 ? "GO!" : countdown}
          </span>
          
          {/* Decorative elements */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.2 }}
            className="absolute inset-0 border-8 border-vox-yellow -z-10"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
