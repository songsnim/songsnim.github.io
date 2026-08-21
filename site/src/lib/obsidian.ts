/**
 * A published post and the note it came from are the same file, so the site can
 * hand the reader — meaning the author — a way back to the source. `obsidian://`
 * is handled by the desktop app, which opens the note directly.
 *
 * The blog is a subtree of a vault, but CI checks out the repository alone and
 * never sees the vault around it, so the vault's position cannot be discovered
 * at build time. Rather than hardcode a path that breaks whenever the blog
 * folder moves inside the vault, hand Obsidian the bare note name: the `file`
 * parameter is resolved like a wikilink, so a name that is unique in the vault
 * is found wherever it lives. Post filenames are slugs and unique by
 * convention, so only the vault name has to stay in sync here.
 */
const VAULT = 'Vault';

/**
 * `filePath` comes from the content loader as a path relative to `site/`, e.g.
 * `../posts/098-when-to-abstract/when-to-abstract.md`. Only its final segment
 * is used.
 */
export function obsidianUri(filePath?: string): string | null {
  if (!filePath) return null;
  const file = filePath.split('/').pop()!;
  return `obsidian://open?vault=${encodeURIComponent(VAULT)}&file=${encodeURIComponent(file)}`;
}
