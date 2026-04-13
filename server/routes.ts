import { Express } from 'express';
import axios from 'axios';
import { getSpotifyToken, scrapeAppleMusicPlaylist, scrapeSpotifyPlaylist } from './services/music.ts';

export function registerRoutes(app: Express) {
  app.get('/api/auth/url', (req, res) => {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return res.status(400).json({ error: 'Spotify credentials not configured in environment variables.' });
    }
    const redirectUri = `${process.env.APP_URL}/api/auth/callback`;
    const params = new URLSearchParams({
      client_id: process.env.SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'playlist-read-private playlist-read-collaborative user-read-private',
    });
    res.json({ url: `https://accounts.spotify.com/authorize?${params}` });
  });

  app.get(['/api/auth/callback', '/api/auth/callback/'], async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${process.env.APP_URL}/api/auth/callback`;

    try {
      const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const token = response.data.access_token;
      const appOrigin = new URL(process.env.APP_URL || 'http://localhost:3000').origin;

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '${appOrigin}');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('OAuth callback error', error.response?.data || error.message);
      res.status(500).send('Authentication failed');
    }
  });

  app.post('/api/playlist/details', async (req, res) => {
    try {
      const { playlistId, url } = req.body;

      if (url && url.includes('music.apple.com')) {
        const tracks = await scrapeAppleMusicPlaylist(url);
        if (tracks) {
          return res.json({
            id: url,
            name: 'Apple Music Playlist',
            owner: { display_name: 'Apple Music' },
            images: [{ url: tracks[0]?.albumArt || '' }],
            isApple: true
          });
        }
      }

      const userToken = req.headers.authorization?.split(' ')[1];
      const token = userToken || await getSpotifyToken();

      if (token) {
        try {
          const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          return res.json({
            id: response.data.id,
            name: response.data.name,
            owner: { display_name: response.data.owner.display_name },
            images: response.data.images
          });
        } catch (e) {
          console.error('Spotify API failed:', e);
        }
      }

      res.json({
        id: playlistId || url,
        name: 'Playlist',
        owner: { display_name: 'Unknown' },
        images: []
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      res.status(error.response?.status || 500).json({ error: errorMsg });
    }
  });

  app.post('/api/playlist/tracks', async (req, res) => {
    try {
      const { url, playlistId } = req.body;
      let tracks = null;

      if (url && url.includes('music.apple.com')) {
        tracks = await scrapeAppleMusicPlaylist(url);
      } else if (playlistId || (url && url.includes('spotify.com'))) {
        const id = playlistId || url.split('/playlist/')[1]?.split('?')[0];
        if (id) {
          tracks = await scrapeSpotifyPlaylist(id);
        }
      }

      if (!tracks) {
        return res.status(404).json({ error: 'Could not fetch tracks.' });
      }

      res.json({ tracks });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/playlist/tracks/page', async (req, res) => {
    try {
      const { url } = req.body;
      const userToken = req.headers.authorization?.split(' ')[1];
      const token = userToken || await getSpotifyToken();
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      res.json(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.warn('Spotify API 403 - Forbidden.');
      } else {
        console.error('Error fetching Spotify page:', error.response?.data || error.message);
      }
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  app.post('/api/playlist/search', async (req, res) => {
    try {
      const { query } = req.body;

      const token = await getSpotifyToken();
      if (token) {
        try {
          const response = await axios.get('https://api.spotify.com/v1/search', {
            params: { q: query, type: 'playlist', limit: 5 },
            headers: { Authorization: `Bearer ${token}` }
          });

          const playlists = response.data.playlists.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            owner: { display_name: item.owner.display_name },
            images: item.images,
            url: `https://open.spotify.com/playlist/${item.id}`
          }));

          return res.json(playlists);
        } catch (e) {
          console.error('Spotify search failed, falling back to Deezer:', e);
        }
      }

      const response = await axios.get('https://api.deezer.com/search/playlist', {
        params: { q: query, limit: 5 }
      });

      const playlists = response.data.data.map((item: any) => ({
        id: item.id.toString(),
        name: item.title,
        owner: { display_name: item.user.name },
        images: [{ url: item.picture_xl || item.picture_medium }],
        url: item.link
      }));

      res.json(playlists);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      res.status(error.response?.status || 500).json({ error: errorMsg });
    }
  });
}
