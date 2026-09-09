import type { APIRoute, GetStaticPaths } from 'astro';

/**
 * Serves the interactive figures that sit beside the post using them —
 * `posts/NNN-slug/figure.html` — at `/posts/<slug>/<figure>.html`, so a post
 * stays one folder while its figures are reachable as pages. Astro's asset
 * pipeline only picks images out of a post folder, hence this route.
 *
 * A figure is a standalone HTML document embedded in an <iframe>, which is
 * what lets Obsidian render it too: Obsidian strips <script> from a note, but
 * an iframe is its own browsing context and runs normally. The note points the
 * iframe at the dev server, and remarkFigureSrc in astro.config.mjs rewrites
 * that to a site-relative path when the site is built.
 */
const figures = import.meta.glob('../../../../../posts/**/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// A draft post has no page of its own, so its figures are not published either
// — the URL would otherwise stay reachable for anyone who guessed it. The dev
// server keeps serving them, since that is where a draft's figure is written
// and where Obsidian's iframe points.
const notes = import.meta.glob('../../../../../posts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const drafts = new Set(
  Object.entries(notes)
    .filter(([, raw]) => /^draft: *true$/m.test(raw.split('\n---')[0]))
    .map(([file]) => file.match(/\/posts\/([^/]+)\//)?.[1])
    .filter(() => import.meta.env.PROD)
);

const entries = Object.entries(figures).flatMap(([file, html]) => {
  const [, folder, name] = file.match(/\/posts\/(\d{3}-[^/]+)\/([^/]+\.html)$/) ?? [];
  return folder && !drafts.has(folder)
    ? [{ slug: folder.replace(/^\d{3}-/, ''), figure: name, html }]
    : [];
});

export const getStaticPaths = (() =>
  entries.map(({ slug, figure, html }) => ({
    params: { slug, figure },
    props: { html },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(props.html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
