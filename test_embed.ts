import axios from 'axios';
import fs from 'fs';

async function testEmbed() {
  try {
    const res = await axios.get('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
    fs.writeFileSync('embed.html', res.data);
    console.log("Saved embed.html");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

testEmbed();
