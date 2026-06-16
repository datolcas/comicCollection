import fetch from 'node-fetch';

const url = 'http://localhost:5000/api/comics/fetch-from-url';
const body = { url: 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp' };

(async ()=>{
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log('HTTP', res.status);
    const txt = await res.text();
    console.log(txt);
  } catch (e) {
    console.error('Fetch error', e.message);
  }
})();
