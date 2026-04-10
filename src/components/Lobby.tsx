import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { 
  Users, 
  Copy, 
  Check, 
  Search, 
  Play, 
  Settings, 
  Music, 
  Hash, 
  Timer, 
  FastForward,
  Languages,
  Globe,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { MOVIE_CLUES, CARTOON_CLUES, LANDMARK_CLUES } from '../data/gameContent';

export function Lobby() {
  const { room, socket, actions, gameStatus } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingClues, setIsGeneratingClues] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string, name: string, image: string, url?: string } | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [detectedLanguages, setDetectedLanguages] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isDetectingLanguages, setIsDetectingLanguages] = useState(false);

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistTracks();
    }
  }, [selectedPlaylist]);

  const fetchPlaylistTracks = async () => {
    if (!selectedPlaylist) return;
    setIsDetectingLanguages(true);
    try {
      const res = await axios.post('/api/playlist/tracks', { 
        url: selectedPlaylist.url, 
        playlistId: selectedPlaylist.id 
      });
      const tracks = res.data.tracks;
      setPlaylistTracks(tracks);
      
      // Detect languages locally
      detectLanguages(tracks);
    } catch (err) {
      console.error("Failed to fetch tracks:", err);
    } finally {
      setIsDetectingLanguages(false);
    }
  };

  const detectLanguages = (tracks: any[]) => {
    const languages = new Set<string>();
    languages.add("English"); // Default

    const thaiRegex = /[\u0E00-\u0E7F]/;
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
    const chineseRegex = /[\u4E00-\u9FFF]/;

    tracks.forEach(track => {
      const text = (track.name + " " + track.artist);
      if (thaiRegex.test(text)) languages.add("Thai");
      if (japaneseRegex.test(text)) languages.add("Japanese");
      if (koreanRegex.test(text)) languages.add("Korean");
      if (chineseRegex.test(text)) languages.add("Chinese");
    });

    const langs = Array.from(languages);
    setDetectedLanguages(langs);
    setSelectedLanguages(langs);
  };

  const handleStartGame = async () => {
    if (room.category === 'MUSIC') {
      if (!selectedPlaylist) return;
      
      let trackIds: string[] | undefined = undefined;
      
      if (selectedLanguages.length < detectedLanguages.length) {
        // Simple local filter
        const thaiRegex = /[\u0E00-\u0E7F]/;
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
        const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
        const chineseRegex = /[\u4E00-\u9FFF]/;

        trackIds = playlistTracks.filter(t => {
          const text = (t.name + " " + t.artist);
          const trackLangs = ["English"];
          if (thaiRegex.test(text)) trackLangs.push("Thai");
          if (japaneseRegex.test(text)) trackLangs.push("Japanese");
          if (koreanRegex.test(text)) trackLangs.push("Korean");
          if (chineseRegex.test(text)) trackLangs.push("Chinese");
          
          return trackLangs.some(l => selectedLanguages.includes(l));
        }).map(t => t.id);
      }

      actions.startGame(selectedPlaylist.id, trackIds);
    } else {
      setIsGeneratingClues(true);
      // Simulate a small delay for "Initialization" feel
      setTimeout(() => {
        try {
          let sourceList: any[] = [];
          if (room.category === "MOVIE") sourceList = [...MOVIE_CLUES];
          else if (room.category === "CARTOON") sourceList = [...CARTOON_CLUES];
          else if (room.category === "LANDMARK") sourceList = [...LANDMARK_CLUES];

          // Shuffle and pick
          const shuffled = sourceList.sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, room.settings.numTracks || 5);

          const customTracks = selected.map((c: any, i: number) => {
            // Use a more robust image URL with fallback and category context
            const categoryKeyword = room.category.toLowerCase();
            const searchTerms = encodeURIComponent(`${c.imageUrl || c.name} ${categoryKeyword}`);
            // Use weserv.nl as a proxy to help with image loading and SSL/Referrer issues
            const imgUrl = `https://images.weserv.nl/?url=loremflickr.com/800/600/${searchTerms}?lock=${i}-${Date.now()}&w=800&h=600&fit=cover`;
            
            return {
              id: `clue-${i}-${Date.now()}`,
              name: c.name,
              artist: c.artist,
              description: c.description,
              imageUrl: imgUrl,
              previewUrl: "",
              albumArt: imgUrl
            };
          });

          actions.startGame("", undefined, customTracks);
        } catch (error) {
          console.error("Content preparation failed:", error);
          alert("Failed to prepare game content. Please try again.");
        } finally {
          setIsGeneratingClues(false);
        }
      }, 800);
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
      const res = await axios.post('/api/playlist/search', { query: searchQuery });
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
    // Spotify
    const spotifyMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
    // Apple Music
    const appleMatch = url.match(/music\.apple\.com\/.*\/playlist\/.*\/([a-zA-Z0-9.]+)/);

    if (spotifyMatch && spotifyMatch[1]) {
      const playlistId = spotifyMatch[1];
      try {
        const res = await axios.post('/api/playlist/details', { playlistId, url });
        setSelectedPlaylist({ id: res.data.id, name: res.data.name, image: res.data.images[0]?.url || "", url });
      } catch (err) {
        setSelectedPlaylist({ id: playlistId, name: "Spotify Playlist", image: "", url });
      }
    } else if (appleMatch) {
      try {
        const res = await axios.post('/api/playlist/details', { url });
        setSelectedPlaylist({ id: res.data.id, name: res.data.name, image: res.data.images[0]?.url || "", url });
      } catch (err) {
        setSelectedPlaylist({ id: url, name: "Apple Music Playlist", image: "", url });
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 p-4"
    >
      <AnimatePresence>
        {gameStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0502]/90 backdrop-blur-xl"
          >
            <div className="w-16 h-16 border-4 border-[#1DB954]/20 border-t-[#1DB954] rounded-full animate-spin mb-8" />
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tighter uppercase font-['Anton']">Initializing Sequence</h2>
              <p className="text-[#1DB954] font-mono text-xs uppercase tracking-[0.3em] animate-pulse">{gameStatus}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Column: Room Info & Players (3 cols) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-[#151619] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1DB954] to-transparent opacity-50" />
          
          <div className="text-center mb-8">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-3">System // Access Code</p>
            <div 
              onClick={copyCode}
              className="inline-flex items-center gap-4 bg-black/40 border border-white/5 px-8 py-4 rounded-xl cursor-pointer hover:border-[#1DB954]/50 transition-all group"
            >
              <span className="text-4xl font-mono font-bold tracking-[0.15em] text-white group-hover:text-[#1DB954] transition-colors">{room.id}</span>
              {copied ? <Check className="text-[#1DB954]" size={20} /> : <Copy className="text-white/20 group-hover:text-white/40" size={20} />}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                <Users size={12} /> Connected Units
              </h3>
              <span className="font-mono text-xs text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded border border-[#1DB954]/20">
                {playersList.length.toString().padStart(2, '0')}
              </span>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {playersList.map((p) => (
                <motion.div 
                  layout
                  key={p.id} 
                  className="flex items-center justify-between bg-white/[0.03] border border-white/5 p-3 rounded-xl group hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${p.isHost ? 'bg-[#1DB954] shadow-[0_0_8px_#1DB954]' : 'bg-white/20'}`} />
                    <span className="font-medium text-sm text-white/80">{p.name}</span>
                  </div>
                  {p.isHost && <span className="text-[9px] font-mono uppercase tracking-widest text-[#1DB954] border border-[#1DB954]/30 px-1.5 py-0.5 rounded">Host</span>}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Settings & Selection (8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        {isHost ? (
          <div className="space-y-6">
            <div className="bg-[#151619] border border-white/10 rounded-2xl p-8 shadow-2xl relative">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-lg bg-[#1DB954]/10 flex items-center justify-center border border-[#1DB954]/20">
                  <Settings size={16} className="text-[#1DB954]" />
                </div>
                <h3 className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/60">Configuration Panel</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                    <Timer size={12} /> Guess Time (s)
                  </label>
                  <input 
                    type="number"
                    min="5"
                    max="60"
                    value={room.settings.guessTime}
                    onChange={(e) => actions.updateSettings({ guessTime: parseInt(e.target.value) || 15 })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-lg text-[#1DB954] focus:outline-none focus:border-[#1DB954]/50 transition-colors"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                    <Hash size={12} /> {room.category === 'MUSIC' ? 'Track Count' : 'Round Count'}
                  </label>
                  <input 
                    type="number"
                    min="1"
                    max="50"
                    value={room.settings.numTracks}
                    onChange={(e) => actions.updateSettings({ numTracks: parseInt(e.target.value) || 5 })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-lg text-[#1DB954] focus:outline-none focus:border-[#1DB954]/50 transition-colors"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                    <FastForward size={12} /> Intermission (s)
                  </label>
                  <input 
                    type="number"
                    min="3"
                    max="30"
                    value={room.settings.intermissionTime}
                    onChange={(e) => actions.updateSettings({ intermissionTime: parseInt(e.target.value) || 8 })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-lg text-[#1DB954] focus:outline-none focus:border-[#1DB954]/50 transition-colors"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                    <Lightbulb size={12} /> Hints Per Game
                  </label>
                  <input 
                    type="number"
                    min="0"
                    max="10"
                    value={room.settings.hintsPerGame}
                    onChange={(e) => actions.updateSettings({ hintsPerGame: parseInt(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-lg text-[#1DB954] focus:outline-none focus:border-[#1DB954]/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">Input Protocol</label>
                  <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                    {[
                      { id: "TYPING", label: "Manual" },
                      { id: "CHOICE_4", label: "4-Way" },
                      { id: "CHOICE_5", label: "5-Way" }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => actions.updateSettings({ gameMode: mode.id as any })}
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${room.settings.gameMode === mode.id ? 'bg-[#1DB954] text-black font-bold shadow-[0_0_15px_rgba(29,185,84,0.3)]' : 'text-white/40 hover:text-white/60'}`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
                {room.category === 'MUSIC' && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">Target Data</label>
                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                      {[
                        { id: "SONG", label: "Song" },
                        { id: "ARTIST", label: "Artist" },
                        { id: "BOTH", label: "Both" }
                      ].map(target => (
                        <button
                          key={target.id}
                          onClick={() => actions.updateSettings({ guessTarget: target.id as any })}
                          className={`flex-1 py-2.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${room.settings.guessTarget === target.id ? 'bg-[#1DB954] text-black font-bold shadow-[0_0_15px_rgba(29,185,84,0.3)]' : 'text-white/40 hover:text-white/60'}`}
                        >
                          {target.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category-Specific Settings */}
              {room.category === 'MUSIC' ? (
                <div className="space-y-4 border-t border-white/5 pt-8">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">Source Library</label>
                  </div>
                  
                  <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-grow">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handlePlaylistUrl(e.target.value);
                        }}
                        placeholder="Search Spotify or paste playlist URL..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#1DB954]/50 transition-all"
                      />
                    </div>
                    <button type="submit" className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 rounded-xl transition-all group">
                      <Search size={20} className="text-white/40 group-hover:text-white/80" />
                    </button>
                  </form>

                  {isSearching && (
                    <div className="flex items-center justify-center py-8 gap-3">
                      <div className="w-4 h-4 border-2 border-[#1DB954]/30 border-t-[#1DB954] rounded-full animate-spin" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">Scanning Database...</span>
                    </div>
                  )}

                  {searchResults.length > 0 && !selectedPlaylist && (
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-[10px] font-mono uppercase tracking-widest text-white/40">Search Results</h4>
                        <button 
                          onClick={() => setSearchResults([])}
                          className="text-[10px] font-mono text-white/20 hover:text-white/40 uppercase tracking-widest"
                        >
                          [ Clear ]
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {searchResults.map(pl => (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={pl.id}
                            onClick={() => {
                              setSelectedPlaylist({ id: pl.id, name: pl.name, image: pl.images[0]?.url, url: pl.url });
                              setSearchResults([]);
                            }}
                            className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                          >
                            <div className="relative w-12 h-12 flex-shrink-0">
                              {pl.images?.[0] ? (
                                <img src={pl.images[0].url} alt="" className="w-full h-full rounded-lg object-cover grayscale group-hover:grayscale-0 transition-all" />
                              ) : (
                                <div className="w-full h-full bg-white/5 rounded-lg flex items-center justify-center"><Music size={16} className="text-white/20"/></div>
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-bold text-sm truncate text-white/80 group-hover:text-white">{pl.name}</p>
                              <p className="text-[10px] font-mono text-white/30 truncate uppercase tracking-wider">By {pl.owner?.display_name || 'Unknown'}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPlaylist && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col bg-[#1DB954]/5 border border-[#1DB954]/20 p-6 rounded-2xl mt-4"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            {selectedPlaylist.image ? (
                              <img src={selectedPlaylist.image} alt="" className="w-20 h-20 rounded-xl shadow-2xl object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-20 h-20 bg-[#1DB954]/10 rounded-xl flex items-center justify-center"><Music size={28} className="text-[#1DB954]"/></div>
                            )}
                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg">
                              <Check size={14} className="text-black font-bold" />
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-mono text-[#1DB954] font-bold uppercase tracking-[0.3em] mb-2">Active Library</p>
                            <p className="font-bold text-xl text-white tracking-tight">{selectedPlaylist.name}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedPlaylist(null);
                            setPlaylistTracks([]);
                            setDetectedLanguages([]);
                            setSelectedLanguages([]);
                          }}
                          className="text-[10px] font-mono text-white/30 hover:text-[#1DB954] uppercase tracking-widest transition-colors"
                        >
                          [ Reset ]
                        </button>
                      </div>

                      {/* Language Selection */}
                      <div className="space-y-4 border-t border-white/5 pt-6">
                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                          <Languages size={12} /> Language Filter
                        </div>
                        {isDetectingLanguages ? (
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-4 h-4 border-2 border-[#1DB954]/30 border-t-[#1DB954] rounded-full animate-spin" />
                            <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Analyzing Linguistics...</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {detectedLanguages.map(lang => (
                              <button
                                key={lang}
                                onClick={() => {
                                  if (selectedLanguages.includes(lang)) {
                                    if (selectedLanguages.length > 1) {
                                      setSelectedLanguages(prev => prev.filter(l => l !== lang));
                                    }
                                  } else {
                                    setSelectedLanguages(prev => [...prev, lang]);
                                  }
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest border transition-all ${selectedLanguages.includes(lang) ? 'bg-[#1DB954]/20 border-[#1DB954]/50 text-[#1DB954]' : 'bg-black/20 border-white/5 text-white/30 hover:border-white/20'}`}
                              >
                                {lang}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : room.category === 'MOVIE' ? (
                <div className="space-y-6 border-t border-white/5 pt-8">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">Movie Genre</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Action/Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Thai Movies', 'Classic'].map(genre => (
                      <button
                        key={genre}
                        onClick={() => actions.updateSettings({ movieGenre: genre })}
                        className={`py-4 rounded-2xl text-[10px] font-mono uppercase tracking-widest border transition-all ${room.settings.movieGenre === genre ? 'bg-[#E50914]/20 border-[#E50914]/50 text-[#E50914]' : 'bg-black/20 border-white/5 text-white/30 hover:border-white/20'}`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              ) : room.category === 'CARTOON' ? (
                <div className="space-y-6 border-t border-white/5 pt-8">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">Cartoon Source</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Disney/Pixar', 'Cartoon Network', 'Nickelodeon', 'Anime', 'Classic 90s'].map(source => (
                      <button
                        key={source}
                        onClick={() => actions.updateSettings({ cartoonSource: source })}
                        className={`py-4 rounded-2xl text-[10px] font-mono uppercase tracking-widest border transition-all ${room.settings.cartoonSource === source ? 'bg-[#FFD700]/20 border-[#FFD700]/50 text-[#FFD700]' : 'bg-black/20 border-white/5 text-white/30 hover:border-white/20'}`}
                      >
                        {source}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 border-t border-white/5 pt-8">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 block">Landmark Region</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Global', 'Asia (Thai Focus)', 'Australia', 'Europe', 'Americas'].map(region => (
                      <button
                        key={region}
                        onClick={() => actions.updateSettings({ landmarkRegion: region })}
                        className={`py-4 rounded-2xl text-[10px] font-mono uppercase tracking-widest border transition-all ${room.settings.landmarkRegion === region ? 'bg-[#00A8E8]/20 border-[#00A8E8]/50 text-[#00A8E8]' : 'bg-black/20 border-white/5 text-white/30 hover:border-white/20'}`}
                      >
                        {region}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleStartGame}
              disabled={(room.category === 'MUSIC' && (!selectedPlaylist || isDetectingLanguages)) || isGeneratingClues}
              className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-6 rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed text-sm uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(29,185,84,0.2)] hover:shadow-[0_25px_50px_rgba(29,185,84,0.3)] hover:-translate-y-1 active:translate-y-0"
            >
              <Play size={20} fill="currentColor" />
              {isGeneratingClues ? "Generating Content..." : (room.category === 'MUSIC' && isDetectingLanguages) ? "Analyzing Playlist..." : "Initialize Sequence"}
            </button>
          </div>
        ) : (
          <div className="bg-[#151619] border border-white/10 rounded-2xl p-12 h-full flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#1DB954]/5 to-transparent opacity-50" />
            
            <div className="relative">
              <div className="w-24 h-24 border-2 border-[#1DB954]/10 border-t-[#1DB954] rounded-full animate-spin mb-8" />
              <Disc3 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#1DB954] animate-pulse" size={40} />
            </div>
            
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Synchronizing...</h2>
            <p className="text-white/40 text-sm max-w-xs font-mono uppercase tracking-widest leading-relaxed">
              Waiting for host to authorize session parameters
            </p>
            
            <div className="mt-16 w-full max-w-sm bg-black/40 rounded-2xl p-6 border border-white/5">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-6 border-b border-white/5 pb-4 text-left">Session Metadata</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Guess Window</span>
                  <span className="font-mono text-[#1DB954]">{room.settings.guessTime.toString().padStart(2, '0')}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{room.category === 'MUSIC' ? 'Data Points' : 'Rounds'}</span>
                  <span className="font-mono text-[#1DB954]">{room.settings.numTracks.toString().padStart(2, '0')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Protocol</span>
                  <motion.span 
                    key={room.settings.gameMode}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-mono text-[#1DB954]"
                  >
                    {room.settings.gameMode}
                  </motion.span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const Disc3 = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
