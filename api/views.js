const ANALYTICS_ENDPOINT = 'https://api.vercel.com/v1/query/web-analytics/visits/count';
const RESPONSE_CACHE_CONTROL = 'public, s-maxage=900, stale-while-revalidate=86400';

function json(body, status = 200, cacheControl = 'no-store') {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function normalizeArticlePath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512 || !value.startsWith('/')) {
    return null;
  }

  let pathname;
  try {
    pathname = new URL(value, 'https://blog.mlxb.cc').pathname.replace(/\/{2,}/g, '/');
  } catch {
    return null;
  }

  if (pathname === '/' || pathname.startsWith('/api/')) return null;
  return pathname.replace(/\/+$/, '');
}

function escapeODataString(value) {
  return value.replaceAll("'", "''");
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const requestUrl = new URL(request.url);
    const pathname = normalizeArticlePath(requestUrl.searchParams.get('path'));
    if (!pathname) {
      return json({ error: 'Invalid article path' }, 400);
    }

    const accessToken =
      process.env.VERCEL_ANALYTICS_TOKEN || process.env.VERCEL_ACCESS_TOKEN || process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_ANALYTICS_TEAM_ID || process.env.VERCEL_TEAM_ID;

    if (!accessToken || !projectId) {
      return json({ error: 'View count is not configured' }, 503);
    }

    const analyticsUrl = new URL(ANALYTICS_ENDPOINT);
    analyticsUrl.searchParams.set('projectId', projectId);
    analyticsUrl.searchParams.set('filter', `requestPath eq '${escapeODataString(pathname)}'`);
    if (teamId) analyticsUrl.searchParams.set('teamId', teamId);

    try {
      const response = await fetch(analyticsUrl, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(8_000),
      });

      if (!response.ok) {
        console.error(`Vercel Analytics returned ${response.status} for ${pathname}`);
        return json({ error: 'View count is temporarily unavailable' }, 502);
      }

      const result = await response.json();
      const views = Number(result?.data?.pageviews);
      if (!Number.isFinite(views) || views < 0) {
        console.error(`Vercel Analytics returned an invalid count for ${pathname}`);
        return json({ error: 'View count is temporarily unavailable' }, 502);
      }

      return json({ path: pathname, views }, 200, RESPONSE_CACHE_CONTROL);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load Vercel Analytics for ${pathname}: ${reason}`);
      return json({ error: 'View count is temporarily unavailable' }, 502);
    }
  },
};
