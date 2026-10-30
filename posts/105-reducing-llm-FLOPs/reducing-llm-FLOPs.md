---
title: "[ML] Transformer 연산량 줄이기 1편: FLOPs"
published: 2026-10-29
topics:
  - ML
description: Full, sliding window, sparse and linear attention
draft: false
---
# 1. Background
Transformer의 attention은 길이 $n$인 sequence의 모든 token 쌍을 비교한다. 이 설계 덕에 token간 거리와 무관하게 $O(1)$ path-length로 dependency를 학습할 수 있지만, 비용은 $n^2$에 비례한다. Context가 길어지기 시작하면 이 $n^2$ 항이 layer 비용의 대부분을 차지한다. 

Attention 비용 절감 기법은 무엇을 바꾸는지에 따라 크게 3가지로 분류할 수 있다.

| 축        | 바꾸는 것              | 결과값                 | 대표 기법                                              |
| :------- | :----------------- | :------------------ | :------------------------------------------------- |
| FLOPs    | 계산하는 $(q, k)$ 쌍의 수 | full attention과 달라짐 | sliding window, sparse attention, linear attention |
| KV cache | token당 저장하는 양      | 모델 구조가 달라짐          | MQA, GQA, MLA                                      |
| System   | 메모리 배치와 이동         | 수학적으로 동일            | FlashAttention, PagedAttention                     |

- $n$: sequence 길이
- $d$: 모델 차원 ($d_{\text{model}}$)
- $h$, $d_h$: head 수, head 하나의 차원 ($d = h \cdot d_h$)
- $Q, K, V \in \mathbb{R}^{n \times d}$: 모든 head를 이어 붙인 query, key, value

Attention 모듈의 FLOPs를 분해해보자. 행렬곱 $A \in \mathbb{R}^{a \times b}$, $B \in \mathbb{R}^{b \times c}$의 비용은 $2abc$ FLOPs다.

$$
\text{Attn}(Q, K, V) = \text{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

- $QK^\top$: $(n \times d)(d \times n)$이므로 $2 \cdot n \cdot d \cdot n = 2n^2d$
- score $\times V$: $(n \times n)(n \times d)$이므로 $2 \cdot n \cdot n \cdot d = 2n^2d$

FLOPs 축의 기법은 모두 attention의 $n^2$ 항을 줄인다. 어떤 쌍을 계산할지를 위치로 고르면 sliding window($n^2 \to nw$), 내용으로 고르면 sparse attention(main attention은 $nk$이지만 선택에 쓰는 indexer가 $n^2$ 항을 작은 상수로 남긴다), 쌍 자체를 만들지 않으면 linear attention($n^2 \to nC$)이다.

---
# 2. Sliding window attention
## 2-1. 방법
Query token $q_t$가 직전 $w$개 key $k_{t-w+1}, \dots, k_t$에만 attend한다.

<iframe src="http://localhost:4321/posts/reducing-llm-FLOPs/window-vs-full.html" style="width:100%;aspect-ratio:16/11;border:0" loading="lazy" title="full attention과 sliding window attention의 계산 비교"></iframe>

$$
\text{cost} = 4nwd \quad (w \ll n)
$$

비용에서 $n^2$가 $nw$로 바뀌므로 비용이 $n$에 대해 선형으로 감소한다. 근데 이러면 global dependency를 손 쉽게 학습할 수 있다는 Transformer의 장점이 퇴색된다는 우려가 생길 수 있지만, 이는 full attention과 적절히 섞으면 해결된다.

## 2-2. Receptive field와 local/global 혼합
한 layer는 $w$ 거리까지만 보지만, layer를 쌓으면 정보가 window를 넘어 전달된다. CNN과 같은 원리로, $L$개 layer를 거친 token의 receptive field는 대략 $Lw$이고, 자기 자신을 window에 포함하면 정확히는 layer마다 $w-1$칸씩 넓어져 $L(w-1)+1$이다.[^longformer] 다만 먼 token 사이의 path-length가 $O(1)$에서 $O(n/w)$로 늘어나므로, Transformer가 없앤 long range dependency 문제가 다시 생긴다.

이 문제를 해결하기 위해 최근 모델은 sliding window layer($r$개)와 full attention layer(1개)를 교대로 쌓는다. 평균 비용은 local layer $r$개의 $4nwd$와 full attention layer 1개의 $4n^2d$를 평균한 값이다. 이차항은 남지만 계수가 $\frac{1}{r+1}$로 줄고, global layer가 먼 거리를 한 hop에 연결한다.

아래 그림은 window 3인 layer 4개만 쌓은 경우(왼쪽)와 window layer 3개 위에 full attention layer 1개를 쌓은 경우(오른쪽)에서 마지막 token이 닿는 범위를 비교한다. 왼쪽은 20개 중 9개에만 닿고, 오른쪽은 맨 위 layer에서 모든 token에 한 hop에 닿는다.

<iframe src="http://localhost:4321/posts/reducing-llm-FLOPs/receptive-field.html" style="width:100%;aspect-ratio:16/10;border:0" loading="lazy" title="window만 쌓은 경우와 full attention layer를 섞은 경우의 receptive field 비교"></iframe>

---
# 3. Sparse attention
## 3-1. 방법
Sliding window는 볼 key를 위치로 고정한다. Sparse attention은 query마다 중요한 key $k$개를 내용으로 골라 그 key에만 집중한다. 그러니까, 볼 key를 위치가 아니라, attention score 기준으로 top-$k$개를 선택한다.

$$
\text{cost} = 4nkd + \text{(선택 비용)}
$$

그런데 attention score 기준으로 top-k개를 고르려면, full attention score가 필요하다. Full attention을 안 하려고 top-$k$개를 고르는 건데, top-$k$개를 고르려면 full attention score를 구해야하는 이런 아이러니가 또 없다. 

해결책은 attention score를 값싸게 추정하는 것이다. 어떻게 추정할 것인가? 바로 attention score의 분포를 근사 학습하는 작은 indexer를 도입하는 것이다.

<iframe src="http://localhost:4321/posts/reducing-llm-FLOPs/sparse-vs-full.html" style="width:100%;aspect-ratio:16/11;border:0" loading="lazy" title="full attention과 sparse attention의 계산 비교"></iframe>

## 3-2. DeepSeek Sparse Attention
DeepSeek V3.2의 DSA는 lightning indexer로 근사 score를 만든다.[^dsa] Indexer는 main attention과 같은 hidden state $h$를 입력으로 받는 작은 attention 형태의 score 계산기다. 학습되는 weight는 linear projection 세 개다. 기호는 다음과 같다.

- $t$: query token의 위치. 다음 계산을 하려는 token
- $s$: $t$ 이전(또는 $t$ 자신)의 token 위치. $t$가 볼지 말지 고르는 후보
- $h_t$: token $t$의 hidden state. 이 layer의 입력 벡터이고 main attention도 같은 벡터를 받는다
- $j = 1, \dots, H^I$: indexer head 번호. $H^I$는 indexer head 수
- $q^I_{t,j}$: index query. head $j$가 token $t$에서 만드는 벡터
- $k^I_s$: index key. token $s$당 하나이고 모든 head가 공유한다
- $w_{t,j}$: head 가중치. token $t$에서 head $j$ 점수를 얼마나 반영할지 정하는 스칼라
- $I_{t,s}$: index score. $t$가 $s$를 볼 만한 정도를 indexer가 매긴 점수

윗첨자 $I$는 main attention이 아니라 indexer의 값이라는 표시다. 논문에 따르면 $q^I_{t,j}$와 $w_{t,j}$는 query token의 $h_t$에서, $k^I_s$는 앞선 token의 $h_s$에서 만든다. $w_{t,j}$는 $h_t$에서 나오므로 query token마다 달라진다. Token $t$가 이전 token $s$에 매기는 점수는

$$
I_{t,s} = \sum_{j=1}^{H^I} w_{t,j} \cdot \text{ReLU}\!\left(q^I_{t,j} \cdot k^I_s\right)
$$

필요한 건 순위를 매기는 것이므로 softmax는 필요 없다. 여기서 $w_{t,j}$ (score 가중치)가 왜 필요한 지 의문이 있을 수 있다. softmax가 필요없어도 이미 query와 key를 행렬곱하여 ReLU를 거치면 순위를 구할 수 있는 것 아닌가? 

$w_{t,j}$의 역할은 수식에서 추론할 수 있다. $w_{t,j} < 0$이면 해당 head 점수는 총점에서 빠지기 때문에, ReLU 출력이 0 이상이어도 특정 token의 점수를 낮출 수 있다. 또 $w_{t,j}$는 $h_t$에서 나오므로 head를 어떻게 합칠지가 query token마다 달라진다. [^my_guess] 

아래 그림은 query 하나가 앞선 token 16개에 점수를 매기고 상위 4개를 고르는 과정이다. 마지막 head의 가중치가 음수여서 그 head가 큰 token의 점수는 깎인다.

<iframe src="http://localhost:4321/posts/reducing-llm-FLOPs/indexer-score.html" style="width:100%;aspect-ratio:16/10;border:0" loading="lazy" title="lightning indexer의 점수 계산"></iframe>

각 query에서 $I_{t,s}$가 큰 상위 $k = 2048$개 token의 집합 $S_t$를 고르고, main attention은 $S_t$에만 계산한다. 

[^my_guess]: 논문에는 없고, 내 추측이다. 

## 3-3. Indexer의 학습
$I_{t,s}$는 main attention score를 작은 dense layer들로 근사한 값이고, top-$k$ 선택은 미분할 수 없어 LM loss가 indexer까지 전달되지 않는다. 그래서 indexer는 main attention의 분포를 따라 하도록 별도 loss로 학습한다. 정답 분포 $p_{t,:}$는 같은 layer에서 main attention score를 모든 head에 걸쳐 합한 뒤 sequence 방향으로 L1 정규화한 것이다. 콜론은 $s$ 전체를 뜻한다. Loss는 이 분포와 indexer 점수의 softmax 사이의 KL divergence다.

$$
\mathcal{L}^I = \sum_t D_{\text{KL}}\!\left(p_{t,:} \,\|\, \text{Softmax}(I_{t,:})\right)
$$

Softmax는 이 loss 안에서만 쓰고, 선택에는 $I$의 순위만 쓴다. $p$는 main model이 이미 만드는 값이므로 별도 label이 필요 없다. 

#### 왜 굳이 KL Divengence를 쓰는가?
> CrossEntropy는 안 되는가? $CE(p,q)=D_{KL}(p||q)+H(p)$이고 $H(p)$는 $q$와 무관한 상수이므로, $q$에 대한 gradient와 최적해는 CE와 KL이 같다. 학습 결과는 달라지지 않고, 달라지는 것은 loss 값뿐이다. CE는 $q$가 $p$를 완벽히 근사해도 $H(p)$가 남아 값만으로는 얼마나 가까운지 알 수 없지만, $D_{KL}$은 일치하면 0이 된다. 그래서 어느 쪽을 쓰든 학습은 같고, 진짜 선택은 KL의 방향이다.
> 
> 그럼 더 들어가서, reverse KL은 적합하지 않은가? 결론은 forward KL을 써야한다. forward KL은 $p$ 값이 큰데 $q$가 작을 때 벌점이 커진다. 왜냐하면 $CE(p,q)-H(p)$이기 때문이다. Top-$k$를 찾아야하는 문제에서는, $p$가 큰 곳을 잘 잡아야 한다. 이 때 forward KL은 $p$가 큰 곳을 잘 잡고, Reverse KL은 $p$가 작은 곳을 잘 잡아낸다. 그리고 잘 잡아내지 못 하는 곳은 어차피 main attention이 계산을 안 하게 될 곳이므로 상관없다.

돌아와서, 학습은 indexer가 없는 pretrained 모델(DeepSeek-V3.1-Terminus, context 128K)에 indexer를 추가한 뒤 두 단계로 진행한다.

| 단계 | main attention | 학습 대상 | KL 범위 | 규모 |
|:---|:---|:---|:---|:---|
| 1. dense warm-up | 전체 token | indexer만 (main model freeze) | 이전 token 전부 | 1000 step, 2.1B token |
| 2. sparse training | top-$k$만 | 전체. main은 LM loss, indexer는 $\mathcal{L}^I$ | $S_t$ 안 | 15000 step, 943.7B token |

1단계에서 main model은 forward만 하고, 그 attention 분포를 indexer가 읽어 간다. 정답이 고정되어 있고, 이미 학습된 모델의 분포이므로 정답으로 쓸 수 있다.  2단계에서는 main model이 top-$k$만 보는 상황에 적응한다. 이때 indexer 입력을 detach해서, $\mathcal{L}^I$의 gradient가 main model로 흐르지 않게 한다. Post-training도 같은 sparse attention으로 진행한다.

그렇다면 왜 굳이 두 단계가 필요한가? 1단계는 indexer의 모양을 어느 정도 잡아주는 단계다. 2단계는 sparse가 켜진 indexer에 전체 모델이 적응하는 단계다. 1단계 없이 2단계를 진행해버리면, 움직이는 indexer의 분포에 전체 모델이 우왕좌왕 하게 되며, 덩달아 indexer도 움직이는 main attention score 분포를 따라가느라 학습이 망가져버린다. 따라서, pretrained된 전체 모델을 freeze한 후에 main attention의 분포를 정답지삼아 indexer가 근사할 능력을 갖추는 1단계가 선행되어야 한다.

## 3-4. 한계
어떤 key가 선택될지 미리 알 수 없으므로 KV cache는 전부 보관해야 한다. Sparse attention은 FLOPs를 줄이지만 KV cache는 줄이지 않는다.

---
# 4. Linear attention
Linear attention[^linear]은  $n \times n$ score 행렬을 만들지 않는다. 이 장은 head 하나를 기준으로 하고, $q, k, v$의 차원은 모두 $d_h$이며, causal mask로 생기는 $\frac{1}{2}$은 비용식에서 무시한다.

## 4-1. Q와 K를 분리하려면 exp를 바꿔야 한다
Softmax attention의 출력은 value의 가중 평균이다.

$$
o_t = \sum_{s \le t} \frac{\text{sim}(q_t, k_s)}{\sum_{s' \le t} \text{sim}(q_t, k_{s'})}\, v_s, \qquad \text{sim}(q, k) = \exp\!\left(\frac{q^\top k}{\sqrt{d_h}}\right)
$$

$\text{sim}$이 음이 아니기만 하면 가중 평균 구조는 유지된다. 따라서 바꿀 수 있는 부분은 $\text{sim}$뿐이다.

내적 $q^\top k$ 자체는 문제가 아니다. $\text{sim}(q, k) = q^\top k$이면 $q^\top k_s$가 스칼라라서 $v_s$ 뒤로 옮길 수 있다.

$$
\sum_{s \le t} v_s \left(k_s^\top q_t\right) = \Big(\sum_{s \le t} v_s k_s^\top\Big) q_t
$$

괄호 안은 $q_t$에 의존하지 않으므로 $n \times n$ 점수를 만들 필요가 없다. $\exp(q^\top k)$는 유한 차원의 $\phi$로는 이렇게 분리되지 않는다. $q$와 $k$가 곱해진 뒤에 $\exp$를 씌우므로 교차 항이 모든 차수로 생기고, Taylor 전개의 모든 차수를 $\phi$로 모으면 쓸 수 있지만 출력 차원이 무한이라 상태 크기와 비용도 무한이 된다. 일반적으로 $\text{sim}(q, k) = \phi(q)^\top \phi(k)$ 꼴이면 같은 이동이 가능하고, 원논문은 이 $\phi$를 feature map이라 부른다. 음이 아니려면 $\phi$의 출력이 음이 아니면 충분하다. 행렬로 쓰면

$$
\left(\phi(Q)\phi(K)^\top\right)V = \phi(Q)\left(\phi(K)^\top V\right)
$$

이고, 왼쪽은 $n \times n$ 행렬을 만들지만 오른쪽은 $C \times d_h$ 행렬만 만든다. $C$는 $\phi$의 출력 차원이다. 원논문은 $\phi(x) = \text{elu}(x) + 1$을 쓴다(출력이 양수이고 $C = d_h$). 아래 그림에서 두 순서가 만드는 중간 행렬의 크기를 비교한다.

$Q$와 $K^T$를 먼저 곱하는 것과, $K^T$와 $V$를 먼저 곱하는 것의 차이를 직관적으로 이해해보자. 가장 먼저 관찰의 렌즈를 토큰에서 임베딩으로 옮겨간다고 생각해야한다. 기존 attention은 지금 토큰이 다른 토큰을 얼마나 attend하는지 가중치를 토큰 별로 내기 위해 시퀀스와 시퀀스의 유사도를 측정한다. 완전히 토큰 중심으로 돌아가기 때문에 이해하기가 편리하다. 그럼 임베딩 중심으로 바라보면 어떨까?

먼저, 팔레트의 물감을 생각하자. $V$를 팔레트에 어떤 종류의 물감을 담을지 결정한다. $K$는 그 물감을 얼마나 담을지 결정한다. 그럼 $Q$의 역할은 뭘까? 각 물감을 얼마나 조합해서 섞을지를 결정한다. Decode의 한 step에서는 먼저 새 token의 $K$가 정한 비율로 $V$의 물감을 팔레트에 더하고, 그다음 $Q$가 정한 비율로 팔레트에서 물감을 **꺼내서** 칠한다. 다음 token에서도 같은 일이 반복된다. 결론을 내보면, "토큰 간의 관계성을 직접 학습하겠다"가 아니라, "토큰 간의 관계성을 꺼내 쓸 수 있는 상태 행렬에 쌓아 두겠다."로 문제가 바뀌게 된다. 후자는 마치 RNN의 hidden state가 갖는 역할과 매우 유사하다.

근데 팔레트의 칸이 토큰 수보다 적으면 한 칸에 여러 token의 물감이 섞여 쌓이고, 섞인 색에서 원래 색을 되돌릴 수 없어 순수한 표현력에 손해가 생긴다. 이것이 crosstalk 문제다.

<iframe src="http://localhost:4321/posts/reducing-llm-FLOPs/matmul-order.html" style="width:100%;aspect-ratio:16/9;border:0" loading="lazy" title="행렬을 곱하는 순서"></iframe>

## 4-2. 비용은 C/n이다
Softmax attention의 head당 FLOPs는 $4n^2 d_h$이고, 결합법칙을 쓴 쪽은 $4nCd_h$다. 비율은

$$
\frac{\text{linear}}{\text{full}} = \frac{C}{n}
$$

이므로 $n > C$이면 linear 쪽의 연산량이 적다. $C = d_h$이면 $n$에 선형이고, 보통 $n \gg C$이기 때문에 FLOPs를 상당히 절감할 수 있다. 다만 FLOPs 감소가 곧 실행 시간 감소는 아니다. 재귀 갱신은 token 순서대로 이어져 GPU에서 병렬화하기 어렵다.

<iframe src="http://localhost:4321/posts/reducing-llm-FLOPs/linear-vs-full.html" style="width:100%;aspect-ratio:16/11;border:0" loading="lazy" title="full attention과 linear attention의 계산 비교"></iframe>

## 4-3. Causal이면 고정 크기 state를 갱신하는 RNN이다
Causal linear attention의 출력은 $\text{sim}(q, k) = \phi(q)^\top \phi(k)$를 넣은 가중 평균이다.

$$
o_t = \frac{\sum_{s \le t} \phi(q_t)^\top \phi(k_s)\, v_s}{\sum_{s \le t} \phi(q_t)^\top \phi(k_s)}
$$

$\phi(q_t)^\top \phi(k_s)$는 스칼라이므로 $v_s$ 뒤로 옮길 수 있고, $\phi(q_t)$를 합 밖으로 뺄 수 있다. 분자와 분모에 남는 합을 각각 다음과 같이 정의한다.

$$
S_t = \sum_{s \le t} v_s\, \phi(k_s)^\top \in \mathbb{R}^{d_h \times C}, \qquad z_t = \sum_{s \le t} \phi(k_s) \in \mathbb{R}^{C}
$$

그러면 $o_t = \dfrac{S_t\, \phi(q_t)}{z_t^\top \phi(q_t)}$이다. $S_t$와 $z_t$는 $t-1$까지의 합에 한 항을 더한 값이므로 다음처럼 갱신할 수 있다.

$$
S_t = S_{t-1} + v_t\, \phi(k_t)^\top, \qquad z_t = z_{t-1} + \phi(k_t)
$$

$S_0 = 0$, $z_0 = 0$에서 시작하고, 상태는 $S_t$와 $z_t$가 전부이며 크기가 $t$와 무관하다. Decode에서 softmax는 token마다 $t$에 비례하는 KV cache를 읽고, linear는 $S_t$ 하나를 읽는다. $S_t$도 cache의 일종이나, decode 시 cache size가 token 갯수에 비례하는 $k \times (k,v)$ 와 달리, $S_t$는 token 갯수와 무관하게 $C\times d_h$ 로 크기가 고정이기 때문에 마치 RNN의 hidden state와 유사한 behavior를 보인다. 원논문의 제목이 "Transformers are RNNs" 인 이유가 여기에 있다. 결국 linear attention은 연산 자체에서 얻는 이득도 있지만, 고정 메모리를 활용해 KV cache 메모리 비용을 줄일 수 있다는 이득도 함께 가진다.

---
# 5. 정리

<iframe src="http://localhost:4321/posts/reducing-llm-FLOPs/attention-grid.html" style="width:100%;aspect-ratio:16/22;border:0" loading="lazy" title="네 attention 기법의 계산 비교"></iframe>



| 기법             | 쌍을 고르는 기준    | attention FLOPs     | KV cache             | 대가                     |
| :------------- | :----------- | :------------------ | :------------------- | :--------------------- |
| Full attention | 전부           | $4n^2d$             | $O(n)$               |                        |
| Sliding window | 위치 (최근 $w$개) | $4nwd$              | $O(w)$               | 먼 거리는 여러 hop           |
| Sparse         | 내용 (top-$k$) | $4nkd$ + indexer 비용 | $O(n)$               | 선택 비용, cache 그대로       |
| Linear         | 쌍을 만들지 않음    | $4nCd$              | $O(1)$ (고정 크기 state) | $n > C$이면 token 정보가 섞임 |


Sliding window를 쓰는 최근 모델은 full attention layer를 일부 남긴다. 이 모델들에서 $n^2$ 항은 사라지지 않고, full attention layer의 비율인 $\frac{1}{r+1}$배로 줄어든다. Sparse attention에서는 indexer의 $n^2$ 항이 남는다. Linear attention은 $n^2$ 항을 없애는 대신 state 크기가 고정되어, $n > C$이면 token 정보가 섞인다. 원논문은 이 한계를 다루지 않는다.

[^longformer]: "Longformer: The Long-Document Transformer" (Beltagy et al., 2020)
[^gemma3]: "Gemma 3 Technical Report" (Gemma Team, 2025)
[^dsa]: "DeepSeek-V3.2-Exp: Boosting Long-Context Efficiency with DeepSeek Sparse Attention" (DeepSeek-AI, 2025)
[^linear]: "Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention" (Katharopoulos et al., ICML 2020)
