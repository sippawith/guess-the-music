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
      if (audioRef.current.src !== currentTrack.previewUrl) {
        audioRef.current.src = currentTrack.previewUrl;
        audioRef.current.volume = 0.5;
        audioRef.current.play().then(() => {
          setIsBlocked(false);
        }).catch(e => {
          console.error("Audio play failed:", e);
          setIsBlocked(true);
        });
        
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

  const handleUnblock = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsBlocked(false);
      }).catch(e => console.error("Unblock failed:", e));
    }
  };

  if (isBlocked && room?.state === 'PLAYING') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl">
        <div className="text-center space-y-6 max-w-xs px-6">
          <div className="w-20 h-20 bg-[#1DB954]/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Volume2 className="text-[#1DB954]" size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Audio Blocked</h3>
            <p className="text-sm text-white/60">Mobile browsers require a tap to enable game audio.</p>
          </div>
          <button 
            onClick={handleUnblock}
            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(29,185,84,0.3)]"
          >
            ENABLE AUDIO
          </button>
        </div>
      </div>
    );
  }

  return <audio ref={audioRef} />;
}
