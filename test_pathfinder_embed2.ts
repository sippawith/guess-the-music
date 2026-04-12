import axios from 'axios';

async function testPathfinderEmbed2() {
  try {
    const embedRes = await axios.get('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
    const match = embedRes.data.match(/"accessToken":"([^"]+)"/);
    if (!match) return;
    const token = match[1];
    
    const tokenRes = await axios.post('https://clienttoken.spotify.com/v1/clienttoken', {
      client_data: {
        client_version: "1.2.88.250.gd8cceb8f",
        client_id: "d8a5ed958d274c2e8ee717e6a4b0971d",
        js_sdk_data: {
          device_brand: "unknown",
          device_model: "unknown",
          os: "windows",
          os_version: "NT 10.0",
          device_id: "unknown",
          device_type: "computer"
        }
      }
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const clientToken = tokenRes.data.granted_token.token;
    
    // A big playlist: 37i9dQZF1DWXRqgorJj26U (Rock Classics)
    const playlistId = '37i9dQZF1DWXRqgorJj26U';
    const hash = '32b05e92e438438408674f95d0fdad8082865dc32acd55bd97f5113b8579092b';
    
    const variables = encodeURIComponent(JSON.stringify({
      uri: `spotify:playlist:${playlistId}`,
      offset: 0,
      limit: 100,
      enableWatchFeedEntrypoint: false,
      enableSmartRecommendations: false
    }));
    const extensions = encodeURIComponent(JSON.stringify({
      persistedQuery: {
        version: 1,
        sha256Hash: hash
      }
    }));
    
    const url = `https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables=${variables}&extensions=${extensions}`;
    
    const res = await axios.get(url, {
      headers: {
        'Client-Token': clientToken,
        'Authorization': `Bearer ${token}`
      }
    });
    console.log("Success offset 0!");
    console.log(res.data.data.playlistV2.content.items.length);
    console.log(JSON.stringify(res.data.data.playlistV2.content.items[0], null, 2));
    
    // Try offset 100
    const variables2 = encodeURIComponent(JSON.stringify({
      uri: `spotify:playlist:${playlistId}`,
      offset: 100,
      limit: 100,
      enableWatchFeedEntrypoint: false,
      enableSmartRecommendations: false
    }));
    const url2 = `https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables=${variables2}&extensions=${extensions}`;
    const res2 = await axios.get(url2, {
      headers: {
        'Client-Token': clientToken,
        'Authorization': `Bearer ${token}`
      }
    });
    console.log("Success offset 100!");
    console.log(res2.data.data.playlistV2.content.items.length);

  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(JSON.stringify(e.response.data, null, 2));
  }
}

testPathfinderEmbed2();
