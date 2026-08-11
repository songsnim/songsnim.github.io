---
title: 내 코드베이스는 유지보수하기 편할까?
date: 2026-08-09
topics:
  - Dev
description: 코드베이스 유지보수성을 측정해보자
draft: false
---


이 글에서 **기술 접기**는 "반복되는 것들은 한 번만 정의하고 나머지를 참조하는 것으로 대체" 라는 의미로 사용합니다. 추상화, SSOT, 설정 파일 일원화, DB 정규화가 모두 여기에 속합니다.

[그래서 추상화 해 말아?](../098-when-to-abstract/when-to-abstract.md)에서 추상화의 손익분기점을 계산해서 **Rule of Three**의 '3'을 유도했다. 그런데 그 계산을 다시 들여다보면 이상한 점이 하나 있다.

$$
C_{중복}=n \cdot c_{작성}
$$

$$
C_{추상}=RCWR\cdot c_{작성} + RCR\cdot(n−1)\cdot c_{작성}
$$

두 식 모두 **작성 비용**뿐이다. 코드를 한 번 쓰고 나면 아무도 그 코드를 다시 건드리지 않는다는 가정 위에 서 있다. 하지만 실제 비용의 무게중심은 작성이 아니라 그 이후에 있다.

> **Fact 41.** Maintenance typically consumes 40 to 80 percent of software costs. Therefore, it is probably the most important life cycle phase of software.
> "유지보수는 보통 소프트웨어 비용의 40~80%를 차지한다. 따라서 아마도 소프트웨어 생애주기에서 가장 중요한 단계다."
> — [Robert L. Glass, *Facts and Fallacies of Software Engineering*, 2002](https://www.oreilly.com/library/view/facts-and-fallacies/0321117425/)

그렇다면 앞 글의 모델은 비용의 20~60%만 보고 결론을 낸 셈이다. 빠진 쪽을 넣으면 결론이 어떻게 달라질까?

이 글의 목적은 하나다. **기술 접기의 이득을 작성 시점이 아니라 수명 전체에서 다시 재는 것.** 그리고 그렇게 재면 판단 기준이 되는 변수가 바뀐다.

## 1. 접기는 세 개의 서로 다른 축에 작용한다

같은 사실이 코드베이스 $n$곳에 흩어져 있다고 하자. 접으면 정의 1곳 + 참조 $n$곳이 된다. 이때 줄어드는 것이 하나가 아니다. 세 가지가 각각 다른 방식으로 줄어든다.

### 축 1. 길이 — 천장이 있다

사실 하나의 기술 길이를 $s$, 참조 한 개의 길이를 $r$이라 하자 (당연히 $r < s$).

| | 총 길이 |
|---|---|
| 접기 전 | $n \cdot s$ |
| 접기 후 | $s + n \cdot r$ |

이득비는

$$
G_{길이}(n) = \frac{n \cdot s}{s + n \cdot r}
$$

여기서 $n$을 무한대로 보내면

$$
\lim_{n \to \infty} G_{길이}(n) = \frac{s}{r}
$$

**중복을 아무리 많이 접어도 길이 이득은 $s/r$을 넘지 못한다.** 참조가 아무리 짧아도 0은 아니기 때문이다. 즉 축 1의 이득에는 $n$과 무관한 천장이 있다.

손익분기도 계산된다. $s + n r < n s$ 를 풀면

$$
n > \frac{s}{s-r}
$$

$r$이 $s$에 비해 충분히 작으면 우변은 1에 가까워지므로, **$n = 2$부터 이미 이득**이다. 문턱은 낮고 천장도 낮다. 축 1은 접기를 정당화하기엔 근거가 약하다.

### 축 2. 변경 — 천장이 없다

사실 하나가 바뀔 때 손대야 하는 지점의 수를 보자.

| | 변경 1회당 수정 지점 |
|---|---|
| 접기 전 | $n$ |
| 접기 후 | $1$ |

수명 동안 이 사실이 $m$번 바뀌고, 지점 하나를 고치는 비용이 $c_{수정}$이라면 총 수정 비용은 $m \cdot n \cdot c_{수정}$에서 $m \cdot c_{수정}$으로 줄어든다.

$$
G_{변경} = n
$$

**여기엔 천장이 없다.** 축 1과 달리 $n$에 정비례해서 그대로 벌린다. 그리고 절대량은 $m$에 비례한다.

### 축 3. 정합성 — 시간이 지나면 확률 1로 진다

축 2는 "모든 지점을 빠짐없이 고쳤다"를 전제한다. 현실에서는 빠뜨린다.

지점 하나를 갱신할 때 누락할 확률을 $p$라 하자. 변경 1회에서 최소 한 곳을 빠뜨릴 확률은

$$
P_{드리프트}(1) = 1 - (1-p)^{n}
$$

$p$가 작을 때 $\approx n p$ 이므로, **중복 수에 비례해서 커진다.** 그리고 변경이 $m$번 누적되면

$$
P_{드리프트}(m) = 1 - (1-p)^{nm} \xrightarrow[\;nm \to \infty\;]{} 1
$$

$p$가 아무리 작아도 $nm$이 커지면 확률은 1로 수렴한다. **접지 않은 중복은 언젠가 반드시 어긋난다. 시간 문제일 뿐이다.** 접으면 지점이 1개이므로 이 항 자체가 사라진다.

세 축을 정리하면 이렇다.

| 축 | 이득 | 천장 | 지배 변수 |
|---|---|---|---|
| 길이 | $\dfrac{ns}{s+nr}$ | $s/r$ | $n$ |
| 변경 | $n$배 | 없음 | $n, m$ |
| 정합성 | 드리프트 확률 $\to 0$ | 없음 | $n, m, p$ |

## 2. DB 정규화는 이 세 축의 교과서다

세 축이 추상적으로 들린다면, 이 셋이 이미 하나의 분야에서 이름을 갖고 정리되어 있다. **관계형 DB 정규화**다.

정규화는 기술 접기가 맞다. 판별은 간단하다. 정규화한 테이블에 쿼리를 두 번 던지면 실행이 줄어드는가? 아니다. JOIN이 붙어서 **오히려 늘어난다.** 줄어드는 것은 *적을 것* — 같은 사실을 한 곳에만 적게 된다.

그리고 정규화 이론이 말하는 **이상현상(anomaly)** 세 가지가 위 세 축과 그대로 대응한다.

| 정규화 용어 | 대응하는 축 | 내용 |
|---|---|---|
| 저장 중복 | 축 1. 길이 | 같은 값이 $n$행에 반복 저장 |
| 갱신 이상 (update anomaly) | 축 2. 변경 | 주소 하나 바꾸는데 $n$행을 고쳐야 함 |
| 삽입·삭제 이상 (insert/delete anomaly) | 축 3. 정합성 | 일부만 반영되어 DB가 스스로 모순 |

여기서 중요한 사실 하나. **Codd가 정규화의 목표로 제시한 네 가지 중에 "저장 공간 절약"은 없다.**

> The objectives of further normalization are:
> 1. "To free the collection of relations from undesirable insertion, update and deletion dependencies"
> 2. "To reduce the need for restructuring the collection of relations as new types of data are introduced, and thus increase the life span of application programs"
> 3. "To make the relational model more informative to users"
> 4. "To make the collection of relations neutral to the query statistics, where these statistics are liable to change as time goes by"
>
> — [E. F. Codd, *Further Normalization of the Data Base Relational Model*, IBM Research Report RJ 909, 1971](https://thaumatorium.com/articles/the-papers-of-ef-the-coddfather-codd/1971b-further-normalization-of-the-data-base-relational-model/)

첫 번째 목표가 축 2·3이고, 두 번째 목표는 아예 **변경**을 명시적으로 말하고 있다("새 데이터 유형이 도입될 때 재구조화할 필요를 줄인다"). 축 1은 목록에 없다. DB 분야는 이 글이 도달하려는 결론에 50년 전에 먼저 도착해 있었다.

참고로 Codd 본인은 *anomaly*가 아니라 *undesirable dependency*라는 말을 썼다. 오늘 교과서가 쓰는 "갱신 이상 / 삽입 이상 / 삭제 이상"이라는 이름은 이후에 정착한 표현이다.

정규화가 특별한 이유가 하나 더 있다. **기술 접기가 형식적으로 보증되는 유일한 자리**라는 것이다. 코드에서 함수를 추출할 때 "이 추출이 원래 동작을 보존한다"를 증명해 주는 정리는 없다. 하지만 정규화에는 **무손실 조인 분해(lossless-join decomposition)** 가 있다. 릴레이션 $R$을 $R_1, R_2$로 쪼갰을 때

$$
R = R_1 \bowtie R_2
$$

가 성립할 조건이 함수 종속(functional dependency)으로 명시된다. 접었다가 다시 펼치면 원본이 정확히 복원된다는 보장이다. 나머지 기술 접기는 전부 이 보장 없는 판본이다.

마지막으로 정규화는 **접기의 대가도 청구서에 찍어서 보여준다.** 그 대가는 JOIN 비용이다. 그리고 그 비용이 이득을 넘어서면 **역정규화**를 한다. 역정규화는 실패가 아니라, 세 축의 이득을 팔고 읽기 속도를 사는 정당한 거래다. 즉 정규화 실무는 "접어라"가 아니라 **"세 축의 이득과 결합 비용을 비교하라"** 였다.

## 3. 부등식을 다시 세운다

이제 세 축과 결합 비용을 전부 넣어서 수명 전체 비용을 쓴다. 변수는 다음과 같다.

| 기호 | 뜻 |
|---|---|
| $n$ | 같은 사실이 나타나는 지점 수 |
| $m$ | 수명 동안 그 사실이 **바뀌는 횟수** |
| $c_{작성}$ | 1회 작성 비용 |
| $c_{수정}$ | 지점 1곳 수정 비용 |
| $p$ | 지점 1곳 갱신 누락 확률 |
| $c_{버그}$ | 드리프트 1건의 기대 비용 |
| $\kappa$ | 접기가 유발하는 변경 1회당 추가 비용 (간접 참조 추적, 결합도) |
| $RCWR, RCR$ | [앞 글](../098-when-to-abstract/when-to-abstract.md)의 재사용 구축·재사용 비용 배수 |

접지 않았을 때의 수명 비용:

$$
C_{중복} = n\,c_{작성} \;+\; m\,n\,c_{수정} \;+\; m\left(1-(1-p)^{n}\right)c_{버그}
$$

접었을 때의 수명 비용:

$$
C_{접기} = \big(RCWR + RCR(n-1)\big)c_{작성} \;+\; m\left(c_{수정} + \kappa\right)
$$

접기가 이득인 조건은 $C_{접기} < C_{중복}$ 이므로, $m$에 대해 정리하면

$$
m\Big[\underbrace{(n-1)c_{수정}}_{\text{축 2}} + \underbrace{\left(1-(1-p)^{n}\right)c_{버그}}_{\text{축 3}} - \underbrace{\kappa}_{\text{결합 비용}}\Big] \;>\; \underbrace{\big(RCWR + RCR(n-1) - n\big)c_{작성}}_{\Delta C_{구축}}
$$

우변 $\Delta C_{구축}$은 정확히 앞 글이 계산했던 그 항이다. 이 글은 좌변을 추가했을 뿐이다.

## 4. 부등식이 말하는 것

### (1) 앞 글의 결론은 $m = 0$ 인 특수해였다

$m = 0$이면 좌변이 0이 되고, 부등식은 $\Delta C_{구축} < 0$ 으로 축소된다. 이것을 $n$에 대해 풀면

$$
n^{*} = \frac{RCWR - RCR}{1 - RCR}
$$

앞 글에서 유도한 그 식이다. 보수적인 값에서 $n^{*} = 3$, 즉 **Rule of Three**. 그러니 Rule of Three는 틀린 게 아니라, **"한 번 짜고 다시는 안 고친다"는 최악의 가정에서 나온 상한**이다.

### (2) $m > 0$ 이면 문턱은 3보다 낮아진다

좌변이 양수인 한, $\Delta C_{구축} > 0$ (즉 $n < 3$)이어도 $m$이 충분히 크면 부등식은 성립한다. 손익분기 변경 횟수는

$$
m^{*} = \frac{\Delta C_{구축}}{(n-1)c_{수정} + \left(1-(1-p)^{n}\right)c_{버그} - \kappa}
$$

$n=2$이고 자주 바뀌는 설정값이라면, Rule of Three를 기다릴 이유가 없다. **두 번째 중복에서 이미 접어야 한다.**

### (3) $m = 0$ 이면 접기는 순손실이 될 수 있다

반대 방향이 더 중요하다. $m = 0$이면 축 2·축 3 항이 통째로 사라지고, 남는 것은 $\Delta C_{구축}$과 $\kappa$뿐이다. **바뀌지 않는 코드는 $n$이 10이든 20이든 접어서 얻을 것이 축 1의 상수 배 길이 이득밖에 없다.** 그리고 결합도라는 비용은 그대로 낸다.

이것이 "우연한 중복(incidental duplication)"을 접지 말라는 조언의 정량적 근거다. 우연한 중복은 정의상 **각 지점이 서로 다른 이유로 바뀌는** 중복이다. 즉 하나가 바뀔 때 나머지는 안 바뀌므로, 이 모델에서 그 사실의 $m$은 0에 가깝다.

### (4) $\kappa$ 가 크면 접지 않는 쪽이 옳다

분모가 음수가 되면, 즉

$$
\kappa > (n-1)c_{수정} + \left(1-(1-p)^{n}\right)c_{버그}
$$

이면 $m$을 아무리 키워도 부등식이 성립하지 않는다. **아무리 자주 바뀌어도 접으면 손해인 구간이 존재한다.** DB의 역정규화가 정확히 이 구간의 이름이다.

### (5) $\kappa$ 는 상수가 아니다 — 잘못된 추상화

지금까지 $\kappa$를 상수로 뒀는데, 실무에서 가장 아픈 경우는 $\kappa$가 **자라는** 경우다.

> "duplication is far cheaper than the wrong abstraction"
> "Another new requirement arrives. Programmer X. Another additional parameter. Another new conditional. **Loop until code becomes incomprehensible.**"
> — [Sandi Metz, *The Wrong Abstraction*, 2016](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)

Metz가 기술하는 붕괴 과정을 이 모델의 언어로 옮기면 이렇다. 접힌 정의에 변경이 들어올 때마다 그 변경이 **모든 참조 지점에 해당하지 않으므로** 파라미터와 조건 분기가 하나씩 붙는다. 즉 변경 횟수가 늘수록 접힌 정의를 이해하고 고치는 비용이 커진다.

$$
\kappa = \kappa(m), \qquad \kappa'(m) > 0
$$

그러면 부등식의 좌변은 $m$에 대한 직선이 아니라 **어느 지점에서 꺾여 감소하는 곡선**이 된다. 결과적으로 다음 구간이 생긴다.

$$
m < m_{붕괴} \;\Rightarrow\; \text{이득}, \qquad m > m_{붕괴} \;\Rightarrow\; \text{손해}
$$

**처음엔 옳았던 접기가 나중에 손해로 뒤집힌다.** 이것이 "잘못된 추상화"의 정량적 정체다. 접을 당시의 $n$은 틀리지 않았다. 틀린 것은 **그 $n$개가 같은 사실이라는 판단**이었고, 그 오판은 변경이 들어오기 전까지는 드러나지 않는다.

Metz의 처방 — *"the fastest way forward is back"*, 인라인해서 되돌린 뒤 다시 접으라 — 도 여기서 유도된다. $\kappa(m)$을 다시 낮은 값으로 리셋하는 유일한 조작이기 때문이다.

## 5. 그래서 대표적으로 어디서 손해가 나나 — 서비스 간 공유 라이브러리

(4)와 (5)의 조건을 실무에서 가장 선명하게 만족시키는 사례가 있다. **여러 서비스가 같은 코드를 쓴다는 이유로 공유 라이브러리를 만드는 것**이다.

> "In general, I dislike code reuse across services, as it can easily become a source of coupling. Having a shared library for serialisation and de-serialisation of domain objects is a classic example of where the driver to code reuse can be a problem."
> "**don't violate DRY within a microservice, but be relaxed about violating DRY across all services.**"
> — [Sam Newman, *Building Microservices*](https://www.goodreads.com/quotes/10723707-don-t-violate-dry-within-a-microservice-but-be-relaxed-about)

이 사례가 대표적인 이유는 $\kappa$가 추상적인 "결합도"가 아니라 **측정 가능한 것**으로 실체화되기 때문이다. 공유 라이브러리를 한 줄 고치면 따라오는 것:

- $n$개 서비스의 버전 조율
- 동시 배포 또는 단계적 롤아웃 계획
- $n$개 서비스의 회귀 테스트
- 그리고 그 사이 기간 동안 라이브러리 버전이 갈리는 상태 관리

즉 $\kappa$가 **독립 배포성(independent deployability)의 상실**이다. 서비스 하나를 혼자 배포할 수 없게 되는 순간, 마이크로서비스로 쪼갠 이유 자체가 사라진다. 그래서 여기서는 거의 언제나

$$
\kappa \;\gg\; (n-1)c_{수정}
$$

가 되고, 분모가 음수로 떨어진다. Newman의 결론이 이 부등식을 말로 옮긴 것과 같다.

> "the downsides of code duplication are better than the downsides of using shared code that ends up coupling services."

여기서 대칭 하나가 보인다. 2절의 DB 정규화는 **접기의 이득이 청구서에 찍히는** 자리였고(이상현상 제거), 공유 라이브러리는 **접기의 비용이 청구서에 찍히는** 자리다(배포 조율). 같은 부등식의 양쪽 끝이다.

주의할 점은 이 판정이 "코드 중복은 괜찮다"가 아니라는 것이다. Newman은 **서비스 경계 안에서는 접으라**고 말한다. 즉 $\kappa$는 코드의 성질이 아니라 **경계를 넘느냐**의 함수다. 같은 코드라도 한 서비스 안에서 접으면 $\kappa$가 작고, 경계를 넘어 접으면 $\kappa$가 폭발한다.

## 6. 채점표

부등식을 사례에 대입해 본다. 판단은 $n$이 아니라 $m$과 $\kappa$가 결정한다.

| 사례 | $m$ | 지배 축 | 판정 |
|---|---|---|---|
| 설정값·상수 SSOT | 높음 | 축 3 | 압도적 이득. $n=2$에서도 접는다 |
| DB 정규화 | 높음 | 축 2·3 | 이득. $\kappa$ = JOIN 비용 |
| 릴리스 절차 자동화 | 높음 | 축 2 | 이득. 다만 실행 자체는 매번 전부 돈다 |
| 도메인 로직 추상화 | 중간 | 축 1·2 | 조건부. $\kappa$ 평가 필요 |
| LLM 규칙 파일 일원화 | 높음 | 축 3 | 이득. 본체는 길이 절약이 아니라 드리프트 제거 |
| 우연한 중복 | ≈ 0 | 없음 | **접으면 손해** |
| 읽기 최적화된 집계 테이블 | 높음 | — | $\kappa$ 초과 구간. 역정규화가 정답 |
| 서비스 간 공유 라이브러리 | 높음 | — | **접으면 손해.** $\kappa$ = 독립 배포성 상실 |
| 테스트 코드 | 낮음 | — | **대체로 접지 않는다.** $\kappa$ = 읽기 비용 (아래) |

마지막 줄은 조금 설명이 필요하다. 테스트 코드에서 $\kappa$는 배포 비용도 결합도도 아닌 **읽기 비용**이다. 헬퍼로 접을수록 그 테스트가 무엇을 검증하는지 알려면 테스트 본문을 떠나야 한다. 그리고 테스트는 각각 서로 다른 이유로 바뀌므로 사실 단위의 $m$도 낮다. 좌변이 두 방향에서 동시에 깎이는 셈이다.

> Instead of being completely DRY, test code should often strive to be **DAMP** — that is, to promote "Descriptive And Meaningful Phrases." A little bit of duplication is OK in tests so long as that duplication makes the test simpler and clearer.
> — [*Software Engineering at Google*, ch.12 Unit Testing](https://abseil.io/resources/swe-book/html/ch12.html)

## 7. 마치며

접기를 판단할 때 사람은 $n$을 센다. 눈에 보이기 때문이다. 같은 코드가 세 군데 보이면 접고 싶어진다.

하지만 부등식이 말하는 결론은 다르다.

> $n$은 접기의 **필요조건**이고, $m$이 **충분조건**이다.

- 축 1(길이)의 이득에는 $s/r$이라는 천장이 있다. $n$으로는 크게 못 벌린다.
- 천장이 없는 것은 축 2(변경)와 축 3(정합성)이고, 둘 다 $m$에 비례한다.
- 그래서 접기 전에 세어야 할 것은 "몇 군데에 있나"가 아니라 **"이게 앞으로 몇 번 바뀌나"** 다.
- 그리고 그 변경이 **경계를 넘는가**($\kappa$), **분기로 쌓이는가**($\kappa(m)$)를 함께 봐야 한다.

Rule of Three가 3인 이유는 변경을 세지 않았기 때문이다. 변경을 세기 시작하면 그 숫자는 사안마다 달라지고, 어떤 경우엔 1이 되고 어떤 경우엔 무한대가 된다.

---

### 참고

- [E. F. Codd, *Further Normalization of the Data Base Relational Model*, IBM Research Report RJ 909, 1971](https://thaumatorium.com/articles/the-papers-of-ef-the-coddfather-codd/1971b-further-normalization-of-the-data-base-relational-model/)
- [William Kent, *A Simple Guide to Five Normal Forms in Relational Database Theory*, CACM 26(2), 1983](https://www.bkent.net/Doc/simple5.htm)
- [Poulin, *Measuring Software Reuse*, 1996](https://jeffreypoulin.info/Papers/IJAST97/ijast97.html)
- [Robert L. Glass, *Facts and Fallacies of Software Engineering*, Addison-Wesley, 2002](https://www.oreilly.com/library/view/facts-and-fallacies/0321117425/)
- [Lientz & Swanson, *Software Maintenance Management*, Addison-Wesley, 1980](https://dl.acm.org/doi/10.5555/601062)
- [Sandi Metz, *The Wrong Abstraction*, 2016](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)
- [Sam Newman, *Building Microservices*, O'Reilly](https://samnewman.io/books/building_microservices/)
- [Winters, Manshreck & Wright, *Software Engineering at Google*, ch.12 Unit Testing, 2020](https://abseil.io/resources/swe-book/html/ch12.html)
