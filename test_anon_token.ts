import axios from 'axios';

async function testAnonymousToken() {
  try {
    const res = await axios.get('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    console.log("Token response:", res.data);
    
    const token = res.data.accessToken;
    const playlistId = '37i9dQZF1DXcBWIGoYBM5M'; // Today's Top Hits
    
    const tracksRes = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Tracks fetched:", tracksRes.data.items.length);
    console.log("Total tracks:", tracksRes.data.total);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

testAnonymousToken();
