import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

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
  tracks: any[];
  currentTrackIndex: number;
  gameStatus?: string;
  countdown: number;
  roundGuessTarget?: "SONG" | "ARTIST";
  hintsUsed: number;
}

interface GameState {
  socket: Socket | null;
  roomId: string | null;
  playerName: string;
  room: Room | null;
  error: string | null;
  gameStatus: string | null;
  
  userToken: string | null;
  
  // Round specific
  currentTrack: { 
    previewUrl?: string; 
    imageUrl?: string;
    description?: string;
    duration: number; 
    startTime?: number; 
    choices?: string[]; 
    roundGuessTarget?: "SONG" | "ARTIST";
    hint?: string;
    hintsUsed?: number;
    maxHints?: number;
  } | null;
  roundStartTime: number;
  roundEndTime: number;
  isTimerStarted: boolean;
  currentTrackIndex: number;
  totalTracks: number;
  roundGuessTarget: "SONG" | "ARTIST" | null;
  
  // Countdown
  countdown: number | null;
  
  // Round end specific
  intermissionEndTime: number | null;
  intermissionDuration: number | null;
  lastRoundResult: {
    track: { name: string; artist: string; albumArt: string };
    guesses: Record<string, { guess: string; time: number; correct: boolean }>;
    players: Record<string, Player>;
  } | null;

  actions: {
    setUserToken: (token: string) => void;
    connect: () => void;
    setName: (name: string) => void;
    createRoom: (category: Room['category']) => void;
    joinRoom: (roomId: string) => void;
    updateSettings: (settings: Partial<Room['settings']>) => void;
    startGame: (playlistId: string, trackIds?: string[], customTracks?: Track[]) => void;
    resetToLobby: () => void;
    submitGuess: (guess: string) => void;
    getHint: () => void;
    clearError: () => void;
    trackPlaying: () => void;
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  roomId: null,
  playerName: '',
  room: null,
  error: null,
  gameStatus: null,
  
  userToken: null,
  
  currentTrack: null,
  roundStartTime: 0,
  roundEndTime: 0,
  isTimerStarted: false,
  currentTrackIndex: 0,
  totalTracks: 0,
  roundGuessTarget: null,
  
  countdown: null,
  
  intermissionEndTime: null,
  intermissionDuration: null,
  lastRoundResult: null,

  actions: {
    setUserToken: (token: string) => set({ userToken: token }),
    connect: () => {
      const socket = io();
      
      socket.on('room_created', (roomId) => {
        set({ roomId });
      });

      socket.on('room_update', (room) => {
        set({ room });
      });

      socket.on('error', (error) => {
        set({ error, gameStatus: null });
      });

      socket.on('game_status', (status) => {
        set({ gameStatus: status });
      });

      socket.on('round_start', (data) => {
        set({
          currentTrack: { ...data.track, hint: undefined },
          roundStartTime: 0,
          roundEndTime: 0,
          isTimerStarted: false,
          currentTrackIndex: data.currentTrackIndex,
          totalTracks: data.totalTracks,
          roundGuessTarget: data.track.roundGuessTarget || null,
          lastRoundResult: null,
          intermissionEndTime: null,
          intermissionDuration: null,
          countdown: null,
          gameStatus: null
        });
      });

      socket.on('hint_revealed', (data) => {
        set((state) => ({
          currentTrack: state.currentTrack ? { 
            ...state.currentTrack, 
            hint: data.hint,
            hintsUsed: data.hintsUsed,
            maxHints: data.maxHints
          } : null
        }));
      });

      socket.on('countdown_start', (count) => {
        set({ countdown: count });
      });

      socket.on('countdown_tick', (count) => {
        set({ countdown: count });
      });

      socket.on('start_timer', (endTime) => {
        set({
          roundStartTime: Date.now(),
          roundEndTime: endTime,
          isTimerStarted: true
        });
      });

      socket.on('intermission_start', (data) => {
        set({ 
          intermissionEndTime: data.endTime,
          intermissionDuration: data.duration
        });
      });

      socket.on('round_end', (data) => {
        set({ lastRoundResult: data, isTimerStarted: false });
      });

      socket.on('game_end', (players) => {
        // Game end logic
      });

      set({ socket });
    },
    
    setName: (name) => set({ playerName: name }),
    
    createRoom: (category) => {
      const { socket, playerName } = get();
      if (socket && playerName) {
        socket.emit('create_room', { name: playerName, category });
      }
    },
    
    joinRoom: (roomId) => {
      const { socket, playerName } = get();
      if (socket && playerName) {
        socket.emit('join_room', { roomId, name: playerName });
        set({ roomId });
      }
    },
    
    updateSettings: (settings: Partial<Room['settings']>) => {
      const { socket, roomId } = get();
      if (socket && roomId) {
        socket.emit('update_settings', { roomId, settings });
      }
    },
    
    startGame: (playlistId, trackIds, customTracks) => {
      const { socket, roomId, userToken } = get();
      if (socket && roomId) {
        socket.emit('start_game', { roomId, playlistId, userToken, trackIds, customTracks });
      }
    },
    
    resetToLobby: () => {
      const { socket, roomId } = get();
      if (socket && roomId) {
        socket.emit('reset_to_lobby', { roomId });
      }
    },
    
    submitGuess: (guess) => {
      const { socket, roomId, isTimerStarted } = get();
      if (socket && roomId && isTimerStarted) {
        socket.emit('submit_guess', { roomId, guess });
      }
    },
    
    getHint: () => {
      const { socket, roomId, isTimerStarted } = get();
      if (socket && roomId && isTimerStarted) {
        socket.emit('get_hint', { roomId });
      }
    },
    
    clearError: () => set({ error: null }),

    trackPlaying: () => {
      const { socket, roomId } = get();
      if (socket && roomId) {
        socket.emit('track_playing', { roomId });
      }
    }
  }
}));
