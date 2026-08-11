import { spawn } from 'node:child_process';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * Embedded browsers — the one inside an editor, for instance — usually refuse to
 * hand a `obsidian://` link to the operating system, so the link does nothing
 * when clicked there. The dev server can do it on their behalf, since it is
 * already running on the machine that holds the vault.
 *
 * `apply: 'serve'` keeps this out of the build entirely: the published site has
 * no such route, and the link falls back to navigating to the URI itself.
 */
function obsidianOpener() {
  const opener = { darwin: 'open', win32: 'start' }[process.platform] ?? 'xdg-open';

  return {
    name: 'obsidian-opener',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__obsidian', (req, res) => {
        const uri = new URL(req.url, 'http://localhost').searchParams.get('uri') ?? '';
        // The URI arrives from a page, so it is untrusted: only this one scheme
        // is ever handed on, and `spawn` passes it as an argument rather than
        // through a shell.
        if (!uri.startsWith('obsidian://')) {
          res.statusCode = 400;
          return res.end('not an obsidian uri');
        }
        spawn(opener, [uri], { stdio: 'ignore', detached: true }).unref();
        res.statusCode = 204;
        res.end();
      });
    },
  };
}

export default defineConfig({
  vite: { plugins: [obsidianOpener()] },
  site: 'https://songsnim.github.io',
  // /stats is the author's own dashboard behind a token — nothing for a crawler
  // to index, and listing it would only advertise where it is.
  integrations: [mdx(), sitemap({ filter: (page) => !page.endsWith('/stats/') })],
  // The topic index used to live at /tags. Anything already pointing there keeps working.
  redirects: { '/tags': '/topics' },
  markdown: {
    // Posts write numeric ranges as `1~3`, and GFM's strikethrough treats a
    // single tilde as a delimiter, so two ranges on one line used to collapse
    // into struck-through text. Running remark-gfm by hand is the only way to
    // pass `singleTilde: false`; `~~` still strikes through as expected.
    gfm: false,
    remarkPlugins: [[remarkGfm, { singleTilde: false }], remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: { light: 'ayu-light', dark: 'ayu-dark' },
      wrap: true,
    },
  },
});
