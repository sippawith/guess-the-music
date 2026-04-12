import axios from 'axios';

async function testTokenWithCookies() {
  try {
    const initialRes = await axios.get('https://open.spotify.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    
    const cookies = initialRes.headers['set-cookie'];
    console.log("Got cookies:", cookies ? cookies.length : 0);
    
    const cookieStr = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
    
    const res = await axios.get('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Cookie': cookieStr
      }
    });
    console.log("Token:", res.data);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

testTokenWithCookies();
