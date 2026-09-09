import type { APIRoute } from 'astro';
import css from '../styles/global.css?raw';

/**
 * The site's own stylesheet, at a stable URL, for interactive figures to link.
 * A figure is a separate document inside an <iframe>, so it cannot inherit the
 * page's colour tokens or typefaces — linking this gets it the same ones, and
 * the same light/dark switch, without restating a single value.
 */
export const GET: APIRoute = () =>
  new Response(css, { headers: { 'content-type': 'text/css; charset=utf-8' } });
