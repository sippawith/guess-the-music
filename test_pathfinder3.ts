import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testPathfinder3() {
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
    
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const ccRes = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const ccToken = ccRes.data.access_token;

    const playlistId = '37i9dQZF1DXcBWIGoYBM5M';
    const hash = '32b05e92e438438408674f95d0fdad8082865dc32acd55bd97f5113b8579092b';
    
    const res = await axios.get(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables={"uri":"spotify:playlist:${playlistId}","offset":0,"limit":100}&extensions={"persistedQuery":{"version":1,"sha256Hash":"${hash}"}}`, {
      headers: {
        'Client-Token': clientToken,
        'Authorization': `Bearer ${ccToken}`
      }
    });
    console.log("Success!");
    console.log(res.data.data.playlistV2.content.items.length);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

testPathfinder3();
