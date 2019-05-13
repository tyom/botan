const axios = require('axios');
const Cryptr = require('cryptr');

if (!process.env.JSONSTORE_URL) {
  console.log(
    '`JSONSTORE_URL` env var must be set to store the application state.'
  );
  process.exit(1);
}
if (!process.env.JSONSTORE_ENCRYPT_KEY) {
  console.log(
    '`JSONSTORE_ENCRYPT_KEY` env var must be set to encrypt the state data.'
  );
  process.exit(1);
}

const api = axios.create({
  baseURL: process.env.JSONSTORE_URL,
});

const cryptr = new Cryptr(process.env.JSONSTORE_ENCRYPT_KEY);

async function getState(key) {
  try {
    const { data } = await api.get(`/${key}`);
    if (!data.ok) {
      console.log('JSONstore service may be down.');
      return;
    }
    const { encrypted } = data.result;
    return JSON.parse(cryptr.decrypt(encrypted));
  } catch (error) {
    console.log('Failed to get app state.');
  }
}

function setState(key, value) {
  return api.post(`/${key}`, {
    encrypted: cryptr.encrypt(JSON.stringify(value)),
  });
}

module.exports = {
  getState,
  setState,
};
