import { useEffect } from 'react';
import { useGameStore } from '../store';
import { motion } from 'motion/react';
import { Trophy, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

export function GameEnd() {
  const { room, actions } = useGameStore();

  useEffect(() => {
    // Trigger confetti on mount
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (!room) return null;

  const playersList = Object.values(room.players).sort((a, b) => b.score - a.score);
  const winner = playersList[0];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl text-center"
    >
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#1DB954]/20 text-[#1DB954] mb-8">
        <Trophy size={48} />
      </div>
      
      <h1 className="text-6xl font-bold font-['Anton',sans-serif] uppercase mb-4">
        Game Over
      </h1>
      
      {winner && (
        <p className="text-2xl text-white/80 mb-12">
          <span className="text-[#1DB954] font-bold">{winner.name}</span> wins with {winner.score} points!
        </p>
      )}

      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 mb-12">
        <div className="space-y-4">
          {playersList.map((p, index) => (
            <div 
              key={p.id}
              className={`flex items-center justify-between p-4 rounded-xl ${index === 0 ? 'bg-[#1DB954]/20 border border-[#1DB954]/50' : 'bg-black/30'}`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-2xl font-bold font-mono ${index === 0 ? 'text-[#1DB954]' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-white/30'}`}>
                  #{index + 1}
                </span>
                <span className="text-xl font-medium">{p.name}</span>
              </div>
              <span className="text-xl font-mono font-bold">{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl inline-flex items-center gap-2 transition-all"
      >
        <Home size={20} />
        RETURN TO LOBBY
      </button>
    </motion.div>
  );
}
