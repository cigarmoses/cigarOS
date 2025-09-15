import { getStore } from '@netlify/blobs';

export default async (req) => {
  try {
    const admin = req.headers.get('x-admin-token');
    if (!admin || admin !== process.env.ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }
    const { contactId, delta = 0 } = await req.json();

    const store = getStore('contacts');
    const raw = await store.get('contacts.json');
    const list = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(c => c.id == contactId);
    if (idx < 0) return new Response(JSON.stringify({ error: 'contact not found' }), { status: 404 });

    list[idx].points = Number(list[idx].points || 0) + Number(delta);
    await store.set('contacts.json', JSON.stringify(list));
    return new Response(JSON.stringify({ ok: true, contact: list[idx] }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'update-points failed', detail: String(e) }), { status: 500 });
  }
}
