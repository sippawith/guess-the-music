import axios from 'axios';

async function testDeezer() {
  const response = await axios.get(`https://api.deezer.com/search?q=eminem`);
  console.log(response.data.data?.length);
}

testDeezer();
