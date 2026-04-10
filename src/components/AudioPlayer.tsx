import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store';

export function AudioPlayer() {
  const { currentTrack, actions } = useGameStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      // Only change source if it's a new track
      if (audioRef.current.src !== currentTrack.previewUrl) {
        audioRef.current.src = currentTrack.previewUrl;
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        
        audioRef.current.onplay = () => {
          actions.trackPlaying();
        };
      }
    }
  }, [currentTrack, actions]);

  return <audio ref={audioRef} />;
}
