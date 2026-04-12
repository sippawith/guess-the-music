import axios from 'axios';

async function getDeezerPreview(trackName: string, artistName: string) {
  try {
    const query = `track:"${trackName}" artist:"${artistName}"`;
    const response = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
    if (response.data.data && response.data.data.length > 0) {
      return {
        preview: response.data.data[0].preview,
        albumArt: response.data.data[0].album?.cover_xl || response.data.data[0].album?.cover_medium || ""
      };
    }
    // Fallback to general search if specific search fails
    const fallbackResponse = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(`${trackName} ${artistName}`)}`);
    if (fallbackResponse.data.data && fallbackResponse.data.data.length > 0) {
      return {
        preview: fallbackResponse.data.data[0].preview,
        albumArt: fallbackResponse.data.data[0].album?.cover_xl || fallbackResponse.data.data[0].album?.cover_medium || ""
      };
    }
  } catch (error: any) {
    console.error("Deezer error:", error.message);
  }
  return null;
}

getDeezerPreview("ร้าย", "Various Artists").then(res => console.log(res));
