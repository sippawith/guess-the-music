import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testTracks() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" } }
  );
  
  const token = tokenRes.data.access_token;
  
  // IDs from the playlist
  const ids = ['3l9u6a1jn2naA3xYyT0WGe', '6hTcuIQa0sxrrByu9wTD7s'];
  
  try {
    const res = await axios.get(`https://api.spotify.com/v1/tracks?ids=${ids.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    for (const t of res.data.tracks) {
      console.log(t.name, "Preview:", !!t.preview_url);
    }
  } catch (e: any) {
    console.log("Error:", e.response?.data || e.message);
  }
}

testTracks();
