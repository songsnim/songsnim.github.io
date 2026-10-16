import { readFileSync, readdirSync } from 'node:fs';
import { getCollection } from 'astro:content';
import { load } from 'js-yaml';

/**
 * resume/ holds the source: resume.yaml is the pool of facts and bullets, and
 * each variants/<name>.yaml picks and orders them for one application. A typo in
 * a variant fails the build rather than quietly dropping a line from a résumé.
 *
 * The slug is the only thing that makes the pages unlisted (see Base.astro for
 * how a browser that has seen them reveals the nav link). It is read from the
 * build environment; `||` rather than `??` because an unset GitHub secret
 * arrives as an empty string.
 */
const DIR = '../resume';
const yaml = (path: string) => load(readFileSync(`${DIR}/${path}`, 'utf8')) as any;

export const slug: string = import.meta.env.RESUME_SLUG || process.env.RESUME_SLUG || 'resume';
export const resume = yaml('resume.yaml');
export const variantNames: string[] = readdirSync(`${DIR}/variants`)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => f.replace(/\.yaml$/, ''));

const must = <T>(v: T | undefined, msg: string): T => {
  if (v === undefined) throw new Error(msg);
  return v;
};

export async function variant(name: string) {
  const v = yaml(`variants/${name}.yaml`);
  const pool = resume.experience.flatMap((e: any) => e.bullets);
  const bullets = v.bullets.map((id: string) =>
    must(pool.find((b: any) => b.id === id), `variants/${name}.yaml: unknown bullet "${id}"`)
  );
  const all = await getCollection('cases', ({ data }) => !data.draft);
  const cases = v.cases.map((id: string) =>
    must(all.find((c) => c.id === id), `variants/${name}.yaml: unknown case "${id}"`)
  );
  const experience = resume.experience
    .map((e: any) => ({ ...e, bullets: bullets.filter((b: any) => e.bullets.includes(b)) }))
    .filter((e: any) => e.bullets.length);
  return { summary: v.summary as string, experience, cases };
}
