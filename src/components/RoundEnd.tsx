import { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Trophy, Music, Clock, Globe, ArrowLeft } from 'lucide-react';

export function RoundEnd() {
  const { lastRoundResult, intermissionEndTime, intermissionDuration, room, actions } = useGameStore();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (intermissionEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((intermissionEndTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) clearInterval(interval);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [intermissionEndTime]);

  if (!lastRoundResult) return null;

  const { track, guesses, players } = lastRoundResult;
  const playersList = Object.values(players).sort((a, b) => b.score - a.score);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl px-4 relative"
    >
      <button 
        onClick={() => actions.leaveRoom()}
        className="fixed top-8 left-8 p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all z-50 backdrop-blur-md"
        title="Leave Room"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="text-center mb-12">
        <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-[#1DB954] mb-4">Round Conclusion</p>
        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight leading-none">
          Data Decrypted
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Track Reveal (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-[#151619] border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              {room.category === 'MUSIC' ? <Music size={200} /> : <Globe size={200} />}
            </div>

            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, rotate: -5 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15 }}
                className="relative group"
              >
                <div className="absolute -inset-4 bg-[#1DB954]/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-56 h-56 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative">
                  {track.albumArt ? (
                    <img src={track.albumArt} alt="Album Art" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-black/50 flex items-center justify-center">
                      <Music size={48} className="text-white/10" />
                    </div>
                  )}
                </div>
              </motion.div>
              
              <div className="flex-grow text-center md:text-left">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-[10px] font-mono text-[#1DB954] uppercase tracking-[0.3em] mb-3">
                    {room.category === 'MUSIC' ? 'Track Identity' : room.category === 'LANDMARK' ? 'Location Identity' : 'Subject Identity'}
                  </p>
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">
                    {track.name}
                  </h3>
                  <p className="text-xl text-white/40 font-medium mb-8">
                    {track.artist}
                  </p>
                </motion.div>

                {timeLeft !== null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-black/40 border border-white/5 rounded-2xl p-6 inline-flex flex-col items-center md:items-start"
                  >
                    <p className="text-[9px] font-mono uppercase tracking-widest text-white/30 mb-2 flex items-center gap-2">
                      <Clock size={10} /> Next Transmission In
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-mono font-bold text-[#1DB954] tabular-nums">
                        {timeLeft.toString().padStart(2, '0')}
                      </span>
                      <span className="text-xs font-mono text-white/20 uppercase">Seconds</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Player Results (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-[#151619] border border-white/10 rounded-[2.5rem] p-8 h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
                <Trophy size={14} /> Round Analytics
              </h3>
            </div>
            
            <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-grow">
              {playersList.map((p, index) => {
                const guessData = guesses[p.id];
                const isCorrect = guessData?.correct;
                
                return (
                  <motion.div 
                    key={p.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + (index * 0.05) }}
                    className={`flex flex-col p-4 rounded-2xl border transition-all ${isCorrect ? 'bg-[#1DB954]/5 border-[#1DB954]/20' : 'bg-white/[0.02] border-white/5'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${isCorrect ? 'bg-[#1DB954]' : 'bg-white/10'}`} />
                        <span className="font-bold text-sm text-white/80">{p.name}</span>
                      </div>
                      <span className={`font-mono text-sm font-bold ${isCorrect ? 'text-[#1DB954]' : 'text-white/20'}`}>
                        {p.score} <span className="text-[10px] opacity-50 uppercase ml-1">pts</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-black/40 rounded-xl px-4 py-2.5">
                      {guessData ? (
                        <>
                          {isCorrect ? (
                            <CheckCircle2 size={14} className="text-[#1DB954] flex-shrink-0" />
                          ) : (
                            <XCircle size={14} className="text-red-500/50 flex-shrink-0" />
                          )}
                          <span className={`text-xs truncate ${isCorrect ? "text-[#1DB954] font-medium" : "text-white/30 italic"}`}>
                            "{guessData.guess}"
                          </span>
                          {isCorrect && (
                            <span className="ml-auto text-[10px] font-mono font-bold text-[#1DB954] bg-[#1DB954]/10 px-1.5 py-0.5 rounded">
                              +{guessData.time === Math.min(...Object.values(guesses).filter(g => g.correct).map(g => g.time)) ? '100' : '50'}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <XCircle size={14} className="text-white/10 flex-shrink-0" />
                          <span className="text-xs text-white/10 italic">No Data Received</span>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

