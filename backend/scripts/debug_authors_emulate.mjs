import axios from 'axios';
import { load } from 'cheerio';

const url = 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp';

const run = async () => {
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer':'https://www.google.com' }, timeout:30000, validateStatus:()=>true });
  const $ = load(res.data);
  const authorsSection = $('h3:contains("Autores"), h2:contains("Autores"), strong:contains("Autores")').first();
  const authorsParagraph = authorsSection.nextAll('p').first().html() || '';

  const authorsByRole = { scriptwriter: [], artist: [], inker: [], colorist: [], otherAuthors: [] };

  const authorMatches = authorsParagraph.match(/<a[^>]*>.*?<span[^>]*>([^<]+)<\/span>.*?<\/a>(?:\s*\(([^)]*)\))?/gi);
  if (authorMatches) {
    authorMatches.forEach(match => {
      const nameMatch = match.match(/<span[^>]*>([^<]+)<\/span>/);
      const name = nameMatch ? nameMatch[1].trim() : '';
      const roleMatch = match.match(/\(([^)]+)\)/);
      const role = roleMatch ? roleMatch[1].trim().toLowerCase() : null;
      if (!name) return;
      if (role) {
        if (role.includes('guion') || role.includes('script')) {
          authorsByRole.scriptwriter.push(name);
        } else if (role.includes('dibujo') || role.includes('drawing')) {
          authorsByRole.artist.push(name);
        } else if (role.includes('tinta') || role.includes('ink')) {
          authorsByRole.inker.push(name);
        } else if (role.includes('color') || role.includes('colorista')) {
          authorsByRole.colorist.push(name);
        } else {
          authorsByRole.otherAuthors.push(`${name} (${role})`);
        }
      } else {
        authorsByRole.otherAuthors.push(name);
      }
    });
  }

  console.log('Emulated authorsByRole:', JSON.stringify(authorsByRole, null, 2));
}

run().catch(e=>console.error(e));
