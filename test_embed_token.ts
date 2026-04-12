import axios from 'axios';
import fs from 'fs';

async function testEmbedToken() {
  try {
    const res = await axios.get('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
    const match = res.data.match(/"accessToken":"([^"]+)"/);
    if (!match) {
      console.log("No token found");
      return;
    }
    const token = match[1];
    console.log("Got token:", token.substring(0, 20) + "...");
    
    // Try to fetch tracks
    const playlistId = '37i9dQZF1DXcBWIGoYBM5M';
    const tracksRes = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&offset=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Tracks fetched:", tracksRes.data.items.length);
    console.log("Total tracks:", tracksRes.data.total);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

testEmbedToken();
