import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testClientCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  console.log("Client ID exists:", !!clientId);
  console.log("Client Secret exists:", !!clientSecret);
  
  if (!clientId || !clientSecret) {
    console.log("Missing credentials");
    return;
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    
    console.log("Got token:", response.data.access_token.substring(0, 10) + "...");
    
    // Try fetching a playlist
    const playlistId = '37i9dQZF1DXcBWIGoYBM5M';
    const tracksRes = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
      headers: { Authorization: `Bearer ${response.data.access_token}` }
    });
    console.log("Tracks fetched:", tracksRes.data.items.length);
    console.log("Total tracks:", tracksRes.data.total);
    
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

testClientCredentials();
