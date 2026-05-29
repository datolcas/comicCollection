import axios from 'axios';
import { load } from 'cheerio';

const url = 'https://marvel.fandom.com/wiki/Fantastic_Four_Vol_1';

const createHeaders = (referer = 'https://www.google.com/') => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Referer': referer,
});

try {
  const response = await axios.get(url, {
    headers: createHeaders(),
    timeout: 25000,
    maxRedirects: 5,
  });

  const $ = load(response.data);

  // Look for JSON-LD structured data
  console.log('=== JSON-LD ===');
  const jsonLd = $('script[type="application/ld+json"]').html();
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd);
      console.log('Found structured data:', JSON.stringify(data, null, 2).substring(0, 500));
    } catch (e) {
      console.log('Could not parse JSON-LD');
    }
  } else {
    console.log('No JSON-LD found');
  }

  // Check for data attributes that might contain infobox data
  console.log('\n=== DATA ATTRIBUTES ===');
  const elementsWithData = $('[data-*]').slice(0, 5);
  elementsWithData.each((i, el) => {
    const attrs = el.attribs;
    const dataAttrs = Object.keys(attrs).filter(k => k.startsWith('data-'));
    if (dataAttrs.length > 0) {
      console.log(`Element ${i}: ${dataAttrs.join(', ')}`);
    }
  });

  // Search for specific text patterns on the page
  console.log('\n=== BODY TEXT PATTERNS ===');
  const bodyText = $('body').text().substring(0, 5000);
  
  // Look for "1961" to "1996" pattern
  const yearPattern = bodyText.match(/(\d{4})[–-](\d{4})/);
  console.log('Year range found:', yearPattern ? `${yearPattern[1]}–${yearPattern[2]}` : 'NOT FOUND');

  // Look for issue count
  const issuePattern = bodyText.match(/(\d+)\s+(?:issues?|problems?)/i);
  console.log('Issue count pattern:', issuePattern ? issuePattern[1] : 'NOT FOUND');

  // Look in divs and spans that might contain infobox data
  console.log('\n=== ANALYZING DIVS ===');
  const allDivs = $('div, span').filter((i, el) => {
    const text = $(el).text();
    return text.includes('Issues') || text.includes('Publisher');
  });
  console.log(`Found ${allDivs.length} elements mentioning Issues/Publisher`);
  allDivs.slice(0, 3).each((i, el) => {
    const text = $(el).text().substring(0, 100);
    console.log(`  [${i}]: ${text}`);
  });

} catch (error) {
  console.error('Error:', error.message);
}
