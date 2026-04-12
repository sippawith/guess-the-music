import fs from 'fs';
const html = fs.readFileSync('playlist_main.html', 'utf-8');
const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
if (scriptTags) {
  scriptTags.forEach((tag, i) => {
    console.log(`Script ${i}: ${tag.length} chars`);
    if (tag.includes('Spotify')) {
      console.log(`Script ${i} contains Spotify`);
    }
  });
}
