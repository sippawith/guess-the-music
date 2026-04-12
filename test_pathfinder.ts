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

    // We also need an anonymous access token? Or does the client token work alone?
    // Let's try to get an anonymous access token again, maybe with the client token?
    // Actually, let's just try to hit the public API with the client token? No, public API takes Bearer token.
    
    const playlistId = '37i9dQZF1DXcBWIGoYBM5M';
    
    // Try api-partner
    const res = await axios.get(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables={"uri":"spotify:playlist:${playlistId}","offset":0,"limit":100}&extensions={"persistedQuery":{"version":1,"sha256Hash":"...need hash..."}}`, {
      headers: {
        'Client-Token': clientToken
      }
    });
    console.log(res.data);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

testPathfinder();
