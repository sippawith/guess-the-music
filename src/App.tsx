import { useEffect } from 'react';
import { useGameStore } from './store';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { RoundEnd } from './components/RoundEnd';
import { GameEnd } from './components/GameEnd';
import { Countdown } from './components/Countdown';
import { AudioPlayer } from './components/AudioPlayer';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const { room, error, actions } = useGameStore();

  useEffect(() => {
    actions.connect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-[#1DB954] selection:text-black">
      <AudioPlayer />
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_#1a2e1f_0%,_transparent_60%)] opacity-80 blur-[60px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_80%,_#1DB954_0%,_transparent_50%)] opacity-20 blur-[80px]" />
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-sm">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={actions.clearError} className="ml-2 opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}

      <main className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        <Countdown />
        {!room && <Home />}
        {room?.state === 'LOBBY' && <Lobby />}
        {room?.state === 'PLAYING' && <Game />}
        {room?.state === 'ROUND_END' && <RoundEnd />}
        {room?.state === 'GAME_END' && <GameEnd />}
      </main>
    </div>
  );
}
