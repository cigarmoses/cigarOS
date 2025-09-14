import { getStore } from '@netlify/blobs';

const OK = (x) => new Response(JSON.stringify(x), {
  headers: { 'content-type': 'application/json; charset=utf-8' }
});

export default async (req) => {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const required = Deno.env.get('ADMIN_TOKEN') || process.env.ADMIN_TOKEN;
    if (!token || token !== required) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json(); // expect array of cigars
    if (!
