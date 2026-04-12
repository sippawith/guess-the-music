import axios from 'axios';
import fs from 'fs';

async function testEmbed() {
  try {
    const res = await axios.get('https://open.spotify.com/embed/playlist/76ydlTlOOklx55ONdgbCNV');
    fs.writeFileSync('embed2.html', res.data);
    console.log("Saved embed2.html");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

testEmbed();
