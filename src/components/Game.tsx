import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Disc3, Send, Clock, Trophy, Check } from 'lucide-react';

export function Game() {
  const { room, currentTrack, roundEndTime, isTimerStarted, roundGuessTarget, actions } = useGameStore();
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasGuessed, setHasGuessed] = useState(false);

  useEffect(() => {
    if (currentTrack) {
      setHasGuessed(false);
      setGuess('');
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-6xl px-4"
    >
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 bg-[#1DB954]/10 rounded-2xl flex items-center justify-center border border-[#1DB954]/20">
              <Disc3 className="text-[#1DB954] animate-spin-slow" size={32} />
            </div>
            <div className="absolute -top-2 -right-2 bg-[#1DB954] text-black text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              LIVE
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1">Transmission Status</p>
            <p className="text-2xl font-bold tracking-tight">
              Track <span className="text-[#1DB954] font-mono">{(room.currentTrackIndex + 1).toString().padStart(2, '0')}</span>
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
          <div className="bg-[#151619] border border-white/10 rounded-[2rem] p-8 md:p-16 flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden shadow-2xl">
            {/* Immersive Visualizer */}
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

            <AnimatePresence mode="wait">
              {!hasGuessed ? (
                <motion.div 
                  key="guessing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="w-full max-w-lg relative z-10"
                >
                  <div className="text-center mb-12">
                    <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-[#1DB954] mb-4">Incoming Signal</p>
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">
                      {promptText}
                    </h2>
                  </div>
                  
                  {currentTrack.choices ? (
                    <div className="grid grid-cols-1 gap-4">
                      {currentTrack.choices.map((choice, idx) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            actions.submitGuess(choice);
                            setHasGuessed(true);
                          }}
                          className="w-full bg-white/[0.03] border border-white/10 hover:border-[#1DB954]/50 hover:bg-[#1DB954]/5 rounded-2xl px-8 py-5 text-lg text-white font-medium text-left transition-all flex items-center justify-between group"
                        >
                          <span className="truncate pr-4">{choice}</span>
                          <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#1DB954] transition-colors">
                            <div className="w-2 h-2 rounded-full bg-[#1DB954] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="relative group">
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
              {playersList.map((p, index) => (
                <motion.div 
                  key={p.id}
                  layout
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${index === 0 ? 'bg-[#1DB954]/5 border-[#1DB954]/20' : 'bg-white/[0.02] border-white/5'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-mono font-bold w-6 ${index === 0 ? 'text-[#1DB954]' : 'text-white/20'}`}>
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <span className={`font-medium truncate max-w-[140px] ${index === 0 ? 'text-white' : 'text-white/60'}`}>{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold text-lg ${index === 0 ? 'text-[#1DB954]' : 'text-white/40'}`}>{p.score}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
