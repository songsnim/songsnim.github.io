---
title: "[ML] LoRA: 닭 잡는 칼로 닭 잡기"
topics:
  - ML
description: 1% 학습 파라미터 수로 full fine tuning 수준 성능 내기
draft: false
---
# 1. Background
## 1-1. Full fine-tuning의 문제점: 소 잡는 칼로 닭 잡기
LLM을 특정 task에 fine tuning하기 위해서 모든 weight를 trainable로 학습하는 방법을 full fine tuning이라고 한다. 하지만, 닭 잡는 데 소 잡는 칼을 쓸 필요는 없다. 특정 task의 성능을 살짝 더 올리기 위해, 거대한 LLM 모델의 가중치를 다 건드릴 필요가 없다는 말이다. 오래 걸리는 것은 당연지사고, checkpoint를 저장하기 위해서 상당한 메모리가 필요하다. 

## 1-2. 기존 대안들의 단점
> 핵심: Adapter는 inference latency를, prefix/prompt tuning은 사용 가능한 sequence length를 희생한다.

Full fine tuning의 문제를 해결하기 위해 Adapter와 prefix tuning같은 대안이 제안된다. 두 기법은 full fine tuning 대비 현저히 적은 학습 파라미터로 준수한 fine tuning 성능을 내는 것에는 성공했으나 각자 단점을 갖는다. 

Adapter는 기존 가중치를 전부 freeze하고 작은 추가 레이어를 끼우는 방식이다. 레이어가 추가되어 추론시간이 조금 늘어나는 inference latency 문제가 있다. 게다가 레이어에 비선형 활성함수를 포함하면 행렬 연산적으로 다른 레이어와 합칠 수도 없다. 게다가 모델 구조 자체가 변경되는 방식이기 때문에 기존 사전학습된 모델의 아키텍처가 유지되지 않는다는 단점이 있다.

prefix tuning의 경우 기존 가중치를 freeze한 채로 모델 레이어 별로 K와 V 임베딩 앞에 random init된 prefix를 이어 붙여 fine-tuning한다. Adapter와 다르게 모델 구조를 유지할 수 있지만, 결국 context window 한켠을 차지하고 prefix만큼 추론 비용이 고정적으로 늘어난다는 단점이 있다. 게다가 weight 자체를 바꾸는 것이 아니라 attention이 읽는 별도 KV이기 때문에, 사전학습된 가중치 분포에서 먼 task의 경우 성능이 부족할 수 있다.

---
# 2. Method
## 2-1. 문제 정의
사전 학습된 weight $W_0$을 fine tuning한 후의 weight를 $W$라고 하면, $W=W_0+\Delta W$ 다. Full fine tuning은 $W_0$를 freeze하고 동일 차원의 $\Delta W$를 trainable parameter로 두고 목표 task를 재학습한다. 여기서 LoRA는 해결할 문제를 다음 질문으로 정의한다.

> $\Delta W$의 크기는 그대로 두고 학습파라미터를 어떻게 줄일 수 있는가?
## 2-2. LoRA의 방법론
LoRA의 핵심 아이디어는 $\Delta W$를 더 낮은 rank의 $B$와 $A$로 분해하는 것이다. 예를 들어, $d \times k$ 크기의 $\Delta W$를 $d \times r$ 크기의 $B$와 $r \times k$ 크기의 $A$의 곱으로 대체한다.
$$
\underbrace{\Delta W}_{d \times k} = \underbrace{B}_{d \times r}\;\underbrace{A}_{r \times k}, \qquad r \ll \min(d, k)
$$
학습해야할 파라미터의 갯수가 $d\times k$개애서 $(d+k)\times r$개가 된다. 만약 $r$이 $d,k$보다 충분히 작다면, 학습 파라미터의 갯수가 기존 대비 압도적으로 줄어들게 된다. 대신 학습 파라미터 갯수가 줄게 되므로 다음 질문에 답해야 한다. 

> $r$값을 작게 해도 fine-tuning 성능에 손해가 없는가?

LoRA는 사전학습된 모델이 낮은 intrinsic dimension을 가진다는 관찰[^intrinsic]에서 출발해, 적응 중 weight 변화량 $\Delta W$ 자체가 낮은 intrinsic rank를 가진다고 가정한다.[^lora] 그러니까, $\Delta W$는 적은 몇 개의 독립 방향으로도 충분히 표현이 가능한 low rank 행렬이라는 가정이다. 모든 방향(학습 파라미터)를 다 고려할 필요가 없다는 말이다. 닭 잡는 데 소 잡는 칼을 들고 올 필요가 없다.

정리하면, LoRA는 $W_0$를 고정하고 $A$, $B$만 학습하며 forward를 다음과 같이 계산한다. $\alpha$는 scaling 상수다. 

$$
h = W_0 x + \frac{\alpha}{r}\, B A x, \qquad W = W_0 + \frac{\alpha}{r}\, BA
$$

## 2-3. 학습과 추론 시 다른 점
**학습.** $W_0$는 freeze하고 $A$, $B$만 학습한다. 두 경로를 따로 계산하며, $BA$를 미리 곱하지 않고 $B(Ax)$ 순서로 계산한다. $d \times k$ 중간 행렬을 만들지 않으므로 연산량이 $d\,r\,k$에서 $r(d+k)$로 줄고, 메모리 이점도 유지된다.

$$
h = W_0 x + \frac{\alpha}{r}\, B(Ax)
$$

$W_0$는 갱신 대상이 아니므로 weight gradient와 Adam의 1, 2차 moment가 필요 없다. 이 둘은 $A$, $B$에 대해서만 유지한다. 다만 $A$, $B$까지 loss가 전달되려면 backward가 $W_0$를 통과해야 하므로 activation에 대한 gradient는 그대로 계산한다. 

학습 안정성을 fine tuning 출발 지점은 사전학습 모델 $W_0$로 만들어야 한다. 따라서 $\Delta W$에 해당하는 항의 초기값을 0으로 만들어야 한다. 단, $B$와 $A$를 둘 다 0으로 두면 gradient가 0이 되므로 둘 중 1개만  0으로 둬야 한다. 

$$
\frac{\partial L}{\partial B} = g\,(Ax)^\top, \qquad
\frac{\partial L}{\partial A} = B^\top g\,x^\top
$$

단, 왜 하필 $B$가 0이어야 하는지는 논문에서 밝히지 않고 있다. 관례라고 봐도 될 듯 하다.

**추론**
학습이 끝나면 나면 $BA$를 한 번만 계산해 산해 $W에 더해 두고 추론을 진행한다.

$$
W = W_0 + \frac{\alpha}{r}\, BA
$$

$BA$가 $d \times k$이므로 합쳐도 구조가 같다. 이후에는 $Wx$ 하나만 계산하므로 fine-tuned 모델과 latency가 같다. 따라서, fine tuning 했다고 말 안하면, 이게 사전학습까지만 된 상태인지, fine tuned 상태인지 알 길이 없다. Task를 바꿀 때는 $BA$를 빼고 다른 task의 $B'A'$를 더하면 된다. Adapter는 중간에 비선형이 있어서 이렇게 합칠 수 없다. 

---
# 3. LoRA toy-project 실험 결과
## 3-1. setup
사전 학습된 DistilBERT를 LoRA로 fine tuning해 영화 리뷰 이진 분류에 맞추는 실험을 진행했다.

- Task: rotten_tomatoes 영화 리뷰의 긍정/부정 이진 분류
- Dataset: train 2,000개(seed로 샘플링), test 1,066개
- 모델: `distilbert-base-uncased`(66M), 분류 head는 새로 초기화
- 세 가지 설정
  - head: backbone을 freeze하고 head(`pre_classifier`, `classifier`)만 학습
  - full: 전체 학습 (lr 2e-5)
  - LoRA: `q_lin`, `v_lin`에 적용, $\alpha = r$, lr 3e-4, head도 함께 학습. $r \in \{1, 2, 4, 8, 16, 32\}$ sweep
- 공통: 3 epoch, batch 32, max length 64, seed 3개(0, 1, 2) 평균

## 3-2. 실험 결과

| 설정 | trainable | test acc (seed 3개 평균) |
| :--- | ---: | ---: |
| head | 592,130 | 0.7705 |
| full | 66,955,010 | 0.8224 |
| LoRA $r=1$ | 610,562 | 0.8118 |
| LoRA $r=2$ | 628,994 | 0.8192 |
| LoRA $r=4$ | 665,858 | 0.8140 |
| LoRA $r=8$ | 739,586 | 0.8283 |
| LoRA $r=16$ | 887,042 | 0.8180 |
| LoRA $r=32$ | 1,181,954 | 0.8243 |

- LoRA 파라미터만 보면 $r=8$에서 147,456개로, full의 약 0.22%다.
- head 대비 LoRA는 full에 근접한 성능을 달성했다.
- $r=1$인 경우와 $r=32$인 경우의 성능 폭이 좁다.

---
# 4. 결론
LoRA는 $\Delta W$를 저랭크 행렬 2개로 쪼개서 $W_0$에 더 하는 방식으로 fine tuning을 수행한다. 게다가 $r=1$인 경우에도 거의 full fine tuning에 준하는 성능을 낸다. 따라서, 특정 task에 사전학습 모델을 사용하기 위해 full fine tuning을 하는 건 닭 잡는 데 소 잡는 칼 꺼내는 격이다. LoRA는 Full fine tuning 대비 1% 미만 수준의 학습 파라미터로 대등한 수준의 성능을 낼 수 있으므로 성능 손해 없이 학습 속도와 메모리를 효율적으로 사용해 fine tuning할 수 있다. 


[^lora]: "LoRA: Low-Rank Adaptation of Large Language Models" (Hu et al., ICLR 2022)
[^adapter]: "Parameter-Efficient Transfer Learning for NLP" (Houlsby et al., ICML 2019)
[^intrinsic]: "Intrinsic Dimensionality Explains the Effectiveness of Language Model Fine-Tuning" (Aghajanyan et al., ACL 2021)
