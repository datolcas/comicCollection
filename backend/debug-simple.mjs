import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';

const url = 'https://marvel.fandom.com/wiki/Fantastic_Four_Vol_1';

const createHeaders = (referer = 'https://www.google.com/') => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-User': '?1',
  'Referer': referer,
});

try {
  const response = await axios.get(url, {
    headers: createHeaders(),
    timeout: 25000,
  });

  // Save raw HTML for inspection
  fs.writeFileSync('./fandom-page.html', response.data);
  console.log('Raw HTML saved to fandom-page.html');

  const $ = load(response.data);

  // Get title
  const title = $('h1#firstHeading, h1.page-header__title').first().text().trim();
  console.log('Title:', title);

  // Count some key elements
  console.log('pi-data-label count:', $('.pi-data-label').length);
  console.log('pi-data-value count:', $('.pi-data-value').length);
  console.log('mw-parser-output count:', $('.mw-parser-output').length);

  // Get body text from 1000 to 3000 chars and look for patterns
  const bodyText = $('body').text();
  const snippet = bodyText.substring(bodyText.indexOf('1961'), bodyText.indexOf('1961') + 500);
  console.log('Snippet around 1961:', snippet);

} catch (error) {
  console.error('Error:', error.message);
}
