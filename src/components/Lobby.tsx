import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { Users, Copy, Check, Search, Play, Settings, Music } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';

export function Lobby() {
  const { room, socket, actions } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string, name: string, image: string } | null>(null);
  const { userToken } = useGameStore();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        actions.setUserToken(event.data.token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [actions]);

  const handleSpotifyLogin = async () => {
    try {
      const response = await fetch('/api/auth/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      
      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) {
        alert('Please allow popups for this site to connect your Spotify account.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };

  if (!room || !socket) return null;

  const isHost = room.players[socket.id]?.isHost;
  const playersList = Object.values(room.players);

  const copyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const headers = userToken ? { Authorization: `Bearer ${userToken}` } : {};
      const res = await axios.post('/api/playlist/search', { query: searchQuery }, { headers });
      setSearchResults(res.data);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || err.message;
      actions.clearError();
      useGameStore.setState({ error: `Search failed: ${msg}` });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlaylistUrl = async (url: string) => {
    // Extract ID from Spotify URL
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      const playlistId = match[1];
      try {
        const headers = userToken ? { Authorization: `Bearer ${userToken}` } : {};
        const res = await axios.post('/api/playlist/details', { playlistId }, { headers });
        setSelectedPlaylist({ id: res.data.id, name: res.data.name, image: res.data.images[0]?.url || "" });
      } catch (err) {
        // Fallback if API fails
        setSelectedPlaylist({ id: playlistId, name: "Custom Playlist", image: "" });
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      {/* Left Column: Players & Room Info */}
      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
          <div className="text-center mb-6">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">Room Code</p>
            <div 
              onClick={copyCode}
              className="inline-flex items-center gap-3 bg-black/50 px-6 py-3 rounded-xl cursor-pointer hover:bg-black/70 transition-colors group"
            >
              <span className="text-4xl font-mono font-bold tracking-widest">{room.id}</span>
              {copied ? <Check className="text-[#1DB954]" /> : <Copy className="text-white/30 group-hover:text-white/70" />}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/70 flex items-center gap-2">
                <Users size={16} /> Players
              </h3>
              <span className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded-full font-mono">
                {playersList.length}
              </span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {playersList.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-black/30 p-3 rounded-xl">
                  <span className="font-medium">{p.name}</span>
                  {p.isHost && <span className="text-[#1DB954] text-xs font-bold uppercase tracking-wider bg-[#1DB954]/10 px-2 py-1 rounded-md">Host</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Settings & Playlist Selection */}
      <div className="lg:col-span-2 space-y-6">
        {isHost ? (
          <>
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/70 flex items-center gap-2 mb-6">
                <Settings size={16} /> Game Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-white/50 mb-3">Guess Time</label>
                  <div className="flex gap-2">
                    {[10, 15, 30].map(time => (
                      <button
                        key={time}
                        onClick={() => actions.updateSettings({ guessTime: time })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${room.settings.guessTime === time ? 'bg-[#1DB954] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        {time}s
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-white/50 mb-3">Number of Tracks</label>
                  <div className="flex gap-2">
                    {[5, 10, 15].map(num => (
                      <button
                        key={num}
                        onClick={() => actions.updateSettings({ numTracks: num })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${room.settings.numTracks === num ? 'bg-[#1DB954] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-white/50 mb-3">Game Mode</label>
                  <div className="flex gap-2">
                    {[
                      { id: "TYPING", label: "Type" },
                      { id: "CHOICE_4", label: "4 Choices" },
                      { id: "CHOICE_5", label: "5 Choices" }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => actions.updateSettings({ gameMode: mode.id as any })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${room.settings.gameMode === mode.id ? 'bg-[#1DB954] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-white/50 mb-3">What to Guess</label>
                  <div className="flex gap-2">
                    {[
                      { id: "SONG", label: "Song" },
                      { id: "ARTIST", label: "Artist" },
                      { id: "BOTH", label: "Both" }
                    ].map(target => (
                      <button
                        key={target.id}
                        onClick={() => actions.updateSettings({ guessTarget: target.id as any })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${room.settings.guessTarget === target.id ? 'bg-[#1DB954] text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        {target.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold tracking-widest uppercase text-white/50">Select Playlist</label>
                  {!userToken ? (
                    <button 
                      onClick={handleSpotifyLogin}
                      className="text-xs bg-[#1DB954] text-black px-3 py-1 rounded-full font-bold hover:bg-[#1ed760] transition-colors"
                    >
                      Login with Spotify
                    </button>
                  ) : (
                    <span className="text-xs text-[#1DB954] font-bold">✓ Spotify Connected</span>
                  )}
                </div>
                
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handlePlaylistUrl(e.target.value);
                    }}
                    placeholder="Search Spotify or paste playlist URL..."
                    className="flex-grow bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#1DB954]"
                  />
                  <button type="submit" className="bg-white/10 hover:bg-white/20 px-4 rounded-xl transition-colors">
                    <Search size={20} />
                  </button>
                </form>
                
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
                    handlePlaylistUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
                  }}
                  className="text-xs text-[#1DB954] hover:underline mt-1 inline-block"
                >
                  Try a test playlist (Today's Top Hits)
                </button>

                {isSearching && <div className="text-center py-4 text-white/50">Searching...</div>}

                {searchResults.length > 0 && !selectedPlaylist && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {searchResults.map(pl => (
                      <div 
                        key={pl.id}
                        onClick={() => setSelectedPlaylist({ id: pl.id, name: pl.name, image: pl.images[0]?.url })}
                        className="flex items-center gap-3 bg-black/30 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
                      >
                        {pl.images?.[0] ? (
                          <img src={pl.images[0].url} alt="" className="w-12 h-12 rounded-md object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-white/10 rounded-md flex items-center justify-center"><Music size={20} className="text-white/30"/></div>
                        )}
                        <div className="overflow-hidden">
                          <p className="font-bold truncate">{pl.name}</p>
                          <p className="text-xs text-white/50 truncate">By {pl.owner?.display_name || 'Unknown'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPlaylist && (
                  <div className="flex items-center justify-between bg-[#1DB954]/10 border border-[#1DB954]/30 p-4 rounded-xl mt-4">
                    <div className="flex items-center gap-4">
                      {selectedPlaylist.image ? (
                        <img src={selectedPlaylist.image} alt="" className="w-16 h-16 rounded-lg shadow-lg" />
                      ) : (
                        <div className="w-16 h-16 bg-[#1DB954]/20 rounded-lg flex items-center justify-center"><Music size={24} className="text-[#1DB954]"/></div>
                      )}
                      <div>
                        <p className="text-xs text-[#1DB954] font-bold uppercase tracking-widest mb-1">Selected Playlist</p>
                        <p className="font-bold text-lg">{selectedPlaylist.name}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedPlaylist(null)}
                      className="text-white/50 hover:text-white text-sm underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => selectedPlaylist && actions.startGame(selectedPlaylist.id)}
              disabled={!selectedPlaylist}
              className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-5 rounded-3xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-[0_0_40px_rgba(29,185,84,0.3)] hover:shadow-[0_0_60px_rgba(29,185,84,0.5)]"
            >
              <Play size={24} fill="currentColor" />
              START GAME
            </button>
          </>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl p-12 rounded-3xl border border-white/10 h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 border-4 border-[#1DB954]/30 border-t-[#1DB954] rounded-full animate-spin mb-6" />
            <h2 className="text-2xl font-bold mb-2">Waiting for Host</h2>
            <p className="text-white/50">The host is selecting a playlist and configuring settings...</p>
            
            <div className="mt-12 w-full max-w-xs bg-black/30 rounded-xl p-4">
              <p className="text-xs text-white/50 uppercase tracking-widest mb-2">Current Settings</p>
              <div className="flex justify-between text-sm mb-1">
                <span>Guess Time:</span>
                <span className="font-mono">{room.settings.guessTime}s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tracks:</span>
                <span className="font-mono">{room.settings.numTracks}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
