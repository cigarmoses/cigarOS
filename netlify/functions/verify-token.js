export async function verifyToken(req){
  const hdr = req.headers.get('x-admin-token') || req.headers.get('X-Admin-Token');
  const token = hdr || new URL(req.url).searchParams.get('token');
  const expected = process.env.ADMIN_TOKEN;
  return !!expected && token === expected;
}
