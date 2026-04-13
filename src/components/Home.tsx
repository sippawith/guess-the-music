import { useState } from 'react';
import { useGameStore } from '../store';
import { Music, Play, Hash, Fingerprint, Film, Tv, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';

const CATEGORIES = [
  { id: 'MUSIC', name: 'Music', icon: Music, color: '#ffeb00', desc: 'Spotify & Apple Playlists' },
  { id: 'MOVIE', name: 'Movie', icon: Film, color: '#ff6b6b', desc: 'Guess from movie posters' },
  { id: 'CARTOON', name: 'Cartoon', icon: Tv, color: '#51cf66', desc: 'Name that cartoon!' },
  { id: 'LANDMARK', name: 'Landmark', icon: MapPin, color: '#339af0', desc: 'World famous places' },
] as const;

export function Home() {
  const { playerName, actions } = useGameStore();
  const t = translations.en;
  const [joinCode, setJoinCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number] | null>(null);

  const unlockAudio = () => {
    const audioEl = document.getElementById('main-audio') as HTMLAudioElement;
    if (audioEl) {
      audioEl.src = "data:audio/mp3;base64,//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB";
      audioEl.play().catch(() => {});
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-5xl px-4 py-12"
    >
      {/* Header Section: Magazine Style */}
      <div className="relative mb-20">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-vox-yellow/10 rounded-full -z-10" />
        <div className="flex flex-col items-start">
          <motion.span 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="handwritten text-2xl mb-2 -rotate-3 block text-vox-black"
          >
            {t.subtitle}
          </motion.span>
          <h1 className="vox-title text-5xl md:text-[10rem] leading-[0.85] mb-4 text-vox-black">
            {t.title.split(' ')[0]}<br />
            {t.title.split(' ')[1]}<br />
            <span className="bg-vox-yellow px-4 text-black">{t.title.split(' ')[2]}</span>
          </h1>
          <div className="flex items-center gap-4 mt-4">
            <div className="h-1 w-24 bg-vox-black" />
            <p className="font-serif italic text-xl text-vox-black">{t.edition}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Identity & Join */}
        <div className="lg:col-span-5 space-y-8">
          <div className="vox-card relative overflow-visible">
            <div className="tape -top-4 -left-4" />
            <div className="flex items-center gap-3 mb-6">
              <Fingerprint size={20} className="text-vox-black" />
              <h3 className="font-black uppercase tracking-tighter text-lg text-vox-black">{t.identity}</h3>
            </div>
            
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => actions.setName(e.target.value)}
                  placeholder={t.enterName}
                  className="w-full bg-vox-paper border-b-4 border-vox-black px-4 py-4 text-2xl font-black placeholder:text-vox-black/20 focus:outline-none transition-all text-vox-black"
                  maxLength={15}
                />
                <div className="absolute -bottom-8 right-0 handwritten text-sm opacity-50 text-vox-black">{t.maxChars}</div>
              </div>

              <div className="pt-8 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Hash size={16} className="text-vox-black" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-vox-black">{t.joinExisting}</span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CODE"
                    className="flex-grow bg-vox-paper border-2 border-vox-black px-4 py-3 font-black text-center tracking-[0.3em] text-vox-black"
                    maxLength={6}
                  />
                  <button
                    onClick={() => {
                      if (!playerName.trim()) {
                        actions.setError("Please enter your name first!");
                        return;
                      }
                      if (joinCode.length < 6) {
                        actions.setError("Please enter a valid 6-character code!");
                        return;
                      }
                      unlockAudio();
                      actions.joinRoom(joinCode);
                    }}
                    className="vox-button px-8 py-3"
                  >
                    {t.join}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (!playerName.trim()) {
                actions.setError("Please enter your name first!");
                return;
              }
              unlockAudio();
              setShowCreate(true);
            }}
            className="w-full vox-button py-8 text-2xl flex items-center justify-center gap-4 group"
          >
            <Play size={28} fill="currentColor" />
            <span>{t.startNew}</span>
          </button>
        </div>

        {/* Right: Info */}
        <div className="lg:col-span-7">
          <div className="vox-card h-full p-6 md:p-12 flex flex-col items-center justify-center text-center relative overflow-visible">
            <div className="tape -top-4 -right-4 rotate-12" />
            <Music size={64} className="md:size-[120px] text-vox-black/10 mb-8" />
            <h3 className="vox-title text-2xl md:text-4xl mb-4 text-vox-black">{t.selectCategory}</h3>
            <p className="handwritten text-lg md:text-xl opacity-60 text-vox-black max-w-sm">
              Connect your favorite Spotify or Apple Music playlists, or challenge friends with movies, cartoons, and world landmarks.
            </p>
          </div>
        </div>
      </div>

      {/* Category Selection Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-vox-black/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, rotate: -2 }}
              animate={{ scale: 1, rotate: 0 }}
              className="vox-card max-w-lg w-full text-center relative overflow-visible"
            >
              <div className="tape -top-6 left-1/2 -translate-x-1/2 w-32" />
              
              <h2 className="vox-title text-2xl md:text-4xl mb-2 italic text-vox-black">{t.selectCategory}</h2>
              <p className="handwritten text-lg mb-8 text-vox-black opacity-60">
                Choose your challenge
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      className={`vox-button py-6 flex flex-col items-center gap-3 transition-all ${
                        isSelected 
                          ? 'selected bg-vox-yellow text-black' 
                          : 'bg-vox-white text-vox-black'
                      }`}
                    >
                      <div 
                        className="w-12 h-12 border-2 border-vox-black flex items-center justify-center"
                        style={{ backgroundColor: isSelected ? cat.color : 'transparent' }}
                      >
                        <Icon size={24} />
                      </div>
                      <span className="text-sm font-black uppercase tracking-widest">{cat.name}</span>
                      <span className="text-[10px] opacity-60 font-medium">{cat.desc}</span>
                    </button>
                  );
                })}
              </div>
              
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    if (selectedCategory) {
                      actions.createRoom(selectedCategory.id as any);
                      setShowCreate(false);
                      setSelectedCategory(null);
                    }
                  }}
                  disabled={!selectedCategory}
                  className="vox-button py-6 text-xl disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t.initializeGame}
                </button>
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setSelectedCategory(null);
                  }}
                  className="font-black uppercase tracking-widest text-xs hover:text-vox-red transition-colors text-vox-black"
                >
                  [ {t.cancel} ]
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
