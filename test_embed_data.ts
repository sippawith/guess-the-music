import fs from 'fs';

const html = fs.readFileSync('embed2.html', 'utf-8');
const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
if (match) {
  const data = JSON.parse(match[1]);
  console.log("Status:", data.props.pageProps.status);
  console.log("Title:", data.props.pageProps.title);
}
