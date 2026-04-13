import axios from "axios";

export async function scrapeAppleMusicPlaylist(playlistUrl: string) {
  try {
    const res = await axios.get(playlistUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = res.data;
    
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      const data = JSON.parse(jsonLdMatch[1]);
      const root = Array.isArray(data) ? data.find(d => d["@type"] === "MusicPlaylist") : data;
      
      if (root && root.track) {
        const tracks = Array.isArray(root.track) ? root.track : [root.track];
        return tracks.map((t: any, index: number) => {
          const item = t.item || t;
          return {
            id: item.url?.split('/').pop() || `am-${index}`,
            name: item.name,
            artist: item.byArtist?.name || "Unknown Artist",
            previewUrl: "",
            albumArt: item.image || ""
          };
        });
      }
    }
  } catch (error) {
    console.error("Error scraping Apple Music:", error);
  }
  return null;
}
