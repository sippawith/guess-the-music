import { useEffect } from 'react';
import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { Trophy, Home, ArrowLeft, Heart, Music, Star, Award, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';

export function GameEnd() {
  const { room, actions, likedTracks, socket } = useGameStore();
  const t = translations.en;

  useEffect(() => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (!room) return null;

  const playersList = Object.values(room.players).sort((a, b) => b.score - a.score);
  const winner = playersList[0];
  const isHost = room.players[socket?.id || '']?.isHost;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-6xl px-4 py-6"
    >
      <button 
        onClick={() => actions.leaveRoom()}
        className="fixed top-6 left-6 p-3 rounded-2xl bg-vox-white border-2 border-vox-black shadow-vox text-vox-black hover:bg-vox-yellow transition-all z-50"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="text-center mb-12 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-vox-yellow/10 rounded-full -z-10" />
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-vox-yellow border-4 border-vox-black shadow-vox-lg mb-6 rotate-6"
        >
          <Trophy size={48} />
        </motion.div>
        <div className="flex flex-col items-center">
          <span className="handwritten text-xl mb-1 -rotate-2 text-vox-black">{t.finalStandings}</span>
          <h1 className="vox-title text-5xl md:text-7xl leading-tight mb-2 text-vox-black">
            {t.victory.split(' ')[0]} <span className="bg-vox-yellow px-4 italic text-black">{t.achieved}</span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Podium Section */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-3 gap-4 items-end min-h-[300px]">
            {/* 2nd Place */}
            {playersList[1] && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-vox-white border-2 border-vox-black flex items-center justify-center mb-4 relative rotate-[-5deg] text-vox-black">
                  <span className="text-xl font-black">2</span>
                  <Award size={16} className="absolute -top-2 -right-2 text-vox-black" />
                </div>
                <div className="w-full h-40 bg-vox-white border-2 border-vox-black shadow-vox p-4 text-center flex flex-col justify-end text-vox-black">
                  <p className="font-black truncate text-sm mb-1">{playersList[1].name}</p>
                  <p className="text-xs font-black opacity-40">{playersList[1].score} PTS</p>
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {winner && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 bg-vox-yellow border-4 border-vox-black flex items-center justify-center mb-6 relative shadow-vox-lg rotate-3">
                  <Star size={40} className="text-vox-black" fill="currentColor" />
                  <Trophy size={20} className="absolute -top-3 -right-3 text-vox-black" />
                </div>
                <div className="w-full h-64 bg-vox-yellow border-4 border-vox-black shadow-vox-lg p-6 text-center flex flex-col justify-end relative overflow-visible text-black">
                  <div className="tape -top-4 -left-4 w-20" />
                  <p className="text-2xl font-black truncate mb-2">{winner.name}</p>
                  <p className="text-lg font-black mb-4">{winner.score} PTS</p>
                  <div className="bg-vox-black text-vox-white py-2 text-[10px] font-black uppercase tracking-widest">
                    {t.champion}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {playersList[2] && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-vox-white border-2 border-vox-black flex items-center justify-center mb-4 relative rotate-[5deg] text-vox-black">
                  <span className="text-xl font-black">3</span>
                  <Award size={16} className="absolute -top-2 -right-2 text-vox-black" />
                </div>
                <div className="w-full h-32 bg-vox-white border-2 border-vox-black shadow-vox p-4 text-center flex flex-col justify-end text-vox-black">
                  <p className="font-black truncate text-sm mb-1">{playersList[2].name}</p>
                  <p className="text-xs font-black opacity-40">{playersList[2].score} PTS</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Liked Tracks Section */}
          {likedTracks.length > 0 && (
            <div className="vox-card relative overflow-visible">
              <div className="tape -top-4 -right-4 rotate-12" />
              <div className="flex items-center gap-3 mb-8">
                <Heart size={20} className="text-vox-red" fill="currentColor" />
                <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.yourCollection}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {likedTracks.map((track, i) => (
                  <motion.div 
                    key={track.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + (i * 0.1) }}
                    className="bg-vox-paper border-2 border-vox-black p-4 flex items-center gap-4 hover:bg-vox-yellow transition-all group text-vox-black"
                  >
                    <div className="w-16 h-16 border-2 border-vox-black overflow-hidden flex-shrink-0">
                      <img src={track.albumArt} alt={track.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black truncate text-sm">{track.name}</p>
                      <p className="font-serif italic text-xs opacity-60 truncate">{track.artist}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Full Leaderboard */}
        <div className="lg:col-span-4">
          <div className="vox-card h-full flex flex-col relative overflow-visible">
            <div className="tape -bottom-4 -left-4 -rotate-12" />
            <div className="flex items-center gap-3 mb-8">
              <TrendingUp size={20} className="text-vox-black" />
              <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.fullStandings}</h3>
            </div>
            
            <div className="space-y-4 flex-grow mb-12">
              {playersList.map((p, index) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (index * 0.05) }}
                  className={`flex items-center justify-between p-4 border-2 border-vox-black transition-all ${index === 0 ? 'bg-vox-yellow shadow-vox text-black' : 'bg-vox-paper/50 text-vox-black'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-black text-xs opacity-30 w-4">{index + 1}</span>
                    <span className="font-black text-sm">{p.name}</span>
                  </div>
                  <span className="font-black text-lg">{p.score}</span>
                </motion.div>
              ))}
            </div>

            <div className="pt-8 border-t-4 border-vox-black">
              {isHost ? (
                <button
                  onClick={() => actions.resetToLobby()}
                  className="w-full vox-button py-6 text-xl flex items-center justify-center gap-4"
                >
                  <Home size={24} />
                  <span>{t.returnToLobby}</span>
                </button>
              ) : (
                <div className="vox-card bg-vox-paper/50 text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-vox-black mb-2">
                    <Star size={16} fill="currentColor" />
                    <span className="text-xs font-black uppercase tracking-widest">{t.waitingHost}</span>
                  </div>
                  <p className="handwritten text-lg text-vox-black">{t.preparingNext}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
