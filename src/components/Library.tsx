import React, { useState } from 'react';
import { useGameStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, Heart, Play, Pause, Trash2, 
  ArrowLeft, ExternalLink, Disc
} from 'lucide-react';

export function Library({ onBack }: { onBack: () => void }) {
  const { likedTracks, actions } = useGameStore();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = (track: any) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(track.previewUrl);
      audioRef.current.play();
      setPlayingId(track.id);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-4xl mx-auto px-4 py-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl bg-vox-white border-2 border-vox-black shadow-vox text-vox-black hover:bg-vox-yellow transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="vox-title text-4xl md:text-5xl flex items-center gap-3">
            <Heart className="text-vox-red fill-current" size={32} />
            My <span className="bg-vox-yellow px-2 text-black">Library</span>
          </h1>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Stored Locally</p>
          <p className="text-xl font-black">{likedTracks.length} Tracks</p>
        </div>
      </div>

      {likedTracks.length === 0 ? (
        <div className="vox-card p-12 text-center bg-vox-paper">
          <Disc size={64} className="mx-auto mb-4 opacity-20 animate-spin-slow" />
          <h3 className="vox-title text-2xl mb-2">Your library is empty</h3>
          <p className="handwritten text-lg opacity-60">Like songs during the game to save them here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {likedTracks.map((track, i) => (
              <motion.div
                key={track.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className="vox-card p-4 flex gap-4 items-center group relative overflow-hidden"
              >
                <div className="relative w-20 h-20 flex-shrink-0 border-2 border-vox-black shadow-vox overflow-hidden">
                  <img 
                    src={track.albumArt || track.imageUrl || 'https://picsum.photos/seed/music/200/200'} 
                    alt={track.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={() => togglePlay(track)}
                    className="absolute inset-0 bg-vox-black/40 flex items-center justify-center text-vox-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {playingId === track.id ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                  </button>
                </div>

                <div className="flex-grow min-w-0">
                  <h4 className="font-black text-lg leading-tight truncate text-vox-black">{track.name}</h4>
                  <p className="handwritten text-sm opacity-60 truncate text-vox-black">{track.artist}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="bg-vox-black text-vox-white px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest">
                      {track.category || 'MUSIC'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => actions.unlikeTrack(track.id)}
                    className="p-2 text-vox-red hover:bg-vox-red hover:text-vox-white transition-colors rounded-lg"
                    title="Remove from library"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
