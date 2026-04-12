import axios from 'axios';

async function testEmbedToken2() {
  try {
    const res = await axios.get('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
    const match = res.data.match(/"accessToken":"([^"]+)"/);
    if (!match) return;
    const token = match[1];
    
    const playlistId = '37i9dQZF1DXcBWIGoYBM5M';
    const tracksRes = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&offset=0`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Tracks fetched:", tracksRes.data.items.length);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

testEmbedToken2();
