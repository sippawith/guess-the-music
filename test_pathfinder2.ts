import axios from 'axios';

async function testPathfinder() {
  try {
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
    console.log("Got client token");

    const playlistId = '37i9dQZF1DXcBWIGoYBM5M';
    const hash = '32b05e92e438438408674f95d0fdad8082865dc32acd55bd97f5113b8579092b';
    
    // We also need an anonymous Bearer token.
    // Let's try to get one from https://open.spotify.com/get_access_token?reason=transport&productType=web_player
    // Wait, that returned 403.
    // What if we just use the client token?
    
    const res = await axios.get(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables={"uri":"spotify:playlist:${playlistId}","offset":0,"limit":100}&extensions={"persistedQuery":{"version":1,"sha256Hash":"${hash}"}}`, {
      headers: {
        'Client-Token': clientToken,
        // Do we need authorization?
      }
    });
    console.log("Success!");
    console.log(res.data.data.playlistV2.content.items.length);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

testPathfinder();
