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
    console.log('Node count:', contents.length);
    const authorsByRole = { scriptwriter: [], artist: [], inker: [], colorist: [], otherAuthors: [] };
    const structuredRoleMap = {};
    const pNodes = contents;
    for (let i = 0; i < pNodes.length; i++) {
      const node = pNodes[i];
      console.log('\nNode', i, 'type', node.type, 'name', node.name || '');
      if (node.type === 'tag' && node.name === 'a') {
        const name = load(node).text().trim();
        console.log('Found anchor name=', name);
        // look ahead in pNodes array
        let role = null;
        for (let k = 1; k <= 4 && (i + k) < pNodes.length && !role; k++) {
          const sibling = pNodes[i + k];
          console.log('  sibling type=', sibling.type, 'data=', sibling.type === 'text' ? JSON.stringify(sibling.data) : load(sibling).text().trim());
          if (sibling.type === 'text') {
            const m = String(sibling.data).match(/\(([^)]+)\)/);
            console.log('    regex match on text:', m);
            if (m) role = m[1].trim().toLowerCase();
          } else if (sibling.type === 'tag') {
            const txt = load(sibling).text().trim();
            const m = String(txt).match(/\(([^)]+)\)/);
            console.log('    regex match on tag:', m);
            if (m) role = m[1].trim().toLowerCase();
          }
        }
        console.log('  detected role=', role);
        if (role) {
          if (role.includes('guion') || role.includes('script')) {
            authorsByRole.scriptwriter.push(name);
            structuredRoleMap[name] = 'scriptwriter';
          } else if (role.includes('dibujo') || role.includes('drawing')) {
            authorsByRole.artist.push(name);
            structuredRoleMap[name] = 'artist';
          } else if (role.includes('tinta') || role.includes('ink')) {
            authorsByRole.inker.push(name);
            structuredRoleMap[name] = 'inker';
          } else if (role.includes('color') || role.includes('colorista')) {
            authorsByRole.colorist.push(name);
            structuredRoleMap[name] = 'colorist';
          } else {
            authorsByRole.otherAuthors.push(`${name} (${role})`);
            structuredRoleMap[name] = 'otherAuthors';
          }
        } else {
          authorsByRole.otherAuthors.push(name);
          structuredRoleMap[name] = 'otherAuthors';
        }
      } else if (node.type === 'text') {
        console.log('Text node:', node.data.trim());
      }
    }

    console.log('\nAuthors arrays after structured parse:');
    console.log(JSON.stringify(authorsByRole, null, 2));
    console.log('Structured map:', structuredRoleMap);

  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
  }
})();
