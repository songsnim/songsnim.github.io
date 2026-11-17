---
title: "[ML] Transformer 연산량 줄이기 2편: KV cache, MQA·GQA·MLA"
topics:
  - ML
description: KV head를 공유하거나 latent로 압축해 token당 cache를 줄이는 세 가지 방법
draft: true
---
# 1. Background
1편에서 attention 비용 절감 기법을 FLOPs, KV cache, System 세 축으로 나눴다. 1편은 FLOPs 축이었고, 이 글은 KV cache 축이다. 이 축의 기법은 token당 저장하는 양을 줄이며, 그 대가로 모델 구조가 달라진다.

## 1-1. KV cache는 얼마나 되나
Decode는 매 step 새 token의 $k$, $v$를 cache에 쌓고, 이후 모든 step이 이 cache 전체를 읽는다. Multi-head attention(MHA)에서 token 하나, layer 하나의 cache는 head마다 $k$와 $v$ 하나씩이므로

$$
\text{cache}_{\text{MHA}} = 2\, h\, d_h = 2d \quad (\text{값 개수/token/layer})
$$

이다. 전체는 여기에 layer 수 $L$, 원소당 byte 수 $b$, sequence 길이 $n$, batch 크기 $B$를 곱한다. 이 cache는 $n$과 $B$에 비례해서 커지고, context가 길고 동시 요청이 많을수록 모델 weight보다 커질 수 있다.

## 1-2. 왜 줄여야 하나: decode는 memory-bound다
Decode의 한 step에서 한 layer의 attention은 query 1개를 cache 전체와 비교한다. KV head가 $g$개라 하면

- FLOPs: $QK^\top$와 $\text{score} \cdot V$ 모두 query head $h$개가 각자 $n$개 key를 보므로 $4\,n\,h\,d_h$
- 읽는 byte: cache 전체이므로 $2\,n\,g\,d_h\,b$

이고, 연산 강도(arithmetic intensity)는

$$
\frac{\text{FLOPs}}{\text{bytes}} = \frac{2h}{g\,b}
$$

이다. MHA($g = h$)이고 fp16($b = 2$)이면 1 FLOP/byte다. A100은 fp16 연산 성능이 312 TFLOPS이고 대역폭이 약 2TB/s이므로, 연산 강도가 약 150 FLOPs/byte를 넘어야 compute-bound가 된다. 1 FLOP/byte는 이보다 두 자릿수 작다. Decode attention의 시간은 cache를 읽는 시간이 정하므로, cache를 줄이면 속도가 오르고 같은 메모리에 더 큰 batch를 담을 수 있다.

이 식에서 $g$가 줄면 연산 강도가 $h/g$배로 늘어난다는 점도 보인다. 아래 세 기법은 $g$를 줄이는 방법(MQA, GQA)과 cache를 다른 공간으로 옮기는 방법(MLA)이다. 기호는 1편과 같고, $g$는 KV head 수다.

---
# 2. MQA: KV head를 하나로
Multi-query attention[^mqa]은 query head는 $h$개 그대로 두고 $K$, $V$ head를 하나만 둔다. 모든 query head가 같은 $k_s, v_s$를 본다.

$$
o_{t,i} = \sum_{s \le t} \text{softmax}_s\!\left(\frac{q_{t,i}^\top k_s}{\sqrt{d_h}}\right) v_s, \qquad i = 1, \dots, h
$$

- cache: $2d_h$로, MHA의 $\frac{1}{h}$
- 연산 강도: $\frac{2h}{b}$로, MHA의 $h$배
- attention FLOPs는 그대로다. $q$ head가 $h$개이므로 $QK^\top$ 계산 횟수는 같다. 줄어드는 것은 $K$, $V$ projection의 파라미터와 cache다.

$h = 64$이면 cache가 64배 작아지지만 표현력도 줄어든다. Head마다 다른 관점에서 key를 볼 수 없기 때문이다. 실제로 MHA 대비 품질이 떨어지고 학습이 불안정해지는 경우가 보고되어, 이 극단 대신 중간 값이 필요해졌다.

---
# 3. GQA: 그룹으로 나눠 공유
Grouped-query attention[^gqa]은 query head를 $g$개 그룹으로 나누고, 그룹마다 $K$, $V$ head 하나를 공유한다. $g = h$이면 MHA이고 $g = 1$이면 MQA이므로 둘을 잇는 한 개의 손잡이다. Query head $i$는 그룹 $\lceil i g / h \rceil$의 $k$, $v$를 쓴다.

- cache: $2 g d_h$로, MHA의 $\frac{g}{h}$
- 연산 강도: $\frac{2h}{g\,b}$

Llama 2 70B와 Llama 3가 쓰는 $h = 64$, $g = 8$이면 cache가 $\frac{1}{8}$이다. 품질은 MHA에 거의 가깝고 속도는 MQA에 가깝다는 것이 원논문의 결론이다.

원논문의 또 다른 기여는 이미 학습된 MHA checkpoint를 GQA로 바꾸는 방법이다. 같은 그룹에 속한 KV head들의 projection weight를 평균(mean pooling)해 하나로 합친 뒤, 원래 pretraining 연산량의 약 5%만큼 추가 학습한다. 그룹 안 head를 평균내면 서로 다른 head의 정보가 섞이므로 추가 학습 없이는 품질이 떨어진다. 이 uptraining 방식이 GQA가 널리 퍼진 이유 중 하나다.

---
# 4. MLA: head를 줄이는 대신 latent로 압축
MQA와 GQA는 head 수를 줄여 cache를 줄였고, 그 대가로 표현력이 줄었다. Multi-head latent attention[^mla]은 head 수는 $h$개 그대로 두고, $k$와 $v$를 저차원 latent 하나에서 복원해 쓴다. Cache에는 복원된 $k$, $v$가 아니라 latent만 저장한다.

## 4-1. Low-rank 결합 압축
Token $t$의 hidden state $h_t$에서 latent $c_t$를 만들고, 여기서 모든 head의 $k$, $v$를 복원한다.

$$
c_t = W^{DKV} h_t \in \mathbb{R}^{d_c}, \qquad k^C_{t,i} = W^{UK}_i\, c_t, \qquad v_{t,i} = W^{UV}_i\, c_t
$$

$W^{DKV}$는 차원을 줄이는 down-projection, $W^{UK}_i$, $W^{UV}_i$는 head $i$의 up-projection이다. $d_c \ll h\,d_h$이므로 latent 하나가 $2\,h\,d_h$개 값을 대신한다. $K$와 $V$가 같은 latent를 공유하므로 둘을 따로 압축하는 것보다 cache가 작다. Head마다 up-projection이 다르므로 head별로 서로 다른 $k$, $v$를 만들 수 있다.

## 4-2. RoPE와 충돌한다
Cache에 $c_t$만 두면 decode 때마다 모든 과거 token의 $k$를 $W^{UK}_i c_s$로 복원해야 해서 FLOPs와 읽는 양이 오히려 늘어난다. 이 복원을 없애는 방법이 다음 절의 absorption이다. 그런데 absorption은 RoPE와 양립할 수 없다.

RoPE는 위치 $t$, $s$에 따라 $q$, $k$에 회전 행렬 $R_t$, $R_s$를 곱한다. Score는

$$
q_t^\top R_t^\top R_s\, k_s = q_t^\top R_{s-t}\, k_s
$$

이고, $R_{s-t}$는 상대 위치에 의존하는 행렬이다. $k_s = W^{UK}_i c_s$를 대입하면 $W^{UK}_i$와 $R_{s-t}$ 사이에 순서가 끼어 $W^{UK}_i$를 $q$ 쪽으로 옮길 수 없다. 옮기려면 $s - t$마다 다른 행렬을 새로 곱해야 하는데, 이것이 곧 복원 연산이다.

해법은 위치 정보를 별도 채널로 분리하는 것이다(decoupled RoPE). $k$를 내용 부분과 위치 부분으로 나눈다.

$$
k_{t,i} = \left[\, k^C_{t,i} \,;\, k^R_t \,\right], \qquad k^R_t = \text{RoPE}\!\left(W^{KR} h_t\right) \in \mathbb{R}^{d_h^R}
$$

위치 부분 $k^R_t$는 모든 head가 공유하고 latent 밖에서 따로 cache에 저장한다. Query도 같은 방식으로 내용 부분 $q^C_{t,i}$와 위치 부분 $q^R_{t,i}$로 나뉘고, score는 두 부분의 합이다.

$$
\text{score}_{t,s,i} = \frac{q^{C\top}_{t,i}\, k^C_{s,i} + q^{R\top}_{t,i}\, k^R_s}{\sqrt{d_h + d_h^R}}
$$

그러면 token당 cache는

$$
\text{cache}_{\text{MLA}} = d_c + d_h^R
$$

이다. DeepSeek-V2는 $d_c = 4 d_h = 512$, $d_h^R = d_h / 2 = 64$를 쓴다.

## 4-3. Absorption: 복원하지 않고 latent에서 바로 계산
내용 부분의 score에서 $k^C_{s,i} = W^{UK}_i c_s$를 풀어 쓰면

$$
q^{C\top}_{t,i}\, W^{UK}_i\, c_s = \left(W^{UK\top}_i\, q^C_{t,i}\right)^\top c_s
$$

이다. $W^{UK}_i$는 $s$에 의존하지 않으므로 query 쪽으로 옮길 수 있다. 새 query $\tilde q_{t,i} = W^{UK\top}_i q^C_{t,i} \in \mathbb{R}^{d_c}$는 token $t$마다 한 번만 만들면 되고, 과거 token의 $k$를 복원할 필요가 없다. Value도 같다. Softmax 가중치 $a_{t,s,i}$로 가중합한 뒤에 up-projection을 하면 된다.

$$
o_{t,i} = \sum_s a_{t,s,i}\, W^{UV}_i\, c_s = W^{UV}_i \sum_s a_{t,s,i}\, c_s
$$

$W^{UV}_i$는 출력 projection $W^O$와 합쳐 둘 수 있다. 결과적으로 decode의 attention은 $\{c_s\}$와 $\{k^R_s\}$만 읽는 계산이 된다. 모든 query head가 같은 $c_s$를 본다는 점에서, absorption을 적용한 MLA는 key/value head 하나를 $h$개 query head가 공유하는 MQA와 같은 구조다. 다만 이 head의 차원이 $d_h$가 아니라 $d_c + d_h^R$이다. DeepSeek-V3.2의 DSA 논문도 MLA를 이 MQA 형태로 구현했다고 설명한다.[^dsa]

## 4-4. 비용: 연산 강도가 반대로 움직인다
Absorption 모드에서 head당 $QK^\top$는 $d_c + d_h^R$차원, $\text{score} \cdot V$는 $d_c$차원 내적이다. Token 하나에 대해 head당 FLOPs는 $2(d_c + d_h^R) + 2d_c$이고, 읽는 양은 $(d_c + d_h^R)\,b$ byte다. 연산 강도는

$$
\frac{h\left[\,2(d_c + d_h^R) + 2d_c\,\right]}{(d_c + d_h^R)\, b}
$$

이다. $h = 128$, $d_c = 512$, $d_h^R = 64$, $b = 2$를 넣으면 약 240 FLOPs/byte다. 앞 절에서 본 A100의 기준(약 150)을 넘으므로, GQA와 MQA가 항상 memory-bound인 것과 달리 MLA의 decode는 compute-bound 쪽으로 넘어간다. Cache를 작게 만든 대가로 읽는 byte당 일을 더 많이 하게 된다. MLA decode 커널은 대역폭보다 연산 성능이 병목이 될 수 있다.

Prefill은 absorption을 쓰지 않고 $k$, $v$를 복원해 일반 MHA처럼 계산한다. $n$개의 query가 복원 비용을 나눠 갖기 때문이다.

---
# 5. 정리
DeepSeek-V2 설정($h = 128$, $d_h = 128$, $L = 60$, fp16)을 기준으로 token당 cache를 비교하면 다음과 같다. $g = 8$은 GQA의 예시 값이다.

| | token/layer당 값 개수 | MHA 대비 | token당 전체 | 연산 강도 (FLOPs/byte) |
| :--- | :--- | :--- | :--- | :--- |
| MHA | $2 h d_h = 32768$ | 1 | 약 3.9MB | 1 |
| GQA ($g = 8$) | $2 g d_h = 2048$ | $\frac{1}{16}$ | 약 246KB | 16 |
| MQA | $2 d_h = 256$ | $\frac{1}{128}$ | 약 31KB | 128 |
| MLA | $d_c + d_h^R = 576$ | 약 $\frac{1}{57}$ | 약 69KB | 약 240 |

세 기법의 차이는 줄이는 방식에 있다.

- MQA와 GQA는 서로 다른 head의 $k$, $v$를 같게 만들어 cache를 줄인다. 표현력이 줄고, 줄이는 정도는 $g$로 정한다.
- MLA는 head마다 다른 $k$, $v$를 유지하고, 저차원 latent에서 복원할 수 있게 해서 cache를 줄인다. 대신 RoPE를 분리해야 하고 decode가 compute-bound 쪽으로 이동한다.
- 셋 모두 attention FLOPs 자체는 줄이지 않는다. 1편의 FLOPs 축 기법(sliding window, sparse, linear)과 직교하므로 함께 쓴다. DSA는 MLA 위에 sparse attention을 얹은 구조다.

이 축은 모델 구조를 바꾸므로 pretraining 단계에서 결정해야 한다. 이미 학습된 모델에 후처리로 cache를 줄이고 싶다면 양자화나 eviction이 있고, 같은 계산을 메모리에서 더 빨리 하는 방법은 System 축이며 3편에서 다룬다.

[^mqa]: "Fast Transformer Decoding: One Write-Head is All You Need" (Shazeer, 2019)
[^gqa]: "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints" (Ainslie et al., EMNLP 2023)
[^mla]: "DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model" (DeepSeek-AI, 2024)
[^dsa]: "DeepSeek-V3.2-Exp: Boosting Long-Context Efficiency with DeepSeek Sparse Attention" (DeepSeek-AI, 2025)
