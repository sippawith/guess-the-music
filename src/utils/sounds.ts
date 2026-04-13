// Centralized sound effect management
export const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  pop: 'https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3',
  hover: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
  correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Ding
  wrong: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',   // Buzzer
  ability: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', // Powerup
  // Better sharp beep for countdown
  countdown: 'https://assets.mixkit.co/active_storage/sfx/1103/1103-preview.mp3', 
  
  // High quality background tracks (Music, not SFX)
  bgmPop: 'https://assets.mixkit.co/music/preview/mixkit-game-show-fun-3058.mp3', 
  bgmSuspense: 'https://assets.mixkit.co/music/preview/mixkit-quiz-show-thinking-628.mp3', 
  bgmUpbeat: 'https://assets.mixkit.co/music/preview/mixkit-glitchy-game-show-3054.mp3'
};

const audioPool: Record<string, HTMLAudioElement[]> = {};
let lastHoverTime = 0;
const HOVER_THROTTLE_MS = 150;

export const playSound = (soundName: keyof typeof SOUNDS, volume: number = 0.4) => {
  // Throttle hover sounds to avoid "machine gun" effect
  if (soundName === 'hover') {
    const now = Date.now();
    if (now - lastHoverTime < HOVER_THROTTLE_MS) return;
    lastHoverTime = now;
  }

  try {
    const url = SOUNDS[soundName];
    if (!audioPool[soundName]) audioPool[soundName] = [];
    
    // Find next available audio element or create new one (up to 5 concurrent)
    let audio = audioPool[soundName].find(a => a.paused || a.ended);
    if (!audio) {
      if (audioPool[soundName].length < 5) {
        audio = new Audio(url);
        audioPool[soundName].push(audio);
      } else {
        // Reuse oldest if max reached
        audio = audioPool[soundName][0];
        audioPool[soundName].push(audioPool[soundName].shift()!);
      }
    }
    
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

let currentBGM: HTMLAudioElement | null = null;

export const playBackgroundMusic = (volume: number = 0.2) => {
  stopBackgroundMusic();
  
  const tracks = ['bgmPop', 'bgmSuspense', 'bgmUpbeat'] as const;
  const selectedTrack = tracks[Math.floor(Math.random() * tracks.length)];
  
  currentBGM = new Audio(SOUNDS[selectedTrack]);
  currentBGM.loop = true;
  currentBGM.volume = volume;
  currentBGM.play().catch(() => {});
};

export const stopBackgroundMusic = () => {
  if (currentBGM) {
    currentBGM.pause();
    currentBGM.currentTime = 0;
    currentBGM = null;
  }
};
