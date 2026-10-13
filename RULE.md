# 수식

글에 수식이 들어가면, 글에 등장하는 모든 수식 notation은 KaTeX로 렌더링한다. 본문, 표, figure, figure의 설명 패널을 가리지 않는다. 같은 기호가 본문에서는 $d_{\text{model}}$로, figure에서는 `d_model`로 보이면 안 된다.

- 본문과 Markdown 표에서는 `$...$`(inline), `$$...$$`(display)로 쓴다. `remark-math`와 `rehype-katex`가 렌더링한다.
- figure HTML에서는 사이트와 같은 버전의 KaTeX를 CDN에서 불러와 `katex.renderToString`으로 그린다. 버전은 `site/package.json`의 `katex`와 맞춘다.

  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css" />
  <script type="module">
    import katex from 'https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.mjs';
  </script>
  ```

- SVG 안의 수식은 `<text>`에 쓸 수 없으므로 `<foreignObject>` 안의 HTML로 넣는다.
- 수식을 유니코드 첨자(`x₁`, `ε_ls`)나 고정폭 글꼴로 흉내 내지 않는다.

# 상호작용 그림

애니메이션이나 조작 가능한 figure를 글에 넣을 때의 규칙. 글은 Obsidian에서 쓰고 GitHub Pages로 배포하므로, 같은 파일이 두 곳에서 같은 모습이어야 한다는 제약이 모든 결정을 지배한다.

## 배치와 삽입

- 그림은 독립 HTML 문서로 만들어 글과 같은 폴더에 둔다: `posts/NNN-slug/<figure>.html`.
- 글은 항상 `.md`다. `.mdx`는 Obsidian이 열지 못하므로 쓰지 않는다.
- 본문에서는 `iframe`으로 싣는다. Obsidian은 노트 안의 `<script>`를 지우지만 `iframe` 안까지는 손대지 않는다.
- `iframe src`는 개발 서버의 절대 주소로 적는다. Obsidian은 노트 폴더를 기준으로 상대 경로를 풀어주지 않는다.

  ```html
  <iframe src="http://localhost:4321/posts/<slug>/<figure>.html"
          style="width:100%;aspect-ratio:16/10;border:0" loading="lazy" title="..."></iframe>
  ```

- 빌드 시 `astro.config.mjs`의 `remarkFigureSrc`가 이 origin을 잘라 사이트 상대 경로로 바꾼다. 배포본은 저자의 기계를 가리키지 않는다.
- 그림 파일 자체는 `site/src/pages/posts/[slug]/[figure].ts`가 `/posts/<slug>/<figure>.html`로 방출한다.
- 개발 서버가 가리키는 주소가 소스 노트 밖으로 새면 방문자의 브라우저가 자기 기계를 때린다. `npm run build`의 `postbuild` 가드가 배포본에 `http://localhost`가 남으면 빌드를 실패시킨다. 이 가드를 우회하지 않는다.

## 폭

figure와 table은 필요하다면 본문 단의 좌우 margin을 무시하고 페이지 전체 폭을 쓴다고 가정하고 만든다. 본문 폭에 맞추느라 글자를 줄이거나 내용을 접지 않는다.

- 넓게 싣는 요소에는 `class="wide"`를 붙인다. `site/src/styles/global.css`가 이 요소를 본문 단 밖으로 꺼내 창 가운데에 놓고, 좌우 gutter만 남긴 폭(최대 1600px)으로 편다. 화면 폭 46rem 미만에서는 본문 폭으로 돌아간다.
- figure는 iframe에 붙인다. 넓은 iframe은 높이 540px로 고정되므로, figure는 이 높이 안에 들어가게 설계한다.

  ```html
  <iframe class="wide" src="http://localhost:4321/posts/<slug>/<figure>.html"
          style="width:100%;aspect-ratio:16/10;border:0" loading="lazy" title="..."></iframe>
  ```

- Markdown 표는 `<div class="wide">`로 감싼다. 앞뒤에 빈 줄이 있어야 표와 표 안의 수식이 Markdown으로 처리된다.

  ```html
  <div class="wide">

  | 기호 | 의미 |
  |:---|:---|
  | $h$ | head 수 |

  </div>
  ```

- 넓은 요소는 오른쪽 목차 rail을 덮고 페이지 배경색을 칠한다. 본문 폭으로 충분한 그림에는 쓰지 않는다.
- Obsidian에서는 사이트 CSS가 적용되지 않으므로 노트 폭으로 보인다.

## 본문과의 연속성

그림은 본문에 시각적으로 이어져야 한다. 임베드 티가 나는 요소(자기만의 배경, 테두리, 다른 팔레트)는 금지한다.

- 색과 활자는 사이트 스타일시트를 링크해 토큰으로만 쓴다.

  ```html
  <link rel="stylesheet" href="/figure.css" />
  ```

  이후 `var(--accent)`, `var(--ink-soft)`, `var(--mono)`를 쓰고, canvas 안에서 쓰는 색도 `getComputedStyle`로 같은 토큰을 읽는다. 색값을 다시 적지 않는다.
- 배경은 호스트가 보이도록 비운다. `background: transparent`만으로는 부족하고 `color-scheme: normal`이 함께 필요하다. 색 스킴이 선언된 임베드 문서에는 브라우저가 불투명 캔버스를 깔기 때문이다. Obsidian의 커스텀 wallpaper가 이 규칙으로 그림 뒤에 그대로 드러난다.
- 팔레트는 `prefers-color-scheme`을 따른다. 호스트 테마가 시스템과 다를 때만 `?theme=dark|light`로 덮는다.

## 구현

구현 수단에는 제약을 두지 않는다.

- 프론트엔드: canvas/SVG 애니메이션, 슬라이더 등 조작 요소, CDN `import`로 d3/three.js. `prefers-reduced-motion`은 존중한다.
- 계산: 무거운 사전계산은 그림 안에서 한 번에 끝내거나, 사이드카 스크립트로 `data.json`을 만들어 fetch한다. 조작은 재계산이 아니라 조회여야 한다.

예시는 `posts/102-interactive-figure-demo/`.
