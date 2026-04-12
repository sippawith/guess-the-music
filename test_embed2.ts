import axios from 'axios';
import fs from 'fs';

async function checkEmbed() {
  const html = fs.readFileSync('embed.html', 'utf-8');
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (match) {
    const data = JSON.parse(match[1]);
    const entity = data.props.pageProps.state.data.entity;
    console.log("Total tracks in embed:", entity.trackList.length);
    console.log("Has more?", entity.hasMore);
  }
}

checkEmbed();
