import axios from 'axios';
import { load } from 'cheerio';
import { db } from '../server.js';

// Helper function to check for duplicate (same title + issue number)
const checkDuplicateComic = async (title, issueNumber) => {
  try {
    const query = db.collection('comics').where('title', '==', title);
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return false;
    }

    if (issueNumber) {
      const exactMatch = snapshot.docs.some(doc => doc.data().issueNumber === issueNumber);
      return exactMatch;
    }

    return true;
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return false;
  }
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
      validateStatus: () => true, // Don't throw on any status
    });
    
    if (response.status === 403) {
      const error = new Error(`HTTP ${response.status}`);
      error.response = { status: 403 };
      throw error;
    }
    
    return response.data;
  };

  // Strategy 1: Direct request with Google referer
  try {
    return await attemptFetch(createHeaders('https://www.google.com/'));
  } catch (error) {
    console.log('Strategy 1 failed');
  }

  // Strategy 2:Request with Marvel Fandom referer (with delay)
  try {
    return await attemptFetch(createHeaders('https://marvel.fandom.com/'), 1000);
  } catch (error) {
    console.log('Strategy 2 failed');
  }

  // Strategy 3: Try with en.wikipedia.org referer (sometimes works)
  try {
    return await attemptFetch(createHeaders('https://en.wikipedia.org/'), 1000);
  } catch (error) {
    console.log('Strategy 3 failed');
  }

  // Strategy 4: Request with URL's own domain as referer
  try {
    return await attemptFetch(createHeaders(url.split('/wiki/')[0] + '/'), 1000);
  } catch (error) {
    console.log('Strategy 4 failed');
  }

  throw new Error('Unable to fetch Marvel Fandom page: Access forbidden (403). Marvel Fandom may be blocking automated requests. Consider using a browser-based approach or checking if the page is publicly accessible.');
};

// Helper function to extract comic data from Whakoom URL
const extractComicDataFromUrl = async (url) => {
  try {
    if (!url.includes('whakoom.com') && !url.includes('marvel.fandom.com/wiki/')) {
      throw new Error('URL no soportada. Usa un enlace de Whakoom o Marvel Fandom.');
    }

    const html = await fetchHtml(url);

    if (url.includes('marvel.fandom.com/wiki/')) {
      return extractDataFromMarvelFandom(html, url);
    }

    return extractData(html, url);
  } catch (error) {
    throw error;
  }
};

const extractDataFromMarvelFandom = (html, url) => {
  const $ = load(html);
  const comicData = {};

  let title = $('h1#firstHeading, h1.page-header__title').first().text().trim();
  if (!title) {
    title = $('title').first().text().trim().split('|')[0].trim();
  }

  const pageText = $('body').text() || '';
  const normalizedText = pageText.replace(/\s+/g, ' ');

  // Extract volume number from title
  const volMatch = title.match(/Vol(?:ume)?\.?\s*(\d+)/i);
  const volumeNumber = volMatch ? volMatch[1] : null;

  // Extract year range from title
  const titleYearRangeMatch = title.match(/\((\d{4})\s*[–-]\s*(\d{4})\)/);
  let yearRange = titleYearRangeMatch ? `${titleYearRangeMatch[1]}–${titleYearRangeMatch[2]}` : '';

  // Parse the Marvel Database volume metadata section if present
  const metadata = {};
  $('.md-volume__column').each((i, col) => {
    $(col).find('div').each((j, div) => {
      const label = $(div).find('span').first().text().trim().replace(/:$/, '');
      let value = $(div).clone().children('span').remove().end().text().trim();
      if (value.startsWith(`${label}:`)) {
        value = value.slice(label.length + 1).trim();
      }
      if (label && value) {
        metadata[label.toLowerCase()] = value;
      }
    });
  });

  let publisher = metadata['publisher'] || '';
  let publicationDateText = metadata['publication date'] || '';
  const marvelUnlimitedText = metadata['marvel unlimited'] || '';
  let issueCount = null;

  if (marvelUnlimitedText) {
    const match = marvelUnlimitedText.match(/(\d+)\s+of\s+(\d+)\s+issues/i);
    if (match) {
      issueCount = parseInt(match[2], 10);
    } else {
      const matchSimple = marvelUnlimitedText.match(/(\d+)\s+issues/i);
      if (matchSimple) {
        issueCount = parseInt(matchSimple[1], 10);
      }
    }
  }

  if (!issueCount) {
    const categoryIssues = $('.md-volume__categories a').map((i, el) => $(el).text()).get().find(text => /\d+ issues?/i.test(text));
    if (categoryIssues) {
      const categoryMatch = categoryIssues.match(/(\d+)\s+issues?/i);
      if (categoryMatch) {
        issueCount = parseInt(categoryMatch[1], 10);
      }
    }
  }

  if (!yearRange && publicationDateText) {
    const dateRangeMatch = publicationDateText.match(/(\d{4})\D+(\d{4})/);
    if (dateRangeMatch) {
      yearRange = `${dateRangeMatch[1]}–${dateRangeMatch[2]}`;
    } else {
      const years = publicationDateText.match(/(\d{4})/g);
      if (years && years.length >= 2) {
        yearRange = `${years[0]}–${years[1]}`;
      }
    }
  }

  if (!publisher) {
    publisher = $('a[href*="/wiki/Marvel_Comics"]').first().text().trim() || publisher;
  }

  let description = '';
  const descriptionParagraphs = $('.mw-parser-output > p').map((i, el) => {
    const text = $(el).text().trim();
    return text.length > 50 && !text.toLowerCase().includes('disambiguation') ? text : null;
  }).get();
  description = descriptionParagraphs.find(p => p) || '';

  if (!description) {
    const metaDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
    if (metaDescription) {
      description = String(metaDescription).trim();
    }
  }

  let coverImage = '';
  const ldJsonScripts = $('script[type="application/ld+json"]').map((i, el) => {
    try {
      return JSON.parse($(el).contents().text());
    } catch (err) {
      return null;
    }
  }).get().filter(Boolean);

  const articleJsonLd = ldJsonScripts.find((item) => item && item['@type'] === 'Article');
  if (articleJsonLd) {
    const imageValue = articleJsonLd.mainEntity?.image || articleJsonLd.image || articleJsonLd.thumbnailUrl;
    if (imageValue) {
      if (typeof imageValue === 'string') {
        coverImage = imageValue;
      } else if (Array.isArray(imageValue)) {
        coverImage = imageValue[0];
      } else if (typeof imageValue === 'object') {
        coverImage = imageValue.url || '';
      }
    }
  }

  if (!coverImage) {
    const coverImg = $('img[alt*="cover"], img[alt*="Cover"], img.thumbimage, .pi-image img, .md-volume__logo img').first();
    if (coverImg.length) {
      coverImage = coverImg.attr('src') || coverImg.attr('data-src') || '';
    }
  }

  if (coverImage && coverImage.startsWith('//')) {
    coverImage = `https:${coverImage}`;
  }

  let language = '';
  const htmlLang = $('html').attr('lang');
  if (htmlLang) {
    const langMap = {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      it: 'Italiano',
      pt: 'Português',
      nl: 'Nederlands',
      ja: '日本語',
    };
    language = langMap[htmlLang.substring(0, 2)] || htmlLang;
  }

  const seriesTitle = title.replace(/\s*\(\d{4}[–-]\d{4}\)$/, '').trim();
  comicData.title = title;
  comicData.series = yearRange ? `${seriesTitle} (${yearRange})` : seriesTitle;
  comicData.issueNumber = null;
  comicData.description = description;
  comicData.coverImage = coverImage || '';
  comicData.genre = [];
  comicData.language = language || '';
  comicData.publisher = publisher;
  comicData.whakoomUrl = url;
  comicData.usaNumbers = seriesTitle;
  comicData.volumeInfo = {
    title: seriesTitle,
    yearRange: yearRange || null,
    volumeNumber: volumeNumber || null,
    totalIssues: issueCount || null,
    sourceUrl: url,
  };

  return comicData;
};

// Helper function to do the actual data extraction from HTML
const extractData = (html, url) => {
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

  // Series & Issue Number
  const h1 = $('h1').first();
  const h1FullText = h1.text().trim();
  let extractedSeries = '';
  let extractedIssueLocal = null;
  let extractedIssueUsa = null;

  const normalizeIssueText = text => {
    if (!text) return null;
    const trimmed = text.trim();
    const issueMatch = trimmed.match(/#?\s*(\d+)\s*\/\s*(\d+)/);
    if (issueMatch) {
      return {
        local: parseInt(issueMatch[1], 10),
        usa: issueMatch[2]
      };
    }
    const localMatch = trimmed.match(/#?\s*(\d+)/);
    if (localMatch) {
      return { local: parseInt(localMatch[1], 10) };
    }
    return null;
  };

  // Prefer the H1 <strong> structure when available.
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
    // Try multiple H1 patterns: '#121/12', '#121', '121/12', or '... #121 (texto)'
    let m = null;
    m = h1FullText.match(/^(.+?)\s*#\s*(\d+)\s*\/\s*(\d+)/); // series #local/usa
    if (m) {
      extractedSeries = m[1].trim();
      extractedIssueLocal = parseInt(m[2], 10);
      extractedIssueUsa = m[3];
    } else {
      m = h1FullText.match(/^(.+?)\s*#\s*(\d+)/); // series #local
      if (m) {
        extractedSeries = m[1].trim();
        extractedIssueLocal = parseInt(m[2], 10);
      } else {
        m = h1FullText.match(/^(.+?)\s*(\d+)\s*\/\s*(\d+)/); // series local/usa without '#'
        if (m) {
          extractedSeries = m[1].trim();
          extractedIssueLocal = parseInt(m[2], 10);
          extractedIssueUsa = m[3];
        } else {
          // Fallback: any '#123' or trailing number
          m = h1FullText.match(/^(.+?)\s*#?\s*(\d+)$/);
          if (m) {
            extractedSeries = m[1].trim();
            extractedIssueLocal = parseInt(m[2], 10);
          }
        }
      }
    }
  }

  // If we couldn't get series/issue from the H1, try to infer from the URL
  const urlParts = (url || '').split('/').filter(p => p.length > 0);
  const lastSegment = urlParts[urlParts.length - 1] || '';
  const seriesSlug = urlParts[urlParts.length - 2] || '';
  const isEditionPage = /\/ediciones?\//i.test(url);

  // Infer series from slug like 'green_lantern_2012-2022', but avoid guessing for edition pages
  let inferredSeries = '';
  if (!isEditionPage) {
    const seriesMatch = seriesSlug.match(/(.+?)_(\d{4}-\d{4})$/);
    if (seriesMatch) {
      const rawName = seriesMatch[1].replace(/_/g, ' ');
      const years = seriesMatch[2];
      inferredSeries = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ` (${years})`;
    } else if (seriesSlug) {
      inferredSeries = seriesSlug.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  comicData.series = extractedSeries || inferredSeries || '';

  // Determine issue numbers: prefer H1 values, otherwise use URL last segment only when the segment is purely numeric
  let finalLocal = extractedIssueLocal || null;
  if (!finalLocal && !isEditionPage) {
    const numMatch = (lastSegment || '').match(/^(\d+)$/);
    if (numMatch) finalLocal = parseInt(numMatch[1], 10);
  }

  // usa number preference: H1 extracted or description-parsed later
  let finalUsa = extractedIssueUsa || null;

  // Store local as plain string (e.g. '121' or '121/12'); display logic adds '#' where needed
  comicData.issueNumber = finalLocal ? `${finalLocal}` : null;

  // If title looks like a guide, duplicates the series, or is a generic editorial page title, clear it
  if (comicData.title) {
    const tLower = comicData.title.toLowerCase();
    const sLower = (comicData.series || '').toLowerCase();
    const genericTitlePattern = /premium|títulos de la editorial|titulos de la editorial|editorial|catálogo|colección/i;

    if (comicData.title === 'Untitled Comic' ||
        tLower.includes('guia') || tLower.includes('guía') || tLower.includes('guia de lectura') ||
        (sLower && (tLower === sLower || tLower.startsWith(sLower))) ||
        genericTitlePattern.test(tLower)) {
      comicData.title = '';
    }
  }

  // Authors (multi-format support)
  const authorsByRole = {
    scriptwriter: [],
    artist: [],
    inker: [],
    colorist: [],
    otherAuthors: []
  };
  
  let foundAuthors = false;
  
  // Method 1: Try structured HTML format (old pages)
  const authorsSection = $('h3:contains("Autores"), h2:contains("Autores"), strong:contains("Autores")').first();
  if (authorsSection.length) {
    const authorsParagraph = authorsSection.nextAll('p').first().html();
    
    if (authorsParagraph) {
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
  }
  
  // Method 2: If not found, search for author links in the page (markdown-style format)
  if (!foundAuthors) {
    const pageText = $('body').text() || $('html').text() || '';
    const authorLinks = [];
    
    $('a[href*="/autores/"]').each((i, el) => {
      const authorName = $(el).text().trim();
      if (authorName && authorName.length > 0 && authorName.length < 50) {
        authorLinks.push(authorName);
      }
    });
    
    if (authorLinks.length > 0) {
      foundAuthors = true;
      
      authorLinks.forEach(name => {
        // Check what role this author has by looking at surrounding text in the page
        const nameIndex = pageText.indexOf(name);
        const contextBefore = pageText.substring(Math.max(0, nameIndex - 50), nameIndex);
        const contextAfter = pageText.substring(nameIndex, Math.min(pageText.length, nameIndex + 100));
        const context = (contextBefore + ' ' + contextAfter).toLowerCase();
        
        // Determine role based on context
        if (context.includes('script') || context.includes('guion')) {
          authorsByRole.scriptwriter.push(name);
        } else if (context.includes('drawing') || context.includes('dibujo') || context.includes('art')) {
          authorsByRole.artist.push(name);
        } else if (context.includes('ink') || context.includes('tinta')) {
          authorsByRole.inker.push(name);
        } else if (context.includes('color')) {
          authorsByRole.colorist.push(name);
        } else {
          authorsByRole.otherAuthors.push(name);
        }
      });
    }
  }
  
  comicData.scriptwriter = authorsByRole.scriptwriter;
  comicData.artist = authorsByRole.artist;
  comicData.inker = authorsByRole.inker;
  comicData.colorist = authorsByRole.colorist;
  comicData.otherAuthors = authorsByRole.otherAuthors;
  
  const mainAuthors = [
    ...authorsByRole.scriptwriter.slice(0, 1),
    ...authorsByRole.artist.slice(0, 1)
  ];
  comicData.author = mainAuthors.join(', ') || '';

  // Publisher
  const publisherLink = $('a[href*="/editor/"], a[href*="/publisher/"]').first();
  comicData.publisher = publisherLink.text().trim() || '';

  // Language
  let language = '';
  const pageText = $('body').text() || $('html').text() || '';
  const languageMatch = pageText.match(/(?:Idioma|Language|Langue)[:\s]+([^\n]+)/i);
  if (languageMatch) {
    language = languageMatch[1].trim().split(/[,\n]/)[0].trim();
  }
  
  if (!language) {
    const htmlLang = $('html').attr('lang');
    if (htmlLang) {
      const langMap = {
        'es': 'Español', 'en': 'Inglés', 'fr': 'Francés', 'de': 'Alemán',
        'it': 'Italiano', 'pt': 'Portugués', 'nl': 'Holandés', 'ja': 'Japonés'
      };
      language = langMap[htmlLang.substring(0, 2)] || '';
    }
  }
  
  comicData.language = language;

  // Publication Date (simplified month mapping)
  let publicationDate = null;
  const fullPageText = $('body').text() || $('html').text() || '';
  
  const monthNames = {
    'enero|january|janvier|januar': 'enero',
    'febrero|february|février|februar': 'febrero',
    'marzo|march|mars': 'marzo',
    'abril|april|avril': 'abril',
    'mayo|may|mai': 'mayo',
    'junio|june|juin': 'junio',
    'julio|july|juillet': 'julio',
    'agosto|august|août': 'agosto',
    'septiembre|september|septembre': 'septiembre',
    'octubre|october|octobre': 'octubre',
    'noviembre|november|novembre': 'noviembre',
    'diciembre|december|décembre': 'diciembre'
  };
  
  // Try multiple date patterns
  let dateMatch = fullPageText.match(/Fecha de publicación[:\s]+([\w\s]+)\s+(\d{4})/i);
  
  if (!dateMatch) {
    // Pattern: "Month Day, Year" (e.g., "October 15, 2015")
    dateMatch = fullPageText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*(\d{4})/i);
  }
  
  if (!dateMatch) {
    dateMatch = fullPageText.match(/(?:Release Date|Published|Publication Date)[:\s]*([A-Za-z]+)\s+\d{1,2},?\s*(\d{4})/i);
  }
  
  if (!dateMatch) {
    // Pattern: "Day Month, Year" (e.g., "15 octubre, 2015")
    dateMatch = fullPageText.match(/(\d{1,2})\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december),?\s+(\d{4})/i);
  }
  
  if (!dateMatch) {
    // Pattern: "Month Year" (e.g., "October 2015")
    dateMatch = fullPageText.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);
  }
  
  if (dateMatch) {
    let monthStr, year;
    
    // Handle different capture group scenarios
    if (dateMatch.length === 4 && !isNaN(parseInt(dateMatch[1]))) {
      // Pattern: "/(\d{1,2})\s+(month),?\s+(\d{4})/" -> groups are [full, day, month, year]
      monthStr = dateMatch[2];
      year = dateMatch[3];
    } else if (dateMatch.length === 3) {
      // Pattern: "/(Month)\s+\d{1,2},?\s*(\d{4})/" -> groups are [full, month, year]
      monthStr = dateMatch[1];
      year = dateMatch[2];
    } else {
      monthStr = dateMatch[1];
      year = dateMatch[dateMatch.length - 1];
    }
    
    monthStr = monthStr.toLowerCase().trim();
    
    let monthAbbr = '';
    for (const [months, abbr] of Object.entries(monthNames)) {
      if (new RegExp(months, 'i').test(monthStr)) {
        monthAbbr = abbr;
        break;
      }
    }
    
    publicationDate = monthAbbr ? `${monthAbbr} ${year}` : `${monthStr} ${year}`;
  }
  
  comicData.publicationDate = publicationDate || null;

  // Description
  let description = '';
  const wikiText = $('.wiki-text').first();
  if (wikiText.length) {
    const paragraphs = wikiText.find('p').map((i, el) => $(el).text().trim()).get();
    description = paragraphs.join('\n');
  }
  
  if (!description) {
    const descSelectors = ['.description', '.synopsis', '[itemprop="description"]', '.desc', 'p.description'];
    for (const selector of descSelectors) {
      const elem = $(selector).first();
      if (elem.length) {
        description = elem.text().trim();
        if (description) break;
      }
    }
  }
  
  comicData.description = description;

  // Cover Image
  let coverImage = null;
  const coverImg = $('p.comic-cover img').first();
  if (coverImg.length) {
    coverImage = coverImg.attr('src');
  }
  
  if (!coverImage) {
    const fancyboxImg = $('a.fancybox img').first();
    if (fancyboxImg.length) {
      coverImage = fancyboxImg.attr('src');
    }
  }
  
  if (coverImage) {
    coverImage = coverImage.replace('/small/', '/large/').replace('/thumb/', '/large/');
    
    if (!coverImage.startsWith('http')) {
      if (coverImage.startsWith('/')) {
        coverImage = 'https://www.whakoom.com' + coverImage;
      } else {
        try {
          const baseUrl = new URL(url);
          coverImage = new URL(coverImage, baseUrl).href;
        } catch (e) {
          coverImage = coverImage;
        }
      }
    }
  }
  
  comicData.coverImage = coverImage || '';

  // Genre
  const genreElements = $('a[href*="/genre/"], .tag, .badge-genre');
  const genres = [];
  genreElements.each((i, el) => {
    const genre = $(el).text().trim();
    if (genre && genre.length > 0 && genre.length < 30) {
      genres.push(genre);
    }
  });
  comicData.genre = [...new Set(genres)];

  // Rating
  const ratingElement = $('.rating, [itemprop="ratingValue"]').first();
  const ratingText = ratingElement.text();
  const ratingMatch = ratingText.match(/(\d+[\.,]?\d*)/);
  if (ratingMatch) {
    comicData.rating = Math.min(5, parseFloat(ratingMatch[1].replace(',', '.')));
  }

  comicData.whakoomUrl = url;

  // USA Numbers extraction with improved patterns
  let usaNumbers = '';
  if (comicData.description) {
    const normalizedDescription = comicData.description.replace(/\r\n|\r/g, '\n');

    // Try explicit patterns like "Green Lantern núm. 12 USA"
    let match = normalizedDescription.match(/([A-Za-zÀ-ÿ0-9\s.&'()]+?)\s*(?:núm\.|n\.|num\.|#)\s*(\d+)\s*USA/i);
    if (match) {
      const seriesName = match[1].trim();
      const num = match[2];
      usaNumbers = `${seriesName} núm. ${num} USA`;
    }

    // Fallback: look for 'EDICIÓN ORIGINAL: ... USA' lines
    if (!usaNumbers) {
      match = normalizedDescription.match(/EDICIÓN ORIGINAL:\s*([^\n]*?USA[^\n]*)/i);
      if (match) {
        usaNumbers = match[1].trim();
      }
    }

    // Fallback: look for content lines beginning with 'Contiene' or 'Contains'
    if (!usaNumbers) {
      match = normalizedDescription.match(/(?:Contiene|Contains)\s*:\s*([^\n]+)/i);
      if (match) {
        usaNumbers = match[1].trim();
      }
    }

    // Older fallback patterns with explicit 'USA'
    if (!usaNumbers) {
      match = normalizedDescription.match(/Contiene\s*:??\s*([^\n]*?)\s*USA/i);
      if (match) {
        usaNumbers = match[1].trim();
      }
    }

    // Final generic fallback: any '... #12' pattern
    if (!usaNumbers) {
      match = normalizedDescription.match(/([A-Za-z\s.&'()vV0-9-]+?)\s*#(\d+)(?:[-–—](\d+))?/);
      if (match) {
        usaNumbers = match[0];
      }
    }
  }

  if (usaNumbers) {
    usaNumbers = usaNumbers.replace(/\s+/g, ' ').trim();
  }

  // Extract numeric USA number if present, preferring H1 USA values when available.
  let usaNumOnly = finalUsa || null;
  if (!usaNumOnly) {
    const usaMatchNum = usaNumbers && usaNumbers.match(/(\d+)/);
    if (usaMatchNum) usaNumOnly = usaMatchNum[1];
  }

  // If we have both a local issue number (from URL/H1) and a USA number, combine as '121/12'
  if (comicData.issueNumber && usaNumOnly) {
    comicData.issueNumber = `${comicData.issueNumber}/${usaNumOnly}`;
  }

  comicData.usaNumbers = usaNumbers || '';

  // If we didn't recover a title from Whakoom, use series + issue number as fallback.
  if (!comicData.title || !comicData.title.trim()) {
    const issueNumberValue = comicData.issueNumber ? String(comicData.issueNumber).replace(/^#/, '') : '';
    const issueText = issueNumberValue ? ` #${issueNumberValue}` : '';
    if (comicData.series) {
      comicData.title = `${comicData.series}${issueText}`;
    }
  }

  return comicData;
};

export const fetchComicFromUrl = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    const comicData = await extractComicDataFromUrl(url);
    res.json(comicData);
  } catch (error) {
    console.error('Error fetching comic data:', error.message);
    res.status(500).json({
      message: 'Error fetching comic data from URL',
      error: error.message,
    });
  }
};

// New endpoint: Load multiple comics from a list of Whakoom URLs
export const loadComicsFromList = async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ 
        message: 'Se requiere un array "urls" con al menos una URL de Whakoom' 
      });
    }

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const results = {
      successful: [],
      failed: [],
      duplicates: [],
      total: urls.length
    };

    // Helper: Send SSE message
    const sendEvent = (type, data) => {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial status
    sendEvent('start', { 
      message: 'Iniciando carga de cómics',
      total: urls.length 
    });

    // Helper: Check for duplicate
    const checkDuplicate = async (title, issueNumber) => {
      try {
        const query = db.collection('comics').where('title', '==', title);
        const snapshot = await query.get();
        if (snapshot.empty) return false;
        if (issueNumber) {
          return snapshot.docs.some(doc => doc.data().issueNumber === issueNumber);
        }
        return true;
      } catch (error) {
        return false;
      }
    };

    // Helper: Create comic in DB
    const createComicInDB = async (comicData) => {
      const docRef = await db.collection('comics').add({
        ...comicData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { _id: docRef.id, ...comicData };
    };

    // Process each URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim();
      
      if (!url) {
        const failedItem = { index: i, url: url, error: 'URL vacía' };
        results.failed.push(failedItem);
        sendEvent('item_failed', { 
          ...failedItem, 
          progress: i + 1,
          total: urls.length 
        });
        continue;
      }

      if (!url.includes('whakoom.com')) {
        const failedItem = { 
          index: i, 
          url: url, 
          error: 'No es una URL de Whakoom válida' 
        };
        results.failed.push(failedItem);
        sendEvent('item_failed', { 
          ...failedItem, 
          progress: i + 1,
          total: urls.length 
        });
        continue;
      }

      try {
        // Send processing event
        sendEvent('processing', { 
          message: `Procesando: ${url}`,
          index: i,
          progress: i + 1,
          total: urls.length 
        });

        // Use the complete extraction function
        const comicData = await extractComicDataFromUrl(url);

        // Check for duplicate
        const isDuplicate = await checkDuplicate(comicData.title, comicData.issueNumber);
        if (isDuplicate) {
          const duplicateItem = {
            index: i,
            url: url,
            title: comicData.title,
            issueNumber: comicData.issueNumber,
            message: 'Ya existe en la colección'
          };
          results.duplicates.push(duplicateItem);
          sendEvent('item_duplicate', {  
            ...duplicateItem,
            progress: i + 1,
            total: urls.length 
          });
          continue;
        }

        // Create in database
        const createdComic = await createComicInDB(comicData);
        const successItem = {
          index: i,
          url: url,
          title: createdComic.title,
          series: createdComic.series,
          issueNumber: createdComic.issueNumber,
          _id: createdComic._id
        };
        results.successful.push(successItem);
        sendEvent('item_success', { 
          ...successItem,
          progress: i + 1,
          total: urls.length 
        });

      } catch (error) {
        const failedItem = {
          index: i,
          url: url,
          error: error.message
        };
        results.failed.push(failedItem);
        sendEvent('item_failed', { 
          ...failedItem,
          progress: i + 1,
          total: urls.length 
        });
      }

      // Add delay between requests
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    const summary = `Carga completada: ${results.successful.length} exitosos, ` +
                    `${results.duplicates.length} duplicados, ${results.failed.length} fallidos`;

    // Send final completion event
    sendEvent('complete', { 
      message: summary, 
      results 
    });

    // Close the stream
    res.end();

  } catch (error) {
    console.error('Error loading comics desde lista:', error.message);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({
      message: 'Error cargando cómics desde lista',
      error: error.message
    })}\n\n`);
    res.end();
  }
};

const getVolumeDataFromUrl = async (url) => {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required');
  }

  if (!url.includes('marvel.fandom.com/wiki/')) {
    throw new Error('Solo se admiten enlaces de Marvel Fandom para volúmenes USA');
  }

  const html = await fetchHtml(url);
  const parsed = extractDataFromMarvelFandom(html, url);
  return {
    title: parsed.volumeInfo.title || parsed.series || '',
    yearRange: parsed.volumeInfo.yearRange || null,
    volumeNumber: parsed.volumeInfo.volumeNumber || null,
    totalIssues: parsed.volumeInfo.totalIssues || null,
    sourceUrl: url,
    description: parsed.description || '',
    coverImage: parsed.coverImage || '',
    publisher: parsed.publisher || '',
    language: parsed.language || '',
  };
};

export const fetchVolumeFromUrl = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    const volumeData = await getVolumeDataFromUrl(url);
    res.json(volumeData);
  } catch (error) {
    console.error('Error fetching volume data:', error.message);
    res.status(500).json({
      message: 'Error fetching volume data from URL',
      error: error.message,
    });
  }
};

export const createOrUpdateUsVolume = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    const volumeData = await getVolumeDataFromUrl(url);
    const volumesRef = db.collection('usaVolumes');

    let existingVolume = null;
    const existingByUrl = await volumesRef.where('sourceUrl', '==', url).get();
    if (!existingByUrl.empty) {
      existingVolume = existingByUrl.docs[0];
    } else {
      const existingByTitle = await volumesRef.where('title', '==', volumeData.title).get();
      if (!existingByTitle.empty) {
        existingVolume = existingByTitle.docs[0];
      }
    }

    if (existingVolume) {
      await volumesRef.doc(existingVolume.id).update({
        ...volumeData,
        updatedAt: new Date(),
      });

      return res.json({
        _id: existingVolume.id,
        ...volumeData,
        updated: true,
      });
    }

    const docRef = await volumesRef.add({
      ...volumeData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({
      _id: docRef.id,
      ...volumeData,
      created: true,
    });
  } catch (error) {
    console.error('Error creating/updating volume:', error.message);
    res.status(500).json({
      message: 'Error creating or updating US volume',
      error: error.message,
    });
  }
};

export const getUsVolumes = async (req, res) => {
  try {
    const volumesSnapshot = await db.collection('usaVolumes').orderBy('title').get();
    const volumes = volumesSnapshot.docs.map((doc) => ({ _id: doc.id, ...doc.data() }));
    res.json(volumes);
  } catch (error) {
    console.error('Error fetching USA volumes:', error.message);
    res.status(500).json({
      message: 'Error fetching USA volumes',
      error: error.message,
    });
  }
};

export const updateUsVolume = async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body;
    if (!id) {
      return res.status(400).json({ message: 'Volume ID is required' });
    }
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    const volumeData = await getVolumeDataFromUrl(url);
    await db.collection('usaVolumes').doc(id).update({
      ...volumeData,
      updatedAt: new Date(),
    });

    res.json({ _id: id, ...volumeData, updated: true });
  } catch (error) {
    console.error('Error updating USA volume:', error.message);
    res.status(500).json({
      message: 'Error updating USA volume',
      error: error.message,
    });
  }
};

export const deleteUsVolume = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Volume ID is required' });
    }

    await db.collection('usaVolumes').doc(id).delete();
    res.json({ _id: id, deleted: true });
  } catch (error) {
    console.error('Error deleting USA volume:', error.message);
    res.status(500).json({
      message: 'Error deleting USA volume',
      error: error.message,
    });
  }
};

export const getVolumeIssueList = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: 'Volume URL is required' });
    }

    const html = await fetchHtml(url);
    const issues = extractIssuesFromVolumePage(html, url);
    
    res.json({ issues });
  } catch (error) {
    console.error('Error fetching volume issues:', error.message);
    res.status(500).json({
      message: 'Error fetching volume issues',
      error: error.message,
    });
  }
};

// Helper function to extract all individual issues from a Marvel Fandom volume page
const extractIssuesFromVolumePage = (html, url) => {
  const $ = load(html);
  const issues = [];

  // Strategy 1: Look for issue tables or links in the page
  // Check for any table that might contain issue information
  $('table').each((tableIdx, table) => {
    const $table = $(table);
    const headerCells = $table.find('thead th, tr:first th');
    
    // Check if this looks like an issue table with publication/cover dates
    const headerTexts = headerCells.map((i, el) => $(el).text().toLowerCase()).get();
    const hasIssueInfo = headerTexts.some(text => 
      text.includes('issue') || text.includes('number') || text.includes('no.') || 
      text.includes('title') || text.includes('date') || text.includes('publication')
    );

    if (hasIssueInfo || $table.find('tbody tr').length > 0) {
      $table.find('tbody tr, tr:not(:has(th))').each((rowIdx, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length >= 2) {
          const issue = {
            legacyNumber: null,
            title: '',
            publicationDate: '',
            coverDate: '',
          };

          // Try to extract issue number (usually first or second column)
          let numberFound = false;
          cells.each((idx, cell) => {
            const cellText = $(cell).text().trim();
            
            // Look for issue number patterns like "#123" or "123"
            if (!numberFound) {
              const numMatch = cellText.match(/^#?(\d+)$/);
              if (numMatch) {
                issue.legacyNumber = parseInt(numMatch[1], 10);
                numberFound = true;
              }
            }
          });

          // Extract other information from cells
          if (cells.length >= 1 && !issue.legacyNumber) {
            const firstCellText = $(cells[0]).text().trim();
            const numMatch = firstCellText.match(/#?(\d+)/);
            if (numMatch) {
              issue.legacyNumber = parseInt(numMatch[1], 10);
            }
          }

          // Try to get title (usually second column or a link)
          const titleLink = $row.find('a[href*="/wiki/"]').first();
          if (titleLink.length) {
            const linkText = titleLink.text().trim();
            if (linkText && !linkText.match(/^#?\d+$/)) {
              issue.title = linkText;
            }
          }

          // Look for dates in the cells
          cells.each((idx, cell) => {
            const cellText = $(cell).text().trim();
            // Match date patterns like "November, 1961" or "Nov 1961" or "1961-11"
            const dateMatch = cellText.match(/([A-Za-z]+\.?\s+)?(\d{1,2},?\s+)?(\d{4})|(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              if (!issue.publicationDate) {
                issue.publicationDate = cellText;
              } else if (!issue.coverDate) {
                issue.coverDate = cellText;
              }
            }
          });

          if (issue.legacyNumber) {
            issues.push(issue);
          }
        }
      });
    }
  });

  // Strategy 2: If no table found, try to extract from DPL (Dynamic Page List) or other structures
  if (issues.length === 0) {
    // Look for issue links that follow patterns like "/wiki/Comic_Title_Vol_X_Issue_Y"
    const issueLinks = $('a[href*="/wiki/"]').map((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      
      // Look for issue number in text or URL
      const textMatch = text.match(/#\s*(\d+)/);
      const urlMatch = href.match(/Issue_(\d+)|#(\d+)/i);
      
      if (textMatch || urlMatch) {
        const issueNum = textMatch ? parseInt(textMatch[1], 10) : (urlMatch ? parseInt(urlMatch[1] || urlMatch[2], 10) : null);
        if (issueNum && !issues.some(issue => issue.legacyNumber === issueNum)) {
          return {
            legacyNumber: issueNum,
            title: text.replace(/#\s*\d+/, '').trim(),
            publicationDate: '',
            coverDate: '',
          };
        }
      }
      return null;
    }).get().filter(Boolean);

    // Remove duplicates and sort
    const uniqueIssues = [];
    const seen = new Set();
    issueLinks.forEach(issue => {
      if (!seen.has(issue.legacyNumber)) {
        uniqueIssues.push(issue);
        seen.add(issue.legacyNumber);
      }
    });

    issues.push(...uniqueIssues.sort((a, b) => a.legacyNumber - b.legacyNumber));
  }

  // Sort issues by number
  return issues.sort((a, b) => (a.legacyNumber || 0) - (b.legacyNumber || 0));
};
