import { useState } from 'react';
import { useGameStore } from '../store';
import { Music, Users, Play } from 'lucide-react';
import { motion } from 'motion/react';

export function Home() {
  const { playerName, actions } = useGameStore();
  const [joinCode, setJoinCode] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1DB954]/20 text-[#1DB954] mb-6">
          <Music size={40} />
        </div>
        <h1 className="text-5xl font-bold tracking-tighter mb-4 font-['Anton',sans-serif] uppercase">
          Guess The <span className="text-[#1DB954]">Drop</span>
        </h1>
        <p className="text-white/60 text-lg">Multiplayer Spotify Music Trivia</p>
      </div>

      <div className="space-y-6 bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/50 mb-2">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => actions.setName(e.target.value)}
            placeholder="Enter your nickname"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition-all"
            maxLength={15}
          />
        </div>

        <div className="pt-4 space-y-4">
          <button
            onClick={actions.createRoom}
            disabled={!playerName.trim()}
            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={20} fill="currentColor" />
            CREATE NEW ROOM
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-white/30 text-xs font-bold uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              className="flex-grow bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 text-center font-mono uppercase tracking-widest"
              maxLength={6}
            />
            <button
              onClick={() => actions.joinRoom(joinCode)}
              disabled={!playerName.trim() || joinCode.length < 6}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              JOIN
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
