import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Disc3, Send, Clock, Trophy, Check, Sparkles, Lightbulb, RefreshCw, AlertCircle } from 'lucide-react';

export function Game() {
  const { room, currentTrack, roundEndTime, isTimerStarted, roundGuessTarget, actions } = useGameStore();
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgRetryKey, setImgRetryKey] = useState(0);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (room.countdown > 0) {
      if (!countdownAudioRef.current) {
        countdownAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
      }
      countdownAudioRef.current.currentTime = 0;
      countdownAudioRef.current.play().catch(() => {});
    }
  }, [room.countdown]);

  useEffect(() => {
    if (currentTrack) {
      setHasGuessed(false);
      setGuess('');
      setImgError(false);
      setImgLoading(true);
    }
  }, [currentTrack]);

  useEffect(() => {
    const updateTimer = () => {
      if (!isTimerStarted) {
        setTimeLeft(room?.settings.guessTime || 0);
        return;
      }
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((roundEndTime - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [roundEndTime, isTimerStarted, room?.settings.guessTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || hasGuessed) return;
    
    actions.submitGuess(guess);
    setHasGuessed(true);
  };

  if (!room || !currentTrack) return null;

  const playersList = Object.values(room.players).sort((a, b) => b.score - a.score);
  const progress = ((room.currentTrackIndex + 1) / room.tracks.length) * 100;

  let promptText = "What's this song?";
  let placeholderText = "Type song name or artist...";
  
  const target = roundGuessTarget || room.settings.guessTarget;

  if (room.category === 'MUSIC') {
    if (target === "SONG") {
      promptText = "Guess the Song!";
      placeholderText = "Type song name...";
    } else if (target === "ARTIST") {
      promptText = "Guess the Artist!";
      placeholderText = "Type artist name...";
    } else {
      promptText = "Guess Song or Artist!";
      placeholderText = "Type song name or artist...";
    }
  } else if (room.category === 'MOVIE') {
    promptText = "Guess the Movie!";
    placeholderText = "Type movie title...";
  } else if (room.category === 'CARTOON') {
    promptText = "Guess the Cartoon!";
    placeholderText = "Type cartoon name...";
  } else if (room.category === 'LANDMARK') {
    promptText = "Guess the Landmark!";
    placeholderText = "Type landmark name...";
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-6xl px-4"
    >
      <AnimatePresence>
        {room.countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl"
          >
            <motion.div
              key={room.countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-[12rem] font-black font-mono text-[#1DB954]"
            >
              {room.countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 bg-[#1DB954]/10 rounded-2xl flex items-center justify-center border border-[#1DB954]/20">
              {room.category === 'MUSIC' ? (
                <Disc3 className="text-[#1DB954] animate-spin-slow" size={32} />
              ) : (
                <Sparkles className="text-[#1DB954]" size={32} />
              )}
            </div>
            <div className="absolute -top-2 -right-2 bg-[#1DB954] text-black text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              LIVE
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1">Transmission Status</p>
            <p className="text-2xl font-bold tracking-tight">
              {room.category === 'MUSIC' ? 'Track' : 'Round'} <span className="text-[#1DB954] font-mono">{(room.currentTrackIndex + 1).toString().padStart(2, '0')}</span>
              <span className="text-white/20 mx-3">/</span>
              <span className="text-white/40 font-mono">{room.tracks.length.toString().padStart(2, '0')}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1">Time Remaining</p>
            <p className={`text-2xl font-mono font-bold ${timeLeft <= 5 && isTimerStarted ? "text-red-500 animate-pulse" : "text-[#1DB954]"}`}>
              {isTimerStarted ? `00:${timeLeft.toString().padStart(2, '0')}` : '--:--'}
            </p>
          </div>
          <div className="w-20 h-20 relative flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-white/5"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={226}
                animate={{ strokeDashoffset: 226 - (226 * (timeLeft / (room.settings.guessTime || 15))) }}
                className={timeLeft <= 5 ? "text-red-500" : "text-[#1DB954]"}
              />
            </svg>
            <Clock className={`absolute ${timeLeft <= 5 ? "text-red-500" : "text-white/20"}`} size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Interface */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-[#151619] border border-white/10 rounded-[2rem] p-8 md:p-12 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden shadow-2xl">
            {/* Immersive Visualizer (Only for Music) */}
            {room.category === 'MUSIC' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-end gap-1 h-32 opacity-20">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [20, 80, 40, 100, 30] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1 + Math.random(),
                        delay: i * 0.1
                      }}
                      className="w-1 bg-[#1DB954] rounded-full"
                    />
                  ))}
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(29,185,84,0.1)_0%,_transparent_70%)]" />
              </div>
            )}

            <AnimatePresence mode="wait">
              {!hasGuessed ? (
                <motion.div 
                  key="guessing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="w-full max-w-2xl relative z-10 flex flex-col items-center"
                >
                  {/* Clue Display */}
                  {currentTrack.imageUrl && (
                    <motion.div 
                      key={`clue-img-${currentTrack.imageUrl}-${imgRetryKey}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full aspect-video rounded-3xl overflow-hidden mb-8 border border-white/10 shadow-2xl relative group bg-black/40 flex items-center justify-center"
                    >
                      {imgLoading && !imgError && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#151619]/60 backdrop-blur-sm">
                          <RefreshCw className="text-[#1DB954] animate-spin" size={40} />
                        </div>
                      )}
                      
                      {imgError ? (
                        <div className="flex flex-col items-center gap-4 p-8 text-center">
                          <AlertCircle className="text-red-500" size={48} />
                          <div>
                            <p className="text-white font-bold">Image failed to load</p>
                            <p className="text-white/40 text-sm">The transmission signal is weak</p>
                          </div>
                          <button 
                            onClick={() => {
                              setImgError(false);
                              setImgLoading(true);
                              setImgRetryKey(prev => prev + 1);
                            }}
                            className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full text-xs font-mono uppercase tracking-widest transition-colors flex items-center gap-2"
                          >
                            <RefreshCw size={14} /> Retry Signal
                          </button>
                        </div>
                      ) : (
                        <img 
                          src={currentTrack.imageUrl.includes('loremflickr') 
                            ? `https://images.weserv.nl/?url=${currentTrack.imageUrl.replace('https://', '')}&w=800&h=600&fit=cover`
                            : currentTrack.imageUrl
                          } 
                          alt="Clue" 
                          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
                          onLoad={() => {
                            console.log("Image loaded:", currentTrack.imageUrl);
                            setImgLoading(false);
                          }}
                          onError={(e) => {
                            console.error("Image failed to load:", currentTrack.imageUrl);
                            if (currentTrack.imageUrl?.includes('loremflickr')) {
                              // Try picsum fallback immediately
                              const fallback = `https://picsum.photos/seed/${encodeURIComponent(currentTrack.imageUrl)}/800/600`;
                              (e.target as HTMLImageElement).src = fallback;
                            } else {
                              setImgError(true);
                              setImgLoading(false);
                            }
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </motion.div>
                  )}

                  {/* Hint Display */}
                  <AnimatePresence>
                    {currentTrack.hint && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="w-full"
                      >
                        <div className="bg-[#1DB954]/10 border border-[#1DB954]/30 p-4 rounded-2xl flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center text-black shadow-[0_0_15px_rgba(29,185,84,0.4)]">
                            <Lightbulb size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-[#1DB954]">Intelligence Hint</p>
                            <p className="text-white font-medium">{currentTrack.hint}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {currentTrack.description && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl mb-8 text-center"
                    >
                      <p className="text-lg md:text-xl text-white/90 font-medium leading-relaxed italic">
                        "{currentTrack.description}"
                      </p>
                    </motion.div>
                  )}

                  <div className="text-center mb-10">
                    <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-[#1DB954] mb-4">Incoming Signal</p>
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">
                      {promptText}
                    </h2>
                  </div>
                  
                  {currentTrack.choices ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      {currentTrack.choices.map((choice, idx) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            actions.submitGuess(choice);
                            setHasGuessed(true);
                          }}
                          className="w-full bg-white/[0.03] border border-white/10 hover:border-[#1DB954]/50 hover:bg-[#1DB954]/5 rounded-2xl px-8 py-5 text-sm text-white font-medium text-left transition-all flex items-center justify-between group"
                        >
                          <span className="truncate pr-4">{choice}</span>
                          <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#1DB954] transition-colors">
                            <div className="w-2 h-2 rounded-full bg-[#1DB954] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
                      <form onSubmit={handleSubmit} className="relative group w-full">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#1DB954]/20 to-transparent rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                        <input
                          type="text"
                          value={guess}
                          onChange={(e) => setGuess(e.target.value)}
                          placeholder={placeholderText}
                          className="relative w-full bg-black/60 border-2 border-white/10 rounded-[2rem] px-8 py-6 text-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#1DB954] transition-all"
                          autoFocus
                        />
                        <button 
                          type="submit"
                          disabled={!guess.trim()}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#1DB954] hover:bg-[#1ed760] text-black p-4 rounded-2xl disabled:opacity-30 transition-all shadow-xl"
                        >
                          <Send size={24} />
                        </button>
                      </form>

                      {/* Hint Button */}
                      {!currentTrack.hint && (
                        <button
                          onClick={() => actions.getHint()}
                          disabled={room && room.hintsUsed >= (room.settings.hintsPerGame || Math.max(1, Math.floor(room.tracks.length * 0.3)))}
                          className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#1DB954]/50 transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Lightbulb className="text-[#1DB954] group-hover:animate-pulse" size={18} />
                          <span className="text-sm font-medium text-white/60 group-hover:text-white">Request Hint</span>
                          {room && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono text-[#1DB954]">
                              {Math.max(0, (room.settings.hintsPerGame || Math.max(1, Math.floor(room.tracks.length * 0.3))) - room.hintsUsed)} left
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="waiting"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center relative z-10"
                >
                  <div className="relative inline-block mb-8">
                    <div className="absolute inset-0 bg-[#1DB954] blur-2xl opacity-20 animate-pulse" />
                    <div className="relative w-24 h-24 rounded-full bg-[#1DB954]/10 border-2 border-[#1DB954]/30 flex items-center justify-center text-[#1DB954]">
                      <Check size={48} strokeWidth={3} />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold mb-3 tracking-tight">Signal Locked</h2>
                  <p className="text-white/40 font-mono uppercase tracking-widest text-xs">Awaiting peer synchronization...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Scoreboard (4 cols) */}
        <div className="lg:col-span-4">
          <div className="bg-[#151619] border border-white/10 rounded-[2rem] p-8 h-full shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
                <Trophy size={14} /> Leaderboard
              </h3>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-[#1DB954]" />
                <div className="w-1 h-1 rounded-full bg-[#1DB954]/40" />
                <div className="w-1 h-1 rounded-full bg-[#1DB954]/10" />
              </div>
            </div>
            
            <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2">
              <AnimatePresence mode="popLayout">
                {playersList.map((p, index) => (
                  <motion.div 
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${index === 0 ? 'bg-[#1DB954]/5 border-[#1DB954]/20' : 'bg-white/[0.02] border-white/5'}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-mono font-bold w-6 ${index === 0 ? 'text-[#1DB954]' : 'text-white/20'}`}>
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                      <span className={`font-medium truncate max-w-[140px] ${index === 0 ? 'text-white' : 'text-white/60'}`}>{p.name}</span>
                    </div>
                    <div className="text-right">
                      <motion.span 
                        key={p.score}
                        initial={{ scale: 1.2, color: '#1DB954' }}
                        animate={{ scale: 1, color: index === 0 ? '#1DB954' : 'rgba(255,255,255,0.4)' }}
                        className="font-mono font-bold text-lg"
                      >
                        {p.score}
                      </motion.span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
