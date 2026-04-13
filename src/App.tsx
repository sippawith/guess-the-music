import { useEffect } from 'react';
import { useGameStore } from './store';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { RoundEnd } from './components/RoundEnd';
import { GameEnd } from './components/GameEnd';
import { Countdown } from './components/Countdown';
import { AudioPlayer } from './components/AudioPlayer';
import { AlertCircle, Sun, Moon, Languages } from 'lucide-react';

export default function App() {
  const { room, error, theme, actions, viewingLobby } = useGameStore();

  useEffect(() => {
    actions.connect();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-screen transition-colors duration-300">
      <AudioPlayer />
      
      {/* Global Header for Toggles */}
      <div className="fixed top-4 right-4 z-[100] flex items-center gap-2">
        <button
          onClick={() => actions.toggleTheme()}
          className="vox-button px-3 py-2 flex items-center gap-2 bg-vox-white text-vox-black"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span className="text-[10px] font-black uppercase">{theme}</span>
        </button>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] bg-vox-red text-white px-6 py-3 border-2 border-vox-black shadow-vox flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-black text-sm uppercase tracking-widest">{error}</span>
          <button onClick={actions.clearError} className="ml-4 font-black hover:scale-125 transition-transform">&times;</button>
        </div>
      )}

      <main className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        <Countdown />
        {!room && <Home />}
        {room && (viewingLobby || room.state === 'LOBBY') && <Lobby />}
        {room && !viewingLobby && room.state === 'PLAYING' && <Game />}
        {room && !viewingLobby && room.state === 'ROUND_END' && <RoundEnd />}
        {room && !viewingLobby && room.state === 'GAME_END' && <GameEnd />}
      </main>
    </div>
  );
}
