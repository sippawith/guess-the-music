import axios from "axios";
import { readFileSync } from "fs";
import path from "path";
import { Track } from "./types";
import { shuffleArray } from "./utils";

let landmarksData: any[] | null = null;

export function loadLandmarks(): any[] {
  if (landmarksData) return landmarksData;
  try {
    const raw = readFileSync(path.join(process.cwd(), 'src', 'data', 'landmarks.json'), 'utf-8');
    landmarksData = JSON.parse(raw);
    console.log(`[Landmarks] Loaded ${landmarksData!.length} landmarks`);
    return landmarksData!;
  } catch (error) {
    console.error('[Landmarks] Failed to load landmarks.json:', error);
    return [];
  }
}

export async function fetchLandmarkImage(name: string): Promise<string> {
  try {
    const res = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
      { headers: { 'User-Agent': 'GuessTheMusic/1.0' }, timeout: 5000 }
    );
    return res.data.originalimage?.source || res.data.thumbnail?.source || '';
  } catch (error: any) {
    console.error(`[Landmarks] Failed to fetch image for: ${name}`, error.message);
  }
  return '';
}

export async function prepareLandmarkTracks(region: string): Promise<Track[]> {
  const landmarks = loadLandmarks();
  
  // Filter by region ('Global' selects from all)
  const filtered = region === 'Global'
    ? landmarks
    : landmarks.filter((l: any) => l.region === region);
  
  if (filtered.length === 0) return [];
  
  // Take a larger buffer to account for image fetch failures
  const shuffled = shuffleArray(filtered);
  const buffer = shuffled.slice(0, Math.min(shuffled.length, 40));
  
  console.log(`[Landmarks] Fetching images for ${buffer.length} landmarks (region: ${region})`);
  
  // Fetch images in parallel
  const tracksWithImages = await Promise.all(buffer.map(async (l: any) => {
    const imageUrl = await fetchLandmarkImage(l.name);
    return {
      id: `landmark-${l.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: l.name,
      artist: l.country,
      previewUrl: '',
      albumArt: '',
      imageUrl
    };
  }));
  
  const validTracks = tracksWithImages.filter(t => t.imageUrl);
  console.log(`[Landmarks] Got ${validTracks.length} landmarks with valid images`);
  return validTracks;
}
