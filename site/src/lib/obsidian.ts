/**
 * A published post and the note it came from are the same file, so the site can
 * hand the reader — meaning the author — a way back to the source. `obsidian://`
 * is handled by the desktop app, which opens the note directly.
 *
 * The blog is a subtree of a vault, but CI checks out the repository alone and
 * never sees the vault around it, so the vault's position cannot be discovered
 * at build time. These two facts describe it, and they are the only thing to
 * change if the vault is renamed or the folder moved.
 */
const VAULT = 'Vault';
const VAULT_PATH = 'Area/Blog';

/**
 * `filePath` comes from the content loader as a path relative to `site/`, e.g.
 * `../posts/098-when-to-abstract/when-to-abstract.md`. Obsidian wants it
 * relative to the vault root instead.
 */
export function obsidianUri(filePath?: string): string | null {
  if (!filePath) return null;
  const file = `${VAULT_PATH}/${filePath.replace(/^(?:\.\.\/)+/, '')}`;
  return `obsidian://open?vault=${encodeURIComponent(VAULT)}&file=${encodeURIComponent(file)}`;
}
