import axios from "axios";

export async function fetchWikipediaCategoryMembers(category: string): Promise<string[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php`;
    const params = {
      action: 'query',
      list: 'categorymembers',
      cmtitle: category.startsWith('Category:') ? category : `Category:${category}`,
      cmlimit: 'max',
      format: 'json'
    };
    
    const response = await axios.get(url, { 
      params,
      headers: {
        'User-Agent': 'VoxGuess/1.0 (sippwichythxngkhng44@gmail.com)'
      }
    });
    const members = response.data?.query?.categorymembers || [];
    
    return members
      .map((m: any) => m.title)
      .filter((title: string) => 
        !title.startsWith('Category:') && 
        !title.startsWith('File:') && 
        !title.startsWith('Template:') &&
        !title.startsWith('List of') &&
        !title.startsWith('Index of')
      )
      .map((title: string) => title.replace(/\s*\(.*?\)\s*/g, '').trim());
  } catch (error: any) {
    console.error(`[Wikipedia] Error fetching category ${category}:`, error.message || error);
    return [];
  }
}

export async function fetchWikipediaListFromPage(pageTitle: string): Promise<string[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php`;
    const params = {
      action: 'parse',
      page: pageTitle,
      prop: 'links',
      format: 'json'
    };
    
    const response = await axios.get(url, { 
      params,
      headers: {
        'User-Agent': 'VoxGuess/1.0 (sippwichythxngkhng44@gmail.com)'
      }
    });
    const links = response.data?.parse?.links || [];
    
    return links
      .filter((l: any) => l.ns === 0 && l.exists !== undefined)
      .map((l: any) => l['*']);
  } catch (error: any) {
    console.error(`[Wikipedia] Error fetching links from page ${pageTitle}:`, error.message || error);
    return [];
  }
}
