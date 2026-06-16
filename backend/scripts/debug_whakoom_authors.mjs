import axios from 'axios';
import { load } from 'cheerio';

const url = 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer': 'https://www.google.com'
};

(async () => {
  try {
    const res = await axios.get(url, { headers, timeout: 20000 });
    const $ = load(res.data);
    const authorsSection = $('h3:contains("Autores"), h2:contains("Autores"), strong:contains("Autores")').first();
    console.log('Found authorsSection:', authorsSection.length > 0);
    if (authorsSection.length) {
      const p = authorsSection.nextAll('p').first();
      console.log('Authors paragraph HTML:\n', p.html());
      console.log('\nAuthors paragraph text:\n', p.text());
    } else {
      // try to find any element with /autores/ label
      const possible = $('*:contains("Autor"), *:contains("Autores"), *:contains("Autora")').filter((i, el) => $(el).text().toLowerCase().includes('autor'));
      console.log('Possible matches count:', possible.length);
      possible.each((i, el) => {
        console.log('--- element ###', i, '---');
        console.log(load(el).html());
        console.log('TEXT:', load(el).text());
      });
    }
  } catch (e) {
    console.error('Fetch error:', e && e.message ? e.message : e);
  }
})();
