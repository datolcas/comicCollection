import axios from 'axios';
import { load } from 'cheerio';

const url = 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp';

const run = async () => {
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer':'https://www.google.com' }, timeout:30000, validateStatus:()=>true });
  const $ = load(res.data);
  const authorsSection = $('h3:contains("Autores"), h2:contains("Autores"), strong:contains("Autores")').first();
  const authorsParagraph = authorsSection.nextAll('p').first().html() || '';
  console.log('authorsParagraph:', authorsParagraph);
  const re = /<a[^>]*>.*?<span[^>]*>([^<]+)<\/span>.*?<\/a>(?:\s*\(([^)]*)\))?/gi;
  let m;
  let i = 0;
  while ((m = re.exec(authorsParagraph)) !== null) {
    console.log('match', ++i, m[0]);
    console.log('  name group:', m[1]);
    console.log('  role group:', m[2]);
  }
}

run().catch(e=>console.error(e));
