---
title: "저수지 샘플링"
date: 2025-10-30
topics:
  - "ML"
  - "Statistics"
description: "전체 크기를 모르는 스트리밍 데이터에서 균등 확률로 k개를 뽑는 저수지 샘플링."
draft: false
---
## 1. 배경
DB나 주어진 데이터셋에서 무작위로 데이터를 샘플링하는 건 간단합니다. 전체 크기 $n$를 알고 있다면 $n$개 중에 $k$개의 인덱스를 random sampling하면 됩니다. 하지만 데이터가 하나씩 유입되는 스트리밍 환경에서는 어떨까요? 데이터가 지나갈 때 $\frac{k}{n}$ 확률로 뽑되, $n$번째 데이터가 지나가는 시점에서 샘플링을 중단하면 되지 않나? 라고 할 수 있습니다. 하지만 이 접근으로는 먼저 뽑힌 데이터일 수록 뒤이어 뽑히는 데이터에 의해 대체될 위험이 커지기 때문에 모든 데이터가 공정한 확률로 뽑히지 않고, 먼저 뽑힌 데이터일수록 손해입니다. 따라서 공정하게 모든 데이터를 뽑기 위해서는 **나중에 들어오는 데이터일수록 뽑힐 확률에 페널티를 줘야합니다.** 저수지 샘플링은 *들어오는 데이터에 동적으로 얼만큼 페널티를 부여할까?* 문제를 푸는 알고리즘입니다.

- 제약사항
**1) 데이터가 끊임 없이 유입되는 스트리밍 환경에서는 전체 크기 $n$가 정해져 있지 않습니다.** 그럼, 일정 기간 수집한 후 무작위 샘플링을 하면 되겠지만, 이 방법은 실시간성이 떨어지며, 해당 기간동안 수집된 데이터를 전부 저장해야하는 비용이 발생합니다. **2) 데이터가 발생할 때마다, 저장할지, 버릴지를 그 순간 결정할 수 있어야 합니다.**

저수지 샘플링은 이런 제약 하에서, 스트림이 어떤 시점(해당 시점에서 총 $n$개 데이터)에서 종료되든지, 저수지(reservoir)에 저장된 $k$개의 데이터가 공정하게 $\frac{k}{n}$ 확률로 샘플링되었음을 보장합니다.

## 2. Algorithm R
저수지 샘플링 중에 가장 간단하고 대표적인 알고리즘인 **algorithm R**을 살펴봅시다.

#### 알고리즘
1. **초기화** : 스트림에서 첫 $k$개 데이터를 크기가 $k$인 저수지 배열 $R$에 담습니다.
2. **처리** : $k+1$번째 데이터부터 스트림이 끝날 때까지 다음을 반복
	- $k$보다는 큰 $i$-th 데이터($x_i$)에 대해:
    	
        * 1~$i$까지 범위에서 무작위 정수 $j$를 선택
        * $j$가 $k$보다 작으면, 
        저수지 $R$의 $j$-th 데이터를 $x_i$로 교체
        * $j$가 $k$보다 크면, 
        $x_i$를 버림

#### 왜 방식이 공정한지 증명
모든 데이터가 공정하게 $\frac{k}{n}$로 뽑혀야한다는 말은, $n$개 까지 데이터를 pass했을 때 모든 데이터 $x_i$가 크기 $k$인 저수지 $R$에 남아있을 확률이 $\frac{k}{n}$여야 한다는 의미이므로, 이를 수학적 귀납법으로 증명해보겠습니다.

- **가설** : 데이터 $x_i, (1\leq i \leq k)$는 $n$-th 시점에 크기가 $k$인 저수지 $R$에 남아있을 확률이 $\frac{k}{n}$이다.

$$
P(n)=P(x_i \space \text{remains at n-th})=\frac{k}{n}
$$

- **Trivial case** : $n=k$

$$
P(k)=P(x_i\space\text{remains at k-th})=\frac{k}{k}
$$

$\text{LHS}=P(x_i \text{ remains at k-th})=1$ (첫 $k$개는 100%확률로 뽑힌다.) 
$\text{RHS}=\frac{k}{k}=1$
$\Rightarrow\text{LHS}=\text{RHS}$
$\Rightarrow\text{P(k)}$ 성립

- $P(m)=\frac{k}{m}$라고 가정

$$
P(m+1)=\frac{k}{m+1}
$$

$\text{LHS}=P(x_i \text{ remains at (m+1)-th})$
$\space\space\space\space\space\space\space\space\text{}=P(x_i \text{ selected at m-th})\times P(x_i \text{ not replaced at (m+1)-th})$
$\space\space\space\space\space\space\space\space\space=P(m)\times(1-P(x_i  \text{ replaced at (m+1)-th}))$
$\space\space\space\space\space\space\space\space\space=P(m)\times(1-\frac{k}{m+1}\times\frac{1}{k}))$ # k개 안에 들어야하고, 그 중에 또 뽑혀야 대체된다.
$\space\space\space\space\space\space\space\space\space=\frac{k}{m}\times \frac{m}{m+1}=\frac{k}{m+1}=\text{RHS}$
$P(m)$이 성립할 때 $P(m+1)$도 성립하므로, 가설 $P(n)=\frac{k}{n}$는 참

따라서, 저수지 샘플링에서 모든 데이터 $x_i$가 뽑힐 확률은 $k/n$로 공정합니다.

#### 장점
1. **고정 메모리**: $O(k)$의 메모리만 사용하고, 전체 데이터 크기 $n$과 무관
2. **single pass**: 데이터가 들어올 때 딱 한번만 읽습니다.
3. **공정성**: 해당 시점까지 데이터에 대해 공정한 무작위 샘플링을 보장

#### 단점
1. $i>k$일 때 난수를 생성하는 $O(n)$ 비용 발생 -> algorithm L로 $O(k\space log\space n)$으로 가능
2. 가중치 미고려
