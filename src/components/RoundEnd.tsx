import { useGameStore } from '../store';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Trophy } from 'lucide-react';

export function RoundEnd() {
  const { lastRoundResult, intermissionCountdown } = useGameStore();

  if (!lastRoundResult) return null;

  const { track, guesses, players } = lastRoundResult;
  const playersList = Object.values(players).sort((a, b) => b.score - a.score);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-12">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#1DB954] mb-2">Round Over</h2>
        <h1 className="text-4xl font-bold font-['Anton',sans-serif] uppercase">The song was...</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Track Reveal */}
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 flex flex-col items-center text-center">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-48 h-48 rounded-2xl overflow-hidden shadow-2xl mb-6 border border-white/10"
          >
            {track.albumArt ? (
              <img src={track.albumArt} alt="Album Art" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-black/50 flex items-center justify-center">No Art</div>
            )}
          </motion.div>
          
          <motion.h3 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold mb-2"
          >
            {track.name}
          </motion.h3>
          
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/60 text-lg"
          >
            {track.artist}
          </motion.p>

          {intermissionCountdown !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 pt-6 border-t border-white/10 w-full"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Next song in</p>
              <p className="text-4xl font-mono font-bold text-[#1DB954]">{intermissionCountdown}</p>
            </motion.div>
          )}
        </div>

        {/* Player Guesses & Scores */}
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/70 flex items-center gap-2 mb-6">
            <Trophy size={16} /> Results
          </h3>
          
          <div className="space-y-4 overflow-y-auto pr-2">
            {playersList.map((p, index) => {
              const guessData = guesses[p.id];
              const isCorrect = guessData?.correct;
              
              return (
                <motion.div 
                  key={p.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + (index * 0.1) }}
                  className="flex flex-col bg-black/30 p-4 rounded-xl border border-white/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{p.name}</span>
                    <span className="font-mono text-[#1DB954]">{p.score} pts</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    {guessData ? (
                      <>
                        {isCorrect ? (
                          <CheckCircle2 size={16} className="text-[#1DB954]" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )}
                        <span className={isCorrect ? "text-[#1DB954]" : "text-white/50"}>
                          "{guessData.guess}"
                        </span>
                        {isCorrect && <span className="ml-auto text-xs text-[#1DB954]/70">+{guessData.time === Math.min(...Object.values(guesses).filter(g => g.correct).map(g => g.time)) ? '100' : '50'}</span>}
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="text-white/30" />
                        <span className="text-white/30 italic">No guess</span>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
