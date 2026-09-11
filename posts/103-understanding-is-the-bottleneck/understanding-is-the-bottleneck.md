---
title: "mind-meld: Agent 코드를 이해하는 속도가 곧 개발 속도"
date: 2026-09-09
topics:
  - Dev
  - Agent
description: 여전히 리뷰는 인간의 몫이다.
draft: false
---
<div style="margin:0 0 1.75rem"><div style="display:flex;align-items:center;gap:14px;margin-bottom:6px"><div style="flex:0 0 6.5em;text-align:right;font-family:var(--mono,monospace);font-size:0.8rem;white-space:nowrap;opacity:0.65">agent 이전</div><div style="display:flex;flex:1;height:34px;border-radius:3px;overflow:hidden"><div style="width:25%;background:#e8a0a0;color:#0b0e14;box-shadow:inset -1px 0 0 rgba(11,14,20,0.4);display:flex;align-items:center;justify-content:center;font-family:var(--mono,monospace);font-size:0.66rem;letter-spacing:0.01em;line-height:1;white-space:nowrap;overflow:hidden" title="계획">계획</div><div style="width:40%;background:#efb98d;color:#0b0e14;box-shadow:inset -1px 0 0 rgba(11,14,20,0.4);display:flex;align-items:center;justify-content:center;font-family:var(--mono,monospace);font-size:0.66rem;letter-spacing:0.01em;line-height:1;white-space:nowrap;overflow:hidden" title="구현">구현</div><div style="width:10%;background:#e3cf8a;color:#0b0e14;box-shadow:inset -1px 0 0 rgba(11,14,20,0.4);display:flex;align-items:center;justify-content:center;font-family:var(--mono,monospace);font-size:0.66rem;letter-spacing:0.01em;line-height:1;white-space:nowrap;overflow:hidden" title="테스트">테스트</div><div style="width:16%;background:#ff9940;color:#0b0e14;box-shadow:inset -1px 0 0 rgba(11,14,20,0.4);display:flex;align-items:center;justify-content:center;font-family:var(--mono,monospace);font-size:0.66rem;letter-spacing:0.01em;line-height:1;white-space:nowrap;overflow:hidden" title="코드 리뷰">코드 리뷰</div><div style="width:9%;background:#cbb7a3;color:#0b0e14;display:flex;align-items:center;justify-content:center;font-family:var(--mono,monospace);font-size:0.66rem;letter-spacing:0.01em;line-height:1;white-space:nowrap;overflow:hidden" title="배포">배포</div></div></div><div style="display:flex;align-items:center;gap:14px;margin-bottom:6px"><div style="flex:0 0 6.5em;text-align:right;font-family:var(--mono,monospace);font-size:0.8rem;white-space:nowrap;opacity:0.65">agent 이후</div><div style="display:flex;flex:1;height:34px;border-radius:3px;overflow:hidden"><div style="width:25%;background:#e8a0a0;color:#0b0e14;box-shadow:inset -1px 0 0 rgba(11,14,20,0.4);display:flex;align-items:center;justify-content:center;font-family:var(--mono,monospace);font-size:0.66rem;letter-spacing:0.01em;line-height:1;white-space:nowrap;overflow:hidden" title="계획">계획</div><div style="width:8%;background:#efb98d;color:#0b0e14;box-shadow:inset -1px 0 0 rgba(11,14,20,0.4);display:flex;align-items:center;justify-content:center;font-family:var(--mono,monospace);font-size:0.66rem;letter-spacing:0.01em;line-height:1;white-space:nowrap;overflow:hidden" title="구현">구현</div><div style="width:10%;background:#e3cf8a;color:#0b0e14;box-shadow:inset -1px 0 0 rgba(11,14,20,0.4);display:flex;align-items:center;justify-content:center;font-family:var(--mono,monospace);font-size:0.66rem;letter-spacing:0.01em;line-height:1;white-space:nowrap;overflow:hidden" title="테스트">테스트</div><div style="width:16%;background:#ff9940;color:#0b0e14;box-shadow:inset -1px 0 0 rgba(11,14,20,0.4);display:flex;align-items:center;justify-content:center;font-family:var(--mono,monospace);font-size:0.66rem;letter-spacing:0.01em;line-height:1;white-space:nowrap;overflow:hidden" title="코드 리뷰">코드 리뷰</div><div style="width:9%;background:#cbb7a3;color:#0b0e14;display:flex;align-items:center;justify-content:center;font-family:var(--mono,monospace);font-size:0.66rem;letter-spacing:0.01em;line-height:1;white-space:nowrap;overflow:hidden" title="배포">배포</div></div></div></div>

Agent 이후 구현은 더 이상 병목이 아니다. DevOps로 테스트와 배포 시간도 꽤나 줄일 수 있다. 무엇을 구현할지 정하는 주체는 인간이므로 계획 단계는 논의 대상이 아니다. 결국 남는 것은 코드 리뷰[^code-review]다. 나는 인간이 병목이 되더라도 코드 리뷰는 agent가 아닌 인간의 몫이라고 생각한다.[^qodo][^rpi] 

이 글에선 왜 인간의 코드 리뷰가 아직까진 필요한지, 그리고 인간이 신속하게 코드 리뷰를 수행하는 방법에 대해 이야기한다. 그리고 그 방법을 skill로 만든 [mind-meld](https://github.com/songsnim/mind-meld)를 소개한다.

[^qodo]: Itamar Friedman(Qodo)은 코드 리뷰가 코드 작성 밖의 새로운 병목이 되었는지를 청중에게 직접 묻고, "AI가 생성하는 코드가 인간 리뷰 속도를 앞지르면 그것은 진보가 아니라 문제"라고 말한다. — [마지막 인간 코드 리뷰: AI 생성 코드에 대한 신뢰 구축](https://www.youtube.com/watch?v=s-aixZYJG4c)

[^rpi]: Dexter Horthy는 Research-Plan-Implement 방법론을 공개한 뒤 자신들이 틀렸던 지점으로 "코드를 읽지 않아도 된다"는 생각을 첫 번째로 꼽는다. 출력이 50% 늘었지만 그 절반이 지난주 slop을 정리하는 작업이었다는 수치도 같은 발표에서 나온다. — [Everything We Got Wrong About Research-Plan-Implement](https://www.youtube.com/watch?v=YwZR6tc7qYg)

[^code-review]: 이 글에서는, 코드 리뷰를 `PR 리뷰 및 merge 승인`의 의미를 더 크게 담고 있음 
## 1. 코드 리뷰는 인간의 역할

코드 리뷰를 하지 않고 merge하면 당장은 빠르고 편하겠지만 나중에 수습하는 비용이 더 커진다. 특히 agent가 작성한 코드는 더 그렇다. 왜 그럴까? 현재 agent의 LLM 모델을 학습하는 RL reward은 코드의 유지보수성, 가독성, 아키텍쳐 품질같은 요소가 아니라 **테스트 통과**다.[^factory] 모델은 reward을 최대화하는 방향으로 학습되므로 테스트 통과를 위한 우회책이나 임시방편을 채택하는 방식도 학습한다. 이런 구현으로 발생하는 비용은 즉시 청구되지 않고 몇 주에서 몇 달 뒤 아키텍처 문제로 돌아오므로, 애초에 RL의 reward에 포함시키기 어렵다.[^factory] 따라서, agent의 구현은 리뷰가 필요하다.

그렇다면 agent에게 코드 리뷰를 맡기면 되지 않을까? 나는 이 방식이 코드 리뷰를 하지 않는 것보다는 낫다고 생각한다. 하지만, 여전히 다른 문제가 남아있다. Agent가 PR diff의 유지보수성이나 아키텍쳐 품질을 리뷰할 수 있어서[^agent-code-review] 코드 리뷰에 문제가 없다고 가정하더라도, 인간이 코드베이스에서 일어나고 있는 일을 놓치게 되는 것 자체가 문제가 된다.

결국엔 코드 리뷰는 인간의 역할이다. Agent가 보지 못하는 아키텍쳐, 기술부채, 코드 스멜을 파악하고, 코드베이스에 어떤 코드를 merge할 지 주도권을 쥐고 있어야 한다. 적어도 코드베이스에서 어떤 일이 벌어지고 있는지 알고 있어야 한다.

[^factory]: Dex Horthy(HumanLayer)는 2025년 7월 아무도 코드를 읽지 않는 agent 공장을 운영했고 그것이 무너지는 과정을 발표에서 공개한다. 근거로 장애 증가·코드베이스 품질 저하·버그 증가(Faros AI 데이터), 모델이 Ruby/Fastlane 과제에서 생성한 test-passing hack, 그리고 유지보수성 검증이 테스트 통과 검증보다 몇 자릿수 어렵다는 점을 든다. model-as-judge에 대해서도, 판정 모델이 이미 좋은 품질을 안다면 처음부터 높은 점수를 주므로 훈련 신호로서의 가치가 줄어든다고 지적한다. — [Harness Engineering is not Enough: Why Software Factories Fail](https://www.youtube.com/watch?v=Ib5GBkD555M)

[^agent-code-review]: 아직까진 시중 모델이 이런 종류의 리뷰를 제대로 할 능력이 없다고 생각한다.
## 2. 리뷰 비용의 실체는 생소함이다

Agent는 내가 모르는 것을 자주 끌고 온다. 처음 보는 디자인 패턴, 써 본 적 없는 라이브러리, 이름만 들어본 알고리즘. 이때 리뷰는 두 단계로 갈린다.

1. **의미 이해** — 이 개념, 용어, 스택이 도대체 무엇인가.
2. **결정 이해** — 왜 여기서 그것을 골랐는가. 대안과의 tradeoff는 무엇인가.

1단계가 선행되어야 2단계의 질문 자체가 성립이 된다. 그런데 보통 PR 리뷰는 2단계에만 집중한다. 예를 들어, `Muon`이 optimizer인지도 모르는 상태에서는 "왜 `Adam`을 안 썼는가?"같은 질문조차 떠올릴 수 없다. 실제로 회사 업무나 개인 프로젝트에서도 agent가 PR을 올렸지만, 1단계에서 막혀 2단계로 넘어가지 못한 채, 테스트가 초록색이라는 이유로 승인하는 경우가 빈번하다.

## 3. 생소한 개념을 빠르게 이해하는 것은 학습 문제다

생소한 개념을 이해하는 일은 엔지니어링이 아니라 학습 문제다. 그리고 학습에는 이미 널리 알려져있거나 검증된 프레임워크가 있다. Feynman technique, Socratic questioning, five whys, first principles, microworld, 그리고 회상 기반 시험.

여기서 agentic coding을 할 땐 **그 코드를 가장 잘 아는 agent가 바로 앞에 있다.** 그 개념을 왜 도입했고 어떤 대안을 버렸는지는 agent의 context에 남아 있다. 즉 저자 직강이 가능하다.

그래서 Agent에게 요약을 받는 것이 아니라, agent를 교사로 활용하는 것이 아이디어다.

- [**microworld**](https://www.edweek.org/education/seymour-paperts-microworld-an-educational-utopia/1983/05) - 메커니즘을 요약하지 말고, 조작 가능한 형태로 만들어주게 한다. 설명을 읽는 것보다 동작을 만져 보는 것이 빠르다. 
- **[socratic](https://en.wikipedia.org/wiki/Socratic_method) / quiz** - 내가 무엇을 모르는지도 몰라 질문할 게 없다. 그래서 반대로 agent가 우리에게 질문한다. 내가 뭘 모르는지 적나라하게 파고든다.
- [**feynman](https://fs.blog/feynman-technique/)/ short-essay** - 인출 효과를 노리고 내가 다시 설명한다. 막히거나 잘못 설명한 부분을 agent가 다시 고쳐준다. 
- **five-whys / first-principles** - 2단계인 결정 이해 단계에서 유용하다. 기술적 의사 결정의 가장 밑바닥까지 파고들게 유도한다.

요약을 받아 읽는 방식은 먼저, 읽기가 싫다는 게 문제다. 줄 글보다 단 하나의 figure가 훨씬 더 이해하기 쉬운 경우가 많다. 게다가 읽고 나서도 내가 이해를 한건지 자기 객관화가 안 된다는게 문제다. 결국 내가 승인한 PR이라면 내가 책임지고, 다른 사람에게 설명할 수 있어야 한다. 이 때 `feynman` 이나 `short-essay` 세션이 큰 도움이 된다. 

## 4. mind-meld

생소한 개념, 그리고 왜 그렇게 구현했는지 agent의 생각을 내 것으로 만들기 위해 위 기법들을 [mind-meld](https://github.com/songsnim/mind-meld) 라는 skills로 제작했다.

2개의 사용법이 있다. 
- **그냥 학습**: 어떠한 용어나 개념, 개념이나 용어를 위 기법을 활용해 빠르게 이해한다. 순서는 없다. 원하는 기법을 골라서 쓰면 된다. 이 상황에선 [mind-meld](https://github.com/songsnim/mind-meld) 는 그냥 학습 용 skill suite로 바라봐도 좋다.
  ```
  /microworld "Gradient Descent"
  /five-whys "why does this repo pin every version"
  /socratic "Why Dagster, but not Airflow?"
  ```
- **PR 하나**: PR 하나가 올라오면 `microworld`로 pr diff의 before와 after, 혹은 추가된 모듈이나 기능을 조작해보며 이해한다. `quiz`로 이해도를 측정하고, 내가 놓친 부분 학습에 적합한 도구를 `mind-meld`가 알아서 골라 학습시켜준다. 그리고 인출효과를 위해 내가 동료에게 설명하는 짧은 글로 최종 이해를 확정 짓는다. 무엇이 변했는지, 왜 그렇게 했는지, 무엇이 깨질 수 있는지 세 축으로 채점하고, 통과하지 못하면 다시 돌린다. 결과는 리포트로 남는다. 남은 불명확한 지점과 agent에게 되물을 질문이 함께 적힌다.
	```
	/mind-meld #127
	```
## 5. 마치며
Agent 코드 작성 속도와 발 맞추기 위해 코드 리뷰를 멈추면 더 큰 기술 부채가 발생한다. 그렇다고 agent에게 코드 리뷰를 맡기자니 LLM 모델 학습 알고리즘 상 유지보수성이나 설계 퀄리티를 잡아내기 어렵다. 결국 사람이 해야하는데, agent가 사용하는 기법, 스택, 개념, 용어와 의사결정을 빠르게 이해하는 것이 관건이다. 나는 학습 속도를 가속시키는 것이 agentic coding의 새로운 leverage라고 생각한다. 그래서 [mind-meld](https://github.com/songsnim/mind-meld) 를 제작했다. `mind-meld`를 쓴다고 Agent 코드 작성 속도를 완전히 따라 잡을 수는 없지만, 적어도 코드 베이스 주도권을 잃지 않을 수 있으며, `mind-meld`로 줄이는 시간이 곧 개발 시간의 단축이 된다는 효능감을 가질 수 있다. 거기다, 새로운 개념을 빠르게 익히는 경험 자체가 여간 즐거운 게 아니다.