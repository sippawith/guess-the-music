import { useState } from 'react';
import { useGameStore } from '../store';
import { 
  Users, Copy, Check, Play, Settings, Music, 
  ArrowLeft, Disc3, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { GameSettings } from './GameSettings';
import { PlaylistSelector } from './PlaylistSelector';
import { CategorySettings } from './CategorySettings';

export function Lobby() {
  const { room, socket, actions, gameStatus, selectedPlaylist, playlistTracks, selectedLanguages } = useGameStore();
  const t = translations.en;
  const [copied, setCopied] = useState(false);

  if (!room || !socket) return null;

  const isHost = room.players[socket.id]?.isHost;
  const playersList = Object.values(room.players);
  const hasMusic = room.categories.includes('MUSIC');
  const hasMovie = room.categories.includes('MOVIE');
  const hasCartoon = room.categories.includes('CARTOON');
  const hasLandmark = room.categories.includes('LANDMARK');
  const isNonMusicOnly = !hasMusic && (hasMovie || hasCartoon || hasLandmark);

  const copyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    // Unlock audio context
    const audioEl = document.getElementById('main-audio') as HTMLAudioElement;
    if (audioEl) {
      audioEl.src = "data:audio/mp3;base64,//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB";
      audioEl.play().catch(() => {});
    }

    if (isNonMusicOnly) {
      // Non-music categories don't need a playlist
      actions.startGame('NON_MUSIC', undefined, undefined);
      return;
    }

    if (hasMusic && !selectedPlaylist) return;
    
    let trackIds: string[] | undefined = undefined;
    
    // If we have loaded tracks and selected languages, filter them
    if (playlistTracks.length > 0 && selectedLanguages.length > 0) {
      const thaiRegex = /[\u0E00-\u0E7F]/;
      const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
      const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
      const chineseRegex = /[\u4E00-\u9FFF]/;

      const filteredTracks = playlistTracks.filter(track => {
        const text = ((track.name || "") + " " + (track.artist || ""));
        
        // Determine the track's language
        let trackLang = "English"; // Default
        if (thaiRegex.test(text)) trackLang = "Thai";
        else if (japaneseRegex.test(text)) trackLang = "Japanese";
        else if (koreanRegex.test(text)) trackLang = "Korean";
        else if (chineseRegex.test(text)) trackLang = "Chinese";

        return selectedLanguages.includes(trackLang);
      });
      
      trackIds = filteredTracks.map(t => t.id);
      
      // If filtering resulted in 0 tracks, fallback to all tracks to avoid breaking the game
      if (trackIds.length === 0) {
        trackIds = undefined;
      }
    }

    actions.startGame(selectedPlaylist?.id || 'MIXED', trackIds, undefined);
  };

  const canStart = (() => {
    if (hasMusic && !selectedPlaylist) return false;
    if (hasMovie && !room.settings.movieGenre) return false;
    if (hasCartoon && !room.settings.cartoonSource) return false;
    if (hasLandmark && !room.settings.landmarkRegion) return false;
    return true;
  })();

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
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-vox-paper"
          >
            <div className="w-16 h-16 border-4 border-vox-black/10 border-t-vox-black rounded-full mb-8" />
            <div className="text-center space-y-2 px-4">
              <h2 className="vox-title text-2xl md:text-4xl">{t.initializing.split(' ')[0]} <span className="bg-vox-yellow px-2 text-black">{t.initializing.split(' ')[1]}</span></h2>
              <p className="handwritten text-lg md:text-xl opacity-60">{gameStatus}</p>
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
              <AnimatePresence mode="popLayout">
                {playersList.map((p, i) => (
                  <motion.div 
                    layout
                    key={p.id} 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between bg-vox-white border-2 border-vox-black p-4 hover:bg-vox-yellow transition-all group text-vox-black shadow-sm"
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
              </AnimatePresence>
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
              <div className="mt-12 pt-12 border-t-4 border-vox-black space-y-12">
                {hasMusic && <PlaylistSelector />}
                {(hasMovie || hasCartoon || hasLandmark) && <CategorySettings />}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className="w-full vox-button py-8 text-2xl flex items-center justify-center gap-6 bg-vox-black text-vox-white hover:bg-vox-yellow hover:text-vox-black transition-all shadow-vox-lg disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Play size={32} fill="currentColor" />
              <div className="flex flex-col items-start">
                <span className="font-black uppercase tracking-[0.2em] leading-none">
                  {t.startSession}
                </span>
              </div>
            </button>
          </div>
        ) : room.state === 'LOBBY' ? (
          /* Non-host waiting view */
          <div className="vox-card h-full flex flex-col items-center justify-center text-center relative overflow-visible p-12">
            <div className="tape -top-4 -left-4" />
            <div className="tape -bottom-4 -right-4 rotate-12" />
            
            <div className="relative mb-8 md:mb-12">
              <div className="w-24 h-24 md:w-32 md:h-32 border-8 border-vox-black/10 border-t-vox-black rounded-full" />
              <Disc3 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-vox-black" size={40} />
            </div>
            
            <h2 className="vox-title text-3xl md:text-5xl mb-4 text-vox-black">{t.synchronizing}</h2>
            <p className="handwritten text-xl md:text-2xl opacity-60 mb-8 text-vox-black">{t.waitingHost}</p>
            
            <div className="mt-8 md:mt-16 w-full max-w-md bg-vox-paper border-4 border-vox-black p-4 md:p-8 shadow-vox text-vox-black">
              <div className="flex items-center justify-between mb-4 md:mb-8 border-b-2 border-vox-black pb-4">
                <h4 className="font-black uppercase tracking-widest text-xs">{t.sessionMetadata}</h4>
              </div>
              <div className="space-y-4 md:space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.guessWindow}</span>
                  <span className="font-black text-xl md:text-2xl">{room.settings.guessTime}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.rounds}</span>
                  <span className="font-black text-xl md:text-2xl">{room.settings.numTracks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.protocol}</span>
                  <motion.span 
                    key={room.settings.gameMode}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-black text-lg md:text-xl bg-vox-yellow px-2"
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
