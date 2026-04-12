import axios from 'axios';

async function test() {
  const ids = [
    '76ydlTlOOklx55ONdgbCNV',
    '76ydITI0Oklx55ONdgbCNV',
    '76ydlTl0Oklx55ONdgbCNV',
    '76ydlTI0Oklx55ONdgbCNV',
    '76ydlTIOOklx55ONdgbCNV',
    '76ydITl0Oklx55ONdgbCNV',
    '76ydITlOOklx55ONdgbCNV',
    '76ydlTl00klx55ONdgbCNV'
  ];
  
  for (const id of ids) {
    try {
      const res = await axios.get(`https://open.spotify.com/playlist/${id}`);
      console.log(`ID ${id}: Success!`);
    } catch (e: any) {
      console.log(`ID ${id}: Error ${e.response?.status}`);
    }
  }
}

test();
