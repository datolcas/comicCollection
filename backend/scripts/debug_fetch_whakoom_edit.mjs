import axios from 'axios';
import { load } from 'cheerio';

const url = 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp';

const fetch = async () => {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Referer': 'https://www.google.com/'
      },
      timeout: 30000,
      validateStatus: () => true
    });

    console.log('HTTP', res.status);
    const $ = load(res.data);

    // Try structured authors parsing similar to controller
    const authorsByRole = { scriptwriter: [], artist: [], inker: [], colorist: [], otherAuthors: [] };

    // Method 1: structured HTML format detection
    const authorsSection = $('h3:contains("Autores"), h2:contains("Autores"), strong:contains("Autores")').first();
    console.log('found authorsSection?', !!authorsSection.length);
    let foundAuthors = false;
    if (authorsSection.length) {
      const authorsParagraph = authorsSection.nextAll('p').first().html() || '';
      console.log('authorsParagraph snippet:', (authorsParagraph || '').substring(0,400));
      const authorMatches = authorsParagraph.match(/<a[^>]*>.*?<span[^>]*>([^<]+)<\/span>.*?<\/a>(?:\s*\(([^)]*)\))?/gi);
      if (authorMatches) {
        foundAuthors = true;
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
    }

    // Method 2: fallback anchors search
    if (!foundAuthors) {
      const authorAnchors = $('a[href*="/autores/"]').filter((i, el) => {
        const n = $(el).text().trim();
        return n && n.length > 0 && n.length < 50;
      });

      console.log('authorAnchors count:', authorAnchors.length);
      if (authorAnchors.length > 0) {
        foundAuthors = true;
        authorAnchors.each((i, el) => {
          const name = $(el).text().trim();
          const container = $(el).closest('p,li,div,td') || $(el).parent();
          const fragment = (container.text() || '').trim();

          // labeled roles parsing
          const labeledMap = {};
          const labelPatterns = [
            { role: 'scriptwriter', re: /(?:Guion|Guionista|Script(?: by)?|Writing)\s*[:\-–—]\s*([^;\n]+)/i },
            { role: 'artist', re: /(?:Dibujo|Arte|Art(?: by)?|Penciler|Artist)\s*[:\-–—]\s*([^;\n]+)/i },
            { role: 'inker', re: /(?:Tinta|Inker|Ink)\s*[:\-–—]\s*([^;\n]+)/i },
            { role: 'colorist', re: /(?:Color|Colorista|Color by)\s*[:\-–—]\s*([^;\n]+)/i }
          ];

          for (const lp of labelPatterns) {
            const m = fragment.match(lp.re);
            if (m && m[1]) {
              const names = m[1].split(/[;,·\\/]|\s+y\s+/i).map(n => n.trim()).filter(Boolean);
              names.forEach(n => labeledMap[n] = lp.role);
            }
          }

          let assigned = false;
          if (Object.keys(labeledMap).length > 0) {
            for (const [cand, role] of Object.entries(labeledMap)) {
              const lowName = name.toLowerCase();
              const lowCand = cand.toLowerCase();
              if (lowName === lowCand || lowName.startsWith(lowCand) || lowName.endsWith(lowCand) || lowCand.startsWith(lowName) || lowCand.endsWith(lowName)) {
                authorsByRole[role].push(name);
                assigned = true;
                break;
              }
            }
          }

          if (assigned) return;

          const idx = fragment.indexOf(name);
          const before = idx >= 0 ? fragment.substring(Math.max(0, idx - 30), idx) : '';
          const after = idx >= 0 ? fragment.substring(idx + name.length, idx + name.length + 30) : '';

          const anyWord = (words, str) => words.some(w => new RegExp(`\\b${w}\\b`, 'i').test(str));
          const isScript = anyWord(['script','guion','guionista','scriptwriter','writing'], before) || anyWord(['script','guion','guionista','scriptwriter','writing'], after);
          const isArtist = anyWord(['drawing','dibujo','artist','dibuj','penciler','art'], before) || anyWord(['drawing','dibujo','artist','dibuj','penciler','art'], after);
          const isInker = anyWord(['ink','tinta','inker'], before) || anyWord(['ink','tinta','inker'], after);
          const isColorist = anyWord(['color','colorist','colorista'], before) || anyWord(['color','colorist','colorista'], after);

          if (isScript) authorsByRole.scriptwriter.push(name);
          else if (isArtist) authorsByRole.artist.push(name);
          else if (isInker) authorsByRole.inker.push(name);
          else if (isColorist) authorsByRole.colorist.push(name);
          else authorsByRole.otherAuthors.push(name);
        });
      }
    }

    console.log('\nDetected authors:');
    console.log(JSON.stringify(authorsByRole, null, 2));

  } catch (err) {
    console.error('Fetch error:', err.message);
  }
};

fetch();
