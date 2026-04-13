import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { Volume2 } from 'lucide-react';

export function AudioPlayer() {
  const { currentTrack, room, isTimerStarted, actions } = useGameStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  // Handle loading and signaling readiness
  useEffect(() => {
    let fallbackTimeout: NodeJS.Timeout;
    
    if (currentTrack && audioRef.current) {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }

      const currentSrc = audioRef.current.src;
      const newSrc = currentTrack.previewUrl;

      if (newSrc && !currentSrc.endsWith(newSrc)) {
        audioRef.current.src = newSrc;
        audioRef.current.volume = 0.5;
        audioRef.current.loop = false;
        
        // Signal ready when enough audio is buffered
        audioRef.current.oncanplaythrough = () => {
          actions.trackPlaying();
        };
        
        // Fallback in case oncanplaythrough doesn't fire
        fallbackTimeout = setTimeout(() => {
          actions.trackPlaying();
        }, 8000);
      } else if (newSrc && currentSrc.endsWith(newSrc)) {
        // Already loaded, signal immediately
        actions.trackPlaying();
      } else if (!newSrc) {
        const bgMusicUrl = "https://archive.org/download/KahootLobbyMusic/Kahoot%20Lobby%20Music%20%28HD%29.mp3";
        if (!audioRef.current.src.includes("Kahoot")) {
          audioRef.current.src = bgMusicUrl;
          audioRef.current.volume = 0.3;
          audioRef.current.loop = true;
        }
        // For non-music, Game.tsx handles signaling when image loads
      }
    }
    
    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [currentTrack, actions]);

  // Handle actual playback when timer starts
  useEffect(() => {
    if (isTimerStarted && audioRef.current && currentTrack) {
      audioRef.current.play().then(() => {
        setIsBlocked(false);
      }).catch(e => {
        console.error("Audio play failed:", e);
        setIsBlocked(true);
      });
    } else if (!isTimerStarted && room?.state === 'PLAYING') {
      // Pause audio during countdown or before timer starts
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isTimerStarted, currentTrack, room?.state]);

  // Handle stopping audio
  useEffect(() => {
    if ((!room || room.state === 'LOBBY') && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
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

  const handleUnblock = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsBlocked(false);
      }).catch(e => console.error("Unblock failed:", e));
    }
  };

  return (
    <>
      <audio ref={audioRef} />
      {isBlocked && (
        <button
          onClick={handleUnblock}
          className="fixed bottom-4 right-4 z-[100] bg-[#1DB954] text-black p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
          title="Enable Audio"
        >
          <Volume2 size={24} />
        </button>
      )}
    </>
  );
}
