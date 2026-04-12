import axios from 'axios';

async function testItunes() {
  const tracks = [
    { name: "รักนิดๆ", artist: "ฟรุ๊ตตี้" },
    { name: "ด้วยรักและผูกพัน", artist: "Bird Thongchai" },
    { name: "Time Waits For No One", artist: "Freddie Mercury" },
    { name: "No Time", artist: "The Guess Who" },
    { name: "Until I Found You", artist: "Stephen Sanchez" },
    { name: "เธอหมุนรอบฉัน ฉันหมุนรอบเธอ", artist: "วัชระ ปานเอี่ยม" }
  ];
  
  for (const t of tracks) {
    try {
      const query = `${t.name} ${t.artist}`;
      const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
      const result = res.data.results[0];
      if (result) {
        console.log(`${t.name} - ${t.artist}: FOUND (${result.previewUrl})`);
      } else {
        console.log(`${t.name} - ${t.artist}: NOT FOUND`);
      }
    } catch (e: any) {
      console.log(`${t.name} - ${t.artist}: ERROR ${e.message}`);
    }
  }
}

testItunes();
