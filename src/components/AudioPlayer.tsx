import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store';

export function AudioPlayer() {
  const { currentTrack, room, actions } = useGameStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      // Clear any pending stop timeout
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }

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

    // Handle stopping the song after final round
    if (room?.state === 'ROUND_END' && room.currentTrackIndex === room.tracks.length - 1) {
      stopTimeoutRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      }, 5000); // Stop after 5 seconds on final round
    }

    if (room?.state === 'GAME_END') {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    };
  }, [currentTrack, room?.state, room?.currentTrackIndex, room?.tracks.length, actions]);

  return <audio ref={audioRef} />;
}
