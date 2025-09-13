export default async (req) => {
  const token = req.headers.get('x-admin-token') || '';
  const ok = token && token === (process.env.ADMIN_TOKEN || '');
  return new Response(JSON.stringify({ ok }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    status: ok ? 200 : 401
  });
};
