import { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { 
  CheckCircle2, XCircle, Trophy, Music, Clock, 
  Globe, ArrowLeft, Heart, Flame, Sparkles, TrendingUp
} from 'lucide-react';

import { playSound } from '../utils/sounds';

export function RoundEnd() {
  const { lastRoundResult, intermissionEndTime, intermissionDuration, room, actions, likedTracks, language, socket } = useGameStore();
  const t = translations[language];
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (lastRoundResult && socket?.id) {
      const myGuess = lastRoundResult.guesses[socket.id];
      if (myGuess?.correct) {
        playSound('correct');
      } else {
        playSound('wrong');
      }
    }
  }, [lastRoundResult, socket?.id]);

  useEffect(() => {
    if (intermissionEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, (intermissionEndTime - Date.now()) / 1000);
        setTimeLeft(remaining);
        if (remaining <= 0) clearInterval(interval);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [intermissionEndTime]);

  if (!lastRoundResult) return null;

  const { track, guesses, players } = lastRoundResult;
  const playersList = Object.values(players).sort((a, b) => b.score - a.score);

  const totalIntermission = intermissionDuration || 8;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-7xl px-4 py-4"
    >
      <button 
        onClick={() => actions.setViewingLobby(true)}
        className="fixed top-6 left-6 p-3 rounded-2xl bg-vox-white border-2 border-vox-black shadow-vox text-vox-black hover:bg-vox-yellow transition-all z-50"
        title="Room Status"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Header Section */}
        <div className="lg:col-span-12 mb-4">
          <div className="flex flex-col md:flex-row items-end justify-between gap-4 border-b-4 border-vox-black pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="handwritten text-lg -rotate-3 block text-vox-black">{t.roundResults}</span>
                <span className="bg-vox-black text-vox-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ml-2">
                  {t.round} {room?.currentTrackIndex !== undefined ? room.currentTrackIndex + 1 : 0}/{room?.tracks.length || 0}
                </span>
              </div>
              <h1 className="vox-title text-5xl md:text-7xl text-vox-black">
                {t.data.split(' ')[0]} <span className="bg-vox-yellow px-4 text-black">{t.revealed}</span>
              </h1>
            </div>
            
            {timeLeft !== null && (
              <div className="vox-card py-4 px-8 flex items-center gap-6 relative overflow-visible">
                <div className="tape -top-3 -right-4 w-12" />
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-vox-black">{t.nextRoundIn}</p>
                  <p className="text-3xl font-black text-vox-black">{Math.ceil(timeLeft).toString().padStart(2, '0')}s</p>
                </div>
                <div className="w-16 h-16 flex items-center justify-center relative">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle
                      cx="32" cy="32" r="28"
                      stroke="currentColor" strokeWidth="6" fill="transparent"
                      className="text-vox-black/5"
                    />
                    <motion.circle
                      cx="32" cy="32" r="28"
                      stroke="currentColor" strokeWidth="6" fill="transparent"
                      strokeDasharray={176}
                      animate={{ strokeDashoffset: 176 - (176 * (timeLeft / totalIntermission)) }}
                      transition={{ duration: 0.1, ease: "linear" }}
                      className="text-vox-yellow"
                    />
                  </svg>
                  <Clock size={20} className="absolute text-vox-black" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Left Column: Track Reveal */}
        <div className="lg:col-span-7">
          <div className="vox-card h-full relative overflow-visible flex flex-col justify-center p-8">
            <div className="tape -top-4 -left-4" />
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, rotate: -5 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                className="relative flex-shrink-0"
              >
                <div className="w-48 h-48 md:w-64 md:h-64 border-4 border-vox-black shadow-vox-lg overflow-hidden relative bg-vox-paper">
                  {(track.albumArt || track.imageUrl) ? (
                    <img src={track.albumArt || track.imageUrl} alt="Album Art" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={80} className="text-vox-black/10" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-vox-yellow border-4 border-vox-black rounded-full flex items-center justify-center shadow-vox rotate-12">
                  <Music size={24} />
                </div>
              </motion.div>
              
              <div className="flex-grow text-center md:text-left">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
                    <span className="bg-vox-black text-vox-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                      {room.category} {t.identity}
                    </span>
                      <button
                        onClick={() => {
                          playSound('click');
                          const likedTrack = {
                            id: track.name + track.artist,
                            name: track.name,
                            artist: track.artist,
                            albumArt: track.albumArt
                          };
                          const isLiked = likedTracks.some(t => t.id === likedTrack.id);
                          if (isLiked) actions.unlikeTrack(likedTrack.id);
                          else actions.likeTrack(likedTrack);
                        }}
                        onMouseEnter={() => playSound('hover')}
                        className={`p-3 border-2 border-vox-black shadow-vox transition-all ${likedTracks.some(t => t.id === track.name + track.artist) ? 'bg-vox-red text-white' : 'bg-vox-white hover:bg-vox-yellow'}`}
                      >
                      <Heart size={20} fill={likedTracks.some(t => t.id === track.name + track.artist) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  
                  <h3 className="vox-title text-4xl md:text-5xl mb-2 leading-none text-vox-black line-clamp-2">
                    {track.name}
                  </h3>
                  <p className="font-serif italic text-xl text-vox-black/60 mb-6 line-clamp-1">
                    {track.artist}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-vox-paper border-2 border-vox-black min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 text-vox-black truncate">{t.accuracy}</p>
                      <p className="text-xl font-black text-vox-black truncate">
                        {Math.round((Object.values(guesses).filter(g => g.correct).length / playersList.length) * 100)}%
                      </p>
                    </div>
                    <div className="p-3 bg-vox-paper border-2 border-vox-black min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 text-vox-black truncate">{t.topSpeed}</p>
                      <p className="text-xl font-black text-vox-black truncate">
                        {Object.values(guesses).some(g => g.correct) 
                          ? ((Math.min(...Object.values(guesses).filter(g => g.correct).map(g => g.time)) - lastRoundResult.roundStartTime) / 1000).toFixed(1) + 's'
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="lg:col-span-5">
          <div className="vox-card h-full flex flex-col relative overflow-visible">
            <div className="tape -bottom-4 -right-4 rotate-12" />
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Trophy size={20} className="text-vox-black" />
                <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.standings}</h3>
              </div>
            </div>
            
            <div className="space-y-4 flex-grow">
              {playersList.map((p, index) => {
                const guessData = guesses[p.id];
                const isCorrect = guessData?.correct;
                const gain = p.score - p.prevScore;
                
                return (
                  <motion.div 
                    key={p.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + (index * 0.05) }}
                    className={`p-4 border-2 border-vox-black transition-all ${isCorrect ? 'bg-vox-yellow/20' : 'bg-vox-paper/50'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 border-2 border-vox-black flex items-center justify-center font-black text-lg ${isCorrect ? 'bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-lg leading-none text-vox-black truncate">{p.name}</p>
                          {p.streak >= 3 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Flame size={12} className="text-vox-red" fill="currentColor" />
                              <span className="text-[10px] font-black text-vox-red uppercase">{p.streak} {t.streak}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-black text-2xl leading-none text-vox-black">{p.score}</p>
                        {gain > 0 && (
                          <p className="text-[10px] font-black text-vox-red mt-1">+{gain} PTS</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-vox-white border-2 border-vox-black p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {isCorrect ? (
                          <CheckCircle2 size={16} className="text-vox-black flex-shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-vox-red flex-shrink-0" />
                        )}
                        <span className={`text-sm truncate font-bold text-vox-black ${isCorrect ? "" : "opacity-30 italic"}`}>
                          {guessData?.guess || t.noGuess}
                        </span>
                      </div>
                      {isCorrect && (
                        <span className="font-black text-xs ml-4 text-vox-black">
                          {((guessData.time - lastRoundResult.roundStartTime) / 1000).toFixed(1)}s
                        </span>
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
