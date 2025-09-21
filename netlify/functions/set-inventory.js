const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  try {
    const contentType = event.headers['content-type'] || '';
    let csv = '';
    if (contentType.includes('application/json')) {
      const parsed = JSON.parse(event.body || '{}');
      csv = parsed.csv || '';
    } else {
      csv = event.body || '';
    }

    if (!csv.trim()) {
      return {
        statusCode: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'EMPTY_CSV' }),
      };
    }

    const store = getStore('inventory');
    await store.set('inventory.csv', csv, { contentType: 'text/csv' });

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, bytes: csv.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(err.message || err) }),
    };
  }
};
