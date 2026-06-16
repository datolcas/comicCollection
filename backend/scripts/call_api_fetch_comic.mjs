import axios from 'axios';

const url = 'https://www.whakoom.com/ediciones/529737/la_balada_de_halo_jones-cartone_228_pp';

const call = async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/comics/fetch-from-url', { url }, { timeout: 60000 });
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Error response:', err.response.status, err.response.data);
    } else {
      console.error('Request error:', err.message);
    }
  }
};

call();
