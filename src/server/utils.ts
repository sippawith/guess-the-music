export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Selects tracks by spreading the selection across the entire list.
 * This ensures we get songs from the beginning, middle, and end of the playlist.
 */
export function selectTracksWithSpread(tracks: any[], count: number): any[] {
  if (tracks.length <= count) return shuffleArray(tracks);
  
  const selected: any[] = [];
  const step = tracks.length / count;
  
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    const bucket = tracks.slice(start, end);
    if (bucket.length > 0) {
      const randomIndex = Math.floor(Math.random() * bucket.length);
      selected.push(bucket[randomIndex]);
    }
  }
  
  return shuffleArray(selected);
}
