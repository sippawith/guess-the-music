import axios from 'axios';
import fs from 'fs';

async function findHash() {
  const html = fs.readFileSync('playlist_main.html', 'utf-8');
  const jsUrls = html.match(/https:\/\/open\.spotifycdn\.com\/cdn\/build\/web-player\/[^"']+\.js/g);
  
  if (!jsUrls) return;
  
  for (const url of jsUrls) {
    console.log("Fetching", url);
    try {
      const res = await axios.get(url);
      const content = res.data;
      if (content.includes('fetchPlaylist')) {
        console.log("Found fetchPlaylist in", url);
        // Try to extract the hash
        // Usually it looks like {queryId:"...",operationName:"fetchPlaylist"}
        const match = content.match(/queryId:"([a-f0-9]{64})",operationName:"fetchPlaylist"/);
        if (match) {
          console.log("Hash:", match[1]);
        } else {
          // Maybe it's nearby
          const idx = content.indexOf('fetchPlaylist');
          console.log(content.substring(Math.max(0, idx - 100), idx + 100));
        }
      }
    } catch (e) {}
  }
}

findHash();
