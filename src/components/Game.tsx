import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { 
  Disc3, Send, Clock, Trophy, Check, Sparkles, 
  Lightbulb, RefreshCw, AlertCircle, ArrowLeft,
  Snowflake, Zap, Flame, Users, Music2, Timer,
  Music, Globe, CheckCircle2, Scissors
} from 'lucide-react';

export function Game() {
  const { room, currentTrack, roundEndTime, isTimerStarted, actions, socket } = useGameStore();
  const t = translations.en;
  const [guess, setGuess] = useState('');
  const [hasGuessedThisRound, setHasGuessedThisRound] = useState(false);
  const [localGuess, setLocalGuess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const [lastStreak, setLastStreak] = useState(0);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);

  const me = room?.players[socket?.id || ''];
  const currentRound = (room?.currentTrackIndex || 0) + 1;
  const totalRounds = room?.tracks.length || 10;

  useEffect(() => {
    if (room?.countdown && room.countdown > 0) {
      if (!countdownAudioRef.current) {
        countdownAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
      }
      countdownAudioRef.current.currentTime = 0;
      countdownAudioRef.current.play().catch(() => {});
    }
  }, [room?.countdown]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const updateTimer = () => {
      if (!isTimerStarted) {
        setTimeLeft(room?.settings.guessTime || 0);
        return;
      }
      
      if (currentTrack?.isFrozen) return;

      const now = Date.now();
      const remaining = Math.max(0, (roundEndTime - now) / 1000);
      setTimeLeft(remaining);
    };

    updateTimer();
    interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [roundEndTime, isTimerStarted, room?.settings.guessTime, currentTrack?.isFrozen]);

  useEffect(() => {
    setHasGuessedThisRound(false);
    setLocalGuess(null);
    setGuess('');
  }, [room?.currentTrackIndex]);

  useEffect(() => {
    if (me && me.streak >= 3 && me.streak !== lastStreak) {
      setShowStreak(true);
      setLastStreak(me.streak);
      const timer = setTimeout(() => setShowStreak(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [me?.streak, lastStreak]);

  if (!room || !currentTrack || !me) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (guess.trim()) {
      actions.submitGuess(guess.trim());
      setLocalGuess(guess.trim());
      setGuess("");
      setHasGuessedThisRound(true);
    }
  };

  const totalGuessTime = room.settings.guessTime || 15;
  const progress = (timeLeft / totalGuessTime) * 100;

  const getPrompt = () => {
    const target = room.roundGuessTarget || room.settings.guessTarget;
    if (room.category === 'MUSIC') {
      if (target === "SONG") return t.guessSong;
      if (target === "ARTIST") return t.guessArtist;
      return t.guessBoth;
    }
    if (room.category === 'MOVIE') return t.guessMovie;
    if (room.category === 'CARTOON') return t.guessCartoon;
    if (room.category === 'LANDMARK') return t.guessLandmark;
    return t.whatIsThis;
  };

  return (
    <div className="w-full max-w-5xl px-4 py-2 flex flex-col min-h-screen">
      <AnimatePresence>
        {room.countdown && room.countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-vox-paper/90 backdrop-blur-xl"
          >
            <motion.div
              key={room.countdown}
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.5, opacity: 0, rotate: 20 }}
              className="vox-title text-[15rem] text-vox-black"
            >
              {room.countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="bg-vox-black text-vox-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
              {t.round} {currentRound}/{totalRounds}
            </span>
          </div>
          <h2 className="vox-title text-2xl">{t.the} <span className="bg-vox-yellow px-2 text-black">{t.challenge}</span></h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.yourScore}</p>
            <p className="text-2xl font-black leading-none dark:text-vox-black">{me.score}</p>
          </div>
          <div className="w-12 h-12 bg-vox-black border-4 border-vox-black shadow-vox flex items-center justify-center relative overflow-hidden">
             <motion.div 
               className="absolute bottom-0 left-0 w-full bg-vox-yellow"
               initial={{ height: "100%" }}
               animate={{ height: `${progress}%` }}
               transition={{ duration: 0.1, ease: "linear" }}
             />
             <span className={`relative z-10 font-black text-2xl ${progress < 50 ? 'text-vox-white' : 'text-vox-black'}`}>
               {Math.ceil(timeLeft)}
             </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 pb-8">
        {/* Left: Clue & Input */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="vox-card flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden bg-vox-paper min-h-[300px]">
            <div className="tape -top-4 -left-4" />
            <div className="absolute top-4 right-4 opacity-10">
              {room.category === 'MUSIC' ? <Music size={80} /> : <Globe size={80} />}
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={room.currentTrackIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="text-center relative z-10 w-full"
              >
                <span className="handwritten text-lg mb-2 block opacity-60 dark:text-vox-black">{t.analyzingSignal}</span>
                <h3 className="vox-title text-3xl md:text-5xl mb-4 leading-tight px-4 text-vox-black line-clamp-3">
                  {getPrompt()}
                </h3>
                
                {currentTrack.imageUrl && room.category !== 'MUSIC' && (
                  <div className="w-full max-w-sm mx-auto mb-4 border-4 border-vox-black shadow-vox overflow-hidden bg-vox-white">
                    <img src={currentTrack.imageUrl} alt="Clue" className="w-full h-40 object-cover" />
                  </div>
                )}

                {currentTrack.hint && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-vox-yellow border-2 border-vox-black text-[10px] font-black uppercase tracking-widest shadow-vox mb-4"
                  >
                    <Lightbulb size={12} />
                    {currentTrack.hint}
                  </motion.div>
                )}

                <div className="flex justify-center gap-2">
                  <div className="w-2 h-2 bg-vox-black rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-vox-black rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-vox-black rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Input Section */}
          <div className="vox-card p-4 bg-vox-yellow relative overflow-visible">
            <div className="tape -bottom-4 -right-4 rotate-12" />
            {(hasGuessedThisRound) ? (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="flex items-center gap-3 text-vox-black mb-1">
                  <CheckCircle2 size={20} />
                  <span className="font-black text-lg uppercase tracking-tighter">{t.guessTransmitted}</span>
                </div>
                <p className="handwritten text-sm opacity-60 text-vox-black">{t.waitingOthers}</p>
              </div>
            ) : room.settings.gameMode === 'TYPING' ? (
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder={t.typeGuess}
                  className="flex-grow bg-vox-white border-4 border-vox-black px-4 py-3 font-black text-base focus:outline-none focus:ring-0 placeholder:opacity-30 dark:text-vox-black"
                  autoFocus
                />
                <button 
                  type="submit"
                  className="vox-button px-6 bg-vox-black text-vox-white hover:bg-vox-white hover:text-vox-black transition-all"
                >
                  <Send size={20} />
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {currentTrack.choices?.map((choice: string, i: number) => {
                    const isRemoved = currentTrack.removedChoices?.includes(choice);
                    if (isRemoved) return null;
                    
                    return (
                      <motion.button
                        key={choice}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => {
                          actions.submitGuess(choice);
                          setLocalGuess(choice);
                          setHasGuessedThisRound(true);
                        }}
                        className={`vox-button py-2.5 text-xs font-black px-4 bg-vox-white hover:bg-vox-black hover:text-vox-white transition-all ${localGuess === choice ? 'selected' : ''}`}
                      >
                        <span className="line-clamp-1">{choice}</span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right: Abilities & Stats */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="vox-card p-4 flex flex-col h-full relative overflow-visible">
            <div className="tape -top-4 -right-4 -rotate-12" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-vox-black" fill="currentColor" />
                <h3 className="font-black uppercase tracking-tighter text-lg text-vox-black">{t.tactical}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <AbilityButton
                icon={<Lightbulb size={20} />}
                label={t.reveal}
                count={me.abilities.hint}
                disabled={me.abilities.hint <= 0 || hasGuessedThisRound || !room.settings.abilitiesEnabled}
                onClick={() => actions.useAbility('hint')}
                description={t.revealDesc}
              />
              <AbilityButton
                icon={<Scissors size={20} />}
                label={t.fiftyFifty}
                count={me.abilities.removeWrong}
                disabled={me.abilities.removeWrong <= 0 || hasGuessedThisRound || !room.settings.gameMode.startsWith('CHOICE') || !room.settings.abilitiesEnabled}
                onClick={() => actions.useAbility('removeWrong')}
                description={t.fiftyFiftyDesc}
              />
              <AbilityButton
                icon={<Snowflake size={20} />}
                label={t.freeze}
                count={me.abilities.freeze}
                disabled={me.abilities.freeze <= 0 || hasGuessedThisRound || currentTrack.isFrozen || !room.settings.abilitiesEnabled}
                onClick={() => actions.useAbility('freeze')}
                description={t.freezeDesc}
              />
            </div>

            <div className="mt-auto pt-6 border-t-2 border-vox-black/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-vox-black">{t.currentStreak}</span>
                {me.streak >= 3 && <Flame size={14} className="text-vox-red" fill="currentColor" />}
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black leading-none text-vox-black">{me.streak}</span>
                <span className="handwritten text-xl opacity-60 text-vox-black">{t.correct}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Notification */}
      <AnimatePresence>
        {showStreak && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, x: 100 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="fixed bottom-10 right-10 pointer-events-none z-[110]"
          >
            <div className="vox-card bg-vox-yellow p-6 rotate-3 shadow-vox-lg border-4 border-vox-black">
              <div className="flex flex-col items-center">
                <Flame size={40} className="text-vox-red mb-2 animate-bounce" fill="currentColor" />
                <h2 className="vox-title text-3xl mb-1 text-black">{t.onFire}</h2>
                <p className="text-xl font-black uppercase tracking-widest text-black">{me.streak} {t.roundStreak}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Freeze Overlay */}
      <AnimatePresence>
        {currentTrack.isFrozen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-blue-500/10 pointer-events-none z-[120] flex items-center justify-center"
          >
            <div className="vox-card bg-vox-white/90 backdrop-blur-sm p-4 flex items-center gap-3 border-4 border-blue-400 shadow-lg -rotate-2">
              <Snowflake size={24} className="text-blue-500 animate-spin-slow" />
              <span className="font-black text-blue-500 uppercase tracking-widest">{t.timeFrozen}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AbilityButton({ icon, label, count, disabled, onClick, description }: any) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      onClick={(e) => {
        setIsPressed(true);
        setTimeout(() => setIsPressed(false), 200);
        onClick(e);
      }}
      disabled={disabled}
      className={`group relative flex items-center justify-between p-4 border-2 border-vox-black transition-all ${
        disabled 
          ? 'bg-vox-paper opacity-40 grayscale cursor-not-allowed' 
          : `bg-vox-white hover:bg-vox-yellow hover:shadow-vox ${isPressed ? 'translate-x-[4px] translate-y-[4px] shadow-none scale-[0.98] bg-vox-yellow/80' : ''}`
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 border-2 border-vox-black ${disabled ? 'bg-vox-paper' : 'bg-vox-paper group-hover:bg-vox-white'}`}>
          {icon}
        </div>
        <div className="text-left">
          <div className="flex items-baseline gap-2">
            <p className="font-black text-sm uppercase tracking-tighter leading-none text-vox-black">{label}</p>
          </div>
          <p className="text-[10px] font-medium opacity-40 leading-none mt-1 text-vox-black">{description}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-vox-black">Uses</p>
        <p className="font-black text-sm text-vox-black">{count}</p>
      </div>
    </button>
  );
}
