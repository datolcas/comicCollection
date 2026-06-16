import { extractComicDataFromUrl } from '../src/controllers/whakoomExtractor.mjs';

(async () => {
  try {
    const url = 'https://www.whakoom.com/ediciones/634696/fichero_oficial_del_universo_marvel_marvel_omnibus-cartone_584_pp';
    const parsed = await extractComicDataFromUrl(url);
    console.log('EXTRACTED SERIES:', parsed.series);
    console.log('EXTRACTED TITLE:', parsed.title);
    console.log('EXTRACTED LANGUAGE:', parsed.language);
    console.log(JSON.stringify({ series: parsed.series, title: parsed.title, language: parsed.language }, null, 2));
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
    if (e && e.response && e.response.status) console.error('HTTP STATUS', e.response.status);
  }
})();
