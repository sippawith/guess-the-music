import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://open.spotify.com/embed/playlist/76ydlTl00klx55ONdgbCNV?si=3c9');
    const match = res.data.match(/"accessToken":"([^"]+)"/);
    console.log("Match:", !!match);
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

test();
