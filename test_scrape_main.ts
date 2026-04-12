import axios from 'axios';
import fs from 'fs';

async function testScrapeMain() {
  try {
    const playlistId = '37i9dQZF1DXcBWIGoYBM5M'; // Today's Top Hits
    const res = await axios.get(`https://open.spotify.com/playlist/${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    });
    
    fs.writeFileSync('playlist_main.html', res.data);
    console.log("Saved to playlist_main.html");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

testScrapeMain();
