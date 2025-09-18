import { getStore } from '@netlify/blobs';
import csv from 'csv-parser';
import { Readable } from 'stream';

export async function handler() {
  try {
    // Get the contacts blob
    const store = getStore('contacts');
    const blob = await store.get('contacts.csv');
    if (!blob) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'contacts.csv not found in blobs' })
      };
    }

    // Convert buffer → stream
    const buffer = Buffer.from(blob);
    const records = [];
    await new Promise((resolve, reject) => {
      Readable.from(buffer.toString())
        .pipe(csv())
        .on('data', (row) => {
          // Apply transformations here
          const lastVisit = formatLastVisit(row['Last Purchase']);
          const badges = {
            military: isYes(row['Military']),
            responder: isYes(row['First Responder']),
            locker: isYes(row['Locker'])
          };

          records.push({
            first: row['First Name'] || '',
            last: row['Last Name'] || '',
            points: row['Rewards'] || 0,
            lastVisit,
            badges
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, source: 'blobs-csv', data: records })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}

// --- Helpers ---
function isYes(value) {
  if (!value) return false;
  return ['y', 'yes', 'true', '1', 'x'].includes(value.toString().toLowerCase());
}

function formatLastVisit(dateStr) {
  if (!dateStr) return '—';
  const visitDate = new Date(dateStr);
  if (isNaN(visitDate)) return '—';

  const now = new Date();
  const diffMonths =
    (now.getFullYear() - visitDate.getFullYear()) * 12 +
    (now.getMonth() - visitDate.getMonth());

  if (diffMonths < 6) {
    return `${visitDate.getMonth() + 1}/${visitDate.getDate()}`;
  } else if (diffMonths < 12) {
    return visitDate.toLocaleString('default', { month: 'long' });
  } else if (diffMonths < 24) {
    return 'Year+';
  } else {
    return `${visitDate.getFullYear()}`;
  }
}
