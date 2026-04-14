export interface Player {
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

export interface Track {
  id: string;
  name: string;
  artist: string;
  previewUrl: string;
  albumArt: string;
  startTime?: number;
  imageUrl?: string;
  description?: string;
  category?: "MUSIC" | "MOVIE" | "CARTOON" | "LANDMARK";
}

export interface Room {
  id: string;
  players: Record<string, Player>;
  state: "LOBBY" | "PLAYING" | "ROUND_END" | "GAME_END";
  categories: ("MUSIC" | "MOVIE" | "CARTOON" | "LANDMARK")[];
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
