import { useEffect } from 'react';
import { useGameStore } from '../store';
import { motion } from 'motion/react';
import { Trophy, Home, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

export function GameEnd() {
  const { room, actions, likedTracks } = useGameStore();

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

  const isHost = room.players[useGameStore.getState().socket?.id || '']?.isHost;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl text-center relative"
    >
      <button 
        onClick={() => actions.leaveRoom()}
        className="fixed top-8 left-8 p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all z-50 backdrop-blur-md"
        title="Leave Game"
      >
        <ArrowLeft size={24} />
      </button>

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

      {likedTracks.length > 0 && (
        <div className="mt-12 text-left mb-12">
          <h2 className="text-2xl font-bold mb-6 text-white/80">Liked Tracks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {likedTracks.map(track => (
              <div key={track.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-4">
                <img src={track.albumArt} alt={track.name} className="w-12 h-12 rounded-lg object-cover" />
                <div>
                  <p className="font-bold">{track.name}</p>
                  <p className="text-sm text-white/60">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
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

      {isHost ? (
        <button
          onClick={() => actions.resetToLobby()}
          className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 px-12 rounded-xl inline-flex items-center gap-2 transition-all shadow-[0_10px_30px_rgba(29,185,84,0.3)] hover:-translate-y-1 active:translate-y-0"
        >
          <Home size={20} />
          PLAY AGAIN
        </button>
      ) : (
        <p className="text-white/40 font-mono text-sm uppercase tracking-widest">
          Waiting for host to restart game...
        </p>
      )}
    </motion.div>
  );
}
