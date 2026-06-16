import axios from 'axios';
import { load } from 'cheerio';

const url = 'https://marvel.fandom.com/wiki/Avengers_Vol_6';

const fetch = async () => {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
      },
      timeout: 30000,
      validateStatus: () => true
    });

    console.log('HTTP', res.status);
    const $ = load(res.data);
    const h1 = $('h1#firstHeading, h1.page-header__title').first().text().trim();
    console.log('\nH1:', h1);

    const pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);
    console.log('\nPage excerpt:\n', pageText.substring(0, 800));

    // Try vol match
    const volMatch = h1.match(/Vol(?:ume)?\.?\s*(\d+)/i);
    console.log('\nvolMatch:', volMatch && volMatch[1]);

    // Look for issue-like patterns
    const body = $('body').text();
    const patterns = [
      /#?\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g,
      /#\s*(\d+(?:\.\d+)?)/g,
      /(\d+(?:\.\d+)?)(?:[-–—](\d+(?:\.\d+)?))/g
    ];

    for (const p of patterns) {
      let m;
      console.log('\nPattern:', p);
      let count = 0;
      while ((m = p.exec(body)) && count < 10) {
        console.log('  match:', m.slice(1, 3).filter(Boolean).join('/'));
        count++;
      }
      if (count === 0) console.log('  no matches');
    }

    // Look for md-volume metadata
    const meta = {};
    $('.md-volume__column').each((i,col)=>{
      $(col).find('div').each((j,div)=>{
        const label = $(div).find('span').first().text().trim().replace(/:$/,'');
        let value = $(div).clone().children('span').remove().end().text().trim();
        if (label && value) meta[label.toLowerCase()] = value;
      });
    });
    console.log('\nmd-volume metadata keys:', Object.keys(meta));
    console.log('publisher:', meta['publisher']);
    console.log('marvel unlimited:', meta['marvel unlimited']);

    // Print first 40 links from content
    const links = $('a[href*="/wiki/"]').map((i,el)=>$(el).attr('href')).get().slice(0,40);
    console.log('\nSample wiki links:', links.slice(0,10));

  } catch (err) {
    console.error('Fetch error:', err.message);
  }
};

fetch();
