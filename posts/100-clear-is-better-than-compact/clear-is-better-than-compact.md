---
title: 내가 context 주도권을 쥐는 방법
date: 2026-08-30
topics:
  - Dev
description: compact와 automemory를 버려라.
draft: false
---

Agentic coding에서 결과물의 품질은 모델이 무엇을 아는지가 아니라 그 순간 context에 무엇이 들어 있는지에 달려 있다. 그래서 무엇을 넣고 무엇을 뺄지 결정하는 책임은 사용자에게 있다. 이 글은 그 책임을 지키려면 `/compact`와 automemory 대신 `/clear`와 handoff 문서를 써야 한다는 이야기다.

## 1. compact는 통제할 수 없다

`/compact`가 문제인 이유는 정보를 잃기 때문[^1]이 아니라, 어떤 정보를 남기고 버릴지 내가 통제하기 어렵기 때문이다. `/compact`로 남은 정보는 내 눈에 보이지 않는 형태로 재구성되며, `/compact`가 여러번 쌓이면 디지털 풍화처럼 필연적으로 context가 유실된다.[^context-loss] 이후 모든 판단은 내가 검토한 적 없는 요약 위에서 이루어진다. 어떤 결정이 왜 그렇게 내려졌는지, 어떤 제약이 왜 사라졌는지 추적할 수 없는 상태로 작업이 계속된다.

[^1]: 정보를 잃는 것도 문제지만 /compact의 주된 문제점은 아니라고 생각한다.

[^context-loss]: 
    > As you work, context fills up. Claude compacts automatically, but instructions from early in the conversation can get lost. Put persistent rules in CLAUDE.md, and run `/context` to see what's using space.
    > — [How Claude Code works, Anthropic](https://code.claude.com/docs/en/how-claude-code-works)

`/clear`와 handoff[^handoff]는 이와 다르다. `/clear`는 context를 싹 비우고 handoff에 남길 내용은 사용자가 의도적으로 **설계**할 수 있다. context에 어떤 내용이 포함될 지 내가 정하고, 눈으로 읽고, 커밋하고, 틀리면 고친다. context에 주입되는 정보와 요약하는 skill이 검토 가능한 산출물이 되는 순간 사람이 통제할 수 있는 설계의 일부가 된다. `/compact`는 이게 안 된다.

[^handoff]: 타인이 그대로 이어서 작업할 수 있도록 현재 작업 맥락을 최대한 보존한채로 요약한 문서.

## 2. Multi-agent와 handoff

세션 내 context가 길어지면 context rot이 발생하므로 context는 짧을수록 좋다. 그런데 프로젝트 규모에 따라 작업 하나에 필요한 총 context가 세션 하나의 window를 넘어가는 경우가 있다. 여기서 `/compact`가 유혹적인 선택지로 보인다. 하나의 세션을 계속 압축해 가며 작업을 이어가는 것이다.

다른 선택지가 있다. 세션 하나를 늘리는 대신 세션을 여러 개로 나누는 것이다. 역할 별로 agent를 나누면 총 context는 그대로 두면서 agent 하나당 context는 짧게 유지할 수 있다. context에 여러 정보가 섞이는 noise 문제를 줄일 수 있는 것은 덤이다.

예를 들어 하나의 세션에서 interview, plan, develop, review를 모두 진행하는 것이 아니라(충분히 작은 작업이라면 이렇게 해도 무방), interviewer, planner, developer, reviewer 4개로 agent를 쪼갠 후 작업하는 것이다. 예를 들어,

- interviewer는 skills로(matt-pocock의 `/grill-me`나 gstack의 `/offic-hour`등) 사용자의 의도와 맥락을 수집하고 planner에게 handoff 문서로 전달
- planner는 전달받은 handoff 문서를 토대로 구현 계획을 설계하고, 해당 설계 handoff를 developer에게 전달
- developer는 전달받은 구현 계획 문서를 토대로 개발 수행 -> 결과를 reviewer에게 검토받는 loop 수행

위 workflow 예시에서 각 agent는 본인의 역할에 관련된 context만 handoff(사용자가 작성했거나, 검토했거나, 설계한 skill로 생성된)로 주입되므로 noise를 최대한 배제한 짧은 context에서 작업을 수행하는 이점이 있다. 이는 OOP에서 객체들이 내부 상태를 공유하지 않고 메시지로만 주고받으며 loosely coupled된 시스템을 구성하는 것과 유사하다. 상태가 아니라 인터페이스를 주고 받는다.

## 3. Automemory 역시 통제할 수 없다.
Automemory는 유용하다고 판단한 context를 `.claude/` 어딘가에 저장한다. 저장된 결과는 찾아볼 수 있지만, 무엇을 저장할지 판단하는 기준도, 언제 저장하는지도 알 수 없다. 그렇게 쌓인 memory는 이후 모든 세션의 시작 시점에 자동으로 load된다. 내가 정하지 않은 기준으로, 내가 모르는 시점에 쓰인 정보가 항상 내 context의 첫 줄에 놓이는 것이다. 

여기에 automemory만의 문제가 하나 더 붙는다. **split-brain**이다. Agentic coding 이전에도 코드 품질을 다루는 논의는 주석과 문서를 줄이고 **self-contained** 코드를 지향하라고 말해 왔다. 주석과 문서는 코드와 달리 실행되지 않으므로 조용히 낡고, 현재 상황과 어긋난 서술이 그대로 남기 때문이다. memory는 정확히 같은 성질을 가지면서 내 통제 밖에 있다. 낡은 memory가 매 세션 load될 때, 그 위에서 작성되는 코드는 내 의도와 다르거나, hallucination이 섞인 채 merge될 위험을 품을 수 밖에 없다. 

## 4. Automemory를 대체하는 방법
Automemory도 `/compact`처럼 대신 handoff같은 문서를 작성해야 하는가? 그렇지는 않다. Handoff의 역할은 agent간 대화의 수단이다. Automemory가 저장하는 context는 성격이 조금 다르다. Project 전반 **유용한 사실**을 기록하며, 매 세션 시작 시 로드된다. **유용한 사실**에는 코드베이스 정보, ADR[^adr], project-specific 정보가 있다. 여기서 ADR은 중요한 정보이기 때문에 반드시 따로 관리가 필요한 영역이며, project-specific 정보는 이미 `CLAUDE.md` 파일에서 관리한다.()

여기서 남는 부분은 **코드베이스** 정보인데, 이것 역시 automemory가 필요없다. 왜 그런가? 위에서 이미 언급한대로 주석이나 문서는 최소화하고 **self-contained** 코드를 작성하는 방향으로 가야한다. 코드는 실행되고, 테스트 가능하므로  **코드베이스** 그 자체가 단 하나의 사실이다. 문서가 필요없는 것이다. 인간이야 코드를 이해하기 위해 (존재한다면) 자연어 문서를 읽는게 편하지만 agents는 코드베이스를 직접 읽는데 추가 비용이 들지도 않고, 이해도도 별 다르지 않다.
따라서, ADR과 `CLAUDE.md`를 따로 관리하면서, automemory기능은 끄고 agent에게 코드를 직접 읽히는 것이 관리 포인트를 줄이면서 **split-brain** 문제를 확실하게 예방하는 방법이다.


[^adr]: Architecture Decision Record

## 4. 정리
규모가 큰 프로젝트에서 context rot을 피하기 위해 `/clear`된 multi-agent를 기반으로 workflow를 구성한다. 각 multi-agent는 handoff 문서로 소통하여 본인의 역할에 해당하는 context를 분리한다. Handoff 문서라는 명시적인 형태를 갖게 되므로, handoff를 만드는 skills, 그리고 어떤 맥락을 담고 버릴지가 검토 가능한 설계의 영역으로 편입된다.

비슷한 맥락에서 context 주도권을 쥐기 위해 automemory 기능을 꺼버리고, ADR, project-specific 정보는 사람이 직접 관리한다. 코드베이스 정보는 문서가 아니라 코드베이스 자체를 agent에게 읽힌다. 그럼 automemory도 필요 없고, 추가 문서를 제작하여 관리할 필요도 없어진다. 그리고 여전히 context 주도권을 쥐고 있다.

Context engineering의 핵심은 context 주도권이라고 생각한다. 그러기 위해서는 눈에 보이고, 검토 가능한 설계의 영역으로 context를 모두 옮겨야 한다. 그러기 위해선, `/compact`, automemory에 의존하지 않아야 한다. 희망은 전략이 아니다.
