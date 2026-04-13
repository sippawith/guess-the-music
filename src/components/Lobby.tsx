import { useState } from 'react';
import { useGameStore } from '../store';
import { 
  Users, Copy, Check, Play, Settings, Music, 
  ArrowLeft, Disc3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTranslation } from '../translations';
import { GameSettings } from './GameSettings';
import { PlaylistSelector } from './PlaylistSelector';
import { CategorySettings } from './CategorySettings';
import { playSound } from '../utils/sounds';

export function Lobby() {
  const { room, socket, actions, gameStatus, selectedPlaylist, language } = useGameStore();
  const t = getTranslation(language);
  const [copied, setCopied] = useState(false);

  if (!room || !socket) return null;

  const isHost = room.players[socket.id]?.isHost;
  const playersList = Object.values(room.players);
  const isNonMusicCategory = room.category !== 'MUSIC';

  const copyCode = () => {
    navigator.clipboard.writeText(room.id);
    playSound('pop');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    // Unlock audio context
    const silentAudio = new Audio("data:audio/mp3;base64,//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB");
    silentAudio.play().catch(() => {});

    if (isNonMusicCategory) {
      // Non-music categories don't need a playlist
      actions.startGame(room.category, undefined, undefined);
      return;
    }

    if (!selectedPlaylist) return;
    actions.startGame(selectedPlaylist.id, undefined, undefined);
  };

  const canStart = isNonMusicCategory
    ? (room.category === 'MOVIE' ? !!room.settings.movieGenre : 
       room.category === 'CARTOON' ? !!room.settings.cartoonSource :
       room.category === 'LANDMARK' ? true : false)
    : !!selectedPlaylist;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 p-4"
    >
      {/* Loading Overlay */}
      <AnimatePresence>
        {gameStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-vox-paper/90 backdrop-blur-xl"
          >
            <div className="w-16 h-16 border-4 border-vox-black/10 border-t-vox-black rounded-full animate-spin mb-8" />
            <div className="text-center space-y-2">
              <h2 className="vox-title text-4xl">{t.initializing.split(' ')[0]} <span className="bg-vox-yellow px-2 text-black">{t.initializing.split(' ')[1]}</span></h2>
              <p className="handwritten text-xl opacity-60 animate-pulse">{gameStatus}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Column: Room Info & Players */}
      <div className="lg:col-span-4 space-y-8">
        {/* In-game banner */}
        {room.state !== 'LOBBY' && (
          <div className="bg-vox-yellow border-4 border-vox-black p-4 flex flex-col gap-4 shadow-vox">
            <div>
              <h2 className="font-black text-xl uppercase tracking-widest text-vox-black">Game in Progress</h2>
              <p className="font-medium text-vox-black opacity-80">Round {room.currentTrackIndex + 1} of {room.tracks.length}</p>
            </div>
            <button 
              onClick={() => actions.setViewingLobby(false)}
              className="vox-button bg-vox-black text-vox-white px-4 py-2 text-sm w-full"
            >
              Return to Game
            </button>
          </div>
        )}

        {/* Room Card */}
        <div className="vox-card relative overflow-visible">
          <div className="tape -top-4 -left-4" />
          
          <button 
            onClick={() => actions.leaveRoom()}
            className="absolute -top-2 -right-2 p-2 rounded-lg bg-white border-2 border-vox-black text-vox-black hover:bg-vox-yellow transition-all z-10 shadow-vox"
            title="Leave Room"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Access Code */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="handwritten text-lg -rotate-2 text-vox-black">{t.accessCode}</span>
            </div>
            <div 
              onClick={copyCode}
              className="inline-flex items-center gap-4 bg-vox-paper border-2 border-vox-black px-8 py-4 shadow-vox cursor-pointer hover:bg-vox-yellow transition-all group text-vox-black"
            >
              <span className="text-4xl font-black tracking-[0.15em]">{room.id}</span>
              {copied ? <Check size={20} /> : <Copy className="opacity-20 group-hover:opacity-40" size={20} />}
            </div>
          </div>

          {/* Player List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-vox-black" />
                <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.units}</h3>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {playersList.map((p) => (
                <motion.div 
                  layout
                  key={p.id} 
                  className="flex items-center justify-between bg-vox-white border-2 border-vox-black p-4 hover:bg-vox-yellow transition-all group text-vox-black"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 border-2 border-vox-black ${p.isHost ? 'bg-vox-black' : 'bg-vox-paper'}`} />
                    <span className="font-black text-lg">{p.name}</span>
                  </div>
                  {p.isHost && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-vox-black text-vox-white px-2 py-0.5">{t.host}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Settings & Selection */}
      <div className="lg:col-span-8 space-y-8">
        {isHost && room.state === 'LOBBY' ? (
          <div className="space-y-8">
            {/* Settings Card */}
            <div className="vox-card relative overflow-visible">
              <div className="tape -top-4 -right-4 rotate-12" />
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Settings size={20} className="text-vox-black" />
                  <h3 className="font-black uppercase tracking-tighter text-2xl text-vox-black">{t.configuration}</h3>
                </div>
              </div>
              
              <GameSettings />

              {/* Category-Specific Settings */}
              <div className="mt-12 pt-12 border-t-4 border-vox-black">
                {room.category === 'MUSIC' ? (
                  <PlaylistSelector />
                ) : (
                  <CategorySettings />
                )}
              </div>
            </div>

            {/* Start Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playSound('click');
                handleStartGame();
              }}
              onMouseEnter={() => playSound('hover')}
              disabled={!canStart}
              className="w-full vox-button py-8 text-2xl flex items-center justify-center gap-6 bg-vox-black text-vox-white mt-8 group disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 bg-vox-yellow flex items-center justify-center border-2 border-vox-black rotate-3 group-hover:rotate-12 transition-transform">
                <Play size={32} className="text-black" fill="currentColor" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-black uppercase tracking-[0.2em] leading-none text-white">
                  {t.startSession}
                </span>
              </div>
            </motion.button>
          </div>
        ) : room.state === 'LOBBY' ? (
          /* Non-host waiting view */
          <div className="vox-card h-full flex flex-col items-center justify-center text-center relative overflow-visible p-12">
            <div className="tape -top-4 -left-4" />
            <div className="tape -bottom-4 -right-4 rotate-12" />
            
            <div className="relative mb-12">
              <div className="w-32 h-32 border-8 border-vox-black/10 border-t-vox-black rounded-full animate-spin" />
              <Disc3 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-vox-black animate-pulse" size={56} />
            </div>
            
            <h2 className="vox-title text-5xl mb-4 text-vox-black">{t.synchronizing}</h2>
            <p className="handwritten text-2xl opacity-60 mb-2 text-vox-black">{t.waitingHost}</p>
            
            <div className="mt-16 w-full max-w-md bg-vox-paper border-4 border-vox-black p-8 shadow-vox text-vox-black">
              <div className="flex items-center justify-between mb-8 border-b-2 border-vox-black pb-4">
                <h4 className="font-black uppercase tracking-widest text-sm">{t.sessionMetadata}</h4>
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.guessWindow}</span>
                  <span className="font-black text-2xl">{room.settings.guessTime}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.rounds}</span>
                  <span className="font-black text-2xl">{room.settings.numTracks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.protocol}</span>
                  <motion.span 
                    key={room.settings.gameMode}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-black text-xl bg-vox-yellow px-2"
                  >
                    {room.settings.gameMode}
                  </motion.span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Game active view */
          <div className="vox-card h-full flex flex-col items-center justify-center text-center p-12">
            <Music size={48} className="text-vox-black/20 mb-4" />
            <h3 className="vox-title text-3xl mb-2 text-vox-black">Game is Active</h3>
            <p className="font-medium opacity-60 text-vox-black">You are currently viewing the room status.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
