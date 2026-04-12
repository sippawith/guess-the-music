import axios from 'axios';

async function test() {
  const playlistId = '76ydlTl00klx55ONdgbCNV';
  const embedRes = await axios.get(`https://open.spotify.com/embed/playlist/${playlistId}`);
  const match = embedRes.data.match(/"accessToken":"([^"]+)"/);
  const token = match[1];
  
  const tokenRes = await axios.post('https://clienttoken.spotify.com/v1/clienttoken', {
    client_data: { client_version: "1.2.88.250.gd8cceb8f", client_id: "d8a5ed958d274c2e8ee717e6a4b0971d", js_sdk_data: { device_brand: "unknown", device_model: "unknown", os: "windows", os_version: "NT 10.0", device_id: "unknown", device_type: "computer" } }
  }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } });
  const clientToken = tokenRes.data.granted_token.token;
  
  const hash = '32b05e92e438438408674f95d0fdad8082865dc32acd55bd97f5113b8579092b';
  const variables = encodeURIComponent(JSON.stringify({ uri: `spotify:playlist:${playlistId}`, offset: 0, limit: 10, enableWatchFeedEntrypoint: false, enableSmartRecommendations: false }));
  const extensions = encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }));
  
  const url = `https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables=${variables}&extensions=${extensions}`;
  const res = await axios.get(url, { headers: { 'Client-Token': clientToken, 'Authorization': `Bearer ${token}` } });
  
  const items = res.data.data.playlistV2.content.items;
  for (const item of items) {
    const t = item.itemV2.data;
    console.log(t.name, "-", t.artists.items[0].profile.name);
  }
}

test();
