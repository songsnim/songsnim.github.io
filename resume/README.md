# Resume / Portfolio

- `resume.yaml` — 모든 지원서에 공통인 사실과 bullet 풀 (`bullets[].id`).
- `variants/<name>.yaml` — 지원서 하나: 쓸 bullet id(순서대로), summary, 포함할 case id.
- `cases/NN-slug/slug.md` — 케이스 스터디 하나 = 폴더 하나. 배경 / 문제 / Action & Analysis / Result.
- 웹: `/r/<RESUME_SLUG>/` (목록), `/r/<slug>/<case>/`, `/r/<slug>/v/<name>/` (이력서 A4), `/r/<slug>/p/<name>/` (포트폴리오 묶음).
- PDF: `cd site && npm run pdf -- <name>` → `resume/out/resume-<name>.pdf`, `portfolio-<name>.pdf`.
  이력서가 A4 1장을 넘으면 실패한다.
