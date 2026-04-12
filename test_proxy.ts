import axios from 'axios';

async function testProxy() {
  try {
    // Get token via proxy
    const tokenUrl = 'https://open.spotify.com/get_access_token?reason=transport&productType=web_player';
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(tokenUrl)}`;
    
    const tokenRes = await axios.get(proxyUrl);
    const tokenData = JSON.parse(tokenRes.data.contents);
    console.log("Token:", tokenData.accessToken.substring(0, 20) + "...");
    
    const token = tokenData.accessToken;
    
    // Now try to fetch tracks via proxy
    const playlistId = '37i9dQZF1DXcBWIGoYBM5M';
    const tracksUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
    const tracksProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(tracksUrl)}`;
    
    const tracksRes = await axios.get(tracksProxyUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // allorigins doesn't pass headers easily.
    console.log("We need a proxy that passes headers.");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

testProxy();
