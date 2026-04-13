import React, { useState, useEffect } from 'react';
import { Search, Music, Languages } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { useGameStore } from '../store';
import { translations } from '../translations';

export function PlaylistSelector() {
  const { room, actions, userToken, selectedPlaylist } = useGameStore();
  const t = translations.en;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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
    setPlaylistTracks([]);
    try {
      let allItems: any[] = [];
      let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${selectedPlaylist.id}/tracks?limit=100`;
      
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
          break;
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
    languages.add("English");

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
    const spotifyMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
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

  if (!room) return null;

  return (
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
  );
}

/** Returns filtered tracks for the game start, or undefined if no filtering needed */
export function usePlaylistData() {
  const { selectedPlaylist } = useGameStore();
  return { selectedPlaylist, isReady: !!selectedPlaylist };
}
