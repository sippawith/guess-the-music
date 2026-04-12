import axios from 'axios';

async function scrapeSpotifyPlaylist(playlistId: string) {
  try {
    // 1. Get embed token
    const embedRes = await axios.get(`https://open.spotify.com/embed/playlist/${playlistId}`);
    const match = embedRes.data.match(/"accessToken":"([^"]+)"/);
    if (!match) {
      console.log("No access token found in embed");
      return null;
    }
    const token = match[1];
    
    // 2. Get client token
    const tokenRes = await axios.post('https://clienttoken.spotify.com/v1/clienttoken', {
      client_data: {
        client_version: "1.2.88.250.gd8cceb8f",
        client_id: "d8a5ed958d274c2e8ee717e6a4b0971d",
        js_sdk_data: {
          device_brand: "unknown",
          device_model: "unknown",
          os: "windows",
          os_version: "NT 10.0",
          device_id: "unknown",
          device_type: "computer"
        }
      }
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const clientToken = tokenRes.data.granted_token.token;
    
    const hash = '32b05e92e438438408674f95d0fdad8082865dc32acd55bd97f5113b8579092b';
    
    let allTracks: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore && allTracks.length < 1000) {
      const variables = encodeURIComponent(JSON.stringify({
        uri: `spotify:playlist:${playlistId}`,
        offset: offset,
        limit: limit,
        enableWatchFeedEntrypoint: false,
        enableSmartRecommendations: false
      }));
      const extensions = encodeURIComponent(JSON.stringify({
        persistedQuery: {
          version: 1,
          sha256Hash: hash
        }
      }));
      
      const url = `https://api-partner.spotify.com/pathfinder/v1/query?operationName=fetchPlaylist&variables=${variables}&extensions=${extensions}`;
      
      const res = await axios.get(url, {
        headers: {
          'Client-Token': clientToken,
          'Authorization': `Bearer ${token}`
        }
      });
      
      const items = res.data?.data?.playlistV2?.content?.items;
      if (!items || items.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const item of items) {
        const trackData = item.itemV2?.data;
        if (trackData && trackData.__typename === 'Track') {
          allTracks.push({
            id: trackData.uri.split(':').pop(),
            name: trackData.name,
            artist: trackData.artists?.items?.[0]?.profile?.name || "Unknown Artist",
            previewUrl: "", // We'll rely on Deezer fallback
            albumArt: trackData.albumOfTrack?.coverArt?.sources?.[0]?.url || ""
          });
        }
      }
      
      offset += limit;
      if (items.length < limit) {
        hasMore = false;
      }
    }
    
    return allTracks;
  } catch (error) {
    console.error("Error scraping Spotify playlist via Pathfinder:", error);
  }
  return null;
}

scrapeSpotifyPlaylist('37i9dQZF1DWXRqgorJj26U').then(tracks => {
  console.log("Total tracks:", tracks?.length);
});
