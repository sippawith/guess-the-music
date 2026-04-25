import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { Volume2 } from 'lucide-react';

export function AudioPlayer() {
  const { currentTrack, room, actions, isTimerStarted } = useGameStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Handle loading the audio source and notifying readiness
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      // Clear any pending stop timeout
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }

      if (currentTrack.previewUrl) {
        if (audioRef.current.src !== currentTrack.previewUrl) {
          audioRef.current.src = currentTrack.previewUrl;
          audioRef.current.volume = 0.5;
          audioRef.current.loop = false;
          audioRef.current.load();

          audioRef.current.oncanplaythrough = () => {
            actions.trackReady();
            if (audioRef.current) audioRef.current.oncanplaythrough = null;
          };

          // Fallback if canplaythrough doesn't fire
          setTimeout(() => {
            if (audioRef.current?.oncanplaythrough) {
              actions.trackReady();
              audioRef.current.oncanplaythrough = null;
            }
          }, 8000);
        }
      } else {
        // Non-music category background music
        const bgMusicUrl = "https://archive.org/download/KahootLobbyMusic/Kahoot%20Lobby%20Music%20%28HD%29.mp3";
        if (!audioRef.current.src.includes("Kahoot")) {
          audioRef.current.src = bgMusicUrl;
          audioRef.current.volume = 0.3;
          audioRef.current.loop = true;
          audioRef.current.load();
        }
        // We don't call trackReady here; Game.tsx handles it when the image loads.
      }
    }

    // Handle stopping audio when leaving the room or returning to lobby
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
  }, [currentTrack, room?.state, room?.currentTrackIndex, room?.tracks?.length, actions]);

  // 2. Handle actually playing the audio when the timer starts
  useEffect(() => {
    if (isTimerStarted && audioRef.current && currentTrack) {
      audioRef.current.play().catch(e => {
        if (e.name !== 'AbortError') {
          console.warn("Audio auto-play blocked by browser, will play once user interacts.", e);
        }
      });
    }
  }, [isTimerStarted, currentTrack]);

  return (
    <audio id="main-audio" ref={audioRef} playsInline />
  );
}
