/**
 * Page views are counted by GoatCounter, which needs a script on every page. The
 * site is static, so there is no server log to read instead; this is the only
 * place visitor data leaves for a third party.
 *
 * `SITE` is the subdomain from goatcounter.com — the account's site code, not a
 * secret, since it ends up in the page anyway. Leaving it empty turns counting
 * off completely: no script is emitted and nothing is sent.
 */
const SITE = 'songsnim';

/**
 * GoatCounter ignores localhost and private networks on its own, so a dev server
 * never pollutes the numbers.
 *
 * Two things exclude the author's own visits from a real browser, both built into
 * GoatCounter and neither needing code here:
 *   - visit any page with `#toggle-goatcounter` once, which sets a flag in that
 *     browser's localStorage and is remembered until toggled back;
 *   - add the address to Ignore IPs under Settings → Tracking, which covers every
 *     browser on the network at once.
 */
export const counter = SITE ? `https://${SITE}.goatcounter.com/count` : null;

/** Where /stats reads the numbers back from. Same account, same subdomain. */
export const api = SITE ? `https://${SITE}.goatcounter.com` : null;
