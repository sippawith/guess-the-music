import axios from 'axios';

let spotifyAccessToken = '';
let spotifyTokenExpiry = 0;

export async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn('Spotify credentials not configured. Spotify features will be disabled.');
    return null;
  }

  if (Date.now() < spotifyTokenExpiry && spotifyAccessToken) {
    return spotifyAccessToken;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    spotifyAccessToken = response.data.access_token;
    spotifyTokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000;
    return spotifyAccessToken;
  } catch (error) {
    console.error('Error fetching Spotify token:', error);
    return null;
  }
}

export async function getItunesPreview(trackName: string, artistName: string) {
  try {
    const cleanTrackName = trackName.split(' - ')[0].replace(/\[.*?\]|\(.*?\)/g, '').trim();
    const query = `${cleanTrackName} ${artistName}`;
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        preview: result.previewUrl,
        albumArt: result.artworkUrl100?.replace('100x100bb', '600x600bb') || ''
      };
    }
  } catch (error: any) {
    console.error('iTunes search error:', error.response?.status || error.message);
  }
  return null;
}

export async function scrapeSpotifyPlaylist(playlistId: string) {
  try {
    const embedRes = await axios.get(`https://open.spotify.com/embed/playlist/${playlistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const match = embedRes.data.match(/"accessToken":"([^"]+)"/);
    if (!match) {
      console.log('No access token found in embed');
      return null;
    }
    const token = match[1];

    const tokenRes = await axios.post('https://clienttoken.spotify.com/v1/clienttoken', {
      client_data: {
        client_version: '1.2.88.250.gd8cceb8f',
        client_id: 'd8a5ed958d274c2e8ee717e6a4b0971d',
        js_sdk_data: {
          device_brand: 'unknown',
          device_model: 'unknown',
          os: 'windows',
          os_version: 'NT 10.0',
          device_id: 'unknown',
          device_type: 'computer'
        }
      }
    }, {
      headers: {
        Accept: 'application/json',
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
        offset,
        limit,
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
          Authorization: `Bearer ${token}`
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
            artist: trackData.artists?.items?.[0]?.profile?.name || 'Unknown Artist',
            previewUrl: '',
            albumArt: trackData.albumOfTrack?.coverArt?.sources?.[0]?.url || ''
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
    console.error('Error scraping Spotify playlist via Pathfinder:', error);
  }
  return null;
}

export async function scrapeAppleMusicPlaylist(playlistUrl: string) {
  try {
    const res = await axios.get(playlistUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = res.data;

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      const data = JSON.parse(jsonLdMatch[1]);
      const root = Array.isArray(data) ? data.find(d => d['@type'] === 'MusicPlaylist') : data;

      if (root && root.track) {
        const tracks = Array.isArray(root.track) ? root.track : [root.track];
        return tracks.map((t: any, index: number) => {
          const item = t.item || t;
          return {
            id: item.url?.split('/').pop() || `am-${index}`,
            name: item.name,
            artist: item.byArtist?.name || 'Unknown Artist',
            previewUrl: '',
            albumArt: item.image || ''
          };
        });
      }
    }
  } catch (error) {
    console.error('Error scraping Apple Music:', error);
  }
  return null;
}
