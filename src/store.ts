import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  playerName: string;
  message: string;
  timestamp: number;
  playerId: string;
}

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
}

interface LikedTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  imageUrl?: string;
  description?: string;
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
  likedTracks: LikedTrack[];
  
  userToken: string | null;
  
  selectedPlaylist: { id: string, name: string, image: string, url?: string } | null;
  playlistTracks: any[];
  selectedLanguages: string[];
  
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
    isFrozen?: boolean;
    freezeEndTime?: number;
    removedChoices?: string[];
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
    track: { name: string; artist: string; albumArt: string; imageUrl?: string };
    guesses: Record<string, { guess: string; time: number; correct: boolean }>;
    players: Record<string, Player>;
    roundStartTime: number;
  } | null;

  // UI State
  theme: 'light' | 'dark';
  viewingLobby: boolean;
  
  // Chat
  chatMessages: ChatMessage[];
  isChatOpen: boolean;

  actions: {
    setSelectedPlaylist: (playlist: { id: string, name: string, image: string, url?: string } | null) => void;
    setPlaylistTracks: (tracks: any[]) => void;
    setSelectedLanguages: (languages: string[]) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleTheme: () => void;
    setUserToken: (token: string) => void;
    setViewingLobby: (viewing: boolean) => void;
    connect: () => void;
    setName: (name: string) => void;
    createRoom: (category: Room['category']) => void;
    joinRoom: (roomId: string) => void;
    updateSettings: (settings: Partial<Room['settings']>) => void;
    startGame: (playlistId: string, trackIds?: string[], customTracks?: Track[]) => void;
    resetToLobby: () => void;
    submitGuess: (guess: string) => void;
    useAbility: (ability: 'hint' | 'removeWrong' | 'freeze') => void;
    leaveRoom: () => void;
    setError: (error: string) => void;
    clearError: () => void;
    trackPlaying: () => void;
    likeTrack: (track: LikedTrack) => void;
    unlikeTrack: (trackId: string) => void;
    sendChatMessage: (message: string) => void;
    toggleChat: () => void;
    setChatOpen: (isOpen: boolean) => void;
  };
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  roomId: null,
  playerName: '',
  room: null,
  error: null,
  gameStatus: null,
  likedTracks: [],
  
  userToken: null,
  
  selectedPlaylist: null,
  playlistTracks: [],
  selectedLanguages: [],
  
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
  
  viewingLobby: false,

  theme: 'light',
  
  chatMessages: [],
  isChatOpen: false,

  actions: {
    setSelectedPlaylist: (playlist) => set({ selectedPlaylist: playlist }),
    setPlaylistTracks: (tracks) => set({ playlistTracks: tracks }),
    setSelectedLanguages: (languages) => set({ selectedLanguages: languages }),
    setTheme: (theme) => set({ theme }),
    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    setUserToken: (token: string) => set({ userToken: token }),
    setViewingLobby: (viewing: boolean) => set({ viewingLobby: viewing }),
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
          gameStatus: null
        });
        setTimeout(() => {
          set({ countdown: null });
        }, 1000);
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

      socket.on('ability_effect', (data) => {
        if (data.type === 'FREEZE') {
          set((state) => ({
            currentTrack: state.currentTrack ? { 
              ...state.currentTrack, 
              isFrozen: true,
              freezeEndTime: Date.now() + data.duration
            } : null
          }));
          setTimeout(() => {
            set((state) => ({
              currentTrack: state.currentTrack ? { ...state.currentTrack, isFrozen: false, freezeEndTime: undefined } : null
            }));
          }, data.duration);
        } else if (data.type === 'REMOVE_WRONG') {
          const { currentTrack, room } = get();
          if (!currentTrack || !currentTrack.choices || !room) return;
          
          const correctChoice = room.roundGuessTarget === 'SONG' ? room.tracks[room.currentTrackIndex].name :
                                room.roundGuessTarget === 'ARTIST' ? room.tracks[room.currentTrackIndex].artist :
                                `${room.tracks[room.currentTrackIndex].name} - ${room.tracks[room.currentTrackIndex].artist}`;
          
          const wrongChoices = currentTrack.choices.filter(c => c !== correctChoice);
          const toRemove = shuffleArray(wrongChoices).slice(0, data.count);
          
          set((state) => ({
            currentTrack: state.currentTrack ? { 
              ...state.currentTrack, 
              removedChoices: [...(state.currentTrack.removedChoices || []), ...toRemove] 
            } : null
          }));
        }
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

      socket.on('chat_message', (message: ChatMessage) => {
        set((state) => ({
          chatMessages: [...state.chatMessages, message]
        }));
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
      const { socket, roomId } = get();
      if (socket && roomId) {
        socket.emit('submit_guess', { roomId, guess });
      }
    },
    
    useAbility: (ability) => {
      const { socket, roomId } = get();
      if (socket && roomId) {
        socket.emit('use_ability', { roomId, ability });
      }
    },
    
    leaveRoom: () => {
      const { socket, roomId } = get();
      if (socket && roomId) {
        socket.emit('leave_room', { roomId });
      }
      set({ roomId: null, room: null, gameStatus: null, currentTrack: null, viewingLobby: false, chatMessages: [] });
    },
    
    setError: (error: string) => set({ error }),
    clearError: () => set({ error: null }),

    trackPlaying: () => {
      const { socket, roomId } = get();
      if (socket && roomId) {
        socket.emit('track_playing', { roomId });
      }
    },
    likeTrack: (track: LikedTrack) => set((state) => ({
      likedTracks: state.likedTracks.find(t => t.id === track.id) 
        ? state.likedTracks 
        : [...state.likedTracks, track]
    })),
    unlikeTrack: (trackId: string) => set((state) => ({
      likedTracks: state.likedTracks.filter(t => t.id !== trackId)
    })),
    sendChatMessage: (message: string) => {
      const { socket, roomId } = get();
      if (socket && roomId) {
        socket.emit('chat_message', { roomId, message });
      }
    },
    toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
    setChatOpen: (isOpen: boolean) => set({ isChatOpen: isOpen })
  }
}));
