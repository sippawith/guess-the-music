import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { MOVIE_CLUES, CARTOON_CLUES, LANDMARK_CLUES } from "./src/data/gameContent.ts";

dotenv.config();

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

async function getDeezerPreview(trackName: string, artistName: string) {
  try {
    const query = `track:"${trackName}" artist:"${artistName}"`;
    const response = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
    if (response.data.data && response.data.data.length > 0) {
      return {
        preview: response.data.data[0].preview,
        albumArt: response.data.data[0].album?.cover_xl || response.data.data[0].album?.cover_medium || ""
      };
    }
    // Fallback to general search if specific search fails
    const fallbackResponse = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(`${trackName} ${artistName}`)}`);
    if (fallbackResponse.data.data && fallbackResponse.data.data.length > 0) {
      return {
        preview: fallbackResponse.data.data[0].preview,
        albumArt: fallbackResponse.data.data[0].album?.cover_xl || fallbackResponse.data.data[0].album?.cover_medium || ""
      };
    }
  } catch (error) {
    console.error("Deezer search error:", error);
  }
  return null;
}

async function scrapeSpotifyPlaylist(playlistId: string) {
  try {
    const res = await axios.get(`https://open.spotify.com/embed/playlist/${playlistId}`);
    const html = res.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (match) {
      const data = JSON.parse(match[1]);
      const entity = data.props?.pageProps?.state?.data?.entity;
      if (entity && entity.trackList) {
        return entity.trackList.map((t: any) => ({
          id: t.uri.split(':').pop(),
          name: t.title,
          artist: t.subtitle,
          previewUrl: t.audioPreview?.url || "",
          albumArt: entity.coverArt?.sources?.[0]?.url || "" // Fallback to playlist cover
        }));
      }
    }
  } catch (error) {
    console.error("Error scraping Spotify embed:", error);
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
  lastGuess?: string;
  isHost: boolean;
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
    gameMode: "TYPING" | "CHOICE_4" | "CHOICE_5";
    guessTarget: "SONG" | "ARTIST" | "BOTH";
    intermissionTime: number;
    movieGenre?: string;
    cartoonSource?: string;
    landmarkRegion?: string;
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
        [socket.id]: { id: socket.id, name, score: 0, isHost: true }
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
        movieGenre: "Action/Drama",
        cartoonSource: "Disney/CN",
        landmarkRegion: "Global"
      },
      tracks: [],
      currentTrackIndex: -1,
      roundEndTime: 0,
      guessesThisRound: {},
      bufferedPlayers: new Set()
    };
    socket.join(roomId);
    socket.emit("room_created", roomId);
    io.to(roomId).emit("room_update", rooms[roomId]);
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
    
    room.players[socket.id] = { id: socket.id, name, score: 0, isHost: false };
    socket.join(roomId);
    io.to(roomId).emit("room_update", room);
  });

  socket.on("update_settings", ({ roomId, settings }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]?.isHost) {
      room.settings = { ...room.settings, ...settings };
      io.to(roomId).emit("room_update", room);
    }
  });

  socket.on("reset_to_lobby", ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]?.isHost) {
      room.state = "LOBBY";
      room.currentTrackIndex = -1;
      room.tracks = [];
      room.guessesThisRound = {};
      room.bufferedPlayers = new Set();
      if (room.roundTimeout) clearTimeout(room.roundTimeout);
      
      // Reset scores? Usually yes for a new game
      Object.values(room.players).forEach(p => p.score = 0);
      
      io.to(roomId).emit("room_update", room);
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
        if (playlistId.includes("music.apple.com")) {
          const scrapedTracks = await scrapeAppleMusicPlaylist(playlistId);
          if (scrapedTracks) tracks = scrapedTracks;
        } else {
          // Deep fetch for Spotify if possible
          const token = userToken || await getSpotifyToken();
          if (token && playlistId) {
            try {
              const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { limit: 100 } // Get more tracks
              });
              
              if (response.data.items) {
                tracks = response.data.items
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

        // Shuffle and slice
        tracks = tracks.sort(() => Math.random() - 0.5).slice(0, room.settings.numTracks);
        
        io.to(roomId).emit("game_status", "Fetching previews...");
        
        // Fetch previews from Deezer in parallel
        const tracksWithPreviews = await Promise.all(tracks.map(async (track) => {
          const deezerData = await getDeezerPreview(track.name, track.artist);
          return { 
            ...track, 
            previewUrl: deezerData?.preview || track.previewUrl || "",
            albumArt: deezerData?.albumArt || track.albumArt || ""
          };
        }));

        tracks = tracksWithPreviews.filter(t => t.previewUrl !== "");
      } else if (customTracks && Array.isArray(customTracks)) {
        tracks = customTracks;
      }

      if (tracks.length === 0) {
        io.to(roomId).emit("error", "Could not prepare game content. Please try again.");
        return;
      }

      room.tracks = tracks;
      room.currentTrackIndex = 0;
      room.hintsUsed = 0;
      
      // Start countdown
      room.state = "PLAYING"; // Set to playing but with countdown
      room.countdown = 5;
      
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
      
      io.to(roomId).emit("countdown_start", 5);
      io.to(roomId).emit("room_update", room);
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
    if (room.settings.gameMode === "CHOICE_4" || room.settings.gameMode === "CHOICE_5") {
      const numChoices = room.settings.gameMode === "CHOICE_5" ? 5 : 4;
      
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

    const trackDataForClients = {
      previewUrl: currentTrack.previewUrl,
      imageUrl: currentTrack.imageUrl,
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
    
    io.to(roomId).emit("room_update", room);

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

    // If everyone guessed, end round early
    if (Object.keys(room.guessesThisRound).length === Object.keys(room.players).length) {
      if (room.roundTimeout) clearTimeout(room.roundTimeout);
      endRound(roomId);
    }
  });

  socket.on("get_hint", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.state !== "PLAYING") return;

    const maxHints = Math.max(1, Math.floor(room.tracks.length * 0.3));
    if (room.hintsUsed >= maxHints) {
      socket.emit("error", "No hints remaining!");
      return;
    }

    const currentTrack = room.tracks[room.currentTrackIndex];
    const target = room.roundGuessTarget;
    
    let hint = "";
    if (room.category === "MUSIC") {
      if (target === "SONG") {
        hint = `Artist: ${currentTrack.artist}`;
      } else if (target === "ARTIST") {
        hint = `Song: ${currentTrack.name}`;
      } else {
        hint = `It's by ${currentTrack.artist}`;
      }
    } else {
      // For movies/cartoons/landmarks, reveal the "artist" (director/creator/region)
      if (currentTrack.artist) {
        hint = `Related to: ${currentTrack.artist}`;
      } else {
        const name = currentTrack.name;
        hint = `Starts with: ${name.substring(0, 2)}...`;
      }
    }

    room.hintsUsed++;
    io.to(roomId).emit("hint_revealed", { hint, hintsUsed: room.hintsUsed, maxHints });
    io.to(roomId).emit("room_update", room);
  });

  function endRound(roomId: string) {
    const room = rooms[roomId];
    if (!room || room.state !== "PLAYING") return;

    room.state = "ROUND_END";
    const currentTrack = room.tracks[room.currentTrackIndex];

    // Calculate scores
    let firstCorrectId: string | null = null;
    let earliestTime = Infinity;

    for (const [playerId, guessData] of Object.entries(room.guessesThisRound)) {
      if (guessData.correct && guessData.time < earliestTime) {
        earliestTime = guessData.time;
        firstCorrectId = playerId;
      }
    }

    if (firstCorrectId && room.players[firstCorrectId]) {
      room.players[firstCorrectId].score += 100; // Give points to the fastest
    }
    
    // Give partial points to others who got it right?
    for (const [playerId, guessData] of Object.entries(room.guessesThisRound)) {
       if (guessData.correct && playerId !== firstCorrectId && room.players[playerId]) {
           room.players[playerId].score += 50;
       }
    }

    io.to(roomId).emit("round_end", {
      track: currentTrack,
      guesses: room.guessesThisRound,
      players: room.players
    });
    
    io.to(roomId).emit("room_update", room);

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
        io.to(roomId).emit("room_update", room);
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
          io.to(roomId).emit("room_update", rooms[roomId]);
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
