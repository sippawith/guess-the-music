import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { MOVIE_CLUES, CARTOON_CLUES, LANDMARK_CLUES } from "./src/data/gameContent.ts";

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

// --- Spotify API Helper ---
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
    spotifyTokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000; // 1 min buffer
    return spotifyAccessToken;
  } catch (error) {
    console.error("Error fetching Spotify token:", error);
    return null;
  }
}

async function getItunesPreview(trackName: string, artistName: string) {
  try {
    // Clean up track name for better search (remove " - Remastered", etc.)
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

async function scrapeSpotifyPlaylist(playlistId: string) {
  try {
    // 1. Get embed token
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
    
    // 2. Get client token
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
            previewUrl: "", // We'll rely on Deezer fallback
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
    
    // Apple Music often has JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      const data = JSON.parse(jsonLdMatch[1]);
      // JSON-LD can be a single object or an array
      const root = Array.isArray(data) ? data.find(d => d["@type"] === "MusicPlaylist") : data;
      
      if (root && root.track) {
        const tracks = Array.isArray(root.track) ? root.track : [root.track];
        return tracks.map((t: any, index: number) => {
          const item = t.item || t;
          return {
            id: item.url?.split('/').pop() || `am-${index}`,
            name: item.name,
            artist: item.byArtist?.name || "Unknown Artist",
            previewUrl: "", // Will be fetched via Deezer
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

// --- Spotify OAuth Routes ---
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

// --- Game State Management ---
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

// --- API Routes ---
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

    // Fallback or error
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
      console.warn("Spotify API 403 - Forbidden. This may happen if the playlist is restricted or the token is invalid.");
    } else {
      console.error("Error fetching Spotify page:", error.response?.data || error.message);
    }
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post("/api/playlist/search", async (req, res) => {
  try {
    const { query } = req.body;
    
    // Try Spotify first
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

// --- Socket.io Logic ---
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
        movieGenre: "Action/Drama",
        cartoonSource: "Disney/CN",
        landmarkRegion: "Global",
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
        // If host left, assign new host
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
      
      // Reset scores? Usually yes for a new game
      Object.values(room.players).forEach(p => p.score = 0);
      
      io.to(roomId).emit("room_update", getPublicRoom(room));
    }
  });

  socket.on("start_game", async ({ roomId, playlistId, userToken, trackIds, customTracks }) => {
    const room = rooms[roomId];
    if (!room || !room.players[socket.id]?.isHost) return;

    try {
      io.to(roomId).emit("game_status", "Initializing Sequence...");
      
      let tracks: Track[] = [];

      if (room.category === "MUSIC") {
        io.to(roomId).emit("game_status", "Fetching tracks...");
        
        if (customTracks && Array.isArray(customTracks) && customTracks.length > 0) {
          tracks = customTracks;
        } else if (playlistId.includes("music.apple.com")) {
          const scrapedTracks = await scrapeAppleMusicPlaylist(playlistId);
          if (scrapedTracks) tracks = scrapedTracks;
        } else {
          // Deep fetch for Spotify if possible
          const token = userToken || await getSpotifyToken();
          if (token && playlistId) {
            try {
              let allItems: any[] = [];
              let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
              
              while (nextUrl && allItems.length < 1000) { // Limit to 1000 tracks to prevent excessive API calls
                try {
                  const response = await axios.get(nextUrl, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  
                  if (response.data.items) {
                    allItems = allItems.concat(response.data.items);
                  }
                  nextUrl = response.data.next;
                } catch (err: any) {
                  console.error("Error fetching next page in start_game:", err.response?.data || err.message);
                  if (allItems.length === 0) {
                    throw err; // Throw to trigger fallback if no tracks fetched
                  }
                  break; // Stop fetching if a page fails but we have some tracks
                }
              }
              
              console.log(`start_game: Fetched ${allItems.length} items from Spotify API`);
              
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
                console.log(`start_game: Mapped to ${tracks.length} tracks`);
              }
            } catch (e) {
              console.log("start_game: Falling back to scrapeSpotifyPlaylist due to error");
              const scrapedTracks = await scrapeSpotifyPlaylist(playlistId);
              if (scrapedTracks) tracks = scrapedTracks;
            }
          } else {
            console.log("start_game: No token, using scrapeSpotifyPlaylist");
            const scrapedTracks = await scrapeSpotifyPlaylist(playlistId);
            if (scrapedTracks) tracks = scrapedTracks;
          }
        }

        console.log(`start_game: Tracks before filtering: ${tracks.length}`);
        if (tracks.length === 0) {
          io.to(roomId).emit("error", "No tracks found in this playlist.");
          return;
        }

        // Filter by trackIds if provided
        if (trackIds && Array.isArray(trackIds)) {
          tracks = tracks.filter(t => trackIds.includes(t.id));
        }
      } else if (customTracks && Array.isArray(customTracks)) {
        tracks = customTracks;
      }

      // Apply spread logic and fetch previews for all music games
      if (room.category === 'MUSIC' && tracks.length > 0) {
        // Shuffle and slice with spread logic to cover the entire playlist
        // We pick extra tracks to account for potential preview failures
        const targetCount = room.settings.numTracks;
        const bufferCount = Math.min(tracks.length, Math.ceil(targetCount * 2.0) + 20);
        
        console.log(`start_game: Selecting ${bufferCount} tracks with spread from ${tracks.length} total tracks`);
        tracks = selectTracksWithSpread(tracks, bufferCount);
        
        io.to(roomId).emit("game_status", "Fetching previews...");
        
        // Fetch previews from iTunes in parallel
        const tracksWithPreviews = await Promise.all(tracks.map(async (track) => {
          const itunesData = await getItunesPreview(track.name, track.artist);
          return { 
            ...track, 
            previewUrl: itunesData?.preview || track.previewUrl || "",
            albumArt: itunesData?.albumArt || track.albumArt || ""
          };
        }));

        // Filter out tracks that still have no preview and slice to exact targetCount
        tracks = tracksWithPreviews
          .filter(t => t.previewUrl !== "")
          .slice(0, targetCount);
        
        console.log(`start_game: Final track count with previews: ${tracks.length} (Target: ${targetCount})`);
        
        if (tracks.length === 0) {
          io.to(roomId).emit("error", "Could not find playable previews for any tracks in this playlist.");
          return;
        }
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
      room.state = "PLAYING"; // Set to playing but with countdown
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

  function startRound(roomId: string) {
    const room = rooms[roomId];
    if (!room) return;

    room.state = "PLAYING";
    room.guessesThisRound = {};
    
    // Clear last guesses for players
    Object.values(room.players).forEach(p => p.lastGuess = "");

    // Send track info (WITHOUT the name/artist to prevent cheating)
    const currentTrack = room.tracks[room.currentTrackIndex];
    console.log(`[Game] Starting round ${room.currentTrackIndex + 1} for room ${roomId}. Category: ${room.category}`);
    
    // Determine round guess target
    if (room.category !== "MUSIC") {
      room.roundGuessTarget = "SONG";
    } else if (room.settings.guessTarget === "BOTH") {
      room.roundGuessTarget = Math.random() > 0.5 ? "SONG" : "ARTIST";
    } else {
      room.roundGuessTarget = room.settings.guessTarget;
    }

    let choices: string[] | undefined;
    if (room.settings.gameMode === "CHOICE_4" || room.settings.gameMode === "CHOICE_5" || room.settings.gameMode === "CHOICE_CUSTOM") {
      const numChoices = room.settings.gameMode === "CHOICE_CUSTOM" ? (room.settings.numChoices || 4) : (room.settings.gameMode === "CHOICE_5" ? 5 : 4);
      
      const getChoiceText = (t: any) => {
        if (room.roundGuessTarget === "SONG") return t.name;
        if (room.roundGuessTarget === "ARTIST") return t.artist;
        return `${t.name} - ${t.artist}`;
      };

      choices = [getChoiceText(currentTrack)];
      
      // Get decoys from the same category pool if it's a non-music category
      let decoyPool: any[] = [];
      if (room.category === "MOVIE") decoyPool = MOVIE_CLUES;
      else if (room.category === "CARTOON") decoyPool = CARTOON_CLUES;
      else if (room.category === "LANDMARK") decoyPool = LANDMARK_CLUES;
      else decoyPool = room.tracks; // For music, use the current tracks

      const allOtherChoices = Array.from(new Set(decoyPool.map(t => getChoiceText(t))))
        .filter(c => c !== choices[0]);
      
      const shuffled = allOtherChoices.sort(() => 0.5 - Math.random());
      for (let i = 0; i < numChoices - 1 && i < shuffled.length; i++) {
        choices.push(shuffled[i]);
      }
      
      // If we still need more choices (rare), add some placeholders
      if (choices.length < numChoices) {
        const placeholders = room.category === "MUSIC" 
          ? ["Unknown Track", "Mystery Artist", "Secret Song", "Hidden Track"]
          : ["Unknown Option", "Mystery Choice", "Secret Subject", "Hidden Detail"];
        for (let i = 0; choices.length < numChoices && i < placeholders.length; i++) {
          if (!choices.includes(placeholders[i])) {
            choices.push(placeholders[i]);
          }
        }
      }
      
      choices = choices.sort(() => 0.5 - Math.random());
      console.log(`[Game] Generated ${choices.length} choices for category ${room.category}:`, choices);
    }

    const imageUrl = currentTrack.imageUrl && !currentTrack.imageUrl.startsWith('http') 
      ? `https://loremflickr.com/800/600/${encodeURIComponent(currentTrack.name.replace(/\s+/g, ','))}`
      : currentTrack.imageUrl;

    const trackDataForClients = {
      previewUrl: currentTrack.previewUrl,
      imageUrl: imageUrl,
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

    // Schedule round end
    if (room.roundTimeout) clearTimeout(room.roundTimeout);
    room.roundTimeout = setTimeout(() => {
      startTimer(roomId);
    }, 5000); // 5s fallback if players don't buffer
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
    
    // Don't allow multiple correct guesses if they already have one
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
        // Fallback for BOTH if target wasn't set correctly
        isCorrect = normalizedName.includes(normalizedGuess) || normalizedGuess.includes(normalizedName) ||
                    normalizedArtist.includes(normalizedGuess) || normalizedGuess.includes(normalizedArtist);
      }
    } else {
      // For choice modes, exact match of the choice text
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

    // If everyone got it correct, end round early
    const correctGuesses = Object.values(room.guessesThisRound).filter(g => g.correct).length;
    if (correctGuesses === Object.keys(room.players).length) {
      if (room.roundTimeout) clearTimeout(room.roundTimeout);
      endRound(roomId);
    }
  });

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
      } else {
        hint = currentTrack.description?.substring(0, 30) + "..." || `Starts with: ${currentTrack.name.substring(0, 2)}...`;
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
      
      // Global Freeze: Extend the round end time and update the timeout
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

  function endRound(roomId: string) {
    const room = rooms[roomId];
    if (!room || room.state !== "PLAYING") return;

    room.state = "ROUND_END";
    const currentTrack = room.tracks[room.currentTrackIndex];

    // Calculate scores using time-decay and streaks
    const totalTime = room.settings.guessTime * 1000;
    const roundStartTime = room.roundEndTime - totalTime;

    for (const playerId of Object.keys(room.players)) {
      const player = room.players[playerId];
      player.prevScore = player.score;
      const guessData = room.guessesThisRound[playerId];

      if (guessData && guessData.correct) {
        let timeTaken = guessData.time - roundStartTime;
        
        // Adjust for freeze ability
        if (player.freezeActiveUntil && player.freezeActiveUntil > roundStartTime) {
            const freezeDuration = 5000; // 5 seconds
            timeTaken = Math.max(0, timeTaken - freezeDuration);
        }

        const timeLeft = Math.max(0, totalTime - timeTaken);
        const timeBonus = Math.floor((timeLeft / totalTime) * 100);
        
        player.streak++;
        player.maxStreak = Math.max(player.streak, player.maxStreak);
        
        // Streak multiplier: 10% bonus per streak level, max 100% (2x)
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

    // Schedule next round or game end
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

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Cleanup rooms
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId];
        } else {
          // If host left, assign new host
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

async function startServer() {
  // Vite middleware for development
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
