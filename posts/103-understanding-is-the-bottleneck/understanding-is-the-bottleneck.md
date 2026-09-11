---
title: TEMP
date: 2026-09-09
topics:
  - Dev
  - Agent
description: Agent가 쓴 코드를 이해하는 속도가 전체 개발 속도를 정한다.
draft: false
---
<iframe src="http://localhost:4321/posts/understanding-is-the-bottleneck/sdlc-shift.html" style="width:100%;aspect-ratio:16/7;border:0" loading="lazy" title="agent 도입 전후 SDLC 단계별 노력 비중"></iframe>
Agentic coding 덕에 코드 작성은 더 이상 병목이 아니다. Agent가 작성한 코드를 인간이 이해하고 merge할지 말지 검토하는 코드 리뷰가 병목이 되었다.[^qodo][^rpi] 이 글에선 왜 코드 리뷰를  가 아니라 "생소한 개념을 빠르게 이해하기"라는 이야기다. 그리고 그 과정을 skill로 만든 [mind-meld](https://github.com/songsnim/mind-meld)를 소개한다.

[^qodo]: Itamar Friedman(Qodo)은 코드 리뷰가 코드 작성 밖의 새로운 병목이 되었는지를 청중에게 직접 묻고, "AI가 생성하는 코드가 인간 리뷰 속도를 앞지르면 그것은 진보가 아니라 문제"라고 말한다. — [마지막 인간 코드 리뷰: AI 생성 코드에 대한 신뢰 구축](https://www.youtube.com/watch?v=s-aixZYJG4c)

[^factory]: Dex Horthy(HumanLayer)는 2025년 7월 아무도 코드를 읽지 않는 agent 공장을 운영했고 그것이 무너지는 과정을 발표에서 공개한다. 근거로 장애 증가·코드베이스 품질 저하·버그 증가(Faros AI 데이터), 모델이 Ruby/Fastlane 과제에서 생성한 test-passing hack, 그리고 유지보수성 검증이 테스트 통과 검증보다 몇 자릿수 어렵다는 점을 든다. model-as-judge에 대해서도, 판정 모델이 이미 좋은 품질을 안다면 처음부터 높은 점수를 주므로 훈련 신호로서의 가치가 줄어든다고 지적한다. — [Harness Engineering is not Enough: Why Software Factories Fail](https://www.youtube.com/watch?v=Ib5GBkD555M)

[^rpi]: Dexter Horthy는 Research-Plan-Implement 방법론을 공개한 뒤 자신들이 틀렸던 지점으로 "코드를 읽지 않아도 된다"는 생각을 첫 번째로 꼽는다. 출력이 50% 늘었지만 그 절반이 지난주 slop을 정리하는 작업이었다는 수치도 같은 발표에서 나온다. — [Everything We Got Wrong About Research-Plan-Implement](https://www.youtube.com/watch?v=YwZR6tc7qYg)

## 1. 리뷰는 선택이 아니다

Agent의 산출물을 읽지 않고 병합하는 선택지는 존재하지 않는다. 읽지 않은 코드는 3AM에 페이지가 울릴 때 처음 읽게 되고, 그 시점의 이해 비용은 리뷰 시점의 비용보다 비싸다. 리뷰를 생략해서 얻은 속도는 다음 주에 slop 정리로 되돌려 갚는다.

이것이 취향 문제가 아닌 이유는 모델이 학습된 방식에 있다. 현재 코딩 모델을 훈련하는 RL 보상은 **테스트 통과**지 유지보수성이나 설계 품질이 아니다.[^factory] 보상이 그렇게 정의되면 모델은 보상을 최대화한다. 불필요한 `try/catch`, 의미 없는 타입 캐스팅처럼 실패를 회피하되 코드 건강에는 기여하지 않는 test-passing hack이 그 산물이다. 이런 결정의 비용은 즉시 청구되지 않고 몇 주에서 몇 달 뒤 아키텍처 문제로 돌아오므로, 애초에 RL의 보상 신호에 잡히지 않는다.

그러면 "품질을 판정하는 모델을 하나 더 세우면 되지 않나"라는 반론이 가능하다. 여기서 비대칭이 드러난다. **테스트가 통과했는지 검증하는 비용과 유지보수 가능한 설계인지 검증하는 비용은 자릿수가 다르다.** 전자는 실행하면 끝나지만, 후자는 이 코드베이스가 앞으로 어떤 방향으로 변할지에 대한 맥락을 요구한다. 그 맥락은 리포지토리 안에 전부 적혀 있지 않다. 실제로 아무도 코드를 읽지 않는 agent 공장을 운영한 결과는 붕괴였고, 장애 증가와 코드베이스 품질의 가속 저하, 리뷰 없이 병합되는 PR로 나타났다.[^factory]

그렇다면 리뷰는 상수 비용이다. 전체 개발 속도를 올리려면 리뷰 비용 자체를 줄여야 한다. 문제는 그 비용의 대부분이 diff를 훑는 시간이 아니라는 점이다.

## 2. 리뷰 비용의 실체는 생소함이다

Agent는 내가 모르는 것을 자주 끌고 온다. 처음 보는 디자인 패턴, 써 본 적 없는 라이브러리, 이름만 들어본 알고리즘, 왜 그렇게 갈랐는지 알 수 없는 모듈 경계. 리뷰가 막히는 지점은 코드의 양이 아니라 이런 생소한 요소다.

이때 리뷰는 두 단계로 갈린다.

1. **의미 이해** — 이 개념, 용어, 스택이 도대체 무엇인가.
2. **결정 이해** — 왜 여기서 그것을 골랐는가. 다른 선택지 대비 무엇을 얻고 무엇을 포기했는가.

순서는 뒤집을 수 없다. 1단계가 비어 있으면 2단계 질문 자체를 세울 수 없다. consistent hashing이 무엇인지 모르는 상태에서 "왜 consistent hashing인가"를 물어도 대답을 검증할 수 없다. 실제로 리뷰가 통과되는 경위는 대개 이렇다. 1단계가 막혔는데 2단계로 넘어가지 못한 채, 테스트가 초록색이라는 이유로 승인한다.

$$
\text{리뷰 비용} = \underbrace{C_{\text{diff}}}_{\text{읽는 시간}} + \underbrace{\sum_{i} C_{\text{의미}}(i) + C_{\text{결정}}(i)}_{\text{생소한 요소 } i \text{마다}}
$$

$C_{\text{diff}}$는 이미 작다. 줄여야 하는 것은 뒤쪽 항이고, 그중에서도 $C_{\text{의미}}$가 $C_{\text{결정}}$의 선행 조건이므로 여기가 진짜 지렛대다.

## 3. 생소한 개념을 빠르게 이해하는 것은 학습 문제다

$C_{\text{의미}}$를 줄이는 일은 엔지니어링 문제가 아니라 학습 문제다. 그리고 학습에는 이미 검증된 프레임워크가 있다. Feynman technique, Socratic questioning, five whys, first principles, microworld, 그리고 회상 기반 시험. 굳이 새로 만들 것이 없다.

여기서 agentic coding에는 일반 학습에 없는 조건이 하나 붙는다. **그 코드를 가장 잘 아는 존재가 옆에 있다.** 그 개념을 왜 도입했고 어떤 대안을 버렸는지는 agent의 context에 남아 있다. 즉 저자 직강이 가능하다.

그래서 방향은 명확하다. Agent에게 요약을 받는 것이 아니라, agent를 교사로 세운다.

- **microworld** — 메커니즘을 요약하지 말고, 조작 가능한 형태로 만들어 내게 주게 한다. 설명을 읽는 것보다 동작을 만져 보는 것이 빠르다.
- **socratic / quiz** — agent가 나에게 질문한다. 내가 무엇을 모르는지는 내가 아니라 질문이 찾아낸다.
- **feynman / short-essay** — 내가 다시 설명한다. 설명이 막히는 지점이 이해가 비어 있는 지점이다.
- **five-whys / first-principles** — 기술적 의사결정과 새 용어를 각각 아래로 파고든다.

요약을 받아 읽는 방식이 실패하는 이유는, 읽고 나서도 내가 이해했는지 아닌지를 모른다는 것이다. 위 도구들은 전부 **내 출력을 요구한다.** 출력이 없으면 이해도 측정되지 않는다.

## 4. mind-meld

이 절차를 매번 손으로 프롬프트하지 않도록 skill로 묶어 [mind-meld](https://github.com/songsnim/mind-meld)로 공개했다.

PR 하나를 넘기면 microworld로 메커니즘을 만져 보게 하고, quiz로 놓친 축을 찾고, 그 축에 맞는 도구 하나를 깊게 돌린 뒤, 내가 동료에게 설명하는 짧은 글로 마무리한다. 무엇이 변했는지, 왜 그렇게 했는지, 무엇이 깨질 수 있는지 세 축으로 채점하고, 통과하지 못하면 다시 돌린다. 결과는 리포트로 남는다. 남은 불명확한 지점과 agent에게 되물을 질문이 함께 적힌다.

```
/mind-meld #42
```

개별 도구는 PR이 아닌 아무 대상에도 쓸 수 있다.

```
/microworld "consistent hashing"
/five-whys "why does this repo pin every version"
```

두 가지를 의도적으로 하지 않는다. 승인을 대신하지 않고, 코멘트를 자동으로 달지 않는다. 이 도구의 산출물은 코드가 아니라 나의 이해다. 판단은 여전히 내 몫이어야 병목을 옮긴 것이 아니라 줄인 것이 된다.

많관부.
