import fetch from 'node-fetch';
import axios from 'axios';
import { load } from 'cheerio';
import { normalizeComicForInsert } from '../src/utils/normalizeComic.js';
import { db } from '../src/server.js';

const serverEndpoint = 'http://localhost:5001/api/comics/fetch-from-url';
const targetUrl = 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp';

const getServerComic = async () => {
  const res = await fetch(serverEndpoint, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ url: targetUrl })
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return res.json();
};

const extractAuthorsFromPage = async (url) => {
  const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = load(data);
  const authorsByRole = { scriptwriter: [], artist: [], inker: [], colorist: [], otherAuthors: [] };

  const authorsSection = $('h3:contains("Autores"), h2:contains("Autores"), strong:contains("Autores")').first();
  if (authorsSection.length) {
    const pElem = authorsSection.nextAll('p').first();
    if (pElem.length) {
      // iterate children to map anchors to adjacent role
      const children = pElem.contents().toArray();
      for (let i = 0; i < children.length; i++) {
        const node = children[i];
        if (node.type === 'tag' && node.name === 'a') {
          const name = load(node).text().trim();
          let role = null;
          const nextNode = node.next;
          if (nextNode && nextNode.type === 'text') {
            const m = String(nextNode.data).match(/\(([^)]+)\)/);
            if (m) role = m[1].trim().toLowerCase();
          }

          if (role) {
            if (role.includes('guion') || role.includes('script')) authorsByRole.scriptwriter.push(name);
            else if (role.includes('dibujo') || role.includes('drawing')) authorsByRole.artist.push(name);
            else if (role.includes('tinta') || role.includes('ink')) authorsByRole.inker.push(name);
            else if (role.includes('color') || role.includes('colorista')) authorsByRole.colorist.push(name);
            else authorsByRole.otherAuthors.push(`${name} (${role})`);
          } else {
            authorsByRole.otherAuthors.push(name);
          }
        }
      }
    }
  }

  // Fallback: anchors search with labeledMap if needed
  if (authorsByRole.scriptwriter.length===0 && authorsByRole.artist.length===0 && authorsByRole.otherAuthors.length===0) {
    const authorAnchors = $('a[href*="/autores/"]').filter((i, el) => $(el).text().trim().length>0);
    authorAnchors.each((i, el) => {
      const name = $(el).text().trim();
      const container = $(el).closest('p,li,div,td') || $(el).parent();
      const fragment = (container.text()||'').trim();

      const labelPatterns = [
        { role: 'scriptwriter', re: /(?:Guion|Guionista|Script(?: by)?|Writing)\s*[:\-–—]\s*([^;\n]+)/i },
        { role: 'artist', re: /(?:Dibujo|Arte|Art(?: by)?|Penciler|Artist)\s*[:\-–—]\s*([^;\n]+)/i },
        { role: 'inker', re: /(?:Tinta|Inker|Ink)\s*[:\-–—]\s*([^;\n]+)/i },
        { role: 'colorist', re: /(?:Color|Colorista|Color by)\s*[:\-–—]\s*([^;\n]+)/i }
      ];

      const labeledMap = {};
      for (const lp of labelPatterns) {
        const m = fragment.match(lp.re);
        if (m && m[1]) {
          const names = m[1].split(/[;,·\\/]|\s+y\s+/i).map(n=>n.trim()).filter(Boolean);
          names.forEach(n=>labeledMap[n]=lp.role);
        }
      }

      let assigned=false;
      if (Object.keys(labeledMap).length>0) {
        for (const [cand, role] of Object.entries(labeledMap)) {
          const lowName=name.toLowerCase(), lowCand=cand.toLowerCase();
          if (lowName===lowCand || lowName.startsWith(lowCand) || lowName.endsWith(lowCand) || lowCand.startsWith(lowName) || lowCand.endsWith(lowName)) {
            authorsByRole[role].push(name); assigned=true; break;
          }
        }
      }
      if (assigned) return;

      const idx = fragment.indexOf(name);
      const before = idx>=0?fragment.substring(Math.max(0,idx-30), idx):'';
      const after = idx>=0?fragment.substring(idx+name.length, idx+name.length+30):'';
      const anyWord=(words,str)=>words.some(w=>new RegExp(`\\b${w}\\b`,'i').test(str));
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

  return authorsByRole;
};

(async ()=>{
  try {
    console.log('Requesting server-extracted comic...');
    const comic = await getServerComic();
    console.log('Server title:', comic.title);
    console.log('Server authors debug:', comic._debugAuthors || {});

    console.log('Re-extracting authors from page for correctness...');
    const fixed = await extractAuthorsFromPage(targetUrl);
    console.log('Fixed authors:', fixed);

    comic.scriptwriter = fixed.scriptwriter;
    comic.artist = fixed.artist;
    comic.inker = fixed.inker;
    comic.colorist = fixed.colorist;
    comic.otherAuthors = fixed.otherAuthors;

    // Duplicate check
    const query = db.collection('comics').where('title','==', comic.title);
    const snapshot = await query.get();
    let isDuplicate = false;
    if (!snapshot.empty) {
      if (comic.issueNumber !== undefined && comic.issueNumber !== null) {
        isDuplicate = snapshot.docs.some(doc=>doc.data().issueNumber===comic.issueNumber);
      } else {
        isDuplicate = true;
      }
    }

    if (isDuplicate) {
      console.log('Duplicate found — not inserting.');
      console.log('Final authors that would be used:', comic.scriptwriter, comic.artist, comic.otherAuthors);
      process.exit(0);
    }

    const normalized = normalizeComicForInsert(comic);
    const toInsert = {...normalized, createdAt: new Date(), updatedAt: new Date()};
    const ref = await db.collection('comics').add(toInsert);
    console.log('Inserted with id:', ref.id);
    console.log('Authors inserted:', toInsert.scriptwriter, toInsert.artist, toInsert.otherAuthors);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e && e.message? e.message : e);
    process.exit(1);
  }
})();
