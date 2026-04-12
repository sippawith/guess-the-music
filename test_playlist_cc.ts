import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testPlaylist() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" } }
  );
  
  const token = tokenRes.data.access_token;
  const playlistId = '76ydlTl00klx55ONdgbCNV';
  
  try {
    const res = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Success! Tracks:", res.data.total);
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

testPlaylist();
