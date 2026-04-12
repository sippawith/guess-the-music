import axios from 'axios';

async function testDeezer() {
  try {
    const response = await axios.get(`https://api.deezer.com/search?q=Stephen Sanchez`);
    console.log("Stephen Sanchez:", response.data.data?.length);
    if (response.data.data?.length > 0) {
      console.log(response.data.data[0].title, "-", response.data.data[0].artist.name);
    }
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

testDeezer();
