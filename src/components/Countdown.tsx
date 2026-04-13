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

  return (
    <AnimatePresence>
      {countdown !== null && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-vox-paper/80 backdrop-blur-xl"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.5, opacity: 0, rotate: 20 }}
              transition={{ duration: 0.4, ease: "backOut" }}
              className="relative"
            >
              <span className="vox-title text-[15rem] text-vox-black drop-shadow-vox">
                {countdown === 0 ? "GO!" : countdown}
              </span>
              
              {/* Decorative elements */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 0.2 }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="absolute inset-0 border-8 border-vox-yellow -z-10"
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
