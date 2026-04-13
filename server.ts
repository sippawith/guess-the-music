import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

// --- Helper Utilities ---
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Selects tracks by spreading the selection across the entire list.
 * This ensures we get songs from the beginning, middle, and end of the playlist.
 */
function selectTracksWithSpread(tracks: any[], count: number): any[] {
  if (tracks.length <= count) return shuffleArray(tracks);
  
  const selected: any[] = [];
  const step = tracks.length / count;
  
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    const bucket = tracks.slice(start, end);
    if (bucket.length > 0) {
      const randomIndex = Math.floor(Math.random() * bucket.length);
      selected.push(bucket[randomIndex]);
    }
  }
  
  return shuffleArray(selected);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

app.use(express.json());

// ===========================================================================
// SPOTIFY / ITUNES API HELPERS
// ===========================================================================

let spotifyAccessToken = "";
let spotifyTokenExpiry = 0;

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.warn("Spotify credentials not configured. Spotify features will be disabled.");
    return null;
  }

  if (Date.now() < spotifyTokenExpiry && spotifyAccessToken) {
    return spotifyAccessToken;
  }
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    
    spotifyAccessToken = response.data.access_token;
    spotifyTokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000;
    return spotifyAccessToken;
  } catch (error) {
    console.error("Error fetching Spotify token:", error);
    return null;
  }
}

async function getItunesPreview(trackName: string, artistName: string) {
  try {
    const cleanTrackName = trackName.split(' - ')[0].replace(/\[.*?\]|\(.*?\)/g, '').trim();
    const query = `${cleanTrackName} ${artistName}`;
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    
    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        preview: result.previewUrl,
        albumArt: result.artworkUrl100?.replace('100x100bb', '600x600bb') || ""
      };
    }
  } catch (error: any) {
    console.error("iTunes search error:", error.response?.status || error.message);
  }
  return null;
}

// ===========================================================================
// SPOTIFY PLAYLIST SCRAPING
// ===========================================================================

async function scrapeSpotifyPlaylist(playlistId: string) {
  try {
    const embedRes = await axios.get(`https://open.spotify.com/embed/playlist/${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const match = embedRes.data.match(/"accessToken":"([^"]+)"/);
    if (!match) {
      console.log("No access token found in embed");
      return null;
    }
    const token = match[1];
    
    const tokenRes = await axios.post('https://clienttoken.spotify.com/v1/clienttoken', {
      client_data: {
        client_version: "1.2.88.250.gd8cceb8f",
        client_id: "d8a5ed958d274c2e8ee717e6a4b0971d",
        js_sdk_data: {
          device_brand: "unknown",
          device_model: "unknown",
          os: "windows",
          os_version: "NT 10.0",
          device_id: "unknown",
          device_type: "computer"
        }
      }
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const clientToken = tokenRes.data.granted_token.token;
    
    const hash = '32b05e92e438438408674f95d0fdad8082865dc32acd55bd97f5113b8579092b';
    
    let allTracks: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore && allTracks.length < 1000) {
      const variables = encodeURIComponent(JSON.stringify({
        uri: `spotify:playlist:${playlistId}`,
        offset: offset,
        limit: limit,
        enableWatchFeedEntrypoint: false,
        enableSmartRecommendations: false
      }));
      const extensions = encodeURIComponent(JSON.stringify({
        persistedQuery: {
          version: 1,
          sha256Hash: hash
        }
      }));
      
      const url = `https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables=${variables}&extensions=${extensions}`;
      
      const res = await axios.get(url, {
        headers: {
          'Client-Token': clientToken,
          'Authorization': `Bearer ${token}`
        }
      });
      
      const items = res.data?.data?.playlistV2?.content?.items;
      if (!items || items.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const item of items) {
        const trackData = item.itemV2?.data;
        if (trackData && trackData.__typename === 'Track') {
          allTracks.push({
            id: trackData.uri.split(':').pop(),
            name: trackData.name,
            artist: trackData.artists?.items?.[0]?.profile?.name || "Unknown Artist",
            previewUrl: "",
            albumArt: trackData.albumOfTrack?.coverArt?.sources?.[0]?.url || ""
          });
        }
      }
      
      offset += limit;
      if (items.length < limit) {
        hasMore = false;
      }
    }
    
    return allTracks;
  } catch (error) {
    console.error("Error scraping Spotify playlist via Pathfinder:", error);
  }
  return null;
}

async function scrapeAppleMusicPlaylist(playlistUrl: string) {
  try {
    const res = await axios.get(playlistUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = res.data;
    
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      const data = JSON.parse(jsonLdMatch[1]);
      const root = Array.isArray(data) ? data.find(d => d["@type"] === "MusicPlaylist") : data;
      
      if (root && root.track) {
        const tracks = Array.isArray(root.track) ? root.track : [root.track];
        return tracks.map((t: any, index: number) => {
          const item = t.item || t;
          return {
            id: item.url?.split('/').pop() || `am-${index}`,
            name: item.name,
            artist: item.byArtist?.name || "Unknown Artist",
            previewUrl: "",
            albumArt: item.image || ""
          };
        });
      }
    }
  } catch (error) {
    console.error("Error scraping Apple Music:", error);
  }
  return null;
}

// ===========================================================================
// WIKIPEDIA API HELPERS (Movies & Cartoons)
// ===========================================================================

const MOVIE_CATEGORIES: Record<string, string> = {
  'Action/Drama': 'Category:American_action_films',
  'Comedy': 'Category:American_comedy_films',
  'Horror': 'Category:American_horror_films',
  'Sci-Fi': 'Category:American_science_fiction_films',
  'Thai Movies': 'Category:Thai_films',
  'Classic': 'Category:Films_selected_for_preservation_in_the_National_Film_Registry',
};

const CARTOON_CATEGORIES: Record<string, string> = {
  'Disney/Pixar': 'Category:Disney_animated_films',
  'Cartoon Network': 'Category:Cartoon_Network_original_programming',
  'Nickelodeon': 'Category:Nickelodeon_original_programming',
  'Anime': 'Category:Anime_series',
  'Classic 90s': 'Category:1990s_animated_television_series',
};

async function fetchWikipediaCategoryMembers(categoryName: string): Promise<string[]> {
  try {
    const res = await axios.get(
      `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(categoryName)}&cmlimit=250&cmnamespace=0&format=json`,
      { headers: { 'User-Agent': 'GuessTheMusic/1.0' }, timeout: 10000 }
    );
    const members = res.data.query?.categorymembers || [];
    return members.map((m: any) => m.title);
  } catch (error: any) {
    console.error(`[Wiki] Failed to fetch category ${categoryName}:`, error.message);
    return [];
  }
}

async function prepareVisualTracksFromWikipedia(categoryKey: string, type: 'movie' | 'cartoon', roomCategory: string): Promise<Track[]> {
  const categoryMap = roomCategory === 'MOVIE' ? MOVIE_CATEGORIES : CARTOON_CATEGORIES;
  const categoryName = categoryMap[categoryKey];
  
  if (!categoryName) {
    console.error(`[Wiki] Invalid category key: ${categoryKey}`);
    return [];
  }

  console.log(`[Wiki] Fetching titles for ${roomCategory} -> ${categoryName}`);
  const allTitles = await fetchWikipediaCategoryMembers(categoryName);
  
  if (allTitles.length === 0) return [];

  // Filter out lists and non-titles
  const validTitles = allTitles.filter(t => !t.toLowerCase().startsWith('list of '));
  const shuffled = shuffleArray(validTitles);
  
  // Take a buffer of ~40 to try to find ones with good poster images
  const buffer = shuffled.slice(0, Math.min(shuffled.length, 50));
  
  console.log(`[Wiki] Querying images for ${buffer.length} titles...`);
  
  const tracksWithImages = await Promise.all(buffer.map(async (title: string) => {
    try {
      const res = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { 'User-Agent': 'GuessTheMusic/1.0' }, timeout: 5000 }
      );
      
      const data = res.data;
      if (data.type === 'disambiguation' || !data.thumbnail?.source) return null;

      // Clean up title (remove " (film)" or " (TV series)" etc.)
      const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, '').trim();

      // For Artist/Description we can use the short description or year if available
      let description = data.description || '';
      let artist = type === 'movie' ? 'Movie' : 'Cartoon';
      
      if (description) {
        // e.g. "1994 American animated film"
        const yearMatch = description.match(/\b(19\d{2}|20\d{2})\b/);
        if (yearMatch) artist = yearMatch[0];
      }

      return {
        id: `wiki-${data.pageid}`,
        name: cleanTitle,
        artist: artist,
        previewUrl: '',
        albumArt: '',
        imageUrl: data.thumbnail.source.replace(/\/\d+px-/, '/800px-')
      };
    } catch {
      return null;
    }
  }));

  const validTracks = tracksWithImages.filter((t): t is NonNullable<typeof t> => t !== null);
  console.log(`[Wiki] Successfully prepared ${validTracks.length} tracks with images.`);
  return validTracks;
}

// ===========================================================================
// LANDMARK HELPERS (Wikipedia image API)
// ===========================================================================

let landmarksData: any[] | null = null;

function loadLandmarks(): any[] {
  if (landmarksData) return landmarksData;
  try {
    const raw = readFileSync(path.join(process.cwd(), 'src', 'data', 'landmarks.json'), 'utf-8');
    landmarksData = JSON.parse(raw);
    console.log(`[Landmarks] Loaded ${landmarksData!.length} landmarks`);
    return landmarksData!;
  } catch (error) {
    console.error('[Landmarks] Failed to load landmarks.json:', error);
    return [];
  }
}

async function fetchLandmarkImage(name: string): Promise<string> {
  try {
    const res = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
      { headers: { 'User-Agent': 'GuessTheMusic/1.0' }, timeout: 5000 }
    );
    const thumb = res.data.thumbnail?.source;
    if (thumb) {
      // Upscale thumbnail to larger size
      return thumb.replace(/\/\d+px-/, '/800px-');
    }
  } catch (error: any) {
    console.error(`[Landmarks] Failed to fetch image for: ${name}`, error.message);
  }
  return '';
}

async function prepareLandmarkTracks(region: string): Promise<Track[]> {
  const landmarks = loadLandmarks();
  
  // Filter by region ('Global' selects from all)
  const filtered = region === 'Global'
    ? landmarks
    : landmarks.filter((l: any) => l.region === region);
  
  if (filtered.length === 0) return [];
  
  // Take a larger buffer to account for image fetch failures
  const shuffled = shuffleArray(filtered);
  const buffer = shuffled.slice(0, Math.min(shuffled.length, 40));
  
  console.log(`[Landmarks] Fetching images for ${buffer.length} landmarks (region: ${region})`);
  
  // Fetch images in parallel
  const tracksWithImages = await Promise.all(buffer.map(async (l: any) => {
    const imageUrl = await fetchLandmarkImage(l.name);
    return {
      id: `landmark-${l.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: l.name,
      artist: l.country,
      previewUrl: '',
      albumArt: '',
      imageUrl
    };
  }));
  
  const validTracks = tracksWithImages.filter(t => t.imageUrl);
  console.log(`[Landmarks] Got ${validTracks.length} landmarks with valid images`);
  return validTracks;
}

// ===========================================================================
// SPOTIFY OAUTH ROUTES
// ===========================================================================

app.get('/api/auth/url', (req, res) => {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return res.status(400).json({ error: "Spotify credentials not configured in environment variables." });
  }
  const redirectUri = `${process.env.APP_URL}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'playlist-read-private playlist-read-collaborative user-read-private',
  });
  res.json({ url: `https://accounts.spotify.com/authorize?${params}` });
});

app.get(['/api/auth/callback', '/api/auth/callback/'], async (req, res) => {
  const { code } = req.query;
  const redirectUri = `${process.env.APP_URL}/api/auth/callback`;
  
  try {
    const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    
    const token = response.data.access_token;
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("OAuth callback error", error.response?.data || error.message);
    res.status(500).send("Authentication failed");
  }
});

// ===========================================================================
// PLAYLIST API ROUTES
// ===========================================================================

app.post("/api/playlist/details", async (req, res) => {
  try {
    const { playlistId, url } = req.body;
    
    if (url && url.includes("music.apple.com")) {
      const tracks = await scrapeAppleMusicPlaylist(url);
      if (tracks) {
        return res.json({
          id: url,
          name: "Apple Music Playlist",
          owner: { display_name: "Apple Music" },
          images: [{ url: tracks[0]?.albumArt || "" }],
          isApple: true
        });
      }
    }

    const userToken = req.headers.authorization?.split(' ')[1];
    const token = userToken || await getSpotifyToken();

    if (token) {
      try {
        const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        return res.json({
          id: response.data.id,
          name: response.data.name,
          owner: { display_name: response.data.owner.display_name },
          images: response.data.images
        });
      } catch (e) {
        console.error("Spotify API failed:", e);
      }
    }

    res.json({
      id: playlistId || url,
      name: "Playlist",
      owner: { display_name: "Unknown" },
      images: []
    });
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    res.status(error.response?.status || 500).json({ error: errorMsg });
  }
});

app.post("/api/playlist/tracks", async (req, res) => {
  try {
    const { url, playlistId } = req.body;
    let tracks = null;

    if (url && url.includes("music.apple.com")) {
      tracks = await scrapeAppleMusicPlaylist(url);
    } else if (playlistId || (url && url.includes("spotify.com"))) {
      const id = playlistId || url.split("/playlist/")[1]?.split("?")[0];
      if (id) {
        tracks = await scrapeSpotifyPlaylist(id);
      }
    }

    if (!tracks) {
      return res.status(404).json({ error: "Could not fetch tracks." });
    }

    res.json({ tracks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/playlist/tracks/page", async (req, res) => {
  try {
    const { url } = req.body;
    const userToken = req.headers.authorization?.split(' ')[1];
    const token = userToken || await getSpotifyToken();
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const response = await axios.get(url, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    res.json(response.data);
  } catch (error: any) {
    if (error.response?.status === 403) {
      console.warn("Spotify API 403 - Forbidden.");
    } else {
      console.error("Error fetching Spotify page:", error.response?.data || error.message);
    }
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post("/api/playlist/search", async (req, res) => {
  try {
    const { query } = req.body;
    
    const token = await getSpotifyToken();
    if (token) {
      try {
        const response = await axios.get(`https://api.spotify.com/v1/search`, {
          params: { q: query, type: 'playlist', limit: 5 },
          headers: { Authorization: `Bearer ${token}` }
        });

        const playlists = response.data.playlists.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          owner: { display_name: item.owner.display_name },
          images: item.images,
          url: `https://open.spotify.com/playlist/${item.id}`
        }));

        return res.json(playlists);
      } catch (e) {
        console.error("Spotify search failed, falling back to Deezer:", e);
      }
    }

    // Fallback to Deezer search
    const response = await axios.get(`https://api.deezer.com/search/playlist`, {
      params: { q: query, limit: 5 }
    });

    const playlists = response.data.data.map((item: any) => ({
      id: item.id.toString(),
      name: item.title,
      owner: { display_name: item.user.name },
      images: [{ url: item.picture_xl || item.picture_medium }],
      url: item.link
    }));

    res.json(playlists);
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    res.status(error.response?.status || 500).json({ error: errorMsg });
  }
});

// ===========================================================================
// GAME STATE TYPES
// ===========================================================================

interface Player {
  id: string;
  name: string;
  score: number;
  prevScore: number;
  lastGuess?: string;
  isHost: boolean;
  streak: number;
  maxStreak: number;
  abilities: {
    hint: number;
    removeWrong: number;
    freeze: number;
  };
  freezeActiveUntil?: number;
}

interface Track {
  id: string;
  name: string;
  artist: string;
  previewUrl: string;
  albumArt: string;
  startTime?: number;
  imageUrl?: string;
  description?: string;
}

interface Room {
  id: string;
  players: Record<string, Player>;
  state: "LOBBY" | "PLAYING" | "ROUND_END" | "GAME_END";
  category: "MUSIC" | "MOVIE" | "CARTOON" | "LANDMARK";
  settings: {
    guessTime: number;
    numTracks: number;
    playlistUrl: string;
    gameMode: "TYPING" | "CHOICE_4" | "CHOICE_5" | "CHOICE_CUSTOM";
    guessTarget: "SONG" | "ARTIST" | "BOTH";
    intermissionTime: number;
    numChoices: number;
    movieGenre?: string;
    cartoonSource?: string;
    landmarkRegion?: string;
    hintsPerGame: number;
    abilitiesEnabled: boolean;
    abilitiesPerGame: number;
  };
  tracks: Track[];
  currentTrackIndex: number;
  roundEndTime: number;
  roundGuessTarget?: "SONG" | "ARTIST";
  hintsUsed: number;
  guessesThisRound: Record<string, { guess: string; time: number; correct: boolean }>;
  roundTimeout?: NodeJS.Timeout;
  bufferedPlayers: Set<string>;
  countdown?: number;
}

const rooms: Record<string, Room> = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getPublicRoom(room: Room) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { roundTimeout, bufferedPlayers, ...publicRoom } = room;
  return publicRoom;
}

// ===========================================================================
// SOCKET.IO GAME LOGIC
// ===========================================================================

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create_room", ({ name, category }) => {
    const roomId = generateRoomCode();
    rooms[roomId] = {
      id: roomId,
      players: {
        [socket.id]: { 
          id: socket.id, 
          name, 
          score: 0, 
          prevScore: 0,
          isHost: true,
          streak: 0,
          maxStreak: 0,
          abilities: { hint: 3, removeWrong: 3, freeze: 3 }
        }
      },
      state: "LOBBY",
      category: category || "MUSIC",
      hintsUsed: 0,
      settings: { 
        guessTime: 15, 
        numTracks: 5, 
        playlistUrl: "", 
        gameMode: "TYPING", 
        guessTarget: "BOTH",
        intermissionTime: 8,
        numChoices: 4,
        hintsPerGame: 3,
        abilitiesEnabled: true,
        abilitiesPerGame: 3
      },
      tracks: [],
      currentTrackIndex: -1,
      roundEndTime: 0,
      guessesThisRound: {},
      bufferedPlayers: new Set()
    };
    socket.join(roomId);
    socket.emit("room_created", roomId);
    io.to(roomId).emit("room_update", getPublicRoom(rooms[roomId]));
  });

  socket.on("join_room", ({ roomId, name }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit("error", "Room not found");
      return;
    }
    if (room.state !== "LOBBY") {
      socket.emit("error", "Game already in progress");
      return;
    }
    
    room.players[socket.id] = { 
      id: socket.id, 
      name, 
      score: 0, 
      prevScore: 0,
      isHost: false,
      streak: 0,
      maxStreak: 0,
      abilities: { 
        hint: room.settings.abilitiesPerGame || 3, 
        removeWrong: room.settings.abilitiesPerGame || 3, 
        freeze: room.settings.abilitiesPerGame || 3 
      }
    };
    socket.join(roomId);
    io.to(roomId).emit("room_update", getPublicRoom(room));
  });

  socket.on("leave_room", ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      delete room.players[socket.id];
      if (Object.keys(room.players).length === 0) {
        delete rooms[roomId];
      } else {
        const remainingPlayers = Object.values(room.players);
        if (!remainingPlayers.some(p => p.isHost)) {
          remainingPlayers[0].isHost = true;
        }
        io.to(roomId).emit("room_update", getPublicRoom(room));
      }
    }
  });

  socket.on("update_settings", ({ roomId, settings }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]?.isHost) {
      room.settings = { ...room.settings, ...settings };
      io.to(roomId).emit("room_update", getPublicRoom(room));
    }
  });

  socket.on("reset_to_lobby", ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]?.isHost) {
      room.state = "LOBBY";
      room.currentTrackIndex = -1;
      room.tracks = [];
      room.hintsUsed = 0;
      room.guessesThisRound = {};
      room.bufferedPlayers = new Set();
      if (room.roundTimeout) clearTimeout(room.roundTimeout);
      
      Object.values(room.players).forEach(p => p.score = 0);
      
      io.to(roomId).emit("room_update", getPublicRoom(room));
    }
  });

  // =========================================================================
  // START GAME — Handles all categories
  // =========================================================================

  socket.on("start_game", async ({ roomId, playlistId, userToken, trackIds, customTracks }) => {
    const room = rooms[roomId];
    if (!room || !room.players[socket.id]?.isHost) return;

    try {
      io.to(roomId).emit("game_status", "Initializing Sequence...");
      
      let tracks: Track[] = [];

      // --- MUSIC category ---
      if (room.category === "MUSIC") {
        io.to(roomId).emit("game_status", "Fetching tracks...");
        
        if (customTracks && Array.isArray(customTracks) && customTracks.length > 0) {
          tracks = customTracks;
        } else if (playlistId.includes("music.apple.com")) {
          const scrapedTracks = await scrapeAppleMusicPlaylist(playlistId);
          if (scrapedTracks) tracks = scrapedTracks;
        } else {
          const token = userToken || await getSpotifyToken();
          if (token && playlistId) {
            try {
              let allItems: any[] = [];
              let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
              
              while (nextUrl && allItems.length < 1000) {
                try {
                  const response = await axios.get(nextUrl, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (response.data.items) {
                    allItems = allItems.concat(response.data.items);
                  }
                  nextUrl = response.data.next;
                } catch (err: any) {
                  console.error("Error fetching page:", err.response?.data || err.message);
                  if (allItems.length === 0) throw err;
                  break;
                }
              }
              
              console.log(`[Music] Fetched ${allItems.length} items from Spotify API`);
              
              if (allItems.length > 0) {
                tracks = allItems
                  .filter((item: any) => item.track)
                  .map((item: any) => ({
                    id: item.track.id,
                    name: item.track.name,
                    artist: item.track.artists.map((a: any) => a.name).join(", "),
                    previewUrl: item.track.preview_url || "",
                    albumArt: item.track.album.images?.[0]?.url || ""
                  }));
              }
            } catch (e) {
              console.log("[Music] Falling back to scraper");
              const scrapedTracks = await scrapeSpotifyPlaylist(playlistId);
              if (scrapedTracks) tracks = scrapedTracks;
            }
          } else {
            const scrapedTracks = await scrapeSpotifyPlaylist(playlistId);
            if (scrapedTracks) tracks = scrapedTracks;
          }
        }

        if (tracks.length === 0) {
          io.to(roomId).emit("error", "No tracks found in this playlist.");
          return;
        }

        // Filter by trackIds if provided
        if (trackIds && Array.isArray(trackIds)) {
          tracks = tracks.filter(t => trackIds.includes(t.id));
        }

        // Fetch audio previews
        const targetCount = room.settings.numTracks;
        const bufferCount = Math.min(tracks.length, Math.ceil(targetCount * 2.0) + 20);
        
        tracks = selectTracksWithSpread(tracks, bufferCount);
        
        io.to(roomId).emit("game_status", "Fetching previews...");
        
        const tracksWithPreviews = await Promise.all(tracks.map(async (track) => {
          const itunesData = await getItunesPreview(track.name, track.artist);
          return { 
            ...track, 
            previewUrl: itunesData?.preview || track.previewUrl || "",
            albumArt: itunesData?.albumArt || track.albumArt || ""
          };
        }));

        tracks = tracksWithPreviews
          .filter(t => t.previewUrl !== "")
          .slice(0, targetCount);
        
        console.log(`[Music] Final: ${tracks.length} tracks (target: ${targetCount})`);
        
        if (tracks.length === 0) {
          io.to(roomId).emit("error", "Could not find playable previews for any tracks.");
          return;
        }
      }

      // --- MOVIE category ---
      else if (room.category === "MOVIE") {
        const genre = room.settings.movieGenre || "Action/Drama";
        io.to(roomId).emit("game_status", `Fetching ${genre} movies...`);
        
        tracks = await prepareVisualTracksFromWikipedia(genre, 'movie', room.category);
        
        if (tracks.length === 0) {
          io.to(roomId).emit("error", "Could not fetch movies. Please try another genre.");
          return;
        }
        
        tracks = selectTracksWithSpread(tracks, room.settings.numTracks);
      }

      // --- CARTOON category ---
      else if (room.category === "CARTOON") {
        const source = room.settings.cartoonSource || "Disney/Pixar";
        io.to(roomId).emit("game_status", `Fetching ${source} cartoons...`);
        
        tracks = await prepareVisualTracksFromWikipedia(source, 'cartoon', room.category);
        
        if (tracks.length === 0) {
          io.to(roomId).emit("error", "Could not fetch cartoons. Please try another source.");
          return;
        }
        
        tracks = selectTracksWithSpread(tracks, room.settings.numTracks);
      }

      // --- LANDMARK category ---
      else if (room.category === "LANDMARK") {
        const region = room.settings.landmarkRegion || "Global";
        io.to(roomId).emit("game_status", `Loading ${region} landmarks...`);
        
        tracks = await prepareLandmarkTracks(region);
        
        if (tracks.length === 0) {
          io.to(roomId).emit("error", "Could not load landmarks.");
          return;
        }
        
        tracks = selectTracksWithSpread(tracks, room.settings.numTracks);
      }

      if (tracks.length === 0) {
        io.to(roomId).emit("error", "Could not prepare game content. Please try again.");
        return;
      }

      // Reset players
      for (const player of Object.values(room.players)) {
        player.score = 0;
        player.streak = 0;
        player.maxStreak = 0;
        player.abilities = { 
          hint: room.settings.abilitiesPerGame || 3, 
          removeWrong: room.settings.abilitiesPerGame || 3, 
          freeze: room.settings.abilitiesPerGame || 3 
        };
      }

      room.tracks = tracks;
      room.currentTrackIndex = 0;
      room.hintsUsed = 0;
      
      // Start countdown
      room.state = "PLAYING";
      room.countdown = 3;
      
      const countdownInterval = setInterval(() => {
        if (!rooms[roomId]) {
          clearInterval(countdownInterval);
          return;
        }
        
        rooms[roomId].countdown!--;
        io.to(roomId).emit("countdown_tick", rooms[roomId].countdown);
        
        if (rooms[roomId].countdown === 0) {
          clearInterval(countdownInterval);
          delete rooms[roomId].countdown;
          startRound(roomId);
        }
      }, 1000);
      
      io.to(roomId).emit("countdown_start", 3);
      io.to(roomId).emit("room_update", getPublicRoom(room));
    } catch (error: any) {
      console.error("Game Start Error:", error.response?.data || error.message);
      let errorMsg = error.response?.data?.error?.message || error.message;
      io.to(roomId).emit("error", "Failed to start game: " + errorMsg);
    }
  });

  // =========================================================================
  // ROUND LOGIC
  // =========================================================================

  function startRound(roomId: string) {
    const room = rooms[roomId];
    if (!room) return;

    room.state = "PLAYING";
    room.guessesThisRound = {};
    
    Object.values(room.players).forEach(p => p.lastGuess = "");

    const currentTrack = room.tracks[room.currentTrackIndex];
    console.log(`[Game] Round ${room.currentTrackIndex + 1} | ${room.category} | "${currentTrack.name}"`);
    
    // Determine guess target
    if (room.category !== "MUSIC") {
      // Non-music categories always guess the name
      room.roundGuessTarget = "SONG";
    } else if (room.settings.guessTarget === "BOTH") {
      room.roundGuessTarget = Math.random() > 0.5 ? "SONG" : "ARTIST";
    } else {
      room.roundGuessTarget = room.settings.guessTarget;
    }

    // Generate choices for choice modes
    let choices: string[] | undefined;
    if (room.settings.gameMode === "CHOICE_4" || room.settings.gameMode === "CHOICE_5" || room.settings.gameMode === "CHOICE_CUSTOM") {
      const numChoices = room.settings.gameMode === "CHOICE_CUSTOM"
        ? (room.settings.numChoices || 4)
        : (room.settings.gameMode === "CHOICE_5" ? 5 : 4);
      
      const getChoiceText = (t: any) => {
        if (room.roundGuessTarget === "SONG") return t.name;
        if (room.roundGuessTarget === "ARTIST") return t.artist;
        return `${t.name} - ${t.artist}`;
      };

      choices = [getChoiceText(currentTrack)];
      
      const allOtherChoices = Array.from(new Set(room.tracks.map(t => getChoiceText(t))))
        .filter(c => c !== choices![0]);
      
      const shuffled = allOtherChoices.sort(() => 0.5 - Math.random());
      for (let i = 0; i < numChoices - 1 && i < shuffled.length; i++) {
        choices.push(shuffled[i]);
      }
      
      // Pad with placeholders if needed
      if (choices.length < numChoices) {
        const placeholders = ["Unknown", "Mystery", "Secret", "Hidden"];
        for (let i = 0; choices.length < numChoices && i < placeholders.length; i++) {
          if (!choices.includes(placeholders[i])) {
            choices.push(placeholders[i]);
          }
        }
      }
      
      choices = choices.sort(() => 0.5 - Math.random());
    }

    const trackDataForClients = {
      previewUrl: currentTrack.previewUrl,
      imageUrl: currentTrack.imageUrl || '',
      description: currentTrack.description,
      albumArt: currentTrack.albumArt,
      duration: room.settings.guessTime,
      startTime: currentTrack.startTime || 30,
      choices,
      roundGuessTarget: room.roundGuessTarget
    };

    room.roundEndTime = 0;
    room.bufferedPlayers = new Set();

    io.to(roomId).emit("round_start", {
      track: trackDataForClients,
      currentTrackIndex: room.currentTrackIndex,
      totalTracks: room.tracks.length
    });
    
    io.to(roomId).emit("room_update", getPublicRoom(room));

    // Fallback timer start (in case players don't signal buffered)
    if (room.roundTimeout) clearTimeout(room.roundTimeout);
    room.roundTimeout = setTimeout(() => {
      startTimer(roomId);
    }, room.category === 'MUSIC' ? 5000 : 3000);
  }

  function startTimer(roomId: string) {
    const room = rooms[roomId];
    if (!room || room.roundEndTime !== 0) return;

    if (room.roundTimeout) clearTimeout(room.roundTimeout);

    room.roundEndTime = Date.now() + (room.settings.guessTime * 1000);
    io.to(roomId).emit("start_timer", room.roundEndTime);

    room.roundTimeout = setTimeout(() => {
      endRound(roomId);
    }, room.settings.guessTime * 1000);
  }

  socket.on("track_playing", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.state !== "PLAYING" || room.roundEndTime !== 0) return;

    room.bufferedPlayers.add(socket.id);
    const numPlayers = Object.keys(room.players).length;
    if (room.bufferedPlayers.size >= numPlayers) {
      startTimer(roomId);
    }
  });

  socket.on("submit_guess", ({ roomId, guess }) => {
    const room = rooms[roomId];
    if (!room || room.state !== "PLAYING") return;
    
    if (room.guessesThisRound[socket.id]?.correct) return;

    const currentTrack = room.tracks[room.currentTrackIndex];
    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedName = currentTrack.name.toLowerCase().trim();
    const normalizedArtist = currentTrack.artist.toLowerCase().trim();
    
    let isCorrect = false;
    const target = room.roundGuessTarget || room.settings.guessTarget;
    
    if (room.settings.gameMode === "TYPING") {
      if (target === "SONG") {
        isCorrect = normalizedName.includes(normalizedGuess) || normalizedGuess.includes(normalizedName);
      } else if (target === "ARTIST") {
        isCorrect = normalizedArtist.includes(normalizedGuess) || normalizedGuess.includes(normalizedArtist);
      } else {
        isCorrect = normalizedName.includes(normalizedGuess) || normalizedGuess.includes(normalizedName) ||
                    normalizedArtist.includes(normalizedGuess) || normalizedGuess.includes(normalizedArtist);
      }
    } else {
      const expectedChoice = target === "SONG" ? currentTrack.name :
                             target === "ARTIST" ? currentTrack.artist :
                             `${currentTrack.name} - ${currentTrack.artist}`;
      isCorrect = guess === expectedChoice;
    }

    room.guessesThisRound[socket.id] = {
      guess,
      time: Date.now(),
      correct: isCorrect
    };
    
    if (room.players[socket.id]) {
        room.players[socket.id].lastGuess = guess;
    }

    const correctGuesses = Object.values(room.guessesThisRound).filter(g => g.correct).length;
    if (correctGuesses === Object.keys(room.players).length) {
      if (room.roundTimeout) clearTimeout(room.roundTimeout);
      endRound(roomId);
    }
  });

  // =========================================================================
  // ABILITIES
  // =========================================================================

  socket.on("use_ability", ({ roomId, ability }) => {
    const room = rooms[roomId];
    if (!room || room.state !== "PLAYING") return;
    const player = room.players[socket.id];
    if (!player) return;

    if (!room.settings.abilitiesEnabled) {
      socket.emit("error", "Abilities are disabled in this room.");
      return;
    }

    if (player.abilities[ability] <= 0) {
      socket.emit("error", `No ${ability} uses remaining!`);
      return;
    }

    const currentTrack = room.tracks[room.currentTrackIndex];
    const target = room.roundGuessTarget;

    if (ability === 'hint') {
      let hint = "";
      if (room.category === "MUSIC") {
        if (target === "SONG") {
          hint = `Artist: ${currentTrack.artist}`;
        } else if (target === "ARTIST") {
          hint = `Song: ${currentTrack.name}`;
        } else {
          hint = `Artist: ${currentTrack.artist.substring(0, 3)}...`;
        }
      } else if (room.category === "MOVIE" || room.category === "CARTOON") {
        hint = `Year: ${currentTrack.artist}`;
      } else if (room.category === "LANDMARK") {
        hint = `Country: ${currentTrack.artist}`;
      }
      player.abilities[ability]--;
      socket.emit("hint_revealed", { hint, playerSpecific: true });
    } else if (ability === 'removeWrong') {
      if (room.settings.gameMode.startsWith("CHOICE")) {
        player.abilities[ability]--;
        socket.emit("ability_effect", { type: "REMOVE_WRONG", count: 2 });
      } else {
        socket.emit("error", "This ability only works in Choice modes.");
      }
    } else if (ability === 'freeze') {
      player.abilities[ability]--;
      
      const freezeDuration = 5000;
      room.roundEndTime += freezeDuration;
      
      if (room.roundTimeout) {
        clearTimeout(room.roundTimeout);
        const remaining = Math.max(0, room.roundEndTime - Date.now());
        room.roundTimeout = setTimeout(() => {
          endRound(roomId);
        }, remaining);
      }
      
      io.to(roomId).emit("ability_effect", { type: "FREEZE", duration: freezeDuration });
      io.to(roomId).emit("start_timer", room.roundEndTime);
    }

    io.to(roomId).emit("room_update", getPublicRoom(room));
  });

  // =========================================================================
  // END ROUND / END GAME
  // =========================================================================

  function endRound(roomId: string) {
    const room = rooms[roomId];
    if (!room || room.state !== "PLAYING") return;

    room.state = "ROUND_END";
    const currentTrack = room.tracks[room.currentTrackIndex];

    const totalTime = room.settings.guessTime * 1000;
    const roundStartTime = room.roundEndTime - totalTime;

    for (const playerId of Object.keys(room.players)) {
      const player = room.players[playerId];
      player.prevScore = player.score;
      const guessData = room.guessesThisRound[playerId];

      if (guessData && guessData.correct) {
        let timeTaken = guessData.time - roundStartTime;
        
        if (player.freezeActiveUntil && player.freezeActiveUntil > roundStartTime) {
            const freezeDuration = 5000;
            timeTaken = Math.max(0, timeTaken - freezeDuration);
        }

        const timeLeft = Math.max(0, totalTime - timeTaken);
        const timeBonus = Math.floor((timeLeft / totalTime) * 100);
        
        player.streak++;
        player.maxStreak = Math.max(player.streak, player.maxStreak);
        
        const streakMultiplier = 1 + Math.min(player.streak - 1, 10) * 0.1;
        const roundScore = Math.floor((50 + timeBonus) * streakMultiplier);
        
        player.score += roundScore;
      } else {
        player.streak = 0;
      }
    }

    io.to(roomId).emit("round_end", {
      track: currentTrack,
      guesses: room.guessesThisRound,
      players: room.players,
      roundStartTime
    });
    
    io.to(roomId).emit("room_update", getPublicRoom(room));

    if (room.currentTrackIndex < room.tracks.length - 1) {
      const intermissionDuration = (room.settings.intermissionTime || 8) * 1000;
      const intermissionEndTime = Date.now() + intermissionDuration;
      
      io.to(roomId).emit("intermission_start", {
        endTime: intermissionEndTime,
        duration: room.settings.intermissionTime || 8
      });

      if (room.roundTimeout) clearTimeout(room.roundTimeout);
      room.roundTimeout = setTimeout(() => {
        room.currentTrackIndex++;
        startRound(roomId);
      }, intermissionDuration);
    } else {
      const finalIntermission = 5000;
      setTimeout(() => {
        room.state = "GAME_END";
        io.to(roomId).emit("game_end", room.players);
        io.to(roomId).emit("room_update", getPublicRoom(room));
      }, finalIntermission);
    }
  }

  // =========================================================================
  // DISCONNECT
  // =========================================================================

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId];
        } else {
          const remainingPlayers = Object.values(rooms[roomId].players);
          if (!remainingPlayers.some(p => p.isHost)) {
            remainingPlayers[0].isHost = true;
          }
          io.to(roomId).emit("room_update", getPublicRoom(rooms[roomId]));
        }
      }
    }
  });
});

// ===========================================================================
// SERVER STARTUP
// ===========================================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
