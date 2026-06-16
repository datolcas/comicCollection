import axios from 'axios';
import { load } from 'cheerio';

const url = 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp';

const fetch = async () => {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer':'https://www.google.com' }, timeout:30000, validateStatus:()=>true });
    console.log('HTTP', res.status);
    const $ = load(res.data);

    // Find structured authors section
    const authorsSection = $('h3:contains("Autores"), h2:contains("Autores"), strong:contains("Autores")').first();
    console.log('authorsSection found:', authorsSection.length > 0);
    if (authorsSection.length) {
      const authorsParagraph = authorsSection.nextAll('p').first().html() || '';
      console.log('authorsParagraph HTML:', authorsParagraph.substring(0,500));
    }

    // Fallback: author links
    const anchors = $('a[href*="/autores/"]').filter((i,el)=>{ const n=$(el).text().trim(); return n && n.length>0 && n.length<50; });
    console.log('author anchors found:', anchors.length);
    anchors.each((i,el)=>{
      const name = $(el).text().trim();
      const container = $(el).closest('p,li,div,td') || $(el).parent();
      const frag = (container.text()||'').trim();
      console.log('\nAuthor:', name);
      console.log('Fragment:', frag.substring(0,200));
      const idx = frag.indexOf(name);
      console.log('Index in fragment:', idx);
      const before = idx>=0?frag.substring(Math.max(0,idx-30),idx):'';
      const after = idx>=0?frag.substring(idx+name.length, idx+name.length+30):'';
      console.log('Before:', before);
      console.log('After:', after);
    });

  } catch (err) {
    console.error('Fetch error:', err.message);
  }
};

fetch();
