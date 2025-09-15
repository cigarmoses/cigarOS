// ESM function – returns full contacts JSON
import { getStore } from '@netlify/blobs';

export default async () => {
  try {
    const store = getStore('contacts');            // namespace: contacts
    const raw = await store.get('contacts.json');  // single JSON blob
    const data = raw ? JSON.parse(raw) : [];
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'get-contacts failed', detail: String(e) }), { status: 500 });
  }
}
