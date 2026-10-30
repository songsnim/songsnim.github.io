---
title: "[ML] Transformer FLOPs를 줄이는 방법 2편"
topics:
  - ML
description: "Linear attention"
draft: true
---
# 1. Background
1편에서 sliding window와 sparse attention은 계산할 $(q, k)$ 쌍의 수를 줄였다. Linear attention[^linear]은 쌍을 고르는 대신 $n \times n$ score 행렬을 만들지 않는다. 2~5절과 7절은 원논문 기준이고, 6절은 5절의 한계를 다룬 후속 연구 두 편(Schlag et al.[^fwp], Yang et al.[^gdn])을 소개한다. 기호는 1편과 같고 head 하나를 기준으로 한다. $q, k, v$의 차원은 모두 $d_h$이고, causal mask로 생기는 $\frac{1}{2}$은 비용식에서 무시한다.

---
# 2. n×n은 exp 때문에 생긴다
Softmax attention의 출력은 value의 가중 평균이다.

$$
o_t = \sum_{s \le t} \frac{\text{sim}(q_t, k_s)}{\sum_{s' \le t} \text{sim}(q_t, k_{s'})}\, v_s, \qquad \text{sim}(q, k) = \exp\!\left(\frac{q^\top k}{\sqrt{d_h}}\right)
$$

$\text{sim}$이 음이 아니기만 하면 가중 평균 구조는 유지된다. 따라서 바꿀 수 있는 부분은 $\text{sim}$뿐이다.

내적 $q^\top k$ 자체는 문제가 아니다. $\text{sim}(q, k) = q^\top k$이면 $q^\top k_s$가 스칼라라서 $v_s$ 뒤로 옮길 수 있다.

$$
\sum_{s \le t} v_s \left(k_s^\top q_t\right) = \Big(\sum_{s \le t} v_s k_s^\top\Big) q_t
$$

괄호 안은 $q_t$에 의존하지 않으므로 $n \times n$ 점수를 만들 필요가 없다. $\exp(q^\top k)$는 이렇게 분리되지 않는다. 일반적으로 $\text{sim}(q, k) = \phi(q)^\top \phi(k)$ 꼴이면 같은 이동이 가능하고, 원논문은 이 $\phi$를 feature map이라 부른다. 음이 아니려면 $\phi$의 출력이 음이 아니면 충분하다. 행렬로 쓰면

$$
\left(\phi(Q)\phi(K)^\top\right)V = \phi(Q)\left(\phi(K)^\top V\right)
$$

이고, 왼쪽은 $n \times n$ 행렬을 만들지만 오른쪽은 $C \times d_h$ 행렬만 만든다. $C$는 $\phi$의 출력 차원이다. 원논문은 $\phi(x) = \text{elu}(x) + 1$을 쓴다(출력이 양수이고 $C = d_h$).

---
# 3. 비용은 C/n이다
Softmax attention의 head당 FLOPs는 $4n^2 d_h$이고, 결합법칙을 쓴 쪽은 $4nCd_h$다. 비율은

$$
\frac{\text{linear}}{\text{full}} = \frac{C}{n}
$$

이므로 $n > C$이면 linear가 싸다. $C = d_h$이면 $n$에 선형이다. $\exp$의 feature map은 차원이 무한이라 $C$가 유한한 $\phi$로는 softmax를 정확히 재현할 수 없고, linear attention은 softmax의 근사가 아니라 다른 $\text{sim}$을 쓰는 attention이다.

---
# 4. Causal이면 고정 크기 state를 갱신하는 RNN이다
$\sum_{s \le t}$는 누적이므로 이전 값에 한 항만 더하면 된다.

$$
S_t = S_{t-1} + v_t\, \phi(k_t)^\top, \qquad z_t = z_{t-1} + \phi(k_t), \qquad o_t = \frac{S_t\, \phi(q_t)}{z_t^\top \phi(q_t)}
$$

$S_t \in \mathbb{R}^{d_h \times C}$와 $z_t \in \mathbb{R}^C$가 전부이고 크기가 $t$와 무관하다. Decode에서 softmax는 token마다 $t$에 비례하는 KV cache를 읽고, linear는 $S_t$ 하나를 읽는다. 원논문이 "Transformer는 RNN이다"라고 한 근거가 이 식이다.

---
# 5. 대가는 같은 고정 크기다
$S_t$에는 token이 몇 개 들어가든 $d_h \times C$ 숫자만 있다. $S_t \phi(k_j)$는

$$
S_t\, \phi(k_j) = v_j\, \phi(k_j)^\top \phi(k_j) + \sum_{s \ne j} v_s\, \phi(k_s)^\top \phi(k_j)
$$

이고, 둘째 항이 다른 token의 value가 섞여 들어오는 부분이다. $\phi(k)$들이 서로 직교하는 단위 벡터이면 둘째 항이 0이다. $d_h = 2$, 항등 $\phi$에서 $k_1 = (1, 0)$, $k_2 = (0, 1)$이면 $Sk_1 = v_1$이다. $k_2 = (1/\sqrt{2}, 1/\sqrt{2})$로 바꾸면 $Sk_1 = v_1 + v_2/\sqrt{2}$로 $v_2$가 섞인다. $C$차원에서 서로 직교하는 벡터는 최대 $C$개이므로 $t > C$이면 이 섞임을 피할 수 없다.

Softmax도 다른 $v_s$가 조금씩 섞이지만, KV cache가 $t$개의 $(k, v)$를 모두 가지고 있어서 $t$가 커져도 원하는 항목을 찾을 수 있다. Linear의 $S_t$는 이 정보를 $C \times d_h$ 숫자로 줄여 두었기 때문에 줄어든 만큼 잃는다.

---
# 6. 후속 연구는 이 한계를 어떻게 다루나
5절의 한계를 정식으로 다룬 쪽은 원논문이 아니라 Schlag et al.(2021)[^fwp]이다. 이 논문은 $S_t$를 key로 읽고 value를 쓰는 연상 기억으로 본다. 간섭이 없으려면 key가 서로 직교해야 하므로, 시퀀스가 $\phi$의 출력 차원($d_{\text{dot}}$, 이 글의 $C$)보다 길면 용량을 넘는다고 설명한다. 형식적 논의는 Smolensky(1990)의 tensor product representation 이론에 맡긴다.

실험으로도 확인한다. $d_{\text{key}} = 64$에서 서로 다른 key-value 쌍을 20개부터 600개까지 늘리며 연상 검색을 학습시키면, $C = 64$인 linear attention은 60개 이상에서 오차가 쌓이기 시작한다. $C$를 128, 256, 384로 키운 $\phi$(DPFP)는 쌍이 각각 128, 256, 384개에 가까워지면 쌓이기 시작한다. Softmax는 모든 $\phi$보다 낫지만 key가 500개를 넘으면 완전히 수렴하지 못한다.

이 논문의 해법은 쓰기 방식이다. 4절의 갱신은 항상 더하기만 한다. Delta rule은 쓰기 전에 같은 key로 지금 저장된 값을 읽고, 새 값과의 차이만큼만 고친다.

$$
\bar v_t = S_{t-1}\phi(k_t), \qquad S_t = S_{t-1} + \beta_t\,(v_t - \bar v_t)\,\phi(k_t)^\top
$$

$\beta_t \in [0, 1]$은 token에서 계산하는 쓰기 강도다. $\phi(k_t)^\top\phi(k_t) = 1$이고 $\beta_t = 1$이면 $S_t\phi(k_t) = v_t$이므로 같은 key의 옛 값은 쌓이지 않고 새 값으로 교체된다. 위 식은 정규화를 뺀 형태이고, 논문은 $\phi$를 성분 합으로 나누는 정규화를 쓴다. 용량 $C$ 자체는 그대로다.

Yang et al.(2025)[^gdn]은 여기에 gate를 더한다. Mamba2의 gate $S_t = \alpha_t S_{t-1} + v_t k_t^\top$는 저장된 모든 연상을 같은 비율 $\alpha_t \in (0, 1)$로 줄이고, delta rule은 한 번에 key 하나의 연상만 고친다. 둘을 합친 gated delta rule은 ($\phi$를 뺀 표기로)

$$
S_t = S_{t-1}\big(\alpha_t (I - \beta_t k_t k_t^\top)\big) + \beta_t v_t k_t^\top
$$

이고, $\alpha_t \to 0$이면 상태를 빠르게 비우고 $\alpha_t \to 1$이면 순수 delta rule이 된다.

같은 논문은 Gated DeltaNet 층과 sliding window attention(창 2K)을 섞은 hybrid도 만든다. 고정 크기 state는 검색에 불리하다는 선행 연구의 지적이 동기다. 1.3B 모델을 입력 2K token으로 자른 실문서 검색 과제에서 평균은 Gated DeltaNet 30.6, Transformer++ 37.0, hybrid 39.0과 40.1이다. 순수 recurrent 모델은 모두 Transformer++보다 낮았다. 이 표에서는 gate와 delta rule을 써도 고정 크기 state의 한계가 남는다.

---
# 7. 원논문 실험은 무엇을 보였나
속도와 메모리는 $n$에 선형으로 늘었고, 품질은 과제마다 다르다.

| 과제 | 지표 | Softmax | Linear |
|:---|:---|:---|:---|
| MNIST 생성 | bits/dim | 0.621 | 0.644 |
| CIFAR-10 생성 (각 1주 학습) | bits/dim | 3.47 | 3.40 |
| WSJ 음소 인식 | PER | 5.12 | 8.08 |

CIFAR-10 생성 처리량의 "4,462×"는 key와 value를 저장하지 않는 기본 구현 대비다. Cache를 쓰는 softmax 대비로는 약 56배이고, batch 1 지연은 GPU에서 1.14배다. 원논문에는 5절의 한계를 직접 겨냥한 실험이 없고, 그 실험은 6절의 Schlag et al.에 있다.

---
# 8. 정리
$\text{sim}$을 $\phi(q)^\top\phi(k)$로 분리하면 결합법칙으로 $n \times n$이 사라지고 비용이 $C/n$배가 된다. Causal에서는 고정 크기 state를 갱신하는 RNN이 되어 decode 비용이 $n$과 무관하다. 대가는 같은 고정 크기이고, $n > C$이면 token들의 정보가 섞인다. 원논문은 이를 풀지 않았고, 후속 연구는 쓰기 방식(delta rule), gate, attention과의 hybrid로 다룬다.

[^linear]: "Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention" (Katharopoulos et al., ICML 2020)
[^fwp]: "Linear Transformers Are Secretly Fast Weight Programmers" (Schlag, Irie, Schmidhuber, ICML 2021)
[^gdn]: "Gated Delta Networks: Improving Mamba2 with Delta Rule" (Yang, Kautz, Hatamizadeh, ICLR 2025)
