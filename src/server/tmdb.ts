import axios from "axios";
import { Track } from "./types";
import { fetchWikipediaCategoryMembers } from "./wikipedia";

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const MOVIE_GENRE_IDS: Record<string, string> = {
  'Action/Drama': '28,18',
  'Comedy': '35',
  'Horror': '27',
  'Sci-Fi': '878',
};

const CARTOON_NETWORK_SHOWS = [
  'Tom and Jerry', 'Ben 10', 'The Powerpuff Girls', "Dexter's Laboratory",
  'Samurai Jack', 'Adventure Time', 'Regular Show', 'Courage the Cowardly Dog',
  'Ed, Edd n Eddy', 'Johnny Bravo', 'We Bare Bears', 'Steven Universe',
  'The Amazing World of Gumball', 'Codename: Kids Next Door', 'Foster\'s Home for Imaginary Friends',
  'Grim Adventures of Billy & Mandy', 'Teen Titans', 'Chowder', 'The Marvelous Misadventures of Flapjack',
  'Camp Lazlo', 'My Gym Partner\'s a Monkey', 'Cow and Chicken', 'I Am Weasel', 'Sheep in the Big City',
  'Robot Jones', 'Megas XLR', 'Hi Hi Puffy AmiYumi', 'The Life and Times of Juniper Lee',
  'Class of 3000', 'Uncle Grandpa', 'Clarence', 'Over the Garden Wall', 'Infinity Train',
  'OK K.O.! Let\'s Be Heroes', 'Craig of the Creek', 'Summer Camp Island', 'Victor and Valentino',
  'Mao Mao: Heroes of Pure Heart', 'The Fungies!', 'Tig n\' Seek'
];

const NICKELODEON_SHOWS = [
  'SpongeBob SquarePants', 'Dora the Explorer', 'The Fairly OddParents',
  'Avatar: The Last Airbender', 'Danny Phantom', 'Jimmy Neutron',
  'Rugrats', 'Hey Arnold!', 'CatDog', 'Invader Zim',
  'The Wild Thornberrys', 'The Loud House', 'PAW Patrol',
  'Teenage Mutant Ninja Turtles', 'Blue\'s Clues', 'The Ren & Stimpy Show',
  'Rocko\'s Modern Life', 'Aaahh!!! Real Monsters', 'KaBlam!', 'The Angry Beavers',
  'Rocket Power', 'As Told by Ginger', 'ChalkZone', 'My Life as a Teenage Robot',
  'All Grown Up!', 'Danny Phantom', 'Avatar: The Last Airbender', 'The X\'s',
  'El Tigre: The Adventures of Manny Rivera', 'Back at the Barnyard', 'The Mighty B!',
  'The Penguins of Madagascar', 'Fanboy & Chum Chum', 'T.U.F.F. Puppy', 'Winx Club',
  'Kung Fu Panda: Legends of Awesomeness', 'The Legend of Korra', 'Robot and Monster',
  'Sanjay and Craig', 'Breadwinners', 'Harvey Beaks', 'Pig Goat Banana Cricket',
  'The Casagrandes', 'It\'s Pony', 'Middlemost Post'
];

function getTMDBHeaders(): Record<string, string> | null {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
}

async function fetchTMDBDiscover(type: 'movie' | 'tv', params: Record<string, string>, language: string = 'en-US'): Promise<any[]> {
  const headers = getTMDBHeaders();
  if (!headers) return [];
  
  try {
    // First, get the total number of pages
    const initialParams = new URLSearchParams({ ...params, page: '1', language });
    if (!params.sort_by) initialParams.set('sort_by', 'popularity.desc');
    if (!params['vote_count.gte']) initialParams.set('vote_count.gte', '50');
    
    const initialRes = await axios.get(`${TMDB_BASE_URL}/discover/${type}?${initialParams}`, { headers });
    const totalPages = Math.min(initialRes.data.total_pages || 1, 10); // Cap at 10 pages for diversity vs performance
    
    // Pick 3 random pages from the available ones
    const pagesToFetch = new Set<number>();
    while (pagesToFetch.size < Math.min(3, totalPages)) {
      pagesToFetch.add(Math.floor(Math.random() * totalPages) + 1);
    }
    
    let allResults: any[] = [];
    for (const page of Array.from(pagesToFetch)) {
      const queryParams = new URLSearchParams({
        ...params,
        page: page.toString(),
        language
      });
      if (!params.sort_by) queryParams.set('sort_by', 'popularity.desc');
      if (!params['vote_count.gte']) queryParams.set('vote_count.gte', '50');
      
      const res = await axios.get(`${TMDB_BASE_URL}/discover/${type}?${queryParams}`, { headers });
      allResults = allResults.concat(res.data.results || []);
    }
    return allResults;
  } catch (error: any) {
    console.error('TMDB discover error:', error.message || error);
    return [];
  }
}

async function searchTMDB(query: string, type: 'movie' | 'tv'): Promise<any | null> {
  const headers = getTMDBHeaders();
  if (!headers) return null;
  
  try {
    const res = await axios.get(`${TMDB_BASE_URL}/search/${type}`, {
      params: { query, language: 'en-US', page: 1 },
      headers
    });
    
    const results = res.data.results;
    if (results && results.length > 0 && results[0].poster_path) {
      return results[0];
    }
  } catch (error: any) {
    console.error(`TMDB search error for "${query}":`, error.message || error);
  }
  return null;
}

function tmdbToTrack(item: any, type: 'movie' | 'tv'): Track {
  return {
    id: `tmdb-${item.id}`,
    name: type === 'movie' ? item.title : item.name,
    artist: type === 'movie'
      ? (item.release_date?.split('-')[0] || 'Unknown Year')
      : (item.first_air_date?.split('-')[0] || 'Unknown Year'),
    previewUrl: '',
    albumArt: '',
    imageUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : ''
  };
}

export async function fetchMoviesFromTMDB(genre: string): Promise<Track[]> {
  console.log(`[TMDB] Fetching movies for genre: ${genre}`);
  const params: Record<string, string> = {};
  let language = 'en-US';
  
  if (genre === 'Thai Movies') {
    params.with_original_language = 'th';
    language = 'th-TH';
  } else if (genre === 'Classic') {
    params['primary_release_date.lte'] = '2000-12-31';
    params.sort_by = 'vote_count.desc';
  } else {
    const genreIds = MOVIE_GENRE_IDS[genre];
    if (genreIds) params.with_genres = genreIds;
  }
  
  const results = await fetchTMDBDiscover('movie', params, language);
  const tracks = results.filter(m => m.poster_path).map(m => tmdbToTrack(m, 'movie'));
  console.log(`[TMDB] Found ${tracks.length} movies for genre: ${genre}`);
  return tracks;
}

export async function fetchCartoonsFromTMDB(source: string): Promise<Track[]> {
  console.log(`[TMDB] Fetching cartoons for source: ${source}`);
  
  if (source === 'Disney/Pixar') {
    const results = await fetchTMDBDiscover('movie', {
      with_genres: '16',
      with_companies: '2|3|6125|521|10342' // Disney, Pixar, Disney Animation, DreamWorks, Studio Ghibli (added some variety)
    });
    return results.filter(m => m.poster_path).map(m => tmdbToTrack(m, 'movie'));
  }

  if (source === 'Disney Princess') {
    let princessTitles = [
      'Snow White and the Seven Dwarfs', 'Cinderella', 'Sleeping Beauty', 
      'The Little Mermaid', 'Beauty and the Beast', 'Aladdin', 
      'Pocahontas', 'Mulan', 'The Princess and the Frog', 
      'Tangled', 'Brave', 'Frozen', 'Moana', 'Raya and the Last Dragon',
      'Encanto', 'Wish', 'The Princess Diaries', 'Ella Enchanted'
    ];

    // Try to get more from Wikipedia
    try {
      // "Disney Princess" is the correct main article title
      const wikiPrincesses = await fetchWikipediaListFromPage('Disney Princess');
      if (wikiPrincesses.length > 0) {
        // Filter for things that look like names/titles and aren't generic Wikipedia links
        const filtered = wikiPrincesses.filter(t => 
          t.length > 3 && 
          !['Disney Princess', 'Walt Disney Pictures', 'Official website', 'The Walt Disney Company'].includes(t)
        );
        princessTitles = Array.from(new Set([...princessTitles, ...filtered]));
      }

      // Also try the category as a secondary source
      const catPrincesses = await fetchWikipediaCategoryMembers('Disney Princesses');
      if (catPrincesses.length > 0) {
        princessTitles = Array.from(new Set([...princessTitles, ...catPrincesses]));
      }
    } catch (e) {
      console.warn('[TMDB] Wikipedia fetch failed for Disney Princesses, using fallback list');
    }

    // Append "Disney" to the search query to avoid horror/parody versions like "The Deadly Little Mermaid"
    const results = await Promise.all(princessTitles.map(name => searchTMDB(`${name} Disney`, 'movie')));
    return results
      .filter((r): r is NonNullable<typeof r> => r !== null && r.poster_path)
      .map(r => tmdbToTrack(r, 'movie'));
  }
  
  if (source === 'Anime') {
    const results = await fetchTMDBDiscover('movie', {
      with_genres: '16',
      with_original_language: 'ja'
    });
    return results.filter(m => m.poster_path).map(m => tmdbToTrack(m, 'movie'));
  }
  
  if (source === 'Classic 90s') {
    const results = await fetchTMDBDiscover('movie', {
      with_genres: '16',
      'primary_release_date.gte': '1985-01-01',
      'primary_release_date.lte': '2002-12-31'
    });
    return results.filter(m => m.poster_path).map(m => tmdbToTrack(m, 'movie'));
  }
  
  if (source === 'Cartoon Network' || source === 'Nickelodeon') {
    const networkId = source === 'Cartoon Network' ? '56' : '13';
    const results = await fetchTMDBDiscover('tv', {
      with_networks: networkId
    });
    return results.filter(m => m.poster_path).map(m => tmdbToTrack(m, 'tv'));
  }

  // Fallback for other sources if needed
  let showNames = source === 'Cartoon Network' ? CARTOON_NETWORK_SHOWS : NICKELODEON_SHOWS;
  const searchResults = await Promise.all(showNames.map(name => searchTMDB(`${name} ${source}`, 'tv')));
  const tracks = searchResults
    .filter((r): r is NonNullable<typeof r> => r !== null && r.poster_path)
    .map(r => tmdbToTrack(r, 'tv'));
  console.log(`[TMDB] Found ${tracks.length} cartoons for source: ${source}`);
  return tracks;
}
