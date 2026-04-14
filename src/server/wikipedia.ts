import axios from "axios";

export async function fetchWikipediaCategoryMembers(category: string): Promise<string[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php`;
    const params = {
      action: 'query',
      list: 'categorymembers',
      cmtitle: category.startsWith('Category:') ? category : `Category:${category}`,
      cmlimit: 'max',
      format: 'json',
      origin: '*'
    };
    
    const response = await axios.get(url, { params });
    const members = response.data?.query?.categorymembers || [];
    
    return members
      .map((m: any) => m.title)
      .filter((title: string) => !title.startsWith('Category:') && !title.startsWith('File:') && !title.startsWith('Template:'));
  } catch (error) {
    console.error(`[Wikipedia] Error fetching category ${category}:`, error);
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
      format: 'json',
      origin: '*'
    };
    
    const response = await axios.get(url, { params });
    const links = response.data?.parse?.links || [];
    
    return links
      .filter((l: any) => l.ns === 0 && l.exists !== undefined)
      .map((l: any) => l['*']);
  } catch (error) {
    console.error(`[Wikipedia] Error fetching links from page ${pageTitle}:`, error);
    return [];
  }
}
