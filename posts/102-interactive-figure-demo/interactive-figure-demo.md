---
title: "[테스트용]본문에 녹아드는 상호작용 그림"
date: 2026-09-09
topics:
  - Dev
description: 글과 같은 색, 같은 활자를 쓰는 상호작용 가능한 그림을 포스트 폴더 안에 두고, Obsidian과 웹에서 같은 모습으로 보는 방법.
draft: false
---

정적인 그림으로는 설명이 늘어지는 개념이 있다. 학습률과 수렴의 관계가 그렇다. 값을 바꿔보는 행위 자체가 설명이므로, 그림은 읽는 것이 아니라 만지는 것이어야 한다. 


<iframe src="http://localhost:4321/posts/interactive-figure-demo/gradient-descent.html" style="width:100%;aspect-ratio:16/10;border:0" loading="lazy" title="학습률에 따른 경사하강 경로"></iframe>

손실 함수는 다음과 같다.

$$
L(x) = \tfrac{1}{2}x^2 + 0.6\sin(3x) + 1.2
$$

전역 최소점 근처에 국소 최소점이 있어, 학습률이 작으면 그 국소 최소점에 갇힌다. 키우면 넘어가지만, 더 키우면 갱신량이 곡률을 넘어서 발산한다.

## 구조

그림은 글과 같은 폴더에 산다.

```
posts/102-interactive-figure-demo/
  interactive-figure-demo.md
  gradient-descent.html
```

그림은 독립 HTML 문서이고, 본문은 그것을 `iframe`으로 싣는다. 문서가 분리돼 있으므로 Obsidian의 미리보기에서도 그대로 살아 움직인다 — Obsidian은 노트 안의 `<script>`는 지우지만 `iframe` 안까지는 손대지 않는다.

색과 활자를 본문과 맞추는 일은 그림이 사이트 스타일시트를 그대로 링크해서 해결한다.

```html
<link rel="stylesheet" href="/figure.css" />
```

이후 그림 안의 모든 색은 `var(--accent)`, `var(--ink-soft)` 같은 토큰을 읽고, canvas 안에서 쓰는 색조차 `getComputedStyle`로 같은 토큰을 뽑아 쓴다. 값을 한 번도 다시 적지 않으므로 사이트 팔레트가 바뀌면 그림도 같이 바뀌고, 다크 모드 전환도 본문과 동시에 일어난다. 배경은 `transparent`여서 그림에는 경계가 없다.

`iframe`의 주소가 `localhost`를 가리키는 것은 Obsidian 때문이다. Obsidian은 노트 폴더를 기준으로 상대 경로를 풀어주지 않지만 절대 주소는 불러오므로, 개발 서버가 떠 있으면 글을 쓰는 자리에서 독자가 볼 그림을 그대로 본다. 배포본이 저자의 기계를 가리키면 안 되므로, `astro.config.mjs`의 remark 플러그인이 빌드 시점에 이 origin을 잘라 사이트 상대 경로로 바꾼다.
