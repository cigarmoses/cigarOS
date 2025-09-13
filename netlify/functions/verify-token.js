// Accepts token from Authorization: Bearer <token> OR X-Admin-Token header OR ?token=
export async function verifyToken(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const header = req.headers.get('x-admin-token') || '';
    const url = new URL(req.url);
    const query = url.searchParams.get('token') || '';

    const provided = bearer || header || query || '';
    const expected = process.env.ADMIN_TOKEN || '';

    return Boolean(expected) && provided === expected;
  } catch {
    return false;
  }
}
