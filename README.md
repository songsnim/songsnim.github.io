# Blog

Source of truth for [songsnim.github.io](https://songsnim.github.io). Every article lives in
this repository; the published site is built from it.

## Layout

```
posts/<english-slug>/<english-slug>.md    the article
posts/<english-slug>/*.png               its images, stored beside it
site/                            the Astro site that renders posts/
.github/workflows/deploy.yml     validate → build → deploy to GitHub Pages
```

One article, one folder. Images and any other artefact an article needs go in that
folder, and the article links to them with a relative path (`./diagram.png`).

The markdown file is named after its folder, not `index.md`, so Obsidian's quick-open
and `[[wikilinks]]` can tell posts apart. A folder holds exactly one markdown file —
put drafts and scratch notes elsewhere in the vault, or mark them `draft: true`.

## Writing a post

1. Create `posts/<english-slug>/<english-slug>.md`. The folder name is the URL:
   `songsnim.github.io/posts/<english-slug>`.
2. Fill in the frontmatter:

   ```yaml
   ---
   title: "글 제목"
   date: 2026-08-09
   topics:
     - "ML"
   description: "목록과 검색결과에 노출되는 한 줄 요약."
   cover: "./first-image.png" # optional
   draft: false
   ---
   ```

   The site calls them topics, and they live under `topics`. Obsidian reads the `tags` key
   into the vault's own tag pane, so the two names are kept apart on purpose: vault tags
   never reach the site, and site topics never clutter the vault.

3. Write. `$...$` and `$$...$$` render as math; leave a blank line around every `$$` block.
4. Publish with Obsidian Git: **Commit and push**. GitHub Actions validates the posts,
   builds the site, and deploys it.

`draft: true` keeps a post in the repository but out of the build, so unfinished work can
sit here safely.

## Checking before you push

```sh
cd site
npm run validate   # frontmatter, image files, internal links, math delimiters
npm run dev        # preview at localhost:4321
```

CI runs `validate` ahead of the build. If it fails, nothing deploys and the live site stays
as it was.
