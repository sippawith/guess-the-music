import { useState } from 'react';
import { useGameStore } from '../store';
import { Music, Users, Play, Film, Tv, MapPin, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'MUSIC', name: 'Music', icon: Music, color: '#1DB954', desc: 'Spotify & Apple Playlists' },
  { id: 'MOVIE', name: 'Movies', icon: Film, color: '#E50914', desc: 'Memorable Scenes' },
  { id: 'CARTOON', name: 'Cartoons', icon: Tv, color: '#FFD700', desc: 'Disney & CN Classics' },
  { id: 'LANDMARK', name: 'Landmarks', icon: MapPin, color: '#00A8E8', desc: 'Global Wonders' },
] as const;

export function Home() {
  const { playerName, actions } = useGameStore();
  const [joinCode, setJoinCode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]['id']>('MUSIC');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl"
    >
      <div className="text-center mb-12">
        <motion.div 
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 5 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 text-[#1DB954] mb-8 shadow-2xl"
        >
          <Sparkles size={48} />
        </motion.div>
        <h1 className="text-7xl font-black tracking-tighter mb-4 font-['Anton',sans-serif] uppercase leading-none">
          Guess The <span className="text-[#1DB954]">Mystery</span>
        </h1>
        <p className="text-white/40 text-xl font-mono uppercase tracking-[0.3em]">Multi-Category Trivia Engine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Player Info & Join */}
        <div className="space-y-6 bg-[#151619] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="space-y-4">
            <label className="block text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-white/30">Operator Identity</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => actions.setName(e.target.value)}
              placeholder="ENTER NICKNAME"
              className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:outline-none focus:border-[#1DB954] transition-all font-mono uppercase tracking-widest"
              maxLength={15}
            />
          </div>

          <div className="pt-4 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="flex-grow bg-black/50 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:outline-none focus:border-white/20 text-center font-mono uppercase tracking-[0.2em]"
                maxLength={6}
              />
              <button
                onClick={() => actions.joinRoom(joinCode)}
                disabled={!playerName.trim() || joinCode.length < 6}
                className="bg-white/5 hover:bg-white/10 text-white font-bold px-8 rounded-2xl transition-all disabled:opacity-20 border border-white/5"
              >
                JOIN
              </button>
            </div>
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink-0 mx-4 text-white/10 text-[10px] font-mono uppercase tracking-widest">Or</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              disabled={!playerName.trim()}
              className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 uppercase tracking-widest"
            >
              <Play size={20} fill="currentColor" />
              Initialize New Session
            </button>
          </div>
        </div>

        {/* Right: Category Selection */}
        <div className="space-y-6 bg-[#151619] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <label className="block text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-white/30 mb-4">Select Protocol</label>
          <div className="grid grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-center justify-center p-6 rounded-3xl border transition-all gap-3 group ${
                  selectedCategory === cat.id 
                    ? 'bg-white/5 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]' 
                    : 'bg-black/20 border-white/5 opacity-40 hover:opacity-100'
                }`}
              >
                <cat.icon 
                  size={32} 
                  style={{ color: selectedCategory === cat.id ? cat.color : 'white' }}
                  className="transition-transform group-hover:scale-110"
                />
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1">{cat.name}</p>
                  <p className="text-[8px] font-mono text-white/20 uppercase tracking-tighter leading-none">{cat.desc}</p>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0502]/80 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#151619] border border-white/10 p-12 rounded-[3rem] max-w-md w-full text-center shadow-2xl"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/5 border border-white/10 mb-8">
                {(() => {
                  const Icon = CATEGORIES.find(c => c.id === selectedCategory)?.icon || Music;
                  return <Icon size={40} className="text-[#1DB954]" />;
                })()}
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Confirm Protocol</h2>
              <p className="text-white/40 font-mono text-xs uppercase tracking-[0.2em] mb-12">
                Starting {selectedCategory} session as {playerName}
              </p>
              
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => actions.createRoom(selectedCategory)}
                  className="w-full bg-[#1DB954] text-black font-black py-5 rounded-2xl uppercase tracking-widest hover:scale-[1.02] transition-all"
                >
                  Authorize & Launch
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="w-full bg-white/5 text-white/40 font-bold py-4 rounded-2xl uppercase tracking-widest hover:text-white transition-all"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
