import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  score: number;
  lastGuess?: string;
  isHost: boolean;
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
    intermissionTime: number;
  };
  tracks: any[];
  currentTrackIndex: number;
  roundGuessTarget?: "SONG" | "ARTIST";
}

interface GameState {
  socket: Socket | null;
  roomId: string | null;
  playerName: string;
  room: Room | null;
  error: string | null;
  
  userToken: string | null;
  
  // Round specific
  currentTrack: { previewUrl: string; duration: number; startTime?: number; choices?: string[]; roundGuessTarget?: "SONG" | "ARTIST" } | null;
  roundStartTime: number;
  roundEndTime: number;
  isTimerStarted: boolean;
  currentTrackIndex: number;
  totalTracks: number;
  roundGuessTarget: "SONG" | "ARTIST" | null;
  
  // Round end specific
  intermissionCountdown: number | null;
  lastRoundResult: {
    track: { name: string; artist: string; albumArt: string };
    guesses: Record<string, { guess: string; time: number; correct: boolean }>;
    players: Record<string, Player>;
  } | null;

  actions: {
    setUserToken: (token: string) => void;
    connect: () => void;
    setName: (name: string) => void;
    createRoom: () => void;
    joinRoom: (roomId: string) => void;
    updateSettings: (settings: Partial<Room['settings']>) => void;
    startGame: (playlistId: string) => void;
    submitGuess: (guess: string) => void;
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
  
  userToken: null,
  
  currentTrack: null,
  roundStartTime: 0,
  roundEndTime: 0,
  isTimerStarted: false,
  currentTrackIndex: 0,
  totalTracks: 0,
  roundGuessTarget: null,
  
  intermissionCountdown: null,
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
        set({ error });
      });

      socket.on('round_start', (data) => {
        set({
          currentTrack: data.track,
          roundStartTime: 0,
          roundEndTime: 0,
          isTimerStarted: false,
          currentTrackIndex: data.currentTrackIndex,
          totalTracks: data.totalTracks,
          roundGuessTarget: data.track.roundGuessTarget || null,
          lastRoundResult: null,
          intermissionCountdown: null
        });
      });

      socket.on('start_timer', (endTime) => {
        set({
          roundStartTime: Date.now(),
          roundEndTime: endTime,
          isTimerStarted: true
        });
      });

      socket.on('intermission_countdown', (countdown) => {
        set({ intermissionCountdown: countdown });
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
    
    createRoom: () => {
      const { socket, playerName } = get();
      if (socket && playerName) {
        socket.emit('create_room', { name: playerName });
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
    
    startGame: (playlistId) => {
      const { socket, roomId, userToken } = get();
      if (socket && roomId) {
        socket.emit('start_game', { roomId, playlistId, userToken });
      }
    },
    
    submitGuess: (guess) => {
      const { socket, roomId, isTimerStarted } = get();
      if (socket && roomId && isTimerStarted) {
        socket.emit('submit_guess', { roomId, guess });
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
