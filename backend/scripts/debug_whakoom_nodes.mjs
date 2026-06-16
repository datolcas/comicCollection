import axios from 'axios';
import { load } from 'cheerio';

const url = 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp';
const headers = { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.google.com' };
(async () => {
  try {
    const res = await axios.get(url, { headers, timeout: 20000 });
    const $ = load(res.data);
    const p = $('h3:contains("Autores"), h2:contains("Autores"), strong:contains("Autores")').first().nextAll('p').first();
    const contents = p.contents().get();
    console.log('Total nodes:', contents.length);
    contents.forEach((node, i) => {
      console.log('--- node', i, 'type=', node.type, 'name=', node.name || '');
      if (node.type === 'tag') console.log('HTML:', load(node).html());
      if (node.type === 'text') console.log('TEXT:', node.data.replace(/\n/g,'\\n'));
    });
  } catch (e) {
    console.error(e && e.message ? e.message : e);
  }
})();
