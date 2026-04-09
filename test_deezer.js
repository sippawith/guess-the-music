const axios = require('axios');
async function test() {
  try {
    const res = await axios.get("https://api.deezer.com/search/playlist?q=top hits");
    console.log("Playlists:", res.data.data.length);
    if (res.data.data.length > 0) {
      const playlistId = res.data.data[0].id;
      console.log("Playlist ID:", playlistId);
      const tracksRes = await axios.get(`https://api.deezer.com/playlist/${playlistId}/tracks`);
      console.log("Tracks:", tracksRes.data.data.length);
      console.log("First track:", tracksRes.data.data[0].title, tracksRes.data.data[0].preview);
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
