import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

import { Player, Track, Room } from "./src/server/types";
import { shuffleArray, selectTracksWithSpread } from "./src/server/utils";
import { getSpotifyToken, getItunesPreview, scrapeSpotifyPlaylist } from "./src/server/spotify";
import { scrapeAppleMusicPlaylist } from "./src/server/appleMusic";
import { fetchMoviesFromTMDB, fetchCartoonsFromTMDB } from "./src/server/tmdb";
import { prepareLandmarkTracks } from "./src/server/landmarks";

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
// GAME STATE
// ===========================================================================

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
        gameMode: "CHOICE_4", 
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
        
        tracks = await fetchMoviesFromTMDB(genre);
        
        if (tracks.length === 0) {
          io.to(roomId).emit("error", "Could not fetch movies. Check TMDB API key in .env");
          return;
        }
        
        tracks = selectTracksWithSpread(tracks, room.settings.numTracks);
      }

      // --- CARTOON category ---
      else if (room.category === "CARTOON") {
        const source = room.settings.cartoonSource || "Disney/Pixar";
        io.to(roomId).emit("game_status", `Fetching ${source} cartoons...`);
        
        tracks = await fetchCartoonsFromTMDB(source);
        
        if (tracks.length === 0) {
          io.to(roomId).emit("error", "Could not fetch cartoons. Check TMDB API key in .env");
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
  // CHAT
  // =========================================================================

  socket.on("chat_message", ({ roomId, message }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;

    io.to(roomId).emit("chat_message", {
      id: Math.random().toString(36).substring(2, 9),
      playerName: player.name,
      message,
      timestamp: Date.now(),
      playerId: socket.id
    });
  });

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
