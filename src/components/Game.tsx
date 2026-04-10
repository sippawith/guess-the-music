import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Disc3, Send, Clock, Trophy, Check } from 'lucide-react';

export function Game() {
  const { room, currentTrack, roundEndTime, isTimerStarted, roundGuessTarget, intermissionCountdown, actions } = useGameStore();
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasGuessed, setHasGuessed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.previewUrl;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      
      audioRef.current.onplay = () => {
        actions.trackPlaying();
      };
      
      setHasGuessed(false);
      setGuess('');
    }
  }, [currentTrack, actions]);

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
      className="w-full max-w-5xl"
    >
      <audio ref={audioRef} />

      {/* Top Bar: Progress & Timer */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1DB954]/20 rounded-full flex items-center justify-center">
            <Disc3 className="text-[#1DB954] animate-spin-slow" size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Now Playing</p>
            <p className="font-mono text-lg">Track {room.currentTrackIndex + 1} / {room.tracks.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-black/50 px-6 py-3 rounded-2xl border border-white/10">
          <Clock className={timeLeft <= 5 && isTimerStarted ? "text-red-500 animate-pulse" : "text-white/50"} size={20} />
          <span className={`text-3xl font-mono font-bold ${timeLeft <= 5 && isTimerStarted ? "text-red-500" : "text-white"}`}>
            {isTimerStarted ? `0:${timeLeft.toString().padStart(2, '0')}` : '...'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-white/10 rounded-full mb-12 overflow-hidden">
        <motion.div 
          className="h-full bg-[#1DB954]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Play Area */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/5 backdrop-blur-xl p-12 rounded-3xl border border-white/10 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
            {/* Visualizer effect */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="w-64 h-64 bg-[#1DB954] rounded-full blur-[100px] animate-pulse" />
            </div>

            <AnimatePresence mode="wait">
              {!hasGuessed ? (
                <motion.div 
                  key="guessing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-md relative z-10"
                >
                  <h2 className="text-3xl font-bold text-center mb-8 font-['Anton',sans-serif] uppercase tracking-wide">
                    {promptText}
                  </h2>
                  
                  {currentTrack.choices ? (
                    <div className="grid grid-cols-1 gap-3">
                      {currentTrack.choices.map((choice, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            actions.submitGuess(choice);
                            setHasGuessed(true);
                          }}
                          className="w-full bg-black/80 border-2 border-white/20 hover:border-[#1DB954] hover:bg-white/5 rounded-2xl px-6 py-4 text-lg text-white text-left transition-all"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="relative">
                      <input
                        type="text"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        placeholder={placeholderText}
                        className="w-full bg-black/80 border-2 border-white/20 rounded-2xl px-6 py-5 text-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#1DB954] shadow-2xl transition-all"
                        autoFocus
                      />
                      <button 
                        type="submit"
                        disabled={!guess.trim()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#1DB954] hover:bg-[#1ed760] text-black p-3 rounded-xl disabled:opacity-50 transition-colors"
                      >
                        <Send size={20} />
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
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1DB954]/20 text-[#1DB954] mb-6">
                    <Check size={40} />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Guess Submitted!</h2>
                  <p className="text-white/50">Waiting for other players...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/70 flex items-center gap-2 mb-6">
            <Trophy size={16} /> Live Scoreboard
          </h3>
          
          <div className="flex-grow space-y-3 overflow-y-auto pr-2">
            {playersList.map((p, index) => (
              <motion.div 
                key={p.id}
                layout
                className={`flex items-center justify-between p-4 rounded-xl border ${index === 0 ? 'bg-[#1DB954]/10 border-[#1DB954]/30' : 'bg-black/30 border-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold ${index === 0 ? 'text-[#1DB954]' : 'text-white/50'}`}>
                    #{index + 1}
                  </span>
                  <span className="font-medium truncate max-w-[120px]">{p.name}</span>
                </div>
                <span className="font-mono font-bold">{p.score}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
