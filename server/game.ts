import { Server } from 'socket.io';
import axios from 'axios';
import { Room, Track } from './types';
import { generateRoomCode, getPublicRoom, selectTracksWithSpread, shuffleArray } from './utils';
import { fetchCartoonsFromTMDB, fetchMoviesFromTMDB, prepareLandmarkTracks } from './services/visual';
import { getItunesPreview, getSpotifyToken, scrapeAppleMusicPlaylist, scrapeSpotifyPlaylist } from './services/music';

const rooms: Record<string, Room> = {};

export function registerGameHandlers(io: Server) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', ({ name, category }) => {
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
        state: 'LOBBY',
        category: category || 'MUSIC',
        hintsUsed: 0,
        settings: {
          guessTime: 15,
          numTracks: 5,
          playlistUrl: '',
          gameMode: 'TYPING',
          guessTarget: 'BOTH',
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
      socket.emit('room_created', roomId);
      io.to(roomId).emit('room_update', getPublicRoom(rooms[roomId]));
    });

    socket.on('join_room', ({ roomId, name }) => {
      const room = rooms[roomId];
      if (!room) return socket.emit('error', 'Room not found');
      if (room.state !== 'LOBBY') return socket.emit('error', 'Game already in progress');

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
      io.to(roomId).emit('room_update', getPublicRoom(room));
    });

    socket.on('leave_room', ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || !room.players[socket.id]) return;
      delete room.players[socket.id];
      if (Object.keys(room.players).length === 0) {
        delete rooms[roomId];
      } else {
        const remainingPlayers = Object.values(room.players);
        if (!remainingPlayers.some(p => p.isHost)) remainingPlayers[0].isHost = true;
        io.to(roomId).emit('room_update', getPublicRoom(room));
      }
    });

    socket.on('update_settings', ({ roomId, settings }) => {
      const room = rooms[roomId];
      if (room && room.players[socket.id]?.isHost) {
        room.settings = { ...room.settings, ...settings };
        io.to(roomId).emit('room_update', getPublicRoom(room));
      }
    });

    socket.on('reset_to_lobby', ({ roomId }) => {
      const room = rooms[roomId];
      if (room && room.players[socket.id]?.isHost) {
        room.state = 'LOBBY';
        room.currentTrackIndex = -1;
        room.tracks = [];
        room.hintsUsed = 0;
        room.guessesThisRound = {};
        room.bufferedPlayers = new Set();
        if (room.roundTimeout) clearTimeout(room.roundTimeout);
        Object.values(room.players).forEach(p => p.score = 0);
        io.to(roomId).emit('room_update', getPublicRoom(room));
      }
    });

    socket.on('start_game', async ({ roomId, playlistId, userToken, trackIds, customTracks }) => {
      const room = rooms[roomId];
      if (!room || !room.players[socket.id]?.isHost) return;

      try {
        io.to(roomId).emit('game_status', 'Initializing Sequence...');
        let tracks: Track[] = [];

        if (room.category === 'MUSIC') {
          io.to(roomId).emit('game_status', 'Fetching tracks...');

          if (customTracks && Array.isArray(customTracks) && customTracks.length > 0) {
            tracks = customTracks;
          } else if (playlistId.includes('music.apple.com')) {
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
                    if (response.data.items) allItems = allItems.concat(response.data.items);
                    nextUrl = response.data.next;
                  } catch (err: any) {
                    console.error('Error fetching page:', err.response?.data || err.message);
                    if (allItems.length === 0) throw err;
                    break;
                  }
                }

                if (allItems.length > 0) {
                  tracks = allItems
                    .filter((item: any) => item.track)
                    .map((item: any) => ({
                      id: item.track.id,
                      name: item.track.name,
                      artist: item.track.artists.map((a: any) => a.name).join(', '),
                      previewUrl: item.track.preview_url || '',
                      albumArt: item.track.album.images?.[0]?.url || ''
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

          if (tracks.length === 0) return io.to(roomId).emit('error', 'No tracks found in this playlist.');

          if (trackIds && Array.isArray(trackIds)) {
            tracks = tracks.filter(t => trackIds.includes(t.id));
          }

          const targetCount = room.settings.numTracks;
          const bufferCount = Math.min(tracks.length, Math.ceil(targetCount * 2.0) + 20);
          tracks = selectTracksWithSpread(tracks, bufferCount);

          io.to(roomId).emit('game_status', 'Fetching previews...');
          const tracksWithPreviews = await Promise.all(tracks.map(async (track) => {
            const itunesData = await getItunesPreview(track.name, track.artist);
            return {
              ...track,
              previewUrl: itunesData?.preview || track.previewUrl || '',
              albumArt: itunesData?.albumArt || track.albumArt || ''
            };
          }));

          tracks = tracksWithPreviews.filter(t => t.previewUrl !== '').slice(0, targetCount);
          if (tracks.length === 0) return io.to(roomId).emit('error', 'Could not find playable previews for any tracks.');
        } else if (room.category === 'MOVIE') {
          const genre = room.settings.movieGenre || 'Action/Drama';
          tracks = await fetchMoviesFromTMDB(genre);
          if (tracks.length === 0) return io.to(roomId).emit('error', 'Could not fetch movies. Check TMDB API key in .env');
          tracks = selectTracksWithSpread(tracks, room.settings.numTracks);
        } else if (room.category === 'CARTOON') {
          const source = room.settings.cartoonSource || 'Disney/Pixar';
          tracks = await fetchCartoonsFromTMDB(source);
          if (tracks.length === 0) return io.to(roomId).emit('error', 'Could not fetch cartoons. Check TMDB API key in .env');
          tracks = selectTracksWithSpread(tracks, room.settings.numTracks);
        } else if (room.category === 'LANDMARK') {
          const region = room.settings.landmarkRegion || 'Global';
          tracks = await prepareLandmarkTracks(region);
          if (tracks.length === 0) return io.to(roomId).emit('error', 'Could not load landmarks.');
          tracks = selectTracksWithSpread(tracks, room.settings.numTracks);
        }

        if (tracks.length === 0) return io.to(roomId).emit('error', 'Could not prepare game content. Please try again.');

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
        room.state = 'PLAYING';
        room.countdown = 3;

        const countdownInterval = setInterval(() => {
          if (!rooms[roomId]) return clearInterval(countdownInterval);
          rooms[roomId].countdown!--;
          io.to(roomId).emit('countdown_tick', rooms[roomId].countdown);
          if (rooms[roomId].countdown === 0) {
            clearInterval(countdownInterval);
            delete rooms[roomId].countdown;
            startRound(roomId);
          }
        }, 1000);

        io.to(roomId).emit('countdown_start', 3);
        io.to(roomId).emit('room_update', getPublicRoom(room));
      } catch (error: any) {
        console.error('Game Start Error:', error.response?.data || error.message);
        io.to(roomId).emit('error', 'Failed to start game: ' + (error.response?.data?.error?.message || error.message));
      }
    });

    function startRound(roomId: string) {
      const room = rooms[roomId];
      if (!room) return;

      room.state = 'PLAYING';
      room.guessesThisRound = {};
      Object.values(room.players).forEach(p => p.lastGuess = '');

      const currentTrack = room.tracks[room.currentTrackIndex];

      if (room.category !== 'MUSIC') room.roundGuessTarget = 'SONG';
      else if (room.settings.guessTarget === 'BOTH') room.roundGuessTarget = Math.random() > 0.5 ? 'SONG' : 'ARTIST';
      else room.roundGuessTarget = room.settings.guessTarget;

      let choices: string[] | undefined;
      if (room.settings.gameMode === 'CHOICE_4' || room.settings.gameMode === 'CHOICE_5' || room.settings.gameMode === 'CHOICE_CUSTOM') {
        const numChoices = room.settings.gameMode === 'CHOICE_CUSTOM'
          ? (room.settings.numChoices || 4)
          : (room.settings.gameMode === 'CHOICE_5' ? 5 : 4);

        const getChoiceText = (t: any) => {
          if (room.roundGuessTarget === 'SONG') return t.name;
          if (room.roundGuessTarget === 'ARTIST') return t.artist;
          return `${t.name} - ${t.artist}`;
        };

        choices = [getChoiceText(currentTrack)];
        const allOtherChoices = Array.from(new Set(room.tracks.map(t => getChoiceText(t))))
          .filter(c => c !== choices![0]);

        const shuffled = allOtherChoices.sort(() => 0.5 - Math.random());
        for (let i = 0; i < numChoices - 1 && i < shuffled.length; i++) choices.push(shuffled[i]);

        if (choices.length < numChoices) {
          const placeholders = ['Unknown', 'Mystery', 'Secret', 'Hidden'];
          for (let i = 0; choices.length < numChoices && i < placeholders.length; i++) {
            if (!choices.includes(placeholders[i])) choices.push(placeholders[i]);
          }
        }

        choices = choices.sort(() => 0.5 - Math.random());
      }

      room.roundEndTime = 0;
      room.bufferedPlayers = new Set();

      io.to(roomId).emit('round_start', {
        track: {
          previewUrl: currentTrack.previewUrl,
          imageUrl: currentTrack.imageUrl || '',
          description: currentTrack.description,
          albumArt: currentTrack.albumArt,
          duration: room.settings.guessTime,
          startTime: currentTrack.startTime || 30,
          choices,
          roundGuessTarget: room.roundGuessTarget
        },
        currentTrackIndex: room.currentTrackIndex,
        totalTracks: room.tracks.length
      });

      io.to(roomId).emit('room_update', getPublicRoom(room));
      if (room.roundTimeout) clearTimeout(room.roundTimeout);
      room.roundTimeout = setTimeout(() => startTimer(roomId), room.category === 'MUSIC' ? 5000 : 3000);
    }

    function startTimer(roomId: string) {
      const room = rooms[roomId];
      if (!room || room.roundEndTime !== 0) return;
      if (room.roundTimeout) clearTimeout(room.roundTimeout);
      room.roundEndTime = Date.now() + (room.settings.guessTime * 1000);
      io.to(roomId).emit('start_timer', room.roundEndTime);
      room.roundTimeout = setTimeout(() => endRound(roomId), room.settings.guessTime * 1000);
    }

    socket.on('track_playing', ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || room.state !== 'PLAYING' || room.roundEndTime !== 0) return;
      room.bufferedPlayers.add(socket.id);
      const numPlayers = Object.keys(room.players).length;
      if (room.bufferedPlayers.size >= numPlayers) startTimer(roomId);
    });

    socket.on('submit_guess', ({ roomId, guess }) => {
      const room = rooms[roomId];
      if (!room || room.state !== 'PLAYING') return;
      if (room.guessesThisRound[socket.id]?.correct) return;

      const currentTrack = room.tracks[room.currentTrackIndex];
      const normalizedGuess = guess.toLowerCase().trim();
      const normalizedName = currentTrack.name.toLowerCase().trim();
      const normalizedArtist = currentTrack.artist.toLowerCase().trim();

      let isCorrect = false;
      const target = room.roundGuessTarget || room.settings.guessTarget;

      if (room.settings.gameMode === 'TYPING') {
        if (target === 'SONG') isCorrect = normalizedName.includes(normalizedGuess) || normalizedGuess.includes(normalizedName);
        else if (target === 'ARTIST') isCorrect = normalizedArtist.includes(normalizedGuess) || normalizedGuess.includes(normalizedArtist);
        else isCorrect = normalizedName.includes(normalizedGuess) || normalizedGuess.includes(normalizedName) || normalizedArtist.includes(normalizedGuess) || normalizedGuess.includes(normalizedArtist);
      } else {
        const expectedChoice = target === 'SONG' ? currentTrack.name : target === 'ARTIST' ? currentTrack.artist : `${currentTrack.name} - ${currentTrack.artist}`;
        isCorrect = guess === expectedChoice;
      }

      room.guessesThisRound[socket.id] = { guess, time: Date.now(), correct: isCorrect };
      if (room.players[socket.id]) room.players[socket.id].lastGuess = guess;

      const correctGuesses = Object.values(room.guessesThisRound).filter(g => g.correct).length;
      if (correctGuesses === Object.keys(room.players).length) {
        if (room.roundTimeout) clearTimeout(room.roundTimeout);
        endRound(roomId);
      }
    });

    socket.on('use_ability', ({ roomId, ability }) => {
      const room = rooms[roomId];
      if (!room || room.state !== 'PLAYING') return;
      const player = room.players[socket.id];
      if (!player) return;
      if (!room.settings.abilitiesEnabled) return socket.emit('error', 'Abilities are disabled in this room.');
      if (player.abilities[ability] <= 0) return socket.emit('error', `No ${ability} uses remaining!`);

      const currentTrack = room.tracks[room.currentTrackIndex];
      const target = room.roundGuessTarget;

      if (ability === 'hint') {
        let hint = '';
        if (room.category === 'MUSIC') {
          if (target === 'SONG') hint = `Artist: ${currentTrack.artist}`;
          else if (target === 'ARTIST') hint = `Song: ${currentTrack.name}`;
          else hint = `Artist: ${currentTrack.artist.substring(0, 3)}...`;
        } else if (room.category === 'MOVIE' || room.category === 'CARTOON') hint = `Year: ${currentTrack.artist}`;
        else if (room.category === 'LANDMARK') hint = `Country: ${currentTrack.artist}`;

        player.abilities[ability]--;
        socket.emit('hint_revealed', { hint, playerSpecific: true });
      } else if (ability === 'removeWrong') {
        if (room.settings.gameMode.startsWith('CHOICE')) {
          player.abilities[ability]--;
          socket.emit('ability_effect', { type: 'REMOVE_WRONG', count: 2 });
        } else {
          socket.emit('error', 'This ability only works in Choice modes.');
        }
      } else if (ability === 'freeze') {
        player.abilities[ability]--;
        const freezeDuration = 5000;
        room.roundEndTime += freezeDuration;

        if (room.roundTimeout) {
          clearTimeout(room.roundTimeout);
          const remaining = Math.max(0, room.roundEndTime - Date.now());
          room.roundTimeout = setTimeout(() => endRound(roomId), remaining);
        }

        io.to(roomId).emit('ability_effect', { type: 'FREEZE', duration: freezeDuration });
        io.to(roomId).emit('start_timer', room.roundEndTime);
      }

      io.to(roomId).emit('room_update', getPublicRoom(room));
    });

    function endRound(roomId: string) {
      const room = rooms[roomId];
      if (!room || room.state !== 'PLAYING') return;

      room.state = 'ROUND_END';
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
          player.score += Math.floor((50 + timeBonus) * streakMultiplier);
        } else {
          player.streak = 0;
        }
      }

      io.to(roomId).emit('round_end', {
        track: currentTrack,
        guesses: room.guessesThisRound,
        players: room.players,
        roundStartTime
      });
      io.to(roomId).emit('room_update', getPublicRoom(room));

      if (room.currentTrackIndex < room.tracks.length - 1) {
        const intermissionDuration = (room.settings.intermissionTime || 8) * 1000;
        io.to(roomId).emit('intermission_start', {
          endTime: Date.now() + intermissionDuration,
          duration: room.settings.intermissionTime || 8
        });

        if (room.roundTimeout) clearTimeout(room.roundTimeout);
        room.roundTimeout = setTimeout(() => {
          room.currentTrackIndex++;
          startRound(roomId);
        }, intermissionDuration);
      } else {
        setTimeout(() => {
          room.state = 'GAME_END';
          io.to(roomId).emit('game_end', room.players);
          io.to(roomId).emit('room_update', getPublicRoom(room));
        }, 5000);
      }
    }

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const roomId in rooms) {
        if (rooms[roomId].players[socket.id]) {
          delete rooms[roomId].players[socket.id];
          if (Object.keys(rooms[roomId].players).length === 0) {
            delete rooms[roomId];
          } else {
            const remainingPlayers = Object.values(rooms[roomId].players);
            if (!remainingPlayers.some(p => p.isHost)) remainingPlayers[0].isHost = true;
            io.to(roomId).emit('room_update', getPublicRoom(rooms[roomId]));
          }
        }
      }
    });
  });
}
