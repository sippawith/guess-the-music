import axios from 'axios';
async function test() {
  try {
    const playlistId = 3155776842;
    const res = await axios.get(`https://api.deezer.com/playlist/${playlistId}`);
    console.log("Playlist:", res.data.title, res.data.picture_medium);
    console.log("Tracks:", res.data.tracks.data.length);
    console.log("First track:", res.data.tracks.data[0].title, res.data.tracks.data[0].artist.name, res.data.tracks.data[0].album.cover_medium);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
