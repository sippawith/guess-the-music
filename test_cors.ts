import axios from 'axios';

async function testCors() {
  try {
    const res = await axios.options('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    });
    console.log(res.headers);
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

testCors();
