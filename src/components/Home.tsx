import { useState } from 'react';
import { useGameStore } from '../store';
import { Music, Play, Film, Tv, MapPin, Terminal, Hash, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';

const CATEGORIES = [
  { id: 'MUSIC', name: 'Music', icon: Music, color: '#ffeb00', desc: 'Spotify & Apple Playlists' },
  { id: 'MOVIE', name: 'Movies', icon: Film, color: '#ffeb00', desc: 'Memorable Scenes' },
  { id: 'CARTOON', name: 'Cartoons', icon: Tv, color: '#ffeb00', desc: 'Disney & CN Classics' },
  { id: 'LANDMARK', name: 'Landmarks', icon: MapPin, color: '#ffeb00', desc: 'Global Wonders' },
] as const;

export function Home() {
  const { playerName, actions } = useGameStore();
  const t = translations.en;
  const [joinCode, setJoinCode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]['id']>('MUSIC');
  const [showCreate, setShowCreate] = useState(false);

  const unlockAudio = () => {
    const silentAudio = new Audio("data:audio/mp3;base64,//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB");
    silentAudio.play().catch(() => {});
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-5xl px-4 py-12"
    >
      {/* Header Section: Magazine Style */}
      <div className="relative mb-20">
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-vox-yellow/20 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col items-start">
          <motion.span 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="handwritten text-2xl mb-2 -rotate-3 block text-vox-black"
          >
            {t.subtitle}
          </motion.span>
          <h1 className="vox-title text-7xl md:text-[10rem] leading-[0.85] mb-4 text-vox-black">
            {t.title.split(' ')[0]}<br />
            <span className="bg-vox-yellow px-4 text-black">{t.title.split(' ')[1]}</span>
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
                      unlockAudio();
                      actions.joinRoom(joinCode);
                    }}
                    disabled={!playerName.trim() || joinCode.length < 6}
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
              unlockAudio();
              setShowCreate(true);
            }}
            disabled={!playerName.trim()}
            className="w-full vox-button py-8 text-2xl flex items-center justify-center gap-4 group"
          >
            <Play size={28} fill="currentColor" />
            <span>{t.startNew}</span>
          </button>
        </div>

        {/* Right: Category Selection */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Terminal size={20} className="text-vox-black" />
              <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.selectCategory}</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`vox-card group relative transition-all text-left ${
                  selectedCategory === cat.id 
                    ? 'bg-vox-yellow -translate-x-1 -translate-y-1 shadow-vox-lg text-black' 
                    : 'hover:-translate-x-1 hover:-translate-y-1 hover:shadow-vox-lg text-vox-black'
                }`}
              >
                {selectedCategory === cat.id && <div className="tape -top-2 -right-2 bg-vox-black/10" />}
                <div className="flex items-start justify-between mb-4">
                  <cat.icon 
                    size={32} 
                    className={`transition-transform group-hover:rotate-12 ${selectedCategory === cat.id ? 'text-vox-black' : 'text-vox-black/40'}`}
                  />
                  <span className="font-serif italic text-4xl opacity-10 group-hover:opacity-20 transition-opacity">0{CATEGORIES.indexOf(cat) + 1}</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-black uppercase tracking-tighter">{cat.name}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{cat.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-vox-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, rotate: -2 }}
              animate={{ scale: 1, rotate: 0 }}
              className="vox-card max-w-md w-full text-center relative overflow-visible"
            >
              <div className="tape -top-6 left-1/2 -translate-x-1/2 w-32" />
              
              <div className="inline-flex items-center justify-center w-24 h-24 bg-vox-yellow border-4 border-vox-black mb-8 rotate-3">
                {(() => {
                  const Icon = CATEGORIES.find(c => c.id === selectedCategory)?.icon || Music;
                  return <Icon size={48} className="text-black" />;
                })()}
              </div>
              
              <h2 className="vox-title text-5xl mb-2 italic text-vox-black">{t.confirmSelection}</h2>
              <p className="handwritten text-xl mb-12 text-vox-black">
                {t.readyToStart} {selectedCategory}?
              </p>
              
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => actions.createRoom(selectedCategory)}
                  className="vox-button py-6 text-xl"
                >
                  {t.initializeGame}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
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
