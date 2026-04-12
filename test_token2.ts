import axios from 'axios';

async function testToken() {
  try {
    const res = await axios.get('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'app-platform': 'WebPlayer',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'spotify-app-version': '1.2.88.250.gd8cceb8f'
      }
    });
    console.log(res.data);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

testToken();
