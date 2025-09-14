// netlify/functions/list-learn.js
// Lists /img/*.svg files that start with "learn" from your GitHub repo.
// Works without directory listing on Netlify.

export default async (req) => {
  try {
    const owner  = process.env.REPO_OWNER  || 'cigarmoses';
    const repo   = process.env.REPO_NAME   || 'cigarOS';
    const branch = process.env.REPO_BRANCH || 'main';

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/img?ref=${branch}`;

    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'cigaros-netlify-fn',
        'Accept': 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(
        JSON.stringify({ error: 'GitHub API error', status: res.status, detail: txt }),
        { status: 502, headers: { 'content-type': 'application/json' } }
      );
    }

    const items = await res.json();
    const files = (Array.isArray(items) ? items : [])
      .filter(it =>
        it.type === 'file' &&
        it.name.toLowerCase().startsWith('learn') &&
        it.name.toLowerCase().endsWith('.svg')
      )
      .map(it => {
        const title = it.name
          .replace(/^learn/i, '')
          .replace(/\.svg$/i, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim() || 'Learning Document';

        // Raw GitHub content URL (fast, cacheable)
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/img/${encodeURIComponent(it.name)}`;

        return {
          name: it.name,
          title,
          url: rawUrl,
        };
      });

    return new Response(JSON.stringify({ files }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'list-learn failed', detail: String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};
