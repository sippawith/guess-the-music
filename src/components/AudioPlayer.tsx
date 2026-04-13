import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { Volume2 } from 'lucide-react';

export function AudioPlayer() {
  const { currentTrack, room, actions } = useGameStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      // Clear any pending stop timeout
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }

      // Only change source if it's a new track
      if (currentTrack.previewUrl && audioRef.current.src !== currentTrack.previewUrl) {
        audioRef.current.src = currentTrack.previewUrl;
        audioRef.current.volume = 0.5;
        audioRef.current.loop = false; // Reset loop for normal tracks
        audioRef.current.play().then(() => {
          setIsBlocked(false);
        }).catch(e => {
          console.error("Audio play failed:", e);
          setIsBlocked(true);
        });
        
        audioRef.current.onplay = () => {
          actions.trackPlaying();
        };
      } else if (!currentTrack.previewUrl) {
        // No audio for this track/category, play Kahoot-like background music
        const bgMusicUrl = "https://upload.wikimedia.org/wikipedia/commons/3/34/Kevin_MacLeod_-_Monkeys_Spinning_Monkeys.ogg";
        if (audioRef.current) {
          if (!audioRef.current.src.includes("Monkeys_Spinning_Monkeys")) {
            audioRef.current.src = bgMusicUrl;
            audioRef.current.volume = 0.3; // Lower volume for background
            audioRef.current.loop = true;
            audioRef.current.play().then(() => {
              setIsBlocked(false);
            }).catch(e => {
              console.error("Audio play failed:", e);
              setIsBlocked(true);
            });
          } else if (audioRef.current.paused) {
            // If it's already the right source but paused, play it
            audioRef.current.play().catch(e => {
              console.error("Audio play failed:", e);
              setIsBlocked(true);
            });
          }
        }
        setIsBlocked(false);
        // We don't call trackPlaying here for non-music categories; 
        // Game.tsx will handle it when the image actually loads to ensure synchronization.
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
