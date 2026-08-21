---
title: 반복되는 코드, 접을까 말까? 2편
date: 2026-08-09
topics:
  - Dev
description: 유지보수 관점을 포함시켜 비용을 모델링합니다.
draft: false
---
이전 글 [반복되는 코드, 접을까 말까?](/posts/when-to-abstract)에서 이어지는 글입니다.

이 글에서 **접기**는 "반복되는 것들은 한 번만 정의하고 나머지를 참조하는 것으로 대체" 라는 의미로 사용합니다. 추상화, SSOT, 설정 파일 일원화, DB 정규화가 모두 여기에 속합니다.

---

앞 글에서 접기 비용 손익분기점을 계산해 **Rule of Three**의 '3'을 유도했다. 다만 그 모델은 **작성 비용만** 셌다. 그런데 접는 목적 자체가 유지보수성이다.

> **Fact 41.** Maintenance typically consumes 40 to 80 percent of software costs. Therefore, it is probably the most important life cycle phase of software.
> "유지보수는 보통 소프트웨어 비용의 40~80%를 차지한다. 따라서 아마도 소프트웨어 생애주기에서 가장 중요한 단계다."
> — [Robert L. Glass, *Facts and Fallacies of Software Engineering*, 2002](https://www.oreilly.com/library/view/facts-and-fallacies/0321117425/)

이번 글에서는 변경 비용을 모델에 넣어서 분석한다.

## 1. 접으면 벌어지는 일

같은 사실이 코드베이스 $n$곳에 흩어져 있다고 하자. 접으면 정의 1곳 + 참조 $n$곳이 된다.

### 작성 비용

$c_{작성}$을 재사용을 고려하지 않은 1회 작성 비용이라 하면, 접기 전은 $n\,c_{작성}$, 접기 후는 $\big(RCWR + RCR(n-1)\big)c_{작성}$이다.

$RCWR$은 재사용 가능하게 쓰는 비용 배수(범위 1.0 ~ 2.2, 기본값 1.5), $RCR$은 재사용 1회의 비용(범위 0.03 ~ 0.4, 기본값 0.2)이다. [Poulin, Measuring Software Reuse, 1996](https://jeffreypoulin.info/Papers/IJAST97/ijast97.html)의 실측치다. 앞 글에서 정리한 손익분기는 $n^{*} = (RCWR - RCR)/(1 - RCR)$, 보수적으로 잡으면 최대 3이다. 작성 비용만 따졌을 때, 반복 3번부터 접는게 이득이다.

### 변경 비용

사실 하나가 변경될 때 손대야 하는 지점의 수를 보자.

|      | 변경 1회당 수정 지점 |
| ---- | ------------ |
| 접기 전 | $n$          |
| 접기 후 | $1$          |

코드 lifetime 동안 이 사실이 $m$번 바뀌고 지점 하나를 고치는 비용이 $c_{수정}$이라면, 총 수정 비용은 $m\,n\,c_{수정}$에서 $m\,c_{수정}$으로 줄어든다. 즉 접었을 때 더 드는 변경 비용은

$$
\Delta c_{변경} = m(1-n)\,c_{수정}
$$

접었을 때 더 드는 작성 비용은

$$
\Delta c_{구축} \;\equiv\; \underbrace{\big(RCWR + RCR(n-1)\big)c_{작성}}_{\text{접기}} \;-\; \underbrace{n\,c_{작성}}_{\text{중복}}
\;=\; \big[(RCWR-RCR) - (1-RCR)\,n\big]c_{작성}
$$

$\Delta c_{구축} = 0$으로 두고 풀면 정확히 앞 글의 $n^{*} = (RCWR-RCR)/(1-RCR)$이 나온다. $n > n^{*}$이면 $\Delta c_{구축} < 0$, 즉 변경을 한 번도 안 해도 접는 쪽이 싸다.

이제 $\Delta c_{변경}$ 을 더한다. 둘 다 "접었을 때 더 드는 비용"이므로, 합이 음수면 접는 쪽이 싸다.

$$
\Delta c_{변경} + \Delta c_{구축} < 0
\;\iff\;
m(1-n)\,c_{수정} \;+\; \Delta c_{구축}<0
$$

손익분기 변경 횟수는

$$
m^{*} = \max\!\left(0,\; \frac{\Delta c_{구축}}{(n-1)\,c_{수정}}\right)
$$

음수를 처리하기 위해서 max를 사용한다.

$\Delta c_{구축}$을 풀어 쓰면 식이 두 항으로 무너진다. $r \equiv c_{작성}/c_{수정}$로 두고 분자에 $n = (n-1)+1$을 넣으면

$$
\frac{m^{*}}{r} \;=\; \frac{RCWR-1}{\,n-1\,} - (1-RCR)
$$

$RCWR$은 $RCWR-1$로만, $RCR$은 $1-RCR$로만 등장한다. 각각 **재사용 가능하게 쓰느라 초과로 드는 작성 비용**과 **참조 1회가 절약하는 작성 비용**이다. 

$c_{수정} \approx c_{작성}$ ($r=1$)로 두고 $m*$을 계산하면 이렇다. ($c_{수정}/c_{작성}$ 비율은 [COCOMO II](https://www.rose-hulman.edu/class/cs/csse372/201310/Homework/CII_modelman2000.pdf) 기준 0.25에서 1.58까지 흔들린다. 위 계산은 1로 잡은 것이다.)

| $n$             | 2       | 3   | 5   | 10  |
| --------------- | ------- | --- | --- | --- |
| 기본값 (1.5 / 0.2) | 0       | 0   | 0   | 0   |
| 보수값 (2.2 / 0.4) | **0.6** | 0   | 0   | 0   |

> 결론: 변경할 일이 1번이라도 있는 코드면 2번만 반복이 있어도 접는게 이득

하지만, 현실은 그렇게 쉽게 모델링되지 않는다.
## 2. 변경이 모든 지점에 수정을 가하진 않는다.

1절에서는 변경 사항이 발생하면, 모든 참조 지점에 수정을 가한다고 가정한다.

> "duplication is far cheaper than the wrong abstraction"
> "Another new requirement arrives. Programmer X. Another additional parameter. Another new conditional. **Loop until code becomes incomprehensible.**"
> — [Sandi Metz, *The Wrong Abstraction*, 2016](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)

추가 요구사항이나 변경이 생겼을 때 접은 후의 모든 참조 지점에서 수정이 필요하지 않을(_분기 변경_) 수도 있다. 이렇게 되면 접기의 변경 비용이 더 크게 발생할 수 밖에 없다. 그런데 1절은 $m$번의 변경이 전부 같다고 놨다. 

분기 변경을 접힌 정의로 받으려면 파라미터 하나, 조건문 하나가 붙는다. 그 값을 수정 1회 치로 잡으면, 고치는 값 한 번, 분기 붙이는 값 한 번이다.

|                         | 비율         | 접었을 때       | 안 접었을 때     |
| ----------------------- | ---------- | ----------- | ----------- |
| **공통 변경** — $n$곳 전부에 해당 | $1-\delta$ | $c_{수정}$    | $n\,c_{수정}$ |
| **분기 변경** — 일부에만 해당     | $\delta$   | $2\,c_{수정}$ | $c_{수정}$    |

$\delta$를 **분기율**로 보면, 핵심은 분기 변경에서 **부호가 뒤집힌다**. 안 접었으면 해당하는 지점 하나만 고치면 끝나지만 접었으면 정의를 건드려 놓고 나머지 $n-1$곳이 안 깨졌는지 확인해야 한다. 분기율에 따라 접은 후 변경 비용이 중복보다 더 비싸질 수도 있다.

따라서, 변경 1회당 기대 순이득을 다시 쓰면

$$
g = \big[(1-\delta)(n-1) - \delta\big]\,c_{수정}
$$

$\delta = 0$이면 1절의 식으로 돌아간다. 그러니 1절은 **분기가 없는 해피한 경우의 특수해**였다. $g \le 0$을 풀면

$$
g \le 0 \;\iff\; \delta \;\ge\; \delta^{*}, \quad {\;\delta^{*} = \frac{n-1}{n}\;}
$$

실제 분기율이 $\delta^{*}$보다 크면($\delta>\delta^*$) 변경 비용에서 접는게 손해가 된다. 

### $\delta$는 실측되어 있다

$\delta$는 0과 1 사이 비율이며 사후 측정 가능하다. 복제된 코드가 함께 바뀌는지 따로 바뀌는지 센 연구가 있다.

> "The results show that **usually half of the changes to code clone groups are inconsistent changes.**"
> — [Jens Krinke, *A Study of Consistent and Inconsistent Changes to Code Clones*, WCRE 2007](http://www0.cs.ucl.ac.uk/staff/jkrinke/publications/wcre07.pdf)

오픈소스 4개에서 직접 분기율 $\delta$를 측정했다.

| 시스템      | 일관 변경 | 불일치 변경 | $\delta$ |
| -------- | ----- | ------ | -------- |
| ArgoUML  | 1049  | 1050   | 0.50     |
| CAROL    | 66    | 69     | 0.51     |
| jdt.core | 1375  | 1124   | 0.45     |
| Emacs    | 440   | 543    | 0.55     |

$$
\delta \approx 0.45 \sim 0.55
$$

### 실측 값을 넣으면 $n=2$에서 접어야할 이득이 약해진다.

문턱 $\delta^{*} = (n-1)/n$ 옆에 실측 $\delta$를 나란히 놓아 보자. 

| $n$ | $\delta^{*}$ | 실측 $\delta = 0.45 \sim 0.55$ |                    |
| --- | ------------ | ---------------------------- | ------------------ |
| 2   | 0.50         | 구간을 가로지른다                    | 접는게 이득일 수도 아닐 수도.. |
| 3   | 0.67         | 구간 전체가 아래                    | 접는게 이득             |
| 5   | 0.80         | 여유 큼                         | 접는게 이득             |
| 10  | 0.90         | 여유 큼                         | 접는게 이득             |

$n\ge 3$ 인 경우에는 실측치가  $\delta \approx 0.5$ 이므로 여유롭게 $\delta < \delta^*$ 범위 내에 놓여 접는게 이득이다. 

$n=2$ 경우엔 접는게 이득인지 손해인지 애매하다. 

## 3. 중복이 잘못 접은 것보다 싸다.

지금까지의 비용 모델은 작성과 변경의 비용을 포함하나, 접고 나서 되돌리는 비용은 빠져있다. 접지 말았어야 했는데 접었다가 다시 펼치는 작업은 $c_{작성}$ 수준으로 비쌀 수도 있다. 반면에 접었어야 했는데 잠깐 기다렸다가 나중에 접으나 지금 당장 접으나 접는 비용에 별 차이가 없다.
심지어, [Kim et al.](https://web.cs.ucla.edu/~miryung/Publications/esecfse05-clonegenealogy.pdf) 의 연구에서는 $n=2$에서 보이는 중복은 10버전 안에 스스로 사라질 확률이 33%라고 보고한다. 이 보고는 $m$의 기댓값을 그만큼 깎는다. 따라서, $n=2$인 경우라도 당장 접지 않고 기다리는 편이 이득일 확률이 더 높다.

> 부등식에 따르면 $n \ge 3$ 에서는 뚜렷하게 접는게 이득이다.
> 접기 롤백 비용과 중복이 사라질 확률을 함께 고려하면 $n=2$ 에서는 접지 않고 중복을 허용하는게 낫다.

## 3. 마치며

접기를 판단할 때 사람은 $n$을 센다. 눈에 보이기 때문이다. 같은 코드가 세 군데 보이면 접고 싶어진다. **Rule of Three**에서도 $n$만 다룬다. 하지만, 위의 부등식이 말하는 것은 $n$이 필요조건일 뿐, $\delta$가 더 중요하다고 말한다. 실제 중복의 절반 정도는 변경 발생 시 함꼐 변경되지 않는다($\delta\approx 0.5$). 따라서 결론은,

> - 일회용 코드가 아니라면 Rule of Three를 따르면 된다.


---

### 참고 

- [Poulin, *Measuring Software Reuse*, 1996](https://jeffreypoulin.info/Papers/IJAST97/ijast97.html)
- [Robert L. Glass, *Facts and Fallacies of Software Engineering*, Addison-Wesley, 2002](https://www.oreilly.com/library/view/facts-and-fallacies/0321117425/)
- [Sandi Metz, *The Wrong Abstraction*, 2016](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction)
- [COCOMO II Model Definition Manual v2.1](https://www.rose-hulman.edu/class/cs/csse372/201310/Homework/CII_modelman2000.pdf)
- [Kim et al., An Empirical Study of Code Clone Genealogies, 2005](https://web.cs.ucla.edu/~miryung/Publications/esecfse05-clonegenealogy.pdf)
