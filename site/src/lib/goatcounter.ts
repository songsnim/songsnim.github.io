/**
 * A client for GoatCounter's JSON API, used by /stats to draw the numbers itself
 * rather than framing GoatCounter's own dashboard.
 *
 * Framing it did not work: GoatCounter turns a dashboard token into a cookie and
 * redirects, and inside an iframe that cookie is third-party, so a browser that
 * drops it leaves an empty frame. The API has no such problem — it authenticates
 * per request with a header, and it answers cross-origin
 * (`access-control-allow-origin: *`, and `Authorization` is an allowed header).
 *
 * The key is the reader's to supply and never appears in this repository. Give it
 * "Read statistics" permission only: it lives in localStorage on a public page,
 * so it should not be able to do anything but read counts.
 */
const STORE = 'goatcounter-api-key';

export const readKey = () => localStorage.getItem(STORE) ?? '';
export const writeKey = (key: string) => localStorage.setItem(STORE, key);
export const dropKey = () => localStorage.removeItem(STORE);

/** A day of the chart: how many visitors, and which day they came. */
export interface Day {
  day: string;
  count: number;
}

/** One row of a ranked list — a page, a referrer, a country, a browser. */
export interface Row {
  name: string;
  /** Present for pages, where the row can link to the article itself. */
  href?: string;
  count: number;
}

export interface Overview {
  total: number;
  days: Day[];
}

interface HitListStat {
  day: string;
  daily?: number;
  hourly?: number[];
}

/**
 * GoatCounter reports failures as `{"error": "..."}` or `{"errors": {...}}`; a
 * bad key comes back as 401 with no useful body at all, so the status is worth
 * keeping in the message.
 */
async function call<T>(base: string, path: string, key: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${base}/api/v0/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const why = body?.error ?? (body?.errors && JSON.stringify(body.errors));
    throw new Error(why ? `${res.status} — ${why}` : `HTTP ${res.status}`);
  }
  return body as T;
}

/**
 * GoatCounter rounds range boundaries to the hour, so a range is expressed as
 * whole days ending at the start of tomorrow — that way today's visits count.
 */
function range(days: number) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const stamp = (d: Date) => d.toISOString().slice(0, 19) + 'Z';
  return { start: stamp(start), end: stamp(end) };
}

/**
 * `daily` is only filled in on the endpoints that group by day, so the hourly
 * buckets are the reliable source and are summed instead.
 */
const perDay = (s: HitListStat): number => s.daily ?? (s.hourly ?? []).reduce((a, b) => a + b, 0);

export async function overview(base: string, key: string, days: number): Promise<Overview> {
  const res = await call<{ total: number; stats: HitListStat[] }>(base, 'stats/total', key, range(days));
  return {
    total: res.total ?? 0,
    days: (res.stats ?? []).map((s) => ({ day: s.day, count: perDay(s) })),
  };
}

export async function pages(base: string, key: string, days: number, limit: number): Promise<Row[]> {
  const res = await call<{ hits: { path: string; title?: string; count: number }[] }>(base, 'stats/hits', key, {
    ...range(days),
    limit: String(limit),
  });
  return (res.hits ?? []).map((h) => ({
    name: h.title?.trim() || h.path,
    // Paths are recorded as they were requested, so they are already the site's
    // own URLs and can be followed straight back to the article.
    href: h.path.startsWith('/') ? h.path : undefined,
    count: h.count,
  }));
}

/** `page` is one of browsers, systems, locations, languages, sizes, campaigns, toprefs. */
export async function breakdown(
  base: string,
  key: string,
  page: string,
  days: number,
  limit: number
): Promise<Row[]> {
  const res = await call<{ stats: { name: string; count: number }[] }>(base, `stats/${page}`, key, {
    ...range(days),
    limit: String(limit),
  });
  return (res.stats ?? []).map((s) => ({ name: s.name || '(없음)', count: s.count }));
}
