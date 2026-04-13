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
  ArrowLeft,
  Zap,
  Disc3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { MOVIE_CLUES, CARTOON_CLUES, LANDMARK_CLUES } from '../data/gameContent';
import { translations } from '../translations';

function SettingInput({ label, icon: Icon, value, min, max, onChange }: { 
  label: string, 
  icon: any, 
  value: number, 
  min: number, 
  max: number, 
  onChange: (val: number) => void 
}) {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    const num = parseInt(val);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
          <Icon size={12} /> {label}
        </div>
      </label>
      <input 
        type="number"
        min={min}
        max={max}
        value={localValue}
        onChange={handleChange}
        className="w-full bg-vox-paper border-2 border-vox-black px-4 py-3 font-black text-lg focus:outline-none focus:ring-0 transition-all text-vox-black"
      />
    </div>
  );
}

export function Lobby() {
  const { room, socket, actions, gameStatus, userToken, selectedPlaylist } = useGameStore();
  const t = translations.en;
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingClues, setIsGeneratingClues] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [detectedLanguages, setDetectedLanguages] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isDetectingLanguages, setIsDetectingLanguages] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{id: string, sender: string, message: string}[]>([]);
  const [reactions, setReactions] = useState<{id: string, emoji: string, x: number}[]>([]);

  useEffect(() => {
    if (!socket) return;
    
    const onChatMessage = (msg: any) => {
      setChatHistory(prev => [...prev, msg].slice(-20));
    };
    
    const onReaction = (reaction: any) => {
      setReactions(prev => [...prev, reaction]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reaction.id));
      }, 2000);
    };

    socket.on("chat_message", onChatMessage);
    socket.on("reaction", onReaction);

    return () => {
      socket.off("chat_message", onChatMessage);
      socket.off("reaction", onReaction);
    };
  }, [socket]);

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistTracks();
    }
  }, [selectedPlaylist]);

  const fetchPlaylistTracks = async () => {
    if (!selectedPlaylist) return;
    setIsDetectingLanguages(true);
    setPlaylistTracks([]);
    try {
      let allItems: any[] = [];
      let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${selectedPlaylist.id}/tracks?limit=100`;
      
      console.log("Fetching tracks for playlist:", selectedPlaylist.id);
      
      while (nextUrl && allItems.length < 1000) {
        try {
          const response = await axios.post('/api/playlist/tracks/page', 
            { url: nextUrl },
            { headers: userToken ? { Authorization: `Bearer ${userToken}` } : {} }
          );
          if (response.data.items) {
            allItems = allItems.concat(response.data.items);
          }
          nextUrl = response.data.next;
        } catch (pageErr) {
          console.error("Error fetching page:", nextUrl, pageErr);
          break; // Stop fetching if a page fails
        }
      }
      
      if (allItems.length === 0) {
        throw new Error("No items returned from API");
      }

      const tracks = allItems
        .filter((item: any) => item && item.track)
        .map((item: any) => ({
          id: item.track.id || `track-${Math.random()}`,
          name: item.track.name || "Unknown Track",
          artist: item.track.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist"
        }));

      console.log(`Fetched ${tracks.length} tracks`);
      setPlaylistTracks(tracks);
      detectLanguages(tracks);
    } catch (err) {
      console.error("Failed to fetch tracks via API, falling back to scraper:", err);
      try {
        const res = await axios.post('/api/playlist/tracks', { 
          url: selectedPlaylist.url, 
          playlistId: selectedPlaylist.id 
        });
        if (res.data.tracks) {
          setPlaylistTracks(res.data.tracks);
          detectLanguages(res.data.tracks);
        }
      } catch (fallbackErr) {
        console.error("Fallback fetch failed:", fallbackErr);
      }
    } finally {
      setIsDetectingLanguages(false);
    }
  };

  const detectLanguages = (tracks: any[]) => {
    if (!tracks || tracks.length === 0) {
      setDetectedLanguages(["English"]);
      setSelectedLanguages(["English"]);
      return;
    }

    const languages = new Set<string>();
    languages.add("English"); // Default

    const thaiRegex = /[\u0E00-\u0E7F]/;
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
    const chineseRegex = /[\u4E00-\u9FFF]/;

    tracks.forEach(track => {
      const text = ((track.name || "") + " " + (track.artist || ""));
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
    // Unlock audio context
    const silentAudio = new Audio("data:audio/mp3;base64,//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB//MkxAAQAAAAgAFAAAAAgAAwAAAAB");
    silentAudio.play().catch(() => {});

    if (room.category === 'MUSIC') {
      if (!selectedPlaylist) return;
      
      let customTracks: any[] | undefined = undefined;
      
      if (playlistTracks.length > 0) {
        if (selectedLanguages.length < detectedLanguages.length) {
          // Simple local filter
          const thaiRegex = /[\u0E00-\u0E7F]/;
          const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
          const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
          const chineseRegex = /[\u4E00-\u9FFF]/;

          customTracks = playlistTracks.filter(t => {
            const text = (t.name + " " + t.artist);
            const trackLangs = ["English"];
            if (thaiRegex.test(text)) trackLangs.push("Thai");
            if (japaneseRegex.test(text)) trackLangs.push("Japanese");
            if (koreanRegex.test(text)) trackLangs.push("Korean");
            if (chineseRegex.test(text)) trackLangs.push("Chinese");
            
            return trackLangs.some(l => selectedLanguages.includes(l));
          });
        } else {
          customTracks = playlistTracks;
        }
      }

      actions.startGame(selectedPlaylist.id, undefined, customTracks);
    } else {
      setIsGeneratingClues(true);
      
      const prepareContent = async () => {
        try {
          let sourceList: any[] = [];
          if (room.category === "MOVIE") sourceList = [...MOVIE_CLUES];
          else if (room.category === "CARTOON") sourceList = [...CARTOON_CLUES];
          else if (room.category === "LANDMARK") sourceList = [...LANDMARK_CLUES];

          // Shuffle and pick
          const shuffled = sourceList.sort(() => Math.random() - 0.5);
          const selected = shuffled.slice(0, room.settings.numTracks || 5);

          const customTracks = await Promise.all(selected.map(async (c: any, i: number) => {
            let imgUrl = c.imageUrl;
            if (!imgUrl.startsWith('http')) {
              try {
                const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(c.name)}&prop=pageimages&format=json&pithumbsize=800&origin=*`);
                const data = await res.json();
                const pages = data.query.pages;
                const pageId = Object.keys(pages)[0];
                if (pageId !== '-1' && pages[pageId].thumbnail) {
                  imgUrl = pages[pageId].thumbnail.source;
                } else {
                  // Fallback to placeholder
                  imgUrl = `https://picsum.photos/seed/${encodeURIComponent(c.name)}/800/600`;
                }
              } catch (e) {
                imgUrl = `https://picsum.photos/seed/${encodeURIComponent(c.name)}/800/600`;
              }
            }
            
            return {
              id: `clue-${i}-${Date.now()}`,
              name: c.name,
              artist: c.artist,
              description: c.description,
              imageUrl: imgUrl,
              previewUrl: "",
              albumArt: imgUrl
            };
          }));

          actions.startGame("", undefined, customTracks);
        } catch (error) {
          console.error("Content preparation failed:", error);
          alert("Failed to prepare game content. Please try again.");
        } finally {
          setIsGeneratingClues(false);
        }
      };
      
      prepareContent();
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
        actions.setSelectedPlaylist({ id: res.data.id, name: res.data.name, image: res.data.images[0]?.url || "", url });
      } catch (err) {
        actions.setSelectedPlaylist({ id: playlistId, name: "Spotify Playlist", image: "", url });
      }
    } else if (appleMatch) {
      try {
        const res = await axios.post('/api/playlist/details', { url });
        actions.setSelectedPlaylist({ id: res.data.id, name: res.data.name, image: res.data.images[0]?.url || "", url });
      } catch (err) {
        actions.setSelectedPlaylist({ id: url, name: "Apple Music Playlist", image: "", url });
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 p-4"
    >
      <AnimatePresence>
        {reactions.map(r => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: '100vh', x: `${r.x}vw` }}
            animate={{ opacity: 0, y: '-10vh' }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="fixed text-4xl z-50 pointer-events-none"
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {gameStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-vox-paper/90 backdrop-blur-xl"
          >
            <div className="w-16 h-16 border-4 border-vox-black/10 border-t-vox-black rounded-full animate-spin mb-8" />
            <div className="text-center space-y-2">
              <h2 className="vox-title text-4xl">{t.initializing.split(' ')[0]} <span className="bg-vox-yellow px-2 text-black">{t.initializing.split(' ')[1]}</span></h2>
              <p className="handwritten text-xl opacity-60 animate-pulse">{gameStatus}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Column: Room Info & Players (4 cols) */}
      <div className="lg:col-span-4 space-y-8">
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

        <div className="vox-card relative overflow-visible">
          <div className="tape -top-4 -left-4" />
          
          <button 
            onClick={() => actions.leaveRoom()}
            className="absolute -top-2 -right-2 p-2 rounded-lg bg-white border-2 border-vox-black text-vox-black hover:bg-vox-yellow transition-all z-10 shadow-vox"
            title="Leave Room"
          >
            <ArrowLeft size={16} />
          </button>

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

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-vox-black" />
                  <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.units}</h3>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {playersList.map((p) => (
                  <motion.div 
                    layout
                    key={p.id} 
                    className="flex items-center justify-between bg-vox-white border-2 border-vox-black p-4 hover:bg-vox-yellow transition-all group text-vox-black"
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
              </div>
            </div>
        </div>

        {/* Chat Box */}
        <div className="vox-card relative overflow-visible flex flex-col h-64">
          <div className="tape -top-4 -right-4 rotate-12" />
          <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black mb-4">Lobby Chat</h3>
          <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2 flex flex-col-reverse">
            {[...chatHistory].reverse().map(msg => (
              <div key={msg.id} className="text-sm">
                <span className="font-black text-vox-black">{msg.sender}: </span>
                <span className="font-medium text-vox-black/80">{msg.message}</span>
              </div>
            ))}
          </div>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (chatMessage.trim()) {
                socket?.emit("send_chat", { roomId: room.id, message: chatMessage.trim() });
                setChatMessage('');
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-vox-paper border-2 border-vox-black px-3 py-2 font-medium text-sm focus:outline-none text-vox-black"
            />
            <button type="submit" className="vox-button bg-vox-black text-vox-white px-4 py-2 text-sm">
              Send
            </button>
          </form>
          <div className="flex gap-2 mt-2 justify-center">
            {['🔥', '💀', '🤯', '🎵', '😂'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => socket?.emit("send_reaction", { roomId: room.id, emoji })}
                className="text-xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Settings & Selection (8 cols) */}
      <div className="lg:col-span-8 space-y-8">
        {isHost && room.state === 'LOBBY' ? (
          <div className="space-y-8">
            <div className="vox-card relative overflow-visible">
              <div className="tape -top-4 -right-4 rotate-12" />
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Settings size={20} className="text-vox-black" />
                  <h3 className="font-black uppercase tracking-tighter text-2xl text-vox-black">{t.configuration}</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <SettingInput 
                  label={t.timer}
                  icon={Timer}
                  value={room.settings.guessTime}
                  min={5}
                  max={60}
                  onChange={(val) => actions.updateSettings({ guessTime: val })}
                />
                <SettingInput 
                  label={t.rounds}
                  icon={Hash}
                  value={room.settings.numTracks}
                  min={1}
                  max={1000}
                  onChange={(val) => actions.updateSettings({ numTracks: val })}
                />
                <SettingInput 
                  label={t.break}
                  icon={FastForward}
                  value={room.settings.intermissionTime}
                  min={3}
                  max={30}
                  onChange={(val) => actions.updateSettings({ intermissionTime: val })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.answerMode}</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "TYPING", label: "Keyboard" },
                      { id: "CHOICE_4", label: "4 Choices" },
                      { id: "CHOICE_5", label: "5 Choices" },
                      { id: "CHOICE_CUSTOM", label: "Custom" }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => actions.updateSettings({ gameMode: mode.id as any })}
                        className={`vox-button py-3 text-[10px] font-black uppercase tracking-widest ${room.settings.gameMode === mode.id ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {room.settings.gameMode === 'CHOICE_CUSTOM' && (
                  <SettingInput 
                    label={t.options}
                    icon={Hash}
                    value={room.settings.numChoices}
                    min={2}
                    max={10}
                    onChange={(val) => actions.updateSettings({ numChoices: val })}
                  />
                )}
                {room.category === 'MUSIC' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.guessTarget}</label>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "SONG", label: "Song" },
                        { id: "ARTIST", label: "Artist" },
                        { id: "BOTH", label: "Both" }
                      ].map(target => (
                        <button
                          key={target.id}
                          onClick={() => actions.updateSettings({ guessTarget: target.id as any })}
                          className={`vox-button py-3 text-[10px] font-black uppercase tracking-widest ${room.settings.guessTarget === target.id ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
                        >
                          {target.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-8 border-t-2 border-vox-black/10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-lg text-vox-black">{t.tacticalSupport}</h4>
                    </div>
                    <p className="handwritten text-sm opacity-60 text-vox-black">Enable special power-ups for players</p>
                  </div>
                  <button
                    onClick={() => actions.updateSettings({ abilitiesEnabled: !room.settings.abilitiesEnabled })}
                    className={`w-16 h-8 border-2 border-vox-black transition-all relative ${room.settings.abilitiesEnabled ? 'bg-vox-yellow' : 'bg-vox-paper'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-vox-black transition-all ${room.settings.abilitiesEnabled ? 'left-9' : 'left-1'}`} />
                  </button>
                </div>

                {room.settings.abilitiesEnabled && (
                  <div className="flex items-center gap-8">
                    <SettingInput 
                      label={t.usesPerGame}
                      icon={Zap}
                      value={room.settings.abilitiesPerGame}
                      min={1}
                      max={10}
                      onChange={(val) => actions.updateSettings({ abilitiesPerGame: val })}
                    />
                  </div>
                )}
              </div>

              {/* Category-Specific Settings */}
              <div className="mt-12 pt-12 border-t-4 border-vox-black">
                {room.category === 'MUSIC' ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Music size={20} className="text-vox-black" />
                        <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.librarySelection}</h3>
                      </div>
                    </div>
                    
                    <form onSubmit={handleSearch} className="flex gap-4">
                      <div className="relative flex-grow">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vox-black/20" size={20} />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handlePlaylistUrl(e.target.value);
                          }}
                          placeholder={t.searchPlaceholder}
                          className="w-full bg-vox-white border-2 border-vox-black pl-12 pr-4 py-4 font-black text-lg focus:outline-none focus:ring-0 placeholder:opacity-30 text-vox-black"
                        />
                      </div>
                      <button type="submit" className="vox-button px-8 bg-vox-black text-vox-white hover:bg-vox-yellow hover:text-vox-black transition-all">
                        <Search size={24} />
                      </button>
                    </form>

                    {isSearching && (
                      <div className="flex items-center justify-center py-12 gap-4">
                        <div className="w-6 h-6 border-4 border-vox-black/10 border-t-vox-black rounded-full animate-spin" />
                        <span className="handwritten text-xl opacity-60">{t.scanning}</span>
                      </div>
                    )}

                    {searchResults.length > 0 && !selectedPlaylist && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black uppercase tracking-widest text-sm opacity-40">{t.results}</h4>
                          <button 
                            onClick={() => setSearchResults([])}
                            className="handwritten text-sm hover:text-vox-red transition-colors"
                          >
                            {t.clearResults}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                          {searchResults.map(pl => (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={pl.id}
                              onClick={() => {
                                actions.setSelectedPlaylist({ id: pl.id, name: pl.name, image: pl.images[0]?.url, url: pl.url });
                                setSearchResults([]);
                              }}
                              className="flex items-center gap-4 bg-vox-white border-2 border-vox-black p-4 cursor-pointer hover:bg-vox-yellow transition-all group text-vox-black"
                            >
                              <div className="w-16 h-16 border-2 border-vox-black overflow-hidden flex-shrink-0">
                                {pl.images?.[0] ? (
                                  <img src={pl.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                  <div className="w-full h-full bg-vox-paper flex items-center justify-center"><Music size={24} className="opacity-20"/></div>
                                )}
                              </div>
                              <div className="overflow-hidden">
                                <p className="font-black text-lg truncate">{pl.name}</p>
                                <p className="font-serif italic text-sm opacity-60 truncate">By {pl.owner?.display_name || 'Unknown'}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedPlaylist && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-vox-yellow/20 border-4 border-vox-black p-8 relative overflow-visible"
                      >
                        <div className="tape -top-4 -right-4 w-24" />
                        <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                          <div className="w-32 h-32 border-4 border-vox-black shadow-vox flex-shrink-0 overflow-hidden">
                            {selectedPlaylist.image ? (
                              <img src={selectedPlaylist.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-vox-paper flex items-center justify-center"><Music size={48} className="opacity-20"/></div>
                            )}
                          </div>
                          <div className="text-center md:text-left flex-grow">
                            <span className="bg-vox-black text-vox-white px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-4 inline-block">{t.activeLibrary}</span>
                            <h4 className="vox-title text-4xl mb-2 text-vox-black line-clamp-2">{selectedPlaylist.name}</h4>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                              <p className="handwritten text-xl opacity-60 text-vox-black">{playlistTracks.length} {t.tracksDetected}</p>
                              <button 
                                onClick={() => {
                                  actions.setSelectedPlaylist(null);
                                  setPlaylistTracks([]);
                                  setDetectedLanguages([]);
                                  setSelectedLanguages([]);
                                }}
                                className="text-vox-red font-black text-xs uppercase tracking-widest hover:underline"
                              >
                                {t.resetSelection}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Language Selection */}
                        <div className="space-y-6 pt-8 border-t-2 border-vox-black/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Languages size={16} />
                              <h5 className="font-black uppercase tracking-widest text-sm text-vox-black">{t.linguisticFilter}</h5>
                            </div>
                          </div>
                          {isDetectingLanguages ? (
                            <div className="flex items-center gap-4 py-4">
                              <div className="w-6 h-6 border-4 border-vox-black/10 border-t-vox-black rounded-full animate-spin" />
                              <span className="handwritten text-xl opacity-60 text-vox-black">{t.analyzing}</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-3">
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
                                  className={`vox-button py-2 px-6 text-[10px] font-black uppercase tracking-widest ${selectedLanguages.includes(lang) ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
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
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Play size={20} className="text-vox-black" />
                        <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.genreSelection}</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['Action/Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Thai Movies', 'Classic'].map(genre => (
                        <button
                          key={genre}
                          onClick={() => actions.updateSettings({ movieGenre: genre })}
                          className={`vox-button py-6 text-[10px] font-black uppercase tracking-widest ${room.settings.movieGenre === genre ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : room.category === 'CARTOON' ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Play size={20} className="text-vox-black" />
                        <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.sourceSelection}</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['Disney/Pixar', 'Cartoon Network', 'Nickelodeon', 'Anime', 'Classic 90s'].map(source => (
                        <button
                          key={source}
                          onClick={() => actions.updateSettings({ cartoonSource: source })}
                          className={`vox-button py-6 text-[10px] font-black uppercase tracking-widest ${room.settings.cartoonSource === source ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
                        >
                          {source}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : room.category === 'LANDMARK' ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe size={20} className="text-vox-black" />
                        <h3 className="font-black uppercase tracking-tighter text-xl text-vox-black">{t.regionalSelection}</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['Global', 'Asia (Thai Focus)', 'Australia', 'Europe', 'Americas'].map(region => (
                        <button
                          key={region}
                          onClick={() => actions.updateSettings({ landmarkRegion: region })}
                          className={`vox-button py-6 text-[10px] font-black uppercase tracking-widest ${room.settings.landmarkRegion === region ? 'selected bg-vox-yellow text-black' : 'bg-vox-white text-vox-black'}`}
                        >
                          {region}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center justify-center py-12">
                      <p className="handwritten text-xl opacity-40">Select a category to begin</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : room.state === 'LOBBY' ? (
          <div className="vox-card h-full flex flex-col items-center justify-center text-center relative overflow-visible p-12">
            <div className="tape -top-4 -left-4" />
            <div className="tape -bottom-4 -right-4 rotate-12" />
            
            <div className="relative mb-12">
              <div className="w-32 h-32 border-8 border-vox-black/10 border-t-vox-black rounded-full animate-spin" />
              <Disc3 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-vox-black animate-pulse" size={56} />
            </div>
            
            <h2 className="vox-title text-5xl mb-4 text-vox-black">{t.synchronizing}</h2>
            <p className="handwritten text-2xl opacity-60 mb-2 text-vox-black">{t.waitingHost}</p>
            
            <div className="mt-16 w-full max-w-md bg-vox-paper border-4 border-vox-black p-8 shadow-vox text-vox-black">
              <div className="flex items-center justify-between mb-8 border-b-2 border-vox-black pb-4">
                <h4 className="font-black uppercase tracking-widest text-sm">{t.sessionMetadata}</h4>
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.guessWindow}</span>
                  <span className="font-black text-2xl">{room.settings.guessTime}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{room.category === 'MUSIC' ? 'Data Points' : t.rounds}</span>
                  <span className="font-black text-2xl">{room.settings.numTracks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.protocol}</span>
                  <motion.span 
                    key={room.settings.gameMode}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-black text-xl bg-vox-yellow px-2"
                  >
                    {room.settings.gameMode}
                  </motion.span>
                </div>
              </div>
            </div>
          </div>
        ) : (
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

