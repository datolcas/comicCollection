let axios;
try {
  axios = require('../backend/node_modules/axios');
} catch (e) {
  axios = require('axios');
}

const BASE = 'http://localhost:5000';

async function main() {
  try {
    console.log('Fetching one comic...');
    const r = await axios.get(`${BASE}/api/comics?limit=1`);
    let comic;
    if (Array.isArray(r.data)) {
      comic = r.data[0];
    } else if (r.data && Array.isArray(r.data.data)) {
      comic = r.data.data[0];
    }

    if (!comic || !comic._id) {
      console.log('No comic available to create a lectura. Aborting test.');
      return;
    }

    console.log('Using comic:', comic._id || comic.id || comic.title);

    const payload = {
      comic,
      startDate: new Date().toISOString(),
    };

    console.log('Creating lectura...');
    const res = await axios.post(`${BASE}/api/lecturas`, payload, { timeout: 10000 });
    console.log('Lectura created, status:', res.status);
    console.log('Response data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Request failed:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

main();
