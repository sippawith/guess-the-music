import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

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
  if (Date.now() < spotifyTokenExpiry && spotifyAccessToken) {
    return spotifyAccessToken;
  }
  
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify credentials in environment variables.");
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
    throw error;
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
}

interface Room {
  id: string;
  players: Record<string, Player>;
  state: "LOBBY" | "PLAYING" | "ROUND_END" | "GAME_END";
  settings: {
    guessTime: number;
    numTracks: number;
    playlistUrl: string;
    gameMode: "TYPING" | "CHOICE_4" | "CHOICE_5";
    guessTarget: "SONG" | "ARTIST" | "BOTH";
  };
  tracks: Track[];
  currentTrackIndex: number;
  roundEndTime: number;
  roundGuessTarget?: "SONG" | "ARTIST";
  guessesThisRound: Record<string, { guess: string; time: number; correct: boolean }>;
  roundTimeout?: NodeJS.Timeout;
  bufferedPlayers: Set<string>;
}

const rooms: Record<string, Room> = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// --- API Routes ---
app.post("/api/playlist/details", async (req, res) => {
  try {
    const { playlistId } = req.body;
    const userToken = req.headers.authorization?.split(' ')[1];
    const token = userToken || await getSpotifyToken();

    const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json({
      id: response.data.id,
      name: response.data.name,
      owner: { display_name: response.data.owner.display_name },
      images: response.data.images
    });
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    res.status(error.response?.status || 500).json({ error: errorMsg });
  }
});

app.post("/api/playlist/search", async (req, res) => {
  try {
    const { query } = req.body;
    const userToken = req.headers.authorization?.split(' ')[1];
    const token = userToken || await getSpotifyToken();

    const response = await axios.get(`https://api.spotify.com/v1/search`, {
      params: { q: query, type: 'playlist', limit: 5 },
      headers: { Authorization: `Bearer ${token}` }
    });

    const playlists = response.data.playlists.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      owner: { display_name: item.owner.display_name },
      images: item.images
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

  socket.on("create_room", ({ name }) => {
    const roomId = generateRoomCode();
    rooms[roomId] = {
      id: roomId,
      players: {
        [socket.id]: { id: socket.id, name, score: 0, isHost: true }
      },
      state: "LOBBY",
      settings: { guessTime: 15, numTracks: 5, playlistUrl: "", gameMode: "TYPING", guessTarget: "BOTH" },
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

  socket.on("start_game", async ({ roomId, playlistId, userToken }) => {
    const room = rooms[roomId];
    if (!room || !room.players[socket.id]?.isHost) return;

    try {
      io.to(roomId).emit("game_status", "Fetching tracks from Spotify...");
      
      // Try scraping first (bypasses all API restrictions)
      let tracks: Track[] = [];
      const scrapedTracks = await scrapeSpotifyPlaylist(playlistId);
      
      if (scrapedTracks && scrapedTracks.length > 0) {
        tracks = scrapedTracks;
      } else {
        // Fallback to API if scraping fails
        const token = userToken || await getSpotifyToken();
        const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.data.tracks || !response.data.tracks.items) {
          throw new Error("No tracks found in this playlist or access denied.");
        }

        const items = response.data.tracks.items;
        tracks = items
          .filter((item: any) => item.track)
          .map((item: any) => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists.map((a: any) => a.name).join(", "),
            previewUrl: item.track.preview_url || "",
            albumArt: item.track.album.images?.[0]?.url || ""
          }));
      }

      // Shuffle and slice
      tracks = tracks.sort(() => Math.random() - 0.5).slice(0, room.settings.numTracks);
      
      if (tracks.length === 0) {
        io.to(roomId).emit("error", "No tracks found in this playlist.");
        return;
      }

      io.to(roomId).emit("game_status", "Fetching previews from Deezer...");
      
      // Fetch previews from Deezer in parallel (as requested by user)
      const tracksWithPreviews = await Promise.all(tracks.map(async (track) => {
        const deezerData = await getDeezerPreview(track.name, track.artist);
        // Fallback to Spotify preview if Deezer fails (Deezer blocks some IPs)
        return { 
          ...track, 
          previewUrl: deezerData?.preview || track.previewUrl || "",
          albumArt: deezerData?.albumArt || track.albumArt || ""
        };
      }));

      // Filter out tracks without previews
      const finalTracks = tracksWithPreviews.filter(t => t.previewUrl !== "");

      if (finalTracks.length === 0) {
        io.to(roomId).emit("error", "Could not find any playable previews for this playlist.");
        return;
      }

      room.tracks = finalTracks;
      room.currentTrackIndex = 0;
      startRound(roomId);
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
    
    // Determine round guess target if set to BOTH
    if (room.settings.guessTarget === "BOTH") {
      room.roundGuessTarget = Math.random() > 0.5 ? "SONG" : "ARTIST";
    } else {
      room.roundGuessTarget = room.settings.guessTarget;
    }

    let choices: string[] | undefined;
    if (room.settings.gameMode === "CHOICE_4" || room.settings.gameMode === "CHOICE_5") {
      const numChoices = room.settings.gameMode === "CHOICE_5" ? 5 : 4;
      
      const getChoiceText = (t: Track) => {
        if (room.roundGuessTarget === "SONG") return t.name;
        if (room.roundGuessTarget === "ARTIST") return t.artist;
        return `${t.name} - ${t.artist}`;
      };

      choices = [getChoiceText(currentTrack)];
      const otherTracks = room.tracks.filter(t => t.id !== currentTrack.id);
      const shuffled = otherTracks.sort(() => 0.5 - Math.random());
      for (let i = 0; i < numChoices - 1 && i < shuffled.length; i++) {
        choices.push(getChoiceText(shuffled[i]));
      }
      choices = Array.from(new Set(choices)); // Ensure unique choices
      while(choices.length < numChoices && shuffled.length > 0) {
         // if we removed duplicates, just add random strings or more tracks if available
         choices.push(getChoiceText(shuffled[Math.floor(Math.random() * shuffled.length)]) + " ");
         choices = Array.from(new Set(choices));
      }
      choices = choices.sort(() => 0.5 - Math.random());
    }

    const trackDataForClients = {
      previewUrl: currentTrack.previewUrl,
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
      let countdown = 8;
      io.to(roomId).emit("intermission_countdown", countdown);
      
      const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          io.to(roomId).emit("intermission_countdown", countdown);
        } else {
          clearInterval(interval);
          room.currentTrackIndex++;
          startRound(roomId);
        }
      }, 1000);
    } else {
      setTimeout(() => {
        room.state = "GAME_END";
        io.to(roomId).emit("game_end", room.players);
        io.to(roomId).emit("room_update", room);
      }, 8000);
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
