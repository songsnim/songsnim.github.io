---
title: "[ML] Transformer는 어떻게 RNN을 대체했는가?"
published: 2026-10-06
topics:
  - ML
description: Original Transformer 구조를 깊이 별로 정리한다.
draft: false
---
# 1. Background
기존 RNN 계열 모델은 모던 LLM이 필수적으로 요구하는 대규모 학습과 긴 context window를 구현하기에 구조적인 한계가 있었다.

- Inherently sequential한 구조로 학습 병렬화 불가능
- long range dependency 문제로 거리가 먼 단어 간 관계성 학습이 어려움

Transformer는 sequential transduction을 병렬 학습이 가능한 형태로 모델링하고, global dependency를 `O(1)` path-length로 연산하기 위해 attention만 남긴 구조를 제안한다. Attention만 남기면서 생기는 여러 문제를 해결하기 위해 `positional encoding`, `masked multi-head attention` 등의 디테일도 함께 소개한다.

---
# 2. Architecture
고수준에서 점차 저수준으로 내려가며 설명한다.
$y_0, B, V, t, E$와 beam은 논문에 없는 기호로, 이 글에서 정의한다.

| 기호 | 의미 | 예시 값 |
|:---|:---|:---|
| $x_1 \dots x_n,\ y_1 \dots y_m$ | source, target sequence (정답 label) | 길이 10, 7 |
| $y_0 \dots y_{m-1}$ | decoder 입력: target을 오른쪽으로 한 칸 shift, $y_0$는 시작 token | 길이 7 |
| $z_1 \dots z_n,\ PE_{(pos,2i)}$ | encoder 출력, PE | |
| $d_{\text{model}}, d_{ff}$ | 모델 차원, FFN 차원 | 512, 2048 |
| $d_k, d_v$ | head당 key, value 차원 | 64, 64 |
| $h, N$ | head 수, layer 수 | 8, 6 |
| $W_i^{Q,K,V}, W^O, W_{1,2}, E$ | attention, FFN, embedding 가중치 | |
| $P_{drop}, \epsilon_{ls}$ | dropout, label smoothing | 0.1, 0.1 |
| $warmup\_steps, \alpha$ | warmup 길이, length penalty | 4000, 0.6 |
| $B, V, t$, beam | batch, vocab, 추론 step, beam size | 2, 37000, 3, 4 |

## 2-1. Level 0: Encoder Decoder
가장 높은 수준에서 보면, Transformer는 encoder-decoder 구조다.
- Encoder는 번역하고자 하는 문장 $x$를 $z$로 압축
- Decoder는 오른쪽으로 한 칸 shift된 정답 문장 $y_0 \dots y_{m-1}$과 압축된 $z$를 입력으로 받아 원래 정답 문장 $y_1 \dots y_m$을 출력

예를 들어, `I love you`를 `Ich liebe dich`로 번역하는 경우를 보자. `[I, love, you, <end>]`를 encoder에 넣어 압축한 정보와 `[<start>, Ich, liebe, dich]`를 decoder에 넣으면, decoder는 `[Ich, liebe, dich, <end>]`를 출력한다. 학습 때는 정답을 알고 있으므로 한 칸 오른쪽으로 민 정답의 뒷부분을 masking해 다음 단어를 예측하게 하고, batch 전체를 한 번에 병렬로 학습한다(2-5 참고). 추론 때는 정답을 모르므로 autoregressive하게 loop를 돌려야 한다.

<iframe class="wide" src="http://localhost:4321/posts/attention-is-all-you-need/transformer-level0.html" style="width:100%;aspect-ratio:16/10;border:0" loading="lazy" title="Transformer Level 0: encoder와 decoder의 입출력"></iframe>

## 2-2. Level 1: Stacking
전체 모델을 깊게 만들기 위해 동일한 encoder와 decoder를 아래 figure처럼 각각 6층으로 쌓는다. 최종 압축된 $z$가 모든 decoder layer에 주입되며, decoder는 층별로 다른 정보를 학습한다. 여기서 의문이 생긴다.

- decoder가 층별로 다른 정보를 학습한다면, 최종 $z$가 아니라 층별 $z$를 pairwise하게 각각 주입할 수 있는 것 아닌가?

이 질문에 대한 내 생각은 세 가지다.

1. decoder에 필요한 것은 원래 문장에 대한 이해이지, 얕은 층에서 학습한 단순한 정보가 아님
2. 최종 $z$만 사용하면 모든 decoder 층이 동일한 핵심 압축 정보에 align되어 학습되는 장점
3. pairwise하게 모듈을 구성하면 encoder와 decoder의 개수가 같아야 한다는 제약

실제로 이 아이디어로 실험한 연구가 존재한다.[^pair-wise] 일부 셋업에서 소폭 성능 개선이 있었으나, 이득이 일관되지 않았다는 보고가 있다.
[^pair-wise]: "Layer-wise coordination between encoder and decoder" (He et al., 2018)


<iframe class="wide" src="http://localhost:4321/posts/attention-is-all-you-need/transformer-level1.html" style="width:100%;aspect-ratio:16/10;border:0" loading="lazy" title="Transformer Level 1: encoder와 decoder의 layer stack"></iframe>

## 2-3. Level 2: Layer 입출력 상세
Encoder에 넣기 전 token sequence를 아래 순서로 전처리한다.
- 토큰화
- lookup
- $\sqrt{d_{model}}$ 곱
- positional encoding

#### 토큰화
EN-DE 번역의 경우 BPE 기법으로[^BPE] 약 37000개의 vocab을 구성한다. 번역하려는 문장이 `I love you.`라면, 예를 들어 `[I, lo, ve, you, ., <end>]` 같은 방식으로 토큰화된다.[^token] 입력 source와 출력 target이 vocab을 공유한다.

#### lookup
37000개 vocab의 각 token(row)은 512차원 embedding parameter를 갖는다. 따라서 embedding 행렬 $E$는 `(37000, 512)` 차원을 갖는다. `I love you.` 문장의 각 token index가 2, 100, 78, 382, 7, 101이라면, 문장은 정수 index sequence `[2, 100, 78, 382, 7, 101]`로 전환되고, index별로 $E$의 512차원 행이 선택된다. 따라서 embedding을 거친 sample 하나의 차원은 `(6, 512)`가 된다. 문장 내 token 수가 10개이고 batch 내 문장 수가 2개면, 입력 차원은 `(2, 10, 512)`가 된다. Transformer는 word2vec 같은 사전 학습 embedding을 사용하지 않는다. 대신 행렬 $E$를 `nn.Embedding`으로 end-to-end 학습한다.

encoder 입력, decoder 입력, decoder 출력 직전의 pre-softmax linear, 세 곳이 같은 embedding 행렬 $E$를 공유한다. 이렇게 하면 두 가지 장점이 있다.
- 세 곳에서 같은 weight를 공유하므로 학습 파라미터 절감
- 일관된 입출력 공간

[^BPE]: Byte pair encoding, 참고 문헌: Sennrich, Haddow, Birch. Neural Machine Translation of Rare Words with Subword Units. ACL 2016. arXiv:1508.07909. (원 논문 5.1절은 Britz et al. 2017을 인용하지만, BPE를 NMT에 처음 적용한 것은 Sennrich et al.이다.)

[^token]: 실제로 I love you 문장이 이렇게 토큰화된다는 의미가 아니라, subword와 punctuation, 그리고 `<eos>`가 token에 포함된다는 것을 보여주는 예시

#### $\sqrt{d_{model}}$ 곱
embedding 이후 $\sqrt{d_{model}}$을 곱한다. 특정 차원의 제곱근만큼 값을 키우는 이유는 무엇인가? 논문은 이유를 언급하지 않는다. 추정컨대 embedding을 키우기 위해서라기보다는 분산을 1로 되돌리기 위해 곱하는 것으로 보인다. $E$의 파라미터는 초기화 시 분산을 $1/{d_{model}}$로 작게 잡는다. decoder 출력의 softmax 직전 linear도 $E^T$를 공유하는데, logit의 크기가 $d_{model}$에 따라 커지면 softmax가 불안정해지기 때문이다.

즉, 출력의 분산을 맞추기 위해 작게 초기화한 $E$의 분산을 입력에서는 1로 되돌리려고 $\sqrt{d_{model}}$을 곱한다고 해석할 수 있다.

#### Positional encoding
self-attention만 남기면 permutation equivariance[^equiv] 문제가 발생한다. 단어들의 위치가 바뀌면 self-attention 출력의 위치만 바뀔 뿐, 위치 변경으로 인한 문장의 의미 변화를 담아낼 수 없다. RNN은 inherently sequential한 구조라 이런 문제가 없었다. Transformer에는 위치 정보를 명시적으로 주입해야 한다.

위치 정보를 반영하기 위해 각 token에 번호표를 붙일 수 있다. token당 parameter를 하나 추가해서 $d_{model}+1$ 차원(`513`차원)으로 학습하는 것이다. 그러나 차원 하나로는 긴 문장의 모든 위치를 구분하기 어렵다.

그럼 충분히 늘려서 $2d_{model}$차원(`1024`차원)으로 concat하는 방식은 어떨까? 가능은 하지만, 학습 파라미터가 2배가 된다. 그렇다고 embedding 차원을 절반으로 줄이면 표현력이 절반으로 줄어든다.

결국 token embedding에 번호표에 해당하는 값을 더하는 방식을 택한다. 그럼 어떤 값을 더할까? 위치 인덱스 pos를 그대로 더하면 분산이 1인 embedding 값을 압도해 학습이 불안정해질 수 있다. 그렇다고 pos를 문장 길이로 나눠 정규화하면 값이 `[0,1]` 사이에 갇히는데, 문장 길이가 다르면 같은 값이 다른 위치를 의미하게 되는 문제가 생긴다.

embedding에 값을 더하는 방식을 쓰려면 아래 조건이 필요하다.
- 값이 너무 커지지 않아야 함
- 위치마다 고유

Transformer 논문에서는 sin/cos를 사용하여 `Positional Encoding`을 정의했다.
$$
\begin{aligned}
PE_{(pos,2i)} &= \sin(pos / 10000^{2i/d_{\text{model}}}) \\
PE_{(pos,2i+1)} &= \cos(pos / 10000^{2i/d_{\text{model}}})
\end{aligned}
$$
- 값이 -1과 1 사이이므로 token embedding이 갖는 범위와 동일하다.
- pos가 다르면 512개 값 중 적어도 하나는 다르므로, 위치마다 값이 고유하다.

꼭 sin/cos를 써야 하는 것은 아니다. 위 조건만 만족하면 PE를 정의할 수 있으며, trainable parameter를 PE로 써도 된다. 다만 학습하지 않은 sin/cos 조합만으로도 실험적으로 동일한 성능을 냈다. 따라서 논문은 단순성과 함께, 학습 때보다 긴 sequence로 extrapolate할 여지를 남겨두기 위해 위처럼 PE를 정의했다.

#### Decoder 출력
decoder 출력인 $d_{model}$ 차원 벡터를 vocab 크기의 logit으로 바꾸기 위해 $E^T$를 사용한다. input에서와 달리 $\sqrt{d_{model}}$을 곱하지 않는다. 출력층 `softmax` 값 안정화를 위해 애초에 $1/\sqrt{d_{model}}$로 초기화했기 때문이다.

$E^T$가 $(B, m, d_{model})$을 logit $(B, m, V)$로 바꾼다. softmax 후 위치마다 37000개 중 확률이 가장 큰 token을 고르면 $(B, m)$ 차원의 출력 sequence, 곧 번역된 문장이 나온다.

[^equiv]: 문장 내 단어들의 순서를 섞으면 self-attention 출력도 같은 방식으로 섞일 뿐, 각 token의 출력값 자체는 변하지 않는 성질

<iframe class="wide" src="http://localhost:4321/posts/attention-is-all-you-need/transformer-level2.html" style="width:100%;aspect-ratio:16/10;border:0" loading="lazy" title="Transformer Level 2: embedding, PE, 출력 linear와 softmax"></iframe>

## 2-4. Level 3: Layer 내부
encoder든 decoder든 layer 내 module 연산 이후 공통적으로 `dropout`, `residual connection`, `layer normalization`을 수행한다.

#### dropout
Transformer는 RNN의 직렬성, CNN의 국소성 같은 inductive bias가 없다. parameter 수도 많은 모델이기 때문에 overfitting 위험이 크다. 따라서 의도적인 규제(regularization) 장치가 필요하며, 논문은 dropout을 사용한다. 실험적으로 dropout이 없을 때보다 BLEU와 perplexity가 모두 개선되었다고 말한다.

#### residual connection
layer 하나에 2~3개의 module이 존재하고, encoder와 decoder를 합쳐 12층이 쌓인다. 이렇게 깊은 모델을 학습하려면 residual connection이 필수적이다.

#### Layer Normalization
batch 내 sequence별 길이가 다를 수 있기 때문에 batch norm 대신 layer norm을 사용한다. 또한 self-attention은 `softmax` 연산을 수행하는데, `softmax`는 값의 크기에 민감하기 때문에 normalization이 필수적이다.

<iframe class="wide" src="http://localhost:4321/posts/attention-is-all-you-need/transformer-level3.html" style="width:100%;aspect-ratio:16/10;border:0" loading="lazy" title="Transformer Level 3: encoder layer와 decoder layer 내부"></iframe>


## 2-5. Level 4: Module 상세

#### Multi-head attention
self-attention을 single head로 수행한다고 해보자. 한 token이 다른 token을 attention할 때 그 기준에는 맥락, 문법 등 여러 요인이 복합적으로 작용한다. 그럼에도 attention 점수는 1개로 뭉뚱그려 출력된다. 이 문제를 해결하기 위해 head를 $h=8$개 두고 $512$차원을 $64$차원 8개로 나누어 각각 attention을 구하고 concat한다. concat 후에는 정보가 특정 위치에 고정되지 않도록 $512\times512$ linear $W^O$로 정보를 섞어 출력한다.

문제는 $512$차원을 어떻게 $64$차원으로 나누느냐다. 가장 naive한 방법은 slicing하듯 8조각으로 자르는 것이다. 하지만 attention의 기준이 위치별로 깔끔하게 8조각으로 분할되어 있을 리 없으므로, 섞어줄 필요가 있다. head별 $512\times64$ 행렬 $W^Q, W^K, W^V$는 입력을 64차원으로 나눈 것 같은 효과를 주면서도 모든 정보를 섞어 내보낸다. 덕분에 각 head가 필요한 기준을 학습할 수 있다.

또한, $W^Q, W^K, W^V$가 없다면 입력 $X$만으로 $XX^T$를 계산해 attention을 구하게 된다. 그러면 자기 자신 token의 score가 높아져 attention의 표현력이 약해진다. $W^Q, W^K, W^V$ 덕분에 입력 $X$가 $Q, K, V$로서 각각 다르게 기능할 수 있다.



#### scaled dot-product attention
수식은 다음과 같다.

$$
\text{Attention}(Q, K, V) = \text{softmax}(\frac{QK^T}{\sqrt{d_k}})V
$$

각 token(`query`)이 다른 token(`key`)에 얼마나 attention하는지 나타내는 점수(`softmax`)를 반영해 입력(`value`)을 내보내는 것이 attention의 역할이다.

특징은 softmax 직전에 $\sqrt{d_k}$로 값을 나눈다는 점이다.

$QK^T$ 원소의 크기는 내적에 더해지는 항의 개수인 $d_k$에 비례해서 커진다. 원소가 커지면 softmax의 결과가 one-hot에 근접하는 문제가 발생하므로, $QK^T$ 원소의 분산을 1로 보정할 필요가 있다. 그렇다면 왜 정확히 $\sqrt{d_k}$인가?

$Q$, $K$의 원소 $q_i$, $k_i$가 평균이 0이고 분산이 1이며 서로 독립이라고 가정하자.
$$
X_i = q_ik_i\\
E(X_i)=E(q_i)E(k_i)=0\\
Var(X_i)=E(X_i^2)-E(X_i)^2=E(q_i^2k_i^2)-0=E(q_i^2)E(k_i^2)\\
E(q_i^2)=Var(q_i)+E(q_i)^2=1-0=1 \\
\therefore Var(X_i)=1\times1=1
$$

여기에 내적에 사용되는 항의 개수 $d_k$를 고려하자. 서로 독립인 확률변수의 합은 분산이 더해지므로 $Var(QK^T)=1\times d_k=d_k$가 된다. 분산은 scale factor의 제곱배가 되므로, 분산을 1로 만들려면 $\sqrt{d_k}$로 나눠야 한다.

#### Causal mask
decoder의 masked multi-head attention 모듈에서 사용된다.
decoder의 입력이 모두 보이면 모델이 정답을 보고 암기해버리는 문제가 생기므로, 예측하려는 위치부터는 masking해야 한다.


##### 1. 입력과 정답 예시

| 위치 $i$                         | 0         | 1       | 2       | 3       |
| :----------------------------- | :-------- | :------ | :------ | :------ |
| decoder 입력 $y_0 \dots y_{m-1}$ | `<start>` | `Ich`   | `liebe` | `dich`  |
| 정답 label $y_1 \dots y_m$       | `Ich`     | `liebe` | `dich`  | `<end>` |

##### 2. attention score 행렬 예시

| query / key | `<start>` | `Ich` | `liebe` | `dich` |
| :---------- | :-------- | :---- | :------ | :----- |
| `<start>`   | 1.0       | 0.5   | 0.2     | 0.8    |
| `Ich`       | 0.6       | 1.2   | 0.3     | 0.9    |
| `liebe`     | 0.4       | 0.8   | 1.5     | 0.7    |
| `dich`      | 0.3       | 0.6   | 1.1     | 1.4    |

##### 3. causal masking 적용
한 칸 오른쪽으로 밀었기 때문에 upper triangle을 $-\infty$로 덮는다.

| query \ key | `<start>` | `Ich`     | `liebe`   | `dich`    |
| :---------- | :-------- | :-------- | :-------- | :-------- |
| `<start>`   | 1.0       | $-\infty$ | $-\infty$ | $-\infty$ |
| `Ich`       | 0.6       | 1.2       | $-\infty$ | $-\infty$ |
| `liebe`     | 0.4       | 0.8       | 1.5       | $-\infty$ |
| `dich`      | 0.3       | 0.6       | 1.1       | 1.4       |

##### 4. softmax 연산
upper triangle이 $-\infty$이므로 softmax 값은 0이 된다.
동시에 남은 원소의 합은 1이 되므로, 각 query는 자신과 이전 위치만으로 정규화된 attention 가중치를 얻는다.

| query \ key | `<start>` | `Ich` | `liebe` | `dich` | 예측할 token |
| :---------- | :-------- | :---- | :------ | :----- | :-------- |
| `<start>`   | 1.00      | 0     | 0       | 0      | `Ich`     |
| `Ich`       | 0.35      | 0.65  | 0       | 0      | `liebe`   |
| `liebe`     | 0.18      | 0.27  | 0.55    | 0      | `dich`    |
| `dich`      | 0.13      | 0.18  | 0.29    | 0.40   | `<end>`   |

causal mask 덕분에 입력을 sequential하게 넣을 필요가 없다. batch 전체를 한 번에 넣어도 정답을 미리 보지 않고 학습할 수 있다.

#### Feed Forward Network
지금까지의 구조에는 activation function이 없었다. FFN에서 ReLU를 사용해 비선형성을 추가한다. 이후 layer와 차원을 맞추기 위해 512로 줄이는 것은 필요하지만, 왜 중간에 2048로 늘리는가?

논문은 실험적으로 차원을 2048로 늘렸을 때 성능이 소폭 향상되었다고 할 뿐, 이외에 특별한 이유를 언급하지 않는다.

나는 ReLU로 값이 0이 되면서 유용한 정보가 손실되는 것을 막기 때문이라고 본다. 2048차원으로 늘리면 필요한 정보가 넓게 퍼져 살아남고, ReLU에 의해 사라지는 정보가 적어질 것이다. 그렇다면 차원을 키우지 않고 ReLU 대신 LeakyReLU 같은 activation을 써보는 것도 방법일 수 있다.

<iframe class="wide" src="http://localhost:4321/posts/attention-is-all-you-need/transformer-level4.html" style="width:100%;aspect-ratio:16/10;border:0" loading="lazy" title="Transformer Level 4: multi-head attention, FFN, Add &amp; Norm 상세"></iframe>

# 3. Training

## 3-1. Dataset과 GPU
- EN-DE 번역: WMT 2014의 약 450만 문장 쌍
- EN-FR 번역: WMT 2014의 약 3600만 문장 쌍
- vocab: 공유 BPE[^BPE]의 37000개, word-piece 32000개
	- 기존 연구와 같은 조건에서 비교하려고 언어 쌍마다 tokenizer를 달리했다.
- padding을 최소화하기 위해 token sequence의 길이가 비슷한 것끼리 묶어서 batching
- P100 GPU 8장
	- base 모델은 100,000 step에 12시간 소요
	- big 모델은 300,000 step에 3.5일 소요

## 3-2. Loss: Label smoothing
loss는 모든 vocab에 대한 예측 확률(`softmax` 이후)과, 정답 단어만 one-hot encoding된 $V$차원 벡터 사이의 `CrossEntropy`이다.
$$
\text{CrossEntropy}(p,q)=-\sum_{k=0}^{V} q(k) \log p(k)
$$
단, one-hot encoding 대신 label smoothing을 사용하여 정답 단어의 확률을 0.9로 낮추고, 나머지 36999개 원소에 $0.1/36999$씩 나눠 준 벡터를 사용한다. 정답에 약간의 불확실성을 부여해 perplexity를 소폭 포기하고 BLEU를 올린다.

## 3-3. Warmup
논문은 warmup을 사용한 이유를 뚜렷하게 명시하지 않는다. 다만 후속 연구[^warmup]는 original Transformer가 채택한 post-LN 방식이 출력층 가까운 곳의 초기 gradient를 크게 만들어 초기 학습 불안정을 초래한다고 주장한다. residual connection 이전에 LN을 수행하는 pre-LN은 이런 문제가 없고, warmup 없이도 안정적으로 학습된다고 한다. 따라서 원 논문에서는 post-LN으로 인한 학습 불안정을 피하기 위해 warmup이 필수였던 것으로 보인다. 저자들이 이를 실험적으로 확인했는지는 알려져 있지 않다.

[^warmup]: Xiong et al., "On Layer Normalization in the Transformer Architecture", ICML 2020


<iframe src="http://localhost:4321/posts/attention-is-all-you-need/lr-schedule.html" style="width:100%;aspect-ratio:2/1;border:0" loading="lazy" title="Learning rate warmup schedule"></iframe>

# 4. Inference

## 4-1. Beam search
추론의 목표는 확률이 가장 높은 문장을 찾는 것이다. 번역되는 문장의 길이가 $L$이라면, 출력 가능한 문장의 경우의 수는 $V^L$개다. $V=37000$이라 모든 조합을 전수조사할 수는 없다. 반대로 확률이 가장 높은 token 하나(beam $=1$)만 greedy하게 고를 수도 있지만, 최종 문장의 퀄리티가 낮아질 수 있다. 따라서 절충안인 beam search(beam $=4$)를 사용한다.

#### 진행 방식
후보 문장의 최종 확률은 그 문장을 이루는 token들의 확률을 모두 곱한 값이다.

$$
P(Y \mid X) = \prod_{t=1}^{L} P(\hat y_t \mid \hat y_0, \dots, \hat y_{t-1},\ X)
$$

score로는 $\log P$를 쓰므로, token이 문장에 추가될 때마다 score가 더해진다.

$$
\log P(Y \mid X) = \sum_{t=1}^{L} \log P(\hat y_t \mid \hat y_0, \dots, \hat y_{t-1},\ X)
$$

매 추론 step마다 아래를 반복한다.
1. 이전 step에서 살아남은 후보 문장 4개를 decoder에 넣어 각자의 token 분포를 얻는다. 후보마다 vocab 내 37000개 token을 붙여 확률을 계산할 수 있으므로, 추가할 token 후보는 $4\times37000$개다.
2. 그중 score가 가장 높은 4개만 남기고 나머지는 버린다.
3. 남긴 후보 중 `<end>`로 끝난 후보는 완성 목록으로 옮기고, 더 이상 확장하지 않는다.
4. 아래 중 하나면 추론을 멈춘다.
	- 완성 목록에 후보가 4개 도착
	- 정해둔 문장 최대 길이에 도달

멈추면 완성 목록에서 score가 가장 높은 문장 하나를 번역 결과로 고른다.

## 4-2. Length penalty
$P$는 1보다 작은 확률값이고 score는 $\log P$이므로, token이 추가될 때 score에 더해지는 값은 음수다. token이 많아질수록(번역 문장이 길어질수록) score가 계속 낮아진다. 번역의 품질이 아니라 문장의 길이로 score가 정해지는 bias를 제거하기 위해 length penalty로 나누어 보정한다.

$$
\text{score}(Y) = \frac{\log P(Y \mid X)}{\text{penalty}(Y)}, \quad \text{penalty}(Y) = \frac{(5 + L)^{\alpha}}{(5 + 1)^{\alpha}}
$$

penalty 식의 값 $5$와 $\alpha=0.6$은 실험적으로 정한 값이다.

## 4-3. Checkpoint average
추론에 쓰는 최종 가중치는 checkpoint 한 개가 아니다. base 모델은 10분 간격으로 저장한 마지막 5개 checkpoint의 가중치를 평균하고, big 모델은 마지막 20개를 평균한다.

# 5. Conclusion
#### Transformer는 sequence 모델을 sequential하지 않게 학습한다.
RNN은 학습이든 추론이든 구조적으로 sequential하여, 현대 병렬 학습 기법을 충분히 활용하기 어렵다. 또한 거리가 먼 token 간 연관성을 학습하기 어렵다.

Transformer는 attention 구조만 남겼다. attention은 행렬곱으로 연산할 수 있고, causal mask로 decoder 입력을 가려 여러 문장 전체를 한 번에 넣을 수 있다. 덕분에 GPU 가속을 활용할 수 있다. 또한 self-attention으로 거리에 상관없이 token 간 연관성을 효과적으로 학습한다. Attention만 남겨 생기는 permutation equivariance 문제는 positional encoding으로 해결한다.

Transformer는 기존 RNN과 CNN 기반 sequence 모델링이 갖던 long-range dependency 문제를 해결하고 학습을 병렬화했다. 입력 문장(`context`)이 길어져도, 데이터셋과 모델 규모가 커져도 scalable하게 학습할 수 있는 기반이 마련된 것이다. 이런 특성 때문에 Transformer는 이후 모던 LLM scaling의 토대가 된다.
