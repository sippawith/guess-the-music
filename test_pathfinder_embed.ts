import axios from 'axios';

async function testPathfinderEmbed() {
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
    
    const playlistId = '37i9dQZF1DXcBWIGoYBM5M';
    const hash = '32b05e92e438438408674f95d0fdad8082865dc32acd55bd97f5113b8579092b';
    
    const res = await axios.get(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables={"uri":"spotify:playlist:${playlistId}","offset":100,"limit":100}&extensions={"persistedQuery":{"version":1,"sha256Hash":"${hash}"}}`, {
      headers: {
        'Client-Token': clientToken,
        'Authorization': `Bearer ${token}`
      }
    });
    console.log("Success!");
    console.log(res.data.data.playlistV2.content.items.length);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

testPathfinderEmbed();
