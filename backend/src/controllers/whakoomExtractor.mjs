import axios from 'axios';
import { load } from 'cheerio';

// Helper: reject implausible numeric matches (timestamps, large IDs)
const isPlausibleIssue = (s) => {
  if (s === undefined || s === null) return false;
  const str = String(s).trim();
  if (!str) return false;
  const digitsOnly = str.replace(/[^0-9]/g, '');
  if (digitsOnly.length >= 7) return false;
  const n = Number(str);
  if (Number.isNaN(n)) return false;
  return n >= 0 && n <= 9999;
};

const fetchHtml = async (url) => {
  const createHeaders = (referer = 'https://www.google.com/') => ({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
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

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const attemptFetch = async (headers, delayMs = 0) => {
    if (delayMs > 0) await delay(delayMs);
    const response = await axios.get(url, {
      headers,
      timeout: 25000,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    if (response.status === 403) {
      const error = new Error(`HTTP ${response.status}`);
      error.response = { status: 403 };
      throw error;
    }
    return response.data;
  };

  try {
    return await attemptFetch(createHeaders('https://www.google.com/'));
  } catch (error) {
    // continue
  }
  try {
    return await attemptFetch(createHeaders('https://marvel.fandom.com/'), 1000);
  } catch (error) {
    // continue
  }
  try {
    return await attemptFetch(createHeaders('https://en.wikipedia.org/'), 1000);
  } catch (error) {
    // continue
  }
  try {
    return await attemptFetch(createHeaders(url.split('/wiki/')[0] + '/'), 1000);
  } catch (error) {
    // continue
  }

  throw new Error('Unable to fetch page: Access forbidden (403).');
};

// Copy of extractData (Whakoom parsing) and related helpers
const extractData = async (html, url) => {
  const $ = load(html);
  const comicData = {};

  // Title
  const titleSelectors = [
    'body > form > div:nth-child(4) > div:nth-child(2) > div > div > div > div > div:nth-child(3) > p:nth-child(2)',
    'h1[itemprop="name"]',
    'h1 span',
    'h1'
  ];
  let comicTitle = '';
  for (const selector of titleSelectors) {
    const titleElement = $(selector).first();
    if (titleElement.length) {
      const text = titleElement.text().trim();
      if (text) {
        comicTitle = text;
        break;
      }
    }
  }
  comicData.title = comicTitle || '';

  // Series & Issue Number (simplified reuse from controller)
  const h1 = $('h1').first();
  const h1FullText = h1.text().trim();
  let extractedSeries = '';
  let extractedIssueLocal = null;
  let extractedIssueUsa = null;

  const normalizeIssueText = text => {
    if (!text) return null;
    const trimmed = text.trim();
    const issueMatch = trimmed.match(/#?\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (issueMatch) {
      return {
        local: parseFloat(issueMatch[1]),
        usa: issueMatch[2]
      };
    }
    const localMatch = trimmed.match(/#?\s*(\d+(?:\.\d+)?)/);
    if (localMatch) {
      return { local: parseFloat(localMatch[1]) };
    }
    return null;
  };

  const strongs = h1.find('strong');
  if (strongs.length >= 2) {
    const seriesText = $(strongs[0]).text().trim();
    const issueText = $(strongs[1]).text().trim();
    const issueParts = normalizeIssueText(issueText);
    if (issueParts) {
      extractedSeries = seriesText;
      extractedIssueLocal = issueParts.local;
      extractedIssueUsa = issueParts.usa || null;
    }
  }

  if (!extractedSeries) {
    let m = null;
    m = h1FullText.match(/^(.+?)\s*#\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (m) {
      extractedSeries = m[1].trim();
      extractedIssueLocal = parseFloat(m[2]);
      extractedIssueUsa = m[3];
    } else {
      m = h1FullText.match(/^(.+?)\s*#\s*(\d+(?:\.\d+)?)/);
      if (m) {
        extractedSeries = m[1].trim();
        extractedIssueLocal = parseFloat(m[2]);
      } else {
        m = h1FullText.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
        if (m) {
          extractedSeries = m[1].trim();
          extractedIssueLocal = parseFloat(m[2]);
          extractedIssueUsa = m[3];
        } else {
          m = h1FullText.match(/^(.+?)\s*#?\s*(\d+(?:\.\d+)?)$/);
          if (m) {
            extractedSeries = m[1].trim();
            extractedIssueLocal = parseFloat(m[2]);
          }
        }
      }
    }
  }

  comicData.series = extractedSeries || '';
  // Sanitize series to avoid short alphanumeric tokens (noise)
  const sanitizeSeries = (s) => {
    if (!s) return '';
    const str = String(s).trim();
    if (!str) return '';
    if (str.includes(' ')) return str;
    if (/^[A-Za-z0-9_-]{3,8}$/.test(str) && /[A-Za-z]/.test(str) && /[0-9]/.test(str)) return '';
    if (/^[A-Z0-9]{3,8}$/.test(str)) return '';
    return str;
  };
  comicData.series = sanitizeSeries(comicData.series);
  let finalLocal = (extractedIssueLocal !== undefined && extractedIssueLocal !== null) ? extractedIssueLocal : null;
  const urlParts = (url || '').split('/').filter(p => p.length > 0);
  const lastSegment = urlParts[urlParts.length - 1] || '';
  const isEditionPage = /\/ediciones?/i.test(url);
  if (finalLocal === null && !isEditionPage) {
    const numMatch = (lastSegment || '').match(/^(\d+(?:\.\d+)?)$/);
    if (numMatch) finalLocal = parseFloat(numMatch[1]);
  }
  let finalUsa = (extractedIssueUsa !== undefined && extractedIssueUsa !== null) ? extractedIssueUsa : null;
  comicData.issueNumber = finalLocal !== null ? String(finalLocal) : null;

  // Authors parsing (same logic as controller but self-contained)
  const authorsByRole = {
    scriptwriter: [],
    artist: [],
    inker: [],
    colorist: [],
    otherAuthors: []
  };
  let foundAuthors = false;
  let authorsSection = $('h3:contains("Autores"), h2:contains("Autores"), strong:contains("Autores")').first();
    // If authorsSection not found with the current HTML (some servers return slightly different HTML
    // depending on headers), try a simpler fetch and re-parse as fallback.
    if (!authorsSection.length) {
      try {
        const res2 = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.google.com' }, timeout: 20000 });
        const $2 = load(res2.data);
        // Replace $ with the simpler parse for subsequent author extraction
        // eslint-disable-next-line no-unused-vars
        // eslint-disable-next-line prefer-const
        $ = $2;
      } catch (e) {
        // ignore fallback failure
      }
      authorsSection = $('h3:contains("Autores"), h2:contains("Autores"), strong:contains("Autores")').first();
    }
  const structuredRoleMap = {};
  if (authorsSection.length) {
    const pElem = authorsSection.nextAll('p').first();
    if (pElem.length) {
      foundAuthors = true;
      const pNodes = pElem.contents().get();
      console.log('DEBUG pNodes length=', pNodes.length);
      console.log(pNodes.map(n => ({ t: n.type, name: n.name || '', text: n.type === 'text' ? String(n.data).trim() : load(n).text().trim() })));
      for (let idx = 0; idx < pNodes.length; idx++) {
        const node = pNodes[idx];
        try {
          if (node.type === 'tag' && node.name === 'a') {
            const name = load(node).text().trim();
            let role = null;
            for (let k = 1; k <= 4 && (idx + k) < pNodes.length && !role; k++) {
              const sibling = pNodes[idx + k];
              try {
                if (sibling.type === 'text') {
                  const m = String(sibling.data).match(/\(([^)]+)\)/);
                  if (m) role = m[1].trim().toLowerCase();
                } else if (sibling.type === 'tag') {
                  const txt = load(sibling).text().trim();
                  const m = String(txt).match(/\(([^)]+)\)/);
                  if (m) role = m[1].trim().toLowerCase();
                }
              } catch (e) {}
            }

            if (!name) continue;

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
          }
        } catch (e) {}
      }
    }
  }

  if (!foundAuthors && (authorsByRole.scriptwriter.length === 0 && authorsByRole.artist.length === 0 && authorsByRole.otherAuthors.length === 0)) {
    const authorAnchors = $('a[href*="/autores/"]').filter((i, el) => {
      const n = $(el).text().trim();
      return n && n.length > 0 && n.length < 50;
    });

    if (authorAnchors.length > 0) {
      foundAuthors = true;

      authorAnchors.each((i, el) => {
        const name = $(el).text().trim();
        const container = $(el).closest('p,li,div,td') || $(el).parent();
        const fragment = (container.text() || '').trim();

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
            names.forEach(n => {
              labeledMap[n] = lp.role;
            });
          }
        }

        let assigned = false;
        if (Object.keys(labeledMap).length > 0) {
          const normalize = s => String(s || '').toLowerCase().replace(/[\s\.,\-_/()+]+/g, ' ').trim();
          const nameNorm = normalize(name);
          for (const [cand, role] of Object.entries(labeledMap)) {
            const candNorm = normalize(cand);
            if (nameNorm === candNorm || nameNorm.includes(candNorm) || candNorm.includes(nameNorm)) {
              authorsByRole[role].push(name);
              assigned = true;
              break;
            }
            const nameParts = nameNorm.split(' ');
            const candParts = candNorm.split(' ');
            if (nameParts.length > 0 && candParts.length > 0) {
              const nameLast = nameParts[nameParts.length - 1];
              const candLast = candParts[candParts.length - 1];
              if (nameLast && candLast && (nameLast === candLast)) {
                authorsByRole[role].push(name);
                assigned = true;
                break;
              }
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

        if (isScript) {
          authorsByRole.scriptwriter.push(name);
        } else if (isArtist) {
          authorsByRole.artist.push(name);
        } else if (isInker) {
          authorsByRole.inker.push(name);
        } else if (isColorist) {
          authorsByRole.colorist.push(name);
        } else {
          authorsByRole.otherAuthors.push(name);
        }
      });
    }
  }

  // Reconcile structuredRoleMap
  if (Object.keys(structuredRoleMap).length > 0) {
    for (const [name, role] of Object.entries(structuredRoleMap)) {
      ['scriptwriter','artist','inker','colorist','otherAuthors'].forEach(arr => {
        if (arr !== role) {
          const idx = authorsByRole[arr].indexOf(name);
          if (idx !== -1) authorsByRole[arr].splice(idx, 1);
        }
      });
      if (!authorsByRole[role].includes(name)) authorsByRole[role].push(name);
    }
  }

  comicData.scriptwriter = authorsByRole.scriptwriter;
  comicData.artist = authorsByRole.artist;
  comicData.inker = authorsByRole.inker;
  comicData.colorist = authorsByRole.colorist;
  comicData.otherAuthors = authorsByRole.otherAuthors;
  console.log('DEBUG extractor authorsByRole before return:', JSON.stringify(authorsByRole));
  console.log('DEBUG extractor structuredRoleMap:', JSON.stringify(structuredRoleMap));

  const mainAuthors = [
    ...authorsByRole.scriptwriter.slice(0, 1),
    ...authorsByRole.artist.slice(0, 1)
  ];
  comicData.author = mainAuthors.join(', ') || '';

  // Basic language detection (mirror controller heuristics)
  try {
    let language = '';
    const htmlLang = $('html').attr('lang');
    if (htmlLang) {
      if (htmlLang.toLowerCase().startsWith('es')) {
        language = 'Español (España)';
      } else {
        const langMap = { en: 'Inglés', es: 'Español', fr: 'Francés', de: 'Alemán', it: 'Italiano', pt: 'Portugués', nl: 'Holandés', ja: 'Japonés' };
        language = langMap[htmlLang.substring(0,2)] || htmlLang;
      }
    }
    // Heuristic text detection if not set
    const pageText = ($('body').text() || '').toLowerCase();
    const spanishWords = [' el ', ' la ', ' de ', ' que ', ' y ', ' para ', ' por ', '¿', '¡', 'qué', 'á', 'é', 'í', 'ó', 'ú'];
    const englishWords = [' the ', ' and ', ' of ', ' to ', ' in ', ' is ', ' that '];
    let sCount = 0, eCount = 0;
    for (const w of spanishWords) sCount += (pageText.split(w).length - 1);
    for (const w of englishWords) eCount += (pageText.split(w).length - 1);
    if (!language) {
      if (sCount > eCount) language = 'Español (España)';
      else if (eCount > sCount) language = 'Inglés';
    }
    comicData.language = language || '';
  } catch (e) {
    comicData.language = '';
  }

  return comicData;
};

// Minimal Marvel extraction stub: try to reuse simple metadata when needed
const extractDataFromMarvelFandom = (html, url) => {
  const $ = load(html);
  const comicData = {};
  let title = $('h1#firstHeading, h1.page-header__title').first().text().trim();
  if (!title) title = $('title').first().text().trim().split('|')[0].trim();
  comicData.title = title;
  comicData.series = title;
  comicData.issueNumber = null;
  comicData.description = '';
  comicData.coverImage = '';
  comicData.genre = [];
  comicData.language = '';
  comicData.publisher = '';
  comicData.whakoomUrl = url;
  comicData.usaNumbers = '';
  comicData.volumeInfo = {};
  return comicData;
};

const extractComicDataFromUrl = async (url) => {
  if (!url.includes('whakoom.com') && !url.includes('marvel.fandom.com/wiki/')) {
    throw new Error('URL no soportada. Usa un enlace de Whakoom o Marvel Fandom.');
  }
  let html;
  if (url.includes('whakoom.com')) {
    // For Whakoom prefer a simple direct fetch to avoid header-dependent HTML differences
    try {
      const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.google.com' }, timeout: 20000 });
      html = res.data;
    } catch (e) {
      // fallback to robust fetch
      html = await fetchHtml(url);
    }
  } else {
    html = await fetchHtml(url);
  }
  if (url.includes('marvel.fandom.com/wiki/')) {
    return extractDataFromMarvelFandom(html, url);
  }
  return await extractData(html, url);
};

export { extractComicDataFromUrl };
