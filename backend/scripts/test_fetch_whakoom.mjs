import { extractComicDataFromUrl } from '../src/controllers/whakoomExtractor.mjs';

const url = 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp';

(async () => {
  try {
    console.log('Extractor function preview:\n', extractComicDataFromUrl.toString().slice(0,300));
    const data = await extractComicDataFromUrl(url);
    const debug = {
      scriptwriter: data.scriptwriter || [],
      artist: data.artist || [],
      inker: data.inker || [],
      colorist: data.colorist || [],
      otherAuthors: data.otherAuthors || []
    };
    console.log(JSON.stringify({ _debugAuthors: debug, title: data.title, series: data.series, issueNumber: data.issueNumber }, null, 2));
  } catch (e) {
    console.error('Error running test fetch:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
