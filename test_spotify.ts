import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await axios.post("https://accounts.spotify.com/api/token", "grant_type=client_credentials", {
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }
  });
  const token = tokenRes.data.access_token;
  try {
    const query = `Blinding Lights The Weeknd`;
    const res = await axios.get(`https://api.deezer.com/search/track?q=${encodeURIComponent(query)}`);
    console.log("Deezer:", JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.log("Error:", e.response ? e.response.data : e.message);
  }
}
test();
